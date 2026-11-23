import * as THREE from "three";
import {
  BERMUDA_CAVE_SITES,
  BERMUDA_TITAN_ENTRY_TERRAIN as ENTRY,
  BERMUDA_TITAN_ENTRANCE as ENTRANCE,
  BERMUDA_TITAN_NAVIGATION,
  BERMUDA_TITAN_REAR_ANNEX,
  BERMUDA_TITAN_ESCAPE_ROUTES,
  BERMUDA_TITAN_PARTITIONS,
  BERMUDA_TITAN_BRANCHES,
} from "./bermuda_cave_config.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { acquireMarianaFossilAsset } from "./mariana_fossil_asset.js";
import { acquireBermudaGeologyAsset } from "./bermuda_geology_asset.js";
import { acquireHawaiiReefAsset } from "./hawaii_reef_asset.js";
import { acquireBermudaTitanBoneAsset } from "./bermuda_titan_bone_asset.js";
import { sceneryFootSamples, seatUprightScenery } from "./scenery_grounding.js";
import {
  bodyOffsets,
  castBodySegment,
  castSegment,
  bodyRadius,
} from "./collision.js";
import {
  queryStaticColliders,
  createStaticColliderGrid,
} from "./static_collider_grid.js";
import { bodyTerrainFloor } from "./terrain_contact.js";

const UP = new THREE.Vector3(0, 1, 0);
const smooth = (t) => {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
};

function shellCavitySamples(
  grids,
  {
    rows,
    columns,
    heightAt,
    skipCell = () => false,
    inwardWinding = 1,
    refineTriangles = false,
  },
) {
  const samples = [];
  // 使用真正内侧三角面的法线留出空水边界，厚岩唇不能靠整块凸包越过凹面。
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < columns; i++) {
      if (skipCell(j, i)) continue;
      const a = grids[1][j][i],
        b = grids[1][j][i + 1],
        c = grids[1][j + 1][i],
        d = grids[1][j + 1][i + 1];
      for (const triangle of [
        [a, c, b],
        [b, c, d],
      ]) {
        const normal = new THREE.Vector3()
            .crossVectors(
              triangle[1].clone().sub(triangle[0]),
              triangle[2].clone().sub(triangle[0]),
            )
            .normalize()
            .multiplyScalar(inwardWinding),
          p = triangle[0]
            .clone()
            .add(triangle[1])
            .add(triangle[2])
            .multiplyScalar(1 / 3)
            .addScaledVector(normal, 1.6);
        if (normal.lengthSq() > 0.5 && p.y > heightAt(p.x, p.z) + 0.3)
          samples.push(p);
      }
    }
  return samples;
}

/** 用真实焊接三角面截断留水射线；窄凹角后面的岩石不能误作空水。 */
function actualRockWaterSegments(geometry, heightAt) {
  const cells = new Map(),
    faces = [],
    cellSize = 20,
    position = geometry.attributes.position,
    index = geometry.index,
    ray = new THREE.Ray(),
    hitPoint = new THREE.Vector3();
  function eachCell(a, b, fn) {
    for (
      let x = Math.floor(Math.min(a.x, b.x) / cellSize);
      x <= Math.floor(Math.max(a.x, b.x) / cellSize);
      x++
    )
      for (
        let y = Math.floor(Math.min(a.y, b.y) / cellSize);
        y <= Math.floor(Math.max(a.y, b.y) / cellSize);
        y++
      )
        for (
          let z = Math.floor(Math.min(a.z, b.z) / cellSize);
          z <= Math.floor(Math.max(a.z, b.z) / cellSize);
          z++
        )
          fn(`${x}:${y}:${z}`);
  }
  for (let i = 0; i < index.count; i += 3) {
    const points = [0, 1, 2].map((j) =>
        new THREE.Vector3().fromBufferAttribute(position, index.getX(i + j)),
      ),
      normal = points[1]
        .clone()
        .sub(points[0])
        .cross(points[2].clone().sub(points[0]))
        .normalize(),
      box = new THREE.Box3().setFromPoints(points),
      face = { points, normal };
    faces.push(face);
    eachCell(box.min, box.max, (key) => {
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(face);
    });
  }
  const samples = [];
  for (const face of faces) {
    const centre = face.points[0]
        .clone()
        .add(face.points[1])
        .add(face.points[2])
        .multiplyScalar(1 / 3),
      normal = face.normal;
    if (centre.y < heightAt(centre.x, centre.z) + 3 || normal.lengthSq() < 0.5)
      continue;
    const origin = centre.clone().addScaledVector(normal, 0.002),
      end = centre.clone().addScaledVector(normal, 12),
      candidates = new Set();
    eachCell(origin, end, (key) => {
      for (const candidate of cells.get(key) || []) candidates.add(candidate);
    });
    ray.set(origin, normal);
    let distance = Infinity,
      first = null;
    for (const candidate of candidates) {
      if (candidate === face) continue;
      if (!ray.intersectTriangle(...candidate.points, false, hitPoint))
        continue;
      const d = hitPoint.distanceTo(origin);
      if (d < distance && d > 1e-6) {
        distance = d;
        first = candidate;
      }
    }
    if (first && first.normal.dot(normal) > 0) continue;
    const length = Math.min(12, distance - 0.08 + 0.002);
    if (length <= 1.25) continue;
    const sample = centre.clone().addScaledVector(normal, 1.25);
    sample.cavityEnd = centre.clone().addScaledVector(normal, length);
    sample.waterMin = new THREE.Vector3().copy(sample).min(sample.cavityEnd);
    sample.waterMax = new THREE.Vector3().copy(sample).max(sample.cavityEnd);
    samples.push(sample);
  }
  // 参数格的直连厚度在接枝凹角会跨过真实水体。只裁掉已细分、经真实封闭面证明不在岩中的碎片。
  samples.isSolid = (p) => {
    if (p.y <= heightAt(p.x, p.z) + 0.1) return true;
    const end = new THREE.Vector3(p.x, 0, p.z),
      candidates = new Set();
    eachCell(p, end, (key) => {
      for (const candidate of cells.get(key) || []) candidates.add(candidate);
    });
    ray.set(p, new THREE.Vector3(0, 1, 0));
    let distance = Infinity,
      first = null;
    for (const candidate of candidates) {
      if (!ray.intersectTriangle(...candidate.points, false, hitPoint))
        continue;
      const d = hitPoint.distanceTo(p);
      if (d < distance && d > 1e-5) {
        distance = d;
        first = candidate;
      }
    }
    return !!first && first.normal.y > 0;
  };
  return samples;
}

/** 岩壳实体填满内外层之间的真实材料，避开内面外1.6米的水体。 */
function shellGridContacts(
  grids,
  {
    rows,
    columns,
    heightAt,
    idPrefix,
    stepU = 2,
    stepV = 2,
    skipCell = () => false,
    extraCavitySamples = [],
    inwardWinding = 1,
    refineTriangles = false,
    waterSamples = null,
  },
) {
  const contacts = [],
    point = new THREE.Vector3(),
    cavitySamples = waterSamples || [
      ...extraCavitySamples,
      ...shellCavitySamples(grids, {
        rows,
        columns,
        heightAt,
        skipCell,
        inwardWinding,
        refineTriangles,
      }),
    ];
  const waterCells = waterSamples ? new Map() : null,
    waterCellSize = 20,
    // 留水证明也计入窄射线的半径和接触皮肤，不能让擦边凸包漏过细分。
    waterClearance = waterSamples ? 0.05 : 0;
  function eachWaterCell(min, max, fn) {
    for (
      let x = Math.floor(min.x / waterCellSize);
      x <= Math.floor(max.x / waterCellSize);
      x++
    )
      for (
        let y = Math.floor(min.y / waterCellSize);
        y <= Math.floor(max.y / waterCellSize);
        y++
      )
        for (
          let z = Math.floor(min.z / waterCellSize);
          z <= Math.floor(max.z / waterCellSize);
          z++
        )
          fn(`${x}:${y}:${z}`);
  }
  if (waterCells)
    for (const sample of cavitySamples)
      eachWaterCell(
        sample.waterMin || sample,
        sample.waterMax || sample,
        (key) => {
          if (!waterCells.has(key)) waterCells.set(key, []);
          waterCells.get(key).push(sample);
        },
      );
  const queryMin = new THREE.Vector3(),
    queryMax = new THREE.Vector3();
  function nearbyWater(center, ex, ey, ez) {
    if (!waterCells) return cavitySamples;
    queryMin.set(center.x - ex, center.y - ey, center.z - ez);
    queryMax.set(center.x + ex, center.y + ey, center.z + ez);
    const found = new Set();
    eachWaterCell(queryMin, queryMax, (key) => {
      for (const sample of waterCells.get(key) || []) found.add(sample);
    });
    return found;
  }
  const localEnd = new THREE.Vector3();
  function entersWater(sample, center, back, halfSize) {
    point.copy(sample).sub(center).applyQuaternion(back);
    if (!sample.cavityEnd)
      return (
        Math.abs(point.x) < halfSize.x &&
        Math.abs(point.y) < halfSize.y &&
        Math.abs(point.z) < halfSize.z
      );
    localEnd.copy(sample.cavityEnd).sub(center).applyQuaternion(back);
    let low = 0,
      high = 1;
    for (const axis of ["x", "y", "z"]) {
      const delta = localEnd[axis] - point[axis],
        half = halfSize[axis] + waterClearance;
      if (Math.abs(delta) < 1e-9) {
        if (Math.abs(point[axis]) >= half) return false;
        continue;
      }
      const a = (-half - point[axis]) / delta,
        b = (half - point[axis]) / delta;
      low = Math.max(low, Math.min(a, b));
      high = Math.min(high, Math.max(a, b));
      if (low >= high) return false;
    }
    return high > 0 && low < 1;
  }
  let shellSequence = 0;
  function fillTriangle(inner, outer, depth = 0) {
    const along = inner[1].clone().sub(inner[0]).normalize(),
      normal = inner[1]
        .clone()
        .sub(inner[0])
        .cross(inner[2].clone().sub(inner[0]))
        .normalize(),
      across = along.clone().cross(normal).normalize(),
      rotation = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(along, normal, across),
      ),
      back = rotation.clone().invert(),
      bounds = new THREE.Box3();
    for (const p of [...inner, ...outer])
      bounds.expandByPoint(p.clone().applyQuaternion(back));
    const center = bounds
        .getCenter(new THREE.Vector3())
        .applyQuaternion(rotation),
      halfSize = bounds
        .getSize(new THREE.Vector3())
        .multiplyScalar(0.5)
        .addScalar(waterSamples ? 0.02 : 0.06),
      maxDistance = halfSize.length() + waterClearance;
    let intrudes = false;
    for (const p of nearbyWater(
      center,
      maxDistance,
      maxDistance,
      maxDistance,
    )) {
      if (p.waterMin) {
        if (
          p.waterMin.x > center.x + maxDistance ||
          p.waterMax.x < center.x - maxDistance ||
          p.waterMin.y > center.y + maxDistance ||
          p.waterMax.y < center.y - maxDistance ||
          p.waterMin.z > center.z + maxDistance ||
          p.waterMax.z < center.z - maxDistance
        )
          continue;
      } else if (p.distanceToSquared(center) > maxDistance * maxDistance)
        continue;
      if (entersWater(p, center, back, halfSize)) {
        intrudes = true;
        break;
      }
    }
    if (intrudes && depth < 12) {
      let longest = 0;
      for (let i = 1; i < 3; i++)
        if (
          inner[i].distanceToSquared(inner[(i + 1) % 3]) >
          inner[longest].distanceToSquared(inner[(longest + 1) % 3])
        )
          longest = i;
      const a = longest,
        b = (a + 1) % 3,
        c = (a + 2) % 3,
        mi = inner[a].clone().add(inner[b]).multiplyScalar(0.5),
        mo = outer[a].clone().add(outer[b]).multiplyScalar(0.5);
      fillTriangle(
        [inner[a], mi, inner[c]],
        [outer[a], mo, outer[c]],
        depth + 1,
      );
      fillTriangle(
        [mi, inner[b], inner[c]],
        [mo, outer[b], outer[c]],
        depth + 1,
      );
      return;
    }
    // 到达细分预算仍穿过已由真实闭合岩面证明的空水时，不能把凸包残片当实体。
    // 后续 fillUncoveredRockFaces 会独立补齐真实可见岩面，保留边界覆盖。
    if (intrudes && waterSamples) return;
    if (waterSamples?.isSolid && !waterSamples.isSolid(center)) return;
    contacts.push({
      id: `${idPrefix}${shellSequence++}`,
      type: "box",
      x: center.x,
      y: center.y,
      z: center.z,
      halfSize,
      rotation,
    });
  }
  function materialPoint(j, i, s) {
    return grids[1][j][i].clone().lerp(grids[0][j][i], s);
  }
  function fillPatch(j, j1, i, i1, s0, s1, depth = 0) {
    const middle = (s0 + s1) / 2,
      across = materialPoint(j, i1, middle)
        .sub(materialPoint(j, i, middle))
        .add(materialPoint(j1, i1, middle).sub(materialPoint(j1, i, middle)))
        .normalize(),
      along = materialPoint(j1, i, middle)
        .sub(materialPoint(j, i, middle))
        .add(materialPoint(j1, i1, middle).sub(materialPoint(j, i1, middle)))
        .normalize(),
      normal = new THREE.Vector3().crossVectors(across, along).normalize(),
      zAxis = new THREE.Vector3().crossVectors(across, normal).normalize(),
      rotation = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(across, normal, zAxis),
      ),
      back = rotation.clone().invert(),
      bounds = new THREE.Box3();
    let thickness = 0;
    for (let u = j; u <= j1; u++)
      for (let v = i; v <= i1; v++) {
        const a = materialPoint(u, v, s0),
          b = materialPoint(u, v, s1);
        thickness = Math.max(thickness, a.distanceTo(b));
        bounds.expandByPoint(a.applyQuaternion(back));
        bounds.expandByPoint(b.applyQuaternion(back));
      }
    const center = bounds
        .getCenter(new THREE.Vector3())
        .applyQuaternion(rotation),
      halfSize = bounds
        .getSize(new THREE.Vector3())
        .multiplyScalar(0.5)
        .addScalar(waterSamples ? 0.02 : 0.06),
      basis = new THREE.Matrix4().makeRotationFromQuaternion(rotation).elements,
      ex =
        Math.abs(basis[0]) * halfSize.x +
        Math.abs(basis[4]) * halfSize.y +
        Math.abs(basis[8]) * halfSize.z +
        waterClearance,
      ey =
        Math.abs(basis[1]) * halfSize.x +
        Math.abs(basis[5]) * halfSize.y +
        Math.abs(basis[9]) * halfSize.z +
        waterClearance,
      ez =
        Math.abs(basis[2]) * halfSize.x +
        Math.abs(basis[6]) * halfSize.y +
        Math.abs(basis[10]) * halfSize.z +
        waterClearance;
    // 接枝唇缘的四边格会弯折；即使中心留水线未命中，也按真实三角材料细分。
    let intrudes =
      refineTriangles && (skipCell(j, i1) || skipCell(Math.max(j, j1 - 1), i1));
    for (const p of nearbyWater(center, ex, ey, ez)) {
      if (
        (p.waterMin?.x ?? p.x) > center.x + ex ||
        (p.waterMax?.x ?? p.x) < center.x - ex ||
        (p.waterMin?.y ?? p.y) > center.y + ey ||
        (p.waterMax?.y ?? p.y) < center.y - ey ||
        (p.waterMin?.z ?? p.z) > center.z + ez ||
        (p.waterMax?.z ?? p.z) < center.z - ez
      )
        continue;
      if (entersWater(p, center, back, halfSize)) {
        intrudes = true;
        break;
      }
    }
    if (intrudes && depth < 12) {
      if (thickness > 3.5) {
        const middle = (s0 + s1) / 2;
        fillPatch(j, j1, i, i1, s0, middle, depth + 1);
        fillPatch(j, j1, i, i1, middle, s1, depth + 1);
        return;
      }
      if (j1 - j > 1) {
        const split = Math.floor((j + j1) / 2);
        fillPatch(j, split, i, i1, s0, s1, depth + 1);
        fillPatch(split, j1, i, i1, s0, s1, depth + 1);
        return;
      }
      if (i1 - i > 1) {
        const split = Math.floor((i + i1) / 2);
        fillPatch(j, j1, i, split, s0, s1, depth + 1);
        fillPatch(j, j1, split, i1, s0, s1, depth + 1);
        return;
      }
    }
    if (intrudes && refineTriangles && j1 - j === 1 && i1 - i === 1) {
      for (const triangle of [
        [
          [j, i],
          [j1, i],
          [j, i1],
        ],
        [
          [j, i1],
          [j1, i],
          [j1, i1],
        ],
      ])
        fillTriangle(
          triangle.map(([u, v]) => materialPoint(u, v, s0)),
          triangle.map(([u, v]) => materialPoint(u, v, s1)),
        );
      return;
    }
    if (waterSamples?.isSolid && !waterSamples.isSolid(center)) return;
    const id = `${idPrefix}${shellSequence++}`;
    contacts.push({
      id,
      type: "box",
      x: center.x,
      y: center.y,
      z: center.z,
      halfSize,
      rotation,
    });
  }
  for (let j = 0; j < rows; j += stepU)
    for (let i = 0; i < columns; i += stepV)
      if (!skipCell(j, i))
        fillPatch(
          j,
          Math.min(rows, j + stepU),
          i,
          Math.min(columns, i + stepV),
          0,
          1,
        );
  return contacts;
}

/** 真实材料裁剪后只补齐遗漏的可见边界；厚岩内部仍由实体格覆盖。 */
function fillUncoveredRockFaces(
  geometry,
  contacts,
  heightAt,
  idPrefix = "kaiju_lair_shell_surface_",
) {
  const grid = createStaticColliderGrid(contacts, { cellSize: 20 }),
    output = [],
    position = geometry.attributes.position,
    index = geometry.index;
  function patch(points) {
    let longest = 0;
    for (let i = 1; i < 3; i++)
      if (
        points[i].distanceToSquared(points[(i + 1) % 3]) >
        points[longest].distanceToSquared(points[(longest + 1) % 3])
      )
        longest = i;
    const a = longest,
      b = (a + 1) % 3,
      c = (a + 2) % 3;
    if (points[a].distanceTo(points[b]) > 2.5) {
      const middle = points[a].clone().add(points[b]).multiplyScalar(0.5);
      patch([points[a], middle, points[c]]);
      patch([middle, points[b], points[c]]);
      return;
    }
    const along = points[1].clone().sub(points[0]).normalize(),
      normal = points[1]
        .clone()
        .sub(points[0])
        .cross(points[2].clone().sub(points[0]))
        .normalize(),
      rotation = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(
          along,
          normal,
          along.clone().cross(normal).normalize(),
        ),
      ),
      back = rotation.clone().invert(),
      bounds = new THREE.Box3();
    for (const p of points) {
      bounds.expandByPoint(p.clone().applyQuaternion(back));
      bounds.expandByPoint(
        p.clone().addScaledVector(normal, -0.3).applyQuaternion(back),
      );
    }
    const centre = bounds
      .getCenter(new THREE.Vector3())
      .applyQuaternion(rotation);
    output.push({
      id: `${idPrefix}${output.length}`,
      type: "box",
      x: centre.x,
      y: centre.y,
      z: centre.z,
      halfSize: bounds
        .getSize(new THREE.Vector3())
        .multiplyScalar(0.5)
        .addScalar(0.025),
      rotation,
    });
  }
  for (let i = 0; i < index.count; i += 3) {
    const points = [0, 1, 2].map((j) =>
        new THREE.Vector3().fromBufferAttribute(position, index.getX(i + j)),
      ),
      centre = points[0]
        .clone()
        .add(points[1])
        .add(points[2])
        .multiplyScalar(1 / 3),
      normal = points[1]
        .clone()
        .sub(points[0])
        .cross(points[2].clone().sub(points[0]))
        .normalize();
    if (centre.y < heightAt(centre.x, centre.z) + 1 || normal.lengthSq() < 0.5)
      continue;
    const from = centre.clone().addScaledVector(normal, 0.04),
      to = centre.clone().addScaledVector(normal, -0.04),
      candidates = grid.query(from, to, { radius: 0.02 });
    if (!castSegment(from, to, candidates, 0.02)) patch(points);
  }
  return output;
}

/** 只按真实位置焊接接枝边界，去掉收口处零面积面，重新生成连续岩面法线。 */
function weldRockGeometries(geometries) {
  const positions = [],
    colors = [],
    indices = [],
    vertices = new Map(),
    point = new THREE.Vector3(),
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (const geometry of geometries) {
    const p = geometry.attributes.position,
      color = geometry.attributes.color,
      remap = new Map(),
      index = geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const face = [];
      for (let j = 0; j < 3; j++) {
        const old = index.getX(i + j);
        if (!remap.has(old)) {
          point.fromBufferAttribute(p, old);
          const key = `${point.x.toFixed(4)}:${point.y.toFixed(4)}:${point.z.toFixed(4)}`;
          let id = vertices.get(key);
          if (id === undefined) {
            id = positions.length / 3;
            vertices.set(key, id);
            positions.push(point.x, point.y, point.z);
            colors.push(color.getX(old), color.getY(old), color.getZ(old));
          }
          remap.set(old, id);
        }
        face.push(remap.get(old));
      }
      if (new Set(face).size < 3) continue;
      a.fromArray(positions, face[0] * 3);
      b.fromArray(positions, face[1] * 3);
      c.fromArray(positions, face[2] * 3);
      if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-9) continue;
      indices.push(...face);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** 私有顶面索引不进入最低地面；只查询焊接后腔的真实三角面。 */
function gridRoofSurface(grid) {
  const cells = new Map(),
    cellSize = 20;
  for (let r = 0; r < grid.length - 1; r++)
    for (let c = 0; c < grid[0].length - 1; c++) {
      for (const p of [
        [grid[r][c], grid[r][c + 1], grid[r + 1][c]],
        [grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]],
      ]) {
        const den =
          (p[1].z - p[2].z) * (p[0].x - p[2].x) +
          (p[2].x - p[1].x) * (p[0].z - p[2].z);
        if (Math.abs(den) < 1e-8) continue;
        const triangle = { p, den },
          minX = Math.floor(Math.min(...p.map((v) => v.x)) / cellSize),
          maxX = Math.floor(Math.max(...p.map((v) => v.x)) / cellSize),
          minZ = Math.floor(Math.min(...p.map((v) => v.z)) / cellSize),
          maxZ = Math.floor(Math.max(...p.map((v) => v.z)) / cellSize);
        for (let x = minX; x <= maxX; x++)
          for (let z = minZ; z <= maxZ; z++) {
            const key = `${x}:${z}`;
            if (!cells.has(key)) cells.set(key, []);
            cells.get(key).push(triangle);
          }
      }
    }
  return (x, z) => {
    let y = null;
    for (const { p, den } of cells.get(
      `${Math.floor(x / cellSize)}:${Math.floor(z / cellSize)}`,
    ) || []) {
      const a =
          ((p[1].z - p[2].z) * (x - p[2].x) +
            (p[2].x - p[1].x) * (z - p[2].z)) /
          den,
        b =
          ((p[2].z - p[0].z) * (x - p[2].x) +
            (p[0].x - p[2].x) * (z - p[2].z)) /
          den,
        c = 1 - a - b;
      if (a >= -1e-6 && b >= -1e-6 && c >= -1e-6)
        y = Math.max(y ?? -Infinity, a * p[0].y + b * p[1].y + c * p[2].y);
    }
    return y;
  };
}

/** 后腔东端精确复用主壳拱缘；向西扩大并在暗处封顶，不留两层假墙。 */
function makeRearAnnex(mainGrids, spec, heightAt, extraCavitySamples = []) {
  const columns = spec.portalEndRow - spec.portalStartRow,
    rows = spec.rows,
    grids = [[], []],
    positions = [],
    colors = [],
    indices = [],
    capContacts = [];
  let floorMaximum = -Infinity,
    floorMinimum = Infinity;
  const axisZ = (u) =>
    u < 0.25
      ? THREE.MathUtils.lerp(spec.eastAxisZ, spec.middleAxisZ, smooth(u / 0.25))
      : THREE.MathUtils.lerp(
          spec.middleAxisZ,
          spec.westAxisZ,
          smooth((u - 0.25) / 0.75),
        );
  for (let x = spec.westX; x <= -195; x += 5)
    for (let z = -1710; z <= -1505; z += 5) {
      const y = heightAt(x, z);
      floorMaximum = Math.max(floorMaximum, y);
      floorMinimum = Math.min(floorMinimum, y);
    }
  for (let side = 0; side < 2; side++)
    for (let r = 0; r <= rows; r++) {
      const ring = [],
        u = r / rows,
        blend = smooth(u / 0.22);
      for (let c = 0; c <= columns; c++) {
        const v = c / columns,
          east = mainGrids[side][spec.portalStartRow + c][spec.portalColumn],
          p = east.clone(),
          // 只拓宽东侧接枝的成年通路；后段回到原岩壳宽度，保留北侧旧礁门水道。
          width = THREE.MathUtils.lerp(
            side ? spec.innerWidth : spec.outerWidth,
            side ? spec.farInnerWidth : spec.farOuterWidth,
            smooth((u - 0.22) / 0.25),
          );
        p.x = THREE.MathUtils.lerp(east.x, spec.westX, u);
        p.z = THREE.MathUtils.lerp(east.z, axisZ(u) + (v - 0.5) * width, blend);
        const floor = heightAt(p.x, p.z) - 0.9,
          peak =
            floorMaximum +
            spec.height * (0.92 + 0.04 * Math.sin(u * Math.PI)) -
            (side ? 10 : 0),
          y = floor + (peak - floor) * Math.pow(Math.sin(v * Math.PI), 0.72);
        p.y = r === 0 ? east.y : THREE.MathUtils.lerp(east.y, y, blend);
        if (c === 0 || c === columns) p.y = floor;
        const id = positions.length / 3;
        ring.push(p);
        positions.push(p.x, p.y, p.z);
        const color = new THREE.Color(
          side ? "#4b5d53" : "#47595f",
        ).multiplyScalar(0.82 + 0.1 * Math.sin(p.x * 0.11 + p.z * 0.04));
        color.toArray(colors, id * 3);
        if (r < rows && c < columns) {
          const b = id + 1,
            n = id + columns + 1,
            d = n + 1;
          indices.push(...(side ? [id, b, n, b, d, n] : [id, n, b, b, n, d]));
        }
      }
      grids[side].push(ring);
    }
  // 接枝两层沿不同坡床采样；外壳必须处处包住内腔，不能在展开肩部压入水体。
  const innerRoof = gridRoofSurface(grids[1]);
  for (let r = 1; r <= rows; r++)
    for (let c = 1; c < columns; c++) {
      const p = grids[0][r][c],
        roof = innerRoof(p.x, p.z);
      if (roof !== null) {
        p.y = Math.max(p.y, roof + 10);
        positions[(r * (columns + 1) + c) * 3 + 1] = p.y;
      }
    }
  const layer = (rows + 1) * (columns + 1);
  for (const c of [0, columns])
    for (let r = 0; r < rows; r++) {
      const a = r * (columns + 1) + c,
        b = a + columns + 1;
      indices.push(
        ...(c === 0
          ? [a, a + layer, b, b, a + layer, b + layer]
          : [a, b, a + layer, b, b + layer, a + layer]),
      );
    }
  const addPoint = (p) => {
      const id = positions.length / 3;
      positions.push(p.x, p.y, p.z);
      new THREE.Color("#34494d").toArray(colors, id * 3);
      return id;
    },
    inner = grids[1][rows],
    outer = grids[0][rows],
    innerIds = inner.map((_, c) => layer + rows * (columns + 1) + c),
    back = outer.map((p) => p.clone().setX(spec.westX - 10)),
    backIds = back.map(addPoint),
    centreI = addPoint(
      new THREE.Vector3(
        spec.westX,
        heightAt(spec.westX, spec.westAxisZ) - 2,
        spec.westAxisZ,
      ),
    ),
    centreO = addPoint(
      new THREE.Vector3(
        spec.westX - 10,
        heightAt(spec.westX - 10, spec.westAxisZ) - 2,
        spec.westAxisZ,
      ),
    );
  for (let c = 0; c < columns; c++) {
    const a = rows * (columns + 1) + c,
      b = a + 1;
    indices.push(
      centreI,
      innerIds[c],
      innerIds[c + 1],
      centreO,
      backIds[c + 1],
      backIds[c],
      a,
      backIds[c],
      b,
      b,
      backIds[c],
      backIds[c + 1],
    );
    const segments = Math.max(
      1,
      Math.ceil(Math.abs(outer[c + 1].y - outer[c].y) / 1.2),
    );
    for (let part = 0; part < segments; part++) {
      const a = outer[c].clone().lerp(outer[c + 1], part / segments),
        b = outer[c].clone().lerp(outer[c + 1], (part + 1) / segments),
        loZ = Math.min(a.z, b.z),
        hiZ = Math.max(a.z, b.z),
        loY =
          Math.min(heightAt(spec.westX, loZ), heightAt(spec.westX, hiZ)) - 3,
        hiY = Math.max(a.y, b.y) + 0.06;
      capContacts.push({
        id: `kaiju_lair_shell_annex_cap_${c}_${part}`,
        type: "box",
        x: spec.westX - 5,
        y: (loY + hiY) / 2,
        z: (loZ + hiZ) / 2,
        halfSize: new THREE.Vector3(
          5.02,
          (hiY - loY) / 2,
          (hiZ - loZ) / 2 + 0.04,
        ),
        rotation: new THREE.Quaternion(),
      });
    }
  }
  const bottom = [
      innerIds[0],
      centreI,
      innerIds[columns],
      rows * (columns + 1) + columns,
      backIds[columns],
      centreO,
      backIds[0],
      rows * (columns + 1),
    ],
    base = addPoint(
      new THREE.Vector3(
        spec.westX - 5,
        Math.min(...bottom.map((id) => positions[id * 3 + 1])) - 2,
        spec.westAxisZ,
      ),
    );
  for (let i = 0; i < bottom.length; i++)
    indices.push(base, bottom[i], bottom[(i + 1) % bottom.length]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const roofAt = gridRoofSurface(grids[1]),
    contacts = [...capContacts];
  return {
    ...spec,
    geometry,
    grids,
    contacts,
    capContacts,
    roofAt,
    floorMaximum,
    floorMinimum,
    axisZ,
    contains(p, margin = 0) {
      const roof = roofAt(p.x, p.z);
      return (
        roof !== null &&
        p.x > spec.westX + margin &&
        p.y > heightAt(p.x, p.z) + margin &&
        p.y < roof - margin
      );
    },
  };
}

// 两道错落的断层拱共用一张石材网格，岩鳍只长在实心外侧，不向水道悬垂。
export function createBermudaTitanEntrance(main, heightAt) {
  const geometries = [],
    contacts = [],
    layers = [];
  for (const [index, spec] of ENTRANCE.layers.entries()) {
    const { z, innerWidth, outerWidth, innerHeight, outerHeight, depth, lean } =
      spec;
    const rows = 1,
      columns = 40,
      grids = [[], []],
      positions = [],
      colors = [],
      indices = [];
    for (let side = 0; side < 2; side++)
      for (let r = 0; r <= rows; r++) {
        const ring = [],
          u = r / rows,
          worldZ = z + (u - 0.5) * depth;
        for (let c = 0; c <= columns; c++) {
          const angle = (c / columns) * Math.PI,
            sine = Math.sin(angle),
            half = (side ? innerWidth : outerWidth) / 2,
            x =
              main.x +
              half * Math.cos(angle) +
              sine * sine * (lean + 2.5 * Math.sin(angle * 3 + index)),
            floor =
              Math.min(
                ...[-0.5, 0, 0.5].map((d) => heightAt(x, z + depth * d)),
              ) - 1.2,
            fault = (center, span) =>
              Math.max(0, 1 - Math.abs(angle - center) / span),
            fins = side
              ? 0
              : sine *
                sine *
                (index === 0
                  ? 24 * fault(0.85, 0.32) + 34 * fault(1.95, 0.28)
                  : 42 * fault(2.15, 0.26) + 18 * fault(0.95, 0.25)),
            y =
              floor +
              (side ? innerHeight : outerHeight) *
                Math.pow(sine, side ? 0.68 : 0.72) *
                (side
                  ? 0.99 +
                    0.035 * Math.cos(angle * 2 + 0.4) +
                    0.025 * Math.sin(angle * 3 + index)
                  : 1 +
                    0.04 * Math.sin(angle * 3.1 + index) +
                    0.025 * Math.sin(angle * 8 + 0.6)) +
              fins,
            p = new THREE.Vector3(x, y, worldZ),
            id = positions.length / 3;
          ring.push(p);
          positions.push(p.x, p.y, p.z);
          const strata = Math.sin(p.y * 0.065 + p.x * 0.022 + index * 0.8),
            mineral = Math.pow(
              Math.max(0, Math.sin(p.y * 0.19 + p.x * 0.038)),
              8,
            );
          new THREE.Color(side ? "#455b5a" : "#60716e")
            .multiplyScalar(0.83 + 0.1 * strata + 0.1 * mineral)
            .toArray(colors, id * 3);
          if (r < rows && c < columns) {
            const b = id + 1,
              n = id + columns + 1,
              d = n + 1;
            indices.push(...(side ? [id, b, n, b, d, n] : [id, n, b, b, n, d]));
          }
        }
        grids[side].push(ring);
      }
    const innerRoof = gridRoofSurface(grids[1]);
    for (let r = 0; r <= rows; r++)
      for (let c = 1; c < columns; c++) {
        const p = grids[0][r][c],
          roof = innerRoof(p.x, p.z);
        if (roof !== null) {
          p.y = Math.max(p.y, roof + 9);
          positions[(r * (columns + 1) + c) * 3 + 1] = p.y;
        }
      }
    const layer = (rows + 1) * (columns + 1);
    for (const j of [0, rows])
      for (let c = 0; c < columns; c++) {
        const a = j * (columns + 1) + c,
          b = a + 1;
        indices.push(
          ...(j === 0
            ? [a, a + layer, b, b, a + layer, b + layer]
            : [a, b, a + layer, b, b + layer, a + layer]),
        );
      }
    for (const c of [0, columns])
      for (let r = 0; r < rows; r++) {
        const a = r * (columns + 1) + c,
          b = a + columns + 1;
        indices.push(
          ...(c === 0
            ? [a, b, a + layer, b, b + layer, a + layer]
            : [a, a + layer, b, b, a + layer, b + layer]),
        );
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    // 截面沿Z刚性拉伸。每1.4m水平带只合并真实材料投影的相交区间，绝不跨过中间水洞。
    // 任一盒角都有同X、同Z的真实材料点，Y距离不超过带高；外扩上界小于1.5m。
    const materialTriangles = [];
    for (let c = 0; c < columns; c++) {
      const a = grids[0][0][c],
        b = grids[0][0][c + 1],
        d = grids[1][0][c],
        e = grids[1][0][c + 1];
      materialTriangles.push([a, d, b], [b, d, e]);
    }
    const clip = (polygon, limit, above) => {
        const out = [];
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i],
            b = polygon[(i + 1) % polygon.length],
            ai = above ? a.y >= limit : a.y <= limit,
            bi = above ? b.y >= limit : b.y <= limit;
          if (ai) out.push(a);
          if (ai !== bi) {
            const t = (limit - a.y) / (b.y - a.y);
            out.push({ x: a.x + (b.x - a.x) * t, y: limit });
          }
        }
        return out;
      },
      fitted = [],
      bounds = geometry.boundingBox,
      band = 1.4;
    for (
      let lo = Math.floor(bounds.min.y / band) * band;
      lo < bounds.max.y;
      lo += band
    ) {
      const hi = Math.min(lo + band, bounds.max.y),
        intervals = [];
      for (const triangle of materialTriangles) {
        const cut = clip(clip(triangle, lo, true), hi, false);
        if (cut.length)
          intervals.push([
            Math.min(...cut.map((p) => p.x)),
            Math.max(...cut.map((p) => p.x)),
          ]);
      }
      intervals.sort((a, b) => a[0] - b[0]);
      const merged = [];
      for (const interval of intervals) {
        const last = merged.at(-1);
        if (last && interval[0] <= last[1] + 1e-8)
          last[1] = Math.max(last[1], interval[1]);
        else merged.push(interval.slice());
      }
      for (const [left, right] of merged)
        if (right - left > 1e-6)
          fitted.push({
            id: `kaiju_lair_entry_rib_${index}_${fitted.length}`,
            type: "box",
            x: (left + right) / 2,
            y: (lo + hi) / 2,
            z,
            halfSize: new THREE.Vector3(
              (right - left) / 2 + 0.02,
              (hi - lo) / 2 + 0.02,
              depth / 2 + 0.02,
            ),
            rotation: new THREE.Quaternion(),
          });
    }
    contacts.push(...fitted);
    geometries.push(geometry);
    layers.push({
      z,
      depth,
      width: innerWidth,
      height: innerHeight,
      contacts: fitted.length,
      roofAt: innerRoof,
    });
  }
  const geometry = weldRockGeometries(geometries);
  for (const source of geometries) source.dispose();
  return { geometry, contacts, layers };
}

/** 唯一北口使用实际曲拱；只有最终落定才注册不动的门体，重开时按引用移除。 */
function makePortalSystem(
  main,
  heightAt,
  root,
  keep,
  material,
  colliders,
  rockAsset,
  instances,
) {
  let worldColliders = colliders,
    sealed = false,
    progress = 0,
    disposed = false;
  const plugs = [],
    doorContacts = [],
    permanentContacts = [],
    dustRows = [],
    dust = new THREE.InstancedMesh(rockAsset.geometry, rockAsset.material, 16),
    matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    scale = new THREE.Vector3(),
    position = new THREE.Vector3();
  dust.name = "titan_portal_edge_falling_rocks";
  dust.count = 0;
  dust.visible = false;
  root.add(dust);
  instances.push(dust);
  const openings = [
    { id: "south", t: 0, sign: -1, permanent: true },
    { id: "north", t: 1, sign: 1 },
  ].map(({ id, t, sign, permanent = false }) => {
    const f = main.frameAt(t),
      origin = new THREE.Vector3(f.center.x, f.floorY, f.center.z),
      outward = new THREE.Vector3(0, 0, sign),
      width = f.halfWidth * 2,
      half = width / 2,
      ceiling = (x) => main.roofAt(t, x - main.x),
      floor = (x) => heightAt(x, origin.z),
      contour = [],
      samples = 48;
    for (let i = 0; i <= samples; i++) {
      const x = origin.x + half - (i * width) / samples;
      contour.push(new THREE.Vector2(x - origin.x, ceiling(x) - origin.y + 1));
    }
    for (let i = 0; i <= samples; i++) {
      const x = origin.x - half + (i * width) / samples,
        y =
          Math.min(...[0, 3, 6].map((d) => heightAt(x, origin.z - sign * d))) -
          3;
      contour.push(new THREE.Vector2(x - origin.x, y - origin.y));
    }
    const shape = new THREE.Shape(contour),
      geometry = keep(
        new THREE.ExtrudeGeometry(shape, {
          depth: 6,
          steps: 1,
          bevelEnabled: false,
        }),
      ),
      p = geometry.attributes.position,
      color = new Float32Array(p.count * 3),
      indices = [];
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      p.setXYZ(
        i,
        origin.x + p.getX(i),
        origin.y + p.getY(i),
        origin.z - sign * (z + 0.03),
      );
      new THREE.Color("#405256")
        .multiplyScalar(
          0.78 + 0.12 * Math.sin(p.getX(i) * 0.8 + p.getY(i) * 0.3),
        )
        .toArray(color, i * 3);
    }
    for (let i = 0; i < p.count; i += 3)
      indices.push(...(sign > 0 ? [i, i + 2, i + 1] : [i, i + 1, i + 2]));
    geometry.setIndex(indices);
    geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = permanent
      ? "kaiju_lair_south_rock_end"
      : `titan_sealed_${id}_portal`;
    mesh.visible = permanent;
    root.add(mesh);
    if (!permanent) plugs.push(mesh);
    const fill = (x0, x1) => {
      const xs = [x0, (x0 + x1) / 2, x1],
        tops = xs.map(ceiling),
        variation = Math.max(...tops) - Math.min(...tops);
      if (variation > 1.2 && x1 - x0 > 0.125) {
        const m = (x0 + x1) / 2;
        fill(x0, m);
        fill(m, x1);
        return;
      }
      const lo =
          Math.min(
            ...xs.flatMap((x) =>
              [0, 3, 6].map((d) => heightAt(x, origin.z - sign * d)),
            ),
          ) - 3,
        hi = Math.max(...tops) + 1,
        contact = {
          id: permanent
            ? `kaiju_lair_south_end_${permanentContacts.length}`
            : `kaiju_lair_seal_${id}_${doorContacts.length}`,
          type: "box",
          x: (x0 + x1) / 2,
          y: (lo + hi) / 2,
          z: origin.z - sign * 3.03,
          halfSize: new THREE.Vector3((x1 - x0) / 2 + 0.01, (hi - lo) / 2, 3),
          rotation: new THREE.Quaternion(),
        };
      (permanent ? permanentContacts : doorContacts).push(contact);
    };
    for (let x = origin.x - half; x < origin.x + half - 1e-6; x += 4)
      fill(x, Math.min(origin.x + half, x + 4));
    for (let i = 0; !permanent && i < 8; i++)
      dustRows.push({
        origin,
        sign,
        side: i % 2 ? 1 : -1,
        step: Math.floor(i / 2),
        height: Math.min(ceiling(origin.x) - origin.y - 8, 70),
        half,
      });
    return {
      id,
      permanent,
      origin,
      outward,
      plane: { normal: outward, constant: -origin.dot(outward) },
      width,
      height: ceiling(origin.x) - origin.y,
      bodyMargin: 2,
      ceilingAt: ceiling,
      floorAt: floor,
      insideDepth: 6,
    };
  });
  // 南端在初始场景中就是真岩壁；reset只重开北口，绝不能借出口列表隐藏一张可穿透的南门。
  colliders.push(...permanentContacts);
  const exits = openings.filter((opening) => !opening.permanent);
  const remove = (array) => {
    for (let i = array.length - 1; i >= 0; i--)
      if (doorContacts.includes(array[i])) array.splice(i, 1);
  };
  const support = (body, axis) => {
    const length = body.length ?? 30,
      radius = body.radius ?? Math.max(0.65, length * 0.13),
      f = body.forward || { x: 0, y: 0, z: -1 },
      d = Math.hypot(f.x, f.y, f.z) || 1,
      dot = Math.abs((f.x * axis.x + f.y * axis.y + f.z * axis.z) / d);
    return Math.max(0, length * 0.52 - radius) * dot + radius;
  };
  const distance = (p, e) =>
    (p.x - e.origin.x) * e.outward.x +
    (p.y - e.origin.y) * e.outward.y +
    (p.z - e.origin.z) * e.outward.z;
  const isEscapeSafe = (p, body = {}, id) => {
    if (disposed) return false;
    const exit = exits.find((e) => e.id === id);
    if (
      !exit ||
      distance(p, exit) < support(body, exit.outward) + exit.bodyMargin - 1e-6
    )
      return false;
    const length = body.length ?? 30,
      radius = body.radius ?? Math.max(0.65, length * 0.13);
    for (const offset of bodyOffsets({
      ...body,
      radius,
      length: (length * 0.52) / 0.42,
    })) {
      const centre = new THREE.Vector3(
        p.x + offset.x,
        p.y + offset.y,
        p.z + offset.z,
      );
      if (main.contains(centre, 0)) return false;
      for (const axis of [
        UP,
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 1),
      ])
        for (const sign of [-1, 1])
          if (
            main.contains(
              centre.clone().addScaledVector(axis, radius * sign),
              0,
            )
          )
            return false;
    }
    return true;
  };
  const checkEscape = (previous, current, body = {}) => {
    if (
      disposed ||
      sealed ||
      Math.hypot(
        current.x - previous.x,
        current.y - previous.y,
        current.z - previous.z,
      ) > 8
    )
      return null;
    for (const exit of exits) {
      const previousBody = body.previousForward
          ? { ...body, forward: body.previousForward }
          : body,
        a =
          distance(previous, exit) -
          support(previousBody, exit.outward) -
          exit.bodyMargin,
        b =
          distance(current, exit) -
          support(body, exit.outward) -
          exit.bodyMargin;
      if (a >= 0 || b < 0 || b <= a) continue;
      const crossing = -a / (b - a),
        p = new THREE.Vector3().copy(previous).lerp(current, crossing),
        x = p.x,
        sx = support(body, new THREE.Vector3(1, 0, 0)),
        sy = support(body, UP);
      if (Math.abs(x - exit.origin.x) + sx > exit.width / 2 - 1) continue;
      const floor = Math.max(...[x - sx, x, x + sx].map(exit.floorAt)),
        ceiling = Math.min(...[x - sx, x, x + sx].map(exit.ceilingAt));
      if (p.y - sy < floor + 0.3 || p.y + sy > ceiling - 0.3) continue;
      return { id: exit.id, crossing, point: p };
    }
    return null;
  };
  const reset = () => {
    remove(colliders);
    if (worldColliders !== colliders) remove(worldColliders);
    sealed = false;
    progress = 0;
    for (const mesh of plugs) mesh.visible = false;
    dust.visible = false;
    dust.count = 0;
  };
  const setSealing = (value) => {
    if (disposed) return false;
    if (sealed) return true;
    progress = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
    dust.visible = progress > 0 && progress < 1;
    dust.count = dust.visible ? dustRows.length : 0;
    if (progress === 0) return false;
    for (const [i, row] of dustRows.entries()) {
      position.set(
        row.origin.x + row.side * (row.half - 3),
        row.origin.y +
          7 +
          ((row.step * 0.19 - progress * 0.85 + 1) % 1) * row.height,
        row.origin.z - row.sign * (4 + progress * 2),
      );
      rotation.setFromEuler(
        new THREE.Euler(i * 0.7 + progress, i * 0.9, progress * 0.4),
      );
      scale.setScalar(
        3.5 / rockAsset.geometry.boundingBox.getSize(new THREE.Vector3()).x,
      );
      matrix.compose(position, rotation, scale);
      dust.setMatrixAt(i, matrix);
    }
    dust.instanceMatrix.needsUpdate = true;
    if (progress >= 1) {
      colliders.push(...doorContacts);
      if (worldColliders !== colliders) worldColliders.push(...doorContacts);
      sealed = true;
      for (const mesh of plugs) mesh.visible = true;
      dust.visible = false;
      dust.count = 0;
    }
    return sealed;
  };
  return {
    exits,
    checkEscape,
    isEscapeSafe,
    setSealing,
    seal: () => setSealing(1),
    resetSealing: reset,
    bindWorldColliders(array) {
      if (disposed) return;
      if (!Array.isArray(array))
        throw new TypeError("Portal world contacts require an array");
      if (array === worldColliders) return;
      if (sealed && worldColliders !== colliders) remove(worldColliders);
      worldColliders = array;
      if (sealed && array !== colliders) array.push(...doorContacts);
    },
    get isSealed() {
      return sealed;
    },
    get sealingProgress() {
      return progress;
    },
    worldContacts: () => worldColliders,
    doorContacts,
    permanentContacts,
    plugs,
    dispose() {
      reset();
      disposed = true;
      worldColliders = colliders;
    },
  };
}

/** 有完整厚度和底基的连续岩体；上层通道保留，不能把食物层切成窄盒。 */
/** 后巢遮蔽是嵌在真实屋顶里的岩层，不是伸出洞壳的黑色立牌。 */
function makeCeilingRock(main, spec) {
  const columns = 24,
    slices = new Map(),
    sample = (u, v) => {
      const z = THREE.MathUtils.lerp(spec.from[1], spec.to[1], u),
        recess = 2 + 6 * (0.5 + 0.5 * Math.sin(u * 13 + 0.6)),
        centre = THREE.MathUtils.lerp(spec.from[0], spec.to[0], u),
        x = THREE.MathUtils.lerp(
          centre + spec.width / 2 - recess,
          centre - spec.width / 2 + 1,
          v,
        ),
        roof = main.annex.roofAt(x, z);
      if (roof === null)
        throw new Error("Rear rock lies outside the real den roof");
      const top = Math.min(spec.topY ?? Infinity, roof + 1.2),
        low =
          spec.bottomY +
          3 * (0.5 + 0.5 * Math.sin(z * 0.13 + x * 0.023)) +
          1.5 * (0.5 + 0.5 * Math.sin(z * 0.31)),
        taper = smooth(Math.min(u, 1 - u) / 0.14);
      return {
        x,
        z,
        // 两端退入屋顶，不能留下悬空的直角断板；中段保留真实封闭遮蔽。
        bottom: THREE.MathUtils.lerp(top - 1, low, taper),
        top,
      };
    },
    slice = (u) => {
      if (!slices.has(u))
        slices.set(
          u,
          Array.from({ length: columns + 1 }, (_, i) => sample(u, i / columns)),
        );
      return slices.get(u);
    },
    rows = [0];
  function divide(a, b, depth = 0) {
    const low = slice(a),
      high = slice(b),
      middle = slice((a + b) / 2);
    let change = 0,
      sideways = 0,
      error = 0;
    for (let i = 0; i <= columns; i++) {
      change = Math.max(
        change,
        Math.abs(low[i].top - high[i].top),
        Math.abs(low[i].bottom - high[i].bottom),
      );
      sideways = Math.max(sideways, Math.abs(low[i].x - high[i].x));
      error = Math.max(
        error,
        Math.abs(middle[i].top - (low[i].top + high[i].top) / 2),
        Math.abs(middle[i].bottom - (low[i].bottom + high[i].bottom) / 2),
        Math.abs(middle[i].x - (low[i].x + high[i].x) / 2),
      );
    }
    if (
      change > 0.85 ||
      sideways > 0.6 ||
      error > 0.15 ||
      Math.abs(spec.to[1] - spec.from[1]) * (b - a) > 6
    ) {
      if (depth >= 14)
        throw new Error(
          "Rear rock roof fit exceeded its local subdivision budget",
        );
      const mid = (a + b) / 2;
      divide(a, mid, depth + 1);
      divide(mid, b, depth + 1);
    } else rows.push(b);
  }
  divide(0, 1);
  // 接触列控制实体边界，渲染只按曲率细分；倾斜但平直的岩面不应铺成密集高度格。
  const renderColumns = 12,
    renderRows = [0],
    renderSlices = new Map(),
    renderSlice = (u) => {
      if (!renderSlices.has(u))
        renderSlices.set(
          u,
          Array.from({ length: renderColumns + 1 }, (_, i) =>
            sample(u, i / renderColumns),
          ),
        );
      return renderSlices.get(u);
    };
  function divideRender(a, b, depth = 0) {
    const low = renderSlice(a),
      high = renderSlice(b),
      middle = renderSlice((a + b) / 2);
    let error = 0;
    for (let i = 0; i <= renderColumns; i++)
      for (const key of ["top", "bottom", "x"])
        error = Math.max(
          error,
          Math.abs(middle[i][key] - (low[i][key] + high[i][key]) / 2),
        );
    if (error > 0.15 || Math.abs(spec.to[1] - spec.from[1]) * (b - a) > 6) {
      if (depth >= 14)
        throw new Error("Rear rock render curvature exceeded its local budget");
      const mid = (a + b) / 2;
      divideRender(a, mid, depth + 1);
      divideRender(mid, b, depth + 1);
    } else renderRows.push(b);
  }
  divideRender(0, 1);
  const positions = [],
    colors = [],
    indices = [],
    contacts = [],
    vertices = new Map(),
    verticalSteps = 4;
  function vertex(r, c, t) {
    const key = `${r}:${c}:${t}`;
    if (vertices.has(key)) return vertices.get(key);
    const p = renderSlice(renderRows[r])[c],
      v = c / renderColumns,
      y = THREE.MathUtils.lerp(p.bottom, p.top, t / verticalSteps),
      x = p.x - (1 - v) * 0.25 * (0.5 + 0.5 * Math.sin(y * 0.17 + p.z * 0.08)),
      id = positions.length / 3;
    positions.push(x, y, p.z);
    new THREE.Color("#526159")
      .multiplyScalar(
        0.8 +
          0.13 * Math.sin(y * 0.055 + Math.sin(p.z * 0.032)) +
          0.06 * Math.sin(y * 0.19 + p.z * 0.047),
      )
      .toArray(colors, id * 3);
    vertices.set(key, id);
    return id;
  }
  function quad(ids, outward) {
    for (const tri of [
      [ids[0], ids[1], ids[2]],
      [ids[1], ids[3], ids[2]],
    ]) {
      const [a, b, c] = tri.map((i) =>
          new THREE.Vector3().fromArray(positions, i * 3),
        ),
        n = b.sub(a).cross(c.sub(a));
      indices.push(...(n.dot(outward) < 0 ? [tri[0], tri[2], tri[1]] : tri));
    }
  }
  for (let r = 0; r < rows.length - 1; r++) {
    // 合并横向可共用的实心列；顶/底误差都必须小于1.4m，合成侧向侵蚀仍留在2m实体包络内。
    let c = 0;
    while (c < columns) {
      let end = c + 1,
        selected;
      for (; end <= columns; end++) {
        const ps = [];
        for (const row of [r, r + 1])
          for (let i = c; i <= end; i++) ps.push(slice(rows[row])[i]);
        const top = ps.map((p) => p.top),
          bottom = ps.map((p) => p.bottom),
          bounds = {
            minX: Math.min(...ps.map((p) => p.x)),
            maxX: Math.max(...ps.map((p) => p.x)),
            minY: Math.min(...bottom),
            maxY: Math.max(...top),
            minZ: Math.min(...ps.map((p) => p.z)),
            maxZ: Math.max(...ps.map((p) => p.z)),
          };
        if (
          Math.max(...top) - Math.min(...top) > 1.4 ||
          Math.max(...bottom) - Math.min(...bottom) > 1.4
        ) {
          if (!selected)
            throw new Error("Rear rock contact crosses a steep roof cell");
          break;
        }
        selected = bounds;
      }
      const b = selected,
        stop = Math.min(end - 1, columns);
      contacts.push({
        id: `kaiju_lair_partition_${spec.id}_${contacts.length}`,
        type: "box",
        x: (b.minX + b.maxX) / 2,
        y: (b.minY + b.maxY) / 2,
        z: (b.minZ + b.maxZ) / 2,
        halfSize: new THREE.Vector3(
          (b.maxX - b.minX) / 2 + 0.04,
          (b.maxY - b.minY) / 2 + 0.04,
          (b.maxZ - b.minZ) / 2 + 0.04,
        ),
        rotation: new THREE.Quaternion(),
      });
      c = stop;
    }
  }
  for (let r = 0; r < renderRows.length - 1; r++) {
    for (let c = 0; c < renderColumns; c++)
      for (const t of [0, verticalSteps])
        quad(
          [
            vertex(r, c, t),
            vertex(r + 1, c, t),
            vertex(r, c + 1, t),
            vertex(r + 1, c + 1, t),
          ],
          new THREE.Vector3(0, t ? 1 : -1, 0),
        );
    for (const c of [0, renderColumns])
      for (let t = 0; t < verticalSteps; t++)
        quad(
          [
            vertex(r, c, t),
            vertex(r + 1, c, t),
            vertex(r, c, t + 1),
            vertex(r + 1, c, t + 1),
          ],
          new THREE.Vector3(c ? -1 : 1, 0, 0),
        );
  }
  for (const r of [0, renderRows.length - 1])
    for (let c = 0; c < renderColumns; c++)
      for (let t = 0; t < verticalSteps; t++)
        quad(
          [
            vertex(r, c, t),
            vertex(r, c + 1, t),
            vertex(r, c, t + 1),
            vertex(r, c + 1, t + 1),
          ],
          new THREE.Vector3(0, 0, r ? -1 : 1),
        );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return {
    ...spec,
    geometry,
    contacts,
    roofFit: {
      rows: rows.length,
      columns,
      renderRows: renderRows.length,
      renderColumns,
      renderError: 0.15,
      topEmbed: 1.2,
      maxColumnSpan: 1.4,
    },
  };
}

function makePartition(main, spec, heightAt) {
  if (spec.id === "rear_shadow_overhang") return makeCeilingRock(main, spec);
  const from = new THREE.Vector3(spec.from[0], 0, spec.from[1]),
    to = new THREE.Vector3(spec.to[0], 0, spec.to[1]),
    direction = to.clone().sub(from).normalize(),
    normal = new THREE.Vector3(direction.z, 0, -direction.x),
    count = Math.ceil(from.distanceTo(to) / 6),
    positions = [],
    colors = [],
    indices = [],
    contacts = [],
    point = new THREE.Vector3(),
    rotation = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(normal, UP, direction),
    );
  for (let i = 0; i < count; i++) {
    const corners = [];
    for (const u of [i / count, (i + 1) / count])
      for (const side of [-1, 1]) {
        const p = from
            .clone()
            .lerp(to, u)
            .addScaledVector(
              normal,
              side * (spec.width / 2 + 0.45 * Math.sin(u * 31)),
            ),
          roof = main.roofAt((p.z - main.z) / main.depth + 0.5, p.x - main.x);
        corners.push({
          p,
          top:
            spec.topY ??
            (spec.roof ? roof + 1 : heightAt(p.x, p.z) + spec.height),
        });
      }
    let base = Infinity;
    for (let u = 0; u <= Math.ceil(from.distanceTo(to) / count); u++)
      for (let w = 0; w <= Math.ceil(spec.width); w++) {
        point
          .copy(from)
          .lerp(to, (i + u / Math.ceil(from.distanceTo(to) / count)) / count)
          .addScaledVector(
            normal,
            (w / Math.ceil(spec.width) - 0.5) * (spec.width + 1),
          );
        base = Math.min(base, heightAt(point.x, point.z) - 2);
      }
    if (Number.isFinite(spec.bottomY)) base = spec.bottomY;
    if (spec.id === "descending_gate") {
      // 吊岩只从高于下缘的真实洞顶垂下，低洞顶处收成零厚度，不能反向长成悬浮墙片。
      for (const corner of corners) corner.top = Math.max(base, corner.top);
      if (corners.every((corner) => corner.top <= base + 1e-8)) continue;
    }
    const start = positions.length / 3;
    for (let layer = 0; layer < 2; layer++)
      for (const c of corners) {
        positions.push(c.p.x, layer ? c.top : base, c.p.z);
        new THREE.Color("#3b5155")
          .multiplyScalar(
            0.8 + 0.12 * Math.sin(c.p.x * 0.4 + c.p.z * 0.13 + layer),
          )
          .toArray(colors, (positions.length / 3 - 1) * 3);
      }
    const inside = new THREE.Vector3();
    for (let v = start; v < start + 8; v++)
      inside.add(new THREE.Vector3().fromArray(positions, v * 3));
    inside.multiplyScalar(1 / 8);
    for (const face of [
      [0, 2, 1],
      [1, 2, 3],
      [4, 5, 6],
      [5, 7, 6],
      [0, 1, 4],
      [1, 5, 4],
      [2, 6, 3],
      [3, 6, 7],
      [0, 4, 2],
      [2, 4, 6],
      [1, 3, 5],
      [3, 7, 5],
    ]) {
      const ids = face.map((n) => start + n),
        a = new THREE.Vector3().fromArray(positions, ids[0] * 3),
        b = new THREE.Vector3().fromArray(positions, ids[1] * 3),
        c = new THREE.Vector3().fromArray(positions, ids[2] * 3),
        n = b.clone().sub(a).cross(c.clone().sub(a)),
        faceCenter = a
          .clone()
          .add(b)
          .add(c)
          .multiplyScalar(1 / 3);
      if (n.lengthSq() < 1e-16) continue;
      indices.push(
        ...(n.dot(faceCenter.sub(inside)) < 0 ? [ids[0], ids[2], ids[1]] : ids),
      );
    }
    const back = rotation.clone().invert(),
      bounds = new THREE.Box3();
    for (let v = start; v < start + 8; v++)
      bounds.expandByPoint(
        point.fromArray(positions, v * 3).applyQuaternion(back),
      );
    const center = bounds
      .getCenter(new THREE.Vector3())
      .applyQuaternion(rotation);
    contacts.push({
      id: `kaiju_lair_partition_${spec.id}_${i}`,
      type: "box",
      x: center.x,
      y: center.y,
      z: center.z,
      halfSize: bounds
        .getSize(new THREE.Vector3())
        .multiplyScalar(0.5)
        .addScalar(0.04),
      rotation: rotation.clone(),
    });
  }
  const raw = new THREE.BufferGeometry(),
    carvedPositions = [],
    carvedColors = [],
    carvedIndices = [];
  const carve = (p) => {
    const along = p.clone().sub(from).dot(direction),
      across = p.clone().sub(from).dot(normal),
      depth =
        0.75 * (0.5 + 0.5 * Math.sin(p.y * 0.19 + along * 0.08)) +
        0.45 * (0.5 + 0.5 * Math.sin(p.y * 0.53 + along * 0.12));
    p.addScaledVector(normal, -Math.sign(across) * depth);
    if (along < 0.01) p.addScaledVector(direction, depth);
    else if (along > from.distanceTo(to) - 0.01)
      p.addScaledVector(direction, -depth);
    return p;
  };
  function face(points) {
    let edge = 0,
      span = 0;
    for (let i = 0; i < 3; i++) {
      const dy = Math.abs(points[i].y - points[(i + 1) % 3].y);
      if (dy > span) {
        span = dy;
        edge = i;
      }
    }
    if (span > 7) {
      const a = edge,
        b = (edge + 1) % 3,
        c = (edge + 2) % 3,
        middle = points[a].clone().add(points[b]).multiplyScalar(0.5);
      face([points[a], middle, points[c]]);
      face([middle, points[b], points[c]]);
      return;
    }
    for (const source of points) {
      const p = carve(source.clone()),
        id = carvedPositions.length / 3;
      carvedPositions.push(p.x, p.y, p.z);
      new THREE.Color("#52645a")
        .multiplyScalar(
          0.84 +
            0.1 * Math.sin(p.y * 0.045 + Math.sin(p.x * 0.016)) +
            0.04 * Math.sin(p.z * 0.023 + p.y * 0.03),
        )
        .toArray(carvedColors, id * 3);
      carvedIndices.push(id);
    }
  }
  for (let i = 0; i < indices.length; i += 3)
    face(
      [0, 1, 2].map((j) =>
        new THREE.Vector3().fromArray(positions, indices[i + j] * 3),
      ),
    );
  // 只向既有实岩内侵蚀，保留原实体包络；单面最多1.2m、端角合成不到1.7m。
  raw.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(carvedPositions, 3),
  );
  raw.setAttribute("color", new THREE.Float32BufferAttribute(carvedColors, 3));
  raw.setIndex(carvedIndices);
  const geometry = weldRockGeometries([raw]);
  raw.dispose();
  return { ...spec, geometry, contacts };
}

/** 保留真正海床，岩厅以连续内外壳围出水体；屋顶永不加入最低地面索引。 */
export function createBermudaCaves(parent, { heightAt }) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new TypeError("Caves require a parent and final floor sampler");
  const root = new THREE.Group();
  root.name = "bermuda_deep_caves";
  parent.add(root);
  const owned = new Set(),
    assets = [],
    instances = [],
    detailRows = new Map(),
    detailBatches = [],
    scatterBatches = [],
    assetMap = new Map(),
    colliders = [],
    records = [],
    landmarks = [],
    lightSources = [];
  const keep = (r) => {
      if (!r) throw new Error("Invalid cave geometry or resource");
      owned.add(r);
      return r;
    },
    point = new THREE.Vector3();
  let disposed = false,
    last = -Infinity,
    portalSystem = null;
  function dispose() {
    if (disposed) return;
    disposed = true;
    portalSystem?.dispose();
    root.removeFromParent();
    for (const mesh of instances) mesh.dispose();
    root.clear();
    for (const resource of owned) resource.dispose();
    for (const asset of assets) asset.release();
    owned.clear();
    colliders.length = 0;
  }
  try {
    const stone = keep(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }),
    );
    stone.name = "bermuda_cave_stratified_stone";
    addSurfaceDetail(stone, "stone", 0.65);
    const mainStone = keep(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }),
    );
    mainStone.name = "bermuda_lair_eroded_stone";
    addSurfaceDetail(mainStone, "stone", 0.12);
    const baseCompile = mainStone.onBeforeCompile;
    mainStone.onBeforeCompile = (shader, renderer) => {
      baseCompile.call(mainStone, shader, renderer);
      shader.vertexShader = shader.vertexShader.replace(
        "vSurfaceDetail = detailPosition.xyz;",
        "vSurfaceDetail = mat3(0.81,0.31,0.50,-0.42,0.90,0.12,-0.41,-0.30,0.86) * detailPosition.xyz;",
      );
    };
    mainStone.customProgramCacheKey = () => "abyssal_lair_eroded_stone_v1";
    const scarMaterial = keep(
      new THREE.MeshStandardMaterial({
        color: "#132b30",
        roughness: 0.98,
        side: THREE.DoubleSide,
      }),
    );
    const filmMaterial = keep(
      new THREE.MeshStandardMaterial({
        color: "#56877d",
        emissive: "#497c74",
        emissiveIntensity: 0.46,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    filmMaterial.name = "cave_biological_films";
    const fossils = acquireMarianaFossilAsset();
    const titanBones = acquireBermudaTitanBoneAsset();
    assets.push(fossils, titanBones);
    const fossilRows = [],
      plateRows = [],
      scarParts = [],
      filmParts = [],
      approachFilms = [],
      skeletons = [];
    function assetFor(kind) {
      if (!assetMap.has(kind)) {
        const a = kind.startsWith("reef_")
          ? acquireHawaiiReefAsset(kind)
          : acquireBermudaGeologyAsset(kind);
        assetMap.set(kind, a);
        assets.push(a);
      }
      return assetMap.get(kind);
    }
    function detail(kind, row) {
      if (!detailRows.has(kind)) detailRows.set(kind, []);
      detailRows.get(kind).push(row);
    }

    for (const [siteIndex, site] of BERMUDA_CAVE_SITES.entries()) {
      const group = new THREE.Group();
      group.name = `bermuda_cave_${site.id}`;
      root.add(group);
      const yaw = new THREE.Quaternion().setFromAxisAngle(UP, site.yaw || 0),
        inverse = yaw.clone().invert();
      const toWorld = (x, y, z) =>
        new THREE.Vector3(x, y, z)
          .applyQuaternion(yaw)
          .add(new THREE.Vector3(site.x, 0, site.z));
      let floorMaximum = -Infinity,
        floorMinimum = Infinity;
      for (let z = -site.depth / 2; z <= site.depth / 2 + 0.01; z += 5)
        for (let x = -site.width / 2; x <= site.width / 2 + 0.01; x += 5) {
          const p = toWorld(x, 0, z),
            y = heightAt(p.x, p.z);
          floorMaximum = Math.max(floorMaximum, y);
          floorMinimum = Math.min(floorMinimum, y);
        }
      let structuralFloorMaximum = floorMaximum;
      if (site.theme === "kaiju_lair") {
        structuralFloorMaximum = -Infinity;
        for (let z = -site.depth / 2; z <= site.depth / 2 + 0.01; z += 5)
          for (let x = -site.width / 2; x <= site.width / 2 + 0.01; x += 5) {
            const p = toWorld(x, 0, z);
            // 只排除真实新增入口台地，不能排整段北海床而意外降低旧大厅/后腔屋顶。
            if (
              Math.abs(p.x - ENTRY.x) < ENTRY.outerHalfWidth &&
              -p.z > ENTRY.northStart &&
              -p.z < ENTRY.southEnd
            )
              continue;
            structuralFloorMaximum = Math.max(
              structuralFloorMaximum,
              heightAt(p.x, p.z),
            );
          }
      }
      const thickness = Math.min(12, Math.max(5.4, site.width * 0.06)),
        expansion = (t) => smooth(Math.min(t, 1 - t) / 0.24),
        shift = (t) =>
          site.theme === "kaiju_lair"
            ? -site.width * 0.2 * (1 - t) * (1 - expansion(t))
            : Math.sin(t * Math.PI * 2) * site.width * 0.025,
        halfWidth = (t, inner = true) => {
          const outer =
            (site.width / 2 - Math.abs(shift(t)) - 1.5) *
            (0.93 + 0.045 * Math.sin(t * Math.PI) + 0.012 * Math.sin(t * 9));
          if (!inner) return outer;
          const mouth = Math.min(
            site.theme === "kaiju_lair" ? 50 : 28,
            outer - 6,
          );
          return THREE.MathUtils.lerp(mouth, outer - thickness, expansion(t));
        };
      function surface(t, angle, inner = false) {
        const sine = Math.sin(angle),
          x =
            shift(t) +
            halfWidth(t, inner) *
              Math.cos(angle) *
              (1 + 0.018 * Math.sin(t * 13 + angle * 3) * sine),
          z = (t - 0.5) * site.depth,
          p = toWorld(x, 0, z),
          floor = heightAt(p.x, p.z) - 0.9;
        let peak =
          structuralFloorMaximum +
          site.height * (0.9 + 0.07 * Math.sin(t * Math.PI)) +
          site.height * 0.012 * Math.sin(t * 9 + angle * 4) * sine -
          (inner ? thickness : 0);
        if (site.theme === "kaiju_lair") {
          const center = toWorld(shift(t), 0, z);
          peak = Math.max(
            peak,
            heightAt(center.x, center.z) + (inner ? 136 : 145),
          );
        }
        if (inner) {
          const center = toWorld(shift(t), 0, z),
            portalTop =
              heightAt(center.x, center.z) +
              (site.theme === "kaiju_lair" ? (t > 0.5 ? 125 : 100) : 85);
          peak = THREE.MathUtils.lerp(portalTop, peak, expansion(t));
        }
        if (site.theme === "kaiju_lair") {
          const entranceBlend = smooth(
            (t - ENTRANCE.roofTransitionStart) /
              (1 - ENTRANCE.roofTransitionStart),
          );
          peak +=
            entranceBlend *
            (inner ? ENTRANCE.innerRoofLift : ENTRANCE.outerRoofLift);
        }
        p.y = floor + (peak - floor) * Math.pow(Math.max(0, sine), 0.72);
        return p;
      }
      function surfaceNormal(t, angle, inner = false) {
        const a = surface(t, Math.min(Math.PI, angle + 0.001), inner).sub(
            surface(t, Math.max(0, angle - 0.001), inner),
          ),
          b = surface(Math.min(1, t + 0.001), angle, inner).sub(
            surface(Math.max(0, t - 0.001), angle, inner),
          );
        return new THREE.Vector3()
          .crossVectors(a, b)
          .normalize()
          .multiplyScalar(inner ? -1 : 1);
      }
      function roofAt(t, x) {
        let lo = 0,
          hi = Math.PI;
        for (let n = 0; n < 22; n++) {
          const angle = (lo + hi) / 2,
            p = surface(t, angle, true),
            local = new THREE.Vector3(
              p.x - site.x,
              0,
              p.z - site.z,
            ).applyQuaternion(inverse);
          if (local.x > x) lo = angle;
          else hi = angle;
        }
        return surface(t, (lo + hi) / 2, true).y;
      }
      const columns = site.theme === "kaiju_lair" ? 40 : 32,
        rows = site.theme === "kaiju_lair" ? 40 : 24,
        annexSite =
          site.theme === "kaiju_lair" ? BERMUDA_TITAN_REAR_ANNEX : null,
        portalCell = (j, i) =>
          !!annexSite &&
          j >= annexSite.portalStartRow &&
          j < annexSite.portalEndRow &&
          i >= annexSite.portalColumn,
        portalAngle = (j, i) => {
          if (
            !annexSite ||
            j < annexSite.portalStartRow ||
            j > annexSite.portalEndRow
          )
            return (i * Math.PI) / columns;
          const u =
              (j - annexSite.portalStartRow) /
              (annexSite.portalEndRow - annexSite.portalStartRow),
            cut =
              Math.PI -
              annexSite.portalAngleDepth * Math.pow(Math.sin(u * Math.PI), 0.8);
          return i <= annexSite.portalColumn
            ? (cut * i) / annexSite.portalColumn
            : cut +
                ((Math.PI - cut) * (i - annexSite.portalColumn)) /
                  (columns - annexSite.portalColumn);
        },
        grids = [[], []],
        positions = [],
        colors = [],
        indices = [];
      for (let side = 0; side < 2; side++)
        for (let j = 0; j <= rows; j++) {
          const ring = [];
          for (let i = 0; i <= columns; i++) {
            const t = j / rows,
              angle = portalAngle(j, i),
              p = surface(t, angle, side === 1),
              id = positions.length / 3;
            ring.push(p);
            positions.push(p.x, p.y, p.z);
            const color = new THREE.Color(
              side
                ? site.theme === "luminous_grotto"
                  ? "#3c5554"
                  : site.theme === "kaiju_lair"
                    ? "#4f6658"
                    : "#3d4b4a"
                : "#536369",
            );
            color.multiplyScalar(
              0.83 +
                0.1 * Math.sin(p.y * 0.19 + t * 7) +
                0.06 * Math.sin(angle * 16 + t * 11),
            );
            color.toArray(colors, id * 3);
            if (j < rows && i < columns && !portalCell(j, i)) {
              const b = id + 1,
                c = id + columns + 1,
                d = c + 1;
              indices.push(
                ...(side ? [id, c, b, b, c, d] : [id, b, c, b, d, c]),
              );
            }
          }
          grids[side].push(ring);
        }
      const layer = (rows + 1) * (columns + 1);
      // 两端仅封闭壳厚，不能用整张端板盖住水体入口。
      for (const j of [0, rows])
        for (let i = 0; i < columns; i++) {
          const a = j * (columns + 1) + i,
            b = a + 1;
          indices.push(
            ...(j === 0
              ? [a, a + layer, b, b, a + layer, b + layer]
              : [a, b, a + layer, b, b + layer, a + layer]),
          );
        }
      for (const i of [0, columns])
        for (let j = 0; j < rows; j++) {
          if (i === columns && portalCell(j, i)) continue;
          const a = j * (columns + 1) + i,
            b = a + columns + 1;
          indices.push(
            ...(i === 0
              ? [a, b, a + layer, b, b + layer, a + layer]
              : [a, a + layer, b, b, a + layer, b + layer]),
          );
        }
      const geometry = keep(new THREE.BufferGeometry());
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const shell = new THREE.Mesh(
        geometry,
        site.theme === "kaiju_lair" ? mainStone : stone,
      );
      shell.name = `${site.id}_hollow_rock_shell`;
      group.add(shell);
      let rearAnnex = annexSite
        ? makeRearAnnex(grids, annexSite, heightAt)
        : null;
      const joinedGeometry = rearAnnex
          ? keep(weldRockGeometries([geometry, rearAnnex.geometry]))
          : null,
        joinedWater = joinedGeometry
          ? actualRockWaterSegments(joinedGeometry, heightAt)
          : null;
      if (rearAnnex)
        rearAnnex.contacts = [
          ...shellGridContacts(rearAnnex.grids, {
            rows: annexSite.rows,
            columns: annexSite.portalEndRow - annexSite.portalStartRow,
            heightAt,
            idPrefix: "kaiju_lair_shell_annex_",
            stepU: 2,
            stepV: 1,
            refineTriangles: true,
            waterSamples: joinedWater,
          }),
          ...rearAnnex.capContacts,
        ];
      const contacts = shellGridContacts(grids, {
        rows,
        columns,
        heightAt,
        idPrefix: `${site.id}_shell_`,
        stepU: site.theme === "kaiju_lair" ? 2 : 3,
        skipCell: portalCell,
        refineTriangles: !!annexSite,
        waterSamples: joinedWater,
      });
      if (joinedGeometry)
        contacts.push(
          ...fillUncoveredRockFaces(
            joinedGeometry,
            [...contacts, ...rearAnnex.contacts],
            heightAt,
          ),
        );
      colliders.push(...contacts);
      const contactIds = contacts.map((contact) => contact.id);
      function frameAt(t) {
        const u = Math.max(0, Math.min(1, t)),
          center = toWorld(shift(u), 0, (u - 0.5) * site.depth);
        const floorY = heightAt(center.x, center.z),
          ceilingY = surface(u, Math.PI / 2, true).y;
        center.y = floorY + 26;
        const forward = new THREE.Vector3(
          site.theme === "kaiju_lair"
            ? (shift(Math.min(1, u + 0.001)) - shift(Math.max(0, u - 0.001))) /
              (Math.min(1, u + 0.001) - Math.max(0, u - 0.001))
            : site.width * 0.05 * Math.PI * Math.cos(u * Math.PI * 2),
          0,
          site.depth,
        )
          .applyQuaternion(yaw)
          .normalize();
        return { center, floorY, ceilingY, halfWidth: halfWidth(u), forward };
      }
      function interiorAt(t, across = 0, heightFraction = 0.5) {
        const u = Math.max(0, Math.min(1, t)),
          a = Math.max(-0.999, Math.min(0.999, across)),
          p = toWorld(shift(u) + halfWidth(u) * a, 0, (u - 0.5) * site.depth),
          floor = heightAt(p.x, p.z);
        p.y =
          floor +
          (roofAt(u, shift(u) + halfWidth(u) * a) - floor) * heightFraction;
        return p;
      }
      function contains(p, margin = 0) {
        if (rearAnnex?.contains(p, margin)) return true;
        const local = new THREE.Vector3(
            p.x - site.x,
            0,
            p.z - site.z,
          ).applyQuaternion(inverse),
          t = local.z / site.depth + 0.5;
        if (t < 0 || t > 1) return false;
        const width = halfWidth(t),
          across = (local.x - shift(t)) / width;
        if (Math.abs(across) >= 1 - margin / width) return false;
        const ceiling = roofAt(t, local.x),
          floor = heightAt(p.x, p.z);
        return p.y > floor + margin && p.y < ceiling - margin;
      }
      const lower = [],
        upper = [];
      // 巨兽新巢使用东侧连续绕行，不让旧几何中轴穿过西侧身体预留区。
      const mainRoute =
          site.theme === "kaiju_lair"
            ? BERMUDA_TITAN_NAVIGATION.route.map(
                ([x, y, z]) => new THREE.Vector3(x, y, z),
              )
            : null,
        routeLengths = [0];
      if (mainRoute)
        for (let i = 1; i < mainRoute.length; i++)
          routeLengths.push(
            routeLengths.at(-1) + mainRoute[i - 1].distanceTo(mainRoute[i]),
          );
      for (let i = 0; i <= 20; i++) {
        const frame = frameAt(i / 20),
          low = frame.center.clone();
        if (mainRoute) {
          const distance = (routeLengths.at(-1) * i) / 20;
          let segment = 1;
          while (
            segment < mainRoute.length - 1 &&
            routeLengths[segment] < distance
          )
            segment++;
          low.lerpVectors(
            mainRoute[segment - 1],
            mainRoute[segment],
            (distance - routeLengths[segment - 1]) /
              (routeLengths[segment] - routeLengths[segment - 1]),
          );
        }
        lower.push(low);
        const high = low.clone();
        high.y = mainRoute
          ? low.y + 4
          : Math.max(
              low.y,
              Math.min(
                mainRoute ? -610 : -590,
                (mainRoute
                  ? roofAt((low.z - site.z) / site.depth + 0.5, low.x - site.x)
                  : frame.ceilingY) - 26,
              ),
            );
        upper.push(high);
      }
      const chamber = frameAt(0.5),
        turnRadius =
          site.theme === "kaiju_lair" ? BERMUDA_TITAN_NAVIGATION.turnRadius : 8,
        turnPath = [];
      if (mainRoute) {
        chamber.center.set(
          BERMUDA_TITAN_NAVIGATION.turnCenterXZ[0],
          BERMUDA_TITAN_NAVIGATION.turnY,
          BERMUDA_TITAN_NAVIGATION.turnCenterXZ[1],
        );
        chamber.center.y = Math.max(
          heightAt(chamber.center.x, chamber.center.z) + 40,
          Math.min(BERMUDA_TITAN_NAVIGATION.turnY, chamber.ceilingY - 35),
        );
      }
      for (let i = 0; i <= 36; i++) {
        const angle = (i * Math.PI * 2) / 36 - (mainRoute ? Math.PI / 2 : 0),
          p = mainRoute
            ? chamber.center
                .clone()
                .add(
                  new THREE.Vector3(
                    Math.cos(angle) * turnRadius,
                    0,
                    Math.sin(angle) * turnRadius,
                  ),
                )
            : toWorld(
                shift(0.5) + Math.cos(angle) * turnRadius,
                0,
                Math.sin(angle) * turnRadius,
              );
        p.y = mainRoute
          ? chamber.center.y
          : Math.max(
              heightAt(p.x, p.z) + 30,
              Math.min(-590, chamber.ceilingY - 35),
            );
        turnPath.push(p);
      }
      const record = {
        ...site,
        root: group,
        shell,
        floorMaximum,
        floorMinimum,
        thickness,
        roofBaseY: structuralFloorMaximum,
        contactIds,
        frameAt,
        interiorAt,
        contains,
        room: {
          center: chamber.center.clone(),
          halfWidth: chamber.halfWidth,
          floorMinimum,
          floorMaximum,
          ceilingY: chamber.ceilingY,
        },
        portals: [
          ...(site.theme === "kaiju_lair"
            ? []
            : [
                {
                  id: "south",
                  position: lower[0],
                  upperPosition: upper[0],
                  width: frameAt(0).halfWidth * 2,
                  height: frameAt(0).ceilingY - frameAt(0).floorY,
                },
              ]),
          {
            id: "north",
            position: lower[20],
            upperPosition: upper[20],
            width: frameAt(1).halfWidth * 2,
            height: frameAt(1).ceilingY - frameAt(1).floorY,
          },
        ],
        routePoints: lower,
        routes: [
          { id: "lower", points: lower },
          { id: "upper", points: upper },
        ],
        turnPath,
        worldUnits: "metres",
        dressingStage: "integrated_detail_candidate",
        surface,
        surfaceNormal,
        roofAt,
      };
      if (annexSite) {
        keep(rearAnnex.geometry);
        shell.geometry = joinedGeometry;
        colliders.push(...rearAnnex.contacts);
        contactIds.push(...rearAnnex.contacts.map((contact) => contact.id));
        record.annex = rearAnnex;
        record.annex.shell = shell;
        record.partitions = BERMUDA_TITAN_PARTITIONS.map((spec) => {
          const part = makePartition(record, spec, heightAt);
          let material = mainStone;
          if (spec.id === "rear_shadow_overhang") {
            // 封闭深巢没有外海的散射光，不能把远处真实岩壁雾化成蓝色假出口。
            material = keep(mainStone.clone());
            material.fog = false;
            // 层理已有顶点底色，材质再压一次深色会相乘到近黑，像未加载的矩形画面。
            material.color.set("#ffffff");
            material.onBeforeCompile = mainStone.onBeforeCompile;
            material.customProgramCacheKey = () =>
              "abyssal_lair_shadowed_den_v2";
          } else if (spec.id === "descending_gate") {
            // 吊岩深阴影只回填少量本身岩色，显出矿层；实体、雾与其余物件的照明保持原样。
            material = keep(mainStone.clone());
            material.name = "bermuda_lair_overhead_stone";
            material.onBeforeCompile = (shader, renderer) => {
              mainStone.onBeforeCompile(shader, renderer);
              shader.fragmentShader = shader.fragmentShader.replace(
                "#include <emissivemap_fragment>",
                "#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.14;",
              );
            };
            material.customProgramCacheKey = () =>
              "abyssal_lair_overhead_indirect_v1";
          }
          const mesh = new THREE.Mesh(keep(part.geometry), material);
          mesh.name = `kaiju_lair_${spec.id}`;
          group.add(mesh);
          colliders.push(...part.contacts);
          contactIds.push(...part.contacts.map((c) => c.id));
          return { ...part, mesh };
        });
        record.branches = BERMUDA_TITAN_BRANCHES.map((branch) => ({
          ...branch,
          points: branch.points.map((p) =>
            p.length === 3
              ? new THREE.Vector3(...p)
              : new THREE.Vector3(
                  p[0],
                  heightAt(...p) + branch.floorOffset,
                  p[1],
                ),
          ),
        }));
        // 入口内拱只回填少量原石色，岩层与湿润微表面仍参与真实光照和雾。
        const entranceStone = keep(mainStone.clone());
        entranceStone.name = "bermuda_lair_entry_wet_stone";
        entranceStone.roughness = 0.9;
        entranceStone.onBeforeCompile = (shader, renderer) => {
          mainStone.onBeforeCompile(shader, renderer);
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
            float entranceFill = (0.16 + 0.08 * broad) * (1.0 - 0.25 * strata);
            totalEmissiveRadiance += diffuseColor.rgb * entranceFill;`,
          );
        };
        entranceStone.customProgramCacheKey = () =>
          "abyssal_lair_entry_indirect_v1";
        const entrance = createBermudaTitanEntrance(record, heightAt),
          entranceMesh = new THREE.Mesh(keep(entrance.geometry), entranceStone);
        entranceMesh.name = "kaiju_lair_layered_entrance";
        group.add(entranceMesh);
        colliders.push(...entrance.contacts);
        contactIds.push(...entrance.contacts.map((c) => c.id));
        record.entrance = { ...entrance, mesh: entranceMesh };
        for (const [x, z, height] of [
          [-118, -1402, 7],
          [-85, -1402, 9],
          [-52, -1402, 7],
          [-122, -1383, 8],
          [-85, -1383, 10],
          [-48, -1383, 8],
        ])
          detail("rock", {
            site: record,
            caveRework: true,
            mountId: "entrance",
            embed: height * 0.3,
            position: new THREE.Vector3(
              x,
              entrance.layers.find((layer) => layer.z === z).roofAt(x, z),
              z,
            ),
            normal: new THREE.Vector3(0, -1, 0),
            yaw: x * 0.08,
            height,
            width: height * 1.8,
          });
        for (const [x, y, z, nx, ny, nz, height] of [
          [-100, -515, -1477, 0, 0, 1, 8],
          [-100, -570, -1477, 0, 0, 1, 7],
          [-45, -475, -1485, 1, 0, 0, 8],
          [-45, -515, -1485, 1, 0, 0, 8],
          [-45, -555, -1485, 1, 0, 0, 8],
          [-45, -595, -1485, 1, 0, 0, 7],
          [-15, -565, -1498, 0, -1, 0, 5],
          [15, -565, -1498, 0, -1, 0, 5],
          [30, -565, -1498, 0, -1, 0, 5],
        ])
          detail("rock", {
            site: record,
            caveRework: true,
            mountId: ny < 0 ? "descending_gate" : "northern_screen",
            embed: height * 0.3,
            position: new THREE.Vector3(x, y, z),
            normal: new THREE.Vector3(nx, ny, nz),
            yaw: y * 0.03,
            height,
            width: height * 1.8,
          });
        for (const [x, z, height] of [
          [-105, -1390, 3],
          [-119, -1406, 3.5],
          [-121, -1430, 3],
          [-48, -1470, 2.5],
          [-30, -1505, 3],
          [-105, -1516, 3],
          [-124, -1555, 2.8],
        ])
          detail("reef_sponge", {
            site: record,
            position: new THREE.Vector3(x, 0, z),
            yaw: x * 0.1,
            height,
            floor: true,
          });
      }
      records.push(record);
      landmarks.push({
        id: site.id,
        name: site.name,
        position: chamber.center
          .clone()
          .setY(Math.min(-590, chamber.ceilingY - 30)),
        radius: annexSite ? 420 : Math.max(site.width, site.depth) * 0.65,
      });
      for (const [t, angle] of [
        [0.24, 2.9],
        [0.76, 0.28],
        [0.5, 2.65],
      ]) {
        const p = surface(t, angle, true),
          normal = surfaceNormal(t, angle, true);
        lightSources.push({
          position: p.addScaledVector(normal, 1.4),
          color: site.theme === "luminous_grotto" ? 0x71a99f : 0x9a9a6b,
          intensity: 13,
          distance: 55,
        });
      }
      // 凸岩跟随岩壳外表面或嵌入内壁，不把完整巨石丢进通道中央。
      for (const [t, angle, inner, kind] of [
        [0.18, 0.55, false, "rock"],
        [0.42, 2.55, false, "rock"],
        [0.66, 0.8, false, "rock"],
        [0.83, 2.35, false, "rock"],
        [0.3, 0.7, false, "spire"],
        [0.72, 2.5, false, "spire"],
        [0.22, 0.23, true, "rock"],
        [0.78, 2.9, true, "rock"],
      ]) {
        detail(kind, {
          site: record,
          position: surface(t, angle, inner),
          normal: surfaceNormal(t, angle, inner),
          yaw: t * 7 + angle,
          width:
            site.theme === "kaiju_lair" ? (inner ? 22 : 26) : inner ? 9 : 13,
          height:
            site.theme === "kaiju_lair"
              ? kind === "spire"
                ? 27
                : inner
                  ? 8
                  : 14
              : kind === "spire"
                ? 17
                : inner
                  ? 4
                  : 8,
          inner,
        });
      }
      if (site.theme === "luminous_grotto")
        for (let i = 0; i < 16; i++) {
          const t = 0.2 + Math.floor(i / 2) * 0.075,
            frame = frameAt(t),
            across = (i % 2 ? 1 : -1) * (0.64 + (i % 3) * 0.025),
            position = toWorld(
              shift(t) + frame.halfWidth * across,
              0,
              (t - 0.5) * site.depth,
            );
          detail(i % 3 ? "reef_sponge" : "reef_fan", {
            site: record,
            position,
            yaw: i * 1.4,
            height: i % 3 ? 5 + (i % 4) : 7,
            floor: true,
          });
        }
      if (site.theme !== "luminous_grotto")
        skeletons.push({
          site: record,
          position:
            site.theme === "kaiju_lair"
              ? new THREE.Vector3(26, 0, -1550)
              : toWorld(16, 0, -8),
          length: site.theme === "kaiju_lair" ? 60 : 44,
          yaw: site.yaw,
          roll: site.theme === "kaiju_lair" ? 0.1 : -0.18,
        });
      // 内壁抓痕和生物薄膜沿真实内表面，而不是悬空贴在水体中的标识。
      for (
        let stripe = 0;
        stripe < (site.theme === "kaiju_lair" ? 3 : 2);
        stripe++
      ) {
        const vertices = [],
          index = [];
        for (let n = 0; n <= 24; n++) {
          const t = 0.25 + (n / 24) * 0.5,
            centerAngle =
              (site.theme === "kaiju_lair" ? 0.22 : 2.75) +
              stripe * 0.07 +
              (n / 24) * 0.15;
          for (const side of [-1, 1]) {
            const p = surface(
              t,
              centerAngle +
                side * (site.theme === "kaiju_lair" ? 0.013 : 0.009),
              true,
            );
            p.y -= 0.08;
            vertices.push(p.x, p.y, p.z);
          }
          if (n < 24) {
            const a = n * 2;
            index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(vertices, 3),
        );
        g.setIndex(index);
        g.computeVertexNormals();
        (site.theme === "kaiju_lair" ? scarParts : filmParts).push(g);
      }
      // 主巢改用真实生成的沉睡巨兽，不再用程序背甲替代角色或挡住新的中央航路。
      for (
        let i = 0;
        i <
        (site.theme === "fossil_passage"
          ? 5
          : site.theme === "kaiju_lair"
            ? 4
            : 0);
        i++
      ) {
        const t = 0.25 + i * 0.12,
          frame = frameAt(t),
          p = toWorld(
            shift(t) + (i % 2 ? 1 : -1) * frame.halfWidth * 0.69,
            0,
            (t - 0.5) * site.depth,
          );
        fossilRows.push({
          position: p,
          rotation: yaw
            .clone()
            .multiply(new THREE.Quaternion().setFromAxisAngle(UP, i * 1.7)),
          scale: site.theme === "kaiju_lair" ? 7 : 4,
          site: record,
        });
      }
    }
    // 邮轮南端至北洞口仅留稀疏贴地菌膜；共用原薄膜材质与合批，不增加实体或光源。
    for (const [n, [x, z]] of [
      [-70, -975],
      [-86, -1008],
      [-94, -1045],
      [-80, -1130],
      [-104, -1220],
      [-88, -1310],
      [-96, -1385],
    ].entries()) {
      const dx = (heightAt(x + 0.4, z) - heightAt(x - 0.4, z)) / 0.8,
        dz = (heightAt(x, z + 0.4) - heightAt(x, z - 0.4)) / 0.8,
        gradient = Math.hypot(dx, dz),
        axis =
          gradient > 0.35
            ? new THREE.Vector2(dz, -dx).normalize()
            : new THREE.Vector2(Math.sin(n * 0.37), Math.cos(n * 0.37)),
        across = new THREE.Vector2(-axis.y, axis.x),
        slopeScale = Math.sqrt(1 + Math.pow(dx * across.x + dz * across.y, 2)),
        length = 5.2 + (n % 3) * 0.35,
        width = 0.62 + (n % 2) * 0.08,
        rows = 24,
        columns = 4,
        vertices = [],
        indices = [],
        firstVertex = filmParts.reduce(
          (sum, g) => sum + g.attributes.position.count,
          0,
        ),
        firstIndex = filmParts.reduce((sum, g) => sum + g.index.count, 0);
      for (let j = 0; j <= rows; j++)
        for (let c = 0; c <= columns; c++) {
          const t = j / rows,
            u = c / columns - 0.5,
            wave =
              (0.18 * Math.sin(t * 7 + n * 0.8) +
                0.045 * Math.sin(t * 19 + n)) /
              slopeScale,
            band = (width * (0.45 + 0.55 * Math.sin(Math.PI * t))) / slopeScale,
            px = x + axis.x * (t - 0.5) * length + across.x * (wave + u * band),
            pz = z + axis.y * (t - 0.5) * length + across.y * (wave + u * band);
          vertices.push(px, heightAt(px, pz) + 0.08, pz);
          if (j < rows && c < columns && j !== 11 && j !== 12) {
            const a = j * (columns + 1) + c,
              b = a + 1,
              d = a + columns + 1;
            indices.push(a, b, d, b, d + 1, d);
          }
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      filmParts.push(geometry);
      approachFilms.push({
        id: `liner_cave_film_${n}`,
        x,
        y: heightAt(x, z) + 0.08,
        z,
        length,
        width,
        firstVertex,
        vertexCount: geometry.attributes.position.count,
        firstIndex,
        indexCount: indices.length,
      });
    }
    function scatter(geometry, material, rows, name) {
      if (!rows.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, rows.length),
        matrix = new THREE.Matrix4(),
        p = new THREE.Vector3(),
        box = geometry.boundingBox;
      mesh.name = name;
      instances.push(mesh);
      root.add(mesh);
      for (const [i, row] of rows.entries()) {
        matrix.compose(
          row.position,
          row.rotation,
          new THREE.Vector3(row.scale, row.scale, row.scale),
        );
        let minimum = Infinity;
        for (let n = 0; n < geometry.attributes.position.count; n++) {
          p.fromBufferAttribute(geometry.attributes.position, n).applyMatrix4(
            matrix,
          );
          minimum = Math.min(minimum, p.y - heightAt(p.x, p.z));
        }
        matrix.elements[13] -= minimum + 0.18;
        mesh.setMatrixAt(i, matrix);
        const center = box.getCenter(new THREE.Vector3()).applyMatrix4(matrix),
          id = `${row.site.id}_${name}_${i}`;
        colliders.push({
          id,
          type: "box",
          x: center.x,
          y: center.y,
          z: center.z,
          halfSize: box
            .getSize(new THREE.Vector3())
            .multiplyScalar(row.scale / 2),
          rotation: row.rotation.clone(),
        });
        row.matrix = matrix.clone();
        row.mesh = mesh;
        row.index = i;
        row.site.contactIds.push(id);
      }
      mesh.computeBoundingSphere();
      scatterBatches.push({ mesh, rows });
      return mesh;
    }
    // 真正生成的骨骸共用近远景和原始 PBR；只给实际骨段逐个变换接触体。
    const boneNear = new THREE.InstancedMesh(
        titanBones.geometry,
        titanBones.material,
        skeletons.length,
      ),
      boneFar = new THREE.InstancedMesh(
        titanBones.farGeometry,
        titanBones.farMaterial,
        skeletons.length,
      ),
      bonePoint = new THREE.Vector3();
    boneNear.name = "bermuda_hf_bones_close";
    boneFar.name = "bermuda_hf_bones_distant";
    root.add(boneNear, boneFar);
    instances.push(boneNear, boneFar);
    for (const [rowIndex, row] of skeletons.entries()) {
      const { x, z } = row.position,
        step = row.length * 0.3,
        floorNormal = new THREE.Vector3(
          heightAt(x - step, z) - heightAt(x + step, z),
          2 * step,
          heightAt(x, z - step) - heightAt(x, z + step),
        ).normalize(),
        rotation = new THREE.Quaternion()
          .setFromUnitVectors(UP, floorNormal)
          .multiply(new THREE.Quaternion().setFromAxisAngle(UP, row.yaw))
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1),
              row.roll,
            ),
          ),
        matrix = new THREE.Matrix4().compose(
          row.position,
          rotation,
          new THREE.Vector3().setScalar(row.length),
        ),
        samples = [],
        bounds = new THREE.Box3();
      let minimumGap = Infinity;
      for (const geometry of [titanBones.geometry, titanBones.farGeometry]) {
        const p = geometry.attributes.position,
          ids = geometry.index
            ? [...new Set(geometry.index.array)]
            : Array.from({ length: p.count }, (_, i) => i);
        for (const i of ids) {
          bonePoint.fromBufferAttribute(p, i).applyMatrix4(matrix);
          bounds.expandByPoint(bonePoint);
          minimumGap = Math.min(
            minimumGap,
            bonePoint.y - heightAt(bonePoint.x, bonePoint.z),
          );
          samples.push(bonePoint.clone());
        }
      }
      const lift = -minimumGap - 0.18;
      matrix.elements[13] += lift;
      const footBand = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.16,
        feet = new Map();
      for (const p of samples) {
        if (p.y > footBand) continue;
        const key = `${Math.floor(p.x / 6)}:${Math.floor(p.z / 6)}`,
          previous = feet.get(key);
        if (!previous || p.y < previous.y) feet.set(key, p);
      }
      row.footSupports = [];
      row.maximumFootGap = 0;
      for (const p of feet.values()) {
        p.y += lift;
        const gap = p.y - heightAt(p.x, p.z);
        row.maximumFootGap = Math.max(row.maximumFootGap, gap);
        if (gap <= 1.2) continue;
        const support = {
          site: row.site,
          position: p.clone().setY(0),
          height: gap + 1.2,
          width: 4.5,
          yaw: rowIndex * 0.7 + row.footSupports.length * 1.3,
          floor: true,
          boneFoot: true,
        };
        detail("rock", support);
        row.footSupports.push(support);
      }
      row.matrix = matrix;
      row.rotation = rotation;
      row.worldCenter = new THREE.Vector3().setFromMatrixPosition(matrix);
      row.mesh = boneNear;
      row.farMesh = boneFar;
      row.index = rowIndex;
      row.width =
        titanBones.geometry.boundingBox.getSize(bonePoint).x * row.length;
      row.height = bounds.max.y - bounds.min.y;
      boneNear.setMatrixAt(rowIndex, matrix);
      boneFar.setMatrixAt(rowIndex, matrix);
      for (const [i, contact] of titanBones.contacts.entries()) {
        const center = new THREE.Vector3(...contact.center).applyMatrix4(
            matrix,
          ),
          id = `${row.site.id}_hf_bone_${rowIndex}_${i}`;
        colliders.push({
          id,
          type: "box",
          x: center.x,
          y: center.y,
          z: center.z,
          halfSize: new THREE.Vector3(...contact.half).multiplyScalar(
            row.length,
          ),
          rotation: rotation
            .clone()
            .multiply(new THREE.Quaternion(...contact.quaternion)),
        });
        row.site.contactIds.push(id);
      }
    }
    boneNear.computeBoundingSphere();
    boneFar.computeBoundingSphere();
    boneNear.count = 0;
    boneNear.visible = false;
    detailBatches.push({
      kind: "titan_bones",
      near: boneNear,
      far: boneFar,
      rows: skeletons,
      asset: titanBones,
      nearMaterial: titanBones.material,
      farMaterial: titanBones.farMaterial,
      geological: true,
    });
    for (const [kind, rows] of detailRows) {
      const a = assetFor(kind),
        geological = !kind.startsWith("reef_"),
        box = a.geometry.boundingBox,
        extent = box.getSize(new THREE.Vector3()),
        center = box.getCenter(new THREE.Vector3()),
        nearMaterial = geological ? a.material : keep(a.material.clone()),
        farMaterial = geological ? a.farMaterial : keep(a.farMaterial.clone()),
        near = new THREE.InstancedMesh(a.geometry, nearMaterial, rows.length),
        far = new THREE.InstancedMesh(a.farGeometry, farMaterial, rows.length),
        dummy = new THREE.Object3D(),
        foot = sceneryFootSamples([a.geometry, a.farGeometry], 0.12);
      if (!geological) {
        nearMaterial.emissive.set("#527f75");
        farMaterial.emissive.set("#527f75");
        nearMaterial.emissiveIntensity = farMaterial.emissiveIntensity = 0.12;
      }
      near.name = `cave_${kind}_close`;
      far.name = `cave_${kind}_distant`;
      root.add(near, far);
      instances.push(near, far);
      for (const [i, row] of rows.entries()) {
        let matrix;
        if (row.floor) {
          seatUprightScenery(dummy, {
            x: row.position.x,
            z: row.position.z,
            yaw: row.yaw,
            scale: row.boneFoot
              ? [
                  row.width / extent.x,
                  row.height / extent.y,
                  row.width / extent.z,
                ]
              : row.height / extent.y,
            heightAt,
            samples: foot,
            embed: 0.15,
          });
          matrix = dummy.matrix.clone();
          if (row.boneFoot) {
            const center = box
                .getCenter(new THREE.Vector3())
                .applyMatrix4(matrix),
              id = `${row.site.id}_bone_foot_${i}`;
            colliders.push({
              id,
              type: "box",
              x: center.x,
              y: center.y,
              z: center.z,
              halfSize: box
                .getSize(new THREE.Vector3())
                .multiply(dummy.scale)
                .multiplyScalar(0.5),
              rotation: dummy.quaternion.clone(),
            });
            row.site.contactIds.push(id);
          }
        } else {
          const rotation = new THREE.Quaternion()
              .setFromUnitVectors(UP, row.normal)
              .multiply(new THREE.Quaternion().setFromAxisAngle(UP, row.yaw)),
            scale = new THREE.Vector3(
              row.width / extent.x,
              row.height / extent.y,
              (row.width * 0.65) / extent.z,
            ),
            p = row.position
              .clone()
              .addScaledVector(
                row.normal,
                row.height * 0.08 - (row.embed || 0),
              );
          matrix = new THREE.Matrix4()
            .compose(p, rotation, scale)
            .multiply(
              new THREE.Matrix4().makeTranslation(
                -center.x,
                -center.y,
                -center.z,
              ),
            );
          for (let band = 0; band < 4; band++) {
            const bounds = new THREE.Box3(),
              lo = box.min.y + (extent.y * band) / 4,
              hi = box.min.y + (extent.y * (band + 1)) / 4;
            for (let v = 0; v < a.geometry.attributes.position.count; v++) {
              point.fromBufferAttribute(a.geometry.attributes.position, v);
              if (point.y >= lo - 1e-5 && point.y <= hi + 1e-5)
                bounds.expandByPoint(point);
            }
            bounds.min.y = lo;
            bounds.max.y = hi;
            const p = bounds
                .getCenter(new THREE.Vector3())
                .applyMatrix4(matrix),
              id = `${row.site.id}_detail_${kind}_${i}_${band}`;
            colliders.push({
              id,
              type: "box",
              x: p.x,
              y: p.y,
              z: p.z,
              halfSize: bounds
                .getSize(new THREE.Vector3())
                .multiply(scale)
                .multiplyScalar(0.5)
                .addScalar(0.06),
              rotation: rotation.clone(),
            });
            row.site.contactIds.push(id);
          }
        }
        row.matrix = matrix;
        row.close = false;
        near.setMatrixAt(i, matrix);
        far.setMatrixAt(i, matrix);
      }
      near.computeBoundingSphere();
      far.computeBoundingSphere();
      near.count = 0;
      near.visible = false;
      detailBatches.push({
        kind,
        near,
        far,
        rows,
        asset: a,
        nearMaterial,
        farMaterial,
        geological,
      });
    }

    scatter(fossils.geometry, fossils.material, fossilRows, "feeding_fossils");
    for (const [parts, material, name] of [
      [scarParts, scarMaterial, "titan_claw_scores"],
      [filmParts, filmMaterial, "cave_biological_seams"],
    ])
      if (parts.length) {
        const geometry = keep(mergeGeometries(parts));
        for (const p of parts) p.dispose();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        root.add(mesh);
      }
    portalSystem = makePortalSystem(
      records[0],
      heightAt,
      root,
      keep,
      mainStone,
      colliders,
      assetFor("rock"),
      instances,
    );
    let escapeApproach = [],
      waypointCache = null,
      dynamicContactQuery = null;
    const getEscapeRoutes = (start) =>
      BERMUDA_TITAN_ESCAPE_ROUTES.map((route) => {
        const points = [
            ...escapeApproach.map((p) => p.clone()),
            ...route.points
              .slice(escapeApproach.length > 2 ? 2 : 0)
              .map((p) =>
                p.length === 3
                  ? new THREE.Vector3(...p)
                  : new THREE.Vector3(
                      p[0],
                      heightAt(...p) + route.floorOffset,
                      p[1],
                    ),
              ),
          ].filter(
            (p, i, all) => i === 0 || p.distanceToSquared(all[i - 1]) > 1e-8,
          ),
          outsideSafe =
            route.outsideSafe.length === 3
              ? new THREE.Vector3(...route.outsideSafe)
              : new THREE.Vector3(
                  route.outsideSafe[0],
                  heightAt(...route.outsideSafe) + route.floorOffset,
                  route.outsideSafe[1],
                );
        if (start) {
          const first = Array.isArray(start)
            ? new THREE.Vector3(...start)
            : new THREE.Vector3().copy(start);
          if (first.distanceTo(points[0]) > 0.01) points.unshift(first);
        }
        for (let i = points.length - 1; i > 0; i--)
          if (points[i].distanceToSquared(points[i - 1]) < 1e-6)
            points.splice(i, 1);
        let cost = 0;
        for (let i = 1; i < points.length; i++)
          cost += points[i - 1].distanceTo(points[i]);
        cost += points.at(-1).distanceTo(outsideSafe);
        return {
          id: route.id,
          points,
          outsideSafe,
          cost,
          turnAllowance: route.turnAllowance,
        };
      });
    const clearTravel = (from, to, body = {}) => {
      const length = body.length ?? 30,
        radius = body.radius ?? bodyRadius(length),
        d = new THREE.Vector3().copy(to).sub(from),
        distance = d.length();
      if (distance < 0.05) return true;
      d.divideScalar(distance);
      if (
        castBodySegment(from, to, {
          // 候选包络复用精确求解器的完整球链尺寸；地表支撑仍保留渲染躯干余量。
          colliders: (start, end, dimensions) => [
            ...queryStaticColliders(
              portalSystem.worldContacts(),
              start,
              end,
              dimensions,
            ),
            ...(Array.isArray(body.dynamicContacts)
              ? body.dynamicContacts
              : dynamicContactQuery?.(start, end, dimensions) || []),
          ],
          radius,
          length,
          forward: d,
        })
      )
        return false;
      const count = Math.max(1, Math.ceil(distance / 8)),
        p = new THREE.Vector3();
      for (let i = 0; i <= count; i++) {
        p.copy(from).lerp(to, i / count);
        if (
          p.y <
          bodyTerrainFloor(p.x, p.z, {
            heightAt,
            radius,
            length: (length * 0.52) / 0.42,
            forward: d,
            margin: 0.4,
          }) -
            0.05
        )
          return false;
      }
      return true;
    };
    const escapeWaypoint = (position, body = {}) => {
      const p = new THREE.Vector3().copy(position),
        world = portalSystem.worldContacts(),
        length = body.length ?? 30,
        radius = body.radius ?? bodyRadius(length),
        dynamic = Array.isArray(body.dynamicContacts)
          ? body.dynamicContacts
          : dynamicContactQuery,
        dynamicCount = Array.isArray(dynamic) ? dynamic.length : 0,
        now = globalThis.performance?.now() ?? Date.now();
      if (
        waypointCache &&
        waypointCache.world === world &&
        waypointCache.count === world.length &&
        waypointCache.length === length &&
        waypointCache.radius === radius &&
        waypointCache.dynamic === dynamic &&
        waypointCache.dynamicCount === dynamicCount &&
        waypointCache.position.distanceToSquared(p) < 9 &&
        now >= waypointCache.time &&
        (!dynamic || now - waypointCache.time < 200)
      )
        return waypointCache.result;
      let result = null,
        best = Infinity;
      for (const route of getEscapeRoutes()) {
        const points = [...route.points, route.outsideSafe],
          suffix = Array(points.length).fill(0);
        for (let i = points.length - 2; i >= 0; i--)
          suffix[i] = suffix[i + 1] + points[i].distanceTo(points[i + 1]);
        for (let i = 0; i < points.length - 1; i++) {
          const segment = points[i + 1].clone().sub(points[i]),
            t = THREE.MathUtils.clamp(
              p.clone().sub(points[i]).dot(segment) /
                Math.max(1e-9, segment.lengthSq()),
              0,
              1,
            ),
            projection = points[i].clone().addScaledVector(segment, t),
            target = p.distanceTo(projection) > 6 ? projection : points[i + 1],
            cost =
              p.distanceTo(projection) +
              projection.distanceTo(points[i + 1]) +
              suffix[i + 1];
          if (cost >= best || !clearTravel(p, target, body)) continue;
          best = cost;
          result = {
            id: route.id,
            x: target.x,
            y: target.y,
            z: target.z,
            nextIndex: i + 1,
            cost,
            outsideSafe: route.outsideSafe,
            turnAllowance: route.turnAllowance,
          };
        }
      }
      waypointCache = {
        position: p,
        // 昂贵通路检查完成后才开始既有200毫秒复用期，避免计算本身使缓存立即过期。
        time: globalThis.performance?.now() ?? Date.now(),
        length,
        radius,
        dynamic,
        dynamicCount,
        world,
        count: world.length,
        result,
      };
      return result;
    };
    const entranceWaypoint = (position, body = {}) => {
      const p = new THREE.Vector3().copy(position);
      for (const route of getEscapeRoutes().sort(
        (a, b) =>
          p.distanceToSquared(a.outsideSafe) -
          p.distanceToSquared(b.outsideSafe),
      )) {
        if (clearTravel(p, route.outsideSafe, body))
          return {
            id: route.id,
            x: route.outsideSafe.x,
            y: route.outsideSafe.y,
            z: route.outsideSafe.z,
            nextIndex: 0,
            cost: p.distanceTo(route.outsideSafe),
          };
      }
      return null;
    };
    const prepare = async (options) => {
      const ready = (
        await Promise.all(assets.map((a) => a.prepare(options)))
      ).every(Boolean);
      for (const b of detailBatches)
        if (!b.geological) {
          b.nearMaterial.map = b.asset.material.map;
          b.nearMaterial.vertexColors = b.asset.material.vertexColors;
          b.nearMaterial.needsUpdate = true;
        }
      return ready;
    };
    root.userData.prepareMaterials = prepare;
    void prepare();
    root.userData.records = records;
    return {
      root,
      colliders,
      landmarks,
      lightSources,
      records,
      exits: portalSystem.exits,
      checkEscape: portalSystem.checkEscape,
      isEscapeSafe: portalSystem.isEscapeSafe,
      bindWorldColliders(array, dynamicQuery) {
        portalSystem.bindWorldColliders(array);
        if (typeof dynamicQuery === "function")
          dynamicContactQuery = dynamicQuery;
        waypointCache = null;
      },
      bindDynamicContacts(query) {
        if (typeof query !== "function")
          throw new TypeError("Dynamic cave contacts require a function");
        dynamicContactQuery = query;
        waypointCache = null;
      },
      setSealing: portalSystem.setSealing,
      seal: portalSystem.seal,
      resetSealing() {
        waypointCache = null;
        portalSystem.resetSealing();
      },
      get isSealed() {
        return portalSystem.isSealed;
      },
      get sealingProgress() {
        return portalSystem.sealingProgress;
      },
      getEscapeRoutes,
      escapeWaypoint,
      entranceWaypoint,
      setEscapeApproach(points) {
        escapeApproach = points.map((p) =>
          Array.isArray(p)
            ? new THREE.Vector3(...p)
            : new THREE.Vector3().copy(p),
        );
        waypointCache = null;
      },
      get escapeRoutes() {
        return getEscapeRoutes();
      },
      doorContacts: portalSystem.doorContacts,
      prepare,
      props: { plateRows, fossilRows, skeletons, detailBatches, approachFilms },
      update(elapsed, position, highQuality = true) {
        if (disposed || (elapsed >= last && elapsed - last < 0.4)) return;
        last = elapsed;
        for (const b of detailBatches) {
          let n = 0,
            f = 0;
          for (const row of b.rows) {
            const distance = point
                .setFromMatrixPosition(row.matrix)
                .distanceTo(position),
              nearRange = b.geological
                ? highQuality
                  ? 110
                  : 70
                : highQuality
                  ? 35
                  : 22;
            row.close = distance < nearRange + (row.close ? 12 : 0);
            if (distance > (b.geological ? 480 : 220)) continue;
            (row.close ? b.near : b.far).setMatrixAt(
              row.close ? n++ : f++,
              row.matrix,
            );
          }
          for (const [mesh, count] of [
            [b.near, n],
            [b.far, f],
          ]) {
            mesh.count = count;
            mesh.visible = count > 0;
            mesh.instanceMatrix.needsUpdate = true;
          }
        }
        for (const b of scatterBatches) {
          let count = 0;
          for (const row of b.rows)
            if (
              point.setFromMatrixPosition(row.matrix).distanceTo(position) <
              (b.mesh.name === "shed_dorsal_plates" ? 350 : 250)
            )
              b.mesh.setMatrixAt(count++, row.matrix);
          b.mesh.count = count;
          b.mesh.visible = count > 0;
          b.mesh.instanceMatrix.needsUpdate = true;
        }
        for (const record of records)
          record.root.visible =
            point
              .set(
                record.x,
                record.floorMaximum + record.height * 0.4,
                record.z,
              )
              .distanceTo(position) < (record.root.visible ? 950 : 900);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
