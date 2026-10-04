import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { skinMaterial } from "./creature_surface.js";
import { cachedAlienGeometry } from "./creature_europa_geometry.js";

const coloredSkin = skinMaterial({
  color: "#ffffff",
  vertexColors: true,
  roughness: 0.52,
  pattern: 0.09,
});

/** 同一关节内的实体肌肤与硬甲用顶点体色合批，保留发光腔及所有运动关节。 */
export function batchEuropaAnatomy(group, kind, path = "root") {
  for (const [i, child] of [...group.children].entries())
    if (child.isGroup) batchEuropaAnatomy(child, kind, `${path}_${i}`);
  const parts = group.children.filter(
    (m) =>
      m.isMesh &&
      !m.userData.keepSeparate &&
      !Array.isArray(m.material) &&
      !m.material.transparent &&
      m.material.emissiveIntensity === 0 &&
      !m.material.vertexColors,
  );
  if (parts.length < 2) return;
  const geometry = cachedAlienGeometry(`colored_${kind}_${path}`, () => {
    const copies = parts.map((mesh) => {
      const copy = mesh.geometry.clone();
      // 该材质只用位置程序纹理；统一非必要属性，兼容闭合躯干与带UV的触腕。
      copy.deleteAttribute("uv");
      mesh.updateMatrix();
      copy.applyMatrix4(mesh.matrix);
      const color = mesh.material.color,
        count = copy.attributes.position.count;
      copy.computeBoundingBox();
      const bounds = copy.boundingBox,
        span = Math.max(0.01, bounds.max.y - bounds.min.y);
      const values = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const position = copy.attributes.position;
        const top = (position.getY(i) - bounds.min.y) / span;
        // 受光面与腹面有连贯色阶，组织纹理不以高强度发光代替结构。
        const shade =
          1.08 - top * 0.26 + Math.sin(position.getZ(i) * 52) * 0.018;
        values.set([color.r * shade, color.g * shade, color.b * shade], i * 3);
      }
      copy.setAttribute("color", new THREE.BufferAttribute(values, 3));
      return copy;
    });
    const merged = mergeGeometries(copies);
    copies.forEach((g) => g.dispose());
    if (!merged)
      throw new Error(`Failed to batch Europa anatomy: ${kind}/${path}`);
    return merged;
  });
  group.remove(...parts);
  const mesh = new THREE.Mesh(geometry, coloredSkin);
  mesh.name = "colored_alien_anatomy";
  group.add(mesh);
}
