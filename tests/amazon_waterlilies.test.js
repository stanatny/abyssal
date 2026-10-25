import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  createAmazonWaterlilies,
  amazonWaterlilyLayout,
} from "../src/amazon_waterlilies.js";
import { acquireAmazonLily } from "../src/amazon_lily_asset.js";
import { amazonSurfaceHeight, AMAZON_WORLD } from "../src/amazon_config.js";

function scene() {
  const parent = new T.Group(),
    resources = new Set(),
    result = createAmazonWaterlilies(parent, resources);
  return {
    ...result,
    resources,
    dispose() {
      parent.traverse((n) => {
        if (n.isInstancedMesh) n.dispose();
      });
      for (const r of resources) r.dispose();
      parent.clear();
    },
  };
}

test("waterlily skin and separate flowers fit the open water, with bounded per-instance cost", () => {
  const s = scene(),
    v = new T.Vector3(),
    m = new T.Matrix4();
  let count = 0,
    triangles = 0;
  try {
    assert.equal(s.layout.leaves.length, 230);
    assert.ok(s.layout.flowers.length >= 10 && s.layout.flowers.length <= 20);
    for (const n of s.root.children) {
      assert.ok(n.isInstancedMesh);
      assert.ok(n.geometry.index.count / 3 < 6500);
      triangles += (n.count * n.geometry.index.count) / 3;
      for (let i = 0; i < n.count; i++) {
        n.getMatrixAt(i, m);
        count++;
        for (let j = 0; j < n.geometry.attributes.position.count; j++) {
          v.fromBufferAttribute(n.geometry.attributes.position, j).applyMatrix4(
            m,
          );
          assert.ok(Number.isFinite(v.x + v.y + v.z));
          if (
            n.name === "victoria_leaf_hf" &&
            n.geometry.attributes.normal.getY(j) > 0.65 &&
            n.geometry.attributes.position.getY(j) > -0.07
          )
            assert.ok(
              v.y - 0.012 - 0.008 * 0.5 * 3.8 > AMAZON_WORLD.surfaceY,
              "Leaf surface intersects water at maximum bob/tilt",
            );
          assert.ok(
            v.y > amazonSurfaceHeight(v.x, v.z) + 0.05,
            "Skin intersects bank",
          );
        }
      }
    }
    assert.equal(count, s.layout.leaves.length + s.layout.flowers.length);
    assert.ok(triangles < 1500000);
    for (const f of s.layout.flowers)
      assert.ok(
        s.layout.leaves.every(
          (l) =>
            Math.hypot(l.x - f.x, l.z - f.z) >
            l.diameter * 0.5 + f.diameter * 0.4,
        ),
        "Flower intersects leaf rim",
      );
  } finally {
    s.dispose();
  }
});

test("waterlilies share immutable kits but keep per-map motion, disposal and retry subscriptions independent", () => {
  const a = scene(),
    b = scene(),
    kit = acquireAmazonLily("leaf");
  let disposed = 0;
  kit.geometry.addEventListener("dispose", () => disposed++);
  try {
    assert.equal(a.root.children[0].geometry, b.root.children[0].geometry);
    assert.notEqual(a.root.children[0].material, b.root.children[0].material);
    a.update(20, { x: 0, y: AMAZON_WORLD.surfaceY, z: 0 });
    b.update(8, { x: 0, y: AMAZON_WORLD.surfaceY, z: 0 });
    assert.equal(a.time.value, 20);
    assert.equal(b.time.value, 8);
    const matrices = a.root.children.map((n) => n.instanceMatrix.array.slice());
    a.update(100, { x: 0, y: -150, z: 0 }, true);
    assert.equal(a.time.value, 0);
    assert.ok(a.root.children.every((n) => !n.visible));
    a.root.children.forEach((n, i) =>
      assert.deepEqual(n.instanceMatrix.array, matrices[i]),
    );
    a.dispose();
    assert.equal(disposed, 0);
    assert.equal(kit.subscribers.size, 2);
    b.dispose();
    assert.equal(disposed, 0);
    assert.equal(kit.subscribers.size, 1);
    kit.release();
    assert.equal(disposed, 1);
    kit.release();
    assert.equal(disposed, 1);
    const next = acquireAmazonLily("leaf");
    assert.notEqual(next.geometry, kit.geometry);
    next.release();
  } finally {
    /* 每个所有者在上面按顺序释放。 */
  }
});

test("waterlily placement is deterministic and does not add collision or food state", () => {
  assert.deepEqual(amazonWaterlilyLayout(), amazonWaterlilyLayout());
  const s = scene();
  assert.equal(s.colliders, undefined);
  assert.equal(s.barriers, undefined);
  s.dispose();
});
