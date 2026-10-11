/** 仅保留最近离开的一张地图；当前种群由主循环持有，不放入闲置缓存。 */
export const INACTIVE_POPULATION_LIMIT = 1;

/** 实例骨骼/珍兽材质/预警环可销毁，共享生物几何与表面缓存不能逐实例释放。 */
export function disposePopulation(population) {
  const skeletons = new Set();
  for (const entity of population) {
    entity.mesh.removeFromParent();
    entity.mesh.traverse((part) => {
      if (part.skeleton) skeletons.add(part.skeleton);
      if (part.userData.penglaiTigerSkeleton)
        skeletons.add(part.userData.penglaiTigerSkeleton);
      if (part.userData.tentacleSkeleton)
        skeletons.add(part.userData.tentacleSkeleton);
    });
    entity.mesh.userData.disposeRareShimmer?.();
    if (entity.telegraph) {
      entity.telegraph.removeFromParent();
      entity.telegraph.geometry.dispose();
      entity.telegraph.material.dispose();
    }
  }
  for (const skeleton of skeletons) skeleton.dispose();
  population.length = 0;
}

/** 必须在切图事务结束后调用，确保待回退的旧场景不被提前释放。 */
export function trimPopulationCache(cache, limit = INACTIVE_POPULATION_LIMIT) {
  while (cache.size > limit) {
    const oldest = cache.keys().next().value;
    disposePopulation(cache.get(oldest));
    cache.delete(oldest);
  }
}
