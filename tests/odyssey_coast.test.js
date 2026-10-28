import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createOdysseyCoast, troyTerraceHeight } from "../src/odyssey_coast.js";
import { createOdysseyCoastAssets } from "../src/odyssey_coast_asset.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
function fixture(loadAssets = async () => ({ createOdysseyCoastAssets })) {
  const resources = new Set(),
    parent = new THREE.Group();
  const coast = createOdysseyCoast(parent, (r) => (resources.add(r), r), {
    loadAssets,
  });
  return {
    coast,
    parent,
    resources,
    dispose() {
      parent.traverse((n) => {
        if (n.isInstancedMesh) n.dispose();
      });
      for (const r of resources) r.dispose();
      resources.clear();
    },
  };
}
test("Troy buildings occupy the west bay inside world bounds and use bounded shared batches", async () => {
  const f = fixture();
  try {
    await f.coast.prepare();
    assert.equal(f.coast.state.state, "ready");
    f.parent.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(f.coast.root);
    assert.ok(
      bounds.min.x >= -300 &&
        bounds.max.x < -70 &&
        bounds.min.z >= -200 &&
        bounds.max.z < 140,
      `inshore bounds: ${bounds.min.toArray()} / ${bounds.max.toArray()}`,
    );
    const meshes = [];
    f.coast.root.traverse((n) => {
      if (n.isMesh) meshes.push(n);
    });
    assert.equal(meshes.length, 9);
    assert.equal(meshes.filter((n) => n.isInstancedMesh).length, 6);
    for (const { geometry, material, packed } of Object.values(
      f.coast.state.assets,
    )) {
      assert.equal(packed.source, "Microsoft TRELLIS.2-4B");
      assert.match(packed.sourceSha256, /^[a-f0-9]{64}$/);
      assert.ok(geometry.index.count / 3 < 39000);
      assert.ok(
        Math.max(...geometry.index.array) < geometry.attributes.position.count,
      );
      assert.ok(geometry.attributes.position.array.every(Number.isFinite));
      assert.ok(new Set(geometry.attributes.color.array).size > 30);
      assert.equal(geometry.boundingBox.min.y, 0);
      assert.equal(material.vertexColors, true);
      assert.equal(material.map, null);
    }
  } finally {
    f.dispose();
  }
});
test("Late coast module completion after departure creates no assets or nodes", async () => {
  let resolve,
    created = 0;
  const f = fixture(() => new Promise((r) => (resolve = r)));
  const pending = f.coast.prepare();
  f.dispose();
  resolve({
    createOdysseyCoastAssets() {
      created++;
      throw Error("must not allocate");
    },
  });
  await pending;
  assert.equal(created, 0);
  assert.equal(f.parent.children.length, 0);
  assert.equal(f.resources.size, 0);
});
test("Coast retries a failed import, does not load at depth, and updates effects only through ocean time", async () => {
  let attempts = 0;
  const f = fixture(async () => {
    if (++attempts === 1) throw Error("offline");
    return { createOdysseyCoastAssets };
  });
  try {
    f.coast.update(
      0,
      new THREE.Vector3(0, -220, -500),
      new THREE.Vector3(0, -210, -500),
    );
    assert.equal(attempts, 0);
    await f.coast.prepare(0);
    assert.equal(f.coast.state.state, "error");
    await f.coast.prepare(2);
    assert.equal(attempts, 1);
    await f.coast.prepare(6);
    assert.equal(f.coast.state.state, "ready");
    assert.equal(attempts, 2);
    f.coast.update(
      10,
      new THREE.Vector3(0, -2, 75),
      new THREE.Vector3(0, 9, 75),
      true,
      true,
    );
    const fx = f.coast.root.getObjectByName("troy_bounded_embers");
    assert.equal(fx.children[1].count, 24);
    assert.equal(fx.children[0].material.uniforms.coastTime.value, 10);
    f.coast.update(
      10,
      new THREE.Vector3(0, -2, 75),
      new THREE.Vector3(0, 9, 75),
      false,
      true,
    );
    assert.equal(fx.children[1].count, 12);
    assert.equal(fx.children[0].material.uniforms.coastTime.value, 10);
    f.coast.update(
      11,
      new THREE.Vector3(0, -220, -500),
      new THREE.Vector3(0, -210, -500),
      true,
      false,
    );
    assert.equal(f.coast.root.visible, false);
  } finally {
    f.dispose();
  }
});
test("Ocean owns coast allocations and releases them once on repeated disposal", async () => {
  const parent = new THREE.Group(),
    ocean = createOdysseyOcean(parent);
  await ocean.coast.prepare();
  const counts = new Map();
  ocean.coast.root.traverse((n) => {
    if (!n.isMesh) return;
    for (const r of [n.geometry, n.material, ...(n.isInstancedMesh ? [n] : [])])
      if (!counts.has(r)) {
        counts.set(r, 0);
        r.addEventListener("dispose", () => counts.set(r, counts.get(r) + 1));
      }
  });
  assert.ok(ocean.colliders.some((c) => c.kind === "troy_coastal_boundary"));
  ocean.dispose();
  ocean.dispose();
  assert.equal(parent.children.length, 0);
  for (const count of counts.values()) assert.equal(count, 1);
});

test("Ruined districts and gates have supported feet across their final rotated footprint", async () => {
  const f = fixture();
  try {
    await f.coast.prepare();
    const v = new THREE.Vector3();
    for (const m of f.coast.state.instances) {
      if (m.name === "troy_broken_quay") continue;
      m.updateMatrix();
      for (let i = 0; i < m.geometry.attributes.position.count; i++) {
        v.fromBufferAttribute(m.geometry.attributes.position, i);
        if (v.y > 0.018) continue;
        v.applyMatrix4(m.matrix);
        const delta = m.position.y - troyTerraceHeight(v.x, v.z);
        assert.ok(
          delta <= 0.6 && delta >= -0.6,
          `${m.name}: support gap ${delta}`,
        );
      }
    }
  } finally {
    f.dispose();
  }
});

test("Inshore land stops juvenile and adult underwater approaches without closing the adjacent lane", async () => {
  const { resolveMotion, bodyRadius } = await import("../src/collision.js");
  const ocean = createOdysseyOcean(new THREE.Group());
  try {
    for (const length of [3, 30])
      for (const z of [-140, -50, 20]) {
        const radius = bodyRadius(length);
        const options = {
          colliders: ocean.colliders,
          length,
          radius,
          forward: { x: -1, y: 0, z: 0 },
          floorHeight: (x, z) => ocean.heightAt(x, z) + radius + 0.4,
          bounds: { maxY: 4 - length * 0.15 },
        };
        const result = resolveMotion(
          { x: -30, y: -8, z },
          { x: -200, y: -8, z },
          options,
        );
        assert.equal(result.blocked, true);
        assert.equal(result.stuck, false);
        assert.ok(result.position.x > -90);
        assert.ok(ocean.heightAt(result.position.x, result.position.z) < -2);
        const retreat = resolveMotion(
          result.position,
          { x: -30, y: -8, z },
          { ...options, forward: { x: 1, y: 0, z: 0 } },
        );
        assert.equal(retreat.stuck, false);
        assert.ok(Math.abs(retreat.position.x + 30) < 0.1);
      }
    // 不可登陆的背景岸地也挡住破水弹道，岸外仍可自由上升和落水。
    for (const y of [15, 45, 160]) {
      const result = resolveMotion(
        { x: -30, y, z: -50 },
        { x: -200, y, z: -50 },
        {
          colliders: ocean.colliders,
          length: 3,
          radius: bodyRadius(3),
          forward: { x: -1, y: 0, z: 0 },
        },
      );
      assert.equal(result.blocked, true);
      assert.equal(result.stuck, false);
      assert.ok(result.position.x > -90);
      assert.ok(ocean.heightAt(result.position.x, result.position.z) < -2);
    }
    const { ODYSSEY_SPECIES } = await import("../src/odyssey_species.js");
    for (const species of ODYSSEY_SPECIES)
      for (const a of species.spawnAnchors)
        assert.ok(ocean.heightAt(a[0], a[2]) < 0, `${species.kind}: dry home`);
  } finally {
    ocean.dispose();
  }
});
