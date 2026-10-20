import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";

const kinds = ["ray", "sunfish", "tuna", "octopus"];
const limits = { ray: 6000, sunfish: 3900, tuna: 4000, octopus: 18000 };
test("tuna: rebaked atlas triangles stay within one skin chart without increasing face count", async () => {
  const { default: asset } = await import(
    "../src/assets/models/tuna_hf_mesh.json",
    { with: { type: "json" } }
  );
  const chart = new Uint16Array(
    Uint8Array.from(Buffer.from(asset.uvChart, "base64")).buffer,
  );
  const geometry = createCreature("tuna", 1, 42).userData.hfRig.mesh.geometry,
    uv = geometry.attributes.uv,
    indices = geometry.index;
  assert.equal(indices.count / 3, 3774);
  assert.equal(chart.length, uv.count);
  for (let i = 0; i < uv.count; i++) {
    assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1);
    assert.ok(uv.getY(i) >= 0 && uv.getY(i) <= 1);
  }
  for (let i = 0; i < indices.count; i += 3) {
    const a = chart[indices.getX(i)];
    assert.equal(chart[indices.getX(i + 1)], a);
    assert.equal(chart[indices.getX(i + 2)], a);
  }
});
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
    assert.equal(
      a.userData.artRevision,
      kind === "octopus"
        ? "trellis_octopus_swim_20261020"
        : "trellis_hawaii_batch7_20261019",
    );
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
      kind === "octopus"
        ? c.type === "arm"
        : kind === "ray"
          ? c.type === "wing"
          : kind === "sunfish"
            ? c.type === "vertical"
            : c.type === "tail",
    );
    assert.equal(
      selected.length,
      kind === "octopus" ? 8 : kind === "tuna" ? 1 : 2,
    );
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
      // Jetting Octopus arms trail quietly; they are not eight propulsive fins.
      assert.ok(
        box.getSize(new THREE.Vector3()).length() >
          (kind === "octopus" ? 0.006 : 0.025),
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
      // 收腕后的原点可能是臂间空水域；对实体外套膜检查射线命中。
      new THREE.Vector3(
        0,
        2,
        kind === "octopus"
          ? chains.find((c) => c.type === "mantle").points[0][2]
          : 0,
      ),
      new THREE.Vector3(0, -1, 0),
    );
    assert.ok(ray.intersectObject(m, true).length > 0);
  });
}
test("four-kind redraw retains regional ecology and body sizes", () => {
  const expected = {
    hawaii: [28, 108, 40, 7],
    bermuda: [16, 76, 38, 10],
    atlantis: [24, 74, 36, 7],
    mariana: [16, 64, 32, 0],
  };
  for (const region of [
    "hawaii",
    "bermuda",
    "atlantis",
    "mariana",
    "europa",
    "amazon",
    "odyssey",
    "penglai",
  ]) {
    const all = getRegionSpecies(region);
    for (const [kind, i] of [
      ["sunfish", 0],
      ["tuna", 1],
      ["ray", 2],
      ["octopus", 3],
    ]) {
      const s = all.find((s) => s.kind === kind);
      assert.equal(s?.population ?? 0, expected[region]?.[i] ?? 0);
      if (s)
        assert.equal(
          s.length,
          { sunfish: 3, tuna: 3, ray: 4, octopus: 5 }[kind],
        );
    }
  }
});
