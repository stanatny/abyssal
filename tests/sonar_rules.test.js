import assert from "node:assert/strict";
import test from "node:test";
import {
  SONAR_ABILITY,
  createSonarState,
  activateSonar,
  getSonarStatus,
  detectSonarContacts,
  selectSonarContacts,
} from "../src/sonar_rules.js";
import { createPlayer, SPECIES } from "../src/simulation.js";
import { BOSS_SPECIES, createBossState } from "../src/boss_rules.js";

const origin = { x: 0, y: -100, z: 0 };
function fish(kind, x, y, z, extra = {}) {
  return {
    species: SPECIES.find((entry) => entry.kind === kind),
    mesh: { visible: false, position: { x, y, z } },
    hiddenFor: 0,
    ...extra,
  };
}
function boss(kind = "kraken", extra = {}) {
  return {
    state: createBossState(BOSS_SPECIES.find((entry) => entry.kind === kind)),
    mesh: { visible: false, position: { x: 0, y: -120, z: 90 } },
    enabled: true,
    ...extra,
  };
}
function detect(
  entities = [],
  bosses = [],
  player = createPlayer(),
  forward = { x: 0, y: 0, z: -1 },
) {
  return detectSonarContacts({
    position: origin,
    forward,
    entities,
    bosses,
    player,
  });
}

test("声呐显示10秒且释放时开始60秒冷却，边界可重复释放", () => {
  assert.deepEqual(SONAR_ABILITY, { duration: 10, cooldown: 60, range: 260 });
  const state = createSonarState();
  assert.equal(activateSonar(state, 5), true);
  assert.deepEqual(getSonarStatus(state, 5), {
    active: true,
    remaining: 10,
    cooldownRemaining: 60,
    ready: false,
  });
  assert.equal(getSonarStatus(state, 14.999).active, true);
  assert.equal(getSonarStatus(state, 15).active, false);
  assert.equal(getSonarStatus(state, 64.999).ready, false);
  assert.equal(activateSonar(state, 64.999), false);
  assert.equal(activateSonar(state, 65), true);
  assert.equal(getSonarStatus(state, 65).remaining, 10);
});

test("重复按键不刷新扫描，暂停复用游玩时钟不消耗持续时间或冷却", () => {
  const state = createSonarState();
  activateSonar(state, 20);
  const before = structuredClone(state);
  for (const now of [20, 22, 29.9, 31, 79.9])
    assert.equal(activateSonar(state, now), false);
  assert.deepEqual(state, before);
  const paused = getSonarStatus(state, 24);
  for (let i = 0; i < 60; i++)
    assert.deepEqual(getSonarStatus(state, 24), paused);
  assert.equal(getSonarStatus(createSonarState(), 0).ready, true);
});

test("无效时间不会释放技能或破坏计时状态", () => {
  const state = createSonarState();
  for (const now of [-1, NaN, Infinity, -Infinity])
    assert.equal(activateSonar(state, now), false);
  assert.deepEqual(state, createSonarState());
});

test("探测身后、屏外和隐藏模型，不把渲染可见性当作生命状态", () => {
  const contacts = detect([
    fish("fish", 0, -100, -200),
    fish("shark", 80, -100, 120),
  ]);
  assert.equal(contacts.length, 2);
  assert.equal(contacts[0].direction, "前方");
  assert.ok(contacts[0].radarY < 0);
  assert.equal(contacts[1].direction, "右后");
  assert.ok(contacts[1].radarX > 0 && contacts[1].radarY > 0);
  assert.equal(contacts[0].status, "可捕食");
  assert.equal(contacts[1].status, "不可捕食");
  assert.equal(contacts[1].length, 6.4);
  assert.equal(contacts[0].length, 0.8);
});

test("球形探测范围包含260米边界，排除超距和被吃掉的待重生鱼", () => {
  const contacts = detect([
    fish("fish", 260, -100, 0),
    fish("fish", 260.001, -100, 0),
    fish("fish", 0, 160.001, 0),
    fish("fish", 1, -100, 0, { hiddenFor: 1 }),
    fish("fish", 1, -100, 0, { dead: true }),
    fish("fish", 1, -100, 0, { health: 0 }),
    fish("fish", 1, -100, 0, { enabled: false }),
  ]);
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].distance, 260);
});

test("雷达随玩家朝向旋转，并用上下层信息区分同水平坐标目标", () => {
  const contacts = detect(
    [fish("fish", 50, -60, 0), fish("fish", -50, -140, 0)],
    [],
    createPlayer(),
    { x: 1, y: 0, z: 0 },
  );
  assert.equal(contacts[0].direction, "前方");
  assert.equal(contacts[0].elevation, "上方");
  assert.equal(contacts[1].direction, "后方");
  assert.equal(contacts[1].elevation, "下方");
  assert.ok(contacts[0].radarY < 0 && contacts[1].radarY > 0);
});

test("仅探测启用且存活的领主，体型够大也只能多次接触交战", () => {
  const live = boss();
  const defeated = boss("hydra");
  defeated.state.defeated = true;
  const contacts = detect(
    [],
    [live, boss("mayan", { enabled: false }), defeated],
  );
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].boss, true);
  assert.equal(contacts[0].status, "体型不足 · 避开领主");
  const player = createPlayer();
  player.length = 30;
  assert.equal(detect([], [live], player)[0].status, "可交战 · 需多次接触");
  player.length = 21;
  player.buffs.frenzy = 10;
  assert.equal(detect([], [live], player)[0].eligible, true);
});

test("狂食捕食资格随玩家状态变化，未达到狂食门槛的猎手仍然危险", () => {
  const player = createPlayer();
  assert.equal(
    detect([fish("shark", 0, -100, 10)], [], player)[0].dangerous,
    true,
  );
  player.buffs.frenzy = 5;
  assert.equal(
    detect([fish("shark", 0, -100, 10)], [], player)[0].status,
    "可捕食",
  );
  assert.equal(
    detect([fish("sperm_whale", 0, -100, 10)], [], player)[0].dangerous,
    true,
  );
  // 新版邓氏鱼为6米，与幼年虎鲸等长：狂食可捕食，普通状态仍不可吞食。
  assert.equal(
    detect([fish("dunkleosteus", 0, -100, 10)], [], player)[0].eligible,
    true,
  );
  player.buffs.frenzy = 0;
  assert.equal(
    detect([fish("dunkleosteus", 0, -100, 10)], [], player)[0].dangerous,
    true,
  );
  player.buffs.frenzy = 5;
  const whale = SPECIES.find((species) => species.kind === "sperm_whale");
  player.length = whale.length / 1.6;
  assert.equal(
    detect([fish("sperm_whale", 0, -100, 10)], [], player)[0].eligible,
    true,
  );
  player.length -= 0.001;
  assert.equal(
    detect([fish("sperm_whale", 0, -100, 10)], [], player)[0].dangerous,
    true,
  );
});

test("现代与古代21种普通生物均按目录体长与名称返回回声", () => {
  const contacts = detect(
    SPECIES.map((species, index) => fish(species.kind, index * 2, -100, -40)),
  );
  assert.equal(contacts.length, 21);
  assert.deepEqual(
    contacts.map((entry) => entry.length),
    SPECIES.map((species) => species.length),
  );
  assert.deepEqual(
    contacts.map((entry) => entry.label),
    SPECIES.map((species) => species.label),
  );
  assert.ok(contacts.every((entry) => !entry.boss));
});

test("代表目标优先领主和危险猎手并按种类去重，完整雷达点不被截断", () => {
  const contacts = detect(
    [
      fish("fish", 0, -100, -1),
      fish("fish", 0, -100, -2),
      fish("shark", 0, -100, -150),
      fish("shark", 0, -100, -50),
      fish("tuna", 0, -100, -3),
      fish("angler", 0, -100, -70),
      fish("ray", 0, -100, -4),
    ],
    [boss()],
  );
  const selected = selectSonarContacts(contacts);
  assert.equal(contacts.length, 8);
  assert.equal(selected.length, 4);
  assert.deepEqual(
    selected.map((entry) => entry.kind),
    ["kraken", "shark", "angler", "fish"],
  );
  assert.equal(selected[1].distance, 50);
  assert.equal(
    new Set(selected.map((entry) => entry.kind)).size,
    selected.length,
  );
});
