import * as THREE from "three";
import packed from "./assets/models/bermuda_titan_bones_hf_mesh.json" with { type: "json" };
import { decodePackedArray } from "./packed_array.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const contacts = Object.freeze(
    packed.contacts.map((contact) =>
      Object.freeze({
        ...contact,
        center: Object.freeze([...contact.center]),
        half: Object.freeze([...contact.half]),
        quaternion: Object.freeze([...contact.quaternion]),
      }),
    ),
  ),
  colorUrl = new URL(
    "./assets/models/bermuda_titan_bones_hf_color.webp",
    import.meta.url,
  ),
  physicalUrl = new URL(
    "./assets/models/bermuda_titan_bones_hf_metallic_roughness.webp",
    import.meta.url,
  );
let cached;

/** 两处骨骸共享实体、原始 PBR 与接触数据；最后一个租约退出时才释放。 */
export function acquireBermudaTitanBoneAsset() {
  if (!cached) {
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, color) =>
      color.set(0xb2a18c),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const farGeometry = new THREE.BufferGeometry();
    for (const name of ["position", "normal", "color"])
      farGeometry.setAttribute(name, geometry.getAttribute(name));
    farGeometry.setIndex(
      new THREE.BufferAttribute(
        decodePackedArray(packed.farIndex, Uint16Array),
        1,
      ),
    );
    farGeometry.boundingBox = geometry.boundingBox.clone();
    farGeometry.boundingSphere = geometry.boundingSphere.clone();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    material.name = "bermuda_titan_bones_hf_original_pbr";
    material.userData.sourceSha256 = packed.sourceSha256;
    const farMaterial = material.clone();
    farMaterial.name = "bermuda_titan_bones_hf_distant_vertex_color";
    const asset = {
      geometry,
      farGeometry,
      material,
      farMaterial,
      references: 0,
      prepare: null,
    };
    asset.prepare = createMaterialPreparation(
      [
        {
          name: "original_color",
          url: colorUrl,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            material.color.fromArray(packed.pbr.baseColor);
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
        {
          name: "original_physical",
          url: physicalUrl,
          colorSpace: THREE.NoColorSpace,
          apply(texture) {
            material.roughnessMap = texture;
            material.metalnessMap = texture;
            material.roughness = packed.pbr.roughness;
            material.metalness = packed.pbr.metalness;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    cached = asset;
  }
  const asset = cached;
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    farGeometry: asset.farGeometry,
    material: asset.material,
    farMaterial: asset.farMaterial,
    contacts,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.farGeometry.dispose();
      asset.material.dispose();
      asset.farMaterial.dispose();
      if (cached === asset) cached = undefined;
    },
  };
}
