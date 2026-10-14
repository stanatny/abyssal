import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import {
  resolveAtlantisKeySites,
  ATLANTIS_KEY_SITES,
} from "../src/atlantis_key_sites.js";
import {
  createExpeditionObjective,
  expeditionObjectiveHint,
} from "../src/expedition_objectives.js";
import { getExpedition, CHARACTERS } from "../src/expedition_config.js";
import { bodyRadius, castSegment } from "../src/collision.js";
import { resolveIndexedMotion } from "../src/static_collider_grid.js";
import { MAX_SWIM_PITCH } from "../src/steering_rules.js";
import { WORLD } from "../src/world_config.js";
import { t } from "../src/i18n.js";

test("All twelve hiding spots are independently drawable and have translated building-only clues", () => {
  const region = getExpedition("atlantis").region;
  assert.equal(ATLANTIS_KEY_SITES.length, 12);
  assert.equal(new Set(ATLANTIS_KEY_SITES.map((s) => s.buildingId)).size, 6);
  for (let guardian = 0; guardian < 3; guardian++)
    for (let key = 0; key < 12; key++) {
      const values = [(guardian + 0.5) / 3, (key + 0.5) / 12];
      const state = createExpeditionObjective(region, () => values.shift());
      assert.equal(state.guardianId, region.bossInstances[guardian].id);
      assert.equal(state.keySiteId, ATLANTIS_KEY_SITES[key].id);
      state.clueRead = true;
      const hint = t(expeditionObjectiveHint(state, { length: 3 }), [], "en");
      assert.doesNotMatch(hint, /[\u3400-\u9fff]/u);
      assert.equal(state.keyCollected, false);
    }
});

test("Every hiding spot admits full entrance, turns, real capture and return at all body sizes", (ctx) => {
  const scene = new THREE.Scene(),
    ocean = createAtlantisOcean(scene);
  ctx.after(() => ocean.dispose());
  const sites = resolveAtlantisKeySites(ocean.city.underways.records);
  assert.equal(sites.length, 12);
  for (const site of sites)
    for (const length of [3, 16, 30]) {
      const points = [...site.route, ...site.route.slice(0, -1).reverse()];
      let position = { ...points[0] },
        yaw = 0,
        pitch = 0;
      const captured = new Set(),
        radius = bodyRadius(length),
        key = new THREE.Vector3().copy(site.point);
      const move = (desired, forward, label) => {
        const result = resolveIndexedMotion(position, desired, {
          staticColliders: ocean.colliders,
          length,
          radius,
          forward,
          floorHeight: (x, z) =>
            ocean.heightAt(x, z) +
            radius +
            Math.abs(forward.y) * Math.max(0, length * 0.42 - radius) +
            0.4,
          bounds: {
            minX: WORLD.minX + 5,
            maxX: WORLD.maxX - 5,
            minZ: WORLD.minZ + 5,
            maxZ: WORLD.maxZ - 5,
            minY: -WORLD.maxDepth + radius,
            maxY: WORLD.surfaceY - length * 0.15,
          },
        });
        const details = `${site.id}/${length}m/${label}: ${result.contacts.map((c) => c.collider.kind).join(",")}`;
        assert.equal(result.stuck, false, details);
        assert.equal(result.blocked, false, details);
        assert.equal(result.recovered, false, details);
        assert.ok(
          new THREE.Vector3()
            .copy(result.position)
            .distanceTo(new THREE.Vector3().copy(desired)) < 1e-4,
          details,
        );
        position = result.position;
        for (const c of CHARACTERS) {
          const mouth = new THREE.Vector3()
            .copy(position)
            .addScaledVector(
              forward,
              length * 0.36 * (c.id === "squid" ? -1 : 1),
            );
          if (
            mouth.distanceTo(key) < 4 + length * 0.06 &&
            !castSegment(position, key, ocean.colliders)
          )
            captured.add(c.id);
        }
      };
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          dx = b.x - a.x,
          dy = b.y - a.y,
          dz = b.z - a.z,
          h = Math.hypot(dx, dz);
        const nextYaw = h > 1e-8 ? Math.atan2(-dx, -dz) : yaw,
          nextPitch = THREE.MathUtils.clamp(
            Math.atan2(dy, h),
            -MAX_SWIM_PITCH,
            MAX_SWIM_PITCH,
          );
        const yd = Math.atan2(Math.sin(nextYaw - yaw), Math.cos(nextYaw - yaw));
        let forward;
        for (let k = 1; k <= 120; k++) {
          forward = new THREE.Vector3(0, 0, -1).applyEuler(
            new THREE.Euler(
              pitch + ((nextPitch - pitch) * k) / 120,
              yaw + (yd * k) / 120,
              0,
              "YXZ",
            ),
          );
          move(a, forward, `turn ${i}:${k}`);
        }
        yaw = nextYaw;
        pitch = nextPitch;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.5));
        for (let k = 1; k <= steps; k++)
          move(
            {
              x: a.x + (dx * k) / steps,
              y: a.y + (dy * k) / steps,
              z: a.z + (dz * k) / steps,
            },
            forward,
            `swim ${i}:${k}`,
          );
      }
      assert.deepEqual(
        [...captured].sort(),
        CHARACTERS.map((c) => c.id).sort(),
        `${site.id}/${length}m capture including rear-feeding Squid`,
      );
      assert.notDeepEqual(
        site.guidance,
        site.point,
        "Clue must stop at entrance rather than disclose the hiding point",
      );
    }
});
