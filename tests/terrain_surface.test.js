import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTerrainSurface } from "../src/terrain_surface.js";

const close = (actual, expected, tolerance = 1e-7) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );

function floor(geometry, root = new THREE.Group(), tagged = true) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  mesh.userData.terrainContact = tagged;
  root.add(mesh);
  return { mesh, root };
}

function plane(size = 40, segments = 1, height = () => 0) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++)
    position.setY(i, height(position.getX(i), position.getZ(i)));
  return geometry;
}

function triangles(points, index) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points.flat(), 3),
  );
  if (index) geometry.setIndex(index);
  return geometry;
}

function dispose(root) {
  root.traverse((mesh) => {
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  });
}

function rayHeight(root, x, z) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((mesh) => {
    if (mesh.isMesh && mesh.userData.terrainContact) meshes.push(mesh);
  });
  return new THREE.Raycaster(
    new THREE.Vector3(x, 10000, z),
    new THREE.Vector3(0, -1, 0),
  ).intersectObjects(meshes, false)[0]?.point.y;
}

test("Tagged uniform terrain agrees with real rays without changing geometry or scene matrices", () => {
  const { mesh, root } = floor(plane(40, 8, (x, z) => x * 0.7 - z * 0.2 + 3)),
    positions = mesh.geometry.attributes.position.array.slice(),
    indices = mesh.geometry.index.array.slice(),
    matrix = mesh.matrix.clone(),
    world = mesh.matrixWorld.clone(),
    surface = createTerrainSurface(root, { fallback: (x, z) => x - z - 100 });
  try {
    assert.deepEqual(mesh.geometry.attributes.position.array, positions);
    assert.deepEqual(mesh.geometry.index.array, indices);
    assert.equal(mesh.geometry.boundingBox, null);
    assert.ok(mesh.matrix.equals(matrix));
    assert.ok(mesh.matrixWorld.equals(world));
    for (const x of [-20, -19.999, -4.3, 0, 7.7, 19.999, 20])
      for (const z of [-20, -12.3, 0, 16.2, 20]) {
        close(surface(x, z), rayHeight(root, x, z));
        close(surface.supportHeight(x, z, 0), surface(x, z));
      }
    close(surface(21, -4), -75);
    close(surface.supportHeight(30, 0, 2), -68);
    assert.equal(surface.stats.meshes, 1);
    assert.equal(surface.stats.indexedTriangles, 128);
  } finally {
    surface.dispose();
    dispose(root);
  }
});

test("Adaptive diagonals and nonuniform columns use actual final triangle indices", () => {
  const points = [
      [0, 0, 0],
      [4, 0, 0],
      [0, 0, 4],
      [4, 8, 4],
    ],
    a = floor(triangles(points, [0, 2, 3, 0, 3, 1])),
    b = floor(triangles(points, [0, 2, 1, 1, 2, 3])),
    sa = createTerrainSurface(a.root),
    sb = createTerrainSurface(b.root);
  close(sa(2, 2), 4);
  close(sb(2, 2), 0);
  for (const f of [a, b]) dispose(f.root);
  sa.dispose();
  sb.dispose();
  const xs = [-4, -3.95, -2, 5],
    zs = [-3, -1, 2],
    geometry = new THREE.PlaneGeometry(9, 5, xs.length - 1, zs.length - 1),
    p = geometry.attributes.position;
  for (let j = 0; j < zs.length; j++)
    for (let i = 0; i < xs.length; i++)
      p.setXYZ(j * xs.length + i, xs[i], (i % 2 ? 9 : -2) + j * j, zs[j]);
  const { root } = floor(geometry),
    surface = createTerrainSurface(root);
  try {
    for (const x of [-3.999, -3.98, -3.95, -3.9, -2.1, 0, 4.99])
      for (const z of [-2.99, -2, -1, 0, 1.99])
        close(surface(x, z), rayHeight(root, x, z));
  } finally {
    surface.dispose();
    dispose(root);
  }
});

test("World transforms include unupdated translated parents, rotations and nonuniform scales", () => {
  const root = new THREE.Group(),
    group = new THREE.Group();
  root.position.set(11, -7, -20);
  root.rotation.y = 0.37;
  root.scale.set(2, 3, 4);
  root.add(group);
  group.position.set(-4, 8, 2);
  group.rotation.set(0.13, -0.17, 0.09);
  const { mesh } = floor(
      plane(40, 3, (x, z) => 0.5 * x + 0.2 * z + 1),
      group,
    ),
    oldMatrix = root.matrix.clone(),
    surface = createTerrainSurface(root);
  try {
    assert.ok(
      root.matrix.equals(oldMatrix),
      "construction leaves caller matrices untouched",
    );
    root.updateMatrixWorld(true);
    const p = mesh.geometry.attributes.position,
      ix = mesh.geometry.index;
    for (let i = 0; i < ix.count; i += 3) {
      const points = [0, 1, 2].map((offset) =>
          new THREE.Vector3()
            .fromBufferAttribute(p, ix.getX(i + offset))
            .applyMatrix4(mesh.matrixWorld),
        ),
        center = points
          .reduce((sum, p) => sum.add(p), new THREE.Vector3())
          .multiplyScalar(1 / 3);
      close(surface(center.x, center.z), rayHeight(root, center.x, center.z));
    }
  } finally {
    surface.dispose();
    dispose(root);
  }
  const f = floor(plane(100, 2, (x, z) => 0.5 * x + 0.2 * z + 1));
  f.root.position.set(10, -7, -20);
  f.root.scale.set(2, 3, 4);
  const scaled = createTerrainSurface(f.root);
  close(scaled(10, -20), -4);
  close(scaled.supportHeight(10, -20, 2), -4 + 2 * Math.hypot(1, 0.75, 0.15));
  scaled.dispose();
  dispose(f.root);
});

test("Seams take the higher real floor while untagged roofs and local gaps cannot fill lower paths", () => {
  const root = new THREE.Group();
  floor(
    plane(8, 1, () => -8),
    root,
  );
  floor(
    plane(30, 1, () => 100),
    root,
    false,
  );
  const points = [],
    indices = [];
  for (const [x0, z0, x1, z1] of [
    [-4, -4, -2, 4],
    [2, -4, 4, 4],
    [-2, -4, 2, -2],
    [-2, 2, 2, 4],
  ]) {
    const i = points.length;
    points.push([x0, 5, z0], [x1, 5, z0], [x0, 5, z1], [x1, 5, z1]);
    indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
  }
  floor(triangles(points, indices), root);
  const surface = createTerrainSurface(root, { fallback: () => 1000 });
  try {
    close(surface(0, 0), -8);
    close(surface.supportHeight(0, 0, 1), -7);
    close(surface.supportHeight(1.7, 0, 0.5), 5.4);
    close(surface(2, 0), 5);
    close(surface(-2, 0), 5);
    close(surface(10, 10), 1000);
    assert.equal(surface.stats.meshes, 2);
    for (const x of [-4, -2, -1.9, 0, 1.9, 2, 4])
      for (const z of [-3, 0, 3]) close(surface(x, z), rayHeight(root, x, z));
  } finally {
    surface.dispose();
    dispose(root);
  }
});

test("Sphere support reproduces analytic planar support at all slopes and world radii", () => {
  for (const [gx, gz] of [
    [0, 0],
    [0.5, 0],
    [-3, 2],
    [20, -10],
  ]) {
    const { root } = floor(plane(200, 4, (x, z) => gx * x + gz * z - 17)),
      surface = createTerrainSurface(root);
    try {
      for (const radius of [0, 0.1, 1, 4.16])
        close(
          surface.supportHeight(2, -3, radius),
          gx * 2 + gz * -3 - 17 + radius * Math.hypot(1, gx, gz),
        );
    } finally {
      surface.dispose();
      dispose(root);
    }
  }
});

test("Finite triangle edges, corners and grazing disks retain exact sphere support", () => {
  const { root } = floor(
      triangles(
        [
          [0, 0, 0],
          [10, 0, 0],
          [0, 0, 10],
        ],
        [0, 2, 1],
      ),
    ),
    surface = createTerrainSurface(root, { fallback: () => -100 });
  try {
    close(surface.supportHeight(-0.6, 2, 1), 0.8);
    close(surface.supportHeight(-0.6, -0.8, 1.5), Math.sqrt(1.25));
    close(surface.supportHeight(-1, 2, 1), 0);
    close(surface.supportHeight(-1.00001, 2, 1), -99);
    close(surface.supportHeight(-0.6, 2, 0.5), -99.5);
    close(surface.supportHeight(0, 0, 0), 0);
  } finally {
    surface.dispose();
    dispose(root);
  }
  const sloped = floor(
      triangles([
        [0, 0, 0],
        [10, 0, 0],
        [0, 20, 10],
      ]),
    ),
    slope = createTerrainSurface(sloped.root);
  close(slope.supportHeight(-0.6, 3, 1), 6 + 0.8 * Math.sqrt(5));
  slope.dispose();
  dispose(sloped.root);
});

test("Spatial queries stay local, indices allocate no GPU resources and disposal releases CPU ownership once", () => {
  const { root, mesh } = floor(
      plane(200, 100, (x, z) => Math.sin(x / 10) + z * 0.2),
    ),
    surface = createTerrainSurface(root, { fallback: () => -123 }),
    before = surface.stats.retainedTypedArrayBytes;
  let disposedGeometry = 0,
    disposedMaterial = 0;
  mesh.geometry.addEventListener("dispose", () => disposedGeometry++);
  mesh.material.addEventListener("dispose", () => disposedMaterial++);
  for (let i = 0; i < 1000; i++) {
    const x = -80 + (i % 81) * 2,
      z = -80 + ((i * 7) % 81) * 2;
    assert.ok(Number.isFinite(surface.supportHeight(x, z, 4.16)));
  }
  assert.ok(surface.stats.maxCandidateCount < 300);
  assert.ok(
    surface.stats.triangleReferences <= surface.stats.indexedTriangles * 64,
  );
  assert.ok(before > 0);
  surface.dispose();
  surface.dispose();
  assert.equal(surface.stats.retainedTypedArrayBytes, 0);
  assert.equal(surface.stats.disposed, true);
  assert.equal(disposedGeometry, 0);
  assert.equal(disposedMaterial, 0);
  close(surface(0, 0), -123);
  close(surface.supportHeight(0, 0, 3), -120);
  dispose(root);
});

test("Invalid query inputs fail clearly and vertical degenerate faces do not invent a floor", () => {
  const { root } = floor(
      triangles(
        [
          [0, 0, 0],
          [0, 4, 0],
          [0, 2, 5],
        ],
        [0, 1, 2],
      ),
    ),
    surface = createTerrainSurface(root, { fallback: () => -20 });
  assert.equal(surface.stats.indexedTriangles, 0);
  close(surface(0, 2), -20);
  close(surface.supportHeight(0, 2, 1), -19);
  assert.throws(() => surface(NaN, 0), /finite/);
  assert.throws(() => surface.supportHeight(0, 0, -1), /nonnegative/);
  assert.throws(() => surface.supportHeight(0, 0, Infinity), /finite/);
  assert.throws(
    () => createTerrainSurface(root, { fallback: null }),
    /function/,
  );
  const invalidFallback = createTerrainSurface(new THREE.Group(), {
    fallback: () => NaN,
  });
  assert.throws(() => invalidFallback(0, 0), /finite height/);
  surface.dispose();
  invalidFallback.dispose();
  dispose(root);
});
