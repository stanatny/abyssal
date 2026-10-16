import { PENGLAI_WORLD } from "./penglai_config.js";

/** 天气随机生成、移动和消散；坐标不再绑定仙山或四个固定地点。 */
export const PENGLAI_SKY_PROFILES = Object.freeze({
  thunder: Object.freeze({
    id: "celestial_thundercloud",
    name: "游走雷云",
    latin: "DRIFTING THUNDERSTORM",
    color: "#a8bfd0",
    axes: Object.freeze({ x: 85, y: 65, z: 65 }),
    forming: 6,
    active: 18,
    fading: 5,
    speed: 6,
    damage: 18,
    warning: "雷云正在聚集 · 留意移动雨幕，提前绕行或飞到云层上方",
    hit: "雷暴放电 · 飞离雨幕，或借仙山实体遮挡",
  }),
  wind: Object.freeze({
    id: "aetherwind_corridor",
    name: "云海罡风",
    latin: "CLOUDSEA SQUALL",
    color: "#c3ded6",
    axes: Object.freeze({ x: 90, y: 45, z: 32 }),
    forming: 5,
    active: 12,
    fading: 4,
    speed: 14,
    damage: 18,
    warning: "云海阵风将至 · 观察风向，升降或从风幕侧面避开",
    hit: "阵风掠过 · 飞离风幕，或借山体躲避",
  }),
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createPenglaiWeather(
  random = Math.random,
  heightAt = () => -60,
) {
  const range = (a, b) => a + random() * (b - a);
  const slots = ["thunder", "wind"].map((kind) => ({
    kind,
    profile: PENGLAI_SKY_PROFILES[kind],
    phase: "quiet",
    remaining: kind === "thunder" ? range(8, 14) : range(17, 25),
    x: 0,
    y: 200,
    z: 0,
    previous: { x: 0, y: 200, z: 0 },
    vx: 0,
    vz: 0,
    yaw: 0,
    age: 0,
    seed: 0,
    serial: 0,
    hitPulse: -1,
    announced: false,
  }));
  return { slots, time: 0, random, range, heightAt };
}
function spawn(pool, e, player) {
  const r = pool.range,
    p = e.profile,
    near = player.y > 80 && pool.random() < 0.65,
    bearing = r(-Math.PI, Math.PI),
    distance = r(150, 260);
  e.x = clamp(
    near ? player.x + Math.sin(bearing) * distance : r(-485, 485),
    -485,
    485,
  );
  e.z = clamp(
    near ? player.z + Math.cos(bearing) * distance : r(-1285, 45),
    -1285,
    45,
  );
  const low = Math.max(60 + p.axes.y, pool.heightAt(e.x, e.z) + p.axes.y + 25),
    high = PENGLAI_WORLD.maxAltitude - (e.kind === "thunder" ? 110 : 55);
  e.y = clamp(near ? player.y + r(-75, 75) : r(low, high), low, high);
  e.yaw = r(-Math.PI, Math.PI);
  e.vx = Math.sin(e.yaw) * p.speed;
  e.vz = Math.cos(e.yaw) * p.speed;
  // 生成时选择能完整掠过的航向，避免天气抵达边界后停成固定机关。
  const duration = p.forming + p.active + p.fading;
  if (e.x + e.vx * duration < -485 || e.x + e.vx * duration > 485) e.vx *= -1;
  if (e.z + e.vz * duration < -1285 || e.z + e.vz * duration > 45) e.vz *= -1;
  e.yaw = Math.atan2(e.vx, e.vz);
  e.previous.x = e.x;
  e.previous.y = e.y;
  e.previous.z = e.z;
  e.seed = r(0, 1000);
  e.serial++;
  e.hitPulse = -1;
  e.announced = false;
  e.phase = "forming";
  e.remaining = p.forming;
  e.age = 0;
}
/** 大步长也必须完整显示生成预兆；暂停/菜单不推进此时钟。 */
export function stepPenglaiWeather(pool, dt, player) {
  if (!(dt >= 0) || !Number.isFinite(dt)) return;
  pool.time += dt;
  for (const e of pool.slots) {
    e.previous.x = e.x;
    e.previous.y = e.y;
    e.previous.z = e.z;
    if (e.phase === "quiet") {
      e.remaining -= dt;
      if (e.remaining <= 0) spawn(pool, e, player);
      continue;
    }
    const step = Math.min(dt, e.remaining);
    e.x = clamp(e.x + e.vx * step, -485, 485);
    e.z = clamp(e.z + e.vz * step, -1285, 45);
    e.age += step;
    e.remaining = Math.max(0, e.remaining - dt);
    if (e.remaining > 1e-8) continue;
    if (e.phase === "forming") {
      e.phase = "active";
      e.remaining = e.profile.active;
    } else if (e.phase === "active") {
      e.phase = "fading";
      e.remaining = e.profile.fading;
    } else {
      e.phase = "quiet";
      e.remaining = pool.range(22, 36);
    }
    e.age = 0;
  }
}
export function weatherDischarge(e) {
  if (e.phase !== "active") return -1;
  if (e.kind === "wind") return 0;
  const phase = e.age % 5;
  return phase >= 3 && phase < 3.85 ? Math.floor(e.age / 5) : -1;
}
export function weatherOpacity(e) {
  if (e.phase === "quiet") return 0;
  if (e.phase === "forming") return Math.min(1, e.age / 2.5);
  if (e.phase === "fading") return Math.max(0, e.remaining / e.profile.fading);
  return 1;
}
/** 玩家与天气在同一时间扫掠，不以两条轨迹碰巧相交替代真实接触。 */
export function penglaiWeatherContact(a, b, e, padding = 0) {
  const c = Math.cos(e.yaw),
    s = Math.sin(e.yaw),
    axes = e.profile.axes;
  const local = (p, origin) => {
    const x = p.x - origin.x,
      z = p.z - origin.z;
    return {
      x: (x * c - z * s) / (axes.x + padding),
      y: (p.y - origin.y) / (axes.y + padding),
      z: (x * s + z * c) / (axes.z + padding),
    };
  };
  const u = local(a, e.previous),
    v = local(b, e),
    dx = v.x - u.x,
    dy = v.y - u.y,
    dz = v.z - u.z,
    aa = dx * dx + dy * dy + dz * dz,
    bb = 2 * (u.x * dx + u.y * dy + u.z * dz),
    cc = u.x * u.x + u.y * u.y + u.z * u.z - 1;
  let t = 0;
  if (cc > 0) {
    if (aa < 1e-12) return null;
    const d = bb * bb - 4 * aa * cc;
    if (d < 0) return null;
    t = (-bb - Math.sqrt(d)) / (2 * aa);
    if (t < 0 || t > 1) return null;
  }
  const contact = {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
  return contact.y >= 60 ? contact : null;
}
