import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createPenglaiTempleAsset } from "./penglai_temple_asset.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 主殿细部沿既有墙壳布置，木窗共用一次绘制；不改封闭内殿与外侧通路。 */
export function addPenglaiTempleDetails({
  root,
  keep,
  emit,
  geometry,
  material,
  box,
  column,
  x,
  y,
  z,
}) {
  const timber = material("temple_aged_timber", "#624d39", { roughness: 0.88 }),
    masonry = material("temple_masonry", "#6b7169", { roughness: 0.95 }),
    mortar = material("temple_mortar", "#929284", { roughness: 1 }),
    trim = material("temple_stone_trim", "#a4a18d", { roughness: 0.95 }),
    shadow = material("temple_window_recess", "#222c28", { roughness: 1 }),
    bronze = material("temple_old_bronze", "#9f8854", {
      roughness: 0.68,
      metalness: 0.25,
    });
  addSurfaceDetail(timber, "wood", 0.45);
  addSurfaceDetail(masonry, "stone", 0.5);
  addSurfaceDetail(trim, "stone", 0.35);
  const chamfer = geometry(
    "temple_chamfer",
    () => new RoundedBoxGeometry(1, 1, 1, 1, 0.055),
  );
  const poses = [];
  const a = createPenglaiTempleAsset("temple_lattice", keep),
    object = new THREE.Object3D();
  function facePoint(cx, cz, angle, u, v, depth) {
    return [
      cx + Math.cos(angle) * u + Math.sin(angle) * depth,
      y + v,
      cz - Math.sin(angle) * u + Math.cos(angle) * depth,
    ];
  }
  function piece(cx, cz, angle, u, v, depth, w, h, d, mat = timber, g = box) {
    emit(
      g,
      mat,
      ...facePoint(cx, cz, angle, u, v, depth),
      w,
      h,
      d,
      0,
      angle,
      0,
    );
  }
  function window(cx, cz, angle, u, v, w, h) {
    const p = facePoint(cx, cz, angle, u, v, 0);
    object.position.set(...p);
    object.rotation.set(0, angle, 0);
    object.scale.set(
      w / (a.packed.max[0] - a.packed.min[0]),
      h / (a.packed.max[1] - a.packed.min[1]),
      0.7 / (a.packed.max[2] - a.packed.min[2]),
    );
    object.updateMatrix();
    poses.push(object.matrix.clone());
    piece(cx, cz, angle, u, v, -0.4, w + 0.15, h + 0.15, 0.12, shadow);
    piece(
      cx,
      cz,
      angle,
      u,
      v - h / 2 - 0.4,
      0,
      w + 0.85,
      0.55,
      1,
      trim,
      chamfer,
    );
  }
  function wallBase(cx, cz, angle, width) {
    piece(cx, cz, angle, 0, 7.0, -0.3, width, 6, 0.48, mortar);
    // 错缝砖表面均高于灰缝，拼接不共面；几何实例按既有区域桶合批。
    for (let row = 0; row < 4; row++) {
      const step = 4.4,
        start = -width / 2;
      for (
        let left = start - ((row % 2) * step) / 2;
        left < width / 2;
        left += step
      ) {
        const lo = Math.max(start, left) + 0.055,
          hi = Math.min(width / 2, left + step) - 0.055;
        if (hi <= lo) continue;
        piece(
          cx,
          cz,
          angle,
          (lo + hi) / 2,
          4.8 + row * 1.45,
          0,
          hi - lo,
          1.33,
          0.55,
          masonry,
          chamfer,
        );
      }
    }
    piece(cx, cz, angle, 0, 10.1, 0.06, width + 0.4, 0.7, 0.85, trim, chamfer);
    piece(cx, cz, angle, 0, 4.35, 0.05, width + 0.5, 0.7, 0.85, trim, chamfer);
  }
  for (const side of [-1, 1]) {
    const angle = (side * Math.PI) / 2,
      cx = x + side * 36.65,
      cz = z;
    wallBase(cx, cz, angle, 72);
    for (let j = -2; j <= 2; j++)
      window(cx, cz, angle, j * 14, 18.7, 10.5, 14.8);
    for (let j = 0; j < 6; j++)
      piece(cx, cz, angle, -35 + j * 14, 19.4, -0.1, 1.2, 17.5, 0.72);
    piece(cx, cz, angle, 0, 27.4, -0.1, 72, 1.4, 0.9);
    for (const depth of [-1, 1])
      wallBase(x + side * 27, z + depth * 37.65, depth < 0 ? Math.PI : 0, 22);
    window(x + side * 27, z + 37.65, 0, 0, 19.1, 10.6, 15.2);
    window(x + side * 27, z - 37.65, Math.PI, 0, 19.1, 10.6, 15.2);
  }
  // 四扇格扇门沿真实闭合门板排布，门额、腰板和铜环有独立体积。
  for (let j = 0; j < 4; j++)
    window(x, z + 37.8, 0, (j - 1.5) * 7.8, 16.4, 7.45, 22.0);
  piece(x, z + 37.8, 0, 0, 28.1, 0, 35, 1.6, 1.6);
  for (const side of [-1, 1])
    piece(x, z + 37.8, 0, side * 16.7, 16, 0, 1.4, 24, 1.6);
  const ring = geometry(
    "temple_door_ring",
    () => new THREE.TorusGeometry(0.55, 0.13, 6, 16),
  );
  for (const side of [-1, 1])
    emit(ring, bronze, x + side * 1.9, y + 12.6, z + 38.35);
  // 上层以同源木窗替代亮金色直条和菱形贴片，形成连续的四面窗带。
  for (const side of [-1, 1]) {
    for (let j = -2; j <= 2; j++) {
      window(
        x,
        z + side * 21.25,
        side < 0 ? Math.PI : 0,
        j * 7.9,
        46,
        7.45,
        11.4,
      );
      window(x + side * 22.3, z, (side * Math.PI) / 2, j * 7.8, 46, 7.4, 11.4);
    }
  }
  const mesh = new THREE.InstancedMesh(a.geometry, a.material, poses.length);
  mesh.name = "penglai_hf_temple_lattice";
  mesh.userData.hfTempleKind = "temple_lattice";
  mesh.userData.prepareMaterials = a.prepare;
  poses.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  root.add(mesh);
  return mesh;
}
