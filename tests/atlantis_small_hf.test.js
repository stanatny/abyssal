import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = ["spadefish", "seahorse", "cuttlefish", "pearl_nautilus"];
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
    assert.equal(a.userData.artRevision, "trellis_atlantis_small_20261021");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.equal(mesh.material, b.userData.hfRig.mesh.material);
    assert.notEqual(mesh.skeleton, b.userData.hfRig.mesh.skeleton);
    const size = g.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size[kind === "seahorse" ? "y" : "z"] - 1) < 1e-6);
    assert.ok(
      g.index.count / 3 <
        {
          spadefish: 3000,
          seahorse: 5700,
          cuttlefish: 15500,
          pearl_nautilus: 18000,
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
test("small Atlantis populations, height convention and rare identity are retained", () => {
  for (const [kind, pop, length] of [
    ["spadefish", 138, 0.75],
    ["seahorse", 8, 0.15],
    ["cuttlefish", 8, 0.5],
  ]) {
    const s = getRegionSpecies("atlantis").find((s) => s.kind === kind);
    assert.equal(s.population, pop);
    assert.equal(s.length, length);
  }
  const s = createCreature("seahorse", 1),
    n = createCreature("pearl_nautilus", 1);
  assert.equal(s.userData.aquaticUpright, true);
  assert.equal(n.userData.aquaticUpright, true);
  const { mesh } = n.userData.hfRig,
    p = mesh.geometry.attributes.position,
    indices = [];
  for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0.05) indices.push(i);
  assert.ok(indices.length > 1000);
  const before = indices.map((i) => position(n, mesh, i));
  for (let f = 0; f < 120; f++) n.userData.animate(f / 60, 3);
  indices.forEach((id, i) =>
    assert.ok(
      position(n, mesh, id).distanceTo(before[i]) < 1e-7,
      "hard shell flexed",
    ),
  );
});

test("Spadefish chest strokes cannot pull the pelvic fins or the forward body", () => {
  const m = createCreature("spadefish", 1, 733),
    { mesh, chains } = m.userData.hfRig,
    p = mesh.geometry.attributes.position,
    indices = mesh.geometry.attributes.skinIndex,
    weights = mesh.geometry.attributes.skinWeight,
    pecIds = chains
      .filter((c) => c.name.startsWith("pectoral"))
      .flatMap((c) => c.ids),
    pelvic = [];
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < -0.2 && p.getZ(i) < -0.08) pelvic.push(i);
  }
  assert.ok(pelvic.length > 500, "sample the actual pelvic surface");
  for (const i of pelvic) {
    for (let j = 0; j < 4; j++) {
      if (pecIds.includes(indices.array[i * 4 + j]))
        assert.equal(
          weights.array[i * 4 + j],
          0,
          "chest weights leaked below the body",
        );
    }
  }
  for (let frame = 0; frame < 240; frame++) {
    m.userData.animate(frame / 60, frame < 120 ? 0.5 : 3);
    m.updateMatrixWorld(true);
    mesh.skeleton.update();
    for (let i = 0; i < p.count; i++) {
      if (
        (p.getY(i) < -0.2 && p.getZ(i) < -0.08) ||
        (p.getZ(i) < -0.2 && Math.abs(p.getX(i)) < 0.055)
      ) {
        assert.ok(
          mesh
            .getVertexPosition(i, new THREE.Vector3())
            .distanceTo(new THREE.Vector3().fromBufferAttribute(p, i)) < 1e-7,
          "the anchored surface was dragged by a swimming appendage",
        );
      }
    }
  }
  m.userData.disposeLocalMotion();
});

test("Spadefish actual tail speeds up smoothly while its chest fins row laterally", () => {
  const m = createCreature("spadefish", 1, 733),
    { mesh } = m.userData.hfRig,
    p = mesh.geometry.attributes.position;
  let tailTip = 0,
    chestTip = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) > p.getZ(tailTip)) tailTip = i;
    if (
      p.getY(i) > -0.095 &&
      p.getZ(i) < -0.055 &&
      p.getX(i) > p.getX(chestTip)
    )
      chestTip = i;
  }
  const tail = [],
    chest = [];
  for (let frame = 0; frame < 1080; frame++) {
    const t = frame / 60;
    m.userData.animate(t, t < 6 ? 0.5 : t < 12 ? 3 : 0.5);
    m.updateMatrixWorld(true);
    mesh.skeleton.update();
    tail.push(mesh.getVertexPosition(tailTip, new THREE.Vector3()));
    chest.push(mesh.getVertexPosition(chestTip, new THREE.Vector3()));
  }
  const beats = (start, end) => {
    let count = 0;
    for (let i = start + 1; i < end; i++)
      if (tail[i - 1].x <= 0 && tail[i].x > 0) count++;
    return count;
  };
  assert.ok(beats(60, 360) >= 4, "cruising must not look like a frozen tail");
  assert.ok(
    beats(420, 720) > beats(60, 360),
    "effort should accelerate propulsion",
  );
  assert.ok(Math.abs(beats(780, 1080) - beats(60, 360)) <= 1);
  const span = new THREE.Box3()
    .setFromPoints(chest)
    .getSize(new THREE.Vector3());
  assert.ok(span.x > 0.008, "actual chest fin must move relative to the body");
  assert.ok(span.y < span.x * 0.35, "chest fins must not flap like wings");
  for (let i = 1; i < tail.length; i++)
    assert.ok(
      tail[i].distanceTo(tail[i - 1]) < 0.015,
      "effort transition snapped",
    );
  m.userData.disposeLocalMotion();
});
