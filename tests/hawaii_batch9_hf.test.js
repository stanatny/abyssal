import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";

const kinds = ["flying_fish", "fish", "mackerel", "sardine"];
const limits = { flying_fish: 3600, fish: 7400, mackerel: 8700, sardine: 7100 };
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
    assert.equal(a.userData.artRevision, "trellis_hawaii_batch9_20261019");
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
          (kind === "flying_fish" ? 0.003 : 0.005),
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

test("all regional school populations and biological lengths remain unchanged", () => {
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
          ? { flying_fish: 15, fish: 75, mackerel: 18, sardine: 40 }[kind]
          : kind === "sardine"
            ? ({ bermuda: 100, atlantis: 172, mariana: 80 }[region] ?? 0)
            : 0;
      assert.equal(s?.population ?? 0, count);
      if (s)
        assert.equal(
          s.length,
          { flying_fish: 0.4, fish: 0.8, mackerel: 0.55, sardine: 0.3 }[kind],
        );
    }
});

test("flying fish opens continuous paired wings for the existing flight, then folds without birdlike flapping", async () => {
  const { stepFlyingFish } = await import("../src/flying_fish.js");
  const m = createCreature("flying_fish", 1, 31),
    other = createCreature("flying_fish", 1, 31),
    { mesh, bones } = m.userData.hfRig,
    p = mesh.geometry.attributes.position;
  const tips = [-1, 1].map((side) => {
    let best = -Infinity,
      id = -1;
    for (let i = 0; i < p.count; i++)
      if (p.getX(i) * side > best) {
        best = p.getX(i) * side;
        id = i;
      }
    return id;
  });
  const pose = () => tips.map((i) => vertex(m, i)),
    width = () => {
      const a = pose();
      return a[0].distanceTo(a[1]);
    };
  for (let i = 0; i < 120; i++) m.userData.animate(i / 60, 1.4);
  const folded = width(),
    own = other.userData.hfRig.bones.map((b) => b.rotation.toArray());
  m.position.set(0, -5, -30);
  const e = {
    species: { kind: "flying_fish" },
    mesh: m,
    velocity: new THREE.Vector3(),
  };
  const player = new THREE.Vector3(0, -5, -20);
  assert.equal(stepFlyingFish(e, 1 / 60, 2, player), true);
  assert.equal(m.userData.airborne, true);
  let previous = pose();
  const stable = [];
  let maxY = -Infinity;
  for (let i = 0; i < 270; i++) {
    stepFlyingFish(e, 1 / 60, 2 + i / 60, player);
    m.userData.animate(2 + i / 60, 1.4);
    const current = pose();
    current.forEach((v, j) =>
      assert.ok(
        v.distanceTo(previous[j]) < 0.05,
        `frame ${i}: ${v.distanceTo(previous[j])}`,
      ),
    );
    previous = current;
    maxY = Math.max(maxY, m.position.y);
    if (i >= 100 && i < 160) stable.push(current);
  }
  assert.ok(maxY > 4);
  assert.equal(e.flight, null);
  assert.equal(m.userData.airborne, false);
  const open = stable[0][0].distanceTo(stable[0][1]);
  assert.ok(open > folded * 1.8, `${folded} -> ${open}`);
  for (const sample of stable)
    sample.forEach((v, j) =>
      assert.ok(
        v.distanceTo(stable[0][j]) < 0.001,
        "Settled gliding wings must not flap",
      ),
    );
  for (let i = 270; i < 360; i++) m.userData.animate(2 + i / 60, 1.4);
  assert.ok(Math.abs(width() - folded) < 0.02);
  assert.deepEqual(
    other.userData.hfRig.bones.map((b) => b.rotation.toArray()),
    own,
  );
  const frozen = bones.map((b) => b.rotation.toArray());
  m.userData.setGliding(true);
  m.userData.animate(2 + 359 / 60, 1.4);
  assert.deepEqual(
    bones.map((b) => b.rotation.toArray()),
    frozen,
  );
});
