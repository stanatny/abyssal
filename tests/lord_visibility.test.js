import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createEncounters } from "../src/encounters.js";
import { REGIONS } from "../src/expedition_config.js";
import { createPlayer } from "../src/simulation.js";

// 只替换文字/特效贴图的二维画布，检查真实模型和共享领主更新路径。
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

for (const region of REGIONS) {
  test(`${region.id}: all resident lords remain renderable across old distance cutoffs without engaging`, (t) => {
    const scene = new THREE.Scene();
    const encounters = createEncounters(scene, {
      seabedHeight: () => -4000,
      audio: { bitten: noop, biteLord: noop, bossAttack: noop },
      notify: noop,
      onDamage: noop,
      onBite: noop,
    });
    t.after(() => encounters.dispose());
    // 夏威夷正式对局随机抽两种；这里显式覆盖整个候选池，避免重开抽签漏检。
    const instances =
      region.id === "hawaii"
        ? region.bossKinds.map((kind, i) => ({
            id: kind,
            kind,
            home: [i * 500, -500, -500],
          }))
        : region.bossInstances;
    const reset = () =>
      encounters.reset(region.bossKinds, region.bossHomes, instances);
    reset();
    const player = createPlayer();
    const position = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);
    const entries = encounters.bosses.filter((b) => b.enabled);
    assert.ok(entries.length > 0);
    const step = () =>
      encounters.update(0, 0, player, position, forward, {
        blockedBetween: () => false,
      });
    for (const entry of entries) {
      reset();
      for (const distance of [229, 231, 400, 849, 851, 1400]) {
        position
          .copy(entry.mesh.position)
          .add(new THREE.Vector3(0, 0, distance));
        const phase = entry.state.phase;
        step();
        assert.equal(entry.mesh.visible, true, `${entry.id} at ${distance} m`);
        assert.equal(
          entry.state.phase,
          phase,
          `${entry.id}: visibility must not engage combat`,
        );
        assert.equal(
          entry.ring.visible,
          false,
          "distant bodies do not reveal a threat ring",
        );
        assert.equal(
          entry.label.visible,
          false,
          "distant bodies do not reveal labels",
        );
        assert.equal(entry.state.attackCount, 0);
      }
      entry.state.defeated = true;
      step();
      assert.equal(entry.mesh.visible, false, "defeated lords stay hidden");
    }
    reset();
    assert.ok(
      entries.every((b) => b.enabled && b.mesh.visible && !b.state.defeated),
    );
    encounters.reset([]);
    step();
    assert.ok(
      encounters.bosses.every(
        (b) => !b.enabled && !b.mesh.visible && !b.mesh.parent,
      ),
    );
  });
}
