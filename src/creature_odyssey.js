import {
  ODYSSEY_EXTRA_KINDS,
  buildOdysseyExtra,
} from "./creature_odyssey_extra.js";
import * as THREE from "three";
import { buildOdysseyShallows } from "./creature_odyssey_shallows.js";
import { buildOdysseyPeople } from "./creature_odyssey_people.js";
import { buildOdysseyHunters } from "./creature_odyssey_hunters.js";
import { buildOdysseyLord } from "./creature_odyssey_lords.js";
import { buildKarkinos } from "./creature_odyssey_crab.js";

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
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body),
    size = bounds.getSize(new THREE.Vector3()),
    scale = 1 / size.z;
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
  root.userData.odysseyAnatomy = kind;
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
