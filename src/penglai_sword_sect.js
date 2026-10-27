import * as THREE from "three";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { createPenglaiTempleAsset } from "./penglai_temple_asset.js";
import { createSageJian, sageJianAsset } from "./sage_jian.js";

/** 按最终网格的三角面切出水平带，不让细长剑身沿用整柄宽盒子。 */
export function swordSurfaceContacts(mesh, kind, colliders, count = 24) {
  const g = mesh.geometry,
    p = g.attributes.position,
    ids = g.index;
  g.computeBoundingBox();
  const min = g.boundingBox.min.y,
    step = (g.boundingBox.max.y - min) / count;
  const cells = Array.from({ length: count }, () => new THREE.Box3());
  const clip = (poly, edge, sign) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const ia = (a.y - edge) * sign >= -1e-9,
        ib = (b.y - edge) * sign >= -1e-9;
      if (ia) out.push(a);
      if (ia !== ib) out.push(a.clone().lerp(b, (edge - a.y) / (b.y - a.y)));
    }
    return out;
  };
  for (let i = 0; i < ids.count; i += 3) {
    const tri = [0, 1, 2].map((k) =>
      new THREE.Vector3().fromBufferAttribute(p, ids.getX(i + k)),
    );
    const lo = Math.max(
      0,
      Math.floor((Math.min(...tri.map((v) => v.y)) - min) / step),
    );
    const hi = Math.min(
      count - 1,
      Math.floor((Math.max(...tri.map((v) => v.y)) - min) / step),
    );
    for (let j = lo; j <= hi; j++)
      for (const v of clip(
        clip(tri, min + j * step, 1),
        min + (j + 1) * step,
        -1,
      ))
        cells[j].expandByPoint(v);
  }
  mesh.updateWorldMatrix(true, false);
  const q = mesh.getWorldQuaternion(new THREE.Quaternion()),
    s = mesh.getWorldScale(new THREE.Vector3());
  for (const b of cells)
    if (!b.isEmpty()) {
      const center = b
          .getCenter(new THREE.Vector3())
          .applyMatrix4(mesh.matrixWorld),
        half = b.getSize(new THREE.Vector3()).multiply(s).multiplyScalar(0.5);
      colliders.push({
        type: "box",
        kind,
        x: center.x,
        y: center.y,
        z: center.z,
        rotation: q,
        halfSize: {
          x: Math.max(0.03, half.x),
          y: Math.max(0.03, half.y),
          z: Math.max(0.03, half.z),
        },
      });
    }
}

/** 莲台下的承托依实际瓦顶采样，底缘贴合曲面，顶面承接平整石座。 */
function ridgeSupport({ root, keep, roof, colliders, x, z }) {
  roof.updateWorldMatrix(true, false);
  const side = roof.material.side;
  roof.material.side = THREE.DoubleSide;
  const sample = (dx, dz) => {
    const hits = new THREE.Raycaster(
      new THREE.Vector3(x + dx, 400, z + dz),
      new THREE.Vector3(0, -1, 0),
      0,
      200,
    ).intersectObject(roof);
    if (!hits.length)
      throw new Error("Sword pedestal has no supporting roof surface");
    return hits[0].point.y;
  };
  let ring, top;
  try {
    ring = Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI) / 8;
      const dx = Math.cos(a) * 11,
        dz = Math.sin(a) * 10;
      return [x + dx, sample(dx, dz) - 0.14, z + dz];
    });
    top = Math.max(sample(0, 0), ...ring.map((v) => v[1] + 0.14)) + 0.45;
  } finally {
    roof.material.side = side;
  }
  const vertices = [],
    index = [];
  for (const v of ring) vertices.push(v[0], top, v[2]);
  for (const v of ring) vertices.push(...v);
  for (let i = 1; i < 15; i++) index.push(0, i + 1, i, 16, 16 + i, 16 + i + 1);
  for (let i = 0; i < 16; i++) {
    const j = (i + 1) % 16;
    index.push(i, j, 16 + j, i, 16 + j, 16 + i);
  }
  const g = keep(new THREE.BufferGeometry());
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  const supportMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: 0x625d50,
      roughness: 0.95,
      flatShading: true,
    }),
  );
  addSurfaceDetail(supportMaterial, "stone", 0.75);
  const m = new THREE.Mesh(g, supportMaterial);
  m.name = "skybearer_ridge_support";
  root.add(m);
  swordSurfaceContacts(m, "skybearer_ridge_support", colliders, 8);
  return top;
}

/** 巨剑复用真君已验收的直剑资源；新增莲台和香炉归当前地图所有。 */
export function addPenglaiSwordMonument({
  root,
  keep,
  carve,
  colliders,
  x,
  y,
  z,
}) {
  const roofs = root.getObjectsByProperty("name", "penglai_hf_temple_roof");
  const roof = roofs.toSorted((a, b) => b.position.y - a.position.y)[0];
  const baseY = ridgeSupport({ root, keep, roof, colliders, x, z });
  const pedestal = carve(
    "sword_pedestal",
    root,
    [x, baseY + 4, z],
    [21, 8, 20],
    colliders,
  );
  pedestal.userData.sectKind = "sword_pedestal";
  const kit = sageJianAsset(),
    box = kit.ridingGeometry.boundingBox;
  const scale = 85 / (box.max.y - box.min.y);
  const sword = createSageJian(
    root,
    [x, baseY + 4 - box.min.y * scale, z],
    scale,
    true,
  );
  sword.name = "skybearer_sword_monument";
  sword.userData.sectKind = "greatsword";
  sword.userData.prepareMaterials = kit.prepare;
  sword.userData.height = 85;
  sword.userData.baseY = baseY + 4;
  sword.rotation.y = 0.12;
  swordSurfaceContacts(sword.children[0], "skybearer_sword", colliders);
  const a = createPenglaiTempleAsset("temple_censer", keep),
    poses = [];
  for (const side of [-1, 1]) {
    const o = new THREE.Object3D();
    o.position.set(x + side * 31, y + 4 + 3.25, z + 45);
    o.scale.set(
      ...[8.2, 6.5, 7].map((v, i) => v / (a.packed.max[i] - a.packed.min[i])),
    );
    o.updateMatrix();
    poses.push(o.matrix.clone());
    const proxy = new THREE.Mesh(a.geometry, a.material);
    proxy.position.copy(o.position);
    proxy.scale.copy(o.scale);
    proxy.updateMatrixWorld();
    swordSurfaceContacts(proxy, "temple_censer", colliders, 12);
  }
  const censers = new THREE.InstancedMesh(a.geometry, a.material, poses.length);
  poses.forEach((m, i) => censers.setMatrixAt(i, m));
  censers.name = "penglai_hf_temple_censer";
  censers.userData.hfTempleKind = "temple_censer";
  censers.userData.prepareMaterials = a.prepare;
  censers.computeBoundingBox();
  censers.computeBoundingSphere();
  root.add(censers);
}

/** 龙门沿用原柱位、横梁和跃门高度；只换成与道观相同的雕刻木石与瓦顶。 */
export function addPenglaiSectGate({ root, carve, colliders, y, z }) {
  const existing = root.getObjectByName("penglai_hf_temple_pillar"),
    pose = new THREE.Object3D();
  const bounds =
    existing.geometry.boundingBox ||
    (existing.geometry.computeBoundingBox(), existing.geometry.boundingBox);
  const s = bounds.getSize(new THREE.Vector3());
  const columns = new THREE.InstancedMesh(
    existing.geometry,
    existing.material,
    2,
  );
  for (let i = 0; i < 2; i++) {
    pose.position.set((i * 2 - 1) * 28, y + 31, z);
    pose.scale.set(5 / s.x, 64 / s.y, 5 / s.z);
    pose.updateMatrix();
    columns.setMatrixAt(i, pose.matrix);
  }
  columns.name = "penglai_dragon_gate_carved_pillars";
  columns.userData.hfTempleKind = "temple_pillar";
  columns.userData.prepareMaterials = existing.userData.prepareMaterials;
  columns.computeBoundingBox();
  columns.computeBoundingSphere();
  root.add(columns);
  const roof = carve(
    "temple_roof",
    root,
    [0, y + 62, z],
    [70, 12, 19],
    colliders,
  );
  roof.name = "penglai_dragon_gate_carved_roof";
  return roof;
}
