import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAst } from "rolldown/parseAst";
import { message, t } from "../src/i18n.js";
import { expeditionObjectiveHint } from "../src/expedition_objectives.js";
import { prioritizeTitanEscapeHint } from "../src/bermuda_titan_hud.js";

const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8"),
  declarations = parseAst(source).body;
function actualCallback(name) {
  const node = declarations.find(
    (node) => node.type === "FunctionDeclaration" && node.id.name === name,
  );
  assert.ok(node, `Actual ${name} callback must exist`);
  return source.slice(node.start, node.end);
}
const hud = actualCallback("updateHud"),
  objectiveStart = hud.indexOf('$("objective").textContent = t('),
  objectiveEnd = hud.indexOf('$("notification").style.opacity', objectiveStart);
assert.ok(objectiveStart >= 0 && objectiveEnd > objectiveStart);
// 执行生产HUD中所有目标行赋值，保留成长、地图与观察提示的真实优先顺序。
const renderObjective = new Function(
  "environment",
  `const { $, player, ocean, position, objectiveState, surface, expedition,
    nursery, elapsed, surfaceWildlifeHintUntil, isNursery, t, tr, message,
    expeditionObjectiveHint, prioritizeTitanEscapeHint } = environment;
   ${actualCallback("titanHazardAdvice")}
   ${actualCallback("activeObjectiveHint")}
   ${hud.slice(objectiveStart, objectiveEnd)}
   return $("objective").textContent;`,
);
function state(overrides = {}) {
  return {
    relicHeld: false,
    secured: false,
    escaped: false,
    entombed: false,
    escapeRemaining: 59.2,
    sealingRemaining: 2.1,
    ...overrides,
  };
}
function actualHud({
  questState = state(),
  length = 10,
  wildlife = false,
  nursery = false,
  locale = "zh-CN",
} = {}) {
  const objective = { textContent: "" },
    localize = (value) => t(value, [], locale);
  return renderObjective({
    $: (id) => {
      assert.equal(id, "objective");
      return objective;
    },
    player: { length },
    ocean: {
      titanQuest: questState ? { state: questState } : null,
      caves: { records: [{ contains: () => false }] },
    },
    position: { x: 0, y: -20, z: 0 },
    objectiveState: {
      regionId: "bermuda",
      defeated: new Set(),
      titanRelicCollected: false,
    },
    surface: { mode: "ocean" },
    expedition: { region: { id: "bermuda" } },
    nursery,
    elapsed: 0,
    surfaceWildlifeHintUntil: wildlife ? 8 : 0,
    isNursery: () => nursery,
    t: localize,
    tr: (parts, ...values) => localize(message(parts, ...values)),
    message,
    expeditionObjectiveHint,
    prioritizeTitanEscapeHint,
  });
}

for (const locale of ["zh-CN", "en"]) {
  test(`actual ${locale} small-body HUD retains escape countdown over growth and nursery observation`, () => {
    for (const length of [3, 10, 18, 25, 30]) {
      for (const wildlife of [false, true]) {
        const text = actualHud({
          questState: state({ relicHeld: true }),
          length,
          wildlife,
          nursery: wildlife,
          locale,
        });
        assert.equal(
          text,
          locale === "en"
            ? "Escape in 60s · The titan is waking; sprint toward the entrance"
            : "撤离 60秒 · 巨兽正在苏醒，向洞口冲刺",
          `length=${length}, wildlife=${wildlife}`,
        );
      }
    }
  });

  test(`actual ${locale} sealing and collapse HUD retain urgency for small characters`, () => {
    for (const entry of [
      {
        state: state({ relicHeld: true, escaped: true }),
        zh: "已逃出 · 洞口封闭中 3秒",
        en: "Outside safely · Entrance sealing in 3s",
      },
      {
        state: state({ relicHeld: true, entombed: true }),
        zh: "熔岩与落石淹没洞穴 · 未能及时逃离",
        en: "Lava and rockfalls engulf the cave · Escape failed",
      },
    ])
      assert.equal(
        actualHud({
          questState: entry.state,
          length: 10,
          wildlife: true,
          nursery: true,
          locale,
        }),
        locale === "en" ? entry.en : entry.zh,
      );
  });
}

test("ordinary growth, wildlife and secured expedition hints keep their existing behavior", () => {
  assert.equal(actualHud({ length: 3 }), "捕食鱼群，成长至 10 米");
  assert.equal(actualHud({ length: 10 }), "狩猎海洋霸主，探索深水区");
  assert.equal(
    actualHud({ length: 3, nursery: true }),
    "安心吃鱼群 · 成长至 4 米",
  );
  assert.equal(
    actualHud({ length: 10, nursery: true, wildlife: true }),
    "表层有飞鱼群 · 向上游近，观察破水滑翔",
  );
  assert.equal(
    actualHud({ questState: state({ relicHeld: true, secured: true }) }),
    "狩猎海洋霸主，探索深水区",
  );
  assert.equal(actualHud({ questState: null }), "狩猎海洋霸主，探索深水区");
});

test("urgent resolver retains hazard advice, ceils only presentation time and never mutates quest state", () => {
  const fallback = message`领主 ${2}/4 · 深海沉眠巢穴寻宝`,
    quest = state({ relicHeld: true, escapeRemaining: 0.25 }),
    before = structuredClone(quest),
    hint = prioritizeTitanEscapeHint(
      quest,
      fallback,
      "落石预警 · 离开地面标记",
    );
  assert.equal(t(hint), "撤离 1秒 · 落石预警 · 离开地面标记");
  assert.equal(
    t(hint, [], "en"),
    "Escape in 1s · Rockfall warning · Leave the ground markers",
  );
  assert.deepEqual(quest, before);
  assert.equal(prioritizeTitanEscapeHint(null, fallback), fallback);
  assert.equal(prioritizeTitanEscapeHint(state(), fallback), fallback);
  assert.equal(
    prioritizeTitanEscapeHint(
      state({ relicHeld: true, secured: true }),
      fallback,
    ),
    fallback,
  );
});
