import * as THREE from "three";
import column from "./assets/models/civic_column_hf_mesh.json" with { type: "json" };
import pediment from "./assets/models/civic_pediment_hf_mesh.json" with { type: "json" };
import archstone from "./assets/models/civic_archstone_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import { createCityArchitectureVisual } from "./atlantis_architecture.js";

const definitions = {
  column: [
    column,
    new URL("./assets/models/civic_column_hf_color.webp", import.meta.url),
  ],
  pediment: [
    pediment,
    new URL("./assets/models/civic_pediment_hf_color.webp", import.meta.url),
  ],
  archstone: [
    archstone,
    new URL("./assets/models/civic_archstone_hf_color.webp", import.meta.url),
  ],
};
const kits = new Map();
let components = null;
let componentReferences = 0;

function releaseUnusedComponents(shared) {
  if (!kits.size && componentReferences === 0) {
    shared.dispose();
    if (components === shared) components = null;
  }
}

/** 新街区复用已验收构件；直接持有者与旧公共建筑共享同一生命周期。 */
export function acquireAtlantisCivicComponents() {
  if (!components) components = createComponents();
  const shared = components;
  componentReferences++;
  let released = false;
  return {
    materials: shared.materials,
    create: (...args) => shared.create(...args),
    prepare: (options) => shared.prepare(options),
    release() {
      if (released) return;
      released = true;
      componentReferences--;
      releaseUnusedComponents(shared);
    },
  };
}

/** 同一城邦的柱、山花与拱石共用三份源材质；合并套件由实际城市持有者释放。 */
function createComponents() {
  const sources = {},
    materials = {},
    preparations = [];
  for (const [kind, [packed, url]] of Object.entries(definitions)) {
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0xb7b4a2),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.computeBoundingBox();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.87,
      metalness: 0.03,
    });
    material.name = `atlantis_civic_${kind}_hf_stone`;
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
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    sources[kind] = geometry;
    materials[`civic_${kind}`] = material;
    preparations.push(prepare);
  }
  return {
    materials,
    create(kind, args) {
      const source = sources[kind],
        geometry = source.clone();
      const size = source.boundingBox.getSize(new THREE.Vector3());
      const center = source.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
      let width, height, depth, position, euler;
      if (kind === "column") {
        const [x, y, z, h, r = 1] = args;
        width = 2.8 * r;
        height = h;
        depth = 2.8 * r;
        position = [x, y + h / 2, z];
      } else if (kind === "pediment") {
        const [w, rise, d, y, z = 0] = args;
        width = w;
        height = rise;
        depth = d;
        // 浮雕下缘嵌入既有檐口，避免 HF 基底的小起伏形成悬空亮缝。
        position = [0, y + rise / 2 - 0.65, z];
        // 神殿的后山花转向外侧，浮雕不会朝向室内。
        if (z < 0) euler = [0, Math.PI, 0];
      } else {
        const [x, y, z, w, h, d, a] = args;
        width = w;
        height = h;
        depth = d;
        position = [x, y, z];
        euler = [0, 0, a];
      }
      geometry.scale(width / size.x, height / size.y, depth / size.z);
      return { geometry, key: `civic_${kind}`, transform: { position, euler } };
    },
    prepare(options) {
      return Promise.all(preparations.map((p) => p(options)));
    },
    dispose() {
      preparations.forEach((p) => p.dispose());
      Object.values(sources).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
  };
}

export function acquireAtlantisCivicKit(kind) {
  if (!["temple", "rotunda", "gateway"].includes(kind))
    throw Error(`Unknown civic kit: ${kind}`);
  if (!components) components = createComponents();
  if (!kits.has(kind)) {
    const kit = createCityArchitectureVisual(kind, components);
    kits.set(kind, { kit, references: 0 });
  }
  const entry = kits.get(kind),
    shared = components;
  entry.references++;
  let released = false;
  return {
    ...entry.kit,
    prepare: (options) => shared.prepare(options),
    release() {
      if (released) return;
      released = true;
      if (--entry.references === 0) {
        entry.kit.parts.forEach((p) => p.geometry.dispose());
        kits.delete(kind);
      }
      releaseUnusedComponents(shared);
    },
  };
}
