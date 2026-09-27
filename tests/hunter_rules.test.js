import assert from "node:assert/strict";
import test from "node:test";
import {
  HUNTER_ABILITIES,
  createHunterState,
  tickHunter,
} from "../src/hunter_rules.js";
import { PLAYER_MOVEMENT, SPECIES } from "../src/simulation.js";

const CLOSE = { hunting: true, distance: 12, lineOfSight: true };

function ready(kind = "shark") {
  const state = createHunterState(
    SPECIES.find((s) => s.kind === kind),
    17,
  );
  state.cooldown = 0;
  return state;
}

test("个体首次释放错开，冷却不会在远离玩家时全部提前耗尽", () => {
  const species = SPECIES.find((s) => s.kind === "shark");
  const states = Array.from({ length: 8 }, (_, i) =>
    createHunterState(species, i),
  );
  const waits = states.map((state) => state.cooldown);
  assert.ok(waits.every((value) => value >= 8 && value < 18));
  assert.ok(Math.max(...waits) - Math.min(...waits) > 2);
  for (const state of states)
    tickHunter(state, 60, { ...CLOSE, hunting: false });
  assert.deepEqual(
    states.map((state) => state.cooldown),
    waits,
  );
  assert.ok(states.every((state) => state.phase === "idle"));
  assert.equal(createHunterState(species, 3).cooldown, waits[3]);
});

test("白鲨先明显蓄力，再短促加速，恢复阶段让玩家拉开距离", () => {
  const state = ready();
  tickHunter(state, 0.79, CLOSE);
  assert.equal(state.phase, "windup");
  assert.equal(state.justTriggered, false);
  assert.ok(state.speedMultiplier < 1);
  tickHunter(state, 0.01, CLOSE);
  assert.equal(state.phase, "active");
  assert.equal(state.justTriggered, true);
  assert.equal(state.species.speed * state.speedMultiplier, 34);
  assert.ok(34 > PLAYER_MOVEMENT.sprintSpeed);
  assert.equal(state.phaseDuration, 1.1);
  tickHunter(state, 0.01, CLOSE);
  assert.equal(state.justTriggered, false);
  tickHunter(state, 1.09, CLOSE);
  assert.equal(state.phase, "recover");
  assert.ok(state.speedMultiplier < 1);
  tickHunter(state, 2.8, CLOSE);
  assert.equal(state.phase, "idle");
  assert.equal(state.speedMultiplier, 1);
  assert.ok(state.cooldown >= 16 - 0.8 - 1.1 - 2.8);
});

test("不能在非追击、超距、遮挡或玩家死亡时开始技能", () => {
  for (const context of [
    { ...CLOSE, hunting: false },
    { ...CLOSE, distance: 200 },
    { ...CLOSE, lineOfSight: false },
    { ...CLOSE, playerAlive: false },
  ]) {
    const state = ready();
    tickHunter(state, 10, context);
    assert.equal(state.phase, "idle");
    assert.equal(state.triggerCount, 0);
  }
});

test("躲进障碍物后取消尚未释放的技能并保留冷却", () => {
  const state = ready();
  tickHunter(state, 0.4, CLOSE);
  const cooldown = state.cooldown;
  tickHunter(state, 0.1, { ...CLOSE, lineOfSight: false });
  assert.equal(state.phase, "recover");
  assert.equal(state.justTriggered, false);
  assert.equal(state.triggerCount, 0);
  assert.ok(state.cooldown > cooldown - 0.11);
  tickHunter(state, 3, CLOSE);
  assert.equal(state.phase, "idle");
  assert.ok(state.cooldown > 10);
});

test("章鱼近距预警后只发出一次喷墨事件，墨云具有6秒生命周期", () => {
  const state = ready("octopus");
  tickHunter(state, 2, { ...CLOSE, distance: 40 });
  assert.equal(state.phase, "idle");
  tickHunter(state, 0.9, CLOSE);
  assert.equal(state.phase, "windup");
  tickHunter(state, 0.1, CLOSE);
  assert.equal(state.type, "ink");
  assert.equal(state.justTriggered, true);
  assert.equal(state.effectDuration, 6);
  assert.equal(state.effectRadius, 22);
  tickHunter(state, 0.1, CLOSE);
  assert.equal(state.justTriggered, false);
  assert.equal(state.triggerCount, 1);
  assert.ok(state.cooldown > 20);
});

test("邓氏鱼重咬仅在预警后的短窗口增伤，恢复后解除倍率", () => {
  const state = ready("dunkleosteus");
  tickHunter(state, 0.8, CLOSE);
  assert.equal(state.damageMultiplier, 1);
  tickHunter(state, 0.05, CLOSE);
  assert.equal(state.phase, "active");
  assert.equal(state.damageMultiplier, 1.65);
  tickHunter(state, 0.55, CLOSE);
  assert.equal(state.phase, "recover");
  assert.equal(state.damageMultiplier, 1);
});

test("所有技能重复释放都保留长冷却，诱光配置可供图鉴读取", () => {
  for (const kind of Object.keys(HUNTER_ABILITIES)) {
    const state = ready(kind);
    const releases = [];
    for (let i = 0; i < 6000; i += 1) {
      tickHunter(state, 1 / 60, CLOSE);
      if (state.justTriggered) releases.push(i / 60);
    }
    assert.ok(releases.length >= 3 && releases.length <= 7);
    for (let i = 1; i < releases.length; i += 1) {
      const gap = releases[i] - releases[i - 1];
      assert.ok(gap >= state.ability.cooldownMin - 1 / 60);
      assert.ok(gap <= state.ability.cooldownMax + 1 / 60);
    }
    assert.ok(state.tell.length > 0);
  }
  assert.equal(HUNTER_ABILITIES.angler.type, "lure");
  assert.ok(HUNTER_ABILITIES.angler.effectDuration < 3);
});

test("初级鱼群没有技能，非法时间不会跳过预警或改变冷却", () => {
  const harmless = createHunterState(SPECIES.find((s) => s.kind === "fish"));
  tickHunter(harmless, 100, CLOSE);
  assert.equal(harmless.enabled, false);
  assert.equal(harmless.phase, "idle");
  assert.equal(harmless.speedMultiplier, 1);
  const state = ready();
  const before = structuredClone(state);
  for (const dt of [0, -1, NaN, Infinity]) tickHunter(state, dt, CLOSE);
  assert.deepEqual(state, before);
});
