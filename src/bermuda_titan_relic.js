import * as THREE from "three";

/** 护在前爪间的琥珀晶核，独立于HF躯体，取走后不留下烘焙宝物。 */
export function createBermudaTitanRelic() {
  const root = new THREE.Group();
  root.name = "bermuda_amber_heart";
  const material = new THREE.MeshStandardMaterial({
      color: 0xe8a94d,
      emissive: 0xa35318,
      emissiveIntensity: 0.7,
      roughness: 0.24,
      metalness: 0.22,
      flatShading: true,
    }),
    geometry = new THREE.BufferGeometry(),
    positions = [],
    indices = [],
    sides = 6,
    clusters = [];
  // 有实体棱面的晶簇，不使用透明叠层或额外折射渲染。
  for (const [cx, cy, cz, radius, height, tilt] of [
    [0, 0, 0, 1.25, 3.5, 0.08],
    [-1.25, -0.65, 0.2, 0.72, 2.6, -0.32],
    [1.05, -0.7, -0.22, 0.64, 2.2, 0.4],
  ]) {
    const offset = positions.length / 3,
      firstIndex = indices.length,
      point = new THREE.Vector3();
    for (const y of [-height * 0.4, height * 0.25])
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        point
          .set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
          .applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt)
          .add(new THREE.Vector3(cx, cy, cz));
        positions.push(...point);
      }
    point
      .set(0, height * 0.6, 0)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt)
      .add(new THREE.Vector3(cx, cy, cz));
    positions.push(...point);
    for (let i = 0; i < sides; i++) {
      const a = offset + i,
        b = offset + ((i + 1) % sides),
        c = a + sides,
        d = b + sides;
      indices.push(a, b, c, b, d, c, c, d, offset + sides * 2);
      if (i > 0 && i < sides - 1) indices.push(offset, b, a);
    }
    clusters.push({
      tip: offset + sides * 2,
      firstIndex,
      endIndex: indices.length,
    });
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  root.add(mesh);
  const vertices = Array.from(
      { length: positions.length / 3 },
      () => new THREE.Vector3(),
    ),
    triangle = new THREE.Triangle(),
    nearest = new THREE.Vector3();
  let disposed = false;
  return {
    root,
    getPickupSurfacePoints(intakePoint, target = []) {
      if (disposed) {
        target.length = 0;
        return target;
      }
      mesh.updateWorldMatrix(true, false);
      for (let i = 0; i < vertices.length; i++)
        mesh.getVertexPosition(i, vertices[i]).applyMatrix4(mesh.matrixWorld);
      target.length = clusters.length * 2;
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        (target[i * 2] ??= new THREE.Vector3()).copy(vertices[cluster.tip]);
        const closest = (target[i * 2 + 1] ??= new THREE.Vector3());
        let distance = Infinity;
        for (let j = cluster.firstIndex; j < cluster.endIndex; j += 3) {
          triangle.set(
            vertices[indices[j]],
            vertices[indices[j + 1]],
            vertices[indices[j + 2]],
          );
          triangle.closestPointToPoint(intakePoint, nearest);
          const d = nearest.distanceToSquared(intakePoint);
          if (d < distance) {
            distance = d;
            closest.copy(nearest);
          }
        }
      }
      return target;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      geometry.dispose();
      material.dispose();
    },
  };
}
