import { REGION_SPECIES_KINDS } from "./region_ecology.js";
import { BOSS_SPECIES } from "./boss_rules.js";

import { PLAYER_CHARACTERS } from "./character_rules.js";

export const CHARACTERS = PLAYER_CHARACTERS;
export const REGIONS = Object.freeze([
  {
    id: "hawaii",
    seabedHeat: true,
    name: "夏威夷海域",
    available: true,
    description:
      "从阳光海滩潜入火山深渊。珊瑚鱼群、远古巨兽与多位深渊领主在此共存。",
    speciesKinds: REGION_SPECIES_KINDS.hawaii,
    bossKinds: BOSS_SPECIES.map((species) => species.kind),
    spawn: [0, -18, 75],
  },
  {
    id: "atlantis",
    seabedHeat: false,
    name: "亚特兰蒂斯遗迹",
    available: true,
    description:
      "从月夜浅滩潜入贝珠辉光映照的沉没古城。独特鱼群栖息于列柱间，克拉肯守卫波塞冬神殿。",
    speciesKinds: REGION_SPECIES_KINDS.atlantis,
    bossKinds: ["kraken"],
    bossHomes: { kraken: [0, -420, -730] },
    bossInstances: Object.freeze(
      [
        { id: "atlantis_court", home: [0, -420, -730], radius: 110 },
        { id: "atlantis_west", home: [-180, -360, -670], radius: 68 },
        { id: "atlantis_rear", home: [170, -555, -930], radius: 75 },
      ].map((instance) =>
        Object.freeze({
          ...instance,
          kind: "kraken",
          home: Object.freeze(instance.home),
        }),
      ),
    ),
    spawn: [0, -18, 75],
  },
  { id: "mariana", name: "马里亚纳海沟", available: false },
  { id: "bermuda", name: "百慕大三角", available: false },
]);

/** 根据选项取可用配置；尚未开放的海域或角色不会被当作可玩内容。
 * @param {string} regionId 海域标识。
 * @param {string} characterId 角色标识。
 * @returns {{region:object,character:object}} 已验证的选择。
 */
export function getExpedition(regionId = "hawaii", characterId = "orca") {
  const region = REGIONS.find(
    (entry) => entry.id === regionId && entry.available,
  );
  const character = CHARACTERS.find(
    (entry) => entry.id === characterId && entry.available,
  );
  if (!region || !character) throw new Error("Expedition is not available");
  return { region, character };
}
