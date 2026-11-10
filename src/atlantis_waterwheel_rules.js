/** 六只定量阀组成算术水位锁；观察、调节免费，只有主动试闸才结算。 */
export const WATERWHEEL_RULES = Object.freeze({
  damage: 30,
  retry: 3,
  fillSeconds: 3.5,
  valveCount: 6,
  host: "agora_bridges",
});

function challenges(amounts) {
  const sums = new Map();
  for (let mask = 1; mask < 2 ** amounts.length; mask++) {
    let sum = 0,
      count = 0;
    amounts.forEach((amount, i) => {
      if (mask & (1 << i)) {
        sum += amount;
        count++;
      }
    });
    const entry = sums.get(sum) || { count, matches: 0 };
    entry.matches++;
    sums.set(sum, entry);
  }
  const capacity = amounts.reduce((a, b) => a + b, 0);
  return [...sums]
    .filter(
      ([sum, entry]) =>
        entry.matches === 1 &&
        entry.count >= 3 &&
        entry.count <= 4 &&
        sum >= capacity * 0.32 &&
        sum <= capacity * 0.68,
    )
    .map(([sum]) => sum);
}

/** 有界抽签保证每局可解，且必须选择三至四阀；不把解答保存到玩家状态。 */
export function createWaterwheelState(random = Math.random) {
  const pick = (n) => {
    const r = random();
    return Math.floor(
      Math.max(0, Math.min(0.999999999, Number.isFinite(r) ? r : 0)) * n,
    );
  };
  let amounts, targets;
  for (let attempt = 0; attempt < 32; attempt++) {
    const pool = Array.from({ length: 20 }, (_, i) => i + 2);
    amounts = Array.from(
      { length: WATERWHEEL_RULES.valveCount },
      () => pool.splice(pick(pool.length), 1)[0],
    );
    targets = challenges(amounts);
    if (targets.length) break;
  }
  if (!targets.length) {
    amounts = [3, 7, 12, 18, 26, 35];
    targets = challenges(amounts);
  }
  return {
    amounts,
    target: targets[pick(targets.length)],
    valves: Array(WATERWHEEL_RULES.valveCount).fill(false),
    level: 0,
    pressure: 0,
    cooldown: 0,
    solved: false,
    discovered: false,
    result: "",
    opening: 0,
  };
}
export const waterwheelTotal = (state) =>
  state.amounts.reduce((sum, n, i) => sum + (state.valves[i] ? n : 0), 0);
export const waterwheelSettled = (state) =>
  Math.abs(state.level - waterwheelTotal(state)) < 0.00001;

export function stepWaterwheel(
  state,
  dt,
  { active = true, nearby = true, action = null, vulnerable = true } = {},
) {
  if (!active) return null;
  const step = Math.min(0.12, Math.max(0, Number.isFinite(dt) ? dt : 0));
  state.cooldown = Math.max(0, state.cooldown - step);
  if (nearby) state.discovered = true;
  if (state.solved) {
    state.opening = Math.min(1, state.opening + step / 2);
    return null;
  }
  const valve =
    typeof action === "string" && /^valve[0-5]$/.test(action)
      ? Number(action.slice(5))
      : -1;
  // 免费调整不受失败冷却或受伤保护限制，也不会清除试闸冷却。
  if (nearby && valve >= 0) {
    state.valves[valve] = !state.valves[valve];
    state.result = "";
  }
  const total = waterwheelTotal(state),
    capacity = state.amounts.reduce((a, b) => a + b, 0);
  const delta = total - state.level,
    travel = (step * capacity) / WATERWHEEL_RULES.fillSeconds;
  state.level =
    Math.abs(delta) <= travel ? total : state.level + Math.sign(delta) * travel;
  state.pressure = state.level / capacity;
  // 水位动画只是反馈，绝不能在上升途中穿过目标时抢按获胜。
  if (
    action !== "test" ||
    !nearby ||
    state.cooldown > 0 ||
    !vulnerable ||
    !waterwheelSettled(state)
  )
    return null;
  if (total === state.target) {
    state.solved = true;
    state.result = "solved";
    return { kind: "solved" };
  }
  state.cooldown = WATERWHEEL_RULES.retry;
  state.result = total < state.target ? "low" : "high";
  // 错误试闸自动复位；数值和目标保留，水箱随后沿原排水动画归零。
  state.valves.fill(false);
  return { kind: "failed", damage: WATERWHEEL_RULES.damage };
}
