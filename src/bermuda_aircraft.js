import * as THREE from "three";
import { acquireBermudaAircraftAsset } from "./bermuda_aircraft_asset.js";

/** 原地标范围内的失事飞机顺着真实海床倾斜；外观和接触体使用同一个刚性变换。 */
export function createBermudaAircraft(parent, { heightAt }) {
  const asset = acquireBermudaAircraftAsset(),
    root = new THREE.Group();
  root.name = "bermuda_lost_aircraft";
  const x = 199,
    z = -555,
    span = 14;
  const dx = (heightAt(x + span, z) - heightAt(x - span, z)) / (span * 2),
    dz = (heightAt(x, z + span) - heightAt(x, z - span)) / (span * 2),
    normal = new THREE.Vector3(-dx, 1, -dz).normalize(),
    forward = new THREE.Vector3(0, dz, 1).normalize(),
    right = new THREE.Vector3().crossVectors(normal, forward).normalize();
  forward.crossVectors(right, normal).normalize();
  root.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, normal, forward),
  );
  root.quaternion.multiply(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, -0.1)),
  );
  root.position.set(x, heightAt(x, z) + 5, z);
  const mesh = new THREE.Mesh(asset.geometry, asset.material);
  mesh.name = "bermuda_aircraft_hf";
  mesh.scale.setScalar(34);
  root.add(mesh);
  parent.add(root);
  // 检查全足迹，留少量沉积嵌入，不能只按中心高度把另一侧机翼埋进坡里。
  const p = asset.geometry.attributes.position,
    v = new THREE.Vector3();
  let minimumClearance = Infinity;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
      .multiplyScalar(34)
      .applyQuaternion(root.quaternion)
      .add(root.position);
    minimumClearance = Math.min(minimumClearance, v.y - heightAt(v.x, v.z));
  }
  root.position.y -= minimumClearance + 0.6;
  const boxDefinitions = [
    [
      [-11.2, -2.7, -1.1],
      [16.4, 1.25, 6.5],
      [0, 0.15, 0.08],
    ],
    [
      [11.2, 0.15, -3.1],
      [16.4, 1.25, 6.6],
      [0, -0.04, 0.24],
    ],
    [
      [-0.2, -1.1, 14.1],
      [16.0, 0.5, 3.9],
      [0, 0, 0],
    ],
    [
      [0, 2.0, 13.5],
      [0.65, 7.2, 5.1],
      [0, 0, 0],
    ],
  ];
  const boxes = boxDefinitions.map(([center, size, rotation]) => {
    const position = new THREE.Vector3(...center)
        .applyQuaternion(root.quaternion)
        .add(root.position),
      q = root.quaternion
        .clone()
        .multiply(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        ),
      e = new THREE.Euler().setFromQuaternion(q);
    return { center: position.toArray(), size, rotation: [e.x, e.y, e.z] };
  });
  const contacts = [
    ["fuselage", [0, -0.2, -4.2], [3.1, 3.2, 9.4]],
    ["nose", [0, -0.3, -12.4], [2.15, 2.4, 4.7]],
    ["aft", [0, -0.6, 7.8], [2.05, 2.5, 7.6]],
    ["engine_left", [-6.9, -2.5, -7.6], [2.1, 2.5, 3.6]],
    ["engine_right", [7.5, -0.55, -8.8], [2.2, 2.4, 3.7]],
  ].map(([name, center, axes]) => {
    const position = new THREE.Vector3(...center)
      .applyQuaternion(root.quaternion)
      .add(root.position);
    return {
      id: `bermuda_aircraft_${name}`,
      type: "ellipsoid",
      x: position.x,
      y: position.y,
      z: position.z,
      axes: new THREE.Vector3(...axes),
      rotation: root.quaternion.clone(),
    };
  });
  root.userData.prepareMaterials = asset.prepare;
  void asset.prepare();
  let disposed = false;
  return {
    root,
    mesh,
    boxes,
    contacts,
    asset,
    prepare: asset.prepare,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      asset.release();
    },
  };
}
