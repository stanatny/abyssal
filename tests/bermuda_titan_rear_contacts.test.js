import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import rearContacts from "../src/assets/models/bermuda_titan_rear_contacts.json" with { type: "json" };
import { acquireBermudaSleepingTitanAsset } from "../src/bermuda_sleeping_titan_asset.js";
import {
  castIndexedSegment,
  queryStaticColliders,
} from "../src/static_collider_grid.js";
import { isPositionBlocked } from "../src/collision.js";

const contactBoxes = rearContacts.contacts.map((c, index) => ({
  id: `rear_audit_${index}`,
  type: "box",
  x: c.center[0],
  y: c.center[1],
  z: c.center[2],
  halfSize: new THREE.Vector3(...c.half),
  rotation: new THREE.Quaternion(),
}));
function visibleRear(source) {
  const geometry = source.clone(),
    positions = geometry.attributes.position,
    indices = [];
  const bounds = new THREE.Box3();
  for (let i = 0; i < source.index.count; i += 3) {
    const ids = [
      source.index.getX(i),
      source.index.getX(i + 1),
      source.index.getX(i + 2),
    ];
    if (ids.every((id) => positions.getZ(id) >= rearContacts.cut)) {
      indices.push(...ids);
      for (const id of ids)
        bounds.expandByPoint(
          new THREE.Vector3().fromBufferAttribute(positions, id),
        );
    }
  }
  geometry.setIndex(indices);
  geometry.boundingBox = bounds;
  geometry.computeBoundingSphere();
  return geometry;
}
function auditExterior(geometry) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    mesh = new THREE.Mesh(geometry, material),
    ray = new THREE.Raycaster(),
    box = geometry.boundingBox,
    positions = geometry.attributes.position,
    index = geometry.index,
    triangle = new THREE.Triangle(),
    point = new THREE.Vector3(),
    nearest = new THREE.Vector3();
  mesh.updateMatrixWorld();
  let checked = 0,
    cropExcluded = 0,
    maximum = 0,
    worst = null;
  try {
    for (const denominator of [13, 17])
      for (let axis = 0; axis < 3; axis++)
        for (const side of [-1, 1])
          for (let u = 1; u < denominator; u++)
            for (let v = 1; v < denominator; v++) {
              const others = [0, 1, 2].filter((value) => value !== axis),
                start = new THREE.Vector3(),
                end = new THREE.Vector3();
              for (let k = 0; k < 2; k++) {
                const value = THREE.MathUtils.lerp(
                  box.min.getComponent(others[k]),
                  box.max.getComponent(others[k]),
                  [u / denominator, v / denominator][k],
                );
                start.setComponent(others[k], value);
                end.setComponent(others[k], value);
              }
              start.setComponent(
                axis,
                side < 0
                  ? box.min.getComponent(axis) - 0.04
                  : box.max.getComponent(axis) + 0.04,
              );
              end.setComponent(
                axis,
                side < 0
                  ? box.max.getComponent(axis) + 0.04
                  : box.min.getComponent(axis) - 0.04,
              );
              ray.set(start, end.clone().sub(start).normalize());
              const actual = ray.intersectObject(mesh, false)[0];
              if (!actual) continue;
              const contact = castIndexedSegment(start, end, {
                staticColliders: contactBoxes,
                radius: 0,
              });
              assert.ok(contact, "Visible rear skin must have a solid contact");
              // 这里只排除真实命中被前半身遮住的开放裁面；其余方向及裁口边缘仍要验证。
              if (Math.abs(contact.point.z - rearContacts.cut) < 1e-6) {
                cropExcluded++;
                continue;
              }
              assert.ok(
                !isPositionBlocked(start, {
                  radius: 0,
                  colliders: queryStaticColliders(contactBoxes, start),
                }),
                "AABB-exterior ray must begin in actual water",
              );
              point.copy(contact.point);
              let distance = Infinity;
              for (let i = 0; i < index.count; i += 3) {
                triangle.a.fromBufferAttribute(positions, index.getX(i));
                triangle.b.fromBufferAttribute(positions, index.getX(i + 1));
                triangle.c.fromBufferAttribute(positions, index.getX(i + 2));
                distance = Math.min(
                  distance,
                  triangle
                    .closestPointToPoint(point, nearest)
                    .distanceTo(point),
                );
              }
              const metres = distance * rearContacts.length;
              if (metres > maximum) {
                maximum = metres;
                worst = {
                  denominator,
                  axis,
                  side,
                  u,
                  v,
                  point: point.toArray(),
                  firstSkin: actual.point.toArray(),
                };
              }
              checked++;
            }
  } finally {
    material.dispose();
  }
  return { triangles: index.count / 3, checked, cropExcluded, maximum, worst };
}

test("Rear continuation contacts identify the preserved single-tail source and bounded collision-only repair", () => {
  assert.equal(
    rearContacts.sourceSha256,
    "768a14520f4ac9f99231fb235d960da13ae140e92ab0b195dd2a679bf6eb03ff",
  );
  assert.equal(rearContacts.length, 280);
  assert.equal(rearContacts.cut, -0.15);
  assert.equal(rearContacts.conversion.contactCell, 0.0032);
  assert.equal(rearContacts.conversion.collisionMode, "close6");
  assert.ok(rearContacts.contacts.length < 5000);
  for (const c of rearContacts.contacts) {
    assert.ok(c.center.every(Number.isFinite));
    assert.ok(c.half.every((n) => Number.isFinite(n) && n > 0));
    assert.ok(
      c.center[2] - c.half[2] >= rearContacts.cut - 1e-8,
      "No rear box may extend past the hidden crop",
    );
  }
});

test("Both actual clipped LOD surfaces retain solid support at all their used vertices", () => {
  const asset = acquireBermudaSleepingTitanAsset();
  try {
    for (const source of [asset.geometry, asset.farGeometry]) {
      const geometry = visibleRear(source),
        p = geometry.attributes.position;
      try {
        for (const id of new Set(geometry.index.array)) {
          const point = new THREE.Vector3().fromBufferAttribute(p, id);
          assert.ok(
            isPositionBlocked(point, {
              radius: 0.00005,
              colliders: queryStaticColliders(contactBoxes, point, point, {
                radius: 0.00005,
              }),
            }),
            `Rear skin vertex ${id} lacks actual contact`,
          );
        }
      } finally {
        geometry.dispose();
      }
    }
  } finally {
    asset.release();
  }
});

test("Accessible rear near-skin contacts remain within two metres of actual visible triangles", (t) => {
  const asset = acquireBermudaSleepingTitanAsset(),
    geometry = visibleRear(asset.geometry);
  try {
    const result = auditExterior(geometry);
    t.diagnostic(JSON.stringify(result));
    assert.ok(result.checked > 700);
    assert.ok(result.cropExcluded > 10);
    assert.ok(
      result.maximum <= 2,
      `Rear blocks ${result.maximum}m from its real visible skin`,
    );
  } finally {
    geometry.dispose();
    asset.release();
  }
});

test("Distant rear approximation is measured separately from near contact precision", (t) => {
  const asset = acquireBermudaSleepingTitanAsset(),
    geometry = visibleRear(asset.farGeometry);
  try {
    const result = auditExterior(geometry);
    t.diagnostic(JSON.stringify(result));
    assert.ok(result.checked > 700);
    assert.ok(result.triangles < 5000);
    // 这里只记录远景减面的实际偏差；接触验收使用玩家靠近后显示的近景实体。
    assert.ok(Number.isFinite(result.maximum));
  } finally {
    geometry.dispose();
    asset.release();
  }
});
