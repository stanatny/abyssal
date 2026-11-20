import * as THREE from "three";
import { acquireBermudaWreckAsset } from "./bermuda_wreck_asset.js";
import { funnelShellContacts } from "./bermuda_funnel_contact.js";

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
    placements = [],
    colliders = [],
    funnelTemplates = new Map();
  let funnelIndex = 0;
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
    if (kind === "wreck_funnel") {
      const key = size.join(",");
      if (!funnelTemplates.has(key))
        funnelTemplates.set(key, funnelShellContacts(geometry));
      const pose = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...rotation),
      );
      for (const contact of funnelTemplates.get(key)) {
        const point = contact.center
          .clone()
          .applyQuaternion(pose)
          .add(new THREE.Vector3(...center))
          .add(root.position);
        colliders.push({
          type: "box",
          id: `${root.name}_funnel_${funnelIndex}_${contact.id}`,
          x: point.x,
          y: point.y,
          z: point.z,
          halfSize: contact.halfSize.clone(),
          rotation: pose.clone().multiply(contact.rotation),
        });
      }
      funnelIndex++;
    }
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
    colliders,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const asset of leases.values()) asset.release();
      leases.clear();
      funnelTemplates.clear();
      colliders.length = 0;
    },
  };
}
