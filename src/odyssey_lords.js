import { KARKINOS_COMBAT as CRAB } from "./karkinos_combat.js";
import {
  odysseySeabedHeight,
  ODYSSEY_SITES,
  ODYSSEY_WORLD,
} from "./odyssey_config.js";
import { odysseyText as t } from "./odyssey_species.js";
import { POLYPHEMUS_COMBAT as COMBAT } from "./polyphemus_combat.js";
import { POLYPHEMUS_SITE } from "./odyssey_polyphemus_site.js";

/** 地标、巡守中心与图鉴水深取自同一最终海床，避免扩图后坐标只更新一半。 */
function habitat(kind, clearance, radius, rise) {
  const [x, z] = ODYSSEY_SITES[kind];
  const y = odysseySeabedHeight(x, z) + clearance;
  return Object.freeze({
    home: Object.freeze([x, y, z]),
    radius,
    maxCenterY: y + rise,
    depthMin: Math.max(20, -y - rise),
    depthMax: Math.min(ODYSSEY_WORLD.maxDepth - 5, -y + radius),
  });
}
const HABITATS = Object.freeze({
  polyphemus: Object.freeze({
    home: POLYPHEMUS_SITE.home,
    radius: POLYPHEMUS_SITE.radius,
    maxCenterY: POLYPHEMUS_SITE.home[1],
    depthMin: Math.max(20, -(POLYPHEMUS_SITE.top + POLYPHEMUS_SITE.height)),
    depthMax: Math.min(ODYSSEY_WORLD.maxDepth - 5, -POLYPHEMUS_SITE.top),
  }),
  karkinos: habitat("karkinos", 16, CRAB.territoryRadius, 100),
  scylla: habitat("scylla", 24, 170, 120),
  charybdis: habitat("charybdis", 70, 180, 180),
});

/** 西方神话四守卫；25米与三次独立命中沿用共享规则。 */
export const ODYSSEY_LORDS = Object.freeze(
  [
    {
      kind: "polyphemus",
      label: t("独眼巨人 · 波吕斐摩斯", "Polyphemus the Cyclops"),
      western: true,
      mythic: true,
      upright: true,
      stationary: true,
      damageTarget: "eye",
      counterPhases: Object.freeze(["recover"]),
      length: 90,
      floorClearance: 45,
      health: 210,
      minAttackLength: 25,
      speed: 0,
      engageRange: COMBAT.engageRange,
      wakeRange: COMBAT.wakeRange,
      huntDuration: COMBAT.hunt,
      lockWindow: COMBAT.lockWindow,
      projectileSpeed: COMBAT.projectileSpeed,
      damage: 30,
      ability: "boulder",
      abilityColors: { boulder: 0xd6b58a },
      skillLabels: { boulder: t("巨岩掀浪", "Boulder and Breaker") },
      skillTips: {
        boulder: t(
          "观察巨手抬石与落点预告，锁定后立刻闪避；只有收势时攻击独眼才有效",
          "Read the raised stone and landing warning, dodge once locked; only the single eye takes damage during recovery",
        ),
      },
      projectileHitMessage: t(
        "巨岩掀浪命中 · 侧移避开落点，向上游离同层水环",
        "Boulder and breaker hit · Sidestep the impact and rise or dive out of the impact layer",
      ),
      depthMin: HABITATS.polyphemus.depthMin,
      depthMax: HABITATS.polyphemus.depthMax,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: COMBAT.windup,
      attackDuration: COMBAT.attack,
      abilityTimings: {
        boulder: {
          windup: COMBAT.windup,
          attack: COMBAT.attack,
          recover: COMBAT.recover,
        },
      },
    },
    {
      kind: "scylla",
      label: t("六首噬礁者 · 斯库拉", "Six-headed Reefmaw · Scylla"),
      western: true,
      mythic: true,
      length: 54,
      floorClearance: 24,
      health: 210,
      minAttackLength: 25,
      speed: 26,
      engageRange: 140,
      lockWindow: 0.7,
      projectileSpeed: 62,
      volleyCount: 6,
      abilityColors: { volley: 0x78c7d8 },
      projectileHitMessage: t(
        "六首水息命中 · 连续横向闪避，借礁柱遮挡",
        "Sixfold water breath hit · Keep sidestepping and use reef cover",
      ),
      volleyInterval: 0.45,
      damage: 28,
      ability: "volley",
      skillLabels: { volley: t("六首噬浪", "Sixfold Tidefang") },
      skillTips: {
        volley: t(
          "六颗头依次吐息 · 连续侧闪，借礁柱挡住水弹",
          "Six heads breathe in sequence · Keep sidestepping and use reef pillars as cover",
        ),
      },
      depthMin: HABITATS.scylla.depthMin,
      depthMax: HABITATS.scylla.depthMax,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 2.5,
      attackDuration: 3,
      abilityTimings: { volley: { windup: 2.5, attack: 3, recover: 4 } },
    },
    {
      kind: "charybdis",
      label: t(
        "吞潮主宰 · 卡律布狄斯",
        "Tide-swallowing Sovereign · Charybdis",
      ),
      western: true,
      mythic: true,
      length: 60,
      floorClearance: 38,
      health: 210,
      minAttackLength: 25,
      speed: 20,
      engageRange: 125,
      lockWindow: 0.8,
      abilityRadius: 84,
      damage: 32,
      ability: "undertow",
      abilityCycle: ["undertow", "surge"],
      abilityColors: { undertow: 0x65c0d8, surge: 0xb2dfeb },
      skillLabels: {
        undertow: t("巨口吞潮", "Maw of the Tide"),
        surge: t("逆潮巨墙", "Reversing Tidewall"),
      },
      skillTips: {
        undertow: t(
          "口前吸流蓄势 · 横向冲出水流锥，借岩礁切断水路",
          "A frontal intake gathers · Sprint sideways out of the cone or break the flow behind a reef",
        ),
        surge: t(
          "逆潮巨墙即将推出 · 向两侧或上下离开锁定航道",
          "A tidewall is about to advance · Leave the locked lane sideways, above or below",
        ),
      },
      depthMin: HABITATS.charybdis.depthMin,
      depthMax: HABITATS.charybdis.depthMax,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 2.4,
      attackDuration: 4,
      abilityTimings: {
        undertow: { windup: 2.4, attack: 3.5, recover: 4.5 },
        surge: { windup: 2.4, attack: 2.4, recover: 4.5 },
      },
    },
    {
      kind: "karkinos",
      label: t("潮怒巨蟹 · 卡尔基诺斯", "Reefbreaker Karkinos"),
      western: true,
      mythic: true,
      upright: true,
      seabedCrawler: true,
      length: 52,
      floorClearance: 16,
      health: 210,
      minAttackLength: 25,
      speed: 19,
      engageRange: CRAB.engageRange,
      wakeRange: CRAB.wakeRange,
      abilityEngageRanges: CRAB.abilityEngageRanges,
      lockWindow: 0.8,
      abilityRadius: CRAB.fault.range,
      damage: 30,
      ability: "fault",
      abilityCycle: CRAB.abilityCycle,
      abilityColors: { claw: 0xe3b274, fault: 0xda9b7e },
      skillLabels: {
        claw: t("破礁双钳", "Reef-sundering Claws"),
        fault: t("礁脊三裂", "Threefold Reefbreak"),
      },
      skillTips: {
        claw: t(
          "双钳与近身前侧亮起扇区 · 退至背侧或上方，合钳后反击",
          "Claw sectors and inner sweep flare · Retreat behind or above, then strike after the pinch",
        ),
        fault: t(
          "三条礁脊即将震裂 · 上浮离开近底水层，或冲入水路间隙",
          "Three reef lanes are about to rupture · Rise away from the bottom or take the gaps",
        ),
      },
      depthMin: HABITATS.karkinos.depthMin,
      depthMax: HABITATS.karkinos.depthMax,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: CRAB.abilityTimings.fault.windup,
      attackDuration: CRAB.abilityTimings.fault.attack,
      abilityTimings: CRAB.abilityTimings,
    },
  ].map((s) => Object.freeze(s)),
);
export const ODYSSEY_BOSS_INSTANCES = Object.freeze([
  Object.freeze({
    id: "odyssey_polyphemus",
    kind: "polyphemus",
    home: HABITATS.polyphemus.home,
    radius: HABITATS.polyphemus.radius,
    maxCenterY: HABITATS.polyphemus.maxCenterY,
    persistentDefeat: true,
  }),
  Object.freeze({
    id: "odyssey_karkinos",
    kind: "karkinos",
    home: HABITATS.karkinos.home,
    radius: HABITATS.karkinos.radius,
    maxCenterY: HABITATS.karkinos.maxCenterY,
    persistentDefeat: true,
  }),
  Object.freeze({
    id: "odyssey_scylla",
    kind: "scylla",
    home: HABITATS.scylla.home,
    radius: HABITATS.scylla.radius,
    maxCenterY: HABITATS.scylla.maxCenterY,
    persistentDefeat: true,
  }),
  Object.freeze({
    id: "odyssey_charybdis",
    kind: "charybdis",
    home: HABITATS.charybdis.home,
    radius: HABITATS.charybdis.radius,
    maxCenterY: HABITATS.charybdis.maxCenterY,
    persistentDefeat: true,
  }),
]);
export const ODYSSEY_LORD_DESCRIPTIONS = {
  polyphemus: {
    name: t("波吕斐摩斯", "Polyphemus"),
    latin: "POLYPHEMUS",
    category: "lord",
    role: t("西侧巨岩风门守卫", "Western boulder wind-gate guardian"),
    color: "#a3896a",
    ability: t("巨岩掀浪", "Boulder and Breaker"),
    appearance: t(
      "额头中央只有一只巨眼，宽厚肩背与完整双臂相连；它在石台上交替踏步转向，站稳后抬臂投岩。只有收势时的真实独眼可受伤。",
      "One great eye sits above a broad, complete torso and articulated arms. The giant takes alternating pivot steps on its dais and plants its stance to throw. Only the actual single eye takes damage during recovery.",
    ),
    text: t(
      "《奥德赛》第九卷中的独眼巨人曾从洞穴追至海边，掷出巨岩，激起几乎掀翻航船的海浪。这片海域将他的洞穴改编成沉水石台：击败守卫后，西风机关才会解除封锁。投石前有明确的抬臂与落点预告，岩石从掌心飞出，撞击后扩散成有限的同层水环。",
      "In Odyssey Book IX, the Cyclops hurls enormous rocks from his cave's shore, sending waves toward the fleeing ship. Here his lair becomes a submerged dais: defeat the guardian to unlock the western wind puzzle. A raised arm and landing mark warn of the throw; the stone leaves the actual palm and its impact sends a finite water ring at the impact layer outward.",
    ),
    counter: t(
      "1.8秒蓄势时先让开投石路线，最后0.6秒出现锁定闪环和四角标记后立即闪避。投掷后有3秒收势期，25米起只有攻击真实独眼才造成伤害，身体和侧背均不受伤，每轮只计一次眼部命中。",
      "Leave the throw lane during the 1.8-second windup; dodge immediately when the final 0.6-second lock flash and brackets appear. In the 3-second post-throw recovery, only the actual single eye takes damage from 25 m. Body and flanks are armored; only one eye hit counts per cycle.",
    ),
    realSize: t(
      "独眼、洞穴与掷岩激浪出自《奥德赛》第九卷；90米蹲伏高度、沉水石台、风门守卫与水下战斗是游戏改编。",
      "The single eye, cave and wave-raising boulder throws come from Odyssey Book IX; the 90 m crouching height, submerged dais, wind-gate guardianship and underwater combat are game adaptations.",
    ),
    backgroundType: "神话传说",
  },
  scylla: {
    name: t("斯库拉", "Scylla"),
    latin: "SCYLLA",
    category: "lord",
    role: t("六首峡口守卫", "Six-headed strait guardian"),
    color: "#bc838e",
    ability: t("六首噬浪", "Sixfold Tidefang"),
    appearance: t(
      "六条长颈从覆鳞的巨大躯干伸出，独立摆动的猎犬般头颅露出密集齿列，十二条鳍足支撑着礁影中的怪物。",
      "Six long necks rise from a huge scaled body. Independent houndlike heads bare dense tooth rows, while twelve fin-feet support the monster in the reef shadows.",
    ),
    text: t(
      "古老航路的峡口回荡着六重低啸。斯库拉藏在被浪潮蚀空的岩壁间，长颈越过沉桅窥探猎物。传说旅人宁可让船远离她的洞口，也不愿在那片水中停留。如今六首怪物仍巡守着自己的礁湾，依次从不同吻端吐出压缩的水流。",
      "Six low cries echo through the old sea-road strait. Scylla watches from wave-carved stone, stretching long necks over broken masts. Sailors once refused to linger near her cave. She still patrols her reef, releasing compressed water from each of her six mouths in sequence.",
    ),
    counter: t(
      "蓄势后连续横向游动，利用岩礁拦截水弹；六次吐息结束后，从躯干侧面反击。",
      "Keep moving laterally after windup and intercept the water shots with reefs; strike the body's flank after all six breaths.",
    ),
    realSize: t(
      "六首长颈与十二足来自古代海怪传说，水下战斗与可击败规则为改编。",
      "Six long necks and twelve feet belong to the ancient sea-monster tale; underwater combat and defeat are adaptations.",
    ),
    backgroundType: "神话传说",
  },
  charybdis: {
    name: t("卡律布狄斯", "Charybdis"),
    latin: "CHARYBDIS",
    category: "lord",
    role: t("吞潮深潭守卫", "Tide-swallowing basin guardian"),
    color: "#659aab",
    ability: t("巨口吞潮 · 逆潮巨墙", "Maw of the Tide · Reversing Tidewall"),
    appearance: t(
      "层叠的甲环包围深陷巨口，内向齿列与螺旋鳃褶收放，宽阔的裙鳍在暗水中缓缓起伏。",
      "Layered armored rings surround a recessed maw; inward teeth and spiral gill folds open above slowly undulating skirt fins.",
    ),
    text: t(
      "峡口另一侧的海水仿佛会呼吸：回流时把沙粒、碎陶和残帆拖向黑暗，退潮时又把浪推回远方。卡律布狄斯伏在这片深潭中，环状巨口吞吐水流，旧航船的锚链仍缠在附近礁石上。避开她的吸入周期，才能看见沉底的归航路标。",
      "Across the strait the sea seems to breathe, dragging sand, pottery and sails inward before expelling a tide. Charybdis inhabits this basin, drawing water through an annular maw; the anchors of old ships still cling to nearby reefs. Only outside the swallowing cycle can travelers see the sunken homeward markers.",
    ),
    counter: t(
      "巨口仅吸入口前水流锥，横向冲刺可挣脱；逆潮巨墙沿锁定航道向前推进，从两侧或上下避开，在4.5秒恢复期反击。",
      "The maw inhales through a frontal cone: sprint sideways to escape. A tidewall then advances along a locked lane; evade sideways or vertically and counter during its 4.5-second recovery.",
    ),
    realSize: t(
      "吞吐海水的漩涡传说被具象为有生命的巨口，不属于真实动物。",
      "The sea-swallowing whirlpool tale is embodied as a living maw, not a real animal.",
    ),
    backgroundType: "神话传说",
  },
  karkinos: {
    name: t("卡尔基诺斯", "Karkinos"),
    latin: "KARKINOS",
    category: "lord",
    role: t("断桅礁棚守卫", "Broken-mast shelf guardian"),
    color: "#b78367",
    ability: t(
      "破礁双钳 · 礁脊三裂",
      "Reef-sundering Claws · Threefold Reefbreak",
    ),
    appearance: t(
      "八条分节步足托起铜红色层叠甲壳，不对称的巨钳布满磨损齿缘，警觉的眼柄伸向柱影。",
      "Eight jointed walking legs carry a layered bronze-red carapace. Unequal giant claws bear worn serrations, while alert eyestalks watch the ruins.",
    ),
    text: t(
      "传说那只向英雄发起挑战的巨蟹曾被送上星空。断桅礁棚的海水却保留了它的另一道影子：铜红甲壳比古船更加宽阔，两只巨钳能够击碎沉石。卡尔基诺斯从不离开自己守望的礁道，巡游时八条步足轮流压过沙地。合钳前它会抬起双臂，紧接着，三路地层冲击沿海床追来；浪痕之间仍留着归航者可以穿过的缺口。",
      "The crab that challenged a hero was said to have been set among the stars. A second shadow remained on the broken-mast shelf: a bronze-red shell wider than old galleys and claws strong enough to split sunken stone. Karkinos patrols its reef on eight alternating legs. Raised arms warn of a double pinch; three bottom-hugging pressure lanes follow, leaving gaps for a determined voyager.",
    ),
    counter: t(
      "躲开双钳扇区与近身前侧扫区；三路地层波到来时上浮或穿过间隙，利用合钳后的4.5秒恢复期进攻侧翼。",
      "Avoid the front claw sectors and inner frontal sweep. Rise over the three bottom-hugging lanes or take their gaps, then strike a flank during the 4.5-second recovery.",
    ),
    realSize: t(
      "巨蟹源自希腊传说；礁棚体型、复生故事与两种水下攻击是海域中的幻想设定。",
      "The crab comes from Greek legend; this shelf-dwelling giant, its returning shadow and its underwater attacks are fantasy adaptations.",
    ),
    backgroundType: "神话传说",
  },
};
