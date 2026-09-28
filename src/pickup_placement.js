/**
 * 夏威夷育幼浅滩的固定狂食补给点；独立于随机奖励池，不改变奖励效果或重生时长。
 * 位于出生点同水深、前方约41米处，靠近第一圈鱼群，留出主动发现和接近的距离。
 * 地形净空、漂浮包络与出生路线由真实海床/碰撞回归测试校验，不能在重开时随机改点。
 */
export const NURSERY_FRENZY_PICKUP = Object.freeze({
  id: "nursery_frenzy",
  regionId: "hawaii",
  kind: "frenzy",
  position: Object.freeze({ x: 6, y: -18, z: 34 }),
});

/**
 * 返回固定浅滩补给的新坐标对象；其他海域返回null，避免未来场景误用夏威夷坐标。
 * @param {string} regionId 当前海域标识，默认夏威夷。
 * @returns {{x:number,y:number,z:number}|null} 未受漂浮或上轮游戏影响的基础位置。
 */
export function nurseryFrenzyPosition(regionId = "hawaii") {
  return regionId === NURSERY_FRENZY_PICKUP.regionId
    ? { ...NURSERY_FRENZY_PICKUP.position }
    : null;
}
