import test from "node:test";
import assert from "node:assert/strict";
import { getExpedition } from "../src/expedition_config.js";
import { cityLightBlend, regionZone } from "../src/region_appearance.js";
import { getZone } from "../src/simulation.js";
import { isNursery } from "../src/nursery_rules.js";
import { seabedHeight } from "../src/ocean.js";
import { WORLD } from "../src/world_config.js";
import {
  ATLANTIS_DISTRICTS,
  atlantisDistrict,
} from "../src/atlantis_city_plan.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";

test("Regional names preserve shared depth boundaries and Hawaii presentation", () => {
  for (const depth of [0, 18, 89.99, 90, 249.99, 250, 499.99, 500, 740]) {
    const original = getZone(depth);
    assert.equal(regionZone("hawaii", depth), original);
    const atlantis = regionZone("atlantis", depth);
    assert.equal(atlantis.id, original.id);
    assert.equal(atlantis.maxDepth, original.maxDepth);
    assert.equal(atlantis.color, original.color);
    assert.notEqual(atlantis.name, original.name);
    assert.notEqual(atlantis.description, original.description);
    assert.match(atlantis.code, /^[A-Z ]+$/);
  }
  assert.deepEqual(
    [18, 150, 350, 600].map((depth) => regionZone("atlantis", depth).name),
    ["月辉浅滩", "沉没外城", "波塞冬古城", "星渊裂谷"],
  );
});

test("Both juvenile characters spawn above the floor in the shared safe nursery", () => {
  for (const regionId of ["hawaii", "atlantis"]) {
    for (const characterId of ["orca", "squid"]) {
      const { region, character } = getExpedition(regionId, characterId);
      const [x, y, z] = region.spawn;
      assert.ok(region.spawn.every(Number.isFinite));
      assert.ok(x > WORLD.minX && x < WORLD.maxX);
      assert.ok(z > WORLD.minZ && z < WORLD.maxZ);
      assert.ok(y < WORLD.surfaceY);
      assert.ok(isNursery({ x, y, z }));
      assert.ok(y > seabedHeight(x, z) + character.startLength);
    }
  }
});

test("All five real districts retain geographical labels without changing survival depth bands", () => {
  for (const district of ATLANTIS_DISTRICTS) {
    const z = (district.z0 + district.z1) / 2;
    for (const x of [-230, 0, 230]) {
      const depth = -seabedHeight(x, z) - 15;
      const position = { x, y: -depth, z };
      const zone = regionZone("atlantis", depth, position);
      assert.equal(zone.name, district.name);
      assert.equal(zone.code, district.en);
      assert.equal(zone.id, getZone(depth).id);
      assert.equal(zone.maxDepth, getZone(depth).maxDepth);
      assert.equal(regionZone("hawaii", depth, position), getZone(depth));
    }
  }
  assert.equal(
    regionZone("atlantis", 50, { x: 0, y: -50, z: -775 }).name,
    "月辉浅滩",
  );
  assert.equal(atlantisDistrict(280, -735), null);
  assert.equal(atlantisDistrict(0, 75), null);
  assert.equal(
    regionZone("atlantis", 710, { x: 0, y: -710, z: -1140 }).name,
    "星渊裂谷",
  );
});

test("Kraken guards the lit city at a valid deep-water home, away from the nursery", () => {
  const { region } = getExpedition("atlantis");
  const kraken = BOSS_SPECIES.find((entry) => entry.kind === "kraken");
  assert.deepEqual(region.bossKinds, [kraken.kind]);
  const [x, y, z] = region.bossHomes.kraken;
  assert.ok(region.bossHomes.kraken.every(Number.isFinite));
  assert.ok(x > WORLD.minX + kraken.length && x < WORLD.maxX - kraken.length);
  assert.ok(z > WORLD.minZ + kraken.length && z < WORLD.maxZ - kraken.length);
  assert.ok(-y >= kraken.depthMin && -y <= kraken.depthMax);
  assert.ok(y > seabedHeight(x, z) + kraken.length * 0.25);
  assert.equal(isNursery({ x, y, z }), false);
  assert.ok(cityLightBlend({ x, y, z }) > 0.9);
  assert.equal(kraken.minAttackLength, 25);
  assert.ok(kraken.length > 30);
  assert.equal(region.seabedHeat, false);
  assert.equal(getExpedition("hawaii").region.seabedHeat, true);
});

test("City lighting is localized, continuous, and bounded across the playable world", () => {
  assert.equal(cityLightBlend({ x: 0, y: -420, z: -745 }), 1);
  assert.equal(cityLightBlend({ x: 0, y: -18, z: 75 }), 0);
  assert.equal(cityLightBlend({ x: 0, y: -100, z: -745 }), 0);
  assert.equal(cityLightBlend({ x: 300, y: -600, z: -745 }), 0);
  assert.equal(cityLightBlend({ x: 0, y: -700, z: -1140 }), 0);
  const transition = cityLightBlend({ x: 150, y: -300, z: -745 });
  assert.ok(transition > 0 && transition < 1);
  for (const district of ATLANTIS_DISTRICTS) {
    const z = (district.z0 + district.z1) / 2;
    const depth = Math.max(130, -seabedHeight(0, z) - 15);
    assert.ok(
      cityLightBlend({ x: 0, y: -depth, z }) > 0.05,
      `${district.id} has local light support`,
    );
  }
  assert.ok(
    cityLightBlend({ x: 0, y: -500, z: -800 }) >
      cityLightBlend({ x: 250, y: -500, z: -800 }),
    "Avenue stays brighter than outer dark streets",
  );
  for (let x = -300; x <= 300; x += 30) {
    for (let z = -1150; z <= 140; z += 30) {
      for (const y of [-18, -240, -300, -370, -600]) {
        const value = cityLightBlend({ x, y, z });
        assert.ok(value >= 0 && value <= 1);
        for (const next of [
          { x: x + 0.1, y, z },
          { x, y: y + 0.1, z },
          { x, y, z: z + 0.1 },
        ]) {
          assert.ok(Math.abs(value - cityLightBlend(next)) < 0.003);
        }
      }
    }
  }
});
