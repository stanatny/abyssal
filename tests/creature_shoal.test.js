import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  SHOAL_CREATURE_KINDS,
  buildShoalCreature,
} from "../src/creature_shoal.js";

function specimen(kind) {
  const root = new THREE.Group(),
    motions = [];
  buildShoalCreature(kind, root, motions);
  return {
    root,
    animate: (time, effort = 1) =>
      motions.forEach((motion) => motion(time, effort)),
  };
}
function meshes(root) {
  const objects = [];
  root.traverse((node) => {
    if (node.isMesh) objects.push(node);
  });
  return objects;
}
function bounds(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(),
    point = new THREE.Vector3();
  for (const mesh of meshes(root)) {
    if (mesh.isSkinnedMesh) mesh.skeleton.update();
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      assert.ok(point.toArray().every(Number.isFinite));
      box.expandByPoint(point);
    }
  }
  return box;
}

test("浅水十三种归一居中，三角形和绘制满足群游预算", () => {
  assert.equal(SHOAL_CREATURE_KINDS.size, 13);
  const small = new Set([
    "fish",
    "anchovy",
    "sardine",
    "herring",
    "mackerel",
    "flying_fish",
  ]);
  for (const kind of SHOAL_CREATURE_KINDS) {
    const { root, animate } = specimen(kind);
    const rest = bounds(root);
    assert.equal(root.userData.shoalAnatomy, kind);
    assert.equal(root.userData.normalizedLength, 1);
    assert.ok(Math.abs(rest.getSize(new THREE.Vector3()).z - 1) < 1e-6, kind);
    assert.ok(rest.getCenter(new THREE.Vector3()).length() < 1e-5, kind);
    const objects = meshes(root),
      triangleCount = objects.reduce(
        (sum, mesh) =>
          sum +
          (mesh.geometry.index?.count ??
            mesh.geometry.attributes.position.count) /
            3,
        0,
      );
    assert.ok(
      objects.length <= (small.has(kind) ? 6 : 10),
      `${kind}: draws ${objects.length}`,
    );
    assert.ok(
      triangleCount <= (small.has(kind) ? 2500 : 9000),
      `${kind}: triangles ${triangleCount}`,
    );
    for (const phase of [0, 0.7, 2.6, 11, 10000]) {
      animate(phase, 3);
      const size = bounds(root).getSize(new THREE.Vector3());
      assert.ok(
        size.z > 0.8 && size.z < 1.15,
        `${kind}: animated length ${size.z}`,
      );
      assert.ok(size.x > 0.06 && size.x < 1.6, `${kind}: animated width`);
    }
  }
});

test("共享几何与材质，实例关节独立且动画不改共享顶点", () => {
  for (const kind of SHOAL_CREATURE_KINDS) {
    const a = specimen(kind),
      b = specimen(kind);
    const left = meshes(a.root),
      right = meshes(b.root);
    left.forEach((mesh, index) => {
      assert.equal(mesh.geometry, right[index].geometry, kind);
      assert.equal(mesh.material, right[index].material, kind);
      if (mesh.isSkinnedMesh)
        assert.notEqual(mesh.skeleton, right[index].skeleton, kind);
    });
    const positions = left.map((mesh) =>
      mesh.geometry.attributes.position.array.slice(),
    );
    a.animate(0);
    b.animate(0);
    const unchanged = bounds(b.root).clone(),
      before = bounds(a.root).clone();
    a.animate(2.3, 3);
    assert.notDeepEqual(
      bounds(a.root),
      before,
      `${kind}: actual geometry moves`,
    );
    assert.deepEqual(bounds(b.root), unchanged, kind);
    left.forEach((mesh, index) =>
      assert.deepEqual(
        mesh.geometry.attributes.position.array,
        positions[index],
      ),
    );
  }
});

test("飞鱼水下胸鳍向后收拢，空中展开且状态不泄漏", () => {
  const a = specimen("flying_fish"),
    b = specimen("flying_fish");
  a.animate(0);
  b.animate(0);
  const folded = bounds(a.root).getSize(new THREE.Vector3()).x;
  a.root.userData.setGliding(true);
  a.animate(0);
  const spread = bounds(a.root).getSize(new THREE.Vector3()).x;
  assert.ok(spread > folded * 2.4, `${folded} -> ${spread}`);
  assert.equal(b.root.userData.airborne, false);
  a.root.userData.setGliding(false);
  a.animate(0);
  assert.ok(
    Math.abs(bounds(a.root).getSize(new THREE.Vector3()).x - folded) < 1e-6,
  );
});

test("浅海动物保留解剖差异与可射线命中的实际表面", () => {
  const size = (kind) =>
    bounds(specimen(kind).root).getSize(new THREE.Vector3());
  assert.ok(size("herring").y > size("anchovy").y * 1.5);
  assert.ok(size("sunfish").y > size("sunfish").x * 2);
  assert.ok(size("ray").x > size("ray").y * 7);
  const turtle = specimen("turtle").root;
  assert.ok(turtle.getObjectByName("turtle_carapace"));
  assert.ok(turtle.getObjectByName("turtle_front_flipper_1"));
  for (const kind of SHOAL_CREATURE_KINDS) {
    const { root, animate } = specimen(kind);
    root.position.set(8, -5, 13);
    root.rotation.y = 0.4;
    root.scale.setScalar(3);
    animate(0.6);
    bounds(root);
    const center = root.localToWorld(new THREE.Vector3(0, 0, 0));
    const ray = new THREE.Raycaster(
      center.clone().add(new THREE.Vector3(0, 4, 0)),
      new THREE.Vector3(0, -1, 0),
    );
    assert.ok(ray.intersectObject(root, true).length > 0, kind);
  }
});
