import * as THREE from "three";
import pilaster from "./assets/models/neighborhood_pilaster_hf_mesh.json" with { type: "json" };
import gable from "./assets/models/neighborhood_gable_hf_mesh.json" with { type: "json" };
import frieze from "./assets/models/neighborhood_frieze_hf_mesh.json" with { type: "json" };
import crown from "./assets/models/neighborhood_crown_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import { createNeighborhoodArchitectureVisual } from "./atlantis_architecture.js";
import { acquireAtlantisCivicComponents } from "./atlantis_civic_asset.js";

const definitions = {
  pilaster: [
    pilaster,
    new URL(
      "./assets/models/neighborhood_pilaster_hf_color.webp",
      import.meta.url,
    ),
  ],
  gable: [
    gable,
    new URL(
      "./assets/models/neighborhood_gable_hf_color.webp",
      import.meta.url,
    ),
  ],
  frieze: [
    frieze,
    new URL(
      "./assets/models/neighborhood_frieze_hf_color.webp",
      import.meta.url,
    ),
  ],
  crown: [
    crown,
    new URL(
      "./assets/models/neighborhood_crown_hf_color.webp",
      import.meta.url,
    ),
  ],
};
const kinds = ["courtyard", "villa", "stoa", "tower"];
const kits = new Map();
let components = null;

/** 街区只替换限定雕刻构件，原墙体、通道和碰撞由建筑模板继续管理。 */
function createComponents() {
  const civic = acquireAtlantisCivicComponents();
  const sources = {},
    materials = { ...civic.materials },
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
    material.name = `atlantis_neighborhood_${kind}_hf_stone`;
    preparations.push(
      createMaterialPreparation(
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
      ),
    );
    sources[kind] = geometry;
    materials[`neighborhood_${kind}`] = material;
  }
  return {
    prefix: "neighborhood",
    materials,
    supports: (name) => name === "column" || Object.hasOwn(definitions, name),
    create(kind, args) {
      if (kind === "column") return civic.create(kind, args);
      const source = sources[kind],
        geometry = source.clone();
      const size = source.boundingBox.getSize(new THREE.Vector3());
      const center = source.boundingBox.getCenter(new THREE.Vector3());
      const [width, height, depth, x, y, z] = args;
      geometry.translate(-center.x, -center.y, -center.z);
      geometry.scale(width / size.x, height / size.y, depth / size.z);
      return {
        geometry,
        key: `neighborhood_${kind}`,
        transform: { position: [x, y, z] },
      };
    },
    prepare(options) {
      return Promise.all([
        civic.prepare(options),
        ...preparations.map((p) => p(options)),
      ]);
    },
    dispose() {
      preparations.forEach((p) => p.dispose());
      Object.values(sources).forEach((g) => g.dispose());
      for (const kind of Object.keys(definitions))
        materials[`neighborhood_${kind}`].dispose();
      civic.release();
    },
  };
}

export function acquireAtlantisNeighborhoodKit(kind) {
  if (!kinds.includes(kind)) throw Error(`Unknown neighborhood kit: ${kind}`);
  if (!components) components = createComponents();
  if (!kits.has(kind)) {
    const kit = createNeighborhoodArchitectureVisual(kind, {
      ...components,
      methods: kind === "tower" ? ["column"] : [],
    });
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
      if (!kits.size) {
        shared.dispose();
        components = null;
      }
    },
  };
}
