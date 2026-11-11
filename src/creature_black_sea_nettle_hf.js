import * as THREE from "three";
import {
  blackSeaNettleAsset,
  BLACK_SEA_NETTLE_ARMS,
  BLACK_SEA_NETTLE_DIMENSIONS,
} from "./black_sea_nettle_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  nearestChain,
} from "./hawaii_lord_rig.js";
const point = new THREE.Vector3();

/** 以真实伞径定标的大型海荨麻；四条口腕各有独立延迟波，根部始终连在伞内。 */
export function buildBlackSeaNettleHF(root, motions) {
  const anatomy = new THREE.Group();
  anatomy.name = "black_sea_nettle_anatomy";
  root.add(anatomy);
  root.userData.aquaticUpright = true;
  const chains = [
    { name: "black_nettle_bell", type: "bell", points: [[0, 0, 0]] },
    ...BLACK_SEA_NETTLE_ARMS.map((points, i) => ({
      name: `black_nettle_oral_arm_${i}`,
      type: "arm",
      points: points.map((p) => [...p]),
    })),
  ];
  const bones = createLordBones(anatomy, chains),
    bell = bones[chains[0].ids[0]],
    arms = chains.slice(1);
  bones[0].name = "black_sea_nettle_root";
  // 首节直接继承伞的脉冲，不能让口腕悬在缩放后的伞体下方。
  for (const arm of arms) bell.add(bones[arm.ids[0]]);
  const asset = blackSeaNettleAsset((x, y, z, ids, weights, offset) => {
    point.set(x, y, z);
    let selected = arms[0],
      distance = Infinity;
    for (const arm of arms) {
      const d = nearestChain(point, arm).distance;
      if (d < distance) {
        distance = d;
        selected = arm;
      }
    }
    const blend = THREE.MathUtils.smoothstep(-y, 0.3, 0.57);
    chainWeights(selected, point, blend, ids, weights, offset);
    // 混合的母体是实际伞骨而不是不变的世界根骨。
    ids[offset] = chains[0].ids[0];
  });
  const mesh = bindOrganicBody(
    anatomy,
    "black_sea_nettle_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.45,
  );
  root.userData.hfRig = {
    kind: "black_sea_nettle",
    chains,
    bones,
    mesh,
    skins: [mesh],
  };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_black_sea_nettle_20261111";
  root.userData.wildlifeAnatomy =
    "Chrysaora achlyos / substantive purple bell, four source frilled oral arms, source marginal tentacles";
  root.userData.anatomyDimensions = BLACK_SEA_NETTLE_DIMENSIONS;
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  motions.push((t) => {
    const pulse = Math.sin(t * 1.05);
    bell.scale.set(1 + pulse * 0.04, 1 - pulse * 0.07, 1 + pulse * 0.04);
    for (let i = 0; i < arms.length; i++)
      arms[i].ids.forEach((id, joint) => {
        bones[id].rotation.x =
          Math.sin(t * 0.65 - joint * 0.5 + i * 1.1) * 0.019;
        bones[id].rotation.z =
          Math.cos(t * 0.59 - joint * 0.43 + i * 1.1) * 0.023;
      });
  });
}
