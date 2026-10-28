import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createAmazonOcean } from "../src/amazon_ocean.js";
import { createEncounters } from "../src/encounters.js";
import { AMAZON_BOSS_INSTANCES } from "../src/amazon_lords.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";
import { createPlayer } from "../src/simulation.js";
import { lordMoveClear } from "../src/lord_navigation.js";
import { recoverSwimmingLordMotion } from "../src/lord_navigation_recovery.js";

const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (o, k) => o[k] ?? noop },
);

test("Amazon pit lords escape bank approaches with their whole posed bodies", (t) => {
  const priorDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ getContext: () => context }),
  };
  const scene = new T.Scene(),
    ocean = createAmazonOcean(scene),
    blocked = (a, b, radius = 0) =>
      castIndexedSegment(a, b, { staticColliders: ocean.colliders, radius }) !==
      null,
    encounters = createEncounters(scene, {
      seabedHeight: ocean.heightAt,
      navigationBlocked: blocked,
      audio: { bitten: noop, biteLord: noop, bossAttack: noop },
      notify: noop,
      onDamage: noop,
      onBite: noop,
    });
  t.after(() => {
    encounters.dispose();
    ocean.dispose();
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
  });
  for (const [kind, offset] of [
    ["rootjaw", [-55, 35, 60]],
    ["yacumama", [0, -25, 75]],
  ])
    for (const fps of [20, 30, 60]) {
      const instances = AMAZON_BOSS_INSTANCES.filter((x) => x.kind === kind);
      encounters.reset([kind], {}, instances);
      const e = encounters.bosses.find((x) => x.enabled),
        p = createPlayer(),
        target = e.home.clone().add(new T.Vector3(...offset)),
        forward = new T.Vector3(0, 0, -1),
        point = new T.Vector3(),
        previous = e.mesh.position.clone(),
        rotation = e.mesh.quaternion.clone(),
        skin = e.mesh.userData.hfRig.mesh,
        phases = new Set(),
        label = `${kind} at ${fps} Hz`;
      p.length = 30;
      p.invulnerable = 999;
      target.y = Math.max(target.y, ocean.heightAt(target.x, target.z) + 15);
      assert.ok(e.navigationReady, label);
      let returnTravel = 0,
        stall = 0,
        maxStall = 0;
      for (let i = 0; i < fps * 45; i++) {
        // This original bank approach trapped Rootjaw even after the player left.
        if (i === fps * 25) target.copy(e.home);
        encounters.update(1 / fps, i / fps, p, target, forward, {
          blockedBetween: blocked,
        });
        const step = previous.distanceTo(e.mesh.position);
        assert.ok(step <= 85 / fps + 1e-6, `${label}: no position teleport`);
        assert.ok(
          rotation.angleTo(e.mesh.quaternion) <= 2.4 / fps + 1e-6,
          `${label}: bounded turn`,
        );
        assert.ok(
          lordMoveClear(
            e,
            previous,
            e.mesh.position,
            e.mesh.quaternion,
            ocean.heightAt,
            blocked,
            rotation,
          ),
          `${label}: swept body clearance`,
        );
        if (i >= fps * 25) {
          returnTravel += step;
          stall = step < 1e-5 ? stall + 1 / fps : 0;
          maxStall = Math.max(maxStall, stall);
        }
        phases.add(e.state.phase);
        previous.copy(e.mesh.position);
        rotation.copy(e.mesh.quaternion);
        if (i % fps) continue;
        e.mesh.updateMatrixWorld(true);
        skin.skeleton.update();
        for (let j = 0; j < skin.geometry.attributes.position.count; j += 32) {
          skin.getVertexPosition(j, point).applyMatrix4(skin.matrixWorld);
          assert.ok(
            point.y > ocean.heightAt(point.x, point.z) + 0.2,
            `${label}: visible skin enters bank at frame ${i}, vertex ${j}`,
          );
        }
      }
      assert.ok(
        returnTravel > 80,
        `${label}: resumed pursuit (${returnTravel} m)`,
      );
      assert.ok(maxStall < 7, `${label}: stationary too long (${maxStall} s)`);
      assert.ok(
        phases.has("attack") && phases.has("recover"),
        `${label}: full skill cycle`,
      );
      // Pause, a locked strike, and a completely sealed volume cannot invoke retreat.
      const position = e.mesh.position.toArray(),
        quaternion = e.mesh.quaternion.toArray();
      for (const [dt, isBlocked, turnRate] of [
        [0, blocked, 2.4],
        [1 / 30, blocked, 0],
        [1 / 30, () => true, 2.4],
      ]) {
        assert.equal(
          recoverSwimmingLordMotion(
            e,
            forward,
            35,
            dt,
            ocean.heightAt,
            isBlocked,
            turnRate,
          ),
          false,
        );
        assert.deepEqual(e.mesh.position.toArray(), position);
        assert.deepEqual(e.mesh.quaternion.toArray(), quaternion);
      }
      encounters.reset([kind], {}, instances);
      assert.equal(
        e.navigation.recovery?.remaining ?? 0,
        0,
        "Restart clears retreat",
      );
    }
});
