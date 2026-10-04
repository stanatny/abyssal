import { WORLD } from "./world_config.js";
import {
  initialSpeciesAnchor,
  schoolPopulationGroups,
  initialSchoolAnchor,
} from "./ecosystem_population.js";

export const LARGE_PREY_RULES = Object.freeze({
  minLength: 10,
  maxLength: 25,
  preyStock: 0.75,
  hunterStock: 0.8,
});

/**
 * 降低大型水生食物的局部密度，保留水层覆盖和单尾收益。
 * @param {readonly object[]} species 已横向分布并增密的区域配置，不会被修改。
 * @returns {readonly object[]} 大型滤食群改为独立栖地；领主、巨型天敌及固定补给不变。
 */
export function disperseLargePrey(species) {
  return Object.freeze(
    species.map((entry) => {
      if (
        entry.length < LARGE_PREY_RULES.minLength ||
        entry.length >= LARGE_PREY_RULES.maxLength ||
        entry.vehicle ||
        entry.elusive ||
        entry.groundbound ||
        entry.flying ||
        entry.nurseryResident ||
        entry.category === "invertebrate" ||
        entry.schoolProfiles?.some(
          (p) => p.fixedHabitat || p.cityResident || p.nurseryResident,
        )
      )
        return entry;
      const schooling = entry.schoolSize > 1 && !entry.independentMovement;
      const groups = schooling ? schoolPopulationGroups(entry) : null;
      const minimum = schooling ? groups.length : 2;
      const population = Math.min(
        entry.population,
        Math.max(
          minimum,
          Math.ceil(
            entry.population *
              (entry.predator
                ? LARGE_PREY_RULES.hunterStock
                : LARGE_PREY_RULES.preyStock),
          ),
        ),
      );
      const anchors = [];
      if (schooling) {
        // 每条已验收的深层补给路线至少保留一只，额外个体有独立中心，不再收拢成群。
        for (const group of groups)
          anchors.push(initialSchoolAnchor(entry, group.index).toArray());
        for (let i = anchors.length; i < population; i++) {
          const home = groups[(i - groups.length) % groups.length];
          const a = initialSchoolAnchor(entry, home.index).toArray();
          const angle = phase(entry.kind) + i * 2.399963;
          const offset = Math.max(30, entry.length * 2.4);
          anchors.push(
            clampAnchor(entry, [
              a[0] + Math.cos(angle) * offset,
              a[1],
              a[2] + Math.sin(angle) * offset,
            ]),
          );
        }
      } else {
        const candidates = Array.from({ length: entry.population }, (_, i) =>
          initialSpeciesAnchor(entry, i).toArray(),
        );
        // 最远点选样保留原深浅/左右覆盖，优先移除邻近的增密副本。
        const remaining = [...candidates];
        anchors.push(remaining.shift());
        while (anchors.length < population) {
          let best = 0,
            score = -1;
          for (let i = 0; i < remaining.length; i++) {
            const distance = Math.min(
              ...anchors.map((a) => distanceSquared(a, remaining[i])),
            );
            if (distance > score) {
              score = distance;
              best = i;
            }
          }
          const selected = remaining.splice(best, 1)[0];
          if (score < (entry.length * 1.5) ** 2) {
            const angle = phase(entry.kind) + anchors.length * 2.399963;
            const radius = Math.min(
              entry.residentRadius ? entry.residentRadius * 0.65 : 60,
              entry.length * 2,
            );
            selected[0] += Math.cos(angle) * radius;
            selected[2] += Math.sin(angle) * radius;
          }
          anchors.push(clampAnchor(entry, selected));
        }
      }
      const result = {
        ...entry,
        population,
        spawnAnchors: anchors,
        scatterPopulation: false,
        largePreyDispersed: true,
      };
      if (schooling) {
        result.schoolSize = 1;
        result.independentMovement = true;
        result.schoolProfiles = undefined;
        result.residentRadius = Math.max(18, Math.min(30, entry.length * 1.3));
        // 每只居民的原水层继续由中心深度和活动半径约束，不能迁移回幼年区。
        result.layeredSchools = false;
      }
      return freeze(result);
    }),
  );
}

function phase(kind) {
  let hash = 0;
  for (const letter of kind) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return (hash % 6283) / 1000;
}
function clampAnchor(entry, a) {
  const world = entry.worldBounds || WORLD,
    margin = Math.max(22, entry.length);
  return [
    Math.max(world.minX + margin, Math.min(world.maxX - margin, a[0])),
    a[1],
    Math.max(world.minZ + margin, Math.min(world.maxZ - margin, a[2])),
  ];
}
function distanceSquared(a, b) {
  return a.reduce((n, x, i) => n + (x - b[i]) ** 2, 0);
}
function freeze(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object" && !Object.isFrozen(child))
      freeze(child);
  return Object.freeze(value);
}
