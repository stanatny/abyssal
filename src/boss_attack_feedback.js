import { bossCounterOpen, bossRequiredHits } from "./boss_rules.js";
import { message } from "./i18n.js";

/**
 * 只解释真实战斗窗口，不替代命中判定；canDamage 不保证距离、视线、角度、
 * 接触重置、冷却或技能资源已满足。所有文案保留消息描述，支持显示时切换语言。
 */
export function bossAttackFeedback(boss, player, { ranged = false } = {}) {
  const hits = boss.validatedHits,
    total = bossRequiredHits(boss.species),
    result = (code, canDamage, title, advice, seconds = null) => ({
      code,
      canDamage,
      title,
      advice,
      seconds,
    });
  if (boss.defeated)
    return result(
      "defeated",
      false,
      message`领主已击败 · ${hits}/${total}`,
      message`领主已被击败。`,
    );
  if (player.dead || player.won || player.timedOut)
    return result(
      "unavailable",
      false,
      message`当前无法进攻 · ${hits}/${total}`,
      message`当前无法进攻领主。`,
    );
  if (boss.locked)
    return result(
      "locked",
      false,
      message`护阵未解除 · ${hits}/${total}`,
      boss.species.kind === "sword_sage"
        ? message`先击败四神兽，解除道观护阵。`
        : message`先解除领主护阵。`,
    );
  if (player.length < boss.species.minAttackLength)
    return result(
      "too_small",
      false,
      message`体型不足 · ${hits}/${total}`,
      message`达到${boss.species.minAttackLength}米后才能伤害领主，先撤离补给。`,
    );
  // 同轮已用必须先于短暂冷却显示；脱离和等待冷却不会刷新这个窗口。
  if (boss.openingSpent)
    return result(
      "spent",
      false,
      message`本轮已命中 · ${hits}/${total}`,
      ranged
        ? message`先躲避下一轮技能，等新窗口再开火。`
        : message`先脱离领主，躲过下一轮技能；技能结束后再反击。`,
    );
  if (
    boss.species.guardedPhases?.includes(boss.phase) ||
    !bossCounterOpen(boss)
  ) {
    const action = ranged ? message`开火` : message`反击`;
    if (boss.species.kind === "sword_sage")
      return result(
        "protected",
        false,
        message`剑阵保护中 · ${hits}/${total}`,
        message`先闪避飞剑或冲阵，等收势窗口再${action}。`,
      );
    if (boss.species.kind === "white_tiger")
      return result(
        "protected",
        false,
        message`白虎防御中 · ${hits}/${total}`,
        message`先闪避跃扑或虎啸，等白虎收势再${action}。`,
      );
    if (boss.species.kind === "black_tortoise")
      return result(
        "protected",
        false,
        message`甲阵封闭 · ${hits}/${total}`,
        message`先躲开两道震波，等甲阵消退后再${action}。`,
      );
    return result(
      "protected",
      false,
      message`领主防御中 · ${hits}/${total}`,
      message`先躲开技能，等收势窗口再${action}。`,
    );
  }
  if (boss.phase === "recover") {
    const seconds = Number.isFinite(boss.phaseDuration - boss.timer)
      ? Math.max(0, boss.phaseDuration - boss.timer)
      : 0;
    return result(
      "body",
      true,
      ranged
        ? message`现在开火 · ${hits}/${total}`
        : message`现在反击 · ${hits}/${total}`,
      ranged
        ? message`收势还剩${seconds.toFixed(1)}秒 · 可开火命中本体，每轮一次。`
        : message`收势还剩${seconds.toFixed(1)}秒 · 咬中身体即可，每轮一次。`,
      seconds,
    );
  }
  return result(
    "flank",
    true,
    ranged
      ? message`现在可开火 · ${hits}/${total}`
      : message`侧背可攻击 · ${hits}/${total}`,
    ranged
      ? message`当前可命中本体，每轮一次；仍要躲避领主技能。`
      : message`绕至身体侧面、背后或上下方，朝内接近；正面有甲，仍要躲避技能。`,
  );
}

/** 由真实结算结果解释本次接触；触发频率和显示寿命由场景统一管理。 */
export function bossFailureFeedback(boss, player, result, options = {}) {
  if (!result) return null;
  const hits = boss.validatedHits,
    total = bossRequiredHits(boss.species);
  if (result.hit)
    return result.defeated
      ? message`领主已击败 · 有效命中${hits}/${total}`
      : message`有效命中${hits}/${total} · 本轮已用，先脱离`;
  const feedback = bossAttackFeedback(boss, player, options);
  switch (result.reason) {
    case "cooldown":
      return boss.openingSpent
        ? feedback.advice
        : message`攻击冷却中 · 稍等片刻，再抓住当前窗口。`;
    case "must_disengage":
      return boss.openingSpent
        ? feedback.advice
        : message`还没离开接触范围 · 先退开，再朝身体接近。`;
    case "armored_angle":
      return message`正面护甲挡下了攻击 · 绕到身体侧面、背后或上下方，朝内接近。`;
    case "guardian_locked":
    case "too_small":
    case "shell_guarded":
    case "opening_closed":
    case "opening_spent":
      return feedback.advice;
    case "ineligible":
      if (!feedback.canDamage) return feedback.advice;
      if (player.biteCooldown > 0 || boss.biteCooldown > 0)
        return message`攻击冷却中 · 稍等片刻，再抓住当前窗口。`;
      return null;
    default:
      return null;
  }
}

/**
 * 将战斗提示收敛为一条行动建议；危险保持完整原文，窗口许可仍由原规则解释。
 * notification 由场景筛选为当前活跃通知；本函数只读取状态，不延长反馈寿命。
 */
export function compactBossFeedback(
  boss,
  player,
  {
    ranged = false,
    tip = null,
    recentAttack = null,
    now = 0,
    danger = false,
    notification = null,
  } = {},
) {
  const feedback = bossAttackFeedback(boss, player, { ranged });
  const show = (advice, tone) => ({ ...feedback, advice, tone });
  // 有破绽不等于安全；技能、缠绕与收势反击优先于命中结果和进攻建议。
  if (danger && tip) return show(tip, "danger");
  const cooling = player.biteCooldown > 0 || boss.biteCooldown > 0;
  const recentValid =
    recentAttack?.message &&
    recentAttack.until > now &&
    recentAttack.windowCode === feedback.code &&
    (!["cooldown", "ineligible"].includes(recentAttack.reason) || cooling) &&
    (recentAttack.reason !== "must_disengage" || boss.contactArmed === false);
  if (recentValid)
    return show(
      recentAttack.type === "hit"
        ? feedback.code === "defeated"
          ? feedback.advice
          : message`先脱离，躲过下一轮再攻`
        : recentAttack.message,
      "result",
    );
  if (notification) return show(notification, "neutral");
  switch (feedback.code) {
    case "body":
      return show(
        ranged
          ? message`还剩${feedback.seconds.toFixed(1)}秒 · 开火命中本体`
          : message`还剩${feedback.seconds.toFixed(1)}秒 · 咬中身体`,
        "opportunity",
      );
    case "flank":
      return show(
        ranged ? message`朝本体开火` : message`绕到侧背或上下方，朝内咬击`,
        "opportunity",
      );
    case "spent":
      return show(message`躲过下一轮技能，再进攻`, "neutral");
    case "protected":
      return show(message`躲开技能，等收势再进攻`, "neutral");
    case "too_small":
      return show(
        message`需${boss.species.minAttackLength}米才能伤害领主`,
        "neutral",
      );
    default:
      return show(
        feedback.advice,
        feedback.code === "defeated" ? "result" : "neutral",
      );
  }
}
