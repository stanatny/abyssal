import { bodyOffsets } from "./collision.js";
import { titanBreathContact } from "./bermuda_titan_rules.js";
import * as THREE from "three";

export const BERMUDA_TITAN_HAZARDS = Object.freeze({
  lavaRadius: 1.6,
  lavaImpactRadius: 6.5,
  lavaImpactHeight: 4,
  lavaDamage: 40,
  rockDamage: 30,
  hitInterval: 1,
  maxPaths: 3,
  maxRocks: 6,
  rockWarningSleeping: 2.8,
  rockWarningAwake: 2.3,
  rockImpactDuration: 0.3,
  terminalDuration: 1.2,
  sheetRows: 15,
  sheetColumns: 11,
  sheetWidthSleeping: 48,
  sheetWidthAwake: 64,
  sheetMinimumWidth: 18,
  sheetRoomWidth: 180,
  maxRoomFitSites: 16,
  sheetExpansionFactors: Object.freeze([1.5, 1.25, 1.1]),
  maxSheetFitAttempts: 48,
  sheetThickness: 4,
  sheetGroundClearance: 0.12,
  roomSheetGroundClearance: 0.5,
  lavaTravel: 1,
  lavaTail: 1,
  poolCooling: 3.5,
  poolHotThreshold: 0.25,
  maxPools: 2,
});
const copy = (p) => ({ x: p.x, y: p.y, z: p.z }),
  add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale = (p, n) => ({ x: p.x * n, y: p.y * n, z: p.z * n }),
  dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
  clamp = (n) => Math.max(0, Math.min(1, n));
function unit(p) {
  const length = Math.hypot(p.x, p.y, p.z);
  return length > 1e-8 ? scale(p, 1 / length) : { x: 0, y: 1, z: 0 };
}

const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  TETRA_FACES = [
    [1, 2, 3],
    [0, 3, 2],
    [0, 1, 3],
    [0, 2, 1],
  ],
  TETRA_EDGES = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ],
  CUBE_TETRA = [
    [0, 1, 3, 7],
    [0, 1, 5, 7],
    [0, 2, 3, 7],
    [0, 2, 6, 7],
    [0, 4, 5, 7],
    [0, 4, 6, 7],
  ],
  tri = new THREE.Triangle(),
  ta = new THREE.Vector3(),
  tb = new THREE.Vector3(),
  tc = new THREE.Vector3(),
  tp = new THREE.Vector3(),
  nearest = new THREE.Vector3(),
  ray = new THREE.Ray(),
  rayHit = new THREE.Vector3();

function pointTriangleDistanceSq(p, a, b, c) {
  tri.a.copy(a);
  tri.b.copy(b);
  tri.c.copy(c);
  tp.copy(p);
  tri.closestPointToPoint(tp, nearest);
  return nearest.distanceToSquared(tp);
}
function tetraContains(p, v) {
  if (
    Math.abs(dot(sub(v[1], v[0]), cross(sub(v[2], v[0]), sub(v[3], v[0])))) <
    1e-10
  )
    return false;
  for (let i = 0; i < 4; i++) {
    const f = TETRA_FACES[i],
      n = cross(sub(v[f[1]], v[f[0]]), sub(v[f[2]], v[f[0]])),
      side = dot(n, sub(v[i], v[f[0]]));
    if (side * dot(n, sub(p, v[f[0]])) < -1e-9) return false;
  }
  return true;
}
function pointTetraDistanceSq(p, v) {
  if (tetraContains(p, v)) return 0;
  let result = Infinity;
  for (const f of TETRA_FACES)
    result = Math.min(
      result,
      pointTriangleDistanceSq(p, v[f[0]], v[f[1]], v[f[2]]),
    );
  return result;
}
function segmentSegmentDistanceSq(p1, q1, p2, q2) {
  const d1 = sub(q1, p1),
    d2 = sub(q2, p2),
    r = sub(p1, p2),
    a = dot(d1, d1),
    e = dot(d2, d2),
    f = dot(d2, r);
  let s = 0,
    t = 0;
  if (a < 1e-12 && e < 1e-12) return dot(r, r);
  if (a < 1e-12) t = clamp(f / e);
  else {
    const c = dot(d1, r);
    if (e < 1e-12) s = clamp(-c / a);
    else {
      const b = dot(d1, d2),
        den = a * e - b * b;
      s = den > 1e-12 ? clamp((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a);
      }
    }
  }
  const delta = sub(add(p1, scale(d1, s)), add(p2, scale(d2, t)));
  return dot(delta, delta);
}
function segmentTetraDistanceSq(a, b, v) {
  if (tetraContains(a, v) || tetraContains(b, v)) return 0;
  const length = distance(a, b);
  let result = Infinity;
  if (length > 1e-9) {
    ray.origin.copy(a);
    ray.direction
      .copy(b)
      .sub(a)
      .multiplyScalar(1 / length);
  }
  for (const f of TETRA_FACES) {
    const x = v[f[0]],
      y = v[f[1]],
      z = v[f[2]];
    if (
      length > 1e-9 &&
      ray.intersectTriangle(
        ta.copy(x),
        tb.copy(y),
        tc.copy(z),
        false,
        rayHit,
      ) &&
      rayHit.distanceTo(ray.origin) <= length + 1e-8
    )
      return 0;
    result = Math.min(
      result,
      pointTriangleDistanceSq(a, x, y, z),
      pointTriangleDistanceSq(b, x, y, z),
      segmentSegmentDistanceSq(a, b, x, y),
      segmentSegmentDistanceSq(a, b, y, z),
      segmentSegmentDistanceSq(a, b, z, x),
    );
  }
  return result;
}
function localPoint(p, c) {
  const d = sub(p, c),
    q = c.rotation;
  if (!q) return d;
  const x = -q.x,
    y = -q.y,
    z = -q.z,
    w = q.w,
    ix = w * d.x + y * d.z - z * d.y,
    iy = w * d.y + z * d.x - x * d.z,
    iz = w * d.z + x * d.y - y * d.x,
    iw = -x * d.x - y * d.y - z * d.z;
  return {
    x: ix * w + iw * -x + iy * -z - iz * -y,
    y: iy * w + iw * -y + iz * -x - ix * -z,
    z: iz * w + iw * -z + ix * -y - iy * -x,
  };
}
function tetraBoxOverlap(vertices, collider, padding, alreadyLocal = false) {
  const v = alreadyLocal
      ? vertices
      : vertices.map((p) => localPoint(p, collider)),
    h = collider.halfSize,
    half = { x: h.x + padding, y: h.y + padding, z: h.z + padding },
    axes = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ];
  for (const f of TETRA_FACES)
    axes.push(cross(sub(v[f[1]], v[f[0]]), sub(v[f[2]], v[f[0]])));
  for (const [a, b] of TETRA_EDGES) {
    const d = sub(v[b], v[a]);
    axes.push(
      { x: 0, y: d.z, z: -d.y },
      { x: -d.z, y: 0, z: d.x },
      { x: d.y, y: -d.x, z: 0 },
    );
  }
  for (const axis of axes) {
    if (dot(axis, axis) < 1e-16) continue;
    let min = Infinity,
      max = -Infinity;
    for (const p of v) {
      const value = dot(p, axis);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    const radius =
      Math.abs(axis.x) * half.x +
      Math.abs(axis.y) * half.y +
      Math.abs(axis.z) * half.z;
    if (min > radius + 1e-8 || max < -radius - 1e-8) return false;
  }
  return true;
}

/** 对格子内六个真实四面体求实体交叠，不以中心线或边线代替整个扇面体积。 */
const colliderBoundsCache = new WeakMap();
function colliderBounds(c) {
  let box = colliderBoundsCache.get(c);
  if (box) return box;
  if (c.type === "capsule") {
    const r = c.radius;
    box = {
      min: {
        x: Math.min(c.a.x, c.b.x) - r,
        y: Math.min(c.a.y, c.b.y) - r,
        z: Math.min(c.a.z, c.b.z) - r,
      },
      max: {
        x: Math.max(c.a.x, c.b.x) + r,
        y: Math.max(c.a.y, c.b.y) + r,
        z: Math.max(c.a.z, c.b.z) + r,
      },
    };
  } else if (c.type === "box") {
    const h = c.halfSize,
      q = c.rotation;
    let x = h.x,
      y = h.y,
      z = h.z;
    if (q) {
      const xx = q.x * q.x,
        yy = q.y * q.y,
        zz = q.z * q.z,
        xy = q.x * q.y,
        xz = q.x * q.z,
        yz = q.y * q.z,
        wx = q.w * q.x,
        wy = q.w * q.y,
        wz = q.w * q.z;
      x =
        Math.abs(1 - 2 * (yy + zz)) * h.x +
        Math.abs(2 * (xy - wz)) * h.y +
        Math.abs(2 * (xz + wy)) * h.z;
      y =
        Math.abs(2 * (xy + wz)) * h.x +
        Math.abs(1 - 2 * (xx + zz)) * h.y +
        Math.abs(2 * (yz - wx)) * h.z;
      z =
        Math.abs(2 * (xz - wy)) * h.x +
        Math.abs(2 * (yz + wx)) * h.y +
        Math.abs(1 - 2 * (xx + yy)) * h.z;
    }
    box = {
      min: { x: c.x - x, y: c.y - y, z: c.z - z },
      max: { x: c.x + x, y: c.y + y, z: c.z + z },
    };
  } else {
    const r =
      c.type === "ellipsoid"
        ? Math.max(c.axes.x, c.axes.y, c.axes.z)
        : c.radius + (c.thickness || 0) / 2;
    box = {
      min: { x: c.x - r, y: c.y - r, z: c.z - r },
      max: { x: c.x + r, y: c.y + r, z: c.z + r },
    };
  }
  // 静态空间索引同样要求成员不可变；动态查询返回新姿态盒，不复用旧盒位置。
  colliderBoundsCache.set(c, box);
  return box;
}

export function isTitanLavaCellBlocked(cell, colliders, { padding = 0 } = {}) {
  const bounds = cell.bounds || boundsOf(cell.vertices);
  for (const c of colliders) {
    if (!overlapBounds(bounds, colliderBounds(c), padding)) continue;
    const local =
      c.type === "box" ? cell.vertices.map((p) => localPoint(p, c)) : null;
    for (const ids of cell.tetrahedra) {
      const v = ids.map((i) => cell.vertices[i]);
      if (c.type === "box") {
        if (
          tetraBoxOverlap(
            ids.map((i) => local[i]),
            c,
            padding,
            true,
          )
        )
          return true;
        continue;
      }
      if (c.type === "ellipsoid") {
        const axes = c.axes,
          vertices = v.map((p) => {
            const q = localPoint(p, c);
            return {
              x: q.x / (axes.x + padding),
              y: q.y / (axes.y + padding),
              z: q.z / (axes.z + padding),
            };
          });
        if (pointTetraDistanceSq({ x: 0, y: 0, z: 0 }, vertices) <= 1 + 1e-8)
          return true;
        continue;
      }
      if (c.type === "capsule") {
        if (
          segmentTetraDistanceSq(c.a, c.b, v) <=
          (c.radius + padding) ** 2 + 1e-8
        )
          return true;
        continue;
      }
      if (c.type === "sphere_shell") {
        const inner = Math.max(0, c.radius - c.thickness / 2 - padding),
          outer = c.radius + c.thickness / 2 + padding,
          min = pointTetraDistanceSq(c, v),
          max = Math.max(...v.map((p) => distance(p, c) ** 2));
        if (min <= outer * outer && max >= inner * inner) return true;
        continue;
      }
      if (
        Number.isFinite(c.radius) &&
        pointTetraDistanceSq(c, v) <= (c.radius + padding) ** 2 + 1e-8
      )
        return true;
    }
  }
  return false;
}

function boundsOf(vertices) {
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of vertices)
    for (const key of ["x", "y", "z"]) {
      min[key] = Math.min(min[key], p[key]);
      max[key] = Math.max(max[key], p[key]);
    }
  return { min, max };
}
function overlapBounds(a, b, radius = 0) {
  return (
    a.min.x - radius <= b.max.x &&
    a.max.x + radius >= b.min.x &&
    a.min.y - radius <= b.max.y &&
    a.max.y + radius >= b.min.y &&
    a.min.z - radius <= b.max.z &&
    a.max.z + radius >= b.min.z
  );
}
export function titanHazardSeed(value) {
  let seed = value >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x7feb352d);
  seed = Math.imul(seed ^ (seed >>> 15), 0x846ca68b);
  return (seed ^ (seed >>> 16)) >>> 0;
}

/** 先检验整条实际口到落点的抛射弧；任何中途遮挡都拒绝整束，不裁成半条。 */
export function createTitanLavaPath(
  mouth,
  direction,
  site,
  { id, lift = 30, radius = BERMUDA_TITAN_HAZARDS.lavaRadius } = {},
) {
  const normal = unit(site.normal || { x: 0, y: 1, z: 0 }),
    from = add(mouth, scale(unit(direction), 4)),
    end = add(site.impact, scale(normal, radius + 0.25)),
    control1 = add(
      from,
      add(scale(unit(direction), 12), { x: 0, y: lift, z: 0 }),
    ),
    control2 = add(end, { x: 0, y: lift, z: 0 }),
    points = [copy(mouth), from];
  for (let i = 1; i <= 11; i++) {
    const t = i / 11,
      a = 1 - t;
    points.push(
      add(
        add(scale(from, a ** 3), scale(control1, 3 * a * a * t)),
        add(scale(control2, 3 * a * t * t), scale(end, t ** 3)),
      ),
    );
  }
  return {
    id,
    siteId: site.id,
    sector: site.sector,
    points,
    radius,
    impact: copy(site.impact),
    impactNormal: normal,
    impactRadius: site.impactRadius ?? BERMUDA_TITAN_HAZARDS.lavaImpactRadius,
    impactHeight: site.impactHeight ?? BERMUDA_TITAN_HAZARDS.lavaImpactHeight,
  };
}

function legalSheetTarget(mouth, direction, site) {
  const delta = {
      x: site.impact.x - mouth.x,
      y: 0,
      z: site.impact.z - mouth.z,
    },
    length = Math.hypot(delta.x, delta.z),
    horizontal = Math.hypot(direction.x, direction.z),
    forward =
      horizontal > 1e-8
        ? { x: direction.x / horizontal, y: 0, z: direction.z / horizontal }
        : unit(delta);
  return length >= 20 && dot(delta, forward) >= 18;
}

/** 宽熔流是一个闭合实体；六面格子共用顶点，画面边界与判伤四面体来自同一格网。 */
export function createTitanLavaSheet(
  mouth,
  direction,
  site,
  { id = "molten_sheet", lift = 30, width = 48, seed = 1 } = {},
) {
  if (!legalSheetTarget(mouth, direction, site))
    throw new RangeError(
      "Molten sheet landing must be in front of the mouth with at least eighteen metres of horizontal run",
    );
  const rows = BERMUDA_TITAN_HAZARDS.sheetRows,
    columns = BERMUDA_TITAN_HAZARDS.sheetColumns,
    landingClearance =
      width >= 150
        ? BERMUDA_TITAN_HAZARDS.roomSheetGroundClearance
        : BERMUDA_TITAN_HAZARDS.sheetGroundClearance,
    forward = unit({
      x: site.impact.x - mouth.x,
      y: 0,
      z: site.impact.z - mouth.z,
    }),
    across = { x: -forward.z, y: 0, z: forward.x },
    mouthAcross =
      Math.hypot(direction.x, direction.z) > 1e-8
        ? unit({ x: -direction.z, y: 0, z: direction.x })
        : across,
    floorAt =
      site.floorAt ||
      ((x, z) =>
        site.impact.y -
        0.12 -
        ((site.normal?.x || 0) * (x - site.impact.x) +
          (site.normal?.z || 0) * (z - site.impact.z)) /
          (site.normal?.y || 1)),
    center = createTitanLavaPath(mouth, direction, site, {
      id,
      lift,
      radius: 1.75,
    }).points,
    vertices = [],
    centers = [],
    ground = [],
    phase = (titanHazardSeed(seed) / 0x100000000) * Math.PI * 2,
    idx = (row, column, layer = 0) =>
      layer * rows * columns + row * columns + column;
  // 末端中心在四米厚熔池中部，最底层随真实坡面，而不是横跨斜床的平板。
  center[12] = add(site.impact, { x: 0, y: 2, z: 0 });
  for (let row = 0; row < rows; row++) {
    const flight = Math.min(row, 12),
      t = flight / 12,
      c =
        row <= 12
          ? center[row]
          : add(center[12], scale(forward, (row - 12) * 6)),
      expansion = Math.sin((t * Math.PI) / 2) ** 0.85,
      // 前四米是真实唇口内的窄出口，先沿嘴向离开皮肤；之后仍用原扇面尺寸与落点。
      halfWidth = row < 2 ? 1.2 : 3 + (width / 2 - 3) * expansion,
      rowAcross = row < 2 ? mouthAcross : across;
    for (let column = 0; column < columns; column++) {
      const u = (column / (columns - 1)) * 2 - 1,
        roll =
          Math.sin(u * Math.PI * 1.5 + phase) * Math.sin(t * Math.PI) * 0.8,
        outline = row >= 12 ? Math.sin(u * 2.6 + phase) * 1.5 : 0,
        x = c.x + rowAcross.x * u * halfWidth + forward.x * outline,
        z = c.z + rowAcross.z * u * halfWidth + forward.z * outline,
        // 宽幅跨格的地面弦线多预留38厘米，实体仍必须通过原有完整海床/岩壁检测。
        bed = floorAt(x, z) + landingClearance,
        y =
          row >= 12
            ? bed + 2
            : c.y + (floorAt(x, z) - floorAt(c.x, c.z)) * t ** 4 + roll;
      centers.push({ x, y, z });
      ground.push({ x, y: bed, z });
    }
  }
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const c = centers[row * columns + column];
        const halfHeight = row < 2 ? 1.2 : 2;
        vertices.push({
          x: c.x,
          y: c.y + (layer ? halfHeight : -halfHeight),
          z: c.z,
        });
      }
  const { tetrahedra, cells, boundary } = sheetTopology(
    vertices,
    rows,
    columns,
  );
  const footprint = [];
  // 围裙的真实投影轮廓，预告和完整铺地几何共用，跨幅没有独立射线间隙。
  for (let column = 0; column < columns; column++)
    footprint.push(ground[11 * columns + column]);
  for (let row = 12; row < rows; row++)
    footprint.push(ground[row * columns + columns - 1]);
  for (let column = columns - 2; column >= 0; column--)
    footprint.push(ground[(rows - 1) * columns + column]);
  for (let row = rows - 2; row >= 12; row--)
    footprint.push(ground[row * columns]);
  return {
    type: "molten_sheet",
    id,
    siteId: site.id,
    sector: site.sector,
    rows,
    columns,
    width,
    lift,
    landingClearance,
    vertices,
    tetrahedra,
    cells,
    boundary,
    rowParameters: Array.from({ length: rows }, (_, i) => i),
    rowDistances: gridDistances(vertices, rows, columns),
    footprint,
    bounds: boundsOf(vertices),
    points: center,
    radius: BERMUDA_TITAN_HAZARDS.lavaRadius,
    impact: copy(site.impact),
    impactNormal: unit(site.normal || { x: 0, y: 1, z: 0 }),
    impactRadius: site.impactRadius ?? 6.5,
    impactHeight: 4,
    mouth: copy(mouth),
  };
}

function sheetTopology(
  vertices,
  rows,
  columns,
  rowParameters = Array.from({ length: rows }, (_, i) => i),
) {
  const idx = (row, column, layer = 0) =>
    layer * rows * columns + row * columns + column;
  const tetrahedra = [],
    cells = [],
    faces = new Map();
  for (let row = 0; row < rows - 1; row++)
    for (let column = 0; column < columns - 1; column++) {
      const ids = [
          idx(row, column),
          idx(row, column + 1),
          idx(row + 1, column),
          idx(row + 1, column + 1),
          idx(row, column, 1),
          idx(row, column + 1, 1),
          idx(row + 1, column, 1),
          idx(row + 1, column + 1, 1),
        ],
        cv = ids.map((i) => vertices[i]),
        cell = {
          row: Math.floor(rowParameters[row] + 1e-8),
          gridRow: row,
          column,
          vertices: cv,
          tetrahedra: CUBE_TETRA,
          bounds: boundsOf(cv),
          nearMouth: rowParameters[row] < 1 - 1e-8,
          allowLanding: rowParameters[row] >= 11,
        };
      cells.push(cell);
      for (const local of CUBE_TETRA) {
        let tet = local.map((i) => ids[i]);
        const v = tet.map((i) => vertices[i]);
        if (dot(sub(v[1], v[0]), cross(sub(v[2], v[0]), sub(v[3], v[0]))) < 0)
          tet = [tet[1], tet[0], tet[2], tet[3]];
        tetrahedra.push(tet);
        for (let opposite = 0; opposite < 4; opposite++) {
          const face = TETRA_FACES[opposite].map((i) => tet[i]),
            a = vertices[face[0]],
            b = vertices[face[1]],
            c = vertices[face[2]];
          if (
            dot(cross(sub(b, a), sub(c, a)), sub(vertices[tet[opposite]], a)) >
            0
          )
            [face[1], face[2]] = [face[2], face[1]];
          const key = [...face].sort((a, b) => a - b).join("/");
          if (faces.has(key)) faces.delete(key);
          else faces.set(key, face);
        }
      }
    }
  return { tetrahedra, cells, boundary: [...faces.values()].flat() };
}
function gridDistances(vertices, rows, columns) {
  const result = [0];
  let before = null;
  for (let row = 0; row < rows; row++) {
    const lo = vertices[row * columns + Math.floor(columns / 2)],
      hi = vertices[rows * columns + row * columns + Math.floor(columns / 2)],
      point = scale(add(lo, hi), 0.5);
    if (before) result.push(result.at(-1) + distance(before, point));
    before = point;
  }
  return result;
}

/** 在原六面格的同一四面体中插值，所有圆钝顶点均留在已验收的实体内。 */
function sampleSheetVolume(sheet, row, column, height) {
  const r = Math.max(0, Math.min(sheet.rows - 1, row)),
    c = Math.max(0, Math.min(sheet.columns - 1, column)),
    ri = Math.min(sheet.rows - 2, Math.floor(r)),
    ci = Math.min(sheet.columns - 2, Math.floor(c)),
    coordinates = [c - ci, r - ri, clamp(height)],
    order = [0, 1, 2].sort((a, b) => coordinates[b] - coordinates[a]),
    bits = [0, 0, 0],
    result = { x: 0, y: 0, z: 0 };
  let last = 1;
  for (let step = 0; step < 4; step++) {
    const next = step < 3 ? coordinates[order[step]] : 0,
      weight = last - next,
      point =
        sheet.vertices[
          bits[2] * sheet.rows * sheet.columns +
            (ri + bits[1]) * sheet.columns +
            ci +
            bits[0]
        ];
    result.x += point.x * weight;
    result.y += point.y * weight;
    result.z += point.z * weight;
    if (step < 3) bits[order[step]] = 1;
    last = next;
  }
  return result;
}
function parameterAtDistance(distances, target) {
  const t = Math.max(0, Math.min(distances.at(-1), target));
  for (let row = 1; row < distances.length; row++)
    if (t <= distances[row] + 1e-9)
      return (
        row -
        1 +
        (t - distances[row - 1]) /
          Math.max(1e-9, distances[row] - distances[row - 1])
      );
  return distances.length - 1;
}
function distanceAtParameter(distances, parameter) {
  const i = Math.min(distances.length - 1, Math.floor(parameter));
  return (
    distances[i] +
    ((distances[Math.min(i + 1, distances.length - 1)] ?? distances[i]) -
      distances[i]) *
      (parameter - i)
  );
}
function fieldFootprint(vertices, rows, columns) {
  const footprint = [];
  for (let c = 0; c < columns; c++) footprint.push(copy(vertices[c]));
  for (let r = 1; r < rows; r++)
    footprint.push(copy(vertices[r * columns + columns - 1]));
  for (let c = columns - 2; c >= 0; c--)
    footprint.push(copy(vertices[(rows - 1) * columns + c]));
  for (let r = rows - 2; r > 0; r--)
    footprint.push(copy(vertices[r * columns]));
  return footprint;
}

/** 从同一宽流网格截出真实圆钝前沿/尾段；切面和判伤四面体同步产生。 */
export function sliceTitanLavaSheet(
  sheet,
  fromRow,
  toRow,
  { heightScale = 1, id = sheet.id } = {},
) {
  const from = Math.max(0, Math.min(sheet.rows - 1, fromRow)),
    to = Math.max(from, Math.min(sheet.rows - 1, toRow));
  if (to - from < 1e-6 || heightScale <= 1e-6) return null;
  const distances =
      sheet.rowDistances ??
      gridDistances(sheet.vertices, sheet.rows, sheet.columns),
    fromDistance = distanceAtParameter(distances, from),
    toDistance = distanceAtParameter(distances, to),
    noseLength = Math.min(0.8, (toDistance - fromDistance) * 0.4),
    roundEnd = to <= 12 + 1e-8,
    roundStart = from > 1e-8 && from < 12,
    parameters = [from];
  for (let row = Math.floor(from) + 1; row < to - 1e-8; row++)
    parameters.push(row);
  // 不改整条四米包络，仅在最多八十厘米的真切面加入两圈过渡。
  for (const offset of [noseLength, noseLength * 0.45]) {
    if (roundEnd)
      parameters.push(parameterAtDistance(distances, toDistance - offset));
    if (roundStart)
      parameters.push(parameterAtDistance(distances, fromDistance + offset));
  }
  parameters.push(to);
  const rowParameters = parameters
      .filter((r) => r >= from && r <= to)
      .sort((a, b) => a - b)
      .filter((r, i, all) => !i || r - all[i - 1] > 1e-7),
    rows = rowParameters.length,
    columns = sheet.columns,
    vertices = [],
    phase = (titanHazardSeed(sheet.id) / 0x100000000) * Math.PI * 2;
  for (let layer = 0; layer < 2; layer++)
    for (const row of rowParameters)
      for (let column = 0; column < columns; column++) {
        const d = distanceAtParameter(distances, row),
          end = roundEnd
            ? clamp((toDistance - d) / Math.max(noseLength, 1e-9))
            : 1,
          start = roundStart
            ? clamp((d - fromDistance) / Math.max(noseLength, 1e-9))
            : 1,
          smooth = (v) => v * v * (3 - 2 * v),
          factor = Math.max(
            0.12,
            (0.12 + 0.88 * smooth(end)) * (0.12 + 0.88 * smooth(start)),
          ),
          u = (column / (columns - 1)) * 2 - 1,
          scallop =
            Math.min(0.28, noseLength * 0.35) *
            u *
            u *
            (0.85 + 0.15 * Math.sin(phase + u * 2.1)),
          shiftedDistance = Math.max(
            fromDistance,
            Math.min(
              toDistance,
              d - scallop * (1 - end) + scallop * (1 - start),
            ),
          ),
          parameter = parameterAtDistance(distances, shiftedDistance),
          groundedTip = roundEnd && to >= 12 - 1e-8,
          low = groundedTip ? 0 : (1 - factor) * 0.5,
          h = low + (layer ? factor * heightScale : 0);
        vertices.push(sampleSheetVolume(sheet, parameter, column, h));
      }
  return {
    ...sheet,
    id,
    rows,
    vertices,
    ...sheetTopology(vertices, rows, columns, rowParameters),
    footprint: fieldFootprint(vertices, rows, columns),
    bounds: boundsOf(vertices),
    rowParameters,
    rowDistances: rowParameters.map((r) => distanceAtParameter(distances, r)),
    impactHeight: sheet.impactHeight * heightScale,
    roundedNoseLength: roundEnd || roundStart ? noseLength : 0,
  };
}

/** 残留是一滩低矮圆角熔岩；真实顶面、冷却高度、表皮和判伤共用同一网格。 */
export function createTitanLavaPool(
  sheet,
  { temperature = 1, id = sheet.id, floorAt } = {},
) {
  const heat = clamp(temperature);
  if (heat <= 1e-6) return null;
  const rows = 7,
    columns = sheet.columns,
    vertices = [],
    rowParameters = Array.from(
      { length: rows },
      (_, i) => 12 + (i * 2) / (rows - 1),
    );
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const u = (column / (columns - 1)) * 2 - 1,
          v = (row / (rows - 1)) * 2 - 1,
          roundedU = u * Math.sqrt(1 - 0.55 * v * v),
          roundedV = v * Math.sqrt(1 - 0.55 * u * u),
          r = 13 + roundedV,
          c = (roundedU + 1) * 0.5 * (columns - 1),
          depth = (0.2 + 0.9 * (1 - u * u) * (1 - v * v)) * heat;
        const point = sampleSheetVolume(sheet, r, c, 0);
        if (typeof floorAt === "function")
          point.y =
            floorAt(point.x, point.z) +
            (sheet.landingClearance ??
              BERMUDA_TITAN_HAZARDS.sheetGroundClearance);
        if (layer) point.y += depth;
        vertices.push(point);
      }
  return {
    ...sheet,
    id,
    rows,
    columns,
    vertices,
    ...sheetTopology(vertices, rows, columns, rowParameters),
    footprint: fieldFootprint(vertices, rows, columns),
    bounds: boundsOf(vertices),
    rowParameters,
    rowDistances: rowParameters.map((r) =>
      distanceAtParameter(sheet.rowDistances, r),
    ),
    impactHeight: 1.1 * heat,
    poolProfile: {
      centerDepth: 1.1 * heat,
      edgeDepth: 0.2 * heat,
      cornerInward: 0.55,
    },
  };
}

function flightRow(sheet, fraction) {
  const distances =
      sheet.rowDistances ??
      gridDistances(sheet.vertices, sheet.rows, sheet.columns),
    target = clamp(fraction) * distances[12];
  for (let row = 1; row <= 12; row++)
    if (target <= distances[row] + 1e-9)
      return (
        row -
        1 +
        (target - distances[row - 1]) /
          Math.max(1e-9, distances[row] - distances[row - 1])
      );
  return 12;
}
function reanchorSheet(sheet, mouth) {
  const delta = sub(mouth, sheet.mouth);
  if (dot(delta, delta) < 1e-16) return false;
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row < 2; row++)
      for (let column = 0; column < sheet.columns; column++) {
        const p =
            sheet.vertices[
              layer * sheet.rows * sheet.columns + row * sheet.columns + column
            ],
          weight = row === 0 ? 1 : 0.75;
        p.x += delta.x * weight;
        p.y += delta.y * weight;
        p.z += delta.z * weight;
      }
  sheet.points[0] = copy(mouth);
  sheet.points[1] = add(sheet.points[1], scale(delta, 0.75));
  sheet.mouth = copy(mouth);
  for (const cell of sheet.cells)
    if (cell.row < 2) cell.bounds = boundsOf(cell.vertices);
  sheet.bounds = boundsOf(sheet.vertices);
  sheet.rowDistances = gridDistances(sheet.vertices, sheet.rows, sheet.columns);
  return true;
}
function sheetBodyContact(sheet, before, position, body, coverBetween) {
  const old = bodySpheres(body, true),
    next = bodySpheres(body),
    radius = body.radius ?? Math.max(0.65, (body.length || 0) * 0.13);
  for (let i = 0; i < next.length; i++) {
    const a = add(before, old[i] || next[i]),
      b = add(position, next[i]),
      sweep = boundsOf([a, b]);
    if (!overlapBounds(sheet.bounds, sweep, radius)) continue;
    for (const cell of sheet.cells) {
      if (!overlapBounds(cell.bounds, sweep, radius)) continue;
      for (const ids of cell.tetrahedra) {
        const v = ids.map((i) => cell.vertices[i]);
        if (segmentTetraDistanceSq(a, b, v) <= radius * radius + 1e-8) {
          const center = scale(
            v.reduce((p, q) => add(p, q), { x: 0, y: 0, z: 0 }),
            0.25,
          );
          if (!coverBetween(b, center)) return true;
        }
      }
    }
  }
  return false;
}

function bodySpheres(body, previous = false) {
  return bodyOffsets({
    ...body,
    radius: body.radius ?? Math.max(0.65, (body.length || 0) * 0.13),
    length: (body.length || 0) * (0.52 / 0.42),
    forward: previous ? body.previousForward || body.forward : body.forward,
  });
}
/** 两个移动体用相同时间参数的相对扫掠，避免只按空间交叉误判坠石。 */
export function titanFallingRockContact(rock, before, position, body = {}) {
  const oldOffsets = bodySpheres(body, true),
    nextOffsets = bodySpheres(body),
    radius =
      rock.radius + (body.radius || Math.max(0.65, (body.length || 0) * 0.13));
  return nextOffsets.some((offset, index) => {
    const a = sub(add(before, oldOffsets[index] || offset), rock.previous),
      b = sub(add(position, offset), rock.position),
      delta = sub(b, a),
      fraction =
        dot(delta, delta) > 1e-12
          ? clamp(-dot(a, delta) / dot(delta, delta))
          : 0,
      nearest = add(a, scale(delta, fraction));
    return dot(nearest, nearest) <= radius * radius;
  });
}
export function titanLavaImpactContact(path, before, position, body = {}) {
  const normal = unit(path.impactNormal),
    old = bodySpheres(body, true),
    next = bodySpheres(body),
    radius = body.radius || Math.max(0.65, (body.length || 0) * 0.13),
    distanceSquared = (p) => {
      const delta = sub(p, path.impact),
        height = dot(delta, normal),
        radial = Math.sqrt(Math.max(0, dot(delta, delta) - height * height)),
        outsideRadius = Math.max(0, radial - path.impactRadius),
        outsideHeight = Math.max(0, -height, height - path.impactHeight);
      return outsideRadius ** 2 + outsideHeight ** 2;
    };
  return next.some((offset, index) => {
    const a = add(before, old[index] || offset),
      b = add(position, offset),
      d = sub(b, a);
    // 到凸圆柱的平方距离沿线段为凸函数；有界求极小也覆盖快速横穿与倾斜地面。
    let low = 0,
      high = 1;
    for (let i = 0; i < 30; i++) {
      const m1 = (2 * low + high) / 3,
        m2 = (low + 2 * high) / 3;
      if (
        distanceSquared(add(a, scale(d, m1))) <
        distanceSquared(add(a, scale(d, m2)))
      )
        high = m2;
      else low = m1;
    }
    return (
      Math.min(
        distanceSquared(a),
        distanceSquared(b),
        distanceSquared(add(a, scale(d, (low + high) / 2))),
      ) <=
      radius * radius + 1e-7
    );
  });
}
export function titanLavaContact(
  paths,
  before,
  position,
  body = {},
  coverBetween = () => false,
) {
  const visibleBody = { ...body, length: (body.length || 0) * (0.52 / 0.42) };
  for (const path of paths) {
    if (path.type === "molten_sheet") {
      if (sheetBodyContact(path, before, position, body, coverBetween))
        return true;
      continue;
    }
    for (let i = 1; i < path.points.length; i++)
      if (
        titanBreathContact(
          {
            from: path.points[i - 1],
            to: path.points[i],
            radius: path.radius,
            distance: distance(path.points[i - 1], path.points[i]),
          },
          before,
          position,
          visibleBody,
        )
      )
        return true;
    if (
      titanLavaImpactContact(path, before, position, body) &&
      !coverBetween(
        position,
        add(path.impact, scale(path.impactNormal, path.impactHeight * 0.5)),
      )
    )
      return true;
  }
  return false;
}

/** 熔流相位只读任务规则；本组件只锁落点、推进预警落石、返回同一份渲染/伤害几何。 */
export function createBermudaTitanHazards({
  sites = [],
  seed = 1,
  pathClear = () => true,
  cellClear = null,
  clearanceVersion = () => 0,
  coverBetween = () => false,
  terminalContext = (position) => ({
    center: copy(position),
    ground: copy(position),
    roof: add(position, { x: 0, y: 35, z: 0 }),
  }),
} = {}) {
  let randomState,
    locked = [],
    cycleKey = null,
    serial = 0,
    rocks = [],
    rockRemaining = 7,
    hitRemaining = 0,
    lastEmission = false,
    terminalTime = 0,
    terminalAnchor = null,
    snapshot,
    validationKey = null,
    visibleSheets = [],
    transportClock = 0,
    startedSources = new Set(),
    streams = [],
    pools = [],
    validationStats = {
      attempts: 0,
      candidates: 0,
      cellChecks: 0,
      preflightChecks: 0,
      rejectedCells: [],
    };
  const getSites = () => (typeof sites === "function" ? sites() : sites);
  function random() {
    randomState = (randomState + 0x6d2b79f5) >>> 0;
    return titanHazardSeed(randomState) / 0x100000000;
  }
  function validateSheet(sheet, site) {
    if (cellClear) {
      // 先查常见遮挡的中后段边缘与铺地角，失败立即拒绝；通过仍须检查全部140格。
      const priority = [
          80, 89, 81, 88, 82, 87, 83, 86, 84, 85, 130, 139, 110, 119, 0, 9, 10,
          19,
        ].filter((index) => index < sheet.cells.length),
        seen = new Set(priority),
        order = [
          ...priority,
          ...sheet.cells.map((_, i) => i).filter((i) => !seen.has(i)),
        ];
      return order.every((index) => {
        const cell = sheet.cells[index];
        validationStats.cellChecks++;
        const valid = cellClear(cell, {
          kind: "lava",
          site,
          originGrace: cell.nearMouth,
        });
        if (!valid && validationStats.rejectedCells.length < 8)
          validationStats.rejectedCells.push({
            siteId: site.id,
            row: cell.row,
            column: cell.column,
            width: sheet.width,
            lift: sheet.lift,
          });
        return valid;
      });
    }
    // 无世界格子回调的独立调用也检查每条跨幅导线；生产用上面的真实体积检测。
    for (let column = 0; column < sheet.columns; column++) {
      const points = [];
      for (let row = 0; row < sheet.rows; row++)
        points.push(
          scale(
            add(
              sheet.vertices[row * sheet.columns + column],
              sheet.vertices[
                sheet.rows * sheet.columns + row * sheet.columns + column
              ],
            ),
            0.5,
          ),
        );
      if (!pathClear(points, 2, { kind: "lava", site, clearance: 0 }))
        return false;
    }
    return true;
  }
  function choose(mouth, direction, awake, kind, playerPosition) {
    const source = getSites().filter(
        (s) => !s.exit && (kind !== "lava" || s.lavaEligible !== false),
      ),
      remaining = source
        .map((site) => ({
          site,
          score:
            random() /
            (1 +
              (playerPosition
                ? 5 *
                  Math.exp(-((distance(site.impact, playerPosition) / 75) ** 2))
                : 0)),
        }))
        .sort((a, b) => a.score - b.score),
      chosen = [],
      lavaCandidates = [],
      count = kind === "lava" ? 1 : 2;
    const occupiedSectors = [
      // 新一轮熔流不继承已熄灭的旧落点；坠石只避让仍在预警/坠落的真实危险。
      ...(kind === "rock" && snapshot.lava.phase !== "off"
        ? locked.map((r) => r.site.sector)
        : []),
      ...rocks.filter((r) => r.phase !== "impact").map((r) => r.site.sector),
      ...pools
        .filter((p) => p.temperature > BERMUDA_TITAN_HAZARDS.poolHotThreshold)
        .map((p) => p.sector),
      ...streams.map((r) => r.sheet.sector),
    ].filter((s) => s === "north" || s === "south");
    let sector = occupiedSectors[0] || null;
    for (const { site } of remaining) {
      if (chosen.length >= count) break;
      // 同一轮只打一个出口扇区；另一路不能被熔流与坠石一起永久封住。
      if (
        sector &&
        site.sector &&
        site.sector !== sector &&
        ["north", "south"].includes(site.sector)
      )
        continue;
      if (
        chosen.some(
          (c) =>
            distance(c.site.impact, site.impact) < (kind === "lava" ? 14 : 12),
        )
      )
        continue;
      if (kind === "lava") {
        if (!legalSheetTarget(mouth, direction, site)) continue;
        if (
          pools.length >= BERMUDA_TITAN_HAZARDS.maxPools &&
          !pools.some((p) => p.siteId === site.id)
        )
          continue;
        // 先尝试电影式宽幅；受地形限制时只收为仍有面积的连续主扇面，不拆成几根细线。
        const maximum = awake
          ? BERMUDA_TITAN_HAZARDS.sheetWidthAwake
          : BERMUDA_TITAN_HAZARDS.sheetWidthSleeping;
        if (validationStats.candidates >= 8) break;
        validationStats.candidates++;
        lavaCandidates.push(site);
        let fitted = null;
        for (const width of [
          maximum,
          maximum * 0.5,
          BERMUDA_TITAN_HAZARDS.sheetMinimumWidth,
        ]) {
          for (const lift of [20, 8]) {
            validationStats.attempts++;
            const record = {
              site,
              lift,
              width,
              id: `lava_${serial}`,
              seed: titanHazardSeed(randomState + serial),
            };
            const guide = createTitanLavaPath(mouth, direction, site, {
              ...record,
              radius: 1.75,
            }).points;
            guide[12] = add(site.impact, { x: 0, y: 2, z: 0 });
            validationStats.preflightChecks++;
            // 中央折线处在真实厚片内部；只用于快速拒绝，绝不替代140个格子的验收。
            if (!pathClear(guide, 0, { kind: "lava", site, clearance: 0 }))
              continue;
            const sheet = createTitanLavaSheet(mouth, direction, site, record);
            if (validateSheet(sheet, site)) {
              fitted = { ...record, sheet };
              break;
            }
          }
          if (fitted) break;
        }
        if (fitted) {
          // 先保留已验证的完整熔流，再在同一落点/弧高扩宽；失败不丢掉原本可用的面积。
          // 中央轨迹与嘴口不随宽度改变，只需复核扩宽后全部实体格；仍守住既有尝试预算。
          for (const factor of BERMUDA_TITAN_HAZARDS.sheetExpansionFactors) {
            if (
              validationStats.attempts >=
              BERMUDA_TITAN_HAZARDS.maxSheetFitAttempts
            )
              break;
            const expanded = { ...fitted, width: fitted.width * factor },
              sheet = createTitanLavaSheet(mouth, direction, site, expanded);
            validationStats.attempts++;
            if (validateSheet(sheet, site)) {
              fitted = { ...expanded, sheet };
              break;
            }
          }
          chosen.push(fitted);
          serial++;
          if (site.sector === "north" || site.sector === "south")
            sector ||= site.sector;
        }
      } else {
        const normal = unit(site.normal || { x: 0, y: 1, z: 0 }),
          radius = 2.3 + random() * 0.7,
          end = add(site.impact, scale(normal, radius + 0.15)),
          start = {
            x: end.x,
            y: site.roof?.y - radius - 0.5,
            z: end.z,
          };
        if (
          !Number.isFinite(start.y) ||
          start.y < end.y + 12 ||
          !pathClear([start, end], radius, { kind, site, clearance: 0.25 })
        )
          continue;
        chosen.push({ site, start, end, radius });
        if (site.sector === "north" || site.sector === "south")
          sector ||= site.sector;
      }
    }
    if (kind === "lava" && chosen.length) {
      // 原完整扇面保底；按已打乱的落点逐轮试洞室宽度，不能被首个窄落点锁死。
      const original = chosen[0],
        occupied = occupiedSectors[0] || null,
        target = BERMUDA_TITAN_HAZARDS.sheetRoomWidth;
      for (const { site } of remaining) {
        if (lavaCandidates.length >= BERMUDA_TITAN_HAZARDS.maxRoomFitSites)
          break;
        if (
          lavaCandidates.includes(site) ||
          !legalSheetTarget(mouth, direction, site) ||
          (occupied &&
            site.sector &&
            site.sector !== occupied &&
            ["north", "south"].includes(site.sector)) ||
          (pools.length >= BERMUDA_TITAN_HAZARDS.maxPools &&
            !pools.some((p) => p.siteId === site.id))
        )
          continue;
        lavaCandidates.push(site);
      }
      const checkedSites = new Set(
          lavaCandidates.slice(0, validationStats.candidates),
        ),
        guides = new Map();
      let broad = original;
      roomFit: for (const width of [target, target * 0.85]) {
        if (width <= broad.width) break;
        for (const site of lavaCandidates)
          for (const lift of [20]) {
            if (
              validationStats.attempts >=
              BERMUDA_TITAN_HAZARDS.maxSheetFitAttempts
            )
              break roomFit;
            checkedSites.add(site);
            validationStats.candidates = checkedSites.size;
            const record = { ...original, site, lift, width },
              guideKey = `${site.id}/${lift}`;
            validationStats.attempts++;
            if (!guides.has(guideKey)) {
              const guide = createTitanLavaPath(mouth, direction, site, {
                ...record,
                radius: 1.75,
              }).points;
              guide[12] = add(site.impact, { x: 0, y: 2, z: 0 });
              validationStats.preflightChecks++;
              guides.set(
                guideKey,
                pathClear(guide, 0, { kind: "lava", site, clearance: 0 }),
              );
            }
            if (!guides.get(guideKey)) continue;
            const sheet = createTitanLavaSheet(mouth, direction, site, record);
            // 喷流与圆角熔池都完整可落，避免宽喷流碰地后因残留体被遮挡而整滩消失。
            if (
              validateSheet(sheet, site) &&
              validateSheet(
                createTitanLavaPool(sheet, { floorAt: site.floorAt }),
                site,
              )
            ) {
              broad = { ...record, sheet };
              break roomFit;
            }
          }
      }
      chosen[0] = broad;
    }
    return chosen;
  }
  function reset(nextSeed = seed) {
    randomState = nextSeed >>> 0;
    locked = [];
    cycleKey = null;
    validationKey = null;
    visibleSheets = [];
    transportClock = 0;
    streams = [];
    pools = [];
    startedSources.clear();
    serial = 0;
    rocks = [];
    rockRemaining = 7;
    hitRemaining = 0;
    lastEmission = false;
    terminalTime = 0;
    terminalAnchor = null;
    snapshot = {
      clock: 0,
      awake: false,
      lava: {
        phase: "off",
        lifecycle: "idle",
        emitting: false,
        progress: 0,
        remaining: 0,
        paths: [],
        sheets: [],
        warningSheets: [],
        pools: [],
      },
      rocks: [],
      terminal: { active: false, progress: 0 },
    };
  }
  reset();
  return {
    get snapshot() {
      return snapshot;
    },
    reset,
    step(
      dt,
      {
        active = true,
        state,
        mouth,
        direction,
        position,
        previous = position,
        body = {},
      } = {},
    ) {
      if (!active || !state || !mouth || !direction) return [];
      if (state.entombed) {
        terminalAnchor ||= terminalContext(position);
        snapshot = {
          clock: state.clock,
          awake: true,
          lava: {
            phase: "off",
            progress: 0,
            remaining: 0,
            paths: [],
            sheets: [],
            warningSheets: [],
            pools: [],
            emitting: false,
            lifecycle: "idle",
          },
          rocks: [],
          terminal: {
            active: true,
            progress: terminalTime / BERMUDA_TITAN_HAZARDS.terminalDuration,
            ...terminalAnchor,
          },
        };
        return [];
      }
      if (state.secured) {
        snapshot = {
          ...snapshot,
          lava: {
            ...snapshot.lava,
            phase: "off",
            lifecycle: "idle",
            emitting: false,
            paths: [],
            sheets: [],
            warningSheets: [],
            pools: [],
          },
          rocks: [],
        };
        return [];
      }
      const delta = Math.max(0, Number.isFinite(dt) ? dt : 0),
        awake = !!state.relicHeld,
        events = [],
        warning = state.phase === "charging",
        emitting = state.phase === "breath",
        key = `${state.hazardSeed}/${state.cycles}/${awake}`;
      transportClock += delta;
      hitRemaining = Math.max(0, hitRemaining - delta);
      let freshSelection = false;
      if ((warning || emitting) && cycleKey !== key) {
        validationStats = {
          attempts: 0,
          candidates: 0,
          cellChecks: 0,
          preflightChecks: 0,
          rejectedCells: [],
        };
        locked = choose(mouth, direction, awake, "lava", position);
        cycleKey = key;
        validationKey = null;
        freshSelection = true;
      }
      let paths = [];
      if (warning || emitting) {
        const poseKey = [
          key,
          state.phase,
          Math.round((state.guardAmount || 0) * 20),
          Math.round((state.awareness || 0) * 20),
          clearanceVersion(),
          Math.round(mouth.x * 4),
          Math.round(mouth.y * 4),
          Math.round(mouth.z * 4),
        ].join("/");
        if (validationKey !== poseKey) {
          visibleSheets = [];
          for (const record of locked) {
            const sheet = freshSelection
              ? record.sheet
              : createTitanLavaSheet(mouth, direction, record.site, record);
            if (freshSelection || validateSheet(sheet, record.site)) {
              record.sheet = sheet;
              visibleSheets.push(sheet);
            }
          }
          validationKey = poseKey;
        } else {
          visibleSheets = visibleSheets.filter((sheet) => {
            if (!reanchorSheet(sheet, mouth) || !cellClear) return true;
            return sheet.cells
              .filter((cell) => cell.row < 2)
              .every((cell) =>
                cellClear(cell, { kind: "lava", originGrace: cell.nearMouth }),
              );
          });
        }
        paths = visibleSheets;
      }
      const activeEmission = emitting && paths.length > 0;
      if (activeEmission && !lastEmission)
        events.push({ kind: "breath_pulse", patternId: "lava_salvo" });
      lastEmission = activeEmission;
      const liveIds = new Set();
      if (activeEmission)
        for (const sheet of paths) {
          liveIds.add(sheet.id);
          let stream = streams.find(
            (r) => r.id === sheet.id && r.stopTime === null && !r.blocked,
          );
          if (!stream) {
            stream = {
              id: sheet.id,
              sheet,
              startTime:
                transportClock -
                (startedSources.has(sheet.id)
                  ? 0
                  : Math.max(
                      0,
                      (state.phaseDuration || 0) - (state.remaining || 0),
                    )),
              stopTime: null,
              blocked: false,
            };
            streams.push(stream);
            startedSources.add(sheet.id);
          }
          stream.sheet = sheet;
        }
      for (const stream of streams)
        if (!liveIds.has(stream.id) && stream.stopTime === null)
          stream.stopTime = transportClock;
      const actualSheets = [];
      for (const stream of streams) {
        if (stream.blocked) continue;
        const elapsed = transportClock - stream.startTime,
          tailAge =
            stream.stopTime === null ? 0 : transportClock - stream.stopTime,
          front = clamp(elapsed / BERMUDA_TITAN_HAZARDS.lavaTravel),
          tail = clamp(tailAge / BERMUDA_TITAN_HAZARDS.lavaTail),
          geometry = sliceTitanLavaSheet(
            stream.sheet,
            flightRow(stream.sheet, tail),
            flightRow(stream.sheet, front),
          );
        if (!geometry) continue;
        const connected = stream.stopTime === null;
        geometry.flow = {
          from: tail,
          to: front,
          headProgress: front,
          tailProgress: tail,
          connectedToMouth: connected,
        };
        // 原完整包络已验证；活动源只需复查新切面，断流后则检查实际剩余尾段，绝不隔墙留伤害。
        const checks = connected
          ? geometry.cells.filter(
              (c) => c.gridRow === 0 || c.gridRow === geometry.rows - 2,
            )
          : geometry.cells;
        if (
          cellClear &&
          !checks.every((cell) =>
            cellClear(cell, { kind: "lava", originGrace: cell.nearMouth }),
          )
        ) {
          stream.blocked = true;
          continue;
        }
        actualSheets.push(geometry);
        if (front >= 1 - 1e-8) {
          let pool = pools.find((p) => p.siteId === stream.sheet.siteId);
          if (!pool && pools.length < BERMUDA_TITAN_HAZARDS.maxPools) {
            pool = {
              id: `pool_${stream.id}`,
              siteId: stream.sheet.siteId,
              sector: stream.sheet.sector,
              sheet: stream.sheet,
              floorAt: getSites().find(
                (site) => site.id === stream.sheet.siteId,
              )?.floorAt,
              coverKey: null,
              coverSheet: null,
              coverClear: true,
              feedUntil: transportClock,
              temperature: 1,
            };
            pools.push(pool);
          }
          if (pool) {
            pool.sheet = stream.sheet;
            pool.feedUntil =
              stream.stopTime === null
                ? Infinity
                : stream.stopTime + BERMUDA_TITAN_HAZARDS.lavaTail;
          }
        }
      }
      // 达到最后一个落地时刻后才开始降温；同一地滩接收新熔流时重新升温，不无界叠加。
      for (const pool of pools) {
        const source = streams.find(
          (r) =>
            r.sheet.siteId === pool.siteId && !r.blocked && r.stopTime === null,
        );
        if (source) pool.feedUntil = Infinity;
        else if (!Number.isFinite(pool.feedUntil)) {
          const stopped = streams.filter(
            (r) =>
              r.sheet.siteId === pool.siteId &&
              !r.blocked &&
              r.stopTime !== null,
          );
          pool.feedUntil = stopped.length
            ? Math.max(
                ...stopped.map(
                  (r) => r.stopTime + BERMUDA_TITAN_HAZARDS.lavaTail,
                ),
              )
            : transportClock;
        }
        pool.age = Math.max(0, transportClock - pool.feedUntil);
        pool.temperature = clamp(
          1 - pool.age / BERMUDA_TITAN_HAZARDS.poolCooling,
        );
      }
      pools = pools.filter((p) => p.temperature > 1e-6);
      streams = streams.filter(
        (r) =>
          !r.blocked &&
          (r.stopTime === null ||
            transportClock - r.stopTime <
              BERMUDA_TITAN_HAZARDS.lavaTail - 1e-8),
      );
      const poolCoverKey = [
        clearanceVersion(),
        state.phase,
        state.guardAmount || 0,
        state.awareness || 0,
      ].join("/");
      const poolSnapshot = pools
        .map((pool) => {
          // 热态池验收覆盖后续所有冷却子体积，沿用真实世界/姿态版本；不逐帧重扫静态岩体。
          if (
            cellClear &&
            (pool.coverKey !== poolCoverKey || pool.coverSheet !== pool.sheet)
          ) {
            const hot = createTitanLavaPool(pool.sheet, {
              temperature: 1,
              id: pool.id,
              floorAt: pool.floorAt,
            });
            pool.coverClear = hot.cells.every((cell) =>
              cellClear(cell, { kind: "lava", originGrace: false }),
            );
            pool.coverKey = poolCoverKey;
            pool.coverSheet = pool.sheet;
          }
          return {
            id: pool.id,
            siteId: pool.siteId,
            sector: pool.sector,
            geometry: createTitanLavaPool(pool.sheet, {
              temperature: pool.temperature,
              id: pool.id,
              floorAt: pool.floorAt,
            }),
            temperature: pool.temperature,
            opacity:
              pool.temperature * pool.temperature * (3 - 2 * pool.temperature),
            age: pool.age,
            remaining: Math.max(
              0,
              BERMUDA_TITAN_HAZARDS.poolCooling - pool.age,
            ),
            feeding: transportClock < pool.feedUntil - 1e-8,
            harmful: pool.temperature > BERMUDA_TITAN_HAZARDS.poolHotThreshold,
            coverClear: pool.coverClear,
          };
        })
        .filter((pool) => pool.coverClear);

      rockRemaining -= delta;
      if (
        rockRemaining <= 0 &&
        rocks.length <= BERMUDA_TITAN_HAZARDS.maxRocks - 2
      ) {
        for (const selected of choose(
          mouth,
          direction,
          awake,
          "rock",
          position,
        )) {
          const duration = awake
            ? BERMUDA_TITAN_HAZARDS.rockWarningAwake
            : BERMUDA_TITAN_HAZARDS.rockWarningSleeping;
          rocks.push({
            ...selected,
            id: `rock_${serial++}`,
            phase: "warning",
            remaining: duration,
            duration,
            progress: 0,
            position: copy(selected.start),
            previous: copy(selected.start),
            fresh: true,
          });
        }
        rockRemaining = awake ? 2.4 + random() * 1.2 : 7 + random() * 3;
      }
      let rockContact = false;
      for (const rock of rocks) {
        rock.previous = copy(rock.position);
        if (rock.fresh) {
          rock.fresh = false;
          continue;
        }
        rock.remaining = Math.max(
          0,
          rock.remaining -
            (rock.phase === "warning" ? Math.min(delta, 0.25) : delta),
        );
        rock.progress = clamp(1 - rock.remaining / rock.duration);
        if (rock.phase === "falling") {
          rock.position = add(
            rock.start,
            scale(sub(rock.end, rock.start), rock.progress),
          );
          if (
            position &&
            titanFallingRockContact(rock, previous, position, body)
          )
            rockContact = true;
        }
        if (rock.remaining <= 1e-9) {
          if (rock.phase === "warning") {
            rock.phase = "falling";
            rock.duration = Math.max(
              1.6,
              Math.min(3.8, distance(rock.start, rock.end) / (awake ? 45 : 38)),
            );
            rock.remaining = rock.duration;
            rock.progress = 0;
          } else if (rock.phase === "falling") {
            rock.phase = "impact";
            rock.duration = BERMUDA_TITAN_HAZARDS.rockImpactDuration;
            rock.remaining = rock.duration;
            rock.progress = 0;
          }
        }
      }
      rocks = rocks.filter((r) => r.phase !== "impact" || r.remaining > 1e-9);
      if (hitRemaining <= 1e-9 && position) {
        const source = titanLavaContact(
          [
            ...actualSheets,
            ...poolSnapshot.filter((p) => p.harmful).map((p) => p.geometry),
          ],
          previous,
          position,
          body,
          coverBetween,
        )
          ? "lava"
          : rockContact
            ? "rock"
            : null;
        if (source) {
          hitRemaining = BERMUDA_TITAN_HAZARDS.hitInterval;
          events.push({
            kind: "hazard_hit",
            source,
            damage:
              source === "lava"
                ? BERMUDA_TITAN_HAZARDS.lavaDamage
                : BERMUDA_TITAN_HAZARDS.rockDamage,
          });
        }
      }
      snapshot = {
        clock: state.clock,
        awake,
        lava: {
          phase: warning
            ? "warning"
            : emitting || actualSheets.length
              ? "active"
              : poolSnapshot.length
                ? "cooling"
                : "off",
          lifecycle: warning
            ? "charging"
            : activeEmission
              ? actualSheets.some((s) => s.flow.to < 1)
                ? "advancing"
                : "flowing"
              : actualSheets.length
                ? "draining"
                : poolSnapshot.length
                  ? "cooling"
                  : "idle",
          emitting: activeEmission,
          warningSheets: warning ? paths : [],
          pools: poolSnapshot,
          progress: clamp(1 - state.remaining / state.phaseDuration),
          remaining: state.remaining,
          paths: actualSheets,
          sheets: actualSheets,
          validation: {
            ...validationStats,
            rejectedCells: [...validationStats.rejectedCells],
          },
        },
        rocks: rocks.map((r) => ({
          id: r.id,
          phase: r.phase,
          warningPoint: copy(r.site.impact),
          warningNormal: unit(r.site.normal || { x: 0, y: 1, z: 0 }),
          previous: copy(r.previous),
          position: copy(r.position),
          radius: r.radius,
          progress: r.progress,
        })),
        terminal: { active: false, progress: 0 },
      };
      return events;
    },
    presentTerminal(dt) {
      if (!snapshot.terminal.active) return;
      terminalTime = Math.min(
        BERMUDA_TITAN_HAZARDS.terminalDuration,
        terminalTime + Math.max(0, Number.isFinite(dt) ? dt : 0),
      );
      snapshot = {
        ...snapshot,
        terminal: {
          ...snapshot.terminal,
          active: true,
          progress: terminalTime / BERMUDA_TITAN_HAZARDS.terminalDuration,
        },
      };
    },
  };
}
