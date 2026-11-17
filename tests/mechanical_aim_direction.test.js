import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAst } from "rolldown/parseAst";
import * as THREE from "three";
import {
  isMechanicalAirAim,
  mechanicalAimDirection,
  mechanicalAimCameraPitch,
  frameMechanicalAimTarget,
} from "../src/mechanical_aim_direction.js";
import { stepPenglaiFlight } from "../src/penglai_flight.js";
import { stepSteering, MAX_SWIM_PITCH } from "../src/steering_rules.js";
import { createMechanicalAim } from "../src/mechanical_torpedo_aim.js";
import { createMechanicalTorpedoes } from "../src/mechanical_torpedoes.js";
import { createPlayer } from "../src/simulation.js";

const context = (options = {}) => ({
  characterId: "mechanical_shark",
  surfaceMode: "aether",
  positionY: 50,
  surfaceY: 4,
  airborne: false,
  forward: new THREE.Vector3(0, 0, -1),
  yaw: 0,
  pitch: Math.PI / 6,
  ...options,
});

test("Penglai glide keeps its real descent while the command ray acquires an upward target", () => {
  const c = context(),
    command = mechanicalAimDirection(new THREE.Vector3(), c),
    previousPosition = new THREE.Vector3(0, 50, 0),
    position = previousPosition.clone().addScaledVector(command, 0.2);
  c.forward.copy(command);
  const result = stepPenglaiFlight(1 / 60, {
    position,
    previousPosition,
    forward: c.forward,
    speed: 12,
    boosting: false,
    yaw: 0,
    surfaceY: 4,
  });
  assert.ok(position.y < previousPosition.y);
  assert.ok(Math.abs((result.posePitch * 180) / Math.PI + 5) < 1e-9);
  const actualBefore = c.forward.clone();
  const aimDirection = mechanicalAimDirection(new THREE.Vector3(), c);
  assert.deepEqual(c.forward, actualBefore);
  assert.ok(Math.abs((Math.asin(aimDirection.y) * 180) / Math.PI - 30) < 1e-9);
  const mesh = new THREE.Object3D();
  mesh.position.copy(previousPosition).addScaledVector(command, 65);
  const entity = { mesh, hiddenFor: 0, species: { length: 3 } };
  const selector = createMechanicalAim({
    entities: () => [entity],
    bosses: () => [],
    blocked: () => false,
  });
  assert.equal(
    selector.select(previousPosition, c.forward, { length: 15 }),
    null,
  );
  assert.equal(
    selector.select(previousPosition, aimDirection, { length: 15 }).entity,
    entity,
  );
});

test("water and nonmechanical characters retain actual motion; aether and ordinary breach opt into command aim", () => {
  const forward = new THREE.Vector3(0.2, -0.6, -0.5).normalize();
  for (const options of [
    { surfaceMode: "ocean", positionY: -10 },
    { surfaceMode: "aether", positionY: 4 },
    { surfaceMode: "ice", positionY: -20 },
    { characterId: "squid", airborne: true },
  ]) {
    const c = context({ forward, ...options });
    assert.equal(isMechanicalAirAim(c), false);
    assert.deepEqual(mechanicalAimDirection(new THREE.Vector3(), c), forward);
  }
  for (const c of [
    context(),
    context({ surfaceMode: "ocean", airborne: true }),
  ]) {
    assert.equal(isMechanicalAirAim(c), true);
    assert.ok(mechanicalAimDirection(new THREE.Vector3(), c).y > 0);
  }
  const changing = context({ forward });
  assert.ok(mechanicalAimDirection(new THREE.Vector3(), changing).y > 0);
  changing.positionY = -5;
  assert.deepEqual(
    mechanicalAimDirection(new THREE.Vector3(), changing),
    forward,
  );
});

test("actual main input expressions give keyboard and full joystick the same bounded aim", () => {
  const source = readFileSync(
    new URL("../src/main.js", import.meta.url),
    "utf8",
  );
  const update = parseAst(source).body.find(
    (node) =>
      node.type === "FunctionDeclaration" && node.id.name === "updatePlayer",
  );
  const declarations = update.body.body.flatMap(
    (node) => node.declarations || [],
  );
  const expressions = ["inputX", "inputY"].map((id) => {
    const node = declarations.find((entry) => entry.id.name === id).init;
    return source.slice(node.start, node.end);
  });
  const input = new Function(
    "pointer",
    "keys",
    "invertVertical",
    "return [" + expressions.join(",") + "]",
  );
  const movement = { yawRate: 1.15, pitchRate: 1.15 };
  for (const sign of [-1, 1]) {
    const keyboardKeys = new Set(
      sign > 0 ? ["KeyD", "KeyW"] : ["KeyA", "KeyS"],
    );
    const keys = input({ x: 0, y: 0 }, keyboardKeys, false);
    const touch = input({ x: sign, y: -sign }, new Set(), false);
    assert.deepEqual(keys, [sign, sign]);
    assert.deepEqual(touch, keys);
    assert.deepEqual(input({ x: 0, y: 0 }, keyboardKeys, true), [sign, -sign]);
    assert.deepEqual(input({ x: sign, y: -sign }, new Set(), true), [
      sign,
      -sign,
    ]);
    const keyboard = stepSteering(
      { yaw: 0, pitch: 0 },
      { x: keys[0], y: keys[1] },
      movement,
      5,
    );
    const joystick = stepSteering(
      { yaw: 0, pitch: 0 },
      { x: touch[0], y: touch[1] },
      movement,
      5,
    );
    assert.deepEqual(keyboard, joystick);
    assert.equal(Math.abs(keyboard.pitch), MAX_SWIM_PITCH);
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const direction = mechanicalAimDirection(
        new THREE.Vector3(),
        context({ ...keyboard, yaw }),
      );
      assert.ok(direction.toArray().every(Number.isFinite));
      assert.ok(Math.abs(direction.length() - 1) < 1e-12);
      assert.equal(Math.sign(direction.y), sign);
    }
  }
  const c = context({ yaw: NaN });
  assert.deepEqual(mechanicalAimDirection(new THREE.Vector3(), c), c.forward);
});

test("a permitted air launch uses the same command-ray target as preview; ordinary airborne denial cannot pay", () => {
  const scene = new THREE.Scene(),
    c = context(),
    direction = mechanicalAimDirection(new THREE.Vector3(), c),
    origin = new THREE.Vector3(0, 50, 0),
    mesh = new THREE.Object3D(),
    player = createPlayer("mechanical_shark", 15);
  mesh.position.copy(origin).addScaledVector(direction, 65);
  const entity = { mesh, hiddenFor: 0, species: { length: 3 } };
  const tubes = createMechanicalTorpedoes(scene, { entities: () => [entity] });
  try {
    const preview = tubes.previewAim(origin, direction, player);
    assert.equal(preview.entity, entity);
    assert.equal(tubes.activate(player, origin, direction, false), false);
    assert.equal(tubes.state.shots, 0);
    assert.deepEqual([player.health, player.stamina], [100, 100]);
    assert.equal(tubes.activate(player, origin, direction, true), true);
    assert.deepEqual([player.health, player.stamina], [80, 80]);
    const shot = tubes.projectiles.find((entry) => entry.active);
    assert.equal(shot.target.entity, preview.entity);
    assert.ok(shot.direction.angleTo(direction) < 1e-9);
    assert.ok(shot.direction.y > 0);
  } finally {
    tubes.dispose();
  }
});

test("air-aim camera pitch follows both signs without moving the desired offset in front on a dive", () => {
  for (const length of [3, 15, 30]) {
    const ratio = length / 6,
      juvenile = Math.min(1, Math.max(0.4, ratio)),
      height = 4.8 * juvenile + ratio * 1.4,
      distance = 13 * juvenile + ratio * 4;
    for (const pitch of [-MAX_SWIM_PITCH, -0.2, 0, 0.2, MAX_SWIM_PITCH]) {
      const actual = mechanicalAimCameraPitch(pitch, height, distance);
      assert.ok(Number.isFinite(actual));
      assert.ok(Math.abs(actual) <= MAX_SWIM_PITCH);
      const offset = new THREE.Vector3(0, height, distance).applyEuler(
        new THREE.Euler(actual, 0, 0, "YXZ"),
      );
      assert.ok(offset.z > 0);
    }
  }
});

test("actual aim-point projection stays visible at command extremes even with a shortened camera; ray and positions stay unchanged", () => {
  const position = new THREE.Vector3(0, 50, 0);
  for (const aspect of [1280 / 800, 390 / 800])
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2])
      for (const pitch of [-MAX_SWIM_PITCH, -0.7, 0, 0.7, MAX_SWIM_PITCH])
        for (const shortened of [1, 0.2]) {
          const c = context({ yaw, pitch });
          const direction = mechanicalAimDirection(new THREE.Vector3(), c);
          const aimPoint = position.clone().addScaledVector(direction, 80);
          const cameraPosition = position
            .clone()
            .add(
              new THREE.Vector3(0, 8, 20)
                .multiplyScalar(shortened)
                .applyEuler(new THREE.Euler(0, yaw, 0, "YXZ")),
            );
          const preferredTarget = position
            .clone()
            .add(new THREE.Vector3(0, 1, -10));
          const before = [
            cameraPosition.toArray(),
            preferredTarget.toArray(),
            aimPoint.toArray(),
            direction.toArray(),
          ];
          const target = frameMechanicalAimTarget(new THREE.Vector3(), {
            cameraPosition,
            preferredTarget,
            aimPoint,
            fov: 60,
            aspect,
          });
          const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
          camera.position.copy(cameraPosition);
          camera.lookAt(target);
          camera.updateMatrixWorld();
          const projected = aimPoint.clone().project(camera);
          assert.ok(projected.z >= -1 && projected.z <= 1);
          assert.ok(Math.abs(projected.x) <= 0.861, JSON.stringify(projected));
          assert.ok(Math.abs(projected.y) <= 0.861, JSON.stringify(projected));
          assert.deepEqual(
            [
              cameraPosition.toArray(),
              preferredTarget.toArray(),
              aimPoint.toArray(),
              direction.toArray(),
            ],
            before,
          );
        }
});

test("camera framing preserves a visible preferred target and supports aliasing the look-target output", () => {
  const cameraPosition = new THREE.Vector3(0, 8, 20),
    target = new THREE.Vector3(0, 0, 0),
    aimPoint = new THREE.Vector3(0, 0, -80),
    before = target.clone();
  assert.equal(
    frameMechanicalAimTarget(target, {
      cameraPosition,
      preferredTarget: target,
      aimPoint,
      fov: 60,
      aspect: 1,
    }),
    target,
  );
  assert.deepEqual(target, before);
  const highAim = new THREE.Vector3(0, 80, 0);
  frameMechanicalAimTarget(target, {
    cameraPosition,
    preferredTarget: target,
    aimPoint: highAim,
    fov: 60,
    aspect: 0.5,
  });
  const camera = new THREE.PerspectiveCamera(60, 0.5, 0.1, 1000);
  camera.position.copy(cameraPosition);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  assert.ok(Math.abs(highAim.clone().project(camera).y) <= 0.861);
  frameMechanicalAimTarget(target, {
    cameraPosition: new THREE.Vector3(),
    preferredTarget: new THREE.Vector3(0, 0, -10),
    aimPoint: new THREE.Vector3(0, 0, 80),
  });
  assert.deepEqual(target, new THREE.Vector3(0, 0, 10));
});
