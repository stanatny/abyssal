import * as THREE from "three";
import { PENGLAI_WORLD, penglaiHeightAt } from "./penglai_config.js";

// 每条探索支路保留独立抽样槽，避免随机奖励回落并挤在育幼湾或封闭道观内。
const routes = [
  [-90, -150, "water"],
  [85, -215, "water"],
  [-100, -285, "water"],
  [145, -310, "air"],
  [-190, -385, "air"],
  [220, -415, "air"],
  [-300, -510, "air"],
  [325, -535, "air"],
  [-380, -660, "air"],
  [390, -720, "air"],
  [-260, -810, "air"],
  [275, -880, "air"],
  [-85, -1035, "water"],
  [85, -1100, "water"],
  [-180, -1000, "air"],
  [205, -1160, "air"],
  [-320, -1240, "air"],
  [315, -1280, "air"],
];

export const PENGLAI_REWARD_HABITAT = Object.freeze({
  depthMin: -PENGLAI_WORLD.maxAltitude,
  depthMax: PENGLAI_WORLD.maxDepth - 30,
});

/** 为随机奖励选取分散的水陆空探索点；index为入门奖励之后的稳定序号。 */
export function penglaiRewardAnchor(random = Math.random, index = 0) {
  const [x, z, medium] = routes[index % routes.length];
  const px = x + (random() - 0.5) * 22,
    pz = z + (random() - 0.5) * 22,
    floor = penglaiHeightAt(px, pz);
  const py =
    medium === "water"
      ? Math.max(-18 + (random() - 0.5) * 6, floor + 8)
      : Math.max(30, floor + 32) + random() * 12;
  return new THREE.Vector3(px, py, pz);
}
