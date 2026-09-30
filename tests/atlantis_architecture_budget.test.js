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

// 经屋顶行为回归核对的碰撞体九位小数签名；保留结构与顺序，忽略不同平台三角函数的末位浮点差异。
// 1e-9 世界单位远小于网格精度与碰撞接触容差，不改变运行时几何。
const BUDGETS = [
  [
    "courtyard",
    22136,
    "7c79fc450908ab479ee46d3eec50a8c779977c9a13fefdf63b817fe9347ebb28",
  ],
  [
    "villa",
    5888,
    "9c0ff196f9975658cad102351845e1777915be553e1e63af6ea08915152ced4d",
  ],
  [
    "stoa",
    25832,
    "ca4d54ed3ddee40dced024067aa13e7d574195f26ae6f22ec9e16a98df7d063b",
  ],
  [
    "rotunda",
    15848,
    "adc1accab690982ae6960afd88b7cbd97e89c2c76e0beef8fb4cf8212614b3cf",
  ],
  [
    "tower",
    13612,
    "a4a8c57e0ee2deb4160037f71ef91f6f62c21116969f4f8a1343207641d7e9e9",
  ],
  [
    "gateway",
    22012,
    "d89d0120116d8758842be3657bea0f26d4c302a420d4465ae67fd2962e31cee9",
  ],
  [
    "temple",
    63068,
    "f4b165d0abacce65afdf3f91b45b3767aca17b6e83b748940c444f988f243ee3",
  ],
  [
    "column",
    984,
    "e583e92ee12eae1e86a08b9daa242fd58f0cc302b18ac51d1c9b54a66ab3bbdc",
  ],
];

test("architecture stays within reviewed geometry and collision budgets", () => {
  for (const [kind, budget, signature] of BUDGETS) {
    const kit = cityArchitecture(kind);
    assert.equal(triangles(kit), budget, kind);
    assert.equal(
      collisionSignature(kit.colliders),
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

/** 仅规范测试快照的浮点表示；非有限数值必须失败，不能被 JSON 静默转成 null。 */
function collisionSignature(colliders) {
  const canonical = JSON.stringify(colliders, (_, value) => {
    if (typeof value !== "number") return value;
    assert.ok(Number.isFinite(value), "Collider values must be finite");
    return Number(value.toFixed(9));
  });
  return createHash("sha256").update(canonical).digest("hex");
}

test("collision snapshots ignore floating-point noise but detect geometry and ordering changes", () => {
  const original = cityArchitecture("rotunda").colliders;
  const signature = collisionSignature(original);
  for (const [kind, , expected] of BUDGETS) {
    for (const noise of [-1e-13, 1e-13]) {
      const roundoff = JSON.parse(
        JSON.stringify(cityArchitecture(kind).colliders, (_, value) =>
          typeof value === "number" ? value + noise : value,
        ),
      );
      assert.equal(collisionSignature(roundoff), expected, kind);
    }
  }
  for (const change of [
    (c) => {
      c[0].x += 1e-5;
    },
    (c) => {
      c[0].halfSize.z += 1e-5;
    },
    (c) => {
      c.find((collider) => collider.rotation).rotation.w += 1e-5;
    },
    (c) => {
      c[0].type = "sphere";
    },
    (c) => {
      [c[0], c[1]] = [c[1], c[0]];
    },
    (c) => {
      c.pop();
    },
  ]) {
    const changed = structuredClone(original);
    change(changed);
    assert.notEqual(collisionSignature(changed), signature);
  }
  for (const invalid of [NaN, Infinity, -Infinity]) {
    const changed = structuredClone(original);
    changed[0].x = invalid;
    assert.throws(() => collisionSignature(changed), /must be finite/);
  }
});
