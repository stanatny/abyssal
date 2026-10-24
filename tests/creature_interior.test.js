import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createCreature } from "../src/creatures.js";
import { ALL_SPECIES } from "../src/region_ecology.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { preparedCreatureExterior } from "../src/creature_interior.js";
import { closedCreatureExterior } from "../scripts/lib/closed_creature_exterior.mjs";

test("section preserves closed components and excludes inverted cavities and open sheets", () => {
  const outer = new THREE.SphereGeometry(1, 12, 8),
    inner = new THREE.SphereGeometry(0.8, 12, 8);
  for (let i = 0; i < inner.index.count; i += 3) {
    const a = inner.index.getX(i);
    inner.index.setX(i, inner.index.getX(i + 2));
    inner.index.setX(i + 2, a);
  }
  const source = mergeGeometries([outer, inner]),
    cap = closedCreatureExterior(source);
  assert.ok(cap);
  assert.equal(cap.index.count, outer.index.count);
  assert.ok(
    [...cap.index.array].every((i) => i < outer.attributes.position.count),
  );
  assert.equal(closedCreatureExterior(new THREE.PlaneGeometry()), null);
  for (const g of [outer, inner, source, cap]) g.dispose();
});

test("all registered predators, large animals and all eighteen lords have prepared body sections", () => {
  assert.equal(BOSS_SPECIES.length, 18);
  const kinds = new Set([
    ...ALL_SPECIES.filter((s) => s.length >= 8 || s.predator).map(
      (s) => s.kind,
    ),
    ...BOSS_SPECIES.map((s) => s.kind),
  ]);
  for (const kind of kinds) {
    const root = createCreature(kind, 36);
    let prepared = 0;
    root.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const g = preparedCreatureExterior(mesh.geometry);
      if (!g) return;
      prepared++;
      const n = g.attributes.position.count;
      for (const id of g.index.array) assert.ok(id < n, kind);
      for (const name of ["skinIndex", "skinWeight"])
        if (mesh.geometry.attributes[name])
          assert.equal(g.attributes[name].count, n, kind);
      for (const morph of g.morphAttributes.position ?? [])
        assert.equal(morph.count, n, kind);
      g.dispose();
    });
    assert.ok(prepared > 0, kind);
    root.userData.disposeLocalMotion?.();
  }
});

test("HF interior proxies are closed oriented surfaces and do not change or dispose source skin", () => {
  for (const kind of [
    "ichthyotitan",
    "sperm_whale",
    "megalodon",
    "barracuda",
    "goblin_shark",
    "shonisaurus",
    "tiger_shark",
    "cameroceras",
    "livyatan",
    "kraken",
    "leviathan",
  ]) {
    const root = createCreature(kind, 28);
    let source;
    root.traverse((m) => {
      if (m.isSkinnedMesh && m.name.includes("_hf_")) source = m.geometry;
    });
    const saved = Array.from(source.index.array),
      pos = Array.from(source.attributes.position.array);
    let disposed = 0;
    source.addEventListener("dispose", () => disposed++);
    const cap = preparedCreatureExterior(source);
    assert.ok(cap);
    assert.ok(cap.index.count <= 12000);
    const edges = new Map();
    for (let i = 0; i < cap.index.count; i += 3) {
      const ids = [0, 1, 2].map((j) => cap.index.getX(i + j));
      for (let j = 0; j < 3; j++) {
        const a = ids[j],
          b = ids[(j + 1) % 3];
        if (a === b) continue;
        const k = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(k, (edges.get(k) || 0) + (a < b ? 1 : -1));
      }
    }
    assert.ok(
      [...edges.values()].every((x) => x === 0),
      kind + " oriented boundary",
    );
    cap.dispose();
    assert.equal(disposed, 0);
    assert.deepEqual(Array.from(source.index.array), saved);
    assert.deepEqual(Array.from(source.attributes.position.array), pos);
    root.userData.disposeLocalMotion?.();
  }
});

test("changed positions or topology cannot reuse old interior data", () => {
  const root = createCreature("ichthyotitan", 28),
    changed = root.userData.hfRig.mesh.geometry.clone();
  changed.attributes.position.setX(
    0,
    changed.attributes.position.getX(0) + 0.01,
  );
  assert.equal(preparedCreatureExterior(changed), null);
  assert.equal(preparedCreatureExterior(new THREE.PlaneGeometry()), null);
  changed.dispose();
  root.userData.disposeLocalMotion();
});
