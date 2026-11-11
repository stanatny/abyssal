import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * 接续既有拱脚端圈，不改变拱弧或洞口。输入几何已处于地形采样坐标系；
 * 合并时消费原几何，返回几何由调用者持有。椭圆脚用窄胶囊束包络，避免圆形大碰撞堵洞。
 */
export function groundedEllipticalArchGeometry(source, rings, heightAt) {
  const pieces = [source],
    feet = [],
    colliders = [],
    p = source.attributes.position,
    n = source.attributes.normal,
    sourceUV = source.attributes.uv;
  for (const { indices: ids, center, radiusX, radiusZ, id } of rings) {
    const ring = ids.map((i) => new THREE.Vector3().fromBufferAttribute(p, i)),
      radial = ring.length - 1;
    let maximumGap = -Infinity,
      lowestGround = Infinity,
      signedArea = 0;
    for (let j = 0; j <= radial; j++) {
      const q = ring[j],
        ground = heightAt(q.x, q.z);
      maximumGap = Math.max(maximumGap, q.y - ground);
      lowestGround = Math.min(lowestGround, ground);
      if (j < radial) signedArea += q.x * ring[j + 1].z - ring[j + 1].x * q.z;
    }
    if (maximumGap <= 0.06) continue;
    // 平底盖整个足迹落入最终三角地面以下；不只采样中心或端圈。
    for (let x = -radiusX; x <= radiusX; x += 0.5)
      for (let z = -radiusZ; z <= radiusZ; z += 0.5) {
        if ((x / radiusX) ** 2 + (z / radiusZ) ** 2 > 1) continue;
        lowestGround = Math.min(
          lowestGround,
          heightAt(center.x + x, center.z + z),
        );
      }
    const bottom = lowestGround - (0.2 + radiusX * 0.12),
      positions = [],
      normals = [],
      uv = [],
      indices = [],
      normal = new THREE.Vector3();
    for (const lower of [false, true])
      for (let j = 0; j <= radial; j++) {
        const q = ring[j];
        positions.push(q.x, lower ? bottom : q.y, q.z);
        if (lower)
          normal
            .set(
              (q.x - center.x) / radiusX ** 2,
              0,
              (q.z - center.z) / radiusZ ** 2,
            )
            .normalize();
        else normal.fromBufferAttribute(n, ids[j]);
        normals.push(normal.x, normal.y, normal.z);
        uv.push(
          sourceUV.getX(ids[j]) + (lower ? (bottom - q.y) / (radiusX * 2) : 0),
          sourceUV.getY(ids[j]),
        );
      }
    for (let j = 0; j < radial; j++) {
      const a = j,
        b = j + radial + 1;
      if (signedArea > 0) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const capCenter = positions.length / 3,
      capStart = capCenter + 1;
    positions.push(center.x, bottom, center.z);
    normals.push(0, -1, 0);
    uv.push(0.5, 0.5);
    for (const q of ring) {
      positions.push(q.x, bottom, q.z);
      normals.push(0, -1, 0);
      uv.push(
        0.5 + (q.x - center.x) / (radiusX * 2),
        0.5 + (q.z - center.z) / (radiusZ * 2),
      );
    }
    for (let j = 0; j < radial; j++) {
      if (signedArea > 0)
        indices.push(capCenter, capStart + j, capStart + j + 1);
      else indices.push(capCenter, capStart + j + 1, capStart + j);
    }
    const foot = new THREE.BufferGeometry();
    foot.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    foot.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    foot.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    foot.setIndex(indices);
    pieces.push(foot);
    const radius = radiusX + 0.1,
      halfRun = Math.max(0, radiusZ - radiusX),
      steps = Math.max(1, Math.ceil((halfRun * 2) / (radiusX * 0.25)));
    for (let j = 0; j <= steps; j++) {
      const z = center.z + THREE.MathUtils.lerp(-halfRun, halfRun, j / steps);
      colliders.push({
        type: "capsule",
        kind: "arch_foot",
        id: `${id}_foot_${j}`,
        a: new THREE.Vector3(center.x, center.y, z),
        b: new THREE.Vector3(center.x, bottom, z),
        radius,
      });
    }
    feet.push({
      id,
      top: center.toArray(),
      bottom,
      maximumOriginalGap: maximumGap,
      radiusX,
      radiusZ,
      radial,
      ring: ring.map((q) => q.toArray()),
    });
  }
  const geometry = pieces.length === 1 ? source : mergeGeometries(pieces);
  if (pieces.length > 1) pieces.forEach((g) => g.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, colliders, feet };
}
