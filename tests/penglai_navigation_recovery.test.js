import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createEncounters } from "../src/encounters.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { PENGLAI_BOSS_INSTANCES } from "../src/penglai_config.js";
import { PENGLAI_LORDS } from "../src/penglai_lords.js";
import { createPlayer } from "../src/simulation.js";
import { lordMoveClear } from "../src/lord_navigation.js";
import { recoverFlyingLordMotion } from "../src/lord_navigation_recovery.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";
const noop = () => {};
const ctx = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (o, k) => o[k] ?? noop },
);

for (const dt of [1 / 30, 1 / 60])
  test(`Azure and Sage leave the actual dragon columns and resume pursuit at ${1 / dt}Hz`, () => {
    const doc = globalThis.document,
      scene = new T.Scene(),
      ocean = createPenglaiOcean(scene);
    globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
    const blocked = (a, b, radius = 0) =>
      castIndexedSegment(a, b, { staticColliders: ocean.colliders, radius }) !==
      null;
    const enc = createEncounters(scene, {
      seabedHeight: ocean.heightAt,
      groundHeightAt: ocean.groundHeightAt,
      navigationBlocked: blocked,
      audio: { bitten: noop, biteLord: noop, bossAttack: noop },
      notify: noop,
      onDamage: noop,
      onBite: noop,
    });
    try {
      for (const kind of ["azure_dragon", "sword_sage"]) {
        enc.reset(
          PENGLAI_LORDS.map((s) => s.kind),
          {},
          PENGLAI_BOSS_INSTANCES,
        );
        const e = enc.bosses.find((e) => e.state.species.kind === kind),
          player = createPlayer();
        for (const b of enc.bosses) if (b !== e) b.state.defeated = true;
        player.health = 1e6;
        player.length = 30;
        let time = 0,
          recoveries = 0;
        const abilities = new Set(),
          old = new T.Vector3(),
          previous = new T.Quaternion();
        for (const p of [
          [315, 285, -520],
          [315, 285, -730],
          [400, 280, -650],
          [180, 310, -650],
          [315, 400, -520],
          [0, 420, -600],
        ]) {
          const target = new T.Vector3(...p),
            forward = new T.Vector3(0, 0, -1);
          let travel = 0,
            stall = 0,
            maxStall = 0;
          for (let i = 0; i < Math.round(30 / dt); i++) {
            old.copy(e.mesh.position);
            previous.copy(e.mesh.quaternion);
            time += dt;
            enc.update(dt, time, player, target, forward, {
              blockedBetween: blocked,
            });
            const d = old.distanceTo(e.mesh.position);
            travel += d;
            stall = d < 1e-5 ? stall + dt : 0;
            maxStall = Math.max(maxStall, stall);
            if (e.navigation.recoveredThisFrame) recoveries++;
            if (e.state.phase === "attack") abilities.add(e.state.ability);
            assert.ok(
              lordMoveClear(
                e,
                old,
                e.mesh.position,
                e.mesh.quaternion,
                ocean.groundHeightAt,
                blocked,
                previous,
              ),
              `${kind} swept body at ${time}`,
            );
            assert.ok(
              d <= e.state.species.chargeSpeed * dt + 0.001,
              "no teleport",
            );
          }
          assert.ok(travel > 40, `${kind} stranded near ${p}: ${travel}`);
          assert.ok(maxStall < 6, `${kind} frozen ${maxStall}s at ${p}`);
        }
        assert.ok(recoveries > 0);
        assert.ok(abilities.has(kind === "azure_dragon" ? "water" : "swords"));
        if (kind === "sword_sage") assert.ok(abilities.has("charge"));
        e.navigation.recovery.remaining = 1;
        enc.reset(
          PENGLAI_LORDS.map((s) => s.kind),
          {},
          PENGLAI_BOSS_INSTANCES,
        );
        assert.equal(
          e.navigation.recovery.remaining,
          0,
          "restart clears detour",
        );
        assert.equal(e.state.locked, kind === "sword_sage");
      }
    } finally {
      enc.dispose();
      ocean.dispose();
      globalThis.document = doc;
    }
  });

test("Recovery cannot bypass solid obstruction, pause or a locked charge direction", () => {
  const entry = {
    state: { species: { kind: "sword_sage" } },
    navigation: {},
    mesh: new T.Group(),
  };
  const p = entry.mesh.position.clone();
  for (const [dt, turnRate] of [
    [0, undefined],
    [1 / 60, 0],
  ]) {
    assert.equal(
      recoverFlyingLordMotion(
        entry,
        new T.Vector3(0, 0, -1),
        36,
        dt,
        () => 0,
        () => false,
        turnRate,
      ),
      false,
    );
    assert.deepEqual(entry.mesh.position, p);
  }
  entry.navigation = {
    probes: [{ x: 0, y: 0, z: 0, radius: 2 }],
    length: 38,
    a: new T.Vector3(),
    b: new T.Vector3(),
  };
  entry.state.pursuitStarted = true;
  entry.maxCenterY = 620;
  assert.equal(
    recoverFlyingLordMotion(
      entry,
      new T.Vector3(0, 0, -1),
      36,
      1 / 60,
      () => -100,
      () => true,
    ),
    false,
  );
  assert.deepEqual(entry.mesh.position, p);
});
