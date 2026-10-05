import { LUMEN_LASH } from "./europa_lord_attacks.js";
import { TIDAL_LOOM } from "./europa_loom.js";
import { KRAKEN_GRAPPLE } from "./lord_special_rules.js";
import { getHunterAbility } from "./hunter_rules.js";

/**
 * 按真实技能注册表构建图鉴卡，不为普通巡游或群游虚构技能。
 * @param {object} species 原始物种或领主配置。
 * @param {{ability?:string, counter?:string, description?:string}} entry 图鉴说明。
 * @returns {object[]} 独立技能说明与真实预警、恢复、追击冷却；不修改游戏状态。
 */
export function creatureGuideSkills(species, entry = {}) {
  if (species.tier === 3) {
    return (species.abilityCycle || [species.ability]).map((id) => {
      const copy = LORD_SKILLS[`${species.kind}:${id}`] || LORD_SKILLS[id];
      if (!copy)
        throw new Error(`Missing lord Guide skill: ${species.kind}/${id}`);
      const timing = species.abilityTimings?.[id];
      return {
        id,
        type: "active",
        name: species.skillLabels?.[id] || entry.ability,
        ...copy,
        counter: species.skillTips?.[id] || copy.counter,
        values:
          id === "lash"
            ? [LUMEN_LASH.range, species.damage, timing?.recover ?? 3]
            : id === "loom"
              ? [TIDAL_LOOM.outerRadius, species.damage, timing?.recover ?? 3]
              : id === "water"
                ? [species.breathRange, species.damage, timing?.recover ?? 3]
                : id === "vortex"
                  ? [
                      species.damage * KRAKEN_GRAPPLE.damageMultiplier,
                      timing?.recover ?? 3,
                      KRAKEN_GRAPPLE.biteDelay,
                    ]
                  : undefined,
        windup: timing?.windup ?? species.windupDuration,
        recovery: timing?.recover ?? 3,
      };
    });
  }
  const hunter = getHunterAbility(species);
  if (hunter) {
    const copy = HUNTER_SKILLS[hunter.type];
    if (!copy) throw new Error(`Missing hunter Guide skill: ${hunter.type}`);
    return [
      {
        id: hunter.type,
        type: "active",
        name: (species.hunterAbility && species.ability) || hunter.label,
        ...copy,
        values: [
          hunter.activeSpeed,
          hunter.effectRadius,
          hunter.effectDuration,
        ],
        windup: hunter.windupDuration,
        recovery: hunter.recoverDuration,
        cooldownMin: hunter.cooldownMin,
        cooldownMax: hunter.cooldownMax,
      },
    ];
  }
  if (["dragon_carp", "gate_dragon"].includes(species.kind))
    return [
      { id: "dragon_gate", type: "passive", ...SPECIAL_SKILLS.dragon_gate },
    ];
  if (["kun", "peng"].includes(species.kind))
    return [
      { id: "soaring_form", type: "passive", ...SPECIAL_SKILLS.soaring_form },
    ];
  if (species.groundbound && species.predator)
    return [
      { id: "ground_leap", type: "active", ...SPECIAL_SKILLS.ground_leap },
    ];
  if (species.kind === "flying_fish")
    return [{ id: "glide", type: "passive", ...SPECIAL_SKILLS.glide }];
  if (species.category === "rare")
    return [
      {
        id: "rare_blessing",
        type: "passive",
        name: species.ability,
        description: species.description,
        counter: species.counter,
      },
    ];
  return [];
}

const LORD_SKILLS = {
  "scylla:volley": {
    description:
      "六颗头从各自吻端依次发射六道水弹。发射方向在蓄势末段锁定，飞行时不追踪，岩礁与残柱可以挡住水弹。",
    counter:
      "预警后持续侧向移动，不要躲过一发就停；六道水弹结束后有4秒恢复期，可接近躯干侧翼。",
  },
  "charybdis:undertow": {
    description:
      "巨口吸入口前84米内的锥形水流，越接近牵引越强，最高20米/秒；侧面与背后不受吸流影响。吞潮后段滞留口前18米内会受到一次32点基础伤害，不会触腕缠绕。",
    counter:
      "2.4秒蓄势时向侧面冲出水流锥，或借礁石截断水路；结束后有4.5秒侧翼反击窗口。",
  },
  "charybdis:surge": {
    description:
      "锁定方向后推出82米宽、26米高的潮墙，最远推进105米。同轮最多造成一次32点基础伤害，实体礁石可以挡住水流。",
    counter:
      "2.4秒蓄势内离开亮起的航道，从两侧、上方或下方绕开潮墙；结束后有4.5秒恢复期。",
  },
  "karkinos:claw": {
    description:
      "抬起两只巨钳，标出头前左右两片65米扇区与22米近身前侧扫区，再合钳造成一次30点基础伤害。远处两钳间隙、背侧与高处可逃生；贴近甲壳不能躲过扫钳，实体礁石可以阻挡攻击。",
    counter: "2.4秒蓄势内让开钳前扇区，退至背侧或上方；合钳后有4.5秒恢复期。",
  },
  "karkinos:fault": {
    description:
      "三条地层压力波依次沿海床向前推进，最远105米。每轮最多造成一次30点基础伤害；三路之间有空隙，上层水域不受冲击。",
    counter:
      "2.6秒蓄势时观察三条亮起的礁道，上浮或穿过间隙，也可借实体礁石遮挡；结束后有4.5秒恢复期。",
  },
  lash: {
    description:
      "锁定约{0}米内的落点，三条发光长腕依次刺出。释放后不再跟踪；实体腕尖每轮最多造成一次{1}点基础伤害，收腕时不追加伤害。",
    counter:
      "光圈锁定后向侧面或上下冲刺，让开三次刺击；岩拱可以阻断触腕。回收长腕后的{2}秒是侧翼反击窗口。",
  },
  water: {
    description:
      "凝聚云水，从龙吻喷出最长{0}米的水息。释放前锁定方向，水流不追踪；同次吐息只造成一次{1}点基础伤害，山石可挡住水路。",
    counter:
      "蓝色水路锁定后，向侧面或上下离开；不要沿水流方向直退。水息散去后的{2}秒可从侧翼反击。",
  },
  vortex: {
    description:
      "预判路线凝聚漩涡，随后游向涡心。越靠近口器，牵引、触腕拉力和体力流失越强；向外拉开距离后逐渐减弱。被长腕缠住后有{2}秒挣脱窗口，未脱身便受到一次{0}点基础绞咬伤害。",
    counter:
      "看到预警就变向冲出涡心，不要等贴近巨口才加速；被缠住后持续向外冲刺，距离越远越容易脱身，也可借岩柱打断触腕。结束后有{1}秒侧翼反击窗口。",
  },
  pulse: {
    description: "蓄力时锁定目标所在的水层，再释放高速扩散的脉冲环。",
    counter: "预警末段上浮或下潜，避开锁定水层；脉冲结束后再切入侧翼。",
  },
  volley: {
    description:
      "三个头依次朝预判位置发射吐息。已发射的弹丸沿直线飞行，不会转弯追踪。",
    counter: "连续横向变向，或用岩石挡住弹丸；不要躲过第一发后就停下。",
  },
  loom: {
    description:
      "分叉腕展开，在锁定水层上下织出三条错层压力带，扫过最远{0}米的扇区。每轮最多造成一次{1}点基础伤害；压力带之间与上方、下方留有空隙。",
    counter:
      "观察带有上下边框的紫色压力带，穿过扇区间隙或升降离开，岩石可提供遮挡。织网后有{2}秒侧翼反击窗口。",
  },
  charge: {
    description: "蓄力末段锁定冲撞方向，随后沿该方向高速突进。",
    counter: "等路线锁定后侧闪，避免直线逃跑；冲锋结束再接近躯干侧面。",
  },
  "sword_sage:swords": {
    description:
      "以剑诀凝出三柄飞剑，依次向主角发射，形成连续的远程压制。飞剑会被山石和建筑阻挡。",
    counter:
      "看到飞剑预警后横向闪避，或绕到山石背后；齐射结束后的恢复期再靠近。",
  },
  "sword_sage:charge": {
    description:
      "脚下巨剑亮起，剑路标出突进方向；真君踏剑沿直线短促冲阵，不会中途转向追踪。",
    counter: "剑路亮起后侧闪或升降，让开冲阵路线；收剑硬直时从侧翼反击。",
  },
  "white_tiger:charge": {
    description:
      "低身蓄势后，以四神兽中最快的速度沿锁定路线跃扑。身体保持直立朝向，跃扑期间不会追着目标转弯。",
    counter: "及时上升或向侧面闪避，避开落点；等白虎落地收势后再攻击。",
  },
  "black_tortoise:pulse": {
    description:
      "玄甲闭合并释放扩散脉冲。蓄势和攻击期间，护甲会同时挡住咬击与鱼雷；甲阵消退后才暴露侧翼。",
    counter: "绕开波纹，不要向闭合的甲阵浪费攻击；在暴露的恢复窗口从侧翼进攻。",
  },
  "vermilion_bird:volley": {
    description:
      "赤金羽冠蓄光，从喙部连续释放三道焰息。朱雀是四神兽中攻击最强的一位。",
    counter: "横向变向躲过连续焰息，利用山石遮挡；齐射后趁收势反击。",
  },
};

const HUNTER_SKILLS = {
  burst: {
    description:
      "蓄势后将速度短暂提升到{0}米/秒，快速缩短距离并尝试迎面或侧后方截击。",
    counter: "观察蓄势动作，横向转弯或绕过实体障碍；突袭结束时再拉开距离。",
  },
  heavy_bite: {
    description:
      "张颌蓄势后向前突进，近身咬击比平常更重；需要真正接触到目标才会伤害。",
    counter: "不要迎面游入张开的巨颌；侧向避开，利用恢复期脱离。",
  },
  ink: {
    description:
      "喷出半径约{1}米、持续{2}秒的墨云，遮蔽附近视线，趁机改变位置。",
    counter: "绕开墨云或向云团边缘游出，恢复视线后再观察目标。",
  },
  lure: {
    description: "强化诱光并在近距离造成持续约{2}秒的视野闪光，趁机靠近捕猎。",
    counter: "诱光开始闪烁时拉开距离，或让岩石挡住视线。",
  },
  shock: {
    description:
      "蓄电后释放近距电击，对无遮挡的约{1}米范围内目标造成18点基础伤害。",
    counter: "看到蓄电预警就离开放电范围，或躲到沉根与河岸后。",
  },
};

const SPECIAL_SKILLS = {
  dragon_gate: {
    name: "跃龙门 · 化龙巡猎",
    description:
      "金鲤在龙门附近抬升跃门，化为24米云龙，暂时获得盘游追猎的形态，随后回归鲤形。",
    counter: "观察跃门的上升与金光前兆；云龙是普通猎手，无法代替道观四神兽。",
  },
  soaring_form: {
    name: "扶摇化鹏",
    description:
      "鲲从云海中抬升，展翼化鹏，以鸟形掠过山脊；结束后收翼回归鲲形，两种形态属于同一个体。",
    counter:
      "避开化形时的前进路线，在侧面观察展翼；不要把两种形态当成两只生物。",
  },
  ground_leap: {
    name: "山径跃击",
    description:
      "猎物靠近且高度可触及时，压低身体蓄势，再沿起跳方向跃扑；空中不会突然翻转或掉头追踪。",
    counter: "看到低身蓄势后上升或侧闪；落地后再接近。",
  },
  glide: {
    name: "破水滑翔",
    description: "遇到逼近的猎手时冲出水面，张开胸鳍滑行一段距离，再落回水中。",
    counter: "提前从水下蓄速，沿它的滑行方向截获；浮在水面才冲刺无法跃起。",
  },
};
