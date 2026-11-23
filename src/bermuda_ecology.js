import { wreckWorldPoint, WRECK_BED } from "./bermuda_sites.js";
import { BERMUDA_WORLD } from "./bermuda_config.js";
import { initialSpeciesAnchor } from "./ecosystem_population.js";
import { isNursery } from "./nursery_rules.js";
import { bermudaSeabedHeight } from "./bermuda_terrain.js";
import { BERMUDA_CAVE_SITES } from "./bermuda_cave_config.js";
import { BERMUDA_LORD_SITES } from "./bermuda_lord_sites.js";
/** 地图只提供生态数据，行动、营养、复活和安全区沿用共享规则。 */
export function bermudaEcology(allSpecies) {
  const overrides = {
    sardine: {
      population: 80,
      nurseryResident: true,
      schoolAnchors: [
        [12, -17, 70],
        [-15, -18, 30],
        [20, -20, -15],
        [-18, -22, -65],
      ],
    },
    herring: {
      population: 24,
      nurseryResident: true,
      schoolAnchors: [
        [-20, -18, 82],
        [22, -21, -88],
      ],
    },
    queen_angelfish: {
      population: 12,
      nurseryResident: true,
      residentRadius: 8,
      spawnAnchors: [
        [-22, -19, 68],
        [-32, -20, 67],
        [-22, -21, 56],
        [25, -22, 30],
        [35, -23, 28],
        [26, -23, 17],
        [-26, -24, -12],
        [-36, -25, -15],
        [-25, -25, -26],
        [30, -27, -61],
        [40, -28, -65],
        [30, -28, -77],
      ],
    },
    triggerfish: {
      population: 24,
      schoolSize: 6,
      nurseryResident: true,
      schoolAnchors: [
        [-12, -24, 57],
        [17, -26, 14],
        [-20, -29, -26],
        [22, -31, -77],
      ],
    },
    needlefish: {
      population: 32,
      schoolSize: 8,
      schoolAnchors: [
        [8, -4, 46],
        [-19, -5, -35],
        [25, -7, -91],
        [-130, -9, -360],
      ],
    },
    turtle: { population: 4 },
    sunfish: { population: 8 },
    tuna: {
      fixedSchoolIndices: [3, 4],
      depthMax: 600,
      population: 40,
      schoolSize: 5,
      layeredSchools: true,
      schoolAnchors: [
        [16, -52, -220],
        [-80, -83, -370],
        [80, -135, -470],
        wreckWorldPoint([-62, -448, -600]),
        wreckWorldPoint([-65, -468, -698]),
        [90, -320, -710],
        [-155, -420, -810],
        [65, -530, -945],
      ],
    },
    ray: {
      fixedSchoolIndices: [2],
      population: 20,
      schoolSize: 4,
      layeredSchools: true,
      depthMax: 520,
      schoolAnchors: [
        [-18, -62, -280],
        [70, -130, -500],
        wreckWorldPoint([-65, -454, -630]),
        [-120, -440, -810],
        [60, -520, -965],
      ],
    },
    octopus: {
      depthMax: 500,
      population: 10,
      spawnAnchors: [
        [-145, -132, -440],
        [70, -235, -525],
        [-150, -280, -650],
        [135, -330, -760],
        [-145, -385, -820],
      ],
    },
    barracuda: {
      population: 8,
      edgeTerritory: null,
      spawnAnchors: [
        [-100, -18, -400],
        [110, -38, -465],
        [-155, -60, -490],
        [145, -85, -520],
      ],
    },
    tiger_shark: {
      population: 7,
      edgeTerritory: null,
      spawnAnchors: [
        [-140, -25, -450],
        [100, -55, -410],
        [-150, -90, -555],
        [150, -135, -615],
        [-130, -175, -670],
      ],
    },
    shark: {
      population: 4,
      edgeTerritory: null,
      spawnAnchors: [
        [-90, -42, -430],
        [130, -95, -520],
        [-160, -130, -570],
        [140, -155, -650],
      ],
    },
    sperm_whale: {
      population: 6,
      residentRadius: 35,
      spawnAnchors: [
        // 海面领主的外围保留成年补给；不增加总量，也不进入浅滩安全区。
        [75, -100, -390],
        [225, -100, -390],
        [110, -270, -700],
        [-160, -325, -780],
        [110, -420, -920],
        [-130, -505, -1040],
      ],
    },
    cameroceras: {
      population: 8,
      spawnAnchors: [
        [85, -115, -470],
        [-155, -190, -570],
        [105, -255, -660],
        [-145, -330, -770],
      ],
    },
    dunkleosteus: { population: 5 },
    pliosaur: {
      population: 4,
      spawnAnchors: [
        [-115, -250, -650],
        [120, -340, -780],
        [-125, -420, -870],
        [110, -480, -955],
      ],
    },
    plesiosaur: {
      population: 4,
      spawnAnchors: [
        [115, -220, -590],
        [-120, -320, -745],
        [125, -400, -850],
        [-105, -495, -975],
      ],
    },
    mosasaur: { population: 6 },
    megalodon: { population: 7 },
    livyatan: {
      population: 6,
      spawnAnchors: [
        [-145, -95, -490],
        [130, -175, -570],
        [-145, -280, -680],
        [130, -365, -795],
        [-165, -460, -965],
        [110, -520, -1040],
      ],
    },
    ichthyotitan: {
      population: 2,
      spawnAnchors: [
        [-165, -460, -940],
        [155, -550, -1050],
      ],
    },
  };
  return Object.freeze(
    Object.entries(overrides).map(([kind, extra]) => {
      const source = allSpecies.find((s) => s.kind === kind);
      if (!source) throw new Error(`Missing Bermuda species: ${kind}`);
      const { fixedSchoolIndices, ...configuration } = extra;
      const entry = { ...source, ...configuration };
      // 沉船内部食物沿用已验收的通道锚点；外海群体仍走共享分散规则。
      if (fixedSchoolIndices)
        entry.schoolProfiles = entry.schoolAnchors.map((anchor, index) => ({
          anchor: [...anchor],
          count: Math.min(
            entry.schoolSize,
            entry.population - index * entry.schoolSize,
          ),
          depthMin: Math.max(entry.depthMin, -anchor[1] - 18),
          depthMax: Math.min(entry.depthMax, -anchor[1] + 18),
          fixedHabitat: fixedSchoolIndices.includes(index),
        }));
      return freeze(entry);
    }),
  );
}

// 全图重排只保护真实育幼栖地和三组船舱食物，其余居民覆盖完整的新航路。
const ROUTE_SCHOOLS = {
  needlefish: [
    [-220, -7, -250, 6],
    [220, -8, -450, 6],
    [-300, -9, -650, 6],
    [300, -8, -850, 6],
    [-220, -7, -1050, 6],
    [220, -9, -1250, 6],
    [-300, -8, -1450, 6],
    [300, -9, -1640, 6],
  ],
  turtle: [
    [-350, -20, -230, 2],
    [350, -22, -350, 2],
    [-50, -20, -750, 2],
    [80, -24, -1150, 2],
  ],
  sunfish: [-300, -550, -800, -1050, -1300, -1580].flatMap((z, row) =>
    [-300, 300].map((x) => [x, -50 - row * 3, z, 4]),
  ),

  // 鱼群贴近实际观景水层；最深群体仍保留原600米物种下限与队形余量。
  tuna: [
    ...[
      [-395, -360, 0],
      [-410, -650, 0],
      [-390, -950, 0],
      [400, -400, 0],
      [390, -690, 0],
      [400, -1030, 0],
      [-395, -1250, 0],
      [-330, -1420, -60],
      [65, -1345, 0],
      [-110, -1625, 0],
      [370, -1450, -60],
      [80, -1690, 0],
    ].map(([x, z, ahead]) => [
      x,
      Math.max(-596, bermudaSeabedHeight(x, z) + 35),
      z + ahead,
      8,
    ]),
    ...[-250, -470, -850].flatMap((z, row) =>
      [-320, 320].map((x) => [x, -[65, 135, 300][row], z, 8]),
    ),
  ],
  ray: [-320, -510, -700, -890, -1080, -1270, -1460, -1640].flatMap((z, row) =>
    [-170, 170].map((x, side) => [
      x + (row % 2 ? 30 : -30),
      -[75, 130, 200, 280, 360, 430, 490, 500][row] - side * 7,
      z,
      6,
    ]),
  ),
};

const RESIDENT_STOCK = {
  queen_angelfish: 12,
  octopus: 18,
  barracuda: 12,
  tiger_shark: 10,
  shark: 8,
  sperm_whale: 16,
  cameroceras: 14,
  dunkleosteus: 10,
  pliosaur: 12,
  plesiosaur: 12,
  mosasaur: 12,
  megalodon: 14,
  livyatan: 16,
  ichthyotitan: 4,
  moon_jelly: 20,
  spiny_lobster: 12,
  black_sea_nettle: 10,
};
const LORD_CENTERS = [
  [-310, -20, -580],
  [300, -290, -900],
  [-290, -515, -1260],
  [230, -610, -1570],
];
// 有限的成年食物环绕领地，而不是扎堆放进战斗中心；四只反击守卫由原共享注册表负责。
const LORD_SUPPLIES = {
  sperm_whale: [
    [-400, -85, -610],
    [-210, -95, -650],
    [410, -300, -850],
    [-400, -490, -1330],
    [120, -500, -1600],
  ],
  pliosaur: [
    [180, -315, -970],
    [-180, -430, -1220],
  ],
  megalodon: [
    [-180, -535, -1180],
    [340, -615, -1540],
  ],
  livyatan: [
    [-210, -100, -470],
    [240, -290, -1050],
    [-360, -515, -1130],
    [220, -520, -1680],
  ],
};
// 旧全图选点基线保持不变；最后只迁移这十名既有外围补给和三名原守卫。
const LORD_RESERVE_MOVES = {
  sperm_whale: [
    { index: 0, lord: "hydra" },
    { index: 1, lord: "hydra" },
    { index: 2, lord: "kraken", home: [-365, -400, -680] },
    { index: 3, lord: "mayan", home: [190, -480, -1150] },
  ],
  pliosaur: [
    { index: 0, lord: "kraken", home: [-305, -415, -850] },
    { index: 1, lord: "mayan", home: [200, -435, -1160] },
  ],
  megalodon: [{ index: 0, lord: "mayan", home: [180, -525, -1080] }],
  livyatan: [
    { index: 0, lord: "hydra", home: [-190, -98, -420] },
    { index: 1, lord: "kraken", home: [-385, -390, -800] },
    { index: 2, lord: "mayan", home: [180, -470, -1200] },
  ],
};
function fitLordSiteReserves(source) {
  if (source.bermudaLordSiteRevision === "east_mayan_20261122") return source;
  const guards = source.kind === "ichthyotitan",
    records = LORD_RESERVE_MOVES[source.kind];
  if (!guards && !records) return source;
  const homes = source.spawnAnchors?.slice();
  if (!homes)
    throw new Error("Bermuda lord reserves require existing resident homes");
  const moves = guards
    ? BERMUDA_LORD_SITES.slice(0, 3).map((site, index) => ({
        index,
        home: site.guardHome,
      }))
    : records.map((record) => {
        const index = BERMUDA_LORD_SITES.findIndex(
            (site) => site.kind === record.lord,
          ),
          site = BERMUDA_LORD_SITES[index],
          baseline = LORD_SUPPLIES[source.kind][record.index];
        if (!site || !baseline)
          throw new Error("Unknown Bermuda lord reserve binding");
        return {
          index: record.index,
          home:
            record.home ??
            baseline.map(
              (value, axis) =>
                value + site.home[axis] - LORD_CENTERS[index][axis],
            ),
        };
      });
  for (const move of moves) {
    if (!homes[move.index])
      throw new Error("A Bermuda lord reserve may not create new stock");
    const home = fitHome(source, move.home);
    if (!home || isNursery({ y: home[1], z: home[2] }))
      throw new Error("Invalid Bermuda lord reserve habitat");
    homes[move.index] = home;
  }
  return freeze({
    ...source,
    spawnAnchors: homes,
    bermudaLordSiteRevision: "east_mayan_20261122",
  });
}
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// 洞内只迁移既有居民；三组船舱食物、十二处花园及领主外围补给均不借用。
export const BERMUDA_CAVE_FOOD = freeze([
  {
    caveId: "luminous_grotto",
    kind: "tuna",
    schoolGroup: 16,
    t: 0.4,
    depth: 580,
  },
  {
    caveId: "fossil_passage",
    kind: "tuna",
    schoolGroup: 17,
    t: 0.45,
    depth: 585,
  },
  {
    caveId: "kaiju_lair",
    kind: "ray",
    schoolGroup: 13,
    t: 0.45,
    depth: 500,
    offsetX: 45,
  },
  {
    caveId: "kaiju_lair",
    kind: "mosasaur",
    populationIndex: 8,
    t: 0.55,
    depth: 515,
    offsetX: 50,
  },
  {
    caveId: "kaiju_lair",
    kind: "megalodon",
    populationIndex: 6,
    t: 15 / 28,
    depth: 605,
    offsetX: 50,
  },
  {
    caveId: "fossil_passage",
    kind: "megalodon",
    populationIndex: 4,
    t: 0.55,
    depth: 575,
  },
]);

/** 仅消费轻量布局数据；实际洞壁、顶面及完整运动包络由真实洞穴工厂回归验证。 */
export function bermudaCaveFoodHome(record) {
  const site = BERMUDA_CAVE_SITES.find((s) => s.id === record.caveId);
  if (!site) throw new Error(`Unknown Bermuda food cave: ${record.caveId}`);
  const expansion = Math.max(
      0,
      Math.min(1, Math.min(record.t, 1 - record.t) / 0.24),
    ),
    smooth = expansion * expansion * (3 - 2 * expansion),
    x =
      (site.theme === "kaiju_lair"
        ? -site.width * 0.2 * (1 - record.t) * (1 - smooth)
        : Math.sin(record.t * Math.PI * 2) * site.width * 0.025) +
      (record.offsetX ?? 0),
    z = (record.t - 0.5) * site.depth,
    angle = site.yaw || 0;
  return [
    site.x + Math.cos(angle) * x + Math.sin(angle) * z,
    -record.depth,
    site.z - Math.sin(angle) * x + Math.cos(angle) * z,
  ];
}

function fitCaveFood(source) {
  if (source.bermudaCaveFoodRevision === "20261121") return source;
  const records = BERMUDA_CAVE_FOOD.filter((r) => r.kind === source.kind);
  if (!records.length) return source;
  const entry = { ...source, bermudaCaveFoodRevision: "20261121" };
  if (source.schoolProfiles)
    entry.schoolProfiles = source.schoolProfiles.slice();
  if (source.spawnAnchors) entry.spawnAnchors = source.spawnAnchors.slice();
  for (const record of records) {
    const home = fitHome(entry, bermudaCaveFoodHome(record));
    if (!home) throw new Error(`Invalid Bermuda cave food: ${entry.kind}`);
    if (record.schoolGroup !== undefined) {
      const group = entry.schoolProfiles?.[record.schoolGroup];
      if (
        !group?.bermudaRouteSchool ||
        (entry.kind === "tuna" && record.schoolGroup < 14)
      )
        throw new Error("Protected Bermuda schools cannot move into caves");
      entry.schoolProfiles[record.schoolGroup] = {
        ...group,
        anchor: home,
        depthMin: Math.max(entry.depthMin, -home[1] - 18),
        depthMax: Math.min(entry.depthMax, -home[1] + 18),
        bermudaCaveId: record.caveId,
      };
    } else {
      const index = record.populationIndex,
        previous = entry.spawnAnchors[index];
      if (!previous || index < (LORD_SUPPLIES[entry.kind]?.length || 0))
        throw new Error(
          "Protected Bermuda lord supplies cannot move into caves",
        );
      entry.spawnAnchors[index] = home;
    }
  }
  return freeze(entry);
}

// 主洞与新后腔覆盖四处旧居民水层；另有一处货物巡游接触，逐点避让并保留库存与原活动半径。
export const BERMUDA_CAVE_CLEARANCE_HOMES = freeze({
  octopus: { 10: [2.436333935897898, -480, -1370] },
  // 只升高仍会碰南侧尖岩，北移34米进入同区开阔水道；完整四向巡游由真实导航回归验证。
  megalodon: { 10: [-366.2670977678475, -560, -1395] },
  pliosaur: { 5: [-347.0505246882947, -420, -1621.0476965938828] },
  mosasaur: { 3: [-398.8476577403979, -435, -1663.4062808613949] },
  sperm_whale: {
    9: [-341.33433730337885, -517, -1616.2433383773575],
    11: [-275, -512, -1443.5951461932048],
  },
  livyatan: { 5: [-343.6993723243155, -494.6, -1614.827882908408] },
});
function fitCaveClearances(source) {
  const homes = BERMUDA_CAVE_CLEARANCE_HOMES[source.kind];
  if (!homes || source.bermudaCaveClearanceRevision === "20261121")
    return source;
  const spawnAnchors = source.spawnAnchors.slice();
  for (const [index, point] of Object.entries(homes)) {
    if (
      Number(index) < (LORD_SUPPLIES[source.kind]?.length || 0) ||
      isNursery({ y: spawnAnchors[index][1], z: spawnAnchors[index][2] })
    )
      throw new Error("Protected Bermuda food cannot move for cave clearance");
    const home = fitHome(source, point);
    if (!home) throw new Error("Invalid Bermuda outer cave-clearance habitat");
    spawnAnchors[index] = home;
  }
  return freeze({
    ...source,
    spawnAnchors,
    bermudaCaveClearanceRevision: "20261121",
  });
}

// 扩大后的睡兽岩厅增加两只普通猎手；原四守卫保持精确前缀，体长、反击、领地与食物规则不变。
export const BERMUDA_TITAN_GUARD_HOMES = freeze(
  [
    [-5, -1630, 40],
    // 北侧屏与食物支路岩壁限制回转；沿同一水层向西让开，仍用原25米领地。
    [-55, -1540, 70],
  ].map(([x, z, offset]) => [x, bermudaSeabedHeight(x, z) + offset, z]),
);
function fitTitanGuards(source) {
  if (
    source.kind !== "ichthyotitan" ||
    source.bermudaTitanGuardRevision === "20261121"
  )
    return source;
  const spawnAnchors = source.spawnAnchors.slice();
  for (const point of BERMUDA_TITAN_GUARD_HOMES) {
    const home = fitHome(source, point);
    if (!home) throw new Error("Invalid sleeping titan guard habitat");
    spawnAnchors.push(home);
  }
  return freeze({
    ...source,
    spawnAnchors,
    population: spawnAnchors.length,
    bermudaTitanGuardRevision: "20261121",
  });
}

export const BERMUDA_TITAN_ESCAPE_FOOD = freeze([
  {
    id: "upper_fork_tuna",
    kind: "tuna",
    schoolGroup: 20,
    count: 8,
    anchor: [20, -560, -1545],
  },
  {
    id: "lair_front_tuna",
    kind: "tuna",
    schoolGroup: 21,
    count: 8,
    anchor: [-30, -580, -1512],
  },
  {
    id: "north_entry_tuna",
    kind: "tuna",
    schoolGroup: 22,
    count: 8,
    anchor: [-65, -585, -1445],
  },
  {
    id: "upper_fork_adult",
    kind: "megalodon",
    populationIndex: 14,
    anchor: [-30, -585, -1545],
  },
  {
    id: "south_lair_adult",
    kind: "megalodon",
    populationIndex: 15,
    anchor: [-40, -595, -1615],
  },
]);
function fitTitanEscapeFood(source) {
  if (source.bermudaTitanEscapeFoodRevision === "20261121") return source;
  const records = BERMUDA_TITAN_ESCAPE_FOOD.filter(
    (r) => r.kind === source.kind,
  );
  if (!records.length) return source;
  const entry = { ...source, bermudaTitanEscapeFoodRevision: "20261121" };
  if (source.schoolProfiles)
    entry.schoolProfiles = source.schoolProfiles.slice();
  if (source.spawnAnchors) entry.spawnAnchors = source.spawnAnchors.slice();
  for (const record of records) {
    const home = fitHome(source, record.anchor);
    if (!home)
      throw new Error(`Invalid Bermuda titan escape supply: ${record.id}`);
    if (record.schoolGroup !== undefined) {
      if (record.schoolGroup !== entry.schoolProfiles.length)
        throw new Error(
          "Titan escape supplies must append existing school profiles",
        );
      entry.schoolProfiles.push({
        anchor: home,
        count: record.count,
        depthMin: Math.max(source.depthMin, -home[1] - 18),
        depthMax: Math.min(source.depthMax, -home[1] + 18),
        fixedHabitat: true,
        nurseryResident: false,
        bermudaRouteSchool: true,
        bermudaCaveId: "kaiju_lair",
        bermudaTitanEscapeSupply: record.id,
      });
    } else {
      if (record.populationIndex !== entry.spawnAnchors.length)
        throw new Error("Titan escape adults must append existing homes");
      entry.spawnAnchors.push(home);
    }
  }
  entry.population = entry.schoolProfiles
    ? entry.schoolProfiles.reduce((n, p) => n + p.count, 0)
    : entry.spawnAnchors.length;
  return freeze(entry);
}

// 只加厚外海普通鱼群；固定船舱、育幼、洞穴和领主补给保留已验收库存。
const OUTER_SCHOOL_COUNTS = {
  needlefish: 10,
  sunfish: 6,
  tuna: 12,
  ray: 8,
};
const OPEN_WATER_SCHOOLS = [
  { id: "western_midwater", anchor: [-310, -200, -560] },
  { id: "eastern_midwater", anchor: [310, -220, -590] },
  { id: "western_deep_route", anchor: [-325, -330, -1120] },
  { id: "eastern_deep_route", anchor: [325, -310, -1080] },
  { id: "southwestern_midwater", anchor: [-300, -240, -1360] },
  { id: "southeastern_midwater", anchor: [300, -240, -1360] },
  { id: "southern_west_approach", anchor: [-240, -380, -1580] },
  { id: "southern_east_approach", anchor: [240, -380, -1580] },
];
const SURFACE_ENTRY_SCHOOLS = [
  { id: "western_surface_entry", anchor: [-325, -8, -180] },
  { id: "eastern_surface_entry", anchor: [325, -8, -180] },
];
function fitOuterShoalDensity(source) {
  const count = OUTER_SCHOOL_COUNTS[source.kind];
  if (
    !count ||
    !source.schoolProfiles ||
    source.bermudaShoalDensityRevision === "20261123"
  )
    return source;
  const schoolProfiles = source.schoolProfiles.map((profile) =>
    profile.bermudaRouteSchool && !profile.bermudaCaveId
      ? { ...profile, count }
      : profile,
  );
  const additions =
    source.kind === "tuna"
      ? OPEN_WATER_SCHOOLS
      : source.kind === "needlefish"
        ? SURFACE_ENTRY_SCHOOLS
        : [];
  for (const record of additions) {
    const anchor = fitHome(source, record.anchor);
    if (!anchor) throw new Error("Invalid Bermuda open-water shoal");
    schoolProfiles.push({
      anchor,
      count,
      depthMin: Math.max(source.depthMin, -anchor[1] - 18),
      depthMax: Math.min(source.depthMax, -anchor[1] + 18),
      fixedHabitat: true,
      nurseryResident: false,
      bermudaRouteSchool: true,
      bermudaDensitySchool: record.id,
    });
  }
  return freeze({
    ...source,
    schoolProfiles,
    population: schoolProfiles.reduce(
      (total, profile) => total + profile.count,
      0,
    ),
    bermudaShoalDensityRevision: "20261123",
  });
}

function fitHome(entry, home) {
  const [x, y, z] = home;
  const clearance = entry.benthic
    ? (entry.floorOffset ?? 0)
    : Math.max(20, entry.length * 0.8 + 6);
  const floor = bermudaSeabedHeight(x, z) + clearance;
  if (entry.benthic)
    return floor >= -entry.depthMax && floor <= -entry.depthMin
      ? [x, floor, z]
      : null;
  const bottom = Math.max(-entry.depthMax, floor),
    top = -entry.depthMin;
  if (bottom > top) return null;
  return [x, Math.min(top, Math.max(bottom, y)), z];
}

function residentHomes(entry, count, protectedHomes, occupied) {
  const homes = protectedHomes.map((p) => p.slice());
  for (const home of LORD_SUPPLIES[entry.kind] || []) {
    const fitted = fitHome(entry, home);
    if (!fitted) throw new Error(`Invalid Bermuda lord supply: ${entry.kind}`);
    homes.push(fitted);
  }
  const phase = [...entry.kind].reduce((n, c) => n + c.charCodeAt(0), 0);
  const rows = entry.benthic
    ? [-100, -120, -140]
    : [-240, -440, -640, -840, -1040, -1240, -1440, -1640];
  const candidates = [];
  for (const [row, z] of rows.entries())
    for (const [column, x] of [-375, -190, 0, 190, 375].entries()) {
      if (entry.predator && z > -400) continue;
      for (let layer = 0; layer < (entry.benthic ? 1 : 3); layer++) {
        const depth = Math.max(
          entry.depthMin + 8,
          Math.min(
            entry.depthMax - 8,
            (-z - 170) * 0.38 + 25 + (layer - 1) * 90 + ((phase % 7) - 3) * 6,
          ),
        );
        const home = fitHome(entry, [
          x + Math.sin(phase + row * 3 + column) * 23,
          -depth,
          z + Math.cos(phase + row + column * 2) * 19,
        ]);
        if (!home || isNursery({ y: home[1], z: home[2] })) continue;
        // 船内只有三组已验收的补给；独立大型居民不生成在邮轮多层上层建筑内。
        if (
          home[1] < -300 &&
          home[0] > WRECK_BED.minX - 20 &&
          home[0] < WRECK_BED.maxX + 20 &&
          home[2] > WRECK_BED.minZ - 20 &&
          home[2] < WRECK_BED.maxZ + 20
        )
          continue;
        if (
          entry.length >= 10 &&
          LORD_CENTERS.some((b) => distance(home, b) < 190)
        )
          continue;
        candidates.push(home);
      }
    }
  while (homes.length < count) {
    let best = -1,
      score = -Infinity;
    for (const [index, home] of candidates.entries()) {
      const same = homes.length
        ? Math.min(...homes.map((p) => distance(home, p)))
        : 350;
      const all = occupied.length
        ? Math.min(...occupied.map((p) => distance(home, p)))
        : 350;
      const next = same * 0.7 + all * 0.3;
      if (same > Math.max(12, entry.length * 1.6) && next > score) {
        best = index;
        score = next;
      }
    }
    if (best < 0)
      throw new Error(`Insufficient Bermuda habitats: ${entry.kind}`);
    const [home] = candidates.splice(best, 1);
    homes.push(home);
    occupied.push(home);
  }
  if (entry.kind === "megalodon") {
    // 重排两只既有居民，为最深花园保留可见危险与成年食物，不增加巨兽数量。
    for (const [offset, [x, z]] of [
      [-395, -1300],
      [135, -1730],
    ].entries()) {
      const index = homes.length - 2 + offset,
        previous = homes[index];
      const home = fitHome(entry, [
        x,
        Math.max(-635, bermudaSeabedHeight(x, z) + 45),
        z,
      ]);
      if (!home) throw new Error("Invalid Bermuda garden hunter habitat");
      homes[index] = home;
      const used = occupied.indexOf(previous);
      if (used >= 0) occupied[used] = home;
    }
  }
  return homes;
}

/** 最终全图栖地：新旧北部内容统一重排，育幼和真实船舱食物保持原样。 */
export function fitBermudaExpansionEcology(species) {
  const occupied = [];
  return Object.freeze(
    species
      .map((entry) => {
        if (entry.bermudaHabitatRevision === "whole_map_20261121") return entry;
        const e = {
          ...entry,
          worldBounds: BERMUDA_WORLD,
          bermudaExpandedHabitat: true,
          bermudaHabitatRevision: "whole_map_20261121",
        };
        if (entry.schoolProfiles) {
          const profiles = entry.schoolProfiles.filter(
            (p) =>
              p.nurseryResident ||
              isNursery({ y: p.anchor[1], z: p.anchor[2] }) ||
              p.fixedHabitat,
          );
          for (const [x, y, z, count] of ROUTE_SCHOOLS[entry.kind] || []) {
            const anchor = fitHome(entry, [x, y, z]);
            if (!anchor)
              throw new Error(`Invalid Bermuda school habitat: ${entry.kind}`);
            profiles.push({
              anchor,
              count,
              depthMin: Math.max(entry.depthMin, -anchor[1] - 18),
              depthMax: Math.min(entry.depthMax, -anchor[1] + 18),
              fixedHabitat: true,
              nurseryResident: false,
              bermudaRouteSchool: true,
            });
          }
          e.schoolProfiles = profiles;
          e.population = profiles.reduce((n, p) => n + p.count, 0);
        } else if (entry.kind === "ichthyotitan") {
          e.spawnAnchors = Array.from({ length: entry.population }, (_, i) =>
            initialSpeciesAnchor(entry, i).toArray(),
          );
        } else {
          const protectedHomes = Array.from(
            { length: entry.population },
            (_, i) => initialSpeciesAnchor(entry, i).toArray(),
          ).filter((p) => isNursery({ y: p[1], z: p[2] }));
          if (!entry.benthic && entry.kind !== "queen_angelfish")
            e.residentRadius =
              entry.length >= 10 ? 30 : entry.residentRadius || 32;
          e.spawnAnchors = residentHomes(
            e,
            RESIDENT_STOCK[entry.kind] ?? entry.population,
            protectedHomes,
            occupied,
          );
          e.population = e.spawnAnchors.length;
          e.scatterPopulation = false;
        }
        return freeze(e);
      })
      .map(fitCaveFood)
      .map(fitCaveClearances)
      .map(fitTitanGuards)
      .map(fitTitanEscapeFood)
      .map(fitLordSiteReserves)
      .map(fitOuterShoalDensity),
  );
}

function freeze(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object") freeze(child);
  return Object.freeze(value);
}
