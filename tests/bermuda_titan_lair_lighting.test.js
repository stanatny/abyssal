import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createBermudaTitanLairLighting,
  selectBermudaLairLights,
  bermudaLairGlowPulse,
} from "../src/bermuda_titan_lair_lighting.js";
import { acquireHawaiiReefAsset } from "../src/hawaii_reef_asset.js";

function fixture() {
  const parent = new THREE.Group(),
    shell = new THREE.Mesh(
      new THREE.BoxGeometry(160, 160, 180),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }),
    ),
    support = new THREE.Mesh(
      new THREE.BoxGeometry(60, 14, 60),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }),
    );
  shell.position.y = 60;
  support.position.y = -12;
  parent.add(shell, support);
  const cave = {
      shell,
      contains: (p) =>
        Math.abs(p.x) < 80 && Math.abs(p.z) < 90 && p.y > -20 && p.y < 140,
    },
    titan = {
      pose: { position: new THREE.Vector3() },
      relicPoint: new THREE.Vector3(0, -4, 0),
      mouth: new THREE.Vector3(0, 10, 0),
      waitPoint: new THREE.Vector3(25, 0, 0),
      beds: [{ mesh: support }],
      lightSources: [],
    },
    lighting = createBermudaTitanLairLighting(parent, { cave, titan });
  return {
    parent,
    shell,
    support,
    lighting,
    dispose() {
      lighting.dispose();
      shell.geometry.dispose();
      shell.material.dispose();
      support.geometry.dispose();
      support.material.dispose();
    },
  };
}

test("Six visible HF colonies attach to actual rock faces and source points are real luminous vertices", () => {
  const f = fixture();
  try {
    const art = f.lighting;
    assert.equal(art.placements.length, 6);
    assert.equal(art.lightSources.length, 9);
    assert.equal(art.stats.backgroundPatches, 3);
    assert.equal(art.stats.backgroundDraws, 0);
    assert.equal(art.stats.maxDraws, 2);
    assert.equal(art.stats.newPointLights, 0);
    assert.equal(art.stats.maxNearTriangles, 30000);
    assert.equal(art.stats.farTriangles, 3600);
    art.root.traverse((object) => assert.equal(object.isLight, undefined));
    const point = new THREE.Vector3(),
      inverse = new THREE.Matrix4();
    for (const row of art.placements) {
      assert.ok(row.surface === f.shell || row.surface === f.support);
      assert.ok(Number.isInteger(row.surfaceFace));
      assert.ok(row.normal.length() > 0.999);
      assert.equal(row.footGaps.length, 8);
      assert.ok(Math.max(...row.footGaps) <= -0.119);
      assert.ok(Math.min(...row.footGaps) > -1.02);
      point.copy(row.sourceLocal).applyMatrix4(row.matrix);
      assert.ok(point.distanceTo(row.source.position) < 1e-8);
      point
        .copy(row.anchor)
        .applyMatrix4(inverse.copy(row.surface.matrixWorld).invert());
      row.surface.geometry.computeBoundingBox();
      const bounds = row.surface.geometry.boundingBox;
      assert.ok(
        Math.min(
          ...["x", "y", "z"].flatMap((axis) => [
            Math.abs(point[axis] - bounds.min[axis]),
            Math.abs(point[axis] - bounds.max[axis]),
          ]),
        ) < 1e-5,
      );
      assert.ok(
        row.source.position.clone().sub(row.anchor).dot(row.normal) > 2,
      );
    }
  } finally {
    f.dispose();
  }
});

test("Two nearby organic light origins use actual support-rock sides instead of distant shell walls", () => {
  const f = fixture();
  try {
    const rows = f.lighting.placements.filter((row) =>
      row.id.includes("support_side"),
    );
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.surface, f.support);
      assert.ok(Math.abs(row.normal.y) < 0.01);
      assert.ok(
        row.source.position.distanceTo(new THREE.Vector3(0, -4, 0)) < 45,
      );
    }
  } finally {
    f.dispose();
  }
});

test("Existing three-slot pool retains the head and live mouth source without an inactive-mouth slot", () => {
  const source = (x, intensity = 10) => ({
      position: new THREE.Vector3(x, 0, 0),
      intensity,
    }),
    head = source(60, 150),
    mouth = source(1, 0),
    colonies = [source(2), source(3), source(4)],
    originalSources = [source(5), source(6)],
    sources = [head, mouth, ...colonies, ...originalSources],
    originalOrder = [...sources],
    position = new THREE.Vector3();
  for (const colony of colonies) colony.lairColony = true;
  assert.deepEqual(
    selectBermudaLairLights(sources, position, {
      local: true,
      headSource: head,
      mouthSource: mouth,
    }),
    [head, colonies[0], colonies[1]],
  );
  mouth.intensity = 24;
  assert.deepEqual(
    selectBermudaLairLights(sources, position, {
      local: true,
      headSource: head,
      mouthSource: mouth,
    }),
    [head, mouth, colonies[0]],
  );
  assert.deepEqual(
    selectBermudaLairLights(sources, position),
    [mouth, ...originalSources],
    "outside the lair retains ordinary nearest-source behavior",
  );
  assert.deepEqual(sources, originalOrder);
});

test("Distance culling, reduced-motion steady visibility and reset reuse the same two batches", () => {
  const f = fixture();
  try {
    const art = f.lighting,
      matrices = art.placements.map((row) => row.matrix.elements.slice()),
      intensity = art.near.material.emissiveIntensity;
    art.update(0, new THREE.Vector3(), true, true);
    assert.equal(art.near.count + art.far.count, 6);
    art.update(100, new THREE.Vector3(), false, true);
    assert.equal(art.near.count + art.far.count, 6);
    assert.equal(art.near.material.emissiveIntensity, intensity);
    assert.deepEqual(
      art.placements.map((row) => row.matrix.elements),
      matrices,
    );
    art.update(101, new THREE.Vector3(1000, 1000, 1000));
    assert.equal(art.near.count + art.far.count, 0);
    art.reset();
    assert.equal(art.near.count, 0);
    assert.equal(art.far.count, 6);
    assert.equal(art.far.visible, true);
    assert.equal(art.root.children.length, 2);
    for (let i = 0; i < 6; i++) {
      const matrix = new THREE.Matrix4();
      art.far.getMatrixAt(i, matrix);
      assert.ok(
        matrix.elements.every((v, k) => Math.abs(v - matrices[i][k]) < 1e-5),
      );
    }
  } finally {
    f.dispose();
  }
});

test("A live mouth beyond its 110m visibility cannot reserve a local light slot", () => {
  const head = {
      position: new THREE.Vector3(60, 0, 0),
      intensity: 150,
    },
    mouth = {
      position: new THREE.Vector3(120, 0, 0),
      intensity: 24,
    },
    colonies = [5, 8].map((x) => ({
      position: new THREE.Vector3(x, 0, 0),
      intensity: 125,
      lairColony: true,
    })),
    position = new THREE.Vector3();
  assert.deepEqual(
    selectBermudaLairLights([mouth, ...colonies, head], position, {
      local: true,
      headSource: head,
      mouthSource: mouth,
    }),
    [head, ...colonies],
  );
  mouth.position.x = 109;
  assert.deepEqual(
    selectBermudaLairLights([mouth, ...colonies, head], position, {
      local: true,
      headSource: head,
      mouthSource: mouth,
    }),
    [head, mouth, colonies[0]],
  );
});

test("Private emissive materials dispose once while an external shared HF lease stays valid", async () => {
  const external = acquireHawaiiReefAsset("reef_sponge"),
    f = fixture();
  let sharedDisposals = 0,
    privateDisposals = 0;
  external.geometry.addEventListener("dispose", () => sharedDisposals++);
  f.lighting.near.material.addEventListener(
    "dispose",
    () => privateDisposals++,
  );
  f.lighting.far.material.addEventListener("dispose", () => privateDisposals++);
  try {
    assert.equal(f.lighting.near.geometry, external.geometry);
    assert.equal(
      await f.lighting.prepare(),
      false,
      "Node has no bitmap loader",
    );
    assert.ok(f.lighting.near.material.emissiveIntensity > 0);
    f.lighting.dispose();
    f.lighting.dispose();
    f.lighting.reset();
    assert.equal(privateDisposals, 2);
    assert.equal(sharedDisposals, 0);
    assert.equal(f.lighting.root.parent, null);
    assert.equal(f.lighting.lightSources.length, 0);
    assert.equal(await f.lighting.prepare(), false);
  } finally {
    f.dispose();
    external.release();
  }
  assert.equal(sharedDisposals, 1);
});

test("Background minerals live on the actual wall and restore its shared material on disposal", () => {
  const f = fixture();
  try {
    const art = f.lighting,
      geometry = f.shell.geometry,
      binding = art.backdrop.bindings.find((row) => row.mesh === f.shell);
    assert.ok(binding);
    assert.equal(f.shell.material, binding.material);
    assert.notEqual(binding.material, binding.original);
    assert.equal(f.shell.geometry, geometry);
    for (const row of art.backdrop.anchors) {
      assert.equal(row.surface, f.shell);
      assert.ok(Number.isInteger(row.face));
      assert.ok(Math.abs(row.normal.length() - 1) < 1e-8);
      assert.ok(
        row.source.position
          .clone()
          .sub(row.point)
          .distanceTo(row.normal.clone().multiplyScalar(2)) < 1e-8,
      );
      const ray = new THREE.Raycaster(
          row.source.position,
          row.normal.clone().negate(),
          0,
          3,
        ),
        hit = ray.intersectObject(f.shell, false)[0];
      assert.ok(hit?.point.distanceTo(row.point) < 1e-6);
    }
    let disposed = 0;
    binding.material.addEventListener("dispose", () => disposed++);
    art.dispose();
    art.dispose();
    assert.equal(f.shell.material, binding.original);
    assert.equal(f.shell.geometry, geometry);
    assert.equal(disposed, 1);
  } finally {
    f.dispose();
  }
});

test("Slow background breathing never blacks out, respects reduced motion and avoids LOD uploads", () => {
  const f = fixture();
  try {
    let previous = bermudaLairGlowPulse(0);
    for (let i = 1; i <= 240; i++) {
      const elapsed = i / 20,
        value = bermudaLairGlowPulse(elapsed);
      assert.ok(value >= 0.82 - 1e-9 && value <= 1.18 + 1e-9);
      assert.ok(Math.abs(value - previous) < 0.005);
      assert.equal(bermudaLairGlowPulse(elapsed, true), 1);
      previous = value;
    }
    const art = f.lighting,
      position = new THREE.Vector3();
    art.update(0, position);
    const version = art.near.instanceMatrix.version,
      start = art.backdrop.anchors[0].source.intensity;
    art.update(0.15, position);
    assert.notEqual(art.backdrop.anchors[0].source.intensity, start);
    assert.equal(art.near.instanceMatrix.version, version);
    const paused = art.backdrop.anchors[0].source.intensity;
    art.update(0.15, position);
    assert.equal(art.backdrop.anchors[0].source.intensity, paused);
    art.update(6, position, true, true);
    assert.equal(art.backdrop.anchors[0].source.intensity, 760);
    art.reset();
    assert.equal(art.backdrop.anchors[0].source.intensity, 760);
  } finally {
    f.dispose();
  }
});

test("Local background wash shares the three-light budget with the head and active mouth", () => {
  const point = (x, extra = {}) => ({
      position: new THREE.Vector3(x, 0, 0),
      intensity: 150,
      ...extra,
    }),
    head = point(30),
    mouth = point(10),
    colony = point(2, { lairColony: true }),
    background = point(170, { lairColony: true, lairBackdrop: true }),
    ordinary = point(5),
    sources = [head, mouth, colony, background, ordinary],
    position = new THREE.Vector3();
  assert.deepEqual(
    selectBermudaLairLights(sources, position, {
      local: true,
      headSource: head,
      mouthSource: mouth,
    }),
    [head, mouth, background],
  );
  assert.deepEqual(selectBermudaLairLights(sources, position), [
    ordinary,
    mouth,
    head,
  ]);
});
