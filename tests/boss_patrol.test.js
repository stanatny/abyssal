import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createEncounters } from "../src/encounters.js";
import { getExpedition } from "../src/expedition_config.js";
import { createPlayer } from "../src/simulation.js";

// 只替换文字贴图；使用真实领主实例、主状态机和移动逻辑，空水域隔离巡游约束。
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

function fixture(t, id = "atlantis") {
  const scene = new THREE.Scene();
  const encounters = createEncounters(scene, {
    seabedHeight: () => -3200,
    audio: { hit: noop, eat: noop, bossAttack: noop },
    notify: noop,
    onDamage: noop,
    onBite: noop,
  });
  t.after(() => encounters.dispose());
  const region = getExpedition(id).region;
  const reset = () =>
    encounters.reset(region.bossKinds, region.bossHomes, region.bossInstances);
  reset();
  const player = createPlayer();
  const position = new THREE.Vector3(...region.spawn);
  const forward = new THREE.Vector3(0, 0, -1);
  let time = 0;
  const step = (dt = 1 / 30, blockedBetween = () => false) => {
    time += Math.max(0, Number.isFinite(dt) ? dt : 0);
    return encounters.update(dt, time, player, position, forward, {
      blockedBetween,
    });
  };
  return {
    encounters,
    reset,
    player,
    position,
    step,
    entries: encounters.bosses.filter((b) => b.enabled),
  };
}

for (const id of ["hawaii", "atlantis", "bermuda", "mariana"]) {
  test(`${id} 未接近时领主持续巡游，位置连续且整个待机游程留在领域内`, (t) => {
    const f = fixture(t, id);
    const histories = f.entries.map((b) => ({
      previous: b.mesh.position.clone(),
      distance: 0,
    }));
    for (let frame = 0; frame < 1350; frame++) {
      f.step();
      f.entries.forEach((b, i) => {
        const h = histories[i];
        const step = b.mesh.position.distanceTo(h.previous);
        assert.ok(step <= 3.4 / 30 + 1e-8, `${b.id} jump: ${step}`);
        h.distance += step;
        h.previous.copy(b.mesh.position);
        assert.equal(b.state.phase, "dormant");
        assert.equal(b.state.attackCount, 0);
        assert.ok(b.mesh.position.distanceTo(b.home) < b.radius * 0.5);
        assert.ok(Math.abs(b.heading.length() - 1) < 1e-8);
        assert.ok(b.mesh.position.y <= b.maxCenterY);
      });
    }
    assert.ok(histories.every((h) => h.distance > 60));
    const directions = f.entries.map((b) =>
      b.mesh.position.clone().sub(b.home).normalize(),
    );
    assert.ok(
      directions.some((v) => v.dot(directions[0]) < 0.8),
      "instances should not move in lockstep",
    );
  });
}

test("巡游受实体遮挡，零/非法时间、喷墨停顿和已击败状态均不会继续位移", (t) => {
  const f = fixture(t);
  const b = f.entries[0];
  const before = b.mesh.position.clone();
  for (let i = 0; i < 30; i++) f.step(1 / 60, () => true);
  assert.ok(b.mesh.position.equals(before));
  const phase = b.patrolAngle;
  for (const dt of [0, -1, NaN, Infinity]) f.step(dt);
  assert.ok(b.mesh.position.equals(before));
  assert.equal(b.patrolAngle, phase);
  b.state.phase = "disoriented";
  b.disorientedUntil = 1000;
  f.step(1);
  assert.ok(b.mesh.position.equals(before));
  b.state.defeated = true;
  for (let i = 0; i < 20; i++) f.step(1);
  assert.ok(b.mesh.position.equals(before));
  assert.equal(b.mesh.visible, false);
  for (const terminal of ["dead", "won", "timedOut"]) {
    f.reset();
    f.player[terminal] = true;
    const atHome = b.mesh.position.clone();
    f.step(1);
    assert.ok(b.mesh.position.equals(atHome));
    f.player[terminal] = false;
  }
});

test("返巢计时结束接入巡游不重置位置，重开复用模型并重置独立相位", (t) => {
  const f = fixture(t);
  const b = f.entries[0];
  b.mesh.position.copy(b.home).add(new THREE.Vector3(50, 0, 0));
  b.state.phase = "return";
  b.previousPhase = "return";
  b.state.phaseDuration = 3;
  b.state.timer = 2.99;
  const before = b.mesh.position.clone();
  f.step(0.02);
  assert.equal(b.state.phase, "dormant");
  assert.ok(b.mesh.position.distanceTo(before) < 0.07);
  assert.ok(b.mesh.position.distanceTo(b.home) > 49);
  const meshes = f.entries.map((entry) => entry.mesh);
  f.reset();
  f.entries.forEach((entry, i) => {
    assert.equal(entry.mesh, meshes[i]);
    assert.equal(entry.patrolAngle, entry.patrolStart);
    assert.ok(entry.mesh.position.equals(entry.home));
    assert.equal(entry.state.defeated, false);
  });
  f.step(1);
  const first = f.entries.map((entry) => entry.mesh.position.toArray());
  f.reset();
  f.step(1);
  assert.deepEqual(
    f.entries.map((entry) => entry.mesh.position.toArray()),
    first,
  );
});
