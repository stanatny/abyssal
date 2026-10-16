import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { attachDeepHazards } from "../src/deep_hazards.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";

// 检查最终合批顶面，不以配置尺寸代替真实三角面是否重叠。
function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}
function signed(poly) {
  return poly.reduce((s, p, i) => {
    const q = poly[(i + 1) % poly.length];
    return s + p[0] * q[1] - q[0] * p[1];
  }, 0);
}
function overlap(a, b) {
  let out = a.map((p) => [...p]),
    orientation = Math.sign(signed(b));
  for (let i = 0; i < b.length; i++) {
    const p = b[i],
      q = b[(i + 1) % b.length],
      input = out;
    out = [];
    const cross = (r) =>
      orientation *
      ((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    for (let j = 0; j < input.length; j++) {
      const u = input[j],
        v = input[(j + 1) % input.length],
        cu = cross(u),
        cv = cross(v);
      if (cu >= -1e-7) out.push(u);
      if ((cu > 0 && cv < 0) || (cu < 0 && cv > 0)) {
        const t = cu / (cu - cv);
        out.push([u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]);
      }
    }
    if (out.length < 3) return 0;
  }
  return area(out);
}
function borderOverlaps(site) {
  const g = site.art.group.getObjectByName("eroded_fitted_stone").geometry,
    p = g.attributes.position,
    triangles = [];
  for (let i = 0; i < p.count; i += 3) {
    if (
      [0, 1, 2].every((k) => Math.abs(p.getY(i + k) - p.getY(i)) < 1e-5) &&
      g.attributes.normal.getY(i) > 0.999 &&
      Math.abs(p.getZ(i)) > 5
    ) {
      triangles.push([0, 1, 2].map((k) => [p.getX(i + k), p.getZ(i + k)]));
    }
  }
  let pairs = 0,
    totalArea = 0;
  for (let i = 0; i < triangles.length; i++)
    for (let j = i + 1; j < triangles.length; j++) {
      const a = overlap(triangles[i], triangles[j]);
      if (a > 1e-5) {
        pairs++;
        totalArea += a;
      }
    }
  return { triangles: triangles.length, pairs, totalArea };
}

test("Waterlock border stones have real joints rather than overlapping coplanar top faces", () => {
  const ocean = attachDeepHazards(
    {
      root: new T.Group(),
      heightAt: () => -362,
      city: { underways: { records: [] } },
      update() {},
      reset() {},
      dispose() {},
    },
    "atlantis",
  );
  try {
    for (const site of ocean.deepHazards.sites) {
      const result = borderOverlaps(site);
      assert.equal(result.triangles, 44);
      assert.equal(
        result.pairs,
        0,
        `${site.id}: ${result.pairs} overlapping border triangles cover ${result.totalArea} square metres`,
      );
    }
  } finally {
    ocean.dispose();
  }
});

// 检查完整机关与真实城砖，不再把独立石边通过当作世界整合通过。
function horizontalFaces(mesh) {
  const p = mesh.geometry.attributes.position,
    index = mesh.geometry.index,
    faces = [],
    v = [new T.Vector3(), new T.Vector3(), new T.Vector3()];
  mesh.updateWorldMatrix(true, false);
  for (let i = 0; i < (index?.count || p.count); i += 3) {
    for (let k = 0; k < 3; k++)
      v[k]
        .fromBufferAttribute(p, index ? index.getX(i + k) : i + k)
        .applyMatrix4(mesh.matrixWorld);
    if (v.some((p) => Math.abs(p.y - v[0].y) > 1e-5)) continue;
    const poly = v.map((p) => [p.x, p.z]);
    if (signed(poly) >= -1e-7) continue;
    faces.push({ y: v[0].y, poly, mesh: mesh.name });
  }
  return faces;
}
function coplanarOverlaps(a, b, same = false) {
  let pairs = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = same ? i + 1 : 0; j < b.length; j++) {
      if (Math.abs(a[i].y - b[j].y) > 1e-3) continue;
      if (overlap(a[i].poly, b[j].poly) > 1e-6) pairs++;
    }
  return pairs;
}

test("Every waterlock's merged horizontal surfaces have no coplanar overlaps", () => {
  const ocean = attachDeepHazards(
    {
      root: new T.Group(),
      heightAt: () => -362,
      city: { underways: { records: [] } },
      update() {},
      reset() {},
      dispose() {},
    },
    "atlantis",
  );
  try {
    for (const site of ocean.deepHazards.sites) {
      const faces = site.art.group.children
        .filter((n) => n.isMesh)
        .flatMap(horizontalFaces);
      assert.ok(faces.length > 300);
      assert.equal(coplanarOverlaps(faces, faces, true), 0, site.id);
    }
  } finally {
    ocean.dispose();
  }
});

test("All four waterlocks clear the actual city's rendered pavement", () => {
  const ocean = attachDeepHazards(
    createAtlantisOcean(new T.Scene()),
    "atlantis",
  );
  try {
    ocean.root.updateMatrixWorld(true);
    const pavement = [];
    ocean.root.traverse((n) => {
      if (n.isMesh && n.name === "city_paved_district")
        pavement.push(...horizontalFaces(n));
    });
    assert.ok(pavement.length > 0);
    assert.equal(ocean.deepHazards.sites.length, 4);
    for (const site of ocean.deepHazards.sites) {
      const faces = site.art.group.children
        .filter((n) => n.isMesh)
        .flatMap(horizontalFaces);
      assert.equal(coplanarOverlaps(faces, pavement), 0, site.id);
    }
  } finally {
    ocean.dispose();
  }
});
