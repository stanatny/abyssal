import { NURSERY } from "./nursery_rules.js";
import { WORLD } from "./world_config.js";
import {
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
} from "./ecosystem_population.js";

export const FEEDING_DENSITY_RULES = Object.freeze({
  roamingSchool: 2,
  smallSchool: 1.5,
  nurserySchool: 1.25,
  interiorSchool: 1.5,
  independentPrey: 1.5,
  largePreyMin: 10,
  largePreyMax: 25,
});

/**
 * 在分布确定后增加真实食物库存，保持群中心、水层和单尾收益。
 * @param {readonly object[]} species 已完成横向分群的区域配置，不会被修改。
 * @returns {readonly object[]} 增密配置，鱼群数量与种群一致，独居个体保留原锚点。
 */
export function densifyFeedingSchools(species) {
  return Object.freeze(
    species.map((entry) => {
      if (entry.vehicle || entry.category === "invertebrate") return entry;
      if (!entry.predator && entry.schoolSize > 1) {
        const profiles = schoolPopulationGroups(entry).map((group) => {
          const habitat = schoolHabitat(entry, group.index);
          const original = entry.schoolProfiles?.[group.index] || {
            anchor: initialSchoolAnchor(entry, group.index).toArray(),
            count: group.count,
            depthMin: habitat.depthMin,
            depthMax: habitat.depthMax,
            nurseryResident: !!habitat.nurseryResident,
          };
          const multiplier = habitat.nurseryResident
            ? FEEDING_DENSITY_RULES.nurserySchool
            : habitat.cityResident || habitat.fixedHabitat
              ? FEEDING_DENSITY_RULES.interiorSchool
              : entry.length < 1
                ? FEEDING_DENSITY_RULES.smallSchool
                : FEEDING_DENSITY_RULES.roamingSchool;
          return {
            ...original,
            count: Math.min(
              Math.ceil(group.count * multiplier),
              habitat.densityLimit ?? Infinity,
            ),
          };
        });
        // 增密后不再拆群，否则库存上涨仍会变成更多稀疏的小群。
        return freezeRecord({
          ...entry,
          population: profiles.reduce((sum, profile) => sum + profile.count, 0),
          schoolProfiles: profiles,
        });
      }
      const foodResident = !entry.predator && entry.length >= 1;
      const adultPrey =
        entry.predator &&
        entry.length >= FEEDING_DENSITY_RULES.largePreyMin &&
        entry.length < FEEDING_DENSITY_RULES.largePreyMax;
      if (!foodResident && !adultPrey) return entry;
      const population = Math.ceil(
        entry.population *
          (entry.densityMultiplier ?? FEEDING_DENSITY_RULES.independentPrey),
      );
      const anchors = Array.from({ length: entry.population }, (_, index) =>
        initialSpeciesAnchor(entry, index).toArray(),
      );
      const world = entry.worldBounds || WORLD;
      const spacing = entry.residentRadius
        ? Math.min(entry.residentRadius * 0.3, Math.max(4, entry.length))
        : Math.max(8, entry.length);
      // 新居民在原栖地旁增加独立位置，避免同一出生点多只大鱼完全重叠。
      for (let index = entry.population; index < population; index++) {
        const homeIndex = Math.floor(
          ((index - entry.population + 0.5) / (population - entry.population)) *
            entry.population,
        );
        const source = anchors[homeIndex];
        const angle = (index - entry.population) * 2.399;
        anchors.push([
          Math.max(
            world.minX + 22,
            Math.min(world.maxX - 22, source[0] + Math.cos(angle) * spacing),
          ),
          source[1],
          Math.max(
            world.minZ + 22,
            Math.min(world.maxZ - 22, source[2] + Math.sin(angle) * spacing),
          ),
        ]);
      }
      return freezeRecord({ ...entry, population, spawnAnchors: anchors });
    }),
  );
}

/**
 * 分开同种幼年鱼群重复的中心；保留库存、水层及固定建筑内的队形。
 * @param {readonly object[]} species 已完成增密和大型猎物分散的配置。
 * @returns {readonly object[]} 重复育幼中心在安全区内平移，其余配置原样返回。
 */
export function separateNurserySchools(species) {
  return Object.freeze(
    species.map((entry) => {
      if (
        !entry.schoolProfiles ||
        entry.predator ||
        entry.groundbound ||
        entry.flying
      )
        return entry;
      const world = entry.worldBounds || WORLD,
        used = [],
        originals = new Set();
      let changed = false;
      const profiles = entry.schoolProfiles.map((profile) => {
        const key = profile.anchor.join(",");
        if (
          !profile.nurseryResident ||
          profile.cityResident ||
          profile.fixedHabitat ||
          !originals.has(key)
        ) {
          originals.add(key);
          used.push(profile.anchor);
          return profile;
        }
        const extent = Math.max(
          ...Array.from({ length: profile.count }, (_, i) => {
            const slot = schoolSlot(entry, i);
            return Math.hypot(slot.x, slot.z);
          }),
        );
        const spacing = Math.max(18, extent * 2 + entry.length + 3);
        const [x, y, z] = profile.anchor;
        for (let i = 0; i < 32; i++) {
          const ring = 1 + Math.floor(i / 8),
            angle = ((i % 8) * Math.PI) / 4;
          const anchor = [
            Math.max(
              world.minX + spacing,
              Math.min(
                world.maxX - spacing,
                x + Math.cos(angle) * spacing * ring,
              ),
            ),
            y,
            Math.max(
              NURSERY.minZ + spacing,
              Math.min(
                world.maxZ - spacing,
                z + Math.sin(angle) * spacing * ring,
              ),
            ),
          ];
          if (
            used.some(
              (a) =>
                Math.hypot(a[0] - anchor[0], a[2] - anchor[2]) < spacing - 1e-8,
            )
          )
            continue;
          changed = true;
          used.push(anchor);
          return { ...profile, anchor };
        }
        // 空间不足时不改容量或挤出安全区；实际地貌仍由生成器做合法性检查。
        used.push(profile.anchor);
        return profile;
      });
      return changed
        ? freezeRecord({ ...entry, schoolProfiles: profiles })
        : entry;
    }),
  );
}

/**
 * 将可漫游食物的原水层拆为较小、横向分散的群体，数量与营养不变。
 * @param {readonly object[]} species 区域物种配置；育幼、城市和散居锚点保持原样。
 * @returns {readonly object[]} 独立逐群配置，生成、迁移、重生均消费同一水层数据。
 */
export function spreadFeedingSchools(species) {
  return Object.freeze(
    species.map((entry) => {
      if (!(entry.schoolSize > 1) || entry.length < 1 || entry.residentRadius)
        return entry;
      const profiles = [];
      let changed = false;
      let groups = schoolPopulationGroups(entry);
      // 配置了更多栖地时把原库存分配到全部锚点，不能只使用前一两个出生点。
      const anchorCount = entry.schoolAnchors?.length || 0;
      if (
        !entry.schoolProfiles &&
        !entry.nurseryResident &&
        anchorCount > groups.length &&
        entry.population >= anchorCount * 2
      ) {
        const count = Math.floor(entry.population / anchorCount);
        const remainder = entry.population % anchorCount;
        groups = Array.from({ length: anchorCount }, (_, index) => ({
          index,
          count: count + (index < remainder ? 1 : 0),
        }));
      }
      for (const group of groups) {
        const habitat = schoolHabitat(entry, group.index);
        const original = entry.schoolProfiles?.[group.index];
        const anchor = initialSchoolAnchor(entry, group.index).toArray();
        const profile = original || {
          anchor,
          count: group.count,
          depthMin: habitat.depthMin,
          depthMax: habitat.depthMax,
          nurseryResident: !!entry.nurseryResident,
          cityResident: false,
        };
        // 不能把经过建筑通道验收的城区居民或安全浅滩鱼群搬到别的区域。
        if (
          habitat.cityResident ||
          habitat.nurseryResident ||
          habitat.fixedHabitat
        ) {
          profiles.push(profile);
          continue;
        }
        changed = true;
        const world = entry.worldBounds || WORLD;
        const margin = Math.max(22, entry.length * 2);
        const offset = Math.min(64, (world.maxX - world.minX) * 0.16);
        const counts =
          group.count >= 4
            ? [Math.ceil(group.count / 2), Math.floor(group.count / 2)]
            : [group.count];
        counts.forEach((count, index) => {
          const side =
            counts.length === 2 ? (index ? 1 : -1) : group.index % 2 ? 1 : -1;
          const x = Math.max(
            world.minX + margin,
            Math.min(world.maxX - margin, anchor[0] + side * offset),
          );
          profiles.push({
            ...profile,
            anchor: [x, anchor[1], anchor[2]],
            count,
          });
        });
      }
      if (!changed) return entry;
      return freezeRecord({ ...entry, schoolProfiles: profiles });
    }),
  );
}

function freezeRecord(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object") freezeRecord(child);
  return Object.freeze(value);
}
