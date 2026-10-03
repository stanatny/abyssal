import * as THREE from "three";
import {
  amazonIslandBounds,
  amazonIslandCeiling,
  amazonSurfaceHeight,
  amazonSeabedHeight,
} from "./amazon_config.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 保留连续雨林顶盖；底部沉积顶棚单独渲染和碰撞，不再堵死整个水柱。 */
export function* createAmazonIslandSteps(parent, resources, colliders) {
  const keep = (r) => (resources.add(r), r),
    material = keep(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }),
    );
  addSurfaceDetail(material, "stone", 0.4);
  const root = new THREE.Group();
  root.name = "hollow_rainforest_island";
  parent.add(root);
  for (let start = -1230; start < -110; start += 40) {
    const end = Math.min(-110, start + 40),
      rows = Math.ceil((end - start) / 2),
      cols = 64,
      p = [],
      c = [],
      index = [],
      a = new THREE.Color("#665538"),
      b = new THREE.Color("#877250");
    for (let side = 0; side < 2; side++)
      for (let r = 0; r <= rows; r++) {
        const z = start + ((end - start) * r) / rows,
          bounds = amazonIslandBounds(z);
        for (let s = 0; s <= cols; s++) {
          const x = THREE.MathUtils.lerp(bounds.left, bounds.right, s / cols),
            roof = amazonIslandCeiling(x, z),
            y = side ? roof : Math.max(roof + 6, amazonSurfaceHeight(x, z));
          p.push(x, y, z);
          const color = a
            .clone()
            .lerp(b, (Math.sin(x * 0.14 + z * 0.17) + 1) * 0.16)
            .multiplyScalar(side ? 0.73 : 1);
          color.toArray(c, c.length);
          if (r < rows && s < cols) {
            const i = side * (rows + 1) * (cols + 1) + r * (cols + 1) + s,
              j = i + cols + 1;
            index.push(
              ...(side
                ? [i, i + 1, j, j, i + 1, j + 1]
                : [i, j, i + 1, j, j + 1, i + 1]),
            );
          }
        }
      }
    const layer = (rows + 1) * (cols + 1);
    for (let r = 0; r < rows; r++)
      for (const s of [0, cols]) {
        const i = r * (cols + 1) + s,
          j = i + cols + 1;
        index.push(
          ...(s === 0
            ? [i, i + layer, j, j, i + layer, j + layer]
            : [i, j, i + layer, j, j + layer, i + layer]),
        );
      }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material);
    mesh.name = "eroded_island_cap";
    root.add(mesh);
    yield "hollow-island-cap";
  }
  for (let z = -1226; z < -110; z += 4) {
    const bounds = amazonIslandBounds(z),
      x = (bounds.left + bounds.right) * 0.5,
      half = (bounds.right - bounds.left) * 0.5;
    if (half < 1) continue;
    let bottom = Infinity;
    for (let px = bounds.left; px <= bounds.right; px += 4)
      bottom = Math.min(
        bottom,
        amazonIslandCeiling(px, z - 2),
        amazonIslandCeiling(px, z + 2),
      );
    colliders.push({
      type: "box",
      kind: "rainforest_cap",
      x,
      y: (bottom + 34) * 0.5,
      z,
      halfSize: { x: half, y: (34 - bottom) * 0.5, z: 2.05 },
    });
  }
  // 侵蚀残柱支撑林岛，柱脚和顶端接入同源河床/顶盖，不做悬空装饰。
  const columnGeometry = keep(new THREE.CylinderGeometry(1, 1, 1, 18, 32));
  const cp = columnGeometry.attributes.position,
    cc = [];
  const radiusAt = (t) => 0.57 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.57;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i),
      y = cp.getY(i),
      z = cp.getZ(i),
      t = y + 0.5;
    const width =
      radiusAt(t) * (1 + 0.06 * Math.sin(t * 47 + Math.atan2(x, z) * 5));
    cp.setXYZ(i, x * width + Math.sin(t * 6) * 0.08, y, z * width);
    const color = new THREE.Color("#7b684b").multiplyScalar(
      0.77 + 0.17 * Math.sin(t * 55),
    );
    color.toArray(cc, cc.length);
  }
  columnGeometry.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
  columnGeometry.computeVertexNormals();
  for (const z of [-245, -435, -555, -785, -1035, -1145]) {
    const bounds = amazonIslandBounds(z);
    for (const side of [-1, 1]) {
      const x = side < 0 ? bounds.left + 27 : bounds.right - 27;
      const floor = amazonSeabedHeight(x, z),
        ceiling = amazonIslandCeiling(x, z),
        height = ceiling - floor + 3;
      const radius = 11 + ((z % 3) + 3),
        mesh = new THREE.Mesh(columnGeometry, material);
      mesh.name = "eroded_sediment_support";
      mesh.position.set(x, (ceiling + floor) / 2, z);
      mesh.scale.set(radius, height, radius);
      root.add(mesh);
      for (let i = 0; i < 12; i++) {
        const t = i / 12,
          next = (i + 1) / 12,
          r = radius * Math.max(radiusAt(t), radiusAt(next)) * 1.07;
        colliders.push({
          type: "capsule",
          kind: "island_sediment_support",
          a: new THREE.Vector3(x, floor + t * height, z),
          b: new THREE.Vector3(x, floor + next * height, z),
          radius: r,
        });
      }
    }
    yield "island-sediment-supports";
  }
  yield "hollow-island-solids";
  return { root };
}
