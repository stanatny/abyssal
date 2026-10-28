import * as THREE from "three";
import horse from "./assets/models/trojan_horse_hf_mesh.json" with { type: "json" };
import gate from "./assets/models/troy_gate_hf_mesh.json" with { type: "json" };
import houses from "./assets/models/troy_houses_hf_mesh.json" with { type: "json" };
import quay from "./assets/models/troy_quay_hf_mesh.json" with { type: "json" };
import rock from "./assets/models/bermuda_rock_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  coastal_rock: [
    rock,
    new URL("./assets/models/bermuda_rock_hf_color.webp", import.meta.url),
  ],
  trojan_horse: [
    horse,
    new URL("./assets/models/trojan_horse_hf_color.webp", import.meta.url),
  ],
  troy_gate: [
    gate,
    new URL("./assets/models/troy_gate_hf_color.webp", import.meta.url),
  ],
  troy_houses: [
    houses,
    new URL("./assets/models/troy_houses_hf_color.webp", import.meta.url),
  ],
  troy_quay: [
    quay,
    new URL("./assets/models/troy_quay_hf_color.webp", import.meta.url),
  ],
};

/** 海岸静态实体由地图持有；材质加载前保留同源顶点色，退出时取消未完成请求。 */
export function createOdysseyCoastAssets(keep) {
  const result = {};
  for (const [kind, [packed, url]] of Object.entries(definitions)) {
    const geometry = keep(
      decodeOrganicMesh(packed, null, (x, y, z, c) => c.set(0x91755a)),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.translate(0, -packed.min[1], 0);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.94,
        metalness: 0,
        side: THREE.DoubleSide,
        // 远岸属于空气中的天际线，不能套用角色所在水层的浓雾。
        fog: false,
      }),
    );
    material.name = `odyssey_${kind}_hf`;
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
    result[kind] = { geometry, material, prepare, packed };
    prepare();
  }
  return result;
}
