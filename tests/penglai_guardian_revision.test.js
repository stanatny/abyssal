import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  guardianPulseRadius,
  guardianRoarContact,
} from "../src/penglai_guardian_rules.js";
import { trackGroundProgress } from "../src/ground_creatures.js";
import { PENGLAI_LORDS } from "../src/penglai_lords.js";
import { PENGLAI_SPECIES } from "../src/penglai_species.js";
import { PENGLAI_BOSS_INSTANCES } from "../src/penglai_config.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { createEncounters } from "../src/encounters.js";
import { createCreature } from "../src/creatures.js";
import { lordMoveClear } from "../src/lord_navigation.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";
import { createPlayer, canEat, tickVitals } from "../src/simulation.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";

const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (target, key) => target[key] ?? noop },
);
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
};
const kind = (name) => PENGLAI_LORDS.find((s) => s.kind === name);
const v = (x, y, z) => new T.Vector3(x, y, z);

test("Roar is a finite traveling front: future, past, side, altitude and rear remain safe", () => {
  const rule = kind("white_tiger").roar,
    origin = v(0, 0, 0),
    dir = v(0, 0, 1);
  const hit = (a, b = a, t0 = 0.9, t1 = 1) =>
    guardianRoarContact(a, b, origin, dir, t0, t1, rule);
  assert.equal(hit(v(0, 0, 100)), true);
  for (const p of [
    v(0, 0, 170),
    v(0, 0, 45),
    v(55, 0, 100),
    v(0, 55, 100),
    v(0, 0, -5),
    v(0, 0, 220),
  ])
    assert.equal(hit(p), false, p.toArray().join());
  assert.equal(
    hit(v(-55, 0, 100), v(55, 0, 100)),
    true,
    "relative swept crossing must hit between endpoints",
  );
  assert.equal(
    hit(v(0, 0, 100), v(0, 0, 100), 0, 1.1),
    true,
    "low FPS front cannot tunnel through a stationary target",
  );
});
test("Tortoise presents two separate fronts, not one long filled damaging disk", () => {
  const s = kind("black_tortoise");
  assert.equal(guardianPulseRadius(s, 1, 1.79, 3.8), -1);
  assert.equal(guardianPulseRadius(s, 0, 2.01, 3.8), -1);
  assert.equal(guardianPulseRadius(s, 1, 1.8, 3.8), 8);
  assert.ok(Math.abs(guardianPulseRadius(s, 1, 3.8, 3.8) - 78) < 1e-9);
  assert.equal(guardianPulseRadius(s, 1, 3.81, 3.8), -1);
  assert.ok(
    s.pulseWaveInterval > 1.5,
    "second hit must follow shared invulnerability",
  );
});
test("Blocked ground jitter triggers a checked backward attempt, ordinary progress and paused time do not", () => {
  const state = { phase: "walk", safeDirection: { x: 0, z: -1 } };
  for (let i = 0; i < 70; i++)
    trackGroundProgress(
      state,
      v((i % 2) * 0.15, 0, 0),
      v((1 - (i % 2)) * 0.15, 0, 0),
      1 / 60,
      0.1,
    );
  assert.ok(state.retreatRemaining > 0);
  assert.deepEqual(state.retreatHeading, { x: 0, z: -1 });
  const frozen = structuredClone(state);
  trackGroundProgress(state, v(0, 0, 0), v(100, 0, 0), 0, 100);
  assert.deepEqual(state, frozen);
  const moving = { phase: "walk", safeDirection: { x: 1, z: 0 } };
  for (let i = 0; i < 240; i++)
    trackGroundProgress(
      moving,
      v(i * 0.1, 0, 0),
      v((i + 1) * 0.1, 0, 0),
      1 / 60,
      0.1,
    );
  assert.equal(moving.retreatRemaining, undefined);
});
test("Northern Hujiao is a single ordinary pool resident and still retaliates at maximum player size", () => {
  const s = PENGLAI_SPECIES.find((s) => s.kind === "pool_hujiao"),
    p = createPlayer("orca", 29);
  p.length = 30;
  assert.equal(s.population, 1);
  assert.equal(s.length, 29);
  assert.equal(s.flying, false);
  assert.equal(s.groundbound, false);
  assert.equal(s.independentMovement, true);
  assert.deepEqual(s.spawnAnchors, [[75, -170, -980]]);
  assert.equal(s.schoolProfiles, undefined);
  assert.equal(canEat(p, s.length), true);
  assert.equal(canPredatorRetaliate(30, s.length), true);
  assert.equal(canPredatorRetaliate(34, s.length), false);
});

test("Mature Hujiao HF crown remains attached to the continuous axial surface", () => {
  const root = createCreature("pool_hujiao", 29),
    { mesh } = root.userData.hfRig;
  const p = mesh.geometry.attributes.position,
    crown = [];
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) > 0.09 && p.getZ(i) < -0.1) crown.push(i);
  assert.ok(crown.length > 50);
  const neutral = crown.map((i) => new T.Vector3().fromBufferAttribute(p, i));
  for (let f = 0; f < 180; f++) {
    root.userData.animate(f / 60, 3);
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    crown.forEach((id, i) => {
      const v = mesh.getVertexPosition(id, new T.Vector3());
      assert.ok(v.toArray().every(Number.isFinite));
      assert.ok(
        v.distanceTo(neutral[i]) < 0.04,
        "crown remains on anterior trunk",
      );
    });
  }
  root.userData.disposeLocalMotion();
});

test("All five real Penglai lord models start clear of actual scenery; full bodies reject blocked turns and shifts", () => {
  const scene = new T.Scene(),
    doc = globalThis.document;
  delete globalThis.document;
  const ocean = createPenglaiOcean(scene);
  globalThis.document = doc;
  const blocked = (a, b, radius = 0) =>
    castIndexedSegment(a, b, { staticColliders: ocean.colliders, radius }) !==
    null;
  const encounters = createEncounters(scene, {
    seabedHeight: ocean.heightAt,
    groundHeightAt: ocean.groundHeightAt,
    navigationBlocked: blocked,
    audio: { bitten: noop, biteLord: noop, bossAttack: noop },
    notify: noop,
    onDamage: noop,
    onBite: noop,
  });
  try {
    encounters.reset(
      PENGLAI_LORDS.map((s) => s.kind),
      {},
      PENGLAI_BOSS_INSTANCES,
    );
    const entries = encounters.bosses.filter((e) => e.enabled);
    assert.equal(entries.length, 5);
    for (const e of entries) {
      assert.equal(e.navigationReady, true, e.state.species.kind);
      assert.equal(
        lordMoveClear(
          e,
          e.mesh.position,
          e.mesh.position,
          e.mesh.quaternion,
          ocean.groundHeightAt,
          blocked,
        ),
        true,
        e.state.species.kind,
      );
      const heights = e.navigation.probes.map((p) => p.radius);
      assert.ok(heights.every((r) => r > 1));
      let radiusSeen = 0;
      assert.equal(
        lordMoveClear(
          e,
          e.mesh.position,
          e.mesh.position,
          e.mesh.quaternion,
          ocean.groundHeightAt,
          (_a, _b, r) => {
            radiusSeen = r;
            return r > 0;
          },
        ),
        false,
      );
      assert.ok(
        radiusSeen > 1,
        "body clearance cannot fall back to a sight line",
      );
    }
    encounters.reset(
      ["white_tiger"],
      {},
      PENGLAI_BOSS_INSTANCES.filter((i) => i.kind === "white_tiger"),
    );
    assert.equal(encounters.bosses.filter((e) => e.enabled).length, 1);
    encounters.reset(
      PENGLAI_LORDS.map((s) => s.kind),
      {},
      PENGLAI_BOSS_INSTANCES,
    );
    assert.ok(
      encounters.bosses
        .filter((e) => e.enabled)
        .every((e) => e.navigationReady),
    );
  } finally {
    encounters.dispose();
    encounters.dispose();
    ocean.dispose();
  }
});

function combatFixture(name) {
  const scene = new T.Scene(),
    events = [],
    p = createPlayer("orca", 15),
    position = v(0, -400, -60),
    forward = v(0, 0, -1);
  let time = 0;
  const floor = name === "white_tiger" ? 10 : -900;
  const e = createEncounters(scene, {
    seabedHeight: () => floor,
    groundHeightAt: () => floor,
    audio: { bitten: noop, biteLord: noop, bossAttack: noop },
    notify: noop,
    onDamage: () => events.push({ time, health: p.health }),
    onBite: noop,
  });
  e.reset([name]);
  const b = e.bosses.find((b) => b.enabled);
  b.home.set(0, -400, 0);
  b.mesh.position.copy(b.home);
  b.heading.set(0, 0, -1);
  b.mesh.quaternion.identity();
  if (name === "white_tiger") {
    b.home.y = b.mesh.position.y = 24;
    b.radius = 190;
    position.y = 24;
  }
  const step = (blocked = () => false) => {
    time += 1 / 60;
    tickVitals(p, 1 / 60);
    e.update(1 / 60, time, p, position, forward, { blockedBetween: blocked });
  };
  return {
    e,
    b,
    p,
    position,
    events,
    step,
    get time() {
      return time;
    },
  };
}
test("Natural Tortoise sequence hits twice, permits vertical evasion and obeys solid cover", () => {
  for (const dodge of [false, true, "cover"]) {
    const f = combatFixture("black_tortoise");
    try {
      while (f.time < 7) {
        if (
          f.b.state.phase === "windup" &&
          f.b.state.timer > f.b.state.phaseDuration - 0.5 &&
          dodge === true
        )
          f.position.y = -360;
        f.step(dodge === "cover" ? () => true : () => false);
      }
      assert.equal(f.events.length, dodge ? 0 : 2, String(dodge));
      if (!dodge) {
        assert.ok(f.events[1].time - f.events[0].time > 1.5);
        assert.equal(f.b.state.phase, "recover");
      }
    } finally {
      f.e.dispose();
    }
  }
});
test("Tiger alternates leap and roar outside the old hill radius and locks a dodgeable course", () => {
  for (const dodge of [false, true]) {
    const f = combatFixture("white_tiger");
    try {
      f.position.set(0, 24, -170);
      let seenRoar = false,
        roarHits = 0;
      while (f.time < 15) {
        const s = f.b.state;
        if (s.ability === "roar" && s.phase === "windup") {
          seenRoar = true;
          if (dodge && s.timer > s.phaseDuration - 0.5) f.position.x = 70;
        }
        const before = f.events.length;
        f.step();
        if (s.ability === "roar") roarHits += f.events.length - before;
        if (seenRoar && s.ability === "roar" && s.phase === "recover") break;
      }
      assert.equal(seenRoar, true);
      assert.equal(roarHits, dodge ? 0 : 1);
      assert.equal(f.b.state.phase, "recover");
      assert.equal(f.b.state.phaseDuration, 3);
    } finally {
      f.e.dispose();
    }
  }
});
