import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  EUROPA_WORLD,
  europaWorldPoint,
  europaLayoutPoint,
  europaSeabedHeight,
} from "../src/europa_config.js";
import { EUROPA_SPECIES } from "../src/europa_species.js";
import { createEuropaOcean } from "../src/europa_ocean.js";
import {
  predatorTerritory,
  inPredatorTerritory,
} from "../src/nursery_rules.js";
import { getExpedition } from "../src/expedition_config.js";

test("expanded Europa anchors, predator limits and all lord homes share world coordinates", () => {
  assert.equal(EUROPA_WORLD.maxX - EUROPA_WORLD.minX, 960);
  assert.equal(EUROPA_WORLD.maxZ - EUROPA_WORLD.minZ, 1824);
  assert.equal(EUROPA_WORLD.maxDepth, 1450);
  for (const p of [
    [0, 4, 75],
    [145, -450, -470],
    [-120, -800, -950],
  ]) {
    const q = europaLayoutPoint(europaWorldPoint(p));
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(p[i] - q[i]) < 1e-8);
  }
  for (const s of EUROPA_SPECIES) {
    for (const a of s.spawnAnchors || s.schoolAnchors || []) {
      assert.ok(a[0] > EUROPA_WORLD.minX && a[0] < EUROPA_WORLD.maxX, s.kind);
      assert.ok(a[2] > EUROPA_WORLD.minZ && a[2] < EUROPA_WORLD.maxZ, s.kind);
      if (s.predator)
        assert.ok(
          inPredatorTerritory(s, 0, { x: a[0], y: a[1], z: a[2] }),
          s.kind,
        );
    }
    if (s.predator) assert.ok(predatorTerritory(s).minZ < -1500);
  }
  for (const boss of getExpedition("europa").region.bossInstances) {
    const [x, y, z] = boss.home;
    assert.ok(y > europaSeabedHeight(x, z) + 15, boss.id);
    assert.ok(
      y < -100 && z > EUROPA_WORLD.minZ && z < EUROPA_WORLD.maxZ,
      boss.id,
    );
  }
});

test("mineral tower skirts meet the actual slope; LOD retains all towers and disposes shared assets", () => {
  const parent = new THREE.Group(),
    ocean = createEuropaOcean(parent);
  try {
    const b = ocean.mineralBatches[0],
      m = new THREE.Matrix4(),
      v = new THREE.Vector3();
    assert.equal(b.count, 16);
    assert.equal(b.far.geometry.index.count / 3, 1800);
    assert.ok(b.mesh.geometry.index.count > b.far.geometry.index.count * 5);
    for (let i = 0; i < b.count; i++) {
      m.fromArray(b.matrices, i * 16).premultiply(b.mesh.matrixWorld);
      const p = b.mesh.geometry.attributes.position;
      let contact = 0;
      for (let j = 0; j < p.count; j++) {
        if (p.getY(j) > -0.36) continue;
        v.fromBufferAttribute(p, j).applyMatrix4(m);
        assert.ok(
          v.y <= europaSeabedHeight(v.x, v.z) + 0.01,
          `floating skirt ${i}`,
        );
        contact++;
      }
      assert.ok(contact > 50);
    }
    for (const high of [true, false]) {
      ocean.update(1, new THREE.Vector3(-160, -940, -990), 0, high);
      assert.equal(b.mesh.count + b.far.count, 16);
    }
    let disposed = 0;
    b.mesh.geometry.addEventListener("dispose", () => disposed++);
    b.far.geometry.addEventListener("dispose", () => disposed++);
    b.mesh.material.addEventListener("dispose", () => disposed++);
    ocean.dispose();
    ocean.dispose();
    assert.equal(disposed, 3);
    assert.equal(parent.children.length, 0);
  } finally {
    ocean.dispose();
  }
});

test("rendered Europa scenery has finite nonzero normals, including lathe pole seams", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    ocean.root.traverse((m) => {
      if (!m.isMesh || !m.geometry.attributes.normal) return;
      const g = m.geometry,
        n = g.attributes.normal;
      const ids = g.index
        ? new Set(g.index.array)
        : Array.from({ length: n.count }, (_, i) => i);
      for (const i of ids) {
        const d = n.getX(i) ** 2 + n.getY(i) ** 2 + n.getZ(i) ** 2;
        assert.ok(
          Number.isFinite(d) && d > 1e-10,
          `${m.name || m.parent.name}: invalid normal ${i}`,
        );
      }
    });
  } finally {
    ocean.dispose();
  }
});
