import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
function step(model, time) {
  model.userData.animate(time, 1.4);
  model.updateMatrixWorld(true);
  model.traverse((n) => {
    if (n.isSkinnedMesh) n.skeleton.update();
  });
}
function sample(skin, z) {
  const p = skin.geometry.attributes.position;
  let index = 0,
    score = Infinity;
  for (let i = 0; i < p.count; i++) {
    const d = Math.abs(p.getZ(i) - z) + Math.abs(p.getY(i)) * 0.1;
    if (d < score) {
      index = i;
      score = d;
    }
  }
  return skin.getVertexPosition(index, new THREE.Vector3());
}
test("青龙、云龙和长蛇躯节沿前后传播侧波，头部接触锚点稳定、相邻体节连续", () => {
  for (const kind of ["azure_dragon", "gate_dragon", "bashe", "hujiao"]) {
    const m = createCreature(kind, 1, 17),
      joints = [];
    m.traverse((n) => {
      if (n.name === "continuous_scaled_body_joint") joints.push(n);
    });
    const anchor = m.userData.getHeadWorldPositions()[0].clone(),
      positions = [];
    for (let i = 0; i < 240; i++) {
      step(m, i / 60);
      positions.push(joints.map((n) => n.position.x));
      assert.ok(
        m.userData.getHeadWorldPositions()[0].distanceTo(anchor) < 1e-6,
      );
      for (let j = 1; j < joints.length - 1; j++) {
        const n = joints[j],
          mesh =
            n.children.find((c) => c.name === "rigid_anatomy_batch") ||
            n.children.find((c) => c.geometry);
        mesh.geometry.computeBoundingBox();
        const half =
          mesh.geometry.boundingBox.getSize(new THREE.Vector3()).z * n.scale.z;
        assert.ok(
          n.position.distanceTo(joints[j + 1].position) < half * 1.12,
          `${kind}:${j}: continuous body`,
        );
      }
    }
    const middle = positions.map((p) => p[Math.floor(p.length / 2)]);
    assert.ok(
      Math.max(...middle) - Math.min(...middle) > 0.09,
      `${kind}: moving S wave`,
    );
    const a = joints[Math.floor(joints.length * 0.35)],
      b = joints[Math.floor(joints.length * 0.7)];
    assert.ok(a.quaternion.angleTo(b.quaternion) > 0.05);
    if (kind === "gate_dragon")
      assert.equal(
        m.getObjectByName("cloud_dragon_carp_tail").parent,
        joints.at(-1),
      );
  }
});
test("森蚺、泰坦巨蟒和水母蛇连续蒙皮变形，首部稳定、几何缓存及其他实例不被改写", () => {
  for (const kind of ["green_anaconda", "titanoboa", "yacumama"]) {
    const m = createCreature(kind, 1, 17),
      other = createCreature(kind, 1, 17);
    const skin = m.getObjectByName("long_continuous_serpent");
    assert.ok(skin.isSkinnedMesh);
    assert.equal(skin.skeleton.bones.length, 16);
    const raw = Array.from(skin.geometry.attributes.position.array),
      values = [];
    const initialOther = other
      .getObjectByName("long_continuous_serpent")
      .skeleton.bones[7].quaternion.clone();
    for (let i = 0; i < 240; i++) {
      step(m, i / 60);
      values.push(sample(skin, 0.2).x);
      const neck = sample(skin, -0.43);
      assert.ok(Number.isFinite(neck.x) && Math.abs(neck.x) < 0.05);
    }
    assert.ok(Math.max(...values) - Math.min(...values) > 0.06, kind);
    assert.deepEqual(Array.from(skin.geometry.attributes.position.array), raw);
    assert.ok(
      other
        .getObjectByName("long_continuous_serpent")
        .skeleton.bones[7].quaternion.equals(initialOther),
    );
  }
});
test("电鳗腹部鳍带与躯干同相游曳，木卫二蛇形猎手的尾甲跟随连续骨架", () => {
  for (const kind of ["electric_eel", "rift_reaver"]) {
    const m = createCreature(kind, 1, 17),
      skins = [];
    m.traverse((n) => {
      if (n.isSkinnedMesh && n.userData.serpentine) skins.push(n);
    });
    assert.ok(skins.length >= (kind === "electric_eel" ? 2 : 1), kind);
    step(m, 0);
    for (let i = 1; i < 90; i++) step(m, i / 60);
    for (let i = 1; i < skins.length; i++)
      assert.ok(
        skins[i].skeleton.bones[5].quaternion.angleTo(
          skins[0].skeleton.bones[5].quaternion,
        ) < 1e-7,
      );
    assert.ok(Math.abs(skins[0].skeleton.bones[5].rotation.y) > 0.005);
  }
});
