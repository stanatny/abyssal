import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createAtlantisUnderways,
  ATLANTIS_UNDERWAY_SITES,
  isAtlantisUnderwayReserved,
} from "../src/atlantis_underways.js";
import { seabedHeight } from "../src/ocean.js";
import { WORLD } from "../src/world_config.js";
import { bodyRadius, resolveMotion, castSegment } from "../src/collision.js";
import {
  cityCoverage,
  ATLANTIS_DISTRICTS,
  cityLots,
} from "../src/atlantis_city_plan.js";

function fixture(t) {
  const scene = new THREE.Scene();
  const underways = createAtlantisUnderways(scene, { heightAt: seabedHeight });
  scene.updateMatrixWorld(true);
  t.after(() => underways.dispose());
  return { scene, underways };
}

test("Three distinct side complexes reserve twelve lots without changing city coverage", () => {
  assert.equal(ATLANTIS_UNDERWAY_SITES.length, 3);
  assert.equal(new Set(ATLANTIS_UNDERWAY_SITES.map((s) => s.variant)).size, 3);
  assert.equal(
    cityLots().filter((s) => isAtlantisUnderwayReserved(s.x, s.z)).length,
    12,
  );
  assert.equal(isAtlantisUnderwayReserved(0, -735, 200, 200), false);
  assert.equal(ATLANTIS_DISTRICTS.length, 5);
  assert.ok(cityCoverage() > 0.696 && cityCoverage() < 0.697);
});

test("Thirty meter characters continuously cross both levels and the open vertical well", (t) => {
  const { underways } = fixture(t);
  for (const site of underways.records)
    for (const route of [
      site.lowerRoute,
      site.upperRoute,
      site.verticalRoute,
    ].filter(Boolean)) {
      for (const reverse of [false, true]) {
        const [start, end] = reverse ? [...route].reverse() : route;
        const delta = new THREE.Vector3(
          end.x - start.x,
          end.y - start.y,
          end.z - start.z,
        ).normalize();
        for (const stepCount of [1, 120]) {
          let current = { ...start };
          for (let i = 1; i <= stepCount; i++) {
            const desired = {
              x: start.x + ((end.x - start.x) * i) / stepCount,
              y: start.y + ((end.y - start.y) * i) / stepCount,
              z: start.z + ((end.z - start.z) * i) / stepCount,
            };
            const result = resolveMotion(current, desired, {
              colliders: underways.colliders,
              length: 30,
              radius: bodyRadius(30),
              forward: delta,
              // 与真实主循环一致，不能仅证明空中的碰撞路线可走。
              floorHeight: (x, z) =>
                seabedHeight(x, z) +
                bodyRadius(30) +
                Math.abs(delta.y) * Math.max(0, 30 * 0.42 - bodyRadius(30)) +
                0.4,
              bounds: {
                minX: WORLD.minX + 5,
                maxX: WORLD.maxX - 5,
                minZ: WORLD.minZ + 5,
                maxZ: WORLD.maxZ - 5,
                minY: -WORLD.maxDepth + bodyRadius(30),
                maxY: WORLD.surfaceY - 30 * 0.15,
              },
            });
            assert.equal(
              result.blocked,
              false,
              `${site.id} ${route === site.lowerRoute ? "lower" : "upper/vertical"} at ${i}/${stepCount}`,
            );
            assert.equal(result.stuck, false);
            assert.ok(
              result.position.y >
                seabedHeight(result.position.x, result.position.z) +
                  bodyRadius(30),
            );
            current = result.position;
          }
          assert.ok(
            new THREE.Vector3(current.x, current.y, current.z).distanceTo(
              new THREE.Vector3(end.x, end.y, end.z),
            ) < 0.01,
          );
        }
      }
    }
});

test("Bridge decks and foundations block at visible surfaces without an invisible gallery base", (t) => {
  const { underways, scene } = fixture(t);
  const ray = new THREE.Raycaster();
  for (const site of underways.records) {
    const x = site.x + 35,
      z = site.z + 20;
    const start = new THREE.Vector3(x, site.y + 5, z),
      end = new THREE.Vector3(x, site.y - 10, z);
    const hit = castSegment(start, end, underways.colliders);
    assert.ok(hit, `${site.id} deck must be solid`);
    ray.set(start, new THREE.Vector3(0, -1, 0));
    const visual = ray.intersectObjects(scene.children, true)[0];
    assert.ok(visual && Math.abs(visual.distance - hit.distance) < 0.1);
    for (const cx of [-44, 44])
      for (const cz of [-46, 0, 46]) {
        const px = site.x + cx,
          pz = site.z + cz;
        const base = underways.colliders.find(
          (c) =>
            c.type === "box" &&
            c.x === px &&
            c.z === pz &&
            c.halfSize.x === 5.5,
        );
        assert.ok(base);
        for (const dx of [-5.5, 0, 5.5])
          for (const dz of [-5.5, 0, 5.5])
            assert.ok(
              base.y - base.halfSize.y <= seabedHeight(px + dx, pz + dz),
            );
      }
  }
});

test("Merged resources dispose exactly once and leave another instance intact", (t) => {
  const { underways, scene } = fixture(t);
  const other = createAtlantisUnderways(scene, { heightAt: seabedHeight });
  t.after(() => other.dispose());
  let releases = 0,
    meshes = 0;
  underways.root.traverse((node) => {
    if (node.isMesh) {
      meshes++;
      node.geometry.addEventListener("dispose", () => releases++);
      assert.ok(node.geometry.attributes.position.array.every(Number.isFinite));
    }
  });
  assert.ok(meshes <= 12);
  assert.ok(underways.stats.triangles < 180000);
  underways.dispose();
  underways.dispose();
  assert.equal(releases, meshes);
  assert.equal(underways.colliders.length, 0);
  assert.equal(other.root.parent, scene);
  assert.equal(other.records.length, 3);
});
