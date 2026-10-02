import { EUROPA_WORLD } from "./europa_config.js";
import { REGION_OBJECTIVES } from "./expedition_objectives.js";
import { MARIANA_WORLD, MARIANA_GATES } from "./mariana_config.js";
import { REGION_SPECIES_KINDS } from "./region_ecology.js";
import { BOSS_SPECIES } from "./boss_rules.js";

import { PLAYER_CHARACTERS } from "./character_rules.js";

export const CHARACTERS = PLAYER_CHARACTERS;
export const REGIONS = Object.freeze(
  [
    {
      id: "hawaii",
      seabedHeat: true,
      name: "夏威夷海域",
      available: true,
      description:
        "从阳光海滩潜入火山深渊。珊瑚鱼群、远古巨兽与多位深渊领主在此共存。",
      speciesKinds: REGION_SPECIES_KINDS.hawaii,
      bossKinds: BOSS_SPECIES.filter((species) => !species.alien).map(
        (species) => species.kind,
      ),
      spawn: [0, -18, 75],
    },
    {
      id: "atlantis",
      seabedHeat: false,
      name: "亚特兰蒂斯遗迹",
      available: true,
      description:
        "从月夜浅滩潜入贝珠辉光映照的沉没古城。独特鱼群栖息于列柱间，克拉肯守卫波塞冬神殿。",
      speciesKinds: REGION_SPECIES_KINDS.atlantis,
      bossKinds: ["kraken"],
      bossHomes: { kraken: [0, -420, -815] },
      bossInstances: Object.freeze(
        [
          { id: "atlantis_court", home: [0, -420, -815], radius: 125 },
          { id: "atlantis_west", home: [-162, -360, -670], radius: 78 },
          { id: "atlantis_rear", home: [155, -555, -930], radius: 86 },
        ].map((instance) =>
          Object.freeze({
            ...instance,
            kind: "kraken",
            home: Object.freeze(instance.home),
          }),
        ),
      ),
      spawn: [0, -18, 75],
    },
    {
      id: "bermuda",
      name: "百慕大三角",
      available: true,
      seabedHeat: false,
      description:
        "风暴遮蔽神秘外海，探索可进入的巨型沉船，避开龙卷水柱与幽灵炮击。安全浅滩之外，危险分布在各个水层。",
      speciesKinds: REGION_SPECIES_KINDS.bermuda,
      bossKinds: BOSS_SPECIES.filter((s) => !s.alien).map((s) => s.kind),
      humanActivity: {
        swimmers: false,
        divers: false,
        releasedDivers: false,
        submarines: false,
        mines: true,
      },
      bossInstances: Object.freeze(
        [
          {
            id: "bermuda_hydra",
            maxCenterY: -12,
            kind: "hydra",
            home: [150, -20, -300],
            radius: 86,
          },
          {
            id: "bermuda_kraken",
            kind: "kraken",
            home: [-140, -240, -540],
            radius: 103,
          },
          {
            id: "bermuda_maja",
            kind: "mayan",
            home: [140, -420, -800],
            radius: 98,
          },
          {
            id: "bermuda_leviathan",
            kind: "leviathan",
            home: [-70, -590, -995],
            radius: 86,
          },
        ].map((s) => Object.freeze({ ...s, home: Object.freeze(s.home) })),
      ),
      spawn: [0, -18, 75],
    },
    {
      id: "mariana",
      name: "马里亚纳海沟",
      available: true,
      seabedHeat: false,
      description:
        "沿海沟岩壁逐层下潜，突破四位深渊守卫，抵达万米深处的秘密。15米起步，沿上层岩壁捕捉大鱼；25米后挑战守关领主。",
      world: MARIANA_WORLD,
      startLength: 15,
      departureHint:
        "15米起步 · 沿上层岩壁寻找大鱼\n25米后在首层深水挑战海德拉，开启第一道压力帘",
      speciesKinds: REGION_SPECIES_KINDS.mariana,
      bossKinds: MARIANA_GATES.map((g) => g.kind),
      bossInstances: MARIANA_GATES.map((g) => ({
        id: g.id,
        kind: g.kind,
        home: g.home,
        radius: g.radius,
        maxCenterY: g.maxCenterY,
        persistentDefeat: true,
      })),
      humanActivity: {
        swimmers: false,
        divers: false,
        releasedDivers: false,
        submarines: false,
        mines: false,
      },
      spawn: [0, -18, 75],
      completion: "trench_descent",
    },
    {
      id: "europa",
      departureHint:
        "这里是冰穹育幼湾 · 捕食小型游体补给成长\n长到约4米，再沿盐脉探索",
      name: "木卫二冰下海洋",
      available: true,
      seabedHeat: false,
      surfaceMode: "ice",
      world: EUROPA_WORLD,
      ecologyKind: "alien",
      description:
        "冰壳之下，盐脉与热泉孕育着幻想外星生命。探索五层栖地，挑战辉渊巡狩者与星渊织母。",
      speciesKinds: REGION_SPECIES_KINDS.europa,
      bossKinds: ["abyss_weaver", "lumen_stalker"],
      bossInstances: [
        {
          id: "europa_lumen",
          kind: "lumen_stalker",
          home: [-90, -465, -570],
          radius: 105,
          maxCenterY: -360,
          persistentDefeat: true,
        },
        {
          id: "europa_weaver",
          kind: "abyss_weaver",
          home: [0, -730, -745],
          radius: 140,
          maxCenterY: -650,
          persistentDefeat: true,
        },
      ],
      humanActivity: {
        swimmers: false,
        divers: false,
        releasedDivers: false,
        submarines: false,
        mines: false,
      },
      spawn: [0, -18, 75],
    },
  ].map((region) =>
    Object.freeze({ ...region, objective: REGION_OBJECTIVES[region.id] }),
  ),
);

/** 根据选项取可用配置；尚未开放的海域或角色不会被当作可玩内容。
 * @param {string} regionId 海域标识。
 * @param {string} characterId 角色标识。
 * @returns {{region:object,character:object,startLength:number}} 已验证的选择。
 */
export function getExpedition(regionId = "hawaii", characterId = "orca") {
  const region = REGIONS.find(
    (entry) => entry.id === regionId && entry.available,
  );
  const character = CHARACTERS.find(
    (entry) => entry.id === characterId && entry.available,
  );
  if (!region || !character) throw new Error("Expedition is not available");
  return {
    region,
    character,
    startLength: region.startLength ?? character.startLength,
  };
}
