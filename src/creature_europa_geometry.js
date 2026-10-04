import * as THREE from "three";
import {
  skinMaterial,
  sampleSection,
  sculptedFin,
} from "./creature_surface.js";
const geometries = new Map(),
  materials = new Map();
export function cachedAlienGeometry(key, make) {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key);
}
export function alienMaterial(color, emission = 0, glass = false) {
  const key = `${color}_${emission}_${glass}`;
  if (!materials.has(key))
    materials.set(
      key,
      skinMaterial({
        color,
        roughness: glass ? 0.2 : 0.52,
        transparent: glass,
        opacity: glass ? 0.57 : 1,
        depthWrite: !glass,
        pattern: 0.09,
        emissive: color,
        emissiveIntensity: emission,
      }),
    );
  return materials.get(key);
}
export function alienPart(parent, geometry, material, name, p = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.position.fromArray(p);
  parent.add(m);
  return m;
}
/** 非鱼型的轴向截面支持褶皱、偏心和三叶外套，端面封闭。 */
export function alienTrunk(key, profile, folds = 0, lobes = 0) {
  return cachedAlienGeometry(key, () => {
    const p = [],
      idx = [],
      rings = key.startsWith("weaver") || key.startsWith("lumen") ? 72 : 40,
      sides = key.startsWith("weaver") || key.startsWith("lumen") ? 32 : 24;
    for (let r = 0; r <= rings; r++) {
      const z = THREE.MathUtils.lerp(
        profile[0][0],
        profile.at(-1)[0],
        r / rings,
      );
      const [w, h, o] = sampleSection(profile, z);
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * Math.PI * 2,
          rib = 1 + folds * Math.cos((r / rings) * Math.PI * 18),
          lobe = 1 + lobes * Math.cos(a * 3);
        p.push(
          Math.cos(a) * w * rib * lobe,
          Math.sin(a) * h * rib * lobe + o,
          z,
        );
        if (r < rings && s < sides) {
          const n = r * (sides + 1) + s,
            b = n + sides + 1;
          idx.push(n, n + 1, b, b, n + 1, b + 1);
        }
      }
    }
    for (const end of [0, 1]) {
      const c = p.length / 3,
        row = end ? rings * (sides + 1) : 0;
      p.push(
        0,
        profile[end ? profile.length - 1 : 0][3] || 0,
        profile[end ? profile.length - 1 : 0][0],
      );
      for (let s = 0; s < sides; s++)
        idx.push(
          ...(end ? [c, row + s, row + s + 1] : [c, row + s + 1, row + s]),
        );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}
export function alienMembrane(key, outline, thickness = 0.01) {
  return cachedAlienGeometry(key, () =>
    sculptedFin(outline, thickness, "horizontal", { camber: 0.025, detail: 1 }),
  );
}
export function alienTube(key, points, radius = 0.01, segments = 16) {
  return cachedAlienGeometry(
    key,
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        segments,
        radius,
        6,
        false,
      ),
  );
}
export function alienRing(key, radius, tube, arc = Math.PI * 2) {
  return cachedAlienGeometry(
    key,
    () => new THREE.TorusGeometry(radius, tube, 6, 28, arc),
  );
}

/** 触腕沿连续曲线逐渐收尖，保留原始管状法线和封口，不出现截断软管。 */
export function alienTaperedTube(
  key,
  points,
  radius,
  endRadius = 0.001,
  segments = 24,
) {
  return cachedAlienGeometry(key, () => {
    const curve = new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      g = new THREE.TubeGeometry(curve, segments, radius, 10, false),
      p = g.attributes.position;
    for (let ring = 0; ring <= segments; ring++) {
      const center = curve.getPointAt(ring / segments),
        ratio = THREE.MathUtils.lerp(
          1,
          endRadius / radius,
          (ring / segments) ** 0.8,
        );
      for (let side = 0; side <= 10; side++) {
        const i = ring * 11 + side;
        p.setXYZ(
          i,
          center.x + (p.getX(i) - center.x) * ratio,
          center.y + (p.getY(i) - center.y) * ratio,
          center.z + (p.getZ(i) - center.z) * ratio,
        );
      }
    }
    const positions = [...p.array],
      uv = [...g.attributes.uv.array],
      indices = [...g.index.array];
    for (const end of [0, 1]) {
      const c = positions.length / 3,
        center = curve.getPointAt(end),
        row = end ? segments * 11 : 0;
      positions.push(center.x, center.y, center.z);
      uv.push(0.5, end);
      for (let side = 0; side < 10; side++)
        indices.push(
          ...(end
            ? [c, row + side, row + side + 1]
            : [c, row + side + 1, row + side]),
        );
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.deleteAttribute("normal");
    g.computeVertexNormals();
    return g;
  });
}
