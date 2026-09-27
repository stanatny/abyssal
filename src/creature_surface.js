import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * 创建带细微皮肤起伏及湿润高光的共享材质，不依赖外部贴图。
 * @param {object} options 标准材质参数；pattern 控制皮肤斑纹强度。
 * @returns {THREE.MeshPhysicalMaterial} 可跨实例复用的海洋生物表面。
 */
export function skinMaterial(options = {}) {
  const { pattern = 0.012, ...parameters } = options;
  const material = new THREE.MeshPhysicalMaterial({
    roughness: 0.43,
    metalness: 0,
    clearcoat: 0.14,
    clearcoatRoughness: 0.3,
    ...parameters,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vSkinPosition;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvSkinPosition = position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vSkinPosition;
        float skinGrain(vec3 p) {
          return sin(p.x * 593.0 + sin(p.z * 79.0)) *
                 sin(p.y * 611.0 - p.z * 427.0);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float grain = skinGrain(vSkinPosition);
        float mottling = sin(vSkinPosition.z * 43.0 + sin(vSkinPosition.x * 71.0)) * sin(vSkinPosition.y * 67.0);
        diffuseColor.rgb *= 1.0 + mottling * ${pattern.toFixed(4)} + grain * 0.003;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + grain * 0.007, 0.12, 1.0);`,
      );
  };
  material.customProgramCacheKey = () => `marine_skin_v6_${pattern}`;
  return material;
}

/**
 * 采样连续单调截面，避免线性折角与逐节平滑插值产生的串珠轮廓。
 * @param {number[][]} profile 每行依次为纵向位置、横半径、竖半径和可选竖偏移。
 * @param {number} z 纵向位置。
 * @returns {number[]} 横半径、竖半径、竖偏移。
 */
export function sampleSection(profile, z) {
  let i = 0;
  while (i < profile.length - 2 && z > profile[i + 1][0]) i++;
  const a = profile[i],
    b = profile[i + 1];
  const h = b[0] - a[0],
    t = THREE.MathUtils.clamp((z - a[0]) / h, 0, 1);
  return [1, 2, 3].map((d) => {
    const val = (n) => profile[n][d] || 0;
    const slope = (n) =>
      (val(n + 1) - val(n)) / (profile[n + 1][0] - profile[n][0]);
    const tangent = (n) => {
      if (n === 0) return slope(0);
      if (n === profile.length - 1) return slope(n - 1);
      const left = slope(n - 1),
        right = slope(n);
      return left * right <= 0 ? 0 : (2 * left * right) / (left + right);
    };
    const value =
      (2 * t ** 3 - 3 * t * t + 1) * val(i) +
      (t ** 3 - 2 * t * t + t) * h * tangent(i) +
      (-2 * t ** 3 + 3 * t * t) * val(i + 1) +
      (t ** 3 - t * t) * h * tangent(i + 1);
    return d === 3 ? value : Math.max(0.0001, value);
  });
}

/**
 * 将鳍轮廓塑造成薄边、饱满根部和轻微弧面的闭合曲面。
 * @param {number[][]} outline 二维轮廓，第一维为 Z，第二维为展开方向。
 * @param {number} thickness 中央厚度。
 * @param {string} orientation horizontal 或 vertical。
 * @param {object} options smooth 控制轮廓圆滑，camber 控制整体弯曲。
 * @returns {THREE.BufferGeometry} 带平滑法线、可静态合批的鳍曲面。
 */
export function sculptedFin(outline, thickness, orientation, options = {}) {
  const smooth = options.smooth !== false;
  const curve = new THREE.CatmullRomCurve3(
    outline.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    "centripetal",
  );
  const points = smooth
    ? curve
        .getPoints(outline.length * 3)
        .slice(0, -1)
        .map((p) => new THREE.Vector2(p.x, p.y))
    : outline.map((p) => new THREE.Vector2(...p));
  let triangles = THREE.ShapeUtils.triangulateShape(points, []).map((face) =>
    face.map((i) => points[i]),
  );
  // 三角形内部细分用于弯曲，不增加轮廓上的无效尖锥与倒角侧壁。
  for (let level = 0; level < (options.detail ?? 2); level++) {
    triangles = triangles.flatMap(([a, b, c]) => {
      const ab = a.clone().lerp(b, 0.5),
        bc = b.clone().lerp(c, 0.5),
        ca = c.clone().lerp(a, 0.5);
      return [
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, ca],
      ];
    });
  }
  const min = new THREE.Vector2(Infinity, Infinity),
    max = new THREE.Vector2(-Infinity, -Infinity);
  points.forEach((p) => {
    min.min(p);
    max.max(p);
  });
  const width = Math.max(0.001, Math.min(max.x - min.x, max.y - min.y));
  const winding = THREE.ShapeUtils.area(points) >= 0 ? 1 : -1;
  const distance = (p) => {
    let closest = Infinity,
      signed = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        edge = b.clone().sub(a);
      const relative = p.clone().sub(a);
      const q = a
        .clone()
        .addScaledVector(
          edge,
          THREE.MathUtils.clamp(relative.dot(edge) / edge.lengthSq(), 0, 1),
        );
      const d = p.distanceTo(q);
      if (d < closest) {
        closest = d;
        signed =
          d *
          Math.sign(winding * (edge.x * relative.y - edge.y * relative.x) || 1);
      }
    }
    return signed;
  };
  const positions = [],
    normals = [];
  const height = (p, side) => {
    const bulge = Math.sin(
      (THREE.MathUtils.clamp(distance(p) / (width * 0.24), -1, 1) * Math.PI) /
        2,
    );
    const u = (p.x - min.x) / (max.x - min.x || 1),
      v = (p.y - min.y) / (max.y - min.y || 1);
    return (
      side * thickness * 0.5 * bulge +
      (options.camber ?? 0.004) * Math.sin(u * Math.PI) * Math.sin(v * Math.PI)
    );
  };
  for (const triangle of triangles) {
    for (const side of [1, -1]) {
      const ordered = side === 1 ? triangle : [...triangle].reverse();
      for (const p of ordered) {
        const depth = height(p, side),
          epsilon = 0.0001;
        const du =
          (height(new THREE.Vector2(p.x + epsilon, p.y), side) -
            height(new THREE.Vector2(p.x - epsilon, p.y), side)) /
          (2 * epsilon);
        const dv =
          (height(new THREE.Vector2(p.x, p.y + epsilon), side) -
            height(new THREE.Vector2(p.x, p.y - epsilon), side)) /
          (2 * epsilon);
        const normal =
          orientation === "horizontal"
            ? new THREE.Vector3(-dv, 1, -du)
            : new THREE.Vector3(-1, -dv, -du);
        normal.multiplyScalar(side).normalize();
        positions.push(
          ...(orientation === "horizontal"
            ? [p.y, depth, p.x]
            : [-depth, p.y, p.x]),
        );
        normals.push(normal.x, normal.y, normal.z);
      }
    }
  }
  const raw = new THREE.BufferGeometry();
  raw.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  raw.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  const geometry = mergeVertices(raw, 0.000001);
  raw.dispose();
  return geometry;
}

/**
 * 为连续躯干安装共享权重的三节尾柄骨骼，实例只保存骨骼变换。
 * @param {THREE.Mesh} mesh 已加入父节点的主体网格。
 * @param {Function[]} motions 动作回调列表。
 * @param {object} options 摆动轴、频率及幅度。
 * @returns {THREE.SkinnedMesh} 替换原主体后的蒙皮网格。
 */
export function bindAxialMotion(mesh, motions, options = {}) {
  const { axis = "y", frequency = 1.1, amplitude = 0.045 } = options;
  const geometry = mesh.geometry;
  if (!geometry.getAttribute("skinIndex")) {
    const indices = [],
      weights = [],
      position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const t = THREE.MathUtils.smoothstep(position.getZ(i), 0.035, 0.38);
      indices.push(0, 1, 2, 0);
      weights.push((1 - t) ** 2, 2 * t * (1 - t), t * t, 0);
    }
    geometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(indices, 4),
    );
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
  }
  const skinned = new THREE.SkinnedMesh(geometry, mesh.material);
  skinned.name = "continuous_swimming_torso";
  skinned.userData.keepSeparate = true;
  const base = new THREE.Bone(),
    middle = new THREE.Bone(),
    tail = new THREE.Bone();
  middle.position.z = 0.08;
  tail.position.z = 0.17;
  base.add(middle);
  middle.add(tail);
  skinned.add(base);
  skinned.bind(new THREE.Skeleton([base, middle, tail]));
  // 包围球加入最大尾柄弯曲余量，保持视锥与射线粗筛覆盖极限姿态。
  geometry.computeBoundingSphere();
  skinned.boundingSphere = geometry.boundingSphere.clone();
  skinned.boundingSphere.radius += 0.035;
  const parent = mesh.parent;
  parent.remove(mesh);
  parent.add(skinned);
  motions.push((time, effort) => {
    const beat = time * frequency,
      power = amplitude * (0.7 + effort * 0.3);
    middle.rotation[axis] = Math.sin(beat - 0.6) * power * 0.45;
    tail.rotation[axis] = Math.sin(beat - 1.15) * power;
  });
  return skinned;
}
