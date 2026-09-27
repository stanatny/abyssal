import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAYER_CHARACTERS,
  characterMovement,
  createInkState,
  activateInk,
  inkStatus,
} from "../src/character_rules.js";

test("每个可选角色有且只有一主动一被动，虎鲸冲刺提高30%", () => {
  for (const character of PLAYER_CHARACTERS) {
    assert.ok(character.active.id && character.passive.id);
    assert.equal(character.available, true);
  }
  assert.equal(characterMovement("orca", true).sprintSpeed, 41.6);
  assert.equal(characterMovement("squid", true).sprintSpeed, 32);
});
test("乌贼未冲刺的转向与俯仰更灵活，冲刺回到常规限制", () => {
  const normal = characterMovement("orca", false);
  const agile = characterMovement("squid", false);
  const sprint = characterMovement("squid", true);
  assert.ok(agile.yawRate > normal.yawRate);
  assert.ok(agile.pitchLimit > 1.45 && agile.pitchLimit < Math.PI / 2);
  assert.equal(sprint.pitchLimit, normal.pitchLimit);
  assert.equal(sprint.yawRate, normal.yawRate);
});
test("喷墨的十秒效果、短促喷射与一分钟冷却独立，重复按键不刷新", () => {
  const state = createInkState();
  assert.equal(activateInk(state, 5), true);
  assert.equal(inkStatus(state, 6).jet, true);
  assert.equal(inkStatus(state, 6.5).jet, false);
  assert.equal(inkStatus(state, 14.99).active, true);
  assert.equal(inkStatus(state, 15).active, false);
  assert.equal(activateInk(state, 30), false);
  assert.equal(state.readyAt, 65);
  assert.equal(inkStatus(state, 64.99).ready, false);
  assert.equal(activateInk(state, 65), true);
  const frozen = structuredClone(state);
  inkStatus(state, 65);
  assert.deepEqual(state, frozen);
});
test("水面、死亡和无效时间不允许释放喷墨", () => {
  for (const args of [
    [0, { underwater: false }],
    [0, { alive: false }],
    [-1, {}],
    [NaN, {}],
  ]) {
    const state = createInkState();
    assert.equal(activateInk(state, ...args), false);
    assert.equal(state.activatedAt, null);
  }
});
