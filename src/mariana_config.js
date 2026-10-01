import { WORLD } from "./world_config.js";

/** 海沟地图的边界与四个独立关卡；其他海域不继承深度扩展。 */
export const MARIANA_WORLD = Object.freeze({
  ...WORLD,
  minX: -210,
  maxX: 210,
  minZ: -620,
  maxZ: 140,
  maxDepth: 2780,
});
export const MARIANA_GATES = Object.freeze(
  [
    {
      id: "mariana_hydra",
      kind: "hydra",
      depth: 650,
      x: -95,
      z: -350,
      color: 0x8fd6cb,
      name: "潮汐之门",
      home: [75, -20, -380],
      radius: 75,
      maxCenterY: -12,
      guideToGuardian: true,
    },
    {
      id: "mariana_kraken",
      kind: "kraken",
      depth: 1000,
      x: 95,
      z: -420,
      color: 0x64ddde,
      name: "回声之门",
    },
    {
      id: "mariana_maja",
      kind: "mayan",
      depth: 1375,
      x: 95,
      z: -420,
      color: 0x8b95ed,
      name: "幽蓝之门",
    },
    {
      id: "mariana_leviathan",
      kind: "leviathan",
      depth: 2150,
      x: -95,
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
  const t = Math.max(0, Math.min(1, (-z - 100) / 150));
  return shelf + (floor - shelf) * (t * t * (3 - 2 * t));
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
