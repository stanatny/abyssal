import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createElectricDischarge } from "../src/electric_discharge.js";
import { createCreature } from "../src/creatures.js";
import { disposePopulation } from "../src/population_cache.js";
import { createHunterState, tickHunter } from "../src/hunter_rules.js";

const snapshot = (effect) => [
  effect.group.visible,
  ...effect.core.instanceMatrix.array,
  effect.core.material.opacity,
];
test("Eel charge follows true windup, cancels without discharge and never changes shared body material", () => {
  const a = createCreature("electric_eel", 2.5, 1),
    b = createCreature("electric_eel", 2.5, 2),
    charge = a.userData.electricCharge,
    body = a.userData.hfRig.mesh.material,
    color = body.color.clone();
  assert.equal(charge.group.visible, false);
  const ability = createHunterState({
    kind: "electric_eel",
    hunterAbility: "river_shock",
  });
  ability.cooldown = 0;
  tickHunter(ability, 0.6, { hunting: true, distance: 7, lineOfSight: true });
  a.userData.setHunterPhase(
    ability.phase,
    ability.timer,
    ability.phaseDuration,
  );
  assert.equal(charge.group.visible, true);
  assert.equal(b.userData.electricCharge.group.visible, false);
  assert.equal(a.userData.hfRig.mesh.material, b.userData.hfRig.mesh.material);
  assert.deepEqual(body.color, color);
  const before = snapshot(charge);
  a.userData.setHunterPhase(
    ability.phase,
    ability.timer,
    ability.phaseDuration,
  );
  assert.deepEqual(
    snapshot(charge),
    before,
    "repeated paused phase must remain exact",
  );
  tickHunter(ability, 0.1, { hunting: true, distance: 7, lineOfSight: false });
  a.userData.setHunterPhase(
    ability.phase,
    ability.timer,
    ability.phaseDuration,
  );
  assert.equal(charge.group.visible, false);
  assert.equal(ability.triggerCount, 0);
  a.userData.disposeLocalMotion();
  b.userData.disposeLocalMotion();
});

test("Eel release has a bounded residual, reset clears it and instance resources dispose once", () => {
  const a = createCreature("electric_eel", 2.5, 7),
    fx = a.userData.electricCharge;
  const owned = [
    fx.core,
    fx.halo,
    fx.core.geometry,
    fx.core.material,
    fx.halo.material,
  ];
  const disposed = owned.map(() => 0);
  owned.forEach((r, i) => r.addEventListener("dispose", () => disposed[i]++));
  a.userData.setHunterPhase("active", 0.1, 0.3);
  const intensity = fx.core.material.opacity;
  a.userData.setHunterPhase("recover", 0.15, 3);
  assert.ok(fx.group.visible && fx.core.material.opacity < intensity);
  a.userData.setHunterPhase("recover", 0.36, 3);
  assert.equal(fx.group.visible, false);
  a.userData.setHunterPhase("windup", 0.3, 1.2);
  a.userData.setHunterPhase("idle");
  assert.equal(fx.group.visible, false);
  a.userData.disposeLocalMotion();
  a.userData.disposeLocalMotion();
  assert.deepEqual(disposed, [1, 1, 1, 1, 1]);
  assert.equal(fx.group.parent, null);
});

test("World discharge occupies the existing radius, remains frozen at dt=0 and reuses a bounded pool", () => {
  const parent = new THREE.Group(),
    fx = createElectricDischarge(parent),
    position = new THREE.Vector3(1, -20, 3),
    matrix = new THREE.Matrix4(),
    v = new THREE.Vector3();
  const resources = parent.children.flatMap((g) =>
    g.children.map((m) => m.uuid),
  );
  for (let emission = 0; emission < 30; emission++) {
    fx.emit(position, 12);
    for (let frame = 0; frame < 20; frame++) {
      fx.update(0.02);
      for (const g of parent.children)
        for (const m of g.children) {
          assert.ok(m.count <= 88);
          assert.ok(Array.from(m.instanceMatrix.array).every(Number.isFinite));
          for (let i = 0; i < m.count; i++) {
            m.getMatrixAt(i, matrix);
            // 检查真实圆柱端点及侧面顶点，而不只检查抽象射线端点。
            for (let j = 0; j < m.geometry.attributes.position.count; j++) {
              v.fromBufferAttribute(
                m.geometry.attributes.position,
                j,
              ).applyMatrix4(matrix);
              assert.ok(v.length() <= 12.001);
            }
          }
        }
    }
  }
  assert.deepEqual(
    parent.children.flatMap((g) => g.children.map((m) => m.uuid)),
    resources,
  );
  const before = parent.children.map((g) =>
    snapshot({ group: g, core: g.children[1] }),
  );
  fx.update(0);
  fx.update(-1);
  fx.update(NaN);
  assert.deepEqual(
    parent.children.map((g) => snapshot({ group: g, core: g.children[1] })),
    before,
  );
  fx.update(1);
  assert.ok(parent.children.every((g) => !g.visible));
  fx.emit(position);
  fx.reset();
  assert.ok(parent.children.every((g) => !g.visible));
  fx.dispose();
  fx.dispose();
  assert.equal(parent.children.length, 0);
});

test("Reduced-motion discharge holds arc geometry steady while fading", () => {
  const p = new THREE.Group(),
    fx = createElectricDischarge(p, { reducedMotion: () => true });
  fx.emit(new THREE.Vector3(), 12);
  const mesh = p.children[0].children[1],
    matrices = mesh.instanceMatrix.array.slice(),
    opacity = mesh.material.opacity;
  fx.update(0.2);
  assert.deepEqual(mesh.instanceMatrix.array, matrices);
  assert.ok(mesh.material.opacity < opacity);
  fx.dispose();
});

test("Population eviction disposes eel-local arcs without disposing shared color or skin", () => {
  const a = createCreature("electric_eel", 2.5),
    b = createCreature("electric_eel", 2.5),
    fx = a.userData.electricCharge;
  let owned = 0,
    shared = 0;
  for (const r of [
    fx.core.geometry,
    fx.core.material,
    fx.halo.material,
    fx.core,
    fx.halo,
  ])
    r.addEventListener("dispose", () => owned++);
  for (const r of [
    a.userData.hfRig.mesh.geometry,
    a.userData.hfRig.mesh.material,
  ])
    r.addEventListener("dispose", () => shared++);
  disposePopulation([{ mesh: a }]);
  assert.equal(owned, 5);
  assert.equal(shared, 0);
  assert.equal(fx.group.parent, null);
  b.userData.setHunterPhase("windup", 0.5, 1.2);
  assert.ok(b.userData.electricCharge.group.visible);
  disposePopulation([{ mesh: b }]);
});
