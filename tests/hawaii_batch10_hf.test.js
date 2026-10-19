import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = ["herring", "anchovy", "moon_jelly", "spiny_lobster"];
const position = (root, mesh, i) => {
  root.updateMatrixWorld(true);
  mesh.skeleton.update();
  return mesh.getVertexPosition(i, new THREE.Vector3());
};
for (const kind of kinds) {
  test(`${kind}: shared HF geometry retains scale and unit weights with independent disposable skeletons`, () => {
    const a = createCreature(kind, 1, 42),
      b = createCreature(kind, 1, 42),
      { mesh, skins } = a.userData.hfRig,
      g = mesh.geometry;
    assert.equal(a.userData.artRevision, "trellis_hawaii_batch10_20261019");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.equal(mesh.material, b.userData.hfRig.mesh.material);
    assert.notEqual(mesh.skeleton, b.userData.hfRig.mesh.skeleton);
    const size = g.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs((kind === "moon_jelly" ? size.x : size.z) - 1) < 1e-6);
    assert.ok(
      g.index.count / 3 <
        {
          herring: 2500,
          anchovy: 2500,
          moon_jelly: 11000,
          spiny_lobster: 8500,
        }[kind],
    );
    for (const m of skins) {
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
    for (const m of skins) {
      m.skeleton.computeBoneTexture();
      m.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    }
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, skins.length);
    assert.ok(b.userData.hfRig.mesh.geometry.attributes.position);
  });
  test(`${kind}: actual appendage vertices remain continuous, cullable and frozen on repeated phase`, () => {
    const m = createCreature(kind, 1, 7),
      { mesh, skins, chains, bones } = m.userData.hfRig,
      tips = [];
    for (const c of chains) {
      let best = -Infinity,
        tip;
      for (const skin of skins) {
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
          if (weight > 0.8 && score > best) {
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
test("moon jelly retains four internal horseshoes and four oral arms; lobster has ten supported articulated walking limbs", () => {
  const jelly = createCreature("moon_jelly", 1),
    lobster = createCreature("spiny_lobster", 0.9),
    r = jelly.userData.hfRig;
  assert.equal(r.chains.filter((c) => c.type === "arm").length, 4);
  assert.ok(jelly.getObjectByName("four_horseshoe_gonads"));
  assert.equal(r.mesh.material.transparent, true);
  assert.equal(r.mesh.material.depthWrite, false);
  const legs = lobster.userData.hfRig.chains.filter((c) => c.type === "leg");
  assert.equal(legs.length, 10);
  assert.equal(legs.filter((c) => c.side < 0).length, 5);
  const legSkin = lobster.getObjectByName("ten_articulated_walking_legs");
  let minY = Infinity;
  for (let f = 0; f < 180; f++) {
    lobster.userData.animate(f / 60, 0.8);
    for (let i = 0; i < legSkin.geometry.attributes.position.count; i += 13)
      minY = Math.min(minY, position(lobster, legSkin, i).y * 0.9 + 0.12);
  }
  assert.ok(minY > 0, `feet remain above the sampled floor: ${minY}`);
});
test("re-unwrapped fish and jelly atlases keep each triangle inside one chart", () => {
  for (const kind of kinds.slice(0, 3)) {
    const d = JSON.parse(
        readFileSync(
          new URL(`../src/assets/models/${kind}_hf_mesh.json`, import.meta.url),
        ),
      ),
      dec = (x) =>
        new Uint16Array(Uint8Array.from(Buffer.from(x, "base64")).buffer),
      idx = dec(d.index),
      c = dec(d.uvChart);
    assert.match(d.textureBake.method, /closest source/);
    assert.equal(d.textureBake.sourceSha256, d.sourceSha256);
    for (let i = 0; i < idx.length; i += 3) {
      assert.equal(c[idx[i]], c[idx[i + 1]]);
      assert.equal(c[idx[i]], c[idx[i + 2]]);
    }
  }
});
test("all eight region populations, biological length, jelly diameter and lobster antenna-inclusive length remain unchanged", () => {
  const counts = {
    hawaii: [24, 27, 12, 8],
    bermuda: [30, 0, 12, 8],
    atlantis: [0, 0, 12, 8],
    mariana: [0, 0, 12, 8],
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
  ])
    kinds.forEach((kind, i) => {
      const s = getRegionSpecies(region).find((s) => s.kind === kind);
      assert.equal(s?.population ?? 0, counts[region]?.[i] ?? 0);
      if (s) assert.equal(s.length, [0.26, 0.18, 0.4, 0.9][i]);
    });
});

// 使用世界循环实际消费的朝向函数，检查急转/反向后口腕仍在伞体下方。
test("drifting jelly keeps its bell above oral arms across turns and reversals", async () => {
  const { aquaticHeading } = await import("../src/aquatic_reptile_motion.js");
  const m = createCreature("moon_jelly", 1);
  assert.equal(m.userData.aquaticUpright, true);
  for (let i = 0; i < 180; i++) {
    const a = i * 0.15,
      d = new THREE.Vector3(Math.sin(a), Math.sin(a * 0.7) * 0.05, Math.cos(a));
    m.quaternion.copy(aquaticHeading(new THREE.Quaternion(), d));
    m.userData.animate(i / 60, 0.2);
    m.updateMatrixWorld(true);
    const r = m.userData.hfRig,
      bell = new THREE.Vector3(0, 0.2, 0).applyMatrix4(m.matrixWorld),
      arm = r.bones[r.chains[1].ids[2]].getWorldPosition(new THREE.Vector3());
    assert.ok(bell.y > arm.y + 0.35);
  }
});
