import {
  ODYSSEY_SITES,
  ODYSSEY_WORLD,
  expandOdysseyPoint,
  expandOdysseyXZ,
  odysseySeabedHeight,
} from "./odyssey_config.js";

// 这些航路坐标沿用上一版海图，再统一映射；群体规模固定，不套用共享增密第二次。
const SCHOOLS = {
  ambrosia_sprat: {
    count: 6,
    clearance: 30,
    sites: [
      [-205, -270],
      [210, -330],
      [-250, -460],
      [250, -560],
      [-275, -700],
      [260, -850],
      [-275, -1050],
      [280, -1240],
    ],
  },
  moon_scallop: {
    count: 5,
    clearance: 24,
    sites: [
      [-275, -315],
      [280, -400],
      [-285, -550],
      [280, -740],
      [-290, -950],
      [290, -1180],
    ],
  },
  lyre_ray: {
    count: 5,
    clearance: 36,
    sites: [
      [-245, -355],
      [285, -455],
      [-290, -610],
      [300, -785],
      [-295, -925],
      [305, -1085],
      [-285, -1260],
      [295, -1410],
      [-270, -1560],
      [80, -1640],
    ],
  },
  hippocampus: {
    count: 5,
    clearance: 52,
    sites: [
      [150, -350],
      [-155, -455],
      [300, -585],
      [-300, -725],
      [150, -860],
      [-145, -990],
      [310, -1120],
      [-310, -1260],
      [120, -1380],
      [-150, -1490],
      [310, -1590],
      [-110, -1650],
    ],
  },
  iris_cuttlefish: {
    count: 4,
    clearance: 32,
    sites: [
      [130, -265],
      [-185, -390],
      [295, -490],
      [-305, -650],
      [280, -820],
      [-290, -1030],
      [280, -1350],
      [-285, -1510],
    ],
  },
  aegean_jelly: {
    count: 5,
    clearance: 76,
    sites: [
      [-230, -500],
      [280, -670],
      [-285, -880],
      [290, -1010],
      [-300, -1130],
      [300, -1300],
      [-280, -1470],
      [300, -1640],
    ],
  },
};

// 独立居民分散在左右支路；大型补给不成群，三处领主的近场补给另行保留。
const RESIDENTS = {
  pearl_seahorse: [
    [-260, -290],
    [270, -425],
    [-280, -590],
    [290, -760],
    [-290, -970],
    [300, -1160],
  ],
  nereid: [
    [230, -285],
    [-265, -425],
    [280, -575],
    [-290, -740],
    [290, -910],
    [-300, -1060],
    [290, -1230],
    [-300, -1380],
    [290, -1530],
    [-150, -1660],
  ],
  amphora_hermit: [
    [-270, -370],
    [280, -530],
    [-290, -730],
    [280, -940],
    [-300, -1160],
    [290, -1390],
  ],
  silver_pipefish: [
    [260, -300],
    [-280, -480],
    [290, -640],
    [-300, -820],
    [290, -1020],
    [-295, -1200],
    [300, -1430],
    [-240, -1600],
  ],
  triton_guard: [
    [-300, -510],
    [310, -820],
    [-310, -1110],
    [310, -1460],
  ],
  siren_eel: [
    [300, -650],
    [-310, -940],
    [310, -1260],
    [-300, -1520],
  ],
  naga_huntress: [
    [-300, -650],
    [320, -1000],
    [-320, -1370],
    [310, -1630],
  ],
  ketos: [
    [-320, -800],
    [320, -1150],
    [-320, -1450],
    [320, -1670],
  ],
  abyss_lamprey: [
    [310, -900],
    [-315, -1300],
    [-280, -1630],
  ],
  aegis_sturgeon: [
    [300, -540],
    [-300, -780],
    [310, -1070],
    [-310, -1490],
  ],
  cerulean_hound: [
    [-320, -1030],
    [320, -1320],
    [-260, -1660],
  ],
  bronze_turtle: [
    [-320, -450],
    [330, -950],
    [-300, -1000],
    [-200, -1600],
    [250, -1670],
  ],
  oracle_whale: [
    [280, -350],
    [-320, -700],
    [310, -1050],
    [-150, -1650],
    [0, -1580],
  ],
  thalassa_manta: [
    [-290, -300],
    [300, -470],
    [-300, -850],
    [150, -950],
    [-350, -1320],
    [340, -1570],
    [50, -1650],
  ],
};
const LORDS = ["karkinos", "scylla", "charybdis"];
const ADULT_MEALS = ["bronze_turtle", "oracle_whale", "thalassa_manta"];
const CLEARANCE = { bronze_turtle: 42, oracle_whale: 65, thalassa_manta: 55 };
const groundHome = (x, z, h) => [
  x,
  Math.min(-8, odysseySeabedHeight(x, z) + h),
  z,
];
const mappedHome = ([x, z], h) => groundHome(...expandOdysseyXZ(x, z), h);

function freeze(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object" && !Object.isFrozen(child))
      freeze(child);
  return Object.freeze(value);
}

/** 现行海图的最终一次迁移：育幼库存原样保留，新水域具有真实可食鱼群和独立居民。 */
export function expandOdysseyEcology(species) {
  return Object.freeze(
    species.map((entry) => {
      const e = { ...entry, worldBounds: ODYSSEY_WORLD };
      if (entry.schoolProfiles) {
        const profiles = entry.schoolProfiles.map((p) => {
          if (p.anchor[2] >= -200) return p;
          const anchor = expandOdysseyPoint(p.anchor),
            dy = p.anchor[1] - anchor[1];
          return {
            ...p,
            anchor,
            depthMin: Math.max(5, p.depthMin + dy),
            depthMax: p.depthMax + dy,
          };
        });
        const extra = SCHOOLS[entry.kind];
        if (extra)
          for (const site of extra.sites) {
            const anchor = mappedHome(site, extra.clearance);
            profiles.push({
              anchor,
              count: extra.count,
              depthMin: Math.max(5, -anchor[1] - 14),
              depthMax: -anchor[1] + 14,
              fixedHabitat: true,
              nurseryResident: false,
              densityLimit: extra.count,
            });
          }
        e.schoolProfiles = profiles;
        e.schoolAnchors = profiles.map((p) => p.anchor);
        e.spawnAnchors = profiles.flatMap((p) =>
          Array.from({ length: p.count }, () => p.anchor.slice()),
        );
        e.population = e.spawnAnchors.length;
        e.depthMin = Math.min(...profiles.map((p) => p.depthMin));
        e.depthMax = Math.max(...profiles.map((p) => p.depthMax));
      } else {
        const homes = entry.spawnAnchors.map((p) =>
          p[2] >= -200 ? p.slice() : expandOdysseyPoint(p),
        );
        // 近场战斗距离不随海图放大；每位领主保留一条31米海蛇及三种离中心百米外的补给。
        if (entry.kind === "ceto_serpent")
          for (const [i, kind] of LORDS.entries()) {
            const [x, z] = ODYSSEY_SITES[kind];
            homes[i] = groundHome(x + (i === 1 ? -75 : 75), z + 45, 45);
          }
        const role = ADULT_MEALS.indexOf(entry.kind);
        if (role >= 0)
          for (const [i, kind] of LORDS.entries()) {
            const [x, z] = ODYSSEY_SITES[kind];
            homes[i] = groundHome(
              x + [-105, 105, -60][role],
              z + [95, -95, -125][role],
              CLEARANCE[entry.kind],
            );
          }
        const reserve = {
          siren_eel: [0, "karkinos", -120, 65],
          naga_huntress: [0, "scylla", 115, 70],
          abyss_lamprey: [1, "charybdis", -90, -25],
        }[entry.kind];
        if (reserve) {
          const [i, kind, dx, dz] = reserve,
            [x, z] = ODYSSEY_SITES[kind];
          homes[i] = groundHome(x + dx, z + dz, 45);
        }
        const clearance =
          CLEARANCE[entry.kind] ?? Math.max(30, entry.length * 1.5 + 18);
        for (const site of RESIDENTS[entry.kind] || [])
          homes.push(mappedHome(site, clearance));
        e.spawnAnchors = homes;
        e.scatterPopulation = false;
        e.population = homes.length;
        e.depthMin = Math.max(5, Math.min(...homes.map((p) => -p[1])) - 25);
        e.depthMax = Math.max(...homes.map((p) => -p[1])) + 25;
      }
      return freeze(e);
    }),
  );
}
