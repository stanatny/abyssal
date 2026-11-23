import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";

test("The six pickup candidates are actual crystal tips and per-crystal closest surface points under their complete world transform", () => {
  const asset = createBermudaTitanRelic(),
    parent = new T.Group();
  parent.position.set(12, -590, -1550);
  parent.rotation.set(0.1, -0.7, 0.2);
  parent.scale.setScalar(1.1);
  parent.add(asset.root);
  asset.root.position.set(-3, 2, 4);
  const mesh = asset.root.children.find((m) => m.isMesh),
    intake = new T.Vector3(-5, -582, -1535),
    triangle = new T.Triangle(),
    nearest = new T.Vector3(),
    reuse = [];
  try {
    const points = asset.getPickupSurfacePoints(intake, reuse);
    assert.equal(points, reuse);
    assert.equal(points.length, 6);
    const g = mesh.geometry,
      vertices = Array.from({ length: g.attributes.position.count }, (_, i) =>
        mesh
          .getVertexPosition(i, new T.Vector3())
          .applyMatrix4(mesh.matrixWorld),
      );
    assert.equal(vertices.length, 39);
    for (let crystal = 0; crystal < 3; crystal++) {
      assert.ok(
        points[crystal * 2].distanceTo(vertices[crystal * 13 + 12]) < 1e-9,
      );
      let distance = Infinity,
        onSurface = false;
      for (let i = crystal * 66; i < (crystal + 1) * 66; i += 3) {
        triangle.set(
          vertices[g.index.getX(i)],
          vertices[g.index.getX(i + 1)],
          vertices[g.index.getX(i + 2)],
        );
        distance = Math.min(
          distance,
          triangle.closestPointToPoint(intake, nearest).distanceTo(intake),
        );
        if (
          triangle
            .closestPointToPoint(points[crystal * 2 + 1], nearest)
            .distanceTo(points[crystal * 2 + 1]) < 1e-8
        )
          onSurface = true;
      }
      assert.ok(onSurface);
      assert.ok(
        Math.abs(points[crystal * 2 + 1].distanceTo(intake) - distance) < 1e-8,
      );
    }
    const old = points[0].clone();
    parent.position.x += 7;
    asset.getPickupSurfacePoints(intake, reuse);
    assert.ok(reuse[0].distanceTo(old.add(new T.Vector3(7, 0, 0))) < 1e-8);
  } finally {
    asset.dispose();
  }
  assert.equal(asset.getPickupSurfacePoints(intake, reuse).length, 0);
});
