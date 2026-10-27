import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import lushu from "./assets/models/lushu_hf_mesh.json" with { type: "json" };
import gudiao from "./assets/models/gudiao_hf_mesh.json" with { type: "json" };
import nine_tail_fox from "./assets/models/nine_tail_fox_hf_mesh.json" with { type: "json" };
import zheng from "./assets/models/zheng_hf_mesh.json" with { type: "json" };
const data = { lushu, gudiao, nine_tail_fox, zheng };
const urls = {
  lushu: new URL("./assets/models/lushu_hf_color.webp", import.meta.url),
  gudiao: new URL("./assets/models/gudiao_hf_color.webp", import.meta.url),
  nine_tail_fox: new URL(
    "./assets/models/nine_tail_fox_hf_color.webp",
    import.meta.url,
  ),
  zheng: new URL("./assets/models/zheng_hf_color.webp", import.meta.url),
};
const cache = new Map();
/** 每种山径陆兽或角雕共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function penglaiBeastAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      lushu: z < -0.3 ? 0xddd6bd : 0x99603b,
      gudiao: 0x61515e,
      nine_tail_fox: 0xd9d5c7,
      zheng: 0xa04d32,
    };
    color.setHex(palette[kind]);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness:
      kind === "nine_tail_fox"
        ? 0.92
        : kind === "zheng" || kind === "lushu"
          ? 0.82
          : 0.65,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
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
  const asset = { geometry, material, prepare };
  cache.set(kind, asset);
  return asset;
}

export function penglaiBeastFit(kind) {
  return data[kind].contactFit;
}
