import * as T from "three";
import { createTitanUndersideSampler } from "../../../src/bermuda_titan_resting_rock.js";
import { createBermudaTitanRelic } from "../../../src/bermuda_titan_relic.js";
import { addSurfaceDetail } from "../../../src/ocean_visuals.js";
import heightFit from "./height_fit.json" with { type: "json" };

// 以真实四足最低承重点定一个宽缓玄武岩阶，不追踪HF孔洞；整块台岩闭合到底面。
export function createWholeWristSupports(
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
  if (ceiling === null)
    throw Error("The fixed jewel requires the actual true front sole above it");
  let low = Infinity,
    high = -Infinity;
  for (let i = 0; i < jg.count; i++) {
    low = Math.min(low, jg.getY(i));
    high = Math.max(high, jg.getY(i));
  }
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
  jewel.root.position.copy(relicPoint);
  jewel.root.quaternion.copy(pose.quaternion);
  parent.add(jewel.root);
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
      near.getVertexPosition(i, new T.Vector3()).applyMatrix4(near.matrixWorld),
    );
  const outline = Array.from({ length: 24 }, (_, i) => {
      const q = (i / 24) * Math.PI * 2;
      return {
        x: raw.x + 9 * Math.cos(q),
        z: raw.z + ((9 * 4) / 7) * Math.sin(q),
      };
    }),
    cross = (a, b, p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
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
    return lowered + Math.max(0, seatY - lowered) * seat;
  }
  function coordinates(min, max, denseMin, denseMax, critical) {
    const values = new Set([min, max, ...critical]);
    for (let x = min; x < max; x += 6) values.add(x);
    for (let x = denseMin; x <= denseMax; x += 2) values.add(x);
    return [...values]
      .filter((v) => v >= min && v <= max)
      .sort((a, b) => a - b);
  }
  const xs = coordinates(-470, -130, -215, -172, [
      relicPoint.x - 5,
      relicPoint.x,
      relicPoint.x + 5,
    ]),
    zs = coordinates(-1690, -1490, -1654, -1604, [
      relicPoint.z - 5,
      relicPoint.z,
      relicPoint.z + 5,
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
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
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
    scope: "One broad solid visual basalt ledge, no contact/body acceptance",
    supportPoses,
    skinMinimumByPose,
    ledgeTop,
    maxRelief: 0.12,
    profile:
      "Broad ledge, one fitted low palm seat and toe-front +X ramp returning only added rock to actual terrain",
    seatPlane: plane,
    seatAnchors: anchors.length,
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
  under.dispose();
  return {
    body,
    foot: body,
    jewel,
    relicPoint,
    metadata,
    dispose() {
      jewel.dispose();
      body.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
