import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { prepareOrdinaryBody } from "../src/ordinary_body.js";
for (const kind of ["triton_guard", "naga_huntress"]) {
  test(`${kind}: weapon stays in the same skinned palm through swim poses, with independent transforms`, () => {
    const a = createCreature(kind, 1),
      b = createCreature(kind, 1),
      wa = a.userData.visualWeapon,
      wb = b.userData.visualWeapon,
      mesh = a.userData.hfRig.mesh;
    assert.ok(wa.userData.visualOnly);
    assert.equal(wa.geometry, wb.geometry);
    assert.equal(wa.material, wb.material);
    assert.notEqual(wa, wb);
    assert.ok(wa.parent.isBone);
    const grip = wa.getWorldPosition(new T.Vector3());
    let best = -1,
      d = Infinity;
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      const v = mesh
          .getVertexPosition(i, new T.Vector3())
          .applyMatrix4(mesh.matrixWorld),
        dist = v.distanceTo(grip);
      if (dist < d) {
        d = dist;
        best = i;
      }
    }
    assert.ok(d < 0.02);
    const initial = wb.matrixWorld.clone();
    let moved = 0;
    for (let t = 0; t < 8; t += 0.1) {
      a.userData.animate(t, 2);
      a.updateMatrixWorld(true);
      mesh.skeleton.update();
      const now = wa.getWorldPosition(new T.Vector3()),
        hand = mesh
          .getVertexPosition(best, new T.Vector3())
          .applyMatrix4(mesh.matrixWorld);
      assert.ok(now.distanceTo(hand) < 0.025);
      moved = Math.max(moved, now.distanceTo(grip));
    }
    assert.ok(moved > 0.01);
    assert.deepEqual(wb.matrixWorld, initial);
    a.userData.disposeLocalMotion();
    b.userData.disposeLocalMotion();
  });
  test(`${kind}: weapon contributes no body or bite collision sections`, () => {
    const a = createCreature(kind, 1);
    prepareOrdinaryBody(a);
    const withWeapon = a.userData.ordinaryBody.sections.map((s) => ({
      center: s.center.toArray(),
      radii: s.radii.toArray(),
      joints: s.indices,
    }));
    assert.ok(withWeapon.length);
    a.userData.visualWeapon.removeFromParent();
    delete a.userData.ordinaryBody;
    prepareOrdinaryBody(a);
    assert.deepEqual(
      a.userData.ordinaryBody.sections.map((s) => ({
        center: s.center.toArray(),
        radii: s.radii.toArray(),
        joints: s.indices,
      })),
      withWeapon,
    );
    assert.equal(a.userData.mouthAnchors.length, 1);
    a.userData.disposeLocalMotion();
  });
}
