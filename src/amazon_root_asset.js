import * as THREE from "three";
import buttress from "./assets/models/buttress_root_hf_mesh.json" with { type: "json" };
import hanging from "./assets/models/hanging_root_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const sources = { buttress, hanging };
const urls = {
  buttress: new URL(
    "./assets/models/buttress_root_hf_color.webp",
    import.meta.url,
  ),
  hanging: new URL(
    "./assets/models/hanging_root_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 场景引用共享根系表面；弯曲后的副本另归场景所有。 */
export function acquireAmazonRoot(kind) {
  if (!sources[kind]) throw Error("Unknown Amazon root asset");
  if (!cache.has(kind)) {
    const geometry = decodeOrganicMesh(sources[kind], null, (_x, _y, _z, c) =>
      c.set(0x71604a),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    // 悬根较粗的原始端朝向岛体，细须朝向水中；碰撞轴仍相同。
    if (kind === "hanging") geometry.rotateY(Math.PI);
    geometry.computeBoundingBox();
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0,
      vertexColors: true,
    });
    material.name = `amazon_${kind}_root_hf_surface`;
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url: urls[kind],
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    cache.set(kind, { geometry, material, prepare, references: 0 });
  }
  const asset = cache.get(kind);
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    material: asset.material,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}

/** 把真实 HF 根系沿既有三点根曲线弯曲；雅可比逆转置修正法线，UV 不变。 */
export function bendAmazonRoot(source, curve, radius) {
  const geometry = source.clone(),
    p = geometry.attributes.position,
    n = geometry.attributes.normal;
  let radial = 0;
  for (let i = 0; i < p.count; i++)
    radial = Math.max(radial, Math.hypot(p.getX(i), p.getY(i)));
  const scale = radius / radial,
    box = source.boundingBox,
    length = box.max.z - box.min.z;
  const plane = curve.points[1]
    .clone()
    .sub(curve.points[0])
    .cross(curve.points[2].clone().sub(curve.points[0]));
  if (plane.lengthSq() < 1e-10) {
    const tangent = curve.getTangent(0);
    plane.crossVectors(
      tangent,
      Math.abs(tangent.y) < 0.8
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0),
    );
  }
  plane.normalize();
  const binormal = new THREE.Vector3(),
    tangent = new THREE.Vector3();
  const map = (x, y, t, target) => {
    curve.getPoint(t, target);
    curve.getTangent(t, tangent);
    binormal.crossVectors(tangent, plane).normalize();
    return target
      .addScaledVector(plane, x * scale)
      .addScaledVector(binormal, y * scale);
  };
  const result = new THREE.Vector3(),
    low = new THREE.Vector3(),
    high = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    dz = new THREE.Vector3(),
    matrix = new THREE.Matrix3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      t = (p.getZ(i) - box.min.z) / length;
    const a = Math.max(0, t - 0.0005),
      b = Math.min(1, t + 0.0005);
    map(x, y, a, low);
    map(x, y, b, high);
    dz.subVectors(high, low).multiplyScalar(1 / ((b - a) * length));
    map(x, y, t, result);
    matrix
      .set(
        plane.x * scale,
        binormal.x * scale,
        dz.x,
        plane.y * scale,
        binormal.y * scale,
        dz.y,
        plane.z * scale,
        binormal.z * scale,
        dz.z,
      )
      .invert()
      .transpose();
    normal.fromBufferAttribute(n, i).applyMatrix3(matrix).normalize();
    p.setXYZ(i, result.x, result.y, result.z);
    n.setXYZ(i, normal.x, normal.y, normal.z);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
