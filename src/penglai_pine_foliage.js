import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createMaterialPreparation } from "./material_loading.js";

/** 从 HF 网格实际绿色枝梢取簇，补松针卡片；固定三向叶簇不随镜头转动。 */
export function addPenglaiPineFoliage(root, batch, keep) {
  const g = batch.asset.geometry,
    p = g.attributes.position,
    c = g.attributes.color,
    cells = new Map();
  for (let i = 0; i < p.count; i++) {
    if (
      p.getY(i) < -0.12 ||
      c.getY(i) < c.getX(i) * 1.08 ||
      c.getY(i) < c.getZ(i) * 1.06
    )
      continue;
    const key = [p.getX(i), p.getY(i), p.getZ(i)]
      .map((v) => Math.floor(v / 0.09))
      .join(",");
    if (!cells.has(key)) cells.set(key, { p: new THREE.Vector3(), count: 0 });
    const cell = cells.get(key);
    cell.p.add(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    cell.count++;
  }
  const groups = [...cells.values()]
      .filter((c) => c.count >= 12)
      .sort((a, b) => b.count - a.count)
      .slice(0, 130),
    parts = [];
  groups.forEach((cell, i) => {
    const center = cell.p.divideScalar(cell.count);
    for (let plane = 0; plane < 3; plane++) {
      const leaf = new THREE.PlaneGeometry(0.145, 0.105),
        q = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            plane === 2 ? Math.PI / 2 : 0,
            i * 2.399 + (plane * Math.PI) / 2,
            0.12 * Math.sin(i),
          ),
        );
      leaf.applyMatrix4(
        new THREE.Matrix4().compose(center, q, new THREE.Vector3(1, 1, 1)),
      );
      parts.push(leaf);
    }
  });
  const geometry = keep(mergeGeometries(parts));
  parts.forEach((p) => p.dispose());
  const material = keep(
    new THREE.MeshStandardMaterial({
      color: 0xb6c3aa,
      roughness: 1,
      side: THREE.DoubleSide,
      alphaTest: 0.55,
      depthWrite: true,
      transparent: false,
    }),
  );
  const mesh = new THREE.InstancedMesh(
    geometry,
    material,
    batch.matrices.length,
  );
  mesh.name = "penglai_pine_needles";
  mesh.visible = false;
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/temple_pine_needles.webp",
          import.meta.url,
        ),
        colorSpace: THREE.SRGBColorSpace,
        apply(texture) {
          material.map = texture;
          material.needsUpdate = true;
        },
      },
    ],
    (ready) => {
      mesh.visible = ready;
      material.userData.texturesReady = ready;
    },
  );
  keep({ dispose: prepare.dispose });
  mesh.userData.prepareMaterials = prepare;
  mesh.userData.leafClusters = groups.length;
  // 纹理失败时只显示有顶点色的 HF 树，不露出不透明卡片方框；重试沿现有准备接口。
  prepare();
  batch.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  root.add(mesh);
}

/** 低处接触只取连续木质主干，排除伸出的根梢和绿色低枝。 */
export function pineTrunkSections(asset) {
  const bands = asset.packed.contacts
    .filter((c) => c.max[1] <= -0.12)
    .sort((a, b) => a.min[1] - b.min[1]);
  const p = asset.geometry.attributes.position,
    c = asset.geometry.attributes.color;
  let cx = (bands[0].min[0] + bands[0].max[0]) / 2,
    cz = (bands[0].min[2] + bands[0].max[2]) / 2;
  const quantile = (v, t) =>
    v.sort((a, b) => a - b)[Math.floor((v.length - 1) * t)];
  return bands.map((band) => {
    const xs = [],
      zs = [];
    for (let i = 0; i < p.count; i++) {
      if (
        p.getY(i) < band.min[1] ||
        p.getY(i) > band.max[1] ||
        c.getY(i) > c.getX(i) * 1.08 ||
        Math.hypot(p.getX(i) - cx, p.getZ(i) - cz) > 0.14
      )
        continue;
      xs.push(p.getX(i));
      zs.push(p.getZ(i));
    }
    if (xs.length < 4)
      throw Error("Pine trunk section lacks fitted wood surface");
    const min = [quantile(xs, 0.15), band.min[1], quantile(zs, 0.15)],
      max = [quantile(xs, 0.85), band.max[1], quantile(zs, 0.85)];
    cx = (min[0] + max[0]) / 2;
    cz = (min[2] + max[2]) / 2;
    return { min, max };
  });
}
