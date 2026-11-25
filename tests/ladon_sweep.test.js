import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createLadonSweepTracker, stepLadonSweep } from "../src/ladon_sweep.js";
import { createCreature } from "../src/creatures.js";
import { LADON_LORD_V1 } from "./fixtures/ladon_lord_v1.js";
import { characterMovement } from "../src/character_rules.js";
import { stepSteering } from "../src/steering_rules.js";
import { updateLordBody } from "../src/lord_body.js";
import {
  bodyRadius,
  castBodySegment,
  resolveMotion,
} from "../src/collision.js";

function fixture() {
  const root = new T.Group();
  const anchors = [new T.Object3D(), new T.Object3D()];
  anchors.forEach((a, i) => {
    root.add(a);
    a.position.set(i * 10, 0, -10);
    a.userData.radius = 1;
  });
  return { root, anchors, tracker: createLadonSweepTracker() };
}
test("sweep follows the moving visible tail and catches relative motion between frames", () => {
  const f = fixture(),
    p = new T.Vector3(5, 0, 0);
  stepLadonSweep(f.tracker, f.anchors, p, p);
  f.anchors.forEach((a) => (a.position.z = 10));
  assert.equal(
    stepLadonSweep(f.tracker, f.anchors, p, p, { active: true, radius: 1 }),
    true,
  );
});
test("changing depth and physical cover avoid the real swept volume", () => {
  for (const cover of [false, true]) {
    const f = fixture(),
      p = new T.Vector3(5, cover ? 0 : 6, 0);
    stepLadonSweep(f.tracker, f.anchors, p, p);
    f.anchors.forEach((a) => (a.position.z = 10));
    assert.equal(
      stepLadonSweep(f.tracker, f.anchors, p, p, {
        active: true,
        radius: 1,
        blocked: () => cover,
      }),
      false,
    );
  }
});
test("inactive or newly entered attacks never replay an earlier sweep", () => {
  const f = fixture(),
    p = new T.Vector3(5, 0, 0);
  stepLadonSweep(f.tracker, f.anchors, p, p, { active: true });
  f.anchors.forEach((a) => (a.position.z = 10));
  assert.equal(
    stepLadonSweep(f.tracker, f.anchors, p, p, { active: false, radius: 1 }),
    false,
  );
  assert.equal(
    stepLadonSweep(f.tracker, f.anchors, p, p, { active: true, radius: 1 }),
    false,
  );
});

function actualSweepFixture() {
  const species = LADON_LORD_V1;
  const root = createCreature("ladon", species.length, 17);
  const target = new T.Vector3(0, 0, 32);
  const heading = target
    .clone()
    .normalize()
    .applyAxisAngle(new T.Vector3(0, 1, 0), species.tailSweepYaw);
  root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), heading);
  return { root, species, target, tracker: createLadonSweepTracker() };
}

test("Archived v1 Ladon's attack admission leaves complete adult bodies outside its real posed skin volumes", () => {
  const species = LADON_LORD_V1;
  const root = createCreature("ladon", species.length, 17);
  const front = new T.Vector3(0, 0, -1);
  const playerForward = front.clone().negate();
  const start = front.clone().multiplyScalar(120);
  try {
    for (const length of [25, 30])
      for (const pose of [
        { phase: "hunt", time: 0, progress: 0, turn: 0 },
        { phase: "hunt", time: 1.3, progress: 0.4, turn: 0 },
        // Match lockAttack's authored warning turn; keep the tail hit/dodge
        // test below as the independent proof that actual damage stays local.
        {
          phase: "windup",
          time: 3,
          progress: 0.5,
          turn: species.tailSweepYaw,
        },
      ]) {
        root.quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), pose.turn);
        root.userData.setLadonCombat({
          phase: pose.phase,
          ability: "tail_sweep",
          progress: pose.progress,
        });
        root.userData.animate(pose.time, 1.2);
        root.updateMatrixWorld(true);
        const colliders = updateLordBody(root);
        assert.ok(colliders.length >= 10, "Use the real HF body sections");
        const dimensions = {
          colliders,
          radius: bodyRadius(length),
          length,
          forward: playerForward,
        };
        const atAdmission = front.clone().multiplyScalar(species.engageRange);
        const firstContact = castBodySegment(
          start,
          new T.Vector3(),
          dimensions,
        );
        assert.ok(
          firstContact,
          "The real head/tail must physically stop entry",
        );
        const contactDistance = 120 * (1 - firstContact.time);
        assert.ok(
          species.engageRange > contactDistance + 1,
          `${length}m ${pose.phase}: admission ${species.engageRange}m lies inside or on actual body contact at ${contactDistance.toFixed(3)}m`,
        );
        assert.equal(
          castBodySegment(start, atAdmission, dimensions),
          null,
          "A continuous head-on approach can reach the attack admission without pushing through the lord",
        );
        const resolved = resolveMotion(start, atAdmission, dimensions);
        assert.ok(
          new T.Vector3(
            resolved.position.x,
            resolved.position.y,
            resolved.position.z,
          ).distanceTo(atAdmission) < 1e-6,
          "The actual movement solver must accept the complete body at admission",
        );
      }
  } finally {
    root.userData.disposeLocalMotion?.();
  }
});

/** 仅隔离锁定后的真实尾部扫掠；不替代领主 AI、地形与原生操作验收。 */
function actualTimedSweep(fixture, dodge = false) {
  const { root, species, target, tracker } = fixture;
  const { windup, attack } = species.abilityTimings.tail_sweep;
  const dt = 1 / 60;
  const movement = characterMovement("mechanical_shark");
  const previous = target.clone();
  const forward = new T.Vector3();
  let orientation = { yaw: 0, pitch: 0 };
  const hits = [];
  for (let frame = 0; frame <= Math.ceil((windup + attack) / dt); frame++) {
    const time = frame * dt;
    const phase = time < windup ? "windup" : "attack";
    const progress =
      phase === "windup" ? time / windup : (time - windup) / attack;
    previous.copy(target);
    if (dodge && time >= windup / 2) {
      orientation = stepSteering(orientation, { x: 0, y: 1 }, movement, dt);
      forward
        .set(0, 0, -1)
        .applyEuler(new T.Euler(orientation.pitch, orientation.yaw, 0, "YXZ"));
      target.addScaledVector(forward, movement.cruiseSpeed * dt);
    }
    assert.ok(target.distanceTo(previous) <= movement.cruiseSpeed * dt + 1e-8);
    root.userData.setLadonCombat({ phase, ability: "tail_sweep", progress });
    root.userData.animate(time, phase === "attack" ? 2.5 : 1.2);
    root.updateWorldMatrix(true, true);
    if (
      stepLadonSweep(
        tracker,
        root.userData.tailSweepAnchors,
        previous,
        target,
        {
          active: phase === "attack",
          radius: 30 * 0.16,
          scale: species.length,
        },
      )
    )
      hits.push({ time, phase });
  }
  return hits;
}

test("the actual locked HF tail can hit a 30m target and a continuous ordinary-speed vertical dodge avoids it", () => {
  const standing = actualSweepFixture();
  const dodging = actualSweepFixture();
  try {
    const standMesh = standing.root.userData.hfRig.mesh;
    const dodgeMesh = dodging.root.userData.hfRig.mesh;
    assert.equal(standMesh.geometry, dodgeMesh.geometry);
    assert.notEqual(standMesh.skeleton, dodgeMesh.skeleton);
    const untouched = dodgeMesh.skeleton.bones.map((b) =>
      b.quaternion.toArray(),
    );
    const hits = actualTimedSweep(standing);
    assert.ok(
      hits.length > 0,
      "Warned real skin must threaten its locked target",
    );
    assert.ok(hits.every((hit) => hit.phase === "attack"));
    assert.deepEqual(
      dodgeMesh.skeleton.bones.map((b) => b.quaternion.toArray()),
      untouched,
      "Animating an attacking instance must not move another instance's tail",
    );
    assert.deepEqual(actualTimedSweep(dodging, true), []);
    assert.ok(dodging.target.y > 20, "The dodge actually changes depth");
    assert.deepEqual(standing.target.toArray(), [0, 0, 32]);
  } finally {
    standing.root.userData.disposeLocalMotion?.();
    dodging.root.userData.disposeLocalMotion?.();
  }
});
