import * as THREE from "three";
/** 提取闭合外壳用于近裁剪填充；内腔与开放鳍片不改变原模型及碰撞。 */
export function closedCreatureExterior(source) {
  const p = source.attributes.position,
    index =
      source.index ??
      new THREE.BufferAttribute(
        Uint32Array.from(
          { length: source.attributes.position?.count ?? 0 },
          (_, i) => i,
        ),
        1,
      );
  if (!p || !index) return null;
  const parent = Array.from({ length: p.count }, (_, i) => i);
  function find(x) {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== x) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  }
  const join = (a, b) => (parent[find(a)] = find(b));
  const welded = new Map(),
    vertex = new Uint32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) * 1e5)},${Math.round(p.getY(i) * 1e5)},${Math.round(p.getZ(i) * 1e5)}`;
    if (!welded.has(key)) welded.set(key, i);
    vertex[i] = welded.get(key);
    join(i, vertex[i]);
  }
  for (let i = 0; i < index.count; i += 3) {
    join(index.getX(i), index.getX(i + 1));
    join(index.getX(i), index.getX(i + 2));
  }
  const components = new Map(),
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    cross = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)],
      id = find(ids[0]);
    if (!components.has(id))
      components.set(id, {
        volume: 0,
        indices: [],
        triangles: [],
        edges: new Map(),
      });
    const component = components.get(id);
    if (new Set(ids.map((x) => vertex[x])).size < 3) continue;
    a.fromBufferAttribute(p, ids[0]);
    b.fromBufferAttribute(p, ids[1]);
    c.fromBufferAttribute(p, ids[2]);
    component.volume += a.dot(cross.crossVectors(b, c)) / 6;
    component.indices.push(...ids);
    component.triangles.push(i / 3);
    for (let j = 0; j < 3; j++) {
      const u = vertex[ids[j]],
        v = vertex[ids[(j + 1) % 3]];
      if (u === v) continue;
      const edge = u < v ? `${u},${v}` : `${v},${u}`;
      component.edges.set(
        edge,
        (component.edges.get(edge) || 0) + (u < v ? 1 : -1),
      );
    }
  }
  const indices = [],
    triangles = [];
  for (const component of components.values()) {
    if (
      component.volume > 1e-7 &&
      component.indices.length >= 96 &&
      [...component.edges.values()].every((balance) => balance === 0)
    ) {
      indices.push(...component.indices);
      triangles.push(...component.triangles);
    }
  }
  if (!indices.length) return null;
  const geometry = new THREE.BufferGeometry();
  // 独立属性句柄共享只读CPU数组；释放辅助GPU缓冲不会删除原皮肤缓冲。
  const borrow = (attribute) =>
    new THREE.BufferAttribute(
      attribute.array,
      attribute.itemSize,
      attribute.normalized,
    );
  for (const name of ["position", "normal", "skinIndex", "skinWeight"])
    if (source.attributes[name])
      geometry.setAttribute(name, borrow(source.attributes[name]));
  for (const name of ["position", "normal"])
    if (source.morphAttributes[name])
      geometry.morphAttributes[name] = source.morphAttributes[name].map(borrow);
  geometry.morphTargetsRelative = source.morphTargetsRelative;
  geometry.setIndex(indices);
  geometry.userData.triangles = triangles.sort((a, b) => a - b);
  return geometry;
}
