import { turnSwimmingBody } from "../src/swimming_spacing.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  creaturePitchLimit,
  updateCreatureAttitude,
} from "../src/creature_attitude.js";
import { lordHeadingQuaternion } from "../src/lord_navigation.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";

const forward = new T.Vector3(0, 0, -1),
  up = new T.Vector3(0, 1, 0);
test("behind-above Hydra target no longer inverts the torso", () => {
  const direction = new T.Vector3(0.1, 0.4, 1).normalize();
  const old = new T.Quaternion().setFromUnitVectors(forward, direction);
  assert.ok(up.clone().applyQuaternion(old).y < -0.8);
  const q = new T.Quaternion(),
    limit = creaturePitchLimit({ kind: "hydra" });
  for (let i = 0; i < 600; i++) {
    updateCreatureAttitude(q, direction, 1 / 60, limit, 2);
    assert.ok(up.clone().applyQuaternion(q).y >= Math.cos(limit) - 1e-9);
  }
  assert.ok(forward.clone().applyQuaternion(q).distanceTo(direction) < 1e-5);
});
test("all regional attitude policies keep dorsal up through pole crossings and reversals", () => {
  const kinds = [
    ...new Map(
      [
        ...[
          "hawaii",
          "atlantis",
          "bermuda",
          "mariana",
          "amazon",
          "europa",
          "penglai",
          "odyssey",
        ].flatMap(getRegionSpecies),
        ...BOSS_SPECIES,
      ].map((s) => [s.kind, s]),
    ).values(),
  ];
  const d = new T.Vector3(),
    axis = new T.Vector3(),
    euler = new T.Euler(0, 0, 0, "YXZ");
  for (const species of kinds) {
    const q = new T.Quaternion(),
      limit = creaturePitchLimit(species);
    for (let i = 0; i < 720; i++) {
      const t = i / 60;
      d.set(Math.sin(t * 2.7), Math.cos(t * 3.3) * 2, Math.cos(t * 2.7));
      if (i % 120 < 5) d.set(0, i % 240 < 120 ? 1 : -1, 0);
      updateCreatureAttitude(q, d, 1 / 60, limit);
      euler.setFromQuaternion(q, "YXZ");
      assert.ok(
        axis.copy(up).applyQuaternion(q).y >= Math.cos(limit) - 1e-9,
        species.kind,
      );
      assert.ok(Math.abs(euler.z) < 1e-9, species.kind);
      assert.ok(Math.abs(q.lengthSq() - 1) < 1e-9);
    }
  }
});
test("yaw seam, vertical target, idle and pause retain continuous orientation", () => {
  const q = new T.Quaternion().setFromEuler(
    new T.Euler(0.3, Math.PI - 0.01, 0, "YXZ"),
  );
  const before = q.clone();
  const d = new T.Vector3(0.01, 0, 1).normalize();
  updateCreatureAttitude(q, d, 1 / 60, 0.65);
  assert.ok(q.angleTo(before) < 0.02);
  const yaw = new T.Euler().setFromQuaternion(q, "YXZ").y;
  for (let i = 0; i < 120; i++)
    updateCreatureAttitude(q, new T.Vector3(0, 1, 0), 1 / 60, 0.65);
  assert.ok(Math.abs(new T.Euler().setFromQuaternion(q, "YXZ").y - yaw) < 1e-9);
  const stationary = q.clone();
  updateCreatureAttitude(q, d, 0);
  assert.deepEqual(q, stationary);
  updateCreatureAttitude(q, new T.Vector3(), 1 / 60);
  assert.deepEqual(q, stationary);
  const other = new T.Quaternion();
  updateCreatureAttitude(other, d, 0.04);
  assert.deepEqual(q, stationary);
});
test("body-specific pitch limits preserve existing specialist contracts", () => {
  assert.equal(creaturePitchLimit({ groundbound: true }), 0);
  assert.equal(creaturePitchLimit({ benthic: true }), 0);
  assert.equal(
    creaturePitchLimit({ kind: "rootjaw" }, { aquaticPitchLimit: 1.05 }),
    1.05,
  );
  assert.equal(
    creaturePitchLimit({ kind: "black_tortoise" }, { aquaticPitchLimit: 0.22 }),
    0.22,
  );
  assert.equal(creaturePitchLimit({ flying: true }), 1);
  assert.equal(creaturePitchLimit({ kind: "archelon" }), 0.65);
  assert.equal(
    creaturePitchLimit({ kind: "triton_guard" }, { aquaticUpright: true }),
    0.65,
  );
  assert.equal(creaturePitchLimit({ kind: "sperm_whale" }), 1.4);
});
test("default lord navigation tests the upright target used by rendered swimming", () => {
  const d = new T.Vector3(0.1, 0.4, 1).normalize(),
    goal = lordHeadingQuaternion(new T.Quaternion(), d),
    q = new T.Quaternion();
  for (let i = 0; i < 600; i++) updateCreatureAttitude(q, d, 1 / 60, 1.4, 2);
  assert.ok(q.angleTo(goal) < 1e-6);
  assert.ok(up.clone().applyQuaternion(goal).y > 0);
  assert.ok(forward.clone().applyQuaternion(goal).distanceTo(d) < 1e-9);
});

test("clearance swimmers respect body pitch while movement follows the visible head", () => {
  const entity = {
    species: { kind: "purussaurus", length: 18 },
    mesh: new T.Group(),
    velocity: new T.Vector3(),
  };
  entity.mesh.userData.aquaticUpright = true;
  const target = new T.Vector3(0.1, 1, 0.15).normalize();
  for (let i = 0; i < 600; i++) {
    turnSwimmingBody(entity, target, 1 / 60);
    const actual = forward.clone().applyQuaternion(entity.mesh.quaternion);
    assert.ok(actual.distanceTo(entity.velocity) < 1e-9);
    assert.ok(
      up.clone().applyQuaternion(entity.mesh.quaternion).y >=
        Math.cos(0.65) - 1e-9,
    );
  }
  assert.ok(entity.velocity.y > 0.5);
});
