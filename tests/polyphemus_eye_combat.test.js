import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createEncounters } from "../src/encounters.js";
import { createPlayer, tickVitals } from "../src/simulation.js";
import {
  BOSS_SPECIES,
  createBossState,
  hitBoss,
  hitBossWithTorpedo,
  hitBossWithCorpseBlast,
} from "../src/boss_rules.js";
import { createAreaBlast, createBlastBodyQuery } from "../src/area_blast.js";
import { createMechanicalTorpedoes } from "../src/mechanical_torpedoes.js";
import { createMechanicalAim } from "../src/mechanical_torpedo_aim.js";
import { MECHANICAL_RULES } from "../src/mechanical_shark_rules.js";
import {
  polyphemusEyeFrame,
  polyphemusEyeTarget,
  polyphemusEyeImpact,
} from "../src/polyphemus_weakpoint.js";
import { finishNextBossAttack } from "./helpers/boss_cycle.js";

// 只替换二维贴图绘制；战斗状态、实际 HF 皮肤、眼部接触、飞行和伤害均使用生产模块。
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

function fixture(t, character = "orca", length = 25) {
  const scene = new T.Scene(),
    events = { bites: 0, notifications: [] };
  const encounters = createEncounters(scene, {
    seabedHeight: () => -500,
    audio: { bitten: noop, biteLord: noop, bossAttack: noop },
    notify: (msg) => events.notifications.push(msg),
    onDamage: noop,
    onBite: () => events.bites++,
    onTorpedoHit: noop,
  });
  encounters.reset(["polyphemus"], {}, [
    {
      id: "eye_test",
      kind: "polyphemus",
      home: [0, -400, 0],
      radius: 620,
      maxCenterY: -400,
    },
  ]);
  const entry = encounters.bosses.find(
      (b) => b.enabled && b.state.species.kind === "polyphemus",
    ),
    player = createPlayer(character, 25);
  player.length = length;
  const position = new T.Vector3(0, -370, -100),
    forward = new T.Vector3(0, 0, 1);
  let time = 0;
  const step = (dt = 1 / 60, blockedBetween = () => false) => {
    time += dt;
    tickVitals(player, dt);
    return encounters.update(dt, time, player, position, forward, {
      blockedBetween,
    });
  };
  const recover = () => {
    entry.state.phase = "recover";
    entry.state.timer = 0.1;
    entry.state.phaseDuration =
      entry.state.species.abilityTimings.boulder.recover;
    entry.state.openingSpent = false;
    entry.previousPhase = "recover";
  };
  const mouthAt = (at, normal, distance = 1.5) => {
    const mouth = at.clone().addScaledVector(normal, distance);
    forward.copy(normal).negate();
    position.copy(mouth).addScaledVector(forward, -player.length * 0.38);
  };
  const eyeStation = () => {
    const frame = polyphemusEyeFrame(entry.mesh);
    mouthAt(frame.center, frame.normal);
  };
  recover();
  entry.mesh.userData.setPolyphemusCombat({
    phase: "recover",
    ability: "boulder",
    progress: 0,
  });
  entry.mesh.userData.animate(0, 1);
  entry.mesh.updateMatrixWorld(true);
  t.after(() => encounters.dispose());
  return {
    scene,
    encounters,
    entry,
    player,
    position,
    forward,
    events,
    step,
    recover,
    mouthAt,
    eyeStation,
  };
}
function actualVertex(f, rest) {
  const mesh = f.entry.mesh.userData.hfRig.mesh,
    p = mesh.geometry.attributes.position,
    target = new T.Vector3(...rest),
    v = new T.Vector3();
  let nearest = 0,
    d = Infinity;
  for (let i = 0; i < p.count; i++) {
    const n = v.fromBufferAttribute(p, i).distanceToSquared(target);
    if (n < d) {
      nearest = i;
      d = n;
    }
  }
  f.entry.mesh.updateMatrixWorld(true);
  return mesh
    .getVertexPosition(nearest, new T.Vector3())
    .applyMatrix4(mesh.matrixWorld);
}

// 这些是预设的单位测试站位和技能阶段，不是完整原生远征通关录像。
test("Real body, rear and foot bites cannot damage the giant; the25m gate and actual recovery-eye contact remain authoritative", (t) => {
  const f = fixture(t);
  assert.equal(f.entry.state.species.damageTarget, "eye");
  assert.deepEqual(f.entry.state.species.counterPhases, ["recover"]);
  for (const [rest, normal] of [
    [
      [0, 0.05, -0.2],
      [0, 0, -1],
    ],
    [
      [0, 0.335, 0.2],
      [0, 0, 1],
    ],
    [
      [-0.22, -0.493, -0.05],
      [0, 0, -1],
    ],
  ]) {
    f.recover();
    f.mouthAt(actualVertex(f, rest), new T.Vector3(...normal));
    f.step(0.05);
    assert.equal(f.entry.state.health, 210);
    assert.equal(f.entry.state.validatedHits, 0);
    assert.equal(f.entry.lastBiteResult.hit, false);
  }
  f.recover();
  f.player.length = 24.99;
  f.eyeStation();
  f.step(0.05);
  assert.equal(f.entry.state.health, 210);
  assert.equal(
    hitBoss(f.player, f.entry.state, { inRange: true, weakpointHit: true })
      .reason,
    "too_small",
  );
  f.player.length = 25;
  f.entry.state.phase = "windup";
  f.entry.state.phaseDuration = 1.8;
  f.entry.state.timer = 0.5;
  f.entry.previousPhase = "windup";
  f.eyeStation();
  f.step(0.05);
  assert.equal(f.entry.state.health, 210);
  assert.equal(
    hitBoss(f.player, f.entry.state, { inRange: true, weakpointHit: true })
      .reason,
    "opening_closed",
  );
  f.recover();
  f.eyeStation();
  f.step(0.05);
  assert.equal(f.entry.state.health, 140);
  assert.equal(f.entry.state.validatedHits, 1);
  assert.equal(f.events.bites, 1);
});

test("Three separated real recovery-eye bites defeat once; holding contact, rearming or cooldown alone cannot spend another opening", (t) => {
  const f = fixture(t);
  for (let hit = 1; hit <= 3; hit++) {
    if (hit > 1) finishNextBossAttack(f.entry.state);
    f.eyeStation();
    f.step(0.05);
    assert.equal(f.entry.state.validatedHits, hit);
    assert.equal(f.entry.state.health, 210 - hit * 70);
    if (hit === 3) break;
    for (let n = 0; n < 25; n++) {
      f.eyeStation();
      f.step(0.05);
    }
    assert.equal(
      f.entry.state.validatedHits,
      hit,
      "Holding the true eye cannot repeatedly damage it",
    );
    const frame = polyphemusEyeFrame(f.entry.mesh);
    f.position.copy(frame.center).addScaledVector(frame.normal, 50);
    for (let n = 0; n < 9; n++) f.step(0.05);
    assert.equal(f.entry.state.contactArmed, true);
    f.eyeStation();
    f.step(0.05);
    assert.equal(
      f.entry.state.validatedHits,
      hit,
      "A fresh approach still needs a new completed attack opening",
    );
  }
  assert.equal(f.entry.state.defeated, true);
  assert.equal(f.entry.mesh.visible, false);
  assert.equal(
    f.entry.polyphemusEyeMarker.mesh.visible,
    false,
    "The exposed-eye outline retires with the defeated sentinel",
  );
  assert.equal(f.player.bossesDefeated, 1);
  const data = f.encounters.boulders?.entries.get(f.entry);
  if (data)
    for (const name of [
      "held",
      "flying",
      "warning",
      "wave",
      "landing",
      "surge",
    ])
      assert.equal(data[name].visible, false, name);
  f.step(0.05);
  assert.equal(f.player.bossesDefeated, 1);
  assert.equal(f.entry.state.health, 0);
});

test("Shared melee, torpedo and corpse-blast APIs reject absent or false eye proof, with unchanged ordinary-lord rules", () => {
  const giant = BOSS_SPECIES.find((s) => s.kind === "polyphemus");
  for (const [channel, character] of [
    [hitBossWithTorpedo, "mechanical_shark"],
    [hitBossWithCorpseBlast, "zombie_shark"],
  ]) {
    const player = createPlayer(character, 25),
      state = createBossState(giant);
    state.phase = "recover";
    for (const options of [undefined, { weakpointHit: false }]) {
      assert.equal(channel(player, state, options).reason, "eye_required");
      assert.equal(state.health, 210);
    }
    player.length = 24.99;
    assert.equal(channel(player, state, { weakpointHit: true }).hit, false);
    assert.equal(state.health, 210);
    player.length = 25;
    assert.equal(channel(player, state, { weakpointHit: true }).hit, true);
    assert.equal(state.health, 140);
  }
  const p = createPlayer("orca", 25),
    g = createBossState(giant);
  g.phase = "recover";
  assert.equal(
    hitBoss(p, g, { inRange: true, isFlank: true }).reason,
    "eye_required",
  );
  const hydra = createBossState(BOSS_SPECIES.find((s) => s.kind === "hydra"));
  hydra.phase = "recover";
  assert.equal(
    hitBoss(p, hydra, { inRange: true }).hit,
    true,
    "Other lords must not inherit the eye-only rule",
  );
});

test("Encounter ranged settlement accepts actual eye impact and rejects even nearby actual forehead or rear-skin projection", (t) => {
  for (const character of ["mechanical_shark", "zombie_shark"]) {
    const f = fixture(t, character),
      settle =
        character === "mechanical_shark"
          ? f.encounters.torpedoHit
          : f.encounters.corpseBlastHit;
    for (const rest of [
      [0, 0.39, -0.21],
      [0, 0.05, -0.2],
      [0, 0.335, 0.2],
    ]) {
      const contact = actualVertex(f, rest);
      assert.equal(settle(f.player, f.entry, contact).hit, false);
      assert.equal(f.entry.state.health, 210);
    }
    const eye = polyphemusEyeTarget(f.entry.mesh);
    assert.equal(settle(f.player, f.entry, eye).hit, true);
    assert.equal(f.entry.state.health, 140);
  }
});

test("Actual14m area blasts reach a visible eye but cannot convert a direct body hit, skull-back burst or cover into an eye hit", (t) => {
  assert.equal(MECHANICAL_RULES.blastRadius, 14);
  for (const mode of [
    "front",
    "direct_eye",
    "body_direct",
    "body_secondary",
    "behind",
    "covered",
    "far",
  ]) {
    const f = fixture(t, "zombie_shark"),
      frame = polyphemusEyeFrame(f.entry.mesh);
    let at = frame.center.clone().addScaledVector(frame.normal, 10),
      direct = null;
    if (mode === "direct_eye") {
      at.copy(frame.center);
      direct = f.entry;
    }
    if (mode.startsWith("body")) {
      at = actualVertex(f, [0, 0.39, -0.21]);
      if (mode === "body_direct") direct = f.entry;
      assert.ok(at.distanceTo(frame.center) < 14);
    }
    if (mode === "behind")
      at.copy(frame.center).addScaledVector(frame.normal, -10);
    if (mode === "far") at.copy(frame.center).addScaledVector(frame.normal, 20);
    const blast = createAreaBlast({
      bosses: () => [f.entry],
      blocked: () => mode === "covered",
      hitBoss: (p, b, point) => f.encounters.corpseBlastHit(p, b, point),
    });
    const result = blast(at, f.player, direct),
      hit = mode === "front" || mode === "direct_eye";
    assert.equal(result.bossHits, hit ? 1 : 0, mode);
    assert.equal(f.entry.state.health, hit ? 140 : 210, mode);
  }
});

test("Production torpedo preview and collision use the posed eye inside7degrees even when the body centre is outside, ignoring an old body proxy", (t) => {
  const f = fixture(t, "mechanical_shark"),
    frame = polyphemusEyeFrame(f.entry.mesh),
    origin = frame.center.clone().addScaledVector(frame.normal, 50),
    direction = frame.center.clone().sub(origin).normalize();
  assert.ok(
    direction.angleTo(f.entry.mesh.position.clone().sub(origin)) >
      T.MathUtils.degToRad(7),
  );
  const proxy = new T.Mesh(new T.SphereGeometry(5), new T.MeshBasicMaterial());
  proxy.position.copy(frame.center).addScaledVector(frame.normal, 20);
  proxy.updateMatrixWorld(true);
  f.entry.mesh.userData.contactRoot = proxy;
  t.after(() => {
    proxy.geometry.dispose();
    proxy.material.dispose();
  });
  const impacts = [],
    blasts = [];
  const tube = createMechanicalTorpedoes(f.scene, {
    bosses: () => [f.entry],
    heightAt: () => -900,
    waterHeightAt: () => 100,
    hitBoss: (p, b, point) => {
      const result = f.encounters.torpedoHit(p, b, point);
      impacts.push({ point: point.toArray(), result });
      return result;
    },
    onBlast: (result) =>
      blasts.push({ point: result.point.toArray(), bossHits: result.bossHits }),
  });
  t.after(() => tube.dispose());
  const preview = tube.previewAim(origin, direction, f.player);
  assert.ok(preview?.eligible);
  assert.equal(preview.entity, f.entry);
  assert.ok(preview.point.distanceTo(frame.center) < 1e-6);
  assert.equal(tube.activate(f.player, origin, direction), true);
  for (let i = 0; i < 100; i++) {
    tickVitals(f.player, 1 / 60);
    tube.update(1 / 60, f.player);
  }
  assert.equal(
    f.entry.state.validatedHits,
    1,
    JSON.stringify({
      impacts,
      blasts,
      phase: f.entry.state.phase,
      projectile: tube.projectiles[0].mesh.position.toArray(),
    }),
  );
  assert.equal(
    f.entry.state.health,
    140,
    "A body proxy detonation must not intercept or fake the actual eye hit",
  );
  assert.equal(impacts.length, 1);
  assert.ok(
    polyphemusEyeImpact(f.entry.mesh, new T.Vector3(...impacts[0].point)),
  );
  assert.ok(tube.projectiles.every((p) => !p.active));
});

test("A locked mechanical target steers toward the moved real eye rather than the body centre; the blast-body query shares that visible target and range", (t) => {
  const f = fixture(t, "mechanical_shark"),
    frame = polyphemusEyeFrame(f.entry.mesh),
    origin = frame.center.clone().addScaledVector(frame.normal, 50),
    direction = frame.center.clone().sub(origin).normalize();
  const bossPoint = (from, b) => {
    const eye = polyphemusEyeTarget(b.mesh);
    return polyphemusEyeImpact(b.mesh, eye, { origin: from }) ? eye : null;
  };
  const aim = createMechanicalAim({
    entities: () => [],
    bosses: () => [f.entry],
    blocked: () => false,
    bossPoint,
  });
  const selected = aim.select(origin, direction, f.player);
  assert.ok(selected);
  f.entry.mesh.userData.setPolyphemusTarget(
    origin.clone().add(new T.Vector3(30, 0, 0)),
  );
  f.entry.mesh.userData.animate(1, 1);
  f.entry.mesh.updateMatrixWorld(true);
  const eye = polyphemusEyeTarget(f.entry.mesh),
    expected = eye.clone().sub(origin).normalize();
  assert.ok(eye.distanceTo(selected.point) > 0.05);
  const projectile = {
    mesh: { position: origin.clone() },
    direction: direction.clone(),
    target: selected,
    aimCheckAt: 0,
  };
  aim.steer(projectile, 0.5, 1);
  assert.ok(projectile.direction.dot(expected) > 0.999999);
  assert.ok(
    projectile.direction.angleTo(f.entry.mesh.position.clone().sub(origin)) >
      T.MathUtils.degToRad(7),
  );
  const query = createBlastBodyQuery();
  assert.ok(query(origin, f.entry)?.distanceTo(eye) < 1e-6);
  assert.equal(Boolean(query(origin, f.entry, 49)), false);
  assert.equal(
    Boolean(query(eye.clone().addScaledVector(frame.normal, -20), f.entry)),
    false,
    "Body query must not expose a target through the head",
  );
});

test("Mechanical preview skips precise eye rays only beyond the conservative whole-giant bound and retains real-eye cone admission nearby", (t) => {
  const f = fixture(t, "mechanical_shark"),
    eye = polyphemusEyeTarget(f.entry.mesh);
  let queries = 0;
  const aim = createMechanicalAim({
    entities: () => [],
    bosses: () => [f.entry],
    blocked: () => false,
    bossPoint: (origin, entry) => {
      queries++;
      const target = polyphemusEyeTarget(entry.mesh);
      return polyphemusEyeImpact(entry.mesh, target, { origin })
        ? target
        : null;
    },
  });
  const conservative = MECHANICAL_RULES.range + f.entry.state.species.length;
  for (const distance of [conservative + 0.01, 600]) {
    const origin = f.entry.mesh.position
      .clone()
      .add(new T.Vector3(0, 0, -distance));
    assert.equal(
      aim.select(origin, eye.clone().sub(origin).normalize(), f.player),
      null,
    );
    assert.equal(
      queries,
      0,
      "A definitely far giant must not trigger posed triangle/occlusion queries each preview frame",
    );
  }
  const boundary = f.entry.mesh.position
    .clone()
    .add(new T.Vector3(0, 0, -conservative));
  assert.equal(
    aim.select(boundary, eye.clone().sub(boundary).normalize(), f.player),
    null,
  );
  assert.equal(
    queries,
    1,
    "The inclusive conservative boundary must still use the actual eye distance",
  );
  queries = 0;
  const frame = polyphemusEyeFrame(f.entry.mesh),
    origin = eye.clone().addScaledVector(frame.normal, 50),
    direction = eye.clone().sub(origin).normalize();
  assert.ok(
    direction.angleTo(f.entry.mesh.position.clone().sub(origin)) >
      T.MathUtils.degToRad(MECHANICAL_RULES.aimConeDegrees),
  );
  const selected = aim.select(origin, direction, f.player);
  assert.ok(selected?.eligible);
  assert.equal(selected.entity, f.entry);
  assert.ok(selected.point.distanceTo(eye) < 1e-6);
  assert.ok(
    queries > 0,
    "A real eye inside7degrees remains selectable even when its body centre is outside",
  );
});
