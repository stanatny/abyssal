import * as THREE from "three";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { acquireBermudaRigAsset } from "./bermuda_rig_asset.js";

/** 原支脚平面与碰撞顺序保留；坡地基础覆盖完整足迹，资源由船队所有者释放。 */
export function createBermudaOilRig(
  m,
  keep,
  heightAt = () => -370,
  site = [210, 4, -450],
) {
  const root = new THREE.Group();
  root.name = "bermuda_offshore_oil_rig";
  const origin = new THREE.Vector3(...site);
  root.position.copy(origin);
  const b = createBermudaBuilder(root, keep, origin);
  for (const x of [-16, 16])
    for (const z of [-20, 20]) {
      let low = Infinity,
        high = -Infinity;
      // 脚垫宽十米，不能只取中心高度，否则倾斜海床会露出悬空底面。
      for (let dx = -5; dx <= 5; dx += 0.5)
        for (let dz = -5; dz <= 5; dz += 0.5) {
          const y = heightAt(origin.x + x + dx, origin.z + z + dz) - origin.y;
          low = Math.min(low, y);
          high = Math.max(high, y);
        }
      const base = low - (high - low > 0.000001 ? 0.15 : 0),
        top = high + 4;
      b.box(m.steel, [x, (base + 15) / 2, z], [4.5, 15 - base, 4.5], true);
      b.box(m.rust, [x, (base + top) / 2, z], [10, top - base, 10], true);
      for (let y = base + 20; y < 13; y += 28) {
        // 支撑斜杆止于甲板底部，不能像旧版一样刺穿上层设备。
        const top = Math.min(y + 24, 13);
        b.beam(m.rust, [x - 2, y, z], [x + 2, top, z], 0.25);
        b.beam(m.rust, [x + 2, y, z], [x - 2, top, z], 0.25);
      }
      // 接缝压条贴合原方柱，不扩大可游通道的实体阻挡。
      for (const y of [-14, -5, 6, 12])
        for (const side of [-1, 1]) {
          b.box(m.rust, [x + side * 2.26, y, z], [0.06, 0.22, 4.5]);
          b.box(m.rust, [x, y, z + side * 2.26], [4.5, 0.22, 0.06]);
        }
    }
  // 生成上层的不可见底面有开口，用真实承重底板闭合，板面与原网格错开。
  b.box(m.steel, [0, 13.2, 0], [48, 0.4, 55]);
  const colliders = b.finish();
  // 上层改为真实生成网格；碰撞盒仍与原来顺序、坐标、尺寸完全相同。
  for (const [center, size] of [
    [
      [0, 15, 0],
      [48, 3, 55],
    ],
    [
      [-13, 21, 5],
      [14, 10, 25],
    ],
  ]) {
    colliders.push({
      type: "box",
      id: `${root.name}_${colliders.length}`,
      x: center[0] + origin.x,
      y: center[1] + origin.y,
      z: center[2] + origin.z,
      halfSize: new THREE.Vector3(...size).multiplyScalar(0.5),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
  }
  const asset = acquireBermudaRigAsset();
  keep({ dispose: asset.release });
  const topside = new THREE.Mesh(asset.geometry, asset.material);
  topside.name = "bermuda_oil_rig_hf_topside";
  root.add(topside);
  root.userData.prepareMaterials = asset.prepare;
  root.userData.rigArt = {
    topside,
    source: "TRELLIS.2",
    revision: "oil_rig_hf_v1",
  };
  asset.prepare();
  return { root, colliders };
}
