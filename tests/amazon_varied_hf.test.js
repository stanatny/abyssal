import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = [
  "red_piranha",
  "electric_eel",
  "river_stingray",
  "amazon_river_turtle",
];
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
    assert.equal(a.userData.artRevision, "trellis_amazon_varied_20261025");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.equal(mesh.material, b.userData.hfRig.mesh.material);
    assert.notEqual(mesh.skeleton, b.userData.hfRig.mesh.skeleton);
    const size = g.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.z - 1) < 1e-6);
    assert.ok(
      g.index.count / 3 <
        {
          red_piranha: 5000,
          electric_eel: 6800,
          river_stingray: 6500,
          amazon_river_turtle: 7800,
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

test("Amazon redraw preserves catalogue length, stock and original region membership", () => {
  for (const [kind, population, length] of [
    ["red_piranha", 8, 0.55],
    ["electric_eel", 6, 2.5],
    ["river_stingray", 5, 1.6],
    ["amazon_river_turtle", 24, 1.1],
  ]) {
    const species = getRegionSpecies("amazon").find((s) => s.kind === kind);
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

test("Piranha/eel snouts and turtle carapace stay stable while appendages move", () => {
  for (const kind of ["red_piranha", "electric_eel", "amazon_river_turtle"]) {
    const root = createCreature(kind, 1, 17),
      { mesh } = root.userData.hfRig,
      p = mesh.geometry.attributes.position,
      ids = [];
    for (let i = 0; i < p.count; i++)
      if (
        kind === "amazon_river_turtle"
          ? p.getY(i) > 0.075 && p.getZ(i) > -0.2 && p.getZ(i) < 0.25
          : p.getZ(i) < -0.38
      )
        ids.push(i);
    assert.ok(ids.length > 10);
    const rest = ids.map((i) => position(root, mesh, i));
    for (let f = 0; f < 120; f++) {
      root.userData.animate(f / 30, 3);
      ids.forEach((i, j) =>
        assert.ok(position(root, mesh, i).distanceTo(rest[j]) < 1e-7, kind),
      );
    }
  }
});
test("Electric eel anal fin carries a traveling wave independently of its quiet body", () => {
  const root = createCreature("electric_eel", 1, 17),
    { mesh } = root.userData.hfRig,
    p = mesh.geometry.attributes.position;
  const pick = (z, y) => {
    let best = Infinity,
      id;
    for (let i = 0; i < p.count; i++) {
      const d =
        Math.abs(p.getZ(i) - z) + Math.abs(p.getY(i) - y) + Math.abs(p.getX(i));
      if (d < best) {
        best = d;
        id = i;
      }
    }
    return id;
  };
  const ids = [pick(-0.12, -0.075), pick(0.05, -0.06), pick(-0.12, 0.025)],
    poses = ids.map(() => []);
  for (let i = 0; i < 120; i++) {
    root.userData.animate(i / 30, 2);
    ids.forEach((id, j) => poses[j].push(position(root, mesh, id).x));
  }
  const range = (a) => Math.max(...a) - Math.min(...a);
  assert.ok(range(poses[0]) > 0.025);
  assert.ok(range(poses[0]) > range(poses[2]) * 2);
  assert.ok(poses[0].some((v, i) => Math.sign(v) !== Math.sign(poses[1][i])));
});
test("Ray center and ventral anatomy remain fixed through disc-edge undulation", () => {
  const root = createCreature("river_stingray", 1, 2),
    { mesh } = root.userData.hfRig,
    p = mesh.geometry.attributes.position,
    central = [];
  for (let i = 0; i < p.count; i++)
    if (Math.abs(p.getX(i)) < 0.09 && p.getZ(i) < -0.1) central.push(i);
  const rest = central.map((i) => position(root, mesh, i));
  for (let f = 0; f < 100; f++) {
    root.userData.animate(f / 25, 3);
    central.forEach((id, i) =>
      assert.ok(position(root, mesh, id).distanceTo(rest[i]) < 1e-7),
    );
  }
  const detail = root.getObjectByName("river_stingray_ventral_details");
  assert.ok(detail?.isMesh);
  assert.ok(detail.geometry.index.count / 3 <= 1100);
});
