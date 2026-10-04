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
    const center =
      kind === "kraken"
        ? new THREE.Vector3(0, 0, 0.14).applyMatrix4(
            root.getObjectByName("kraken_ribbed_mantle").matrixWorld,
          )
        : new THREE.Vector3(0, 0, 0.15).applyMatrix4(root.matrixWorld);
    const origin = center
      .clone()
      .addScaledVector(
        new THREE.Vector3(1, 0, 0).transformDirection(root.matrixWorld),
        42,
      );
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
    const interior = center;
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

test("新增分段触腕、长颈和蛇尾在完整摆动中保持真实网格接触", () => {
  for (const [kind, distalName] of [
    ["kraken", "kraken_curled_arm_1"],
    ["hydra", "hydra_neck_surface_0_distal"],
    ["leviathan", "leviathan_serpent_tail_distal"],
  ]) {
    const { root, motions } = fixture(kind, 53);
    root.position.set(17, -450, -83);
    root.rotation.set(0.25, 1.1, -0.13);
    const distal = root.getObjectByName(distalName);
    const surface = distal.children.find((part) => part.isMesh);
    const index = Math.floor(surface.geometry.attributes.position.count * 0.8);
    const vertex = new THREE.Vector3().fromBufferAttribute(
      surface.geometry.attributes.position,
      index,
    );
    const samples = [];
    for (let phase = 0; phase <= (Math.PI * 2) / 0.21; phase += 1) {
      for (const motion of motions) motion(phase, phase < 12 ? 0.7 : 2.5);
      root.updateMatrixWorld(true);
      const point = (
        surface.isSkinnedMesh
          ? surface.getVertexPosition(index, new THREE.Vector3())
          : vertex.clone()
      ).applyMatrix4(surface.matrixWorld);
      assert.ok(
        findBossContact(root, point, 0.08),
        `${kind}: moving surface at ${phase}`,
      );
      samples.push(point);
    }
    assert.ok(
      samples.some((point) => point.distanceTo(samples[0]) > 0.2),
      `${kind}: distal vertices actually move`,
    );
    assert.equal(
      root.userData.contactRoot,
      undefined,
      `${kind}: no invisible substitute contact`,
    );
  }
});

test("海德拉三枚吻端锚点跟随各自长颈，旋转缩放后仍相互独立", () => {
  const { root, motions } = fixture("hydra", 53);
  const anchors = root.userData.mouthAnchors;
  assert.equal(anchors.length, 3);
  root.position.set(21, -25, -301);
  root.rotation.set(0.2, 0.8, 0.1);
  const before = anchors.map((anchor) =>
    anchor.getWorldPosition(new THREE.Vector3()),
  );
  for (const motion of motions) motion(11, 2.5);
  const after = anchors.map((anchor) =>
    anchor.getWorldPosition(new THREE.Vector3()),
  );
  for (let i = 0; i < 3; i++) {
    assert.ok(after[i].distanceTo(before[i]) > 0.15);
    assert.ok(after[i].distanceTo(root.position) < 53 * 0.7);
    assert.equal(anchors[i].parent.name, `hydra_dragon_head_${i + 1}`);
    for (let j = i + 1; j < 3; j++)
      assert.ok(after[i].distanceTo(after[j]) > 5);
  }
});
