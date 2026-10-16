/** 地形机关共用主动时间、固定预警区与一次结算；成长不带来免疫。 */
export const DEEP_HAZARD_RULES = Object.freeze({
  warning: 3,
  active: 2,
  cooldown: 10,
  damage: 18,
  triggerRadius: 52,
});

export const DEEP_HAZARD_PROFILES = Object.freeze({
  atlantis: Object.freeze({
    id: "ruin_waterlock",
    name: "海螺水闸",
    latin: "CONCH WATERLOCK",
    pattern: "lane",
    length: 32,
    width: 12,
    height: 28,
    color: "#d9be86",
    stone: "#718f8b",
    style: "ruin",
    habitat: "公共遗迹的侧廊与地下厅",
    warning: "海螺水闸蓄压 · 离开刻纹水道，或借石柱遮挡",
    hit: "水闸冲击 · 绕到刻纹侧面或等待冷却",
  }),
  hawaii: Object.freeze({
    id: "volcanic_fissure",
    name: "火山裂隙",
    latin: "VOLCANIC FISSURE",
    pattern: "lane",
    length: 40,
    width: 12,
    height: 32,
    color: "#f5a06b",
    stone: "#55463c",
    style: "fissure",
    habitat: "火山深海岩床",
    warning: "火山裂隙升温 · 绕开亮起的裂纹",
    hit: "裂隙灼流 · 横向游出裂纹上方",
  }),
  bermuda: Object.freeze({
    id: "wreck_pressure_seam",
    name: "沉船压力缝",
    latin: "WRECK PRESSURE SEAM",
    pattern: "lane",
    length: 40,
    width: 12,
    height: 28,
    color: "#b4d5c2",
    stone: "#635c4d",
    style: "fissure",
    habitat: "沉船外缘的深水断层",
    warning: "沉船压力缝冒泡 · 离开白色气泡带",
    hit: "高压水流 · 绕开沉船压力缝",
  }),
  mariana: Object.freeze({
    id: "trench_pressure_fault",
    name: "海沟压力断层",
    latin: "TRENCH PRESSURE FAULT",
    pattern: "pocket",
    radius: 15,
    height: 30,
    color: "#bfd1df",
    stone: "#6b6b7c",
    style: "fissure",
    habitat: "侧壁岩台的压力裂口",
    warning: "岩台压力升高 · 离开冒泡圆环",
    hit: "压力脉冲 · 退向岩台外侧",
  }),
  europa: Object.freeze({
    id: "brine_fracture",
    name: "盐脉裂口",
    latin: "BRINE FRACTURE",
    pattern: "lane",
    length: 40,
    width: 12,
    height: 32,
    color: "#a5e7df",
    stone: "#718794",
    style: "crystal",
    habitat: "冰下深海的盐晶岩床",
    warning: "盐脉裂口增亮 · 避开盐雾喷射带",
    hit: "盐脉喷流 · 横向避开裂口",
  }),
  amazon: Object.freeze({
    id: "silt_gas_pocket",
    name: "淤泥气囊",
    latin: "SILT GAS POCKET",
    pattern: "pocket",
    radius: 15,
    height: 26,
    color: "#dec788",
    stone: "#5f6550",
    style: "silt",
    habitat: "两处深潭的沉木淤泥床",
    warning: "淤泥气囊鼓泡 · 绕开翻动的泥圈",
    hit: "淤泥气浪 · 游出泥圈上方",
  }),
  odyssey: Object.freeze({
    id: "cavern_blowhole",
    name: "海窟潮孔",
    latin: "CAVERN BLOWHOLE",
    pattern: "pocket",
    radius: 15,
    height: 30,
    color: "#b4dce3",
    stone: "#8d9c9c",
    style: "shell",
    habitat: "神话深海的贝岩潮孔",
    warning: "海窟潮孔回响 · 离开贝岩圆环",
    hit: "潮孔喷涌 · 从圆环侧面绕行",
  }),
  penglai: Object.freeze({
    id: "submerged_resonance",
    name: "沉水鸣石",
    latin: "SUBMERGED RESONANCE STONE",
    pattern: "pocket",
    radius: 15,
    height: 24,
    color: "#c5dfb0",
    stone: "#638679",
    style: "crystal",
    habitat: "远离莲池的外围沉水石床",
    warning: "沉水鸣石共振 · 离开亮起的石环",
    hit: "鸣石水脉 · 绕开共振石环",
  }),
});

export function createDeepHazardState() {
  return { phase: "idle", remaining: 0, spent: false, activations: 0 };
}

/** 大步长也不能跳过预警；隐藏页与暂停不调用此函数。 */
export function stepDeepHazard(state, dt, near) {
  if (!(dt >= 0) || !Number.isFinite(dt)) return null;
  if (state.phase === "idle") {
    if (!near) return null;
    state.phase = "warning";
    state.remaining = DEEP_HAZARD_RULES.warning;
    state.spent = false;
    state.activations++;
    return "warning";
  }
  state.remaining = Math.max(0, state.remaining - dt);
  if (state.remaining > 1e-8) return null;
  if (state.phase === "warning") {
    state.phase = "active";
    state.remaining = DEEP_HAZARD_RULES.active;
    return "active";
  }
  if (state.phase === "active") {
    state.phase = "cooldown";
    state.remaining = DEEP_HAZARD_RULES.cooldown;
    return "cooldown";
  }
  state.phase = "idle";
  return "idle";
}

/** 预警区固定在机关，扫掠玩家已解算中心；没有追踪或超出可见高度的伤害。 */
export function deepHazardContact(a, b, site, padding = 0) {
  const profile = site.profile,
    c = Math.cos(site.yaw || 0),
    s = Math.sin(site.yaw || 0);
  const local = (p) => {
    const x = p.x - site.x,
      z = p.z - site.z;
    return { x: x * c - z * s, y: p.y - site.y, z: x * s + z * c };
  };
  const from = local(a),
    to = local(b);
  // 球囊以有限高圆柱表示，先裁切竖向区间再求平面最近点。
  let t0 = 0,
    t1 = 1;
  const clip = (v, d, lo, hi) => {
    if (Math.abs(d) < 1e-9) return v >= lo && v <= hi;
    const u = (lo - v) / d,
      w = (hi - v) / d;
    t0 = Math.max(t0, Math.min(u, w));
    t1 = Math.min(t1, Math.max(u, w));
    return t0 <= t1;
  };
  if (!clip(from.y, to.y - from.y, 1 - padding, profile.height + padding))
    return null;
  if (profile.pattern === "lane") {
    if (
      !clip(
        from.x,
        to.x - from.x,
        -profile.length / 2 - padding,
        profile.length / 2 + padding,
      ) ||
      !clip(
        from.z,
        to.z - from.z,
        -profile.width / 2 - padding,
        profile.width / 2 + padding,
      )
    )
      return null;
  } else {
    const dx = to.x - from.x,
      dz = to.z - from.z,
      d2 = dx * dx + dz * dz;
    const t = Math.max(
      t0,
      Math.min(t1, d2 > 1e-9 ? -(from.x * dx + from.z * dz) / d2 : t0),
    );
    if (
      (from.x + dx * t) ** 2 + (from.z + dz * t) ** 2 >
      (profile.radius + padding) ** 2
    )
      return null;
    t0 = t;
  }
  return {
    x: a.x + (b.x - a.x) * t0,
    y: a.y + (b.y - a.y) * t0,
    z: a.z + (b.z - a.z) * t0,
  };
}

/** 机关最远52米，沿线每2米检查同源海床；不能隔着隆起的坡面触发或伤害。 */
export function deepHazardTerrainBlocked(a, b, heightAt) {
  if (typeof heightAt !== "function") return false;
  const distance = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const steps = Math.max(1, Math.ceil(distance / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      x = a.x + (b.x - a.x) * t,
      y = a.y + (b.y - a.y) * t,
      z = a.z + (b.z - a.z) * t;
    if (y <= heightAt(x, z) + 0.15) return true;
  }
  return false;
}
