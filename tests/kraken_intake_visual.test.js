import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { findBossContact } from "../src/encounters.js";
import { createCreature } from "../src/creatures.js";

function make() {
  const model = createCreature("kraken", 1);
  return { model, intake: model.userData.krakenIntake };
}

test("Kraken mouth uses finite closed/open surfaces and independent articulated beaks", () => {
  const { model, intake } = make();
  model.updateMatrixWorld(true);
  for (const mesh of [
    intake.cavity,
    ...intake.jaws.map((j) => j.children[0]),
  ]) {
    for (const attribute of [
      mesh.geometry.attributes.position,
      mesh.geometry.attributes.normal,
      ...(mesh.geometry.morphAttributes.position || []),
      ...(mesh.geometry.morphAttributes.normal || []),
    ]) {
      assert.ok([...attribute.array].every(Number.isFinite));
      if (
        attribute === mesh.geometry.attributes.normal ||
        mesh.geometry.morphAttributes.normal?.includes(attribute)
      )
        for (let i = 0; i < attribute.count; i++)
          assert.ok(
            new THREE.Vector3().fromBufferAttribute(attribute, i).lengthSq() >
              0.99,
          );
    }
  }
  const tip = new THREE.Vector3(0, -0.014, -0.074),
    tips = () =>
      intake.jaws.map((j) => j.children[0].localToWorld(tip.clone()));
  const closed = tips();
  for (let i = 0; i < 60; i++) intake.update(1 / 60, { held: true });
  model.updateMatrixWorld(true);
  const open = tips();
  assert.ok(
    open[0].distanceTo(open[1]) > closed[0].distanceTo(closed[1]) + 0.08,
    "actual upper/lower hooked tips separate",
  );
  intake.update(1 / 60, { bite: true });
  for (let i = 0; i < 9; i++) intake.update(1 / 60, {});
  model.updateMatrixWorld(true);
  assert.equal(intake.state.opening, 0);
  assert.ok(
    tips()[0].distanceTo(tips()[1]) < 0.04,
    "beaks physically close after bite event",
  );
  model.userData.disposeLocalMotion();
});

test("Kraken suction reads world target without changing position and stays per-instance", () => {
  const a = make(),
    b = make();
  a.model.position.set(5, 8, -3);
  a.model.rotation.set(0.3, 0.4, 0);
  a.model.scale.setScalar(90);
  a.model.updateMatrixWorld(true);
  const target = new THREE.Vector3(0, 4, -25),
    saved = target.clone(),
    positions = a.intake.flow.geometry.attributes.position;
  a.intake.update(0.1, { held: true, target });
  assert.deepEqual(target, saved);
  assert.equal(a.intake.flow.visible, true);
  assert.equal(b.intake.flow.visible, false);
  assert.strictEqual(a.intake.cavity.geometry, b.intake.cavity.geometry);
  assert.notStrictEqual(a.intake.flow.geometry, b.intake.flow.geometry);
  assert.ok([...positions.array].every(Number.isFinite));
  const before = positions.array.slice();
  a.intake.update(0.1, { held: true, target });
  assert.notDeepEqual(
    positions.array,
    before,
    "water flows inward over active time",
  );
  a.intake.update(0.1, { active: true, held: false, target });
  assert.equal(a.intake.flow.visible, false, "escape ends intake stream");
  assert.equal(
    a.intake.state.biting,
    false,
    "escape does not synthesize a bite",
  );
  for (const item of [a, b]) item.model.userData.disposeLocalMotion();
});

test("Kraken reset removes bite/stream state; transient resources dispose exactly once", () => {
  const { model, intake } = make();
  let geometry = 0,
    material = 0;
  intake.flow.geometry.addEventListener("dispose", () => geometry++);
  intake.flow.material.addEventListener("dispose", () => material++);
  intake.update(0.1, { held: true, target: new THREE.Vector3(0, 0, -1) });
  intake.update(0.1, { bite: true });
  model.userData.resetKrakenGrip();
  assert.equal(intake.state.biting, false);
  assert.equal(intake.state.held, false);
  assert.equal(intake.state.biteAge, Infinity);
  assert.equal(intake.flow.visible, false);
  assert.equal(intake.state.opening, 0.08);
  model.userData.disposeLocalMotion();
  model.userData.disposeLocalMotion();
  assert.equal(geometry, 1);
  assert.equal(material, 1);
});

test("Kraken suction ribbons never become a biteable body", () => {
  const { model, intake } = make();
  intake.update(0.2, { held: true, target: new THREE.Vector3(0, 0, -0.5) });
  const group = new THREE.Group();
  group.add(intake.flow);
  group.updateMatrixWorld(true);
  const points = intake.flow.geometry.attributes.position,
    a = new THREE.Vector3().fromBufferAttribute(points, 0),
    b = new THREE.Vector3().fromBufferAttribute(points, 1),
    c = new THREE.Vector3().fromBufferAttribute(points, 2);
  const center = a
    .add(b)
    .add(c)
    .multiplyScalar(1 / 3);
  assert.equal(
    findBossContact(group, center, 0.001, { visibleBody: true }),
    null,
  );
  intake.flow.userData.visualOnly = false;
  intake.flow.geometry.computeBoundingBox();
  intake.flow.geometry.computeBoundingSphere();
  assert.ok(
    findBossContact(group, center, 0.001, { visibleBody: true }),
    "control: the exact rendered triangle is otherwise intersected",
  );
  model.userData.disposeLocalMotion();
});
