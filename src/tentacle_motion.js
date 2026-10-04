import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * 沿弯曲腕足中心线建立独立骨架；皮肤、吸盘及附着纹饰共享同一连续变形。
 * @param {THREE.Group} arm 原始静态腕组，子部件变换会烘焙进共享几何。
 * @param {string} key 稳定的解剖缓存键。
 * @param {THREE.Curve} curve 腕组局部坐标的完整中心线。
 * @param {Function[]} motions 主循环持有的动作列表。
 * @param {object} options 骨节数量、相位及可选战斗收腕状态。
 * @returns {object} 独立骨架和网格，方便完整周期和资源检查。
 */
export function bindTentacleMotion(arm, key, curve, motions, options = {}) {
  const count = options.count ?? 10;
  const points = Array.from({ length: count + 1 }, (_, i) =>
    curve.getPointAt(i / count),
  );
  arm.updateWorldMatrix(true, true);
  const inverse = arm.matrixWorld.clone().invert();
  const parts = [];
  arm.traverse((part) => {
    if (part.isMesh) parts.push(part);
  });
  if (!CACHE.has(key)) {
    const batches = new Map();
    const matrix = new THREE.Matrix4();
    for (const part of parts) {
      const g = part.geometry.index
        ? part.geometry.toNonIndexed()
        : part.geometry.clone();
      matrix.multiplyMatrices(inverse, part.matrixWorld);
      g.applyMatrix4(matrix);
      const p = g.attributes.position;
      // 不同装饰必须拥有一致的属性布局，缺失顶点色补白而不是丢掉原体色。
      if (!g.attributes.color)
        g.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(
            new Float32Array(p.count * 3).fill(1),
            3,
          ),
        );
      if (!g.attributes.uv)
        g.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(new Float32Array(p.count * 2), 2),
        );
      if (!g.attributes.normal) g.computeVertexNormals();
      for (const name of Object.keys(g.attributes))
        if (!["position", "normal", "color", "uv"].includes(name))
          g.deleteAttribute(name);
      if (!batches.has(part.material)) batches.set(part.material, []);
      batches.get(part.material).push(g);
    }
    const resources = [];
    const longestSegment = Math.max(
      ...points.slice(1).map((p, i) => p.distanceTo(points[i])),
    );
    for (const [material, geometries] of batches) {
      const geometry = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      const indices = [],
        weights = [];
      let maxOffset = 0;
      const vertex = new THREE.Vector3(),
        segment = new THREE.Vector3(),
        offset = new THREE.Vector3();
      for (let i = 0; i < geometry.attributes.position.count; i++) {
        vertex.fromBufferAttribute(geometry.attributes.position, i);
        let closest = Infinity,
          joint = 0,
          blend = 0;
        for (let j = 0; j < count; j++) {
          segment.copy(points[j + 1]).sub(points[j]);
          const fraction = THREE.MathUtils.clamp(
            offset.copy(vertex).sub(points[j]).dot(segment) /
              Math.max(1e-9, segment.lengthSq()),
            0,
            1,
          );
          const distance = offset
            .copy(points[j])
            .addScaledVector(segment, fraction)
            .distanceToSquared(vertex);
          if (distance < closest) {
            closest = distance;
            joint = j;
            blend = fraction;
          }
        }
        maxOffset = Math.max(maxOffset, Math.sqrt(closest));
        indices.push(joint, joint + 1, 0, 0);
        weights.push(1 - blend, blend, 0, 0);
      }
      geometry.setAttribute(
        "skinIndex",
        new THREE.Uint16BufferAttribute(indices, 4),
      );
      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(weights, 4),
      );
      geometry.computeBoundingSphere();
      const chunks = [];
      // 连续三角形块保留原始表面；各权重骨节的局部盒在运行时合成保守世界盒。
      for (
        let start = 0;
        start < geometry.attributes.position.count;
        start += 192
      ) {
        const end = Math.min(start + 192, geometry.attributes.position.count);
        const influences = new Map();
        for (let i = start; i < end; i++) {
          vertex.fromBufferAttribute(geometry.attributes.position, i);
          for (let j = 0; j < 2; j++) {
            if (weights[i * 4 + j] === 0) continue;
            const joint = indices[i * 4 + j];
            if (!influences.has(joint)) influences.set(joint, new THREE.Box3());
            influences
              .get(joint)
              .expandByPoint(offset.copy(vertex).sub(points[joint]));
          }
        }
        chunks.push({ start, end, influences: [...influences] });
      }
      resources.push({
        geometry,
        material,
        padding: maxOffset + longestSegment,
        chunks,
      });
    }
    CACHE.set(key, resources);
  }
  parts.forEach((part) => part.removeFromParent());
  const bones = points.map((p, i) => {
    const bone = new THREE.Bone();
    bone.name = `${key}_soft_joint_${i}`;
    bone.position.copy(p).sub(i ? points[i - 1] : ZERO);
    return bone;
  });
  bones.forEach((bone, i) => (i ? bones[i - 1] : arm).add(bone));
  arm.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton(bones);
  const meshes = CACHE.get(key).map(
    ({ geometry, material, padding, chunks }) => {
      const mesh = new THREE.SkinnedMesh(geometry, material);
      mesh.name = `${key}_flexible_surface`;
      mesh.userData.keepSeparate = true;
      mesh.userData.tentacleSkeleton = skeleton;
      mesh.userData.tentacleBounds = { bones, padding };
      mesh.userData.tentacleChunks = chunks;
      arm.add(mesh);
      mesh.bind(skeleton);
      mesh.boundingSphere = geometry.boundingSphere.clone();
      mesh.boundingSphere.radius += curve.getLength() * 0.55;
      return mesh;
    },
  );
  arm.userData.tentacle = {
    bones,
    meshes,
    points,
    restLength: curve.getLength(),
    posePoints: points.map(() => new THREE.Vector3()),
    poseRotations: points.map(() => new THREE.Quaternion()),
  };
  const phase = options.phase ?? 0;
  motions.push((time, effort) => {
    const curl = options.curl?.() ?? 0;
    const amplitude =
      (options.amplitude ?? 0.2) * (1 - Math.min(effort, 3) * 0.13);
    let lastX = 0,
      lastY = 0;
    // 相邻全局弯角的差形成连续波，避免每节同向旋转累计成僵硬折棍。
    bones.forEach((bone, i) => {
      bone.position.copy(points[i]).sub(i ? points[i - 1] : ZERO);
      const t = i / count,
        taper = t * t * (3 - 2 * t);
      const x =
        taper *
        (Math.sin(time * 0.8 - t * 5.4 + phase) * amplitude -
          curl * Math.sin(phase) * 0.72);
      const y =
        taper *
        (Math.cos(time * 0.68 - t * 5.2 + phase) * amplitude +
          curl * Math.cos(phase) * 0.72);
      bone.rotation.set(x - lastX, y - lastY, 0);
      lastX = x;
      lastY = y;
    });
  });
  return arm.userData.tentacle;
}

/**
 * 在普通游曳之后把一条实体触腕连续展开到局部目标；不移动腕根或改共享表面。
 * @param {THREE.Group} arm 已绑定的独立腕组。
 * @param {THREE.Vector3} target 腕组坐标中的锁定落点。
 * @param {number} amount 展开比例，0保留当前游曳，1到达有限长度内的落点。
 * @param {number} bow 侧向弯曲方向，避免触腕变成直棍。
 */
export function reachTentacle(arm, target, amount, bow = 1) {
  if (!(amount > 0)) return;
  const { bones, points, posePoints, poseRotations, restLength } =
    arm.userData.tentacle;
  const blend = THREE.MathUtils.clamp(amount, 0, 1);
  REACH_END.copy(target)
    .sub(points[0])
    .clampLength(0, restLength * 0.85)
    .add(points[0]);
  REACH_DIRECTION.copy(REACH_END).sub(points[0]);
  const length = REACH_DIRECTION.length();
  REACH_SIDE.crossVectors(REACH_DIRECTION, UP).normalize();
  if (REACH_SIDE.lengthSq() < 0.001) REACH_SIDE.set(1, 0, 0);
  arm.updateWorldMatrix(true, true);
  REACH_INVERSE.copy(arm.matrixWorld).invert();
  for (let i = 0; i < bones.length; i++) {
    const t = i / (bones.length - 1);
    posePoints[i]
      .setFromMatrixPosition(bones[i].matrixWorld)
      .applyMatrix4(REACH_INVERSE);
    REACH_POINT.copy(points[0])
      .addScaledVector(REACH_DIRECTION, t)
      .addScaledVector(REACH_SIDE, Math.sin(t * Math.PI) * length * 0.2 * bow);
    posePoints[i].lerp(REACH_POINT, blend);
  }
  for (let i = 0; i < bones.length; i++) {
    const next = Math.min(i + 1, bones.length - 1),
      prev = i === next ? i - 1 : i;
    REACH_REST.copy(points[next]).sub(points[prev]).normalize();
    REACH_TANGENT.copy(posePoints[next]).sub(posePoints[prev]).normalize();
    poseRotations[i].setFromUnitVectors(REACH_REST, REACH_TANGENT);
    bones[i].position.copy(posePoints[i]);
    if (i) {
      REACH_QUAT.copy(poseRotations[i - 1]).invert();
      bones[i].position.sub(posePoints[i - 1]).applyQuaternion(REACH_QUAT);
      bones[i].quaternion.copy(REACH_QUAT).multiply(poseRotations[i]);
    } else bones[i].quaternion.copy(poseRotations[i]);
  }
  arm.updateWorldMatrix(true, true);
}

const UP = new THREE.Vector3(0, 1, 0),
  REACH_END = new THREE.Vector3(),
  REACH_DIRECTION = new THREE.Vector3(),
  REACH_SIDE = new THREE.Vector3(),
  REACH_POINT = new THREE.Vector3(),
  REACH_REST = new THREE.Vector3(),
  REACH_TANGENT = new THREE.Vector3(),
  REACH_QUAT = new THREE.Quaternion(),
  REACH_INVERSE = new THREE.Matrix4();

const CACHE = new Map();
const ZERO = new THREE.Vector3();

/** 只释放退役实例的骨骼纹理；共享表面和材质仍归缓存所有。 */
export function disposeTentacleMotion(root) {
  const skeletons = new Set();
  root.traverse((part) => {
    if (part.userData.tentacleSkeleton)
      skeletons.add(part.userData.tentacleSkeleton);
  });
  for (const skeleton of skeletons) skeleton.dispose();
}

/** 以骨链加保守附件余量粗筛，近身接触仍由实时皮肤三角形判定。 */
export function tentacleWorldBounds(mesh, out) {
  const { bones, padding } = mesh.userData.tentacleBounds;
  out.makeEmpty();
  for (const bone of bones)
    out.expandByPoint(BOUND_POINT.setFromMatrixPosition(bone.matrixWorld));
  return out.expandByScalar(padding * mesh.matrixWorld.getMaxScaleOnAxis());
}
const BOUND_POINT = new THREE.Vector3();

/** 线性蒙皮顶点位于各权重骨节盒的凸包内；粗筛不能省略近身的真实三角形。 */
export function tentacleChunkBounds(mesh, chunk, out) {
  out.makeEmpty();
  const bones = mesh.userData.tentacleBounds.bones;
  for (const [joint, local] of chunk.influences)
    out.union(CHUNK_BOUNDS.copy(local).applyMatrix4(bones[joint].matrixWorld));
  // 包含矩阵乘法的舍入误差，不改变可感知的接触口径。
  return out.expandByScalar(1e-6);
}
const CHUNK_BOUNDS = new THREE.Box3();
