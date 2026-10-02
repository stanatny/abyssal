import * as THREE from "three";

/** 连续褶皱岩壁按180米垂直区块绘制；保守接触单元跟随同一网格，不形成穿透裂缝。 */
export function createMarianaCliff(
  parent,
  keep,
  { top, bottom, side = 1, back = false, material, id },
) {
  const geometry = new THREE.BufferGeometry(),
    p = [],
    colors = [],
    idx = [],
    colliders = [];
  const uMin = back ? -230 : -650,
    uMax = back ? 230 : -90,
    nu = back ? 28 : 34,
    nv = 12;
  const color = new THREE.Color(),
    light = new THREE.Color(),
    dark = new THREE.Color();
  for (let v = 0; v <= nv; v++)
    for (let u = 0; u <= nu; u++) {
      const along = THREE.MathUtils.lerp(uMin, uMax, u / nu),
        y = THREE.MathUtils.lerp(top, bottom, v / nv),
        face = marianaCliffFace(along, y, back, side);
      p.push(back ? along : face, y, back ? face : along);
      const strata =
        0.5 + 0.5 * Math.sin(y * 0.18 + Math.sin(along * 0.018) * 2.7);
      const palette = marianaLayerPalette(y);
      dark.set(palette[0]);
      light.set(palette[1]);
      color.copy(dark).lerp(light, 0.22 + strata * 0.55);
      color.toArray(colors, colors.length);
    }
  for (let v = 0; v < nv; v++)
    for (let u = 0; u < nu; u++) {
      const a = v * (nu + 1) + u,
        b = a + nu + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
      const ids = [a, a + 1, b, b + 1],
        axis = back ? 2 : 0,
        faces = ids.map((i) => p[i * 3 + axis]),
        lo = back || side < 0 ? Math.max(...faces) : Math.min(...faces);
      const along = THREE.MathUtils.lerp(uMin, uMax, (u + 0.5) / nu),
        y = THREE.MathUtils.lerp(top, bottom, (v + 0.5) / nv);
      const boundary = back ? -700 : side * 270;
      const center = back
        ? [along, y, (lo + boundary) / 2]
        : [(lo + boundary) / 2, y, along];
      const dimensions = back
        ? [(uMax - uMin) / nu, (top - bottom) / nv, Math.abs(lo - boundary)]
        : [Math.abs(boundary - lo), (top - bottom) / nv, (uMax - uMin) / nu];
      colliders.push({
        type: "box",
        id: `${id}_${u}_${v}`,
        x: center[0],
        y: center[1],
        z: center[2],
        halfSize: new THREE.Vector3(...dimensions).multiplyScalar(0.5),
      });
    }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(keep(geometry), material);
  mesh.name = id;
  parent.add(mesh);
  return colliders;
}

/** 岩壁与附着生态共用褶皱采样，防止独立坐标制造悬空礁石。 */
export function marianaCliffFace(u, y, back = false, side = 1) {
  const folds =
    Math.sin(u * 0.021 + y * 0.009) * 13 +
    Math.sin(u * 0.062 - y * 0.016) * 5 +
    Math.sin(u * 0.17 + y * 0.034) * 2;
  if (back) return -611 + folds * 0.8 + Math.sin(y * 0.006) * 17;
  const center = Math.sin(y * 0.0048) * 24 + Math.sin(y * 0.013) * 7;
  const width =
    184 + Math.cos(y * 0.012) * 15 + Math.sin(u * 0.012 + y * 0.005) * 7;
  return center + side * (width - folds);
}

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
