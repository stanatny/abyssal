import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createBermudaOuterBiomes,
  BERMUDA_OUTER_SITES,
} from "../src/bermuda_outer_biomes.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { bodyRadius, resolveMotion, castSegment } from "../src/collision.js";

const terrain = createBermudaTerrainMesh(),
  floorMaterial = new THREE.MeshBasicMaterial(),
  floor = new THREE.Mesh(terrain, floorMaterial);
floor.userData.terrainContact = true;
const heightAt = createTerrainSurface(floor, { fallback: bermudaSeabedHeight }),
  options = { heightAt };
after(() => {
  heightAt.dispose();
  terrain.dispose();
  floorMaterial.dispose();
});

test("Bermuda outer landmarks add distinguishable destinations outside the preserved core", (t) => {
  const parent = new THREE.Group(),
    art = createBermudaOuterBiomes(parent, options);
  t.after(() => art.dispose());
  assert.equal(art.landmarks.length, 8);
  assert.equal(new Set(art.landmarks.map((l) => l.id)).size, 8);
  assert.equal(art.colliders.length, 589);
  assert.equal(
    new Set(art.colliders.map((l) => l.id)).size,
    art.colliders.length,
  );
  for (const site of BERMUDA_OUTER_SITES) {
    assert.ok(Math.abs(site.x) > 300 || site.z < -1150);
    assert.ok(
      site.x >= -500 && site.x <= 500 && site.z >= -1760 && site.z <= 140,
    );
  }
  for (const contact of art.colliders) {
    for (const v of [
      contact.x,
      contact.y,
      contact.z,
      contact.rotation.x,
      contact.rotation.y,
      contact.rotation.z,
      contact.rotation.w,
    ])
      assert.ok(Number.isFinite(v));
    assert.ok(
      contact.x > -490 &&
        contact.x < 490 &&
        contact.z > -1730 &&
        contact.z < 120,
    );
    assert.ok(contact.id.startsWith("outer_"));
  }
  assert.equal(art.lightSources.length, 0);
  assert.equal(parent.children.length, 1);
  art.dispose();
});

test("Relocated aircraft, hull and salvage share the final transformed seabed instead of old source coordinates", (t) => {
  const art = createBermudaOuterBiomes(new THREE.Group(), options);
  t.after(() => art.dispose());
  art.root.updateMatrixWorld(true);
  const point = new THREE.Vector3(),
    transform = new THREE.Matrix4();
  for (const row of art.placements) {
    if (row.kind === "wreck") {
      const mesh = row.art.mesh,
        positions = mesh.geometry.attributes.position;
      let low = Infinity,
        high = -Infinity;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        const gap = point.y - heightAt(point.x, point.z);
        low = Math.min(low, gap);
        high = Math.max(high, gap);
      }
      const sediment = row.id.includes("flight") ? 0.6 : 0.4;
      assert.ok(Math.abs(low + sediment) < 0.001, `${row.id}: ${low}`);
      assert.ok(
        high < 18,
        `${row.id} is not lifted above a buried wing: ${high}`,
      );
    } else if (row.kind === "boiler" || row.kind === "cargo") {
      row.mesh.getMatrixAt(row.instance, transform);
      transform.premultiply(row.mesh.matrixWorld);
      let low = Infinity;
      const positions = row.mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(transform);
        low = Math.min(low, point.y - heightAt(point.x, point.z));
      }
      assert.ok(Math.abs(low + 0.06) < 0.001, `${row.id}: ${low}`);
    }
  }
  art.dispose();
});

test("Reef gate holes remain traversable both ways by juvenile and32m adult bodies while the fitted stone blocks contact", (t) => {
  const art = createBermudaOuterBiomes(new THREE.Group(), options);
  t.after(() => art.dispose());
  for (const row of art.arches) {
    for (const length of [3, 32])
      for (const sign of [-1, 1]) {
        const rotatedPoint = (z) => {
          const p = new THREE.Vector3(0, 0, z).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            row.yaw,
          );
          p.x += row.x;
          p.z += row.z;
          p.y = heightAt(p.x, p.z) + 24;
          return p;
        };
        let point = rotatedPoint(sign * 60);
        for (let step = 1; step <= 60; step++) {
          const target = rotatedPoint(sign * (60 - step * 2));
          const motion = resolveMotion(point, target, {
            colliders: art.colliders,
            radius: bodyRadius(length),
            length,
            forward: target.clone().sub(point).normalize(),
            floorHeight: (x, z) => heightAt(x, z) + bodyRadius(length),
          });
          assert.equal(
            motion.blocked,
            false,
            `${row.id}/${length}/${sign}/${step}`,
          );
          assert.equal(motion.stuck, false);
          point.copy(motion.position);
          assert.ok(point.distanceTo(target) < 0.01);
        }
      }
    const contact = art.colliders.find((c) => c.id === `${row.id}_0`),
      point = new THREE.Vector3(contact.x, contact.y, contact.z),
      offset = new THREE.Vector3(0, 0, contact.halfSize.z + 3).applyQuaternion(
        contact.rotation,
      );
    assert.ok(
      castSegment(
        point.clone().add(offset),
        point.clone().sub(offset),
        art.colliders,
        0.4,
      ),
    );
  }
  art.dispose();
});

test("Outer geological LOD keeps far silhouettes and resource ownership independent across maps", (t) => {
  const parent = new THREE.Group(),
    a = createBermudaOuterBiomes(parent, options),
    b = createBermudaOuterBiomes(parent, options);
  t.after(() => {
    a.dispose();
    b.dispose();
  });
  assert.equal(a.assets[0].geometry, b.assets[0].geometry);
  let sourceDisposed = 0,
    instancesDisposed = 0,
    expectedInstances = 0;
  a.assets[0].geometry.addEventListener("dispose", () => sourceDisposed++);
  a.root.traverse((mesh) => {
    if (mesh.isInstancedMesh) {
      expectedInstances++;
      mesh.addEventListener("dispose", () => instancesDisposed++);
    }
  });
  a.update(1, new THREE.Vector3(-390, heightAt(-390, -420) + 30, -420));
  assert.equal(a.arches[0].meshes[0].visible, true);
  assert.equal(a.arches[0].meshes[1].visible, false);
  a.update(2, new THREE.Vector3(0, 0, 100));
  for (const row of a.arches) {
    assert.equal(row.meshes[0].visible, false);
    assert.equal(row.meshes[1].visible, true);
  }
  for (const batch of a.batches) {
    assert.ok(batch.near.count + batch.far.count <= batch.rows.length);
    assert.ok(batch.near.boundingSphere.radius > 1);
    assert.ok(batch.far.boundingSphere.radius > 1);
    for (const row of batch.rows) {
      const center = new THREE.Vector3().setFromMatrixPosition(row.matrix);
      assert.ok(batch.near.boundingSphere.distanceToPoint(center) <= 0);
    }
  }
  a.update(3, new THREE.Vector3(0, 4, 100));
  assert.equal(
    a.placements.find((row) => row.id === "outer_salvage_hull").root.visible,
    false,
  );
  a.update(4, new THREE.Vector3(-350, heightAt(-350, -1480) + 20, -1480));
  assert.equal(
    a.placements.find((row) => row.id === "outer_salvage_hull").root.visible,
    true,
  );
  a.dispose();
  a.dispose();
  assert.equal(sourceDisposed, 0);
  assert.equal(instancesDisposed, expectedInstances);
  assert.equal(parent.children.length, 1);
  assert.equal(a.colliders.length, 0);
  b.dispose();
  assert.equal(sourceDisposed, 1);
  assert.equal(parent.children.length, 0);
});
