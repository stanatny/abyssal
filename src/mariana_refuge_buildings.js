import * as THREE from "three";
import { acquireMarianaRefugeAsset } from "./mariana_refuge_asset.js";
import contacts from "./assets/models/mariana_refuge_contacts.json" with { type: "json" };

export const MARIANA_REFUGE_BUILDINGS = Object.freeze({
  pineapple: {
    center: [-52, -19.5],
    width: 31,
    depth: 31,
    height: 49,
    base: 9,
    yaw: 0,
  },
  stoneface: {
    center: [54, -20],
    width: 28,
    depth: 27,
    height: 39,
    base: 10,
    yaw: 0,
  },
  rockhouse: {
    center: [-53, -57],
    width: 34,
    depth: 32,
    height: 20,
    base: 6,
    yaw: 0,
  },
  restaurant: {
    center: [52, 64],
    width: 39,
    depth: 32,
    height: 32,
    base: 10,
    yaw: Math.PI,
  },
});

/** 用统一比例拟合已存在的四个街区占地，接触来自同一个可见网格而不是旧盒体。 */
export function addMarianaRefugeBuildings(root, keep, origin, colliders) {
  const assets = new Map(),
    placements = [];
  const owner = {
    assets,
    placements,
    dispose() {
      for (const a of assets.values()) a.release();
      assets.clear();
    },
  };
  keep(owner);
  root.userData.refugeBuildings = owner;
  for (const [kind, spec] of Object.entries(MARIANA_REFUGE_BUILDINGS)) {
    const a = acquireMarianaRefugeAsset(kind);
    assets.set(kind, a);
    const size = a.geometry.boundingBox.getSize(new THREE.Vector3()),
      center = a.geometry.boundingBox.getCenter(new THREE.Vector3());
    const scale = Math.min(
        spec.width / size.x,
        spec.depth / size.z,
        spec.height / size.y,
      ),
      rotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        spec.yaw,
      );
    const translation = new THREE.Vector3(
      spec.center[0],
      spec.base - a.geometry.boundingBox.min.y * scale - 0.12,
      spec.center[1],
    );
    const horizontal = new THREE.Vector3(center.x, 0, center.z)
      .multiplyScalar(scale)
      .applyQuaternion(rotation);
    translation.sub(horizontal);
    const mesh = new THREE.Mesh(a.geometry, a.material);
    mesh.name = `refuge_${kind}_house_hf`;
    mesh.position.copy(translation);
    mesh.quaternion.copy(rotation);
    mesh.scale.setScalar(scale);
    root.add(mesh);
    const ids = [];
    for (const [index, box] of contacts[kind].boxes.entries()) {
      const c = new THREE.Vector3(...box.center)
          .multiplyScalar(scale)
          .applyQuaternion(rotation)
          .add(translation)
          .add(origin),
        id = `refuge_hf_${kind}_${index}`;
      colliders.push({
        type: "box",
        id,
        x: c.x,
        y: c.y,
        z: c.z,
        halfSize: new THREE.Vector3(...box.size).multiplyScalar(scale * 0.5),
        rotation: rotation.clone(),
      });
      ids.push(id);
    }
    placements.push({
      kind,
      scale,
      position: translation.toArray(),
      yaw: spec.yaw,
      colliderIds: ids,
      base: spec.base,
    });
  }
  return owner;
}
