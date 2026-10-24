import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaCargo } from "../src/bermuda_cargo.js";
import { acquireBermudaCargoAsset } from "../src/bermuda_cargo_asset.js";
import { createBermudaBiomes } from "../src/bermuda_biomes.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import {
  castSegment,
  resolveMotion,
  bodyRadius,
  isPositionBlocked,
} from "../src/collision.js";

test("Cargo wreck retains varied fallback colors and a bounded static mesh", () => {
  const a = acquireBermudaCargoAsset(),
    g = a.geometry;
  assert.ok(g.index.count / 3 <= 16000);
  for (const n of ["position", "normal", "uv", "color"])
    assert.ok([...g.attributes[n].array].every(Number.isFinite));
  assert.ok(!g.attributes.skinWeight);
  assert.equal(a.material.map, null);
  assert.equal(a.material.vertexColors, true);
  assert.equal(a.material.transparent, false);
  const colors = g.attributes.color.array;
  assert.ok(Math.max(...colors) - Math.min(...colors) > 0.1);
  a.release();
});

test("Cargo instances keep independent roots and release shared ship/trunks only after the last owner", () => {
  const parent = new THREE.Group(),
    options = { heightAt: bermudaSeabedHeight },
    a = createBermudaCargo(parent, options),
    b = createBermudaCargo(parent, options);
  assert.equal(a.asset.geometry, b.asset.geometry);
  assert.equal(a.trunk.geometry, b.trunk.geometry);
  assert.notEqual(a.crates.instanceMatrix, b.crates.instanceMatrix);
  let freed = 0;
  for (const r of [
    a.asset.geometry,
    a.asset.material,
    a.trunk.geometry,
    a.trunk.material,
  ])
    r.addEventListener("dispose", () => freed++);
  a.dispose();
  a.dispose();
  assert.equal(freed, 0);
  b.dispose();
  b.dispose();
  assert.equal(freed, 4);
  assert.equal(parent.children.length, 0);
});

test("Full hull and scattered cargo clear existing spires/vents and sit on the unchanged seabed", () => {
  const b = createBermudaOcean(new THREE.Group()),
    a = b.root.getObjectByName("bermuda_exploration_biomes").userData.cargoArt;
  b.root.updateMatrixWorld(true);
  const obstacles = b.colliders.filter(
    (c) =>
      c.id.startsWith("bermuda_spire") ||
      c.id.startsWith("vent_") ||
      c.id.startsWith("bermuda_rock_"),
  );
  const point = new THREE.Vector3(),
    matrix = new THREE.Matrix4();
  for (let instance = -1; instance < 6; instance++) {
    const geometry = instance < 0 ? a.mesh.geometry : a.trunk.geometry;
    if (instance < 0) matrix.copy(a.mesh.matrixWorld);
    else {
      a.crates.getMatrixAt(instance, matrix);
      matrix.premultiply(a.crates.matrixWorld);
    }
    let low = Infinity;
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      point
        .fromBufferAttribute(geometry.attributes.position, i)
        .applyMatrix4(matrix);
      low = Math.min(low, point.y - bermudaSeabedHeight(point.x, point.z));
      assert.equal(
        isPositionBlocked(point, { colliders: obstacles, radius: 0 }),
        false,
        `No pierced hull/cargo: ${instance}`,
      );
    }
    assert.ok(low >= -0.41 && low < 0.1, `seabed seat ${instance}: ${low}`);
  }
  b.dispose();
});

test("Open hold and large side breach stay traversable while actual solid bow blocks bodies", () => {
  const b = createBermudaBiomes(new THREE.Group(), {
      heightAt: bermudaSeabedHeight,
    }),
    a = b.root.userData.cargoArt,
    to = (v) =>
      new THREE.Vector3(...v)
        .applyQuaternion(a.root.quaternion)
        .add(a.root.position);
  assert.ok(castSegment(to([0, 0, -40]), to([0, 0, -20]), a.colliders, 0.45));
  assert.equal(
    castSegment(to([-12, 3, -10]), to([0, 3, -10]), a.colliders, 0.45),
    null,
  );
  const route = [
    [0, 15, 0],
    [0, 8, 0],
    [0, 2.5, 0],
    [0, 2.5, -8],
    [0, 2.5, 8],
    [0, 15, 8],
  ];
  let point = to(route[0]);
  for (const v of route.slice(1)) {
    const target = to(v),
      forward = target.clone().sub(point).normalize();
    for (let n = 0; n < 20; n++) {
      const end = point.clone().lerp(target, 0.25),
        r = resolveMotion(point, end, {
          colliders: b.colliders,
          radius: bodyRadius(3),
          length: 3,
          forward,
          floorHeight: (x, z) => bermudaSeabedHeight(x, z) + bodyRadius(3),
        });
      assert.equal(
        r.blocked,
        false,
        JSON.stringify({
          target: v,
          point: point.toArray(),
          contacts: r.contacts,
        }),
      );
      assert.equal(r.stuck, false);
      point.copy(r.position);
    }
  }
  for (const length of [3, 30])
    assert.equal(
      castSegment(
        to([0, 24, -60]),
        to([0, 24, 60]),
        b.colliders,
        bodyRadius(length),
      ),
      null,
    );
  b.dispose();
});
