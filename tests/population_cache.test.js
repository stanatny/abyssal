import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import {
  disposePopulation,
  trimPopulationCache,
} from "../src/population_cache.js";

test("Eviction releases independent rigs and warnings but preserves active shared geometry", () => {
  const old = createCreature("squid", 8, 1);
  const active = createCreature("squid", 8, 1);
  const scene = new THREE.Scene();
  scene.add(old, active);
  const skeletons = new Set(),
    activeSkeletons = new Set(),
    geometries = new Set();
  old.traverse((n) => {
    if (n.skeleton) skeletons.add(n.skeleton);
    if (n.geometry) geometries.add(n.geometry);
  });
  active.traverse((n) => {
    if (n.skeleton) activeSkeletons.add(n.skeleton);
  });
  assert.ok(skeletons.size > 0);
  let disposed = 0,
    geometryDisposals = 0,
    warnings = 0,
    shimmer = 0;
  for (const s of skeletons) {
    assert.ok(!activeSkeletons.has(s));
    s.computeBoneTexture();
    s.boneTexture.addEventListener("dispose", () => disposed++);
  }
  for (const g of geometries)
    g.addEventListener("dispose", () => geometryDisposals++);
  const telegraph = new THREE.Mesh(
    new THREE.TorusGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  telegraph.geometry.addEventListener("dispose", () => warnings++);
  telegraph.material.addEventListener("dispose", () => warnings++);
  scene.add(telegraph);
  old.userData.disposeRareShimmer = () => shimmer++;
  const population = [{ mesh: old, telegraph }];
  disposePopulation(population);
  disposePopulation(population);
  assert.equal(population.length, 0);
  assert.equal(disposed, skeletons.size);
  assert.equal(warnings, 2);
  assert.equal(shimmer, 1);
  assert.equal(geometryDisposals, 0);
  assert.deepEqual(scene.children, [active]);
  active.userData.animate(1, 1);
  active.updateMatrixWorld(true);
  disposePopulation([{ mesh: active }]);
});

test("Only the most recently left population survives transaction trimming", () => {
  const previous = [{ mesh: new THREE.Group() }],
    older = [{ mesh: new THREE.Group() }];
  const cache = new Map([
    ["older", older],
    ["previous", previous],
  ]);
  assert.equal(older.length, 1); // 切图提交前仍可回退。
  trimPopulationCache(cache);
  assert.deepEqual([...cache.keys()], ["previous"]);
  assert.equal(older.length, 0);
  assert.equal(previous.length, 1);
  const restored = cache.get("previous");
  cache.delete("previous"); // 回退为当前地图后不再属于闲置缓存。
  trimPopulationCache(cache);
  assert.equal(restored.length, 1);
});
