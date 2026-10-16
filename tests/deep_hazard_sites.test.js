import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { attachDeepHazards } from "../src/deep_hazards.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import { createEuropaOcean } from "../src/europa_ocean.js";
import { createAmazonOcean } from "../src/amazon_ocean.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { getExpedition } from "../src/expedition_config.js";
import { isPositionBlocked } from "../src/collision.js";

for (const [id, make] of Object.entries({
  hawaii: createOcean,
  atlantis: createAtlantisOcean,
  bermuda: createBermudaOcean,
  mariana: createMarianaOcean,
  europa: createEuropaOcean,
  amazon: createAmazonOcean,
  odyssey: createOdysseyOcean,
  penglai: createPenglaiOcean,
}))
  test(`${id}: all anchored sites fit the final world and release every owned buffer/material once`, (ctx) => {
    const ocean = make(new THREE.Scene()),
      colliders = ocean.colliders,
      original = [...colliders],
      heightAt = ocean.heightAt || seabedHeight;
    attachDeepHazards(ocean, id, { heightAt });
    ctx.after(() => ocean.dispose());
    const { sites } = ocean.deepHazards,
      world = getExpedition(id).region.world || {
        minX: -300,
        maxX: 300,
        minZ: -1150,
        maxZ: 140,
      };
    assert.equal(sites.length, id === "atlantis" ? 4 : 2);
    assert.equal(ocean.colliders, colliders);
    assert.deepEqual(colliders, original);
    const resources = new Set(),
      counts = new Map();
    for (const s of sites) {
      assert.ok(
        s.x > world.minX + 15 &&
          s.x < world.maxX - 15 &&
          s.z > world.minZ + 15 &&
          s.z < world.maxZ - 15,
        id,
      );
      assert.ok(s.z < -200 && s.y < -25);
      assert.equal(
        isPositionBlocked(
          { x: s.x, y: s.y + 15, z: s.z },
          { colliders, radius: 3 },
        ),
        false,
        s.id,
      );
      if (id === "mariana") {
        assert.match(s.host, /^trench_layer_/);
        ocean.root.updateMatrixWorld(true);
        const host = ocean.root.getObjectByName(s.host);
        for (let n = 0; n < 32; n++) {
          const x = s.x + Math.cos(n * 2.39996) * 16,
            z = s.z + Math.sin(n * 2.39996) * 16;
          const ray = new THREE.Raycaster(
            new THREE.Vector3(x, s.y + 80, z),
            new THREE.Vector3(0, -1, 0),
            0,
            160,
          );
          const hit = ray.intersectObject(host)[0];
          assert.ok(hit);
          assert.ok(Math.abs(s.floor(x, z) - hit.point.y) < 1e-5);
        }
      }
      // 所有底座/预警顶点均贴合真实承载表面；不以中心标高证明整个足迹。
      const c = Math.cos(s.yaw),
        sn = Math.sin(s.yaw),
        sample = s.floor || heightAt;
      s.art.group.traverse((n) => {
        if (n.geometry) {
          resources.add(n.geometry);
          if (n.isMesh) {
            const p = n.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
              const x = p.getX(i),
                y = p.getY(i),
                z = p.getZ(i),
                floor =
                  sample(s.x + x * c + z * sn, s.z - x * sn + z * c) - s.y;
              assert.ok(
                y - floor < 2.2,
                `${id}:${s.id} unsupported part ${y - floor}`,
              );
            }
          }
        }
        if (n.material) resources.add(n.material);
      });
    }
    for (const r of resources) {
      counts.set(r, 0);
      r.addEventListener("dispose", () => counts.set(r, counts.get(r) + 1));
    }
    ocean.dispose();
    ocean.dispose();
    assert.ok([...counts.values()].every((n) => n === 1));
    assert.equal(sites.length, 0);
  });
