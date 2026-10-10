import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { creatureGuideSkills } from "../src/creature_guide_skills.js";
import { BOSS_SPECIES, createBossState, tickBoss } from "../src/boss_rules.js";
import { ALL_SPECIES } from "../src/region_ecology.js";
import { REGIONAL_RARES } from "../src/regional_rare.js";
import { PENGLAI_TRANSFORMATION_FORMS } from "../src/penglai_transformation_species.js";
import {
  getHunterAbility,
  createHunterState,
  tickHunter,
} from "../src/hunter_rules.js";
import { setLanguage, t } from "../src/i18n.js";

// 样式仅在Node中略过；检查实际图鉴数据构建和筛选。
const hook = registerHooks({
  load(url, context, nextLoad) {
    return url.endsWith("/src/ocean_guide.css")
      ? { format: "module", source: "", shortCircuit: true }
      : nextLoad(url, context);
  },
});
const { buildOceanCatalog, filterOceanCatalog } = await import(
  "../src/ocean_guide.js"
);
hook.deregister();

test("each registered lord technique has its own bilingual card and timings agree with live phases", () => {
  const catalog = buildOceanCatalog();
  for (const species of BOSS_SPECIES) {
    const entry = catalog.find((row) => row.kind === species.kind);
    const expected = species.abilityCycle || [species.ability];
    assert.deepEqual(
      entry.skills.map((card) => card.id),
      expected,
      species.kind,
    );
    const state = createBossState(species),
      observed = new Map();
    // 从真实状态机读取两轮释放，避免只对照重复写出的静态默认值。
    for (let frame = 0; frame < 1200; frame += 1) {
      tickBoss(state, 0.05, {
        inTerritory: true,
        distance: 1,
        lineOfSight: true,
      });
      if (["windup", "recover"].includes(state.phase)) {
        const card = observed.get(state.ability) || {};
        card[state.phase] = state.phaseDuration;
        observed.set(state.ability, card);
      }
      if (expected.every((id) => observed.get(id)?.recover)) break;
    }
    for (const card of entry.skills) {
      assert.ok(card.name && card.description && card.counter, species.kind);
      assert.equal(card.type, "active");
      assert.equal(
        card.windup,
        observed.get(card.id)?.windup,
        `${species.kind}/${card.id}`,
      );
      assert.equal(
        card.recovery,
        observed.get(card.id)?.recover,
        `${species.kind}/${card.id}`,
      );
      for (const field of ["name", "description", "counter"])
        assert.ok(
          !/[\u3400-\u9fff]/u.test(t(card[field], [], "en")),
          `${species.kind}/${field}`,
        );
      assert.equal(card.cooldownMin, undefined); // 领主循环不能误写成固定技能CD。
    }
  }
  const sage = catalog.find((e) => e.kind === "sword_sage");
  assert.equal(sage.skills.length, 2);
  assert.match(sage.skills[0].description, /三柄飞剑/);
  assert.match(sage.skills[1].description, /直线/);
  assert.equal(sage.skills[0].recovery, 2.2);
  assert.equal(sage.skills[1].recovery, 2.6);
  assert.ok(!/万剑归宗|踏剑惊鸿/.test(sage.text));
  assert.equal(
    catalog.find((e) => e.kind === "black_tortoise").skills[0].recovery,
    4.5,
  );
});

test("ordinary hunter cards cover every actual ability profile without mutating ecology", () => {
  for (const species of ALL_SPECIES) {
    const before = JSON.stringify(species),
      ability = getHunterAbility(species);
    const cards = creatureGuideSkills(species, species);
    assert.equal(JSON.stringify(species), before);
    if (!ability) continue;
    assert.equal(cards.length, 1, species.kind);
    const card = cards[0],
      state = createHunterState(species, 3);
    state.cooldown = 0;
    tickHunter(state, 0.01, { hunting: true, distance: 1, lineOfSight: true });
    assert.equal(state.phase, "windup");
    assert.equal(card.windup, state.phaseDuration);
    assert.equal(card.cooldownMin, ability.cooldownMin);
    assert.equal(card.cooldownMax, ability.cooldownMax);
    for (const field of ["name", "description", "counter"])
      assert.ok(
        !/[\u3400-\u9fff]/u.test(t(card[field], card.values, "en")),
        `${species.kind}/${field}`,
      );
  }
  assert.deepEqual(
    creatureGuideSkills(ALL_SPECIES.find((e) => e.kind === "sardine")),
    [],
  );
  assert.deepEqual(
    creatureGuideSkills({ kind: "future_shoal", ability: "swimming", tier: 0 }),
    [],
  );
});

test("special natural, transformation and rare effects remain separate from ordinary habits", () => {
  for (const kind of [
    "dragon_carp",
    "gate_dragon",
    "kun",
    "peng",
    "flying_fish",
  ])
    assert.equal(
      creatureGuideSkills(
        [...ALL_SPECIES, ...PENGLAI_TRANSFORMATION_FORMS].find(
          (e) => e.kind === kind,
        ),
      )[0].type,
      "passive",
      kind,
    );
  for (const species of ALL_SPECIES.filter((e) => e.groundbound && e.predator))
    assert.equal(creatureGuideSkills(species)[0].id, "ground_leap");
  for (const species of REGIONAL_RARES) {
    const card = creatureGuideSkills(species)[0];
    assert.equal(card.id, "rare_blessing");
    assert.match(card.description, /150/);
  }
});

test("each individual NPC technique is searchable in either language in the real Guide", () => {
  try {
    for (const locale of ["zh-CN", "en"]) {
      setLanguage(locale);
      const catalog = buildOceanCatalog();
      for (const entry of catalog.filter((e) => e.skills?.length))
        for (const card of entry.skills)
          for (const queryLocale of ["zh-CN", "en"])
            assert.ok(
              filterOceanCatalog(catalog, {
                search: t(card.name, [], queryLocale),
              }).some((e) => e.id === entry.id),
              `${locale}/${entry.id}/${card.id}`,
            );
    }
  } finally {
    setLanguage("zh-CN");
  }
});
