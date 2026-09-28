import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createLaunchTransition } from "../src/launch_transition.js";

function fixture() {
  const camera = new THREE.PerspectiveCamera(60, 1.6, 0.15, 650);
  camera.position.set(18, -12, 85);
  camera.lookAt(-0.5, -17, 61);
  const avatar = new THREE.Group();
  avatar.position.set(9, -15.5, 68);
  avatar.rotation.set(0.05, -0.65, -0.05);
  avatar.scale.setScalar(10);
  const destination = new THREE.Vector3(0, -18, 75);
  const cameraPosition = new THREE.Vector3(0, -14.9, 82.48);
  const cameraTarget = new THREE.Vector3(0, -16.9, 69.5);
  return {
    camera,
    avatar,
    destination,
    length: 3,
    cameraPosition,
    cameraTarget,
  };
}

test("launch preserves the actual menu pose and joins the exact follow pose", () => {
  const state = fixture();
  const position = state.camera.position.clone();
  const rotation = state.camera.quaternion.clone();
  const avatarPosition = state.avatar.position.clone();
  const avatarRotation = state.avatar.quaternion.clone();
  const transition = createLaunchTransition(state);
  assert.equal(transition.advance(0), 0);
  assert.ok(position.distanceTo(state.camera.position) < 1e-10);
  assert.ok(rotation.angleTo(state.camera.quaternion) < 1e-7);
  assert.ok(avatarPosition.distanceTo(state.avatar.position) < 1e-10);
  assert.ok(avatarRotation.angleTo(state.avatar.quaternion) < 1e-7);
  assert.equal(transition.advance(10), 1);
  assert.ok(state.cameraPosition.distanceTo(state.camera.position) < 1e-10);
  assert.ok(state.destination.distanceTo(state.avatar.position) < 1e-10);
  assert.equal(state.avatar.scale.x, 3);
  assert.ok(transition.target.distanceTo(state.cameraTarget) < 1e-10);
  assert.equal(transition.advance(10), 1);
});

test("launch camera is independent of frame rate and does not advance at zero dt", () => {
  const fine = fixture();
  const coarse = fixture();
  const a = createLaunchTransition(fine);
  const b = createLaunchTransition(coarse);
  for (let i = 0; i < 48; i++) a.advance(1 / 60);
  b.advance(0.8);
  assert.ok(fine.camera.position.distanceTo(coarse.camera.position) < 1e-10);
  assert.ok(fine.avatar.position.distanceTo(coarse.avatar.position) < 1e-10);
  const frozen = coarse.camera.position.clone();
  b.advance(0);
  assert.ok(frozen.equals(coarse.camera.position));
  assert.ok(fine.camera.position.distanceTo(fine.avatar.position) > 7);
});

test("launch turns directly toward the follow view without an outward detour", () => {
  const state = fixture();
  const yaw = () =>
    Math.atan2(
      state.camera.position.x - state.avatar.position.x,
      state.camera.position.z - state.avatar.position.z,
    );
  const initialYaw = yaw();
  const transition = createLaunchTransition(state);
  let previousYaw = initialYaw;
  // 当前首页在追尾机位右侧；过渡应持续靠近正后方，不先向外转再折返。
  for (let frame = 0; frame < 120; frame++) {
    transition.advance(1 / 60);
    const currentYaw = yaw();
    assert.ok(currentYaw >= -1e-8, "Camera passed the follow heading");
    assert.ok(
      currentYaw <= previousYaw + 1e-8,
      "Camera turned away from the follow heading",
    );
    previousYaw = currentYaw;
  }
  assert.ok(Math.abs(previousYaw) < 1e-8);
});

test("matching menu and follow headings do not introduce a decorative orbit", () => {
  const state = fixture();
  state.camera.position
    .copy(state.cameraPosition)
    .sub(state.destination)
    .add(state.avatar.position);
  const transition = createLaunchTransition(state);
  for (let frame = 0; frame < 120; frame++) {
    transition.advance(1 / 60);
    assert.ok(
      Math.abs(state.camera.position.x - state.avatar.position.x) < 1e-8,
      "An aligned camera should stay on the follow heading",
    );
    assert.ok(state.camera.position.z > state.avatar.position.z);
  }
});
