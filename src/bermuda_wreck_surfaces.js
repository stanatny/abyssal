import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { applyWreckCorrosion } from "./bermuda_wreck_decay.js";

const definitions = {
  hull: { tile: 12, bump: 0.09, roughness: 0.88, metalness: 0.18 },
  deck: { tile: 2.4, bump: 0.035, roughness: 0.96, metalness: 0 },
  enamel: { tile: 8, bump: 0.045, roughness: 0.88, metalness: 0.08 },
};
const urls = {
  hull: [
    new URL("./assets/textures/bermuda_hull_hf_color.webp", import.meta.url),
    new URL("./assets/textures/bermuda_hull_hf_height.webp", import.meta.url),
  ],
  deck: [
    new URL("./assets/textures/bermuda_deck_hf_color.webp", import.meta.url),
    new URL("./assets/textures/bermuda_deck_hf_height.webp", import.meta.url),
  ],
  enamel: [
    new URL("./assets/textures/bermuda_enamel_hf_color.webp", import.meta.url),
    new URL("./assets/textures/bermuda_enamel_hf_height.webp", import.meta.url),
  ],
};

/** 只改已有船体材质及 UV；构件、顶点和碰撞继续由原工厂维护。 */
export function createBermudaWreckSurfaces() {
  const groups = new Map(),
    slots = [];
  let disposed = false;
  for (const [kind, settings] of Object.entries(definitions)) {
    const group = { materials: new Set(), color: null, height: null, settings };
    groups.set(kind, group);
    for (const [index, channel] of ["color", "height"].entries())
      slots.push({
        name: `${kind}_${channel}`,
        url: urls[kind][index],
        colorSpace:
          channel === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace,
        apply(texture) {
          texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
          texture.anisotropy = 4;
          group[channel] = texture;
          for (const material of group.materials) update(material, group);
        },
      });
  }
  function update(material, group) {
    // 色图成功之前保留旧底色；高程失败也不会让表面变白或透明。
    material.map = group.color;
    material.bumpMap = group.height;
    if (group.color) material.color.setScalar(1);
    material.userData.wreckSurfaceReady = !!group.color && !!group.height;
    material.needsUpdate = true;
  }
  const prepare = createMaterialPreparation(slots, () => {});
  return {
    prepare,
    groups,
    apply(material, kind) {
      const group = groups.get(kind);
      if (!group || disposed) throw new Error("Invalid wreck surface owner");
      group.materials.add(material);
      material.userData.wreckSurfaceKind = kind;
      material.bumpScale = group.settings.bump;
      material.roughness = group.settings.roughness;
      material.metalness = group.settings.metalness;
      // 替换旧的逐像素程序噪声，避免与真实生成表面叠加出重复的木纹。
      applyWreckCorrosion(material, kind);
      update(material, group);
    },
    project(root) {
      root.traverse((node) => {
        if (!node.isMesh) return;
        const group = groups.get(node.material.userData.wreckSurfaceKind);
        if (!group) return;
        const geometry = node.geometry,
          p = geometry.attributes.position,
          n = geometry.attributes.normal,
          uv = new Float32Array(p.count * 2),
          tile = group.settings.tile;
        for (let i = 0; i < p.count; i++) {
          const nx = Math.abs(n.getX(i)),
            ny = Math.abs(n.getY(i)),
            nz = Math.abs(n.getZ(i));
          // 原箱体逐面独立顶点；弧形船舷以 Z/Y 投影保持整段钢板连续。
          const axes =
            node.material.name === "double_hull"
              ? [2, 1]
              : ny > nx && ny > nz
                ? [0, 2]
                : nx > nz
                  ? [2, 1]
                  : [0, 1];
          uv[i * 2] = p.array[i * 3 + axes[0]] / tile;
          uv[i * 2 + 1] = -p.array[i * 3 + axes[1]] / tile;
        }
        geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      prepare.dispose();
      for (const group of groups.values()) {
        group.materials.clear();
        group.color = group.height = null;
      }
    },
  };
}
