import test from "node:test";
import assert from "node:assert/strict";
import { BOSS_SPECIES, createBossState } from "../src/boss_rules.js";
import {
  LORD_RECOVERY,
  recoverySpeed,
  recoveryGuardStatus,
  recoveryGuardCanStart,
  inRecoveryGuard,
} from "../src/lord_recovery.js";
import { t, setLanguage } from "../src/i18n.js";

test("Recovery speed leaves all sixteen unspent openings catchable and bounds post-hit movement", () => {
  for (const species of BOSS_SPECIES) {
    const boss = createBossState(species);
    assert.equal(recoverySpeed(boss), 2);
    boss.timer = 0.4;
    assert.ok(recoverySpeed(boss) > 0 && recoverySpeed(boss) < 12);
    const unspent = recoverySpeed(boss);
    boss.openingSpent = true;
    assert.ok(recoverySpeed(boss) > unspent && recoverySpeed(boss) <= 16);
  }
});

test("Defense fits completely in the original recovery and requires nearby clear sight", () => {
  const boss = createBossState(
    BOSS_SPECIES.find((s) => s.kind === "sword_sage"),
  );
  boss.phaseDuration = 2.2;
  boss.timer = 0.5;
  assert.equal(recoveryGuardCanStart(boss, 10, 25, true), false);
  boss.timer = 0.6;
  assert.equal(recoveryGuardCanStart(boss, 10, 25, true), true);
  assert.equal(recoveryGuardCanStart(boss, 10, 25, false), false);
  assert.equal(recoveryGuardCanStart(boss, 60, 25, true), false);
  boss.timer = 1.11;
  assert.equal(recoveryGuardCanStart(boss, 10, 25, true), false);
});

test("A single bounded warning precedes strike; expired guard cannot restart itself", () => {
  assert.equal(recoveryGuardStatus(-1, 0.6), "idle");
  assert.equal(recoveryGuardStatus(0.6, 0.6), "warning");
  assert.equal(recoveryGuardStatus(0.6, 1.349), "warning");
  assert.equal(recoveryGuardStatus(0.6, 1.35), "strike");
  assert.equal(recoveryGuardStatus(0.6, 1.599), "strike");
  assert.equal(recoveryGuardStatus(0.6, 1.6), "spent");
  assert.equal(recoveryGuardStatus(0.6, 20), "spent");
});

test("Locked frontal defense leaves sides, rear and vertical escape clear", () => {
  const forward = { x: 0, y: 0, z: -1 };
  assert.equal(inRecoveryGuard({ x: 0, y: 0, z: -10 }, forward), true);
  for (const offset of [
    { x: 10, y: 0, z: 0 },
    { x: 0, y: 0, z: 10 },
    { x: 0, y: 10, z: 0 },
    { x: 0, y: -10, z: 0 },
    { x: 0, y: 0, z: 0 },
  ])
    assert.equal(inRecoveryGuard(offset, forward), false);
});

test("Recovery HUD warnings translate and Guide timing interpolates in English", () => {
  setLanguage("en");
  for (const key of [
    "收势戒备 · 正面将有反击，绕到侧背",
    "正面反击 · 侧背仍有破绽",
    "戒备反击命中 · 绕到侧背，咬中后及时脱离",
    "收势绕位 · 追准身体反击，每轮一次",
  ])
    assert.ok(!/[\u3400-\u9fff]/.test(t(key)), key);
  assert.equal(
    t("鱼雷命中 {0} · {1}/{2}", ["Sword Sage", 2, 5]),
    "Torpedo hit Sword Sage · 2/5",
  );
  setLanguage("zh-CN");
  assert.equal(LORD_RECOVERY.warning, 0.75);
});
