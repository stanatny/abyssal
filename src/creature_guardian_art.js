import * as T from "three";
import { pgGeometry, pgPart } from "./creature_penglai_art.js";

/** 神兽骨面使用收敛的圆角截面，避免把颅骨、甲板和肌肉画成一串圆球。 */
export function guardianLoft(parent, key, material, sections, exponent = 0.82) {
  const mesh = pgPart(
    parent,
    pgGeometry(key, () => {
      const positions = [],
        indices = [],
        sides = 20,
        rings = sections.length * 5;
      const profile = new T.CatmullRomCurve3(
        sections.map((s) => new T.Vector3(s[1], s[2], s[3] || 0)),
        false,
        "catmullrom",
        0.2,
      );
      for (let i = 0; i <= rings; i++) {
        const u = (i / rings) * (sections.length - 1),
          k = Math.min(sections.length - 2, Math.floor(u)),
          r = profile.getPoint(i / rings);
        for (let j = 0; j < sides; j++) {
          const a = (j / sides) * Math.PI * 2,
            c = Math.cos(a),
            s = Math.sin(a);
          positions.push(
            Math.sign(c) * Math.abs(c) ** exponent * Math.max(0.001, r.x),
            Math.sign(s) * Math.abs(s) ** exponent * Math.max(0.001, r.y) + r.z,
            T.MathUtils.lerp(sections[k][0], sections[k + 1][0], u - k),
          );
          if (i < rings) {
            const v = i * sides + j,
              w = i * sides + ((j + 1) % sides);
            indices.push(v, w, v + sides, w, w + sides, v + sides);
          }
        }
      }
      for (const end of [0, rings]) {
        const center = positions.length / 3,
          section = sections[end ? sections.length - 1 : 0];
        positions.push(0, section[3] || 0, section[0]);
        for (let j = 0; j < sides; j++) {
          const a = end * sides + j,
            b = end * sides + ((j + 1) % sides);
          end ? indices.push(center, a, b) : indices.push(center, b, a);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    }),
    material,
  );
  mesh.userData.anatomyKey = key;
  return mesh;
}

/** 有界截面数的收尖实心角、骨棘和肌腱，端部封闭且资源按形状缓存。 */
export function guardianSweep(parent, material, points, radii, name) {
  const key = `guardian_sweep_${points.flat()}_${radii}`;
  return pgPart(
    parent,
    pgGeometry(key, () => {
      const path = new T.CatmullRomCurve3(
          points.map((p) => new T.Vector3(...p)),
        ),
        rows = Math.max(12, points.length * 5),
        sides = 8,
        frames = path.computeFrenetFrames(rows, false),
        ps = [],
        ix = [];
      for (let i = 0; i <= rows; i++) {
        const t = i / rows,
          u = t * (radii.length - 1),
          k = Math.min(radii.length - 2, Math.floor(u)),
          radius = T.MathUtils.lerp(radii[k], radii[k + 1], u - k),
          c = path.getPointAt(t);
        for (let j = 0; j < sides; j++) {
          const a = (j / sides) * Math.PI * 2,
            p = c
              .clone()
              .addScaledVector(frames.normals[i], Math.cos(a) * radius)
              .addScaledVector(frames.binormals[i], Math.sin(a) * radius);
          ps.push(p.x, p.y, p.z);
          if (i < rows) {
            const v = i * sides + j,
              w = i * sides + ((j + 1) % sides);
            ix.push(v, w, v + sides, w, w + sides, v + sides);
          }
        }
      }
      for (const end of [0, rows]) {
        const center = ps.length / 3,
          c = path.getPointAt(end / rows);
        ps.push(c.x, c.y, c.z);
        for (let j = 0; j < sides; j++) {
          const a = end * sides + j,
            b = end * sides + ((j + 1) % sides);
          end ? ix.push(center, a, b) : ix.push(center, b, a);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
      g.setIndex(ix);
      g.computeVertexNormals();
      return g;
    }),
    material,
    [0, 0, 0],
    [1, 1, 1],
    [],
    name,
  );
}
