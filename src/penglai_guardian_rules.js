/** 各波前的半径由表现与伤害共用；未发射或已消散返回负数。 */
export function guardianPulseRadius(species, index, time, phaseDuration) {
  const duration = species.pulseWaveDuration ?? phaseDuration;
  const age = time - index * (species.pulseWaveInterval ?? 0);
  if (age < 0 || age > duration) return -1;
  return 8 + ((species.abilityRadius - 8) * age) / duration;
}
/** 锁定音浪的有限锥形波前；同时扫掠角色和波前，不把整个锥体当成瞬发伤害。 */
export function guardianRoarContact(
  a,
  b,
  origin,
  direction,
  previousTime,
  time,
  rule,
  padding = 0,
) {
  const ax = a.x - origin.x,
    ay = a.y - origin.y,
    az = a.z - origin.z;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const along = ax * direction.x + ay * direction.y + az * direction.z;
  const delta = dx * direction.x + dy * direction.y + dz * direction.z;
  const f0 = Math.max(0, Math.min(rule.range, previousTime * rule.speed));
  const f1 = Math.max(0, Math.min(rule.range, time * rule.speed));
  let lo = 0,
    hi = 1;
  const clip = (start, step, min, max) => {
    if (Math.abs(step) < 1e-9) return start >= min && start <= max;
    const p = (min - start) / step,
      q = (max - start) / step;
    lo = Math.max(lo, Math.min(p, q));
    hi = Math.min(hi, Math.max(p, q));
    return lo <= hi;
  };
  if (
    !clip(along, delta, 0, rule.range) ||
    !clip(
      along - f0,
      delta - (f1 - f0),
      -rule.band - padding,
      rule.band + padding,
    )
  )
    return false;
  const x = ax - along * direction.x,
    y = ay - along * direction.y,
    z = az - along * direction.z;
  const vx = dx - delta * direction.x,
    vy = dy - delta * direction.y,
    vz = dz - delta * direction.z;
  const r = rule.baseRadius + f0 * rule.spread + padding,
    vr = (f1 - f0) * rule.spread;
  const aa = vx * vx + vy * vy + vz * vz - vr * vr,
    bb = 2 * (x * vx + y * vy + z * vz - r * vr),
    cc = x * x + y * y + z * z - r * r;
  const value = (t) => aa * t * t + bb * t + cc;
  return (
    Math.min(
      value(lo),
      value(hi),
      aa > 0 ? value(Math.max(lo, Math.min(hi, -bb / (2 * aa)))) : Infinity,
    ) <= 0
  );
}
