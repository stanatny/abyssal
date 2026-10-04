import * as THREE from "three";
const euler = new THREE.Euler(0, 0, 0, "YXZ");
/** 水生爬行动物以稳定背侧朝上转向，避免单向量最短弧造成翻滚。 */
export function aquaticHeading(out, direction, previousYaw = 0) {
  const horizontal = Math.hypot(direction.x, direction.z);
  const yaw =
    horizontal > 1e-5 ? Math.atan2(-direction.x, -direction.z) : previousYaw;
  const pitch = THREE.MathUtils.clamp(
    Math.atan2(direction.y, horizontal),
    -0.65,
    0.65,
  );
  return out.setFromEuler(euler.set(pitch, yaw, 0));
}
/** 鳄类仅在尾根后传播侧波，躯干、骨甲和后肢根部保持一致。 */
export function bindCrocodilianTail(mesh, motions) {
  const geometry = mesh.geometry,
    p = geometry.attributes.position;
  if (!geometry.attributes.skinIndex) {
    const ids = [],
      weights = [];
    for (let i = 0; i < p.count; i++) {
      const f = THREE.MathUtils.clamp((p.getZ(i) - 0.3) / 0.6, 0, 1) * 6;
      const k = Math.min(5, Math.floor(f)),
        u = f - k;
      ids.push(k, k + 1, 0, 0);
      weights.push(1 - u, u, 0, 0);
    }
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
  }
  const skin = new THREE.SkinnedMesh(geometry, mesh.material);
  skin.name = mesh.name;
  skin.userData.keepSeparate = true;
  mesh.parent.add(skin);
  mesh.parent.remove(mesh);
  const bones = Array.from({ length: 7 }, () => new THREE.Bone());
  bones[0].position.z = 0.3;
  skin.add(bones[0]);
  for (let i = 1; i < 7; i++) {
    bones[i].position.z = 0.1;
    bones[i - 1].add(bones[i]);
  }
  skin.bind(new THREE.Skeleton(bones));
  geometry.computeBoundingSphere();
  skin.boundingSphere = geometry.boundingSphere.clone();
  skin.boundingSphere.radius += 0.12;
  motions.push((t, e) => {
    let previous = 0;
    for (let i = 1; i < 7; i++) {
      const tangent =
        Math.sin(t * 0.95 - i * 0.7) * (i / 6) * (0.32 + Math.min(3, e) * 0.07);
      bones[i].rotation.y = tangent - previous;
      previous = tangent;
    }
  });
  return skin;
}
