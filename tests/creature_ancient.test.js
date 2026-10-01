import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import {
  ANCIENT_CREATURE_KINDS,
  buildAncientCreature,
} from "../src/creature_ancient.js";

function specimen(kind) {
  const root = new THREE.Group(),
    motions = [];
  buildAncientCreature(kind, root, motions);
  return {
    root,
    animate: (phase, effort = 1) =>
      motions.forEach((motion) => motion(phase, effort)),
  };
}
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
    vertex = new THREE.Vector3();
  for (const object of meshes(root)) {
    if (object.isSkinnedMesh) object.skeleton.update();
    for (
      let index = 0;
      index < object.geometry.attributes.position.count;
      index++
    ) {
      object.getVertexPosition(index, vertex).applyMatrix4(object.matrixWorld);
      assert.ok(vertex.toArray().every(Number.isFinite));
      bounds.expandByPoint(vertex);
    }
  }
  return bounds;
}

test("远古模型纵长精确归一、极值姿态有效且处于实时面数预算", () => {
  assert.equal(ANCIENT_CREATURE_KINDS.size, 9);
  for (const kind of ANCIENT_CREATURE_KINDS) {
    const { root, animate } = specimen(kind);
    assert.equal(root.userData.normalizedLength, 1);
    const rest = posedBounds(root);
    assert.ok(Math.abs(rest.getSize(new THREE.Vector3()).z - 1) < 1e-6, kind);
    assert.ok(rest.getCenter(new THREE.Vector3()).length() < 1e-5, kind);
    const objects = meshes(root);
    assert.ok(objects.length <= 16, `${kind}: draw budget`);
    const triangles = objects.reduce(
      (sum, node) =>
        sum +
        (node.geometry.index?.count ??
          node.geometry.attributes.position.count) /
          3,
      0,
    );
    assert.ok(triangles <= 15000, `${kind}: triangle budget`);
    for (const [phase, effort] of [
      [0, 0],
      [0.7, 3],
      [2, 1],
      [9, 3],
      [10000, 0.15],
    ]) {
      animate(phase, effort);
      const size = posedBounds(root).getSize(new THREE.Vector3());
      assert.ok(size.z > 0.85 && size.z < 1.1, `${kind}: posed length`);
      assert.ok(
        size.x > 0.2 && size.x < (kind === "archelon" ? 1.35 : 0.95),
        `${kind}: posed width`,
      );
      assert.ok(size.y > 0.08 && size.y < 0.6, `${kind}: posed height`);
    }
  }
});

test("远古动物共享表面资源，独立骨骼、下颌与四鳍改变真实姿态", () => {
  for (const kind of ANCIENT_CREATURE_KINDS) {
    const a = specimen(kind),
      b = specimen(kind);
    const left = meshes(a.root),
      right = meshes(b.root);
    left.forEach((node, i) => {
      assert.equal(node.geometry, right[i].geometry);
      assert.equal(node.material, right[i].material);
    });
    const torso = left.find((node) => node.isSkinnedMesh);
    const other = right.find((node) => node.isSkinnedMesh);
    assert.notEqual(torso.skeleton, other.skeleton);
    const positions = torso.geometry.attributes.position;
    const original = positions.array.slice();
    let index = 0;
    for (let i = 1; i < positions.count; i++)
      if (positions.getZ(i) > positions.getZ(index)) index = i;
    a.animate(0);
    b.animate(0);
    posedBounds(a.root);
    const before = torso.getVertexPosition(index, new THREE.Vector3());
    const neighbor = posedBounds(b.root).clone();
    const jaw = a.root.getObjectByName(`${kind}_jaw`),
      jawAngle = jaw.rotation.x;
    const flipper = a.root.getObjectByName(`${kind}_front_flipper_1`),
      finAngle = flipper.rotation.z;
    a.animate(2, 3);
    posedBounds(a.root);
    const after = torso.getVertexPosition(index, new THREE.Vector3());
    assert.ok(
      kind === "archelon"
        ? after.distanceTo(before) < 1e-6
        : after.distanceTo(before) > 0.0001,
      `${kind}: rigid shell or real axial skin deformation`,
    );
    assert.notEqual(jaw.rotation.x, jawAngle);
    assert.notEqual(flipper.rotation.z, finAngle);
    assert.deepEqual(posedBounds(b.root), neighbor);
    assert.deepEqual(positions.array, original);
    const tail = a.root.getObjectByName(`${kind}_tail`);
    if (tail) assert.equal(tail.parent, torso.skeleton.bones[2]);
  }
});

test("六种史前动物的躯干在世界变换与运动后仍可射线命中", () => {
  for (const kind of ANCIENT_CREATURE_KINDS) {
    const { root, animate } = specimen(kind);
    root.position.set(11, -7, -13);
    root.rotation.y = 0.45;
    root.scale.setScalar(4);
    animate(1.2, 3);
    posedBounds(root);
    const center = root.localToWorld(new THREE.Vector3(0, 0, 0.1));
    const ray = new THREE.Raycaster(
      center.clone().add(new THREE.Vector3(5, 0, 0)),
      new THREE.Vector3(-1, 0, 0),
    );
    assert.ok(
      ray.intersectObject(root, true).some((hit) => hit.object.isSkinnedMesh),
      kind,
    );
  }
});

test("细颈蛇颈龙、粗壮上龙、长身龙王鲸保留不同头颈和躯干比例", () => {
  const width = (kind, z) => {
    const { root } = specimen(kind);
    const position = meshes(root).find((node) => node.isSkinnedMesh).geometry
      .attributes.position;
    let result = 0;
    for (let i = 0; i < position.count; i++)
      if (Math.abs(position.getZ(i) - z) < 0.012)
        result = Math.max(result, Math.abs(position.getX(i)));
    return result;
  };
  assert.ok(width("plesiosaur", -0.25) < width("pliosaur", -0.25) * 0.4);
  assert.ok(width("basilosaurus", 0.1) < width("pliosaur", 0.1) * 0.5);
  assert.ok(width("dunkleosteus", -0.3) > width("mosasaur", -0.3) * 1.8);
});

test("统一生物入口保留远古分支和动作，静态合批后仍可命中", () => {
  for (const kind of ANCIENT_CREATURE_KINDS) {
    const root = createCreature(kind, 6, 71);
    assert.equal(root.userData.ancientAnatomy, kind);
    assert.equal(root.userData.kind, kind);
    assert.equal(root.userData.normalizedLength, 1);
    assert.ok(
      Math.abs(posedBounds(root).getSize(new THREE.Vector3()).z - 6) < 1e-5,
    );
    root.userData.animate(0, 1);
    for (let i = 1; i < 30; i++)
      root.userData.animate(i / 30, i % 2 ? 1e6 : -1e6);
    const size = posedBounds(root).getSize(new THREE.Vector3());
    assert.ok(size.z > 5 && size.z < 6.6);
    const center = root.localToWorld(new THREE.Vector3(0, 0, 0.1));
    const ray = new THREE.Raycaster(
      center.clone().add(new THREE.Vector3(10, 0, 0)),
      new THREE.Vector3(-1, 0, 0),
    );
    assert.ok(
      ray.intersectObject(root, true).some((hit) => hit.object.isSkinnedMesh),
      kind,
    );
  }
});
