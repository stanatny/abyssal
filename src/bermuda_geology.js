import * as THREE from "three";
import { acquireBermudaGeologyAsset } from "./bermuda_geology_asset.js";
import archContacts from "./assets/models/bermuda_arch_contacts.json" with { type: "json" };

/** 岩层轮廓保留真实拱洞；只在建图时贴坡和拟合实体，共享原型与有界近远细节。 */
export function createBermudaGeology(parent, { heightAt, shelf = false }) {
  const root = new THREE.Group(),
    assets = [],
    batches = [],
    arches = [],
    placements = [],
    colliders = [];
  root.name = shelf ? "bermuda_hf_shelf_rocks" : "bermuda_hf_reef_geology";
  parent.add(root);
  const point = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    dummy = new THREE.Object3D();
  if (!shelf) {
    const a = acquireBermudaGeologyAsset("arch");
    assets.push(a);
    const bb = a.geometry.boundingBox,
      center = bb.getCenter(new THREE.Vector3()),
      scale = 80 / (bb.max.x - bb.min.x);
    for (const [id, x, z] of [
      ["reef_arch", -245, -365],
      ["trench_arch", 170, -775],
    ]) {
      const meshes = [];
      for (const [source, material, detail] of [
        [a.geometry, a.material, "close"],
        [a.farGeometry, a.farMaterial, "distant"],
      ]) {
        const g = source.clone(),
          p = g.attributes.position;
        // 量化法线须先解为浮点再应用坡面逆转置，避免整数属性被写成接近零。
        const normals = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
          const px = x + (p.getX(i) - center.x) * scale,
            pz = z + (p.getZ(i) - center.z) * scale;
          const y = (p.getY(i) - bb.min.y) * scale + heightAt(px, pz) - 0.5;
          normal.fromBufferAttribute(g.attributes.normal, i);
          const dx = (heightAt(px + 0.2, pz) - heightAt(px - 0.2, pz)) / 0.4,
            dz = (heightAt(px, pz + 0.2) - heightAt(px, pz - 0.2)) / 0.4;
          normal
            .set(normal.x - dx * normal.y, normal.y, normal.z - dz * normal.y)
            .normalize()
            .toArray(normals, i * 3);
          p.setXYZ(i, px, y, pz);
        }
        g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
        g.computeBoundingBox();
        g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, material);
        mesh.name = `bermuda_${id}_${detail}`;
        meshes.push(mesh);
        root.add(mesh);
      }
      meshes[0].visible = false;
      const row = { id, x, z, y: heightAt(x, z), meshes, close: false };
      arches.push(row);
      placements.push(row);
      for (let j = 0; j < archContacts.boxes.length; j++) {
        const b = archContacts.boxes[j],
          lo = [0, 1, 2].map((k) => b.center[k] - b.size[k] / 2),
          hi = [0, 1, 2].map((k) => b.center[k] + b.size[k] / 2);
        let low = Infinity,
          high = -Infinity;
        // 对整个接触块覆盖的坡面采样，避免用中心点漏掉岩拱脚下的斜坡。
        const nx = Math.ceil(b.size[0]),
          nz = Math.ceil(b.size[2]);
        for (let u = 0; u <= nx; u++)
          for (let v = 0; v <= nz; v++) {
            const y = heightAt(
              x + lo[0] + (b.size[0] * u) / nx,
              z + lo[2] + (b.size[2] * v) / nz,
            );
            low = Math.min(low, y);
            high = Math.max(high, y);
          }
        const minY = lo[1] + low - 0.7,
          maxY = hi[1] + high - 0.3;
        colliders.push({
          id: `${id}_${j}`,
          type: "box",
          x: x + b.center[0],
          y: (minY + maxY) / 2,
          z: z + b.center[2],
          halfSize: new THREE.Vector3(
            b.size[0] / 2 + 0.04,
            (maxY - minY) / 2,
            b.size[2] / 2 + 0.04,
          ),
          rotation: new THREE.Quaternion(),
        });
      }
    }
  }
  const kind = shelf ? "rock" : "spire",
    a = acquireBermudaGeologyAsset(kind);
  assets.push(a);
  const rows = [],
    bb = a.geometry.boundingBox,
    extent = bb.getSize(new THREE.Vector3()),
    center = bb.getCenter(new THREE.Vector3()),
    base = new THREE.Matrix4().makeTranslation(-center.x, -bb.min.y, -center.z),
    matrices = [];
  const n = shelf ? 60 : 28,
    near = new THREE.InstancedMesh(a.geometry, a.material, n),
    far = new THREE.InstancedMesh(a.farGeometry, a.farMaterial, n);
  near.name = `bermuda_${kind}_close`;
  far.name = `bermuda_${kind}_distant`;
  const bands = [];
  if (!shelf)
    for (let j = 0; j < 4; j++) {
      const bounds = new THREE.Box3(),
        lo = bb.min.y + (extent.y * j) / 4,
        hi = bb.min.y + (extent.y * (j + 1)) / 4;
      for (let v = 0; v < a.geometry.attributes.position.count; v++) {
        point.fromBufferAttribute(a.geometry.attributes.position, v);
        if (point.y >= lo - 0.0001 && point.y <= hi + 0.0001)
          bounds.expandByPoint(point);
      }
      bounds.min.y = lo;
      bounds.max.y = hi;
      bands.push(bounds);
    }
  let rockEnvelope = 1;
  if (shelf)
    for (let j = 0; j < a.geometry.attributes.position.count; j++) {
      point
        .fromBufferAttribute(a.geometry.attributes.position, j)
        .sub(center)
        .divide(extent)
        .multiplyScalar(2);
      rockEnvelope = Math.max(rockEnvelope, point.length());
    }
  for (let i = 0; i < n; i++) {
    const x = shelf
        ? (i % 2 ? 1 : -1) * (90 + (i % 5) * 32)
        : (i % 2 ? 1 : -1) * (155 + (i % 5) * 19),
      z = shelf ? 90 - Math.floor(i / 2) * 39 : -310 - Math.floor(i / 2) * 51;
    const size = 3 + (i % 4) * 2,
      h = shelf ? size * 1.4 : 12 + (i % 6) * 8;
    const scale = shelf
      ? Math.min((size * 2) / extent.x, h / extent.y, (size * 2.4) / extent.z)
      : h / extent.y;
    const dx = (heightAt(x + 2, z) - heightAt(x - 2, z)) / 4,
      dz = (heightAt(x, z + 2) - heightAt(x, z - 2)) / 4;
    dummy.position.set(x, 0, z);
    // 保留岩柱高度等级，但宽度仍限制在原十四米占地以内。
    const radial = shelf
      ? scale
      : Math.min(scale, 14 / extent.x, 14 / extent.z);
    dummy.scale.set(radial, scale, radial);
    dummy.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-dx, 1, -dz).normalize(),
    );
    dummy.quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        i * 0.8,
      ),
    );
    dummy.updateMatrix();
    let matrix = dummy.matrix.clone().multiply(base),
      baseGap = -Infinity;
    for (let j = 0; j < a.geometry.attributes.position.count; j++) {
      if (a.geometry.attributes.position.getY(j) > bb.min.y + extent.y * 0.015)
        continue;
      point
        .fromBufferAttribute(a.geometry.attributes.position, j)
        .applyMatrix4(matrix);
      baseGap = Math.max(baseGap, point.y - heightAt(point.x, point.z));
    }
    // 整个底缘都压入海床，不能只让最高坡面接触一个底点。
    dummy.position.y = -baseGap - (shelf ? Math.max(0.4, h * 0.12) : 0.25);
    dummy.updateMatrix();
    matrix = dummy.matrix.clone().multiply(base);
    matrices.push(matrix);
    near.setMatrixAt(i, matrix);
    far.setMatrixAt(i, matrix);
    if (shelf) {
      point.copy(center).applyMatrix4(matrix);
      colliders.push({
        id: `bermuda_rock_${i}`,
        type: "ellipsoid",
        x: point.x,
        y: point.y,
        z: point.z,
        axes: extent
          .clone()
          .multiplyScalar((scale * rockEnvelope) / 2)
          .addScalar(0.08),
        rotation: dummy.quaternion.clone(),
      });
    } else
      for (let j = 0; j < bands.length; j++) {
        const bounds = bands[j];
        point.copy(bounds.getCenter(new THREE.Vector3())).applyMatrix4(matrix);
        colliders.push({
          id: `bermuda_spire_${i}_${j}`,
          type: "box",
          x: point.x,
          y: point.y,
          z: point.z,
          halfSize: bounds
            .getSize(new THREE.Vector3())
            .multiply(dummy.scale)
            .multiplyScalar(0.5)
            .addScalar(0.1),
          rotation: dummy.quaternion.clone(),
        });
      }
    rows.push({
      i,
      x,
      z,
      y: dummy.position.y,
      h,
      scale,
      matrix: matrix.toArray(),
    });
  }
  near.computeBoundingSphere();
  far.computeBoundingSphere();
  near.count = 0;
  near.visible = false;
  root.add(near, far);
  batches.push({ kind, near, far, matrices, rows, close: new Uint8Array(n) });
  placements.push(...rows);
  const prepare = async (options) =>
    (await Promise.all(assets.map((a) => a.prepare(options)))).every(Boolean);
  root.userData.prepareMaterials = prepare;
  void prepare();
  let disposed = false,
    lastTime = -Infinity;
  return {
    root,
    assets,
    batches,
    arches,
    placements,
    colliders,
    prepare,
    update(time, position) {
      if (disposed || (time >= lastTime && time - lastTime < 0.4)) return;
      lastTime = time;
      for (const row of arches) {
        row.close =
          point.set(row.x, row.y + 25, row.z).distanceTo(position) <
          (row.close ? 165 : 145);
        row.meshes[0].visible = row.close;
        row.meshes[1].visible = !row.close;
      }
      for (const b of batches) {
        let n = 0,
          f = 0;
        for (let i = 0; i < b.matrices.length; i++) {
          point.setFromMatrixPosition(b.matrices[i]);
          const range = Math.max(45, b.rows[i].h * 2.2);
          const close =
            point.distanceTo(position) < range + (b.close[i] ? 12 : 0);
          b.close[i] = Number(close);
          (close ? b.near : b.far).setMatrixAt(
            close ? n++ : f++,
            b.matrices[i],
          );
        }
        for (const [mesh, count] of [
          [b.near, n],
          [b.far, f],
        ]) {
          mesh.count = count;
          mesh.visible = count > 0;
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const r of arches) for (const m of r.meshes) m.geometry.dispose();
      for (const b of batches) {
        b.near.dispose();
        b.far.dispose();
      }
      root.clear();
      for (const a of assets) a.release();
      colliders.length = 0;
    },
  };
}
