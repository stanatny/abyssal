import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PENGLAI_LANDMARK_SITES } from "./penglai_landmark_sites.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 一次构造、按材质合批；地基采样实际三角面，不叠加漂浮贴片。 */
export function createPenglaiGuardianLandmarks(
  parent,
  keep,
  colliders,
  heightAt,
) {
  const palette = {
    stone: "#aeb5a4",
    dark: "#4d605b",
    jade: "#618e85",
    bronze: "#b39a62",
    red: "#955044",
    ivory: "#d2ccba",
  };
  const materials = Object.fromEntries(
    Object.entries(palette).map(([key, color]) => {
      const m = keep(
        new THREE.MeshStandardMaterial({
          color,
          roughness: key === "bronze" ? 0.58 : 0.91,
          metalness: key === "bronze" ? 0.38 : 0,
          vertexColors: true,
        }),
      );
      addSurfaceDetail(m, "stone", 0.1);
      return [key, m];
    }),
  );
  const roots = [],
    landmarks = [];
  for (const [index, site] of PENGLAI_LANDMARK_SITES.entries()) {
    const root = new THREE.Group();
    root.name = site.id;
    root.position.set(site.x, 0, site.z);
    root.rotation.y = site.yaw;
    parent.add(root);
    roots.push(root);
    const buckets = new Map(),
      transform = new THREE.Object3D(),
      rotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        site.yaw,
      );
    const world = (p) =>
      new THREE.Vector3(...p).applyQuaternion(rotation).add(root.position);
    const floor = (x, z) => {
      const p = world([x, 0, z]);
      return heightAt(p.x, p.z);
    };
    function part(g, key, p = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
      transform.position.set(...p);
      transform.scale.set(...scale);
      transform.rotation.set(...rot);
      transform.updateMatrix();
      const mesh = g.index ? g.toNonIndexed() : g.clone();
      g.dispose();
      mesh.applyMatrix4(transform.matrix);
      if (!mesh.attributes.uv)
        mesh.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(
            new Float32Array(mesh.attributes.position.count * 2),
            2,
          ),
        );
      const a = mesh.attributes.position,
        colors = [];
      for (let i = 0; i < a.count; i++) {
        const tone =
          0.94 +
          0.04 *
            Math.sin(a.getX(i) * 2.1 + a.getZ(i) * 1.7) *
            Math.sin(a.getY(i) * 1.3);
        colors.push(tone, tone, tone);
      }
      mesh.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(mesh);
    }
    const box = (key, p, size, r = 0.3) =>
      part(new RoundedBoxGeometry(...size, 1, r), key, p);
    const ball = (key, p, scale) =>
      part(new THREE.SphereGeometry(1, 16, 10), key, p, scale);
    function tube(key, points, r = 0.5, segments = 24) {
      part(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          segments,
          r,
          6,
          false,
        ),
        key,
      );
    }
    function solid(kind, p, size, type = "box") {
      const q = world(p);
      colliders.push({
        type,
        kind: "guardian_landmark_" + kind,
        x: q.x,
        y: q.y,
        z: q.z,
        rotation,
        ...(type === "box"
          ? { halfSize: { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 } }
          : { axes: { x: size[0], y: size[1], z: size[2] } }),
      });
    }
    function diskSolid(kind, x, y, z, r, h) {
      for (let i = 0; i < 16; i++) {
        const a = -r + (i * r) / 8,
          b = a + r / 8,
          mid = (a + b) / 2,
          width = 2 * Math.sqrt(Math.max(0, r * r - mid * mid));
        solid(kind, [x, y, z + mid], [width, h, r / 8 + 0.05]);
      }
    }
    function foundation(x, z, w, d, round = false) {
      const boundary = [],
        ys = [];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 12; j++) {
          const t = j / 12;
          const px =
              x +
              (i === 0
                ? -w / 2 + w * t
                : i === 1
                  ? w / 2
                  : i === 2
                    ? w / 2 - w * t
                    : -w / 2),
            pz =
              z +
              (i === 0
                ? -d / 2
                : i === 1
                  ? -d / 2 + d * t
                  : i === 2
                    ? d / 2
                    : d / 2 - d * t);
          if (!round) {
            boundary.push([px, pz]);
            ys.push(floor(px, pz));
          }
        }
      if (round)
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2,
            p = [x + (Math.cos(a) * w) / 2, z + (Math.sin(a) * d) / 2];
          boundary.push(p);
          ys.push(floor(...p));
        }
      for (let xx = -w / 2; xx <= w / 2; xx += 3)
        for (let zz = -d / 2; zz <= d / 2; zz += 3)
          if (!round || (xx / (w / 2)) ** 2 + (zz / (d / 2)) ** 2 <= 1)
            ys.push(floor(x + xx, z + zz));
      const top = Math.max(...ys) + 1.4,
        low = Math.min(...ys) - 2,
        positions = [],
        indices = [];
      for (const [px, pz] of boundary) positions.push(px, low, pz, px, top, pz);
      for (let i = 0; i < boundary.length; i++) {
        const a = i * 2,
          b = ((i + 1) % boundary.length) * 2;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
      const k = positions.length / 3;
      positions.push(x, top, z, x, low, z);
      for (let i = 0; i < boundary.length; i++) {
        const a = i * 2,
          b = ((i + 1) % boundary.length) * 2;
        indices.push(k, b + 1, a + 1, k + 1, a, b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      part(g, "stone");
      if (round) {
        diskSolid("foundation", x, (top + low) / 2, z, w / 2, top - low);
        part(new THREE.CylinderGeometry(w / 2, w / 2, 1, 48), "ivory", [
          x,
          top + 0.5,
          z,
        ]);
        diskSolid("foundation_cap", x, top + 0.5, z, w / 2, 1);
      } else {
        solid("foundation", [x, (top + low) / 2, z], [w, top - low, d]);
        box("ivory", [x, top + 0.5, z], [w + 0.6, 1, d + 0.6]);
        solid("foundation_cap", [x, top + 0.5, z], [w + 0.6, 1, d + 0.6]);
      }
      root.userData.foundations ??= [];
      root.userData.foundations.push({ x, z, w, d, top, low, round });
      return top + 1;
    }
    function roof(x, y, z, w, d, h, key = "jade") {
      // 有厚度的曲面瓦檐，檐脊与底面封口；代理只占逐格实际檐体。
      const positions = [],
        indices = [],
        n = 16,
        m = 8,
        at = (u, v) =>
          h * (1 - Math.abs(u) ** 0.8) +
          h * 0.36 * Math.abs(u) ** 5 +
          h * 0.18 * Math.abs(v) ** 5;
      for (let side = 0; side < 2; side++)
        for (let j = 0; j <= m; j++)
          for (let i = 0; i <= n; i++) {
            const u = (i / n) * 2 - 1,
              v = (j / m) * 2 - 1;
            positions.push(
              x + (u * w) / 2,
              y + at(u, v) - (side ? 1.1 : 0),
              z + (v * d) / 2,
            );
          }
      const layer = (n + 1) * (m + 1);
      for (let j = 0; j < m; j++)
        for (let i = 0; i < n; i++) {
          const a = j * (n + 1) + i,
            b = a + n + 1;
          indices.push(
            a,
            b,
            a + 1,
            a + 1,
            b,
            b + 1,
            a + layer,
            a + 1 + layer,
            b + layer,
            a + 1 + layer,
            b + 1 + layer,
            b + layer,
          );
        }
      const edge = [];
      for (let i = 0; i <= n; i++) edge.push(i);
      for (let j = 1; j <= m; j++) edge.push(j * (n + 1) + n);
      for (let i = n - 1; i >= 0; i--) edge.push(m * (n + 1) + i);
      for (let j = m - 1; j > 0; j--) edge.push(j * (n + 1));
      for (let i = 0; i < edge.length; i++) {
        const a = edge[i],
          b = edge[(i + 1) % edge.length];
        indices.push(a, b, a + layer, b, b + layer, a + layer);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      part(g, key);
      for (let i = 0; i < 8; i++) {
        const u = ((i + 0.5) / 8) * 2 - 1,
          ys = [at((i / 8) * 2 - 1, 0), at(((i + 1) / 8) * 2 - 1, 1)];
        solid(
          "eaves",
          [
            x + (u * w) / 2,
            y + (Math.max(...ys) + Math.min(...ys)) / 2 - 0.55,
            z,
          ],
          [w / 8, Math.max(...ys) - Math.min(...ys) + 1.2, d],
        );
      }
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 20; i++) {
          const u = i / 10 - 1;
          pts.push([
            x + (u * w) / 2,
            y + at(u, side) + 0.4,
            z + (side * d) / 2,
          ]);
        }
        tube("bronze", pts, 0.45, 24);
      }
      for (let i = -7; i <= 7; i++) {
        const u = i / 8;
        box(key, [x + (u * w) / 2, y + at(u, 0) + 0.42, z], [0.45, 0.4, d]);
      }
    }
    if (index === 0) {
      const pads = [foundation(-43, 0, 22, 26), foundation(43, 0, 22, 26)],
        lintel = Math.max(...pads) + 76;
      for (const [side, k] of [
        [-1, 0],
        [1, 1],
      ]) {
        const x = side * 43,
          y = pads[k],
          height = lintel - y;
        box("dark", [x, y + 2, 0], [16, 4, 20]);
        part(new THREE.CylinderGeometry(4.8, 6.4, height, 16, 1), "jade", [
          x,
          y + height / 2,
          0,
        ]);
        solid("dragon_column", [x, y + height / 2, 0], [12, height, 14]);
        for (const yy of [y + 7, lintel - 6]) {
          box("bronze", [x, yy, 0], [13, 1.5, 15]);
          box("stone", [x, yy + 2, 0], [14, 2, 17]);
        }
        const pts = [];
        for (let j = 0; j <= 36; j++) {
          const t = j / 36,
            a = t * Math.PI * 3.2 + side;
          pts.push([
            x + Math.cos(a) * 6.1,
            y + 10 + t * (height - 22),
            Math.sin(a) * 6.1,
          ]);
        }
        tube("stone", pts, 1.9, 56);
        for (let j = 3; j < 34; j += 3) {
          const p = pts[j];
          ball("bronze", [p[0], p[1] + 0.8, p[2]], [2.1, 0.48, 2.1]);
        }
        const hx = x - side * 3,
          hy = lintel - 10;
        tube("stone", [pts.at(-1), [x, hy, -3], [hx, hy, -6]], 2.1, 12);
        ball("stone", [hx, hy, -6], [4.1, 3.4, 5]);
        for (const j of [10, 24]) {
          const p = pts[j];
          for (const s of [-1, 1]) {
            const arm = [
              [p[0], p[1], p[2]],
              [p[0] + s * 4, p[1] - 2, p[2] - 1],
              [p[0] + s * 5, p[1] - 4, p[2] - 2],
            ];
            tube("stone", arm, 0.75, 12);
            for (let c = 0; c < 3; c++)
              tube(
                "bronze",
                [
                  arm[2],
                  [
                    arm[2][0] + s * (1 + c * 0.5),
                    arm[2][1] - 1,
                    arm[2][2] - 1 - c,
                  ],
                ],
                0.25,
                6,
              );
          }
        }

        box("stone", [hx, hy - 1, -10], [6, 3, 6], 0.8);
        box("dark", [hx, hy - 1.2, -13.05], [4.4, 0.65, 0.45], 0.1);
        for (const s of [-1, 1]) {
          ball("dark", [hx + s * 2.8, hy + 1, -9.7], [0.6, 0.45, 0.7]);
          tube(
            "bronze",
            [
              [hx + s * 2, hy + 2, -5],
              [hx + s * 3, hy + 5, -3],
              [hx + s * 4.5, hy + 6, -2],
            ],
            0.65,
            12,
          );
          tube(
            "stone",
            [
              [hx + s * 2, hy - 1, -12],
              [hx + s * 5, hy - 2, -11],
              [hx + s * 6, hy, -7],
            ],
            0.5,
            12,
          );
        }
        roof(x, lintel + 7, 0, 25, 29, 5);
        solid("capital", [x, lintel + 3, 0], [19, 8, 22]);
        box("stone", [x, lintel + 3, 0], [19, 8, 22]);
      }
      box("jade", [0, lintel, 0], [86, 7, 13]);
      solid("lintel", [0, lintel, 0], [86, 7, 13]);
      roof(0, lintel + 7, 0, 66, 25, 10);
      ball("bronze", [0, lintel + 22, 0], [4, 4, 4]);
      solid("pearl", [0, lintel + 22, 0], [4, 4, 4], "ellipsoid");
      for (const s of [-1, 1])
        tube(
          "stone",
          [
            [s * 31, lintel + 3, -7.3],
            [s * 22, lintel + 8, -7.3],
            [s * 15, lintel + 8, -7.3],
            [s * 12, lintel + 5, -7.3],
            [s * 16, lintel + 3, -7.3],
            [s * 21, lintel + 4, -7.3],
          ],
          0.8,
          24,
        );
      root.userData.focus = [0, lintel - 27, 0];
    } else if (index === 1) {
      for (const side of [-1, 1]) {
        const x = side * 35,
          y = foundation(x, 0, 22, 24);
        box("stone", [x, y + 3, 0], [19, 6, 21]);
        solid("que_base", [x, y + 3, 0], [19, 6, 21]);
        box("ivory", [x, y + 23, 0], [13, 34, 15], 0.6);
        solid("que_shaft", [x, y + 23, 0], [13, 34, 15]);
        for (let j = 0; j < 3; j++) {
          box(
            j === 1 ? "dark" : "stone",
            [x, y + 40 + j * 2, 0],
            [17 + j * 2, 2, 19 + j * 2],
          );
          solid(
            "que_bracket",
            [x, y + 40 + j * 2, 0],
            [17 + j * 2, 2, 19 + j * 2],
          );
        }
        roof(x, y + 46, 0, 28, 28, 6, "dark");
        // 阙身虎面采用实体浮雕，白石额骨和深口区保持厚度。
        box("stone", [x, y + 26, -8], [10.8, 9, 4], 1.4);
        for (const side of [-1, 1]) {
          tube(
            "dark",
            [
              [x + side * 4.9, y + 26, -10],
              [x + side * 3.7, y + 25, -10.4],
              [x + side * 4.2, y + 23.5, -10.4],
            ],
            0.34,
            8,
          );
          tube(
            "bronze",
            [
              [x + side * 5.5, y + 11, 8],
              [x + side * 5.5, y + 32, 8],
              [x + side * 3.5, y + 35, 8],
            ],
            0.45,
            12,
          );
        }
        for (const yy of [y + 10, y + 35])
          box("dark", [x, yy, 0], [13.4, 0.7, 15.4], 0.1);
        for (let j = 0; j < 4; j++) {
          const yy = y + 13 + j * 5;
          for (const side of [-1, 1])
            tube(
              "bronze",
              [
                [x + side * 6.8, yy, -5],
                [x + side * 6.8, yy + 2, 0],
                [x + side * 6.8, yy, 5],
              ],
              0.25,
              8,
            );
        }

        box("dark", [x, y + 23, -10.2], [5.4, 3.8, 1.1], 0.8);
        for (const s of [-1, 1]) {
          part(
            new THREE.ConeGeometry(2, 4.6, 4),
            "ivory",
            [x + s * 3.6, y + 31, -8],
            [1, 1, 0.65],
            [0, Math.PI / 4, s * -0.18],
          );
          tube(
            "dark",
            [
              [x + s * 4, y + 28, -10],
              [x + s * 2.5, y + 29, -10.5],
              [x + s * 0.8, y + 27.8, -10.7],
            ],
            0.65,
            12,
          );
          part(
            new THREE.ConeGeometry(0.65, 2, 8),
            "ivory",
            [x + s * 1.7, y + 23.4, -11],
            [1, 1, 1],
            [Math.PI, 0, 0],
          );
        }
        ball("dark", [x, y + 25.5, -11], [1.2, 0.8, 0.7]);
        for (const s of [-1, 1])
          tube(
            "bronze",
            [
              [x + s * 3, y + 9, -7.9],
              [x + s * 3, y + 18, -7.9],
              [x + s * 4, y + 20, -7.9],
            ],
            0.35,
            10,
          );
        // 顶部剑脊象征西方金气，不使用发光危险特效。
        const shape = new THREE.Shape();
        shape.moveTo(-1.4, 0);
        shape.lineTo(-1, 10);
        shape.lineTo(0, 14);
        shape.lineTo(1, 10);
        shape.lineTo(1.4, 0);
        shape.closePath();
        part(
          new THREE.ExtrudeGeometry(shape, {
            depth: 1.3,
            bevelEnabled: true,
            bevelSize: 0.2,
            bevelThickness: 0.2,
            bevelSegments: 1,
            steps: 1,
          }),
          "bronze",
          [x, y + 52, -0.65],
        );
        solid("finial", [x, y + 59, 0], [3, 14, 2]);
      }
      root.userData.focus = [0, Math.max(floor(-35, 0), floor(35, 0)) + 29, 0];
    } else {
      const base = foundation(0, 0, 64, 64, true),
        y = base;
      for (let i = 0; i < 3; i++) {
        part(
          new THREE.CylinderGeometry(29 - i * 3, 30 - i * 3, 2, 48),
          "stone",
          [0, y + 1 + i * 2, 0],
        );
        diskSolid("altar_tier", 0, y + 1 + i * 2, 0, 29.5 - i * 3, 2);
      }
      // 翼冠是厚实铜雕，羽片为有体积的渐尖弧面，太阳环保留真实空隙。
      part(new THREE.CylinderGeometry(7, 10, 8, 16), "red", [0, y + 10, 0]);
      diskSolid("altar_drum", 0, y + 10, 0, 8.5, 8);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        part(
          new THREE.SphereGeometry(1, 12, 8),
          "bronze",
          [Math.cos(a) * 8, y + 9, Math.sin(a) * 8],
          [1, 3, 1],
          [0, 0, 0.2],
        );
      }
      for (let i = 0; i < 8; i++) {
        const z = -31 - i * 3,
          heights = [];
        for (const x of [-8, 0, 8])
          for (const zz of [-2.25, 0, 2.25]) heights.push(floor(x, z + zz));
        const top =
            Math.max(...heights) + 0.8 > y + 1 - i * 2.3
              ? Math.max(...heights) + 0.8
              : y + 1 - i * 2.3,
          low = Math.min(...heights) - 1;
        box("stone", [0, (top + low) / 2, z], [16, top - low, 4.5]);
        solid("altar_steps", [0, (top + low) / 2, z], [16, top - low, 4.5]);
      }
      ball("bronze", [0, y + 24, 0], [5.5, 12, 4]);
      solid("bird_body", [0, y + 24, 0], [5.5, 12, 4], "ellipsoid");
      for (const face of [-1, 1])
        for (let j = 0; j < 7; j++) {
          const yy = y + 17 + j * 2.3,
            zz =
              face *
              (4 * Math.sqrt(Math.max(0, 1 - ((yy - y - 24) / 12) ** 2)) +
                0.18);
          tube(
            "red",
            [
              [-3, yy + 0.8, zz * 0.85],
              [0, yy - 0.5, zz],
              [3, yy + 0.8, zz * 0.85],
            ],
            0.2,
            12,
          );
        }

      tube(
        "bronze",
        [
          [0, y + 30, 0],
          [0, y + 39, 0],
          [0, y + 42, -3],
        ],
        2,
        22,
      );
      ball("bronze", [0, y + 42, -3], [3, 3, 4]);
      for (const s of [-1, 1]) {
        ball("dark", [s * 2.6, y + 43, -4.4], [0.45, 0.6, 0.65]);
        tube(
          "bronze",
          [
            [s * 2, y + 44, -5],
            [s * 3, y + 45, -3],
            [s * 2, y + 44, 0],
          ],
          0.6,
          10,
        );
      }
      for (let j = 0; j < 5; j++)
        tube(
          "red",
          [
            [0, y + 17, 1],
            [j * 2 - 4, y + 13, -2],
            [j * 3 - 6, y + 9, -9],
            [j * 3 - 6, y + 7, -15],
          ],
          0.8,
          18,
        );

      part(
        new THREE.ConeGeometry(1.5, 6, 10),
        "bronze",
        [0, y + 41, -8],
        [1, 1, 1],
        [-Math.PI / 2, 0, 0],
      );
      for (const s of [-1, 1]) {
        const wing = new THREE.Shape();
        wing.moveTo(s * 3, y + 26);
        wing.bezierCurveTo(s * 12, y + 29, s * 24, y + 41, s * 34, y + 47);
        wing.quadraticCurveTo(s * 29, y + 33, s * 17, y + 26);
        wing.quadraticCurveTo(s * 8, y + 21, s * 3, y + 26);
        wing.closePath();
        part(
          new THREE.ExtrudeGeometry(wing, {
            depth: 2.5,
            bevelEnabled: true,
            bevelThickness: 0.7,
            bevelSize: 0.6,
            bevelSegments: 2,
            curveSegments: 12,
            steps: 1,
          }),
          "red",
          [0, 0, -1.25],
        );
        tube(
          "red",
          [
            [s * 3, y + 28, 0],
            [s * 12, y + 32, 0],
            [s * 22, y + 38, 0],
            [s * 32, y + 43, 0],
          ],
          2.5,
          30,
        );
        for (let j = 0; j < 9; j++) {
          const start = new THREE.Vector3(
              s * (6 + j * 2.5),
              y + 29 + j * 1.4,
              0,
            ),
            end = new THREE.Vector3(s * (18 + j * 2.6), y + 20 + j * 3.7, 0),
            mid = start
              .clone()
              .lerp(end, 0.5)
              .add(new THREE.Vector3(0, 3, 0));
          const curve = new THREE.QuadraticBezierCurve3(start, mid, end),
            pos = [],
            idx = [],
            steps = 12;
          for (let k = 0; k <= steps; k++) {
            const t = k / steps,
              p = curve.getPoint(t),
              tan = curve.getTangent(t),
              width = 2.3 * Math.sin(Math.PI * (0.08 + 0.92 * t)) + 0.08;
            for (const [a, b] of [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ])
              pos.push(
                p.x - tan.y * width * a,
                p.y + tan.x * width * a,
                p.z + b * 0.65 * Math.sin(Math.PI * (0.12 + 0.84 * t)),
              );
            if (k < steps) {
              const a = k * 4;
              for (let f = 0; f < 4; f++) {
                const n = (f + 1) % 4;
                idx.push(a + f, a + n, a + 4 + f, a + n, a + 4 + n, a + 4 + f);
              }
            }
          }
          idx.push(
            0,
            2,
            1,
            0,
            3,
            2,
            steps * 4,
            steps * 4 + 1,
            steps * 4 + 2,
            steps * 4,
            steps * 4 + 2,
            steps * 4 + 3,
          );
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          g.setIndex(idx);
          g.computeVertexNormals();
          part(g, j % 3 === 0 ? "bronze" : "red");
          for (let k = 0; k < 3; k++) {
            const a = world(curve.getPoint(k / 3).toArray()),
              b = world(curve.getPoint((k + 1) / 3).toArray());
            colliders.push({
              type: "capsule",
              kind: "guardian_landmark_feather",
              a,
              b,
              radius: 1,
            });
          }
          tube(
            "bronze",
            [start.toArray(), mid.toArray(), end.toArray()].map((p) => [
              p[0],
              p[1],
              -2.15,
            ]),
            0.2,
            14,
          );
        }
        // 双翼用窄的分段实体覆盖羽冠，不用包住整片天空的方盒。
        for (let j = 0; j < 4; j++)
          solid("wing", [s * (10 + j * 8), y + 29 + j * 4, 0], [7, 7, 1.6]);
      }
      for (let j = -2; j <= 2; j++)
        tube(
          j % 2 ? "bronze" : "red",
          [
            [j * 1.8, y + 19, 1],
            [j * 4, y + 13, 3],
            [j * 5.5, y + 8, 5],
          ],
          1.2,
          20,
        );
      part(new THREE.TorusGeometry(19, 0.85, 8, 64), "bronze", [0, y + 37, 3]);
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2,
          b = ((i + 1) / 32) * Math.PI * 2;
        colliders.push({
          type: "capsule",
          kind: "guardian_landmark_sun_ring",
          a: world([Math.cos(a) * 19, y + 37 + Math.sin(a) * 19, 3]),
          b: world([Math.cos(b) * 19, y + 37 + Math.sin(b) * 19, 3]),
          radius: 0.85,
        });
      }
      for (const s of [-1, 1])
        for (let j = 0; j < 4; j++)
          tube(
            "bronze",
            [
              [s * (1 + j * 0.5), y + 44, -2],
              [s * (3 + j), y + 47 + j, -1],
              [s * (4 + j * 1.2), y + 49 + j, 1],
            ],
            0.3,
            12,
          );
      root.userData.focus = [0, y + 30, 0];
    }
    for (const [key, parts] of buckets) {
      const g = keep(mergeGeometries(parts, false));
      parts.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(g, materials[key]);
      mesh.name = site.id + "_" + key;
      root.add(mesh);
    }
    const focus = world(root.userData.focus);
    landmarks.push({ name: site.name, position: focus });
    root.userData.site = site;
  }
  return { roots, landmarks };
}
