import { initialSpeciesAnchor } from "./ecosystem_population.js";

// 在通用增密/分散之后安排领主外围居民；不改变体长、营养、伤害或复活规则。
// 序号对应同种个体，剩余库存继续留在原来的成长路线。
const HOMES = {
  atlantis: {
    ichthyotitan: [
      [-65, -405, -845],
      [-225, -340, -700],
      [225, -540, -960],
    ],
    basilosaurus: [
      [-70, -395, -885],
      [-225, -335, -605],
      [80, -515, -980],
    ],
    megalodon: [
      [80, -385, -850],
      [-90, -340, -610],
      [205, -505, -1020],
    ],
  },
  bermuda: {
    livyatan: [
      [-145, -95, -490],
      [111.5, -520, -1057.44],
      [117.11, -365, -783.17],
      [-165, -460, -965],
      [147.5, -175, -570],
      [-145, -280, -680],
      [123.48, -365, -760.61],
      [111.58, -175, -599.76],
    ],
    plesiosaur: [
      [115, -220, -590],
      [-105, -390, -975],
      [-120, -320, -745],
      [125, -390, -850],
      [-96.19, -320, -724.1],
    ],
    ichthyotitan: [
      [100, -35, -360],
      [-210, -235, -590],
      [215, -405, -850],
      [115, -570, -1050],
    ],
    sperm_whale: [
      [75, -75, -360],
      [220, -75, -365],
    ],
  },
  amazon: {
    rootback_colossus: [
      [-70, -100, -590],
      [-210, -205, -710],
      [268, -270, -1007],
    ],
    titanoboa: [
      [65, -95, -590],
      [-45, -90, -480],
      [-275, -200, -810],
      [-205, -195, -690],
      [210, -285, -1090],
      [270, -255, -1075],
    ],
    purussaurus: [
      [-65, -95, -640],
      [-185, -200, -825],
      [240, -275, -970],
    ],
  },
};

// 将挤在战斗中心的旧库存分散到同层外围；下面是通过实体地形验证的固定栖地。
const SPACED_HOMES = {
  atlantis: {
    pliosaur: {
      1: [169.23, -357.48, -671.07],
      7: [127.78, -392.48, -665.44],
    },
    mosasaur: {
      1: [-164.06, -517.3, -857.9],
      4: [133.4, -343.48, -653.62],
      7: [162.42, -332.82, -724.14],
    },
    basilosaurus: {
      6: [-37.1, -426.51, -1011.52],
    },
    megalodon: {
      4: [-227.51, -417.61, -842.29],
      8: [-226.66, -334.06, -865.87],
    },
  },
  bermuda: {
    sperm_whale: {
      4: [194.38, -370.12, -973.67],
    },
    pliosaur: {
      3: [57.26, -275.63, -712.45],
      4: [179.46, -275.01, -690.68],
    },
    mosasaur: {
      1: [255.46, -401.56, -653.87],
      6: [44.38, -385.98, -599.26],
    },
    megalodon: {
      3: [35.18, -435.96, -629.18],
      2: [-132, -476, -929.44],
      5: [0, -476, -814.63],
      7: [-2.36, -476, -874.35],
      8: [-89.36, -476, -893.39],
    },
  },
  mariana: {
    sperm_whale: {
      1: [85.74, -495.12, -564.61],
      5: [160, -470, -460],
    },
    plesiosaur: {
      4: [-48.74, -715.63, -332.45],
      5: [-118.74, -355.63, -402.45],
      10: [146.26, -441.68, -296.19],
      17: [-126.96, -1147.01, -344.05],
    },
    pliosaur: {
      3: [124.38, -750.12, -503.67],
      9: [-178.43, -836.52, -410.22],
      14: [-125.29, -425.32, -521.24],
    },
    mosasaur: {
      5: [129.38, -495.12, -503.67],
      6: [-5.07, -1162.57, -264.58],
      9: [138.46, -1095.06, -355.98],
      10: [-118.74, -385.63, -282.45],
      14: [-141.46, -1074.29, -472.69],
    },
    basilosaurus: {
      3: [141.53, -934.78, -534.58],
      6: [-101.09, -561.51, -558.74],
      8: [-0.74, -725.63, -332.45],
      9: [155, -425, -380],
      10: [-179.14, -1169.68, -394.78],
      11: [54, -757.86, -533.16],
    },
    megalodon: {
      0: [-168.47, -430.65, -462.42],
      3: [150.37, -1140.12, -389.42],
      4: [155, -1930, -390],
      7: [110.11, -578.38, -528.47],
      8: [-141.93, -1125.65, -500.35],
      9: [153.64, -432.67, -426.46],
      10: [138.93, -791.68, -315.7],
      11: [-170.77, -473.61, -490.67],
      13: [162.58, -544.86, -447.88],
    },
    shonisaurus: {
      5: [129.38, -455.12, -508.67],
      6: [-142.57, -760.32, -400],
      9: [77.79, -766.68, -317.49],
    },
    ichthyotitan: {
      0: [-80, -435, -500],
      7: [35, -1990, -410],
    },
  },
};

function replaceHomes(entry, homes, extra = {}) {
  const population = extra.population ?? entry.population;
  return freeze({
    ...entry,
    ...extra,
    population,
    spawnAnchors: Array.from(
      { length: population },
      (_, i) => homes[i]?.slice() || initialSpeciesAnchor(entry, i).toArray(),
    ),
  });
}

/** 区域差异在最终配置中可见，图鉴和实际出生使用同一份名册。 */
export function fitRegionalLordHabitats(region, species) {
  return Object.freeze(
    species.map((entry) => {
      const homes = HOMES[region]?.[entry.kind];
      if (
        region === "hawaii" &&
        ["ichthyotitan", "basilosaurus", "megalodon"].includes(entry.kind)
      )
        return freeze({
          ...entry,
          residentRadius: 35,
          depthMax: Math.max(entry.depthMax, 680),
        });
      const spaced = SPACED_HOMES[region]?.[entry.kind];
      if (!homes && !spaced) return entry;
      const extra = {
        residentRadius:
          region === "mariana" && entry.kind === "ichthyotitan"
            ? entry.residentRadius
            : 25,
      };
      if (entry.kind === "ichthyotitan" && homes) {
        extra.population = homes.length;
        extra.swimClearance = 0.55;
        if (region === "bermuda") {
          // 九头蛇是远海表层危险点，不是出生浅滩；允许守卫在该海区实际反击。
          extra.depthMin = 20;
          extra.hunterTerritory = {
            minX: -292,
            maxX: 292,
            minZ: -1142,
            maxZ: -230,
          };
        }
      }
      if (region === "amazon") {
        extra.depthMin = Math.min(entry.depthMin, 75);
        extra.depthMax = Math.max(entry.depthMax, 370);
        extra.swimClearance = 0.45;
      }
      return replaceHomes(entry, { ...homes, ...spaced }, extra);
    }),
  );
}

/** 夏威夷每轮仍随机两位领主；两只既有巨兽随本轮领地分配，而非按玩家位置刷怪。 */
export function fitHawaiiEncounterHabitats(species, bosses) {
  const homes = bosses.filter((b) => b.enabled).map((b) => b.home);
  if (homes.length !== 2) return species;
  const offsets = {
    ichthyotitan: [-85, 15, -15],
    basilosaurus: [-60, 40, 65],
    megalodon: [-40, -15, -85],
  };
  return species.map((entry) => {
    const offset = offsets[entry.kind];
    if (!offset) return entry;
    return replaceHomes(
      entry,
      homes.map((p) => [
        p.x + Math.sign(p.x || 1) * offset[0],
        p.y + offset[1],
        p.z + offset[2],
      ]),
    );
  });
}

function freeze(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object" && !Object.isFrozen(child))
      freeze(child);
  return Object.freeze(value);
}
