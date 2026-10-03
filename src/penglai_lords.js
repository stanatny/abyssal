import { penglaiText as t } from "./penglai_species.js";
const rows = [
  [
    "azure_dragon",
    "青龙",
    "Azure Dragon",
    56,
    "charge",
    "#51a897",
    "长躯弯曲起伏，威严龙首、鹿角、须髯与鬃脊，均衡的速度和力量镇守东峰。",
    "A sweeping four-legged dragon with a commanding face, antlers, whiskers and mane guards the eastern peak with balanced speed and power.",
  ],
  [
    "white_tiger",
    "白虎",
    "White Tiger",
    48,
    "charge",
    "#dedccf",
    "厚实胸肩、粗壮四肢与宽阔虎头的白色巨虎，四神兽中速度最快；蓄势后迅速跃击山脊上的目标。",
    "A muscular striped giant with massive shoulders, broad paws and a commanding tiger head. The fastest Four-Symbol guardian launches a warned leap at mountain intruders.",
  ],
  [
    "vermilion_bird",
    "朱雀",
    "Vermilion Bird",
    52,
    "volley",
    "#d16c51",
    "赤金鬃冠、披肩颈羽、长翼与飘扬尾羽，四神兽中攻击最强；蓄势后从喙部发出三道焰息。",
    "A flame-like red-gold mane, thick neck feathers, long wings and streaming tail. The hardest-hitting Four-Symbol guardian releases three warned flame volleys.",
  ],
  [
    "black_tortoise",
    "玄武",
    "Black Tortoise",
    50,
    "pulse",
    "#608c81",
    "北方莲池中的宽厚巨龟，层叠甲板与甲缘盘蛇坚守阵地；蓄势和脉冲期间甲阵挡住攻击，消退后露出侧翼。",
    "A massive tortoise with layered armor and a rim-coiled serpent guards the northern lotus pool. Its shell ward blocks attacks during windup and pulse, then opens a flank counterattack window.",
  ],
  [
    "sword_sage",
    "御剑真君",
    "Sword Sage",
    38,
    "swords",
    "#d3bd7b",
    "脚踏一柄剑尖朝前的巨剑，山形冠髻、长须与流云道袍；交替驱动多柄飞剑和直线御剑冲阵。",
    "A stern sage rides one broad forward-pointing greatsword beneath both feet, wearing a mountain crown and cloud brocade; he alternates remote blade volleys with a straight sword dash.",
  ],
];
export const PENGLAI_LORDS = Object.freeze(
  rows.map(([kind, zh, en, length, ability, color, appearance, enAppearance]) =>
    Object.freeze({
      kind,
      label: t(zh, en),
      mythic: true,
      length,
      health: 210,
      minAttackLength: 25,
      speed:
        kind === "white_tiger"
          ? 44
          : kind === "black_tortoise"
            ? 22
            : kind === "sword_sage"
              ? 28
              : 32,
      engageRange: 135,
      lockWindow: 0.8,
      abilityRadius: 44,
      chargeSpeed: kind === "white_tiger" ? 110 : 82,
      damage:
        kind === "vermilion_bird"
          ? 46
          : kind === "black_tortoise"
            ? 25
            : kind === "sword_sage"
              ? 28
              : 35,
      ...(kind === "sword_sage"
        ? {
            abilityCycle: Object.freeze(["swords", "charge"]),
            abilityTimings: Object.freeze({
              swords: Object.freeze({ windup: 2.2, attack: 1.6, recover: 3.5 }),
              charge: Object.freeze({ windup: 2.2, attack: 0.9, recover: 4 }),
            }),
            chargeSpeed: 65,
            chargeHandlesContact: true,
            persistentPursuit: true,
            skillLabels: Object.freeze({
              charge: t("御剑冲阵", "Sword-riding dash"),
            }),
            skillTips: Object.freeze({
              charge: t(
                "剑路已亮 · 侧闪或升降，冲阵后趁硬直反击",
                "The sword path is marked · Dodge sideways or vertically, then punish the recovery",
              ),
            }),
          }
        : {}),
      ability,
      depthMin: -600,
      depthMax: 140,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 1.8,
      attackDuration: 1.6,
      groundbound: kind === "white_tiger",
      ...(kind === "white_tiger"
        ? { minimumGroundHeight: 5, attackDuration: 1.05 }
        : {}),
      ...(kind === "black_tortoise"
        ? {
            guardedPhases: Object.freeze(["windup", "attack"]),
            abilityTimings: Object.freeze({
              pulse: Object.freeze({ windup: 2.2, attack: 1.6, recover: 4.5 }),
            }),
            skillTips: Object.freeze({
              pulse: t(
                "龟甲闭合 · 避开波纹，甲阵消退后再从侧翼进攻",
                "Shell ward raised · Avoid the pulse; attack the flank after its armor subsides",
              ),
            }),
          }
        : {}),
      upright: kind === "sword_sage",
      color,
    }),
  ),
);
export const PENGLAI_LORD_DESCRIPTIONS = Object.freeze(
  Object.fromEntries(
    rows.map(
      ([kind, zh, en, length, ability, color, appearance, enAppearance]) => [
        kind,
        {
          name: t(zh, en),
          latin: en.toUpperCase() + " / ORIGINAL MYTHIC INTERPRETATION",
          category: "lord",
          role: t(
            kind === "sword_sage" ? "道观终局守卫" : "四象守卫",
            kind === "sword_sage"
              ? "Final monastery guardian"
              : "Four-Symbol guardian",
          ),
          color,
          ability: t(
            ability === "swords"
              ? "隔空御剑与御剑冲阵"
              : ability === "charge"
                ? "蓄势突进"
                : ability === "pulse"
                  ? "坚甲护阵与脉冲"
                  : "三重焰息",
            ability === "swords"
              ? "Remote swords and sword-riding dash"
              : ability === "charge"
                ? "Warned charge"
                : ability === "pulse"
                  ? "Armored ward and pulse"
                  : "Triple flame breath",
          ),
          appearance: t(appearance, enAppearance),
          text: t(
            kind === "sword_sage"
              ? "四神兽未全部击败时结界阻挡道观入口。解除护阵并进入领地后，真君会持续缓慢追击，冲刺可拉开距离；真君交替释放三剑远攻与短程直线冲阵，均有2.2秒预警；冲阵后有4秒反击窗口。击败真君完成远征。"
              : "独属于蓬莱的神话守卫，持续巡守自己的领地；击败后不再刷新。",
            kind === "sword_sage"
              ? "The monastery is sealed until all four guardians fall. After unsealing the ward and entering his territory, the sage keeps pursuing slowly; sprint to gain distance. He alternates three remote swords and a short straight dash, each with a 2.2-second warning; the dash leaves a four-second recovery window. Defeat him to complete Penglai."
              : "A Penglai-only mythic guardian continuously patrols its territory and never respawns after defeat.",
          ),
          counter: t(
            kind === "black_tortoise"
              ? "25米后避开脉冲，等待甲阵消退的4.5秒窗口，从侧翼完成三次独立命中；鱼雷也无法穿过生效中的甲阵。"
              : "25米后观察预警，从侧翼完成三次独立命中。地形可以掩护，但不要留在蓄势攻击的路径上。",
            kind === "black_tortoise"
              ? "At 25 m, avoid the pulse and use the 4.5-second exposed window for three separated flank hits. Torpedoes cannot pierce the active shell ward either."
              : "At 25 m, watch the warnings and land three separated flank hits. Terrain offers cover; avoid the warned attack path.",
          ),
        },
      ],
    ),
  ),
);
