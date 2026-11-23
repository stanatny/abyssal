import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createBermudaReefFields,
  BERMUDA_REEF_FIELDS,
} from "../src/bermuda_reef_fields.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { sceneryFootSamples } from "../src/scenery_grounding.js";
import { isPositionBlocked } from "../src/collision.js";

const geometry = createBermudaTerrainMesh(),
  material = new THREE.MeshBasicMaterial(),
  floor = new THREE.Mesh(geometry, material);
floor.userData.terrainContact = true;
const heightAt = createTerrainSurface(floor, { fallback: bermudaSeabedHeight });
after(() => {
  heightAt.dispose();
  geometry.dispose();
  material.dispose();
});

test("Twelve patchy reef pockets span both sides and the deep southern loop with288colony instances", (t) => {
  const art = createBermudaReefFields(new THREE.Group(), { heightAt });
  t.after(() => art.dispose());
  assert.equal(BERMUDA_REEF_FIELDS.length, 12);
  const colonies = art.placements.filter((p) => p.kind.startsWith("reef_"));
  assert.equal(colonies.length, 288);
  for (const field of art.fields) {
    assert.equal(colonies.filter((p) => p.fieldId === field.id).length, 24);
    assert.ok(
      art.placements.some(
        (p) => p.fieldId === field.id && !p.kind.startsWith("reef_"),
      ),
      field.id,
    );
  }
  assert.ok(colonies.filter((p) => p.z < -1150).length >= 140);
  assert.ok(colonies.some((p) => p.z < -1680));
  assert.ok(colonies.some((p) => p.x < -400));
  assert.ok(colonies.some((p) => p.x > 400));
  assert.ok(colonies.some((p) => p.z < -1200 && Math.abs(p.x) < 150));
  assert.ok(art.colliders.length >= 240);
});

test("Every final near/far colony or rock base touches actual rendered triangles and avoids stone interiors", (t) => {
  const art = createBermudaReefFields(new THREE.Group(), { heightAt });
  t.after(() => art.dispose());
  const point = new THREE.Vector3();
  for (const batch of art.batches) {
    const samples = sceneryFootSamples(
      [batch.asset.geometry, batch.asset.farGeometry],
      batch.geological ? 0.035 : 0.12,
    );
    for (const row of batch.rows) {
      let maximum = -Infinity;
      for (const foot of samples)
        for (const id of foot.ids) {
          point.fromBufferAttribute(foot.position, id).applyMatrix4(row.matrix);
          maximum = Math.max(maximum, point.y - heightAt(point.x, point.z));
        }
      assert.ok(
        Math.abs(maximum + (batch.geological ? 0.35 : 0.15)) < 0.001,
        `${row.id}:${maximum}`,
      );
      if (!batch.geological) {
        assert.ok(Math.abs(row.matrix.elements[12] - row.x) < 0.001);
        assert.ok(Math.abs(row.matrix.elements[14] - row.z) < 0.001);
        assert.equal(
          isPositionBlocked(
            { x: row.x, y: heightAt(row.x, row.z) + 0.4, z: row.z },
            { colliders: art.colliders, radius: 0.6 },
          ),
          false,
          row.id,
        );
      }
    }
  }
  for (const contact of art.colliders)
    assert.ok(
      contact.halfSize.x > 0 &&
        contact.halfSize.y > 0 &&
        contact.halfSize.z > 0,
    );
});

test("Solid reef pockets preserve each lord arena and finite LOD draws without leaving shared resources behind", (t) => {
  const parent = new THREE.Group(),
    a = createBermudaReefFields(parent, { heightAt }),
    b = createBermudaReefFields(parent, { heightAt });
  t.after(() => {
    a.dispose();
    b.dispose();
  });
  const arenas = [
    [-310, -580],
    [300, -900],
    [-290, -1260],
    [230, -1570],
  ];
  for (const row of a.placements.filter(
    (p) => p.kind === "rock" || p.kind === "spire",
  ))
    for (const [x, z] of arenas)
      assert.ok(Math.hypot(row.x - x, row.z - z) >= 130 + row.width / 2 + 4);
  a.update(1, new THREE.Vector3(65, heightAt(65, -1345) + 30, -1345), true);
  let n = 0,
    f = 0;
  for (const batch of a.batches) {
    n += batch.near.count;
    f += batch.far.count;
    assert.ok(batch.near.boundingSphere.radius > 0);
    assert.ok(batch.far.boundingSphere.radius > 0);
    assert.ok(batch.near.count + batch.far.count <= batch.rows.length);
  }
  assert.ok(n > 0 && f > 0 && n + f < a.placements.length);
  a.update(2, new THREE.Vector3(0, 10000, 100), false);
  for (const batch of a.batches)
    assert.equal(batch.near.count + batch.far.count, 0);
  let freed = 0;
  a.assets[0].geometry.addEventListener("dispose", () => freed++);
  a.dispose();
  a.dispose();
  assert.equal(freed, 0);
  assert.equal(parent.children.length, 1);
  b.dispose();
  assert.equal(freed, 1);
  assert.equal(parent.children.length, 0);
});
