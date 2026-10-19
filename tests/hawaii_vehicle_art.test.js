import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHumanModel } from "../src/vehicle_models.js";
import { createSubmarineDefense } from "../src/submarine_defense.js";
import { createPlayer } from "../src/simulation.js";

for (const kind of ["submarine", "attack_torpedo"]) {
  test(`${kind}: shared rigid shell survives one owner closing, then releases once`, () => {
    const a = createHumanModel(kind, 1),
      b = createHumanModel(kind, 1);
    const aa = a.userData.vehicleArt,
      bb = b.userData.vehicleArt;
    assert.equal(aa.body.geometry, bb.body.geometry);
    assert.equal(aa.body.material, bb.body.material);
    assert.equal(aa.rotor.geometry, bb.rotor.geometry);
    const disposed = new Map();
    for (const item of [
      aa.body.geometry,
      aa.body.material,
      aa.rotor.geometry,
      aa.rotor.material,
    ]) {
      disposed.set(item, 0);
      item.addEventListener("dispose", () =>
        disposed.set(item, disposed.get(item) + 1),
      );
    }
    const positions = aa.body.geometry.attributes.position.array.slice();
    const before = aa.body.matrix.clone();
    a.userData.animate(0.9);
    assert.notEqual(aa.rotor.rotation.z, bb.rotor.rotation.z);
    assert.deepEqual(aa.body.geometry.attributes.position.array, positions);
    assert.deepEqual(aa.body.matrix, before);
    assert.equal(aa.body.geometry.getAttribute("skinWeight"), undefined);
    const bounds = new THREE.Box3()
      .setFromObject(a)
      .getSize(new THREE.Vector3());
    assert.ok(
      bounds.z >= 1 && bounds.z < 1.02,
      `${kind} longitudinal bounds ${bounds.z}`,
    );
    assert.ok(
      bounds.x < 0.4 && bounds.y < 0.4,
      `${kind} transient effects must not inflate framing`,
    );
    a.userData.dispose();
    a.userData.disposeLocalMotion();
    assert.ok([...disposed.values()].every((n) => n === 0));
    b.userData.animate(1.9);
    b.userData.dispose();
    b.userData.dispose();
    assert.ok([...disposed.values()].every((n) => n === 1));
    const next = createHumanModel(kind, 1);
    assert.notEqual(next.userData.vehicleArt.body.geometry, aa.body.geometry);
    next.userData.dispose();
  });
}

test("Submarine ejection follows actual world aim, expires and resets without inflating Guide bounds", () => {
  const a = createHumanModel("submarine", 18),
    b = createHumanModel("submarine", 18);
  a.rotation.y = Math.PI / 2;
  const fx = a.userData.vehicleArt.effects;
  const before = new THREE.Box3().setFromObject(a);
  a.userData.launchTorpedoVisual(new THREE.Vector3(0, 0, -1), 10);
  assert.ok(fx.bubbles.visible);
  assert.equal(b.userData.vehicleArt.effects.bubbles.visible, false);
  assert.ok(fx.launchDirection.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-8);
  assert.ok(fx.origin.x > 0 && fx.origin.x < 0.3);
  assert.deepEqual(new THREE.Box3().setFromObject(a), before);
  a.userData.animate(10.73);
  assert.equal(fx.bubbles.visible, false);
  a.userData.launchTorpedoVisual(new THREE.Vector3(1, 0, 0), 11);
  a.userData.resetDefenseVisual();
  assert.equal(fx.bubbles.visible, false);
  a.userData.dispose();
  b.userData.dispose();
});

test("Real defense windup and launch drive fitted effects; disabled encounters clear indicators", () => {
  const parent = new THREE.Group(),
    mesh = createHumanModel("submarine", 18);
  mesh.position.set(0, -200, -400);
  parent.add(mesh);
  const s = { id: "one", mesh, state: { destroyed: false } };
  const defense = createSubmarineDefense(parent, {
    submarines: [s],
    castWorld: () => null,
  });
  const player = createPlayer();
  player.length = 12;
  const position = new THREE.Vector3(0, -200, -450),
    forward = new THREE.Vector3(0, 0, -1);
  const fx = mesh.userData.vehicleArt.effects;
  defense.update(0.1, 100, player, position, forward);
  assert.equal(defense.threat.phase, "windup");
  const warning = fx.lamps.material.color.clone();
  for (let i = 1; i <= 22; i++)
    defense.update(0.1, 100 + i * 0.1, player, position, forward);
  assert.ok(defense.projectiles.some((p) => p.active));
  assert.ok(fx.bubbles.visible);
  assert.ok(fx.launchDirection.distanceTo(new THREE.Vector3(0, 0, -1)) < 1e-8);
  defense.update(0.1, 103, player, position, forward, false);
  assert.notDeepEqual(fx.lamps.material.color, warning);
  defense.reset();
  assert.equal(fx.bubbles.visible, false);
  assert.ok(defense.projectiles.every((p) => !p.active));
  defense.dispose();
  mesh.userData.dispose();
});
