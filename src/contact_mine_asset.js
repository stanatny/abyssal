import * as THREE from "three";
import packed from "./assets/models/contact_mine_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const colorUrl = new URL(
  "./assets/models/contact_mine_hf_color.webp",
  import.meta.url,
);
let cached;

/** 共享水雷实体与色图；每个实例独立控制原有红灯相位，最后一个使用者负责回收。 */
export function acquireContactMineAsset() {
  if (!cached) {
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, color) =>
      color.set(0x4a6265),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    // 量化后再次用统一比例约束最外缘，不让触角伸出原有接触球。
    const positions = geometry.getAttribute("position"),
      point = new THREE.Vector3();
    let radius = 0;
    for (let i = 0; i < positions.count; i++)
      radius = Math.max(
        radius,
        point.fromBufferAttribute(positions, i).length(),
      );
    geometry.scale(0.5 / radius, 0.5 / radius, 0.5 / radius);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const asset = {
      geometry,
      materials: new Set(),
      texture: null,
      ready: false,
      references: 0,
    };
    asset.prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url: colorUrl,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            asset.texture = texture;
            for (const material of asset.materials) {
              material.map = texture;
              material.vertexColors = false;
              material.needsUpdate = true;
            }
          },
        },
      ],
      (ready) => {
        asset.ready = ready;
        for (const material of asset.materials)
          material.userData.texturesReady = ready;
      },
    );
    cached = asset;
  }
  const asset = cached;
  asset.references++;
  const material = new THREE.MeshStandardMaterial({
    map: asset.texture,
    vertexColors: !asset.texture,
    roughness: 0.65,
    metalness: 0.32,
    emissive: 0xe54a2d,
    emissiveIntensity: 0.65,
  });
  material.name = "contact_mine_hf_shell_and_lenses";
  material.userData.texturesReady = asset.ready;
  // 只点亮生成表面的红色镜片；青灰壳体与铜锈不能跟着泛红发光。
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      float mineLens = smoothstep(0.005, 0.025, diffuseColor.r - 2.2 * max(diffuseColor.g, diffuseColor.b));
      totalEmissiveRadiance *= mineLens;
    `,
    );
  };
  material.customProgramCacheKey = () =>
    "abyssal-contact-mine-hf-red-lenses-v1";
  asset.materials.add(material);
  let released = false;
  return {
    geometry: asset.geometry,
    material,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      asset.materials.delete(material);
      material.dispose();
      if (--asset.references > 0) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      if (cached === asset) cached = undefined;
    },
  };
}
