import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  overlapsStaticSpheres,
  pushFromStaticSpheres,
  steerFromStaticSpheres,
} from "../src/static_sphere_navigation.js";

function referencePush(point, radius, rocks) {
  const delta = new THREE.Vector3();
  for (const rock of rocks) {
    delta.set(point.x - rock.x, point.y - rock.y, point.z - rock.z);
    const distance = delta.length(),
      limit = rock.radius + radius;
    if (distance < limit && distance > 0.01)
      point.addScaledVector(delta, (limit - distance) / distance);
  }
  return point;
}
function referenceSteer(direction, point, clearance, rocks) {
  const delta = new THREE.Vector3();
  for (const rock of rocks) {
    delta.set(point.x - rock.x, point.y - rock.y, point.z - rock.z);
    const distance = delta.length(),
      safe = rock.radius + clearance;
    if (distance < safe && distance > 0.01)
      direction.addScaledVector(
        delta.normalize(),
        ((safe - distance) / safe) * 3,
      );
  }
  return direction;
}
function close(actual, expected) {
  assert.ok(
    actual.distanceTo(expected) < 1e-11,
    `${actual.toArray()} != ${expected.toArray()}`,
  );
}

test("ordered projection retains chain contacts outside the original query", () => {
  const rocks = [
    { x: 0, y: 0, z: 0, radius: 40 },
    { x: 45, y: 0, z: 0, radius: 8 },
    { x: 34, y: 0, z: 0, radius: 4 },
  ];
  const start = new THREE.Vector3(1, 0, 0);
  const expected = referencePush(start.clone(), 1, rocks);
  assert.equal(expected.x, 39);
  close(pushFromStaticSpheres(start.clone(), 1, rocks), expected);
});

test("empty, distant, exact-center and tangent cases retain their positions", () => {
  const rocks = [{ x: -80, y: -200, z: 80, radius: 5 }];
  for (const start of [
    new THREE.Vector3(-80, -200, 80),
    new THREE.Vector3(-73, -200, 80),
    new THREE.Vector3(300, 100, -900),
  ]) {
    close(
      pushFromStaticSpheres(start.clone(), 2, rocks),
      referencePush(start.clone(), 2, rocks),
    );
  }
  const point = new THREE.Vector3(1, 2, 3);
  assert.equal(pushFromStaticSpheres(point, 1, []), point);
  assert.equal(overlapsStaticSpheres(point, 1, []), false);
});

test("indexed sphere navigation matches full scans over randomized three-dimensional habitats", () => {
  let seed = 71355;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const rocks = Array.from({ length: 240 }, () => ({
    x: random() * 500 - 250,
    y: random() * 350 - 350,
    z: random() * 800 - 800,
    radius: 1 + random() * 65,
  }));
  for (let i = 0; i < 800; i++) {
    const point = new THREE.Vector3(
      random() * 500 - 250,
      random() * 350 - 350,
      random() * 800 - 800,
    );
    const radius = random() * 9;
    close(
      pushFromStaticSpheres(point.clone(), radius, rocks),
      referencePush(point.clone(), radius, rocks),
    );
    const direction = new THREE.Vector3(
      random() - 0.5,
      random() - 0.5,
      random() - 0.5,
    );
    close(
      steerFromStaticSpheres(direction.clone(), point, radius + 4, rocks),
      referenceSteer(direction.clone(), point, radius + 4, rocks),
    );
    assert.equal(
      overlapsStaticSpheres(point, radius, rocks, 1e-8),
      rocks.some(
        (rock) =>
          point.distanceToSquared(rock) < (rock.radius + radius) ** 2 - 1e-8,
      ),
    );
  }
});

test("layered overlap preserves the existing squared inset and height rejection", () => {
  const rocks = [{ x: 0, y: -100, z: 0, radius: 4 }];
  const near = new THREE.Vector3(Math.sqrt(36 - 5e-9), -100, 0);
  assert.equal(overlapsStaticSpheres(near, 2, rocks), true);
  assert.equal(overlapsStaticSpheres(near, 2, rocks, 1e-8), false);
  assert.equal(
    overlapsStaticSpheres(new THREE.Vector3(0, 100, 0), 2, rocks),
    false,
  );
});

test("disposed or replaced static arrays do not retain the old habitat", () => {
  const old = [{ x: 0, y: 0, z: 0, radius: 10 }];
  const point = new THREE.Vector3(1, 0, 0);
  assert.equal(overlapsStaticSpheres(point, 1, old), true);
  old.length = 0;
  assert.equal(overlapsStaticSpheres(point, 1, old), false);
  const replacement = [{ x: 200, y: 0, z: 0, radius: 2 }];
  assert.equal(overlapsStaticSpheres(point, 1, replacement), false);
  assert.equal(
    overlapsStaticSpheres(new THREE.Vector3(200, 0, 0), 1, replacement),
    true,
  );
  assert.equal(
    overlapsStaticSpheres(point, 1, [{ x: 0, y: 0, z: 0, radius: 10 }]),
    true,
  );
});
