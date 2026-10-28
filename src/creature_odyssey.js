import {
  ODYSSEY_HF_FINAL,
  buildOdysseyFinalHF,
} from "./creature_odyssey_final_hf.js";
import {
  ODYSSEY_HF_PEOPLE,
  buildOdysseyPeopleHF,
} from "./creature_odyssey_people_hf.js";
import {
  ODYSSEY_HF_DEEP,
  buildOdysseyDeepHF,
} from "./creature_odyssey_deep_hf.js";
import {
  ODYSSEY_HF_LARGE,
  buildOdysseyLargeHF,
} from "./creature_odyssey_large_hf.js";
import {
  ODYSSEY_HF_GARDEN,
  buildOdysseyGardenHF,
} from "./creature_odyssey_garden_hf.js";
import {
  ODYSSEY_EXTRA_KINDS,
  buildOdysseyExtra,
} from "./creature_odyssey_extra.js";
import * as THREE from "three";
import {
  ODYSSEY_HF_SHALLOWS,
  buildOdysseyShallowHF,
} from "./creature_odyssey_shallow_hf.js";
import { createRestPoseNormalizer } from "./rest_pose_normalization.js";
import { buildOdysseyShallows } from "./creature_odyssey_shallows.js";
import { buildOdysseyPeople } from "./creature_odyssey_people.js";
import { buildOdysseyHunters } from "./creature_odyssey_hunters.js";
import { buildOdysseyLord } from "./creature_odyssey_lords.js";
import { buildKarkinos } from "./creature_odyssey_crab.js";
import {
  ODYSSEY_HF_LORDS,
  buildOdysseyLordHF,
} from "./creature_odyssey_lords_hf.js";

/** 新海域所有生物共用真实世界与图鉴工厂；普通种、三领主及独有珍兽互不借用旧轮廓。 */
export const ODYSSEY_CREATURE_KINDS = new Set([
  "ambrosia_sprat",
  "moon_scallop",
  "lyre_ray",
  "pearl_seahorse",
  "nereid",
  "hippocampus",
  "triton_guard",
  "siren_eel",
  "naga_huntress",
  "ketos",
  "bronze_turtle",
  "abyss_lamprey",
  "oracle_whale",
  "ceto_serpent",
  "scylla",
  "charybdis",
  "karkinos",
  "golden_argonaut",
  ...ODYSSEY_EXTRA_KINDS,
]);
const normalizeRestPose = createRestPoseNormalizer();
const SHALLOWS = new Set([
    "ambrosia_sprat",
    "moon_scallop",
    "lyre_ray",
    "pearl_seahorse",
    "golden_argonaut",
  ]),
  PEOPLE = new Set([
    "nereid",
    "hippocampus",
    "triton_guard",
    "siren_eel",
    "naga_huntress",
  ]);
/**
 * 创建 -Z 朝前、Y 朝上的归一化神话生物，调用方按真实体长统一缩放。
 * @param {string} kind 该区域的物种标识。
 * @param {THREE.Group} root 空的调用方模型根，动画不能改变它的位置。
 * @param {Function[]} motions 主循环驱动的实例动作列表。
 * @returns {void} 附加共享几何、独立骨架和随真实头部移动的嘴锚点。
 */
export function buildOdysseyCreature(kind, root, motions) {
  if (ODYSSEY_HF_FINAL.has(kind))
    return buildOdysseyFinalHF(kind, root, motions);
  if (ODYSSEY_HF_PEOPLE.has(kind))
    return buildOdysseyPeopleHF(kind, root, motions);
  if (ODYSSEY_HF_DEEP.has(kind)) return buildOdysseyDeepHF(kind, root, motions);
  if (ODYSSEY_HF_LARGE.has(kind))
    return buildOdysseyLargeHF(kind, root, motions);
  if (ODYSSEY_HF_GARDEN.has(kind))
    return buildOdysseyGardenHF(kind, root, motions);
  if (ODYSSEY_HF_SHALLOWS.has(kind))
    return buildOdysseyShallowHF(kind, root, motions);
  if (ODYSSEY_HF_LORDS.has(kind))
    return buildOdysseyLordHF(kind, root, motions);
  if (!ODYSSEY_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown Odyssean creature: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_odyssean_anatomy`;
  root.add(body);
  if (ODYSSEY_EXTRA_KINDS.has(kind)) buildOdysseyExtra(kind, body, motions);
  else if (SHALLOWS.has(kind)) buildOdysseyShallows(kind, body, motions);
  else if (PEOPLE.has(kind)) buildOdysseyPeople(kind, body, motions);
  else if (kind === "karkinos") buildKarkinos(body, motions);
  else if (kind === "scylla" || kind === "charybdis")
    buildOdysseyLord(kind, body, motions);
  else buildOdysseyHunters(kind, body, motions);
  normalizeRestPose(body, kind);
  root.userData.normalizedLength = 1;
  root.userData.odysseyAnatomy = kind;
  // 人形和海神马转向保持背侧朝上，避免反向升降时最短弧旋转翻身。
  if (PEOPLE.has(kind)) root.userData.aquaticUpright = true;
  root.userData.mouthAnchors = body.userData.mouthAnchors || [];
  root.userData.combatAnchor = body.userData.combatAnchor;
  root.userData.anatomy = body.userData.anatomy;
  if (kind === "karkinos") {
    root.userData.clawAnchors = body.userData.clawAnchors;
    root.userData.clawInnerAnchors = body.userData.clawInnerAnchors;
    root.userData.setKarkinosCombat = body.userData.setKarkinosCombat;
    root.userData.karkinosRig = body.userData.karkinosRig;
    for (const key of [
      "fitKarkinosTerrain",
      "karkinosFootAnchors",
      "karkinosFootRestPositions",
      "karkinosGrounding",
      "karkinosGroundingContract",
    ])
      root.userData[key] = body.userData[key];
  }
}
