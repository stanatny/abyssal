import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { EUROPA_SPECIES } from "../src/europa_species.js";
const kinds = ["glass_seed", "ribbon_spore", "tripod_bloom", "sail_crawler"];
test("Ribbon Spore visibly flexes its rear skin while retaining a steady leading end and pause", () => {
  const root = createCreature("ribbon_spore", 1, 31),
    mesh = root.userData.hfRig.mesh,
    p = mesh.geometry.attributes.position,
    v = new THREE.Vector3(),
    probes = [-0.39, 0.13, 0.43].map((z) => {
      let id = 0,
        nearest = Infinity;
      for (let i = 0; i < p.count; i++) {
        const distance = (p.getZ(i) - z) ** 2 + p.getX(i) ** 2 * 0.4;
        if (distance < nearest) {
          nearest = distance;
          id = i;
        }
      }
      return { id, bounds: new THREE.Box3(), previous: null };
    });
  for (let f = 0; f < 360; f++) {
    root.userData.animate(f / 60, f < 120 ? 0.5 : f < 240 ? 2.6 : 0.5);
    root.updateMatrixWorld(true);
    for (const probe of probes) {
      mesh.getVertexPosition(probe.id, v);
      probe.bounds.expandByPoint(v);
      if (probe.previous) assert.ok(v.distanceTo(probe.previous) < 0.03);
      probe.previous = v.clone();
    }
    if (f % 12 === 0)
      for (let i = 0; i < p.count; i++)
        assert.ok(
          mesh.boundingSphere.containsPoint(mesh.getVertexPosition(i, v)),
        );
    assert.deepEqual(root.position.toArray(), [0, 0, 0]);
  }
  assert.ok(
    probes[0].bounds.getSize(v).y < 0.02,
    "leading end bobs as a rigid body",
  );
  assert.ok(probes[1].bounds.getSize(v).y > 0.12, "rear membrane is too stiff");
  assert.ok(
    probes[2].bounds.getSize(v).y > 0.12,
    "trailing filaments stay rigid",
  );
  const frozen = probes.map((probe) =>
    mesh.getVertexPosition(probe.id, new THREE.Vector3()).toArray(),
  );
  root.userData.animate(359 / 60, 3);
  root.updateMatrixWorld(true);
  assert.deepEqual(
    probes.map((probe) =>
      mesh.getVertexPosition(probe.id, new THREE.Vector3()).toArray(),
    ),
    frozen,
  );
  root.userData.disposeLocalMotion();
});
for (const kind of kinds) {
  test(`${kind}: HF surface preserves configured size and independent bounded resources`, () => {
    const length = EUROPA_SPECIES.find((s) => s.kind === kind).length,
      a = createCreature(kind, length, 21),
      b = createCreature(kind, length, 21),
      r = a.userData.hfRig,
      s = b.userData.hfRig,
      g = r.mesh.geometry;
    assert.equal(a.userData.artRevision, "trellis_europa_small_20261026");
    assert.equal(g, s.mesh.geometry);
    assert.equal(r.mesh.material, s.mesh.material);
    assert.notEqual(r.mesh.skeleton, s.mesh.skeleton);
    assert.ok(
      Math.abs(
        new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3()).z -
          length,
      ) <
        length * 0.003,
    );
    assert.ok(
      g.index.count / 3 <=
        {
          glass_seed: 3000,
          ribbon_spore: 4200,
          tripod_bloom: 14000,
          sail_crawler: 16000,
        }[kind],
    );
    const w = g.attributes.skinWeight,
      idx = g.attributes.skinIndex;
    for (let i = 0; i < w.count; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        assert.ok(w.array[i * 4 + j] >= 0);
        sum += w.array[i * 4 + j];
        assert.ok(idx.array[i * 4 + j] < r.bones.length);
      }
      assert.ok(Math.abs(sum - 1) < 1e-6);
    }
    const before = s.bones.map((x) => x.quaternion.toArray());
    for (let f = 0; f < 60; f++) a.userData.animate(f / 60, 3);
    assert.deepEqual(
      s.bones.map((x) => x.quaternion.toArray()),
      before,
    );
    r.mesh.skeleton.computeBoneTexture();
    let disposed = 0;
    r.mesh.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
    assert.ok(s.mesh.geometry.attributes.position);
    b.userData.disposeLocalMotion();
  });
  test(`${kind}: actual moving vertices keep seams, attachment lengths and pause continuity`, () => {
    const a = createCreature(kind, 1, 3),
      { mesh, bones, chains } = a.userData.hfRig,
      g = mesh.geometry,
      p = g.attributes.position,
      ids = g.attributes.skinIndex,
      w = g.attributes.skinWeight,
      v = new THREE.Vector3(),
      seen = new Map(),
      pairs = [],
      tips = [];
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (seen.has(key)) pairs.push([i, seen.get(key)]);
      else seen.set(key, i);
    }
    for (const c of chains) {
      let tip = -1,
        best = -Infinity;
      for (let i = 0; i < p.count; i++) {
        let weight = 0;
        for (let j = 0; j < 4; j++)
          if (c.ids.includes(ids.array[i * 4 + j]))
            weight += w.array[i * 4 + j];
        const d = v
          .fromBufferAttribute(p, i)
          .distanceToSquared(new THREE.Vector3(...c.points[0]));
        if (weight > 0.55 && d > best) {
          best = d;
          tip = i;
        }
      }
      assert.ok(tip >= 0, c.name);
      tips.push({ i: tip, box: new THREE.Box3() });
    }
    const immutable = Array.from(p.array),
      restEdges = [];
    for (let i = 0; i < g.index.count; i += 39) {
      const ids = [g.index.array[i], g.index.array[i + 1]];
      if (ids[1] === undefined) continue;
      const d = v
        .fromBufferAttribute(p, ids[0])
        .distanceTo(new THREE.Vector3().fromBufferAttribute(p, ids[1]));
      if (d > 0.003) restEdges.push({ ids, d });
    }
    for (let f = 0; f < 180; f++) {
      a.userData.animate(f / 30, f < 60 ? 0.4 : f < 120 ? 3 : 0.4);
      a.updateMatrixWorld(true);
      mesh.skeleton.update();
      for (const t of tips) {
        mesh.getVertexPosition(t.i, v);
        assert.ok(v.toArray().every(Number.isFinite));
        assert.ok(mesh.boundingSphere.containsPoint(v));
        t.box.expandByPoint(v);
      }
      if (f % 10 === 0) {
        for (const [x, y] of pairs) {
          assert.ok(
            mesh
              .getVertexPosition(x, v)
              .distanceTo(mesh.getVertexPosition(y, new THREE.Vector3())) <
              1e-6,
            "UV seam separated",
          );
        }
        for (const e of restEdges) {
          const stretch =
            mesh
              .getVertexPosition(e.ids[0], v)
              .distanceTo(
                mesh.getVertexPosition(e.ids[1], new THREE.Vector3()),
              ) / e.d;
          assert.ok(stretch > 0.4 && stretch < 1.65, `skin stretch ${stretch}`);
        }
      }
    }
    for (const t of tips)
      assert.ok(
        t.box.getSize(v).length() > 0.0005,
        "appendage has no surface motion",
      );
    const snapshot = tips.map((t) =>
      mesh.getVertexPosition(t.i, new THREE.Vector3()).toArray(),
    );
    a.userData.animate(179 / 30, 0.4);
    a.updateMatrixWorld(true);
    mesh.skeleton.update();
    assert.deepEqual(
      tips.map((t) =>
        mesh.getVertexPosition(t.i, new THREE.Vector3()).toArray(),
      ),
      snapshot,
    );
    assert.deepEqual(Array.from(p.array), immutable);
    a.userData.disposeLocalMotion();
  });
}
