// 仅给现有北侧巢穴猎手提供有限路线意图；移动、实体接触和咬击仍走普通生物链路。
const FORK_ROUTE = Object.freeze(
  [
    [-20, -600, -1518],
    [-125, -600, -1518],
    [-125, -600, -1560],
    [-110, -600, -1590],
  ].map((p) => Object.freeze({ x: p[0], y: p[1], z: p[2] })),
);

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const point = (p) =>
  Array.isArray(p)
    ? { x: p[0], y: p[1], z: p[2] }
    : { x: p?.x, y: p?.y, z: p?.z };
const valid = (p) =>
  p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

function projectRoute(position, route, lengths) {
  let best = null;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i],
      dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z,
      length = lengths[i] - lengths[i - 1],
      t = Math.max(
        0,
        Math.min(
          1,
          ((position.x - a.x) * dx +
            (position.y - a.y) * dy +
            (position.z - a.z) * dz) /
            (length * length),
        ),
      ),
      projected = { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t },
      gap = distance(position, projected);
    if (!best || gap < best.gap)
      best = { point: projected, gap, along: lengths[i - 1] + length * t };
  }
  return best;
}

/**
 * 复用百慕大第5号巨型鱼龙。位置支持Vector3或普通{x,y,z}，不会修改输入。
 * canTraverse必须回答原物种完整导航身体的可达性；省略时只沿已验收的固定路线走。
 * 返回target仅是意图，调用者不得直接写mesh位置或改变共享伤害/速度/前摇。
 */
export function createBermudaLairPursuer({
  region,
  contains,
  canTraverse = null,
} = {}) {
  if (typeof contains !== "function")
    throw new TypeError(
      "Bermuda lair pursuer requires the actual cave contains",
    );
  let mode = "idle",
    pursuitAge = 0,
    lostSight = 0,
    rest = 0,
    home = null,
    route = null,
    lengths = null,
    target = null,
    hold = false,
    awakeState = false,
    directCheckAge = Infinity,
    directCheckStart = null,
    directCheckEnd = null,
    directClear = false,
    returnBend = null;

  const matches = (species, populationIndex) =>
    region === "bermuda" &&
    species?.kind === "ichthyotitan" &&
    species.bermudaTitanGuardRevision === "20261121" &&
    populationIndex === 5 &&
    !!species.spawnAnchors?.[5];

  function reset() {
    mode = "idle";
    pursuitAge = lostSight = rest = 0;
    home = route = lengths = target = null;
    hold = awakeState = directClear = false;
    directCheckAge = Infinity;
    directCheckStart = directCheckEnd = null;
    returnBend = null;
  }
  function snapshot() {
    return {
      mode,
      hunting: mode === "pursuing",
      returning: mode === "returning",
      target: target ? point(target) : null,
      hold,
      memoryRemaining: Math.max(0, 8 - lostSight),
      pursuitRemaining: Math.max(0, (awakeState ? 18 : 12) - pursuitAge),
      restRemaining: rest,
    };
  }
  function stop(nextMode = "returning") {
    mode = nextMode;
    pursuitAge = lostSight = 0;
    rest = Math.max(rest, awakeState ? 4 : 6);
    directClear = false;
    directCheckAge = Infinity;
    target = null;
    hold = false;
    returnBend = null;
  }
  function suspend() {
    stop("disabled");
    return snapshot();
  }
  function initRoute(species) {
    if (route) return;
    home = point(species.spawnAnchors[5]);
    route = [home, ...FORK_ROUTE];
    lengths = [0];
    for (let i = 1; i < route.length; i++)
      lengths.push(lengths[i - 1] + distance(route[i - 1], route[i]));
  }
  function routeToward(position, destination) {
    const from = projectRoute(position, route, lengths),
      goal = projectRoute(destination, route, lengths),
      sign = Math.sign(goal.along - from.along);
    // 冲撞偏离航路后先沿真实支路回接，不把最近出口直线当成可穿墙路径。
    if (from.gap > 9) return from.point;
    if (sign > 0) {
      for (let i = 1; i < route.length; i++)
        if (lengths[i] > from.along + 4 && lengths[i] < goal.along - 3)
          return point(route[i]);
    } else if (sign < 0) {
      for (let i = route.length - 2; i >= 0; i--)
        if (lengths[i] < from.along - 4 && lengths[i] > goal.along + 3)
          return point(route[i]);
    }
    return goal.point;
  }

  function step(
    dt,
    {
      species,
      populationIndex,
      position,
      player,
      visible = false,
      eligible = true,
      active = true,
      playerAlive = true,
      awake = false,
      secured = false,
      entombed = false,
      disabled = false,
    } = {},
  ) {
    if (!matches(species, populationIndex)) return null;
    if (!active || !Number.isFinite(dt) || dt <= 0) return snapshot();
    initRoute(species);
    awakeState = !!awake;
    const current = point(position),
      prey = point(player);
    if (!valid(current) || !valid(prey)) return suspend();
    if (disabled) return suspend();

    rest = Math.max(0, rest - dt);
    directCheckAge += dt;
    const inside = contains(prey, 0) && contains(current, 0),
      preyRoute = projectRoute(prey, route, lengths),
      allowed =
        inside &&
        eligible &&
        playerAlive &&
        !secured &&
        !entombed &&
        preyRoute.gap <= 75;
    if (!allowed) {
      // 洞外/终局立即禁追；返家是连续普通移动，不瞬移也不保留咬击许可。
      if (mode === "pursuing" || mode === "disabled") stop();
      else if (distance(current, home) > 5) mode = "returning";
    } else if (mode === "disabled") stop();

    if (mode === "pursuing") {
      pursuitAge += dt;
      lostSight = visible ? 0 : lostSight + dt;
      if (
        lostSight >= 8 ||
        pursuitAge >= (awakeState ? 18 : 12) ||
        distance(current, prey) > 210
      )
        stop();
    }
    if (mode === "returning") {
      // 嘴前不能原地180度选最短角：先在东侧开阔水域前游转弯，再接回北支路。
      if (!returnBend && current.z < -1570 && current.x < -90)
        returnBend = [
          { x: -85, y: -600, z: -1592 },
          { x: -85, y: -600, z: -1558 },
          { x: -125, y: -600, z: -1560 },
        ];
      // 原24m/s与逐步回转需要约11m半径；提前看向下一弯，不绕一个精确点打转。
      while (returnBend?.length && distance(current, returnBend[0]) < 12)
        returnBend.shift();
      // 当前猎手居所在东侧岔路内；完成最初的前游转弯后，确实能通行才直接返家。
      // 不能沿旧支路先游到北岩屏再180度折回，也不能把意图直接写成位置。
      const nearHome = distance(current, home) <= 90,
        turnedAway = !returnBend || returnBend.length < 3;
      if (
        nearHome &&
        turnedAway &&
        canTraverse &&
        (directCheckAge >= 0.3 ||
          !directCheckStart ||
          distance(current, directCheckStart) > 3 ||
          !directCheckEnd ||
          distance(home, directCheckEnd) > 0.001)
      ) {
        directClear = !!canTraverse(current, home, {
          species,
          populationIndex,
        });
        directCheckAge = 0;
        directCheckStart = point(current);
        directCheckEnd = point(home);
      }
      target =
        nearHome && turnedAway && canTraverse && directClear
          ? point(home)
          : returnBend?.length
            ? point(returnBend[0])
            : routeToward(current, home);
      hold = distance(current, target) < 3;
      if (distance(current, home) <= 5) {
        mode = rest > 0 ? "resting" : "idle";
        target = null;
        hold = rest > 0;
      }
      return snapshot();
    }
    if (mode === "resting") {
      target = null;
      hold = true;
      if (rest > 0) return snapshot();
      mode = "idle";
    }
    if (
      mode === "idle" &&
      allowed &&
      visible &&
      rest <= 0 &&
      distance(current, prey) <= 150
    ) {
      mode = "pursuing";
      pursuitAge = lostSight = 0;
      directCheckAge = Infinity;
    }
    if (mode === "pursuing") {
      const close = distance(current, prey) <= 38;
      if (
        close &&
        canTraverse &&
        (directCheckAge >= 0.3 ||
          !directCheckStart ||
          distance(current, directCheckStart) > 3 ||
          distance(prey, directCheckEnd) > 3)
      ) {
        directClear = !!canTraverse(current, prey, {
          species,
          populationIndex,
        });
        directCheckAge = 0;
        directCheckStart = point(current);
        directCheckEnd = point(prey);
      }
      target =
        close && directClear
          ? point(prey)
          : routeToward(current, preyRoute.point);
      hold = distance(current, target) < 3;
    } else {
      target = null;
      hold = false;
    }
    return snapshot();
  }

  return { matches, step, suspend, reset, inspect: snapshot };
}
