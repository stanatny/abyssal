import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createSwimmingSpacing,
  turnSwimmingBody,
} from "../src/swimming_spacing.js";
const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function animal(x, y, z, index = 0, length = 8.5) {
  const mesh = new THREE.Group();
  mesh.position.set(x, y, z);
  return {
    mesh,
    velocity: v(0, 0, -1),
    species: { length, swimClearance: 0.54 },
    hiddenFor: 0,
    populationIndex: index,
    hunter: { phase: "idle" },
  };
}
test("converging swimmers retain whole-body gaps through sustained turns and charges", () => {
  const spacing = createSwimmingSpacing(),
    es = Array.from({ length: 12 }, (_, i) =>
      animal(
        Math.cos((i * Math.PI) / 6) * 45,
        Math.sin((i * Math.PI) / 6) * 10,
        Math.sin((i * Math.PI) / 6) * 45,
        i,
      ),
    );
  const previous = v(),
    direction = v();
  let distance = 0,
    nearest = Infinity;
  for (let frame = 0; frame < 1800; frame++) {
    spacing.rebuild(es);
    for (const e of es) {
      previous.copy(e.mesh.position);
      direction
        .set(Math.sin(frame / 150) * 6, 0, Math.cos(frame / 150) * 6)
        .sub(previous)
        .normalize();
      e.hunter.phase = frame % 300 > 250 ? "active" : "idle";
      const speed = spacing.steer(
        e,
        direction,
        e.hunter.phase === "active" ? 38 : 18,
      );
      turnSwimmingBody(e, direction, 1 / 60);
      e.mesh.position.addScaledVector(e.velocity, speed / 60);
      spacing.constrain(e, previous, e.mesh.position);
      distance += e.mesh.position.distanceTo(previous);
    }
    for (let i = 0; i < es.length; i++)
      for (let j = 0; j < i; j++) {
        const d = es[i].mesh.position.distanceTo(es[j].mesh.position);
        nearest = Math.min(nearest, d);
        assert.ok(d >= 9.18 - 1e-6, `overlap at frame ${frame}: ${d}`);
      }
  }
  assert.ok(distance > 1500, "avoidance must not freeze the group");
  assert.ok(nearest < 12, "hunters still approach");
});
test("continuous clearance stops a fast crossing and permits a legacy overlap to escape", () => {
  const s = createSwimmingSpacing(),
    a = animal(-20, 0, 0),
    b = animal(0, 0, 0, 1);
  s.rebuild([a, b]);
  const old = a.mesh.position.clone();
  a.mesh.position.set(20, 0, 0);
  assert.ok(s.constrain(a, old, a.mesh.position));
  assert.ok(a.mesh.position.x <= -9.18);
  a.mesh.position.set(-2, 0, 0);
  old.copy(a.mesh.position);
  a.mesh.position.x = -3;
  s.constrain(a, old, a.mesh.position);
  assert.equal(a.mesh.position.x, -3);
  old.copy(a.mesh.position);
  a.mesh.position.x = -1;
  s.constrain(a, old, a.mesh.position);
  assert.equal(a.mesh.position.x, -3);
  b.hiddenFor = 10;
  a.mesh.position.x = 20;
  assert.equal(s.constrain(a, old, a.mesh.position), false);
  s.clear();
  b.hiddenFor = 0;
  assert.equal(s.constrain(a, old, a.mesh.position), false);
});
test("only opted-in neighbours participate and warned active headings remain fixed", () => {
  const s = createSwimmingSpacing(),
    a = animal(0, 0, 0),
    b = animal(0, 0, -12, 1);
  s.rebuild([a, b]);
  a.hunter.phase = "active";
  const d = v(0, 0, -1);
  assert.ok(s.steer(a, d, 30) < 30);
  assert.deepEqual(d.toArray(), [0, 0, -1]);
  a.hunter.phase = "idle";
  s.steer(a, d, 30);
  assert.ok(Math.abs(d.x) > 0.1);
  b.species.swimClearance = 0;
  s.rebuild([a, b]);
  d.set(0, 0, -1);
  assert.equal(s.steer(a, d, 30), 30);
  assert.deepEqual(d.toArray(), [0, 0, -1]);
});
test("body stays dorsal-up and moves along its nose through reversal, ascent and descent", () => {
  const a = animal(0, 0, 0),
    nose = v(),
    up = v(),
    old = new THREE.Quaternion();
  for (let i = 0; i < 900; i++) {
    old.copy(a.mesh.quaternion);
    turnSwimmingBody(
      a,
      v(i < 300 ? 1 : -1, i < 600 ? 0.8 : -0.8, Math.sin(i / 100)).normalize(),
      1 / 60,
    );
    nose.set(0, 0, -1).applyQuaternion(a.mesh.quaternion);
    up.set(0, 1, 0).applyQuaternion(a.mesh.quaternion);
    assert.ok(nose.distanceTo(a.velocity) < 1e-10);
    assert.ok(up.y > 0.15);
    assert.ok(old.angleTo(a.mesh.quaternion) < 0.075);
  }
  old.copy(a.mesh.quaternion);
  turnSwimmingBody(a, v(1, 0, 0), 0);
  assert.deepEqual(a.mesh.quaternion.toArray(), old.toArray());
});
