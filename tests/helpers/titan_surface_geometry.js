import * as T from "three";

// 直接读取当前可见蒙皮顶点；索引只缩小独立三角SAT的候选，不借用生产碰撞代理。
export function actualSkinIndex(mesh, size = 4) {
  mesh.updateWorldMatrix(true, false);
  mesh.skeleton?.update();
  const g = mesh.geometry,
    p = g.attributes.position,
    idx = g.index,
    vertices = Array.from({ length: p.count }, (_, i) =>
      mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld),
    ),
    cells = new Map();
  const each = (box, fn) => {
    for (
      let x = Math.floor(box.min.x / size);
      x <= Math.floor(box.max.x / size);
      x++
    )
      for (
        let y = Math.floor(box.min.y / size);
        y <= Math.floor(box.max.y / size);
        y++
      )
        for (
          let z = Math.floor(box.min.z / size);
          z <= Math.floor(box.max.z / size);
          z++
        )
          fn(`${x}:${y}:${z}`);
  };
  for (let i = 0; i < (idx?.count ?? p.count); i += 3) {
    const points = [0, 1, 2].map(
        (k) => vertices[idx ? idx.getX(i + k) : i + k],
      ),
      box = new T.Box3().setFromPoints(points),
      face = { points, box, index: i / 3 };
    each(box, (key) => {
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(face);
    });
  }
  return (box) => {
    const candidates = new Set();
    each(box, (key) => {
      for (const face of cells.get(key) || [])
        if (box.intersectsBox(face.box)) candidates.add(face);
    });
    return candidates;
  };
}

function triangleContact(a, b) {
  const edges = (p) => p.map((v, i) => p[(i + 1) % 3].clone().sub(v)),
    ea = edges(a),
    eb = edges(b),
    na = ea[0].clone().cross(ea[1]),
    nb = eb[0].clone().cross(eb[1]);
  if (na.lengthSq() < 1e-20 || nb.lengthSq() < 1e-20) return false;
  const axes = [na, nb];
  for (const x of ea) for (const y of eb) axes.push(x.clone().cross(y));
  // 共面三角需要面内分离轴，不能把包围盒相交直接当作穿皮。
  for (const e of ea) axes.push(na.clone().cross(e));
  for (const e of eb) axes.push(nb.clone().cross(e));
  for (const axis of axes) {
    const length = axis.length();
    if (length < 1e-12) continue;
    const av = a.map((p) => p.dot(axis)),
      bv = b.map((p) => p.dot(axis)),
      epsilon = length * 1e-7;
    if (
      Math.max(...av) < Math.min(...bv) - epsilon ||
      Math.max(...bv) < Math.min(...av) - epsilon
    )
      return false;
  }
  return true;
}

export function actualAvatarSkinContacts(avatar, query, heightAt = null) {
  avatar.updateMatrixWorld(true);
  avatar.traverse((n) => n.skeleton?.update());
  let triangles = 0,
    crossings = 0,
    floorMargin = Infinity;
  const hits = [];
  avatar.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (let n = mesh; n; n = n.parent) if (!n.visible) return;
    const g = mesh.geometry,
      p = g.attributes.position,
      idx = g.index,
      vertices = Array.from({ length: p.count }, (_, i) =>
        mesh
          .getVertexPosition(i, new T.Vector3())
          .applyMatrix4(mesh.matrixWorld),
      );
    if (heightAt)
      for (const v of vertices)
        floorMargin = Math.min(floorMargin, v.y - heightAt(v.x, v.z));
    for (let i = 0; i < (idx?.count ?? p.count); i += 3) {
      triangles++;
      const points = [0, 1, 2].map(
          (k) => vertices[idx ? idx.getX(i + k) : i + k],
        ),
        box = new T.Box3().setFromPoints(points);
      for (const other of query(box))
        if (triangleContact(points, other.points)) {
          crossings++;
          if (hits.length < 4)
            hits.push({ mesh: mesh.name, face: i / 3, titanFace: other.index });
        }
    }
  });
  return { triangles, crossings, floorMargin, hits };
}
