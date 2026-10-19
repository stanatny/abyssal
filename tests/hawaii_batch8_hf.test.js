import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";

const kinds = ["wrasse", "parrotfish", "boxfish", "angler"];
const limits = {
  wrasse: 9500,
  parrotfish: 11000,
  boxfish: 3900,
  angler: 14000,
};
const vertex = (m, i) => {
  m.updateMatrixWorld(true);
  m.userData.hfRig.mesh.skeleton.update();
  return m.userData.hfRig.mesh.getVertexPosition(i, new THREE.Vector3());
};
for (const kind of kinds) {
  test(`${kind}: actual HF asset fits the existing body contract and owns only its independent skeleton`, () => {
    const a = createCreature(kind, 1, 42),
      b = createCreature(kind, 1, 42),
      ma = a.userData.hfRig.mesh,
      mb = b.userData.hfRig.mesh,
      g = ma.geometry;
    assert.equal(a.userData.artRevision, "trellis_hawaii_batch8_20261019");
    assert.equal(g, mb.geometry);
    assert.equal(ma.material, mb.material);
    assert.notEqual(ma.skeleton, mb.skeleton);
    assert.ok(g.index.count / 3 <= limits[kind]);
    assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-6);
    assert.ok(g.boundingBox.getCenter(new THREE.Vector3()).length() < 1e-6);
    const n = g.attributes.normal,
      w = g.attributes.skinWeight,
      ids = g.attributes.skinIndex;
    for (let i = 0; i < n.count; i++) {
      assert.ok(
        Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) <
          0.002,
      );
      assert.ok(
        Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
      );
      for (let j = 0; j < 4; j++)
        assert.ok(ids.array[i * 4 + j] < ma.skeleton.bones.length);
    }
    const idle = vertex(b, 25);
    a.userData.animate(1, 3);
    assert.deepEqual(vertex(b, 25), idle);
    let disposed = 0;
    ma.skeleton.computeBoneTexture();
    ma.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
    assert.equal(mb.geometry, g);
  });
  test(`${kind}: real appendage vertices move continuously through acceleration while UV duplicates stay joined`, () => {
    const m = createCreature(kind, 1, 77),
      { mesh, chains, bones } = m.userData.hfRig,
      g = mesh.geometry,
      p = g.attributes.position,
      w = g.attributes.skinWeight,
      ids = g.attributes.skinIndex;
    const selected = chains.filter((c) =>
      ["tail", "pectoral"].includes(c.type),
    );
    assert.equal(selected.length, 3);
    const tips = selected.map((c) => {
      let id = -1,
        score = -Infinity;
      const pivot = new THREE.Vector3(...c.points[0]);
      for (let i = 0; i < p.count; i++) {
        let total = 0;
        for (let j = 0; j < 4; j++)
          if (c.ids.includes(ids.array[i * 4 + j])) total += w.array[i * 4 + j];
        if (total > 0.85) {
          const d = new THREE.Vector3()
            .fromBufferAttribute(p, i)
            .distanceToSquared(pivot);
          if (d > score) {
            score = d;
            id = i;
          }
        }
      }
      assert.ok(id >= 0, c.name);
      return { id, poses: [] };
    });
    const seams = new Map();
    const immutable = Float32Array.from(p.array);
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (!seams.has(key)) seams.set(key, []);
      seams.get(key).push(i);
    }
    for (let frame = 0; frame < 360; frame++) {
      m.userData.animate(frame / 60, frame < 120 ? 0.7 : frame < 240 ? 3 : 0.7);
      for (const t of tips) t.poses.push(vertex(m, t.id));
      if (frame % 30 === 0)
        for (let i = 0; i < p.count; i += 41)
          assert.ok(
            mesh.boundingSphere.containsPoint(vertex(m, i)),
            "Culling bounds must contain the actual deformed skin",
          );
    }
    assert.deepEqual(p.array, immutable);
    for (const t of tips) {
      const box = new THREE.Box3().setFromPoints(t.poses);
      assert.ok(
        box.getSize(new THREE.Vector3()).length() >
          (kind === "boxfish" ? 0.009 : 0.018),
      );
      for (let i = 1; i < t.poses.length; i++)
        assert.ok(t.poses[i].distanceTo(t.poses[i - 1]) < 0.04);
    }
    for (const same of seams.values())
      if (same.length > 1) {
        const a = vertex(m, same[0]);
        for (const i of same.slice(1))
          assert.ok(a.distanceTo(vertex(m, i)) < 1e-7);
      }
    const paused = bones.map((b) => b.matrixWorld.toArray());
    m.userData.animate(359 / 60, 3);
    m.updateMatrixWorld(true);
    assert.deepEqual(
      bones.map((b) => b.matrixWorld.toArray()),
      paused,
    );
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 2, 0),
      new THREE.Vector3(0, -1, 0),
    );
    assert.ok(ray.intersectObject(m, true).length > 0);
  });
}

test("boxfish carapace and horns stay rigid while propulsion fins move", () => {
  const m = createCreature("boxfish", 1, 42),
    g = m.userData.hfRig.mesh.geometry,
    p = g.attributes.position;
  const ids = [];
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) < -0.28 || (Math.abs(p.getX(i)) < 0.09 && p.getZ(i) < 0))
      ids.push(i);
  assert.ok(ids.length > 200);
  const neutral = ids.map((i) => vertex(m, i));
  for (let frame = 0; frame < 180; frame++) {
    m.userData.animate(frame / 60, 3);
    if (frame % 30 === 0)
      for (let j = 0; j < ids.length; j++)
        assert.ok(vertex(m, ids[j]).distanceTo(neutral[j]) < 1e-7);
  }
});
test("angler lure moves as a connected skin, retains its mouth cavity and only lights the lure", () => {
  const m = createCreature("angler", 1, 42),
    { mesh, chains } = m.userData.hfRig,
    g = mesh.geometry,
    p = g.attributes.position;
  const lure = chains.find((c) => c.type === "lure");
  assert.ok(lure);
  let tip = -1,
    best = Infinity;
  for (let i = 0; i < p.count; i++) {
    const d = new THREE.Vector3()
      .fromBufferAttribute(p, i)
      .distanceToSquared(new THREE.Vector3(0, 0.168, -0.479));
    if (d < best) {
      best = d;
      tip = i;
    }
  }
  assert.ok(best < 0.002);
  const before = vertex(m, tip);
  for (let i = 0; i < 90; i++) m.userData.animate(i / 60, 2);
  assert.ok(vertex(m, tip).distanceTo(before) > 0.001);
  // A ray through the open jaws reaches the rear cavity instead of a sealed front plane.
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, -0.035, -1),
    new THREE.Vector3(0, 0, 1),
  );
  const hits = ray.intersectObject(m, true);
  assert.ok(hits.length);
  assert.ok(hits[0].point.z > -0.4);
  const shader = {
    vertexShader: "#include <begin_vertex>",
    fragmentShader: "#include <emissivemap_fragment>\n#include <map_fragment>",
  };
  mesh.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /distance\(lureRest/);
  assert.equal(mesh.material.metalness, 0);
});
test("redraw preserves all regional populations and lengths", () => {
  for (const region of [
    "hawaii",
    "bermuda",
    "atlantis",
    "mariana",
    "europa",
    "amazon",
    "odyssey",
    "penglai",
  ])
    for (const kind of kinds) {
      const s = getRegionSpecies(region).find((s) => s.kind === kind);
      const count =
        region === "hawaii"
          ? { wrasse: 6, parrotfish: 15, boxfish: 12, angler: 7 }[kind]
          : region === "mariana" && kind === "parrotfish"
            ? 15
            : 0;
      assert.equal(s?.population ?? 0, count);
      if (s)
        assert.equal(
          s.length,
          { wrasse: 1.7, parrotfish: 1.3, boxfish: 0.45, angler: 1.2 }[kind],
        );
    }
});
