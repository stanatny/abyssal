import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import red_piranha from "./assets/models/red_piranha_hf_mesh.json" with { type: "json" };
import electric_eel from "./assets/models/electric_eel_hf_mesh.json" with { type: "json" };
import river_stingray from "./assets/models/river_stingray_hf_mesh.json" with { type: "json" };
import amazon_river_turtle from "./assets/models/amazon_river_turtle_hf_mesh.json" with { type: "json" };
const data = { red_piranha, electric_eel, river_stingray, amazon_river_turtle };
const urls = {
  red_piranha: new URL(
    "./assets/models/red_piranha_hf_color.webp",
    import.meta.url,
  ),
  electric_eel: new URL(
    "./assets/models/electric_eel_hf_color.webp",
    import.meta.url,
  ),
  river_stingray: new URL(
    "./assets/models/river_stingray_hf_color.webp",
    import.meta.url,
  ),
  amazon_river_turtle: new URL(
    "./assets/models/amazon_river_turtle_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种鱼共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function amazonVariedAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      red_piranha: y < -0.035 ? 0xc54e2b : 0x7b807a,
      electric_eel: y < -0.025 ? 0xa1834d : 0x4e5042,
      river_stingray: y < -0.015 ? 0xbcb39b : 0x735832,
      amazon_river_turtle: y < -0.045 ? 0xb39b68 : 0x686249,
    };
    color.setHex(palette[kind]);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.65,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  let details;
  if (kind === "river_stingray") {
    // 腹面的浅色和真实贴合的口鳃褶线单独整理，不改背部眼斑。
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = "varying float rayVentral;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nrayVentral = smoothstep(0.2, 0.75, -normal.y) * (1.0-smoothstep(-0.025, 0.015, position.y));",
      );
      shader.fragmentShader =
        "varying float rayVentral;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.57,0.52,0.40) + diffuseColor.rgb * 0.16, rayVentral);",
      );
    };
    material.customProgramCacheKey = () => "amazon_ray_ventral_1";
    const d = data[kind].ventralDetails,
      detailGeometry = new THREE.BufferGeometry();
    detailGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(d.position, 3),
    );
    detailGeometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(d.normal, 3),
    );
    detailGeometry.setIndex(d.index);
    detailGeometry.computeBoundingSphere();
    details = {
      geometry: detailGeometry,
      material: new THREE.MeshStandardMaterial({
        color: 0x70614a,
        roughness: 0.84,
      }),
    };
  }
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
  const asset = { geometry, material, prepare, details };
  cache.set(kind, asset);
  return asset;
}
