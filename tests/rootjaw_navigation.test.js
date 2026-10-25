import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createAmazonOcean } from "../src/amazon_ocean.js";
import { createEncounters } from "../src/encounters.js";
import { AMAZON_BOSS_INSTANCES } from "../src/amazon_lords.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";
import { createPlayer } from "../src/simulation.js";

const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (o, k) => o[k] ?? noop },
);

for (const [name, offset] of [
  ["bank", [0, 0, -52]],
  ["ascent", [0, 55, -52]],
  ["descent", [0, -45, 35]],
]) {
  test(`Rootjaw ${name}: posed head, belly and tail clear the actual riverbed, with gradual turns and recoverable obstruction`, () => {
    const originalDocument = globalThis.document;
    const scene = new T.Scene(),
      ocean = createAmazonOcean(scene);
    globalThis.document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => context }),
    };
    const blocked = (a, b, radius = 0) =>
      castIndexedSegment(a, b, {
        staticColliders: ocean.colliders,
        radius,
      }) !== null;
    const encounters = createEncounters(scene, {
      seabedHeight: ocean.heightAt,
      navigationBlocked: blocked,
      audio: { bitten: noop, biteLord: noop, bossAttack: noop },
      notify: noop,
      onDamage: noop,
      onBite: noop,
    });
    try {
      const instances = AMAZON_BOSS_INSTANCES.filter(
        (x) => x.kind === "rootjaw",
      );
      encounters.reset(["rootjaw"], {}, instances);
      const e = encounters.bosses.find((e) => e.enabled),
        initial = e.mesh.position.clone(),
        initialRotation = e.mesh.quaternion.clone(),
        p = createPlayer(),
        target = e.home.clone().add(new T.Vector3(...offset)),
        forward = new T.Vector3(0, 0, -1),
        skin = e.mesh.userData.hfRig.mesh,
        point = new T.Vector3(),
        up = new T.Vector3(),
        previous = initial.clone(),
        rotation = initialRotation.clone(),
        phases = new Set();
      assert.ok(e.navigationReady);
      p.length = 30;
      p.invulnerable = 999;
      target.y = Math.max(target.y, ocean.heightAt(target.x, target.z) + 12);
      let travel = 0,
        returnTravel = 0,
        minPitch = 0,
        maxPitch = 0,
        minY = initial.y,
        maxY = initial.y;
      for (let i = 0; i < 1200; i++) {
        // A player leaving the bank must release a blocked chase; no boss pinning.
        if (i === 900) target.copy(e.home);
        encounters.update(1 / 60, i / 60, p, target, forward, {
          blockedBetween: blocked,
        });
        const step = e.mesh.position.distanceTo(previous);
        assert.ok(step <= 85 / 60 + 1e-6, "No terrain-lift teleport");
        assert.ok(
          rotation.angleTo(e.mesh.quaternion) <= 2.4 / 60 + 1e-6,
          "Locking a new attack cannot snap the whole body around",
        );
        up.set(0, 1, 0).applyQuaternion(e.mesh.quaternion);
        assert.ok(up.y > 0.45, "Back remains above belly");
        travel += step;
        if (i >= 900) returnTravel += step;
        previous.copy(e.mesh.position);
        rotation.copy(e.mesh.quaternion);
        minY = Math.min(minY, e.mesh.position.y);
        maxY = Math.max(maxY, e.mesh.position.y);
        const pitch = Math.asin(
          point.set(0, 0, -1).applyQuaternion(e.mesh.quaternion).y,
        );
        minPitch = Math.min(minPitch, pitch);
        maxPitch = Math.max(maxPitch, pitch);
        phases.add(e.state.phase);
        if (i % 20) continue;
        e.mesh.updateMatrixWorld(true);
        skin.skeleton.update();
        // Sample the visible deformed skin, not merely collision-probe centres.
        for (let j = 0; j < skin.geometry.attributes.position.count; j += 11) {
          skin.getVertexPosition(j, point).applyMatrix4(skin.matrixWorld);
          assert.ok(
            point.y > ocean.heightAt(point.x, point.z) + 0.2,
            `Visible skin entered riverbed at frame ${i}, vertex ${j}`,
          );
        }
      }
      assert.ok(
        travel > 65 && returnTravel > 30,
        "Can resume after obstruction",
      );
      assert.ok(phases.has("attack") && phases.has("recover"));
      if (name === "ascent") assert.ok(maxPitch > 0.6 && maxY > initial.y + 20);
      if (name === "descent")
        assert.ok(minPitch < -0.4 && minY < initial.y - 20);
      encounters.reset(["rootjaw"], {}, instances);
      const restarted = encounters.bosses.find((e) => e.enabled);
      assert.deepEqual(restarted.mesh.position.toArray(), initial.toArray());
      assert.ok(restarted.mesh.quaternion.angleTo(initialRotation) < 1e-6);
    } finally {
      encounters.dispose();
      ocean.dispose();
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }
  });
}
