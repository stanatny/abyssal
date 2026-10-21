import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { acquireAtlantisMonumentAsset } from "../src/atlantis_monument_asset.js";
import {
  createAtlantisCity,
  createAtlantisCitySteps,
} from "../src/atlantis_city.js";
import { atlantisSeabedHeight as heightAt } from "../src/atlantis_terrain.js";
import { cityArchitecture } from "../src/atlantis_architecture.js";
import { atlantisMaterials } from "../src/atlantis_art_geometry.js";

for (const [kind, height, budget] of [
  ["poseidon", 81.5, 32000],
  ["obelisk", 38, 6500],
]) {
  test(`${kind}: baked geometry has grounded feet/base, unit normals and usable UVs within art budget`, () => {
    const a = acquireAtlantisMonumentAsset(kind);
    try {
      const g = a.geometry,
        b = g.boundingBox,
        p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv;
      assert.ok(Math.abs(b.min.y) < 0.001);
      assert.ok(Math.abs(b.max.y - height) < 0.001);
      assert.ok(g.index.count / 3 <= budget);
      assert.ok(p.count > 5000);
      assert.equal(n.count, p.count);
      assert.equal(uv.count, p.count);
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        assert.ok(
          [p.getX(i), p.getY(i), p.getZ(i), uv.getX(i), uv.getY(i)].every(
            Number.isFinite,
          ),
        );
        assert.ok(Math.abs(v.fromBufferAttribute(n, i).length() - 1) < 0.001);
        assert.ok(
          uv.getX(i) >= 0 &&
            uv.getX(i) <= 1 &&
            uv.getY(i) >= 0 &&
            uv.getY(i) <= 1,
        );
      }
      if (kind === "obelisk") {
        assert.ok(Math.abs(b.max.x - b.min.x - 9) < 0.001);
        assert.ok(Math.abs(b.max.z - b.min.z - 9) < 0.001);
        for (let i = 0; i < p.count; i++)
          if (p.getY(i) > 5 && p.getY(i) < 34)
            assert.ok(Math.abs(p.getX(i)) < 2.6 && Math.abs(p.getZ(i)) < 2.6);
      }
      assert.ok(!g.attributes.skinWeight && !g.attributes.skinIndex);
      assert.equal(a.material.vertexColors, true);
      assert.ok(g.attributes.color);
    } finally {
      a.release();
    }
  });
}

test("Monument shared resources survive one owner and dispose exactly once at last release", () => {
  for (const kind of ["poseidon", "obelisk"]) {
    const a = acquireAtlantisMonumentAsset(kind),
      b = acquireAtlantisMonumentAsset(kind);
    let geometry = 0,
      material = 0;
    a.geometry.addEventListener("dispose", () => geometry++);
    a.material.addEventListener("dispose", () => material++);
    assert.equal(a.geometry, b.geometry);
    assert.equal(a.material, b.material);
    a.release();
    a.release();
    assert.deepEqual([geometry, material], [0, 0]);
    b.release();
    b.release();
    assert.deepEqual([geometry, material], [1, 1]);
    const c = acquireAtlantisMonumentAsset(kind);
    assert.notEqual(c.geometry, a.geometry);
    assert.notEqual(c.material, a.material);
    c.release();
  }
});

test("Six obelisks preserve exact world placement, existing light glyphs, and city ownership", () => {
  const parent = new THREE.Group(),
    city = createAtlantisCity(parent, { heightAt });
  try {
    const newParts = [],
      glyphs = [],
      glyph = cityArchitecture("obelisk").parts.find(
        (p) => p.material === atlantisMaterials().guideTeal,
      );
    city.root.traverse((n) => {
      if (!n.isMesh) return;
      if (n.material.name === "atlantis_obelisk_hf_stone") newParts.push(n);
      if (n.geometry === glyph.geometry) glyphs.push(n);
    });
    assert.equal(newParts.length, 6);
    assert.equal(glyphs.length, 6);
    const rows = [],
      matrix = new THREE.Matrix4(),
      position = new THREE.Vector3(),
      scale = new THREE.Vector3(),
      q = new THREE.Quaternion();
    for (const m of newParts) {
      assert.equal(m.count, 1);
      m.getMatrixAt(0, matrix);
      matrix.decompose(position, q, scale);
      rows.push([position.x, position.z, Number(scale.x.toFixed(2))]);
      const match = glyphs.find((g) => {
        g.getMatrixAt(0, new THREE.Matrix4());
        return Array.from(g.instanceMatrix.array).every(
          (v, i) => v === m.instanceMatrix.array[i],
        );
      });
      assert.ok(match);
    }
    assert.deepEqual(
      rows.sort((a, b) => a[1] - b[1] || a[0] - b[0]),
      [
        [-109, -852, 1.35],
        [109, -852, 1.35],
        [-103, -555, 1],
        [103, -555, 1],
        [-78, -270, 1],
        [78, -270, 1],
      ],
    );
    const statue = city.root.getObjectByName("poseidon_monument");
    assert.equal(statue.children.length, 1);
    assert.equal(statue.children[0].scale.x, 1.55);
    assert.equal(city.stats.colliders, 20964);
    let releases = 0;
    statue.children[0].geometry.addEventListener("dispose", () => releases++);
    newParts[0].geometry.addEventListener("dispose", () => releases++);
    city.dispose();
    city.dispose();
    assert.equal(releases, 2);
    assert.equal(parent.children.length, 0);
  } finally {
    city.dispose();
  }
});

test("Aborting a city after monument allocation releases both asset owners", () => {
  const parent = new THREE.Group(),
    iterator = createAtlantisCitySteps(parent, { heightAt });
  let seen = false,
    held = [];
  try {
    for (const label of iterator) {
      if (label === "architecture-upload") {
        held = ["poseidon", "obelisk"].map(acquireAtlantisMonumentAsset);
        seen = true;
        break;
      }
    }
    assert.ok(seen);
    assert.equal(parent.children.length, 0);
    let disposed = 0;
    for (const a of held) {
      a.geometry.addEventListener("dispose", () => disposed++);
      a.release();
    }
    assert.equal(disposed, 2);
  } finally {
    iterator.return();
    for (const a of held) a.release();
  }
});
