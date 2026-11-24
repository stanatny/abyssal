import * as T from "three";

// 临时表层快流是交通玩法；深海指水平海域，不改变角色水深。
export const OCEAN_CURRENT_RULES = Object.freeze({
  regions: Object.freeze(["hawaii", "atlantis", "bermuda", "odyssey"]),
  period: 180,
  firstAt: 12,
  forming: 6,
  active: 72,
  fading: 6,
  y: -24,
  radius: 14,
  flowSpeed: 72,
  exitCooldown: 2,
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function oceanCurrentPhase(time) {
  const r = OCEAN_CURRENT_RULES;
  if (time < r.firstAt) return { phase: "quiet", opacity: 0, force: 0 };
  const p = (time - r.firstAt) % r.period;
  if (p < r.forming)
    return { phase: "forming", opacity: p / r.forming, force: 0 };
  if (p < r.forming + r.active)
    return { phase: "active", opacity: 1, force: 1 };
  if (p < r.forming + r.active + r.fading) {
    const fade = 1 - (p - r.forming - r.active) / r.fading;
    return { phase: "fading", opacity: fade, force: fade };
  }
  return { phase: "quiet", opacity: 0, force: 0 };
}

export function oceanCurrentRoutes(regionId) {
  if (!OCEAN_CURRENT_RULES.regions.includes(regionId)) return [];
  if (regionId === "bermuda") {
    // 各水层沿地图纵轴平行直行；保留两侧长航路及独立的短程深水回流。
    const lanes = [
      {
        id: "outbound",
        name: "西境远海航流",
        inbound: false,
        y: -24,
        z0: -65,
        z1: -1670,
        x: -345,
      },
      {
        id: "inbound",
        name: "东境返航流",
        inbound: true,
        y: -24,
        z0: -65,
        z1: -1670,
        x: 325,
      },
      {
        id: "deep_west",
        name: "西礁深层航流",
        inbound: false,
        y: -240,
        z0: -680,
        z1: -1230,
        x: -300,
      },
      {
        id: "deep_east",
        name: "南境深层回流",
        inbound: true,
        y: -520,
        z0: -1110,
        z1: -1660,
        x: 245,
      },
    ];
    return lanes.map(({ x, y, z0, z1, ...lane }) => {
      const points = Array.from({ length: 129 }, (_, i) => {
        const u = lane.inbound ? 1 - i / 128 : i / 128;
        return new T.Vector3(x, y, z0 + (z1 - z0) * u);
      });
      let length = 0;
      const distances = [0];
      for (let i = 1; i < points.length; i++) {
        length += points[i].distanceTo(points[i - 1]);
        distances.push(length);
      }
      return { ...lane, points, distances, length };
    });
  }
  if (regionId === "odyssey") {
    // 浅层长航流、离岸返程与两条深层短航流分开布置，均沿纵轴直行。
    // 西侧返航不经过特洛伊干岸；深层接驳保留侧游/上浮离流的空间。
    const lanes = [
      { id: "outbound", inbound: false, x: 180, y: -24, z0: -65, z1: -2220 },
      { id: "inbound", inbound: true, x: -260, y: -130, z0: -550, z1: -2180 },
      {
        id: "deep_west",
        inbound: false,
        x: -80,
        y: -430,
        z0: -1100,
        z1: -1770,
      },
      { id: "deep_east", inbound: true, x: 440, y: -760, z0: -1720, z1: -2170 },
    ];
    return lanes.map(({ x, y, z0, z1, ...lane }) => {
      const points = Array.from({ length: 129 }, (_, i) => {
        const u = lane.inbound ? 1 - i / 128 : i / 128;
        return new T.Vector3(x, y, z0 + (z1 - z0) * u);
      });
      const length = Math.abs(z1 - z0);
      const distances = points.map((_, i) => (length * i) / 128);
      return { ...lane, points, distances, length };
    });
  }
  const endZ = regionId === "odyssey" ? -1480 : -990;
  return [false, true].map((inbound) => {
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const u = inbound ? 1 - i / 128 : i / 128;
      points.push(
        new T.Vector3(
          (inbound
            ? 40 - 20 * u
            : (regionId === "odyssey" ? 110 : -70) - 15 * u) -
            35 * Math.sin(u * Math.PI),
          OCEAN_CURRENT_RULES.y,
          -65 + (endZ + 65) * u,
        ),
      );
    }
    let length = 0;
    const distances = [0];
    for (let i = 1; i < points.length; i++) {
      length += points[i].distanceTo(points[i - 1]);
      distances.push(length);
    }
    return {
      id: inbound ? "inbound" : "outbound",
      inbound,
      points,
      distances,
      length,
    };
  });
}

// 复用输出对象；最近线段沿当前海域的固定航路搜索。
export function nearestCurrentPoint(route, position, out) {
  let best = Infinity;
  for (let i = 0; i < route.points.length - 1; i++) {
    const a = route.points[i],
      b = route.points[i + 1];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const u = clamp(
      ((position.x - a.x) * dx + (position.z - a.z) * dz) / (dx * dx + dz * dz),
      0,
      1,
    );
    const x = a.x + dx * u,
      z = a.z + dz * u;
    const d =
      (position.x - x) ** 2 + (position.y - a.y) ** 2 + (position.z - z) ** 2;
    if (d < best) {
      best = d;
      const length = Math.hypot(dx, dz);
      out.point.set(x, a.y, z);
      out.direction.set(dx / length, 0, dz / length);
      out.distance = Math.sqrt(d);
      out.progress = route.distances[i] + length * u;
    }
  }
  return out;
}

export function createOceanCurrentState(routes) {
  const r = OCEAN_CURRENT_RULES;
  const state = {
    time: 0,
    phase: "quiet",
    opacity: 0,
    route: null,
    speed: 0,
    cooldown: 0,
    velocity: new T.Vector3(),
    against: false,
    entered: false,
    announced: false,
  };
  const sample = { point: new T.Vector3(), direction: new T.Vector3() };
  const direction = new T.Vector3(),
    crossFlow = new T.Vector3();
  function reset() {
    Object.assign(state, {
      time: 0,
      phase: "quiet",
      opacity: 0,
      route: null,
      speed: 0,
      cooldown: 0,
      against: false,
      entered: false,
      announced: false,
    });
    state.velocity.set(0, 0, 0);
  }
  return {
    state,
    reset,
    blocked() {
      state.route = null;
      state.speed = 0;
      state.velocity.set(0, 0, 0);
      state.cooldown = r.exitCooldown;
    },
    step(dt, { position, forward, enabled = true }) {
      state.time += Math.max(0, dt);
      state.cooldown = Math.max(0, state.cooldown - dt);
      const phase = oceanCurrentPhase(state.time);
      state.announced = state.phase === "quiet" && phase.phase === "forming";
      state.phase = phase.phase;
      state.opacity = phase.opacity;
      state.entered = false;
      crossFlow.set(0, 0, 0);
      let next = null,
        target = 0;
      if (enabled && phase.force > 0 && state.cooldown <= 0) {
        for (const route of routes) {
          nearestCurrentPoint(route, position, sample);
          const alignment = forward.dot(sample.direction);
          if (
            sample.distance < r.radius &&
            sample.progress < route.length - 2
          ) {
            next = route;
            // 两端和侧边均缓变，避免突然增速或骤停。
            target =
              r.flowSpeed *
              phase.force *
              clamp((r.radius - sample.distance) / 4, 0, 1) *
              clamp(sample.progress / 35, 0, 1) *
              clamp((route.length - sample.progress) / 60, 0, 1);
            direction.copy(sample.direction);
            // 顺流时的小幅横向回流抵消缓弯漂移；主动侧游时立即让出控制。
            if (alignment > 0.9) {
              crossFlow.subVectors(sample.point, position).setY(0);
              crossFlow.addScaledVector(direction, -crossFlow.dot(direction));
              crossFlow.multiplyScalar(0.8).clampLength(0, 4);
            }
            break;
          }
        }
      }
      if (state.route && !next) {
        state.cooldown = r.exitCooldown;
      }
      if (!state.route && next) state.entered = true;
      state.route = next;
      // 洋流是环境速度场：倒着游仍被水流推动，不因转头或慢游免疫。
      state.against = Boolean(next && forward.dot(direction) < -0.25);
      const rate = target > state.speed ? 3 : 8;
      state.speed += (target - state.speed) * (1 - Math.exp(-rate * dt));
      if (state.speed < 0.05) state.speed = 0;
      state.velocity
        .copy(direction)
        .multiplyScalar(state.speed)
        .addScaledVector(crossFlow, state.speed / r.flowSpeed);
      return state;
    },
  };
}
