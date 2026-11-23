import * as T from "three";
import {
  createTitanUndersideSampler,
  createTitanRockRenderGeometry,
} from "./bermuda_titan_resting_rock.js";
import { createBermudaTitanRelic } from "./bermuda_titan_relic.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { createTerrainSurface } from "./terrain_surface.js";
import heightFit from "./assets/models/bermuda_titan_paw_jewel_fit.json" with { type: "json" };

// 以真实四足最低承重点定一个宽缓玄武岩阶，不追踪HF孔洞；整块台岩闭合到底面。
export function createBermudaTitanPawRock(
  parent,
  { near, pose, setPose, heightAt },
) {
  const supportPoses = [1, 0.75, 0.5, 0.25, 0],
    point = new T.Vector3(),
    used = [...new Set(near.geometry.index.array)],
    skinMinimumByPose = [];
  for (const guardAmount of supportPoses) {
    setPose({ guardAmount });
    let minY = Infinity;
    for (const i of used) {
      near.getVertexPosition(i, point).applyMatrix4(near.matrixWorld);
      minY = Math.min(minY, point.y);
    }
    skinMinimumByPose.push({ guardAmount, minY });
  }
  setPose({ guardAmount: 1 });
  const under = createTitanUndersideSampler(near),
    raw = new T.Vector3(-0.125, 0, -0.32).applyMatrix4(pose.matrixWorld),
    ceiling = under(raw.x, raw.z),
    jewel = createBermudaTitanRelic(),
    jg = jewel.root.children[0].geometry.attributes.position;
  try {
    if (ceiling === null)
      throw Error(
        "The fixed jewel requires the actual true front sole above it",
      );
    let low = Infinity,
      high = -Infinity;
    for (let i = 0; i < jg.count; i++) {
      low = Math.min(low, jg.getY(i));
      high = Math.max(high, jg.getY(i));
    }
    jewel.dispose();
    const relicPoint = new T.Vector3(
        raw.x,
        ceiling - high - 1.2 + heightFit.heightShift,
        raw.z,
      ),
      jewelFloor = relicPoint.y + low - 0.1,
      originalGround = heightAt(raw.x, raw.z),
      ledgeTop = Math.min(...skinMinimumByPose.map((p) => p.minY)) - 0.1;
    if (jewelFloor < originalGround + 0.02)
      throw Error("The jewel ledge may not excavate the actual seabed");

    // 仅用掌垫内的有限承托点拟合低频座圈；整体平移下限保守包在实际闭掌下，不逐孔拉尖柱。
    const anchors = [];
    for (const r of [0, 4, 7])
      for (let i = 0; i < (r ? 16 : 1); i++) {
        const q = (i / 16) * Math.PI * 2,
          x = Math.cos(q) * r,
          z = (Math.sin(q) * r * 4) / 7,
          y = under(raw.x + x, raw.z + z);
        if (y === null)
          throw Error(
            "The seated palm ring must remain beneath the actual continuous palm: " +
              JSON.stringify({ x, z }),
          );
        anchors.push({ x, z, y });
      }
    let sx2 = 0,
      sz2 = 0,
      sxz = 0,
      sx = 0,
      sz = 0,
      sy = 0,
      sxy = 0,
      szy = 0;
    for (const p of anchors) {
      sx2 += p.x * p.x;
      sz2 += p.z * p.z;
      sxz += p.x * p.z;
      sx += p.x;
      sz += p.z;
      sy += p.y;
      sxy += p.x * p.y;
      szy += p.z * p.y;
    }
    const matrix = [
      [anchors.length, sx, sz, sy],
      [sx, sx2, sxz, sxy],
      [sz, sxz, sz2, szy],
    ];
    for (let k = 0; k < 3; k++) {
      const s = matrix[k][k];
      for (let j = k; j < 4; j++) matrix[k][j] /= s;
      for (let i = 0; i < 3; i++)
        if (i !== k) {
          const q = matrix[i][k];
          for (let j = k; j < 4; j++) matrix[i][j] -= q * matrix[k][j];
        }
    }
    const plane = { a: matrix[0][3], b: matrix[1][3], c: matrix[2][3] },
      worldVertices = new Map();
    for (const i of used)
      worldVertices.set(
        i,
        near
          .getVertexPosition(i, new T.Vector3())
          .applyMatrix4(near.matrixWorld),
      );
    const outline = Array.from({ length: 24 }, (_, i) => {
        const q = (i / 24) * Math.PI * 2;
        return {
          x: raw.x + 9 * Math.cos(q),
          z: raw.z + ((9 * 4) / 7) * Math.sin(q),
        };
      }),
      cross = (a, b, p) =>
        (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    function clipToSeat(vertices) {
      let polygon = vertices.map((v) => v.clone());
      for (let k = 0; k < outline.length && polygon.length; k++) {
        const a = outline[k],
          b = outline[(k + 1) % outline.length],
          next = [];
        for (let i = 0; i < polygon.length; i++) {
          const u = polygon[i],
            v = polygon[(i + 1) % polygon.length],
            du = cross(a, b, u),
            dv = cross(a, b, v);
          if (du >= -1e-9) next.push(u);
          if (du >= 0 !== dv >= 0) next.push(u.clone().lerp(v, du / (du - dv)));
        }
        polygon = next;
      }
      return polygon;
    }
    let cap = Infinity;
    const index = near.geometry.index;
    for (let j = 0; j < index.count; j += 3) {
      const v = [0, 1, 2].map((k) => worldVertices.get(index.getX(j + k)));
      if (
        Math.max(...v.map((p) => p.x)) < raw.x - 9 ||
        Math.min(...v.map((p) => p.x)) > raw.x + 9 ||
        Math.max(...v.map((p) => p.z)) < raw.z - (9 * 4) / 7 ||
        Math.min(...v.map((p) => p.z)) > raw.z + (9 * 4) / 7
      )
        continue;
      for (const p of clipToSeat(v))
        cap = Math.min(
          cap,
          p.y - plane.b * (p.x - raw.x) - plane.c * (p.z - raw.z),
        );
    }
    plane.a = Math.min(plane.a, cap - 0.15);
    function topAt(x, z) {
      const ground = heightAt(x, z) - 0.16,
        rho =
          (Math.pow(Math.abs((x + 300) / 145), 4) +
            Math.pow(Math.abs((z + 1590) / 65), 4)) **
          0.25,
        fade = 1 - T.MathUtils.smoothstep(rho, 0.83, 1.2),
        relief = 0.06 * (1 + Math.sin(x / 24) * Math.cos(z / 31)),
        shelf = ground + Math.max(0, ledgeTop - relief - ground) * fade,
        dx = x - relicPoint.x,
        dz = z - relicPoint.z,
        r = Math.hypot(dx, (dz * 7) / 4),
        toeFront =
          T.MathUtils.smoothstep(dx, 1, 5) *
          (1 - T.MathUtils.smoothstep(dx, 28, 38)) *
          (1 - T.MathUtils.smoothstep(Math.abs(dz), 6, 11)),
        well = 1 - T.MathUtils.smoothstep(r, 5.5, 7.8),
        recess = Math.max(ground, jewelFloor),
        lowered = T.MathUtils.lerp(
          shelf,
          Math.min(shelf, recess),
          Math.max(well, toeFront),
        ),
        seat =
          T.MathUtils.smoothstep(r, 5.5, 6.8) *
          (1 - T.MathUtils.smoothstep(r, 7.5, 9)) *
          (1 - toeFront),
        seatY = plane.a + plane.b * dx + plane.c * dz;
      const accepted = lowered + Math.max(0, seatY - lowered) * seat,
        // 仅撤去南侧身体进路中无承重的额外填岩；晶核底座和原海床保持不变。
        channelCore = T.MathUtils.lerp(
          7.5,
          3,
          T.MathUtils.smoothstep(dz, -9, -3),
        ),
        channelAcross =
          1 -
          T.MathUtils.smoothstep(Math.abs(dx), channelCore, channelCore + 5),
        channelNorth = 1 - T.MathUtils.smoothstep(dz, 0, 3),
        retainSeat = 1 - T.MathUtils.smoothstep(Math.hypot(dx, dz), 4, 5.5),
        channelDeep = 1 - T.MathUtils.smoothstep(dz, -13, -6),
        channelFloor = Math.max(ground, jewelFloor - 5 * channelDeep);
      return T.MathUtils.lerp(
        accepted,
        Math.min(accepted, channelFloor),
        channelAcross * channelNorth * (1 - retainSeat),
      );
    }
    function coordinates(min, max, denseMin, denseMax, critical) {
      const values = new Set([min, max, ...critical]);
      for (let x = min; x < max; x += 6) values.add(x);
      for (let x = denseMin; x <= denseMax; x += 2) values.add(x);
      return [...values]
        .filter((v) => v >= min && v <= max)
        .sort((a, b) => a - b);
    }
    const seatRadii = [5.5, 6.8, 7.5, 9],
      xs = coordinates(-470, -130, -215, -172, [
        relicPoint.x - 5,
        relicPoint.x,
        relicPoint.x + 5,
        ...seatRadii.flatMap((r) => [relicPoint.x - r, relicPoint.x + r]),
      ]),
      zs = coordinates(-1690, -1490, -1654, -1604, [
        relicPoint.z - 5,
        relicPoint.z,
        relicPoint.z + 5,
        ...seatRadii.flatMap((r) => [
          relicPoint.z - (r * 4) / 7,
          relicPoint.z + (r * 4) / 7,
        ]),
      ]),
      positions = [],
      indices = [],
      nx = xs.length - 1,
      nz = zs.length - 1;
    for (const z of zs) for (const x of xs) positions.push(x, topAt(x, z), z);
    const count = positions.length / 3;
    for (const z of zs)
      for (const x of xs) positions.push(x, heightAt(x, z) - 2, z);
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) {
        const a = z * (nx + 1) + x,
          b = a + 1,
          c = a + nx + 1,
          d = c + 1;
        indices.push(
          a,
          c,
          b,
          b,
          c,
          d,
          count + a,
          count + b,
          count + c,
          count + b,
          count + d,
          count + c,
        );
      }
    const boundary = [];
    for (let x = 0; x <= nx; x++) boundary.push(x);
    for (let z = 1; z <= nz; z++) boundary.push(z * (nx + 1) + nx);
    for (let x = nx - 1; x >= 0; x--) boundary.push(nz * (nx + 1) + x);
    for (let z = nz - 1; z > 0; z--) boundary.push(z * (nx + 1));
    for (let i = 0; i < boundary.length; i++) {
      const a = boundary[i],
        b = boundary[(i + 1) % boundary.length];
      indices.push(a, b, count + a, count + a, b, count + b);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = new T.MeshStandardMaterial({
      color: 0x4b5b60,
      roughness: 0.96,
    });
    addSurfaceDetail(material, "stone", 0.8);
    const body = new T.Mesh(geometry, material);
    body.name = "whole_titan_smooth_solid_basalt_ledge_and_open_jewel_recess";
    parent.add(body);
    const metadata = {
      scope:
        "Accepted seated-paw basalt mesh with fitted static solid contacts and actual triangle ground",
      supportPoses,
      skinMinimumByPose,
      ledgeTop,
      maxRelief: 0.12,
      profile:
        "Broad ledge, one fitted low palm seat and toe-front +X ramp returning only added rock to actual terrain",
      seatPlane: plane,
      seatAnchors: anchors.length,
      seatCriticalRadii: seatRadii,
      seatCollar: {
        physicalRadius: 4,
        blend: 1.5,
        profile: "Exact accepted original stone seat/bowl, no separate gate",
      },
      southChannel: {
        coreHalfWidth: [7.5, 3],
        outerFade: 5,
        northFade: [0, 3],
        deepBlend: [-13, -6],
        maximumDepthBelowJewelFloor: 5,
        preservesOriginalTerrain: true,
        preservesJewelFloor: true,
      },
      sourceHeightFit: heightFit.minDistance,
      relicPoint: relicPoint.toArray(),
      sourceRawFootXZ: [-0.125, -0.32],
      closedCeiling: ceiling,
      jewelFloor,
      originalGround,
      crystalTopGap: 1.2 - heightFit.heightShift,
      bodyTriangles: indices.length / 3,
      footTriangles: 0,
      topVertices: count,
    };
    body.userData.terrainContact = true;
    body.updateWorldMatrix(true, false);
    const contacts = fitStructuredContacts(
        geometry,
        xs.length,
        zs.length,
        heightAt,
      ),
      surface = createTerrainSurface(body, { fallback: heightAt }),
      floorSurface = (x, z) => Math.max(heightAt(x, z), surface(x, z));
    floorSurface.supportHeight = (x, z, radius) =>
      Math.max(
        heightAt.supportHeight
          ? heightAt.supportHeight(x, z, radius)
          : heightAt(x, z) + radius,
        surface.supportHeight(x, z, radius),
      );
    floorSurface.stats = surface.stats;
    metadata.contacts = contacts.length;
    metadata.contactFit = contacts.fit;
    metadata.relicQuaternion = pose.quaternion.toArray();
    metadata.surface = surface.stats;
    // surface 已复制完整原始三角；渲染另裁零增高海床皮，不改变地面或接触体。
    const surfaceIndices = nx * nz * 12,
      render = createTitanRockRenderGeometry(geometry, {
        heightAt,
        profileAt: topAt,
        groundOffset: -0.16,
        isTopTriangle: (offset) => offset < surfaceIndices && offset % 12 < 6,
        isSkirtTriangle: (offset) => offset >= surfaceIndices,
      });
    body.geometry = render.geometry;
    metadata.renderCull = render.stats;
    let disposed = false;
    return {
      mesh: body,
      sourceGeometry: geometry,
      renderCull: render.stats,
      contacts,
      floorSurface,
      topAt: surface,
      relicPoint,
      relicQuaternion: pose.quaternion.clone(),
      metadata,
      dispose() {
        if (disposed) return;
        disposed = true;
        surface.dispose();
        body.removeFromParent();
        if (render.geometry !== geometry) render.geometry.dispose();
        geometry.dispose();
        material.dispose();
      },
    };
  } finally {
    under.dispose();
    jewel.dispose();
  }
}

// 接触体只包当前结构格的真实两片顶面；陡面沿长轴局部裁剪，不重建已验收岩床。
function fitStructuredContacts(geometry, columns, rows, heightAt) {
  const positions = geometry.attributes.position,
    topCount = columns * rows,
    contacts = [],
    fit = {
      sourceQuads: (columns - 1) * (rows - 1),
      splits: 0,
      rangeLeaves: 0,
      diagonalLeaves: 0,
      maxTopRange: 0,
      maxEnvelope: 0,
      maxDepth: 0,
      exactColumnLeaves: 0,
      exactColumnCapsules: 0,
      maximumColumnEnvelope: 0,
    },
    point = (i) => new T.Vector3().fromBufferAttribute(positions, i);
  function clip(polygons, axis, edge, above) {
    const result = [];
    for (const polygon of polygons) {
      const next = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i],
          b = polygon[(i + 1) % polygon.length],
          inside = above ? a[axis] >= edge : a[axis] <= edge,
          nextInside = above ? b[axis] >= edge : b[axis] <= edge;
        if (inside) next.push(a);
        if (inside !== nextInside)
          next.push(a.clone().lerp(b, (edge - a[axis]) / (b[axis] - a[axis])));
      }
      if (next.length >= 3) result.push(next);
    }
    return result;
  }
  // 仅替换已实测的座圈角部与相邻护足入口假挡：投影小三角的整根实柱由既有精确胶囊完整包住。
  function exactColumn(vertices, bottom, id, child = "0") {
    const edges = [
        vertices[0].distanceToSquared(vertices[1]),
        vertices[1].distanceToSquared(vertices[2]),
        vertices[2].distanceToSquared(vertices[0]),
      ],
      longest = edges.indexOf(Math.max(...edges));
    if (edges[longest] > 0.5 ** 2) {
      const a = longest,
        b = (longest + 1) % 3,
        c = (longest + 2) % 3,
        middle = vertices[a].clone().lerp(vertices[b], 0.5);
      exactColumn([vertices[a], middle, vertices[c]], bottom, id, child + "0");
      exactColumn([middle, vertices[b], vertices[c]], bottom, id, child + "1");
      return;
    }
    const x = vertices.reduce((sum, p) => sum + p.x, 0) / 3,
      z = vertices.reduce((sum, p) => sum + p.z, 0) / 3,
      radius =
        Math.max(...vertices.map((p) => Math.hypot(p.x - x, p.z - z))) + 0.02,
      maximum = Math.max(...vertices.map((p) => p.y)),
      minimum = Math.min(...vertices.map((p) => p.y)),
      top = maximum + 0.05,
      envelope = maximum - minimum + 0.05 + radius;
    if (!(envelope < 2))
      throw new Error("The local exact rock column exceeded its skin envelope");
    fit.exactColumnCapsules++;
    fit.maximumColumnEnvelope = Math.max(fit.maximumColumnEnvelope, envelope);
    contacts.push({
      id: `${id}_column_${child}`,
      type: "capsule",
      x,
      y: (bottom + top) / 2,
      z,
      a: new T.Vector3(x, bottom, z),
      b: new T.Vector3(x, top, z),
      radius,
      titanBreathIgnore: true,
      supportMinimum: minimum,
      sourceLeaf: id,
      sourceTopTriangle: vertices.map((p) => p.toArray()),
      maximumEnvelope: envelope,
    });
  }
  function fill(topPolygons, bottomPolygons, x0, x1, z0, z1, depth) {
    const heights = topPolygons.flatMap((polygon) => polygon.map((p) => p.y)),
      minimum = Math.min(...heights),
      maximum = Math.max(...heights),
      range = maximum - minimum,
      diagonal = Math.hypot(x1 - x0, z1 - z0),
      byRange = range <= 1.75;
    if (!byRange && diagonal + 0.05 + 0.03 >= 2) {
      fit.splits++;
      const axis = x1 - x0 >= z1 - z0 ? "x" : "z",
        middle = axis === "x" ? (x0 + x1) / 2 : (z0 + z1) / 2;
      fill(
        clip(topPolygons, axis, middle, false),
        clip(bottomPolygons, axis, middle, false),
        x0,
        axis === "x" ? middle : x1,
        z0,
        axis === "z" ? middle : z1,
        depth + 1,
      );
      fill(
        clip(topPolygons, axis, middle, true),
        clip(bottomPolygons, axis, middle, true),
        axis === "x" ? middle : x0,
        x1,
        axis === "z" ? middle : z0,
        z1,
        depth + 1,
      );
      return;
    }
    const original = [
        heightAt(x0, z0),
        heightAt(x1, z0),
        heightAt(x0, z1),
        heightAt(x1, z1),
        heightAt((x0 + x1) / 2, (z0 + z1) / 2),
      ],
      bottom = Math.min(
        ...bottomPolygons.flatMap((polygon) => polygon.map((p) => p.y)),
        ...original.map((y) => y - 2),
      ),
      top = maximum + 0.05;
    if (![bottom, top].every(Number.isFinite) || top <= bottom)
      throw new Error("Paw rock contact has invalid source bounds");
    fit[byRange ? "rangeLeaves" : "diagonalLeaves"]++;
    fit.maxTopRange = Math.max(fit.maxTopRange, range);
    fit.maxDepth = Math.max(fit.maxDepth, depth);
    fit.maxEnvelope = Math.max(
      fit.maxEnvelope,
      Math.min(range + 0.05 + 0.03, diagonal + 0.05 + 0.03),
    );
    const id = `titan_paw_rock_${fit.rangeLeaves + fit.diagonalLeaves - 1}`;
    if (
      x0 >= -202.000001 &&
      x1 <= -200.39999 &&
      z0 >= -1630.000001 &&
      z1 <= -1628.0
    ) {
      fit.exactColumnLeaves++;
      for (const [i, polygon] of topPolygons.entries())
        for (let j = 1; j < polygon.length - 1; j++)
          exactColumn(
            [polygon[0], polygon[j], polygon[j + 1]],
            bottom,
            id,
            `${i}_${j}_`,
          );
      return;
    }
    contacts.push({
      id,
      type: "box",
      x: (x0 + x1) / 2,
      y: (bottom + top) / 2,
      z: (z0 + z1) / 2,
      halfSize: new T.Vector3(
        (x1 - x0) / 2 + 0.02,
        (top - bottom) / 2,
        (z1 - z0) / 2 + 0.02,
      ),
      rotation: new T.Quaternion(),
      titanBreathIgnore: true,
      supportMinimum: minimum,
    });
  }
  for (let z = 0; z < rows - 1; z++)
    for (let x = 0; x < columns - 1; x++) {
      const a = z * columns + x,
        b = a + 1,
        c = a + columns,
        d = c + 1,
        top = [
          [point(a), point(c), point(b)],
          [point(b), point(c), point(d)],
        ],
        bottom = [
          [point(topCount + a), point(topCount + b), point(topCount + c)],
          [point(topCount + b), point(topCount + d), point(topCount + c)],
        ];
      fill(top, bottom, top[0][0].x, top[0][2].x, top[0][0].z, top[0][1].z, 0);
    }
  contacts.fit = fit;
  return contacts;
}
