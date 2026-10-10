import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { updateLordBody } from "../src/lord_body.js";
import { findBossContact } from "../src/encounters.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";

for (const species of BOSS_SPECIES)
  test(`${species.kind}: posed core blocks a swept adult, follows transforms and leaves a reachable body surface`, () => {
    const parent = new THREE.Group(),
      mesh = createCreature(species.kind, species.length, 91);
    parent.position.set(30, -200, -300);
    parent.rotation.y = 0.7;
    parent.add(mesh);
    mesh.rotation.set(0.1, -0.2, 0.15);
    for (const time of [0, 1.5, 5]) {
      mesh.userData.animate(time, 1.5);
      const colliders = updateLordBody(mesh);
      assert.ok(colliders.length > 0 && colliders.length <= 80);
      for (const c of colliders) {
        assert.ok(
          Number.isFinite(c.x + c.y + c.z + c.axes.x + c.axes.y + c.axes.z),
        );
        assert.ok(
          Math.max(c.axes.x, c.axes.y, c.axes.z) < species.length,
          "skin bind transform must not scale the body twice",
        );
      }
      const core = [...colliders].sort(
        (a, b) =>
          b.axes.x * b.axes.y * b.axes.z - a.axes.x * a.axes.y * a.axes.z,
      )[0];
      const center = new THREE.Vector3(core.x, core.y, core.z);
      assert.ok(
        findBossContact(mesh, center, 0.4, { visibleBody: true }),
        "solid core must belong to visible anatomy",
      );
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(core.rotation);
      const start = center.clone().addScaledVector(axis, species.length * 1.5);
      const end = center.clone().addScaledVector(axis, -species.length * 1.5);
      const forward = axis.clone().negate();
      const options = {
        colliders,
        radius: bodyRadius(25),
        length: 25,
        forward,
      };
      const motion = resolveMotion(start, end, options);
      assert.equal(motion.blocked, true);
      assert.equal(motion.stuck, false);
      assert.equal(isPositionBlocked(motion.position, options), false);
      assert.ok(new THREE.Vector3().copy(motion.position).distanceTo(end) > 1);
      // 沿首次接触法向接近，实体先阻挡鱼身，嘴部仍能触及实际表面。
      const contact = motion.contacts[0];
      assert.equal(contact.collider.tag, "lord_body");
    }
    const before = updateLordBody(mesh).map(
      (c) => new THREE.Vector3(c.x, c.y, c.z),
    );
    parent.position.x += 100;
    updateLordBody(mesh).forEach((c, i) =>
      assert.ok(Math.abs(c.x - before[i].x - 100) < 1e-4),
    );
  });

test("annular lord and tentacled lord keep hollow/appendage gaps open", () => {
  const ring = createCreature("charybdis", 50);
  const colliders = updateLordBody(ring);
  const source = ring.userData.lordBody.sections[0];
  const center = new THREE.Vector3(0, 0, 0.05).applyMatrix4(
    source.parent.matrixWorld,
  );
  assert.equal(isPositionBlocked(center, { colliders, radius: 1 }), false);
  const kraken = createCreature("kraken", 50);
  assert.equal(
    updateLordBody(kraken).length,
    1,
    "eight separate arms must not be replaced by one full creature box",
  );
});
