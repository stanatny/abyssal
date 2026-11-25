/** 四风潮环只记录解谜与归航，不移动角色，也不直接结算生命。 */
export const TIDE_RULES = Object.freeze({
  ruleset: "odyssey_four_winds_homecoming_v3",
  gateCount: 4,
  rotorCount: 4,
  requiredLength: 30,
  settleDuration: 0.45,
  testDuration: 1.5,
  retryDuration: 3,
  damage: 20,
  maximumContinuousSpeed: 85,
  maximumStepDuration: 0.3,
});

const EMPTY_EVENTS = Object.freeze([]);
const BOARD = [
  [-1, 1],
  [1, 1],
  [-1, -1],
  [1, -1],
];
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
const NEIGHBORS = [
  [-1, 1, 2, -1],
  [-1, -1, 3, 0],
  [0, 3, -1, -1],
  [1, -1, -1, 2],
];
const isRotor = (n) => Number.isInteger(n) && n >= 0 && n < 4;
const isPort = (p) => p && isRotor(p.tile) && isRotor(p.port);
const external = (p) => isPort(p) && NEIGHBORS[p.tile][p.port] < 0;
const samePort = (a, b) => a.tile === b.tile && a.port === b.port;
const point = (p) => {
  const a = Array.isArray(p) ? p : p && [p.x, p.y, p.z];
  return a?.length === 3 && a.every(Number.isFinite) ? [...a] : null;
};
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const ports = (r) => [r, (r + 1) % 4];

function transformVector(vector, quarterTurns, reflected) {
  let [x, y] = vector;
  if (reflected) x = -x;
  for (let i = 0; i < quarterTurns; i++) [x, y] = [y, -x];
  return [x, y];
}
function transformedPort(input, quarterTurns, reflected) {
  const tile = transformVector(BOARD[input.tile], quarterTurns, reflected);
  const port = transformVector(DIRECTIONS[input.port], quarterTurns, reflected);
  return {
    tile: BOARD.findIndex(([x, y]) => x === tile[0] && y === tile[1]),
    port: DIRECTIONS.findIndex(([x, y]) => x === port[0] && y === port[1]),
  };
}

/** 同一四管家族的正方形对称变体；答案不放入可见状态。 */
export function makeTideVariant({
  quarterTurns = 0,
  reflected = false,
  reversed = false,
} = {}) {
  if (!Number.isInteger(quarterTurns))
    throw new Error("Tide quarter turns must be an integer.");
  const turns = ((quarterTurns % 4) + 4) % 4;
  let source = transformedPort({ tile: 0, port: 3 }, turns, reflected);
  let sink = transformedPort({ tile: 1, port: 1 }, turns, reflected);
  if (reversed) [source, sink] = [sink, source];
  return {
    key: `${source.tile}:${source.port}>${sink.tile}:${sink.port}`,
    source,
    sink,
    quarterTurns: turns,
    reflected: Boolean(reflected),
    reversed: Boolean(reversed),
  };
}

/** 只供真实试潮的水迹与最终判断读取，调节界面不得借此提示正确答案。 */
export function traceTideGate(variant, rotations) {
  if (
    !external(variant?.source) ||
    !external(variant?.sink) ||
    samePort(variant.source, variant.sink) ||
    !Array.isArray(rotations) ||
    rotations.length !== 4 ||
    !rotations.every(isRotor)
  )
    return {
      valid: false,
      reachedSink: false,
      path: [],
      segments: [],
      leaks: [],
      reason: "invalid_configuration",
    };
  const leaks = [];
  rotations.forEach((r, tile) => {
    for (const port of ports(r)) {
      const neighbor = NEIGHBORS[tile][port];
      if (neighbor < 0) {
        const p = { tile, port };
        if (!samePort(p, variant.source) && !samePort(p, variant.sink))
          leaks.push(p);
      } else if (!ports(rotations[neighbor]).includes((port + 2) % 4))
        leaks.push({ tile, port });
    }
  });
  const path = [],
    segments = [];
  let tile = variant.source.tile,
    entry = variant.source.port,
    reachedSink = false,
    reason = "source_disconnected";
  for (let step = 0; step < 5; step++) {
    if (path.includes(tile)) {
      reason = "cycle";
      break;
    }
    const connection = ports(rotations[tile]);
    if (!connection.includes(entry)) {
      reason = path.length ? "disconnected_joint" : "source_disconnected";
      break;
    }
    const exit = connection.find((p) => p !== entry);
    path.push(tile);
    segments.push({ tile, entry, exit });
    const neighbor = NEIGHBORS[tile][exit];
    if (neighbor < 0) {
      reachedSink = samePort({ tile, port: exit }, variant.sink);
      reason = reachedSink ? "connected" : "external_leak";
      break;
    }
    tile = neighbor;
    entry = (exit + 2) % 4;
  }
  if (reachedSink && path.length !== 4) reason = "unused_joint";
  else if (reachedSink && leaks.length) reason = "leak";
  return {
    valid: reachedSink && path.length === 4 && leaks.length === 0,
    reachedSink,
    path,
    segments,
    leaks,
    reason,
  };
}

function randomFrom(seed) {
  let n = Number.isFinite(seed) ? seed >>> 0 : 1;
  return () => {
    n = (n + 0x6d2b79f5) >>> 0;
    let value = n;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function setRemaining(gate, seconds) {
  gate.testRemaining = gate.testingRemaining = Math.max(0, seconds);
}
function setResult(gate, value) {
  gate.result = gate.lastResult = value;
}
function event(type, id, rest = {}) {
  return { type, kind: type, ...(id ? { id } : {}), ...rest };
}
function queue(state, type, id, rest) {
  state.pendingEvents.push(event(type, id, rest));
}

/** 四个已建成的战区各领一块不同朝向的题板；重试不重新抽题。 */
export function createTideTrial({ gateDefs, finish, seed = 1 } = {}) {
  if (
    !Array.isArray(gateDefs) ||
    gateDefs.length !== TIDE_RULES.gateCount ||
    new Set(gateDefs.map((g) => g?.id)).size !== TIDE_RULES.gateCount ||
    new Set(gateDefs.map((g) => g?.guardian)).size !== TIDE_RULES.gateCount ||
    gateDefs.some((g) => !g?.id || !g.guardian)
  )
    throw new Error("A tide trial requires four unique guarded gates.");
  const center = point(finish?.center);
  if (!center || !Number.isFinite(finish?.radius) || finish.radius <= 0)
    throw new Error("A tide trial requires a finite physical finish.");
  const random = randomFrom(seed);
  const turns = [0, 1, 2, 3];
  for (let i = turns.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [turns[i], turns[j]] = [turns[j], turns[i]];
  }
  return {
    ruleset: TIDE_RULES.ruleset,
    seed,
    definitions: gateDefs.map((d) => ({
      ...d,
      ...(point(d.center) ? { center: point(d.center) } : {}),
    })),
    finish: { ...finish, center },
    gates: Object.fromEntries(
      gateDefs.map((definition, i) => [
        definition.id,
        {
          id: definition.id,
          guardian: definition.guardian,
          variant: makeTideVariant({
            quarterTurns: turns[i],
            reflected: random() >= 0.5,
            reversed: random() >= 0.5,
          }),
          defeated: false,
          solved: false,
          stabilized: false,
          rotations: [0, 0, 0, 0],
          testing: false,
          testRemaining: 0,
          testingRemaining: 0,
          testRotations: null,
          settleRemaining: 0,
          cooldown: 0,
          result: "",
          lastResult: "",
          lastTrace: null,
        },
      ]),
    ),
    elapsed: 0,
    length: 0,
    solvedCount: 0,
    monumentStep: 0,
    unlocked: false,
    won: false,
    finishArmed: false,
    finishReady: false,
    previousPosition: null,
    pendingEvents: [],
    events: [],
  };
}

function actionGuard(state, id, options) {
  const gate = state?.gates?.[id];
  if (!gate) return { kind: "blocked", reason: "unknown_gate" };
  if (state.won) return { kind: "blocked", reason: "terminal" };
  if (options.active === false || options.eligible === false)
    return { kind: "blocked", reason: "inactive" };
  if (options.protected === true)
    return { kind: "blocked", reason: "protected" };
  if (!gate.defeated) return { kind: "blocked", reason: "locked" };
  if (gate.solved) return { kind: "blocked", reason: "solved" };
  if (gate.testing) return { kind: "blocked", reason: "testing" };
  return null;
}

/** 进入接触区一次才应调用一次；持续贴靠的去重由实体接触适配器负责。 */
export function rotateTideRotor(state, id, index, options = {}) {
  const blocked = actionGuard(state, id, options);
  if (blocked) return blocked;
  if (!isRotor(index)) return { kind: "blocked", reason: "invalid_rotor" };
  const gate = state.gates[id];
  gate.rotations[index] = (gate.rotations[index] + 1) % 4;
  gate.settleRemaining = TIDE_RULES.settleDuration;
  setResult(gate, "");
  gate.lastTrace = null;
  queue(state, "rotor_changed", id, { index, rotation: gate.rotations[index] });
  return { kind: "rotated", index, rotation: gate.rotations[index] };
}

/** 试潮只是开始一段可见水流；不会在提交当帧泄露答案或直接扣血。 */
export function testTideGate(state, id, options = {}) {
  const blocked = actionGuard(state, id, options);
  if (blocked) return blocked;
  const gate = state.gates[id];
  if (gate.cooldown > 1e-9) return { kind: "blocked", reason: "cooldown" };
  if (gate.settleRemaining > 1e-9)
    return { kind: "blocked", reason: "settling" };
  gate.testing = true;
  setRemaining(gate, TIDE_RULES.testDuration);
  gate.testRotations = [...gate.rotations];
  setResult(gate, "");
  gate.lastTrace = null;
  queue(state, "test_started", id);
  return { kind: "testing" };
}

/** 仅真实活动时间推进；active=false或dt=0不改变任何题目、接触或时钟。 */
export function updateTideTrial(
  state,
  dt,
  {
    body,
    position = body?.position,
    length = body?.length,
    guardians = {},
    active = true,
    protected: protectedFrame = false,
    finishReady = true,
  } = {},
) {
  if (!active || !Number.isFinite(dt) || dt <= 0 || state.won)
    return EMPTY_EVENTS;
  state.events.length = 0;
  state.events.push(...state.pendingEvents);
  state.pendingEvents.length = 0;
  state.elapsed += dt;
  state.finishReady = Boolean(finishReady);
  if (Number.isFinite(length) && length > 0) state.length = length;
  for (const definition of state.definitions) {
    const gate = state.gates[definition.id];
    const guardian =
      guardians[gate.guardian] ?? guardians[`odyssey_${gate.guardian}`];
    if (!gate.defeated && guardian?.defeated === true) {
      gate.defeated = true;
      state.events.push(event("guardian_defeated", gate.id));
    }
    gate.settleRemaining = Math.max(0, gate.settleRemaining - dt);
    gate.cooldown = Math.max(0, gate.cooldown - dt);
    if (!gate.testing) continue;
    // 受保护时取消试潮，不给答案，也不留下可延迟结算的成败事件。
    if (protectedFrame) {
      gate.testing = false;
      setRemaining(gate, 0);
      gate.testRotations = null;
      gate.lastTrace = null;
      setResult(gate, "");
      state.events.push(
        event("test_cancelled", gate.id, { reason: "protected" }),
      );
      continue;
    }
    const before = gate.testRemaining;
    setRemaining(gate, before - dt);
    if (gate.testRemaining > 1e-9) continue;
    setRemaining(gate, 0);
    const overflow = Math.max(0, dt - before);
    const trace = traceTideGate(gate.variant, gate.testRotations);
    gate.testing = false;
    gate.lastTrace = trace;
    gate.testRotations = null;
    if (trace.valid) {
      gate.solved = gate.stabilized = true;
      setResult(gate, "solved");
      state.solvedCount++;
      state.monumentStep = state.solvedCount;
      state.events.push(
        event("gate_solved", gate.id, { completed: state.solvedCount }),
      );
    } else {
      gate.rotations.fill(0);
      gate.cooldown = Math.max(0, TIDE_RULES.retryDuration - overflow);
      gate.settleRemaining = Math.max(0, TIDE_RULES.settleDuration - overflow);
      setResult(gate, "failed");
      state.events.push(
        event("puzzle_failed", gate.id, {
          damage: TIDE_RULES.damage,
          reason: trace.reason,
        }),
      );
    }
  }
  const current = point(position),
    previous = state.previousPosition;
  const continuous =
    current &&
    previous &&
    dt <= TIDE_RULES.maximumStepDuration &&
    distance(current, previous) <= TIDE_RULES.maximumContinuousSpeed * dt + 0.3;
  const inside =
    current && distance(current, state.finish.center) <= state.finish.radius;
  const allSolved = state.definitions.every(
    (g) => state.gates[g.id].solved && state.gates[g.id].defeated,
  );
  if (
    !state.unlocked &&
    allSolved &&
    state.length >= TIDE_RULES.requiredLength
  ) {
    state.unlocked = true;
    state.finishArmed = Boolean(current && !inside);
    state.events.push(event("homeward_unlocked"));
  } else if (state.unlocked && current) {
    if (!inside) state.finishArmed = true;
    if (
      state.finishReady &&
      state.finishArmed &&
      continuous &&
      inside &&
      distance(previous, state.finish.center) > state.finish.radius
    ) {
      state.won = true;
      state.events.push(event("homeward_arrived"));
    }
  }
  state.previousPosition = current;
  return state.events;
}

export function tideTrialStatus(state) {
  return {
    ruleset: state.ruleset,
    total: state.definitions.length,
    solved: state.solvedCount,
    stabilized: state.solvedCount,
    defeated: Object.values(state.gates).filter((g) => g.defeated).length,
    lengthReady: state.length >= TIDE_RULES.requiredLength,
    unlocked: state.unlocked,
    homewardAvailable: state.unlocked,
    homewardReady: state.unlocked && state.finishReady,
    won: state.won,
    arrived: state.won,
    monumentStep: state.monumentStep,
  };
}
