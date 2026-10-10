import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPenglaiWard, PENGLAI_WARD } from "../src/penglai_ward.js";
import { PENGLAI_GUARDIANS } from "../src/penglai_config.js";
import { PENGLAI_LORDS } from "../src/penglai_lords.js";
import {
  castSegment,
  resolveMotion,
  isPositionBlocked,
  bodyRadius,
} from "../src/collision.js";
import {
  createBossState,
  tickBoss,
  hitBossWithTorpedo,
} from "../src/boss_rules.js";
import { createPlayer } from "../src/simulation.js";

test("Hollow ward stops swept entry and exit from every direction without filling the room", () => {
  const c = {
    type: "sphere_shell",
    x: 0,
    y: 0,
    z: 0,
    radius: 185,
    thickness: 2,
  };
  assert.equal(
    isPositionBlocked({ x: 0, y: 0, z: 0 }, { colliders: [c], radius: 5 }),
    false,
  );
  assert.equal(
    castSegment({ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 }, [c]),
    null,
  );
  for (const length of [3, 15, 30])
    for (const axis of ["x", "y", "z"])
      for (const sign of [-1, 1]) {
        const a = { x: 0, y: 0, z: 0 },
          b = { ...a };
        a[axis] = sign * 230;
        b[axis] = 0;
        const normal = { x: 0, y: 0, z: 0 };
        normal[axis] = -sign;
        const r = resolveMotion(a, b, {
          colliders: [c],
          radius: bodyRadius(length),
          length,
          forward: normal,
        });
        assert.ok(r.blocked && !r.stuck);
        assert.ok(Math.abs(r.position[axis]) > 185);
        const exit = resolveMotion(b, a, {
          colliders: [c],
          radius: bodyRadius(length),
          length,
          forward: normal,
        });
        assert.ok(exit.blocked && !exit.stuck);
        assert.ok(Math.abs(exit.position[axis]) < 185);
        assert.ok(castSegment(a, b, [c]));
      }
});
test("Four distinct guardian defeats dim their own seals; only the fourth opens collision, reset restores it", () => {
  const parent = new THREE.Group(),
    w = createPenglaiWard(parent),
    bosses = PENGLAI_GUARDIANS.map((g) => ({
      id: g.id,
      enabled: true,
      state: { defeated: false },
    }));
  const p = createPlayer("orca", 15),
    at = new THREE.Vector3(
      PENGLAI_WARD.x,
      PENGLAI_WARD.y,
      PENGLAI_WARD.z + 210,
    );
  for (let i = 0; i < 4; i++) {
    bosses[i].state.defeated = true;
    w.updateProgress(p, at, bosses, () => {});
    assert.equal(w.defeated, i + 1);
    assert.equal(w.sectors[i].uniforms.strength.value, 0.15);
    assert.equal(w.barriers.length, i === 3 ? 0 : 1);
  }
  w.updateProgress(p, at, bosses, () => {});
  assert.equal(w.defeated, 4);
  w.reset();
  assert.equal(w.barriers.length, 1);
  assert.equal(w.defeated, 0);
  w.dispose();
  w.dispose();
  assert.equal(parent.children.length, 0);
});
test("Sword Sage alternates telegraphed swords and short dash, retaining recovery and the 25 m damage gate", () => {
  const s = PENGLAI_LORDS.find((s) => s.kind === "sword_sage"),
    boss = createBossState(s),
    context = { inTerritory: true, distance: 40, lineOfSight: true };
  tickBoss(boss, 0.8, context);
  assert.equal(boss.phase, "windup");
  assert.equal(boss.ability, "swords");
  assert.equal(boss.phaseDuration, 1.9);
  tickBoss(boss, 1.9, context);
  assert.equal(boss.phase, "attack");
  tickBoss(boss, 1.6, context);
  assert.equal(boss.phase, "recover");
  assert.equal(boss.phaseDuration, 2.2);
  tickBoss(boss, 3, context);
  assert.equal(boss.phase, "windup");
  assert.equal(boss.ability, "charge");
  tickBoss(boss, 1.9, context);
  assert.equal(boss.phaseDuration, 0.9);
  tickBoss(boss, 0.9, context);
  assert.equal(boss.phase, "recover");
  assert.equal(boss.phaseDuration, 2.6);
  assert.ok(s.chargeSpeed * 0.9 < 60);
  assert.equal(
    hitBossWithTorpedo(createPlayer("mechanical_shark", 24), boss).hit,
    false,
  );
});

test("Four-Symbol strengths are distinct and shell guarding preserves three exposed hits without food farming", () => {
  const kinds = Object.fromEntries(PENGLAI_LORDS.map((s) => [s.kind, s]));
  const guardians = PENGLAI_LORDS.filter((s) => s.kind !== "sword_sage");
  assert.ok(
    guardians
      .filter((s) => s.kind !== "white_tiger")
      .every((s) => s.speed < kinds.white_tiger.speed),
  );
  assert.ok(
    guardians
      .filter((s) => s.kind !== "vermilion_bird")
      .every((s) => s.damage < kinds.vermilion_bird.damage),
  );
  const b = createBossState(kinds.black_tortoise),
    p = createPlayer("mechanical_shark", 25);
  p.hunger = 20;
  for (const phase of ["windup", "attack"]) {
    b.phase = phase;
    assert.equal(hitBossWithTorpedo(p, b).hit, false);
    assert.equal(b.validatedHits, 0);
    assert.equal(p.hunger, 20);
  }
  b.phase = "recover";
  assert.equal(hitBossWithTorpedo(p, b).hit, true);
  assert.equal(b.validatedHits, 1);
  assert.equal(p.hunger, 28);
  assert.equal(hitBossWithTorpedo(p, b).hit, false);
  assert.equal(b.validatedHits, 1);
});
