import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { WORLD } from "../src/world_config.js";
import { BERMUDA_WORLD } from "../src/bermuda_config.js";
import { REGIONS } from "../src/expedition_config.js";
import {
  bermudaSeabedHeight,
  bermudaLegacySeabedHeight,
} from "../src/bermuda_terrain.js";
import { WRECK_BED } from "../src/bermuda_sites.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createStormWater } from "../src/bermuda_water.js";

test("Bermuda has a dedicated 1000 by 1900 world without enlarging other default maps", () => {
  assert.equal(BERMUDA_WORLD.maxX - BERMUDA_WORLD.minX, 1000);
  assert.equal(BERMUDA_WORLD.maxZ - BERMUDA_WORLD.minZ, 1900);
  assert.equal(BERMUDA_WORLD.maxDepth, 740);
  assert.equal(BERMUDA_WORLD.surfaceY, WORLD.surfaceY);
  assert.equal(BERMUDA_WORLD.displayDepthScale, WORLD.displayDepthScale);
  assert.equal(REGIONS.find((r) => r.id === "bermuda").world, BERMUDA_WORLD);
  assert.deepEqual(REGIONS.find((r) => r.id === "bermuda").spawn, [0, -18, 75]);
  for (const id of ["hawaii", "atlantis"]) {
    assert.equal(REGIONS.find((r) => r.id === id).world, undefined);
  }
  assert.equal(WORLD.maxX - WORLD.minX, 600);
  assert.equal(WORLD.maxZ - WORLD.minZ, 1290);
});

test("Expansion preserves the nursery, liner bed and existing central seabed", () => {
  for (const [x, z, height] of [
    [-300, 100, -38],
    [0, 75, -37.99274780093547],
    [150, -300, -203.6052927716595],
    [-245, -365, -224.90973615096794],
    [-140, -540, -486],
    [0, -650, -486],
    [300, -800, -515.731872622303],
    [185, -995, -650.7736092410927],
    [-300, -1150, -709.4990715618615],
  ]) {
    assert.equal(bermudaSeabedHeight(x, z), height);
  }
  for (let x = -300; x <= 300; x += 10)
    for (let z = -1150; z <= 140; z += 10)
      assert.equal(bermudaSeabedHeight(x, z), bermudaLegacySeabedHeight(x, z));
  for (let x = -500; x <= 500; x += 10)
    for (let z = -120; z <= 140; z += 10)
      assert.equal(bermudaSeabedHeight(x, z), bermudaLegacySeabedHeight(x, z));
  for (
    let x = WRECK_BED.minX - WRECK_BED.blend;
    x <= WRECK_BED.maxX + WRECK_BED.blend;
    x += 5
  )
    for (
      let z = WRECK_BED.minZ - WRECK_BED.blend;
      z <= WRECK_BED.maxZ + WRECK_BED.blend;
      z += 5
    )
      assert.equal(bermudaSeabedHeight(x, z), bermudaLegacySeabedHeight(x, z));
});

test("Outer reef benches and southern spines provide real relief without a flat-clamped southern extension", () => {
  for (const [x, z] of [
    [-450, -530],
    [450, -800],
  ])
    assert.ok(bermudaSeabedHeight(x, z) - bermudaLegacySeabedHeight(x, z) > 80);
  let minimum = Infinity,
    maximum = -Infinity,
    flat = 0,
    samples = 0;
  for (let x = -480; x <= 480; x += 20)
    for (let z = -1740; z <= -1320; z += 20) {
      const y = bermudaSeabedHeight(x, z);
      minimum = Math.min(minimum, y);
      maximum = Math.max(maximum, y);
      samples++;
      flat += Math.abs(y + 716) < 0.01;
      assert.ok(y >= -716, `retained deep-water clearance at ${x},${z}`);
    }
  assert.ok(maximum - minimum > 90, `southern relief ${maximum - minimum}`);
  assert.equal(
    flat,
    0,
    `${flat}/${samples} southern points still use the old flat clamp`,
  );
  for (const z of [-1320, -1460, -1640]) {
    const section = Array.from({ length: 49 }, (_, i) =>
      bermudaSeabedHeight(-480 + i * 20, z),
    );
    assert.ok(
      Math.max(...section) - Math.min(...section) > 45,
      `distinct side-to-side terrain at z=${z}`,
    );
  }
});

test("Deep current lanes retain whole-body terrain clearance, and all four arenas keep their approach basins", () => {
  for (const lane of [
    {
      z0: -680,
      z1: -1230,
      x: (u) => -325 + 55 * Math.sin(Math.PI * u),
      ceiling: -275,
    },
    {
      z0: -1110,
      z1: -1660,
      x: (u) => 285 - 85 * Math.sin(Math.PI * u),
      ceiling: -555,
    },
  ])
    for (let i = 0; i <= 100; i++) {
      const u = i / 100,
        x = lane.x(u),
        z = lane.z0 + (lane.z1 - lane.z0) * u;
      for (let dx = -25; dx <= 25; dx += 5)
        for (let dz = -25; dz <= 25; dz += 5)
          assert.ok(
            bermudaSeabedHeight(x + dx, z + dz) <= lane.ceiling,
            `current clearance at ${x + dx},${z + dz}`,
          );
    }
  for (const [x, z, radius, ceiling] of [
    [-310, -580, 110, -100],
    [300, -900, 125, -350],
    [-290, -1260, 120, -575],
    [230, -1570, 120, -675],
  ])
    for (let dx = -radius; dx <= radius; dx += 10)
      for (let dz = -radius; dz <= radius; dz += 10) {
        if (Math.hypot(dx, dz) > radius) continue;
        assert.ok(
          bermudaSeabedHeight(x + dx, z + dz) <= ceiling,
          `arena floor at ${x + dx},${z + dz}`,
        );
      }
});

test("Rendered outer seabed covers the expanded world with bounded interpolation and geometry cost", () => {
  const g = createBermudaTerrainMesh();
  g.computeBoundingBox();
  const box = g.boundingBox;
  assert.ok(box.min.x < BERMUDA_WORLD.minX - 500);
  assert.ok(box.max.x > BERMUDA_WORLD.maxX + 500);
  assert.ok(box.min.z < BERMUDA_WORLD.minZ - 500);
  assert.ok(box.max.z > BERMUDA_WORLD.maxZ + 500);
  const p = g.attributes.position;
  let maximumError = 0;
  let area = 0;
  let outerTriangles = 0;
  for (let i = 0; i < g.index.count; i += 3) {
    const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
    const points = ids.map((id) =>
      new THREE.Vector3().fromBufferAttribute(p, id),
    );
    const cx = points.reduce((n, v) => n + v.x, 0) / 3;
    const cz = points.reduce((n, v) => n + v.z, 0) / 3;
    if (Math.abs(cx) <= 540 && cz >= -1840 && cz <= 220) {
      area +=
        Math.abs(
          (points[1].x - points[0].x) * (points[2].z - points[0].z) -
            (points[2].x - points[0].x) * (points[1].z - points[0].z),
        ) / 2;
    }
    if (
      cx < BERMUDA_WORLD.minX ||
      cx > BERMUDA_WORLD.maxX ||
      cz < BERMUDA_WORLD.minZ ||
      cz > BERMUDA_WORLD.maxZ
    )
      continue;
    if (Math.abs(cx) > 340 || cz < -1230) outerTriangles++;
    for (const weights of [
      [1 / 3, 1 / 3, 1 / 3],
      [0.6, 0.2, 0.2],
      [0.2, 0.6, 0.2],
      [0.2, 0.2, 0.6],
    ]) {
      const q = new THREE.Vector3();
      points.forEach((point, j) => q.addScaledVector(point, weights[j]));
      maximumError = Math.max(
        maximumError,
        Math.abs(q.y - bermudaSeabedHeight(q.x, q.z)),
      );
    }
  }
  assert.ok(
    outerTriangles > 1000,
    "expanded region must have real terrain triangles",
  );
  assert.ok(
    Math.abs(area - 1080 * 2060) < 0.1,
    `continuous floor area ${area}`,
  );
  assert.ok(maximumError < 0.3, `terrain interpolation error ${maximumError}`);
  assert.ok(
    g.index.count / 3 < 270000,
    `terrain triangles ${g.index.count / 3}`,
  );
  g.dispose();
});

test("Storm water covers all new edges and its shader samples world-space wave coordinates", () => {
  const root = new THREE.Group(),
    resources = [];
  const { water, material } = createStormWater(
    root,
    (r) => (resources.push(r), r),
    { value: 0 },
  );
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(water);
  assert.ok(box.min.x < BERMUDA_WORLD.minX - 500);
  assert.ok(box.max.x > BERMUDA_WORLD.maxX + 500);
  assert.ok(box.min.z < BERMUDA_WORLD.minZ - 500);
  assert.ok(box.max.z > BERMUDA_WORLD.maxZ + 500);
  const shader = {
    uniforms: {},
    vertexShader:
      "#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>",
    fragmentShader: "#include <common>\n#include <color_fragment>",
  };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.stormCenter.value.x, water.position.x);
  assert.equal(shader.uniforms.stormCenter.value.y, water.position.z);
  assert.match(shader.vertexShader, /-position.y\)\+stormCenter/);
  resources.forEach((r) => r.dispose());
});

test("Every old-to-outer terrain join shares exact triangle edges, including the one-metre floor-clamp refinement", () => {
  const geometry = createBermudaTerrainMesh(),
    p = geometry.attributes.position,
    index = geometry.index;
  for (const { axis, value, minimum, maximum } of [
    { axis: "x", value: -340, minimum: -1230, maximum: 220 },
    { axis: "x", value: 340, minimum: -1230, maximum: 220 },
    { axis: "z", value: -1230, minimum: -340, maximum: 340 },
  ]) {
    const inner = new Set(),
      outer = new Set();
    const constant = (id) => (axis === "x" ? p.getX(id) : p.getZ(id));
    const varying = (id) => (axis === "x" ? p.getZ(id) : p.getX(id));
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      for (let j = 0; j < 3; j++) {
        const a = ids[j],
          b = ids[(j + 1) % 3],
          c = ids[(j + 2) % 3];
        if (
          constant(a) !== value ||
          constant(b) !== value ||
          Math.min(varying(a), varying(b)) < minimum ||
          Math.max(varying(a), varying(b)) > maximum
        )
          continue;
        const target =
          (constant(c) - value) * (value === 340 ? -1 : 1) > 0 ? inner : outer;
        target.add([a, b].sort((a, b) => a - b).join(":"));
      }
    }
    assert.ok(inner.size >= 136, `${axis}=${value}: complete old boundary`);
    assert.deepEqual(
      [...outer].sort(),
      [...inner].sort(),
      `${axis}=${value}: exact shared triangle edges`,
    );
  }
  geometry.dispose();
});
