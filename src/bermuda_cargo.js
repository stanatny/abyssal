import * as THREE from "three";
import { acquireBermudaCargoAsset } from "./bermuda_cargo_asset.js";
import { acquireBermudaWreckAsset } from "./bermuda_wreck_asset.js";
import fitted from "./assets/models/bermuda_cargo_contacts.json" with { type: "json" };

/** 低矮的敞舱残骸整体顺坡；静态接触盒仅覆盖离线采样到的船壳表面。 */
export function createBermudaCargo(parent, { heightAt }) {
  const asset = acquireBermudaCargoAsset(),
    trunk = acquireBermudaWreckAsset("liner_trunk"),
    root = new THREE.Group();
  root.name = "bermuda_cargo_wreck";
  const x = 165,
    z = -952,
    span = 16;
  const dx = (heightAt(x + span, z) - heightAt(x - span, z)) / (span * 2),
    dz = (heightAt(x, z + span) - heightAt(x, z - span)) / (span * 2),
    normal = new THREE.Vector3(-dx, 1, -dz).normalize(),
    forward = new THREE.Vector3(0, dz, 1).normalize(),
    right = new THREE.Vector3().crossVectors(normal, forward).normalize();
  forward.crossVectors(right, normal).normalize();
  root.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, normal, forward),
  );
  root.position.set(x, heightAt(x, z), z);
  const mesh = new THREE.Mesh(asset.geometry, asset.material);
  mesh.name = "bermuda_cargo_hf";
  mesh.scale.setScalar(57);
  root.add(mesh);
  parent.add(root);
  const p = asset.geometry.attributes.position,
    v = new THREE.Vector3();
  let minimum = Infinity;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
      .multiplyScalar(57)
      .applyQuaternion(root.quaternion)
      .add(root.position);
    minimum = Math.min(minimum, v.y - heightAt(v.x, v.z));
  }
  root.position.y -= minimum + 0.4;
  const localBoxes = fitted.boxes.map((b) => ({
    center: b.center.slice(),
    size: b.size.slice(),
  }));
  // 六只散落货箱复用已验收的 HF 旅行箱；贴合船侧海床，留空敞舱中线。
  const crates = new THREE.InstancedMesh(trunk.geometry, trunk.material, 6);
  crates.name = "bermuda_cargo_salvage";
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion();
  const positions = [
    [-11, 0, -13],
    [11, 0, -13],
    [-11, 0, 0],
    [11, 0, 0],
    [-11, 0, 13],
    [11, 0, 13],
  ];
  for (let i = 0; i < positions.length; i++) {
    rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    matrix.compose(
      new THREE.Vector3(...positions[i]),
      rotation,
      new THREE.Vector3(2.3, 2.3, 2.3),
    );
    const tp = trunk.geometry.attributes.position;
    for (let pass = 0; pass < 5; pass++) {
      let clearance = Infinity;
      for (let j = 0; j < tp.count; j++) {
        v.fromBufferAttribute(tp, j)
          .applyMatrix4(matrix)
          .applyQuaternion(root.quaternion)
          .add(root.position);
        clearance = Math.min(clearance, v.y - heightAt(v.x, v.z));
      }
      positions[i][1] -= (clearance + 0.04) * normal.y;
      matrix.setPosition(...positions[i]);
    }
    crates.setMatrixAt(i, matrix);
    localBoxes.push({ center: positions[i], size: [2.3, 1.66, 3.98] });
  }
  crates.instanceMatrix.needsUpdate = true;
  crates.computeBoundingBox();
  crates.computeBoundingSphere();
  root.add(crates);
  const colliders = localBoxes.map((b, i) => {
    const point = new THREE.Vector3(...b.center)
      .applyQuaternion(root.quaternion)
      .add(root.position);
    return {
      id: `bermuda_cargo_${i}`,
      type: "box",
      x: point.x,
      y: point.y,
      z: point.z,
      halfSize: new THREE.Vector3(...b.size).multiplyScalar(0.5),
      rotation: root.quaternion.clone(),
    };
  });
  const prepare = (options) =>
    Promise.all([asset.prepare(options), trunk.prepare(options)]);
  root.userData.prepareMaterials = prepare;
  void prepare();
  let disposed = false;
  return {
    root,
    mesh,
    crates,
    asset,
    trunk,
    colliders,
    prepare,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      crates.dispose();
      asset.release();
      trunk.release();
      colliders.length = 0;
    },
  };
}
