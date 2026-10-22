import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { acquireAtlantisQuestAsset } from "../src/atlantis_quest_asset.js";
import { createAtlantisRelic } from "../src/atlantis_relic.js";

test("Quest skins share bounded finite geometry and retain colored fallback before texture readiness", () => {
  for (const kind of ["sluice", "key", "plaque", "chest"]) {
    const a = acquireAtlantisQuestAsset(kind),
      b = acquireAtlantisQuestAsset(kind),
      mesh = a.create();
    try {
      assert.equal(mesh.geometry, b.create().geometry);
      assert.equal(a.material, b.material);
      assert.equal(a.material.vertexColors, true);
      assert.equal(a.material.map, null);
      const g = mesh.geometry;
      for (const attr of Object.values(g.attributes))
        assert.ok(attr.array.every(Number.isFinite));
      assert.equal(g.attributes.uv.count, g.attributes.position.count);
      assert.ok(new Set(g.attributes.color.array).size > 32);
      assert.ok((g.index?.count ?? g.attributes.position.count) / 3 < 12000);
      assert.equal(g.attributes.skinIndex, undefined);
    } finally {
      a.release();
      b.release();
    }
  }
});

test("Quest skin ownership releases only after the last owner and can be recreated", () => {
  for (const kind of ["sluice", "key", "plaque", "chest"]) {
    const a = acquireAtlantisQuestAsset(kind),
      b = acquireAtlantisQuestAsset(kind),
      old = a.create().geometry;
    let geometryReleased = 0,
      materialReleased = 0;
    old.addEventListener("dispose", () => geometryReleased++);
    a.material.addEventListener("dispose", () => materialReleased++);
    a.release();
    a.release();
    assert.deepEqual([geometryReleased, materialReleased], [0, 0]);
    b.release();
    b.release();
    assert.deepEqual([geometryReleased, materialReleased], [1, 1]);
    const c = acquireAtlantisQuestAsset(kind);
    assert.notEqual(c.create().geometry, old);
    c.release();
  }
});

test("Closed chest sections meet at the existing hinge plane without changing the capture point", () => {
  const r = createAtlantisRelic(new THREE.Scene());
  try {
    const lower = r.root.getObjectByName("atlantis_quest_chest_0_hf"),
      upper = r.root.getObjectByName("atlantis_quest_chest_1_hf"),
      lid = r.root.getObjectByName("sacred_chest_lid");
    assert.deepEqual(lid.position.toArray(), [0, 5.6, 2.35]);
    const seam = (mesh, offset) => {
      const p = mesh.geometry.attributes.position,
        s = new Set();
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(p.getY(i) + offset[1] - 5.6) < 1e-5)
          s.add(
            [p.getX(i) + offset[0], p.getZ(i) + offset[2]]
              .map((v) => v.toFixed(4))
              .join(","),
          );
      }
      return s;
    };
    const a = seam(lower, [0, 0, 0]),
      b = seam(upper, lid.position.toArray());
    assert.ok(a.size > 100);
    assert.deepEqual(a, b);
    r.root.updateMatrixWorld(true);
    assert.deepEqual(
      r.root
        .getObjectByName("sacred_pearl")
        .getWorldPosition(new THREE.Vector3())
        .toArray(),
      [0, -699, -922],
    );
  } finally {
    r.dispose();
  }
});

test("Chest lining stays behind the generated front relief and closes the interior", () => {
  const r = createAtlantisRelic(new THREE.Scene());
  try {
    r.root.position.set(0, 0, 0);
    r.root.updateMatrixWorld(true);
    for (const x of [0, 1, 2]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, 4, -10),
        new THREE.Vector3(0, 0, 1),
      );
      const hits = ray.intersectObject(r.root, true);
      assert.equal(hits[0].object.name, "atlantis_quest_chest_0_hf");
    }
    r.setState({ relicUnlocked: true, relicCollected: false });
    r.update(1, new THREE.Vector3(0, 0, 0), true);
    r.root.updateMatrixWorld(true);
    const inside = new THREE.Raycaster(
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0, -1, 0),
    );
    const hit = inside.intersectObject(r.root, true)[0];
    assert.ok(hit.point.y > 2.7 && hit.point.y < 3);
  } finally {
    r.dispose();
  }
});
