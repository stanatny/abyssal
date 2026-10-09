import * as THREE from "three";
import {
  MARIANA_PIT_SEGMENTS,
  marianaPitPoint,
  marianaPitFrame,
  marianaPitRim,
  marianaPitFace,
} from "./mariana_pit_profile.js";

/** 闭合岩体围出弯曲深坑，前壁同样参与渲染与碰撞；分块仅用于深度裁切。 */
export function createMarianaCliff(
  parent,
  keep,
  { top, bottom, side = 1, back = false, front = false, material, id },
) {
  const sector = front
      ? [24, 48]
      : back
        ? [96, 120]
        : side < 0
          ? [48, 96]
          : [120, 168],
    nu = sector[1] - sector[0],
    nv = 12,
    nr = top === 0 ? 6 : 1,
    positions = [],
    colors = [],
    indices = [],
    colliders = [],
    color = new THREE.Color(),
    dark = new THREE.Color(),
    light = new THREE.Color();
  const at = (r, v, u) => (r * (nv + 1) + v) * (nu + 1) + u;
  for (let r = 0; r <= nr; r++)
    for (let v = 0; v <= nv; v++)
      for (let u = 0; u <= nu; u++) {
        const angle =
            (((sector[0] + u) % MARIANA_PIT_SEGMENTS) * Math.PI * 2) /
            MARIANA_PIT_SEGMENTS,
          t = r / nr,
          rim = Math.min(top, marianaPitRim(angle)),
          outerTop = top === 0 ? -38 - Math.max(0, -Math.sin(angle)) * 14 : top,
          cap =
            THREE.MathUtils.lerp(rim, outerTop, t) +
            (top === 0 ? Math.sin(t * Math.PI) * Math.cos(angle * 7) * 12 : 0),
          y = THREE.MathUtils.lerp(cap, bottom, v / nv),
          inner = marianaPitPoint(angle, y),
          frame = marianaPitFrame(y),
          x = THREE.MathUtils.lerp(
            inner[0],
            frame.x + Math.cos(angle) * 700,
            t,
          ),
          z = THREE.MathUtils.lerp(
            inner[1],
            frame.z + Math.sin(angle) * 900,
            t,
          );
        positions.push(x, y, z);
        const palette = marianaLayerPalette(y);
        dark.set(palette[0]);
        light.set(palette[1]);
        color
          .copy(dark)
          .lerp(
            light,
            0.24 +
              0.45 *
                (0.5 +
                  0.5 *
                    Math.sin(y * 0.16 + angle * 13 + Math.sin(y * 0.025) * 2)),
          );
        color.toArray(colors, colors.length);
      }
  function quad(a, b, c, d) {
    indices.push(a, b, c, b, d, c);
  }
  for (let v = 0; v < nv; v++)
    for (let u = 0; u < nu; u++) {
      quad(at(0, v, u), at(0, v + 1, u), at(0, v, u + 1), at(0, v + 1, u + 1));
      quad(
        at(nr, v, u),
        at(nr, v, u + 1),
        at(nr, v + 1, u),
        at(nr, v + 1, u + 1),
      );
    }
  for (let r = 0; r < nr; r++)
    for (let u = 0; u < nu; u++) {
      quad(at(r, 0, u), at(r, 0, u + 1), at(r + 1, 0, u), at(r + 1, 0, u + 1));
      quad(
        at(r, nv, u),
        at(r + 1, nv, u),
        at(r, nv, u + 1),
        at(r + 1, nv, u + 1),
      );
    }
  for (let r = 0; r < nr; r++)
    for (let v = 0; v < nv; v++) {
      quad(at(r, v, 0), at(r + 1, v, 0), at(r, v + 1, 0), at(r + 1, v + 1, 0));
      quad(
        at(r, v, nu),
        at(r, v + 1, nu),
        at(r + 1, v, nu),
        at(r + 1, v + 1, nu),
      );
    }
  // 分层扇形实体填满岩壁外侧；坑内仅保留每个细单元的保守接触余量。
  for (let r = 0; r < nr; r++)
    for (let v = 0; v < nv; v++)
      for (let u = 0; u < nu; u++) {
        const lo = [Infinity, Infinity, Infinity],
          hi = [-Infinity, -Infinity, -Infinity];
        for (const rr of [r, r + 1])
          for (const vv of [v, v + 1])
            for (const uu of [u, u + 1])
              for (let k = 0; k < 3; k++) {
                const n = positions[at(rr, vv, uu) * 3 + k];
                lo[k] = Math.min(lo[k], n);
                hi[k] = Math.max(hi[k], n);
              }
        colliders.push({
          type: "box",
          id: `${id}_${r}_${v}_${u}`,
          x: (lo[0] + hi[0]) / 2,
          y: (lo[1] + hi[1]) / 2,
          z: (lo[2] + hi[2]) / 2,
          halfSize: new THREE.Vector3(...hi.map((n, k) => (n - lo[k]) / 2)),
        });
      }
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // 岩壁沿纵深保持同一曲面法线，封口面不会在每个剔除分段上制造黑色横缝。
  const normal = geometry.attributes.normal,
    tangent = new THREE.Vector3(),
    vertical = new THREE.Vector3(),
    wallNormal = new THREE.Vector3();
  for (let v = 0; v <= nv; v++)
    for (let u = 0; u <= nu; u++) {
      const i = at(0, v, u),
        y = positions[i * 3 + 1],
        angle = ((sector[0] + u) * Math.PI * 2) / MARIANA_PIT_SEGMENTS,
        a = marianaPitPoint(angle - 0.0001, y),
        b = marianaPitPoint(angle + 0.0001, y),
        low = marianaPitPoint(angle, y - 0.01),
        high = marianaPitPoint(angle, y + 0.01);
      tangent.set(b[0] - a[0], 0, b[1] - a[1]);
      vertical.set(high[0] - low[0], 0.02, high[1] - low[1]);
      wallNormal.copy(tangent).cross(vertical).normalize();
      normal.setXYZ(i, wallNormal.x, wallNormal.y, wallNormal.z);
    }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = id;
  mesh.userData.pitSector = {
    angles: sector.map((i) => (i * Math.PI * 2) / MARIANA_PIT_SEGMENTS),
    top,
    bottom,
  };
  parent.add(mesh);
  return colliders;
}

export const marianaCliffFace = marianaPitFace;

/** 各层使用连续过渡的沉积岩色，不把深水全部染成同一种灰蓝。 */
export function marianaLayerPalette(y) {
  return y > -650
    ? [0x485952, 0xb6b09a]
    : y > -1000
      ? [0x334c63, 0x91b2bc]
      : y > -1375
        ? [0x4c435d, 0xaa9cab]
        : y > -2150
          ? [0x353949, 0x7a91a7]
          : [0x54616b, 0xb9c0b6];
}
