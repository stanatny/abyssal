import * as THREE from "three";
import { atlantisMaterials, cachedGeometry } from "./atlantis_art_geometry.js";

// 普通路标和地宫壁龛共用克制的贝珠照明强度；缩放灯具按面积调整。
export const PEARL_LIGHT_INTENSITY = 45;

const habitats = new Map();
/** 幻想发光贝珠：放射肋双壳、虹彩内壁、厚贝缘与藏在壳内的珍珠；不作为现实物种。 */
export function pearlHabitat({ detail = "full" } = {}) {
  if (detail !== "full" && detail !== "niche")
    throw new Error(`Unknown pearl detail: ${detail}`);
  if (habitats.has(detail)) return habitats.get(detail);
  // 壁龛仅按径向取较少采样；保留全部角向壳肋，独立缓存避免改变大型路标。
  const niche = detail === "niche";
  const suffix = niche ? "_niche" : "";
  const { shell, nacre, pearl } = atlantisMaterials();
  const parts = [];
  for (const upper of [false, true]) {
    for (const inside of [false, true]) {
      const geometry = cachedGeometry(
        `atlantis_pearl_shell_${upper}_${inside}${suffix}`,
        () => shellValve(upper, inside, niche ? 12 : 24),
      );
      parts.push({
        geometry,
        material: inside ? nacre : shell,
        key: inside ? "nacre" : "shell",
      });
    }
  }
  parts.push({
    geometry: cachedGeometry(`atlantis_pearl_core${suffix}`, () => {
      const g = new THREE.SphereGeometry(
        1.03,
        niche ? 16 : 28,
        niche ? 12 : 20,
      );
      g.scale(1, 0.94, 1);
      g.translate(0, 1.36, -0.22);
      return g;
    }),
    material: pearl,
    key: "pearl",
  });
  for (const upper of [false, true]) {
    parts.push({
      geometry: cachedGeometry(`atlantis_pearl_rim_${upper}${suffix}`, () => {
        const points = Array.from({ length: 73 }, (_, i) => {
          const a = (i / 72 - 0.5) * Math.PI * 0.94;
          return valvePoint(a, 1, upper, true).lerp(
            valvePoint(a, 1, upper, false),
            0.5,
          );
        });
        const g = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          niche ? 48 : 96,
          0.17,
          6,
          false,
        );
        const colors = new Float32Array(g.attributes.position.count * 3).fill(
          0.75,
        );
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return g;
      }),
      material: nacre,
      key: "nacre",
    });
  }
  // 低矮壳体仅挡住可见底碗；上壳轮廓由沿肋的细胶囊覆盖，保留开口。
  const colliders = [
    {
      type: "box",
      kind: "pearl_shell",
      x: 0,
      y: 0.57,
      z: -0.2,
      halfSize: { x: 2.5, y: 0.42, z: 1.8 },
    },
  ];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI * 0.47 + (i / 10) * Math.PI * 0.94;
    for (let j = 0; j < 4; j++) {
      const point = (t) => valvePoint(a, t, true, false);
      const v0 = point(j / 4),
        v1 = point((j + 1) / 4);
      colliders.push({
        type: "capsule",
        kind: "pearl_shell",
        a: { x: v0.x, y: v0.y, z: v0.z },
        b: { x: v1.x, y: v1.y, z: v1.z },
        radius: 0.22,
      });
    }
  }
  const habitat = {
    parts,
    colliders,
    width: 8.3,
    depth: 5.8,
    height: 5.9,
    lightHeight: 1.65,
  };
  habitats.set(detail, habitat);
  return habitat;
}

/** 扇形贝壳的内外表面共用波状边缘，壳脊向铰链聚拢，避免球壳拼接的占位感。 */
function valvePoint(angle, t, upper, inside) {
  const ridges = (0.5 + 0.5 * Math.cos(angle * 22)) ** 3;
  const rim = 1 + 0.025 * Math.cos(angle * 22);
  let x = Math.sin(angle) * 4.1 * t * rim;
  let z = -Math.cos(angle) * 4.8 * t * rim;
  let y =
    0.18 +
    t * 1.2 -
    Math.sin(Math.PI * t) * 0.95 +
    (1 - Math.cos(angle)) * t * 0.65;
  y += inside ? 0.07 : -0.2 - ridges * 0.22 * Math.sqrt(t);
  if (upper) {
    y = -y;
    const turn = 1.55;
    const oldY = y;
    y = oldY * Math.cos(turn) - z * Math.sin(turn);
    z = oldY * Math.sin(turn) + z * Math.cos(turn);
  }
  return new THREE.Vector3(x, y + 0.75, z + 2.25);
}

function shellValve(upper, inside, rows) {
  const vertices = [],
    colors = [],
    indices = [],
    columns = 72;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= columns; i++) {
      const t = j / rows,
        a = (i / columns - 0.5) * Math.PI * 0.94;
      const p = valvePoint(a, t, upper, inside);
      vertices.push(...p.toArray());
      const c = new THREE.Color(inside ? "#ecdcc3" : "#527d86");
      c.lerp(
        new THREE.Color(inside ? "#83b9b5" : "#886e90"),
        (0.5 + 0.5 * Math.sin(a * 5 + t * 7)) * (inside ? 0.36 : 0.46),
      );
      c.multiplyScalar(
        inside
          ? 0.9 + 0.08 * Math.cos(t * 50)
          : 0.73 + 0.2 * (0.5 + 0.5 * Math.cos(a * 22)),
      );
      colors.push(c.r, c.g, c.b);
      if (j < rows && i < columns) {
        const n = j * (columns + 1) + i,
          m = n + columns + 1;
        const triangles =
          j === 0 ? [n + 1, m, m + 1] : [n, m, n + 1, n + 1, m, m + 1];
        if (upper !== inside) triangles.reverse();
        indices.push(...triangles);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
