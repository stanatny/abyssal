import { createOdysseyWeapon } from "./odyssey_weapon_hf_asset.js";

/** 贝壳青铜戟保留原来的握持点；模型沿手骨运动，不参与碰撞。 */
export function createTritonTrident() {
  return createOdysseyWeapon("triton_trident");
}
