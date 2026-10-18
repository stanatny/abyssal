import test from "node:test";
import { createHash } from "node:crypto";
import packed from "../src/assets/models/mechanical_shark_mesh.json" with { type: "json" };
import armor from "../src/assets/models/mechanical_shark_armor.json" with { type: "json" };
import conduits from "../src/assets/models/mechanical_shark_conduits.json" with { type: "json" };
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
function rig() {
  const root = createCreature("mechanical_shark", 1),
    mesh = root.getObjectByName("mechanical_shark_hf_body"),
    p = mesh.geometry.attributes.position;
  const extreme = (axis, side, filter = () => true) => {
    let result = -1;
    for (let i = 0; i < p.count; i++)
      if (
        filter(i) &&
        (result < 0 ||
          p.getComponent(i, axis) * side > p.getComponent(result, axis) * side)
      )
        result = i;
    return result;
  };
  const ids = [extreme(0, -1), extreme(0, 1), extreme(2, 1)];
  const points = () => {
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    const frame = mesh.skeleton.bones[0].matrixWorld.clone().invert();
    return ids.map((i) =>
      mesh
        .getVertexPosition(i, new THREE.Vector3())
        .applyMatrix4(mesh.matrixWorld)
        .applyMatrix4(frame),
    );
  };
  return {
    root,
    mesh,
    p,
    points,
    pose(phase, input = {}) {
      Object.assign(root.userData.motionState, {
        phase,
        power: 0.3,
        boost: 0,
        turn: 0,
        pitchInput: 0,
        ...input,
      });
      root.userData.animate(0, 1, { dt: 0 });
      return points();
    },
  };
}
test("机械HF权重归一化且UV接缝不裂开，独立骨架共享不可变表面", () => {
  assert.equal(
    conduits.sourceMeshHash,
    createHash("sha256").update(JSON.stringify(packed)).digest("hex"),
  );
  assert.equal(armor.sourceMeshHash, conduits.sourceMeshHash);
  const a = rig(),
    b = rig(),
    g = a.mesh.geometry,
    { skinIndex: ids, skinWeight: w } = g.attributes,
    seen = new Map();
  let seams = 0;
  for (let i = 0; i < a.p.count; i++) {
    const value = [],
      xyz = [a.p.getX(i), a.p.getY(i), a.p.getZ(i)].join(",");
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      const v = w.getComponent(i, k),
        id = ids.getComponent(i, k);
      assert.ok(v >= 0 && v <= 1 && id >= 0 && id < 7);
      sum += v;
      value.push(id, v);
    }
    assert.ok(Math.abs(sum - 1) < 1e-6);
    if (seen.has(xyz)) {
      assert.deepEqual(value, seen.get(xyz));
      seams++;
    } else seen.set(xyz, value);
  }
  assert.ok(seams > 1000);
  assert.equal(a.mesh.geometry, b.mesh.geometry);
  assert.equal(a.mesh.material, b.mesh.material);
  assert.notEqual(a.mesh.skeleton, b.mesh.skeleton);
  assert.equal(a.mesh.material.transparent, false);
});
test("尾柄截面居中，尾鳍完整周期双向摆动且全鳍保形", () => {
  const a = rig();
  a.root.updateMatrixWorld(true);
  a.mesh.skeleton.update();
  for (const z of [0.2, 0.28, 0.35, 0.4]) {
    const hits = [-1, 1].map(
      (s) =>
        new THREE.Raycaster(
          new THREE.Vector3(s, -0.04, z),
          new THREE.Vector3(-s, 0, 0),
        ).intersectObject(a.mesh)[0],
    );
    assert.ok(hits.every(Boolean));
    assert.ok(Math.abs((hits[0].point.x + hits[1].point.x) / 2) < 0.004);
  }
  const indices = [];
  for (let i = 0; i < a.p.count && indices.length < 8; i++)
    if (a.p.getZ(i) > 0.4 && Math.abs(a.p.getY(i)) > 0.08) indices.push(i);
  const neutral = indices.map((i) =>
    new THREE.Vector3().fromBufferAttribute(a.p, i),
  );
  assert.ok(indices.length > 3);
  for (const boost of [0, 1]) {
    const xs = [];
    for (let i = 0; i < 64; i++) {
      const points = a.pose((i / 64) * Math.PI * 2, {
        boost,
        power: boost ? 1 : 0.3,
      });
      xs.push(points[2].x);
      const actual = indices.map((j) =>
        a.mesh.getVertexPosition(j, new THREE.Vector3()),
      );
      for (let j = 1; j < actual.length; j++)
        assert.ok(
          Math.abs(
            actual[0].distanceTo(actual[j]) - neutral[0].distanceTo(neutral[j]),
          ) < 1e-6,
        );
    }
    assert.ok(Math.min(...xs) < -0.025 && Math.max(...xs) > 0.025);
    assert.ok(Math.abs(xs.reduce((s, x) => s + x, 0) / xs.length) < 0.004);
  }
});
test("胸鳍巡游和冲刺都有实际摆幅，冲刺后掠而非前折，转弯升降有响应", () => {
  const a = rig(),
    means = [];
  for (const boost of [0, 1]) {
    const samples = Array.from({ length: 96 }, (_, i) =>
      a.pose(((i / 96) * Math.PI * 2) / 0.72, { boost }),
    );
    for (const side of [0, 1]) {
      const ys = samples.map((p) => p[side].y);
      assert.ok(Math.max(...ys) - Math.min(...ys) > 0.025);
    }
    means.push(samples.reduce((s, p) => s + p[0].z + p[1].z, 0) / 192);
  }
  assert.ok(means[1] > means[0] + 0.02);
  const left = a.pose(0, { turn: -1 }),
    right = a.pose(0, { turn: 1 }),
    up = a.pose(0, { pitchInput: 1 }),
    down = a.pose(0, { pitchInput: -1 });
  assert.ok(left[0].y < left[1].y - 0.02 && right[1].y < right[0].y - 0.02);
  assert.ok(left[0].z < left[1].z - 0.02 && right[1].z < right[0].z - 0.02);
  for (let i = 0; i < 2; i++) assert.ok(up[i].y > down[i].y + 0.015);
});
test("3/15/30米极端动作表面和根部有界，口部随真实下颌、出口随躯干", () => {
  const a = rig(),
    g = a.mesh.geometry,
    w = g.attributes.skinWeight,
    ids = g.attributes.skinIndex;
  let jaw = -1;
  for (let i = 0; i < w.count; i++)
    if (ids.getZ(i) === 4 && w.getZ(i) > 0.99 && a.p.getZ(i) < -0.4) {
      jaw = i;
      break;
    }
  assert.ok(jaw >= 0);
  a.root.updateMatrixWorld(true);
  a.mesh.skeleton.update();
  const before = a.mesh.getVertexPosition(jaw, new THREE.Vector3());
  a.root.userData.motionState.feed = 1;
  a.root.userData.animate(0, 1, { dt: 0 });
  a.points();
  assert.ok(
    a.mesh.getVertexPosition(jaw, new THREE.Vector3()).y < before.y - 0.01,
  );
  for (const length of [3, 15, 30]) {
    a.root.scale.setScalar(length);
    for (let f = 0; f < 48; f++) {
      a.pose(((f / 48) * Math.PI * 2) / 0.72, {
        boost: f > 24 ? 1 : 0,
        turn: Math.sin(f),
        pitchInput: Math.cos(f),
      });
      const box = new THREE.Box3(),
        v = new THREE.Vector3();
      for (let i = 0; i < a.p.count; i++) {
        a.mesh.getVertexPosition(i, v).applyMatrix4(a.mesh.matrixWorld);
        assert.ok(v.toArray().every(Number.isFinite));
        box.expandByPoint(v);
      }
      const size = box.getSize(new THREE.Vector3());
      assert.ok(
        size.z > length * 0.85 &&
          size.z < length * 1.1 &&
          size.x < length * 0.65,
      );
      const exit = a.root.userData.getTorpedoMuzzle(new THREE.Vector3());
      assert.ok(exit.z < -0.44 * length);
    }
  }
});
test("连续加速转向不跳鳍，暂停冻结，重开清除发射/尾流且实例互不污染", () => {
  const a = rig(),
    b = rig();
  a.root.userData.resetMotion();
  b.root.userData.resetMotion();
  const untouched = b.points().map((p) => p.toArray());
  let previous = a.points();
  for (let f = 0; f < 240; f++) {
    a.root.userData.animate(f / 60, 2.2, {
      dt: 1 / 60,
      speed: f < 120 ? 32 : 12,
      boosting: f < 120,
      turn: f < 100 ? -1 : 1,
      pitchInput: f < 160 ? 1 : -1,
    });
    const next = a.points();
    for (let i = 0; i < 2; i++)
      assert.ok(next[i].distanceTo(previous[i]) < 0.01);
    previous = next;
  }
  a.root.userData.triggerLaunch();
  a.root.userData.animate(4, 1, { dt: 0 });
  const snapshot = structuredClone(a.root.userData.pose.mechanical),
    p = a.points().map((p) => p.toArray());
  a.root.userData.animate(100, 1, { dt: 0 });
  assert.deepEqual(
    a.points().map((p) => p.toArray()),
    p,
  );
  assert.deepEqual(a.root.userData.pose.mechanical, snapshot);
  assert.deepEqual(
    b.points().map((p) => p.toArray()),
    untouched,
  );
  a.root.userData.resetMotion();
  assert.equal(a.root.userData.pose.mechanical.launch, 0);
  assert.equal(a.root.userData.pose.mechanical.plumes, 0);
  assert.deepEqual(
    a.points().map((p) => p.toArray()),
    untouched,
  );
});
test("销毁只释放本实例特效与骨架，重复调用幂等且共享资产仍可使用", () => {
  const a = rig(),
    b = rig();
  let local = 0,
    shared = 0;
  a.root.traverse((o) => {
    if (o.name === "thruster_plume" || o.name === "torpedo_launch_flash")
      o.material.addEventListener("dispose", () => local++);
  });
  a.mesh.material.addEventListener("dispose", () => shared++);
  a.mesh.geometry.addEventListener("dispose", () => shared++);
  a.root.userData.disposeMechanical();
  a.root.userData.disposeLocalMotion();
  assert.equal(local, 3);
  assert.equal(shared, 0);
  b.root.userData.animate(1, 2, { dt: 0.04, boosting: true, speed: 32 });
  assert.ok(b.root.userData.pose.mechanical.boost > 0);
});

test("实体装甲与伺服关节跟随正确骨架，双涡轮独立且无彩绘纹理依赖", () => {
  const a = rig(),
    b = rig();
  assert.equal(a.mesh.material.map, null);
  assert.equal(a.mesh.material.roughnessMap, null);
  const names = new Set([
    "bevelled_armor",
    "armor_fasteners",
    "tail_servo_joint",
    "pectoral_servo_hub",
    "intake_turbine",
  ]);
  const parts = [];
  a.root.traverse((o) => {
    if (names.has(o.name)) parts.push(o);
  });
  assert.equal(parts.filter((p) => p.name === "tail_servo_joint").length, 3);
  assert.equal(parts.filter((p) => p.name === "pectoral_servo_hub").length, 2);
  assert.equal(parts.filter((p) => p.name === "intake_turbine").length, 2);
  const fixed = parts.filter((p) => p.name !== "intake_turbine");
  fixed.forEach((p) => {
    p.updateMatrix();
  });
  const local = fixed.map((p) => p.matrix.toArray());
  const rotors = parts.filter((p) => p.name === "intake_turbine");
  for (let i = 0; i < 32; i++) {
    a.pose((i * Math.PI) / 8, {
      boost: i % 2,
      turn: Math.sin(i),
      pitchInput: Math.cos(i),
    });
    for (const p of fixed) assert.ok(p.parent.isBone);
    assert.deepEqual(
      fixed.map((p) => p.matrix.toArray()),
      local,
    );
    assert.ok(
      parts.every((p) => p.matrixWorld.elements.every(Number.isFinite)),
    );
  }
  const oldAngle = rotors[0].rotation.z;
  a.root.userData.animate(100, 1, { dt: 0 });
  assert.equal(rotors[0].rotation.z, oldAngle);
  a.root.userData.resetMotion();
  const other = b.root.getObjectByName("intake_turbine");
  b.root.userData.resetMotion();
  assert.equal(rotors[0].rotation.z, other.rotation.z);
  assert.notEqual(rotors[0], other);
  assert.equal(rotors[0].geometry, other.geometry);
});
