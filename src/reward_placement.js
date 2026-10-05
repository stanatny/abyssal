import * as THREE from "three";
import { habitatPosition } from "./ecosystem_population.js";
import { REWARD_PLACEMENT } from "./reward_config.js";

/**
 * 选择随机补给的真实合法位置，不回退到靠近出生点的通用物种锚点。
 * @param {number} index 入门奖励之后的稳定序号，供区域路径分槽。
 * @param {object} options 区域世界、海床、实体、专属锚点与随机源。
 * @returns {THREE.Vector3|null} 最终合法位置；有限尝试失败时明确省略本枚奖励。
 */
export function randomRewardPosition(
  index,
  {
    world,
    heightAt,
    colliders = [],
    rewardHabitat = {},
    rewardAnchor,
    random = Math.random,
  },
) {
  const habitat = {
    depthMin: 20,
    depthMax: world.maxDepth - 30,
    ...rewardHabitat,
    length: 2,
    worldBounds: world,
  };
  for (let attempt = 0; attempt < REWARD_PLACEMENT.attempts; attempt++) {
    const anchor = rewardAnchor
      ? rewardAnchor(random, index)
      : new THREE.Vector3(
          world.minX + 18 + random() * (world.maxX - world.minX - 36),
          -20 - random() * (world.maxDepth - 50),
          world.minZ + 18 + random() * (world.maxZ - world.minZ - 36),
        );
    if (!anchor) continue;
    const point = habitatPosition(habitat, {
      heightAt,
      colliders,
      anchor,
      random,
    });
    if (!point) continue;
    return point;
  }
  return null;
}
