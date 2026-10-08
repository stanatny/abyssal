import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  RANDOM_REWARD_COUNT,
  REWARD_BOB_AMPLITUDE,
  REWARD_KINDS,
  REWARD_PLACEMENT,
  REWARDS,
  STARTER_REWARDS,
  rewardSlots,
} from "../src/reward_config.js";
import { randomRewardPosition } from "../src/reward_placement.js";
import { REGIONS } from "../src/expedition_config.js";
import { WORLD } from "../src/world_config.js";
import { isNursery, NURSERY } from "../src/nursery_rules.js";
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

test("Default starters remain Supply and Flow; eighteen random slots remain balanced", () => {
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

test("Bermuda appends exactly one fixed spawn Frenzy without shifting the twenty shared slot identities", () => {
  const defaults = rewardSlots(),
    bermuda = REGIONS.find((region) => region.id === "bermuda"),
    expectedIds = [
      "starter_stamina",
      "starter_flow",
      ...Array.from(
        { length: RANDOM_REWARD_COUNT },
        (_, index) => `random_${index}`,
      ),
    ];
  assert.equal(defaults.length, 20);
  assert.deepEqual(
    defaults.map((slot) => slot.id),
    expectedIds,
  );
  for (const region of REGIONS) {
    const slots = rewardSlots(region),
      fixed = slots.filter((slot) => slot.position),
      random = slots.filter((slot) => slot.randomIndex !== undefined);
    assert.deepEqual(slots.slice(0, defaults.length), defaults, region.id);
    assert.equal(
      new Set(slots.map((slot) => slot.id)).size,
      slots.length,
      region.id,
    );
    assert.equal(random.length, RANDOM_REWARD_COUNT, region.id);
    for (const [index, slot] of random.entries()) {
      assert.equal(slot.randomIndex, index, region.id);
      assert.equal(
        slot.kind,
        REWARD_KINDS[index % REWARD_KINDS.length],
        region.id,
      );
      assert.equal(slot.position, undefined, region.id);
    }
    const frenzy = fixed.filter((slot) => slot.kind === "frenzy");
    if (region.id === "bermuda") {
      assert.equal(slots.length, 21);
      assert.equal(fixed.length, 3);
      assert.equal(frenzy.length, 1);
      assert.equal(slots.at(-1).id, "bermuda_spawn_frenzy");
      assert.deepEqual(frenzy[0].position, region.spawn);
      const position = new THREE.Vector3(...frenzy[0].position);
      assert.equal(isNursery(position), true);
      assert.ok(
        position.y >= bermudaSeabedHeight(position.x, position.z) + 3.7,
      );
      assert.equal(region.randomRewardPlacement.frenzy.excludeNursery, true);
    } else {
      assert.equal(slots.length, 20, region.id);
      assert.equal(fixed.length, 2, region.id);
      assert.equal(frenzy.length, 0, region.id);
      assert.notEqual(
        region.randomRewardPlacement?.frenzy?.excludeNursery,
        true,
        region.id,
      );
    }
  }
  // 出生点来自海域数据，后续改坐标也不能留下硬编码位置。
  const spawn = [12, -22, 76],
    relocated = rewardSlots({ ...bermuda, spawn });
  assert.deepEqual(relocated.at(-1).position, spawn);
  assert.deepEqual(rewardSlots(bermuda).slice(0, 20), rewardSlots(REGIONS[0]));
  assert.equal(REWARD_BOB_AMPLITUDE, 0.6);
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
          ...region.randomRewardPlacement?.[
            REWARD_KINDS[index % REWARD_KINDS.length]
          ],
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
        if (
          region.randomRewardPlacement?.[
            REWARD_KINDS[index % REWARD_KINDS.length]
          ]?.excludeNursery
        )
          assert.equal(
            isNursery(
              point.clone().add(new THREE.Vector3(0, REWARD_BOB_AMPLITUDE, 0)),
            ),
            false,
            `${region.id}/${seed}/${index}: highest bobbed center outside nursery`,
          );
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

test("Default random Frenzy can still land legally in the shallow nursery without a guaranteed starter", () => {
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

test("Bermuda rejects a final shallow Frenzy position after a deep anchor is floor-clamped", () => {
  const bermuda = REGIONS.find((region) => region.id === "bermuda");
  let calls = 0;
  const result = randomRewardPosition(2, {
    world: WORLD,
    heightAt: () => -50,
    ...bermuda.randomRewardPlacement.frenzy,
    rewardAnchor: () => {
      calls++;
      return new THREE.Vector3(0, -500, 75);
    },
  });
  assert.equal(result, null);
  assert.equal(calls, REWARD_PLACEMENT.attempts);
});

test("Nursery exclusion retries another legal anchor without replacing exhausted slots near spawn", () => {
  let calls = 0;
  const result = randomRewardPosition(2, {
    world: WORLD,
    heightAt: (x, z) => (z >= NURSERY.minZ ? -50 : -500),
    excludeNursery: true,
    rewardAnchor: () => {
      calls++;
      return calls === 1
        ? new THREE.Vector3(0, -500, 75)
        : new THREE.Vector3(75, -100, -400);
    },
  });
  assert.ok(result);
  assert.deepEqual(result.toArray(), [75, -100, -400]);
  assert.equal(calls, 2);
  assert.equal(isNursery(result), false);
});

test("Final nursery exclusion also rejects a legal collision correction across the nursery edge", () => {
  const anchor = new THREE.Vector3(0, -50, NURSERY.minZ - 1),
    colliders = [
      { type: "sphere", x: anchor.x, y: anchor.y, z: anchor.z, radius: 3 },
    ],
    options = {
      world: WORLD,
      heightAt: () => -500,
      colliders,
      rewardAnchor: () => anchor.clone(),
    },
    unfiltered = randomRewardPosition(2, options);
  assert.equal(isNursery(anchor), false);
  assert.ok(unfiltered);
  assert.equal(isNursery(unfiltered), true);
  assert.equal(
    isPositionBlocked(unfiltered, { radius: 0.45, colliders }),
    false,
  );
  let calls = 0;
  const filtered = randomRewardPosition(2, {
    ...options,
    excludeNursery: true,
    rewardAnchor: () => {
      calls++;
      return anchor.clone();
    },
  });
  assert.equal(filtered, null);
  assert.equal(calls, REWARD_PLACEMENT.attempts);
});

test("Inclusive nursery depth and horizontal edges account for the highest bobbed reward center", () => {
  const edgeDepth = NURSERY.maxDepth + REWARD_BOB_AMPLITUDE;
  // 出生浅滩是水平边界与深度的交集；外海表层和浅滩下方深水仍允许随机奖励。
  for (const [z, depth, excluded] of [
    [NURSERY.minZ, edgeDepth, true],
    [NURSERY.minZ + 0.0001, edgeDepth, true],
    [NURSERY.minZ, edgeDepth - 0.0001, true],
    [NURSERY.minZ, NURSERY.maxDepth + REWARD_BOB_AMPLITUDE / 2, true],
    [NURSERY.minZ, edgeDepth + 0.0001, false],
    [NURSERY.minZ - 0.0001, 20, false],
  ]) {
    let calls = 0;
    const result = randomRewardPosition(2, {
      world: WORLD,
      heightAt: () => -500,
      excludeNursery: true,
      rewardAnchor: () => {
        calls++;
        return new THREE.Vector3(0, -depth, z);
      },
    });
    const label = `z=${z}, depth=${depth}`;
    if (excluded) {
      assert.equal(result, null, label);
      assert.equal(calls, REWARD_PLACEMENT.attempts, label);
    } else {
      assert.ok(result, label);
      assert.deepEqual(result.toArray(), [0, -depth, z], label);
      assert.equal(calls, 1, label);
      assert.equal(
        isNursery(
          result.clone().add(new THREE.Vector3(0, REWARD_BOB_AMPLITUDE, 0)),
        ),
        false,
        label,
      );
    }
  }
});

test("Regional policy preserves shallow Supply and Flow and every other region's shallow Frenzy", () => {
  for (const region of REGIONS)
    for (const [index, kind] of REWARD_KINDS.entries()) {
      const result = randomRewardPosition(index, {
        world: region.world || WORLD,
        heightAt: () => -50,
        ...region.randomRewardPlacement?.[kind],
        rewardAnchor: () => new THREE.Vector3(0, -500, 75),
      });
      if (region.id === "bermuda" && kind === "frenzy") {
        assert.equal(result, null);
      } else {
        assert.ok(result, `${region.id}/${kind}`);
        assert.equal(isNursery(result), true, `${region.id}/${kind}`);
      }
    }
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
        ...region.randomRewardPlacement?.frenzy,
      });
      if (!point) continue;
      assert.ok(point.x >= world.minX + 18 && point.x <= world.maxX - 18);
      assert.ok(point.z >= world.minZ + 18 && point.z <= world.maxZ - 18);
      assert.ok(point.y >= heightAt(point.x, point.z) + 3.7 - 1e-8);
      if (region.randomRewardPlacement?.frenzy?.excludeNursery)
        assert.equal(
          isNursery(
            point.clone().add(new THREE.Vector3(0, REWARD_BOB_AMPLITUDE, 0)),
          ),
          false,
          `${region.id}/${value}: highest bobbed center outside nursery`,
        );
    }
});
