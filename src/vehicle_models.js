import { createHawaiiVehicleModel } from "./vehicle_hf_models.js";
import { tr } from "./i18n.js";
import { WORLD } from "./world_config.js";
import { createArticulatedHuman } from "./human_models.js";
import { createContactMine } from "./contact_mine.js";
import { createAttackTorpedoModel } from "./submarine_defense.js";
import { HUMAN_RULES, SUBMARINE_DEFENSE_RULES } from "./human_rules.js";

/** 图鉴与场景共用的成人、潜艇与水雷资料；人类角色全部为成年人。 */
export const HUMAN_CATALOG = Object.freeze([
  {
    id: "attack_torpedo",
    kind: "attack_torpedo",
    name: "潜艇直航鱼雷",
    latin: "STRAIGHT-RUNNING TORPEDO",
    category: "human",
    role: "潜艇反击",
    color: "#c0d6d9",
    length: 3,
    size: "3 m",
    habitat: "潜艇附近水域",
    ability: "预警后直航",
    get text() {
      const r = SUBMARINE_DEFENSE_RULES;
      return tr`潜艇会对靠近的${r.minimumLength}米以上角色锁定${r.windup}秒，再以${r.speed}米/秒发射直航鱼雷。命中损失${r.damage}生命；每次发射后冷却${r.cooldown}秒，再重新锁定。鱼雷最多航行${r.lifetime}秒，不能被吞食。`;
    },
    counter:
      "观察闪烁的艇灯和预警；发射后横向闪避，或利用礁石与建筑阻挡。安全浅滩与幼体不会被锁定。",
  },
  {
    id: "swimmer",
    kind: "swimmer",
    name: "成年游泳者",
    latin: "ADULT SWIMMER",
    category: "human",
    role: "浅滩活动",
    color: "#ffbb8c",
    length: 1.9,
    size: "1.9 m",
    habitat: "海面附近",
    ability: "浅滩游泳",
    text: "浅滩中男女成年游泳者均会出现；男性穿泳裤，女性穿连体泳衣，接触可自动捕食。",
    counter: "小型食物提供少量营养；体型变大后，应寻找更有营养的猎物。",
  },
  {
    id: "diver",
    kind: "diver",
    name: "成年潜水员",
    latin: "ADULT DIVER",
    category: "human",
    role: "水下探索",
    color: "#ffe18a",
    length: 2.4,
    size: "2.4 m",
    get habitat() {
      return tr`${25 * WORLD.displayDepthScale}—${100 * WORLD.displayDepthScale} m / 潜艇周围`;
    },
    ability: "潜水探索",
    text: "男女成年潜水员均会出现，佩戴面镜、氧气瓶和脚蹼。潜艇被撞破后，也会有男女潜水员分散游出。",
    counter: "刚逃出潜艇时有短暂保护；离开艇壳后再接近捕食。",
  },
  {
    id: "submarine",
    kind: "submarine",
    name: "深海潜艇",
    latin: "DEEP SEA SUBMARINE",
    category: "human",
    role: "可破坏载具",
    color: "#e1bd78",
    length: 18,
    size: "18 m",
    habitat: `${180 * WORLD.displayDepthScale}—${400 * WORLD.displayDepthScale} m`,
    ability: "耐压艇壳",
    text: "潜艇不能被直接吞食。角色达到18米后，以至少20米/秒的速度完成三次独立冲撞，才能破坏艇壳并释放三名潜水员。海面小船需一次撞击，大型船需三次；船体破坏后停止阻挡，不提供额外食物。",
    counter:
      "每次撞击后需要离开艇壳再冲刺接近。潜艇会预警后发射直航鱼雷；横向闪避或借实体掩护。贴着潜艇游动不会连续造成伤害。",
  },
  {
    id: "torpedo",
    kind: "torpedo",
    name: "接触水雷",
    latin: "CONTACT MINE",
    category: "human",
    role: "深海危险物",
    color: "#ff826e",
    length: 3.6,
    size: "3.6 m",
    habitat: "外礁与深水雷区",
    ability: "接触爆炸",
    get text() {
      return tr`有水雷的海域会分布${HUMAN_RULES.torpedoCount}枚接触水雷，在外礁与深水形成上下错落的立体雷区。球壳带触角、红色警示灯和警示环；接触后爆炸消失，基础伤害${HUMAN_RULES.torpedoDamage}点，不能吞食。`;
    },
    counter:
      "发现密集红色警示环时，沿雷区外侧或从上方绕行。水雷不会主动追踪角色；不要从密集雷体之间强行穿过。",
  },
]);

/**
 * 创建可复用的人类活动模型，头部朝向局部 -Z，length 使用世界长度。
 * @param {'swimmer'|'diver'|'submarine'|'torpedo'} kind 模型种类。
 * @param {number} length 目标总长。
 * @param {'male'|'female'} sex 成年人物外观，载具忽略此参数。
 * @returns {THREE.Group} 含 animate(time)、dispose() 的有限资源模型。
 */
export function createHumanModel(kind, length = 1, sex = "male") {
  if (kind === "attack_torpedo") return createAttackTorpedoModel(length);
  if (kind === "swimmer" || kind === "diver")
    return createArticulatedHuman(kind, length, sex);
  if (kind === "torpedo") return createContactMine(length);
  if (kind === "submarine") return createHawaiiVehicleModel(kind, length);
  throw new Error(`Unknown human activity model: ${kind}`);
}
