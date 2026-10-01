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
    light = new THREE.Color(0x83929a),
    dark = new THREE.Color(0x4c6374);
  for (let v = 0; v <= nv; v++)
    for (let u = 0; u <= nu; u++) {
      const along = THREE.MathUtils.lerp(uMin, uMax, u / nu),
        y = THREE.MathUtils.lerp(top, bottom, v / nv),
        face = marianaCliffFace(along, y, back);
      p.push(back ? along : side * face, y, back ? face : along);
      const strata =
        0.5 + 0.5 * Math.sin(y * 0.18 + Math.sin(along * 0.018) * 2.7);
      color.copy(dark).lerp(light, 0.28 + strata * 0.5);
      color.toArray(colors, colors.length);
    }
  for (let v = 0; v < nv; v++)
    for (let u = 0; u < nu; u++) {
      const a = v * (nu + 1) + u,
        b = a + nu + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
      const ids = [a, a + 1, b, b + 1],
        lo = back
          ? Math.max(...ids.map((i) => p[i * 3 + 2]))
          : Math.min(...ids.map((i) => Math.abs(p[i * 3])));
      const along = THREE.MathUtils.lerp(uMin, uMax, (u + 0.5) / nu),
        y = THREE.MathUtils.lerp(top, bottom, (v + 0.5) / nv);
      const center = back
        ? [along, y, (lo - 690) / 2]
        : [(side * (lo + 250)) / 2, y, along];
      const dimensions = back
        ? [(uMax - uMin) / nu, (top - bottom) / nv, lo + 690]
        : [250 - lo, (top - bottom) / nv, (uMax - uMin) / nu];
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
export function marianaCliffFace(u, y, back = false) {
  const folds =
    Math.sin(u * 0.025 + y * 0.008) * 7 +
    Math.sin(u * 0.071 - y * 0.013) * 3.5 +
    Math.sin(u * 0.19 + y * 0.029) * 1.1;
  return (back ? -628 : 201) + (back ? 1 : -1) * folds;
}
