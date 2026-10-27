import {
  addPenglaiPineFoliage,
  pineTrunkSections,
} from "./penglai_pine_foliage.js";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createPenglaiTempleAsset } from "./penglai_temple_asset.js";
import { penglaiHeightAt } from "./penglai_config.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { applyPenglaiGroundSurface } from "./penglai_ground_materials.js";

/** 主殿石作和古松沿现有台基布置；雕刻按种类共享，只有树干新增实体接触。 */
export function addPenglaiTempleCourtyard({
  root,
  keep,
  emit,
  geometry,
  material,
  colliders,
  groundMaterials,
  x,
  y,
  z,
}) {
  const stone = ["#999e90", "#909789", "#a4a897"].map((color, i) => {
    const m = material(`temple_cut_stone_${i}`, color, { roughness: 0.94 });
    if (groundMaterials)
      applyPenglaiGroundSurface(m, groundMaterials, "masonry");
    else addSurfaceDetail(m, "stone", 0.35);
    return m;
  });
  const dark = material("temple_recessed_joint", "#626d60", { roughness: 1 });
  const block = geometry(
    "temple_dressed_block",
    () => new RoundedBoxGeometry(1, 1, 1, 1, 0.025),
  );
  const box = geometry(
    "temple_joint_box",
    () => new THREE.BoxGeometry(1, 1, 1),
  );
  const batches = new Map(),
    pose = new THREE.Object3D();
  function carved(kind, position, dimensions, yaw = 0) {
    if (!batches.has(kind))
      batches.set(kind, {
        asset: createPenglaiTempleAsset(kind, keep),
        matrices: [],
      });
    const b = batches.get(kind),
      a = b.asset;
    pose.position.set(...position);
    pose.rotation.set(0, yaw, 0);
    pose.scale.set(
      ...dimensions.map((s, i) => s / (a.packed.max[i] - a.packed.min[i])),
    );
    pose.updateMatrix();
    b.matrices.push(pose.matrix.clone());
    return { asset: a, matrix: pose.matrix.clone() };
  }
  // 原台基体积与踏面不变；真实错缝石块替代整块光滑盒子，无叠放共面贴片。
  emit(box, dark, x, y + 1.85, z, 96.8, 3.7, 100.8);
  for (let row = 0; row < 2; row++)
    for (const s of [-1, 1]) {
      for (let j = 0; j < 12; j++)
        emit(
          block,
          stone[(j + row) % 3],
          x - 44.5 + j * 8.1,
          y + 0.85 + row * 1.5,
          z + s * 50.15,
          8.0,
          1.38,
          0.7,
        );
      for (let j = 0; j < 13; j++)
        emit(
          block,
          stone[(j + row + 1) % 3],
          x + s * 48.15,
          y + 0.85 + row * 1.5,
          z - 46.5 + j * 7.75,
          0.7,
          1.38,
          7.65,
        );
    }
  // 分块铺地收在平台原顶面；台阶前沿逐级下降，细缝深度限定在视觉表面。
  for (let i = 0; i < 12; i++)
    for (let j = 0; j < 13; j++) {
      const px = x - 44.45 + i * 8.08,
        pz = z - 46.15 + j * 7.69;
      emit(
        block,
        stone[(i * 3 + j * 5) % 3],
        px,
        y + 3.79,
        pz,
        7.97,
        0.42,
        7.58,
      );
    }
  for (let step = 0; step < 8; step++) {
    const top = y + 3.65 - step * 0.4,
      bottom = y - 0.2,
      h = top - bottom,
      cz = z + 52.5 + step * 4;
    emit(box, dark, x, (top + bottom) / 2 - 0.06, cz, 64.96, h - 0.12, 3.72);
    for (let j = 0; j < 10; j++) {
      const lo = -32.5 + j * 6.5 + 0.035,
        hi = -32.5 + (j + 1) * 6.5 - 0.035;
      emit(
        block,
        stone[(j + step) % 3],
        x + (lo + hi) / 2,
        top - 0.14,
        cz,
        hi - lo,
        0.28,
        3.94,
      );
      // 踏步的竖面也用石作包覆；嵌在原实体范围内，不另叠完整踏面。
      if (h > 0.38)
        emit(
          block,
          stone[(j + step + 1) % 3],
          x + (lo + hi) / 2,
          (top + bottom) / 2 - 0.14,
          cz + 1.91,
          hi - lo,
          0.95 * (h - 0.28),
          0.14,
        );
    }
  }
  for (let i = 0; i < 5; i++)
    for (const s of [-1, 1])
      carved(
        "temple_pillar",
        [x + (i / 4 - 0.5) * 83, y + 17.5, z + s * 43],
        [4.6, 27, 4.6],
      );
  for (const s of [-1, 1])
    for (const t of [-1, 1])
      carved(
        "temple_pillar",
        [x + s * 22.88, y + 45, z + t * 22.08],
        [3.1, 18, 3.1],
      );
  // 栏板设在台基边缘，不侵占原柱廊；入口保持整幅宽度。
  for (const s of [-1, 1]) {
    for (let j = 0; j < 8; j++)
      carved(
        "temple_balustrade",
        [x + s * 46, y + 6.85, z - 35 + j * 10],
        [10, 5.7, 1.55],
        (s * Math.PI) / 2,
      );
    for (let j = 0; j < 3; j++) {
      const dz = 57.2 + j * 10,
        base = y + 3.25 - j;
      carved(
        "temple_balustrade",
        [x + s * 33.6, base + 1.8, z + dz],
        [10, 3.6, 1.3],
        (s * Math.PI) / 2,
      );
    }
  }
  // 树根落在山体而非台基；树冠只在侧后方展开，正门和牌匾的观察方向留空。
  for (const [dx, dz, height, yaw] of [
    [-66, -24, 34, -0.65],
    [66, -30, 32, 2.2],
    [-25, -79, 31, 0.2],
    [28, -77, 28, 2.9],
  ]) {
    if (!batches.has("temple_pine"))
      batches.set("temple_pine", {
        asset: createPenglaiTempleAsset("temple_pine", keep),
        matrices: [],
      });
    const a = batches.get("temple_pine").asset,
      rootBand = a.packed.contacts.reduce((lowest, c) =>
        c.min[1] < lowest.min[1] ? c : lowest,
      );
    const rootX = (rootBand.min[0] + rootBand.max[0]) / 2,
      rootZ = (rootBand.min[2] + rootBand.max[2]) / 2;
    const ground = penglaiHeightAt(x + dx, z + dz),
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    const p = [
      x + dx - height * (c * rootX + s * rootZ),
      ground + height / 2 - 1,
      z + dz - height * (-s * rootX + c * rootZ),
    ];
    const placed = carved(
      "temple_pine",
      p,
      a.packed.max.map((v, i) => (v - a.packed.min[i]) * height),
      yaw,
    );
    // 低处实心树干用同源网格截面；上部可穿过的枝叶不变成不可见整块墙。
    for (const band of (a.trunkSections ??= pineTrunkSections(a))) {
      const center = new THREE.Vector3(
        ...band.min.map((v, i) => (v + band.max[i]) / 2),
      ).applyMatrix4(placed.matrix);
      colliders.push({
        type: "box",
        kind: "temple_pine_trunk",
        x: center.x,
        y: center.y,
        z: center.z,
        rotation: new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          yaw,
        ),
        halfSize: {
          x: ((band.max[0] - band.min[0]) * height) / 2,
          y: ((band.max[1] - band.min[1]) * height) / 2,
          z: ((band.max[2] - band.min[2]) * height) / 2,
        },
      });
    }
  }
  for (const [kind, b] of batches) {
    const m = new THREE.InstancedMesh(
      b.asset.geometry,
      b.asset.material,
      b.matrices.length,
    );
    m.name = `penglai_hf_${kind}`;
    m.userData.hfTempleKind = kind;
    m.userData.prepareMaterials = b.asset.prepare;
    b.matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingBox();
    m.computeBoundingSphere();
    root.add(m);
    if (kind === "temple_pine") addPenglaiPineFoliage(root, b, keep);
  }
}

/** 雨痕在物体空间保持静止，墙脚受潮与粉墙细粒有不同尺度。 */
export function refineTemplePlaster(material, baseY) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      float templeWeather=detailNoise(vec3(vSurfaceDetail.x*.42,vSurfaceDetail.y*.035,vSurfaceDetail.z*.42));
      float templeDamp=(1.0-smoothstep(${(baseY + 9).toFixed(2)},${(baseY + 17).toFixed(2)},vSurfaceDetail.y))*smoothstep(.35,.75,templeWeather);
      outgoingLight*=.9+templeWeather*.17;
      outgoingLight=mix(outgoingLight,outgoingLight*vec3(.67,.75,.62),templeDamp*.36);
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => `penglai_temple_plaster_${baseY}_v1`;
}
