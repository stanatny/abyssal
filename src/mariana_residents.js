import * as THREE from "three";
import { acquireMarianaResidentAsset } from "./mariana_resident_asset.js";

const specifications = {
  sponge: {
    name: "yellow_sponge_easter_egg",
    center: [-48, 30],
    height: 9.8125,
    width: 7.9,
    depth: 4.0,
  },
  starfish: {
    name: "refuge_starfish_resident",
    center: [-74, -25],
    height: 11.9312,
    width: 11.12,
    depth: 5.1,
  },
  snail: {
    name: "refuge_snail_resident",
    center: [-33, 32],
    height: 6.45,
    width: 9.2,
    depth: 4.67,
  },
};

/** 只替换终点三位居民的外观；位置、静态接触、胜利球和供光均沿用现有契约。 */
export function addMarianaResidents(root, keep, origin, colliders) {
  const assets = new Map(),
    instances = [];
  let disposed = false;
  const owner = {
    assets,
    instances,
    update(t) {
      if (disposed) return;
      for (const item of instances) {
        const [a, b] = item.bones;
        if (item.kind === "sponge") {
          a.rotation.z = Math.sin(t * 0.75) * 0.035;
          b.rotation.z = Math.sin(t * 1.4) * 0.16;
          b.rotation.x = Math.sin(t * 0.7) * 0.025;
        } else if (item.kind === "starfish") {
          a.rotation.z = -Math.sin(t * 1.05) * 0.055;
          b.rotation.z = Math.sin(t * 1.05) * 0.055;
        } else {
          a.rotation.z = Math.sin(t * 0.65) * 0.055;
          b.rotation.z = Math.sin(t * 0.65 + 0.6) * 0.055;
          a.rotation.x = Math.sin(t * 0.48) * 0.06;
          b.rotation.x = Math.sin(t * 0.48 + 0.7) * 0.06;
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const i of instances) i.mesh.skeleton.dispose();
      for (const a of assets.values()) a.release();
      assets.clear();
    },
  };
  keep(owner);
  root.userData.refugeResidents = owner;
  for (const [kind, spec] of Object.entries(specifications)) {
    const a = acquireMarianaResidentAsset(kind);
    assets.set(kind, a);
    const group = new THREE.Group();
    group.name = spec.name;
    const mesh = new THREE.SkinnedMesh(a.geometry, a.material);
    mesh.name = `${kind}_resident_skin`;
    const base = new THREE.Bone(),
      bones = a.joints.map((p, i) => {
        const bone = new THREE.Bone();
        bone.name = `${kind}_appendage_${i}`;
        bone.position.fromArray(p);
        base.add(bone);
        return bone;
      });
    group.add(base, mesh);
    for (const extra of a.details)
      group.add(new THREE.Mesh(extra.geometry, extra.material));
    group.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton([base, ...bones]));
    const bounds = a.geometry.boundingBox,
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(
      spec.width / size.x,
      spec.height / size.y,
      spec.depth / size.z,
    );
    group.scale.setScalar(scale);
    group.position.set(
      spec.center[0] - center.x * scale,
      6.01 - bounds.min.y * scale,
      spec.center[1] - center.z * scale,
    );
    root.add(group);
    instances.push({ kind, group, mesh, bones, scale });
    // 共享缓存只持有网格、材质与贴图；骨架及其 GPU 数据由各场景独立释放。
    mesh.boundingSphere = new THREE.Sphere(
      bounds.getCenter(new THREE.Vector3()),
      bounds.getSize(new THREE.Vector3()).length() * 0.58,
    );
  }
  colliders.push({
    type: "ellipsoid",
    id: "refuge_sponge",
    x: -48,
    y: origin.y + 11.1,
    z: origin.z + 30,
    axes: new THREE.Vector3(4, 5.1, 3),
  });
  for (const [id, c, axes] of [
    ["refuge_starfish", [-74, 6, -25], [4.6, 6, 2.7]],
    ["refuge_snail", [-33, 3.4, 32], [5, 3.4, 2.5]],
  ])
    colliders.push({
      type: "ellipsoid",
      id,
      x: c[0],
      y: origin.y + 6 + c[1],
      z: origin.z + c[2],
      axes: new THREE.Vector3(...axes),
    });
  return owner;
}
