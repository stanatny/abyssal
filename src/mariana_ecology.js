import { MARIANA_WORLD } from "./mariana_config.js";

/** 狭长海沟按固定水层分配食物，避免远距补位把深层动物搬回旧地图范围。 */
export function marianaEcology(allSpecies) {
  const profiles = {
    sardine: {
      population: 64,
      schoolSize: 16,
      nurseryResident: true,
      schoolAnchors: [
        [0, -17, 70],
        [-16, -20, 30],
        [18, -22, -18],
        [-15, -25, -68],
      ],
    },
    moorish_idol: {
      population: 24,
      schoolSize: 6,
      nurseryResident: true,
      schoolAnchors: [
        [-24, -16, 57],
        [24, -20, 16],
        [-27, -25, -34],
        [27, -28, -78],
      ],
    },
    parrotfish: {
      population: 12,
      schoolSize: 4,
      nurseryResident: true,
      schoolAnchors: [
        [17, -23, 45],
        [-18, -27, -35],
        [14, -30, -84],
      ],
    },
    sunfish: {
      population: 8,
      schoolSize: 2,
      schoolAnchors: [
        [0, -38, -106],
        [15, -67, -135],
        [-18, -90, -151],
        [24, -118, -164],
      ],
      depthMax: 145,
    },
    tuna: {
      population: 32,
      schoolSize: 4,
      depthMin: 35,
      depthMax: 575,
      schoolAnchors: [
        [-10, -50, -125],
        [20, -94, -150],
        [-25, -160, -180],
        [30, -215, -260],
        [-35, -285, -360],
        [40, -365, -430],
        [-45, -445, -370],
        [35, -540, -470],
      ],
    },
    ray: {
      population: 16,
      schoolSize: 2,
      depthMin: 60,
      depthMax: 540,
      schoolAnchors: [
        [-28, -85, -145],
        [30, -140, -168],
        [-40, -190, -230],
        [40, -245, -320],
        [-50, -300, -440],
        [55, -360, -380],
        [-45, -430, -330],
        [40, -510, -475],
      ],
    },
    lanternfish: {
      population: 36,
      schoolSize: 12,
      schoolAnchors: [
        [-24, -105, -155],
        [26, -180, -210],
        [-45, -235, -320],
      ],
    },
    barreleye: {
      population: 8,
      residentRadius: 9,
      spawnAnchors: [
        [-20, -156, -178],
        [20, -182, -205],
        [-35, -216, -280],
        [32, -242, -320],
      ],
    },
    dragonfish: {
      population: 8,
      residentRadius: 15,
      spawnAnchors: [
        [-44, -262, -310],
        [55, -325, -430],
        [-55, -390, -380],
        [45, -460, -470],
      ],
    },
    snailfish: {
      population: 16,
      residentRadius: 14,
      spawnAnchors: [
        [-50, -1570, -335],
        [45, -1675, -460],
        [-35, -1810, -375],
        [55, -1980, -460],
      ],
    },
    goblin_shark: {
      population: 5,
      residentRadius: 45,
      spawnAnchors: [
        [75, -145, -190],
        [-80, -215, -300],
        [90, -285, -420],
        [-75, -355, -340],
        [90, -440, -470],
      ],
    },
    shark: {
      population: 3,
      depthMin: 120,
      depthMax: 500,
      residentRadius: 55,
      spawnAnchors: [
        [-85, -180, -220],
        [85, -310, -370],
        [-80, -455, -480],
      ],
    },
    sperm_whale: {
      population: 6,
      depthMin: 160,
      depthMax: 600,
      residentRadius: 60,
      spawnAnchors: [
        [-20, -205, -280],
        [60, -245, -330],
        [60, -285, -420],
        [-60, -380, -330],
        [60, -470, -460],
        [0, -545, -495],
      ],
    },
    plesiosaur: {
      population: 16,
      depthMin: 70,
      depthMax: 2700,
      residentRadius: 55,
      spawnAnchors: [
        [-35, -90, -190],
        [35, -125, -205],
        [-40, -170, -240],
        [40, -210, -280],
        [-50, -265, -320],
        [50, -340, -410],
        [-45, -420, -470],
        [45, -500, -340],
        [25, -780, -400],
        [-40, -920, -460],
        [30, -1080, -350],
        [-25, -1250, -470],
        [-30, -1530, -400],
        [40, -1750, -450],
        [-25, -1960, -340],
        [25, -2480, -400],
      ],
    },
    pliosaur: {
      population: 14,
      depthMin: 110,
      depthMax: 2700,
      residentRadius: 60,
      spawnAnchors: [
        [40, -165, -220],
        [-45, -250, -300],
        [45, -385, -340],
        [-45, -490, -450],
        [40, -800, -450],
        [-40, -940, -330],
        [35, -1100, -460],
        [-35, -1220, -370],
        [35, -1510, -400],
        [-35, -1690, -470],
        [35, -1870, -350],
        [-40, -2010, -470],
        [40, -2370, -440],
        [-30, -2610, -390],
      ],
    },
    mosasaur: {
      population: 12,
      depthMin: 160,
      depthMax: 2690,
      residentRadius: 65,
      spawnAnchors: [
        [-45, -215, -260],
        [45, -315, -380],
        [-45, -450, -350],
        [45, -545, -450],
        [-40, -850, -350],
        [40, -1000, -470],
        [-35, -1160, -360],
        [35, -1535, -440],
        [-35, -1770, -340],
        [35, -1980, -460],
        [-35, -2330, -350],
        [35, -2530, -460],
      ],
    },
    basilosaurus: {
      population: 10,
      depthMin: 280,
      depthMax: 2670,
      residentRadius: 60,
      spawnAnchors: [
        [-55, -340, -330],
        [55, -790, -400],
        [55, -425, -380],
        [-55, -525, -470],
        [55, -975, -400],
        [-55, -1190, -450],
        [55, -1660, -350],
        [-55, -1870, -440],
        [55, -2350, -440],
        [-45, -2560, -350],
      ],
    },
    megalodon: {
      population: 12,
      depthMin: 375,
      depthMax: 2680,
      residentRadius: 60,
      spawnAnchors: [
        [-70, -465, -445],
        [70, -570, -370],
        [55, -430, -410],
        [-55, -510, -380],
        [45, -850, -350],
        [-45, -1160, -465],
        [-55, -875, -420],
        [55, -1190, -350],
        [-55, -1600, -450],
        [55, -1930, -390],
        [-55, -2400, -430],
        [55, -2610, -350],
      ],
    },
    shonisaurus: {},
    ichthyotitan: {
      population: 8,
      depthMin: 435,
      // 最后一关下方不再驻留巨型猎手，保留通往明亮秘境的补给与退路。
      depthMax: 2070,
      // 活动半径仅提供柔和回转；四层锚点不能被当作强制水层边界。
      residentRadius: 50,
      spawnAnchors: [
        [-35, -480, -330],
        [35, -545, -475],
        [-35, -760, -350],
        [35, -900, -475],
        [-35, -1120, -475],
        [35, -1260, -350],
        [-35, -1540, -350],
        [35, -1970, -475],
      ],
    },
  };
  return Object.freeze(
    Object.entries(profiles).map(([kind, profile]) => {
      const original = allSpecies.find((s) => s.kind === kind);
      if (!original) throw new Error(`Unknown Mariana species: ${kind}`);
      const s = {
        ...original,
        ...profile,
        worldBounds: MARIANA_WORLD,
        cityHabitat: true,
        layeredSchools: true,
        edgeTerritory: null,
      };
      if (s.predator)
        s.hunterTerritory = {
          minX: -190,
          maxX: 190,
          minZ: -585,
          maxZ: -170,
          center: { x: 0, y: -(s.depthMin + s.depthMax) / 2, z: -390 },
        };
      if (s.category === "ancient" || kind === "sperm_whale")
        s.habitatNote =
          "本海域的大型远古动物与超深水活动属于幻想生态，为各深度层提供成长与补给，不代表现实马里亚纳物种分布。";
      return Object.freeze(s);
    }),
  );
}
