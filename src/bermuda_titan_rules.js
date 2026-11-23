import { bodyOffsets } from "./collision.js";

export const BERMUDA_TITAN_RULES = Object.freeze({
  cooldown: 5,
  charging: 2.5,
  breath: 3,
  breathDamage: 40,
  breathHitInterval: 1,
  mistakeDamage: 30,
  mistakeInterval: 1.2,
  beamRadius: 8,
  beamRange: 230,
  guardRelease: 1,
  guardClose: 1,
  guardWindow: 1.6,
  guardWarning: 0.4,
  collectionWindow: 7.6,
  collectionCooldown: 10.8,
  collectionWarning: 1.2,
  collectionTransition: 1.4,
  guardCrushDamage: 30,
  guardCrushInterval: 1,
  escapeDuration: 60,
  sealingDuration: 3,
});

// 三种固定轮换可复现预告，变化来自已蓄光的节奏与方向，不向玩家位置追踪。
export const BERMUDA_TITAN_BREATH_PROFILES = Object.freeze([
  Object.freeze({
    id: "low_fan",
    cooldown: 5,
    charging: 2.5,
    breath: 3,
    fanYaw: 0.38,
    downBend: 0.94,
    sweepYaw: 0.18,
    maxRadius: 4.2,
    headYaw: -0.015,
    headPitch: -0.035,
  }),
  Object.freeze({
    id: "double_surge",
    cooldown: 6.4,
    charging: 3,
    breath: 2.9,
    fanYaw: 0.44,
    downBend: 0.86,
    sweepYaw: 0.15,
    maxRadius: 4.6,
    headYaw: 0.025,
    headPitch: -0.028,
  }),
  Object.freeze({
    id: "cross_wash",
    cooldown: 5.4,
    charging: 2.7,
    breath: 2.7,
    fanYaw: 0.49,
    downBend: 0.96,
    sweepYaw: 0.23,
    maxRadius: 4.3,
    headYaw: -0.02,
    headPitch: -0.033,
  }),
]);
const profileForCycle = (value) => {
  const cycle = Math.max(0, Math.floor(value || 0));
  // 最初三式便于学习，后续固定整数哈希打散顺序；同一轮不会随帧率或玩家位置跳变。
  let hash = cycle;
  if (cycle >= 3) {
    hash = Math.imul(cycle ^ 0x9e3779b9, 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    hash = (hash ^ (hash >>> 16)) >>> 0;
  }
  return BERMUDA_TITAN_BREATH_PROFILES[
    hash % BERMUDA_TITAN_BREATH_PROFILES.length
  ];
};
const attackProfile = (state) => profileForCycle(state.cycles);
export function bermudaTitanPhaseDuration(state, phase) {
  if (!state.relicHeld)
    return state.barrierOpen && phase === "cooldown"
      ? Math.max(
          attackProfile(state).cooldown,
          BERMUDA_TITAN_RULES.collectionCooldown,
        )
      : attackProfile(state)[phase];
  // 苏醒后靠频率与落点增难，仍给成年角色至少2.4秒可反应预告。
  const n = Math.imul((state.hazardSeed || 1) ^ state.cycles, 0x45d9f3b) >>> 0,
    variation = (n % 1000) / 1000;
  return phase === "cooldown"
    ? 2.2 + variation * 1.2
    : phase === "charging"
      ? 2.4 + variation * 0.6
      : 1.5 + variation * 0.7;
}
const smoothUnit = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** 头只轻倾，陡向下的形状由离嘴后的水焰弯曲提供；同一帧交给真实头姿与吐息场。 */
export function bermudaTitanBreathFrame(state) {
  const profile = attackProfile(state),
    duration = state.phaseDuration ?? profile[state.phase] ?? 5,
    progress = Math.max(0, Math.min(1, 1 - state.remaining / duration)),
    charged = state.phase === "charging",
    breathing = state.phase === "breath",
    terminal = state.secured || state.entombed,
    elapsed = progress * duration,
    // 先用极短蓄光让真实头到位，随后预演整段扫动；预告不从另一副嘴姿穿过护臂。
    attackProgress = charged
      ? Math.max(0, Math.min(1, (elapsed - 0.35) / (duration - 0.35)))
      : breathing
        ? progress
        : 0,
    wave = Math.sin(attackProgress * Math.PI * 2),
    sweep =
      profile.sweepYaw *
      (0.72 * wave + 0.28 * Math.sin(attackProgress * Math.PI * 4)),
    pulse = true,
    returning = state.phase === "cooldown" && state.cycles > 0,
    leanProfile = returning ? profileForCycle(state.cycles - 1) : profile,
    lean = charged
      ? smoothUnit(elapsed / 0.35)
      : breathing
        ? 1
        : returning
          ? 1 - smoothUnit(elapsed / 0.8)
          : 0,
    leanScale = Math.min(
      1,
      0.035 /
        Math.max(1e-9, Math.hypot(leanProfile.headYaw, leanProfile.headPitch)),
    );
  return {
    patternId: profile.id,
    phaseDuration: duration,
    progress: attackProgress,
    headYaw: terminal
      ? 0
      : Math.max(
          -0.035,
          Math.min(0.035, leanProfile.headYaw * lean * leanScale),
        ),
    headPitch: terminal
      ? 0
      : Math.max(
          -0.035,
          Math.min(0.035, leanProfile.headPitch * lean * leanScale),
        ),
    emitting: !!breathing && !terminal && pulse,
    warning: !!charged || (!!breathing && !terminal && !pulse),
    visible: !terminal && (charged || breathing),
    sweepYaw: sweep,
    fanYaw: profile.fanYaw,
    downBend: profile.downBend + 0.055 * wave,
    maxRadius: profile.maxRadius,
    range: 150,
  };
}

// 入口石碑与三座实际封印使用同一可见顺序。
export const BERMUDA_TITAN_SEALS = Object.freeze(["wave", "bone", "flame"]);
export const BERMUDA_TITAN_EXITS = Object.freeze(["north"]);

export function createBermudaTitanState({ seed = 0xabba2026 } = {}) {
  return {
    hazardSeed: seed >>> 0,
    sleeping: true,
    phase: "cooldown",
    remaining: BERMUDA_TITAN_RULES.cooldown,
    phaseDuration: BERMUDA_TITAN_RULES.cooldown,
    breathEmitting: false,
    clock: 0,
    cycles: 0,
    completed: 0,
    barrierOpen: false,
    relicCollected: false,
    relicHeld: false,
    escaping: false,
    escapeRemaining: BERMUDA_TITAN_RULES.escapeDuration,
    escapePortal: null,
    escaped: false,
    sealingRemaining: BERMUDA_TITAN_RULES.sealingDuration,
    sealAmount: 0,
    sealed: false,
    secured: false,
    entombed: false,
    awareness: 0,
    guardOpen: false,
    guardAmount: 1,
    guardClosing: false,
    guardCrushing: false,
    crushCooldown: 0,
    lastSeal: null,
    touchingRelic: false,
    relicAccessReady: false,
    hitCooldown: 0,
    mistakeCooldown: 0,
  };
}

export function resetBermudaTitanState(state, options) {
  Object.assign(state, createBermudaTitanState(options));
  return state;
}

function guardTiming(state) {
  const duration = state.phaseDuration ?? attackProfile(state).cooldown,
    elapsed = duration - state.remaining,
    collecting =
      state.barrierOpen &&
      duration >= BERMUDA_TITAN_RULES.collectionCooldown - 1e-9,
    window = Math.min(
      collecting
        ? BERMUDA_TITAN_RULES.collectionWindow
        : BERMUDA_TITAN_RULES.guardWindow,
      duration - 0.6,
    ),
    open = (duration - window) / 2,
    close = open + window,
    transition = Math.min(
      collecting ? BERMUDA_TITAN_RULES.collectionTransition : 0.65,
      open,
    ),
    release = open - transition,
    shut = close + transition;

  return {
    duration,
    elapsed,
    collecting,
    open,
    close,
    transition,
    release,
    shut,
  };
}

/** 前爪只在冷却中段短暂卸重；压回预告先于实体运动，避免提示出现时已被夹住。 */
export function bermudaTitanGuardPose(state) {
  if (state.phase !== "cooldown")
    return {
      guardOpen: false,
      guardAmount: 1,
      guardClosing: false,
      guardCrushing: false,
    };
  const {
    duration,
    elapsed,
    collecting,
    open,
    close,
    transition,
    release,
    shut,
  } = guardTiming(state);
  const smooth = (v) => {
    const t = Math.max(0, Math.min(1, v));
    return t * t * (3 - 2 * t);
  };
  return {
    guardOpen: elapsed + 1e-9 >= open && elapsed < close - 1e-9,
    guardClosing:
      elapsed >=
        close -
          (collecting
            ? BERMUDA_TITAN_RULES.collectionWarning
            : BERMUDA_TITAN_RULES.guardWarning) && elapsed < shut,
    guardCrushing: elapsed > close && elapsed < shut,
    guardAmount:
      elapsed < open
        ? 1 - smooth((elapsed - release) / transition)
        : elapsed > close
          ? smooth((elapsed - close) / transition)
          : 0,
  };
}

/** 只推进活动游戏时间；取宝后的苏醒是环境逃生，不增加可击杀领主。 */
export function stepBermudaTitan(
  state,
  dt,
  {
    active = true,
    activeTimeDt,
    seal = null,
    relic = false,
    relicAccessible = true,
    guardContact = false,
    beamContact = false,
    escapeContact = null,
    escapeSafe = false,
    portalsSealed = false,
  } = {},
) {
  if (!active || state.secured || state.entombed) return [];
  const delta = Math.max(0, Math.min(0.12, Number.isFinite(dt) ? dt : 0)),
    activeDelta =
      activeTimeDt === undefined
        ? delta
        : Math.max(0, Number.isFinite(activeTimeDt) ? activeTimeDt : 0),
    events = [],
    heldBefore = state.relicHeld;
  state.clock += activeDelta;
  state.hitCooldown = Math.max(0, state.hitCooldown - activeDelta);
  state.mistakeCooldown = Math.max(0, state.mistakeCooldown - activeDelta);
  state.crushCooldown = Math.max(0, state.crushCooldown - activeDelta);
  // 大帧可以消耗真正的撤离时间，但不能追赶跨过新预警或把完整喷流画成半截。
  state.remaining = Math.max(
    0,
    state.remaining -
      (state.phase === "charging" ? Math.min(activeDelta, 0.25) : activeDelta),
  );
  if (state.remaining <= 1e-9) {
    state.phase =
      state.phase === "cooldown"
        ? "charging"
        : state.phase === "charging"
          ? "breath"
          : "cooldown";
    if (state.phase === "cooldown") state.cycles++;
    state.phaseDuration = bermudaTitanPhaseDuration(state, state.phase);
    state.remaining = state.phaseDuration;
    events.push({ kind: "phase", phase: state.phase });
  }
  Object.assign(state, bermudaTitanGuardPose(state));

  // 持续贴住只算一次尝试。非冷却期或错序后须离开再触碰，不逐帧扣血。
  const validSeal = BERMUDA_TITAN_SEALS.includes(seal) ? seal : null,
    enteredSeal = validSeal && validSeal !== state.lastSeal;
  state.lastSeal = validSeal;
  if (enteredSeal && !state.barrierOpen) {
    const index = BERMUDA_TITAN_SEALS.indexOf(validSeal);
    if (index < state.completed) {
      // 已完成封印保留进度，再次经过不处罚。
    } else if (state.phase !== "cooldown")
      events.push({ kind: "seal_wait", seal: validSeal });
    else if (index !== state.completed) {
      if (state.mistakeCooldown <= 1e-9) {
        state.mistakeCooldown = BERMUDA_TITAN_RULES.mistakeInterval;
        events.push({
          kind: "seal_wrong",
          seal: validSeal,
          damage: BERMUDA_TITAN_RULES.mistakeDamage,
          completed: state.completed,
        });
      }
    } else {
      state.completed++;
      events.push({
        kind: "seal",
        seal: validSeal,
        completed: state.completed,
      });
      if (state.completed === BERMUDA_TITAN_SEALS.length) {
        const before = guardTiming(state);
        state.barrierOpen = true;
        // 最后一枚封印在前爪卸重或压回中途解开时，延长恢复窗口，
        // 同时保持当前真实姿态连续。
        state.phaseDuration = bermudaTitanPhaseDuration(state, "cooldown");
        const after = guardTiming(state);
        const fraction = (v) => Math.max(0, Math.min(1, v));
        const nextElapsed =
          before.elapsed < before.open
            ? after.release +
              after.transition *
                fraction((before.elapsed - before.release) / before.transition)
            : before.elapsed <= before.close
              ? after.open
              : after.close +
                after.transition *
                  fraction((before.elapsed - before.close) / before.transition);
        state.remaining = state.phaseDuration - nextElapsed;
        Object.assign(state, bermudaTitanGuardPose(state));
        events.push({ kind: "barrier_open" });
      }
    }
  }

  const accessible =
    typeof relicAccessible === "function"
      ? relicAccessible(state)
      : relicAccessible;
  // 接触查询读取与本帧前爪完全相同的姿态；正常无敌/减伤由主循环处理。
  if (
    state.guardCrushing &&
    state.crushCooldown <= 1e-9 &&
    (typeof guardContact === "function" ? guardContact(state) : guardContact)
  ) {
    state.crushCooldown = BERMUDA_TITAN_RULES.guardCrushInterval;
    events.push({
      kind: "guard_crush",
      damage: BERMUDA_TITAN_RULES.guardCrushDamage,
    });
  }
  const relicContact = typeof relic === "function" ? relic(state) : relic,
    enteredRelic = relicContact && !state.touchingRelic,
    accessReady =
      !!relicContact &&
      state.phase === "cooldown" &&
      state.guardOpen &&
      accessible === true,
    newlyAccessible = accessReady && !state.relicAccessReady;
  state.touchingRelic = !!relicContact;
  state.relicAccessReady = accessReady;
  if (enteredRelic && !state.relicHeld) {
    if (!state.barrierOpen) events.push({ kind: "relic_locked" });
    else if (state.phase !== "cooldown") events.push({ kind: "relic_wait" });
    else if (!state.guardOpen || accessible !== true)
      events.push({
        kind: "relic_guarded",
        reason: state.guardOpen ? "occluded" : "guard_closed",
      });
    else {
      holdRelic(state, events);
    }
  } else if (newlyAccessible && state.barrierOpen && !state.relicHeld) {
    // 当前真实爪姿刚刚让开即构成新的接触机会；遮挡期间不刷提示、也不预发奖励。
    holdRelic(state, events);
  }
  if (heldBefore) {
    // 只有真实出口的完整身体扫掠可开始封门；中心越界、侧墙和瞬移均由实口检测拒绝。
    if (state.escaped && escapeSafe !== true) {
      state.escaped = false;
      state.escaping = true;
      state.escapePortal = null;
      state.sealingRemaining = BERMUDA_TITAN_RULES.sealingDuration;
      state.sealAmount = 0;
      events.push({ kind: "escape_returned" });
    }
    if (state.escaping) {
      const fraction = Number.isFinite(escapeContact?.crossing)
          ? Math.max(0, Math.min(1, escapeContact.crossing))
          : 1,
        validExit =
          BERMUDA_TITAN_EXITS.includes(escapeContact?.id) &&
          escapeSafe === true;
      if (validExit && state.escapeRemaining + 1e-9 >= activeDelta * fraction) {
        state.escapeRemaining = Math.max(
          0,
          state.escapeRemaining - activeDelta * fraction,
        );
        state.escaping = false;
        state.escaped = true;
        state.escapePortal = escapeContact.id;
        // 出口这一帧不抢先封门，先完整让过玩家身体。
        events.push({ kind: "escaped", portal: escapeContact.id });
      } else {
        state.escapeRemaining = Math.max(
          0,
          state.escapeRemaining - activeDelta,
        );
        if (state.escapeRemaining <= 1e-9) {
          state.entombed = true;
          state.escaping = false;
          state.awareness = 1;
          events.push({ kind: "entombed", fatal: true });
        }
      }
    } else if (state.escaped && escapeSafe === true) {
      state.sealingRemaining = Math.max(
        0,
        state.sealingRemaining - activeDelta,
      );
      if (state.sealingRemaining <= 1e-9) state.sealingRemaining = 0;
      state.sealAmount =
        1 - state.sealingRemaining / BERMUDA_TITAN_RULES.sealingDuration;
      events.push(
        ...confirmBermudaTitanSecured(state, { escapeSafe, portalsSealed }),
      );
    }
    state.awareness = state.entombed
      ? 1
      : Math.max(
          state.awareness,
          0.32 +
            0.63 *
              (1 - state.escapeRemaining / BERMUDA_TITAN_RULES.escapeDuration),
        );
  }
  const frame = bermudaTitanBreathFrame(state);
  if (frame.emitting && !state.breathEmitting)
    events.push({ kind: "breath_pulse", patternId: frame.patternId });
  state.breathEmitting = frame.emitting;
  if (
    frame.emitting &&
    state.hitCooldown <= 1e-9 &&
    (typeof beamContact === "function" ? beamContact(state) : beamContact)
  ) {
    state.hitCooldown = BERMUDA_TITAN_RULES.breathHitInterval;
    events.push({
      kind: "breath_hit",
      damage: BERMUDA_TITAN_RULES.breathDamage,
    });
  }
  return events;
}

function holdRelic(state, events) {
  state.relicHeld = true;
  state.escaping = true;
  state.sleeping = false;
  state.awareness = 0.32;
  events.push({
    kind: "relic_held",
    remaining: BERMUDA_TITAN_RULES.escapeDuration,
  });
}

/** 真实门体回执与完整身体安全缺一不可，避免只有封门动画就结算胜利。 */
export function confirmBermudaTitanSecured(
  state,
  { escapeSafe = false, portalsSealed = false } = {},
) {
  if (
    state.entombed ||
    state.secured ||
    !state.relicHeld ||
    !state.escaped ||
    state.sealAmount < 1 - 1e-9 ||
    escapeSafe !== true ||
    portalsSealed !== true
  )
    return [];
  state.sealed = true;
  state.secured = true;
  state.breathEmitting = false;
  state.relicCollected = true;
  return [{ kind: "secured", portal: state.escapePortal }];
}

export function bermudaTitanVictory({ lordsDefeated, relicCollected }) {
  return lordsDefeated >= 4 && relicCollected === true;
}

/** 七条相互重叠的水焰离嘴后向下弯曲，每段真实半径同时用于画面、裁墙和伤害。 */
export function createTitanBreathField(
  { mouth, direction, frame },
  obstruct = () => null,
) {
  if (!frame?.visible)
    return {
      active: false,
      warning: false,
      cells: [],
      patternId: frame?.patternId,
      origin: { ...mouth },
    };
  const base = normalize(direction),
    horizontal =
      Math.hypot(base.x, base.z) > 1e-8
        ? normalize({ x: base.x, y: 0, z: base.z })
        : { x: 0, y: 0, z: -1 },
    side = normalize({ x: -horizontal.z, y: 0, z: horizontal.x }),
    basePitch = Math.asin(Math.max(-1, Math.min(1, base.y))),
    distances = [0, 5, 9, 14, 21, 31, 45, 65, frame.range ?? 150],
    cells = [];
  for (let lane = -3; lane <= 3; lane++) {
    let previous = { ...mouth };
    for (let step = 0; step < distances.length - 1; step++) {
      const start = distances[step],
        end = distances[step + 1],
        mid = (start + end) / 2,
        unfold = smoothUnit((mid - 5) / 9),
        yaw = (frame.sweepYaw + (frame.fanYaw * lane) / 3) * unfold,
        bend =
          (frame.downBend +
            0.035 * Math.sin(lane * 1.7 + frame.progress * Math.PI * 2)) *
          unfold,
        pitch = Math.max(-1.35, Math.min(0.2, basePitch - bend)),
        heading = add(
          scale(horizontal, Math.cos(yaw)),
          scale(side, Math.sin(yaw)),
        ),
        tangent = {
          x: heading.x * Math.cos(pitch),
          y: Math.sin(pitch),
          z: heading.z * Math.cos(pitch),
        },
        target = add(previous, scale(tangent, end - start)),
        radius = 1.25 + (frame.maxRadius - 1.25) * smoothUnit(mid / 26),
        hit = obstruct(previous, target, radius, {
          lane,
          step,
          origin: mouth,
          originGrace: step === 0,
        }),
        to = hit ? { ...hit.point } : target;
      if (dot(sub(to, previous), sub(to, previous)) > 1e-8)
        cells.push({
          from: { ...previous },
          to,
          radius,
          lane,
          step,
          distanceStart: start,
          distanceEnd: end,
        });
      if (hit) break;
      previous = target;
    }
  }
  return {
    active: frame.emitting,
    warning: frame.warning,
    cells,
    patternId: frame.patternId,
    origin: { ...mouth },
  };
}

/** 画面中的每段球胶囊直接扫掠整条身体；不用旧直线或更大的隐藏范围代替。 */
export function titanBreathFieldContact(field, previous, position, body = {}) {
  if (!field?.active) return false;
  return field.cells.some((cell) =>
    titanBreathContact(
      {
        from: cell.from,
        to: cell.to,
        radius: cell.radius,
        distance: Math.sqrt(
          dot(sub(cell.to, cell.from), sub(cell.to, cell.from)),
        ),
      },
      previous,
      position,
      // 环境危区覆盖与洞口相同的可见首尾；不改变普通捕食或共享运动体积。
      { ...body, length: (body.length || 0) * (0.52 / 0.42) },
    ),
  );
}

/** 使用真实嘴部的固定朝向；同一条裁剪后线段同时驱动画面和伤害。 */
export function createTitanBreathSegment(layout, obstruct = () => null) {
  const from = { ...layout.mouth },
    direction = normalize(layout.direction),
    radius = layout.radius ?? BERMUDA_TITAN_RULES.beamRadius,
    range = layout.range ?? BERMUDA_TITAN_RULES.beamRange,
    end = add(from, scale(direction, range)),
    hit = obstruct(from, end, radius),
    distance = hit
      ? Math.max(0, Math.min(range, dot(sub(hit.point, from), direction)))
      : range;
  return { from, to: add(from, scale(direction, distance)), radius, distance };
}

/** 扫掠完整身体，快速横穿也不能跳过固定吐息束。 */
export function titanBreathContact(segment, previous, position, body = {}) {
  if (!(segment.distance > 0)) return false;
  const radius = body.radius ?? Math.max(0.65, (body.length || 0) * 0.13),
    maximum = (segment.radius + radius) ** 2;
  return bodyOffsets({ ...body, radius }).some(
    (offset) =>
      segmentDistanceSquared(
        add(previous, offset),
        add(position, offset),
        segment.from,
        segment.to,
      ) <= maximum,
  );
}

function segmentDistanceSquared(p, q, a, b) {
  const d = sub(q, p),
    e = sub(b, a),
    r = sub(p, a),
    dd = dot(d, d),
    ee = dot(e, e),
    er = dot(e, r);
  let s = 0,
    t = 0;
  if (dd <= 1e-12 && ee <= 1e-12) return dot(r, r);
  if (dd <= 1e-12) t = clamp(er / ee);
  else {
    const dr = dot(d, r);
    if (ee <= 1e-12) s = clamp(-dr / dd);
    else {
      const de = dot(d, e),
        denominator = dd * ee - de * de;
      if (denominator > 1e-12) s = clamp((de * er - dr * ee) / denominator);
      t = (de * s + er) / ee;
      if (t < 0) {
        t = 0;
        s = clamp(-dr / dd);
      } else if (t > 1) {
        t = 1;
        s = clamp((de - dr) / dd);
      }
    }
  }
  const delta = sub(add(p, scale(d, s)), add(a, scale(e, t)));
  return dot(delta, delta);
}

const clamp = (v) => Math.max(0, Math.min(1, v)),
  add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale = (p, k) => ({ x: p.x * k, y: p.y * k, z: p.z * k }),
  dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
function normalize(p) {
  const length = Math.hypot(p.x, p.y, p.z);
  if (!(length > 0) || !Number.isFinite(length))
    throw new Error("Titan breath needs a fixed finite mouth direction");
  return scale(p, 1 / length);
}
