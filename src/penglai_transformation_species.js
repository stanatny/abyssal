import { PENGLAI_SPECIES, penglaiText as t } from "./penglai_species.js";
import { penglaiHeightAt } from "./penglai_config.js";

export const DRAGON_GATE = Object.freeze({
  x: 0,
  y: penglaiHeightAt(0, -235) + 34,
  z: -235,
});
export const MYTHIC_TRANSFORMATION_RULES = Object.freeze({
  dragon_carp: Object.freeze({
    form: "gate_dragon",
    maxIndividuals: 2,
    wait: 18,
    rise: 3.2,
    reveal: 1.4,
    hold: 42,
  }),
  kun: Object.freeze({
    form: "peng",
    maxIndividuals: 4,
    wait: 26,
    rise: 2.5,
    reveal: 1.8,
    hold: 32,
  }),
});
const source = (kind) => PENGLAI_SPECIES.find((s) => s.kind === kind);
export const PENGLAI_TRANSFORMATION_FORMS = Object.freeze([
  Object.freeze({
    ...source("dragon_carp"),
    kind: "gate_dragon",
    formSourceKind: "dragon_carp",
    label: t("龙门云龙", "Dragon-Gate Cloud Dragon"),
    latin: "DRAGON GATE / TRANSFORMED MYTHIC CREATURE",
    length: 24,
    speed: 15,
    chaseSpeed: 23,
    damage: 24,
    tier: 2,
    predator: true,
    threatCeilingLength: 25,
    schoolSize: 1,
    schoolProfiles: undefined,
    schoolAnchors: undefined,
    independentMovement: true,
    spawnAnchors: [[0, DRAGON_GATE.y + 12, DRAGON_GATE.z - 45]],
    residentRadius: 100,
    hunterTerritory: {
      minX: -180,
      maxX: 180,
      minZ: -420,
      maxZ: -150,
      center: { x: 0, y: DRAGON_GATE.y + 23, z: DRAGON_GATE.z - 55 },
    },
    depthMin: -DRAGON_GATE.y - 100,
    depthMax: -DRAGON_GATE.y + 5,
    nutrition: 84,
    growth: 3.4,
    description: t(
      "金鲤跃过龙门后化为赤金云龙。修长盘曲的龙身、四足、短角与残留的金鲤扇尾相连，实力弱于东方青龙。",
      "A gold carp becomes a red-gold cloud dragon after leaping through the Dragon Gate: a winding body, four feet, short horns and a surviving carp-like fan tail. It is weaker than the eastern Azure Dragon.",
    ),
    ability: t("跃龙门 · 化龙巡猎", "Dragon Gate ascent · transformed hunt"),
    counter: t(
      "跃门有明显上升与金光前兆。云龙会伤害25米以下的角色；达到25米后不再追击。它是普通猎手，并非解锁道观的神兽。",
      "A rising leap and golden shimmer precede its change. It can injure characters below 25 m and stops hunting at 25 m. It is an ordinary hunter, not a monastery guardian.",
    ),
    habitatLabel: t("龙门后方云间", "Clouds beyond the Dragon Gate"),
  }),
  Object.freeze({
    ...source("kun"),
    kind: "peng",
    formSourceKind: "kun",
    label: t("鹏", "Peng"),
    latin: "ZHUANGZI / TRANSFORMED MYTHIC CREATURE",
    length: 40,
    speed: 18,
    chaseSpeed: 25,
    description: t(
      "鲲化而为鹏：钩喙、厚实肩胸与层叠巨翼形成完全不同的剪影。翼展宽阔但尺度适应仙岛，振翼掠过山脊后仍会回归鲲形。",
      "Kun becomes Peng: a hooked beak, powerful chest and vast layered wings form a completely different silhouette. Its span fits the island; after crossing the ridges it returns to Kun form.",
    ),
    ability: t("扶摇化鹏", "Soaring transformation"),
    counter: t(
      "在高空观察鲲抬升、展翼再化鹏的过程，避免停在其正前方。两种形态是同一个体，不会凭空增加数量。",
      "Watch Kun rise and unfold into Peng high above the peaks. Avoid its frontal path. Both forms belong to one individual, not an extra spawn.",
    ),
    habitatLabel: t("高空云海与仙山上方", "High clouds above the sacred peaks"),
  }),
]);
export const transformationForm = (kind) =>
  PENGLAI_TRANSFORMATION_FORMS.find((s) => s.kind === kind);
