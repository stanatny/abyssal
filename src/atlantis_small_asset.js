import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import spadefish from "./assets/models/spadefish_hf_mesh.json" with { type: "json" };
import seahorse from "./assets/models/seahorse_hf_mesh.json" with { type: "json" };
import cuttlefish from "./assets/models/cuttlefish_hf_mesh.json" with { type: "json" };
import pearl_nautilus from "./assets/models/pearl_nautilus_hf_mesh.json" with { type: "json" };
const data = { spadefish, seahorse, cuttlefish, pearl_nautilus };
const urls = {
  spadefish: new URL(
    "./assets/models/spadefish_hf_color.webp",
    import.meta.url,
  ),
  seahorse: new URL("./assets/models/seahorse_hf_color.webp", import.meta.url),
  cuttlefish: new URL(
    "./assets/models/cuttlefish_hf_color.webp",
    import.meta.url,
  ),
  pearl_nautilus: new URL(
    "./assets/models/pearl_nautilus_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 小型独有生物的共享表面与可恢复色图；失败时仍保留有辨识度的实体配色。 */
export function atlantisSmallAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, c) => {
    const pale = y < -0.025;
    c.set(
      kind === "spadefish"
        ? Math.sin((z + 0.47) * 31) > 0.5
          ? 0x343d42
          : 0xb4c3c5
        : kind === "seahorse"
          ? 0xbb9258
          : kind === "cuttlefish"
            ? pale
              ? 0xc5bba6
              : 0x967854
            : pale
              ? 0xd7cdb4
              : 0xe0dcc9,
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "pearl_nautilus" ? 0.5 : 0.67,
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
