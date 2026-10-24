import * as THREE from "three";
import { acquireBermudaWreckAsset } from "./bermuda_wreck_asset.js";

/** 新构件只替换薄壁外观，旧船身、开放通路及碰撞顺序由原工厂继续维护。 */
export function createBermudaWreckSkins(builder, root) {
  const kinds = [
      "wreck_funnel",
      "wreck_window",
      "wreck_boiler",
      "liner_sofa",
      "liner_bed",
      "liner_wardrobe",
      "liner_trunk",
    ],
    leases = new Map(
      kinds.map((kind) => [kind, acquireBermudaWreckAsset(kind)]),
    ),
    placements = [];
  let disposed = false;
  function add(kind, center, size, rotation = [0, 0, 0]) {
    const asset = leases.get(kind),
      geometry = asset.geometry.clone();
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox,
      middle = bounds.getCenter(new THREE.Vector3()),
      extent = bounds.getSize(new THREE.Vector3());
    // 独立离线源已按正面 +Z 校正；这里仅适配旧构件的可见空间包络。
    geometry.translate(-middle.x, -middle.y, -middle.z);
    geometry.scale(size[0] / extent.x, size[1] / extent.y, size[2] / extent.z);
    builder.add(geometry, asset.material, center, rotation);
    placements.push({
      kind,
      center: [...center],
      size: [...size],
      rotation: [...rotation],
    });
  }
  const prepare = async (options) =>
    Promise.all([...leases.values()].map((a) => a.prepare(options)));
  root.userData.prepareMaterials = prepare;
  root.userData.wreckArt = {
    placements,
    assets: [...leases.values()],
    revision: "bermuda_liner_furnishings_hf_20261023",
  };
  // 正常进图必须主动加载；图鉴和测试调用不能成为贴图加载的唯一入口。
  prepare().catch(() => {});
  return {
    add,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const asset of leases.values()) asset.release();
      leases.clear();
    },
  };
}
