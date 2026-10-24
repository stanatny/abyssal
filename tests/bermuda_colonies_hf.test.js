import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createBermudaBiomes } from "../src/bermuda_biomes.js";
import { createBermudaColonies } from "../src/bermuda_colonies.js";
import { createBermudaVents } from "../src/bermuda_vents.js";
import { acquireHawaiiReefAsset } from "../src/hawaii_reef_asset.js";
import { bermudaSeabedHeight as heightAt } from "../src/bermuda_terrain.js";
import { isPositionBlocked } from "../src/collision.js";

const options = { heightAt };
test("Bermuda natural-art replacement preserves non-geology/non-vent contacts and old population points", () => {
  const b = createBermudaBiomes(new THREE.Group(), options);
  const signature = JSON.stringify(
    b.colliders.filter(
      (c) => !/^(vent_|reef_arch_|trench_arch_|bermuda_spire_)/.test(c.id),
    ),
  );
  assert.equal(
    createHash("sha256").update(signature).digest("hex"),
    "a4e51d89355df74fb1fcd15af0fd5165bae0586c479843b985c245e5aac9e546",
  );
  const c = b.root.userData.coloniesArt;
  assert.deepEqual(
    Object.values(c.placements).map((v) => v.length),
    [24, 24, 26],
  );
  for (const rows of Object.values(c.placements))
    for (const row of rows)
      assert.ok(!(row.x > -150 && row.x < 35 && row.z < -360 && row.z > -940));
  assert.equal(b.colliders.filter((c) => c.id.startsWith("vent_")).length, 48);
  b.dispose();
});

test("Reused reef leases survive independent Bermuda nursery/deep and Hawaii ownership", () => {
  const parent = new THREE.Group(),
    hawaii = acquireHawaiiReefAsset("reef_branch"),
    a = createBermudaColonies(parent, options),
    n = createBermudaColonies(parent, { ...options, nursery: true });
  assert.equal(n.placements.reef_branch.length, 64);
  assert.equal(a.assets[0].geometry, hawaii.geometry);
  assert.equal(n.assets[0].geometry, hawaii.geometry);
  let count = 0;
  hawaii.geometry.addEventListener("dispose", () => count++);
  a.dispose();
  a.dispose();
  n.dispose();
  assert.equal(count, 0);
  hawaii.release();
  assert.equal(count, 1);
  assert.equal(parent.children.length, 0);
});

test("Reef detail transitions retain every transform, use hysteresis, and do not affect another instance", () => {
  const a = createBermudaColonies(new THREE.Group(), options),
    b = createBermudaColonies(new THREE.Group(), options),
    point = new THREE.Vector3().setFromMatrixPosition(a.batches[0].matrices[0]);
  a.update(0, point);
  assert.equal(a.batches[0].close[0], 1);
  assert.equal(b.batches[0].close[0], 0);
  a.update(1, point.clone().add(new THREE.Vector3(31, 0, 0)));
  assert.equal(a.batches[0].close[0], 1);
  a.update(2, point.clone().add(new THREE.Vector3(36, 0, 0)));
  assert.equal(a.batches[0].close[0], 0);
  const m = new THREE.Matrix4();
  for (const batch of a.batches) {
    assert.equal(batch.near.count + batch.far.count, batch.matrices.length);
    const actual = [];
    for (const mesh of [batch.near, batch.far])
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        actual.push(m.elements.map((v) => v.toFixed(3)).join(","));
      }
    assert.deepEqual(
      actual.sort(),
      batch.matrices
        .map((m) => m.elements.map((v) => v.toFixed(3)).join(","))
        .sort(),
    );
  }
  a.dispose();
  b.dispose();
});

test("All mineral chimney surfaces have fitted blocking bands and complete seabed support", () => {
  const a = createBermudaVents(new THREE.Group(), options),
    p = a.asset.geometry.attributes.position,
    m = new THREE.Matrix4(),
    v = new THREE.Vector3();
  assert.ok(a.asset.geometry.index.count / 3 < 6000);
  assert.equal(a.asset.material.transparent, false);
  for (let j = 0; j < 12; j++) {
    a.mesh.getMatrixAt(j, m);
    let low = Infinity;
    const contacts = a.colliders.filter((c) => c.id.startsWith(`vent_${j}_`));
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
      low = Math.min(low, v.y - heightAt(v.x, v.z));
      assert.ok(
        isPositionBlocked(v, { colliders: contacts, radius: 0.01 }),
        `surface ${j}/${i}`,
      );
    }
    assert.ok(low >= -0.23 && low <= -0.2);
  }
  let released = 0;
  a.asset.geometry.addEventListener("dispose", () => released++);
  a.dispose();
  a.dispose();
  assert.equal(released, 1);
});
