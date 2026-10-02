import * as THREE from "three";

/** 岩台上的天然拱廊形成短绕路；弧管与接触胶囊使用同一中心线。 */
export function addMarianaPassage(parent, keep, material, center, id) {
  const [x, y, z] = center;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x - 46, y + 4, z),
    new THREE.Vector3(x - 45, y + 33, z - 3),
    new THREE.Vector3(x - 29, y + 64, z),
    new THREE.Vector3(x, y + 77, z + 2),
    new THREE.Vector3(x + 30, y + 62, z),
    new THREE.Vector3(x + 45, y + 31, z - 3),
    new THREE.Vector3(x + 46, y + 4, z),
  ]);
  const geometry = keep(new THREE.TubeGeometry(curve, 56, 5.5, 12, false));
  // 风化的岩拱截面沿中心线变化，所有削蚀都留在既有胶囊实体内。
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const t = Math.floor(i / 13) / 56;
    const centerline = curve.getPointAt(Math.min(1, t));
    const px = vertices.getX(i),
      py = vertices.getY(i),
      pz = vertices.getZ(i);
    const erosion =
      0.85 +
      0.13 * Math.sin(px * 0.39 + py * 0.27) * Math.sin(pz * 0.53 - py * 0.18);
    vertices.setXYZ(
      i,
      centerline.x + (px - centerline.x) * erosion,
      centerline.y + (py - centerline.y) * erosion,
      centerline.z + (pz - centerline.z) * erosion,
    );
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = id;
  parent.add(mesh);
  const points = curve.getSpacedPoints(56);
  return points.slice(1).map((p, i) => ({
    type: "capsule",
    id: `${id}_${i}`,
    a: points[i],
    b: p,
    radius: 5.6,
  }));
}
