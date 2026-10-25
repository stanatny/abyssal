import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createAmazonSurfaceWood } from "../src/amazon_surface_wood.js";
import { amazonChannels, amazonSurfaceHeight } from "../src/amazon_config.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";

function scene() {
  const resources = new Set(),
    root = new T.Group(),
    wood = createAmazonSurfaceWood(root, resources);
  return {
    ...wood,
    dispose() {
      root.traverse((n) => {
        if (n.isInstancedMesh) n.dispose();
      });
      resources.forEach((r) => r.dispose());
    },
  };
}

test("surface timber stays in open marginal water with its actual skin inside moving contacts", () => {
  const wood = scene(),
    mesh = wood.root.getObjectByName("floating_logs_hf"),
    matrix = new T.Matrix4(),
    v = new T.Vector3(),
    axis = new T.Vector3(),
    nearest = new T.Vector3();
  try {
    assert.ok(wood.colliders.length >= 8 && wood.colliders.length <= 16);
    for (let time = 0; time < 360; time += 7) {
      wood.update(time, { y: 0 });
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        const c = wood.colliders[i];
        axis.subVectors(c.b, c.a);
        for (let j = 0; j < mesh.geometry.attributes.position.count; j++) {
          v.fromBufferAttribute(
            mesh.geometry.attributes.position,
            j,
          ).applyMatrix4(matrix);
          nearest.copy(v).sub(c.a);
          const t = T.MathUtils.clamp(
            nearest.dot(axis) / axis.lengthSq(),
            0,
            1,
          );
          nearest.copy(c.a).addScaledVector(axis, t);
          assert.ok(v.distanceTo(nearest) <= c.radius + 1e-5);
          assert.ok(v.y > amazonSurfaceHeight(v.x, v.z) + 0.5);
          assert.ok(
            amazonChannels(v.z).every(
              (channel) => Math.abs(channel.center - v.x) > 38,
            ),
          );
          assert.ok([-330, -650, -940].every((z) => Math.abs(v.z - z) > 22));
          assert.ok(mesh.boundingBox.containsPoint(v));
        }
      }
    }
  } finally {
    wood.dispose();
  }
});

test("floating contacts use the dynamic query lane; pause and reduced motion freeze matrices", () => {
  const wood = scene(),
    mesh = wood.root.getObjectByName("floating_logs_hf");
  try {
    const still = mesh.instanceMatrix.array.slice();
    wood.update(0, { y: 0 });
    assert.deepEqual(mesh.instanceMatrix.array, still);
    wood.update(40, { y: 0 });
    assert.notDeepEqual(mesh.instanceMatrix.array, still);
    const moved = mesh.instanceMatrix.array.slice(),
      c = wood.colliders[0],
      middle = c.a.clone().lerp(c.b, 0.5);
    const hit = castIndexedSegment(
      middle.clone().add(new T.Vector3(0, -8, 0)),
      middle.clone().add(new T.Vector3(0, 8, 0)),
      { staticColliders: [], dynamicColliders: wood.colliders },
    );
    assert.equal(hit.collider, c);
    wood.update(40, { y: -80 });
    assert.equal(wood.root.visible, false);
    assert.deepEqual(mesh.instanceMatrix.array, moved);
    wood.update(100, { y: 0 }, true);
    assert.deepEqual(mesh.instanceMatrix.array, still);
    wood.update(150, { y: 0 }, true);
    assert.deepEqual(mesh.instanceMatrix.array, still);
  } finally {
    wood.dispose();
  }
});
