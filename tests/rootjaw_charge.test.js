import * as T from "three";
import test from "node:test";
import assert from "node:assert/strict";
import { createAmazonOcean } from "../src/amazon_ocean.js";
import { createEncounters } from "../src/encounters.js";
import { AMAZON_BOSS_INSTANCES } from "../src/amazon_lords.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";
import { createPlayer } from "../src/simulation.js";
import { resolveMotion, bodyRadius } from "../src/collision.js";
const noop = () => {},
  ctx = new Proxy(
    {
      createRadialGradient: () => ({ addColorStop: noop }),
      createLinearGradient: () => ({ addColorStop: noop }),
    },
    { get: (o, k) => o[k] ?? noop },
  );
test("Rootjaw charge uses the physical player/core contact, can be dodged and obeys occlusion", (t) => {
  const priorDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  const scene = new T.Scene(),
    ocean = createAmazonOcean(scene),
    blocked = (a, b, radius = 0) =>
      castIndexedSegment(a, b, { staticColliders: ocean.colliders, radius }) !==
      null,
    enc = createEncounters(scene, {
      seabedHeight: ocean.heightAt,
      navigationBlocked: blocked,
      audio: { bitten: noop, biteLord: noop, bossAttack: noop },
      notify: noop,
      onDamage: noop,
      onBite: noop,
    });
  t.after(() => {
    enc.dispose();
    ocean.dispose();
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
  });
  const results = [];
  for (const scenario of ["stand", "evade", "covered"])
    for (const fps of [20, 60]) {
      enc.reset(
        ["rootjaw"],
        {},
        AMAZON_BOSS_INSTANCES.filter((s) => s.kind === "rootjaw"),
      );
      const e = enc.bosses.find((e) => e.enabled),
        p = createPlayer(),
        pos = e.home.clone().add(new T.Vector3(0, 0, -65)),
        f = new T.Vector3(0, 0, 1);
      p.length = 30;
      p.invulnerable = 0;
      let hits = [],
        phases = [],
        dodge = false,
        maxHitCycle = 0;
      const dt = 1 / fps;
      for (let i = 0; i < fps * 24; i++) {
        p.invulnerable = Math.max(0, p.invulnerable - dt);
        const old = pos.clone();
        if (
          scenario === "evade" &&
          e.state.attackCount === 0 &&
          e.state.phase === "windup" &&
          e.state.timer >=
            e.state.phaseDuration - e.state.species.lockWindow + 0.05
        )
          dodge = true;
        if (dodge && e.state.attackCount <= 1) pos.x += 32 * dt;
        const opts = {
          radius: bodyRadius(p.length),
          length: p.length,
          forward: f,
        };
        pos.copy(
          resolveMotion(old, pos, {
            ...opts,
            colliders: [
              ...ocean.colliders,
              ...enc.bodyColliders(pos, p.length, old),
            ],
            floorHeight: (x, z) => ocean.heightAt(x, z) + 12,
          }).position,
        );
        const before = p.health;
        enc.update(dt, i * dt, p, pos, f, {
          blockedBetween: scenario === "covered" ? () => true : blocked,
          movementStart: old,
        });
        if (p.health < before)
          hits.push({
            t: i * dt,
            amount: before - p.health,
            phase: e.state.phase,
            cycle: e.state.attackCount,
            phaseHit: e.phaseHit,
          });
        pos.copy(
          resolveMotion(pos, pos, {
            ...opts,
            colliders: enc.bodyColliders(pos, p.length),
            floorHeight: (x, z) => ocean.heightAt(x, z) + 12,
          }).position,
        );
        if (phases.at(-1) !== e.state.phase) phases.push(e.state.phase);
        if (e.state.attackCount >= 2 && e.state.phase === "recover") break;
        if (p.dead) break;
      }
      results.push({ scenario, fps, health: p.health, hits, phases });
      if (scenario === "stand") {
        const chargeHits = hits.filter((h) => h.phase === "attack");
        assert.equal(chargeHits.length, 1);
        assert.equal(chargeHits[0].amount, 42);
        assert.equal(chargeHits[0].phaseHit, true);
        assert.equal(chargeHits[0].cycle, 1);
        assert.equal(phases.filter((s) => s === "attack").length, 2);
        assert.equal(phases.filter((s) => s === "recover").length, 2);
      } else {
        assert.deepEqual(hits, []);
        assert.equal(p.health, 100);
      }
    }
});
