/** 收势仍可反击：低速绕位和一次有完整预警的正面戒备，不改变有效咬击窗口。 */
export const LORD_RECOVERY = Object.freeze({
  settle: 0.35,
  guardAfter: 0.6,
  warning: 0.75,
  strike: 0.25,
  endMargin: 0.1,
  turnRate: 0.9,
  spentTurnRate: 1.5,
  damageFraction: 0.25,
  coneCosine: 0.5,
  color: 0xff8977,
});

/** 戒备每个真实收势期最多一次；用技能时钟计时，暂停无需另一套计时器。 */
export function recoveryGuardStatus(startedAt, timer) {
  if (startedAt < 0) return "idle";
  const elapsed = timer - startedAt;
  if (elapsed < LORD_RECOVERY.warning) return "warning";
  if (elapsed < LORD_RECOVERY.warning + LORD_RECOVERY.strike) return "strike";
  return "spent";
}

export function recoveryGuardCanStart(boss, distance, playerLength, sight) {
  return (
    sight &&
    boss.timer >= LORD_RECOVERY.guardAfter &&
    boss.phaseDuration - boss.timer >=
      LORD_RECOVERY.warning + LORD_RECOVERY.strike + LORD_RECOVERY.endMargin &&
    distance <= boss.species.length * 0.55 + playerLength * 0.45
  );
}

/** 尚未命中的绕位低于普通巡航速度；命中后加快重整，鼓励及时脱离。 */
export function recoverySpeed(boss) {
  if (boss.timer < LORD_RECOVERY.settle) return 2;
  return boss.openingSpent
    ? Math.min(16, boss.species.speed * 0.45)
    : Math.min(9, boss.species.speed * 0.25);
}

/** 戒备只覆盖锁定的正面120度；上下、侧背与被遮挡的真实接触可以避开。 */
export function inRecoveryGuard(offset, direction) {
  const distance = Math.hypot(offset.x, offset.y, offset.z);
  return (
    distance > 1e-9 &&
    (offset.x * direction.x + offset.y * direction.y + offset.z * direction.z) /
      distance >=
      LORD_RECOVERY.coneCosine
  );
}
