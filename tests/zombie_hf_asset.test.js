import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { disposePopulation } from "../src/population_cache.js";

function body(m) {
  return m.getObjectByName("zombie_shark_hf_body");
}

test("HF尸鲨UV重复点权重一致，四权重归一化，法线和骨骼索引有效", () => {
  const model = createCreature("zombie_shark", 1),
    g = body(model).geometry;
  const {
    position: p,
    normal: n,
    uv,
    skinIndex: ids,
    skinWeight: w,
  } = g.attributes;
  const duplicates = new Map();
  let seams = 0;
  for (let i = 0; i < p.count; i++) {
    assert.ok(
      Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 0.0001,
    );
    assert.ok(
      uv.getX(i) >= 0 && uv.getX(i) <= 1 && uv.getY(i) >= 0 && uv.getY(i) <= 1,
    );
    let sum = 0;
    const bind = [];
    for (let j = 0; j < 4; j++) {
      const id = ids.array[i * 4 + j],
        weight = w.array[i * 4 + j];
      assert.ok(id >= 0 && id < 7);
      assert.ok(weight >= 0 && weight <= 1);
      sum += weight;
      bind.push(id, weight);
    }
    assert.ok(Math.abs(sum - 1) < 1e-6);
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    if (duplicates.has(key)) {
      assert.deepEqual(bind, duplicates.get(key));
      seams++;
    } else duplicates.set(key, bind);
  }
  assert.ok(seams > 1000);
});

test("下颌咬合带动真实顶点和嘴部，鳍根连续，单实例销毁不伤害本尊共享材质", () => {
  const a = createCreature("zombie_shark", 1),
    b = createCreature("zombie_shark", 1);
  const m = body(a),
    g = m.geometry,
    w = g.attributes.skinWeight,
    ids = g.attributes.skinIndex;
  const jawVertices = [];
  let transitional = 0;
  for (let i = 0; i < w.count; i++) {
    if (ids.getZ(i) === 4 && w.getZ(i) > 0.99) jawVertices.push(i);
    if (ids.getZ(i) >= 5 && w.getZ(i) > 0.01 && w.getZ(i) < 0.99)
      transitional++;
  }
  assert.ok(jawVertices.length > 100 && transitional > 100);
  const index = jawVertices.find((i) => g.attributes.position.getZ(i) < -0.43);
  a.updateMatrixWorld(true);
  m.skeleton.update();
  const before = m.getVertexPosition(index, new THREE.Vector3());
  const mouth = a.userData.getFeedingMouth(new THREE.Vector3());
  a.getObjectByName("zombie_shark_broken_mandible").rotation.x = -0.18;
  a.updateMatrixWorld(true);
  m.skeleton.update();
  const after = m.getVertexPosition(index, new THREE.Vector3());
  assert.ok(after.y < before.y - 0.015);
  assert.ok(
    a.userData.getFeedingMouth(new THREE.Vector3()).y < mouth.y - 0.015,
  );
  assert.equal(b.getObjectByName("zombie_shark_broken_mandible").rotation.x, 0);
  let geometryDisposals = 0,
    materialDisposals = 0,
    skeletonDisposals = 0;
  const onGeometry = () => geometryDisposals++,
    onMaterial = () => materialDisposals++;
  m.geometry.addEventListener("dispose", onGeometry);
  m.material.addEventListener("dispose", onMaterial);
  const dispose = m.skeleton.dispose.bind(m.skeleton);
  m.skeleton.dispose = () => {
    skeletonDisposals++;
    dispose();
  };
  disposePopulation([{ mesh: a }]);
  m.geometry.removeEventListener("dispose", onGeometry);
  m.material.removeEventListener("dispose", onMaterial);
  assert.equal(skeletonDisposals, 1);
  assert.equal(geometryDisposals, 0);
  assert.equal(materialDisposals, 0);
  assert.equal(m.geometry, body(b).geometry);
});

test("尸鲨绑定姿态的后躯回到中轴，尾鳍不再固定偏在一侧", () => {
  const model = createCreature("zombie_shark", 1),
    mesh = body(model);
  model.updateMatrixWorld(true);
  mesh.skeleton.update();
  for (const z of [0.1, 0.15, 0.2, 0.25, 0.28, 0.3]) {
    const left = new THREE.Raycaster(
      new THREE.Vector3(-1, 0, z),
      new THREE.Vector3(1, 0, 0),
    ).intersectObject(mesh)[0];
    const right = new THREE.Raycaster(
      new THREE.Vector3(1, 0, z),
      new THREE.Vector3(-1, 0, 0),
    ).intersectObject(mesh)[0];
    assert.ok(left && right);
    assert.ok(
      Math.abs((left.point.x + right.point.x) / 2) < 0.004,
      `Body center at ${z}`,
    );
  }
  const p = mesh.geometry.attributes.position;
  let x = 0,
    count = 0;
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) > 0.4) {
      x += p.getX(i);
      count++;
    }
  assert.ok(count > 200);
  assert.ok(Math.abs(x / count) < 0.01);
});

test("巡游和冲刺完整周期左右对称，整片尾鳍保持形状而非折弯扭曲", () => {
  const model = createCreature("zombie_shark", 1),
    mesh = body(model),
    p = mesh.geometry.attributes.position;
  const points = [];
  for (let i = 0; i < p.count; i++)
    if (
      p.getZ(i) > 0.34 &&
      points.length < 8 &&
      (points.length === 0 ||
        new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .distanceTo(
            new THREE.Vector3().fromBufferAttribute(p, points.at(-1)),
          ) > 0.06)
    )
      points.push(i);
  assert.ok(points.length >= 4);
  let tip = 0;
  for (let i = 1; i < p.count; i++) if (p.getZ(i) > p.getZ(tip)) tip = i;
  const neutral = points.map((i) =>
    new THREE.Vector3().fromBufferAttribute(p, i),
  );
  for (const power of [0.3, 1]) {
    model.userData.motionState.power = power;
    model.userData.motionState.boost = power === 1 ? 1 : 0;
    const xs = [];
    for (let phase = 0; phase < 64; phase++) {
      model.userData.motionState.phase = (phase / 64) * Math.PI * 2;
      model.userData.animate(0, 1, { dt: 0 });
      model.updateMatrixWorld(true);
      mesh.skeleton.update();
      xs.push(mesh.getVertexPosition(tip, new THREE.Vector3()).x);
      const actual = points.map((i) =>
        mesh.getVertexPosition(i, new THREE.Vector3()),
      );
      for (let i = 1; i < points.length; i++)
        assert.ok(
          Math.abs(
            actual[0].distanceTo(actual[i]) - neutral[0].distanceTo(neutral[i]),
          ) < 1e-6,
        );
    }
    assert.ok(Math.abs(xs.reduce((a, b) => a + b, 0) / xs.length) < 0.003);
    assert.ok(Math.min(...xs) < -0.03 && Math.max(...xs) > 0.03);
    assert.ok(Math.max(...xs) - Math.min(...xs) < 0.28);
  }
});
