import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildLordCreature,
  LORD_CREATURE_KINDS,
} from "../src/creature_lords.js";
import { findBossContact } from "../src/encounters.js";

function fixture(kind, length = 1) {
  const root = new THREE.Group();
  const motions = [];
  buildLordCreature(kind, root, motions);
  root.scale.setScalar(length);
  return { root, motions };
}

function meshes(root) {
  const result = [];
  root.traverse((part) => {
    if (part.isMesh) result.push(part);
  });
  return result;
}

function pose(root) {
  root.updateMatrixWorld(true);
  const matrices = [];
  root.traverse((part) => matrices.push(...part.matrixWorld.elements));
  return matrices;
}

test("四种深渊领主使用有限闭合实体，归一化体长且满足实时网格预算", () => {
  for (const kind of LORD_CREATURE_KINDS) {
    const { root, motions } = fixture(kind);
    const box = new THREE.Box3().setFromObject(root);
    assert.ok(Math.abs(box.max.z - box.min.z - 1) < 1e-6, kind);
    assert.ok(Math.abs(box.max.z + box.min.z) < 1e-6, kind);
    let triangles = 0;
    let expectedBatches = 0;
    root.traverse((part) => {
      assert.ok(!part.isLight, `${kind}: no per-instance lights`);
      if (part.isGroup) {
        expectedBatches += new Set(
          part.children
            .filter((child) => child.isMesh)
            .map((child) => child.material),
        ).size;
      }
      if (!part.isMesh) return;
      assert.equal(part.material.transparent, false, `${kind}: solid geometry`);
      for (const attribute of Object.values(part.geometry.attributes)) {
        assert.ok(
          attribute.array.every(Number.isFinite),
          `${kind}: finite vertices`,
        );
      }
      triangles +=
        (part.geometry.index?.count ||
          part.geometry.attributes.position.count) / 3;
    });
    assert.ok(triangles < 35000, `${kind}: ${triangles} triangles`);
    assert.ok(
      expectedBatches <= 22,
      `${kind}: ${expectedBatches} material batches`,
    );
    assert.ok(motions.length > 0, `${kind}: independent animation`);
  }
});

test("领主实例共享静态资源，动画只改变自己的节点且极限姿态保持有限", () => {
  for (const kind of LORD_CREATURE_KINDS) {
    const left = fixture(kind);
    const right = fixture(kind);
    const leftMeshes = meshes(left.root);
    const rightMeshes = meshes(right.root);
    const before = pose(left.root);
    const otherBefore = pose(right.root);
    leftMeshes.forEach((part, index) => {
      assert.strictEqual(part.geometry, rightMeshes[index].geometry);
      assert.strictEqual(part.material, rightMeshes[index].material);
    });
    const buffers = leftMeshes.map((part) =>
      part.geometry.attributes.position.array.slice(),
    );
    for (const time of [0, 3, 42, 1000]) {
      left.motions.forEach((motion) => motion(time, 3));
      assert.ok(pose(left.root).every(Number.isFinite));
      const box = new THREE.Box3().setFromObject(left.root);
      const size = box.getSize(new THREE.Vector3());
      assert.ok(
        size.z > 0.8 && size.z < 1.2,
        `${kind}: animated length ${size.z}`,
      );
    }
    assert.notDeepEqual(pose(left.root), before, `${kind}: visible movement`);
    assert.deepEqual(pose(right.root), otherBefore, `${kind}: isolated pose`);
    leftMeshes.forEach((part, index) => {
      assert.deepEqual(part.geometry.attributes.position.array, buffers[index]);
    });
  }
});

test("领主侧腹在多种朝向可命中，触腕与三颈之间保持真实空水域", () => {
  for (const kind of LORD_CREATURE_KINDS) {
    const { root } = fixture(kind, 42);
    root.position.set(12, -400, 6);
    root.rotation.set(0.2, 0.65, -0.15);
    root.updateMatrixWorld(true);
    const origin = new THREE.Vector3(1, 0, 0.1).applyMatrix4(root.matrixWorld);
    const direction = new THREE.Vector3(-1, 0, 0).transformDirection(
      root.matrixWorld,
    );
    const hits = new THREE.Raycaster(origin, direction).intersectObject(root);
    assert.ok(hits.length > 0, `${kind}: visible side surface`);
    assert.ok(
      findBossContact(
        root,
        hits[0].point.clone().addScaledVector(direction, -0.2),
        0.3,
      ),
      `${kind}: bite reaches actual surface`,
    );
    assert.equal(
      findBossContact(root, origin, 0.3),
      null,
      `${kind}: open water`,
    );
    const interior = new THREE.Vector3(0, 0, 0.15).applyMatrix4(
      root.matrixWorld,
    );
    assert.ok(findBossContact(root, interior, 0.4), `${kind}: body interior`);
  }
  const kraken = fixture("kraken", 42).root;
  assert.equal(
    findBossContact(kraken, new THREE.Vector3(0, 0, -12.6), 0.4),
    null,
  );
  const hydra = fixture("hydra", 46).root;
  assert.equal(
    findBossContact(hydra, new THREE.Vector3(5.52, 11.04, -11.5), 0.4),
    null,
  );
});
