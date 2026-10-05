import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createOdysseyOcean,
  createOdysseyOceanAsync,
  createOdysseyOceanSteps,
  odysseyWaterHeight,
} from "../src/odyssey_ocean.js";
import { ODYSSEY_WORLD, odysseySeabedHeight } from "../src/odyssey_config.js";
import {
  isPositionBlocked,
  bodyRadius,
  resolveMotion,
} from "../src/collision.js";

test("Odyssey floor agrees with actual rendered triangle samples and preserves bounded staging", async () => {
  const parent = new THREE.Group(),
    stages = [];
  const ocean = await createOdysseyOceanAsync(parent, {
    budgetMs: 0,
    yieldTask: async () => {},
    onStep: (s) => stages.push(s),
  });
  assert.ok(stages.filter((s) => s === "seabed-strip").length >= 16);
  assert.ok(stages.includes("galley-ribs"));
  assert.ok(stages.includes("reef-ecology-batch"));
  const floors = [];
  ocean.root.traverse((n) => {
    if (n.name === "odyssey_authoritative_seabed") floors.push(n);
  });
  const ray = new THREE.Raycaster();
  parent.updateMatrixWorld(true);
  let maxError = 0;
  for (const x of [-295, -252, -211, -125, -5, 72, 199, 248, 292])
    for (const z of [135, 99, -3, -149, -277, -444, -647, -799, -947, -1140]) {
      const expected = odysseySeabedHeight(x, z);
      ray.set(
        new THREE.Vector3(x, expected + 30, z),
        new THREE.Vector3(0, -1, 0),
      );
      const hit = ray.intersectObjects(floors)[0];
      assert.ok(hit, `floor ${x},${z}`);
      maxError = Math.max(maxError, Math.abs(hit.point.y - expected));
    }
  assert.ok(maxError < 0.2, `triangle height error ${maxError}`);
  ocean.dispose();
  ocean.dispose();
  assert.equal(parent.children.length, 0);
  assert.equal(ocean.colliders.length, 0);
});

test("Odyssey construction cancellation releases partially created nodes and geometry", () => {
  const parent = new THREE.Group(),
    iterator = createOdysseyOceanSteps(parent);
  iterator.next();
  assert.equal(parent.children.length, 1);
  const root = parent.children[0];
  let disposed = 0;
  root.traverse((n) => {
    if (n.isMesh) n.geometry.addEventListener("dispose", () => disposed++);
  });
  iterator.return();
  assert.equal(parent.children.length, 0);
  assert.ok(disposed > 0);
});

test("fully grown bodies traverse the primary passage and both open gateway approaches", () => {
  const parent = new THREE.Group(),
    ocean = createOdysseyOcean(parent);
  const radius = bodyRadius(30),
    points = [];
  const route = ocean.radarPaths[0];
  for (let z = 75; z > -1090; z -= 12) {
    const segment = route.findIndex(
      (p, i) => i < route.length - 1 && z <= p[1] && z >= route[i + 1][1],
    );
    const a = route[Math.max(0, segment)],
      b = route[Math.max(0, segment) + 1],
      u = (z - a[1]) / (b[1] - a[1]);
    const x = a[0] + (b[0] - a[0]) * u,
      y = odysseySeabedHeight(x, z) + 36;
    points.push(new THREE.Vector3(x, y, z));
  }
  for (const order of [points, points.slice().reverse()]) {
    let previous = order[0];
    for (const position of order.slice(1)) {
      const forward = position.clone().sub(previous).normalize();
      assert.equal(
        isPositionBlocked(position, {
          colliders: ocean.colliders,
          radius,
          length: 30,
          forward,
        }),
        false,
        `${position.toArray()}`,
      );
      const result = resolveMotion(previous, position, {
        colliders: ocean.colliders,
        radius,
        length: 30,
        forward,
      });
      assert.equal(result.stuck, false);
      assert.ok(
        new THREE.Vector3(
          result.position.x,
          result.position.y,
          result.position.z,
        ).distanceTo(position) < 0.05,
      );
      previous = position;
    }
  }
  const reefMeshes = [];
  ocean.root.traverse((n) => {
    if (n.isMesh) reefMeshes.push(n);
  });
  assert.ok(reefMeshes.some((n) => n.isInstancedMesh));
  assert.ok(ocean.wreck.userData.length === 90);
  // 沉船不是一个整盒禁行区；中部舱口实际开放，细结构保留实体。
  const inside = ocean.wreck.userData.interior;
  for (const length of [3, 16, 30])
    assert.equal(
      isPositionBlocked(inside, {
        colliders: ocean.colliders,
        radius: bodyRadius(length),
        length,
        forward: { x: 1, y: 0, z: 0 },
      }),
      false,
    );
  ocean.dispose();
});

test("surface sampler and shared active time preserve terrain and resource ownership", () => {
  const a = new THREE.Group(),
    b = new THREE.Group(),
    o1 = createOdysseyOcean(a),
    o2 = createOdysseyOcean(b);
  assert.equal(o1.heightAt, odysseySeabedHeight);
  assert.equal(o1.groundHeightAt, odysseySeabedHeight);
  assert.ok(
    Math.abs(odysseyWaterHeight(11, -85, 4) - ODYSSEY_WORLD.surfaceY) < 0.31,
  );
  const surface = o2.root.getObjectByName("odyssey_matching_swell_surface");
  const material = surface.material;
  assert.equal(material.fog, true);
  const sky = o2.root.getObjectByName("odyssey_amber_sky"),
    island = o2.root.getObjectByName("odyssey_offshore_white_cliff_0");
  o1.dispose();
  o2.update(12, new THREE.Vector3(0, -30, 75));
  assert.equal(sky.visible, false);
  assert.equal(island.visible, false);
  assert.equal(material.uniforms.odysseyTime.value, 12);
  assert.equal(material.uniforms.aboveWater.value, 0);
  const wave = odysseyWaterHeight(0, 75, 12);
  o2.update(12, new THREE.Vector3(0, wave - 0.01, 75));
  assert.equal(sky.visible, false);
  assert.equal(island.visible, false);
  assert.equal(material.uniforms.aboveWater.value, 0);
  o2.update(12, new THREE.Vector3(0, wave + 0.01, 75));
  assert.equal(sky.visible, true);
  assert.equal(material.uniforms.aboveWater.value, 1);
  assert.equal(material.transparent, false);
  assert.equal(material.depthWrite, true);
  o2.update(12, new THREE.Vector3(0, 9, 75));
  assert.equal(sky.visible, true);
  assert.equal(island.visible, true);
  assert.equal(material.uniforms.odysseyTime.value, 12);
  assert.equal(material.uniforms.aboveWater.value, 1);
  assert.ok(b.children.length === 1);
  o2.dispose();
});
