import * as THREE from "three";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { acquireDutchmanAsset } from "./bermuda_dutchman_asset.js";
import { createDavyJones } from "./bermuda_davy_jones.js";

/** 飞翔的荷兰人号：实际 HF 船壳/残帆、保留炮口与操帆构件。 */
export function createFlyingDutchman(m, keep) {
  const root = new THREE.Group();
  root.name = "bermuda_flying_dutchman";
  const b = createBermudaBuilder(root, keep),
    sails = [],
    muzzles = [];
  const timber = keep(m.wood.clone());
  timber.name = "dutchman_old_growth_timber";
  timber.color.set("#625f45");
  const growth = keep(m.brass.clone());
  growth.name = "salt_encrusted_carvings";
  growth.color.set("#849084");
  growth.metalness = 0.08;
  growth.roughness = 0.96;
  const window = keep(m.pearl.clone());
  window.name = "cursed_cabin_windows";
  window.color.set("#8ca386");
  window.emissiveIntensity = 0.65;
  const widthAt = (z) =>
    12.5 * Math.pow(Math.max(0.035, 1 - (Math.abs(z - 3) / 54) ** 3), 0.6);
  const hullAsset = acquireDutchmanAsset("hull"),
    sailAsset = acquireDutchmanAsset("sail");
  for (const asset of [hullAsset, sailAsset]) keep({ dispose: asset.release });
  const hull = new THREE.Mesh(hullAsset.geometry, hullAsset.material);
  hull.name = "dutchman_hf_hull";
  root.add(hull);
  root.userData.artRevision = "bermuda-dutchman-hf-20261023";
  root.userData.dutchmanArt = { hull, assets: [hullAsset, sailAsset] };
  root.userData.prepareMaterials = () =>
    Promise.all([hullAsset.prepare(), sailAsset.prepare()]);
  root.userData.prepareMaterials();
  // 船艏斜桅仍连接原索具方向；船首雕刻来自生成船壳。
  b.beam(timber, [0, 13, -38], [0, 22, -68], 0.55, 12);
  for (const side of [-1, 1]) {
    for (const y of [3, 8])
      for (let z = -29; z <= 31; z += 8) {
        const x = side * widthAt(z);
        const barrel = new THREE.CylinderGeometry(0.57, 0.85, 8.7, 16, 3, true);
        barrel.rotateZ(Math.PI / 2);
        b.add(barrel, m.dark, [x - side * 1.3, y, z]);
        for (const offset of [0.7, 2.5])
          b.add(
            new THREE.TorusGeometry(0.65, 0.13, 8, 16).rotateY(Math.PI / 2),
            growth,
            [x + side * offset, y, z],
          );
        b.add(new THREE.SphereGeometry(0.45, 10, 8), window, [
          x + side * 2.9,
          y,
          z,
        ]);
        if (y === 8 && z >= -21 && z <= 19)
          muzzles.push(new THREE.Vector3(x + side * 3, y, z));
      }
  }
  for (const [i, z] of [-27, 0, 30].entries()) {
    const height = i === 1 ? 66 : 58;
    b.beam(timber, [0, 12, z], [0, height, z], 0.65, 12);
    b.add(
      new THREE.TorusGeometry(2.5, 0.4, 8, 24).rotateX(Math.PI / 2),
      timber,
      [0, height * 0.68, z],
    );
    for (const [j, y] of (i === 2 ? [40, 52] : [30, 45, 58]).entries()) {
      if (y > height - 2) continue;
      const width = i === 2 ? 27 - j * 6 : 34 - j * 7,
        h = 12 - j;
      b.beam(timber, [-width / 2, y, z], [width / 2, y, z], 0.35, 10);
      const sail = new THREE.Mesh(sailAsset.geometry, sailAsset.material);
      sail.name = `dutchman_hf_sail_${i}_${j}`;
      // 几何顶边是局部 y=0；绕横桁摆动，避免中心旋转导致帆顶悬空。
      sail.scale.set(width, h, width);
      sail.position.set(0, y, z);
      root.add(sail);
      sails.push(sail);
    }
    for (const side of [-1, 1])
      for (const dz of [-15, 15]) {
        b.beam(m.dark, [0, height, z], [side * 11, 12, z + dz], 0.085, 5);
        for (let j = 0; j < 20; j++) {
          const f = j / 20,
            y = 12 + (height - 12) * f;
          b.beam(
            m.dark,
            [side * 11 * (1 - f), y, z - 15 * (1 - f)],
            [side * 11 * (1 - f), y, z + 15 * (1 - f)],
            0.045,
            4,
          );
        }
      }
    if (i < 2) b.beam(m.dark, [0, height, z], [0, 20, z + 30], 0.07, 5);
  }
  // 艉楼提灯沿实际甲板支撑，幽光局限于玻璃，不染亮整片船壳。
  for (const x of [-6, 6]) {
    b.beam(growth, [x, 21.0, 40], [x, 23.8, 40], 0.12, 6);
    b.add(new THREE.SphereGeometry(0.46, 10, 8).scale(1, 1.5, 1), window, [
      x,
      23.4,
      40,
    ]);
    for (const y of [22.7, 24.1])
      b.add(new THREE.CylinderGeometry(0.58, 0.58, 0.16, 6), growth, [
        x,
        y,
        40,
      ]);
  }
  b.finish();
  const captain = createDavyJones(root, keep);
  captain.root.position.set(4.2, 21.52, 36);
  captain.root.scale.setScalar(1.65);
  return {
    root,
    sails,
    muzzles: muzzles,
    captain,
    length: 96,
    width: 25,
    localColliders: [
      { center: [0, 1, 0], size: [24, 24, 82] },
      { center: [0, 23, 36], size: [21, 22, 22] },
    ],
  };
}
