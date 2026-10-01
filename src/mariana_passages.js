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
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = id;
  parent.add(mesh);
  const points = curve.getPoints(56);
  return points.slice(1).map((p, i) => ({
    type: "capsule",
    id: `${id}_${i}`,
    a: points[i],
    b: p,
    radius: 5.6,
  }));
}
