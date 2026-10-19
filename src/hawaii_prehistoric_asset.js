import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import dunkleosteus from "./assets/models/dunkleosteus_hf_mesh.json" with { type: "json" };
import plesiosaur from "./assets/models/plesiosaur_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";

const data = { dunkleosteus, plesiosaur };
const urls = {
  dunkleosteus: new URL(
    "./assets/models/dunkleosteus_hf_color.webp",
    import.meta.url,
  ),
  plesiosaur: new URL(
    "./assets/models/plesiosaur_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 普通巨兽共享实体和单张色图，动画骨架仍由每个实例拥有。 */
export function hawaiiPrehistoricAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      y < -0.02 ? 0xc4c4b9 : kind === "dunkleosteus" ? 0x53616b : 0x737b73,
    );
    if (kind === "dunkleosteus" && z < -0.21) color.set(0xa5a596);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  // 压缩生成色图固化的阴影反差；保留眼睛、下颌和腹背花纹，不添加发光。
  material.onBeforeCompile = (shader) => {
    if (kind === "dunkleosteus") {
      shader.uniforms.headArmorTint = { value: new THREE.Color(0xa5a596) };
      shader.vertexShader =
        "varying vec3 armorPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\narmorPosition = position;",
      );
      shader.fragmentShader =
        "varying vec3 armorPosition;\nuniform vec3 headArmorTint;\n" +
        shader.fragmentShader;
    }
    const armorGrade =
      kind === "dunkleosteus"
        ? `
        float plateRear = -0.185 - abs(armorPosition.x) * 0.15 + max(armorPosition.y,0.0) * 0.20;
        float armor = 1.0 - smoothstep(plateRear - 0.035,plateRear + 0.01,armorPosition.z);
        float preserveCavities = smoothstep(0.006,0.035,skinLum);
        vec3 bone = headArmorTint * (0.55 + 1.25 * sqrt(max(skinLum,0.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb,bone,0.76 * armor * preserveCavities);
      `
        : "";
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        float skinLum = dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722));
        vec3 skin = pow(max(diffuseColor.rgb,vec3(0.0)),vec3(0.72)) * 0.86;
        diffuseColor.rgb = mix(diffuseColor.rgb,skin,smoothstep(0.001,0.012,skinLum));
        ${armorGrade}
      #endif`,
    );
  };
  material.customProgramCacheKey = () =>
    kind === "dunkleosteus"
      ? "hawaii_prehistoric_armor_v2"
      : "hawaii_prehistoric_albedo_v1";
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
