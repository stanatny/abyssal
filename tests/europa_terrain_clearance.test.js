import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { resolveCreatureMotion } from "../src/navigation.js";
import { isPositionBlocked } from "../src/collision.js";

for (const species of getRegionSpecies("europa").filter(
  (s) => s.swimClearance > 0,
)) {
  test(`${species.kind}: rock sweep protects actual posed surface during turns, not only a slender centre capsule`, () => {
    const habitat = { ...species, depthMin: 5, depthMax: 800 };
    const wall = {
      type: "box",
      x: 0,
      y: -100,
      z: 0,
      halfSize: { x: 0.2, y: 100, z: 100 },
    };
    const previous = { x: -70, y: -100, z: 0 };
    const contact = resolveCreatureMotion(
      previous,
      { x: 50, y: -100, z: 0 },
      { x: 1, y: 0, z: 0 },
      habitat,
      { colliders: [wall], heightAt: () => -700 },
    );
    assert.ok(contact.blocked);
    assert.ok(
      contact.position.x < -0.2 - species.length * species.swimClearance,
    );
    assert.equal(
      isPositionBlocked(contact.position, {
        radius: species.length * species.swimClearance,
        colliders: [wall],
      }),
      false,
    );
    const a = createCreature(species.kind, species.length, 8),
      v = new THREE.Vector3();
    a.position.copy(contact.position);
    const surface = [];
    a.traverse((m) => {
      if (m.isMesh) surface.push(m);
    });
    for (let frame = 0; frame < 90; frame++) {
      a.rotation.set(Math.sin(frame / 15) * 0.6, frame / 15, 0);
      a.userData.animate(frame / 30, 2, {
        dt: 1 / 30,
        travelSpeed: species.speed * 2,
        cruiseSpeed: species.speed,
      });
      a.updateMatrixWorld(true);
      for (const m of surface) {
        m.skeleton?.update();
        for (let i = 0; i < m.geometry.attributes.position.count; i += 29) {
          m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
          assert.equal(
            isPositionBlocked(v, { colliders: [wall] }),
            false,
            `visible vertex ${i} crosses the wall`,
          );
        }
      }
    }
    a.userData.disposeLocalMotion?.();
  });
}

test("wide swimmers retain full lower-body clearance on sloping beds; ordinary fish keep the legacy margin", async () => {
  const { swimmingFloorHeight } = await import("../src/swimming_clearance.js");
  const radius = 20,
    species = { length: 40, swimClearance: 0.5 };
  for (const slope of [0, 0.5, 1, 1.6])
    for (let angle = 0; angle < Math.PI * 2; angle += 0.13) {
      const height = (x, z) =>
        -160 + slope * (Math.cos(angle) * x + Math.sin(angle) * z);
      const y = swimmingFloorHeight(0, 0, species, height, 4);
      for (let i = 0; i <= 60; i++)
        for (let j = 0; j < 80; j++) {
          const r = (radius * i) / 60,
            a = (j * Math.PI) / 40;
          const x = Math.cos(a) * r,
            z = Math.sin(a) * r;
          assert.ok(
            y - Math.sqrt(radius * radius - r * r) >= height(x, z),
            "outer body crosses the slope",
          );
        }
    }
  assert.equal(
    swimmingFloorHeight(5, 6, { length: 40 }, (x, z) => x + z, 4),
    15,
  );
});
