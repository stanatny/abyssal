import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BOSS_SPECIES, createBossState } from "../src/boss_rules.js";
import { createPlayer } from "../src/simulation.js";
import { createEncounters } from "../src/encounters.js";
import {
  LORD_ATTACK_URLS,
  createLordAttackBank,
  lordAttackSound,
  lordAttackBeats,
} from "../src/lord_attack_audio.js";
const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (o, k) => o[k] ?? noop },
);
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
};

test("every declared lord ability resolves to an attack sound; important contrasts stay distinct", () => {
  const abilities = BOSS_SPECIES.flatMap((s) =>
    (s.abilityCycle ?? [s.ability]).map((a) => [s.kind, a]),
  );
  assert.equal(abilities.length, 22);
  for (const [kind, ability] of abilities)
    assert.ok(
      LORD_ATTACK_URLS[lordAttackSound(kind, ability)],
      `${kind}/${ability}`,
    );
  assert.equal(
    new Set(
      ["hydra", "vermilion_bird", "thunderbarbel"].map((k) =>
        lordAttackSound(k, "volley"),
      ),
    ).size,
    3,
  );
  assert.notEqual(
    lordAttackSound("white_tiger", "roar"),
    lordAttackSound("white_tiger", "charge"),
  );
  assert.equal(lordAttackSound("sword_sage", "swords"), "sword");
  assert.equal(lordAttackSound("brine_regent", "pulse"), "crystal");
  assert.equal(lordAttackSound("unknown", "unknown"), null);
});
test("read-only wave beats follow shared timings, never windup or stale catch-up", () => {
  const s = { phase: "attack", ability: "lash", timer: 0, species: {} };
  assert.deepEqual(lordAttackBeats(s, -1), [0]);
  assert.deepEqual(lordAttackBeats({ ...s, timer: 0.51 }, 0.49), [1]);
  assert.deepEqual(lordAttackBeats({ ...s, timer: 1.01 }, 0.51), [2]);
  assert.deepEqual(lordAttackBeats({ ...s, timer: 1.3 }, 0), []);
  assert.deepEqual(lordAttackBeats({ ...s, phase: "windup" }, -1), []);
  for (const ability of ["volley", "swords"])
    assert.deepEqual(lordAttackBeats({ ...s, ability }, -1), []);
  const turtle = BOSS_SPECIES.find((s) => s.kind === "black_tortoise");
  assert.deepEqual(
    lordAttackBeats(
      {
        phase: "attack",
        ability: "pulse",
        timer: turtle.pulseWaveInterval,
        species: turtle,
      },
      0.1,
    ),
    [1],
  );
});
for (const species of BOSS_SPECIES)
  for (const ability of species.abilityCycle ?? [species.ability]) {
    test(`${species.kind}/${ability}: real encounter releases distinct cues after warning and cleans interrupted voices`, () => {
      const events = [],
        stops = [];
      const audio = {
        bitten: noop,
        biteLord: noop,
        bossAttack: (k, a) => events.push({ type: "warning", k, a }),
        bossAbility: (k, a, o) =>
          events.push({ type: "release", k, a, index: o.index }),
        stopBossAbility: (o) => stops.push(o),
      };
      const encounters = createEncounters(new THREE.Scene(), {
        seabedHeight: () => -900,
        audio,
        notify: noop,
      });
      encounters.reset([species.kind]);
      const e = encounters.bosses.find((e) => e.enabled);
      e.state = createBossState(species);
      e.state.phase = "windup";
      e.previousPhase = "hunt";
      e.state.ability = ability;
      e.state.phaseDuration =
        species.abilityTimings?.[ability]?.windup ?? species.windupDuration;
      e.state.locked = false;
      e.requiresGuardians = [];
      e.radius = 500;
      e.maxCenterY = Infinity;
      e.home.set(0, -400, 0);
      e.mesh.position.copy(e.home);
      e.heading.set(0, 0, -1);
      e.disorientedUntil = 0;
      const p = createPlayer();
      p.invulnerable = 999;
      const pos = new THREE.Vector3(0, -400, -85),
        forward = new THREE.Vector3(0, 0, -1);
      const step = (t) =>
        encounters.update(1 / 60, t, p, pos, forward, {
          blockedBetween: () => false,
        });
      step(0);
      assert.equal(events.filter((v) => v.type === "release").length, 0);
      assert.equal(events.filter((v) => v.type === "warning").length, 1);
      let t = 0;
      for (let i = 0; i < 700 && e.state.phase !== "recover"; i++) {
        t += 1 / 60;
        step(t);
      }
      assert.equal(e.state.phase, "recover");
      const releases = events.filter((v) => v.type === "release");
      const expected = ["volley", "swords"].includes(ability)
        ? (species.volleyCount ?? 3)
        : ability === "lash" || ability === "fault"
          ? 3
          : ability === "pulse"
            ? (species.pulseWaveCount ?? 1)
            : 1;
      assert.equal(releases.length, expected, JSON.stringify(events));
      assert.ok(releases.every((v) => v.k === species.kind && v.a === ability));
      assert.equal(new Set(releases.map((v) => v.index)).size, expected);
      const n = stops.length;
      encounters.reset([species.kind]);
      assert.ok(stops.length > n);
      encounters.dispose();
    });
  }

test("attack prefetch keeps at most two full bodies in flight and reuses completed bytes", async () => {
  let active = 0,
    peak = 0,
    calls = 0;
  const bank = createLordAttackBank(async (url, options) => {
    calls++;
    active++;
    peak = Math.max(peak, active);
    assert.equal(options.signal.aborted, false);
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        active--;
        return new Uint8Array([1, 2, 3]).buffer;
      },
    };
  });
  const bytes = await bank.preload();
  assert.equal(bytes.size, 14);
  assert.equal(calls, 14);
  assert.equal(peak, 2);
  assert.equal(active, 0);
  assert.equal(await bank.preload(), bytes);
  assert.equal(calls, 14);
});
