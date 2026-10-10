import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAreaBlast } from "../src/area_blast.js";
import { createMechanicalTorpedoes } from "../src/mechanical_torpedoes.js";
import { createZombieMinion } from "../src/zombie_minion.js";
import { createPlayer, consumePrey } from "../src/simulation.js";
import { getRegionalRare } from "../src/regional_rare.js";
import { castSegment } from "../src/collision.js";
import {
  BOSS_SPECIES,
  createBossState,
  hitBoss,
  hitBossWithCorpseBlast,
  hitBossWithTorpedo,
  updateBossContact,
} from "../src/boss_rules.js";
import { finishNextBossAttack } from "./helpers/boss_cycle.js";
import { hitOrdinaryWithTorpedo } from "../src/mechanical_shark_rules.js";
import { getCharacter } from "../src/character_rules.js";
import { t } from "../src/i18n.js";

const origin = new THREE.Vector3(0, -50, 0),
  forward = new THREE.Vector3(0, 0, -1);
function prey(length = 8, x = 5, species = {}) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial(),
  );
  mesh.position.set(x, -50, 0);
  return {
    mesh,
    species: { kind: "tuna", length, nutrition: 30, growth: 2, ...species },
    hiddenFor: 0,
    velocity: new THREE.Vector3(),
  };
}
function owner(length = 20) {
  const p = createPlayer("zombie_shark", length);
  p.health = 40;
  p.hunger = p.stamina = 20;
  return p;
}

test("corpse blast uses current local positions, owner size and exactly ordinary owner nutrition", () => {
  const p = owner(),
    reference = structuredClone(p),
    close = prey(18),
    far = prey(3, 40),
    edge = prey(2, 14.26),
    outside = prey(2, 14.27),
    moving = prey(3, 5);
  moving.mesh.position.x = 100;
  assert.equal(consumePrey(reference, close.species), true);
  assert.equal(consumePrey(reference, edge.species), true);
  const entries = [close, far, edge, outside, moving];
  const blast = createAreaBlast({
    entities: () => entries,
    creditOversized: false,
  });
  const r = blast(origin, p);
  assert.deepEqual(p, reference);
  assert.equal(p.health, 40);
  assert.equal(r.killed, 2);
  assert.equal(r.defeated, 2);
  assert.equal(close.mesh.visible, false);
  assert.ok(close.hiddenFor > 0);
  assert.equal(blast(origin, p).killed, 0);
  for (const e of [far, outside, moving]) {
    assert.equal(e.torpedoHits, undefined);
    assert.equal(e.hiddenFor, 0);
  }
});

test("equal/larger prey share two-hit torpedo durability but corpse kills grant no food", () => {
  for (const length of [20, 24]) {
    const p = owner(),
      e = prey(length),
      before = structuredClone(p);
    const blast = createAreaBlast({
      entities: () => [e],
      creditOversized: false,
    });
    assert.equal(blast(origin, p).hits, 1);
    assert.equal(e.torpedoHits, 1);
    assert.deepEqual(p, before);
    const r = blast(origin, p);
    assert.equal(r.defeated, 1);
    assert.equal(r.killed, 0);
    assert.ok(e.hiddenFor > 0);
    assert.deepEqual(p, before);
    assert.equal(blast(origin, p).defeated, 0);
  }
  const p = owner(),
    e = prey(24);
  assert.equal(hitOrdinaryWithTorpedo(e, p), false);
  assert.equal(
    createAreaBlast({ entities: () => [e], creditOversized: false })(origin, p)
      .defeated,
    1,
  );
  assert.equal(p.eaten, 0);
});

test("solid walls, sampled seabed and ice roof block corpse damage just like torpedo blasts", () => {
  for (const mode of ["wall", "floor", "roof"]) {
    const p = owner(),
      exposed = prey(3, -5),
      covered = prey(3, 10);
    const tube = createMechanicalTorpedoes(new THREE.Scene(), {
      castWorld: (a, b, r) =>
        mode === "wall"
          ? castSegment(
              a,
              b,
              [
                {
                  type: "box",
                  x: 5,
                  y: -50,
                  z: 0,
                  halfSize: { x: 1, y: 20, z: 20 },
                },
              ],
              r,
            )
          : null,
      heightAt: (x) => (mode === "floor" && x >= 4 && x <= 6 ? -49 : -100),
      waterHeightAt: (x) => (mode === "roof" && x >= 4 && x <= 6 ? -51 : 0),
    });
    const r = createAreaBlast({
      entities: () => [exposed, covered],
      blocked: tube.blocked,
      creditOversized: false,
    })(origin, p);
    assert.equal(r.killed, 1, mode);
    assert.equal(covered.torpedoHits, undefined, mode);
    assert.equal(covered.mesh.visible, true, mode);
    tube.dispose();
  }
});

test("regional rare grants the same once-only 150 blessing; duplicate entries and vehicles cannot fake hits", () => {
  const p = owner(),
    rare = prey(1.8, 5, getRegionalRare("hawaii")),
    vehicle = prey(3, 3, { vehicle: true }),
    lord = prey(3, 3, { tier: 3 });
  const blast = createAreaBlast({
    entities: () => [rare, rare, vehicle, lord],
    creditOversized: false,
  });
  const r = blast(origin, p);
  assert.equal(r.killed, 1);
  assert.equal(r.hits, 0);
  assert.equal(r.rare, true);
  assert.deepEqual([p.health, p.stamina, p.hunger], [150, 150, 150]);
  assert.equal(p.eaten, 1);
  rare.hiddenFor = 0;
  const before = structuredClone(p);
  assert.equal(blast(origin, p).killed, 0);
  assert.deepEqual(p, before);
  assert.equal(vehicle.torpedoHits, undefined);
  assert.equal(lord.torpedoHits, undefined);
});

test("blast size is frozen before meal growth and terminal states never attack", () => {
  const p = owner(20),
    small = prey(19, 5, { growth: 10 }),
    equal = prey(20, 6);
  const blast = createAreaBlast({
    entities: () => [small, equal],
    creditOversized: false,
  });
  assert.equal(blast(origin, p).killed, 1);
  assert.equal(equal.torpedoHits, 1);
  assert.equal(equal.hiddenFor, 0);
  for (const flag of ["dead", "won", "timedOut"]) {
    p[flag] = true;
    const before = equal.torpedoHits;
    assert.equal(blast(origin, p).hits, 0);
    assert.equal(equal.torpedoHits, before);
    p[flag] = false;
  }
});

test("corpse boss impact keeps 25 m, role, ward, cooldown and shared one-hit openings", () => {
  const species = BOSS_SPECIES[0],
    boss = createBossState(species),
    p = owner(24.99);
  assert.equal(hitBossWithCorpseBlast(p, boss).hit, false);
  p.length = 25;
  boss.locked = true;
  assert.equal(hitBossWithCorpseBlast(p, boss).hit, false);
  boss.locked = false;
  finishNextBossAttack(boss);
  assert.equal(
    hitBossWithCorpseBlast(createPlayer("orca", 25), boss).hit,
    false,
  );
  assert.equal(hitBossWithTorpedo(p, boss).hit, false);
  const r = hitBossWithCorpseBlast(p, boss);
  assert.equal(r.hit, true);
  assert.equal(boss.validatedHits, 1);
  assert.equal(p.biteCooldown, 1.2);
  assert.equal(boss.biteCooldown, 1.2);
  p.biteCooldown = boss.biteCooldown = 0;
  updateBossContact(boss, false, 0.35);
  assert.equal(
    hitBoss(p, boss, { inRange: true, isFlank: true }).reason,
    "opening_spent",
  );
  assert.equal(hitBossWithCorpseBlast(p, boss).reason, "opening_spent");
  finishNextBossAttack(boss);
  p.biteCooldown = boss.biteCooldown = 0;
  assert.equal(hitBoss(p, boss, { inRange: true, isFlank: true }).hit, true);
  p.biteCooldown = boss.biteCooldown = 0;
  assert.equal(hitBossWithCorpseBlast(p, boss).reason, "opening_spent");
});

test("Sword Sage retains five separate recovery counters, ward and final once-only settlement", () => {
  const boss = createBossState(
      BOSS_SPECIES.find((s) => s.kind === "sword_sage"),
    ),
    p = owner(25);
  assert.equal(hitBossWithCorpseBlast(p, boss).reason, "opening_closed");
  boss.locked = true;
  finishNextBossAttack(boss);
  assert.equal(hitBossWithCorpseBlast(p, boss).hit, false);
  boss.locked = false;
  boss.phase = "attack";
  assert.equal(hitBossWithCorpseBlast(p, boss).hit, false);
  boss.phase = "hunt";
  for (let i = 1; i <= 5; i++) {
    finishNextBossAttack(boss);
    p.biteCooldown = boss.biteCooldown = 0;
    const r = hitBossWithCorpseBlast(p, boss);
    assert.equal(r.damage, 70);
    assert.equal(boss.validatedHits, i);
    assert.equal(r.defeated, i === 5);
  }
  const before = structuredClone({ p, boss });
  assert.equal(hitBossWithCorpseBlast(p, boss).hit, false);
  assert.deepEqual({ p, boss }, before);
});

test("area blast raycasts actual visible lord anatomy and respects cover, not an enclosing empty box", () => {
  const p = owner(25),
    e = prey(5, 10);
  const boss = {
    mesh: e.mesh,
    enabled: true,
    state: createBossState(BOSS_SPECIES[0]),
  };
  const calls = [];
  const blast = createAreaBlast({
    bosses: () => [boss, boss],
    hitBoss: (...args) => {
      calls.push(args);
      return { hit: true };
    },
  });
  assert.equal(blast(origin, p).bossHits, 1);
  assert.ok(calls[0][2].distanceTo(origin) <= 14);
  const inner = e.mesh;
  boss.mesh = new THREE.Group();
  boss.mesh.position.set(10, -50, 0);
  inner.position.set(0, 30, 0);
  boss.mesh.add(inner);
  assert.equal(blast(origin, p).bossHits, 0);
  inner.position.set(0, 0, 0);
  inner.visible = false;
  assert.equal(blast(origin, p).bossHits, 0);
  inner.visible = true;
  assert.equal(
    createAreaBlast({
      bosses: () => [boss],
      blocked: () => true,
      hitBoss: () => {
        assert.fail("Covered boss was hit");
      },
    })(origin, p).bossHits,
    0,
  );
});

function minionHarness() {
  const p = createPlayer("zombie_shark", 20),
    blasts = [];
  const m = createZombieMinion(new THREE.Scene(), {
    blockedBetween: () => false,
    effects: { minionTransition() {}, mealMist() {} },
    onExpire(point, player) {
      blasts.push({ point: point.clone(), player });
      m.update(0.1, player, origin, forward, []);
    },
  });
  m.activate(p, origin, forward);
  return { p, m, blasts };
}

test("natural expiry attacks once at its last resolved position; expired-before-recast settles the old body once", () => {
  const { p, m, blasts } = minionHarness();
  p.elapsed = 59;
  m.update(0.1, p, origin, forward, []);
  assert.equal(blasts.length, 0);
  m.mesh.position.set(12, -55, 7);
  p.elapsed = 60;
  m.update(0.1, p, origin, forward, []);
  assert.equal(blasts.length, 1);
  assert.deepEqual(blasts[0].point.toArray(), [12, -55, 7]);
  assert.equal(blasts[0].player, p);
  m.update(0.1, p, origin, forward, []);
  assert.equal(blasts.length, 1);
  m.reset();
  const again = minionHarness();
  again.p.elapsed = 60;
  again.p.health = again.p.stamina = again.p.hunger = 100;
  assert.equal(again.m.activate(again.p, origin, forward), true);
  assert.equal(again.blasts.length, 1);
  assert.equal(again.m.forming, true);
  again.m.reset();
  assert.equal(again.blasts.length, 1);
});

test("reset, terminal, wrong character and lethal summon never produce an attack", () => {
  for (const flag of ["dead", "won", "timedOut", "characterId", "reset"]) {
    const { p, m, blasts } = minionHarness();
    p.elapsed = 60;
    if (flag === "reset") m.reset();
    else p[flag] = flag === "characterId" ? "orca" : true;
    m.update(0.1, p, origin, forward, []);
    m.reset();
    assert.equal(blasts.length, 0, flag);
  }
  const { p, m, blasts } = minionHarness();
  m.reset();
  p.health = p.stamina = p.hunger = 50;
  assert.equal(m.activate(p, origin, forward), true);
  assert.equal(p.dead, true);
  p.elapsed = 120;
  m.update(0.1, p, origin, forward, []);
  assert.equal(blasts.length, 0);
  m.reset();
});

test("Guide ability and blast feedback have complete English translations", () => {
  const zh = getCharacter("zombie_shark").passive.description,
    en = t(zh, [], "en");
  assert.match(zh, /14米/);
  assert.match(en, /within 14 m/);
  assert.equal(/[\u3400-\u9fff]/u.test(en), false);
  assert.equal(
    t("尸爆 · 吞噬{0}，击杀{1}，另命中{2}", [2, 3, 1], "en"),
    "Corpse blast · 2 meals, 3 kills, 1 other hits",
  );
  assert.equal(t(" · 爆炸伤害{0}/{1}", [1, 2], "en"), " · Blast hits 1/2");
});

test("second use pursues one nearby target, pays nothing, stops feeding and detonates once on approach", () => {
  const p = createPlayer("zombie_shark", 20),
    target = prey(22, 24),
    closerLater = prey(3, 100),
    calls = [];
  const blast = createAreaBlast({
    entities: () => [target, closerLater],
    creditOversized: false,
  });
  const m = createZombieMinion(new THREE.Scene(), {
    blockedBetween: () => false,
    detonationTargets: () => [target, closerLater],
    effects: { minionTransition() {}, mealMist() {} },
    onConsume: () => {
      assert.fail("Commanded minion fed instead of exploding");
    },
    onExpire: (point, player) => calls.push(blast(point, player)),
  });
  m.activate(p, origin, forward);
  p.elapsed = 2;
  m.update(1.3, p, origin, forward, []);
  const before = structuredClone(p);
  assert.equal(m.commandDetonation(p), true);
  assert.equal(m.commandDetonation(p), false);
  assert.deepEqual(p, before);
  assert.equal(m.snapshot().blastTarget, "tuna");
  closerLater.mesh.position.set(-8, -50, 0);
  for (let i = 0; i < 180 && m.active; i++) {
    m.beforePreyMotion();
    p.elapsed += 1 / 60;
    m.update(1 / 60, p, origin, forward, [target, closerLater]);
  }
  assert.equal(calls.length, 1);
  assert.ok(p.elapsed < 5);
  assert.equal(target.torpedoHits, 1);
  assert.equal(closerLater.hiddenFor, 0);
  assert.equal(p.eaten, 0);
  assert.equal("readyAt" in m.state, false);
  assert.equal(m.state.activeUntil, p.elapsed);
  m.update(1, p, origin, forward, []);
  assert.equal(calls.length, 1);
  m.reset();
});

test("no cooldown: one living minion blocks replacement; detonation permits immediate paid reuse of the same mesh", () => {
  const p = createPlayer("zombie_shark", 20),
    e = prey(25, 5),
    m = createZombieMinion(new THREE.Scene(), {
      blockedBetween: () => false,
      detonationTargets: () => [e],
      effects: { minionTransition() {}, mealMist() {} },
    });
  assert.equal(getCharacter("zombie_shark").active.cooldown, 0);
  p.health = p.stamina = p.hunger = 150;
  assert.equal(m.activate(p, origin, forward), true);
  const mesh = m.mesh;
  assert.equal(m.activate(p, origin, forward), false);
  assert.deepEqual([p.health, p.stamina, p.hunger], [100, 100, 100]);
  assert.equal(m.commandDetonation(p), true);
  p.elapsed = 1.3;
  m.update(1.3, p, origin, forward, []);
  p.elapsed += 0.01;
  m.update(0.01, p, origin, forward, []);
  assert.equal(m.active, false);
  assert.equal(m.activate(p, origin, forward), true);
  assert.equal(m.mesh, mesh);
  assert.equal(m.state.activeUntil, p.elapsed + 60);
  assert.deepEqual([p.health, p.stamina, p.hunger], [50, 50, 50]);
  assert.equal(m.activate(p, origin, forward), false);
  m.reset();
  p.stamina = 49.99;
  assert.equal(m.activate(p, origin, forward), false);
  assert.deepEqual([p.health, p.stamina, p.hunger], [50, 49.99, 50]);
});

test("formation queues valid second use until release; new cover or retirement cause a local blast without retargeting", () => {
  for (const mode of ["cover", "retired"]) {
    const p = createPlayer("zombie_shark", 20),
      e = prey(25, 25),
      calls = [];
    let covered = false;
    const m = createZombieMinion(new THREE.Scene(), {
      blockedBetween: () => false,
      blastBlocked: () => covered,
      detonationTargets: () => [e],
      effects: { minionTransition() {}, mealMist() {} },
      onExpire: (point) => calls.push(point.clone()),
    });
    m.activate(p, origin, forward);
    assert.equal(m.commandDetonation(p), true);
    p.elapsed = 0.6;
    m.update(0.6, p, origin, forward, []);
    assert.equal(m.forming, true);
    assert.equal(calls.length, 0);
    p.elapsed = 1.3;
    m.update(0.7, p, origin, forward, []);
    if (mode === "cover") covered = true;
    if (mode === "retired") e.hiddenFor = 20;
    const last = m.mesh.position.clone();
    p.elapsed += 1 / 60;
    m.update(1 / 60, p, origin, forward, []);
    assert.equal(calls.length, 1, mode);
    assert.deepEqual(calls[0], last, mode);
    assert.equal(m.active, false);
    assert.equal(m.commandDetonation(p), false);
    m.reset();
  }
});

test("commanded pursuit turns toward a target directly behind and follows its actual motion", () => {
  const p = createPlayer("zombie_shark", 20),
    e = prey(24, 0),
    calls = [];
  e.mesh.position.set(0, -50, 20);
  const m = createZombieMinion(new THREE.Scene(), {
    blockedBetween: () => false,
    detonationTargets: () => [e],
    effects: { minionTransition() {}, mealMist() {} },
    onExpire: (point) => calls.push(point.clone()),
  });
  m.activate(p, origin, forward);
  p.elapsed = 2;
  m.update(1.3, p, origin, forward, []);
  m.mesh.position.copy(origin);
  m.mesh.quaternion.identity();
  assert.equal(m.commandDetonation(p), true);
  for (let i = 0; i < 240 && m.active; i++) {
    m.beforePreyMotion();
    e.mesh.position.x += 0.05;
    p.elapsed += 1 / 60;
    m.update(1 / 60, p, origin, forward, []);
  }
  assert.equal(calls.length, 1);
  assert.ok(calls[0].z > 15);
  assert.ok(calls[0].distanceTo(e.mesh.position) < 6);
  assert.ok(p.elapsed < 6);
  m.reset();
});

test("empty or ineligible acquisition preserves formation, hunting, lifetime and payment; a later valid retry works", () => {
  for (const mode of ["empty", "far", "hidden", "vehicle", "covered"]) {
    const p = createPlayer("zombie_shark", 20),
      e = prey(25, 15),
      calls = [],
      rejected = [];
    let eligible = false;
    const m = createZombieMinion(new THREE.Scene(), {
      blockedBetween: () => false,
      blastBlocked: () => !eligible && mode === "covered",
      detonationTargets: () => (!eligible && mode === "empty" ? [] : [e]),
      onNoDetonationTarget: () => rejected.push(mode),
      effects: { minionTransition() {}, mealMist() {} },
      onExpire: (point) => calls.push(point.clone()),
    });
    if (mode === "far") e.mesh.position.x = 100;
    if (mode === "hidden") e.hiddenFor = 10;
    if (mode === "vehicle") e.species.vehicle = true;
    m.activate(p, origin, forward);
    const afterPayment = structuredClone(p),
      forming = m.snapshot();
    assert.equal(m.commandDetonation(p), false, mode);
    assert.deepEqual(m.snapshot(), forming, mode);
    assert.deepEqual(p, afterPayment, mode);
    p.elapsed = 2;
    m.update(1.3, p, origin, forward, []);
    const hunting = m.snapshot();
    for (let i = 0; i < 3; i++) {
      assert.equal(m.commandDetonation(p), false, mode);
      assert.deepEqual(m.snapshot(), hunting, mode);
    }
    assert.equal(m.state.activeUntil, 60);
    assert.equal(m.active, true);
    assert.equal(calls.length, 0);
    assert.equal(rejected.length, 4);
    eligible = true;
    e.hiddenFor = 0;
    e.species.vehicle = false;
    e.mesh.position.copy(m.mesh.position).add(new THREE.Vector3(5, 0, 0));
    assert.equal(m.commandDetonation(p), true, mode);
    assert.equal(m.state.activeUntil, 60);
    for (let i = 0; i < 120 && m.active; i++) {
      m.beforePreyMotion();
      p.elapsed += 1 / 60;
      m.update(1 / 60, p, origin, forward, []);
    }
    assert.equal(calls.length, 1, mode);
    assert.deepEqual([p.health, p.stamina, p.hunger], [50, 50, 50]);
    m.reset();
  }
});

test("pursuit cannot extend 60-second lifetime: expiry before contact blasts once at the last position", () => {
  const p = createPlayer("zombie_shark", 20),
    e = prey(25, 25),
    calls = [];
  const m = createZombieMinion(new THREE.Scene(), {
    blockedBetween: () => false,
    detonationTargets: () => [e],
    effects: { minionTransition() {}, mealMist() {} },
    onExpire: (point, player, reason) =>
      calls.push({ point: point.clone(), elapsed: player.elapsed, reason }),
  });
  m.activate(p, origin, forward);
  p.elapsed = 59.9;
  m.update(1.3, p, origin, forward, []);
  e.mesh.position.copy(m.mesh.position).add(new THREE.Vector3(25, 0, 0));
  assert.equal(m.commandDetonation(p), true);
  assert.equal(m.state.activeUntil, 60);
  p.elapsed = 59.95;
  m.update(0.05, p, origin, forward, []);
  assert.equal(m.active, true);
  const last = m.mesh.position.clone();
  p.elapsed = 60;
  m.update(0.05, p, origin, forward, []);
  assert.equal(m.active, false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { point: last, elapsed: 60, reason: "lifetime" });
  assert.ok(last.distanceTo(e.mesh.position) > 14);
  assert.equal(e.hiddenFor, 0);
  assert.equal(e.torpedoHits, undefined);
  m.update(0.1, p, origin, forward, []);
  assert.equal(m.commandDetonation(p), false);
  assert.equal(calls.length, 1);
  assert.deepEqual([p.health, p.stamina, p.hunger], [50, 50, 50]);
  m.reset();
});

test("a rejected empty command preserves an acquired hunting target and its normal meal settlement", () => {
  const p = createPlayer("zombie_shark", 20),
    e = prey(3, 30);
  let meals = 0;
  const m = createZombieMinion(new THREE.Scene(), {
    blockedBetween: () => false,
    detonationTargets: () => [],
    effects: { minionTransition() {}, mealMist() {}, bite() {} },
    onConsume: (entry, state, player) => {
      assert.equal(consumePrey(player, entry.species), true);
      entry.hiddenFor = 20;
      meals++;
      return true;
    },
  });
  m.activate(p, origin, forward);
  p.elapsed = 1.3;
  m.update(1.3, p, origin, forward, [e]);
  const before = m.snapshot();
  assert.equal(before.target, "tuna");
  assert.equal(m.commandDetonation(p), false);
  assert.deepEqual(m.snapshot(), before);
  for (let i = 0; i < 300 && meals === 0; i++) {
    m.beforePreyMotion();
    p.elapsed += 1 / 60;
    m.update(1 / 60, p, origin, forward, [e]);
  }
  assert.equal(meals, 1);
  assert.equal(p.eaten, 1);
  assert.equal(m.active, true);
  assert.equal(m.commanded, false);
  m.reset();
});

test("no-target and lifetime-expiry notices and Guide explanations are bilingual", () => {
  assert.equal(
    t("附近没有可追击目标 · 仆从继续捕食", [], "en"),
    "No nearby target · Companion keeps hunting",
  );
  assert.equal(
    t("仆从寿命已尽 · 就地尸爆", [], "en"),
    "Companion expired · Detonated in place",
  );
  assert.equal(
    t("寿命已尽 · 就地尸爆 · 吞噬{0}，击杀{1}，另命中{2}", [1, 2, 3], "en"),
    "Expired in place · 1 meals, 2 kills, 3 other hits",
  );
  const guide = t(getCharacter("zombie_shark").active.description, [], "en");
  assert.match(guide, /no nearby target, it stays alive and keeps hunting/);
  assert.match(guide, /Pursuit never extends its lifetime/);
  assert.ok(!/[\u3400-\u9fff]/.test(guide));
});
