import test from "node:test";
import assert from "node:assert/strict";
import { WORLD } from "../src/world_config.js";
import { seabedHeight } from "../src/ocean.js";
import {
  ATLANTIS_EXCAVATION_SITES,
  atlantisSeabedHeight,
} from "../src/atlantis_terrain.js";

const reservations = [
  { minX: -271, maxX: -159, minZ: -302.5, maxZ: -178.5 },
  { minX: 159, maxX: 271, minZ: -509.5, maxZ: -385.5 },
  { minX: -65, maxX: 65, minZ: -980, maxZ: -861 },
];

test("Regional excavation stays finite and never raises the existing floor", () => {
  let lowered = 0;
  for (let x = -298.7; x <= 300; x += 4.7)
    for (let z = -1148.3; z <= 140; z += 4.3) {
      const base = seabedHeight(x, z),
        current = atlantisSeabedHeight(x, z);
      assert.ok(Number.isFinite(current), `Finite floor at ${x}, ${z}`);
      assert.ok(current <= base, `Excavation raises floor at ${x}, ${z}`);
      if (current < base) {
        lowered++;
        assert.ok(
          current >= -WORLD.maxDepth + 30,
          "Underground water must retain adult room above the world bottom",
        );
      }
      const reserved = reservations.some(
        (r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ,
      );
      if (!reserved)
        assert.equal(current, base, "Unrelated terrain stays exact");
    }
  assert.ok(
    lowered > 100,
    "Excavation must affect real ground, not only metadata",
  );
});

test("Excavation center and edges retain a usable continuous lowest floor", () => {
  for (const site of ATLANTIS_EXCAVATION_SITES) {
    const b = site.bounds,
      centerX = (b.minX + b.maxX) / 2,
      centerZ = (b.minZ + b.maxZ) / 2;
    assert.ok(
      atlantisSeabedHeight(centerX, centerZ) <
        seabedHeight(centerX, centerZ) - 10,
      `${site.id} has underground ground`,
    );
    // 针对字段拼写错误导致 NaN、边界跳变和坑外被改写的回归。
    for (const [x, z] of [
      [b.minX, centerZ],
      [b.maxX, centerZ],
      [centerX, b.minZ],
      [centerX, b.maxZ],
    ]) {
      const center = atlantisSeabedHeight(x, z);
      for (const [dx, dz] of [
        [0.0001, 0],
        [-0.0001, 0],
        [0, 0.0001],
        [0, -0.0001],
      ]) {
        assert.ok(
          Math.abs(atlantisSeabedHeight(x + dx, z + dz) - center) < 0.01,
          `${site.id} continuous boundary at ${x}, ${z}`,
        );
      }
    }
  }
});

test("Shared excavation metadata cannot be changed by scene construction", () => {
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) visit(child);
  };
  visit(ATLANTIS_EXCAVATION_SITES);
  const original = ATLANTIS_EXCAVATION_SITES[0].bounds.minX;
  assert.throws(() => {
    ATLANTIS_EXCAVATION_SITES[0].bounds.minX = 99;
  }, TypeError);
  assert.equal(ATLANTIS_EXCAVATION_SITES[0].bounds.minX, original);
});
