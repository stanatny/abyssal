import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARACTERS,
  REGIONS,
  getExpedition,
} from "../src/expedition_config.js";
import { SPECIES } from "../src/simulation.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";

test("Current expedition uses Hawaii and the base orca with the full species roster", () => {
  const { region, character } = getExpedition();
  assert.equal(region.id, "hawaii");
  assert.equal(character.id, "orca");
  assert.deepEqual(
    new Set(region.speciesKinds),
    new Set(SPECIES.map((entry) => entry.kind)),
  );
  assert.deepEqual(
    new Set(region.bossKinds),
    new Set(BOSS_SPECIES.map((entry) => entry.kind)),
  );
  assert.ok(region.spawn.every(Number.isFinite));
  assert.equal(character.startLength, 3);
});

test("Unreleased and unknown expeditions cannot start", () => {
  for (const region of REGIONS.filter((entry) => !entry.available)) {
    assert.throws(() => getExpedition(region.id), /not available/);
  }
  assert.throws(() => getExpedition("missing"), /not available/);
  assert.throws(() => getExpedition("hawaii", "shark"), /not available/);
  assert.equal(CHARACTERS.filter((entry) => entry.available).length, 2);
});

test("可选乌贼不再加入野生种群，章鱼独立占据现代生态位", () => {
  const { region, character } = getExpedition("hawaii", "squid");
  assert.equal(character.kind, "squid");
  assert.equal(character.startLength, 3);
  assert.equal(character.active.id, "ink");
  assert.equal(
    SPECIES.some((entry) => entry.kind === "squid"),
    false,
  );
  assert.equal(region.speciesKinds.includes("squid"), false);
  assert.ok(region.speciesKinds.includes("octopus"));
  const octopus = SPECIES.find((entry) => entry.kind === "octopus");
  assert.equal(octopus.category, "hunter");
  assert.equal(octopus.length, 5);
  assert.equal(octopus.schoolSize, 1);
  assert.equal(SPECIES.length, 24);
});
