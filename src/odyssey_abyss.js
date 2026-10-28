import * as THREE from "three";
import { createOdysseyAbyssAssets } from "./odyssey_abyss_asset.js";
import { finishScenePreparation } from "./scene_preparation.js";
import cragCollision from "./assets/models/odyssey_crag_collision.json" with { type: "json" };
import memorialCollision from "./assets/models/odyssey_memorial_collision.json" with { type: "json" };

/** 外缘礁崖与侧路遗迹，不围住领主或占用主航道。尺寸是原始实体的全高。 */
export const ODYSSEY_ABYSS_PROPS = Object.freeze(
  [
    ["crag", -365, -1020, 88, 0.3],
    ["crag", -380, -1200, 110, 1.8],
    ["crag", -330, -1345, 74, 2.8],
    ["crag", 365, -1295, 60, -0.6],
    ["crag", 370, -1495, 82, 1.2],
    ["crag", 245, -1640, 60, -0.2],
    ["memorial", 65, -1500, 31, -0.9],
    ["memorial", 6, -1470, 19, 0.4],
  ].map(Object.freeze),
);

/** 底座沿权威海床连续贴合；只烘焙静态实体，运行帧不改顶点。 */
export function createOdysseyAbyss(parent, keep, heightAt, colliders) {
  return finishScenePreparation(
    createOdysseyAbyssSteps(parent, keep, heightAt, colliders),
  );
}

/** 由地图构造事务持有资源；在实体与碰撞批次之间让出主线程。 */
export function* createOdysseyAbyssSteps(parent, keep, heightAt, colliders) {
  const assets = createOdysseyAbyssAssets(keep),
    meshes = [],
    records = [];
  const v = new THREE.Vector3(),
    n = new THREE.Vector3();
  yield "abyss-assets";
  for (const [i, [kind, x, z, size, yaw]] of ODYSSEY_ABYSS_PROPS.entries()) {
    const asset = assets[kind],
      src = asset.geometry,
      floor = heightAt(x, z),
      rotation = new THREE.Matrix4().makeRotationY(yaw),
      burial = kind === "crag" ? size * 0.06 : size * 0.012,
      base = asset.packed.min[1],
      breadth = kind === "crag" ? 0.65 : 1,
      scale = new THREE.Vector3(size * breadth, size, size * breadth);
    const transform = (p) => {
      p.multiply(scale).applyMatrix4(rotation);
      p.y += heightAt(x + p.x, z + p.z) - floor - base * size - burial;
      return p;
    };
    // 同一海床变形同时处理近远景法线，保持 UV 接缝原本的平滑/硬边。
    const fit = () => {
      const g = keep(new THREE.BufferGeometry()),
        far = keep(new THREE.BufferGeometry()),
        p = src.attributes.position.clone(),
        normal = src.attributes.normal,
        farNormal = asset.farGeometry.attributes.normal;
      for (const [name, attribute] of Object.entries(src.attributes)) {
        g.setAttribute(name, attribute);
        far.setAttribute(name, attribute);
      }
      g.setAttribute("position", p);
      far.setAttribute("position", p);
      g.setIndex(src.index);
      far.setIndex(asset.farGeometry.index);
      const normals = new Float32Array(normal.count * 3),
        farNormals = new Float32Array(farNormal.count * 3);
      for (let j = 0; j < p.count; j++) {
        v.fromBufferAttribute(p, j);
        transform(v);
        p.setXYZ(j, v.x, v.y, v.z);
        const xx = x + v.x,
          zz = z + v.z,
          e = 0.15;
        const dx = (heightAt(xx + e, zz) - heightAt(xx - e, zz)) / (2 * e),
          dz = (heightAt(xx, zz + e) - heightAt(xx, zz - e)) / (2 * e);
        n.fromBufferAttribute(normal, j);
        n.set(n.x / breadth, n.y, n.z / breadth).transformDirection(rotation);
        n.set(n.x - n.y * dx, n.y, n.z - n.y * dz)
          .normalize()
          .toArray(normals, j * 3);
        n.fromBufferAttribute(farNormal, j);
        n.set(n.x / breadth, n.y, n.z / breadth).transformDirection(rotation);
        n.set(n.x - n.y * dx, n.y, n.z - n.y * dz)
          .normalize()
          .toArray(farNormals, j * 3);
      }
      g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      far.setAttribute("normal", new THREE.BufferAttribute(farNormals, 3));
      g.computeBoundingBox();
      g.computeBoundingSphere();
      far.boundingBox = g.boundingBox.clone();
      far.boundingSphere = g.boundingSphere.clone();
      return [g, far];
    };
    const [near, far] = fit();
    const mesh = new THREE.Mesh(near, asset.material);
    mesh.position.set(x, floor, z);
    mesh.name = `odyssey_abyss_${kind}_${i}`;
    mesh.userData.artRevision = "hf-odyssey-abyss-20261028";
    mesh.userData.size = size;
    parent.add(mesh);
    meshes.push(mesh);
    yield `abyss-${kind}-mesh`;
    const source = kind === "crag" ? cragCollision : memorialCollision;
    const first = colliders.length;
    // 对同源体素的八角与边中点取海床包络，碰撞和可见地貌保持同一变形。
    for (const [j, b] of source.boxes.entries()) {
      const bounds = new THREE.Box3();
      for (const sx of [-1, 0, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 0, 1]) {
            v.set(b[0] + sx * b[3], b[1] + sy * b[4], b[2] + sz * b[5]);
            bounds.expandByPoint(transform(v));
          }
      const center = bounds.getCenter(new THREE.Vector3()).add(mesh.position),
        half = bounds
          .getSize(new THREE.Vector3())
          .multiplyScalar(0.5)
          .addScalar(0.05);
      colliders.push({
        type: "box",
        kind: "odyssey_abyss_solid",
        id: `odyssey_abyss_${i}_${j}`,
        x: center.x,
        y: center.y,
        z: center.z,
        halfSize: half,
      });
    }
    let distant = false;
    records.push({
      kind,
      mesh,
      near,
      far,
      colliderStart: first,
      colliderCount: colliders.length - first,
      burial,
      update(camera, high) {
        const d = mesh.position.distanceTo(camera),
          limit = (kind === "crag" ? 330 : 240) * (high ? 1 : 0.85);
        const next = distant ? d > limit * 0.85 : d > limit * 1.15;
        if (next !== distant) {
          distant = next;
          mesh.geometry = distant ? far : near;
          mesh.material = distant ? asset.farMaterial : asset.material;
        }
      },
    });
    yield `abyss-${kind}-colliders`;
  }
  return {
    assets,
    meshes,
    records,
    update(camera, high = true) {
      for (const r of records) r.update(camera, high);
    },
  };
}
