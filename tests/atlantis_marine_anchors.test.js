import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { selectMarineFacades } from "../src/atlantis_marine_anchors.js";
import { createAtlantisCity } from "../src/atlantis_city.js";
import {
  atlantisSeabedHeight,
  ATLANTIS_EXCAVATION_SITES,
} from "../src/atlantis_terrain.js";
import { castSegment } from "../src/collision.js";

test("Facade anchors follow rotated physical wall faces, not building envelopes", () => {
  for (const angle of [0, Math.PI / 2, 0.62]) {
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle,
    );
    const host = {
      type: "box",
      kind: "city_masonry",
      x: 10,
      y: -40,
      z: -80,
      halfSize: { x: 9, y: 6, z: 0.9 },
      rotation: q,
    };
    const near = { x: 15, z: -110 };
    const [facade] = selectMarineFacades([host], { near });
    assert.ok(facade);
    for (const along of [-facade.width / 2, 0, facade.width / 2]) {
      const p = {
        x: facade.center.x - facade.normal.z * along,
        y: -40,
        z: facade.center.z + facade.normal.x * along,
      };
      const from = {
        x: p.x + facade.normal.x,
        y: p.y,
        z: p.z + facade.normal.z,
      };
      const to = { x: p.x - facade.normal.x, y: p.y, z: p.z - facade.normal.z };
      const hit = castSegment(from, to, [host]);
      assert.ok(hit);
      assert.ok(
        Math.abs(hit.time - 0.5) < 1e-6,
        "Plane must coincide with physical face",
      );
    }
  }
});

test("Harbor facade roots touch the actual rendered masonry at low, middle and upper bands", () => {
  const city = createAtlantisCity(new THREE.Scene(), {
    heightAt: atlantisSeabedHeight,
  });
  try {
    const [facade] = selectMarineFacades(city.colliders, {
      near: ATLANTIS_EXCAVATION_SITES[0].entrance.top,
    });
    assert.ok(
      facade,
      "The nearby street must have a genuine attachment surface",
    );
    city.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (const along of [-facade.width * 0.3, 0, facade.width * 0.3])
      for (const y of [
        facade.baseY + 1,
        (facade.baseY + facade.topY) / 2,
        facade.topY - 0.5,
      ]) {
        const origin = new THREE.Vector3(
          facade.center.x - facade.normal.z * along + facade.normal.x * 0.3,
          y,
          facade.center.z + facade.normal.x * along + facade.normal.z * 0.3,
        );
        ray.set(
          origin,
          new THREE.Vector3(-facade.normal.x, 0, -facade.normal.z),
        );
        ray.far = 0.4;
        const hits = ray
          .intersectObject(city.root, true)
          .filter((h) => h.object.name === "atlantis_architecture_instances");
        assert.ok(hits.length, `No rendered support at ${origin.toArray()}`);
        assert.ok(hits[0].distance <= 0.31);
      }
  } finally {
    city.dispose();
  }
});
