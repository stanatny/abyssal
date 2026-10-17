import { penglaiText as t, PENGLAI_EN } from "./penglai_species.js";
// 技能判定仍用稳定的ability ID；图鉴和战斗预警共用这份显示名称。
export const PENGLAI_SKILL_NAMES = Object.freeze({
  azure_dragon: Object.freeze({
    water: t("沧溟龙息", "Dragon Breath of the Azure Sea"),
  }),
  white_tiger: Object.freeze({
    charge: t("白虎掠风", "White Tiger Windstep"),
    roar: t("裂空虎啸", "Sky-Rending Roar"),
  }),
  vermilion_bird: Object.freeze({
    volley: t("朱羽焚天", "Vermilion Skyfire"),
  }),
  black_tortoise: Object.freeze({
    pulse: t("玄甲镇渊", "Abyss-Sealing Shell Ward"),
  }),
  sword_sage: Object.freeze({
    swords: t("万剑归宗", "Myriad Blades Converge"),
    charge: t("踏剑惊鸿", "Skyborne Sword Rush"),
  }),
});
const rows = [
  [
    "azure_dragon",
    "青龙",
    "Azure Dragon",
    56,
    "water",
    "#51a897",
    "连续的苍青长躯随波起伏，重眉龙首露出利齿，后掠鹿角与鬃脊衔接四只利爪，以均衡的速度和力量镇守东峰。",
    "A continuous jade-scaled dragon with a ridged, fanged skull, swept antlers, mane and four grasping claws guards the eastern peak with balanced speed and power.",
  ],
  [
    "white_tiger",
    "白虎",
    "White Tiger",
    48,
    "charge",
    "#dedccf",
    "胸肩雄厚、颊鬃后掠的白色巨虎，低伏虎首与外露犬齿显出猎手威势，四神兽中速度最快；蓄势后迅速跃击山脊上的目标。",
    "A muscular white tiger with massive shoulders, swept cheek fur, a low hunting head, exposed canines and broad paws. The fastest Four-Symbol guardian launches a warned leap at mountain intruders.",
  ],
  [
    "vermilion_bird",
    "朱雀",
    "Vermilion Bird",
    52,
    "volley",
    "#d16c51",
    "后掠赤金冠羽、宽展重叠翼羽与收拢利爪构成威严猛禽，钩喙下延伸长尾羽，四神兽中攻击最强；蓄势后从喙部发出三道焰息。",
    "A commanding red-gold raptor with a swept flame crest, broad overlapping wings, a hooked beak, tucked talons and streaming tail. The hardest-hitting Four-Symbol guardian releases three warned flame volleys.",
  ],
  [
    "black_tortoise",
    "玄武",
    "Black Tortoise",
    50,
    "pulse",
    "#608c81",
    "北方莲池中的重甲巨龟，脊状甲板、鹰喙龟首与甲缘角蛇坚守阵地，双前桨推水、后桨稳向；蓄势后释放两道宽域震波，甲阵消退后露出短暂破绽。",
    "A massive armored tortoise with ridged plates, a beaked head and a rim-coiled horned serpent guards the northern lotus pool. Paired forepaddles propel it while hindpaddles steer. Its ward blocks attacks while two broad pulses expand, then briefly exposes its body.",
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
      worldNavigation: true,
      navigationSway: kind === "azure_dragon" ? 7 : 0,
      length,
      health:
        kind === "sword_sage" ? 350 : kind === "black_tortoise" ? 280 : 210,
      minAttackLength: 25,
      speed:
        kind === "white_tiger"
          ? 44
          : kind === "black_tortoise"
            ? 22
            : kind === "sword_sage"
              ? 36
              : 32,
      engageRange: kind === "white_tiger" ? 210 : 135,
      lockWindow: 0.8,
      abilityRadius: 44,
      chargeSpeed: kind === "white_tiger" ? 110 : 82,
      damage:
        kind === "vermilion_bird"
          ? 46
          : kind === "black_tortoise"
            ? 32
            : kind === "sword_sage"
              ? 28
              : 35,
      ...(kind === "azure_dragon"
        ? {
            breathRange: 145,
            breathRadius: 7,
            abilityTimings: Object.freeze({
              water: Object.freeze({ windup: 2.2, attack: 1.6, recover: 3.8 }),
            }),
            skillTips: Object.freeze({
              water: t(
                "水息锁定 · 横向或升降离开蓝色水路，借山石遮挡",
                "Water path locked · Dodge sideways or vertically, or use mountains for cover",
              ),
            }),
          }
        : {}),
      ...(kind === "sword_sage"
        ? {
            abilityCycle: Object.freeze(["swords", "charge"]),
            abilityTimings: Object.freeze({
              swords: Object.freeze({ windup: 1.9, attack: 1.6, recover: 2.2 }),
              charge: Object.freeze({ windup: 1.9, attack: 0.9, recover: 2.6 }),
            }),
            chargeSpeed: 65,
            chargeHandlesContact: true,
            persistentPursuit: true,
            pursuitOnUnlock: true,
            huntDuration: 0.8,
            pursuitTurnRate: 2.4,
            windupAdvanceSpeeds: Object.freeze({ swords: 20 }),
            requiredHits: 5,
            counterPhases: Object.freeze(["recover"]),
            skillTips: Object.freeze({
              swords: t(
                "飞剑将至 · 横向闪避或绕山石遮挡",
                "Blades incoming · Dodge sideways or use mountains for cover",
              ),
              charge: t(
                "剑路已亮 · 侧闪或升降，冲阵后趁硬直反击",
                "The sword path is marked · Dodge sideways or vertically, then punish the recovery",
              ),
            }),
          }
        : {}),
      ability,
      skillLabels: PENGLAI_SKILL_NAMES[kind],
      depthMin: -600,
      depthMax: 140,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 1.8,
      attackDuration: 1.6,
      groundbound: kind === "white_tiger",
      ...(kind === "white_tiger"
        ? {
            minimumGroundHeight: 5,
            attackDuration: 1.05,
            abilityCycle: Object.freeze(["charge", "roar"]),
            counterPhases: Object.freeze(["recover"]),
            abilityTimings: Object.freeze({
              charge: Object.freeze({
                windup: 1.8,
                attack: 1.05,
                recover: 2.8,
              }),
              roar: Object.freeze({ windup: 2.0, attack: 2.0, recover: 3.0 }),
            }),
            roar: Object.freeze({
              range: 210,
              speed: 105,
              baseRadius: 6,
              spread: 0.23,
              band: 8,
            }),
            skillTips: Object.freeze({
              charge: t(
                "白虎伏低 · 侧闪跃扑，收势时反击",
                "The tiger crouches · Dodge its leap, then counter during recovery",
              ),
              roar: t(
                "虎啸锁向 · 横向或升降离开音浪，山石可以遮挡",
                "Roar course locked · Dodge sideways or vertically; mountains block the wave",
              ),
            }),
          }
        : {}),
      ...(kind === "black_tortoise"
        ? {
            guardedPhases: Object.freeze(["windup", "attack"]),
            requiredHits: 4,
            abilityRadius: 78,
            pulseWaveCount: 2,
            pulseWaveInterval: 1.8,
            pulseWaveDuration: 2.0,
            pulseBand: 8,
            pulseHalfHeight: 12,
            abilityTimings: Object.freeze({
              pulse: Object.freeze({ windup: 2.2, attack: 3.8, recover: 3.0 }),
            }),
            skillTips: Object.freeze({
              pulse: t(
                "玄甲双震 · 连续避开两道波纹，甲阵消退后再反击",
                "Twin shell pulses · Dodge both waves, then counter after the armor subsides",
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
          latin: en.toUpperCase() + " / MYTHIC GUARDIAN",
          category: "lord",
          role: t(
            kind === "sword_sage" ? "道观终局守卫" : "四象守卫",
            kind === "sword_sage"
              ? "Final monastery guardian"
              : "Four-Symbol guardian",
          ),
          color,
          ability: t(
            Object.values(PENGLAI_SKILL_NAMES[kind]).join(" · "),
            Object.values(PENGLAI_SKILL_NAMES[kind])
              .map((name) => PENGLAI_EN[name])
              .join(" · "),
          ),
          appearance: t(appearance, enAppearance),
          text: t(
            kind === "sword_sage"
              ? "四神兽未全部击败时结界阻挡道观入口。护阵一解，真君即开始全域追击，并在飞剑蓄势前段继续逼近。生命350，需要五轮有效反击；只有齐射或冲阵后的短暂收势期可伤到本体。借山石遮挡、冲刺转向，再抓住破绽。击败真君完成远征。"
              : kind === "azure_dragon"
                ? "“沧溟龙息”凝聚云水，沿预警锁定方向喷出有限射程的水流；横向或上下避开，待收势时从侧翼反击。镇守东峰，击败后本局不再刷新。"
                : kind === "white_tiger"
                  ? "交替使用“白虎掠风”跃扑与“裂空虎啸”远程音浪，守望西山周边空域。虎啸锁定预警方向后不追踪；侧闪、升降或借山石遮挡，收势时再反击。击败后本局不再刷新。"
                  : kind === "black_tortoise"
                    ? "“玄甲镇渊”在蓄势与脉冲期间升起护甲，挡住咬击和鱼雷；两道震波消退后的3秒收势期才是反击窗口，需四轮有效反击。镇守北池，击败后本局不再刷新。"
                    : "“朱羽焚天”蓄势后发出三道焰息，攻击力为四神兽之最；横向变向避开连弹，趁收势反击。镇守南方天空，击败后本局不再刷新。",
            kind === "sword_sage"
              ? "The monastery is sealed until all four guardians fall. Once the ward falls, the sage pursues across Penglai and advances during early blade windup. He has 350 health and requires five separate counters; only brief post-volley or post-dash recovery exposes his body. Use mountain cover and sprint turns, then seize an opening. Defeat him to complete Penglai."
              : kind === "azure_dragon"
                ? "Dragon Breath of the Azure Sea gathers cloud-water and releases a finite stream along the warned direction. Dodge sideways or vertically and counter at the flank during recovery. It guards the eastern peak and never respawns after defeat."
                : kind === "white_tiger"
                  ? "It alternates White Tiger Windstep with a remote Sky-Rending Roar across the western mountain airspace. The roar follows its warned course without homing. Dodge sideways or vertically, or use mountain cover, then counter during recovery. It never respawns after defeat."
                  : kind === "black_tortoise"
                    ? "Abyss-Sealing Shell Ward blocks bites and torpedoes during windup and pulse. Two expanding pulses are followed by a 3-second counter window; four separate counters defeat it. It guards the northern pool and never respawns after defeat."
                    : "Vermilion Skyfire prepares three flame volleys; this is the hardest-hitting Four-Symbol guardian. Change course sideways and counter during recovery. It guards the southern sky and never respawns after defeat.",
          ),
          counter: t(
            kind === "sword_sage"
              ? "25米后避开1.9秒预警的飞剑与冲阵，在齐射后2.2秒、冲阵后2.6秒的收势期咬中身体，正面也有效。五轮有效反击即可击败，每轮最多一次；咬击和鱼雷共用破绽。"
              : kind === "black_tortoise"
                ? "25米后连续避开两道震波，等待甲阵消退的3秒窗口，完成四轮独立命中；鱼雷也无法穿过生效中的甲阵。"
                : kind === "white_tiger"
                  ? "25米后避开跃扑与虎啸，只在2.8—3秒收势期反击；三轮有效命中即可击败，每轮一次。"
                  : "25米后观察预警，从侧翼完成三次独立命中。地形可以掩护，但不要留在蓄势攻击的路径上。",
            kind === "sword_sage"
              ? "At 25 m, dodge the blades and dash after their 1.9-second warning. Bite the body from any angle during 2.2-second volley or 2.6-second dash recovery. Five separate counters defeat him, with one hit per opening shared by bites and torpedoes."
              : kind === "black_tortoise"
                ? "At 25 m, dodge both pulses and use each 3-second exposed window for four separate counters. Torpedoes cannot pierce the active shell ward either."
                : kind === "white_tiger"
                  ? "At 25 m, dodge leaps and roars, then counter only during 2.8–3 seconds of recovery. Three separate openings defeat it, one hit each."
                  : "At 25 m, watch the warnings and land three separated flank hits. Terrain offers cover; avoid the warned attack path.",
          ),
        },
      ],
    ),
  ),
);
