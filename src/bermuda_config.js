import { WORLD } from "./world_config.js";

/** 百慕大单独展开外海，不改变其他海域、出生浅滩与四倍显示深度。 */
export const BERMUDA_WORLD = Object.freeze({
  ...WORLD,
  minX: -500,
  maxX: 500,
  minZ: -1760,
  maxZ: 140,
});
