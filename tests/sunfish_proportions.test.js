import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
import source from "../src/assets/models/sunfish_hf_mesh.json" with { type: "json" };

test("Sunfish is laterally compressed without changing its side outline, UVs or face count", () => {
  const model = createCreature("sunfish", 1, 31);
  const mesh = model.userData.hfRig.mesh;
  const original = decodeOrganicMesh(source, null, (x, y, z, color) =>
    color.set(0xffffff),
  );
  const p = mesh.geometry.attributes.position;
  const old = original.attributes.position;
  assert.equal(p.count, old.count);
  assert.deepEqual(mesh.geometry.index.array, original.index.array);
  assert.deepEqual(
    mesh.geometry.attributes.uv.array,
    original.attributes.uv.array,
  );
  let maxWidth = 0,
    oldWidth = 0;
  for (let i = 0; i < p.count; i++) {
    assert.equal(p.getY(i), old.getY(i));
    assert.equal(p.getZ(i), old.getZ(i));
    maxWidth = Math.max(maxWidth, Math.abs(p.getX(i)));
    oldWidth = Math.max(oldWidth, Math.abs(old.getX(i)));
    assert.ok(
      Math.abs(
        new THREE.Vector3()
          .fromBufferAttribute(mesh.geometry.attributes.normal, i)
          .length() - 1,
      ) < 0.002,
    );
  }
  assert.ok(maxWidth / oldWidth > 0.6 && maxWidth / oldWidth < 0.72);
  // 鳍根仍贴在缩窄后的胸部，不能留在原先的宽体外面。
  for (const c of model.userData.hfRig.chains.filter(
    (c) => c.type === "pectoral",
  )) {
    assert.ok(Math.abs(c.points[0][0]) < 0.14);
    assert.ok(Math.abs(c.points[0][0]) > 0.11);
  }
  original.dispose();
  model.userData.disposeLocalMotion();
});
