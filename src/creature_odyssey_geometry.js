import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";
import { bindTentacleMotion } from "./tentacle_motion.js";

const GEOMETRIES = new Map(),
  MATERIALS = new Map();
/** 奥德赛解剖缓存只保存不可变表面；动作关节由每只生物单独持有。 */
export function geometry(key, build) {
  if (!GEOMETRIES.has(key)) GEOMETRIES.set(key, build());
  return GEOMETRIES.get(key);
}
export function material(color, roughness = 0.48, metalness = 0, glow = 0) {
  const key = `${color}_${roughness}_${metalness}_${glow}`;
  if (!MATERIALS.has(key))
    MATERIALS.set(
      key,
      skinMaterial({
        color,
        roughness,
        metalness,
        pattern: 0.075,
        emissive: color,
        emissiveIntensity: glow,
      }),
    );
  return MATERIALS.get(key);
}
export const SKIN = skinMaterial({
  vertexColors: true,
  roughness: 0.46,
  pattern: 0.09,
});
export const FIN = skinMaterial({
  vertexColors: true,
  roughness: 0.51,
  pattern: 0.04,
  side: THREE.DoubleSide,
});
export const DARK = material("#111b23", 0.38),
  TOOTH = material("#dfd4b3", 0.5),
  BRONZE = material("#b29861", 0.51, 0.3);
export function part(parent, key, build, mat = SKIN, name = key) {
  const mesh = new THREE.Mesh(geometry(key, build), mat);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}
export function oval(parent, key, p, s, color, segments = 16) {
  return part(parent, key, () => {
    const g = new THREE.SphereGeometry(
      1,
      segments,
      Math.max(8, (segments * 0.65) | 0),
    );
    g.scale(...s);
    g.translate(...p);
    return paint(g, color);
  });
}
export function paint(g, top, belly = top, pattern = 0) {
  const a = new THREE.Color(top),
    b = new THREE.Color(belly),
    c = new THREE.Color(),
    v = g.attributes.position,
    colors = [];
  for (let i = 0; i < v.count; i++) {
    const x = v.getX(i),
      y = v.getY(i),
      z = v.getZ(i);
    c.copy(a).lerp(b, THREE.MathUtils.smoothstep(-y, -0.03, 0.12));
    if (pattern)
      c.multiplyScalar(
        1 -
          pattern *
            (0.5 +
              0.5 *
                Math.sin(z * 105 + Math.sin(y * 70)) *
                Math.sin(x * 80 + y * 25)),
      );
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
}
/** 轴向肌肉放样；吻部可切开为真实口腔，避免牙齿贴在闭合实心头上。 */
export function loft(
  profile,
  top,
  belly = top,
  { rings = 40, sides = 24, cut, relief = 0 } = {},
) {
  const p = [],
    idx = [],
    colors = [],
    a = new THREE.Color(top),
    b = new THREE.Color(belly),
    c = new THREE.Color();
  for (let r = 0; r <= rings; r++) {
    const z = THREE.MathUtils.lerp(profile[0][0], profile.at(-1)[0], r / rings),
      [rx, ry, cy] = sampleSection(profile, z);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2,
        s = Math.sin(angle),
        co = Math.cos(angle),
        rib =
          1 + relief * Math.cos(angle * 10) * Math.sin((r / rings) * Math.PI);
      let y = cy + s * ry * rib;
      if (cut)
        y = THREE.MathUtils.lerp(
          y,
          Math.max(y, cut.roof),
          1 - THREE.MathUtils.smoothstep(z, cut.start, cut.end),
        );
      p.push(co * rx * rib, y, z);
      c.copy(a).lerp(b, 1 - THREE.MathUtils.smoothstep(s, -0.5, 0.2));
      c.multiplyScalar(
        1 + 0.035 * Math.sin(z * 120 + co * 9) * Math.sin(s * 30),
      );
      colors.push(c.r, c.g, c.b);
      if (r < rings && j < sides) {
        const n = r * (sides + 1) + j;
        idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1);
      }
    }
  }
  for (const end of [0, 1]) {
    const z = profile[end ? profile.length - 1 : 0][0],
      n = p.length / 3,
      row = end ? rings * (sides + 1) : 0;
    let y = sampleSection(profile, z)[2];
    if (cut && z < cut.start) y = Math.max(y, cut.roof);
    p.push(0, y, z);
    colors.push(a.r, a.g, a.b);
    for (let j = 0; j < sides; j++)
      idx.push(n, end ? row + j : row + j + 1, end ? row + j + 1 : row + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
export function fin(
  parent,
  key,
  outline,
  color,
  orientation = "vertical",
  thickness = 0.009,
) {
  return part(
    parent,
    key,
    () => {
      const g = paint(
          sculptedFin(outline, thickness, orientation, {
            detail: 3,
            camber: 0.009,
          }),
          color,
        ),
        p = g.attributes.position,
        c = g.attributes.color;
      const minZ = Math.min(...outline.map((v) => v[0])),
        maxZ = Math.max(...outline.map((v) => v[0])),
        span = maxZ - minZ || 1;
      for (let i = 0; i < p.count; i++) {
        const z = (p.getZ(i) - minZ) / span,
          spread = orientation === "horizontal" ? p.getX(i) : p.getY(i);
        const angle = Math.atan2(spread, p.getZ(i) - minZ + 0.04);
        const ray = 0.5 + 0.5 * Math.cos(angle * 23);
        const shade = 0.77 + 0.19 * ray + 0.06 * Math.sin(z * Math.PI);
        const ridge =
          0.0022 *
          Math.cos(angle * 23) *
          Math.min(1, Math.abs(spread) * 9) *
          Math.sin(z * Math.PI);
        if (orientation === "horizontal") p.setY(i, p.getY(i) + ridge);
        else p.setX(i, p.getX(i) + ridge);
        c.setXYZ(i, c.getX(i) * shade, c.getY(i) * shade, c.getZ(i) * shade);
      }
      g.computeVertexNormals();
      return g;
    },
    FIN,
  );
}
export function tube(
  parent,
  key,
  points,
  radius,
  color,
  segments = 18,
  sides = 7,
) {
  return part(parent, key, () =>
    paint(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        segments,
        radius,
        sides,
        false,
      ),
      color,
    ),
  );
}
/** 连续曲线截面同时控制颈、蛇尾、头发与腕足，不用一串独立球体拼躯干。 */
export function curvedGeometry(
  points,
  radii,
  top,
  belly = top,
  segments = 50,
  sides = 12,
  relief = 0,
) {
  const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    ),
    frames = curve.computeFrenetFrames(segments, false),
    p = [],
    idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      center = curve.getPointAt(t),
      q = t * (radii.length - 1),
      k = Math.min(radii.length - 2, Math.floor(q)),
      f = q - k,
      r = THREE.MathUtils.lerp(radii[k], radii[k + 1], f);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        rr = r * (1 + relief * Math.cos(a * 6));
      const v = center
        .clone()
        .addScaledVector(frames.normals[i], Math.cos(a) * rr)
        .addScaledVector(frames.binormals[i], Math.sin(a) * rr);
      p.push(v.x, v.y, v.z);
      if (i < segments && j < sides) {
        const n = i * (sides + 1) + j;
        idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1);
      }
    }
  }
  for (const end of [0, 1]) {
    const n = p.length / 3,
      row = end ? segments * (sides + 1) : 0;
    p.push(...curve.getPointAt(end).toArray());
    for (let j = 0; j < sides; j++)
      idx.push(n, end ? row + j : row + j + 1, end ? row + j + 1 : row + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return paint(g, top, belly, 0.06);
}
export function flexible(
  parent,
  key,
  points,
  radii,
  color,
  motions,
  options = {},
) {
  const arm = new THREE.Group();
  arm.name = key;
  parent.add(arm);
  part(arm, `${key}_skin`, () =>
    curvedGeometry(
      points,
      radii,
      color,
      options.belly || color,
      options.segments || 46,
      options.sides || 12,
      options.relief || 0,
    ),
  );
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const rig = bindTentacleMotion(arm, key, curve, motions, {
    count: options.count || 9,
    amplitude: options.amplitude ?? 0.13,
    phase: options.phase || 0,
  });
  return { arm, rig, tip: rig.bones.at(-1) };
}
export function eyePair(
  parent,
  key,
  x,
  y,
  z,
  r,
  iris = "#d8b274",
  brow = false,
) {
  for (const s of [-1, 1]) {
    oval(
      parent,
      `${key}_socket${s}`,
      [s * x, y, z],
      [r * 0.6, r * 1.12, r * 1.24],
      "#223237",
    );
    oval(
      parent,
      `${key}_iris${s}`,
      [s * (x + r * 0.38), y, z - r * 0.05],
      [r * 0.29, r * 0.75, r * 0.85],
      iris,
    );
    oval(
      parent,
      `${key}_pupil${s}`,
      [s * (x + r * 0.56), y, z - r * 0.12],
      [r * 0.095, r * 0.54, r * 0.3],
      "#06121b",
    );
    oval(
      parent,
      `${key}_glint${s}`,
      [s * (x + r * 0.64), y + r * 0.25, z - r * 0.38],
      [r * 0.08, r * 0.14, r * 0.13],
      "#e8e0cd",
    );
    if (brow)
      tube(
        parent,
        `${key}_brow${s}`,
        [
          [s * (x - r * 0.35), y + r * 1.03, z + r * 0.6],
          [s * (x + r * 0.75), y + r * 1.15, z],
          [s * (x + r * 0.7), y + r * 0.47, z - r * 0.8],
        ],
        r * 0.23,
        "#677878",
        8,
        6,
      );
  }
}
export function anchor(parent, key, p) {
  const a = new THREE.Object3D();
  a.name = key;
  a.position.set(...p);
  parent.add(a);
  return a;
}
export function coneGeometry(radius, length, direction, p) {
  const g = new THREE.ConeGeometry(radius, length, 7, 1);
  g.translate(0, length * 0.5, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...direction).normalize(),
    ),
  );
  g.translate(...p);
  return g;
}
export function teeth(parent, key, rows, color = "#d7d1b3") {
  return part(parent, key, () => {
    const parts = rows.map(({ p, d, r = 0.006, l = 0.03 }) =>
      paint(coneGeometry(r, l, d, p), color),
    );
    const gs = parts.map((g) => {
      const n = g.index ? g.toNonIndexed() : g.clone();
      g.dispose();
      return n;
    });
    const g = mergeGeometries(gs);
    gs.forEach((g) => g.dispose());
    return g;
  });
}
/** 胸鳍根保持在躯干里，关节只扇动向外伸出的闭合翼面。 */
export function paddlePair(
  parent,
  key,
  p,
  length,
  width,
  color,
  motions,
  axis = "z",
) {
  for (const side of [-1, 1]) {
    const joint = new THREE.Group();
    joint.position.set(side * p[0], p[1], p[2]);
    joint.name = `${key}_${side}`;
    parent.add(joint);
    const f = fin(
      joint,
      `${key}_web${side}`,
      [
        [0, 0],
        [length * 0.2, side * width * 0.65],
        [length * 0.8, side * width],
        [length, side * width * 0.68],
        [length * 0.66, side * width * 0.2],
        [length * 0.2, 0],
      ],
      color,
      "horizontal",
      width * 0.07,
    );
    f.position.y = 0;
    motions.push((t, e) => {
      joint.rotation[axis] =
        side * Math.sin(t * 1.1 + side * 0.7) * (0.08 + Math.min(e, 3) * 0.018);
      joint.rotation.y = side * 0.15;
    });
  }
}
