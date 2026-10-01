import test from "node:test";
import assert from "node:assert/strict";
import {
  GROUND_STEERING,
  needsGroundRecovery,
  stepGroundSteering,
} from "../src/ground_steering.js";
import { stepSteering, MAX_SWIM_PITCH } from "../src/steering_rules.js";
import { characterMovement } from "../src/character_rules.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";

const point = (x, y, z) => ({ x, y, z });
const box = (y, hy) => ({
  type: "box",
  x: 0,
  y,
  z: 0,
  halfSize: point(100, hy, 100),
});

test("only downward terrain or upward-facing solid contact starts ground recovery", () => {
  const contact = { desiredY: 0, position: point(0, 1, 0), floorY: 1 };
  assert.equal(needsGroundRecovery(-1.4, contact), true);
  assert.equal(needsGroundRecovery(-0.2, contact), false);
  for (const override of [
    { floorY: -10 },
    { desiredY: 1 },
    { airborne: true },
    { jet: true },
  ])
    assert.equal(needsGroundRecovery(-1.4, { ...contact, ...override }), false);
  for (const normal of [point(0, -1, 0), point(1, 0, 0), point(0, 0.2, 0.98)])
    assert.equal(
      needsGroundRecovery(-1.4, {
        ...contact,
        floorY: -10,
        contacts: [{ normal }],
      }),
      false,
    );
  assert.equal(
    needsGroundRecovery(-1.4, {
      ...contact,
      floorY: -10,
      contacts: [{ normal: point(0, 1, 0) }],
    }),
    true,
  );
});

test("a released or held-down input leaves the floor smoothly within 0.6 seconds", () => {
  for (const character of ["orca", "squid"])
    for (const inputY of [-1, 0]) {
      let state = { yaw: 0.7, pitch: -MAX_SWIM_PITCH };
      const movement = characterMovement(character, false);
      for (let i = 0; i < 36; i++) {
        const previous = state.pitch;
        state = stepGroundSteering(
          state,
          { x: 0, y: inputY },
          movement,
          1 / 60,
        );
        assert.ok(state.pitch >= previous);
        assert.ok(state.pitch - previous < 0.14, "recovery must not snap");
        if (!state.recovering) break;
      }
      assert.equal(state.pitch, 0);
      assert.equal(state.yaw, 0.7);
      assert.equal(state.recovering, false);
    }
});

test("upward and sideways input stay responsive, time partitions agree, pause is inert", () => {
  const initial = { yaw: 0.3, pitch: -MAX_SWIM_PITCH };
  const movement = characterMovement("squid", false);
  for (const y of [-1, 0, 1]) {
    const input = { x: 0.4, y };
    const one = stepGroundSteering(initial, input, movement, 0.35);
    for (const count of [7, 21, 42]) {
      let many = initial;
      for (let i = 0; i < count; i++)
        many = stepGroundSteering(many, input, movement, 0.35 / count);
      assert.ok(Math.abs(many.pitch - one.pitch) < 1e-10);
      assert.ok(Math.abs(many.yaw - one.yaw) < 1e-10);
    }
  }
  for (const dt of [0, -1, NaN])
    assert.deepEqual(
      stepGroundSteering(initial, { x: 1, y: 1 }, movement, dt),
      { ...initial, recovering: true },
    );
  assert.ok(
    stepGroundSteering(initial, { x: 0, y: 1 }, movement, 0.25).pitch >
      stepGroundSteering(initial, { x: 0, y: 0 }, movement, 0.25).pitch,
  );
});

for (const type of ["terrain", "stone_floor", "sloping_terrain"])
  test(`both bodies escape ${type} with real full-body collision at different frame rates`, () => {
    for (const character of ["orca", "squid"])
      for (const length of [3.2, 15, 30])
        for (const fps of [20, 60, 120]) {
          const radius = bodyRadius(length),
            extent = Math.max(0, length * 0.42 - radius);
          const colliders =
            type === "stone_floor" ? [box(-1, 1), box(45, 1)] : [];
          const heightAt = (x, z) =>
            type === "stone_floor"
              ? -50
              : type === "sloping_terrain"
                ? 0.08 * z
                : 0;
          let orientation = { yaw: 0, pitch: -MAX_SWIM_PITCH },
            recovering = false;
          let position = point(0, length * 0.42 + 1, 0),
            triggered = false,
            escaped = false;
          for (let i = 0; i < fps * 2; i++) {
            const input = { x: 0, y: 0 },
              movement = characterMovement(character, false);
            if (recovering) {
              const next = stepGroundSteering(
                orientation,
                input,
                movement,
                1 / fps,
              );
              orientation = next;
              recovering = next.recovering;
            } else
              orientation = stepSteering(orientation, input, movement, 1 / fps);
            const forward = point(
              0,
              Math.sin(orientation.pitch),
              -Math.cos(orientation.pitch),
            );
            const desired = point(
              position.x,
              position.y + (forward.y * 12) / fps,
              position.z + (forward.z * 12) / fps,
            );
            const floorHeight = (x, z) =>
              heightAt(x, z) + radius + Math.abs(forward.y) * extent + 0.4;
            const result = resolveMotion(position, desired, {
              colliders,
              radius,
              length,
              forward,
              floorHeight,
            });
            assert.equal(result.stuck, false);
            assert.equal(
              isPositionBlocked(result.position, {
                colliders,
                radius,
                length,
                forward,
              }),
              false,
            );
            assert.ok(
              result.position.y >=
                floorHeight(result.position.x, result.position.z) - 1e-8,
            );
            if (
              needsGroundRecovery(orientation.pitch, {
                desiredY: desired.y,
                position: result.position,
                floorY: floorHeight(result.position.x, result.position.z),
                contacts: result.contacts,
              })
            )
              recovering = triggered = true;
            position = result.position;
            if (triggered && orientation.pitch >= 0) escaped = true;
          }
          assert.ok(triggered && escaped, `${character} ${length}m ${fps}fps`);
          assert.ok(
            position.z < -12,
            "recovery must restore horizontal travel",
          );
        }
  });

test("free-water steep diving and ordinary diagonal floor swimming are not auto-leveled", () => {
  for (const pitch of [-MAX_SWIM_PITCH, -0.2]) {
    const contact = { desiredY: -20, position: point(0, -20, 0), floorY: -100 };
    assert.equal(needsGroundRecovery(pitch, contact), false);
    assert.equal(
      stepSteering(
        { yaw: 1, pitch },
        { x: 0, y: 0 },
        characterMovement("orca", false),
        1,
      ).pitch,
      pitch,
    );
  }
  assert.ok(GROUND_STEERING.triggerPitch < -0.4);
});
