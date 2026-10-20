import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createOceanExtra } from "../src/ocean_extra.js";
import { acquireHawaiiLandmarkAsset } from "../src/hawaii_landmark_asset.js";
import { resolveMotion, bodyRadius } from "../src/collision.js";

function fixture() {
  const scene = new THREE.Scene(),
    colliders = [],
    obstacles = [];
  const extra = createOceanExtra(scene, {
    seabedHeight: () => 0,
    colliders,
    obstacles,
    worldUniforms: { oceanTime: { value: 0 } },
  });
  return { scene, colliders, obstacles, extra };
}

test("landmark redraw preserves the accepted static collision contract", () => {
  const f = fixture();
  try {
    // Snapshot of the pre-redraw procedural geometry, not the new mesh.
    assert.equal(
      createHash("sha256").update(JSON.stringify(f.colliders)).digest("hex"),
      "c8ad0094655a707ae18223d9ccc9809a523979e7b9535cdfd16d422c684d40ae",
    );
    assert.equal(f.obstacles.length, 59);
    assert.deepEqual(
      f.extra.landmarks.map(({ x, z }) => [x, z]),
      [
        [-49, -167],
        [83, -373],
        [-83, -795],
        [67, -1075],
      ],
    );
  } finally {
    f.extra.dispose();
  }
});

test("landmark batching retains texture UVs and bounded real meshes", () => {
  const f = fixture();
  try {
    for (const kind of ["wreck", "whale", "temple", "gate"]) {
      const mesh = f.scene.getObjectByName(`hawaii_${kind}_hf`),
        g = mesh.geometry;
      assert.equal(g.attributes.uv.count, g.attributes.position.count);
      assert.equal(g.attributes.color.count, g.attributes.position.count);
      assert.ok(g.index.count / 3 > 12000 && g.index.count / 3 <= 18000);
      assert.ok([...g.attributes.normal.array].every(Number.isFinite));
      for (let i = 0; i < g.attributes.uv.count; i++) {
        assert.ok(g.attributes.uv.getX(i) >= 0 && g.attributes.uv.getX(i) <= 1);
        assert.ok(g.attributes.uv.getY(i) >= 0 && g.attributes.uv.getY(i) <= 1);
      }
      assert.equal(mesh.material.vertexColors, true);
      assert.equal(g.attributes.skinWeight, undefined);
    }
  } finally {
    f.extra.dispose();
  }
});

test("a 32 metre body crosses both the actual gate mesh and collision opening", () => {
  const f = fixture();
  try {
    const mesh = f.scene.getObjectByName("hawaii_gate_hf"),
      gate = mesh.parent;
    gate.updateWorldMatrix(true, true);
    for (const sign of [-1, 1]) {
      const start = {
          x: gate.position.x,
          y: 25,
          z: gate.position.z + sign * 36,
        },
        end = { ...start, z: gate.position.z - sign * 36 };
      const result = resolveMotion(start, end, {
        colliders: f.colliders,
        length: 32,
        radius: bodyRadius(32),
        forward: { x: 0, y: 0, z: -sign },
      });
      assert.equal(result.blocked, false);
      assert.deepEqual(result.position, end);
      for (const dx of [-bodyRadius(32), 0, bodyRadius(32)])
        for (const dy of [-bodyRadius(32), 0, bodyRadius(32)]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(start.x + dx, start.y + dy, start.z),
            new THREE.Vector3(0, 0, -sign),
            0,
            72,
          );
          assert.equal(ray.intersectObject(mesh).length, 0);
        }
    }
  } finally {
    f.extra.dispose();
  }
});

test("two oceans share assets until the last owner releases them exactly once", () => {
  for (const kind of ["wreck", "whale", "temple", "gate"]) {
    const a = acquireHawaiiLandmarkAsset(kind),
      b = acquireHawaiiLandmarkAsset(kind),
      events = { geometry: 0, material: 0 };
    assert.equal(a.geometry, b.geometry);
    assert.equal(a.material, b.material);
    a.geometry.addEventListener("dispose", () => events.geometry++);
    a.material.addEventListener("dispose", () => events.material++);
    a.release();
    a.release();
    assert.deepEqual(events, { geometry: 0, material: 0 });
    b.release();
    b.release();
    assert.deepEqual(events, { geometry: 1, material: 1 });
    const c = acquireHawaiiLandmarkAsset(kind);
    assert.notEqual(c.geometry, a.geometry);
    c.release();
  }
});
