import assert from "node:assert/strict";
import test from "node:test";
import { MARIANA_HUNGER_PROFILE } from "../src/mariana_config.js";
import { REGIONS } from "../src/expedition_config.js";
import {
  createPlayer,
  depthHungerMultiplier,
  hungerDrainRate,
  tickVitals,
} from "../src/simulation.js";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("Mariana pressure rises continuously after each gate, with a modest cap", () => {
  const profile = MARIANA_HUNGER_PROFILE;
  for (const [depth, multiplier] of [
    [18, 1],
    [650, 1],
    [675, 1.04],
    [700, 1.08],
    [1000, 1.08],
    [1025, 1.12],
    [1050, 1.16],
    [1375, 1.16],
    [1400, 1.2],
    [1425, 1.24],
    [2780, 1.24],
  ])
    close(depthHungerMultiplier(depth, profile), multiplier);
  for (const step of profile.steps)
    assert.ok(
      Math.abs(
        depthHungerMultiplier(step.depth - 1e-5, profile) -
          depthHungerMultiplier(step.depth + 1e-5, profile),
      ) < 1e-6,
    );
  close(hungerDrainRate(25, 1500, profile), 3.162);
  close(hungerDrainRate(30, 1500, profile), 3.72);
  close(depthHungerMultiplier(NaN, profile), 1);
});

test("all seven other maps and shallow Mariana retain the shared curve", () => {
  for (const region of REGIONS) {
    if (region.id === "mariana") {
      assert.equal(region.hungerProfile, MARIANA_HUNGER_PROFILE);
      continue;
    }
    assert.equal(region.hungerProfile, undefined);
    for (const length of [3, 15, 25, 30])
      for (const depth of [0, 45, 500, 1000, 2780])
        close(
          hungerDrainRate(length, depth, region.hungerProfile),
          hungerDrainRate(length, depth),
        );
  }
  close(hungerDrainRate(30, 30, MARIANA_HUNGER_PROFILE), 2);
  close(hungerDrainRate(30, 500, MARIANA_HUNGER_PROFILE), 3);
});

test("layered survival uses real active time, starvation remainder and frozen result clocks", () => {
  for (const character of [
    "orca",
    "squid",
    "zombie_shark",
    "mechanical_shark",
  ]) {
    const player = createPlayer(character);
    player.length = 30;
    player.hunger = 3.72;
    tickVitals(player, 0.04, {
      roundDt: 2,
      depth: 1600,
      hungerProfile: MARIANA_HUNGER_PROFILE,
    });
    close(player.hunger, 0);
    close(player.health, 93);
    close(player.elapsed, 2);
    player.won = true;
    const frozen = structuredClone(player);
    tickVitals(player, 10, {
      depth: 2000,
      hungerProfile: MARIANA_HUNGER_PROFILE,
    });
    assert.deepEqual(player, frozen);
  }
});
