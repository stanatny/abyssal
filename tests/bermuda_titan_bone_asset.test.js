import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import packed from "../src/assets/models/bermuda_titan_bones_hf_mesh.json" with { type: "json" };
import { acquireBermudaTitanBoneAsset } from "../src/bermuda_titan_bone_asset.js";

const inContact = (p, c, margin = 0) =>
    c.center.every((v, axis) => Math.abs(p[axis] - v) <= c.half[axis] + margin),
  sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

test("Titan bones retain real indexed hollow geometry and a bounded far LOD", () => {
  const asset = acquireBermudaTitanBoneAsset();
  try {
    const { geometry, farGeometry } = asset,
      size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.z - 1) < 0.002);
    assert.ok(size.x > 0.45 && size.x < 0.65);
    assert.ok(size.y > 0.18 && size.y < 0.35);
    assert.ok(geometry.index.count / 3 <= 18000);
    assert.ok(farGeometry.index.count / 3 <= 3100);
    assert.ok(farGeometry.index.count < geometry.index.count * 0.2);
    assert.equal(farGeometry.attributes.position, geometry.attributes.position);
    assert.equal(farGeometry.attributes.color, geometry.attributes.color);
    assert.equal(geometry.attributes.skinIndex, undefined);
    for (const name of ["position", "normal", "uv", "color"])
      assert.ok([...geometry.attributes[name].array].every(Number.isFinite));
    for (const geometry of [asset.geometry, asset.farGeometry]) {
      for (const index of geometry.index.array)
        assert.ok(index < geometry.attributes.position.count);
    }
  } finally {
    asset.release();
  }
});

test("The runtime preserves the original exported color and physical maps byte for byte", async () => {
  assert.deepEqual(Object.keys(packed.pbr.textures).sort(), [
    "color",
    "metallic_roughness",
  ]);
  for (const texture of Object.values(packed.pbr.textures)) {
    const bytes = await readFile(
      new URL(`../src/assets/models/${texture.file}`, import.meta.url),
    );
    assert.equal(sha(bytes), texture.sourceSha256);
    assert.equal(sha(bytes), texture.sha256);
  }
  assert.match(packed.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(packed.source, "Microsoft TRELLIS.2-4B");
});

test("Bone contacts cover the actual reduced surface without filling the rib-cage water", () => {
  const asset = acquireBermudaTitanBoneAsset();
  try {
    assert.ok(asset.contacts.length < 1000);
    assert.ok(asset.contacts.length > 100);
    const positions = asset.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const p = [positions.getX(i), positions.getY(i), positions.getZ(i)];
      assert.ok(asset.contacts.some((c) => inContact(p, c, 0.00003)));
    }
    // 逐条真实三角面测距离；必须存在胸腔内的开放水体，不能用整具盒子遮掉。
    const triangle = new THREE.Triangle(),
      point = new THREE.Vector3(),
      closest = new THREE.Vector3(),
      index = asset.geometry.index.array;
    let clear = 0;
    for (const x of [-0.12, 0, 0.12])
      for (const y of [-0.07, -0.015, 0.04])
        for (const z of [-0.3, -0.18, -0.06, 0.06]) {
          point.set(x, y, z);
          let nearest = Infinity;
          for (let t = 0; t < index.length; t += 3) {
            triangle.a.fromBufferAttribute(positions, index[t]);
            triangle.b.fromBufferAttribute(positions, index[t + 1]);
            triangle.c.fromBufferAttribute(positions, index[t + 2]);
            nearest = Math.min(
              nearest,
              triangle.closestPointToPoint(point, closest).distanceTo(point),
            );
          }
          if (nearest > 0.035) {
            assert.ok(
              !asset.contacts.some((c) => inContact(point.toArray(), c)),
            );
            clear++;
          }
        }
    assert.ok(clear >= 4, `Only ${clear} clear interior probes`);
  } finally {
    asset.release();
  }
});

test("Bone leases share immutable resources and dispose only after the last owner exits", () => {
  const a = acquireBermudaTitanBoneAsset(),
    b = acquireBermudaTitanBoneAsset();
  let disposed = 0;
  for (const resource of [a.geometry, a.farGeometry, a.material, a.farMaterial])
    resource.addEventListener("dispose", () => disposed++);
  try {
    assert.equal(a.geometry, b.geometry);
    assert.equal(a.material, b.material);
    assert.equal(a.prepare, b.prepare);
    assert.equal(a.contacts, b.contacts);
    assert.ok(Object.isFrozen(a.contacts));
    assert.ok(a.contacts.every((contact) => Object.isFrozen(contact.center)));
    a.release();
    a.release();
    assert.equal(disposed, 0);
    b.release();
    assert.equal(disposed, 4);
    const c = acquireBermudaTitanBoneAsset();
    try {
      assert.notEqual(c.geometry, a.geometry);
      assert.equal(c.material.map, null);
    } finally {
      c.release();
    }
  } finally {
    a.release();
    b.release();
  }
});

test("Original PBR preparation is shared, color-managed and released with its final lease", async () => {
  const previous = {
      window: globalThis.window,
      fetch: globalThis.fetch,
      createImageBitmap: globalThis.createImageBitmap,
    },
    a = acquireBermudaTitanBoneAsset(),
    b = acquireBermudaTitanBoneAsset();
  let requests = 0,
    closed = 0;
  globalThis.window = { addEventListener() {} };
  globalThis.fetch = async () => {
    requests++;
    return { ok: true, blob: async () => ({}) };
  };
  globalThis.createImageBitmap = async () => ({
    width: 1,
    height: 1,
    close() {
      closed++;
    },
  });
  try {
    const first = a.prepare({ priority: 100 });
    assert.equal(first, b.prepare({ priority: 100 }));
    assert.equal(await first, true);
    assert.equal(requests, 2);
    assert.equal(a.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(a.material.roughnessMap.colorSpace, THREE.NoColorSpace);
    assert.equal(a.material.metalnessMap, a.material.roughnessMap);
    assert.equal(a.material.vertexColors, false);
    assert.equal(a.farMaterial.vertexColors, true);
    assert.equal(a.farMaterial.map, null);
    assert.equal(a.material.userData.texturesReady, true);
    assert.equal(await b.prepare(), true);
    assert.equal(requests, 2);
    a.release();
    assert.equal(closed, 0);
    b.release();
    assert.equal(closed, 2);
  } finally {
    a.release();
    b.release();
    for (const [name, value] of Object.entries(previous))
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
  }
});
