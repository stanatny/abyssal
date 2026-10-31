import { Vector3 } from "three";
import { atlantisSeabedHeight } from "./atlantis_terrain.js";

export const MURAL_RULES = Object.freeze({
  stages: 5,
  dwell: 4,
  damage: 15,
  retry: 3,
  halfWidth: 20,
  halfHeight: 15,
  maxSweep: 8,
});
export const MURAL_SYMBOLS = Object.freeze([
  "海豚",
  "海螺",
  "海星",
  "海龟",
  "三叉戟",
  "双耳瓶",
  "船锚",
  "扇贝",
]);

/** 一局固定壁画与轮播序列，失败不重新抽签。 */
export function createMuralState(seed = 1) {
  let s = seed >>> 0 || 1;
  const random = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const answer = shuffle(MURAL_SYMBOLS.map((_, i) => i)).slice(0, 5);
  const cycles = answer.map((a) =>
    shuffle([
      a,
      ...shuffle(MURAL_SYMBOLS.map((_, i) => i).filter((v) => v !== a)).slice(
        0,
        3,
      ),
    ]),
  );
  return {
    answer,
    cycles,
    offsets: answer.map(() => Math.floor(random() * 4)),
    completed: 0,
    clock: 0,
    cooldown: 0,
    solved: false,
    discovered: false,
    read: false,
    result: "",
  };
}
export function muralSymbol(state, stage, clock = state.clock) {
  return state.cycles[stage][
    (Math.floor((clock + 1e-9) / MURAL_RULES.dwell) + state.offsets[stage]) % 4
  ];
}

/** 前段圣道与后段东侧遗迹保留成人水道，底座从最终地形的高点起建；同一模板只作有限侧移。 */
export function createMuralLayout(route = 0) {
  const k = ((route % 3) + 3) % 3;
  return [-245, -375, -545, -710, -820].map((z, i) => {
    const x = [0, 0, 0, 220, 260][i] + [0, -6, 6][k];
    z += [0, 8, -8][k];
    let ground = -Infinity;
    for (let dx = -25; dx <= 25; dx += 5)
      for (let dz = -10; dz <= 10; dz += 5)
        ground = Math.max(ground, atlantisSeabedHeight(x + dx, z + dz));
    return {
      id: `mural_gate_${i + 1}`,
      point: new Vector3(x, ground + 37 + [0, 0, 0, 10, 20][i], z),
      ground,
      halfWidth: MURAL_RULES.halfWidth,
      halfHeight: MURAL_RULES.halfHeight,
    };
  });
}

/** 正向穿过可见门槛才结算；反向、侧绕、穿墙和传送不算一次尝试。 */
export function muralCrossing(from, to, gate, blocked = () => false) {
  const a = from.z - gate.point.z,
    b = to.z - gate.point.z;
  if (
    !(a > 0 && b <= 0) ||
    from.distanceToSquared(to) > MURAL_RULES.maxSweep ** 2
  )
    return null;
  const fraction = a / (a - b),
    hit = from.clone().lerp(to, fraction);
  if (
    Math.abs(hit.x - gate.point.x) > gate.halfWidth ||
    Math.abs(hit.y - gate.point.y) > gate.halfHeight ||
    blocked(from, hit)
  )
    return null;
  return { fraction, hit };
}

export function stepMural(
  state,
  dt,
  { active = true, vulnerable = true, crossing = null } = {},
) {
  if (!active || state.solved) return null;
  const delta = Math.max(0, Math.min(0.12, Number.isFinite(dt) ? dt : 0));
  const before = state.clock,
    cooling = state.cooldown > 0;
  state.clock += delta;
  state.cooldown = Math.max(0, state.cooldown - delta);
  if (!crossing || crossing.stage !== state.completed) return null;
  if (cooling || !vulnerable) {
    state.result = "blocked";
    return { kind: "blocked" };
  }
  const time = before + delta * Math.max(0, Math.min(1, crossing.fraction));
  if (
    muralSymbol(state, state.completed, time) !== state.answer[state.completed]
  ) {
    // Passed gates are checkpoints; the current candidate cycle keeps running.
    state.cooldown = MURAL_RULES.retry;
    state.result = "failed";
    return { kind: "failed", damage: MURAL_RULES.damage };
  }
  state.completed++;
  state.result = "passed";
  if (state.completed === MURAL_RULES.stages) {
    state.solved = true;
    return { kind: "solved" };
  }
  return { kind: "passed", index: state.completed };
}
