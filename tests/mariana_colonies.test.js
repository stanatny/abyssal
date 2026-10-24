import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createMarianaOcean,
  createMarianaOceanAsync,
} from "../src/mariana_ocean.js";
import { terrainMeshHeight } from "../src/terrain_mesh_height.js";
import { acquireHawaiiReefAsset } from "../src/hawaii_reef_asset.js";

test("Mariana HF colonies keep 56 nursery and 180 ledge sites with three documented cliff retreats", () => {
  const o = createMarianaOcean(new THREE.Group());
  const c = o.root.userData.marianaColonies;
  assert.equal(c.placements.length, 236);
  assert.deepEqual(
    Object.fromEntries(
      [...c.assets].map(([k]) => [
        k,
        c.placements.filter((p) => p.kind === k).length,
      ]),
    ),
    { reef_branch: 42, reef_brain: 14, reef_fan: 180 },
  );
  const moved = c.placements.filter(
    (p) =>
      p.source.originalZ !== undefined && p.source.originalZ !== p.source.z,
  );
  assert.deepEqual(
    moved.map((p) => p.source.yaw),
    [50, 52, 54],
  );
  assert.ok(moved.every((p) => p.source.z - p.source.originalZ === 16));
  assert.ok(c.placements.every((p) => p.rootSink < 0.5));
  o.dispose();
});

test("Every colony's deformed base footprint is seated on actual floor triangles or its rendered rock", () => {
  const o = createMarianaOcean(new THREE.Group()),
    c = o.root.userData.marianaColonies;
  const height = terrainMeshHeight(
    o.root.getObjectByName("mariana_lowest_ground").geometry,
  );
  const point = new THREE.Vector3(),
    matrix = new THREE.Matrix4(),
    down = new THREE.Vector3(0, -1, 0),
    ray = new THREE.Raycaster();
  let checked = 0;
  for (const row of c.placements) {
    const g = c.assets.get(row.kind).geometry,
      p = g.attributes.position,
      box = g.boundingBox;
    matrix.fromArray(row.matrix);
    let rock;
    if (row.kind === "reef_fan") {
      const batch = o.root.getObjectByName(row.group).children[0];
      rock = new THREE.Mesh(batch.geometry, batch.material);
      batch.getMatrixAt(row.source.supportIndex, rock.matrix);
      rock.matrixWorld.copy(rock.matrix);
      rock.matrixAutoUpdate = false;
    }
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > box.min.y + (box.max.y - box.min.y) * 0.025) continue;
      point.fromBufferAttribute(p, i).applyMatrix4(matrix);
      let support;
      if (rock) {
        ray.set(point.clone().addScaledVector(down, -30), down);
        support = ray.intersectObject(rock, false)[0]?.point.y;
      } else support = height(point.x, point.z);
      assert.ok(Number.isFinite(support));
      assert.ok(
        point.y - support <= -0.04,
        `${row.kind} detached: ${point.y - support}`,
      );
      assert.ok(point.y - support > -0.8, `${row.kind} buried`);
      checked++;
    }
  }
  assert.ok(checked > 1000);
  o.dispose();
});

test("Near/far transitions preserve complete stock, fixed bounds and frozen update state", () => {
  const o = createMarianaOcean(new THREE.Group()),
    c = o.root.userData.marianaColonies;
  for (const y of [-20, -300, -1000, -2200]) {
    o.update(y + 3000, new THREE.Vector3(70, y, -400));
    for (const b of c.batches) {
      assert.equal(b.near.count + b.far.count, b.matrices.length);
      for (const mesh of [b.near, b.far]) {
        assert.ok(Number.isFinite(mesh.boundingSphere.radius));
      }
      const before = b.near.instanceMatrix.array.slice();
      o.update(y + 3000, new THREE.Vector3(0, y, 0));
      assert.deepEqual(b.near.instanceMatrix.array, before);
    }
  }
  o.dispose();
});

test("Shared HF surfaces survive one owner disposal; cancellation releases the remaining scene reference", async () => {
  const held = acquireHawaiiReefAsset("reef_fan");
  let disposed = 0;
  held.geometry.addEventListener("dispose", () => disposed++);
  const parent = new THREE.Group(),
    o = createMarianaOcean(parent);
  assert.equal(
    o.root.userData.marianaColonies.assets.get("reef_fan").geometry,
    held.geometry,
  );
  o.dispose();
  o.dispose();
  assert.equal(disposed, 0);
  await assert.rejects(
    createMarianaOceanAsync(parent, {
      onStep(label) {
        if (label === "ecology") throw Error("Cancel ecology fixture");
      },
    }),
    /Cancel ecology fixture/,
  );
  assert.equal(parent.children.length, 0);
  assert.equal(disposed, 0);
  held.release();
  assert.equal(disposed, 1);
});
