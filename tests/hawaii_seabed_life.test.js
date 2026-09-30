import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHawaiiSeabedLife } from "../src/hawaii_seabed_life.js";
import { seabedHeight } from "../src/ocean.js";
import { LANDMARK_CLEARINGS } from "../src/ocean_extra.js";

const clearings = [
  ...LANDMARK_CLEARINGS,
  { x: -42, z: -555, radius: 25 },
  { x: 137, z: -728, radius: 32 },
  { x: -61, z: -942, radius: 42 },
  { x: 153, z: -1091, radius: 36 },
];
const create = (options = {}) =>
  createHawaiiSeabedLife(new THREE.Group(), {
    heightAt: seabedHeight,
    clearings,
    ...options,
  });

test("Hawaii seabed placement is deterministic, deep-only and clear of reserved footprints", () => {
  const a = create(),
    b = create(),
    c = create({ seed: 71 });
  assert.deepEqual(a.placements, b.placements);
  assert.notDeepEqual(a.placements, c.placements);
  assert.ok(a.stats.colonies >= 20);
  for (const p of a.placements) {
    assert.ok(p.z <= -220 && p.z >= -1120);
    assert.ok(p.y < -145);
    assert.ok(
      clearings.every((c) => Math.hypot(p.x - c.x, p.z - c.z) > c.radius + 1),
    );
    assert.ok(p.supports.every((s) => Number.isFinite(s.gap) && s.gap < 0));
    if (p.kind === "basalt_nodule") {
      assert.ok(p.height > 0.1 && p.height <= 1.1);
      assert.ok(p.supports.every((s) => s.gap > -0.13));
    }
  }
  a.dispose();
  b.dispose();
  c.dispose();
});

test("Hawaii seabed roots remain supported on steep slopes without per-instance animation", () => {
  const time = { value: 0 };
  const life = create({
    heightAt: (x, z) => -190 + z * 0.72 + Math.sin(x * 0.034) * 3,
    worldUniforms: { oceanTime: time },
  });
  const matrices = life.root.children.map((mesh) => [
    ...mesh.instanceMatrix.array,
  ]);
  life.update(13, new THREE.Vector3(20, -470, -440));
  assert.equal(time.value, 13);
  life.root.children.forEach((mesh, index) =>
    assert.deepEqual([...mesh.instanceMatrix.array], matrices[index]),
  );
  for (const p of life.placements)
    assert.ok(p.supports.every((s) => s.gap <= -0.04));
  life.dispose();
});

test("Hawaii seabed has finite geometry, matte nonemissive mineral surfaces and bounded cost", () => {
  const life = create({ clearings: [] });
  assert.ok(life.stats.triangles <= 40000);
  assert.ok(life.stats.chunks <= 16);
  assert.equal(life.stats.materials, 2);
  assert.equal(life.stats.geometries, 2);
  assert.equal(life.stats.textures, 0);
  assert.equal(life.stats.lights, 0);
  for (const mesh of life.root.children) {
    assert.ok(mesh.isInstancedMesh);
    for (const attr of Object.values(mesh.geometry.attributes))
      assert.ok([...attr.array].every(Number.isFinite));
    assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));
    if (mesh.name.includes("basalt")) {
      assert.equal(mesh.material.emissive.getHex(), 0);
      assert.equal(mesh.material.roughness, 1);
      assert.equal(mesh.material.metalness, 0);
      const p = mesh.geometry.attributes.position,
        n = mesh.geometry.attributes.normal;
      for (let v = 0; v < p.count; v += 1)
        if (p.getY(v) > 0.7) assert.ok(n.getY(v) > 0);
    }
  }
  for (const p of life.placements) {
    life.update(2, new THREE.Vector3(p.x, p.y + 5, p.z));
    assert.ok(life.stats.visibleBatches > 0 && life.stats.visibleBatches <= 16);
  }
  life.update(3, new THREE.Vector3(0, 10000, 0));
  assert.equal(life.stats.visibleBatches, 0);
  life.dispose();
});

test("Hawaii seabed disposal is idempotent and owns only its private resources", () => {
  const parent = new THREE.Group(),
    unrelated = new THREE.Group();
  parent.add(unrelated);
  const sharedTime = { value: 0 };
  const life = createHawaiiSeabedLife(parent, {
    heightAt: seabedHeight,
    worldUniforms: { oceanTime: sharedTime },
  });
  const resources = new Set();
  for (const mesh of life.root.children) {
    resources.add(mesh);
    resources.add(mesh.geometry);
    resources.add(mesh.material);
  }
  const counts = new Map();
  for (const resource of resources)
    resource.addEventListener("dispose", () =>
      counts.set(resource, (counts.get(resource) ?? 0) + 1),
    );
  life.dispose();
  life.dispose();
  life.update(99, new THREE.Vector3());
  assert.deepEqual(parent.children, [unrelated]);
  assert.equal(life.root.children.length, 0);
  assert.equal(life.stats.disposed, true);
  assert.equal(sharedTime.value, 0);
  for (const resource of resources) assert.equal(counts.get(resource), 1);
});

test("Hawaii seabed handles fully reserved space without dangling batches", () => {
  const life = create({ clearings: [{ x: 0, z: -600, radius: 2000 }] });
  assert.equal(life.placements.length, 0);
  assert.equal(life.stats.triangles, 0);
  assert.equal(life.root.children.length, 0);
  life.dispose();
});
