import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createOcean, seabedHeight } from "../src/ocean.js";

test("Hawaii reuses two volcanic light slots at all four depth landmarks", () => {
  const scene = new THREE.Scene();
  const ocean = createOcean(scene);
  const lights = ocean.root.children.filter((node) => node.isPointLight);
  const colliders = JSON.stringify(ocean.colliders);
  assert.equal(lights.length, 2);
  const sources = [
    [-42, -555, 24],
    [137, -728, 34],
    [-61, -942, 47],
    [153, -1091, 39],
  ];
  for (let cycle = 0; cycle < 4; cycle++) {
    for (const [x, z, height] of sources) {
      const y = seabedHeight(x, z);
      ocean.update(cycle, new THREE.Vector3(x, y + height + 10, z));
      assert.equal(lights[0].position.x, x);
      assert.equal(lights[0].position.z, z);
      assert.ok(Math.abs(lights[0].position.y - y - height - 3) < 1e-8);
      assert.ok(lights[0].intensity >= 1080 && lights[0].intensity <= 1200);
      assert.deepEqual(
        ocean.root.children.filter((node) => node.isPointLight),
        lights,
      );
    }
  }
  assert.equal(JSON.stringify(ocean.colliders), colliders);
  ocean.dispose();
  assert.equal(scene.children.length, 0);
});
