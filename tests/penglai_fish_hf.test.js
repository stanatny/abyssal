import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = ["jade_minnow", "chiru", "spirit_carp", "dragon_carp"];
const position = (root, mesh, i) => {
  root.updateMatrixWorld(true);
  mesh.skeleton.update();
  return mesh.getVertexPosition(i, new THREE.Vector3());
};
for (const kind of kinds) {
  test(`${kind}: shared HF geometry retains scale and unit weights with independent disposable skeletons`, () => {
    const a = createCreature(kind, 1, 42),
      b = createCreature(kind, 1, 42),
      { mesh } = a.userData.hfRig,
      g = mesh.geometry;
    assert.equal(a.userData.artRevision, "trellis_penglai_fish_20261027");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.equal(mesh.material, b.userData.hfRig.mesh.material);
    assert.notEqual(mesh.skeleton, b.userData.hfRig.mesh.skeleton);
    const size = g.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.z - 1) < 1e-6);
    assert.ok(
      g.index.count / 3 <
        {
          jade_minnow: 3400,
          chiru: 5700,
          spirit_carp: 6700,
          dragon_carp: 6700,
        }[kind],
    );
    for (const m of [mesh]) {
      const w = m.geometry.attributes.skinWeight,
        ids = m.geometry.attributes.skinIndex,
        n = m.geometry.attributes.normal;
      for (let i = 0; i < w.count; i++) {
        assert.ok(
          Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
        );
        assert.ok(
          Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) <
            0.002,
        );
        for (let j = 0; j < 4; j++)
          assert.ok(ids.array[i * 4 + j] < m.skeleton.bones.length);
      }
    }
    const still = position(b, b.userData.hfRig.mesh, 25);
    a.userData.animate(1, 3);
    assert.deepEqual(position(b, b.userData.hfRig.mesh, 25), still);
    let disposed = 0;
    for (const m of [mesh]) {
      m.skeleton.computeBoneTexture();
      m.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    }
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
    assert.ok(b.userData.hfRig.mesh.geometry.attributes.position);
  });
  test(`${kind}: actual appendage vertices remain continuous, cullable and frozen on repeated phase`, () => {
    const m = createCreature(kind, 1, 7),
      { mesh, chains, bones } = m.userData.hfRig,
      tips = [];
    for (const c of chains) {
      let best = -Infinity,
        tip;
      for (const skin of [mesh]) {
        const g = skin.geometry,
          p = g.attributes.position,
          w = g.attributes.skinWeight,
          ids = g.attributes.skinIndex;
        for (let i = 0; i < p.count; i++) {
          let weight = 0;
          for (let j = 0; j < 4; j++)
            if (c.ids.includes(ids.array[i * 4 + j]))
              weight += w.array[i * 4 + j];
          const score = new THREE.Vector3()
            .fromBufferAttribute(p, i)
            .distanceToSquared(new THREE.Vector3(...c.points[0]));
          if (weight > 0.6 && score > best) {
            best = score;
            tip = { skin, i, poses: [] };
          }
        }
      }
      assert.ok(tip, c.name);
      tips.push(tip);
    }
    const immutable = Float32Array.from(
      mesh.geometry.attributes.position.array,
    );
    for (let f = 0; f < 240; f++) {
      m.userData.animate(f / 60, f < 80 ? 0.7 : f < 160 ? 3 : 0.7);
      for (const t of tips) t.poses.push(position(m, t.skin, t.i));
    }
    for (const t of tips) {
      assert.ok(
        new THREE.Box3()
          .setFromPoints(t.poses)
          .getSize(new THREE.Vector3())
          .length() > 0.001,
      );
      for (let i = 1; i < t.poses.length; i++)
        assert.ok(t.poses[i].distanceTo(t.poses[i - 1]) < 0.04);
      for (const p of t.poses)
        assert.ok(t.skin.boundingSphere.containsPoint(p));
    }
    const snapshot = bones.map((b) => ({
      r: b.rotation.toArray(),
      s: b.scale.toArray(),
    }));
    m.userData.animate(239 / 60, 3);
    assert.deepEqual(
      bones.map((b) => ({ r: b.rotation.toArray(), s: b.scale.toArray() })),
      snapshot,
    );
    assert.deepEqual(mesh.geometry.attributes.position.array, immutable);
    const same = new Map(),
      p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (same.has(key))
        assert.ok(
          position(m, mesh, i).distanceTo(position(m, mesh, same.get(key))) <
            1e-7,
        );
      else same.set(key, i);
    }
  });
}

test("new atlas triangles remain in one color chart", () => {
  for (const kind of kinds) {
    const d = JSON.parse(
      readFileSync(
        new URL(`../src/assets/models/${kind}_hf_mesh.json`, import.meta.url),
      ),
    );
    assert.match(d.textureBake.method, /closest source/);
    assert.equal(d.textureBake.sourceSha256, d.sourceSha256);
    const dec = (s) =>
        new Uint16Array(Uint8Array.from(Buffer.from(s, "base64")).buffer),
      idx = dec(d.index),
      chart = dec(d.uvChart);
    for (let i = 0; i < idx.length; i += 3) {
      assert.equal(chart[idx[i]], chart[idx[i + 1]]);
      assert.equal(chart[idx[i]], chart[idx[i + 2]]);
    }
  }
});

test("Penglai redraw preserves catalogue length, stock and original region membership", () => {
  for (const [kind, population, length] of [
    ["jade_minnow", 40, 0.6],
    ["chiru", 27, 3.3],
    ["spirit_carp", 30, 6],
    ["dragon_carp", 30, 10],
  ]) {
    const species = getRegionSpecies("penglai").find((s) => s.kind === kind);
    assert.equal(species.population, population);
    assert.equal(species.length, length);
    assert.equal(
      getRegionSpecies("hawaii").some((s) => s.kind === kind),
      false,
    );
    assert.equal(
      getRegionSpecies("atlantis").some((s) => s.kind === kind),
      false,
    );
  }
});

test("Penglai rigid snouts stay anchored while posterior surfaces propel the fish", () => {
  for (const kind of kinds) {
    const root = createCreature(kind, 1, 17),
      { mesh } = root.userData.hfRig;
    const p = mesh.geometry.attributes.position,
      points = [];
    for (let i = 0; i < p.count; i++) if (p.getZ(i) < -0.35) points.push(i);
    assert.ok(points.length > 50);
    const before = points.map((i) => position(root, mesh, i));
    for (let f = 0; f < 180; f++) {
      root.userData.animate(f / 60, f < 60 ? 0.7 : 3);
      points.forEach((id, i) =>
        assert.ok(
          position(root, mesh, id).distanceTo(before[i]) < 1e-7,
          kind + " snout flexed",
        ),
      );
    }
    root.userData.disposeLocalMotion();
  }
});
