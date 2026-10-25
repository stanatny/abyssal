import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { ALL_SPECIES } from "../src/region_ecology.js";
import {
  createHunterState,
  getHunterAbility,
  tickHunter,
} from "../src/hunter_rules.js";
import {
  aimPredatorFlank,
  predatorBiteContact,
} from "../src/predator_combat.js";
import { beginTailFollow, steerTailFollow } from "../src/hunter_tail_follow.js";

const forward = new THREE.Vector3(0, 0, -1);
const roster = [
  ...new Map(
    ALL_SPECIES.filter((s) =>
      ["burst", "heavy_bite"].includes(getHunterAbility(s)?.type),
    ).map((s) => [s.kind, s]),
  ).values(),
];

// 保留真实冷却、惯性转向、嘴部尺寸与玩家巡游；只隔离地形/渲染以定位追击意图。
function pursue(species, playerLength, flank = 1, dodge = false) {
  const player = new THREE.Vector3(),
    predator = new THREE.Vector3();
  const ability = getHunterAbility(species);
  const cruise =
    species.chaseSpeed || Math.min(25, Math.max(15, species.speed || 16));
  const reach =
    species.length * 0.36 +
    playerLength * 0.25 +
    Math.max(0.5, playerLength * 0.13) +
    Math.max(0.35, species.length * 0.07);
  predator.z =
    reach +
    Math.max(
      0.5,
      (ability.activeSpeed - 12) * ability.activeDuration * 0.45 +
        (cruise * ability.windupSpeedMultiplier - 12) * ability.windupDuration,
    );
  const velocity = forward.clone(),
    direction = new THREE.Vector3(),
    orientation = new THREE.Quaternion(),
    desired = new THREE.Quaternion();
  const h = createHunterState(species, 17);
  h.cooldown = 0;
  const dt = 1 / 60,
    hits = [],
    samples = [];
  let heading = null,
    cooldown = 0;
  for (let i = 0; i < 200; i++) {
    const previousPlayer = player.clone(),
      previousPredator = predator.clone();
    const previousPredatorForward = forward
      .clone()
      .applyQuaternion(orientation);
    const phase = h.phase,
      maxSpeed =
        species.chaseSpeed || Math.min(25, Math.max(15, species.speed || 16));
    const fleeing = dodge && h.phase === "active";
    player.addScaledVector(forward, 12 * dt);
    if (fleeing) player.x += 32 * dt;
    direction.copy(player);
    aimPredatorFlank(direction, forward, species.length, playerLength, flank);
    direction.sub(predator).normalize();
    tickHunter(h, dt, { hunting: true, distance: predator.distanceTo(player) });
    if (h.phase === "windup" && phase !== "windup") heading = direction.clone();
    if (h.type === "burst" && h.phase === "active" && heading) {
      heading.lerp(direction, dt * 0.65).normalize();
      direction.copy(heading);
    }
    let speed = maxSpeed * h.speedMultiplier;
    if (h.tailFollow)
      speed = steerTailFollow(
        h.tailFollow,
        dt,
        {
          predator,
          predatorLength: species.length,
          player,
          playerLength,
          forward,
          velocity: forward.clone().multiplyScalar(12),
          cooldown,
          maxSpeed: speed,
        },
        direction,
      );
    velocity.lerp(direction, dt * (h.tailFollow ? 5 : 2));
    predator.addScaledVector(velocity, speed * dt);
    orientation.slerp(
      desired.setFromUnitVectors(forward, velocity.clone().normalize()),
      dt * 3,
    );
    cooldown = Math.max(0, cooldown - dt);
    const facing = forward.clone().applyQuaternion(orientation);
    if (
      cooldown === 0 &&
      predatorBiteContact({
        previousPredator,
        predator,
        previousPredatorForward,
        predatorForward: facing,
        predatorLength: species.length,
        previousPlayer,
        player,
        playerForward: forward,
        playerLength,
        edible: true,
      })
    ) {
      hits.push({ time: i * dt, phase: h.phase });
      cooldown = 2.2;
      beginTailFollow(h, speed * velocity.length());
      player.addScaledVector(direction, 5);
    }
    samples.push({
      rear: predator.clone().sub(player).dot(forward),
      follow: !!h.tailFollow,
    });
  }
  return { hits, samples };
}

test("long-range burst profiles can catch an un-dodging near-sized yellow target with the original mouth size", () => {
  assert.equal(roster.length, 17);
  for (const s of roster)
    for (const side of [-1, 1]) {
      // 按现有攻击距离和追击速度布置可达起点；短程技能另用扫掠契约核查。
      if (
        getHunterAbility(s).triggerDistance < 45 ||
        getHunterAbility(s).activeSpeed < 34
      )
        continue;
      const r = pursue(s, s.length + 2, side);
      assert.ok(
        r.hits.some((h) => h.phase === "active"),
        `${s.kind}/${side}: ${JSON.stringify(r.hits)}`,
      );
      assert.ok(
        r.samples.filter((s) => s.follow).every((s) => s.rear < 0),
        `${s.kind}: post-hit overtake`,
      );
    }
});

test("Ichthyotitan at 30 m retains a lateral sprint dodge instead of perfect homing", () => {
  const s = roster.find((s) => s.kind === "ichthyotitan");
  for (const side of [-1, 1])
    assert.equal(pursue(s, 30, side, true).hits.length, 0);
});

test("high-speed relative mouth sweeps validate facing at contact, not after crossing the player", () => {
  for (const s of roster) {
    const p = new THREE.Vector3(),
      length = Math.max(3, s.length - 1);
    const args = {
      previousPredator: new THREE.Vector3(0, 0, s.length + 12),
      predator: new THREE.Vector3(0, 0, -s.length - 12),
      predatorForward: forward,
      predatorLength: s.length,
      previousPlayer: p,
      player: p,
      playerForward: forward,
      playerLength: length,
      edible: false,
    };
    assert.ok(predatorBiteContact(args), s.kind);
    const away = forward.clone().negate();
    const sideways = new THREE.Vector3(1, 0, 0);
    assert.equal(
      predatorBiteContact({ ...args, predatorForward: sideways }),
      false,
      `${s.kind}: rear body is not a mouth`,
    );
    assert.equal(
      predatorBiteContact({ ...args, edible: true, playerForward: away }),
      false,
      `${s.kind}: player capture has frontal priority`,
    );
    const far = p.clone().setX(s.length + length);
    assert.equal(
      predatorBiteContact({ ...args, previousPlayer: far, player: far }),
      false,
      `${s.kind}: lateral miss`,
    );
  }
});

test("turning mouth sweeps use the previous posed heading without moving last frame's mouth retroactively", () => {
  const right = new THREE.Vector3(1, 0, 0),
    predator = new THREE.Vector3();
  const player = new THREE.Vector3(0, 0, -7.2);
  const args = {
    previousPredator: predator,
    predator,
    predatorForward: right,
    previousPredatorForward: forward,
    predatorLength: 20,
    previousPlayer: player,
    player,
    playerForward: forward,
    playerLength: 3,
    edible: false,
  };
  assert.ok(predatorBiteContact(args));
  assert.equal(
    predatorBiteContact({ ...args, previousPredatorForward: right }),
    false,
  );
});
