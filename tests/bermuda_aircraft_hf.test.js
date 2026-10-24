import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaAircraft } from "../src/bermuda_aircraft.js";
import { acquireBermudaAircraftAsset } from "../src/bermuda_aircraft_asset.js";
import { createBermudaBiomes } from "../src/bermuda_biomes.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { castSegment, resolveMotion, bodyRadius } from "../src/collision.js";

test("Aircraft has bounded static geometry and retained color while its atlas is unavailable", () => {
  const a = acquireBermudaAircraftAsset(),
    g = a.geometry;
  assert.ok(g.index.count / 3 <= 16000);
  assert.ok(!g.attributes.skinIndex && !g.attributes.skinWeight);
  for (const name of ["position", "normal", "uv", "color"])
    assert.ok([...g.attributes[name].array].every(Number.isFinite));
  const colors = g.attributes.color.array;
  assert.ok(Math.max(...colors) - Math.min(...colors) > 0.1);
  assert.equal(a.material.vertexColors, true);
  assert.equal(a.material.map, null);
  assert.equal(a.material.transparent, false);
  a.release();
});

test("Independent wreck placements share resources and release the last lease exactly once", () => {
  const parent = new THREE.Group(),
    options = { heightAt: bermudaSeabedHeight },
    a = createBermudaAircraft(parent, options),
    b = createBermudaAircraft(parent, options);
  assert.equal(a.asset.geometry, b.asset.geometry);
  assert.equal(a.asset.material, b.asset.material);
  assert.notEqual(a.root, b.root);
  let releases = 0;
  for (const r of [a.asset.geometry, a.asset.material])
    r.addEventListener("dispose", () => releases++);
  a.dispose();
  a.dispose();
  assert.equal(releases, 0);
  b.dispose();
  b.dispose();
  assert.equal(releases, 2);
  assert.equal(parent.children.length, 0);
  const next = acquireBermudaAircraftAsset();
  assert.notEqual(next.geometry, a.asset.geometry);
  next.release();
});

test("Full aircraft footprint stays above the seabed except for shallow sediment seating and clears the old piercing spire", () => {
  const a = createBermudaAircraft(new THREE.Group(), {
    heightAt: bermudaSeabedHeight,
  });
  a.root.updateMatrixWorld(true);
  const p = a.mesh.geometry.attributes.position,
    v = new THREE.Vector3();
  let minimum = Infinity,
    maximum = -Infinity;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(a.mesh.matrixWorld);
    const gap = v.y - bermudaSeabedHeight(v.x, v.z);
    minimum = Math.min(minimum, gap);
    maximum = Math.max(maximum, gap);
    assert.ok(
      Math.hypot(v.x - 174, v.z + 565) > 8,
      "No vertex enters the original rock spire",
    );
  }
  assert.ok(
    minimum >= -0.61 && minimum < 0,
    "Seated in the seabed, not hovering",
  );
  assert.ok(
    maximum < 15,
    "No deeply buried wing requires lifting the entire wreck",
  );
  a.dispose();
});

test("Fitted aircraft blocks its visible hull while grown players can pass over it", () => {
  const b = createBermudaBiomes(new THREE.Group(), {
      heightAt: bermudaSeabedHeight,
    }),
    a = b.root.userData.aircraftArt,
    transform = (v) =>
      new THREE.Vector3(...v)
        .applyQuaternion(a.root.quaternion)
        .add(a.root.position),
    solids = b.colliders.filter(
      (c) =>
        c.id.startsWith("bermuda_aircraft_") ||
        /^bermuda_exploration_biomes_[0-3]$/.test(c.id),
    );
  assert.ok(
    castSegment(transform([0, 0, -25]), transform([0, 0, 0]), solids, 0.4),
  );
  for (const length of [3, 30]) {
    let point = transform([0, 28, -50]);
    const forward = transform([0, 28, 50]).sub(point).normalize();
    for (let z = -48; z <= 50; z += 2) {
      const target = transform([0, 28, z]),
        result = resolveMotion(point, target, {
          colliders: b.colliders,
          radius: bodyRadius(length),
          length,
          forward,
          floorHeight: (x, z) => bermudaSeabedHeight(x, z) + bodyRadius(length),
        });
      assert.equal(result.blocked, false);
      assert.equal(result.stuck, false);
      point.copy(result.position);
    }
  }
  b.dispose();
});
