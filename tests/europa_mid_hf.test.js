import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { EUROPA_SPECIES } from "../src/europa_species.js";
const kinds = ["brine_rosette", "hinge_walker", "lantern_pod", "veil_glider"];
for (const kind of kinds) {
  test(`${kind}: HF surface preserves configured size and independent bounded resources`, () => {
    const length = EUROPA_SPECIES.find((s) => s.kind === kind).length,
      a = createCreature(kind, length, 21),
      b = createCreature(kind, length, 21),
      r = a.userData.hfRig,
      s = b.userData.hfRig,
      g = r.mesh.geometry;
    assert.equal(a.userData.artRevision, "trellis_europa_mid_20261026");
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
          brine_rosette: 12000,
          hinge_walker: 18000,
          lantern_pod: 14000,
          veil_glider: 8500,
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
