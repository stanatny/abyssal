import { wreckWorldPoint } from "./bermuda_sites.js";
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
function freeze(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object") freeze(child);
  return Object.freeze(value);
}
