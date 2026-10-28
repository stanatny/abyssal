/** 腹侧连续皮肤跨越多个足根，以表面邻接传播权重，避免空间切片拉开皮肤。 */
export function relaxScyllaFootRoots(geometry, ownership) {
  if (geometry.userData.scyllaFootRoots) return;
  const p = geometry.attributes.position,
    skin = geometry.attributes.skinIndex,
    weights = geometry.attributes.skinWeight,
    ix = geometry.index.array,
    weld = new Map(),
    representatives = new Uint32Array(p.count),
    adjacent = new Map(),
    movable = [];
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i)},${p.getY(i)},${p.getZ(i)}`;
    if (!weld.has(key)) {
      weld.set(key, i);
      const x = Math.abs(p.getX(i)),
        y = p.getY(i),
        z = p.getZ(i);
      if (!ownership[i] && x > 0.065 && x < 0.16 && y < -0.1 && z < 0.29)
        movable.push(i);
    }
    representatives[i] = weld.get(key);
  }
  const active = new Set(movable);
  for (let j = 0; j < ix.length; j += 3)
    for (let k = 0; k < 3; k++) {
      const a = representatives[ix[j + k]],
        b = representatives[ix[j + ((k + 1) % 3)]];
      if (active.has(a)) {
        if (!adjacent.has(a)) adjacent.set(a, new Set());
        adjacent.get(a).add(b);
      }
      if (active.has(b)) {
        if (!adjacent.has(b)) adjacent.set(b, new Set());
        adjacent.get(b).add(a);
      }
    }
  const needed = new Set(movable);
  for (const n of adjacent.values()) for (const i of n) needed.add(i);
  let values = new Map();
  for (const i of needed) {
    const v = new Float32Array(59);
    for (let j = 0; j < 4; j++)
      v[skin.array[i * 4 + j]] += weights.array[i * 4 + j];
    values.set(i, v);
  }
  // 固定外侧鳍足与内侧躯干，足根中间带解有界调和权重；仅首次构造执行。
  for (let pass = 0; pass < 120; pass++) {
    const next = new Map(values);
    for (const i of movable) {
      const neighbors = adjacent.get(i);
      if (!neighbors?.size) continue;
      const v = new Float32Array(59);
      let sum = 0;
      for (const n of neighbors) {
        const source = values.get(n),
          w =
            1 /
            Math.max(
              1e-8,
              (p.getX(i) - p.getX(n)) ** 2 +
                (p.getY(i) - p.getY(n)) ** 2 +
                (p.getZ(i) - p.getZ(n)) ** 2,
            );
        sum += w;
        for (let b = 0; b < 59; b++) v[b] += source[b] * w;
      }
      for (let b = 0; b < 59; b++) v[b] /= sum;
      next.set(i, v);
    }
    values = next;
  }
  const fitted = new Map();
  for (const i of movable) {
    const terms = [...values.get(i)]
        .map((w, id) => [id, w])
        .filter((t) => t[1] > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      sum = terms.reduce((s, t) => s + t[1], 0);
    fitted.set(
      i,
      terms.map(([id, w]) => [id, w / sum]),
    );
  }
  for (let i = 0; i < p.count; i++) {
    const terms = fitted.get(representatives[i]);
    if (!terms) continue;
    for (let j = 0; j < 4; j++) {
      skin.array[i * 4 + j] = terms[j]?.[0] || 0;
      weights.array[i * 4 + j] = terms[j]?.[1] || 0;
    }
  }
  geometry.userData.scyllaFootRoots = true;
}
