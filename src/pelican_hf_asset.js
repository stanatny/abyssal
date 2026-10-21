import * as THREE from "three";
import data from "./assets/models/pelican_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
let cached;
/** 原始羽色与实体共享；加载失败仍保留离线采样的羽色，不生成白色替身。 */
export function pelicanHfAsset(bind) {
  if (cached) return cached;
  const geometry = decodeOrganicMesh(data, bind, (x, y, z, c) => {
    c.set(z < -0.24 ? 0xb5ad91 : 0x675b4c);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.83,
    metalness: 0,
    vertexColors: true,
  });
  material.name = "pelican_hf_feathers";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL("./assets/models/pelican_hf_color.webp", import.meta.url),
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
  cached = { geometry, material, prepare };
  return cached;
}
