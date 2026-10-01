/** 无脊椎动物按共享栖息特征生成，水母直径与龙虾含触角长度分别说明。 */
export const NONFISH_SPECIES = Object.freeze([
  Object.freeze({
    kind: "moon_jelly",
    label: "海月水母",
    latin: "AURELIA SPP.",
    category: "invertebrate",
    tier: 0,
    predator: false,
    length: 0.4,
    speed: 0.45,
    escapeSpeed: 0.6,
    depthMin: 4,
    depthMax: 65,
    population: 12,
    schoolSize: 1,
    residentRadius: 18,
    nutrition: 6,
    growth: 0.012,
    color: "#bddbe1",
    realSize: "本作伞径0.4米；口腕另计。",
    ability: "伞体脉冲",
    description:
      "透明浅盘状伞体下可见四枚马蹄状生殖腺，边缘有细小触手，四束口腕随水流摆动。它是缓慢漂游的刺胞动物，不是鱼类。",
    habitatNote: "参考海月水母属；混合海域分布与本作捕食营养为艺术及玩法设定。",
    counter: "靠近观察透明伞体；小水母是补充食材，不能代替成年角色的大型猎物。",
  }),
  Object.freeze({
    kind: "spiny_lobster",
    label: "刺龙虾",
    latin: "PANULIRUS ARGUS",
    category: "invertebrate",
    tier: 0,
    predator: false,
    length: 0.9,
    speed: 0.4,
    escapeSpeed: 0.8,
    depthMin: 4,
    depthMax: 110,
    population: 8,
    schoolSize: 1,
    residentRadius: 16,
    benthic: true,
    floorOffset: 0.12,
    nutrition: 10,
    growth: 0.018,
    color: "#c28157",
    realSize: "本作0.9米含长触角，躯干长度较小。",
    ability: "礁底步行",
    description:
      "有分节的刺状甲壳、扇形尾部、十条步足与两根长触角。与螯龙虾不同，没有一对巨大的钳子；在礁底缓慢步行。",
    habitatNote:
      "解剖参考加勒比刺龙虾；其他海域的共同礁区种群是游戏适配，不表示该物种真实全球分布。",
    counter: "沿浅礁海床寻找，小幅下潜接近；附肢长度不代表大型鱼的营养。",
  }),
]);

/** 各地图持有独立居民锚点；底栖高度由真实海床在生成与移动时采样。 */
export function nonfishEcology(regionId, worldBounds) {
  const points =
    regionId === "atlantis"
      ? [
          [-24, -20, 34],
          [23, -23, -40],
          [16, -24, -90],
        ]
      : regionId === "bermuda"
        ? [
            [-24, -18, 38],
            [26, -23, -32],
            [-15, -25, -80],
          ]
        : regionId === "mariana"
          ? [
              [-28, -18, 45],
              [28, -24, -25],
              [18, -28, -80],
            ]
          : [
              [-22, -18, 46],
              [23, -21, -25],
              [-16, -25, -90],
            ];
  return Object.freeze(
    NONFISH_SPECIES.map((s) =>
      Object.freeze({
        ...s,
        worldBounds,
        spawnAnchors: Object.freeze(
          Array.from({ length: s.population }, (_, i) => {
            const p = points[i % points.length],
              group = Math.floor(i / points.length),
              angle = group * 2.399;
            const spread = group * 1.2;
            return Object.freeze([
              p[0] + (s.benthic ? 4 : 0) + Math.cos(angle) * spread,
              p[1],
              p[2] + (s.benthic ? 6 : 0) + Math.sin(angle) * spread,
            ]);
          }),
        ),
      }),
    ),
  );
}
