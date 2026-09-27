import { SPECIES } from "./simulation.js";
import { BOSS_SPECIES } from "./boss_rules.js";

import { PLAYER_CHARACTERS } from "./character_rules.js";

export const CHARACTERS = PLAYER_CHARACTERS;
export const REGIONS = Object.freeze([
  {
    id: "hawaii",
    name: "夏威夷海域",
    available: true,
    description:
      "从阳光海滩潜入火山深渊。本期全部生物都在这里；这是幻想改编海域。",
    speciesKinds: SPECIES.map((species) => species.kind),
    bossKinds: BOSS_SPECIES.map((species) => species.kind),
    spawn: [0, -18, 75],
  },
  { id: "mariana", name: "马里亚纳海沟", available: false },
  { id: "bermuda", name: "百慕大三角", available: false },
  { id: "atlantis", name: "亚特兰蒂斯遗迹", available: false },
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
