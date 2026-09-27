import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

const REPRESENTATIVE_KINDS = [
  "orca",
  "squid",
  "shark",
  "sperm_whale",
  "octopus",
  "turtle",
  "mackerel",
  "plesiosaur",
  "mosasaur",
  "basilosaurus",
  "megalodon",
  "kraken",
  "mayan",
  "hydra",
  "leviathan",
];
const SKINNED_KINDS = ["orca", "shark", "sperm_whale", "mackerel", "megalodon"];

// 用实际顶点与世界变换检查尺寸，不把渲染器缓存的包围盒当作几何证据。
function posedBounds(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  root.traverse((object) => {
    assert.ok(
      object.matrixWorld.elements.every(Number.isFinite),
      `${root.name}: finite world matrix`,
    );
    if (!object.isMesh) return;
    if (object.isSkinnedMesh) object.skeleton.update();
    const positions = object.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index++) {
      object.getVertexPosition(index, vertex).applyMatrix4(object.matrixWorld);
      assert.ok(
        vertex.toArray().every(Number.isFinite),
        `${root.name}: finite posed vertex`,
      );
      bounds.expandByPoint(vertex);
    }
  });
  return bounds;
}

function meshes(root) {
  const result = [];
  root.traverse((object) => {
    if (object.isMesh) result.push(object);
  });
  return result;
}

function poseSnapshot(root) {
  root.updateMatrixWorld(true);
  const matrices = [];
  root.traverse((object) => matrices.push(...object.matrixWorld.elements));
  return matrices;
}

function assertReasonableBounds(root, length) {
  const bounds = posedBounds(root);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(
    size.z > length * 0.7 && size.z < length * 1.4,
    `${root.name}: longitudinal size ${size.z}`,
  );
  assert.ok(
    size.x > length * 0.05 && size.x < length * 2,
    `${root.name}: lateral size ${size.x}`,
  );
  assert.ok(
    size.y > length * 0.03 && size.y < length * 2,
    `${root.name}: vertical size ${size.y}`,
  );
  assert.ok(
    bounds.getCenter(new THREE.Vector3()).length() < length * 0.6,
    `${root.name}: body remains near its anchor`,
  );
}

test("代表角色、猎手、远古生物与领主在高速动作下保持有限连续几何和合理体长", () => {
  for (const kind of REPRESENTATIVE_KINDS) {
    const length = 6;
    const root = createCreature(kind, length, 91);
    for (const mesh of meshes(root)) {
      for (const attribute of Object.values(mesh.geometry.attributes))
        assert.ok(
          attribute.array.every(Number.isFinite),
          `${kind}: finite geometry attribute`,
        );
    }
    root.userData.animate(0, 1);
    assertReasonableBounds(root, length);
    for (let frame = 1; frame <= 90; frame++)
      root.userData.animate(frame / 30, frame % 2 ? 1e6 : -1e6);
    assertReasonableBounds(root, length);
  }
});

test("同种实例共享几何与材质，但独立尾柄动作不会修改另一实例或共享顶点", () => {
  for (const kind of SKINNED_KINDS) {
    const left = createCreature(kind, 6, 17);
    const right = createCreature(kind, 6, 17);
    const leftMeshes = meshes(left),
      rightMeshes = meshes(right);
    assert.equal(leftMeshes.length, rightMeshes.length);
    leftMeshes.forEach((mesh, index) => {
      assert.strictEqual(
        mesh.geometry,
        rightMeshes[index].geometry,
        `${kind}: shared geometry`,
      );
      assert.strictEqual(
        mesh.material,
        rightMeshes[index].material,
        `${kind}: shared material`,
      );
    });
    const leftBody = leftMeshes.find((mesh) => mesh.isSkinnedMesh);
    const rightBody = rightMeshes.find((mesh) => mesh.isSkinnedMesh);
    assert.ok(
      leftBody && rightBody,
      `${kind}: deformable torso retained after batching`,
    );
    assert.notStrictEqual(leftBody.skeleton, rightBody.skeleton);
    leftBody.skeleton.bones.forEach((bone, index) =>
      assert.notStrictEqual(bone, rightBody.skeleton.bones[index]),
    );
    left.userData.animate(0, 1);
    right.userData.animate(0, 1);
    const stationaryPose = poseSnapshot(right);
    const sharedPositions = leftBody.geometry.attributes.position.array.slice();
    const positions = leftBody.geometry.attributes.position;
    let tailVertex = 0;
    for (let i = 1; i < positions.count; i++)
      if (positions.getZ(i) > positions.getZ(tailVertex)) tailVertex = i;
    const initialTail = leftBody.getVertexPosition(
      tailVertex,
      new THREE.Vector3(),
    );
    for (let frame = 1; frame <= 60; frame++)
      left.userData.animate(frame / 30, 3);
    left.updateMatrixWorld(true);
    const movedTail = leftBody.getVertexPosition(
      tailVertex,
      new THREE.Vector3(),
    );
    assert.ok(
      movedTail.distanceTo(initialTail) > 1e-5,
      `${kind}: body vertices actually deform`,
    );
    assert.deepEqual(
      poseSnapshot(right),
      stationaryPose,
      `${kind}: second instance remains stationary`,
    );
    assert.deepEqual(
      leftBody.geometry.attributes.position.array,
      sharedPositions,
      `${kind}: shared vertex buffer remains unchanged`,
    );
  }
});

test("平移旋转及成长后的实际蒙皮主体仍能被侧向射线命中", () => {
  for (const kind of SKINNED_KINDS) {
    for (const length of [6, 30]) {
      const root = createCreature(kind, length, 7);
      root.position.set(12, -30, -15);
      root.rotation.set(0.25, 0.7, -0.18);
      root.userData.animate(0, 3);
      for (let frame = 1; frame <= 40; frame++)
        root.userData.animate(frame / 30, 3);
      root.updateMatrixWorld(true);
      const body = meshes(root).find((mesh) => mesh.isSkinnedMesh);
      body.skeleton.update();
      const origin = new THREE.Vector3(2, 0, 0).applyMatrix4(root.matrixWorld);
      const direction = new THREE.Vector3(-1, 0, 0).transformDirection(
        root.matrixWorld,
      );
      const hits = new THREE.Raycaster(
        origin,
        direction,
        0,
        length * 4,
      ).intersectObject(body, false);
      assert.ok(
        hits.length > 0,
        `${kind}/${length}: ray intersects the deformed torso`,
      );
      assert.strictEqual(hits[0].object, body);
      assert.ok(hits[0].point.toArray().every(Number.isFinite));
      assert.ok(hits[0].distance > length && hits[0].distance < length * 3);
    }
  }
});

test("暂停、动画时钟回退与巨大时间间隔不会破坏姿态或把模型移出合理范围", () => {
  for (const kind of ["orca", "squid", "shark", "octopus", "hydra"]) {
    const root = createCreature(kind, 6, 123);
    root.userData.animate(100, 3);
    root.userData.animate(100.04, 3);
    const pose = poseSnapshot(root);
    root.userData.animate(100.04, 3);
    assert.deepEqual(
      poseSnapshot(root),
      pose,
      `${kind}: paused clock preserves pose`,
    );
    root.userData.animate(0, 3);
    assert.deepEqual(
      poseSnapshot(root),
      pose,
      `${kind}: clock reset does not reverse the phase`,
    );
    for (const [time, speed] of [
      [1e9, 1e12],
      [1e9 + 1, -1e12],
      [0, 0],
      [0.016, 3],
    ]) {
      root.userData.animate(time, speed);
      assertReasonableBounds(root, 6);
    }
  }
});
