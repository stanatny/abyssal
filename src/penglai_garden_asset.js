import * as THREE from "three";
import peach from "./assets/models/peach_tree_hf_mesh.json" with { type: "json" };
import farPeach from "./assets/models/peach_tree_far_hf_mesh.json" with { type: "json" };
import lotus from "./assets/models/lotus_bloom_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
const definitions = {
  peach_tree: [
    peach,
    new URL("./assets/models/peach_tree_hf_color.webp", import.meta.url),
  ],
  peach_tree_far: [
    farPeach,
    new URL("./assets/models/peach_tree_far_hf_color.webp", import.meta.url),
  ],
  lotus_bloom: [
    lotus,
    new URL("./assets/models/lotus_bloom_hf_color.webp", import.meta.url),
  ],
};
/** 静态花木按地图共享与释放；低网速保留同源顶点色，不显示白色贴图占位。 */
export function createPenglaiGardenAsset(kind, keep) {
  const [packed, url] = definitions[kind];
  const geometry = keep(
    decodeOrganicMesh(packed, null, (x, y, z, c) => c.set(0xa5a28c)),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  if (kind.startsWith("peach_tree")) {
    // 两档从相同原始坐标落地，不能按减面后各自的外框重新居中。
    const n = packed.sourceNormalization,
      common = peach.sourceNormalization;
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x =
        (p.getX(i) / n.scale + n.center[0] - common.center[0]) * common.scale;
      const y =
        (p.getY(i) / n.scale + n.center[1] - common.center[1]) * common.scale +
        0.5;
      const z =
        (p.getZ(i) / n.scale + n.center[2] - common.center[2]) * common.scale;
      p.setXYZ(i, x * 17 - 0.648, y * 20, z * 17 - 0.188);
    }
    geometry.userData.penglaiDetailLevel =
      kind === "peach_tree" ? "near" : "far";
  } else {
    const size = packed.max.map((v, i) => v - packed.min[i]),
      scale = 3.5 / Math.max(size[0], size[2]);
    geometry.translate(0, -packed.min[1], 0);
    geometry.scale(scale, scale, scale);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  material.name = `penglai_${kind}_hf`;
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
    (ready) => (material.userData.texturesReady = ready),
  );
  keep({ dispose: prepare.dispose });
  geometry.userData.prepareMaterials = prepare;
  geometry.userData.hfGardenKind = kind;
  prepare();
  return { geometry, material, prepare, packed };
}

/** 荷叶为中央叶柄连接的浅碗曲面，径向叶脉随几何颜色生成，无透明卡片。 */
export function createPenglaiLotusLeaf() {
  const segments = 64,
    rings = 6,
    p = [],
    c = [],
    uv = [],
    ids = [];
  const shade = new THREE.Color(),
    base = new THREE.Color("#416f37"),
    vein = new THREE.Color("#95a96b");
  p.push(0, 0.03, 0);
  uv.push(0.5, 0.5);
  base.toArray(c, 0);
  for (let r = 1; r <= rings; r++)
    for (let j = 0; j < segments; j++) {
      const a = (j / segments) * Math.PI * 2,
        t = r / rings,
        rad = t * (1 + 0.022 * Math.sin(a * 7));
      p.push(
        Math.cos(a) * rad,
        0.03 + 0.12 * t * t + 0.025 * t * Math.cos(a * 8),
        Math.sin(a) * rad,
      );
      uv.push(0.5 + 0.5 * t * Math.cos(a), 0.5 + 0.5 * t * Math.sin(a));
      shade
        .copy(base)
        .lerp(
          vein,
          j % 4 === 0 ? 0.16 : 0.06 + 0.025 * Math.sin(a * 3 + t * 4),
        );
      shade.toArray(c, c.length);
    }
  for (let j = 0; j < segments; j++) {
    const k = (j + 1) % segments;
    ids.push(0, 1 + k, 1 + j);
  }
  for (let r = 1; r < rings; r++)
    for (let j = 0; j < segments; j++) {
      const k = (j + 1) % segments,
        a = 1 + (r - 1) * segments + j,
        b = 1 + (r - 1) * segments + k,
        d = 1 + r * segments + j,
        e = 1 + r * segments + k;
      ids.push(a, b, d, b, e, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ids);
  g.computeVertexNormals();
  return g;
}
