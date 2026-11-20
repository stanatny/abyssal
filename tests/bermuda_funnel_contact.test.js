import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaWreck } from "../src/bermuda_wreck.js";
import { acquireBermudaWreckAsset } from "../src/bermuda_wreck_asset.js";
import {
  bodyRadius,
  castSegment,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";

function fixture() {
  const wreck = createBermudaWreck(new THREE.Scene()),
    asset = acquireBermudaWreckAsset("wreck_funnel"),
    geometry = asset.geometry.clone();
  geometry.computeBoundingBox();
  const middle = geometry.boundingBox.getCenter(new THREE.Vector3()),
    extent = geometry.boundingBox.getSize(new THREE.Vector3());
  geometry.translate(-middle.x, -middle.y, -middle.z);
  geometry.scale(10.7 / extent.x, 18 / extent.y, 10.7 / extent.z);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const funnels = wreck.root.userData.wreckArt.placements
    .filter((p) => p.kind === "wreck_funnel")
    .map((placement, i) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position
        .fromArray(placement.center)
        .multiplyScalar(wreck.root.scale.x)
        .add(wreck.root.position);
      mesh.rotation.set(...placement.rotation);
      mesh.scale.copy(wreck.root.scale);
      mesh.updateMatrixWorld(true);
      return {
        mesh,
        colliders: wreck.colliders.filter((c) =>
          c.id.startsWith(`${wreck.root.name}_funnel_${i}_`),
        ),
        point: (p) => new THREE.Vector3(...p).applyMatrix4(mesh.matrixWorld),
      };
    });
  return {
    wreck,
    funnels,
    geometry,
    dispose() {
      wreck.dispose();
      asset.release();
      geometry.dispose();
      material.dispose();
    },
  };
}

test("Every upright and tilted visible funnel wall blocks contact at matching height and heading", () => {
  const f = fixture();
  try {
    for (const [i, funnel] of f.funnels.entries())
      for (const y of [-6, -2, 2, 6])
        for (let angle = 0; angle < 12; angle++) {
          const theta = (angle * Math.PI) / 6,
            from = funnel.point([
              Math.sin(theta) * 16,
              y,
              Math.cos(theta) * 16,
            ]),
            to = funnel.point([0, y, 0]),
            ray = new THREE.Raycaster(
              from,
              to.clone().sub(from).normalize(),
              0,
              from.distanceTo(to),
            ),
            surface = ray.intersectObject(funnel.mesh)[0];
          assert.ok(surface, `Missing visible wall ${i}/${y}/${angle}`);
          const hit = castSegment(from, to, funnel.colliders, 0.1);
          assert.ok(hit, `Visible funnel is passable ${i}/${y}/${angle}`);
          // 凸箍附近球扫掠会先碰侧边，不能拿零半径中心射线的距离代替真实表面间距。
          const point = new THREE.Vector3()
              .copy(hit.point)
              .applyMatrix4(funnel.mesh.matrixWorld.clone().invert()),
            triangle = new THREE.Triangle(),
            closest = new THREE.Vector3(),
            position = f.geometry.attributes.position,
            index = f.geometry.index;
          let gap = Infinity;
          for (let n = 0; n < index.count; n += 3) {
            triangle.a.fromBufferAttribute(position, index.getX(n));
            triangle.b.fromBufferAttribute(position, index.getX(n + 1));
            triangle.c.fromBufferAttribute(position, index.getX(n + 2));
            triangle.closestPointToPoint(point, closest);
            gap = Math.min(
              gap,
              point.distanceTo(closest) * funnel.mesh.scale.x,
            );
          }
          assert.ok(
            gap < 1.4,
            `Contact is far from skin ${i}/${y}/${angle}: ${gap}`,
          );
        }
  } finally {
    f.dispose();
  }
});

test("Actual funnel triangles are covered while the open shaft stays open above its visible bottom", () => {
  const f = fixture(),
    p = f.geometry.attributes.position,
    ids = f.geometry.index;
  try {
    for (const funnel of f.funnels) {
      for (let i = 0; i < ids.count; i += 3) {
        const center = new THREE.Vector3();
        for (let j = 0; j < 3; j++)
          center.add(
            new THREE.Vector3().fromBufferAttribute(p, ids.getX(i + j)),
          );
        center.multiplyScalar(1 / 3).applyMatrix4(funnel.mesh.matrixWorld);
        assert.ok(
          isPositionBlocked(center, {
            colliders: funnel.colliders,
            radius: 0.04,
          }),
          `Uncovered triangle ${i / 3}`,
        );
      }
      assert.equal(
        castSegment(
          funnel.point([0, 14, 0]),
          funnel.point([0, -7, 0]),
          funnel.colliders,
          0.2,
        ),
        null,
      );
      assert.ok(
        castSegment(
          funnel.point([0, 14, 0]),
          funnel.point([0, -12, 0]),
          funnel.colliders,
          0.2,
        ),
        "The visible bottom must remain solid",
      );
    }
  } finally {
    f.dispose();
  }
});

test("Fast complete-body approaches stop at each funnel and can retreat without sticking", () => {
  const f = fixture();
  try {
    for (const funnel of f.funnels)
      for (const length of [3, 15, 32])
        for (const side of [-1, 1]) {
          const from = funnel.point([side * 30, 3, 0]),
            to = funnel.point([-side * 30, 3, 0]),
            options = {
              colliders: funnel.colliders,
              length,
              radius: bodyRadius(length),
              forward: to.clone().sub(from).normalize(),
            },
            result = resolveMotion(from, to, options);
          assert.equal(result.blocked, true);
          assert.equal(result.stuck, false);
          assert.equal(isPositionBlocked(result.position, options), false);
          const back = resolveMotion(result.position, from, options);
          assert.equal(back.stuck, false);
          assert.ok(
            new THREE.Vector3().copy(back.position).distanceTo(from) < 0.01,
          );
        }
  } finally {
    f.dispose();
  }
});

test("Funnel contacts append after the original ship solids without adding geometry or coupling ownership", () => {
  const a = fixture(),
    b = fixture();
  try {
    assert.equal(
      a.wreck.colliders.filter((c) => /_funnel_/.test(c.id)).length,
      192,
    );
    assert.equal(
      a.wreck.colliders.slice(0, 402).some((c) => /_funnel_/.test(c.id)),
      false,
    );
    assert.equal(a.wreck.colliders[0].id, `${a.wreck.root.name}_0`);
    assert.equal(a.wreck.colliders[197].id, "bermuda_interior_0");
    assert.equal(a.wreck.colliders[401].id, `${a.wreck.root.name}_343`);
    assert.equal(a.wreck.root.children.length, 17);
    assert.deepEqual(a.wreck.colliders, b.wreck.colliders);
    a.wreck.dispose();
    assert.equal(b.wreck.colliders.length, 594);
  } finally {
    a.dispose();
    b.dispose();
  }
});
