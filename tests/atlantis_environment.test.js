import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { createAtlantisFleet } from "../src/atlantis_surface.js";
import {
  GEOMETRIES,
  loftGeometry,
  tubeGeometry,
} from "../src/atlantis_art_geometry.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";

function assertFiniteGeometry(root) {
  const checked = new Set();
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    assert.ok(node.matrixWorld.elements.every(Number.isFinite), node.name);
    if (node.isInstancedMesh) {
      assert.ok(node.instanceMatrix.array.every(Number.isFinite), node.name);
    }
    const geometry = node.geometry;
    if (!geometry || checked.has(geometry)) return;
    checked.add(geometry);
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      assert.ok(
        attribute.array.every(Number.isFinite),
        `${node.name || node.type}: ${name} contains a non-finite value`,
      );
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    assert.ok(Number.isFinite(geometry.boundingSphere.radius), node.name);
  });
  assert.ok(checked.size > 0);
  return checked;
}

test("Loft endpoint defaults produce a finite final ring and both caps", () => {
  const geometry = loftGeometry(
    null,
    [
      { y: -1.1, rx: 0.92, rz: 0.92, wave: 16, waveAmp: 0.05 },
      { y: 0, rx: 0.95, rz: 0.95, wave: 16, waveAmp: 0.05 },
      { y: 1.1, rx: 0.9, rz: 0.9, wave: 16, waveAmp: 0.05 },
    ],
    { radial: 18, capStart: true, capEnd: true, jaggedTop: 0.3 },
  );
  try {
    assertFiniteGeometry(new THREE.Mesh(geometry));
    const position = geometry.attributes.position;
    assert.ok(position.getY(position.count - 1) > 0.7);
    assert.equal(position.getX(position.count - 1), 0);
    assert.equal(position.getZ(position.count - 1), 0);
  } finally {
    geometry.dispose();
  }
});

test("Actual Atlantis city and reef buffers stay finite through both quality modes", () => {
  const scene = new THREE.Scene();
  const ocean = createAtlantisOcean(scene);
  try {
    const initialGeometries = assertFiniteGeometry(ocean.root);
    for (const [time, position, highQuality] of [
      [0, new THREE.Vector3(0, -18, 75), true],
      [18, new THREE.Vector3(0, -470, -738), false],
      [60, new THREE.Vector3(0, -520, -801), true],
    ]) {
      ocean.update(time, position, 1 / 60, highQuality);
      assert.deepEqual(assertFiniteGeometry(ocean.root), initialGeometries);
    }
    assert.ok(ocean.colliders.length > 100);
    assert.ok(ocean.landmarks.some((entry) => entry.id === "poseidon_trident"));
  } finally {
    ocean.dispose();
  }
});

test("Carved tube surfaces and loft end caps face outward", () => {
  const tube = tubeGeometry(
    null,
    [
      [0, 0, 0],
      [0, 2, 0],
    ],
    [1, 1],
    { radial: 16, samples: 4 },
  );
  const loft = loftGeometry(
    null,
    [
      { y: 0, rx: 1, rz: 1 },
      { y: 2, rx: 1, rz: 1 },
    ],
    { capStart: true, capEnd: true },
  );
  try {
    const p = tube.attributes.position,
      n = tube.attributes.normal;
    for (let i = 0; i < p.count; i++)
      assert.ok(p.getX(i) * n.getX(i) + p.getZ(i) * n.getZ(i) > 0.9);
    const normal = loft.attributes.normal;
    assert.ok(
      normal.getY(normal.count - 2) < -0.99,
      "Bottom cap must face downward",
    );
    assert.ok(normal.getY(normal.count - 1) > 0.99, "Top cap must face upward");
  } finally {
    tube.dispose();
    loft.dispose();
  }
});

test("Region disposal releases owned buffers once while preserving shared city assets", () => {
  const scene = new THREE.Scene();
  const first = createAtlantisOcean(scene);
  const second = createAtlantisOcean(scene);
  const tracked = new Map();
  const shared = new Set(GEOMETRIES.values());
  first.root.traverse((node) => {
    if (node.geometry && !tracked.has(node.geometry)) {
      tracked.set(node.geometry, 0);
      node.geometry.addEventListener("dispose", () => {
        tracked.set(node.geometry, tracked.get(node.geometry) + 1);
      });
    }
  });
  first.dispose();
  first.dispose();
  assert.equal(first.root.parent, null);
  assert.equal(first.colliders.length, 0);
  assert.equal(first.obstacles.length, 0);
  assert.equal(scene.children.length, 1);
  for (const [geometry, count] of tracked) {
    assert.equal(count, shared.has(geometry) ? 0 : 1, geometry.name);
  }
  second.update(2, new THREE.Vector3(0, -470, -738), 1 / 60, false);
  assertFiniteGeometry(second.root);
  second.dispose();
  assert.equal(scene.children.length, 0);
});

test("Integrated ocean collision preserves the rendered grand-gate opening and its solid piers", () => {
  const ocean = createAtlantisOcean(new THREE.Scene());
  try {
    ocean.root.updateMatrixWorld(true);
    const gate = ocean.city.buildings.find(
      (entry) => entry.kind === "gateway" && entry.z === -475,
    );
    const arch = ocean.landmarks.find((entry) => entry.id === "grand_arch");
    assert.equal(arch.position.z, gate.z);
    const y = gate.y + gate.height / 2;
    const opening = { x: 0, y, z: gate.z };
    assert.equal(
      isPositionBlocked(opening, {
        colliders: ocean.colliders,
        radius: bodyRadius(30),
        length: 30,
        forward: { x: 0, y: 0, z: -1 },
      }),
      false,
    );
    const pier = resolveMotion(
      opening,
      { x: 40, y, z: gate.z },
      {
        colliders: ocean.colliders,
        radius: bodyRadius(3),
      },
    );
    assert.equal(pier.blocked, true);
    assert.equal(pier.stuck, false);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, y, gate.z),
      new THREE.Vector3(1, 0, 0),
      0,
      40,
    );
    const visibleHit = ray.intersectObject(ocean.city.root, true)[0];
    assert.ok(
      visibleHit,
      "Solid pier must also exist in rendered architecture",
    );
    assert.ok(
      Math.abs(visibleHit.point.x - (pier.position.x + bodyRadius(3))) < 0.5,
      "Visible gateway masonry agrees with the collision face",
    );
    assert.ok(ocean.colliders.some((entry) => entry.kind === "city_column"));
  } finally {
    ocean.dispose();
  }
});

test("Moving night-boat hulls block fast crossings while the deeper path remains clear", () => {
  const scene = new THREE.Scene();
  const fleet = createAtlantisFleet(scene);
  try {
    const geometries = assertFiniteGeometry(scene);
    for (const time of [0, 37, 180]) {
      fleet.update(time);
      assert.deepEqual(assertFiniteGeometry(scene), geometries);
      for (const ship of fleet.ships) {
        const radius = bodyRadius(3);
        const point = (x, y) =>
          ship.root.localToWorld(new THREE.Vector3(x, y, 0));
        const crossing = resolveMotion(point(-12, -0.1), point(12, -0.1), {
          colliders: ship.colliders,
          radius,
        });
        assert.equal(crossing.blocked, true, `${ship.kind} at ${time}`);
        assert.equal(crossing.stuck, false, ship.kind);
        const below = resolveMotion(point(-12, -4), point(12, -4), {
          colliders: ship.colliders,
          radius,
        });
        assert.equal(below.blocked, false, ship.kind);
        for (const collider of ship.colliders) {
          const expected = ship.root.localToWorld(
            collider.localPosition.clone(),
          );
          assert.ok(
            expected.distanceTo(
              new THREE.Vector3(collider.x, collider.y, collider.z),
            ) < 1e-8,
          );
          assert.ok(
            Object.values(collider.halfSize).every((value) => value > 0),
          );
        }
      }
    }
  } finally {
    fleet.dispose();
  }
  assert.equal(scene.children.length, 0);
});
