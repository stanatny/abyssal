import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaFleet } from "../src/bermuda_fleet.js";
import { acquireDutchmanAsset } from "../src/bermuda_dutchman_asset.js";

test("Ghost HF hull retains its physical envelope and supported captain; cannon muzzles remain outside the hull", () => {
  const f = createBermudaFleet(new T.Scene()),
    g = f.ghost;
  try {
    assert.equal(g.sails.length, 7);
    assert.equal(g.muzzles.length, 12);
    assert.deepEqual(g.localColliders, [
      { center: [0, 1, 0], size: [24, 24, 82] },
      { center: [0, 23, 36], size: [21, 22, 22] },
    ]);
    const hull = g.root.userData.dutchmanArt.hull;
    const mesh = new T.Mesh(
      hull.geometry,
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    );
    mesh.updateMatrixWorld();
    const ray = new T.Raycaster(
      new T.Vector3(4.2, 100, 36),
      new T.Vector3(0, -1, 0),
    );
    const floor = ray.intersectObject(mesh)[0];
    assert.ok(floor);
    assert.ok(
      Math.abs(g.captain.root.position.y - floor.point.y) < 0.12,
      "Captain feet are supported by visible stern deck",
    );
    for (const p of g.muzzles) {
      assert.ok(Math.abs(p.x) > hull.geometry.boundingBox.max.x);
      assert.equal(p.y, 8);
    }
    mesh.material.dispose();
  } finally {
    f.dispose();
  }
});

test("Seven HF sails share an owned surface with a top attachment and independent transforms", () => {
  const a = createBermudaFleet(new T.Scene()),
    b = createBermudaFleet(new T.Scene());
  const g = a.ghost.root.userData.dutchmanArt,
    other = b.ghost.root.userData.dutchmanArt;
  let geo = 0,
    mat = 0;
  for (const x of g.assets) {
    x.geometry.addEventListener("dispose", () => geo++);
    x.material.addEventListener("dispose", () => mat++);
  }
  assert.equal(g.hull.geometry, other.hull.geometry);
  const sail = a.ghost.sails[0];
  for (const s of a.ghost.sails) {
    assert.equal(s.geometry, sail.geometry);
    assert.ok(s.geometry.boundingBox.max.y === 0);
    assert.ok(s.geometry.boundingBox.min.y === -1);
  }
  b.update(1);
  const before = b.ghost.sails.map((s) => s.matrixWorld.toArray());
  a.update(3);
  assert.deepEqual(
    b.ghost.sails.map((s) => s.matrixWorld.toArray()),
    before,
  );
  a.dispose();
  a.dispose();
  assert.equal(geo, 0);
  assert.equal(mat, 0);
  b.dispose();
  b.dispose();
  assert.equal(geo, 2);
  assert.equal(mat, 2);
  const next = acquireDutchmanAsset("hull");
  assert.notEqual(next.geometry, g.hull.geometry);
  next.release();
});

test("Ghost HF surfaces keep finite normals and colored fallback within the agreed mesh budget", () => {
  for (const kind of ["hull", "sail"]) {
    const a = acquireDutchmanAsset(kind);
    try {
      const g = a.geometry;
      assert.ok(g.index.count / 3 < (kind === "hull" ? 40000 : 6000));
      assert.equal(g.attributes.position.count, g.attributes.color.count);
      for (const k of ["position", "normal", "uv", "color"])
        assert.ok([...g.attributes[k].array].every(Number.isFinite));
      for (let i = 0; i < g.attributes.normal.count; i++)
        assert.ok(
          Math.abs(
            new T.Vector3()
              .fromBufferAttribute(g.attributes.normal, i)
              .length() - 1,
          ) < 0.002,
        );
      assert.ok(!a.material.map);
      assert.ok(a.material.vertexColors);
    } finally {
      a.release();
    }
  }
});
