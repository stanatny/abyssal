import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { terrainMeshHeight } from "../src/terrain_mesh_height.js";

test("Ground height matches the rendered triangles, including diagonals and translated strip edges", () => {
  const geometry = new THREE.PlaneGeometry(24, 18, 4, 3);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(5, 0, -3);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setY(i, Math.sin(p.getX(i) * 0.3) * Math.cos(p.getZ(i) * 0.5) * 6 + 20);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  mesh.updateMatrixWorld(true);
  const height = terrainMeshHeight(geometry),
    ray = new THREE.Raycaster();
  for (const x of [-7, -6.9, -3.4, 0.25, 5, 7.7, 10.9, 16.9, 17])
    for (const z of [-11.99, -9.5, -6.4, -3, 0.6, 5.9]) {
      ray.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
      const actual = ray.intersectObject(mesh)[0];
      assert.ok(actual);
      assert.ok(Math.abs(height(x, z) - actual.point.y) < 1e-6);
    }
  assert.equal(height(-8, 0), null);
  assert.equal(height(0, 7), null);
  geometry.dispose();
  mesh.material.dispose();
});
