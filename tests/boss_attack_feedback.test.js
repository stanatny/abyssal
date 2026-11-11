import test from "node:test";
import assert from "node:assert/strict";
import {
  BOSS_SPECIES,
  bossRequiredHits,
  createBossState,
  hitBoss,
  hitBossWithTorpedo,
  hitBossWithCorpseBlast,
  updateBossContact,
  tickBoss,
} from "../src/boss_rules.js";
import { createPlayer } from "../src/simulation.js";
import { message, t, setLanguage } from "../src/i18n.js";
import { finishNextBossAttack } from "./helpers/boss_cycle.js";
import {
  bossAttackFeedback,
  bossFailureFeedback,
  compactBossFeedback,
} from "../src/boss_attack_feedback.js";
import { BOSS_FEEDBACK_EN } from "../src/locales/boss_feedback_en.js";

const phases = [
  "dormant",
  "hunt",
  "windup",
  "attack",
  "recover",
  "return",
  "disoriented",
];
const methods = [
  ["orca", false, (p, b) => hitBoss(p, b, { inRange: true, isFlank: true })],
  ["mechanical_shark", true, hitBossWithTorpedo],
  ["zombie_shark", true, hitBossWithCorpseBlast],
];

function state(species, phase = "recover") {
  const b = createBossState(species);
  b.phase = phase;
  b.phaseDuration = phase === "recover" ? 3 : 1;
  b.timer = 0.4;
  return b;
}

test("Every lord and real attack path agrees with feedback window permission across all combat phases", () => {
  let cases = 0;
  for (const species of BOSS_SPECIES)
    for (const phase of phases)
      for (const [character, ranged, hit] of methods) {
        const player = createPlayer(character, 25),
          boss = state(species, phase);
        const info = bossAttackFeedback(boss, player, { ranged });
        assert.equal(
          info.canDamage,
          hit(player, boss).hit,
          `${species.kind}/${phase}/${character}`,
        );
        if (info.code === "body") assert.equal(info.seconds, 2.6);
        cases++;
      }
  assert.equal(cases, BOSS_SPECIES.length * phases.length * methods.length);
});

test("An actual hit spends the shared opening; short cooldown never masks it and a real next attack restores the window", () => {
  for (const species of BOSS_SPECIES) {
    const player = createPlayer("orca", 25),
      boss = createBossState(species);
    if (species.counterPhases) finishNextBossAttack(boss);
    const result = hitBoss(player, boss, { inRange: true, isFlank: true });
    assert.equal(result.hit, true);
    assert.equal(bossAttackFeedback(boss, player).code, "spent");
    const blocked = hitBoss(player, boss, { inRange: true, isFlank: true });
    assert.equal(blocked.reason, "cooldown");
    assert.match(
      t(bossFailureFeedback(boss, player, blocked), [], "zh-CN"),
      /下一轮技能/,
    );
    assert.match(
      t(bossFailureFeedback(boss, player, result), [], "zh-CN"),
      new RegExp(`有效命中1/${bossRequiredHits(species)}`),
    );
    player.biteCooldown = boss.biteCooldown = 0;
    updateBossContact(boss, false, 0.35);
    assert.equal(
      hitBoss(player, boss, { inRange: true, isFlank: true }).reason,
      "opening_spent",
    );
    finishNextBossAttack(boss);
    assert.equal(bossAttackFeedback(boss, player).code, "body");
    assert.equal(hitBoss(player, boss, { inRange: true }).hit, true);
  }
});

test("Front armor, tiger recovery restriction, shell guard and sword ward receive different truthful explanations", () => {
  const p = createPlayer("orca", 25),
    ordinary = state(BOSS_SPECIES[0], "windup");
  const result = hitBoss(p, ordinary, { inRange: true, isFlank: false });
  assert.equal(result.reason, "armored_angle");
  assert.equal(bossAttackFeedback(ordinary, p).code, "flank");
  assert.match(
    t(bossFailureFeedback(ordinary, p, result), [], "zh-CN"),
    /正面护甲/,
  );
  for (const [kind, phase, expected] of [
    ["white_tiger", "hunt", "白虎防御"],
    ["sword_sage", "windup", "剑阵保护"],
    ["black_tortoise", "attack", "甲阵封闭"],
  ]) {
    const b = state(
        BOSS_SPECIES.find((s) => s.kind === kind),
        phase,
      ),
      info = bossAttackFeedback(b, p);
    const blocked = hitBoss(p, b, { inRange: true, isFlank: true });
    assert.equal(blocked.hit, false);
    assert.equal(info.code, "protected");
    assert.match(t(info.title, [], "zh-CN"), new RegExp(expected));
    assert.ok(bossFailureFeedback(b, p, blocked));
    if (kind === "white_tiger")
      assert.ok(!t(info.title, [], "zh-CN").includes("剑阵"));
  }
});

test("Ranged availability never demands flank contact; locks, size, defeat and player availability remain closed", () => {
  for (const species of BOSS_SPECIES) {
    const p = createPlayer("mechanical_shark", 25),
      b = state(species, "hunt");
    const info = bossAttackFeedback(b, p, { ranged: true });
    if (info.canDamage) {
      assert.ok(
        !/侧|背|flank/i.test(
          t(info.title, [], "zh-CN") + t(info.advice, [], "zh-CN"),
        ),
      );
      assert.equal(hitBossWithTorpedo(p, b).hit, true);
    }
    for (const mode of ["locked", "too_small", "defeated", "unavailable"]) {
      const player = createPlayer(
          "mechanical_shark",
          mode === "too_small" ? 24.99 : 25,
        ),
        boss = state(species);
      if (mode === "locked") boss.locked = true;
      if (mode === "defeated") boss.defeated = true;
      if (mode === "unavailable") player.dead = true;
      assert.equal(
        bossAttackFeedback(boss, player, { ranged: true }).code,
        mode,
      );
      assert.equal(hitBossWithTorpedo(player, boss).hit, false);
    }
  }
});

test("Actual must-disengage and unused cooldown failures are explained without inventing damage from out-of-range attempts", () => {
  const p = createPlayer("orca", 25),
    b = state(BOSS_SPECIES[0]);
  b.contactArmed = false;
  const contact = hitBoss(p, b, { inRange: true });
  assert.equal(contact.reason, "must_disengage");
  assert.match(t(bossFailureFeedback(b, p, contact), [], "zh-CN"), /先退开/);
  b.contactArmed = true;
  p.biteCooldown = 0.5;
  const cooling = hitBoss(p, b, { inRange: true });
  assert.equal(cooling.reason, "cooldown");
  assert.match(t(bossFailureFeedback(b, p, cooling), [], "zh-CN"), /冷却/);
  p.biteCooldown = 0;
  assert.equal(bossFailureFeedback(b, p, hitBoss(p, b)), null);
});

test("All emitted nested message descriptions have complete English templates with identical placeholders", () => {
  const placeholder = (s) =>
    [...s.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
  const visit = (source) => {
    if (!source || typeof source !== "object") return;
    assert.equal(typeof BOSS_FEEDBACK_EN[source.key], "string", source.key);
    assert.deepEqual(
      placeholder(BOSS_FEEDBACK_EN[source.key]),
      placeholder(source.key),
      source.key,
    );
    assert.ok(!/[\u3400-\u9fff]/u.test(BOSS_FEEDBACK_EN[source.key]));
    source.values.forEach(visit);
  };
  for (const species of BOSS_SPECIES)
    for (const ranged of [false, true])
      for (const phase of phases) {
        const p = createPlayer(ranged ? "mechanical_shark" : "orca", 25),
          b = state(species, phase);
        for (const change of [
          () => {},
          () => (b.openingSpent = true),
          () => (b.locked = true),
          () => (b.locked = false),
          () => (p.length = 3),
          () => (p.length = 25),
          () => (p.dead = true),
          () => (b.defeated = true),
        ]) {
          change();
          const info = bossAttackFeedback(b, p, { ranged });
          visit(info.title);
          visit(info.advice);
        }
      }
});

test("Real final hits show the configured completed progress instead of inviting another attack", () => {
  for (const species of BOSS_SPECIES) {
    const p = createPlayer("orca", 25),
      b = createBossState(species);
    let hit;
    for (let i = 0; i < bossRequiredHits(species); i++) {
      if (i || species.counterPhases) finishNextBossAttack(b);
      p.biteCooldown = b.biteCooldown = 0;
      updateBossContact(b, false, 0.35);
      hit = hitBoss(p, b, { inRange: true, isFlank: true });
      assert.equal(hit.hit, true);
    }
    assert.equal(hit.defeated, true);
    assert.equal(bossAttackFeedback(b, p).code, "defeated");
    const n = bossRequiredHits(species);
    assert.match(
      t(bossFailureFeedback(b, p, hit), [], "zh-CN"),
      new RegExp(`${n}/${n}`),
    );
  }
});

test("Stored nested feedback renders in either real locale, retaining progress and concise English instructions", () => {
  try {
    const messages = [];
    for (const species of BOSS_SPECIES)
      for (const ranged of [false, true])
        for (const phase of phases) {
          const p = createPlayer(ranged ? "mechanical_shark" : "orca", 25),
            b = state(species, phase),
            info = bossAttackFeedback(b, p, { ranged });
          messages.push(info.title, info.advice);
          const result = ranged
            ? hitBossWithTorpedo(p, b)
            : hitBoss(p, b, { inRange: true, isFlank: false });
          const feedback = bossFailureFeedback(b, p, result, { ranged });
          if (feedback) messages.push(feedback);
        }
    for (const m of messages) {
      setLanguage("zh-CN");
      const zh = t(m);
      setLanguage("en");
      const en = t(m);
      assert.ok(!/[\u3400-\u9fff]/u.test(en), en);
      assert.ok(!/\{\d+\}/u.test(en), en);
      assert.notEqual(en, zh);
    }
    const p = createPlayer("orca", 25),
      b = state(BOSS_SPECIES[0], "hunt");
    assert.ok(t(bossAttackFeedback(b, p).advice, [], "en").length <= 65);
  } finally {
    setLanguage("zh-CN");
  }
});

function recentAttackFor(
  boss,
  player,
  result,
  { ranged = false, now = 1 } = {},
) {
  return {
    message: bossFailureFeedback(boss, player, result, { ranged }),
    type: result.hit ? "hit" : "blocked",
    reason: result.reason,
    windowCode: bossAttackFeedback(boss, player, { ranged }).code,
    until: now + 2.6,
  };
}

test("Compact danger preserves the entire supplied warning above opportunity, real hit and blocked feedback", () => {
  const p = createPlayer("orca", 25),
    b = state(BOSS_SPECIES[0]),
    tip = "收势戒备 · 正面将有反击，绕到侧背",
    notification = message`先解除领主护阵。`;
  const before = compactBossFeedback(b, p, { danger: true, tip, notification });
  assert.equal(before.code, "body");
  assert.equal(before.canDamage, true);
  assert.equal(before.tone, "danger");
  assert.equal(before.advice, tip);
  const hit = hitBoss(p, b, { inRange: true });
  assert.equal(hit.hit, true);
  const recentAttack = recentAttackFor(b, p, hit);
  const after = compactBossFeedback(b, p, {
    danger: true,
    tip,
    notification,
    recentAttack,
    now: 1,
  });
  assert.equal(after.code, "spent");
  assert.equal(after.tone, "danger");
  assert.equal(after.advice, tip);

  const otherPlayer = createPlayer("orca", 25),
    otherBoss = state(BOSS_SPECIES[0], "windup"),
    rejected = hitBoss(otherPlayer, otherBoss, { inRange: true });
  assert.equal(rejected.reason, "armored_angle");
  const warning = message`向外冲刺挣脱需${20}体力 · 越近越贵，可借掩体`;
  const blocked = compactBossFeedback(otherBoss, otherPlayer, {
    danger: true,
    tip: warning,
    recentAttack: recentAttackFor(otherBoss, otherPlayer, rejected),
    notification,
    now: 1,
  });
  assert.equal(blocked.tone, "danger");
  assert.equal(blocked.advice, warning);
  assert.equal(
    t(blocked.advice, [], "zh-CN"),
    "向外冲刺挣脱需20体力 · 越近越贵，可借掩体",
  );
});

test("Compact actual hit keeps success in the title without repeating progress or opening state in the advice", () => {
  const p = createPlayer("mechanical_shark", 25),
    b = state(BOSS_SPECIES[0]),
    hit = hitBossWithTorpedo(p, b);
  assert.equal(hit.hit, true);
  const recentAttack = recentAttackFor(b, p, hit, { ranged: true }),
    notification = message`先解除领主护阵。`;
  const result = compactBossFeedback(b, p, {
    ranged: true,
    recentAttack,
    notification,
    now: 1,
  });
  assert.equal(result.tone, "result");
  assert.match(t(result.title, [], "zh-CN"), /本轮已命中 · 1\/3/);
  assert.equal(t(result.advice, [], "zh-CN"), "先脱离，躲过下一轮再攻");
  assert.doesNotMatch(t(result.advice, [], "zh-CN"), /有效命中|本轮|1\/3/);
  const activeNotification = compactBossFeedback(b, p, {
    ranged: true,
    recentAttack,
    notification,
    now: recentAttack.until,
  });
  assert.equal(activeNotification.advice, notification);
  assert.equal(activeNotification.tone, "neutral");
  const fallback = compactBossFeedback(b, p, { ranged: true });
  assert.equal(fallback.code, "spent");
  assert.equal(t(fallback.advice, [], "zh-CN"), "躲过下一轮技能，再进攻");
});

test("Compact cooldown and disengage failures expire when the actual cooldown or contact rearming resolves", () => {
  for (const ranged of [false, true]) {
    const p = createPlayer(ranged ? "mechanical_shark" : "orca", 25),
      b = state(BOSS_SPECIES[0]);
    p.biteCooldown = 0.5;
    const rejected = ranged
      ? hitBossWithTorpedo(p, b)
      : hitBoss(p, b, { inRange: true });
    assert.equal(rejected.reason, ranged ? "ineligible" : "cooldown");
    const recentAttack = recentAttackFor(b, p, rejected, { ranged });
    assert.equal(
      compactBossFeedback(b, p, { ranged, recentAttack, now: 1 }).tone,
      "result",
    );
    p.biteCooldown = 0;
    const ready = compactBossFeedback(b, p, { ranged, recentAttack, now: 1.1 });
    assert.equal(ready.tone, "opportunity");
    assert.doesNotMatch(t(ready.advice, [], "zh-CN"), /冷却/);
    assert.equal(
      (ranged ? hitBossWithTorpedo(p, b) : hitBoss(p, b, { inRange: true }))
        .hit,
      true,
    );
  }
  const p = createPlayer("orca", 25),
    b = state(BOSS_SPECIES[0]);
  b.contactArmed = false;
  const rejected = hitBoss(p, b, { inRange: true });
  assert.equal(rejected.reason, "must_disengage");
  const recentAttack = recentAttackFor(b, p, rejected);
  assert.equal(
    compactBossFeedback(b, p, { recentAttack, now: 1 }).tone,
    "result",
  );
  updateBossContact(b, false, 0.35);
  assert.equal(b.contactArmed, true);
  const ready = compactBossFeedback(b, p, { recentAttack, now: 1.35 });
  assert.equal(ready.tone, "opportunity");
  assert.doesNotMatch(t(ready.advice, [], "zh-CN"), /还没离开/);
  assert.equal(hitBoss(p, b, { inRange: true }).hit, true);
});

test("Compact blocked feedback beats notifications only while its real window and lifetime still match", () => {
  const p = createPlayer("orca", 25),
    b = state(BOSS_SPECIES[0], "hunt"),
    rejected = hitBoss(p, b, { inRange: true });
  assert.equal(rejected.reason, "armored_angle");
  const recentAttack = recentAttackFor(b, p, rejected),
    notification = message`先解除领主护阵。`;
  const visible = compactBossFeedback(b, p, {
    recentAttack,
    notification,
    now: 1,
  });
  assert.equal(visible.tone, "result");
  assert.equal(visible.advice, recentAttack.message);
  finishNextBossAttack(b);
  assert.equal(b.phase, "recover");
  const changed = compactBossFeedback(b, p, {
    recentAttack,
    notification,
    now: 1.1,
  });
  assert.equal(changed.code, "body");
  assert.equal(changed.advice, notification);
  assert.equal(changed.tone, "neutral");
  const noWarning = compactBossFeedback(b, p, { tip: "Unused inactive tip" });
  assert.equal(noWarning.tone, "opportunity");
  assert.match(t(noWarning.advice, [], "zh-CN"), /咬中身体/);
});

test("Compact defaults use real recovery clocks and size gates, render in both locales, and translate pursuing counts", () => {
  for (const species of BOSS_SPECIES)
    for (const ranged of [false, true]) {
      const p = createPlayer(ranged ? "mechanical_shark" : "orca", 25),
        b = createBossState(species);
      finishNextBossAttack(b);
      const context = { inTerritory: true, distance: 0, lineOfSight: true };
      tickBoss(b, 0.37, context);
      const info = compactBossFeedback(b, p, { ranged });
      assert.equal(info.code, "body");
      assert.equal(info.seconds, b.phaseDuration - b.timer);
      assert.match(
        t(info.advice, [], "zh-CN"),
        new RegExp(`${info.seconds.toFixed(1)}秒`),
      );
      assert.doesNotMatch(t(info.advice, [], "zh-CN"), /每轮/);
      if (ranged) assert.doesNotMatch(t(info.advice, [], "zh-CN"), /侧|背|咬/);
      const messages = [info.title, info.advice];
      for (const phase of phases) {
        b.phase = phase;
        const compact = compactBossFeedback(b, p, { ranged });
        assert.equal(
          compact.canDamage,
          bossAttackFeedback(b, p, { ranged }).canDamage,
        );
        messages.push(compact.title, compact.advice);
      }
      p.length = species.minAttackLength - 0.01;
      const small = compactBossFeedback(b, p, { ranged });
      assert.equal(small.code, "too_small");
      assert.match(
        t(small.advice, [], "en"),
        new RegExp(`${species.minAttackLength} m`),
      );
      messages.push(small.advice);
      p.length = 25;
      b.locked = true;
      const locked = compactBossFeedback(b, p, { ranged });
      assert.equal(locked.code, "locked");
      assert.deepEqual(
        locked.advice,
        bossAttackFeedback(b, p, { ranged }).advice,
      );
      messages.push(locked.advice);
      for (const source of messages) {
        const en = t(source, [], "en"),
          zh = t(source, [], "zh-CN");
        assert.doesNotMatch(en, /[\u3400-\u9fff]|\{\d+\}/u);
        assert.notEqual(en, zh);
        assert.ok(en.length <= 65, en);
      }
    }
  assert.equal(t(message`${3}位追击`, [], "en"), "3 pursuing");
  assert.equal(t(message`${3}位追击`, [], "zh-CN"), "3位追击");
});
