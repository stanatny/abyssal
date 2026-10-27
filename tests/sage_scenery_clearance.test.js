import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createEncounters } from "../src/encounters.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { PENGLAI_BOSS_INSTANCES } from "../src/penglai_config.js";
import { PENGLAI_LORDS } from "../src/penglai_lords.js";
import { createPlayer } from "../src/simulation.js";
import { lordMoveClear } from "../src/lord_navigation.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";
const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (o, k) => o[k] ?? noop },
);

test("Sage lower robe and riding sword clear the actual monument during patrol, unlocked pursuit and both attacks", () => {
  const doc = globalThis.document,
    scene = new T.Scene(),
    ocean = createPenglaiOcean(scene);
  globalThis.document = {
    createElement: () => ({ getContext: () => context }),
  };
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
    const e = encounters.bosses.find((e) => e.id === "penglai_sage"),
      player = createPlayer(),
      forward = new T.Vector3(0, 0, -1),
      target = e.home.clone().add(new T.Vector3(0, 0, 80));
    player.health = 10000;
    player.length = 30;
    const clear = (p = e.mesh.position) =>
      lordMoveClear(e, p, p, e.mesh.quaternion, ocean.groundHeightAt, blocked);
    assert.ok(e.navigationReady && clear());
    // 报错截图的原位置只通过头/胸净空，现在必须被下摆与挂载件拒绝。
    assert.equal(clear(new T.Vector3(0, 357, -650)), false);
    const bodySections = e.mesh.userData.lordBody.sections.length;
    assert.equal(
      bodySections,
      2,
      "terrain clearance must not add damage/contact sections",
    );
    const mount = e.mesh.userData.ridingSword.getObjectByName("sword_blade"),
      skin = e.mesh.userData.hfRig.mesh,
      vertex = new T.Vector3(),
      local = new T.Vector3(),
      inverse = new T.Matrix4(),
      samples = [];
    for (const part of [mount, skin]) {
      const pos = part.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++)
        if (part === mount || pos.getY(i) < -0.02) samples.push({ part, i });
    }
    const oldBox = new T.Box3().setFromObject(
      ocean.root.getObjectByName("skybearer_sword_monument"),
    );
    e.mesh.updateMatrixWorld(true);
    assert.ok(
      new T.Box3().setFromObject(e.mesh.userData.ridingSword).min.y >
        oldBox.max.y + 2,
    );
    const phases = new Set(),
      abilities = new Set();
    let travel = 0,
      patrol = 0;
    const before = e.mesh.position.clone();
    for (let i = 0; i < 4200; i++) {
      if (i === 600)
        for (const other of encounters.bosses)
          if (other.enabled && other !== e) other.state.defeated = true;
      if (i === 1800) target.set(0, 340, -720); // 巨剑后下方，追击不能直穿剑尖。
      if (i === 2700) target.set(95, 380, -650); // 离开遮挡后恢复追击与出招。
      if (i === 3400) target.set(-85, 390, -640);
      before.copy(e.mesh.position);
      encounters.update(1 / 60, i / 60, player, target, forward, {
        blockedBetween: blocked,
      });
      const step = before.distanceTo(e.mesh.position);
      travel += step;
      if (i < 600) patrol += step;
      phases.add(e.state.phase);
      if (e.state.phase === "attack") abilities.add(e.state.ability);
      if (i % 120 !== 0) continue;
      assert.ok(clear(), `clear scenery at frame ${i} / ${e.state.phase}`);
      e.mesh.updateMatrixWorld(true);
      skin.skeleton.update();
      inverse.copy(e.mesh.matrixWorld).invert();
      // 真实变形表面必须落在检查过的净空球内；仅比较骨骼角度不够。
      for (const { part, i: index } of samples) {
        part.getVertexPosition(index, vertex).applyMatrix4(part.matrixWorld);
        local.copy(vertex).applyMatrix4(inverse);
        assert.ok(
          e.navigation.probes.some(
            (p) =>
              Math.hypot(local.x - p.x, local.y - p.y, local.z - p.z) *
                e.state.species.length <=
              p.radius + 0.001,
          ),
          `uncovered surface ${part.name}/${index}`,
        );
      }
    }
    assert.ok(
      patrol > 15 && travel > 150,
      `not stranded: patrol ${patrol}, travel ${travel}`,
    );
    assert.ok(
      ["dormant", "hunt", "windup", "attack", "recover"].every((p) =>
        phases.has(p),
      ),
    );
    assert.deepEqual([...abilities].sort(), ["charge", "swords"]);
    assert.equal(e.state.species.health, 350);
    assert.equal(e.state.species.damage, 28);
    encounters.reset(
      PENGLAI_LORDS.map((s) => s.kind),
      {},
      PENGLAI_BOSS_INSTANCES,
    );
    assert.ok(e.state.locked && e.navigationReady && clear());
  } finally {
    encounters.dispose();
    ocean.dispose();
    globalThis.document = doc;
  }
});
