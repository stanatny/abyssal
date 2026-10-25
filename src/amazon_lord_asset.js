import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import thunderbarbel from "./assets/models/thunderbarbel_hf_mesh.json" with { type: "json" };
import yacumama from "./assets/models/yacumama_hf_mesh.json" with { type: "json" };
import rootjaw from "./assets/models/rootjaw_hf_mesh.json" with { type: "json" };
const packed = { thunderbarbel, yacumama, rootjaw };
const urls = {
  thunderbarbel: new URL(
    "./assets/models/thunderbarbel_hf_color.webp",
    import.meta.url,
  ),
  yacumama: new URL("./assets/models/yacumama_hf_color.webp", import.meta.url),
  rootjaw: new URL("./assets/models/rootjaw_hf_color.webp", import.meta.url),
};
const cache = new Map();
/** Shared immutable skin/texture; each lord owns its skeleton and charged-barbel material. */
export function amazonLordAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(packed[kind], bind, (x, y, z, c) =>
    c.set(
      kind === "thunderbarbel"
        ? 0x5d604b
        : kind === "yacumama"
          ? 0x6c7043
          : 0x5b6344,
    ),
  );
  if (kind === "thunderbarbel") {
    const p = geometry.attributes.position,
      idx = geometry.index.array,
      skin = [],
      whiskers = [];
    for (let i = 0; i < idx.length; i += 3) {
      const tri = Array.from(idx.subarray(i, i + 3));
      (tri.every((v) => p.getZ(v) < -0.26 && p.getY(v) < -0.105)
        ? whiskers
        : skin
      ).push(...tri);
    }
    geometry.setIndex([...skin, ...whiskers]);
    geometry.clearGroups();
    geometry.addGroup(0, skin.length, 0);
    geometry.addGroup(skin.length, whiskers.length, 1);
  }
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0,
    vertexColors: true,
  });
  material.name = kind + "_hf_skin";
  // Reduce baked darkness while retaining ordinary scene lighting and species markings.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
  #ifdef USE_MAP
    diffuseColor.rgb = mix(diffuseColor.rgb, sqrt(max(diffuseColor.rgb, vec3(0.0))) * .72, .28);
  #endif`,
    );
  };
  material.customProgramCacheKey = () => "amazon_lord_albedo_v1";
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
    (ready) => (material.userData.texturesReady = ready),
  );
  const asset = { geometry, material, prepare, packed: packed[kind] };
  cache.set(kind, asset);
  return asset;
}
