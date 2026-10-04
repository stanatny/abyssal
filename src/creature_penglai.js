import { PENGLAI_TRANSFORMATION_FORMS } from "./penglai_transformation_species.js";
import { buildKunPeng } from "./creature_penglai_kun.js";
import * as THREE from "three";
import { pgBakeStatic } from "./creature_penglai_art.js";
import { PENGLAI_SPECIES } from "./penglai_species.js";
import { PENGLAI_LORDS } from "./penglai_lords.js";
import { buildPenglaiFish } from "./creature_penglai_fish.js";
import { buildPenglaiBird } from "./creature_penglai_birds.js";
import { buildPenglaiTiger } from "./creature_penglai_tiger.js";
import { buildPenglaiBeast } from "./creature_penglai_beasts.js";
import { buildPenglaiDragon } from "./creature_penglai_dragons.js";
import { buildPenglaiSpecial } from "./creature_penglai_special.js";
export const PENGLAI_CREATURE_KINDS = new Set(
  [...PENGLAI_SPECIES, ...PENGLAI_TRANSFORMATION_FORMS, ...PENGLAI_LORDS].map(
    (s) => s.kind,
  ),
);
const normalization = new Map();
/** 神话模型与图鉴共用工厂；统一全长、头向 -Z、独立关节动作。 */
export function buildPenglaiCreature(kind, root, motions) {
  const b = new THREE.Group();
  b.name = kind + "_mythic_anatomy";
  root.add(b);
  if (["kun", "peng"].includes(kind)) buildKunPeng(kind, b, motions);
  else if (["cloud_crane", "bifang", "gudiao", "vermilion_bird"].includes(kind))
    buildPenglaiBird(kind, b, motions);
  else if (kind === "white_tiger") buildPenglaiTiger(b, motions, root);
  else if (["lushu", "nine_tail_fox", "zheng", "kui"].includes(kind))
    buildPenglaiBeast(kind, b, motions);
  else if (["bashe", "hujiao", "azure_dragon", "gate_dragon"].includes(kind))
    buildPenglaiDragon(kind, b, motions);
  else if (
    ["xuangui", "black_tortoise", "sword_sage", "lotus_sprite"].includes(kind)
  )
    buildPenglaiSpecial(kind, b, motions, root);
  else buildPenglaiFish(kind, b, motions);
  pgBakeStatic(b, kind);
  b.updateMatrixWorld(true);
  // 旋转的护阵和翼鳍不能用松散包围盒缩小主体；精确顶点测量每种只做一次。
  if (!normalization.has(kind)) {
    const bounds = new THREE.Box3().setFromObject(b, true);
    normalization.set(kind, {
      factor: 1 / bounds.getSize(new THREE.Vector3()).z,
      center: bounds.getCenter(new THREE.Vector3()),
      groundSupport:
        bounds.getSize(new THREE.Vector3()).y /
        bounds.getSize(new THREE.Vector3()).z /
        2,
    });
  }
  const { factor, center } = normalization.get(kind);
  b.scale.setScalar(factor);
  b.position.copy(center).multiplyScalar(-factor);
  const head = b.userData.headAnchor || root.userData.headAnchor;
  if (head) {
    const p = head.clone().multiplyScalar(factor).add(b.position);
    root.userData.getHeadWorldPositions = () => [root.localToWorld(p.clone())];
  }
  if (b.userData.mouthAnchors)
    root.userData.mouthAnchors = b.userData.mouthAnchors;
  root.userData.groundSupport = normalization.get(kind).groundSupport;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "penglai_v2";
  root.userData.mythicAnatomy = kind;
}
