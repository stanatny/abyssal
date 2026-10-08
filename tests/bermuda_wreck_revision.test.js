import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaWreck, WRECK_ROUTES } from "../src/bermuda_wreck.js";
import {
  BERMUDA_WRECK,
  WRECK_BED,
  wreckWorldPoint,
} from "../src/bermuda_sites.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
  castSegment,
} from "../src/collision.js";

const point = (local) =>
  new THREE.Vector3(...local)
    .multiplyScalar(BERMUDA_WRECK.scale)
    .add(new THREE.Vector3(...BERMUDA_WRECK.center));
const create = () =>
  createBermudaWreck(new THREE.Scene(), { heightAt: bermudaSeabedHeight });

test("Bermuda's enlarged hull, entry apron and existing interior food transform agree", () => {
  const wreck = create();
  assert.deepEqual(BERMUDA_WRECK.center, [-65, -486, -650]);
  assert.equal(BERMUDA_WRECK.scale, 2.5);
  assert.equal(BERMUDA_WRECK.length, 600);
  assert.equal(BERMUDA_WRECK.width, 135);
  const hull = wreck.root.children.find(
    (mesh) => mesh.material.name === "double_hull",
  );
  hull.geometry.computeBoundingBox();
  const extent = hull.geometry.boundingBox
    .getSize(new THREE.Vector3())
    .multiplyScalar(wreck.root.scale.x);
  assert.ok(Math.abs(extent.x - 135) < 0.001);
  assert.ok(Math.abs(extent.z - 600) < 0.001);
  assert.equal(WRECK_BED.blend, 45);
  assert.ok(
    WRECK_BED.maxX >= point([50, 0, 50]).x + bodyRadius(32) + 32 * 0.42,
  );
  for (const x of [-27, 0, 27, 50])
    for (const z of [-120, -60, 0, 60, 128]) {
      const p = point([x, 0, z]);
      assert.equal(bermudaSeabedHeight(p.x, p.z), p.y);
    }
  for (const raw of [
    [-62, -448, -600],
    [-65, -468, -698],
    [-65, -454, -630],
  ]) {
    const transformed = new THREE.Vector3(...wreckWorldPoint(raw));
    assert.deepEqual(
      transformed.toArray(),
      point([raw[0] + 65, raw[1] + 484, raw[2] + 650]).toArray(),
    );
    assert.equal(
      isPositionBlocked(transformed, { colliders: wreck.colliders, radius: 2 }),
      false,
    );
    assert.ok(
      transformed.y > bermudaSeabedHeight(transformed.x, transformed.z) + 2,
    );
  }
  assert.ok(wreck.stats.supported);
  wreck.dispose();
});

test("All four wreck connections remain sweepable both ways by a 32 m adult, including corner turns and fast travel", () => {
  const wreck = create(),
    length = 32,
    radius = bodyRadius(length);
  let samples = 0,
    turns = 0;
  for (const route of WRECK_ROUTES)
    for (const reverse of [false, true]) {
      const points = (reverse ? [...route.points].reverse() : route.points).map(
        (p) => new THREE.Vector3(...p),
      );
      let position = points[0].clone();
      for (let i = 1; i < points.length; i++) {
        const from = points[i - 1],
          to = points[i],
          forward = to.clone().sub(from).normalize(),
          options = {
            colliders: wreck.colliders,
            radius,
            length,
            forward,
            floorHeight: (x, z) => bermudaSeabedHeight(x, z) + radius,
          },
          count = Math.ceil(from.distanceTo(to) / 1.5),
          fast = resolveMotion(from, to, options);
        assert.equal(fast.blocked, false, `${route.id}: fast segment`);
        assert.ok(
          new THREE.Vector3().copy(fast.position).distanceTo(to) < 0.01,
        );
        for (let step = 1; step <= count; step++) {
          const target = from.clone().lerp(to, step / count),
            result = resolveMotion(position, target, options);
          assert.equal(result.stuck, false, route.id);
          assert.equal(result.blocked, false, route.id);
          position.copy(result.position);
          assert.ok(position.distanceTo(target) < 0.01, route.id);
          samples++;
        }
        if (i < points.length - 1) {
          const next = points[i + 1].clone().sub(to).normalize();
          for (let step = 0; step <= 16; step++) {
            const heading = forward
              .clone()
              .lerp(next, step / 16)
              .normalize();
            assert.equal(
              isPositionBlocked(to, {
                colliders: wreck.colliders,
                radius,
                length,
                forward: heading,
              }),
              false,
              `${route.id}: turn ${step}`,
            );
            turns++;
          }
        }
      }
    }
  assert.equal(samples, 1304);
  assert.equal(turns, 136);
  wreck.dispose();
});

test("Distinct rooms expose useful world views and fitted furniture solids while reserving the central waterway", () => {
  const wreck = create(),
    roomTypes = new Set(wreck.rooms.map((room) => room.type)),
    ids = new Set(wreck.colliders.map((collider) => collider.id));
  assert.equal(ids.size, wreck.colliders.length);
  assert.equal(wreck.rooms.length, 11);
  for (const type of [
    "dining_room",
    "salon",
    "passenger_cabin",
    "engine_room",
    "cargo_hold",
    "luggage_hold",
  ])
    assert.ok(roomTypes.has(type), type);
  for (const room of wreck.rooms) {
    assert.ok(room.fixtureCount > 0);
    assert.ok(
      [...room.eye, ...room.target, ...room.bounds.flat()].every(
        Number.isFinite,
      ),
    );
    assert.ok(
      new THREE.Vector3(...room.eye).distanceTo(
        new THREE.Vector3(...room.target),
      ) > 5,
    );
  }
  for (const fixture of wreck.fixtures) {
    const collider = fixture.collider;
    assert.ok(wreck.colliders.includes(collider));
    assert.equal(collider.roomId, fixture.roomId);
    assert.ok(
      [collider.x, collider.y, collider.z, ...collider.halfSize].every(
        Number.isFinite,
      ),
    );
    assert.ok(collider.halfSize.toArray().every((value) => value > 0));
  }
  for (const kind of [
    "oval_dining_table",
    "salon_sofa_plinth",
    "cabin_bed_frame",
    "engine_boiler",
    "engine_flywheel",
    "cargo_barrel",
    "luggage_trunk",
  ]) {
    const fixture = wreck.fixtures.find((row) => row.kind === kind);
    assert.ok(fixture, kind);
    const c = fixture.collider,
      hit = castSegment(
        new THREE.Vector3(c.x - c.halfSize.x - 3, c.y, c.z),
        new THREE.Vector3(c.x + c.halfSize.x + 3, c.y, c.z),
        [c],
        0.1,
      );
    assert.equal(hit?.collider, c, `${kind}: body obstruction`);
  }
  // 中轴成人旋转空间由真实实体检查，而非只看房间或路线元数据。
  for (const z of [-83, -41, -20, 15, 50, 80])
    for (const heading of [
      [1, 0, 0],
      [0, 0, 1],
      [Math.SQRT1_2, 0, Math.SQRT1_2],
    ])
      assert.equal(
        isPositionBlocked(point([0, 16, z]), {
          colliders: wreck.colliders,
          radius: bodyRadius(32),
          length: 32,
          forward: new THREE.Vector3(...heading),
        }),
        false,
        `Lower corridor ${z}/${heading}`,
      );
  wreck.dispose();
});

test("Layered wreck geometry stays finite and nondegenerate with unchanged material draw and lighting bounds", () => {
  const wreck = create(),
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  assert.equal(wreck.stats.meshes, 10);
  assert.ok(wreck.stats.triangles < 80000);
  assert.equal(wreck.lightSources.length, 8);
  wreck.root.traverse((mesh) => {
    assert.ok(!mesh.isLight, "No new scene lights belong to the art factory");
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position,
      index = mesh.geometry.index;
    assert.ok(
      index,
      "All details must merge into the existing indexed material buckets",
    );
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(p, index.getX(i));
      b.fromBufferAttribute(p, index.getX(i + 1));
      c.fromBufferAttribute(p, index.getX(i + 2));
      assert.ok([...a, ...b, ...c].every(Number.isFinite));
      assert.ok(
        b.sub(a).cross(c.sub(a)).lengthSq() > 1e-12,
        `${mesh.name}: triangle ${i / 3}`,
      );
    }
  });
  wreck.dispose();
});

test("Each wreck owns its merged resources and idempotent disposal preserves another live instance", () => {
  const first = create(),
    second = create(),
    retired = new Map();
  for (const mesh of first.root.children)
    for (const resource of [mesh.geometry, mesh.material]) {
      retired.set(resource, 0);
      resource.addEventListener("dispose", () =>
        retired.set(resource, retired.get(resource) + 1),
      );
    }
  for (const mesh of second.root.children) {
    assert.ok(!retired.has(mesh.geometry));
    assert.ok(!retired.has(mesh.material));
  }
  const secondBounds = new THREE.Box3()
    .setFromObject(second.root)
    .getSize(new THREE.Vector3())
    .toArray();
  first.dispose();
  first.dispose();
  assert.equal(first.root.children.length, 0);
  assert.equal(first.colliders.length, 0);
  assert.ok([...retired.values()].every((count) => count === 1));
  assert.equal(second.root.children.length, 10);
  assert.deepEqual(
    new THREE.Box3()
      .setFromObject(second.root)
      .getSize(new THREE.Vector3())
      .toArray(),
    secondBounds,
  );
  second.dispose();
});
