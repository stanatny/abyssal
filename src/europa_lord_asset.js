import * as THREE from "three";
import { decodePackedArray } from "./packed_array.js";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import brine_regent from "./assets/models/brine_regent_hf_mesh.json" with { type: "json" };
import lumen_stalker from "./assets/models/lumen_stalker_hf_mesh.json" with { type: "json" };
import abyss_weaver from "./assets/models/abyss_weaver_hf_mesh.json" with { type: "json" };
export const EUROPA_LORD_PACKED = { brine_regent, lumen_stalker, abyss_weaver };
const urls = {
  brine_regent: new URL(
    "./assets/models/brine_regent_hf_color.webp",
    import.meta.url,
  ),
  lumen_stalker: new URL(
    "./assets/models/lumen_stalker_hf_color.webp",
    import.meta.url,
  ),
  abyss_weaver: new URL(
    "./assets/models/abyss_weaver_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 只缓存不可变实体与色图；每实例发光参数与骨架独立。 */
export function europaLordAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    EUROPA_LORD_PACKED[kind],
    EUROPA_LORD_PACKED[kind].skinIndex ? null : bind,
    (x, y, z, c) =>
      c.set(
        kind === "brine_regent"
          ? 0x78848a
          : kind === "lumen_stalker"
            ? 0x334757
            : 0x68536f,
      ),
  );
  const glow = EUROPA_LORD_PACKED[kind].luminescence;
  geometry.setAttribute(
    "alienLuminescence",
    new THREE.BufferAttribute(
      glow
        ? decodePackedArray(glow, Uint8Array)
        : new Uint8Array(EUROPA_LORD_PACKED[kind].vertices),
      1,
      true,
    ),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0,
    vertexColors: true,
  });
  const instances = new Set();
  const sync = (target) => {
    const changed =
      target.map !== material.map ||
      target.vertexColors !== material.vertexColors;
    target.map = material.map;
    target.vertexColors = material.vertexColors;
    target.userData.texturesReady = material.userData.texturesReady;
    if (changed) target.needsUpdate = true;
  };
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
      for (const target of instances) sync(target);
    },
  );
  const asset = {
    geometry,
    material,
    prepare,
    attachMaterial(target) {
      instances.add(target);
      sync(target);
      return () => instances.delete(target);
    },
  };
  cache.set(kind, asset);
  return asset;
}
