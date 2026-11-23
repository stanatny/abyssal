import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaLairPursuer } from "../src/bermuda_lair_pursuer.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import {
  resolveCreatureMotion,
  steerWithinHabitat,
} from "../src/navigation.js";
import { turnSwimmingBody } from "../src/swimming_spacing.js";
import { swimmingFloorHeight } from "../src/swimming_clearance.js";
import { predatorTerritory } from "../src/nursery_rules.js";
import {
  canPredatorRetaliate,
  predatorBiteContact,
} from "../src/predator_combat.js";

const species = getRegionSpecies("bermuda").find(
    (s) => s.kind === "ichthyotitan",
  ),
  vector = (p) => new T.Vector3(p.x, p.y, p.z),
  home = new T.Vector3(...species.spawnAnchors[5]),
  threshold = new T.Vector3(-110, -600, -1590),
  fork = new T.Vector3(-125, -600, -1518),
  localContains = (p) =>
    p.x >= -235 && p.x <= 65 && p.z >= -1695 && p.z <= -1415;

function context(extra = {}) {
  return {
    species,
    populationIndex: 5,
    position: home,
    player: fork,
    visible: true,
    ...extra,
  };
}
const controller = (extra = {}) =>
  createBermudaLairPursuer({
    region: "bermuda",
    contains: localContains,
    ...extra,
  });

test("Only the existing sixth Bermuda hunter is opted in; intent snapshots and pause cannot mutate shared state", () => {
  const c = controller(),
    original = JSON.stringify(species),
    oldHome = home.clone(),
    oldPlayer = fork.clone();
  assert.equal(c.matches(species, 5), true);
  assert.equal(c.matches(species, 4), false);
  assert.equal(c.matches({ ...species, kind: "megalodon" }, 5), false);
  assert.equal(controller({ region: "hawaii" }).step(1, context()), null);
  assert.equal(c.step(1, context({ populationIndex: 4 })), null);
  assert.equal(c.step(0.1, context()).hunting, true);
  const before = c.inspect();
  assert.deepEqual(c.step(50, context({ active: false })), before);
  assert.deepEqual(c.step(0, context()), before);
  assert.deepEqual(c.step(NaN, context()), before);
  before.target.x = 9999;
  assert.notEqual(c.inspect().target.x, 9999);
  assert.deepEqual(home, oldHome);
  assert.deepEqual(fork, oldPlayer);
  assert.equal(JSON.stringify(species), original);
  assert.equal(species.population, 6);
  assert.equal(species.length, 28);
  assert.equal(species.swimClearance, 0.55);
  assert.equal(
    getRegionSpecies("bermuda").reduce((n, s) => n + s.population, 0),
    1082,
  );
});

test("Sleep/waking pursuit limits and eight-second lost sight yield a real respite rather than instant reacquisition", () => {
  for (const awake of [false, true]) {
    const c = controller(),
      maximum = awake ? 18 : 12,
      respite = awake ? 4 : 6,
      input = context({ awake });
    c.step(0.1, input);
    assert.equal(c.step(maximum - 0.01, input).hunting, true);
    const ended = c.step(0.02, input);
    assert.equal(ended.hunting, false);
    assert.equal(ended.mode, "resting");
    assert.equal(ended.restRemaining, respite);
    assert.equal(c.step(respite - 0.01, input).hunting, false);
    assert.equal(c.step(0.02, input).hunting, true);
  }
  const c = controller();
  c.step(0.1, context());
  assert.equal(c.step(7.99, context({ visible: false })).hunting, true);
  assert.equal(c.step(0.02, context({ visible: false })).hunting, false);
  assert.equal(c.step(0.1, context({ visible: true })).hunting, false);
});

test("Outside a real cave permission, terminal/dead/ineligible state and ink suspension immediately remove pursuit permission", () => {
  for (const extra of [
    { player: new T.Vector3(-85, -600, -1390) },
    { playerAlive: false },
    { eligible: false },
    { secured: true },
    { entombed: true },
  ]) {
    const c = controller();
    c.step(0.1, context({ position: threshold }));
    const ended = c.step(0.1, context({ position: threshold, ...extra }));
    assert.equal(ended.hunting, false);
    assert.equal(ended.returning, true);
    assert.ok(ended.target);
  }
  const c = controller();
  c.step(0.1, context());
  assert.equal(c.step(0.1, context({ disabled: true })).mode, "disabled");
  for (let i = 0; i < 100; i++)
    assert.equal(c.step(0.1, context({ disabled: true })).hunting, false);
  assert.equal(c.step(0.1, context()).hunting, false);
  assert.equal(c.suspend().hunting, false);
  c.reset();
  assert.equal(c.inspect().mode, "idle");
  assert.equal(c.inspect().restRemaining, 0);
  assert.equal(c.step(0.1, context()).hunting, true);
});

let ocean;
function world() {
  ocean ??= createBermudaOcean(new T.Group());
  return ocean;
}
after(() => ocean?.dispose());
function physicalContext() {
  const w = world();
  return {
    colliders: w.colliders,
    dynamicContacts: w.dynamicContacts,
    heightAt: w.heightAt,
    territory: predatorTerritory(species, 5),
  };
}
function actualTraverse(a, b) {
  const from = vector(a),
    to = vector(b),
    direction = to.clone().sub(from).normalize(),
    contact = resolveCreatureMotion(
      from,
      to,
      direction,
      species,
      physicalContext(),
    );
  return (
    !contact?.blocked &&
    (!contact || vector(contact.position).distanceTo(to) < 0.01)
  );
}

// 复用普通生物的真实逐步回转、原包络/水层/海床和最终朝向回退；无setPosition导航捷径。
function moveOrdinary(entity, intent, dt, elapsed) {
  if (!intent.target || intent.hold) return { blocked: false, moved: 0 };
  const w = world(),
    previous = entity.mesh.position.clone(),
    direction = vector(intent.target).sub(previous).normalize(),
    steered = steerWithinHabitat(previous, direction, species, w.heightAt);
  direction.set(steered.x, steered.y, steered.z);
  if (entity.avoidUntil > elapsed) direction.copy(entity.avoid);
  turnSwimmingBody(entity, direction, dt);
  const desired = previous
      .clone()
      .addScaledVector(entity.velocity, species.chaseSpeed * dt),
    floor = swimmingFloorHeight(
      desired.x,
      desired.z,
      species,
      w.heightAt,
      Math.max(species.length * 0.28 + 2, species.length * 0.55 + 0.15),
    );
  desired.y = Math.max(floor, Math.min(-species.depthMin, desired.y));
  const contact = resolveCreatureMotion(
    previous,
    desired,
    entity.velocity,
    species,
    physicalContext(),
  );
  entity.mesh.position.copy(contact?.position || desired);
  if (contact?.blocked) {
    if (!(entity.avoidUntil > elapsed)) {
      entity.avoid = vector(contact.direction);
      entity.avoidUntil = elapsed + 0.8;
    }
    entity.velocity.copy(vector(contact.direction));
  }
  const movement = entity.mesh.position.clone().sub(previous),
    heading = new T.Vector3(0, 0, -1).applyQuaternion(entity.mesh.quaternion);
  if (movement.lengthSq() > 1e-8 && movement.normalize().dot(heading) < 0.94) {
    if (!(entity.avoidUntil > elapsed)) {
      entity.avoid = movement.clone();
      entity.avoidUntil = elapsed + 0.8;
    }
    entity.mesh.position.copy(previous);
  }
  return {
    blocked: !!contact?.blocked,
    moved: entity.mesh.position.distanceTo(previous),
  };
}

test("The unchanged 28m/15.4m hunter physically follows the actual fork and returns after the player exits", (t) => {
  const w = world(),
    c = controller({
      contains: w.caves.records[0].contains,
      canTraverse: actualTraverse,
    }),
    entity = { species, mesh: new T.Group(), velocity: new T.Vector3() };
  entity.mesh.position.copy(home);
  entity.mesh.quaternion.setFromUnitVectors(
    new T.Vector3(0, 0, -1),
    new T.Vector3(-20, -600, -1518).sub(home).normalize(),
  );
  let reached = false,
    blocked = 0,
    travelled = 0,
    elapsed = 0;
  for (let i = 0; i < 240; i++) {
    const input = context({
        position: entity.mesh.position,
        player: threshold,
      }),
      intent = c.step(0.05, input),
      moved = moveOrdinary(entity, intent, 0.05, elapsed);
    elapsed += 0.05;
    blocked += moved.blocked ? 1 : 0;
    assert.ok(
      actualTraverse(entity.mesh.position, entity.mesh.position),
      "Ordinary avoidance must leave the full hunter in legal water",
    );
    travelled += moved.moved;
    assert.ok(moved.moved <= species.chaseSpeed * 0.05 + 0.01);
    if (entity.mesh.position.distanceTo(threshold) < 3) {
      reached = true;
      break;
    }
  }
  assert.ok(
    reached,
    `The actual wide hunter stalled at ${entity.mesh.position.toArray()}`,
  );
  assert.ok(elapsed < 12);
  assert.ok(
    travelled > 170,
    "It must follow the physical fork, not jump directly across the ridge",
  );
  const outboundTime = elapsed,
    outboundDistance = travelled;
  const outside = new T.Vector3(-85, -600, -1390);
  let returned = false;
  for (let i = 0; i < 600; i++) {
    const intent = c.step(
      0.05,
      context({ position: entity.mesh.position, player: outside }),
    );
    assert.equal(intent.hunting, false);
    const before = entity.mesh.position.clone();
    const moved = moveOrdinary(entity, intent, 0.05, elapsed);
    blocked += moved.blocked ? 1 : 0;
    assert.ok(
      actualTraverse(entity.mesh.position, entity.mesh.position),
      "Ordinary avoidance must leave the full hunter in legal water",
    );
    elapsed += 0.05;
    assert.ok(
      entity.mesh.position.distanceTo(before) <= 1.21,
      JSON.stringify({
        before: before.toArray(),
        after: entity.mesh.position.toArray(),
        intent,
      }),
    );
    if (entity.mesh.position.distanceTo(home) <= 5) {
      returned = true;
      break;
    }
  }
  assert.ok(
    returned,
    `Return route stalled at ${entity.mesh.position.toArray()}`,
  );
  t.diagnostic(
    JSON.stringify({
      outboundTime,
      outboundDistance,
      returnTime: elapsed - outboundTime,
      totalBlockedFrames: blocked,
      endpoint: entity.mesh.position.toArray(),
    }),
  );
});

test("The guarded western paw pocket stays outside pursuit permission while its forward rim retains a real hunter", () => {
  const w = world(),
    titan = w.titan,
    c = controller({
      contains: w.caves.records[0].contains,
      canTraverse: actualTraverse,
    });
  titan.setPose({ relicHeld: true, awareness: 1 });
  assert.equal(actualTraverse(threshold, titan.waitPoint), false);
  assert.equal(actualTraverse(threshold, titan.approachPoint), false);
  const intent = c.step(
    0.1,
    context({ position: threshold, player: titan.waitPoint }),
  );
  assert.equal(
    intent.hunting,
    false,
    "The final western paw pocket lies beyond the unchanged 75m pursuit route permission",
  );
  assert.equal(intent.returning, true);
  c.reset();
  const forwardRim = new T.Vector3(-130, -600, -1590);
  assert.equal(
    actualTraverse(threshold, forwardRim),
    false,
    "The full hunter cannot enter the actual head/paw rim",
  );
  const rimIntent = c.step(
    0.1,
    context({ position: threshold, player: forwardRim }),
  );
  assert.equal(rimIntent.hunting, true);
  assert.equal(rimIntent.hold, false);
  assert.ok(vector(rimIntent.target).distanceTo(threshold) < 12);
  assert.ok(vector(rimIntent.target).distanceTo(forwardRim) > 10);
  assert.equal(actualTraverse(vector(rimIntent.target), forwardRim), false);
  assert.equal(canPredatorRetaliate(25, species.length), true);
  assert.equal(canPredatorRetaliate(30, species.length), true);
  assert.equal(canPredatorRetaliate(32, species.length), true);
  assert.equal(canPredatorRetaliate(33, species.length), false);
  const predator = new T.Vector3(-125, -600, -1533),
    player = new T.Vector3(-125, -600, -1550),
    forward = new T.Vector3(0, 0, -1);
  assert.equal(actualTraverse(predator, predator), true);
  assert.equal(
    predatorBiteContact({
      previousPredator: predator,
      predator,
      predatorForward: forward,
      predatorLength: species.length,
      previousPlayer: player,
      player,
      playerForward: forward,
      playerLength: 25,
      edible: false,
    }),
    true,
  );
  w.titanQuest.reset();
});

test("A short return joins the actual home only after its full-body segment clears, with bounded query reuse", () => {
  let clear = false,
    calls = 0;
  const current = new T.Vector3(-85, -600, -1592),
    input = context({
      position: current,
      player: new T.Vector3(-85, -600, -1390),
    }),
    original = current.clone(),
    c = controller({
      canTraverse: (from, to, options) => {
        calls++;
        assert.equal(options.species, species);
        assert.equal(options.populationIndex, 5);
        assert.deepEqual(to, { x: home.x, y: home.y, z: home.z });
        return clear;
      },
    });
  const blocked = c.step(0.1, input);
  assert.equal(blocked.hunting, false);
  assert.equal(blocked.returning, true);
  assert.ok(vector(blocked.target).distanceTo(home) > 20);
  clear = true;
  c.step(0.1, input);
  assert.equal(
    calls,
    1,
    "Stable short return reuses the existing clearance cadence",
  );
  const direct = c.step(0.21, input);
  assert.equal(calls, 2);
  assert.ok(vector(direct.target).distanceTo(home) < 1e-8);
  assert.deepEqual(
    current,
    original,
    "Route permission cannot teleport the hunter",
  );
  c.step(50, { ...input, active: false });
  assert.equal(calls, 2, "Pause freezes return queries");
  clear = false;
  const obstructed = c.step(0.31, input);
  assert.equal(calls, 3);
  assert.ok(
    vector(obstructed.target).distanceTo(home) > 20,
    "A newly blocked segment falls back to the real turn route",
  );
});
