import * as T from "three";
import cleanup from "./assets/models/bermuda_titan_whole_cleanup.json" with { type: "json" };
import binding from "./assets/models/bermuda_titan_whole_binding.json" with { type: "json" };
import { acquireBermudaSleepingTitanAsset } from "./bermuda_sleeping_titan_asset.js";

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

export const TITAN_WHOLE_WRIST_PIVOT = Object.freeze([
  -0.14362746477127075, -0.11010973155498505, -0.25123584270477295,
]);
export const TITAN_WHOLE_WRIST_PITCH = 0.36;
export const TITAN_WHOLE_MAX_MOTION = 0.06;
let cached;

/** 原整身的派生蒙皮只释放一只真实腕；原始HF/PBR租约与文件始终不变。 */
export function acquireBermudaTitanWholeAsset() {
  if (!cached) {
    const original = acquireBermudaSleepingTitanAsset(),
      cleaned = cloneCleanOriginal(original),
      { geometry, farGeometry, sourceVertexIds } = cleaned,
      weights = new Float32Array(sourceVertexIds.length),
      indices = new Uint16Array(sourceVertexIds.length * 4),
      skinWeights = new Float32Array(sourceVertexIds.length * 4),
      awake = new Float32Array(sourceVertexIds.length),
      mouth = new Float32Array(sourceVertexIds.length),
      p = geometry.attributes.position,
      sourceToCompact = new Map(sourceVertexIds.map((old, i) => [old, i])),
      lips = [6509, 4859, 4794].map((i) =>
        new T.Vector3().fromBufferAttribute(p, sourceToCompact.get(i)),
      ),
      lengths = lips.map((_, i) =>
        lips[(i + 1) % 3].distanceTo(lips[(i + 2) % 3]),
      ),
      sum = lengths.reduce((s, v) => s + v, 0),
      mouthLocal = new T.Vector3(),
      lipPlaneNormal = new T.Vector3()
        .subVectors(lips[1], lips[0])
        .cross(new T.Vector3().subVectors(lips[2], lips[0]))
        .normalize(),
      // 从同一真实口锚穿过原上牙下方气道；精确HF/tetra裁剪给出.05m边缘余量，不外推口点。
      mouthDirection = new T.Vector3(
        -0.0008506927118042891,
        -0.6480956253191339,
        -0.7615584920175934,
      );
    if (lipPlaneNormal.z > 0) lipPlaneNormal.negate();
    for (let i = 0; i < 3; i++)
      mouthLocal.addScaledVector(lips[i], lengths[i] / sum);
    const apertureRadius = new T.Triangle(...lips).getArea() / (sum / 2),
      point = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      const w = binding.weights[sourceVertexIds[i]];
      weights[i] = w;
      indices[i * 4 + 1] = 1;
      skinWeights[i * 4] = 1 - w;
      skinWeights[i * 4 + 1] = w;
      point.fromBufferAttribute(p, i);
      awake[i] =
        T.MathUtils.smoothstep(point.y, 0.005, 0.055) *
        (1 - T.MathUtils.smoothstep(Math.abs(point.x), 0.035, 0.075)) *
        T.MathUtils.smoothstep(point.z, -0.38, -0.25) *
        (1 - T.MathUtils.smoothstep(point.z, 0.18, 0.42));
      mouth[i] =
        1 - T.MathUtils.smoothstep(point.distanceTo(mouthLocal), 0.015, 0.045);
    }
    geometry.setAttribute("skinIndex", new T.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute(
      "skinWeight",
      new T.Float32BufferAttribute(skinWeights, 4),
    );
    geometry.setAttribute(
      "titanAwakeMask",
      new T.Float32BufferAttribute(awake, 1),
    );
    geometry.setAttribute(
      "titanMouthMask",
      new T.Float32BufferAttribute(mouth, 1),
    );
    for (const [name, attribute] of Object.entries(geometry.attributes))
      farGeometry.setAttribute(name, attribute);
    cached = {
      ...cleaned,
      original,
      weights,
      mouthLocal,
      mouthDirection,
      lipPlaneNormal,
      apertureRadius,
      sourceToCompact,
      references: 0,
    };
  }
  const asset = cached;
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    farGeometry: asset.farGeometry,
    material: asset.original.material,
    farMaterial: asset.original.farMaterial,
    weights: asset.weights,
    sourceVertexIds: asset.sourceVertexIds,
    usedVertexIds: asset.usedVertexIds,
    sourceToCompact: asset.sourceToCompact,
    metadata: asset.metadata,
    mouthLocal: asset.mouthLocal,
    mouthDirection: asset.mouthDirection,
    lipPlaneNormal: asset.lipPlaneNormal,
    apertureRadius: asset.apertureRadius,
    prepare: asset.original.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.geometry.dispose();
      asset.farGeometry.dispose();
      asset.original.release();
      if (cached === asset) cached = undefined;
    },
  };
}
