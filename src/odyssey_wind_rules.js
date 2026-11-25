import { odysseySeabedHeight } from "./odyssey_config.js";

/** 局部风门只管理本局试炼；不改变角色位置、领主时钟或共享伤害。 */
export const ODYSSEY_WIND_RULES = Object.freeze({
  ruleset: "odyssey_four_winds_v1",
  requiredLength: 30,
  adverseDuration: 4,
  warningDuration: 1.8,
  favorableDuration: 10,
  maximumCoordinationDelay: 6,
  normalSwimSpeed: 12,
  currentSpeed: 18,
  adverseSpeed: 12,
  reactionAllowance: 0.65,
  tailGrace: 2.5,
  forwardAlignment: 0.2,
  maximumContinuousSpeed: 85,
  maximumStepDuration: 0.3,
  crossingMargin: 0.05,
});

function gate(id, guardian, x, z, clearance) {
  return Object.freeze({
    id,
    guardian,
    center: Object.freeze([
      x,
      Math.min(-35, odysseySeabedHeight(x, z) + clearance),
      z,
    ]),
    normal: Object.freeze([0, 0, -1]),
    width: 60,
    height: 55,
    throat: 8,
  });
}

/** 初始预留点；最终地图适配可以向构造器提供同契约的已验证地点。 */
export const ODYSSEY_WIND_GATES = Object.freeze([
  gate("pillar_gate", "ladon", -430, -950, 85),
  gate("reef_gate", "karkinos", 261, -875, 85),
  gate("echo_gate", "scylla", -280, -1630, 95),
  gate("vortex_gate", "charybdis", 266, -2010, 145),
]);
export const ODYSSEY_HOMEWARD_FINISH = Object.freeze({
  center: Object.freeze([
    -90,
    Math.min(-35, odysseySeabedHeight(-90, -340) + 55),
    -340,
  ]),
  radius: 35,
});

const finitePoint = (p) => p && p.length === 3 && p.every(Number.isFinite);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const normalize = (p) => {
  const n = Math.hypot(...p);
  if (!(n > 1e-8)) throw new Error("A wind gate requires a nonzero direction.");
  return p.map((v) => v / n);
};
function prepareGate(definition) {
  if (
    !definition?.id ||
    !definition.guardian ||
    !finitePoint(definition.center) ||
    !finitePoint(definition.normal) ||
    !(definition.width > 0) ||
    !(definition.height > 0)
  )
    throw new Error("Invalid wind gate definition.");
  const normal = normalize(definition.normal);
  // 门可以倾斜，但不能退化成没有可定义横轴的竖向法线。
  const horizontal = Math.hypot(normal[0], normal[2]);
  if (horizontal < 0.05)
    throw new Error("Wind gate normals must retain a horizontal direction.");
  const right = [normal[2] / horizontal, 0, -normal[0] / horizontal];
  const up = [
    normal[1] * right[2] - normal[2] * right[1],
    normal[2] * right[0] - normal[0] * right[2],
    normal[0] * right[1] - normal[1] * right[0],
  ];
  if (up[1] < 0) for (let i = 0; i < 3; i++) up[i] *= -1;
  return {
    ...definition,
    center: [...definition.center],
    normal,
    right,
    up,
    throat: Math.max(0, definition.throat ?? 8),
  };
}

/** 每局创建；所有已完成标记只存在于该实例。 */
export function createOdysseyWindTrial({
  gates = ODYSSEY_WIND_GATES,
  finish = ODYSSEY_HOMEWARD_FINISH,
} = {}) {
  if (!gates.length || new Set(gates.map((g) => g.id)).size !== gates.length)
    throw new Error("Wind gates require unique IDs.");
  if (
    !finitePoint(finish?.center) ||
    !Number.isFinite(finish.radius) ||
    finish.radius <= 0
  )
    throw new Error("Invalid homeward finish definition.");
  const definitions = gates.map(prepareGate);
  return {
    ruleset: ODYSSEY_WIND_RULES.ruleset,
    definitions,
    finish: { center: [...finish.center], radius: finish.radius },
    gates: Object.fromEntries(
      definitions.map((definition) => [
        definition.id,
        {
          id: definition.id,
          guardian: definition.guardian,
          crossed: false,
          defeated: false,
          stabilized: false,
          phase: "adverse",
          phaseElapsed: 0,
          phaseRemaining: ODYSSEY_WIND_RULES.adverseDuration,
          admissionOpen: false,
          attempt: null,
          armed: false,
        },
      ]),
    ),
    elapsed: 0,
    length: 0,
    unlocked: false,
    won: false,
    finishArmed: false,
    events: [],
    previousBody: null,
  };
}

/**
 * 保守胶囊包络只供调用端构造采样；正式验收应提供实际可见身体的保守凸包。
 * points 为稳定顺序的世界坐标，不是吞食点；胶囊朝向为实际身体轴。
 * 传给更新器的 forward 则是实际前进方向；倒游乌贼可保留真实包络并单独传前进向量。
 */
export function windBodyEnvelope({
  position,
  forward,
  length,
  radius = length * 0.16,
  verticalRadius = radius,
}) {
  if (
    !finitePoint(position) ||
    !finitePoint(forward) ||
    !(length > 0) ||
    !(radius > 0) ||
    !(verticalRadius > 0)
  )
    throw new Error("Invalid wind body envelope.");
  const direction = normalize(forward);
  const horizontal = Math.hypot(direction[0], direction[2]);
  const right =
    horizontal > 0.001
      ? [direction[2] / horizontal, 0, -direction[0] / horizontal]
      : [1, 0, 0];
  const up = normalize([
    direction[1] * right[2] - direction[2] * right[1],
    direction[2] * right[0] - direction[0] * right[2],
    direction[0] * right[1] - direction[1] * right[0],
  ]);
  const points = [];
  for (const along of [-0.5, 0.5])
    for (const side of [-1, 1])
      for (const height of [-1, 1])
        points.push(
          position.map(
            (value, i) =>
              value +
              direction[i] * along * length +
              right[i] * side * radius +
              up[i] * height * verticalRadius,
          ),
        );
  return { position: [...position], forward: direction, length, points };
}

function validBody(body) {
  return (
    finitePoint(body?.position) &&
    finitePoint(body.forward) &&
    Math.hypot(...body.forward) > 0.001 &&
    Number.isFinite(body.length) &&
    body.length > 0 &&
    Array.isArray(body.points) &&
    body.points.length >= 4 &&
    body.points.length <= 128 &&
    body.points.every(finitePoint)
  );
}
function snapshotBody(body) {
  return {
    position: [...body.position],
    forward: normalize(body.forward),
    length: body.length,
    points: body.points.map((p) => [...p]),
  };
}
function project(definition, body) {
  let min = Infinity;
  let max = -Infinity;
  let inside = true;
  const delta = [0, 0, 0];
  for (const point of body.points) {
    for (let i = 0; i < 3; i++) delta[i] = point[i] - definition.center[i];
    const along = dot(delta, definition.normal);
    min = Math.min(min, along);
    max = Math.max(max, along);
    const x = dot(delta, definition.right) / (definition.width * 0.5);
    const y = dot(delta, definition.up) / (definition.height * 0.5);
    if (x * x + y * y > 1 - 1e-8) inside = false;
  }
  return { min, max, inside };
}
function isContinuous(previous, body, dt) {
  if (!previous || previous.points.length !== body.points.length) return false;
  if (dt > ODYSSEY_WIND_RULES.maximumStepDuration) return false;
  const limit = ODYSSEY_WIND_RULES.maximumContinuousSpeed * dt + 0.3;
  return (
    distance(previous.position, body.position) <= limit &&
    previous.points.every(
      (point, i) =>
        distance(point, body.points[i]) <= limit + body.length * 0.12,
    )
  );
}
function emit(state, type, current) {
  state.events.push({ type, gateId: current?.id, guardian: current?.guardian });
}
function setPhase(current, phase) {
  current.phase = phase;
  current.phaseElapsed = 0;
}
function advancePhase(current, dt, guardian) {
  const rules = ODYSSEY_WIND_RULES;
  if (current.stabilized) {
    setPhase(current, "stable");
    current.phaseRemaining = Infinity;
    current.admissionOpen = true;
    return;
  }
  current.phaseElapsed += dt;
  if (
    current.phase === "adverse" &&
    current.phaseElapsed >= rules.adverseDuration
  ) {
    current.phaseElapsed -= rules.adverseDuration;
    current.phase = "warning";
  }
  if (current.phase === "warning") {
    const dangerous =
      !current.defeated &&
      (guardian?.phase === "windup" || guardian?.phase === "attack");
    if (
      current.phaseElapsed >= rules.warningDuration &&
      (!dangerous ||
        current.phaseElapsed >=
          rules.warningDuration + rules.maximumCoordinationDelay)
    )
      setPhase(current, "favorable");
  }
  if (
    current.phase === "favorable" &&
    current.phaseElapsed >= rules.favorableDuration
  )
    setPhase(current, "adverse");
  current.phaseRemaining = Math.max(
    0,
    (current.phase === "adverse"
      ? rules.adverseDuration
      : current.phase === "warning"
        ? rules.warningDuration
        : rules.favorableDuration) - current.phaseElapsed,
  );
  current.admissionOpen = current.phase === "favorable";
}

function updateCrossing(state, definition, current, body, previous, dt) {
  if (current.crossed) return;
  const now = project(definition, body);
  const before = project(definition, previous);
  const half = definition.throat * 0.5;
  const margin = ODYSSEY_WIND_RULES.crossingMargin;
  const forward = normalize(body.forward);
  const heading = dot(forward, definition.normal);
  const displacement = body.position.map((v, i) => v - previous.position[i]);
  const advance = dot(displacement, definition.normal);

  if (now.max < -half - margin) current.armed = true;
  if (current.attempt) {
    const attempt = current.attempt;
    attempt.remaining -= dt;
    const overlapping = now.max >= -half && now.min <= half;
    if (
      !now.inside ||
      heading < ODYSSEY_WIND_RULES.forwardAlignment ||
      advance < -0.3 ||
      attempt.remaining <= 0
    ) {
      emit(
        state,
        attempt.remaining <= 0 ? "passage_expired" : "passage_missed",
        current,
      );
      current.attempt = null;
      current.armed = false;
      return;
    }
    if (now.min > half + margin && advance > 0) {
      current.crossed = true;
      current.attempt = null;
      current.armed = false;
      emit(state, "gate_crossed", current);
      return;
    }
    if (!overlapping && now.max < -half) {
      current.attempt = null;
      emit(state, "passage_missed", current);
    }
    return;
  }
  // 只有真实接近且完整包络原先位于入口侧，才允许开始一次穿越。
  const enters = before.max < -half && now.max >= -half;
  if (
    !current.armed ||
    !enters ||
    advance <= 0 ||
    !before.inside ||
    !now.inside
  )
    return;
  if (heading < ODYSSEY_WIND_RULES.forwardAlignment) return;
  const required =
    (half + margin - now.min) / ODYSSEY_WIND_RULES.normalSwimSpeed +
    ODYSSEY_WIND_RULES.reactionAllowance;
  if (current.phase !== "favorable" || current.phaseRemaining < required) {
    current.admissionOpen = false;
    emit(state, "passage_too_late", current);
    current.armed = false;
    return;
  }
  current.attempt = {
    remaining: Math.min(
      required + ODYSSEY_WIND_RULES.tailGrace,
      current.phaseRemaining + ODYSSEY_WIND_RULES.tailGrace,
    ),
  };
  emit(state, "passage_entered", current);
}

/**
 * 只在实际游玩时传 active=true；dt=0 严格冻结所有状态。
 * guardians 按 kind 或 odyssey_kind 索引 { defeated, phase }。
 * 返回数组复用于下次更新，调用方若需保留事件必须复制。
 */
export function updateOdysseyWindTrial(
  state,
  dt,
  { body, guardians = {}, active = true } = {},
) {
  state.events.length = 0;
  if (!active || !Number.isFinite(dt) || dt <= 0 || state.won)
    return state.events;
  state.elapsed += dt;
  const valid = validBody(body);
  const previous = state.previousBody;
  const continuous = valid && isContinuous(previous, body, dt);
  if (valid) state.length = body.length;
  for (const definition of state.definitions) {
    const current = state.gates[definition.id];
    const guardian =
      guardians[definition.guardian] ??
      guardians[`odyssey_${definition.guardian}`];
    if (guardian?.defeated && !current.defeated) {
      current.defeated = true;
      emit(state, "guardian_defeated", current);
    }
    advancePhase(current, dt, guardian);
    if (continuous)
      updateCrossing(state, definition, current, body, previous, dt);
    else {
      if (current.attempt) emit(state, "passage_discontinuous", current);
      current.attempt = null;
      current.armed =
        valid && project(definition, body).max < -definition.throat * 0.5;
    }
    if (current.crossed && current.defeated && !current.stabilized) {
      current.stabilized = true;
      setPhase(current, "stable");
      current.phaseRemaining = Infinity;
      current.admissionOpen = true;
      emit(state, "gate_stabilized", current);
    }
  }
  const allStable = state.definitions.every(
    (definition) => state.gates[definition.id].stabilized,
  );
  const inside =
    valid &&
    distance(body.position, state.finish.center) <= state.finish.radius;
  if (
    !state.unlocked &&
    allStable &&
    state.length >= ODYSSEY_WIND_RULES.requiredLength
  ) {
    state.unlocked = true;
    state.finishArmed = valid && !inside;
    emit(state, "homeward_unlocked");
  } else if (state.unlocked && valid) {
    if (!inside) state.finishArmed = true;
    if (
      state.finishArmed &&
      continuous &&
      inside &&
      distance(previous.position, state.finish.center) > state.finish.radius
    ) {
      state.won = true;
      emit(state, "homeward_arrived");
    }
  }
  state.previousBody = valid ? snapshotBody(body) : null;
  return state.events;
}

export function windGateStatus(state, id) {
  const current = state.gates[id];
  if (!current) return null;
  return {
    ...current,
    attempt: current.attempt ? { ...current.attempt } : null,
  };
}
export function windTrialStatus(state) {
  const gates = Object.values(state.gates);
  return {
    ruleset: state.ruleset,
    total: gates.length,
    crossed: gates.filter((g) => g.crossed).length,
    defeated: gates.filter((g) => g.defeated).length,
    stabilized: gates.filter((g) => g.stabilized).length,
    lengthReady: state.length >= ODYSSEY_WIND_RULES.requiredLength,
    unlocked: state.unlocked,
    won: state.won,
  };
}

/** 只返回局部流方向和速度；调用方负责真实碰撞、转向与主干流的排他接入。 */
export function windGateCurrent(state, id) {
  const current = state.gates[id];
  const definition = state.definitions.find((d) => d.id === id);
  if (!current || !definition) return null;
  const admitted = Boolean(current.attempt);
  const favorable =
    current.phase === "favorable" || current.phase === "stable" || admitted;
  const sign = favorable ? 1 : -1;
  return {
    direction: definition.normal.map((v) => v * sign),
    speed: favorable
      ? ODYSSEY_WIND_RULES.currentSpeed
      : ODYSSEY_WIND_RULES.adverseSpeed,
    active: true,
    admitted,
    favorable,
    expiring: admitted && current.attempt.remaining < 1,
  };
}
