import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { SURFACE_BIRDS, regionalBirds } from "../src/surface_birds.js";
const vertex = (m, i) => {
  m.updateMatrixWorld(true);
  const b = m.userData.hfRig.mesh;
  b.skeleton.update();
  return b.getVertexPosition(i, new THREE.Vector3());
};
test("Brown Pelican retains regional identity, length and shared immutable surface", () => {
  const s = SURFACE_BIRDS.find((s) => s.kind === "pelican");
  assert.equal(s.length, 1.4);
  assert.equal(s.speed, 5.8);
  assert.equal(s.nutrition, 32);
  assert.deepEqual(s.regions, ["atlantis", "bermuda"]);
  assert.equal(
    regionalBirds("hawaii").some((s) => s.kind === "pelican"),
    false,
  );
  const a = createCreature("pelican", 1.4, 31),
    b = createCreature("pelican", 1.4, 32),
    g = a.userData.hfRig.mesh.geometry;
  assert.equal(a.userData.artRevision, "trellis_pelican_20261021");
  assert.equal(g, b.userData.hfRig.mesh.geometry);
  assert.equal(a.userData.hfRig.mesh.material, b.userData.hfRig.mesh.material);
  assert.notEqual(
    a.userData.hfRig.mesh.skeleton,
    b.userData.hfRig.mesh.skeleton,
  );
  assert.equal(a.scale.x, 1.4);
  assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-6);
  assert.ok(g.index.count / 3 < 11000);
  const w = g.attributes.skinWeight,
    ids = g.attributes.skinIndex,
    n = g.attributes.normal,
    seen = new Map();
  for (let i = 0; i < w.count; i++) {
    assert.ok(
      Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
    );
    assert.ok(
      Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) <
        0.002,
    );
    for (let j = 0; j < 4; j++) assert.ok(ids.array[i * 4 + j] < 9);
    const p = new THREE.Vector3()
        .fromBufferAttribute(g.attributes.position, i)
        .toArray()
        .join(","),
      weights = Array.from(w.array.slice(i * 4, i * 4 + 4)),
      bones = Array.from(ids.array.slice(i * 4, i * 4 + 4));
    if (seen.has(p)) assert.deepEqual({ weights, bones }, seen.get(p));
    else seen.set(p, { weights, bones });
  }
  a.userData.disposeLocalMotion();
  b.userData.disposeLocalMotion();
});
test("Brown Pelican actual wings alternate powerful strokes with quiet glide; head and skin seams stay stable", () => {
  const m = createCreature("pelican", 1, 31),
    { mesh } = m.userData.hfRig,
    g = mesh.geometry,
    p = g.attributes.position,
    heads = [],
    tips = [0, 0];
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) < -0.3) heads.push(i);
    if (p.getX(i) < p.getX(tips[0])) tips[0] = i;
    if (p.getX(i) > p.getX(tips[1])) tips[1] = i;
  }
  const head = vertex(m, heads[0]),
    poses = [[], []],
    immut = Float32Array.from(p.array);
  let maximumStep = 0;
  for (let f = 0; f < 720; f++) {
    m.userData.animate(0, 1.3, { gaitPhase: f / 30 });
    tips.forEach((tip, j) => {
      const v = vertex(m, tip);
      if (poses[j].length)
        maximumStep = Math.max(maximumStep, v.distanceTo(poses[j].at(-1)));
      poses[j].push(v);
      assert.ok(
        v.distanceTo(mesh.boundingSphere.center) < mesh.boundingSphere.radius,
      );
    });
    assert.ok(vertex(m, heads[0]).distanceTo(head) < 1e-8);
  }
  assert.ok(maximumStep < 0.07);
  for (const v of poses) {
    const span = new THREE.Box3().setFromPoints(v).getSize(new THREE.Vector3());
    assert.ok(span.y > 0.45 && span.y < 1.2);
  }
  const glide = [];
  for (let i = 0; i < 60; i++) {
    m.userData.animate(0, 1.3, { gaitPhase: 18 + i / 60 });
    glide.push(vertex(m, tips[0]));
  }
  assert.ok(
    new THREE.Box3()
      .setFromPoints(glide)
      .getSize(new THREE.Vector3())
      .length() < 0.001,
  );
  assert.deepEqual(p.array, immut);
  const frozen = vertex(m, tips[0]);
  m.userData.animate(0, 3, { gaitPhase: 18 + 59 / 60 });
  assert.deepEqual(vertex(m, tips[0]), frozen);
  m.userData.disposeLocalMotion();
});
test("Brown Pelican disposing one independent skeleton does not affect another or repeat disposal", () => {
  const a = createCreature("pelican", 1, 3),
    b = createCreature("pelican", 1, 3),
    sa = a.userData.hfRig.mesh.skeleton,
    sb = b.userData.hfRig.mesh.skeleton;
  const still = vertex(b, 100);
  a.userData.animate(1, 3);
  a.userData.animate(2, 3);
  assert.deepEqual(vertex(b, 100), still);
  sa.computeBoneTexture();
  sb.computeBoneTexture();
  let disposed = 0;
  sa.boneTexture.addEventListener("dispose", () => disposed++);
  a.userData.disposeLocalMotion();
  a.userData.disposeLocalMotion();
  assert.equal(disposed, 1);
  assert.equal(sa.boneTexture, null);
  assert.ok(sb.boneTexture);
  assert.ok(b.userData.hfRig.mesh.geometry.attributes.position);
  b.userData.disposeLocalMotion();
});
