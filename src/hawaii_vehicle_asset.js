import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import submarine from "./assets/models/submarine_hf_mesh.json" with { type: "json" };
import attackTorpedo from "./assets/models/attack_torpedo_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const sources = { submarine, attack_torpedo: attackTorpedo };
const urls = {
  submarine: new URL(
    "./assets/models/submarine_hf_color.webp",
    import.meta.url,
  ),
  attack_torpedo: new URL(
    "./assets/models/attack_torpedo_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 按最后一个使用者释放实体、色图和转子；图鉴关闭缓存不会破坏世界里的同类艇。 */
export function acquireHawaiiVehicleAsset(kind) {
  let asset = cache.get(kind);
  if (!asset) {
    const data = sources[kind];
    if (!data) throw Error(`Unknown vehicle asset: ${kind}`);
    const geometry = decodeOrganicMesh(data, null, (x, y, z, color) => {
      color.set(y > (data.fittings?.axisY || 0) ? 0xb3b7af : 0x344d60);
    });
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      // 赭金涂层沿用原色图的明暗、接缝和磨损；仅潜艇着色，鱼雷及其他资产保持原色。
      color: kind === "submarine" ? 0xd9b45f : 0xffffff,
      roughness: 0.62,
      metalness: 0.22,
      vertexColors: true,
    });
    material.name = `${kind}_hf_pressure_shell`;
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
    const rotorGeometry = makeRotorGeometry(kind === "submarine" ? 7 : 5);
    const rotorMaterial = new THREE.MeshStandardMaterial({
      color: 0x939d9d,
      metalness: 0.55,
      roughness: 0.46,
    });
    asset = {
      data,
      geometry,
      material,
      prepare,
      rotorGeometry,
      rotorMaterial,
      references: 0,
    };
    cache.set(kind, asset);
  }
  asset.references++;
  let released = false;
  return {
    ...asset,
    release() {
      if (released) return;
      released = true;
      if (--asset.references > 0) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      asset.rotorGeometry.dispose();
      asset.rotorMaterial.dispose();
      cache.delete(kind);
    },
  };
}

function makeRotorGeometry(blades) {
  const parts = [];
  const blade = new THREE.Shape();
  blade.moveTo(0.12, 0.0);
  blade.quadraticCurveTo(0.55, -0.06, 0.92, 0.17);
  blade.quadraticCurveTo(1.03, 0.28, 0.91, 0.4);
  blade.quadraticCurveTo(0.52, 0.3, 0.15, 0.2);
  blade.closePath();
  const source = new THREE.ExtrudeGeometry(blade, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2,
    curveSegments: 6,
    steps: 1,
  });
  for (let i = 0; i < blades; i++) {
    const part = source.clone();
    part.rotateX(0.24);
    part.rotateZ((i * Math.PI * 2) / blades);
    parts.push(part);
  }
  source.dispose();
  const hub = new THREE.SphereGeometry(0.22, 12, 8).toNonIndexed();
  hub.scale(1, 1, 1.4);
  parts.push(hub);
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}
