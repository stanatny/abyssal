import test from "node:test";
import assert from "node:assert/strict";
import { LUMEN_LASH, lumenLashPose } from "../src/europa_lord_attacks.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";

test("Lumen lances extend sequentially, stop damaging on retraction and leave a recovery window", () => {
  const species = BOSS_SPECIES.find((s) => s.kind === "lumen_stalker");
  assert.equal(species.ability, "lash");
  assert.equal(species.engageRange, LUMEN_LASH.range);
  assert.equal(lumenLashPose(0, 1, true).amount, 0);
  assert.deepEqual(lumenLashPose(0.3, 0, true), { amount: 1, striking: true });
  assert.equal(lumenLashPose(0.6, 0, true).striking, false);
  assert.equal(lumenLashPose(0.6, 1, true).striking, true);
  assert.equal(lumenLashPose(1.2, 2, true).striking, true);
  assert.equal(lumenLashPose(species.attackDuration, 2, true).amount, 0);
  assert.equal(lumenLashPose(0.3, 0, false).amount, 0);
  assert.equal(species.abilityTimings.lash.recover, 4);
  assert.ok(species.windupDuration - species.lockWindow > 0.8);
});
