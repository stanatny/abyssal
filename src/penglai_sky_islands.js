import * as THREE from "three";
export const PENGLAI_SKY_ISLANDS = Object.freeze(
  [
    [-465, 325, -450, 46, 34, 65],
    [440, 420, -520, 65, 45, 90],
    [-380, 445, -840, 50, 34, 75],
    [275, 465, -930, 44, 35, 60],
    [110, 500, -1140, 35, 27, 50],
    [-50, 415, -310, 27, 25, 43],
  ].map(([x, y, z, rx, rz, drop]) => Object.freeze({ x, y, z, rx, rz, drop })),
);
/** 浮空石山具有青绿平顶、收尖岩根与悬泉；静态实体代理随环境一次创建和释放。 */
export function createPenglaiSkyIslands(parent, colliders) {
  const root = new THREE.Group();
  root.name = "floating_peach_mountains";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    treeAnchors = [];
  const material = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
  );
  const mist = keep(
    new THREE.MeshBasicMaterial({
      color: "#cfdfd4",
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    }),
  );
  const mistGeo = keep(new THREE.SphereGeometry(1, 20, 10));
  const water = keep(
    new THREE.MeshBasicMaterial({
      color: "#d1e3dc",
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const waterGeo = keep(new THREE.PlaneGeometry(1, 1, 1, 12));
  for (const [index, s] of PENGLAI_SKY_ISLANDS.entries()) {
    const positions = [],
      colors = [],
      indices = [],
      rings = 14,
      n = 64;
    for (let i = 0; i <= rings; i++) {
      const u = i / rings,
        y = u < 0.22 ? 8 - u * 38 : (-(u - 0.22) / 0.78) * s.drop;
      const radius =
        u < 0.22
          ? Math.sin(((u / 0.22) * Math.PI) / 2)
          : Math.pow(1 - (u - 0.22) / 0.78, 0.55);
      for (let j = 0; j <= n; j++) {
        const a = (j / n) * Math.PI * 2,
          wobble =
            1 + 0.09 * Math.sin(a * 5 + index) + 0.05 * Math.cos(a * 9 + u * 8);
        positions.push(
          Math.cos(a) * s.rx * radius * wobble + s.x,
          y + Math.sin(a * 4 + u * 12) * radius * 1.6 + s.y,
          Math.sin(a) * s.rz * radius * wobble + s.z,
        );
        const color = new THREE.Color(u < 0.22 ? "#6c9862" : "#8f9d8b");
        color.multiplyScalar(0.9 + 0.1 * Math.cos(a * 5 + u * 22));
        colors.push(color.r, color.g, color.b);
        if (i < rings && j < n) {
          const k = i * (n + 1) + j;
          indices.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2);
        }
      }
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material);
    mesh.name = "floating_island_" + index;
    root.add(mesh);
    for (const [u, f] of [
      [0.03, 0.84],
      [0.31, 0.78],
      [0.65, 0.42],
      [0.86, 0.2],
    ])
      colliders.push({
        type: "ellipsoid",
        kind: "floating_mountain",
        x: s.x,
        y: s.y - u * s.drop,
        z: s.z,
        axes: { x: s.rx * f, y: u < 0.1 ? 9 : s.drop * 0.19, z: s.rz * f },
      });
    const cloud = new THREE.Mesh(mistGeo, mist);
    cloud.position.set(s.x, s.y - s.drop * 0.4, s.z);
    cloud.scale.set(s.rx * 1.3, s.drop * 0.17, s.rz * 1.2);
    root.add(cloud);
    const spring = new THREE.Mesh(waterGeo, water);
    spring.position.set(s.x + s.rx * 0.78, s.y - s.drop * 0.55, s.z);
    spring.scale.set(2.3, s.drop * 0.92, 1);
    spring.rotation.y = -0.6;
    spring.name = "hanging_cloud_spring";
    root.add(spring);
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2;
      treeAnchors.push({
        x: s.x + Math.cos(a) * s.rx * 0.45,
        y: s.y + 5.5,
        z: s.z + Math.sin(a) * s.rz * 0.4,
      });
    }
  }
  let disposed = false;
  return {
    root,
    treeAnchors,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      resources.forEach((r) => r.dispose());
      root.clear();
    },
  };
}
