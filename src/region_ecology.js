import { ODYSSEY_SPECIES } from "./odyssey_species.js";
import { PENGLAI_SPECIES } from "./penglai_species.js";
import { disperseLargePrey } from "./large_prey_distribution.js";
import { AMAZON_SPECIES } from "./amazon_species.js";
import {
  spreadFeedingSchools,
  densifyFeedingSchools,
} from "./feeding_distribution.js";
import { hawaiiEcology } from "./hawaii_ecology.js";
import { EUROPA_SPECIES } from "./europa_species.js";
import { NONFISH_SPECIES, nonfishEcology } from "./nonfish_ecology.js";
import { WORLD } from "./world_config.js";
import { MARIANA_WORLD } from "./mariana_config.js";
import { MARIANA_SPECIES } from "./mariana_species.js";
import { marianaEcology } from "./mariana_ecology.js";
import { BERMUDA_SPECIES } from "./bermuda_species.js";
import { bermudaEcology } from "./bermuda_ecology.js";
import { ECOSYSTEM_SPECIES } from "./ecosystem_config.js";
import { ATLANTIS_SPECIES } from "./atlantis_species.js";
import { DEEP_GIANT_ANCHORS } from "./deep_giants.js";
import {
  addAtlantisCitySchools,
  atlantisLargePreyAnchors,
} from "./atlantis_city_ecology.js";

/** 全量图鉴目录；运行时生成必须通过getRegionSpecies选择海域。 */
export const ALL_SPECIES = Object.freeze([
  ...ECOSYSTEM_SPECIES,
  ...ATLANTIS_SPECIES,
  ...BERMUDA_SPECIES,
  ...MARIANA_SPECIES,
  ...NONFISH_SPECIES,
  ...EUROPA_SPECIES,
  ...AMAZON_SPECIES,
  ...PENGLAI_SPECIES,
  ...ODYSSEY_SPECIES,
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
    residentRadius: 6,
    spawnAnchors: [
      [-4, -17, 64],
      [6, -19, 47],
      [-7, -18, 29],
      [5, -20, 10],
      [-9, -20, -13],
      [7, -21, -35],
      [-12, -21, -59],
      [10, -22, -85],
    ],
  },
  cuttlefish: {
    residentRadius: 12,
    spawnAnchors: [
      [5, -19, 59],
      [-6, -20, 40],
      [8, -21, 22],
      [-7, -22, 3],
      [10, -23, -19],
      [-9, -24, -41],
      [12, -25, -65],
      [-11, -26, -91],
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
  ichthyotitan: { spawnAnchors: DEEP_GIANT_ANCHORS.atlantis },
};

const BASE_REGION_SPECIES = Object.freeze({
  odyssey: ODYSSEY_SPECIES,
  penglai: PENGLAI_SPECIES,
  europa: EUROPA_SPECIES,
  amazon: AMAZON_SPECIES,
  hawaii: Object.freeze([
    ...hawaiiEcology(ECOSYSTEM_SPECIES),
    ...nonfishEcology("hawaii", WORLD),
  ]),
  mariana: Object.freeze([
    ...marianaEcology(ALL_SPECIES),
    ...nonfishEcology("mariana", MARIANA_WORLD),
  ]),
  bermuda: Object.freeze([
    ...bermudaEcology(ALL_SPECIES),
    ...nonfishEcology("bermuda", WORLD),
  ]),
  atlantis: Object.freeze(
    Object.entries(ATLANTIS_OVERRIDES)
      .map(([kind, overrides]) => {
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
      })
      .concat(nonfishEcology("atlantis", WORLD)),
  ),
});

// 各地图共用分布与增密流程；大型水生食物再分散，保留固定补给和独特品种。
const REGION_SPECIES = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_REGION_SPECIES).map(([id, species]) => [
      id,
      disperseLargePrey(densifyFeedingSchools(spreadFeedingSchools(species))),
    ]),
  ),
);

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
