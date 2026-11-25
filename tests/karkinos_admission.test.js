import test from "node:test";
import assert from "node:assert/strict";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { createBossState, tickBoss } from "../src/boss_rules.js";

const species = ODYSSEY_LORDS.find((s) => s.kind === "karkinos");
const context = (distance) => ({
  inTerritory: true,
  distance,
  lineOfSight: true,
});
function completeAttack(state, expected) {
  tickBoss(state, species.huntDuration ?? 1, context(80));
  assert.equal(state.phase, "windup");
  assert.equal(state.ability, expected);
  tickBoss(state, state.phaseDuration, context(80));
  assert.equal(state.phase, "attack");
  tickBoss(state, state.phaseDuration, context(80));
  assert.equal(state.phase, "recover");
  tickBoss(state, state.phaseDuration, context(80));
  assert.equal(state.phase, "hunt");
}

test("After a completed fault, the upcoming claw needs90m rather than reusing the previous200m fault admission", () => {
  const state = createBossState(species);
  completeAttack(state, "fault");
  assert.equal(state.attackCount, 1);
  assert.equal(state.ability, "fault");
  for (const distance of [150, 90.01]) {
    tickBoss(state, 2, context(distance));
    assert.equal(
      state.phase,
      "hunt",
      `${distance}m must not admit the upcoming claw`,
    );
    assert.equal(
      state.timer,
      0,
      "Waiting outside claw range cannot accumulate hunt time",
    );
    assert.equal(state.attackCount, 1);
  }
  tickBoss(state, species.huntDuration ?? 1, context(90));
  assert.equal(state.phase, "windup");
  assert.equal(state.ability, "claw");
});

test("After a completed claw, the upcoming fault can start at200m instead of remaining stuck on the previous90m claw range", () => {
  const state = createBossState(species);
  completeAttack(state, "fault");
  completeAttack(state, "claw");
  assert.equal(state.attackCount, 2);
  assert.equal(state.ability, "claw");
  tickBoss(state, 2, context(200.01));
  assert.equal(state.phase, "hunt");
  assert.equal(state.timer, 0);
  tickBoss(state, species.huntDuration ?? 1, context(200));
  assert.equal(state.phase, "windup");
  assert.equal(state.ability, "fault");
  assert.equal(
    state.attackCount,
    2,
    "The new fault is still a warned windup, not an instant attack",
  );
});
