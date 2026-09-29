import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildIslands } from "../src/atlantis_art_sky.js";
import { createAtlantisSky } from "../src/atlantis_surface.js";

function fixture(t) {
  const resources = new Set();
  const islands = buildIslands((resource) => {
    resources.add(resource);
    return resource;
  });
  const mesh = islands.group.getObjectByName("atlantis_island_ridges");
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  resources.add(material);
  const terrainGeometry = mesh.geometry.clone();
  terrainGeometry.setDrawRange(0, mesh.userData.terrainVertexCount);
  resources.add(terrainGeometry);
  const terrain = new THREE.Mesh(terrainGeometry, material);
  const structuresGeometry = mesh.geometry.clone();
  structuresGeometry.setDrawRange(mesh.userData.terrainVertexCount, Infinity);
  resources.add(structuresGeometry);
  const structures = new THREE.Mesh(structuresGeometry, material);
  t.after(() => {
    for (const resource of resources) resource.dispose();
  });
  const ray = new THREE.Raycaster();
  const height = (target, x, z, fromBelow = false) => {
    ray.set(
      new THREE.Vector3(x, fromBelow ? -20 : 200, z),
      new THREE.Vector3(0, fromBelow ? 1 : -1, 0),
    );
    const hit = ray.intersectObject(target, false)[0];
    assert.ok(hit, `Visible support or terrain missing at ${x}, ${z}`);
    return hit.point.y;
  };
  return { ...islands, terrain, structures, height, mesh };
}

test("Lighthouse pedestal overlaps the rendered island over its complete load-bearing footprint", (t) => {
  const f = fixture(t),
    b = f.fit.beacon;
  // 从最终合并网格独立射线取面，不用设计参数自证贴合。
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 24)
    for (const radius of [0, 0.8, 1.6, 2.05]) {
      const x = b.x + Math.cos(angle) * radius,
        z = b.z + Math.sin(angle) * radius;
      const ground = f.height(f.terrain, x, z);
      const underside = f.height(f.structures, x, z, true);
      const upper = f.height(f.structures, x, z);
      assert.ok(
        underside < ground - 0.1,
        `Foundation floats by ${underside - ground}`,
      );
      assert.ok(upper > ground, "Support must reach the land surface");
    }
  assert.ok(b.towerBottom < b.top);
  assert.equal(b.height, 7);
  const light = f.group.getObjectByName("atlantis_beacon_light");
  assert.ok(light.position.y - 1.1 < b.towerTop);
  assert.ok(Math.abs(light.position.x - b.x) < 1e-8);
  assert.ok(Math.abs(light.position.z - b.z) < 1e-8);
  assert.equal(
    f.group
      .getObjectByName("atlantis_beacon_glow")
      .position.distanceTo(light.position),
    0,
  );
});

test("All six village lights attach to visible buildings with terrain-embedded foundations", (t) => {
  const f = fixture(t);
  assert.equal(f.fit.villages.length, 6);
  const lights = f.group.getObjectByName("atlantis_village_lights").geometry
    .attributes.position;
  for (const [i, b] of f.fit.villages.entries()) {
    for (const dx of [-0.99, 0, 0.99])
      for (const dz of [-0.99, 0, 0.99]) {
        const ground = f.height(f.terrain, b.x + dx, b.z + dz);
        assert.ok(f.height(f.structures, b.x + dx, b.z + dz, true) < ground);
        assert.ok(f.height(f.structures, b.x + dx, b.z + dz) > ground);
      }
    assert.ok(Math.abs(lights.getX(i) - b.x) < 0.0001);
    assert.ok(Math.abs(lights.getZ(i) - (b.z - 1.015)) < 0.0001);
    assert.ok(lights.getY(i) > b.bottom && lights.getY(i) < b.top);
  }
  assert.ok(f.mesh.geometry.attributes.position.array.every(Number.isFinite));
  assert.equal(f.mesh.userData.terrainVertexCount, 4 * 56 * 4 * 3);
  const normals = f.mesh.geometry.attributes.normal;
  for (let i = 0; i < f.mesh.userData.terrainVertexCount; i++)
    assert.ok(normals.getY(i) >= 0, "Island slopes must face upward");
});

test("Sky tracking and both quality settings preserve world-anchored island supports", (t) => {
  const scene = new THREE.Scene(),
    sky = createAtlantisSky(scene);
  t.after(() => sky.dispose());
  const islands = sky.root.getObjectByName("atlantis_islands");
  const light = sky.root.getObjectByName("atlantis_beacon_light");
  const expected = light.getWorldPosition(new THREE.Vector3());
  const geometry = islands.getObjectByName("atlantis_island_ridges").geometry;
  for (const [time, x, z, quality] of [
    [2, 280, -700, true],
    [7, -260, 130, false],
    [9, 0, 0, true],
  ]) {
    sky.update(time, new THREE.Vector3(x, 4, z), {
      aboveWater: true,
      highQuality: quality,
    });
    scene.updateMatrixWorld(true);
    assert.ok(
      light.getWorldPosition(new THREE.Vector3()).distanceTo(expected) < 1e-8,
    );
    assert.equal(
      islands.getObjectByName("atlantis_island_ridges").geometry,
      geometry,
    );
    assert.equal(sky.root.visible, true);
  }
});
