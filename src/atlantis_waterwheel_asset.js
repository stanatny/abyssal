import * as THREE from "three";
import valve from "./assets/models/waterwheel_valve_hf_mesh.json" with { type: "json" };
import gate from "./assets/models/waterwheel_gate_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  valve: [
    valve,
    new URL("./assets/models/waterwheel_valve_hf_color.webp", import.meta.url),
    [8, 6, 3.8],
  ],
  gate: [
    gate,
    new URL("./assets/models/waterwheel_gate_hf_color.webp", import.meta.url),
    [13, 10, 1.3],
  ],
};
const cache = new Map();

/** 道具独立引用计数；同类材质和网格共用，阀轮与升闸位移属于各自实例。 */
export function acquireWaterwheelAsset(kind) {
  if (!definitions[kind]) throw Error(`Unknown waterwheel asset: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url, dimensions] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0x8d9988),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    geometry.scale(...dimensions.map((v, i) => v / size.getComponent(i)));
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.25,
      emissive: 0xffffff,
      emissiveIntensity: 0,
    });
    material.name = `atlantis_waterwheel_${kind}_hf`;
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            // 仅让任务浮雕保留微弱底色；不加灯、不改变环境照明和提示节奏。
            material.emissiveMap = texture;
            material.emissiveIntensity = 0.22;
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    const parts = [geometry];
    cache.set(kind, { parts, material, prepare, references: 0 });
  }
  const entry = cache.get(kind);
  entry.references++;
  let released = false;
  return {
    material: entry.material,
    prepare: entry.prepare,
    create(part = 0) {
      const mesh = new THREE.Mesh(entry.parts[part], entry.material);
      mesh.name = `atlantis_waterwheel_${kind}_${part}_hf`;
      mesh.userData.artRevision = "trellis_waterwheel_20261031";
      mesh.userData.prepareMaterials = entry.prepare;
      return mesh;
    },
    release() {
      if (released) return;
      released = true;
      if (--entry.references) return;
      entry.prepare.dispose();
      entry.parts.forEach((g) => g.dispose());
      entry.material.dispose();
      cache.delete(kind);
    },
  };
}
