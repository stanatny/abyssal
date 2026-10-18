import * as THREE from "three";
import packed from "./assets/models/zombie_shark_mesh.json" with { type: "json" };

// 尾柄结束后整片尾鳍只随同一骨骼摆动，不能把上/下叶沿Z再折成多段。
const stations = [-0.04, 0.1, 0.23, 0.315];
let geometry;
const material = new THREE.MeshStandardMaterial({
  color: 0x8a9694,
  roughness: 0.78,
  metalness: 0,
});
material.name = "zombie_shark_torn_hide";
let textureTask;

/**
 * 共享两张贴图；超时或离线仍保留实体伤口网格，不阻塞启动、不重复分配资源。
 * @returns {Promise<boolean>} 两张贴图是否都已就绪。
 */
export function prepareZombieSharkMaterials() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (textureTask) return textureTask;
  const load = async (url, colorSpace) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Zombie texture unavailable");
      const bitmap = await createImageBitmap(await response.blob());
      const texture = new THREE.Texture(bitmap);
      texture.flipY = false;
      texture.colorSpace = colorSpace;
      texture.needsUpdate = true;
      return texture;
    } finally {
      clearTimeout(timer);
    }
  };
  textureTask = Promise.allSettled([
    load(
      new URL("./assets/models/zombie_shark_color.webp", import.meta.url),
      THREE.SRGBColorSpace,
    ),
    load(
      new URL("./assets/models/zombie_shark_surface.webp", import.meta.url),
      THREE.NoColorSpace,
    ),
  ]).then(([color, surface]) => {
    if (color.status === "fulfilled") {
      material.map = color.value;
      material.color.set(0xffffff);
    }
    if (surface.status === "fulfilled") material.roughnessMap = surface.value;
    material.needsUpdate = true;
    material.userData.texturesReady =
      color.status === "fulfilled" && surface.status === "fulfilled";
    return material.userData.texturesReady;
  });
  return textureTask;
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
      -0.058,
      -0.023,
      1 - smooth(-0.44, -0.29, z),
    );
    const jaw =
      (1 - smooth(-0.33, -0.255, z)) *
      (1 - smooth(jawLine - 0.006, jawLine + 0.006, y));
    const fin =
      smooth(0.1, 0.155, Math.abs(x)) *
      (1 - smooth(-0.052, -0.022, y)) *
      smooth(-0.24, -0.17, z) *
      (1 - smooth(0.13, 0.22, z));
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
 * 将 HF 实体网格绑定到独立连续骨架，跨本尊、仆从和图鉴只共享不可变资源。
 * @param {THREE.Group} root 未缩放的角色根节点。
 * @returns {{body:THREE.SkinnedMesh,bones:THREE.Bone[]}} 网格和实例骨架。
 */
export function createZombieSharkRig(root) {
  const bones = stations.map((z, i) => {
    const bone = new THREE.Bone();
    bone.name = `zombie_shark_axial_${i}`;
    bone.position.z = z - (i ? stations[i - 1] : 0);
    return bone;
  });
  bones.forEach((bone, i) => (i ? bones[i - 1] : root).add(bone));
  for (const [name, position] of [
    ["zombie_shark_broken_mandible", [0, -0.036, -0.285]],
    // 转轴贴合实际胸鳍根（腹侧），避免放大动作时从躯干中部拉长鳍根。
    ["zombie_shark_pectoral_-1", [-0.1, -0.105, -0.105]],
    ["zombie_shark_pectoral_1", [0.1, -0.105, -0.105]],
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...position);
    bone.position.z -= stations[0];
    bones[0].add(bone);
    bones.push(bone);
  }
  const body = new THREE.SkinnedMesh(sharedGeometry(), material);
  body.name = "zombie_shark_hf_body";
  body.userData.keepSeparate = true;
  root.add(body);
  root.updateMatrixWorld(true);
  body.bind(new THREE.Skeleton(bones));
  body.boundingSphere = geometry.boundingSphere.clone();
  body.boundingSphere.radius += 0.15;
  return { body, bones };
}
