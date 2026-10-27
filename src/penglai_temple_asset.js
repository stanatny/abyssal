import sword_pedestal from "./assets/models/sword_pedestal_hf_mesh.json" with { type: "json" };
import temple_censer from "./assets/models/temple_censer_hf_mesh.json" with { type: "json" };
import temple_pillar from "./assets/models/temple_pillar_hf_mesh.json" with { type: "json" };
import temple_pine from "./assets/models/temple_pine_hf_mesh.json" with { type: "json" };
import temple_balustrade from "./assets/models/temple_balustrade_hf_mesh.json" with { type: "json" };
import lattice from "./assets/models/temple_lattice_hf_mesh.json" with { type: "json" };
import * as THREE from "three";
import roof from "./assets/models/temple_roof_hf_mesh.json" with { type: "json" };
import bearer from "./assets/models/bixi_bearer_hf_mesh.json" with { type: "json" };
import crown from "./assets/models/bixi_crown_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
const definitions = {
  sword_pedestal: [
    sword_pedestal,
    new URL("./assets/models/sword_pedestal_hf_color.webp", import.meta.url),
  ],
  temple_censer: [
    temple_censer,
    new URL("./assets/models/temple_censer_hf_color.webp", import.meta.url),
  ],
  temple_pillar: [
    temple_pillar,
    new URL("./assets/models/temple_pillar_hf_color.webp", import.meta.url),
  ],
  temple_pine: [
    temple_pine,
    new URL("./assets/models/temple_pine_hf_color.webp", import.meta.url),
  ],
  temple_balustrade: [
    temple_balustrade,
    new URL("./assets/models/temple_balustrade_hf_color.webp", import.meta.url),
  ],

  temple_lattice: [
    lattice,
    new URL("./assets/models/temple_lattice_hf_color.webp", import.meta.url),
  ],
  temple_roof: [
    roof,
    new URL("./assets/models/temple_roof_hf_color.webp", import.meta.url),
  ],
  bixi_bearer: [
    bearer,
    new URL("./assets/models/bixi_bearer_hf_color.webp", import.meta.url),
  ],
  bixi_crown: [
    crown,
    new URL("./assets/models/bixi_crown_hf_color.webp", import.meta.url),
  ],
};
/** 资源只在本地图内共享；离开后连同下载队列、位图和显存一起释放。 */
export function createPenglaiTempleAsset(kind, keep) {
  const [packed, url] = definitions[kind];
  const geometry = keep(
    decodeOrganicMesh(packed, null, (x, y, z, c) => c.set(0xaeb5a4)),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  const roof = kind === "temple_roof";
  const material = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: roof ? 0.78 : 0.92,
      metalness: roof ? 0.08 : 0,
    }),
  );
  if (kind === "temple_lattice") {
    material.color.setRGB(1.8, 1.65, 1.5);
    material.roughness = 0.86;
  }
  if (kind === "temple_censer" || kind === "sword_pedestal") {
    material.roughness = 0.8;
    material.metalness = 0.22;
  }
  material.name = `penglai_${kind}_hf`;
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
  keep({ dispose: prepare.dispose });
  prepare();
  return { geometry, material, prepare, packed };
}

/** 从最终网格生成的分块接触边界，随建筑自身的朝向变换。 */
export function createPenglaiTempleCarvings(keep) {
  const assets = new Map();
  return function place(kind, parent, position, dimensions, colliders) {
    if (!assets.has(kind))
      assets.set(kind, createPenglaiTempleAsset(kind, keep));
    const a = assets.get(kind),
      mesh = new THREE.Mesh(a.geometry, a.material);
    mesh.name = `penglai_hf_${kind}`;
    mesh.position.set(...position);
    mesh.scale.set(
      ...dimensions.map((s, i) => s / (a.packed.max[i] - a.packed.min[i])),
    );
    mesh.userData.prepareMaterials = a.prepare;
    mesh.userData.hfTempleKind = kind;
    parent.add(mesh);
    mesh.updateWorldMatrix(true, false);
    const rotation = mesh.getWorldQuaternion(new THREE.Quaternion());
    const scale = mesh.getWorldScale(new THREE.Vector3());
    for (const c of a.packed.contacts) {
      const p = new THREE.Vector3(
        ...c.min.map((v, i) => (v + c.max[i]) / 2),
      ).applyMatrix4(mesh.matrixWorld);
      colliders.push({
        type: "box",
        kind: `penglai_hf_${kind}`,
        x: p.x,
        y: p.y,
        z: p.z,
        rotation,
        halfSize: {
          x: Math.max(0.04, ((c.max[0] - c.min[0]) * scale.x) / 2),
          y: Math.max(0.04, ((c.max[1] - c.min[1]) * scale.y) / 2),
          z: Math.max(0.04, ((c.max[2] - c.min[2]) * scale.z) / 2),
        },
      });
    }
    return mesh;
  };
}
