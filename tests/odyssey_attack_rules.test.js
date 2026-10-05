import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  ODYSSEY_ATTACKS,
  undertowPressure,
  inCrabClaws,
  inTidalWall,
  inReefFault,
} from "../src/odyssey_attack_rules.js";
import {
  createOdysseyAttackFx,
  isOdysseyAttack,
} from "../src/odyssey_combat_fx.js";
const origin = new THREE.Vector3(),
  forward = new THREE.Vector3(0, 0, -1);
const p = (x, y, z) => new THREE.Vector3(x, y, z);
test("frontal intake leaves side and rear escape routes with bounded near pressure", () => {
  assert.equal(undertowPressure(p(0, 0, -84), origin, forward), 0);
  assert.equal(undertowPressure(p(Infinity, 0, 0), origin, forward), 0);
  assert.equal(undertowPressure(p(0, 0, 5), origin, forward), 0);
  assert.equal(undertowPressure(p(20, 0, -10), origin, forward), 0);
  assert.ok(
    undertowPressure(p(0, 0, -10), origin, forward) >
      undertowPressure(p(0, 0, -65), origin, forward),
  );
  assert.equal(undertowPressure(origin, origin, forward), 20);
  assert.ok(ODYSSEY_ATTACKS.undertow.maxPull < 32);
});
test("crab pinch covers two front sectors and a warned inner sweep", () => {
  assert.ok(inCrabClaws(p(25, 0, -35), origin, forward));
  assert.ok(inCrabClaws(p(-25, 0, -35), origin, forward));
  for (const point of [
    p(0, 0, -45),
    p(0, 0, 35),
    p(25, 25, -35),
    p(60, 0, -60),
  ])
    assert.equal(inCrabClaws(point, origin, forward), false);
  assert.ok(inCrabClaws(p(0, 8, -5), origin, forward));
  assert.ok(inCrabClaws(p(0, 0, 0), origin, forward));
  assert.equal(inCrabClaws(p(0, 0, 12), origin, forward), false);
  assert.equal(inCrabClaws(p(0, 28, -5), origin, forward), false);
  const facing = p(1, 0, 0);
  assert.ok(inCrabClaws(p(35, 0, 25), origin, facing));
});
test("tidewall sweeps its travelled segment without blocking side or vertical escapes", () => {
  assert.ok(inTidalWall(p(0, 0, -35), origin, forward, 1, 0.3));
  assert.equal(inTidalWall(p(0, 0, -35), origin, forward, 1, 0.01), false);
  for (const point of [
    p(0, 25, -44),
    p(50, 0, -44),
    p(0, 0, -125),
    p(0, 0, 15),
  ])
    assert.equal(inTidalWall(point, origin, forward, 1, 0.1), false);
});
test("three reef lanes follow the floor and leave gaps and upper water safe", () => {
  const floor = () => -8;
  assert.ok(inReefFault(p(0, 0, -38), origin, forward, 1, 0.35, floor));
  assert.equal(
    inReefFault(p(0, 30, -38), origin, forward, 1, 0.35, floor),
    false,
  );
  assert.equal(
    inReefFault(p(0, 0, 20), origin, forward, 1, 0.35, floor),
    false,
  );
  assert.equal(
    inReefFault(p(0, 0, -130), origin, forward, 3, 0.1, floor),
    false,
  );
  assert.equal(
    inReefFault(p(25, 0, -100), origin, forward, 3, 0.1, floor),
    false,
  );
});
test("western attacks reuse their own bounded effect buffers across phases", () => {
  const scene = new THREE.Scene();
  const e = {
    state: { timer: 0.5, phaseDuration: 2.4 },
    attackOrigin: origin.clone(),
    heading: forward.clone(),
    lockTarget: p(0, 0, -70),
    mesh: new THREE.Group(),
  };
  e.mesh.userData.mouthAnchors = Array.from(
    { length: 6 },
    () => new THREE.Object3D(),
  );
  for (const ability of ["volley", "undertow", "surge", "claw", "fault"]) {
    assert.ok(isOdysseyAttack({ western: true }, ability));
    assert.equal(isOdysseyAttack({ kind: "kraken" }, ability), false);
    const fx = createOdysseyAttackFx(scene, ability, 0x88bbcc, {});
    const geometry = fx.parts.map((m) => m.geometry);
    for (let i = 0; i < 100; i++) {
      e.state.timer = i / 30;
      fx.update(e, 0.033, i / 30, i < 30, i >= 30, () => -8);
      fx.group.updateMatrixWorld(true);
      for (const m of fx.parts)
        assert.ok(m.matrixWorld.elements.every(Number.isFinite));
    }
    assert.deepEqual(
      fx.parts.map((m) => m.geometry),
      geometry,
    );
    fx.update(e, 0, 10, false, false, () => -8);
    assert.equal(fx.group.visible, false);
    assert.ok(fx.parts.every((m) => m.material.depthWrite === false));
  }
});
