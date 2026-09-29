import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import * as THREE from "three";
import { cityArchitecture } from "../src/atlantis_architecture.js";
import { pearlHabitat } from "../src/atlantis_pearl.js";

const triangles = (kit) =>
  kit.parts.reduce(
    (sum, { geometry }) =>
      sum + (geometry.index?.count ?? geometry.attributes.position.count) / 3,
    0,
  );

// 修改前记录的碰撞签名；三角预算覆盖所有受影响套件，防止壁龛误用完整路标网格。
const BUDGETS = [
  [
    "courtyard",
    22064,
    "9286cb8826402fa2c1950d62e20ad2531afe910ac675f2bd25bbca1874186885",
  ],
  [
    "villa",
    5888,
    "0bd1d945d34d4aae79ed410b3a15179e92467b0123ece3e4161384192d4b906a",
  ],
  [
    "stoa",
    25832,
    "e7192c995700fed9bd8ecf6851afc2be19d0a1e8ae8218e7050f84e9a81ab9eb",
  ],
  [
    "rotunda",
    15848,
    "36ef4dfd3307070047fba6ba7333229df76d5cd4a86bf3576a029a2161a056f2",
  ],
  [
    "tower",
    13612,
    "337645dacd020848f64ffbcaf9162b9f4a4ac25b1e31885034bb16ebd1b89ed3",
  ],
  [
    "gateway",
    22012,
    "b7863105a7b69e1f0f04eda33417c608cb75f21b6eaa46752a3a836785f1b7cb",
  ],
  [
    "temple",
    62996,
    "a78950fb3b6514bf5421a7fc7fac8f27b0a4dd65de4ff651bc3e5551741518e0",
  ],
  [
    "column",
    984,
    "e583e92ee12eae1e86a08b9daa242fd58f0cc302b18ac51d1c9b54a66ab3bbdc",
  ],
];

test("architecture stays within geometry budgets with unchanged collision", () => {
  for (const [kind, budget, signature] of BUDGETS) {
    const kit = cityArchitecture(kind);
    assert.equal(triangles(kit), budget, kind);
    assert.equal(
      createHash("sha256").update(JSON.stringify(kit.colliders)).digest("hex"),
      signature,
      `${kind} collision changed`,
    );
    for (const { geometry } of kit.parts) {
      assert.ok(
        geometry.attributes.position.array.every(Number.isFinite),
        kind,
      );
      assert.ok(geometry.attributes.normal.array.every(Number.isFinite), kind);
    }
  }
});

test("compact niches share resources without changing the full landmark pearl", () => {
  const full = pearlHabitat();
  const niche = pearlHabitat({ detail: "niche" });
  assert.equal(full, cityArchitecture("pearl"));
  assert.equal(full, pearlHabitat({ detail: "full" }));
  assert.equal(niche, pearlHabitat({ detail: "niche" }));
  assert.equal(triangles(full), 16904);
  assert.equal(triangles(niche), 8128);
  assert.deepEqual(niche.colliders, full.colliders);
  assert.equal(niche.parts.length, full.parts.length);
  for (let i = 0; i < full.parts.length; i++) {
    assert.equal(niche.parts[i].material, full.parts[i].material);
    assert.notEqual(niche.parts[i].geometry, full.parts[i].geometry);
    assert.ok(
      niche.parts[i].geometry.attributes.normal.array.every(Number.isFinite),
    );
  }
});

test("niche shells retain every angular rib and keep surface error below 6 mm at actual scale", () => {
  const full = pearlHabitat();
  const niche = pearlHabitat({ detail: "niche" });
  for (let part = 0; part < 4; part++) {
    const a = full.parts[part].geometry.attributes.position;
    const b = niche.parts[part].geometry.attributes.position;
    for (let row = 0; row <= 24; row++) {
      for (let col = 0; col <= 72; col++) {
        const original = new THREE.Vector3().fromBufferAttribute(
          a,
          row * 73 + col,
        );
        const lower = new THREE.Vector3().fromBufferAttribute(
          b,
          Math.floor(row / 2) * 73 + col,
        );
        const upper = new THREE.Vector3().fromBufferAttribute(
          b,
          Math.ceil(row / 2) * 73 + col,
        );
        const sampled = lower.lerp(upper, row % 2 ? 0.5 : 0);
        if (row % 2 === 0) assert.equal(sampled.distanceTo(original), 0);
        assert.ok(original.distanceTo(sampled) * 0.38 < 0.006);
      }
    }
  }
});

test("rendered column keeps smooth entasis within 1 cm and preserves the capital silhouette", () => {
  const kit = cityArchitecture("column");
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const meshes = kit.parts.map(
    ({ geometry }) => new THREE.Mesh(geometry, material),
  );
  const ray = new THREE.Raycaster();
  let worst = 0;
  // 从真实合并网格射线取柱身半径，再与原来的解析收分曲线比较。
  for (let i = 0; i <= 120; i++) {
    const y = 0.15 + (13.6 * i) / 120;
    const middle = 17 * 0.48;
    const t = y < middle ? y / middle : (y - middle) / (14.6 - middle);
    const smooth = t * t * (3 - 2 * t);
    const r =
      y < middle ? 1.4 * (1 - 0.06 * smooth) : 1.4 * (0.94 - 0.16 * smooth);
    ray.set(new THREE.Vector3(5, y + 1.2, 0), new THREE.Vector3(-1, 0, 0));
    const hit = ray.intersectObjects(meshes, false)[0];
    assert.ok(hit);
    worst = Math.max(worst, Math.abs(hit.point.x - r * 1.07));
  }
  assert.ok(worst < 0.01, `Column profile error: ${worst}`);
  const bounds = new THREE.Box3();
  for (const { geometry } of kit.parts) {
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox);
  }
  assert.ok(Math.abs(bounds.max.x - 2.1) < 1e-6);
  assert.ok(Math.abs(bounds.max.y - 17.03069496154785) < 1e-6);
  assert.ok(Math.abs(bounds.max.z - 1.96) < 1e-6);
  material.dispose();
});
