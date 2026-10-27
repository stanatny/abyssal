import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = ["lushu", "gudiao", "nine_tail_fox", "zheng"];
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
    assert.equal(a.userData.artRevision, "trellis_penglai_beasts_20261027");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.equal(mesh.material, b.userData.hfRig.mesh.material);
    assert.notEqual(mesh.skeleton, b.userData.hfRig.mesh.skeleton);
    const size = g.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.z - 1) < 1e-6);
    assert.ok(
      g.index.count / 3 <
        {
          lushu: 14100,
          gudiao: 12100,
          nine_tail_fox: 18100,
          zheng: 16100,
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
    for (const c of chains.filter((c) => c.type !== "neck")) {
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
        // 宽文鳐的羽尖半径更大；连续翼拍的实测峰值约 0.05 / 帧。
        assert.ok(
          t.poses[i].distanceTo(t.poses[i - 1]) <
            (kind === "gudiao" ? 0.06 : 0.04),
        );
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
    assert.match(d.textureBake.method, /source/);
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
    ["lushu", 16, 7.8],
    ["gudiao", 18, 19],
    ["nine_tail_fox", 9, 13],
    ["zheng", 9, 23],
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

test("Nine tails and five tails have separate fitted surfaces, not empty bones", () => {
  for (const [kind, count] of [
    ["nine_tail_fox", 9],
    ["zheng", 5],
  ]) {
    const r = createCreature(kind, 1),
      { mesh, tails } = r.userData.hfRig,
      g = mesh.geometry;
    assert.equal(tails.length, count);
    for (const c of tails) {
      let vertices = 0;
      for (let i = 0; i < g.attributes.position.count; i++) {
        let w = 0;
        for (let j = 0; j < 4; j++)
          if (c.ids.includes(g.attributes.skinIndex.array[i * 4 + j]))
            w += g.attributes.skinWeight.array[i * 4 + j];
        if (w > 0.6) vertices++;
      }
      assert.ok(
        vertices > 50,
        `${kind} ${c.name} only ${vertices} weighted vertices`,
      );
    }
    r.userData.disposeLocalMotion();
  }
});
test("Ground animals keep paused feet stable and change actual skin for their existing leap phase", () => {
  for (const kind of ["lushu", "nine_tail_fox", "zheng"]) {
    const r = createCreature(kind, 1),
      { mesh, legs } = r.userData.hfRig;
    r.userData.animate(0, 1, { gaitPhase: 0, phase: "walk", speed: 0 });
    const still = legs.map((c) =>
      r.userData.hfRig.bones[c.ids[0]].quaternion.toArray(),
    );
    r.userData.animate(2, 1, { gaitPhase: 0, phase: "walk", speed: 0 });
    assert.deepEqual(
      legs.map((c) => r.userData.hfRig.bones[c.ids[0]].quaternion.toArray()),
      still,
    );
    const p = mesh.geometry.attributes.position,
      ids = [];
    for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.16) ids.push(i);
    const before = ids.map((i) => position(r, mesh, i));
    r.userData.animate(3, 1, {
      gaitPhase: 0,
      phase: "leap",
      progress: 0.5,
      speed: 1,
    });
    assert.ok(
      ids.some((id, i) => position(r, mesh, id).distanceTo(before[i]) > 0.03),
    );
    r.userData.disposeLocalMotion();
  }
});
test("The four source contact anchors remain close to the visible muzzle", () => {
  const expected = {
    lushu: [0, 0.08237324821061072, -0.4869801735626098],
    gudiao: [0, 0.030111984173700146, -0.5040128301707735],
    nine_tail_fox: [0, 0.07300561336318451, -0.49856403244793923],
    zheng: [0, 0.0633821951165253, -0.49856400000036627],
  };
  for (const kind of kinds) {
    const r = createCreature(kind, 1),
      { mesh } = r.userData.hfRig,
      head = r.userData.getHeadWorldPositions()[0];
    assert.deepEqual(head.toArray(), expected[kind]);
    let d = Infinity;
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++)
      d = Math.min(d, position(r, mesh, i).distanceTo(head));
    assert.ok(d < 0.035, kind + " muzzle gap " + d);
    r.userData.disposeLocalMotion();
  }
});

for (const kind of ["lushu", "nine_tail_fox", "zheng"]) {
  test(`${kind}: visible skin does not tear between belly, legs and tails through a complete gait and leap`, () => {
    const root = createCreature(kind, 1, 31);
    const { mesh } = root.userData.hfRig;
    const geometry = mesh.geometry;
    const rest = Array.from(
      { length: geometry.attributes.position.count },
      (_, i) =>
        new THREE.Vector3().fromBufferAttribute(
          geometry.attributes.position,
          i,
        ),
    );
    const indices = geometry.index.array;
    const edges = new Map();
    for (let t = 0; t < indices.length; t += 3) {
      for (let j = 0; j < 3; j++) {
        const a = indices[t + j],
          b = indices[t + ((j + 1) % 3)];
        const length = rest[a].distanceTo(rest[b]);
        if (length > 0.0001)
          edges.set(`${Math.min(a, b)}:${Math.max(a, b)}`, [a, b, length]);
      }
    }
    for (const phase of ["walk", "windup", "leap", "recover"]) {
      for (let f = 0; f < 16; f++) {
        root.userData.animate(0, 1, {
          phase,
          gaitPhase: (f * Math.PI) / 8,
          progress: f / 15,
          speed: 1,
        });
        root.updateMatrixWorld(true);
        mesh.skeleton.update();
        const posed = rest.map((_, i) =>
          mesh.getVertexPosition(i, new THREE.Vector3()),
        );
        for (const [a, b, length] of edges.values()) {
          const ratio = posed[a].distanceTo(posed[b]) / length;
          assert.ok(
            Number.isFinite(ratio) && ratio < 2.5,
            `${kind} ${phase} frame ${f}: edge stretched ${ratio}x`,
          );
        }
      }
    }
    root.userData.disposeLocalMotion();
  });
}
