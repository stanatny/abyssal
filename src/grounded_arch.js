import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** 保留岩拱原曲线与端圈，只为悬空断口接出同宽石脚；底盖埋入最终海床。 */
export function groundedArchGeometry(arch, baseY, heightAt) {
  const radial = 7,
    tubular = 26,
    torus = new THREE.TorusGeometry(
      arch.radius,
      arch.tube,
      radial,
      tubular,
      Math.PI,
    ),
    source = torus.attributes.position,
    pieces = [torus],
    colliders = [],
    obstacles = [],
    feet = [],
    transform = new THREE.Matrix4().makeRotationY(arch.angle);
  transform.setPosition(arch.x, baseY, arch.z);
  const point = new THREE.Vector3();
  for (const side of [1, -1]) {
    const ring = [];
    let maximumGap = -Infinity,
      lowestGround = Infinity;
    for (let j = 0; j <= radial; j++) {
      const i = j * (tubular + 1) + (side === 1 ? 0 : tubular);
      const local = new THREE.Vector3().fromBufferAttribute(source, i);
      point.copy(local).applyMatrix4(transform);
      const ground = heightAt(point.x, point.z);
      maximumGap = Math.max(maximumGap, point.y - ground);
      lowestGround = Math.min(lowestGround, ground);
      ring.push(local);
    }
    if (maximumGap <= 0.06) continue;
    // 采样支撑盘内部，平底盖置于最低处；地面自然裁去其余埋入部分。
    for (let x = -arch.tube; x <= arch.tube; x += 0.4)
      for (let z = -arch.tube; z <= arch.tube; z += 0.4) {
        if (x * x + z * z > arch.tube * arch.tube) continue;
        point.set(side * arch.radius + x, 0, z).applyMatrix4(transform);
        lowestGround = Math.min(lowestGround, heightAt(point.x, point.z));
      }
    const bottom = lowestGround - (0.2 + arch.tube * 0.12),
      localBottom = bottom - baseY,
      positions = [],
      normals = [],
      uv = [],
      indices = [];
    for (const lower of [false, true])
      for (let j = 0; j <= radial; j++) {
        const p = ring[j],
          angle = (j / radial) * Math.PI * 2;
        positions.push(p.x, lower ? localBottom : p.y, p.z);
        normals.push(side * Math.cos(angle), 0, Math.sin(angle));
        uv.push(j / radial, lower ? localBottom / (arch.tube * 2) : 0);
      }
    for (let j = 0; j < radial; j++) {
      const a = j,
        b = j + radial + 1;
      if (side === 1) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    // 底盖使用独立顶点法线，避免其方向把石脚侧壁磨成水平亮边。
    const center = positions.length / 3;
    positions.push(side * arch.radius, localBottom, 0);
    normals.push(0, -1, 0);
    uv.push(0.5, 0.5);
    const bottomStart = positions.length / 3;
    for (const p of ring) {
      positions.push(p.x, localBottom, p.z);
      normals.push(0, -1, 0);
      uv.push(
        ((p.x - side * arch.radius) / arch.tube) * 0.5 + 0.5,
        (p.z / arch.tube) * 0.5 + 0.5,
      );
    }
    for (let j = 0; j < radial; j++) {
      if (side === 1)
        indices.push(center, bottomStart + j, bottomStart + j + 1);
      else indices.push(center, bottomStart + j + 1, bottomStart + j);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    pieces.push(geometry);
    const top = new THREE.Vector3(side * arch.radius, 0, 0).applyMatrix4(
        transform,
      ),
      radius = arch.tube * 1.015;
    colliders.push({
      type: "capsule",
      kind: "arch_foot",
      a: { x: top.x, y: baseY, z: top.z },
      b: { x: top.x, y: bottom, z: top.z },
      radius,
    });
    const count = Math.max(1, Math.ceil((baseY - bottom) / (radius * 1.2)));
    for (let j = 0; j <= count; j++)
      obstacles.push({
        kind: "arch_foot",
        x: top.x,
        y: THREE.MathUtils.lerp(baseY, bottom, j / count),
        z: top.z,
        radius,
      });
    feet.push({
      side,
      top: top.toArray(),
      bottom,
      maximumOriginalGap: maximumGap,
      radial,
      ring: ring.map((p) => p.toArray()),
    });
  }
  const geometry = pieces.length === 1 ? torus : mergeGeometries(pieces);
  if (pieces.length > 1) pieces.forEach((g) => g.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, colliders, obstacles, feet };
}
