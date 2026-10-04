import { createPenglaiOcean } from "../src/penglai_ocean.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { isPositionBlocked } from "../src/collision.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { habitatPosition } from "../src/ecosystem_population.js";
import { stepGroundHeading } from "../src/ground_creatures.js";
import {
  groundCreatureProfile,
  groundTerrainPose,
  groundSpawnPose,
  steerGroundTerrain,
  resolveGroundTerrain,
  commitGroundTerrain,
} from "../src/ground_navigation.js";

function bodyDepth(mesh, heightAt) {
  let worst = Infinity;
  const point = new THREE.Vector3();
  mesh.updateMatrixWorld(true);
  mesh.traverse((part) => {
    for (let node = part; node && node !== mesh; node = node.parent)
      if (node.userData.terrainFlexible) return;
    const vertices = part.geometry?.attributes.position;
    if (!vertices) return;
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(part.matrixWorld);
      worst = Math.min(worst, point.y - heightAt(point.x, point.z));
    }
  });
  return worst;
}

test("All 38 ground residents spawn with their actual rigid anatomy above real mountains", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  const heightAt = ocean.groundHeightAt;
  let count = 0;
  for (const configured of getRegionSpecies("penglai").filter(
    (s) => s.groundbound,
  )) {
    const mesh = createCreature(configured.kind, configured.length);
    const species = {
      ...configured,
      ...groundCreatureProfile(mesh, configured.length),
    };
    assert.ok(species.groundFootprint.length <= 100);
    for (let i = 0; i < species.population; i++) {
      const position = habitatPosition(species, {
        populationIndex: i,
        heightAt,
        colliders: ocean.colliders,
      });
      assert.ok(position, `${species.kind}/${i}`);
      const pose = groundSpawnPose(
        position,
        species,
        heightAt,
        (p, direction) =>
          isPositionBlocked(p, {
            colliders: ocean.colliders,
            radius: Math.max(0.45, species.length * 0.18),
            length: species.length,
            forward: direction,
          }),
      );
      assert.ok(pose?.walkable);
      mesh.position.copy(position);
      mesh.rotation.set(0, Math.atan2(-pose.direction.x, -pose.direction.z), 0);
      assert.ok(
        bodyDepth(mesh, heightAt) >= -0.12,
        `${species.kind}/${i} body buried`,
      );
      count++;
    }
  }
  assert.equal(count, 38);
  // 同时核对烘焙后三角面和条带接缝，导航不能另造一张近似的隐形山体。
  ocean.root.updateMatrixWorld(true);
  const floors = ocean.root.children.filter(
    (m) => m.name === "same_source_mountain_floor",
  );
  const ray = new THREE.Raycaster(),
    down = new THREE.Vector3(0, -1, 0);
  for (const [x, z] of [
    [-418, -1060],
    [-320, -650],
    [315, -655],
    [0, -650],
    [-240, -290],
    [440, -1050],
    [11, -1320],
    [11, -1240],
    [11, -1160],
    [11, -1080],
    [11, -1000],
    [11, -920],
  ]) {
    ray.set(new THREE.Vector3(x, 1000, z), down);
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(hit);
    assert.ok(
      Math.abs(hit.point.y - heightAt(x, z)) < 0.01,
      `${x}/${z} triangle height mismatch`,
    );
  }
  ocean.dispose();
});

test("Uphill chase turns around a cliff without body penetration or a permanent stop", () => {
  const mesh = createCreature("zheng", 23);
  const species = {
    length: 23,
    speed: 10,
    groundbound: true,
    minimumGroundHeight: 1,
    ...groundCreatureProfile(mesh, 23),
  };
  const h = (x) => 20 + Math.max(0, x - 12) * 4;
  const position = new THREE.Vector3(0, 0, 0),
    heading = new THREE.Vector3(1, 0, 0),
    wish = new THREE.Vector3(1, 0, 0);
  const state = { phase: "walk", safeDirection: { x: 1, y: 0, z: 0 } };
  position.y = groundTerrainPose(position, heading, species, h).y;
  let travel = 0,
    stopped = 0,
    longestStop = 0;
  for (let i = 0; i < 600; i++) {
    const previous = position.clone();
    stepGroundHeading(
      heading,
      steerGroundTerrain(position, wish, species, h, state, i / 60),
      1 / 60,
      state,
    );
    position.addScaledVector(heading, species.speed / 60);
    resolveGroundTerrain(previous, position, heading, species, h, state);
    commitGroundTerrain(previous, position, heading, species, h, state);
    const d = position.distanceTo(previous);
    travel += d;
    stopped = d < 0.001 ? stopped + 1 : 0;
    longestStop = Math.max(longestStop, stopped);
    if (i % 30 === 0) {
      mesh.position.copy(position);
      mesh.rotation.set(0, Math.atan2(-heading.x, -heading.z), 0);
      assert.ok(bodyDepth(mesh, h) >= -0.12);
    }
  }
  assert.ok(travel > 35, `travel ${travel}`);
  assert.ok(longestStop < 120, `stopped ${longestStop} frames`);
});

test("Ground constraints apply without static colliders and never lift an animal through a cliff", () => {
  const species = {
    length: 10,
    speed: 5,
    groundClearance: 3,
    groundbound: true,
    minimumGroundHeight: 1,
  };
  const h = (x) => (x >= 5 ? 70 : 20);
  const previous = new THREE.Vector3(0, 23, 0),
    position = new THREE.Vector3(4.9, 23, 0),
    direction = new THREE.Vector3(1, 0, 0);
  const state = { safeDirection: { x: 1, y: 0, z: 0 } };
  assert.equal(
    resolveGroundTerrain(previous, position, direction, species, h, state),
    true,
  );
  assert.ok(position.y < 30);
  assert.ok(position.x < 5);
  const saved = position.clone();
  position.set(5, 90, 0);
  commitGroundTerrain(saved, position, direction, species, h, state);
  assert.ok(position.y < 30);
});

test("A wall slide is checked against the mountain again; leap altitude is preserved on safe ground", () => {
  const species = {
    length: 10,
    groundClearance: 3,
    groundbound: true,
    minimumGroundHeight: 1,
  };
  const h = (x, z) => (z < -2 && x > 1 ? 100 : 20);
  const old = new THREE.Vector3(0, 23, 0),
    end = new THREE.Vector3(3, 23, -1),
    direction = new THREE.Vector3(1, 0, 0);
  const state = { safeDirection: { x: 1, y: 0, z: 0 } };
  commitGroundTerrain(old, end, direction, species, h, state, 6);
  assert.ok(end.y < 40);
  assert.ok(state.terrainBlocked);
  assert.equal(end.y, 29);
});

test("A solid cliff-side obstacle cannot trap a turning animal or be bypassed by terrain projection", () => {
  const species = {
    length: 10,
    speed: 6,
    groundbound: true,
    groundClearance: 3,
    minimumGroundHeight: 1,
  };
  const colliders = [
    { type: "box", x: 15, y: 6, z: 0, halfSize: { x: 1, y: 15, z: 15 } },
  ];
  const h = () => 20;
  colliders[0].y += 20;
  const blocked = (p, d) =>
    isPositionBlocked(p, { colliders, radius: 1.8, length: 10, forward: d });
  const position = new THREE.Vector3(0, 23, 0),
    heading = new THREE.Vector3(1, 0, 0),
    wish = heading.clone();
  const state = { phase: "walk", safeDirection: { x: 1, y: 0, z: 0 } };
  let travel = 0,
    still = 0,
    longest = 0;
  for (let i = 0; i < 600; i++) {
    const previous = position.clone();
    stepGroundHeading(
      heading,
      steerGroundTerrain(position, wish, species, h, state, i / 60, blocked),
      1 / 60,
      state,
    );
    position.addScaledVector(heading, species.speed / 60);
    resolveGroundTerrain(
      previous,
      position,
      heading,
      species,
      h,
      state,
      0,
      blocked,
    );
    commitGroundTerrain(
      previous,
      position,
      heading,
      species,
      h,
      state,
      0,
      blocked,
    );
    assert.equal(blocked(position, heading), false);
    const d = position.distanceTo(previous);
    travel += d;
    still = d < 0.001 ? still + 1 : 0;
    longest = Math.max(longest, still);
  }
  assert.ok(travel > 30, `travel ${travel}`);
  assert.ok(longest < 120, `stopped ${longest}`);
  assert.equal(position.y, 23);
});
