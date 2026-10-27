import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { createPenglaiTempleAsset } from "../src/penglai_temple_asset.js";

test("Temple/Bixi carved contacts cover final surfaces and keep roof cells local", () => {
  for (const kind of [
    "temple_roof",
    "bixi_bearer",
    "bixi_crown",
    "temple_lattice",
    "temple_pillar",
    "temple_pine",
    "temple_balustrade",
    "sword_pedestal",
    "temple_censer",
  ]) {
    const owned = new Set(),
      a = createPenglaiTempleAsset(kind, (r) => (owned.add(r), r));
    try {
      assert.equal(a.packed.source, "Microsoft TRELLIS.2-4B");
      assert.match(a.packed.sourceSha256, /^[0-9a-f]{64}$/);
      const p = a.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const v = [p.getX(i), p.getY(i), p.getZ(i)];
        assert.ok(
          a.packed.contacts.some((c) =>
            v.every((x, j) => x >= c.min[j] - 2e-5 && x <= c.max[j] + 2e-5),
          ),
          `${kind} surface ${i}`,
        );
      }
      if (kind === "temple_roof")
        for (const c of a.packed.contacts) {
          for (const axis of [0, 2])
            assert.ok(
              c.max[axis] - c.min[axis] <
                (a.packed.max[axis] - a.packed.min[axis]) / 15.9,
            );
        }
      assert.ok(a.packed.triangles <= 17000);
      assert.ok(
        new Set(a.geometry.attributes.color.array).size >
          (kind === "temple_lattice" ? 12 : 30),
      );
    } finally {
      owned.forEach((r) => r.dispose());
    }
  }
});

test("Two roof tiers share per-region resources without changing other landmark and temple shells", () => {
  const o = createPenglaiOcean(new THREE.Group());
  try {
    const ms = [];
    o.root.traverse((n) => {
      if (n.userData.hfTempleKind && !n.userData.smallPavilion) ms.push(n);
    });
    assert.equal(ms.length, 12);
    const lattice = ms.find(
      (m) => m.userData.hfTempleKind === "temple_lattice",
    );
    assert.ok(lattice.isInstancedMesh);
    assert.equal(lattice.count, 38);
    assert.ok(lattice.geometry.index.count / 3 <= 5500);
    const roofs = ms.filter((n) => n.userData.hfTempleKind === "temple_roof");
    assert.equal(roofs[0].geometry, roofs[1].geometry);
    assert.equal(roofs[0].material, roofs[1].material);
    for (const m of ms) {
      assert.equal(m.material.transparent, false);
      assert.equal(m.material.depthWrite, true);
      assert.equal(m.material.vertexColors, true);
      assert.equal(m.material.map, null);
      assert.equal(typeof m.userData.prepareMaterials, "function");
    }
    for (const k of [
      "monastery_side_wall",
      "monastery_platform",
      "monastery_entrance_step",
      "bixi_stele",
      "bixi_foundation",
    ])
      assert.ok(o.colliders.some((c) => c.kind === k));
    for (const name of [
      "azure_cloud_gate",
      "tiger_watchtowers",
      "vermilion_sun_altar",
    ])
      assert.ok(o.root.getObjectByName(name));
    const owned = new Set(ms.flatMap((m) => [m.geometry, m.material]));
    let disposed = 0;
    for (const r of owned) r.addEventListener("dispose", () => disposed++);
    o.dispose();
    o.dispose();
    assert.equal(disposed, owned.size);
  } finally {
    o.dispose();
  }
});

test("Roof supports meet the final underside rather than stopping at the old flat eave", () => {
  const o = createPenglaiOcean(new THREE.Group());
  try {
    const roofs = o.root.getObjectsByProperty("name", "penglai_hf_temple_roof");
    o.root.updateMatrixWorld(true);
    const supports = o.colliders.filter(
      (c) => c.kind === "monastery_roof_support",
    );
    assert.ok(supports.length >= 10);
    for (const c of supports) {
      const base = c.y - c.halfSize.y;
      const ray = new THREE.Raycaster(
        new THREE.Vector3(c.x, base, c.z),
        new THREE.Vector3(0, 1, 0),
        0,
        15,
      );
      const side = roofs[0].material.side;
      roofs[0].material.side = THREE.DoubleSide;
      const hits = ray.intersectObjects(roofs);
      roofs[0].material.side = side;
      assert.ok(hits.length > 0);
      assert.ok(Math.abs(hits[0].point.y - (c.y + c.halfSize.y)) < 0.2);
    }
  } finally {
    o.dispose();
  }
});
