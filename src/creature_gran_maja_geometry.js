import * as THREE from "three";
import { sampleSection } from "./creature_surface.js";

/**
 * 复用确定性雕塑网格，不在游泳过程中改写共享顶点。
 * @param {string} key 形状缓存键。
 * @param {Function} create 首次创建几何的工厂。
 * @returns {THREE.BufferGeometry} 只读共享几何。
 */
export function granMajaGeometry(key, create) {
  if (!GEOMETRIES.has(key)) {
    const geometry = create();
    geometry.deleteAttribute("uv");
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    GEOMETRIES.set(key, geometry);
  }
  return GEOMETRIES.get(key);
}

/**
 * 采样扁宽铲形头盘及横向笑口，角度以右侧为零、顶部为 PI/2。
 * @param {number} t 从唇缘到颈部或喉部的比例。
 * @param {number} angle 横截面角度。
 * @param {boolean} inner 是否采样口腔内壁。
 * @returns {THREE.Vector3} 局部表面坐标。
 */
export function granMajaHeadPoint(t, angle, inner = false) {
  const c = Math.cos(angle),
    s = Math.sin(angle),
    edge = Math.abs(c),
    mouthY = -0.043 + 0.035 * edge ** 1.8 + s * 0.026,
    mouthZ = -0.55 + edge ** 1.7 * 0.047;
  if (inner) {
    const shrink = 1 - t;
    return new THREE.Vector3(
      c * (0.022 + 0.073 * shrink),
      THREE.MathUtils.lerp(-0.038 + s * 0.007, mouthY, shrink),
      THREE.MathUtils.lerp(mouthZ + 0.001, -0.435, t),
    );
  }
  const [rx, ry, cy] = sampleSection(HEAD_PROFILE, t),
    lift = sampleSection(LIFT_PROFILE, t)[0],
    neckBlend = THREE.MathUtils.smoothstep(t, 0.78, 1),
    fold =
      Math.sin(t * Math.PI) ** 2 *
      (Math.sin(t * 58 + c * c * 5) * 0.0011 +
        Math.sin(angle * 13 + t * 27) * 0.00065),
    y =
      cy +
      s * ry * (s < 0 ? 1 + Math.sin(t * Math.PI) * 0.42 : 1) +
      edge ** 1.8 * lift +
      s * fold;
  return new THREE.Vector3(
    c * rx,
    THREE.MathUtils.lerp(y, 0.008 + s * 0.081, neckBlend),
    THREE.MathUtils.lerp(mouthZ, -0.22, t),
  );
}

/**
 * 创建上头盘、下颌或短口腔；头部外翼直接属于连续表面。
 * @param {boolean} lower 是否创建下半部。
 * @param {boolean} inner 是否创建口腔。
 * @returns {THREE.BufferGeometry} 带灰色皮肤或暗口腔分区的几何。
 */
export function granMajaHeadGeometry(lower, inner = false) {
  const rows = inner ? 10 : 30,
    columns = inner ? 40 : 56,
    geometry = gridGeometry(
      rows,
      columns,
      (v, u) =>
        granMajaHeadPoint(v, u * Math.PI + (lower ? Math.PI : 0), inner),
      inner,
    );
  if (!inner) {
    // 上下头盘共享闭合边界，用跨边界切线得到一致法线，避免半面独算法线形成硬缝。
    const normals = geometry.getAttribute("normal"),
      epsilon = 0.0001;
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      for (const column of [0, columns]) {
        const angle = (column / columns) * Math.PI + (lower ? Math.PI : 0),
          around = granMajaHeadPoint(t, angle + epsilon).sub(
            granMajaHeadPoint(t, angle - epsilon),
          ),
          along = granMajaHeadPoint(Math.min(1, t + epsilon), angle).sub(
            granMajaHeadPoint(Math.max(0, t - epsilon), angle),
          ),
          normal = around.cross(along).normalize();
        normals.setXYZ(
          row * (columns + 1) + column,
          normal.x,
          normal.y,
          normal.z,
        );
      }
    }
  }
  return colorGeometry(geometry, inner ? "mouth" : "skin");
}

/**
 * 构造从粗圆颈到尖尾的连续环褶蛇体，预计算六节蒙皮权重。
 * @returns {THREE.BufferGeometry} 含静态 S 形轴线与真实环形皮褶的共享网格。
 */
export function granMajaBodyGeometry() {
  const geometry = gridGeometry(156, 40, (v, u) => {
    const z = THREE.MathUtils.lerp(-0.22, 0.55, v),
      a = u * Math.PI * 2,
      [rx, ry] = sampleSection(BODY_PROFILE, z),
      wave =
        0.5 +
        0.5 *
          Math.cos(
            v * Math.PI * 40 +
              Math.sin(v * 22) * 0.65 +
              Math.sin(a * 3 + v * 9) * 0.48,
          ),
      ring = wave ** 1.7,
      relief =
        Math.sin(v * Math.PI) ** 0.3 *
        rx *
        (0.205 * ring - 0.038) *
        (1 + Math.sin(v * 33 + a * 2) * 0.17),
      center = bodyCenter(z),
      grain = Math.sin(a * 11 + z * 57) * 0.0007 * Math.sin(v * Math.PI);
    return new THREE.Vector3(
      center.x + Math.cos(a) * (rx + relief + grain),
      center.y + Math.sin(a) * (ry + relief + grain),
      z,
    );
  });
  // 周向首尾顶点重合，合并其法线以消除闭合边界的硬明暗缝。
  const normals = geometry.getAttribute("normal");
  for (let row = 0; row <= 156; row++) {
    const first = row * 41,
      last = first + 40,
      normal = new THREE.Vector3()
        .fromBufferAttribute(normals, first)
        .add(new THREE.Vector3().fromBufferAttribute(normals, last))
        .normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  colorGeometry(geometry, "body");
  const positions = geometry.getAttribute("position"),
    indices = [],
    weights = [];
  for (let i = 0; i < positions.count; i++) {
    const segment = THREE.MathUtils.clamp(
        (positions.getZ(i) + 0.22) / 0.154,
        0,
        5,
      ),
      a = Math.min(4, Math.floor(segment)),
      t = segment - a,
      eased = t * t * (3 - 2 * t);
    indices.push(a, a + 1, 0, 0);
    weights.push(1 - eased, eased, 0, 0);
  }
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(indices, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  return geometry;
}

/**
 * 采样蛇体中心线，供连续皮肤与实例骨架使用。
 * @param {number} z 纵向坐标。
 * @returns {THREE.Vector3} 静态 S 形轴线位置。
 */
export function granMajaBodyCenter(z) {
  return bodyCenter(z);
}

/**
 * 构造贴肤皱褶、牙龈及短密牙齿的渐细曲管。
 * @param {number[][]} points 曲线控制点。
 * @param {number} radius 起点半径。
 * @param {number} endRadius 终点半径。
 * @param {string} region 顶点色区域。
 * @param {number} segments 纵向分段数。
 * @returns {THREE.BufferGeometry} 封口曲面。
 */
export function granMajaTubeGeometry(
  points,
  radius,
  endRadius,
  region,
  segments = 16,
) {
  const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    ),
    frames = curve.computeFrenetFrames(segments, false),
    sides = 6,
    positions = [],
    indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      p = curve.getPointAt(t),
      r =
        region === "tooth"
          ? THREE.MathUtils.lerp(
              radius,
              endRadius,
              THREE.MathUtils.smoothstep(t, 0.6, 1),
            )
          : THREE.MathUtils.lerp(radius, endRadius, t ** 1.1);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        q = p
          .clone()
          .addScaledVector(frames.normals[i], Math.cos(a) * r)
          .addScaledVector(frames.binormals[i], Math.sin(a) * r);
      positions.push(...q.toArray());
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j,
        b = a + sides + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  for (const ring of [0, segments]) {
    const middle = positions.length / 3;
    positions.push(...curve.getPointAt(ring / segments).toArray());
    for (let j = 0; j < sides; j++) {
      const a = ring * (sides + 1) + j;
      indices.push(middle, ring === 0 ? a + 1 : a, ring === 0 ? a : a + 1);
    }
  }
  return colorGeometry(makeGeometry(positions, indices), region);
}

const GEOMETRIES = new Map();
// 每一节为比例、横半径、竖半径、竖偏移；宽翼属于皮肤，不是独立鱼鳍。
const HEAD_PROFILE = [
  [0, 0.095, 0.026, -0.043],
  [0.09, 0.151, 0.041, -0.018],
  [0.17, 0.208, 0.041, -0.014],
  [0.31, 0.255, 0.041, -0.011],
  [0.46, 0.235, 0.045, -0.006],
  [0.67, 0.148, 0.058, 0.002],
  [0.84, 0.084, 0.075, 0.008],
  [1, 0.079, 0.081, 0.008],
];
const LIFT_PROFILE = [
  [0, 0.035],
  [0.1, 0.067],
  [0.31, 0.064],
  [0.5, 0.045],
  [0.8, 0.007],
  [1, 0.0001],
];
const BODY_PROFILE = [
  [-0.22, 0.079, 0.081],
  [-0.12, 0.078, 0.079],
  [0.02, 0.078, 0.079],
  [0.17, 0.074, 0.074],
  [0.3, 0.059, 0.063],
  [0.41, 0.042, 0.045],
  [0.5, 0.022, 0.025],
  [0.55, 0.001, 0.001],
];

function bodyCenter(z) {
  const t = THREE.MathUtils.clamp((z + 0.22) / 0.77, 0, 1),
    fade = THREE.MathUtils.smoothstep(t, 0, 0.16);
  return new THREE.Vector3(
    Math.sin(t * Math.PI * 2) * 0.095 * fade,
    0.008 + Math.sin(t * Math.PI) * 0.012,
    z,
  );
}

function gridGeometry(rows, columns, point, reverse = false) {
  const positions = [],
    indices = [];
  for (let v = 0; v <= rows; v++)
    for (let u = 0; u <= columns; u++)
      positions.push(...point(v / rows, u / columns).toArray());
  for (let v = 0; v < rows; v++)
    for (let u = 0; u < columns; u++) {
      const a = v * (columns + 1) + u,
        b = a + columns + 1;
      if (reverse) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  return makeGeometry(positions, indices);
}
function makeGeometry(positions, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function colorGeometry(geometry, region) {
  const positions = geometry.getAttribute("position"),
    colors = [],
    upper = new THREE.Color("#646a70"),
    lower = new THREE.Color("#909297"),
    crest = new THREE.Color("#9fa5a8"),
    shade = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i),
      mottling =
        Math.sin(x * 223 + Math.sin(z * 83) * 2) * Math.sin(y * 157 - z * 113);
    if (region === "gum")
      shade.set("#923237").multiplyScalar(1 + mottling * 0.1);
    else if (region === "tooth")
      shade.set("#e1e4dc").multiplyScalar(0.97 + mottling * 0.04);
    else if (region === "mouth")
      shade
        .set("#15101a")
        .lerp(
          new THREE.Color("#422029"),
          1 - THREE.MathUtils.smoothstep(z, -0.55, -0.465),
        );
    else {
      shade
        .copy(upper)
        .lerp(lower, (1 - THREE.MathUtils.smoothstep(y, -0.08, 0.09)) * 0.43);
      if (region === "body") {
        const t = (z + 0.22) / 0.77,
          ring =
            (0.5 +
              0.5 * Math.cos(t * Math.PI * 40 + Math.sin(t * 22) * 0.65)) **
            1.7;
        shade.lerp(crest, ring * 0.38).multiplyScalar(0.76 + ring * 0.24);
      }
      if (region === "lip") shade.lerp(crest, 0.22);
      shade.multiplyScalar(1 + mottling * 0.07);
    }
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
