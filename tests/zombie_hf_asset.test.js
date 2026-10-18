import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { disposePopulation } from "../src/population_cache.js";

function body(m) {
  return m.getObjectByName("zombie_shark_hf_body");
}

function finRig() {
  const model = createCreature("zombie_shark", 1),
    mesh = body(model),
    p = mesh.geometry.attributes.position;
  const tips = [-1, 1].map((side) => {
    let tip = 0;
    for (let i = 1; i < p.count; i++)
      if (p.getX(i) * side > p.getX(tip) * side) tip = i;
    return tip;
  });
  function positions() {
    model.updateMatrixWorld(true);
    mesh.skeleton.update();
    // 排除身体转弯侧倾，只测实际鳍尖相对肩部的运动。
    const support = mesh.skeleton.bones[0].matrixWorld.clone().invert();
    return tips.map((i) =>
      mesh
        .getVertexPosition(i, new THREE.Vector3())
        .applyMatrix4(mesh.matrixWorld)
        .applyMatrix4(support),
    );
  }
  return {
    model,
    mesh,
    positions,
    pose(phase, input = {}) {
      Object.assign(model.userData.motionState, {
        phase,
        power: 0.3,
        boost: 0,
        turn: 0,
        pitchInput: 0,
        ...input,
      });
      model.userData.animate(0, 1, { dt: 0 });
      return positions();
    },
  };
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

test("胸鳍完整周期真实鳍尖可读，冲刺后掠且仍保持连续摆动", () => {
  const rig = finRig(),
    means = [];
  for (const boost of [0, 1]) {
    const samples = Array.from({ length: 96 }, (_, i) =>
      rig.pose((i / 96) * ((Math.PI * 2) / 0.72), { boost }),
    );
    for (const side of [0, 1]) {
      const ys = samples.map((s) => s[side].y),
        span = Math.max(...ys) - Math.min(...ys);
      assert.ok(span > (boost ? 0.03 : 0.045) && span < 0.09);
    }
    for (const [left, right] of samples) {
      assert.ok(Math.abs(left.x + right.x) < 0.003);
      assert.ok(Math.abs(left.y - right.y) < 0.003);
      assert.ok(left.x < -0.18 && right.x > 0.18);
    }
    means.push(
      samples.reduce((sum, s) => sum + s[0].z + s[1].z, 0) /
        (samples.length * 2),
    );
  }
  // 头朝-Z，+Z才是向后收鳍；旧版冲刺反而把鳍尖扫向前方。
  assert.ok(means[1] > means[0] + 0.03);
});

test("胸鳍差动与升降作用在真实表面，极端输入仍留在躯干外侧", () => {
  const rig = finRig();
  const leftTurn = rig.pose(0, { turn: -1 }),
    rightTurn = rig.pose(0, { turn: 1 }),
    up = rig.pose(0, { pitchInput: 1 }),
    down = rig.pose(0, { pitchInput: -1 });
  // 头朝-Z、D为+X右转：内侧鳍下压/前展，与身体倾斜协调。
  assert.ok(leftTurn[0].y < leftTurn[1].y - 0.025);
  assert.ok(rightTurn[1].y < rightTurn[0].y - 0.025);
  assert.ok(leftTurn[0].z < leftTurn[1].z - 0.02);
  assert.ok(rightTurn[1].z < rightTurn[0].z - 0.02);
  for (let i = 0; i < 2; i++) assert.ok(up[i].y > down[i].y + 0.02);
  for (const boost of [0, 1])
    for (const turn of [-1, 0, 1])
      for (const pitchInput of [-1, 0, 1])
        for (let frame = 0; frame < 32; frame++) {
          const tips = rig.pose((frame / 32) * ((Math.PI * 2) / 0.72), {
            boost,
            turn,
            pitchInput,
          });
          for (let side = 0; side < 2; side++) {
            const tip = tips[side];
            assert.ok(tip.toArray().every(Number.isFinite));
            assert.ok(tip.x * (side ? 1 : -1) > 0.17);
            assert.ok(tip.y < -0.1 && tip.y > -0.3);
          }
        }
});

test("冲刺与转向切换不跳鳍，暂停冻结且重开恢复独立姿态", () => {
  const a = finRig(),
    b = finRig();
  a.model.userData.resetMotion();
  b.model.userData.resetMotion();
  const untouched = b.positions().map((p) => p.toArray());
  let previous = a.positions();
  for (let frame = 0; frame < 240; frame++) {
    const sprint = frame >= 60 && frame < 150;
    a.model.userData.animate(frame / 60, sprint ? 2.2 : 0.9, {
      dt: 1 / 60,
      speed: sprint ? 32 : 12,
      boosting: sprint,
      turn: frame >= 100 && frame < 180 ? 1 : -1,
      pitchInput: frame >= 150 ? -1 : 1,
    });
    const next = a.positions();
    for (let i = 0; i < 2; i++)
      assert.ok(next[i].distanceTo(previous[i]) < 0.01);
    previous = next;
  }
  const paused = a.positions().map((p) => p.toArray());
  a.model.userData.animate(100, 3, {
    dt: 0,
    speed: 32,
    boosting: true,
    turn: 1,
    pitchInput: 1,
  });
  assert.deepEqual(
    a.positions().map((p) => p.toArray()),
    paused,
  );
  assert.deepEqual(
    b.positions().map((p) => p.toArray()),
    untouched,
  );
  a.model.userData.resetMotion();
  assert.deepEqual(
    a.positions().map((p) => p.toArray()),
    untouched,
  );
  assert.equal(a.mesh.geometry, b.mesh.geometry);
  assert.notEqual(a.mesh.skeleton, b.mesh.skeleton);
});
