import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** 合并有主干、侧枝和浅色生长尖端的鹿角珊瑚；底部位于原点，供共享实例使用。 */
export function bermudaCoralColonyGeometry() {
  const pieces = [];
  const branch = (points, radius) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const g = new THREE.TubeGeometry(curve, 9, radius, 6, false);
    const positions = g.attributes.position;
    const colors = [];
    for (let i = 0; i < positions.count; i++) {
      const t = Math.floor(i / 7) / 9;
      const center = curve.getPointAt(t);
      const taper = 1 - t * 0.7;
      positions.setXYZ(
        i,
        center.x + (positions.getX(i) - center.x) * taper,
        center.y + (positions.getY(i) - center.y) * taper,
        center.z + (positions.getZ(i) - center.z) * taper,
      );
      const c = new THREE.Color().lerpColors(
        new THREE.Color("#a4654e"),
        new THREE.Color("#ead9b0"),
        Math.pow(t, 6) * 0.7,
      );
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    pieces.push(g);
  };
  branch(
    [
      [0, -0.08, 0],
      [0.015, 0.3, 0],
      [-0.04, 0.65, 0.02],
      [0, 1.08, 0.03],
    ],
    0.065,
  );
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399,
      y = 0.12 + i * 0.075,
      r = 0.36 + (i % 3) * 0.075;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    branch(
      [
        [0, y, 0],
        [x * 0.48, y + 0.14, z * 0.48],
        [x, y + 0.35, z],
        [x * 1.06, y + 0.7, z * 1.1],
      ],
      0.038,
    );
    branch(
      [
        [x * 0.65, y + 0.23, z * 0.65],
        [x * 0.95, y + 0.3, z * 0.55],
        [x * 1.3, y + 0.53, z * 0.45],
      ],
      0.024,
    );
  }
  const geometry = mergeGeometries(pieces);
  pieces.forEach((g) => g.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}
