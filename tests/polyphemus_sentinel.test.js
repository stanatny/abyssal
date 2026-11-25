import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createEncounters } from "../src/encounters.js";
import { createPlayer, tickVitals } from "../src/simulation.js";
import { castSegment } from "../src/collision.js";
import { BOSS_SPECIES, createBossState, tickBoss } from "../src/boss_rules.js";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { POLYPHEMUS_COMBAT as COMBAT } from "../src/polyphemus_combat.js";
import { POLYPHEMUS_SITE } from "../src/odyssey_polyphemus_site.js";
import { buildPolyphemusHF } from "../src/polyphemus_hf_asset.js";
import {
  BOULDER,
  boulderPoint,
  polyphemusThrowTarget,
  createPolyphemusBoulders,
} from "../src/polyphemus_boulder.js";

const giant = ODYSSEY_LORDS.find((s) => s.kind === "polyphemus");
function context(distance, options = {}) {
  return {
    inTerritory: distance < POLYPHEMUS_SITE.radius,
    distance,
    lineOfSight: true,
    aimReady: true,
    ...options,
  };
}

// 仅预设攻击阶段和玩家站位；使用真实 HF 掌心、岩石、预警、弹道与碰撞生命周期。
function flightFixture(t, distance = 600) {
  const scene = new T.Scene(),
    root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.position.fromArray(POLYPHEMUS_SITE.home);
  root.scale.setScalar(giant.length);
  root.userData.setPolyphemusCombat({
    phase: "attack",
    ability: "boulder",
    progress: BOULDER.release,
  });
  motions[0](COMBAT.hunt + COMBAT.windup + COMBAT.attack * BOULDER.release);
  scene.add(root);
  root.updateMatrixWorld(true);
  const origin = root.userData.getThrowAnchorWorldPosition(new T.Vector3());
  const target = origin.clone().add(new T.Vector3(0, 0, -distance));
  const safe = target.clone().add(new T.Vector3(0, 100, 0));
  const entry = {
    enabled: true,
    mesh: root,
    playerRadius: 30 * 0.16,
    lockTarget: target.clone(),
    state: {
      ...createBossState(giant),
      phase: "windup",
      timer: COMBAT.windup - 0.1,
      phaseDuration: COMBAT.windup,
    },
  };
  const system = createPolyphemusBoulders(scene),
    hits = [];
  const update = (dt = 0.05, from = safe, to = from, options = {}) => {
    system.update(entry, dt, 0, from, to, {
      hit: (...args) => {
        hits.push(args);
        return true;
      },
      ...options,
    });
    return system.entries.get(entry);
  };
  const launch = (from = safe, options = {}) => {
    entry.state.phase = "attack";
    entry.state.phaseDuration = COMBAT.attack;
    entry.state.timer = COMBAT.attack * BOULDER.release;
    return update(0.05, from, from, options);
  };
  t.after(() => {
    system.dispose();
    root.userData.disposeLocalMotion();
  });
  return {
    scene,
    root,
    origin,
    target,
    safe,
    entry,
    system,
    hits,
    update,
    launch,
  };
}

test("Polyphemus keeps600m discovery while Karkinos uses its separate260m boundary and other lords stay220m", () => {
  assert.equal(giant.engageRange, 600);
  assert.equal(giant.wakeRange, 600);
  assert.equal(COMBAT.territoryRadius, 620);
  assert.equal(POLYPHEMUS_SITE.radius, 620);
  assert.equal(giant.stationary, true);
  assert.equal(giant.speed, 0);
  assert.equal(giant.damage, 30);
  assert.equal(giant.minAttackLength, 25);
  for (const species of BOSS_SPECIES.filter((s) => s.kind !== "polyphemus")) {
    const wake = species.kind === "karkinos" ? 260 : 220;
    assert.equal(species.wakeRange ?? 220, wake, species.kind);
    const outside = createBossState(species);
    tickBoss(outside, 0.1, {
      inTerritory: true,
      distance: wake + 0.1,
      lineOfSight: true,
    });
    assert.equal(
      outside.phase,
      "dormant",
      `${species.kind} must not inherit 600m discovery`,
    );
    const boundary = createBossState(species);
    tickBoss(boundary, 0.01, {
      inTerritory: true,
      distance: wake,
      lineOfSight: true,
    });
    assert.equal(
      boundary.phase,
      "hunt",
      `${species.kind} retains the inclusive 220m wake boundary`,
    );
  }
});

test("clear discovery at 500, 599 and exactly 600m advances through the real windup into a counted throw", () => {
  for (const distance of [500, 599, 600]) {
    const state = createBossState(giant),
      c = context(distance);
    tickBoss(state, 0.1, c);
    assert.equal(state.phase, "hunt", `${distance}m discovery`);
    tickBoss(state, COMBAT.hunt - 0.1, c);
    assert.equal(state.phase, "windup", `${distance}m alignment admits windup`);
    tickBoss(state, COMBAT.windup, c);
    assert.equal(state.phase, "attack", `${distance}m firing`);
    assert.equal(state.attackCount, 1);
    assert.equal(state.phaseDuration, COMBAT.attack);
  }
});

test("600.1m cannot acquire a new target or start another throw from an already awake hunt", () => {
  const state = createBossState(giant);
  tickBoss(state, 20, context(600.1));
  assert.equal(state.phase, "dormant");
  assert.equal(state.attackCount, 0);
  tickBoss(state, 0.2, context(599));
  assert.equal(state.phase, "hunt");
  tickBoss(state, 20, context(600.1));
  assert.equal(state.phase, "hunt");
  assert.equal(state.timer, 0);
  assert.equal(state.attackCount, 0);
  tickBoss(state, COMBAT.hunt, context(600));
  assert.equal(state.phase, "windup");
});

test("solid cover prevents discovery and a visible but unaligned sentinel remains hunting until aim is ready", () => {
  const covered = createBossState(giant);
  for (let i = 0; i < 30; i++)
    tickBoss(covered, 0.1, context(599, { lineOfSight: false }));
  assert.equal(covered.phase, "dormant");
  assert.equal(covered.attackCount, 0);
  const turning = createBossState(giant);
  for (let i = 0; i < 30; i++)
    tickBoss(turning, 0.1, context(599, { aimReady: false }));
  assert.equal(turning.phase, "hunt");
  assert.equal(turning.timer, 0);
  assert.equal(turning.attackCount, 0);
  tickBoss(turning, 0.4, context(599));
  tickBoss(turning, 0.2, context(599, { lineOfSight: false }));
  assert.equal(
    turning.timer,
    0,
    "Cover must discard incomplete attack preparation",
  );
  tickBoss(turning, COMBAT.hunt, context(599));
  assert.equal(turning.phase, "windup");
});

test("paused windup does not progress and defeated or terminal-player state cannot begin another cast", () => {
  const state = createBossState(giant),
    c = context(599);
  tickBoss(state, COMBAT.hunt + 0.2, c);
  assert.equal(state.phase, "windup");
  const snapshot = {
    phase: state.phase,
    timer: state.timer,
    count: state.attackCount,
  };
  for (const dt of [0, -1, NaN, Infinity]) tickBoss(state, dt, c);
  assert.deepEqual(
    { phase: state.phase, timer: state.timer, count: state.attackCount },
    snapshot,
  );
  tickBoss(state, 20, { ...c, playerAlive: false });
  assert.equal(state.phase, "dormant");
  assert.equal(state.attackCount, 0);
  state.defeated = true;
  tickBoss(state, 20, c);
  assert.equal(state.attackCount, 0);
  assert.equal(state.phase, "dormant");
  const leaving = createBossState(giant);
  tickBoss(leaving, COMBAT.hunt + 0.2, c);
  tickBoss(leaving, 4, context(621));
  assert.equal(leaving.phase, "dormant");
  assert.equal(leaving.attackCount, 0);
});

test("an outward forecast beyond 600m falls back to the current legal target without mutating either input", () => {
  const origin = new T.Vector3(17, -300, 42);
  const orientation = new T.Quaternion();
  const current = origin.clone().add(new T.Vector3(0, 0, -599));
  const before = current.clone();
  for (const distance of [600.1, 720, 1000]) {
    const predicted = origin.clone().add(new T.Vector3(0, 0, -distance));
    const predictedBefore = predicted.clone();
    const out = polyphemusThrowTarget(origin, orientation, current, predicted);
    assert.ok(out.equals(current));
    assert.notEqual(out, current);
    assert.ok(predicted.equals(predictedBefore));
    assert.ok(current.equals(before));
    polyphemusThrowTarget(origin, orientation, current, predicted, predicted);
    assert.ok(
      predicted.equals(current),
      "The production aliased output must also keep the legal current target",
    );
  }
  const boundary = origin.clone().add(new T.Vector3(0, 0, -600));
  assert.ok(
    polyphemusThrowTarget(origin, orientation, current, boundary).equals(
      boundary,
    ),
  );
});

test("the 600m real HF palm warning and 2.5s flight share one exact endpoint without increasing the finite lifetime", (t) => {
  const f = flightFixture(t),
    d = f.update();
  const p = d.warning.geometry.attributes.position;
  assert.ok(
    new T.Vector3().fromBufferAttribute(p, 0).distanceTo(f.origin) < 2e-4,
  );
  assert.ok(
    new T.Vector3().fromBufferAttribute(p, p.count - 1).distanceTo(f.target) <
      2e-4,
  );
  assert.ok(d.landing.position.distanceTo(f.target) < 1e-8);
  assert.equal(d.surge.scale.x, 42);
  f.launch();
  const flight = d.flight;
  assert.equal(BOULDER.speed, 240);
  assert.equal(BOULDER.maxFlightTime, 3);
  assert.ok(Math.abs(flight.duration - 2.5) < 1e-9);
  assert.ok(flight.origin.distanceTo(f.origin) < 1e-9);
  assert.ok(d.flying.position.distanceTo(f.origin) < 1e-9);
  assert.ok(boulderPoint(flight, flight.duration).distanceTo(f.target) < 1e-8);
  for (let i = 0; i < 50; i++) f.update();
  assert.equal(d.flight, null);
  assert.ok(Math.abs(d.age - 2.5) < 1e-8);
  assert.ok(d.wave.position.distanceTo(f.target) < 1e-8);
  assert.equal(f.hits.length, 0);
  for (let i = 0; i < 35; i++) f.update();
  assert.equal(d.wave.visible, false);
});

test("a 600m throw hits the actual player once while a depth dodge escapes both stone and its finite impact ring", (t) => {
  for (const escaped of [false, true]) {
    const f = flightFixture(t),
      player = f.target.clone();
    if (escaped) player.y += 20;
    const d = f.update(0.05, player);
    f.launch(player);
    for (let i = 0; i < 90; i++) f.update(0.05, player);
    assert.equal(f.hits.length, escaped ? 0 : 1);
    if (!escaped) assert.equal(f.hits[0][0], giant.damage);
    assert.equal(d.flight, null);
    assert.equal(d.flying.visible, false);
    assert.equal(d.wave.visible, false);
  }
});

test("a real finite-radius wall cuts the 600m warning and actual boulder at the same near face", (t) => {
  const f = flightFixture(t),
    wall = f.origin.z - 300;
  let radiusQueries = 0;
  const blocked = (a, b, radius = 0) => {
    if (radius > 0) {
      radiusQueries++;
      assert.equal(radius, f.system.radius);
    }
    return Math.min(a.z, b.z) - radius <= wall;
  };
  const d = f.update(0.05, f.target, f.target, { blocked });
  const warned = d.landing.position.clone();
  assert.ok(Math.abs(warned.z - (wall + f.system.radius)) < 0.004);
  assert.ok(warned.distanceTo(f.target) > 290);
  f.launch(f.target, { blocked });
  for (let i = 0; i < 90; i++) f.update(0.05, f.target, f.target, { blocked });
  assert.ok(radiusQueries > 0);
  assert.equal(f.hits.length, 0);
  assert.ok(d.wave.position.distanceTo(warned) < 0.01);
  assert.equal(d.flight, null);
  assert.equal(d.wave.visible, false);
});

test("a released 600m flight freezes during pause and keeps its locked point after target and facing change", (t) => {
  const f = flightFixture(t),
    d = f.launch();
  f.update(0.5);
  const age = d.age,
    position = d.flying.position.clone(),
    flight = d.flight;
  for (const dt of [0, -1, NaN, Infinity]) f.update(dt);
  f.update(30, f.safe, f.safe, { active: false });
  assert.equal(d.age, age);
  assert.equal(d.flight, flight);
  assert.ok(d.flying.position.equals(position));
  f.entry.lockTarget.add(new T.Vector3(150, 50, 0));
  f.root.rotation.y = 1.2;
  for (let i = 0; i < 45; i++) f.update();
  assert.equal(d.flight, null);
  assert.ok(d.wave.position.distanceTo(f.target) < 1e-8);
  assert.equal(f.hits.length, 0);
});

test("defeating or disabling the sentinel clears its already airborne 600m hazard without delayed damage", (t) => {
  for (const terminal of ["defeated", "disabled"]) {
    const f = flightFixture(t),
      d = f.launch(f.target);
    f.update(0.5, f.target);
    assert.ok(d.flight);
    if (terminal === "defeated") f.entry.state.defeated = true;
    else f.entry.enabled = false;
    f.update(0, f.target);
    assert.equal(d.flight, null);
    for (const name of [
      "held",
      "flying",
      "warning",
      "wave",
      "landing",
      "surge",
    ])
      assert.equal(d[name].visible, false, name);
    for (let i = 0; i < 90; i++) f.update(0.05, f.target);
    assert.equal(f.hits.length, 0);
  }
});

// 只替换二维标签绘制；完整领主、踏步、动画、状态机与投石系统都使用生产实现。
const noop = () => {};
const canvasContext = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (target, key) => target[key] ?? noop },
);
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => canvasContext,
  }),
};
function encounterFixture(t, distance = 599) {
  const scene = new T.Scene();
  const home = [0, -400, 0];
  const instances = [
    {
      id: "sentinel_test",
      kind: "polyphemus",
      home,
      radius: 620,
      maxCenterY: -400,
    },
  ];
  const encounters = createEncounters(scene, {
    seabedHeight: () => -445,
    audio: { bitten: noop, biteLord: noop, bossAttack: noop },
    notify: noop,
    onDamage: noop,
    onBite: noop,
  });
  encounters.reset(["polyphemus"], {}, instances);
  const entry = encounters.bosses.find(
    (b) => b.enabled && b.state.species.kind === "polyphemus",
  );
  const player = createPlayer();
  player.length = 30;
  const position = new T.Vector3(0, -400, -distance),
    forward = new T.Vector3(0, 0, -1);
  const targetInputs = [],
    eyeRays = [];
  const originalTarget = entry.mesh.userData.setPolyphemusTarget;
  entry.mesh.userData.setPolyphemusTarget = (point) => {
    targetInputs.push(point?.clone() ?? null);
    originalTarget(point);
  };
  const wall = {
    type: "box",
    id: "sentinel_cover",
    x: 0,
    y: -380,
    z: -250,
    halfSize: new T.Vector3(150, 100, 5),
  };
  let time = 0,
    covered = false;
  const blockedBetween = (from, to, radius = 0) => {
    if (to === position) eyeRays.push(from.clone());
    return covered && castSegment(from, to, [wall], radius) !== null;
  };
  const step = (dt = 0.05) => {
    time += dt;
    tickVitals(player, dt);
    return encounters.update(dt, time, player, position, forward, {
      blockedBetween,
    });
  };
  const until = (condition, frames = 250) => {
    for (let i = 0; i < frames && !condition(); i++) step();
    assert.ok(
      condition(),
      `Encounter condition did not occur; phase=${entry.state.phase}, timer=${entry.state.timer}`,
    );
  };
  t.after(() => encounters.dispose());
  return {
    scene,
    encounters,
    entry,
    player,
    position,
    targetInputs,
    eyeRays,
    step,
    until,
    instances,
    set covered(value) {
      covered = value;
    },
    get time() {
      return time;
    },
  };
}

test("the actual encounter stops early-windup relocking after the actor swims from 599 to 601m", (t) => {
  const f = encounterFixture(t);
  f.until(() => f.entry.state.phase === "windup");
  assert.ok(f.eyeRays.length > 0);
  assert.ok(
    f.eyeRays.at(-1).distanceTo(f.entry.mesh.position) > giant.length * 0.1,
    "Discovery reads the actual eye rather than the body center",
  );
  const lock = f.entry.lockTarget.clone();
  assert.ok(lock.distanceTo(f.position) < 1e-8);
  f.position.z = -601;
  for (let i = 0; i < 10; i++) {
    f.step();
    assert.equal(f.entry.state.phase, "windup");
    assert.ok(
      f.entry.state.timer < f.entry.state.phaseDuration - giant.lockWindow,
      "This must exercise the tracking section before the final lock",
    );
    assert.ok(f.entry.lockTarget.equals(lock));
    assert.equal(
      f.targetInputs.at(-1),
      null,
      "The upper body must not acquire the new out-of-range position",
    );
  }
  f.position.set(30, -400, -Math.sqrt(599 ** 2 - 30 ** 2));
  f.step();
  assert.ok(
    f.entry.lockTarget.distanceTo(lock) > 20,
    "A new visible legal position still updates the early windup",
  );
  assert.ok(f.entry.lockTarget.distanceTo(f.entry.mesh.position) <= 600 + 1e-8);
  assert.ok(f.targetInputs.at(-1).equals(f.position));
  assert.deepEqual(f.entry.mesh.position.toArray(), [0, -400, 0]);
});

test("actual upper-body targeting drops covered actors and then follows the fixed final-windup and release lock", (t) => {
  const f = encounterFixture(t, 500);
  f.until(() => f.entry.state.phase === "windup");
  f.position.set(70, -400, -480);
  f.step();
  assert.ok(f.targetInputs.at(-1).equals(f.position));
  const visibleLock = f.entry.lockTarget.clone();
  f.covered = true;
  f.position.set(90, -400, -470);
  for (let i = 0; i < 4; i++) {
    f.step();
    assert.equal(f.targetInputs.at(-1), null);
    assert.ok(f.entry.lockTarget.equals(visibleLock));
  }
  f.covered = false;
  f.until(
    () =>
      f.entry.state.phase === "windup" &&
      f.entry.state.timer >= f.entry.state.phaseDuration - giant.lockWindow,
  );
  const committed = f.entry.lockTarget.clone(),
    orientation = f.entry.mesh.quaternion.clone();
  f.position.set(-100, -400, -470);
  f.step();
  assert.ok(f.targetInputs.at(-1).equals(committed));
  assert.ok(f.entry.lockTarget.equals(committed));
  assert.ok(f.entry.mesh.quaternion.angleTo(orientation) < 1e-8);
  f.until(() => f.entry.state.phase === "attack");
  f.covered = true;
  f.position.set(150, -400, -430);
  f.step();
  assert.ok(f.targetInputs.at(-1).equals(committed));
  assert.ok(f.entry.lockTarget.equals(committed));
  assert.ok(f.entry.mesh.quaternion.angleTo(orientation) < 1e-8);
  f.until(
    () =>
      f.entry.state.phase === "attack" &&
      f.entry.state.timer >= giant.attackDuration * BOULDER.release,
  );
  assert.ok(f.encounters.boulders.entries.get(f.entry).launched);
  assert.ok(f.targetInputs.at(-1).equals(committed));
  f.until(() => f.entry.state.phase === "recover");
  assert.equal(
    f.targetInputs.at(-1),
    null,
    "A covered recovering giant must not track an unseen actor",
  );
  assert.deepEqual(f.entry.mesh.position.toArray(), [0, -400, 0]);
});

test("the actual encounter freezes a turning sentinel during pause and ink and resets its pooled rig after a terminal player", (t) => {
  const f = encounterFixture(t, 500);
  f.position.set(500, -400, 0);
  f.step(0.15);
  assert.equal(f.entry.state.phase, "hunt");
  assert.equal(f.entry.polyphemusTurn.status.stepping, true);
  const q = f.entry.mesh.quaternion.clone(),
    home = f.entry.mesh.position.clone();
  f.step(0);
  assert.ok(f.entry.mesh.quaternion.equals(q));
  assert.equal(f.encounters.disorient(home, 100, f.time, 10), 1);
  f.step(0.1);
  assert.equal(f.entry.state.phase, "disoriented");
  assert.ok(f.entry.mesh.quaternion.equals(q));
  assert.ok(f.entry.mesh.position.equals(home));
  f.player.dead = true;
  f.step(0.1);
  assert.ok(f.entry.mesh.quaternion.equals(q));
  assert.ok(f.entry.mesh.position.equals(home));
  const oldRig = f.entry.polyphemusTurn;
  f.encounters.reset(["polyphemus"], {}, f.instances);
  assert.equal(
    f.entry.polyphemusTurn,
    oldRig,
    "New rounds reuse the owned turn controller",
  );
  assert.equal(f.entry.state.phase, "dormant");
  assert.equal(f.entry.polyphemusTurn.status.stepping, false);
  assert.ok(f.entry.mesh.quaternion.angleTo(new T.Quaternion()) < 1e-8);
  assert.ok(f.entry.mesh.position.equals(home));
  assert.equal(f.encounters.boulders.entries.size, 0);
});
