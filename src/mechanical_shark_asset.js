import * as THREE from "three";
import packed from "./assets/models/mechanical_shark_mesh.json" with { type: "json" };

// 尾柄结束后整片尾鳍只随同一骨骼摆动，不能把上/下叶沿Z再折成多段。
const stations = [0.12, 0.22, 0.31, 0.375];
let geometry;
const material = new THREE.MeshStandardMaterial({
  color: 0x1c4e9a,
  roughness: 0.38,
  metalness: 0.66,
});
material.name = "mechanical_shark_blue_frame";
material.userData.texturesReady = true;
/** Offline machined finish; keep the startup contract without runtime texture requests. */
export function prepareMechanicalSharkMaterials() {
  return Promise.resolve(true);
}

const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
function decode(value, Type) {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new Type(bytes.buffer);
}

function sharedGeometry() {
  if (geometry) return geometry;
  const positions = decode(packed.position, Uint16Array);
  const xyz = new Float32Array(positions.length);
  for (let i = 0; i < xyz.length; i++) {
    const axis = i % 3;
    xyz[i] =
      packed.min[axis] +
      (positions[i] / 65535) * (packed.max[axis] - packed.min[axis]);
  }
  const ids = new Uint16Array(packed.vertices * 4);
  const weights = new Float32Array(packed.vertices * 4);
  for (let i = 0; i < packed.vertices; i++) {
    const x = xyz[i * 3],
      y = xyz[i * 3 + 1],
      z = xyz[i * 3 + 2];
    let joint = 0;
    while (joint < stations.length - 2 && z > stations[joint + 1]) joint++;
    const axial = smooth(stations[joint], stations[joint + 1], z);
    // 下颌在嘴缝以下，鳍根渐变；保持 UV 接缝两侧顶点得到相同权重。
    const jawLine = THREE.MathUtils.lerp(
      -0.052,
      -0.025,
      1 - smooth(-0.46, -0.34, z),
    );
    const launcher =
      smooth(0.035, 0.055, Math.abs(x)) * (1 - smooth(-0.1, -0.08, y));
    const jaw =
      (1 - smooth(-0.39, -0.3, z)) *
      (1 - smooth(jawLine - 0.006, jawLine + 0.006, y)) *
      (1 - launcher);
    const fin =
      smooth(0.098, 0.158, Math.abs(x)) *
      (1 - smooth(-0.07, -0.035, y)) *
      smooth(-0.23, -0.18, z) *
      (1 - smooth(0.06, 0.11, z));
    const appendage = Math.max(jaw, fin);
    const k = i * 4;
    ids[k] = joint;
    ids[k + 1] = joint + 1;
    ids[k + 2] = jaw > fin ? 4 : x < 0 ? 5 : 6;
    weights[k] = (1 - axial) * (1 - appendage);
    weights[k + 1] = axial * (1 - appendage);
    weights[k + 2] = appendage;
  }
  geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(xyz, 3));
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(decode(packed.normal, Int16Array), 3, true),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(decode(packed.uv, Uint16Array), 2, true),
  );
  geometry.setAttribute("skinIndex", new THREE.BufferAttribute(ids, 4));
  geometry.setAttribute("skinWeight", new THREE.BufferAttribute(weights, 4));
  geometry.setIndex(
    new THREE.BufferAttribute(decode(packed.index, Uint16Array), 1),
  );
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

/**
 * 将 HF 实体网格绑定到独立连续骨架，跨游戏角色和图鉴只共享不可变资源。
 * @param {THREE.Group} root 未缩放的角色根节点。
 * @returns {{body:THREE.SkinnedMesh,bones:THREE.Bone[]}} 网格和实例骨架。
 */
export function createMechanicalSharkRig(root) {
  const bones = stations.map((z, i) => {
    const bone = new THREE.Bone();
    bone.name = ["armored_hull", "tail_servo", "tail_joint", "swept_caudal"][i];
    bone.position.z = z - (i ? stations[i - 1] : 0);
    return bone;
  });
  bones.forEach((bone, i) => (i ? bones[i - 1] : root).add(bone));
  for (const [name, position] of [
    ["segmented_jaw", [0, -0.038, -0.265]],
    // 转轴贴合实际胸鳍根（腹侧），避免放大动作时从躯干中部拉长鳍根。
    ["servo_pectoral_-1", [-0.1, -0.07, -0.16]],
    ["servo_pectoral_1", [0.1, -0.07, -0.16]],
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...position);
    bone.position.z -= stations[0];
    bones[0].add(bone);
    bones.push(bone);
  }
  const body = new THREE.SkinnedMesh(sharedGeometry(), material);
  body.name = "mechanical_shark_hf_body";
  body.userData.keepSeparate = true;
  root.add(body);
  root.updateMatrixWorld(true);
  body.bind(new THREE.Skeleton(bones));
  body.boundingSphere = geometry.boundingSphere.clone();
  body.boundingSphere.radius += 0.15;
  return { body, bones };
}
