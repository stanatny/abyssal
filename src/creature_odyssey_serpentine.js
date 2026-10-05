import * as THREE from "three";
import { bindTentacleMotion } from "./tentacle_motion.js";
import { paint } from "./creature_odyssey_geometry.js";

/**
 * 为侧纹和连续鳍带提供与曲线皮肤相同的截面；装饰不再猜测半径或直线中心。
 * @param {number[][]} points 身躯中心线。
 * @param {number[]} radii 与躯干一致的弧长半径。
 * @param {object} options 与皮肤相同的环数及径向浮雕参数。
 * @returns {object} 贴合截面采样器和封闭厚鳍几何构建方法。
 */
export function odysseySerpentineSupport(points, radii, options = {}) {
  const segments = options.segments ?? 78,
    relief = options.relief ?? 0,
    curve = new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(...point)),
    ),
    frames = curve.computeFrenetFrames(segments, false);
  function sample(u, angle, offset = 0) {
    const index = Math.round(THREE.MathUtils.clamp(u, 0, 1) * segments),
      t = index / segments,
      q = t * (radii.length - 1),
      k = Math.min(radii.length - 2, Math.floor(q)),
      radius = THREE.MathUtils.lerp(radii[k], radii[k + 1], q - k),
      direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0),
      tangent = frames.tangents[index];
    direction.addScaledVector(tangent, -direction.dot(tangent)).normalize();
    const surfaceAngle = Math.atan2(
      direction.dot(frames.binormals[index]),
      direction.dot(frames.normals[index]),
    );
    return curve
      .getPointAt(t)
      .addScaledVector(
        direction,
        radius * (1 + relief * Math.cos(surfaceAngle * 6)) + offset,
      );
  }
  function finGeometry({
    start,
    end,
    height,
    color,
    lower = false,
    thickness = 0.003,
  }) {
    const positions = [],
      indices = [],
      count = 32;
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= count; i++) {
        const u = THREE.MathUtils.lerp(start, end, i / count),
          base = sample(u, lower ? -Math.PI / 2 : Math.PI / 2, -0.001),
          lift = height * Math.sin((i / count) * Math.PI) ** 0.65;
        for (let row = 0; row < 3; row++) {
          positions.push(
            base.x + (side ? -1 : 1) * thickness * (row === 2 ? 0.4 : 1),
            base.y + ((lower ? -1 : 1) * lift * row) / 2,
            base.z,
          );
          if (i < count && row < 2) {
            const n = side * (count + 1) * 3 + i * 3 + row;
            if (Boolean(side) !== lower)
              indices.push(n, n + 3, n + 1, n + 1, n + 3, n + 4);
            else indices.push(n, n + 1, n + 3, n + 1, n + 4, n + 3);
          }
        }
      }
    }
    const offset = (count + 1) * 3;
    for (let i = 0; i < count; i++) {
      const n = i * 3;
      for (const edge of [0, 2])
        indices.push(
          n + edge,
          n + 3 + edge,
          n + edge + offset,
          n + 3 + edge,
          n + 3 + edge + offset,
          n + edge + offset,
        );
    }
    for (const end of [0, count])
      for (let row = 0; row < 2; row++) {
        const n = end * 3 + row;
        indices.push(n, n + offset, n + 1, n + 1, n + offset, n + 1 + offset);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    // 尖端闭合处只保留有面积的三角形，避免零长边污染法线。
    const cleanIndices = [];
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3,
        b = indices[i + 1] * 3,
        c = indices[i + 2] * 3,
        ux = positions[b] - positions[a],
        uy = positions[b + 1] - positions[a + 1],
        uz = positions[b + 2] - positions[a + 2],
        vx = positions[c] - positions[a],
        vy = positions[c + 1] - positions[a + 1],
        vz = positions[c + 2] - positions[a + 2],
        nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
      if (nx * nx + ny * ny + nz * nz > 1e-20)
        cleanIndices.push(indices[i], indices[i + 1], indices[i + 2]);
    }
    geometry.setIndex(cleanIndices);
    geometry.computeVertexNormals();
    return paint(geometry, color);
  }
  return { sample, finGeometry };
}

/**
 * 将长躯体及其鳍根、鳃纹、鳞饰一次绑定到实例独立的侧向游曳骨架。
 * @param {THREE.Group} group 已装配全部静态表面的局部组。
 * @param {string} key 不同解剖和权重设置使用不同缓存键。
 * @param {number[][]} points 从稳定头端到尾端的局部中心线。
 * @param {Function[]} motions 现有主循环动作列表，不增加 RAF。
 * @param {object} options 波速、波数、幅度、稳定前段和关节数量。
 * @returns {object} 共享表面、独立骨架及可检查的动作元数据。
 */
export function bindOdysseySerpentine(
  group,
  key,
  points,
  motions,
  options = {},
) {
  const {
    count = 16,
    frequency = 0.95,
    waves = 1.15,
    amplitude = 0.58,
    stableFraction = 0.12,
    phase = 0,
  } = options;
  const curve = new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(...point)),
    ),
    rig = bindTentacleMotion(group, key, curve, motions, {
      count,
      amplitude: 0,
    });
  // 相邻绝对切线弯角之差形成前后传播的 S 波，保持头根不漂移、各节长度不变。
  motions[motions.length - 1] = (time, effort) => {
    const power = amplitude * (0.82 + Math.min(Math.max(effort, 0), 3) * 0.12);
    let previous = 0;
    for (let i = 0; i < rig.bones.length; i++) {
      const u = i / count,
        envelope = THREE.MathUtils.smoothstep(u, stableFraction, 0.75),
        tangent =
          Math.sin(time * frequency + phase - u * Math.PI * 2 * waves) *
          power *
          envelope;
      rig.bones[i].position.copy(rig.points[i]);
      if (i) rig.bones[i].position.sub(rig.points[i - 1]);
      rig.bones[i].rotation.set(0, tangent - previous, 0);
      previous = tangent;
    }
  };
  rig.motion = { axis: "lateral", frequency, waves, amplitude, stableFraction };
  for (const mesh of rig.meshes) {
    mesh.userData.serpentine = true;
    mesh.userData.serpentineRig = rig;
  }
  group.userData.serpentineRig = rig;
  return rig;
}
