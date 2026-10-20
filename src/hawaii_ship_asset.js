import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import cruise from "./assets/models/cruise_hf_mesh.json" with { type: "json" };
import schooner from "./assets/models/schooner_hf_mesh.json" with { type: "json" };
import sloop from "./assets/models/sloop_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  cruise: [
    cruise,
    new URL("./assets/models/cruise_hf_color.webp", import.meta.url),
  ],
  schooner: [
    schooner,
    new URL("./assets/models/schooner_hf_color.webp", import.meta.url),
  ],
  sloop: [
    sloop,
    new URL("./assets/models/sloop_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 船体实体和贴图按船种共享；场景释放最后一个所有者后再回收。 */
export function acquireHawaiiShipAsset(kind) {
  const definition = definitions[kind];
  if (!definition) throw new Error(`Unknown Hawaii ship: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definition;
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, color) =>
      color.set(0x68868d),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: kind === "schooner" ? 0.78 : 0.6,
      metalness: kind === "cruise" ? 0.12 : 0.02,
      side: THREE.DoubleSide,
    });
    material.name = `${kind}_hf_hull_and_superstructure`;
    const riggingGeometry =
      kind === "cruise" ? null : makeRigging(geometry, kind);
    const riggingMaterial = riggingGeometry
      ? new THREE.MeshStandardMaterial({ color: 0x48453d, roughness: 0.85 })
      : null;
    const asset = {
      geometry,
      material,
      riggingGeometry,
      riggingMaterial,
      references: 0,
      prepare: null,
    };
    asset.prepare = createMaterialPreparation(
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
    cache.set(kind, asset);
  }
  const asset = cache.get(kind);
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    material: asset.material,
    riggingGeometry: asset.riggingGeometry,
    riggingMaterial: asset.riggingMaterial,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references > 0) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      asset.riggingGeometry?.dispose();
      asset.riggingMaterial?.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}

// 仅在实际桅顶与甲板网格端点之间连接索具，合成一个有界绘制件。
function makeRigging(body, kind) {
  const p = body.attributes.position,
    indices = new Set(body.index.array),
    point = new THREE.Vector3();
  const snap = (xyz) => {
    const target = new THREE.Vector3(...xyz);
    let nearest = new THREE.Vector3(),
      distance = Infinity;
    for (const i of indices) {
      point.fromBufferAttribute(p, i);
      const d = point.distanceToSquared(target);
      if (d < distance) {
        distance = d;
        nearest.copy(point);
      }
    }
    return nearest;
  };
  const masts =
      kind === "sloop"
        ? [[0, 0.845, -0.09]]
        : [
            [0, 0.83, -0.19],
            [0, 0.7, 0.13],
          ],
    lines = [];
  const anchors = masts.map((m) => snap(m));
  for (let i = 0; i < masts.length; i++) {
    const top = anchors[i];
    const feet = [
      [-0.09, 0.105, masts[i][2]],
      [0.09, 0.105, masts[i][2]],
    ];
    if (i === 0) feet.push([0, 0.08, -0.48]);
    if (i === masts.length - 1) feet.push([0, 0.1, 0.45]);
    for (const foot of feet) lines.push([top, snap(foot)]);
    if (i > 0) lines.push([anchors[i - 1], top]);
  }
  const parts = [];
  for (const [a, b] of lines) {
    const direction = b.clone().sub(a),
      g = new THREE.CylinderGeometry(0.0013, 0.0013, direction.length(), 5, 1);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    );
    g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    parts.push(g);
  }
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  return geometry;
}
