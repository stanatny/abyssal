import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import {
  createWorldBoundary,
  nearestWorldBoundary,
  WORLD_EDGE_INSET,
} from "../src/world_boundary.js";
import { REGIONS } from "../src/expedition_config.js";
import { WORLD } from "../src/world_config.js";
import { createMarianaSky } from "../src/mariana_surface.js";

test("All map edge indicators coincide with existing movement limits and release shared resources once", () => {
  const scene = new THREE.Scene(),
    field = createWorldBoundary(scene),
    disposed = new Map();
  field.root.traverse((n) => {
    for (const r of [n.geometry, n.material])
      if (r && !disposed.has(r)) {
        disposed.set(r, 0);
        r.addEventListener("dispose", () =>
          disposed.set(r, disposed.get(r) + 1),
        );
      }
  });
  for (const region of REGIONS.filter((r) => r.available)) {
    const w = region.world || WORLD,
      x = (w.minX + w.maxX) / 2,
      z = (w.minZ + w.maxZ) / 2;
    for (const [edge, p] of [
      [0, { x: w.minX + 10, y: -20, z }],
      [1, { x: w.maxX - 10, y: -20, z }],
      [2, { x, y: -20, z: w.minZ + 10 }],
      [3, { x, y: -20, z: w.maxZ - 10 }],
    ]) {
      const result = nearestWorldBoundary(p, w);
      assert.equal(result.edge, edge);
      assert.equal(result.distance, 5);
      field.update(
        0,
        new THREE.Vector3(p.x, p.y, p.z),
        w,
        true,
        region.id === "mariana",
      );
      const mesh = field.root.children[edge];
      assert.equal(mesh.visible, true);
      assert.equal(
        edge < 2
          ? Math.abs(mesh.position.x - p.x)
          : Math.abs(mesh.position.z - p.z),
        WORLD_EDGE_INSET,
      );
    }
  }
  field.dispose();
  field.dispose();
  assert.equal(scene.children.length, 0);
  for (const count of disposed.values()) assert.equal(count, 1);
});

test("Trench decorations attach to final triangles at every level, retain legal passages and vertically cull", () => {
  const scene = new THREE.Scene(),
    ocean = createMarianaOcean(scene);
  scene.updateMatrixWorld(true);
  const records = ocean.root.userData.marineAttachments,
    ray = new THREE.Raycaster(),
    point = new THREE.Vector3(),
    normal = new THREE.Vector3();
  assert.ok(records.length > 2000);
  for (const a of records) {
    const host = ocean.root.getObjectByName(a.host);
    assert.ok(host);
    point.fromArray(a.root);
    normal.fromArray(a.normal);
    ray.set(
      point.clone().addScaledVector(normal, 0.15),
      normal.clone().negate(),
    );
    ray.far = 0.3;
    const hit = ray.intersectObject(host, false)[0];
    assert.ok(hit, `${a.host} unattached ${a.root}`);
    assert.ok(hit.point.distanceTo(point) < 1e-4);
  }
  const chunks = ocean.root.children.filter((c) =>
    c.name.startsWith("trench_marine_"),
  );
  assert.equal(chunks.length, 16);
  ocean.update(0, new THREE.Vector3(0, -400, -380), 0, true);
  assert.ok(chunks.filter((c) => c.visible).length <= 5);
  ocean.update(0, new THREE.Vector3(0, -2500, -380), 0, false);
  assert.ok(chunks.filter((c) => c.visible).length <= 4);
  assert.equal(ocean.barriers.length, 4);
  assert.equal(
    ocean.colliders.some((c) => c.id?.startsWith("trench_marine_")),
    false,
  );
  ocean.dispose();
  ocean.dispose();
  assert.equal(scene.children.length, 0);
});

test("Mariana sky hides below water and releases geometry/material ownership on repeat disposal", () => {
  const scene = new THREE.Scene(),
    sky = createMarianaSky(scene),
    counts = new Map();
  sky.root.traverse((n) => {
    for (const r of [n.geometry, n.material])
      if (r && !counts.has(r)) {
        counts.set(r, 0);
        r.addEventListener("dispose", () => counts.set(r, counts.get(r) + 1));
      }
  });
  sky.update(2, new THREE.Vector3(20, -10, 40), { aboveWater: false });
  assert.equal(sky.root.visible, false);
  sky.update(3, new THREE.Vector3(20, 15, 40), { aboveWater: true });
  assert.equal(sky.root.visible, true);
  assert.equal(sky.root.getObjectByName("pacific_stratus").position.x, 20);
  sky.dispose();
  sky.dispose();
  assert.equal(scene.children.length, 0);
  for (const count of counts.values()) assert.equal(count, 1);
});
