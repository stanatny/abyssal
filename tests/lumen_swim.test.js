import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

function advance(root, from, to, speed, phase = "hunt") {
  root.userData.setBossPhase(phase);
  for (let frame = from; frame <= to; frame++) {
    root.userData.setSwimTravel(speed / 60, 1 / 60);
    root.userData.animate(frame / 60, 1.2);
    root.updateMatrixWorld(true);
  }
}
function surfaceBounds(root) {
  const m = root.userData.hfRig.mesh,
    box = new THREE.Box3(),
    v = new THREE.Vector3();
  for (let i = 0; i < m.geometry.attributes.position.count; i++)
    box.expandByPoint(
      root.worldToLocal(m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld)),
    );
  return box;
}
test("Lumen's travelling skin gathers in three dimensions behind its mantle and reopens when movement stops", () => {
  const r = createCreature("lumen_stalker", 62, 17),
    rig = r.userData.hfRig;
  const rest = surfaceBounds(r).getSize(new THREE.Vector3());
  advance(r, 0, 480, 20);
  const swimming = surfaceBounds(r).getSize(new THREE.Vector3());
  assert.ok(swimming.x < rest.x * 0.4 && swimming.y < rest.y * 0.45);
  assert.ok(
    swimming.y > 0.4 && swimming.x > 0.6,
    "bundle has volume, not a collapsed plane",
  );
  const tips = rig.chains.map((c) =>
    r.worldToLocal(
      rig.bones[c.ids.at(-1)].getWorldPosition(new THREE.Vector3()),
    ),
  );
  assert.ok(
    tips.every((p) => p.z > 0.95),
    "all eight tips trail local +Z; travel is local -Z",
  );
  for (const c of rig.chains) {
    for (let i = 1; i < c.ids.length; i++) {
      const a = rig.bones[c.ids[i]].getWorldPosition(new THREE.Vector3()),
        b = rig.bones[c.ids[i - 1]].getWorldPosition(new THREE.Vector3());
      assert.ok(
        Math.abs(a.distanceTo(b) / 62 - c.local[i].distanceTo(c.local[i - 1])) <
          1e-7,
        "fold retains each arm segment's length",
      );
    }
  }
  advance(r, 481, 1080, 0);
  const hovering = surfaceBounds(r).getSize(new THREE.Vector3());
  assert.ok(hovering.x > rest.x * 0.94 && hovering.y > rest.y * 0.94);
  assert.ok(r.userData.lumenSwim.gather < 0.001);
  r.userData.disposeLocalMotion();
});
test("Lumen wind-up opens the crown before the existing lash and pause freezes both body and arms", () => {
  const r = createCreature("lumen_stalker", 62, 19);
  advance(r, 0, 420, 25);
  advance(r, 421, 565, 0, "windup");
  assert.ok(r.userData.lumenSwim.gather < 0.1);
  assert.ok(r.getObjectByName("lumen_stalker_anatomy").rotation.y < 0.08);
  const m = r.userData.hfRig.mesh;
  const sample = () =>
    Array.from({ length: 300 }, (_, i) =>
      m
        .getVertexPosition(i * 71, new THREE.Vector3())
        .applyMatrix4(m.matrixWorld)
        .toArray(),
    );
  const frozen = sample();
  for (let i = 0; i < 30; i++) {
    r.userData.setSwimTravel(0, 0);
    r.userData.animate(565 / 60, 1.2);
    r.updateMatrixWorld(true);
  }
  assert.deepEqual(sample(), frozen);
  r.userData.disposeLocalMotion();
});
