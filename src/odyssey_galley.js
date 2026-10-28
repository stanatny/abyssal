import * as THREE from "three";
import solid from "./assets/models/odyssey_galley_collision.json" with { type: "json" };
import { createOdysseyRuinMesh } from "./odyssey_ruins_asset.js";

/** 海床法线与最低实体共同定位；外壳表面体素保留中部船舱，不用整船包围盒。 */
export function createOdysseyGalley(parent, asset, colliders, heightAt, x, z) {
  const length = 90;
  const dx = (heightAt(x + 32, z) - heightAt(x - 32, z)) / 64;
  const dz = (heightAt(x, z + 10) - heightAt(x, z - 10)) / 20;
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-dx, 1, -dz).normalize(),
  );
  const position = asset.geometry.attributes.position,
    v = new THREE.Vector3();
  let y = -Infinity;
  // 完整船壳采样，船底只允许轻微嵌入泥沙，不让高坡穿进开放船腹。
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
      .multiplyScalar(length)
      .applyQuaternion(rotation);
    y = Math.max(y, heightAt(x + v.x, z + v.z) - v.y);
  }
  y -= 0.35;
  const wreck = createOdysseyRuinMesh(
    asset,
    "odyssey_broken_ninety_metre_galley",
    300,
  );
  wreck.position.set(x, y, z);
  wreck.quaternion.copy(rotation);
  wreck.scale.setScalar(length);
  parent.add(wreck);
  wreck.updateMatrixWorld(true);
  solid.boxes.forEach(([cx, cy, cz, hx, hy, hz], i) => {
    v.set(cx, cy, cz)
      .multiplyScalar(length)
      .applyQuaternion(rotation)
      .add(wreck.position);
    colliders.push({
      type: "box",
      id: `odyssey_galley_surface_${i}`,
      kind: "galley_hull_surface",
      x: v.x,
      y: v.y,
      z: v.z,
      halfSize: new THREE.Vector3(hx, hy, hz).multiplyScalar(length),
      rotation: rotation.clone(),
    });
  });
  const point = (lx, ly, lz) =>
    new THREE.Vector3(lx, ly, lz)
      .multiplyScalar(length)
      .applyQuaternion(rotation)
      .add(wreck.position);
  // 断舷上方保留成年体型的进出水层；小体型还能下探肋骨间，不将开放船腹误称为封闭船舱。
  const interior = point(0, 0.03, 0);
  wreck.userData.length = length;
  wreck.userData.width = (asset.packed.max[2] - asset.packed.min[2]) * length;
  wreck.userData.interior = interior;
  wreck.userData.seabedBank = new THREE.Euler().setFromQuaternion(rotation).x;
  wreck.userData.surfaceCell = solid.cell * length;
  return { wreck, wreckEntrance: point(0, 0.03, 0.3), interior, point };
}
