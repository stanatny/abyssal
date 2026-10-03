import * as THREE from "three";
import {
  skinMaterial,
  sampleSection,
  sculptedFin,
} from "./creature_surface.js";

// 亚马逊解剖缓存只共享不可变几何与材质，骨骼和动作仍属于各个实例。
const geometries = new Map(),
  materials = new Map();
export function amazonGeometry(key, make) {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key);
}
export function amazonMaterial(type = "skin") {
  if (!materials.has(type)) {
    const m = skinMaterial({
      color: "#ffffff",
      vertexColors: true,
      roughness: type === "eye" ? 0.18 : type === "fin" ? 0.58 : 0.58,
      clearcoat: type === "eye" ? 0.5 : 0.1,
      pattern: 0.065,
      side: type === "fin" ? THREE.DoubleSide : THREE.FrontSide,
    });
    const compile = m.onBeforeCompile;
    m.onBeforeCompile = (shader) => {
      compile(shader);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        float rows = vSkinPosition.z * 230.0;
        float ring = atan(vSkinPosition.y, vSkinPosition.x) * 38.0;
        float cell = sin(rows + floor(ring / 3.14159) * 1.57) * sin(ring);
        float ridge = smoothstep(0.63, 0.94, cell);
        diffuseColor.rgb *= 1.0 - ridge * ${type === "eye" ? "0.0" : "0.11"};
        normal = normalize(normal + vec3(dFdx(ridge), dFdy(ridge), 0.0) * 0.055);`,
      );
    };
    m.customProgramCacheKey = () => `amazon_anatomy_v3_${type}`;
    materials.set(type, m);
  }
  return materials.get(type);
}
export function amazonMesh(
  parent,
  geometry,
  color = "#ffffff",
  position = [0, 0, 0],
  name = "river_anatomy",
  vertexColors = false,
  type = "skin",
) {
  const tint = new THREE.Color(color);
  if (!vertexColors)
    geometry = amazonGeometry(`tint_${geometry.uuid}_${color}`, () => {
      const g = geometry.clone(),
        c = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < c.length; i += 3) tint.toArray(c, i);
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
      return g;
    });
  const m = new THREE.Mesh(geometry, amazonMaterial(type));
  m.name = name;
  m.position.fromArray(position);
  m.userData.visualTint = tint;
  parent.add(m);
  return m;
}
export function amazonEllipsoid(
  parent,
  color,
  position,
  scale,
  name = "anatomy",
  type = "skin",
) {
  const m = amazonMesh(
    parent,
    amazonGeometry(
      "anatomical_detail",
      () => new THREE.SphereGeometry(1, 16, 12),
    ),
    color,
    position,
    name,
    false,
    type,
  );
  m.scale.fromArray(scale);
  return m;
}
export function amazonTube(parent, key, points, radius, color) {
  return amazonMesh(
    parent,
    amazonGeometry(
      key,
      () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          24,
          radius,
          6,
          false,
        ),
    ),
    color,
  );
}
export function amazonFin(
  parent,
  key,
  outline,
  color,
  orientation = "vertical",
  position = [0, 0, 0],
) {
  const g = amazonGeometry(key, () => {
    const g = sculptedFin(outline, 0.0022, orientation, {
      detail: 2,
      camber: 0.003,
    });
    const p = g.attributes.position,
      values = [],
      c = new THREE.Color(color);
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i),
        v = orientation === "vertical" ? p.getY(i) : p.getX(i);
      const ray = Math.sin(Math.atan2(v, z - outline[0][0]) * 34);
      const a = c.clone().multiplyScalar(0.75 + 0.23 * Math.abs(ray));
      a.toArray(values, values.length);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(values, 3));
    return g;
  });
  return amazonMesh(parent, g, "#ffffff", position, key, true, "fin");
}
/** 封闭连续肌肉体，细鳞/花纹贴合曲面而不是叠加浮动装饰球。 */
export function amazonLoft(
  key,
  profile,
  back,
  belly,
  pattern = () => 0,
  rings = 64,
  sides = 32,
) {
  return amazonGeometry(key, () => {
    const p = [],
      colors = [],
      uv = [],
      index = [],
      a = new THREE.Color(back),
      b = new THREE.Color(belly),
      dark = new THREE.Color("#17241d"),
      c = new THREE.Color();
    for (let r = 0; r <= rings; r++) {
      const z = THREE.MathUtils.lerp(
          profile[0][0],
          profile.at(-1)[0],
          r / rings,
        ),
        [rx, ry, cy] = sampleSection(profile, z);
      for (let s = 0; s <= sides; s++) {
        const angle = (s / sides) * Math.PI * 2,
          relief =
            1 + 0.012 * Math.sin(z * 183 + angle * 8) * Math.sin(angle * 18),
          x = Math.cos(angle) * rx * relief,
          y = Math.sin(angle) * ry * relief + cy;
        p.push(x, y, z);
        uv.push(s / sides, r / rings);
        c.copy(b)
          .lerp(a, THREE.MathUtils.smoothstep(Math.sin(angle), -0.2, 0.66))
          .lerp(dark, THREE.MathUtils.clamp(pattern(x, y, z, angle), 0, 0.88));
        c.multiplyScalar(1 + 0.018 * Math.sin(z * 327 + angle * 38));
        c.toArray(colors, colors.length);
      }
    }
    for (let r = 0; r < rings; r++)
      for (let s = 0; s < sides; s++) {
        const i = r * (sides + 1) + s,
          j = i + sides + 1;
        index.push(i, i + 1, j, j, i + 1, j + 1);
      }
    for (const [row, front] of [
      [0, true],
      [rings, false],
    ]) {
      const n = p.length / 3,
        z = profile[front ? 0 : profile.length - 1][0];
      p.push(0, sampleSection(profile, z)[2], z);
      uv.push(0.5, front ? 0 : 1);
      a.toArray(colors, colors.length);
      for (let j = 0; j < sides; j++) {
        const i = row * (sides + 1) + j;
        index.push(...(front ? [n, i + 1, i] : [n, i, i + 1]));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  });
}
/** 小眼球嵌入眼眶，窄瞳孔与眉骨保留捕食者的目光。 */
export function amazonEyes(
  parent,
  x,
  y,
  z,
  size = 0.016,
  color = "#b79546",
  reptile = false,
) {
  for (const side of [-1, 1]) {
    amazonEllipsoid(
      parent,
      "#25291d",
      [side * x, y, z],
      [size * 0.72, size * 1.18, size * 1.2],
      "orbital_rim",
    );
    amazonEllipsoid(
      parent,
      color,
      [side * (x + size * 0.23), y, z - 0.001],
      [size * 0.59, size * 0.85, size * 0.84],
      "iris",
      "eye",
    );
    amazonEllipsoid(
      parent,
      "#070c09",
      [side * (x + size * 0.72), y, z - 0.002],
      [
        size * 0.13,
        size * (reptile ? 0.69 : 0.49),
        size * (reptile ? 0.14 : 0.49),
      ],
      "pupil",
      "eye",
    );
    amazonEllipsoid(
      parent,
      "#e8e9cc",
      [side * (x + size * 0.8), y + size * 0.3, z - size * 0.2],
      [size * 0.05, size * 0.12, size * 0.12],
      "eye_glint",
      "eye",
    );
  }
}
/** 有弯曲和变径的角/獠牙，避免整齐的圆锥插片。 */
export function amazonSpike(parent, key, points, radius, color) {
  const g = amazonGeometry(key, () => {
    const curve = new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      g = new THREE.TubeGeometry(curve, 12, radius, 7, false),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const row = Math.floor(i / 8),
        t = Math.min(1, row / 12),
        center = curve.getPointAt(t),
        v = new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .sub(center)
          .multiplyScalar(Math.pow(1 - t, 0.7))
          .add(center);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
  return amazonMesh(parent, g, color);
}
