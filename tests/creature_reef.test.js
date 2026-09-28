import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { SHOAL_CREATURE_KINDS } from "../src/creature_shoal.js";

const KINDS = ["boxfish", "parrotfish", "wrasse"];
function meshes(root) {
  const result = [];
  root.traverse((node) => {
    if (node.isMesh) result.push(node);
  });
  return result;
}
function posedBounds(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3(),
    point = new THREE.Vector3();
  for (const mesh of meshes(root)) {
    if (mesh.isSkinnedMesh) mesh.skeleton.update();
    for (
      let index = 0;
      index < mesh.geometry.attributes.position.count;
      index++
    ) {
      mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
      assert.ok(point.toArray().every(Number.isFinite));
      bounds.expandByPoint(point);
    }
  }
  return bounds;
}

test("三种浅礁鱼进入真实构建分支、纵长归一且极值动画不破坏几何", () => {
  for (const kind of KINDS) {
    assert.ok(SHOAL_CREATURE_KINDS.has(kind));
    const root = createCreature(kind, 2, 7);
    assert.equal(root.userData.kind, kind);
    assert.equal(root.userData.shoalAnatomy, kind);
    const rest = posedBounds(root);
    const restSize = rest.getSize(new THREE.Vector3());
    assert.ok(rest.getCenter(new THREE.Vector3()).length() < 1e-5);
    assert.equal(root.userData.normalizedLength, 1);
    assert.ok(
      Math.abs(posedBounds(root).getSize(new THREE.Vector3()).z - 2) < 1e-5,
    );
    for (const mesh of meshes(root))
      for (const attribute of Object.values(mesh.geometry.attributes))
        assert.ok(attribute.array.every(Number.isFinite));
    for (const [time, speed] of [
      [0, 0],
      [0.1, 3],
      [1, 1e6],
      [2, -1e6],
      [0, 1],
      [10000, 1],
    ]) {
      root.userData.animate(time, speed);
      const size = posedBounds(root).getSize(new THREE.Vector3());
      assert.ok(size.z > 1.7 && size.z < 2.2);
      // 新箱鲀宽骨甲和展开胸鳍静止宽度为1.25；按自身静止姿态检测运动膨胀。
      assert.ok(size.x > restSize.x * 0.85 && size.x < restSize.x * 1.15);
      assert.ok(size.y > 0.4 && size.y < 1.5);
    }
  }
});

test("共享礁鱼几何与材质，单个鱼的摆尾划鳍不改变邻居", () => {
  for (const kind of KINDS) {
    const left = createCreature(kind, 1, 12),
      right = createCreature(kind, 1, 12);
    const leftMeshes = meshes(left),
      rightMeshes = meshes(right);
    assert.equal(leftMeshes.length, rightMeshes.length);
    leftMeshes.forEach((mesh, index) => {
      assert.equal(mesh.geometry, rightMeshes[index].geometry);
      assert.equal(mesh.material, rightMeshes[index].material);
      if (mesh.isSkinnedMesh)
        assert.notEqual(mesh.skeleton, rightMeshes[index].skeleton);
    });
    left.userData.animate(0, 1);
    right.userData.animate(0, 1);
    const before = posedBounds(right).clone();
    const leftTail = left.getObjectByName(`${kind}_tail`),
      rightTail = right.getObjectByName(`${kind}_tail`);
    const rightRotation = rightTail.rotation.y;
    for (let step = 1; step < 20; step++) left.userData.animate(step / 30, 1);
    assert.notEqual(leftTail.rotation.y, rightRotation);
    assert.equal(rightTail.rotation.y, rightRotation);
    assert.deepEqual(posedBounds(right), before);
  }
});

test("各礁鱼主体在实际姿态与世界变换下可被射线命中，箱鲀保留宽骨甲轮廓", () => {
  const sizes = {};
  for (const kind of KINDS) {
    const root = createCreature(kind, 1, 3);
    sizes[kind] = posedBounds(root).getSize(new THREE.Vector3());
    root.position.set(8, -18, -12);
    root.rotation.y = 0.5;
    root.userData.animate(0.3, 2);
    posedBounds(root);
    const center = root.localToWorld(new THREE.Vector3(0, 0, -0.1));
    const ray = new THREE.Raycaster(
      center.clone().add(new THREE.Vector3(3, 0, 0)),
      new THREE.Vector3(-1, 0, 0),
    );
    assert.ok(
      ray
        .intersectObject(root, true)
        .some(
          (hit) =>
            hit.object.isSkinnedMesh ||
            hit.object.name === "boxfish_continuous_body",
        ),
    );
  }
  assert.ok(
    sizes.boxfish.x / sizes.boxfish.y > sizes.parrotfish.x / sizes.parrotfish.y,
  );
  assert.notDeepEqual(sizes.parrotfish.toArray(), sizes.wrasse.toArray());
});
