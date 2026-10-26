import * as THREE from "three";
import { acquireEuropaSceneryAsset } from "./europa_scenery_asset.js";

/** 六舱室设备按可见结构合批，主航道与右舷检修道保持净空。 */
export function addResearchInterior({
  root,
  keep,
  box,
  rod,
  shape,
  ring,
  flush,
  localSolids,
  fittingPoint,
  materials,
  geometries,
}) {
  const { hull, frame, foil, black, orange, blue } = materials;
  const asset = acquireEuropaSceneryAsset("console");
  keep({ dispose: asset.release });
  void asset.prepare();
  function cabinet(side, z, width = 4.5, height = 10) {
    const x = side * 15;
    box([x, 3.6 + height / 2, z], [4.5, height, width], frame);
    for (let tier = 0; tier < 3; tier++) {
      const y = 3.7 + (height * (tier + 0.5)) / 3;
      box(
        [side * 12.65, y, z],
        [0.18, height / 3 - 0.25, width - 0.3],
        hull,
        0,
        false,
      );
      rod(
        [side * 12.5, y, z - width * 0.23],
        [side * 12.5, y, z + width * 0.23],
        0.1,
        black,
      );
      box(
        [side * 12.44, y + 0.5, z + width * 0.31],
        [0.06, 0.3, 0.45],
        orange,
        0,
        false,
      );
    }
  }
  function cylinder(p, height, radius, material = hull) {
    rod(
      [p[0], p[1] - height / 2 + radius, p[2]],
      [p[0], p[1] + height / 2 - radius, p[2]],
      radius,
      material,
      true,
    );
    for (const y of [p[1] - height / 2 + radius, p[1] + height / 2 - radius])
      shape(
        geometries.sphere,
        [p[0], y, p[2]],
        [radius, radius, radius],
        material,
      );
    for (const y of [p[1] - height * 0.27, p[1] + height * 0.27])
      ring([p[0], y, p[2]], radius * 1.04, frame, [Math.PI / 2, 0, 0]);
  }
  function consoleAt(z) {
    const mesh = new THREE.Mesh(asset.geometry, asset.material);
    mesh.name = "wreck_sample_analyzer_hf";
    mesh.userData.sharedEuropaScenery = true;
    // 导出设备正面朝 +Z；左舷安装后正面朝中央 +X，长边顺船轴。
    mesh.rotation.y = Math.PI / 2;
    mesh.scale.setScalar(13.5);
    mesh.updateMatrix();
    const bounds = asset.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
    const baseY = 0.625 + Math.max(0, 14.4 - bounds.min.x - 13) + 0.45;
    mesh.position.fromArray(fittingPoint([-14.4, baseY - bounds.min.y, z]));
    mesh.updateMatrix();
    const final = asset.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
    root.add(mesh);
    localSolids.push({
      p: final.getCenter(new THREE.Vector3()).toArray(),
      sizes: final.getSize(new THREE.Vector3()).toArray(),
      q: new THREE.Quaternion(),
    });
    // 连续地脚横梁支撑整个设备，不悬在斜底板上。
    box([-14.4, baseY - 0.2, z], [6.2, 0.4, 14.1], frame);
    for (const x of [-17, -11.8])
      for (const dz of [-6.1, 6.1])
        rod(
          [x, 0.625 + Math.max(0, Math.abs(x) - 13), z + dz],
          [x, baseY - 0.4, z + dz],
          0.28,
          frame,
          true,
        );
  }

  // 前部样品档案舱：分析舱、带封口的岩芯容器、成排抽屉。
  consoleAt(-55);
  for (const z of [-62, -56, -50]) {
    cylinder([14.5, 8.5, z], 10, 1.5);
    ring([14.5, 8.5, z], 1.56, orange, [Math.PI / 2, 0, 0]);
    box([14.5, 3.1, z], [4, 0.65, 4], frame);
    box([11.9, 10, z], [0.14, 2.2, 1.2], blue, 0, false);
  }
  for (const side of [-1, 1]) {
    box([side * 17.3, 15.6, -55], [1.8, 1.3, 22], black);
    for (let i = 0; i < 12; i++)
      box(
        [side * 16.3, 15.6, -65 + i * 1.75],
        [0.25, 0.85, 1.3],
        hull,
        0,
        false,
      );
    rod([side * 17.6, 16.8, -64], [side * 17.6, 16.8, -46], 0.18, foil);
  }
  flush("wreck_sample_archive");

  // 设备层次：指挥舱仪表骨架、实验舱分析机、生活区软包和餐饮回收柜。
  for (const side of [-1, 1]) {
    for (const z of [-37, -31, -25]) {
      box([side * 17.65, 23, z], [0.45, 4.5, 4.5], black);
      ring([side * 17.32, 23, z], 1.5, frame, [0, Math.PI / 2, 0]);
      for (let k = 0; k < 5; k++)
        box(
          [side * 17.18, 22 + k * 0.4, z],
          [0.1, 0.13, 2.0 - k * 0.18],
          k % 2 ? foil : blue,
          0,
          false,
        );
    }
    rod([side * 17.7, 26, -38], [side * 17.7, 26, -24], 0.3, frame);
    for (const z of [7, 14]) {
      for (const y of [6.9, 11.1]) {
        box([side * 13.5, y, z + 0.5], [3.5, 0.5, 3.4], blue, 0, false);
        for (const dz of [-1.2, 0.4, 1.4])
          box(
            [side * 13.5, y + 0.28, z + dz],
            [3.5, 0.05, 0.1],
            frame,
            0,
            false,
          );
      }
      box([side * 17.5, 15.5, z], [1.6, 4, 5.6], hull);
      for (const dz of [-1.8, 0, 1.8])
        ring([side * 16.63, 15.5, z + dz], 0.3, black, [0, Math.PI / 2, 0]);
    }
  }
  // 左舷分析机替代旧采样台，右舷保留容器和抽屉，形成不对称的实验工作区。
  consoleAt(-9);
  cabinet(-1, -18, 2.8, 11);
  cabinet(1, -18, 2.8, 11);
  for (const z of [-13, -6]) {
    cylinder([-17, 15, z], 3.1, 0.75, foil);
    rod([-17, 16, z], [-12, 16, z], 0.16, frame);
  }
  for (const z of [27, 33, 39]) {
    box([-17.2, 24, z], [1.5, 4.3, 4.2], black);
    for (let n = 0; n < 7; n++)
      box([-16.35, 22.4 + n * 0.5, z], [0.22, 0.16, 3.6], frame, 0, false);
    ring([-15.9, 24, z], 1.45, foil, [0, Math.PI / 2, 0]);
    rod([-15.8, 22.7, z], [-15.8, 25.3, z], 0.11, orange);
  }
  flush("wreck_existing_room_equipment_detail");

  // 后部无人探测器机库：收拢的潜航探头固定在吊架和维修托座上。
  box([-14, 4.4, 55], [6.6, 1.1, 17], frame);
  for (const z of [49, 61]) {
    for (const x of [-16.4, -11.6])
      rod([x, 2.6, z], [x, 5, z], 0.32, hull, true);
    ring([-14, 7, z], 2.5, orange);
  }
  shape(geometries.sphere, [-14, 7, 55], [2, 1.8, 6.2], hull);
  // 圆钝耐压艇体、可辨认的镜头和收拢舵面，避免维修设备看起来像一只方箱。
  localSolids.push({
    p: fittingPoint([-14, 7, 55]),
    sizes: [4, 3.6, 14.88],
    q: new THREE.Quaternion(),
  });
  box([-14, 8.75, 55.3], [1.6, 0.35, 6.1], orange, 0, false);
  shape(geometries.sphere, [-14, 7, 48.9], [1.2, 1.2, 0.35], black);
  ring([-14, 7, 48.55], 0.85, frame);
  shape(geometries.sphere, [-14, 7, 48.45], [0.55, 0.55, 0.13], blue);
  for (const x of [-16.2, -11.8]) {
    rod([x, 7, 53.5], [x, 7, 58.8], 0.5, frame, true);
    ring([x, 7, 59.3], 0.68, frame);
    shape(geometries.sphere, [x, 7, 59.3], [0.42, 0.42, 0.12], black);
    box([x, 7.8, 57.7], [1.5, 0.15, 3.2], blue, [0, x < -14 ? -0.22 : 0.22, 0]);
  }
  for (const z of [48, 62]) {
    rod([-17, 3, z], [-17, 16, z], 0.35, frame, true);
    rod([-17, 16, z], [-10.5, 16, z], 0.35, frame, true);
    rod([-11, 16, z], [-11, 11, z], 0.12, foil);
    ring([-11, 10.5, z], 0.5, frame);
  }
  for (const z of [49, 56, 63]) cabinet(1, z, 5.1, 10.5);
  flush("wreck_unmanned_probe_hangar");

  return {
    prepareMaterials: asset.prepare,
    rooms: [
      {
        id: "sample_archive",
        localCenter: [0, 15, -55],
        localLookAt: [-14, 8, -55],
        localFootprint: [10, 18, -66, -44],
        localBounds: [-68, -42],
      },
      {
        id: "probe_hangar",
        localCenter: [0, 15, 55],
        localLookAt: [-14, 7, 55],
        localFootprint: [10, 18, 44, 66],
        localBounds: [42, 68],
      },
    ],
  };
}
