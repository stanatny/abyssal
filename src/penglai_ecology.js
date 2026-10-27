import { initialSpeciesAnchor } from "./ecosystem_population.js";
import { penglaiHeightAt } from "./penglai_config.js";

// 在通用增密之后整理蓬莱栖地：挪用已有居民，不给每个领主额外刷一群食物。
// 巴蛇沿云道巡猎；饕餮留在虎庭山肩，寒潭虎蛟留在玄武深水区。
const BASHE_HOMES = [
  [-80, 175, -405],
  [390, 275, -700],
  [-85, 395, -685],
];
const POOL_FOOD = [
  [-85, -210, -1050],
  [75, -230, -1100],
  [-75, -185, -950],
];
const TIGER_FOOD = [
  [-260, -640],
  [-380, -640],
  [-320, -725],
];

function school(entry, replacements) {
  const schoolProfiles = entry.schoolProfiles.map((p, i) => {
    const update = replacements[i];
    if (!update) return p;
    const anchor = update.anchor || p.anchor;
    return Object.freeze({
      ...p,
      ...update,
      anchor: Object.freeze(anchor),
      depthMin: -anchor[1] - 8,
      depthMax: -anchor[1] + 8,
    });
  });
  return Object.freeze({
    ...entry,
    schoolProfiles: Object.freeze(schoolProfiles),
    schoolAnchors: Object.freeze(schoolProfiles.map((p) => p.anchor)),
    population: schoolProfiles.reduce((n, p) => n + p.count, 0),
    depthMin: Math.min(...schoolProfiles.map((p) => p.depthMin)),
    depthMax: Math.max(...schoolProfiles.map((p) => p.depthMax)),
  });
}

/** 按水潭、山径和云道重排现有居民，生成/补位共用同一栖地。 */
export function fitPenglaiEcology(species) {
  return Object.freeze(
    species.map((entry) => {
      if (entry.kind === "kun") {
        // 两只沿道观北面的云道巡游，另两只保留高空栖地；不增加数量。
        return Object.freeze({
          ...entry,
          spawnAnchors: Object.freeze(
            [
              [-125, 345, -800],
              [135, 365, -860],
              [216, 470, -1221],
              [312, 490, -1221],
            ].map(Object.freeze),
          ),
          depthMin: -525,
          depthMax: -310,
          visibilityDistance: 280,
          smoothVisibilityDistance: 230,
        });
      }
      if (entry.kind === "bashe") {
        const spawnAnchors = entry.spawnAnchors.map((p, i) =>
          Object.freeze(BASHE_HOMES[i]?.slice() || p.slice()),
        );
        return Object.freeze({
          ...entry,
          spawnAnchors: Object.freeze(spawnAnchors),
          depthMax: -120,
        });
      }
      if (entry.kind === "lushu") {
        const spawnAnchors = Array.from(
          { length: entry.population },
          (_, i) => {
            const p = TIGER_FOOD[i];
            return Object.freeze(
              p
                ? [p[0], penglaiHeightAt(...p) + entry.length * 0.28 + 2, p[1]]
                : initialSpeciesAnchor(entry, i).toArray(),
            );
          },
        );
        return Object.freeze({
          ...entry,
          spawnAnchors: Object.freeze(spawnAnchors),
          scatterPopulation: false,
        });
      }
      if (entry.kind === "spirit_carp")
        return school(
          entry,
          Object.fromEntries(
            POOL_FOOD.map((anchor, i) => [
              i + 4,
              { anchor: anchor.slice(), count: 2 },
            ]),
          ),
        );
      if (entry.kind === "cloud_crane")
        return school(entry, {
          1: { anchor: [75, 160, -350], count: 3, flightRadius: 28 },
        });
      if (entry.kind === "bifang")
        return school(entry, {
          1: { anchor: [390, 285, -625], count: 3, flightRadius: 28 },
          2: { anchor: [75, 395, -610], count: 3, flightRadius: 28 },
        });
      return entry;
    }),
  );
}
