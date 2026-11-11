import { Matrix4 } from "three";

const EPSILON = 1e-8;
const MAX_BUCKET_REFERENCES = 64;

/**
 * 为标记的静态最低地面建立一次性世界坐标索引；屋顶、道具和未标记表面不参与。
 * 只复制 CPU 数据，不改变场景矩阵、几何、材质或 GPU 资源。
 * @param {object} root 已建成的区域根节点；构造后地面不能再移动或改网格。
 * @param {object} options fallback 为索引之外的原始海床采样，默认零高度。
 * @returns {Function} 精确三角面 heightAt，附带 supportHeight、stats 和幂等 dispose。
 */
export function createTerrainSurface(root, { fallback = () => 0 } = {}) {
  if (typeof fallback !== "function")
    throw new TypeError("Terrain surface fallback must be a function");
  const started = performance.now(),
    surfaces = [],
    stats = {
      meshes: 0,
      triangles: 0,
      indexedTriangles: 0,
      buckets: 0,
      levels: 0,
      triangleReferences: 0,
      typedArrayBytes: 0,
      retainedTypedArrayBytes: 0,
      buildTimeMs: 0,
      queries: 0,
      lastCandidateCount: 0,
      maxCandidateCount: 0,
      disposed: false,
    };
  root.traverse((mesh) => {
    if (!mesh.isMesh || mesh.userData.terrainContact !== true) return;
    const surface = indexSurface(mesh);
    if (!surface) return;
    surfaces.push(surface);
    stats.meshes++;
    stats.triangles += surface.triangles;
    stats.indexedTriangles += surface.validTriangles;
    stats.typedArrayBytes += surface.bytes;
    for (const level of surface.levels.values()) {
      stats.levels++;
      stats.buckets += level.cells.size;
      for (const bucket of level.cells.values())
        stats.triangleReferences += bucket.length;
    }
  });
  stats.typedArrayBytes +=
    stats.triangleReferences * Uint32Array.BYTES_PER_ELEMENT;
  stats.retainedTypedArrayBytes = stats.typedArrayBytes;
  stats.buildTimeMs = performance.now() - started;

  function query(x, z, radius) {
    if (![x, z, radius].every(Number.isFinite) || radius < 0)
      throw new RangeError(
        "Terrain queries require finite coordinates and a nonnegative radius",
      );
    let height = -Infinity,
      candidates = 0;
    for (const surface of surfaces) {
      if (
        x + radius < surface.minX - EPSILON ||
        x - radius > surface.maxX + EPSILON ||
        z + radius < surface.minZ - EPSILON ||
        z - radius > surface.maxZ + EPSILON
      )
        continue;
      surface.epoch = (surface.epoch + 1) >>> 0;
      if (!surface.epoch) {
        surface.stamps.fill(0);
        surface.epoch = 1;
      }
      for (const level of surface.levels.values()) {
        const minX = cell(
            Math.max(surface.minX, x - radius) - EPSILON,
            surface.minX,
            level.size,
          ),
          maxX = cell(
            Math.min(surface.maxX, x + radius) + EPSILON,
            surface.minX,
            level.size,
          ),
          minZ = cell(
            Math.max(surface.minZ, z - radius) - EPSILON,
            surface.minZ,
            level.size,
          ),
          maxZ = cell(
            Math.min(surface.maxZ, z + radius) + EPSILON,
            surface.minZ,
            level.size,
          );
        for (let ix = minX; ix <= maxX; ix++)
          for (let iz = minZ; iz <= maxZ; iz++) {
            const bucket = level.cells.get(`${ix},${iz}`);
            if (!bucket) continue;
            for (const id of bucket) {
              if (surface.stamps[id] === surface.epoch) continue;
              surface.stamps[id] = surface.epoch;
              candidates++;
              height = Math.max(
                height,
                triangleHeight(surface, id, x, z, radius),
              );
            }
          }
      }
    }
    stats.queries++;
    stats.lastCandidateCount = candidates;
    stats.maxCandidateCount = Math.max(stats.maxCandidateCount, candidates);
    // 已有真实相交面时不掺入孔洞中的解析采样，避免把低通路补成高地。
    if (height !== -Infinity) return height;
    const baseline = fallback(x, z);
    if (!Number.isFinite(baseline))
      throw new Error("Terrain surface fallback must return a finite height");
    return baseline + radius;
  }
  const heightAt = (x, z) => query(x, z, 0);
  heightAt.supportHeight = (x, z, radius) => query(x, z, radius);
  heightAt.stats = stats;
  heightAt.dispose = () => {
    if (stats.disposed) return;
    stats.disposed = true;
    for (const surface of surfaces) {
      for (const level of surface.levels.values()) level.cells.clear();
      surface.levels.clear();
    }
    surfaces.length = 0;
    stats.retainedTypedArrayBytes = 0;
  };
  return heightAt;
}

function cell(value, origin, size) {
  return Math.floor((value - origin) / size);
}

// 等价于更新后的 matrixWorld，但不改调用方的局部矩阵、脏标记或世界矩阵。
function worldMatrix(mesh) {
  const chain = [];
  for (let node = mesh; node; node = node.parent) chain.push(node);
  const world = new Matrix4(),
    local = new Matrix4();
  for (const node of chain.reverse()) {
    if (node.matrixWorldAutoUpdate === false) {
      world.copy(node.matrixWorld);
      continue;
    }
    if (node.matrixAutoUpdate)
      local.compose(node.position, node.quaternion, node.scale);
    else local.copy(node.matrix);
    world.multiply(local);
  }
  return world;
}

function indexSurface(mesh) {
  const source = mesh.geometry.attributes.position;
  if (!source || source.itemSize < 3) return null;
  const matrix = worldMatrix(mesh).elements,
    positions = new Float64Array(source.count * 3),
    sourceIndex = mesh.geometry.index,
    indexCount = sourceIndex?.count ?? source.count;
  if (indexCount % 3)
    throw new Error("Terrain geometry must contain complete triangles");
  const indices = new Uint32Array(indexCount),
    triangles = indexCount / 3,
    planes = new Float64Array(triangles * 3),
    valid = [],
    sizes = [];
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < source.count; i++) {
    const x = source.getX(i),
      y = source.getY(i),
      z = source.getZ(i),
      wx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      wy = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      wz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    if (![wx, wy, wz].every(Number.isFinite))
      throw new Error("Terrain geometry contains nonfinite positions");
    positions.set([wx, wy, wz], i * 3);
    minX = Math.min(minX, wx);
    maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz);
    maxZ = Math.max(maxZ, wz);
  }
  for (let i = 0; i < indexCount; i++) {
    const index = sourceIndex ? sourceIndex.getX(i) : i;
    if (!Number.isInteger(index) || index < 0 || index >= source.count)
      throw new Error("Terrain geometry contains invalid triangle indices");
    indices[i] = index;
  }
  const stride = Math.max(1, Math.ceil(triangles / 2048));
  for (let id = 0; id < triangles; id++) {
    const a = indices[id * 3] * 3,
      b = indices[id * 3 + 1] * 3,
      c = indices[id * 3 + 2] * 3,
      dx1 = positions[b] - positions[a],
      dz1 = positions[b + 2] - positions[a + 2],
      dx2 = positions[c] - positions[a],
      dz2 = positions[c + 2] - positions[a + 2],
      denominator = dx1 * dz2 - dz1 * dx2;
    if (Math.abs(denominator) < 1e-14) continue;
    const dy1 = positions[b + 1] - positions[a + 1],
      dy2 = positions[c + 1] - positions[a + 1],
      gx = (dy1 * dz2 - dy2 * dz1) / denominator,
      gz = (dx1 * dy2 - dx2 * dy1) / denominator;
    planes[id * 3] = gx;
    planes[id * 3 + 1] = gz;
    planes[id * 3 + 2] =
      positions[a + 1] - gx * positions[a] - gz * positions[a + 2];
    valid.push(id);
    if (id % stride === 0) sizes.push(Math.sqrt(Math.abs(denominator)));
  }
  if (!valid.length) return null;
  sizes.sort((a, b) => a - b);
  const baseSize = Math.max(
      0.5,
      (sizes[Math.floor(sizes.length / 2)] || 4) * 2,
    ),
    levels = new Map();
  for (const id of valid) {
    const a = indices[id * 3] * 3,
      b = indices[id * 3 + 1] * 3,
      c = indices[id * 3 + 2] * 3,
      x0 = Math.min(positions[a], positions[b], positions[c]),
      x1 = Math.max(positions[a], positions[b], positions[c]),
      z0 = Math.min(positions[a + 2], positions[b + 2], positions[c + 2]),
      z1 = Math.max(positions[a + 2], positions[b + 2], positions[c + 2]);
    let size = baseSize,
      levelId = 0,
      range;
    do {
      range = [
        cell(x0 - EPSILON, minX, size),
        cell(x1 + EPSILON, minX, size),
        cell(z0 - EPSILON, minZ, size),
        cell(z1 + EPSILON, minZ, size),
      ];
      if (
        (range[1] - range[0] + 1) * (range[3] - range[2] + 1) <=
        MAX_BUCKET_REFERENCES
      )
        break;
      size *= 2;
      levelId++;
    } while (true);
    if (!levels.has(levelId)) levels.set(levelId, { size, cells: new Map() });
    const cells = levels.get(levelId).cells;
    for (let x = range[0]; x <= range[1]; x++)
      for (let z = range[2]; z <= range[3]; z++) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(id);
      }
  }
  for (const level of levels.values())
    for (const [key, bucket] of level.cells)
      level.cells.set(key, Uint32Array.from(bucket));
  const stamps = new Uint32Array(triangles);
  return {
    positions,
    indices,
    planes,
    stamps,
    levels,
    epoch: 0,
    triangles,
    validTriangles: valid.length,
    minX,
    maxX,
    minZ,
    maxZ,
    bytes:
      positions.byteLength +
      indices.byteLength +
      planes.byteLength +
      stamps.byteLength,
  };
}

function inside(x, z, ax, az, bx, bz, cx, cz) {
  const ab = (bx - ax) * (z - az) - (bz - az) * (x - ax),
    bc = (cx - bx) * (z - bz) - (cz - bz) * (x - bx),
    ca = (ax - cx) * (z - cz) - (az - cz) * (x - cx),
    tolerance =
      EPSILON *
      Math.max(1, Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)));
  return (
    (ab >= -tolerance && bc >= -tolerance && ca >= -tolerance) ||
    (ab <= tolerance && bc <= tolerance && ca <= tolerance)
  );
}

function triangleHeight(surface, id, x, z, radius) {
  const { positions: p, indices, planes } = surface,
    a = indices[id * 3] * 3,
    b = indices[id * 3 + 1] * 3,
    c = indices[id * 3 + 2] * 3,
    ax = p[a],
    ay = p[a + 1],
    az = p[a + 2],
    bx = p[b],
    by = p[b + 1],
    bz = p[b + 2],
    cx = p[c],
    cy = p[c + 1],
    cz = p[c + 2],
    gx = planes[id * 3],
    gz = planes[id * 3 + 1],
    constant = planes[id * 3 + 2];
  if (!radius)
    return inside(x, z, ax, az, bx, bz, cx, cz)
      ? gx * x + gz * z + constant
      : -Infinity;
  if (
    x + radius < Math.min(ax, bx, cx) - EPSILON ||
    x - radius > Math.max(ax, bx, cx) + EPSILON ||
    z + radius < Math.min(az, bz, cz) - EPSILON ||
    z - radius > Math.max(az, bz, cz) + EPSILON
  )
    return -Infinity;
  const normal = Math.hypot(1, gx, gz),
    qx = x + (radius * gx) / normal,
    qz = z + (radius * gz) / normal;
  if (inside(qx, qz, ax, az, bx, bz, cx, cz))
    return gx * x + gz * z + constant + radius * normal;
  return Math.max(
    edgeSupport(ax, ay, az, bx, by, bz, x, z, radius),
    edgeSupport(bx, by, bz, cx, cy, cz, x, z, radius),
    edgeSupport(cx, cy, cz, ax, ay, az, x, z, radius),
  );
}

function edgeSupport(ax, ay, az, bx, by, bz, x, z, radius) {
  const dx = bx - ax,
    dz = bz - az,
    length = Math.hypot(dx, dz),
    ux = dx / length,
    uz = dz / length,
    t0 = (x - ax) * ux + (z - az) * uz,
    perpendicular = (x - ax) * uz - (z - az) * ux,
    remaining = radius * radius - perpendicular * perpendicular;
  if (remaining < -EPSILON) return -Infinity;
  const reach = Math.sqrt(Math.max(0, remaining)),
    min = Math.max(0, t0 - reach),
    max = Math.min(length, t0 + reach);
  if (min > max + EPSILON) return -Infinity;
  const slope = (by - ay) / length,
    t = Math.max(
      min,
      Math.min(max, t0 + (slope * reach) / Math.hypot(1, slope)),
    );
  return ay + slope * t + Math.sqrt(Math.max(0, remaining - (t - t0) ** 2));
}
