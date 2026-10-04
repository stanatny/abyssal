/** 辉渊长腕的有限攻击时序；三腕依次刺向预警落点，不追踪释放后的玩家。 */
export const LUMEN_LASH = Object.freeze({
  range: 88,
  interval: 0.5,
  extensionTime: 0.3,
  holdTime: 0.12,
  retractTime: 0.38,
  tipRadius: 2.2,
  targetSpread: 5,
});

/** 每条腕的连续展开比例；触腕回收不结算伤害。 */
export function lumenLashPose(timer, index, attacking) {
  if (!attacking) return { amount: 0, striking: false };
  const age = timer - index * LUMEN_LASH.interval;
  const { extensionTime: out, holdTime: hold, retractTime: back } = LUMEN_LASH;
  if (age < 0 || age >= out + hold + back)
    return { amount: 0, striking: false };
  if (age <= out)
    return { amount: Math.sin(((age / out) * Math.PI) / 2), striking: true };
  if (age <= out + hold) return { amount: 1, striking: true };
  return {
    amount: Math.cos((((age - out - hold) / back) * Math.PI) / 2),
    striking: false,
  };
}
