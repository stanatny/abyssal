import {
  ODYSSEY_WORLD,
  ODYSSEY_SITES,
  odysseySeabedHeight,
} from "./odyssey_config.js";

const groundHome = (x, z, h) => [
  x,
  Math.min(-8, odysseySeabedHeight(x, z) + h),
  z,
];
const guardianHomes = ["karkinos", "scylla", "charybdis"].map(
  (kind) => ODYSSEY_SITES[kind],
);
const freeze = (r) => {
  for (const v of Object.values(r))
    if (v && typeof v === "object" && !Object.isFrozen(v)) freeze(v);
  return Object.freeze(r);
};

/** 扩图后的最终栖地：保持育幼安全，沿左右航路补间隔，每位领主旁一只大猎手和少量独立补给。 */
export function fitOdysseyEcology(species) {
  return Object.freeze(
    species.map((entry) => {
      const e = { ...entry, worldBounds: ODYSSEY_WORLD };
      if (entry.schoolProfiles) {
        const profiles = entry.schoolProfiles.map((p) => ({
          ...p,
          anchor: p.anchor.slice(),
        }));
        const additions =
          {
            ambrosia_sprat: [
              [170, 35, 6, 20],
              [-42, -110, 6, 20],
            ],
            moon_scallop: [
              [225, -55, 4, 12],
              [105, -165, 4, 12],
            ],
            lyre_ray: [
              [210, -250, 4, 24],
              [-195, -435, 4, 28],
              [225, -520, 4, 30],
            ],
            iris_cuttlefish: [
              [-150, -280, 3, 18],
              [205, -375, 3, 20],
            ],
            hippocampus: [
              [160, -480, 3, 45],
              [-210, -790, 3, 45],
              [220, -995, 3, 45],
              [-230, -1400, 3, 45],
            ],
            aegean_jelly: [
              [-190, -650, 2, 65],
              [245, -890, 2, 65],
            ],
          }[entry.kind] || [];
        for (const [x, z, count, h] of additions) {
          const anchor = groundHome(x, z, h);
          profiles.push({
            anchor,
            count,
            depthMin: Math.max(5, -anchor[1] - 12),
            depthMax: -anchor[1] + 12,
            fixedHabitat: true,
            nurseryResident: false,
            densityLimit: count + 1,
          });
        }
        e.schoolProfiles = profiles;
        e.schoolAnchors = profiles.map((p) => p.anchor);
        e.population = profiles.reduce((n, p) => n + p.count, 0);
        e.spawnAnchors = profiles.flatMap((p) =>
          Array.from({ length: p.count }, () => p.anchor.slice()),
        );
        e.depthMin = Math.min(...profiles.map((p) => p.depthMin));
        e.depthMax = Math.max(...profiles.map((p) => p.depthMax));
      } else {
        let homes = entry.spawnAnchors.map((p) => p.slice());
        if (entry.kind === "ceto_serpent")
          homes = guardianHomes.map(([x, z], i) =>
            groundHome(x + (i === 1 ? -75 : 75), z + 45, 45),
          );
        if (
          ["bronze_turtle", "oracle_whale", "thalassa_manta"].includes(
            entry.kind,
          )
        ) {
          const role = [
            "bronze_turtle",
            "oracle_whale",
            "thalassa_manta",
          ].indexOf(entry.kind);
          for (let i = 0; i < 3; i++) {
            const [x, z] = guardianHomes[i],
              dx = [-105, 105, -60][role],
              dz = [95, -95, -125][role];
            homes[i] = groundHome(x + dx, z + dz, [42, 65, 55][role]);
          }
          // 其余成年食物铺到支路，避免旧锚点与新战区补给叠成食物堆。
          const travelHomes = [
            [
              [-220, -360],
              [225, -900],
              [-220, -850],
              [0, -1000],
              [-250, -1550],
              [280, -1680],
            ],
            [
              [180, -400],
              [-210, -560],
              [-300, -960],
              [240, -1100],
              [-180, -1575],
              [0, -1680],
            ],
            [[-80, -720]],
          ][role];
          for (let i = 3; i < homes.length; i++) {
            const [x, z] = travelHomes[i - 3];
            homes[i] = groundHome(x, z, [42, 65, 55][role]);
          }
        }
        // 小型散居民与中级猎手在自身水层中横向错开，不把全部个体挤到中心线。
        if (
          ![
            "ceto_serpent",
            "bronze_turtle",
            "oracle_whale",
            "thalassa_manta",
          ].includes(entry.kind)
        )
          homes = homes.map(([x, y, z], i) => {
            if (z > -190) return [x, y, z];
            const xx = Math.max(
              -350,
              Math.min(350, x + Math.sin(i * 2.399 + entry.length) * 55),
            );
            return groundHome(
              xx,
              z,
              Math.max(entry.length * 0.6 + 8, y - odysseySeabedHeight(x, z)),
            );
          });
        e.spawnAnchors = homes;
        e.scatterPopulation = false;
        e.population = homes.length;
        e.depthMin = Math.max(5, Math.min(...homes.map((p) => -p[1])) - 25);
        e.depthMax = Math.max(...homes.map((p) => -p[1])) + 25;
        if (entry.kind === "ceto_serpent") e.residentRadius = 50;
      }
      return freeze(e);
    }),
  );
}
