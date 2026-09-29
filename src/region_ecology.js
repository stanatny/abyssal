import { ECOSYSTEM_SPECIES } from "./ecosystem_config.js";
import { ATLANTIS_SPECIES } from "./atlantis_species.js";
import {
  addAtlantisCitySchools,
  atlantisLargePreyAnchors,
} from "./atlantis_city_ecology.js";

/** 全量图鉴目录；运行时生成必须通过getRegionSpecies选择海域。 */
export const ALL_SPECIES = Object.freeze([
  ...ECOSYSTEM_SPECIES,
  ...ATLANTIS_SPECIES,
]);

/**
 * 返回只读海域生态配置；未知海域不会默默生成夏威夷生态。
 * @param {string} regionId 海域标识，默认hawaii。
 * @returns {readonly object[]} 含种群数量与固定出生锚点的物种配置。
 */
export function getRegionSpecies(regionId = "hawaii") {
  if (!Object.hasOwn(REGION_SPECIES, regionId))
    throw new Error(`Unknown ecology region: ${regionId}`);
  return REGION_SPECIES[regionId];
}

// 每个海域持有独立配置；不改共享物种的体长、营养、成长或战斗规则。
const ATLANTIS_OVERRIDES = {
  spadefish: {
    schoolAnchors: [
      [0, -18, 57],
      [-18, -18, 19],
      [18, -18, -26],
      [-14, -17, 94],
      [23, -20, -79],
      [-25, -21, -109],
    ],
  },
  sardine: {
    population: 80,
    nurseryResident: true,
    schoolAnchors: [
      [14, -18, 36],
      [-13, -18, 75],
      [-19, -19, -11],
      [12, -20, -59],
      [-9, -21, -99],
    ],
  },
  seahorse: {
    spawnAnchors: [
      [-11, -12, 65],
      [16, -13, 59],
      [-24, -14, 42],
      [25, -15, 27],
      [-14, -13, 17],
      [9, -14, 2],
      [-27, -16, -16],
      [21, -17, -28],
    ],
  },
  cuttlefish: {
    spawnAnchors: [
      [19, -20, 82],
      [-23, -21, 64],
      [10, -22, 47],
      [-15, -22, 31],
      [25, -23, 15],
      [-28, -23, -1],
      [14, -24, -19],
      [-9, -25, -38],
    ],
  },
  sunfish: {
    population: 6,
    layeredSchools: true,
    schoolAnchors: [
      [12, -27, -100],
      [-24, -35, -157],
      [-15, -42, -208],
    ],
  },
  tuna: {
    population: 24,
    layeredSchools: true,
    schoolAnchors: [
      [-15, -32, -106],
      [16, -53, -216],
      [-18, -83, -300],
      [14, -96, -398],
    ],
  },
  ray: {
    population: 12,
    layeredSchools: true,
    schoolAnchors: [
      [-14, -41, -188],
      [17, -61, -264],
      [-18, -82, -348],
      [-28, -92, -372],
      [14, -102, -398],
      [-12, -116, -470],
    ],
  },
  blue_shark: {
    edgeTerritory: {
      minX: -105,
      maxX: 28,
      minZ: -275,
      maxZ: -145,
      center: { x: -36, y: -42, z: -202 },
    },
  },
  swordfish: {},
  octopus: { population: 7 },
  helicoprion: {},
  ichthyosaur: {},
  plesiosaur: { population: 6 },
  pliosaur: { population: 6 },
  mosasaur: { population: 7 },
  basilosaurus: { population: 6 },
  megalodon: { population: 7 },
};

const REGION_SPECIES = Object.freeze({
  hawaii: ECOSYSTEM_SPECIES,
  atlantis: Object.freeze(
    Object.entries(ATLANTIS_OVERRIDES).map(([kind, overrides]) => {
      const source = ALL_SPECIES.find((entry) => entry.kind === kind);
      const regionSpecies = addAtlantisCitySchools({
        ...source,
        ...overrides,
        cityHabitat: true,
      });
      if (
        [
          "plesiosaur",
          "pliosaur",
          "mosasaur",
          "basilosaurus",
          "megalodon",
        ].includes(kind)
      )
        regionSpecies.spawnAnchors = atlantisLargePreyAnchors(regionSpecies);
      return freezeRecord(regionSpecies);
    }),
  ),
});

/** 海域可生成种类清单，与实际种群使用同一个配置来源。 */
export const REGION_SPECIES_KINDS = Object.freeze(
  Object.fromEntries(
    Object.entries(REGION_SPECIES).map(([region, species]) => [
      region,
      Object.freeze(species.map((entry) => entry.kind)),
    ]),
  ),
);

/** 冻结锚点与领地等嵌套数据，防止鱼群迁移修改下一次重开的出生配置。 */
function freezeRecord(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object") freezeRecord(child);
  return Object.freeze(value);
}
