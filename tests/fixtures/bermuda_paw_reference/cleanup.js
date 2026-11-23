import * as T from "three";
import cleanup from "./cleanup.json" with { type: "json" };

// 仅派生删除独立第五足样物及其八枚脱离爪甲；原HF、UV/PBR、四真足与下颌保持原样。
export function cloneCleanOriginal(asset) {
  const removed = new Set(cleanup.rawVertices),
    sourceVertexIds = [];
  for (let i = 0; i < asset.geometry.attributes.position.count; i++)
    if (!removed.has(i)) sourceVertexIds.push(i);
  const map = new Int32Array(asset.geometry.attributes.position.count).fill(-1);
  sourceVertexIds.forEach((old, i) => (map[old] = i));
  const geometry = new T.BufferGeometry();
  for (const [name, a] of Object.entries(asset.geometry.attributes)) {
    const values = new Float32Array(sourceVertexIds.length * a.itemSize);
    for (let i = 0; i < sourceVertexIds.length; i++)
      for (let k = 0; k < a.itemSize; k++)
        values[i * a.itemSize + k] = a.getComponent(sourceVertexIds[i], k);
    geometry.setAttribute(
      name,
      new T.Float32BufferAttribute(values, a.itemSize),
    );
  }
  function filteredIndex(index) {
    const rows = [],
      groups = new Map(),
      drop = new Set(),
      reversePairs = [];
    for (let j = 0; j < index.count; j += 3) {
      const ids = [0, 1, 2].map((k) => index.getX(j + k)),
        count = ids.filter((i) => removed.has(i)).length;
      if (count === 3) continue;
      if (count)
        throw Error(
          "Detached prop cleanup may not remove a partial source triangle",
        );
      const row = {
          sourceFace: j / 3,
          rawIds: ids,
          ids: ids.map((i) => map[i]),
        },
        key = ids
          .slice()
          .sort((a, b) => a - b)
          .join("/");
      rows.push(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    for (const group of groups.values())
      if (group.length > 1) {
        const first = group[0].rawIds,
          sign = (row) => {
            const a = row.rawIds.indexOf(first[0]);
            return row.rawIds[(a + 1) % 3] === first[1] ? 1 : -1;
          };
        if (!group.some((r) => sign(r) < 0)) continue;
        const p = asset.geometry.attributes.position,
          n = asset.geometry.attributes.normal,
          a = new T.Vector3().fromBufferAttribute(p, first[0]),
          b = new T.Vector3().fromBufferAttribute(p, first[1]),
          c = new T.Vector3().fromBufferAttribute(p, first[2]),
          normal = b.sub(a).cross(c.sub(a)),
          mean = new T.Vector3();
        for (const i of first)
          mean.add(new T.Vector3().fromBufferAttribute(n, i));
        const score = normal.dot(mean);
        if (Math.abs(score) < 1e-16)
          throw Error(
            "An exact reverse duplicate has ambiguous original normals",
          );
        const keepSign = score > 0 ? 1 : -1;
        const discarded = group.filter((r) => sign(r) !== keepSign);
        for (const row of discarded) drop.add(row.sourceFace);
        reversePairs.push({
          rawIds: first,
          keptFaces: group
            .filter((r) => sign(r) === keepSign)
            .map((r) => r.sourceFace),
          removedFaces: discarded.map((r) => r.sourceFace),
          originalNormalAlignment: Math.abs(score),
        });
      }
    return {
      index: rows.filter((r) => !drop.has(r.sourceFace)).flatMap((r) => r.ids),
      reversePairs,
      removed: drop.size,
    };
  }
  const nearResult = filteredIndex(asset.geometry.index),
    farResult = filteredIndex(asset.farGeometry.index);
  geometry.setIndex(nearResult.index);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const farGeometry = geometry.clone();
  farGeometry.setIndex(farResult.index);
  farGeometry.computeBoundingBox();
  farGeometry.computeBoundingSphere();
  return {
    geometry,
    farGeometry,
    sourceVertexIds,
    usedVertexIds: [...new Set(geometry.index.array)],
    metadata: {
      components: cleanup.components ?? cleanup.componentIds,
      removedRawVertices: removed.size,
      removedNearTriangles:
        (asset.geometry.index.count - geometry.index.count) / 3,
      removedFarTriangles:
        (asset.farGeometry.index.count - farGeometry.index.count) / 3,
      reverseDuplicateCleanup: {
        near: { removed: nearResult.removed, pairs: nearResult.reversePairs },
        far: { removed: farResult.removed, pairs: farResult.reversePairs },
      },
      remainingNearTriangles: geometry.index.count / 3,
      remainingFarTriangles: farGeometry.index.count / 3,
      scope:
        "Verified independent prop cluster and redundant exact reverse duplicates only; original source bytes and all retained surface positions/UVs unchanged",
    },
  };
}
