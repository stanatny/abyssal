import { WORLD } from "./world_config.js";
import { marianaPitContour } from "./mariana_pit_profile.js";

/** 海沟地图的边界与四个独立关卡；其他海域不继承深度扩展。 */
export const MARIANA_WORLD = Object.freeze({
  ...WORLD,
  minX: -300,
  maxX: 300,
  minZ: -780,
  maxZ: 140,
  maxDepth: 2780,
  terrainContour: marianaPitContour,
});

/** 守关后的饥饿压力连续递增；其他海域不传此配置，沿用原有曲线。 */
export const MARIANA_HUNGER_PROFILE = Object.freeze({
  rampDepth: 50,
  steps: Object.freeze(
    [
      { depth: 650, multiplier: 1.08 },
      { depth: 1000, multiplier: 1.16 },
      { depth: 1375, multiplier: 1.24 },
    ].map(Object.freeze),
  ),
});
export const MARIANA_GATES = Object.freeze(
  [
    {
      id: "mariana_hydra",
      kind: "hydra",
      depth: 650,
      x: -65,
      z: -350,
      color: 0x8fd6cb,
      name: "潮汐之门",
      home: [-20, -525, -390],
      radius: 98,
      guideToGuardian: true,
    },
    {
      id: "mariana_kraken",
      kind: "kraken",
      depth: 1000,
      x: 65,
      z: -420,
      color: 0x64ddde,
      name: "回声之门",
    },
    {
      id: "mariana_maja",
      kind: "mayan",
      depth: 1375,
      x: -65,
      z: -420,
      color: 0x8b95ed,
      name: "幽蓝之门",
    },
    {
      id: "mariana_leviathan",
      kind: "leviathan",
      depth: 2150,
      x: 65,
      z: -350,
      color: 0xd48dda,
      name: "挑战者之门",
    },
  ].map((g) =>
    Object.freeze({
      ...g,
      width: 170,
      depthSize: 190,
      home: Object.freeze(g.home || [0, -g.depth + 100, g.z]),
      radius: g.radius ?? 98,
    }),
  ),
);
export const MARIANA_REFUGE = Object.freeze({
  x: 0,
  y: -2735,
  z: -430,
  radius: 23,
});

/** 海床采样只代表最低可达地面；中间台地由独立实体承接。 */
export function marianaSeabedHeight(x, z) {
  const shelf =
    -37 -
    Math.max(0, 75 - z) * 0.11 +
    1.3 * Math.sin(x * 0.08) * Math.cos(z * 0.055);
  const floor = -2770 + 2 * Math.sin(x * 0.035) * Math.cos(z * 0.025);
  // 入口沿横向切出湾口、岩肩与沟槽；浅滩居民仍保留原来的浅水海床。
  const lip =
      -94 -
      Math.pow(Math.sin(x * 0.018 + 0.4), 2) * 22 -
      Math.sin(x * 0.041) * 9,
    entry = Math.max(0, Math.min(1, (lip - z) / 38)),
    angle = Math.atan2((z + 412) / 450, x / 335),
    footprint =
      Math.hypot(x / 335, (z + 412) / 450) /
      (1 + Math.sin(angle * 3) * 0.04 + Math.cos(angle * 5) * 0.03),
    edge = Math.max(0, Math.min(1, (1.1 - footprint) / 0.18)),
    t = entry * entry * (3 - 2 * entry) * edge * edge * (3 - 2 * edge);
  return shelf + (floor - shelf) * t;
}

/** 下潜目标始终来自关卡状态，击败不同守卫才能依次打开通道。 */
export function marianaProgress(defeatedIds, position) {
  let opened = 0;
  while (
    opened < MARIANA_GATES.length &&
    defeatedIds.has(MARIANA_GATES[opened].id)
  )
    opened++;
  const arrived =
    opened === MARIANA_GATES.length &&
    Math.hypot(
      position.x - MARIANA_REFUGE.x,
      position.y - MARIANA_REFUGE.y,
      position.z - MARIANA_REFUGE.z,
    ) < MARIANA_REFUGE.radius;
  return { opened, arrived, next: MARIANA_GATES[opened] || null };
}
