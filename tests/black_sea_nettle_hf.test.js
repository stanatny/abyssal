import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { buildBlackSeaNettleHF } from "../src/creature_black_sea_nettle_hf.js";
import { BLACK_SEA_NETTLE_DIMENSIONS } from "../src/black_sea_nettle_asset.js";

const data = JSON.parse(
  readFileSync(
    new URL(
      "../src/assets/models/black_sea_nettle_hf_mesh.json",
      import.meta.url,
    ),
  ),
);
function create(length = 1) {
  const root = new THREE.Group(),
    motions = [];
  buildBlackSeaNettleHF(root, motions);
  root.scale.setScalar(length);
  root.updateMatrixWorld(true);
  return {
    root,
    rig: root.userData.hfRig,
    animate(t) {
      for (const motion of motions) motion(t);
      root.updateMatrixWorld(true);
      root.userData.hfRig.mesh.skeleton.update();
    },
  };
}
const pos = (mesh, i) => mesh.getVertexPosition(i, new THREE.Vector3());

test("black sea nettle retains four source oral arms with bounded shared buffers and private skeletons", () => {
  const a = create(),
    b = create(),
    { mesh, chains, bones } = a.rig,
    g = mesh.geometry;
  assert.equal(g, b.rig.mesh.geometry);
  assert.equal(mesh.material, b.rig.mesh.material);
  assert.notEqual(mesh.skeleton, b.rig.mesh.skeleton);
  assert.equal(chains.filter((c) => c.type === "arm").length, 4);
  assert.equal(bones.length, 26);
  assert.equal(g.index.count / 3, 9912);
  assert.equal(g.attributes.position.count, 14799);
  assert.equal(mesh.material.transparent, true);
  assert.equal(a.root.userData.aquaticUpright, true);
  assert.equal(a.root.userData.anatomyDimensions, BLACK_SEA_NETTLE_DIMENSIONS);
  assert.equal(BLACK_SEA_NETTLE_DIMENSIONS.bellDiameter, 1);
  assert.ok(BLACK_SEA_NETTLE_DIMENSIONS.totalHeight < 2.3);
  assert.equal(data.sourceRepair.retainedColumns.length, 4);
  assert.equal(data.sourceRepair.originalTriangles, 99225);
  assert.equal(data.textureBake.sourceSha256, data.sourceSha256);
  assert.equal(
    data.sourceSha256,
    "7bcf1f20c666cff4090f3969ea3ada28dd41a95dd4b33113b734af8853ce1d36",
  );
  const p = g.attributes.position,
    n = g.attributes.normal,
    weights = g.attributes.skinWeight,
    ids = g.attributes.skinIndex,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    assert.ok(
      Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) <
        0.002,
    );
    let sum = 0;
    for (let j = 0; j < 4; j++) {
      const w = weights.array[i * 4 + j];
      assert.ok(w >= 0 && w <= 1);
      assert.ok(ids.array[i * 4 + j] < bones.length);
      sum += w;
    }
    assert.ok(Math.abs(sum - 1) < 1e-6);
    assert.ok(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i)));
  }
  a.animate(0);
  b.animate(0);
  const still = pos(b.rig.mesh, 300);
  a.animate(7);
  assert.deepEqual(pos(b.rig.mesh, 300), still);
  let disposed = 0,
    sharedDisposed = 0;
  mesh.skeleton.computeBoneTexture();
  mesh.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
  g.addEventListener("dispose", () => sharedDisposed++);
  mesh.material.addEventListener("dispose", () => sharedDisposed++);
  a.root.userData.disposeLocalMotion();
  a.root.userData.disposeLocalMotion();
  assert.equal(disposed, 1);
  assert.equal(sharedDisposed, 0);
  b.animate(8);
  assert.ok(pos(b.rig.mesh, 300).toArray().every(Number.isFinite));
});

test("four frilled arms sway continuously without UV seams, root separation or culling escapes", () => {
  const a = create(),
    { mesh, bones, chains } = a.rig,
    p = mesh.geometry.attributes.position,
    weights = mesh.geometry.attributes.skinWeight,
    ids = mesh.geometry.attributes.skinIndex,
    immutable = Float32Array.from(p.array),
    arms = chains.filter((c) => c.type === "arm"),
    tips = arms.map((c) => {
      let chosen = -1,
        farthest = -Infinity;
      for (let i = 0; i < p.count; i++) {
        let influence = 0;
        for (let j = 0; j < 4; j++)
          if (c.ids.includes(ids.array[i * 4 + j]))
            influence += weights.array[i * 4 + j];
        if (influence < 0.9) continue;
        const d = new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .distanceToSquared(new THREE.Vector3(...c.points[0]));
        if (d > farthest) {
          chosen = i;
          farthest = d;
        }
      }
      assert.ok(chosen >= 0, c.name);
      return { i: chosen, poses: [] };
    }),
    seams = [],
    seen = new Map(),
    envelope = new THREE.Box3();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    if (seen.has(key)) seams.push([i, seen.get(key)]);
    else seen.set(key, i);
  }
  assert.ok(seams.length > 1000);
  for (let f = 0; f <= 180; f++) {
    a.animate(f / 10);
    for (const t of tips) t.poses.push(pos(mesh, t.i));
    // 完整扫描实际蒙皮而非只扫关节，覆盖最长褶皱和细触丝。
    for (let i = 0; i < p.count; i++) {
      const v = pos(mesh, i);
      assert.ok(v.toArray().every(Number.isFinite));
      assert.ok(mesh.boundingSphere.containsPoint(v));
      assert.ok(Math.hypot(v.x, v.z) < 0.7);
      assert.ok(v.y > -2.3 && v.y < 0.25);
      envelope.expandByPoint(v);
    }
    if (f % 30 === 0)
      for (const [i, j] of seams)
        assert.ok(pos(mesh, i).distanceTo(pos(mesh, j)) < 1e-7);
    // 四个根骨都由同一伞骨驱动，伞内连接不受独立水流漂走。
    for (const arm of arms) {
      assert.equal(bones[arm.ids[0]].parent, bones[chains[0].ids[0]]);
      const rootPoint = new THREE.Vector3(...arm.points[0]).applyMatrix4(
        bones[chains[0].ids[0]].matrixWorld,
      );
      assert.ok(
        bones[arm.ids[0]]
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(rootPoint) < 1e-7,
      );
    }
  }
  for (const t of tips) {
    assert.ok(
      new THREE.Box3()
        .setFromPoints(t.poses)
        .getSize(new THREE.Vector3())
        .length() > 0.03,
    );
    for (let i = 1; i < t.poses.length; i++)
      assert.ok(t.poses[i].distanceTo(t.poses[i - 1]) < 0.025);
  }
  const snapshot = bones.map((b) => [b.rotation.toArray(), b.scale.toArray()]);
  a.animate(18);
  assert.deepEqual(
    bones.map((b) => [b.rotation.toArray(), b.scale.toArray()]),
    snapshot,
  );
  assert.deepEqual(p.array, immutable);
  assert.ok(envelope.max.y > 0.2 && envelope.min.y < -2);
});

test("half-size and full-size instances preserve actual world anatomy and posed seam positions", () => {
  const full = create(1),
    half = create(0.5),
    p = full.rig.mesh.geometry.attributes.position;
  for (const t of [0, 1.5, 4.5, 9]) {
    full.animate(t);
    half.animate(t);
    for (let i = 0; i < p.count; i += 7) {
      const a = full.rig.mesh.localToWorld(pos(full.rig.mesh, i));
      const b = half.rig.mesh.localToWorld(pos(half.rig.mesh, i));
      assert.ok(a.distanceTo(b.multiplyScalar(2)) < 1e-6);
    }
  }
});
