import * as THREE from "three";
import bench from "./assets/models/furniture_bench_hf_mesh.json" with { type: "json" };
import table from "./assets/models/furniture_table_hf_mesh.json" with { type: "json" };
import chest from "./assets/models/furniture_chest_hf_mesh.json" with { type: "json" };
import amphora from "./assets/models/furniture_amphora_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  bench: [
    bench,
    new URL("./assets/models/furniture_bench_hf_color.webp", import.meta.url),
    [3.6, 1.48, 1.3],
  ],
  table: [
    table,
    new URL("./assets/models/furniture_table_hf_color.webp", import.meta.url),
    [2.7, 1.64, 2.7],
  ],
  chest: [
    chest,
    new URL("./assets/models/furniture_chest_hf_color.webp", import.meta.url),
    [2.72, 2.4, 1.7],
  ],
  amphora: [
    amphora,
    new URL("./assets/models/furniture_amphora_hf_color.webp", import.meta.url),
    [1.4, 2.02, 1.2],
  ],
};
const cache = new Map();

/** 将原始轮廓拟合到既有座面、支墩与拱盖，不改变通道或碰撞。 */
function fitFurniture(geometry, kind) {
  if (kind !== "bench" && kind !== "chest") return;
  const position = geometry.attributes.position,
    normal = geometry.attributes.normal;
  const smooth = THREE.MathUtils.smoothstep;
  const transform = (x, y, z, out) => {
    if (kind === "bench") {
      const leg = 1 - smooth(y, 0.72, 0.98);
      x -= Math.sign(x) * 0.12 * leg;
      z *= 1 - 0.2 * leg;
      z -= 0.24 * smooth(y, 1.07, 1.2);
      y = y < 1.05 ? y * (1.17 / 1.05) : 1.17 + (y - 1.05) * (0.31 / 0.43);
    } else {
      const lid = smooth(y, 1.48, 1.68);
      x *= 1 + 0.048 * lid;
      z *= 1 + 0.19 * lid;
    }
    return out.set(x, y, z);
  };
  const p = new THREE.Vector3(),
    base = new THREE.Vector3(),
    dx = new THREE.Vector3(),
    dy = new THREE.Vector3(),
    dz = new THREE.Vector3(),
    n = new THREE.Vector3();
  const matrix = new THREE.Matrix3(),
    eps = 1e-4;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    transform(p.x, p.y, p.z, base);
    transform(p.x + eps, p.y, p.z, dx)
      .sub(base)
      .divideScalar(eps);
    transform(p.x, p.y + eps, p.z, dy)
      .sub(base)
      .divideScalar(eps);
    transform(p.x, p.y, p.z + eps, dz)
      .sub(base)
      .divideScalar(eps);
    matrix
      .set(dx.x, dy.x, dz.x, dx.y, dy.y, dz.y, dx.z, dy.z, dz.z)
      .invert()
      .transpose();
    n.fromBufferAttribute(normal, i).applyMatrix3(matrix).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
    position.setXYZ(i, base.x, base.y, base.z);
  }
}

/** 静态陈设网格和贴图按实际所有者共享；住宅与大厅各自持有实例缓冲。 */
export function acquireAtlantisFurnitureAsset(kind) {
  if (!definitions[kind])
    throw Error(`Unknown Atlantis furniture asset: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url, size] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0x9ca99a),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const bounds = geometry.boundingBox;
    const originalSize = bounds.getSize(new THREE.Vector3());
    geometry.scale(...size.map((v, i) => v / originalSize.getComponent(i)));
    geometry.computeBoundingBox();
    geometry.translate(0, -geometry.boundingBox.min.y, 0);
    fitFurniture(geometry, kind);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.name = `atlantis_furniture_${kind}_hf`;
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: kind === "amphora" ? 0.89 : 0.82,
      metalness: kind === "amphora" ? 0 : 0.08,
    });
    material.name = geometry.name;
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
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
  const e = cache.get(kind);
  e.references++;
  let released = false;
  return {
    geometry: e.geometry,
    material: e.material,
    prepare: e.prepare,
    release() {
      if (released) return;
      released = true;
      if (--e.references) return;
      e.prepare.dispose();
      e.geometry.dispose();
      e.material.dispose();
      cache.delete(kind);
    },
  };
}

/** 每个原有陈设批次每类一个实例绘制，沿用实际旋转和地面采样。 */
export function createAtlantisFurnitureVisuals(parent, placements) {
  const owners = [],
    meshes = [];
  let triangles = 0,
    disposed = false;
  for (const kind of Object.keys(definitions)) {
    const positions = placements.filter((p) => p.kind === kind);
    if (!positions.length) continue;
    const a = acquireAtlantisFurnitureAsset(kind);
    owners.push(a);
    const mesh = new THREE.InstancedMesh(
      a.geometry,
      a.material,
      positions.length,
    );
    mesh.name = `atlantis_furniture_${kind}_hf_instances`;
    mesh.userData.artRevision = "trellis_atlantis_furniture_20261022";
    mesh.userData.prepareMaterials = a.prepare;
    for (let i = 0; i < positions.length; i++)
      mesh.setMatrixAt(i, positions[i].matrix);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
    parent.add(mesh);
    meshes.push(mesh);
    triangles += (a.geometry.index.count / 3) * positions.length;
    a.prepare();
  }
  return {
    triangles,
    instances: placements.length,
    async prepare(options) {
      return (await Promise.all(owners.map((a) => a.prepare(options)))).every(
        Boolean,
      );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mesh of meshes) {
        mesh.removeFromParent();
        mesh.dispose();
      }
      for (const a of owners) a.release();
      owners.length = meshes.length = 0;
    },
  };
}
