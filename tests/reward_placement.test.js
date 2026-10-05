import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  RANDOM_REWARD_COUNT,
  REWARD_KINDS,
  REWARD_PLACEMENT,
  REWARDS,
  STARTER_REWARDS,
} from "../src/reward_config.js";
import { randomRewardPosition } from "../src/reward_placement.js";
import { REGIONS } from "../src/expedition_config.js";
import { WORLD } from "../src/world_config.js";
import { isNursery } from "../src/nursery_rules.js";
import { isPositionBlocked } from "../src/collision.js";
import { seabedHeight } from "../src/ocean.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { marianaSeabedHeight } from "../src/mariana_config.js";
import { europaSeabedHeight } from "../src/europa_config.js";
import { amazonChannels, amazonSeabedHeight } from "../src/amazon_config.js";
import { penglaiHeightAt } from "../src/penglai_config.js";
import {
  penglaiRewardAnchor,
  PENGLAI_REWARD_HABITAT,
} from "../src/penglai_rewards.js";
import { odysseySeabedHeight } from "../src/odyssey_config.js";

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

// 与环境的河道锚点契约相同；原生验收另行覆盖运行时环境提供的真实函数。
function amazonRewardAnchor(random) {
  const z = -190 - random() * 1050,
    channel = amazonChannels(z)[random() < 0.5 ? 0 : 1],
    x = channel.center + (random() - 0.5) * 35;
  const depth = Math.min(-amazonSeabedHeight(x, z) - 12, 28 + random() * 180);
  return new THREE.Vector3(x, -depth, z);
}

const heights = {
  hawaii: seabedHeight,
  atlantis: atlantisSeabedHeight,
  bermuda: bermudaSeabedHeight,
  mariana: marianaSeabedHeight,
  amazon: amazonSeabedHeight,
  europa: europaSeabedHeight,
  penglai: penglaiHeightAt,
  odyssey: odysseySeabedHeight,
};

test("Only Supply and Flow are fixed starters; eighteen random slots remain balanced", () => {
  assert.deepEqual(
    STARTER_REWARDS.map((item) => item.kind),
    ["stamina", "flow"],
  );
  assert.equal(STARTER_REWARDS.length + RANDOM_REWARD_COUNT, 20);
  for (const kind of REWARD_KINDS)
    assert.equal(
      Array.from(
        { length: RANDOM_REWARD_COUNT },
        (_, index) => REWARD_KINDS[index % REWARD_KINDS.length],
      ).filter((entry) => entry === kind).length,
      6,
    );
  assert.equal(REWARDS.frenzy.duration, 20);
  assert.equal(REWARDS.flow.duration, 30);
});

for (const region of REGIONS)
  test(`${region.id} random rewards honor final terrain and regional bounds`, () => {
    const world = region.world || WORLD,
      heightAt = heights[region.id];
    for (const seed of [1, 5, 1729, 71523, 4294967295]) {
      const random = seededRandom(seed);
      for (let index = 0; index < RANDOM_REWARD_COUNT; index++) {
        const point = randomRewardPosition(index, {
          world,
          heightAt,
          random,
          ...(region.id === "penglai"
            ? {
                rewardAnchor: penglaiRewardAnchor,
                rewardHabitat: PENGLAI_REWARD_HABITAT,
              }
            : region.id === "amazon"
              ? { rewardAnchor: amazonRewardAnchor }
              : {}),
        });
        assert.ok(point, `${region.id}/${seed}/${index} has a legal slot`);
        assert.ok(point.x >= world.minX + 18 && point.x <= world.maxX - 18);
        assert.ok(point.z >= world.minZ + 18 && point.z <= world.maxZ - 18);
        assert.ok(point.y >= heightAt(point.x, point.z) + 3.7 - 1e-8);
        assert.ok(point.y >= -(world.maxDepth - 30));
        assert.ok(
          point.y <= (region.id === "penglai" ? world.maxAltitude : -20),
        );
        if (region.id === "amazon") {
          assert.ok(
            amazonChannels(point.z).some(
              (channel) => Math.abs(point.x - channel.center) < 100,
            ),
          );
        }
      }
    }
  });

test("A random Frenzy slot can land legally in the shallow nursery without a guaranteed starter", () => {
  let calls = 0;
  const result = randomRewardPosition(2, {
    world: WORLD,
    heightAt: () => -50,
    rewardAnchor: () => {
      calls++;
      return new THREE.Vector3(0, -500, 75);
    },
  });
  assert.ok(result);
  assert.deepEqual(result.toArray(), [0, -46.3, 75]);
  assert.equal(isNursery(result), true);
  assert.equal(calls, 1);
  assert.equal(
    STARTER_REWARDS.some((item) => item.kind === "frenzy"),
    false,
  );
  assert.equal(REWARD_KINDS[2], "frenzy");
});

test("Random placement has no near-spawn fallback when geometry leaves no legal space", () => {
  let calls = 0;
  for (let index = 0; index < REWARD_KINDS.length; index++) {
    const result = randomRewardPosition(index, {
      world: WORLD,
      heightAt: () => 10,
      rewardAnchor: () => {
        calls++;
        return new THREE.Vector3(70, -230, -500);
      },
    });
    assert.equal(result, null);
  }
  assert.equal(calls, REWARD_KINDS.length * REWARD_PLACEMENT.attempts);
});

test("Actual solid rejection can find an alternative without bypassing collision", () => {
  const colliders = [{ type: "sphere", x: 0, y: -100, z: -400, radius: 12 }];
  const point = randomRewardPosition(2, {
    world: WORLD,
    heightAt: () => -600,
    colliders,
    rewardAnchor: () => new THREE.Vector3(0, -100, -400),
  });
  assert.ok(point);
  assert.equal(isPositionBlocked(point, { radius: 0.45, colliders }), false);
  assert.equal(isNursery(point), false);
});

test("Distinct seeded rounds vary positions while equal seeds remain repeatable", () => {
  const sample = (seed) =>
    randomRewardPosition(2, {
      world: WORLD,
      heightAt: seabedHeight,
      random: seededRandom(seed),
    }).toArray();
  assert.deepEqual(sample(71), sample(71));
  assert.notDeepEqual(sample(71), sample(72));
});

test("Random rewards are not subject to an artificial distance or body-size gate", () => {
  const result = randomRewardPosition(2, {
    world: { ...WORLD, minX: -30, maxX: 30, minZ: -40, maxZ: 0 },
    heightAt: () => -110,
    rewardAnchor: () => new THREE.Vector3(0, -80, -30),
  });
  assert.equal(isNursery({ x: 0, y: -80, z: -30 }), false);
  assert.deepEqual(result.toArray(), [0, -80, -22]);
});

test("An unavailable regional reward route is omitted rather than sampled in a different medium", () => {
  let calls = 0;
  const result = randomRewardPosition(1, {
    world: WORLD,
    heightAt: () => -600,
    rewardAnchor: () => {
      calls++;
      return null;
    },
    random: () => {
      throw new Error("A missing regional route must not use generic sampling");
    },
  });
  assert.equal(result, null);
  assert.equal(calls, REWARD_PLACEMENT.attempts);
});

test("Degenerate constant random sources retain actual terrain and boundary checks", () => {
  for (const value of [0, 0.5, 0.999999])
    for (const region of REGIONS) {
      const world = region.world || WORLD,
        heightAt = heights[region.id];
      const point = randomRewardPosition(2, {
        world,
        heightAt,
        random: () => value,
      });
      if (!point) continue;
      assert.ok(point.x >= world.minX + 18 && point.x <= world.maxX - 18);
      assert.ok(point.z >= world.minZ + 18 && point.z <= world.maxZ - 18);
      assert.ok(point.y >= heightAt(point.x, point.z) + 3.7 - 1e-8);
    }
});
