import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  sceneryFootSamples,
  seatUprightScenery,
} from "../src/scenery_grounding.js";
import { terrainMeshHeight } from "../src/terrain_mesh_height.js";
import { createOcean } from "../src/ocean.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";

function inspectBase(geometry, matrix, heightAt, fraction) {
  const p = geometry.attributes.position,
    ids = [...new Set(geometry.index.array)],
    ys = ids.map((i) => p.getY(i)),
    min = Math.min(...ys),
    max = Math.max(...ys),
    v = new T.Vector3();
  let gap = -Infinity,
    visible = -Infinity;
  for (const i of ids) {
    v.fromBufferAttribute(p, i).applyMatrix4(matrix);
    const d = v.y - heightAt(v.x, v.z);
    visible = Math.max(visible, d);
    if (p.getY(i) <= min + (max - min) * fraction) gap = Math.max(gap, d);
  }
  return { gap, visible };
}

test("upright scenery seats both referenced LOD bottoms without flattening or mutating the source", () => {
  const near = new T.BoxGeometry(2, 2, 2).translate(0, 1, 0),
    far = near.clone();
  const p = near.attributes.position;
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) < 0.1 && p.getX(i) > 0) p.setY(i, 0.15);
  const source = near.attributes.position.array.slice(),
    geometryIndices = far.index.array.slice();
  const values = Array.from(far.attributes.position.array);
  values.push(0, -1000, 0);
  far.setAttribute("position", new T.Float32BufferAttribute(values, 3));
  const heightAt = (x, z) => 0.6 * x + 0.45 * z - 40,
    dummy = new T.Object3D();
  seatUprightScenery(dummy, {
    x: 7,
    z: -30,
    yaw: 1.1,
    scale: [2, 1.5, 2],
    heightAt,
    samples: sceneryFootSamples([near, far], 0.2),
    embed: 0.12,
  });
  for (const g of [near, far]) {
    const result = inspectBase(g, dummy.matrix, heightAt, 0.2);
    assert.ok(result.gap <= -0.119999);
    assert.ok(result.visible > 0.5);
  }
  assert.deepEqual(near.attributes.position.array, source);
  assert.deepEqual(far.index.array, geometryIndices);
  assert.ok(
    dummy.position.y > -100,
    "unused far vertices cannot bury the entire colony",
  );
  near.dispose();
  far.dispose();
});

test("all Hawaii real near/far colony bases meet the rendered slope while original colonies remain visible", () => {
  const ocean = createOcean(new T.Scene());
  try {
    const floor = ocean.root.children.find((n) => n.userData.terrainContact),
      heightAt = terrainMeshHeight(floor.geometry),
      geometries = {};
    ocean.reef.root.traverse((n) => {
      for (const kind of [
        "reef_branch",
        "reef_fan",
        "reef_brain",
        "reef_sponge",
      ])
        if (n.name === kind + "_close" || n.name === kind + "_distant") {
          geometries[kind] ??= new Set();
          geometries[kind].add(n.geometry);
        }
    });
    const dummy = new T.Object3D();
    let count = 0;
    for (const [kind, rows] of Object.entries(ocean.reef.placements))
      for (const row of rows) {
        dummy.position.set(row.x, row.y, row.z);
        dummy.quaternion.fromArray(row.fittedQuaternion);
        dummy.scale.set(...row.scale);
        dummy.updateMatrix();
        for (const g of geometries[kind]) {
          const r = inspectBase(g, dummy.matrix, heightAt, 0.06);
          assert.ok(r.gap < -0.02, `${kind}: ${r.gap}`);
          assert.ok(r.visible > 0.2, `${kind}: buried`);
        }
        count++;
      }
    assert.equal(count, 357);
  } finally {
    ocean.dispose();
  }
});

test("Bermuda upright colonies in both LODs use actual terrain and release the reused surface index", () => {
  const o = createBermudaOcean(new T.Scene());
  try {
    o.root.updateMatrixWorld(true);
    const arts = [
      o.root.userData.nurseryArt,
      o.root.getObjectByName("bermuda_exploration_biomes").userData.coloniesArt,
    ];
    let count = 0;
    for (const a of arts)
      for (const b of a.batches)
        for (const matrix of b.matrices) {
          for (const mesh of [b.near, b.far]) {
            const r = inspectBase(
              mesh.geometry,
              matrix,
              o.contactSurface,
              0.12,
            );
            assert.ok(r.gap < -0.14, `${mesh.name}: ${r.gap}`);
            assert.ok(r.visible > 0.1);
          }
          count++;
        }
    assert.equal(count, 138);
    const stats = o.contactSurface.stats;
    o.dispose();
    assert.equal(stats.disposed, true);
    assert.equal(stats.retainedTypedArrayBytes, 0);
  } finally {
    o.dispose();
  }
});

test("Odyssey upright HF colonies seat both LODs and release the reused surface index", async () => {
  const o = createOdysseyOcean(new T.Scene());
  try {
    await o.shallows.prepare(0);
    let count = 0;
    for (const b of o.shallows.state.batches) {
      if (!b.near.name.includes("reef_")) continue;
      for (let i = 0; i < b.count; i++) {
        const matrix = new T.Matrix4().fromArray(b.matrices, i * 16);
        for (const mesh of [b.near, b.far]) {
          const r = inspectBase(mesh.geometry, matrix, o.contactSurface, 0.08);
          assert.ok(r.gap < -0.01, `${mesh.name}: ${r.gap}`);
          assert.ok(r.visible > 0.1);
        }
        count++;
      }
    }
    assert.equal(count, 155);
    const stats = o.contactSurface.stats;
    o.dispose();
    assert.equal(stats.disposed, true);
    assert.equal(stats.retainedTypedArrayBytes, 0);
  } finally {
    o.dispose();
  }
});
