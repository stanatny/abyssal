import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  beginTailFollow,
  steerTailFollow,
  tailFollowReady,
} from "../src/hunter_tail_follow.js";
import { createHunterState, tickHunter } from "../src/hunter_rules.js";
import { predatorBiteContact } from "../src/predator_combat.js";

function scenario(length = 28) {
  const hunter = createHunterState({ kind: "ichthyotitan", speed: 15 });
  beginTailFollow(hunter, 20);
  const context = {
    predator: new THREE.Vector3(0, 0, length * 0.36 + 6),
    predatorLength: length,
    player: new THREE.Vector3(),
    playerLength: 3,
    forward: new THREE.Vector3(0, 0, -1),
    velocity: new THREE.Vector3(0, 0, -5),
    cooldown: 2.2,
    maxSpeed: 20,
  };
  const velocity = context.forward.clone(),
    direction = new THREE.Vector3();
  let elapsed = 0;
  return {
    hunter,
    context,
    step(dt = 1 / 60) {
      const previousPredator = context.predator.clone(),
        previousPlayer = context.player.clone();
      context.player.addScaledVector(context.velocity, dt);
      context.cooldown = Math.max(0, context.cooldown - dt);
      const speed = steerTailFollow(hunter.tailFollow, dt, context, direction);
      velocity.lerp(direction, Math.min(1, dt * 5));
      context.predator.addScaledVector(velocity, speed * dt);
      elapsed += dt;
      return {
        elapsed,
        speed,
        rear: context.predator.clone().sub(context.player).dot(context.forward),
        contact: predatorBiteContact({
          ...context,
          previousPredator,
          previousPlayer,
          predatorForward: velocity.clone().normalize(),
          playerForward: context.forward,
          edible: false,
        }),
      };
    },
  };
}

test("successful bites wait behind the player and the original mouth contact can bite again after cooldown", () => {
  for (const length of [8, 16, 28, 60]) {
    const s = scenario(length),
      bites = [];
    for (let i = 0; i < 600; i++) {
      const frame = s.step();
      assert.ok(frame.rear < 0, `overtake: ${length}`);
      assert.ok(frame.speed <= s.context.maxSpeed);
      if (s.context.cooldown === 0 && frame.contact) {
        bites.push(frame.elapsed);
        s.context.cooldown = 2.2;
      }
    }
    assert.ok(bites.length >= 3, `${length}: ${bites}`);
    for (let i = 1; i < bites.length; i++)
      assert.ok(bites[i] - bites[i - 1] >= 2.2 - 1e-6);
  }
});

test("arrival holds a stationary player's rear without orbiting, then sprint speed can open a gap", () => {
  const s = scenario();
  s.context.velocity.set(0, 0, 0);
  for (let i = 0; i < 360; i++) assert.ok(s.step().rear < 0);
  const settled = s.context.predator.clone();
  for (let i = 0; i < 120; i++) s.step();
  assert.ok(s.context.predator.distanceTo(settled) < 0.01);
  const initial = s.context.predator.distanceTo(s.context.player);
  s.context.velocity.set(0, 0, -38);
  for (let i = 0; i < 180; i++) s.step();
  assert.ok(s.context.predator.distanceTo(s.context.player) > initial + 40);
});

test("curved player travel is followed with bounded motion, not attached or teleported", () => {
  const s = scenario();
  for (let i = 0; i < 600; i++) {
    const angle = (i / 60) * 0.25;
    s.context.forward.set(Math.sin(angle), 0, -Math.cos(angle));
    s.context.velocity.copy(s.context.forward).multiplyScalar(8);
    const before = s.context.predator.clone();
    const frame = s.step();
    assert.ok(frame.rear < 0);
    assert.ok(s.context.predator.distanceTo(before) <= 20 / 60 + 1e-9);
  }
});

test("a landed burst brakes, a new special retains windup/locked attack, and new lifecycles have no following state", () => {
  const h = createHunterState({ kind: "sperm_whale", speed: 10 }, 42);
  assert.equal(tailFollowReady(h), false);
  h.cooldown = 0;
  tickHunter(h, h.ability.windupDuration + 0.01, {
    hunting: true,
    distance: 10,
  });
  assert.equal(h.phase, "active");
  beginTailFollow(h, 20);
  assert.equal(tailFollowReady(h), true);
  tickHunter(h, h.ability.activeDuration + h.ability.recoverDuration, {
    hunting: true,
    distance: 10,
  });
  h.cooldown = 0;
  tickHunter(h, 0.01, { hunting: true, distance: 10 });
  assert.equal(tailFollowReady(h), false);
  tickHunter(h, h.ability.windupDuration, { hunting: true, distance: 10 });
  assert.equal(h.phase, "active");
  assert.equal(tailFollowReady(h), false);
  beginTailFollow(h, 20);
  assert.equal(tailFollowReady(h), true);
  assert.equal(createHunterState(h.species, 42).tailFollow, undefined);
  const snapshot = JSON.stringify(h);
  tickHunter(h, 0, { hunting: true });
  // 暂停不推进追尾速度或技能时钟；瞬态 justTriggered 本身不表示时间流逝。
  assert.deepEqual(h.tailFollow, JSON.parse(snapshot).tailFollow);
  assert.equal(h.timer, JSON.parse(snapshot).timer);
});
