import * as T from "three";

// 反向检查真实皮肤边切入晶体面内的情形，补足只射晶体边时可能漏掉的小凸起。
export function reverseCrystalIntersections(
  actorGeometry,
  crystalGeometry,
  epsilon = 1e-7,
) {
  const ap = actorGeometry.attributes.position,
    ai = actorGeometry.index,
    cp = crystalGeometry.attributes.position,
    ci = crystalGeometry.index,
    crystal = new T.Mesh(
      crystalGeometry,
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    ),
    box = new T.Box3().setFromBufferAttribute(cp),
    ray = new T.Raycaster(),
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3(),
    direction = new T.Vector3(),
    parent = Array.from({ length: cp.count }, (_, i) => i),
    find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i]))),
    unite = (i, j) => {
      parent[find(i)] = find(j);
    };
  const welded = new Map();
  for (let i = 0; i < cp.count; i++) {
    const key = [cp.getX(i), cp.getY(i), cp.getZ(i)].join(",");
    if (welded.has(key)) unite(i, welded.get(key));
    else welded.set(key, i);
  }
  for (let i = 0; i < ci.count; i += 3) {
    unite(ci.getX(i), ci.getX(i + 1));
    unite(ci.getX(i), ci.getX(i + 2));
  }
  const groups = new Map();
  for (let i = 0; i < cp.count; i++) {
    const id = find(i);
    if (!groups.has(id))
      groups.set(id, { vertices: [], faces: [], planes: [] });
    groups.get(id).vertices.push(i);
  }
  for (let i = 0; i < ci.count; i += 3)
    groups.get(find(ci.getX(i))).faces.push(i);
  for (const group of groups.values()) {
    const inside = new T.Vector3();
    for (const i of group.vertices) inside.add(a.fromBufferAttribute(cp, i));
    inside.divideScalar(group.vertices.length);
    for (const i of group.faces) {
      a.fromBufferAttribute(cp, ci.getX(i));
      b.fromBufferAttribute(cp, ci.getX(i + 1));
      c.fromBufferAttribute(cp, ci.getX(i + 2));
      const plane = new T.Plane().setFromCoplanarPoints(a, b, c);
      if (plane.distanceToPoint(inside) > 0) plane.negate();
      if (
        group.vertices.some(
          (j) => plane.distanceToPoint(a.fromBufferAttribute(cp, j)) > epsilon,
        )
      )
        throw Error("Crystal component is not convex");
      group.planes.push(plane);
    }
  }
  crystal.updateMatrixWorld(true);
  const tested = new Set(),
    penetratingVertices = [],
    edgeHits = [];
  for (let i = 0; i < ai.count; i += 3) {
    const ids = [ai.getX(i), ai.getX(i + 1), ai.getX(i + 2)];
    a.fromBufferAttribute(ap, ids[0]);
    b.fromBufferAttribute(ap, ids[1]);
    c.fromBufferAttribute(ap, ids[2]);
    if (
      Math.max(a.x, b.x, c.x) < box.min.x - epsilon ||
      Math.min(a.x, b.x, c.x) > box.max.x + epsilon ||
      Math.max(a.y, b.y, c.y) < box.min.y - epsilon ||
      Math.min(a.y, b.y, c.y) > box.max.y + epsilon ||
      Math.max(a.z, b.z, c.z) < box.min.z - epsilon ||
      Math.min(a.z, b.z, c.z) > box.max.z + epsilon
    )
      continue;
    for (const id of ids)
      if (!tested.has(id)) {
        tested.add(id);
        a.fromBufferAttribute(ap, id);
        if (
          box.containsPoint(a) &&
          [...groups.values()].some((group) =>
            group.planes.every((plane) => plane.distanceToPoint(a) < -epsilon),
          )
        )
          penetratingVertices.push({
            vertex: id,
            actorFace: i / 3,
            point: a.toArray(),
          });
      }
    for (let k = 0; k < 3; k++) {
      a.fromBufferAttribute(ap, ids[k]);
      b.fromBufferAttribute(ap, ids[(k + 1) % 3]);
      direction.copy(b).sub(a);
      const length = direction.length();
      if (length < epsilon * 2) continue;
      ray.set(a, direction.divideScalar(length));
      ray.near = epsilon;
      ray.far = length - epsilon;
      const hit = ray.intersectObject(crystal, false)[0];
      if (hit)
        edgeHits.push({
          actorFace: i / 3,
          edge: k,
          crystalFace: hit.faceIndex,
          point: hit.point.toArray(),
        });
    }
  }
  crystal.material.dispose();
  return {
    reverseEdgeCrossings: edgeHits.length,
    actorVerticesInside: penetratingVertices.length,
    crystalComponents: groups.size,
    hits: edgeHits.slice(0, 6),
    inside: penetratingVertices.slice(0, 6),
  };
}

export function actualWorldGeometry(mesh) {
  mesh.updateWorldMatrix(true, false);
  mesh.skeleton?.update();
  const source = mesh.geometry,
    positions = new Float64Array(source.attributes.position.count * 3),
    point = new T.Vector3();
  for (let i = 0; i < source.attributes.position.count; i++) {
    mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
    point.toArray(positions, i * 3);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  geometry.setIndex(source.index.clone());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function crystalSkinIntersections(actorGeometry, crystalGeometry) {
  const reverse = reverseCrystalIntersections(actorGeometry, crystalGeometry),
    actor = new T.Mesh(
      actorGeometry,
      new T.MeshBasicMaterial({ side: T.DoubleSide }),
    ),
    positions = crystalGeometry.attributes.position,
    index = crystalGeometry.index,
    ray = new T.Raycaster(),
    a = new T.Vector3(),
    b = new T.Vector3(),
    direction = new T.Vector3(),
    edges = new Set();
  actor.updateMatrixWorld(true);
  let forwardEdgeCrossings = 0;
  for (let i = 0; i < index.count; i += 3)
    for (let k = 0; k < 3; k++) {
      const p = index.getX(i + k),
        q = index.getX(i + ((k + 1) % 3)),
        key = p < q ? `${p}/${q}` : `${q}/${p}`;
      if (edges.has(key)) continue;
      edges.add(key);
      a.fromBufferAttribute(positions, p);
      b.fromBufferAttribute(positions, q);
      direction.copy(b).sub(a);
      const length = direction.length();
      ray.set(a, direction.divideScalar(length));
      ray.near = 1e-7;
      ray.far = length - 1e-7;
      if (ray.intersectObject(actor, false).length) forwardEdgeCrossings++;
    }
  // 三个完整凸晶体的中心也必须位于真实外部水体，防止整个晶簇被包在实体里却没有边交叉。
  const parity = [];
  for (let component = 0; component < 3; component++) {
    const center = new T.Vector3();
    for (let i = component * 13; i < (component + 1) * 13; i++)
      center.add(a.fromBufferAttribute(positions, i));
    center.divideScalar(13);
    const axes = [];
    for (const axis of [
      new T.Vector3(1, 0, 0),
      new T.Vector3(0, 1, 0),
      new T.Vector3(0, 0, 1),
    ]) {
      ray.set(center, axis);
      ray.near = 1e-7;
      ray.far = Infinity;
      let previous = -Infinity,
        count = 0;
      for (const hit of ray.intersectObject(actor, false))
        if (hit.distance - previous > 1e-5) {
          previous = hit.distance;
          count++;
        }
      axes.push(count % 2);
    }
    parity.push(axes);
  }
  actor.material.dispose();
  return { ...reverse, forwardEdgeCrossings, parity };
}
