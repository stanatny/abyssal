import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import {
  marianaPitPoint,
  marianaPitFrame,
  marianaPitRim,
} from "../src/mariana_pit_profile.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";
import { MARIANA_WORLD as W } from "../src/mariana_config.js";

function walls(ocean) {
  const meshes = [];
  ocean.root.traverse((n) => {
    if (n.userData.pitSector) meshes.push(n);
  });
  return meshes;
}

test("Irregular pit walls are closed outward solids with matched depth seams and bounded contacts", () => {
  const scene = new THREE.Scene(),
    ocean = createMarianaOcean(scene);
  try {
    const meshes = walls(ocean);
    assert.equal(meshes.length, 64);
    assert.ok(ocean.colliders.length < 45000);
    for (const mesh of meshes) {
      assert.equal(mesh.material.side, THREE.FrontSide);
      const geo = mesh.geometry,
        p = geo.attributes.position,
        edges = new Map();
      let volume = 0;
      const key = (i) => [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      for (let t = 0; t < geo.index.count; t += 3) {
        const ids = [0, 1, 2].map((k) => geo.index.getX(t + k)),
          [a, b, c] = ids.map((i) =>
            new THREE.Vector3().fromBufferAttribute(p, i),
          );
        const normal = b.clone().sub(a).cross(c.clone().sub(a));
        assert.ok(normal.lengthSq() > 1e-8, mesh.name);
        volume += a.dot(b.clone().cross(c)) / 6;
        for (let j = 0; j < 3; j++) {
          const from = key(ids[j]),
            to = key(ids[(j + 1) % 3]),
            k = [from, to].sort().join("|"),
            e = edges.get(k) || { count: 0, direction: 0 };
          e.count++;
          e.direction += from < to ? 1 : -1;
          edges.set(k, e);
        }
      }
      assert.ok(volume > 0, `${mesh.name} outward volume`);
      for (const e of edges.values()) {
        assert.equal(e.count, 2, `${mesh.name} closed`);
        assert.equal(e.direction, 0, `${mesh.name} face winding`);
      }
    }
    for (let section = 1; section < 16; section++)
      for (let i = 0; i < 144; i++) {
        const a = (i * Math.PI * 2) / 144,
          y = -section * 180,
          [x, z] = marianaPitPoint(a, y),
          frame = marianaPitFrame(y),
          direction = new THREE.Vector3(
            x - frame.x,
            0,
            z - frame.z,
          ).normalize();
        const ray = new THREE.Raycaster(
          new THREE.Vector3(frame.x, y, frame.z),
          direction,
          0,
          800,
        );
        scene.updateMatrixWorld(true);
        const hits = ray.intersectObjects(meshes, false);
        assert.ok(hits.length, "No open depth seam");
        assert.ok(
          Math.abs(hits[0].distance - Math.hypot(x - frame.x, z - frame.z)) <
            0.1,
          "Actual wall reaches shared contour",
        );
      }
  } finally {
    ocean.dispose();
  }
});

test("Pit cross sections surround deep water with curved fronts, asymmetric lobes and supported entrance relief", () => {
  const scene = new THREE.Scene(),
    ocean = createMarianaOcean(scene);
  try {
    scene.updateMatrixWorld(true);
    const meshes = walls(ocean),
      ray = new THREE.Raycaster();
    for (const y of [-220, -525, -900, -1275, -1740, -2450]) {
      const f = marianaPitFrame(y),
        distances = [];
      for (let i = 0; i < 144; i++) {
        const angle = ((i + 0.5) * Math.PI * 2) / 144,
          [x, z] = marianaPitPoint(angle, y),
          direction = new THREE.Vector3(x - f.x, 0, z - f.z).normalize();
        ray.set(new THREE.Vector3(f.x, y, f.z), direction);
        ray.far = 800;
        const hit = ray.intersectObjects(meshes, false)[0];
        assert.ok(hit, `Closed front/side/back at ${y}/${i}`);
        assert.ok(
          Math.abs(hit.distance - Math.hypot(x - f.x, z - f.z)) < 3,
          "Rendered contour follows irregular pit",
        );
        distances.push(hit.distance);
        assert.ok(
          ocean.heightAt(x * 0.8, f.z + (z - f.z) * 0.8) < y - 12,
          "Actual lowest floor permits interior depth",
        );
        assert.ok(
          isPositionBlocked(hit.point.clone().addScaledVector(direction, 2), {
            colliders: ocean.colliders,
            radius: 1,
          }),
          "Visible rock is solid",
        );
      }
      assert.ok(
        Math.max(...distances) - Math.min(...distances) > 40,
        "Asymmetric shape",
      );
    }
    const front = [];
    for (let i = 0; i < 48; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 96;
      front.push(marianaPitPoint(a, -220)[1]);
    }
    assert.ok(
      Math.max(...front) - Math.min(...front) > 50,
      "Front is not a flat plane",
    );
    assert.ok(
      Math.abs(
        marianaPitPoint(Math.PI / 2, -220)[1] -
          marianaPitPoint(Math.PI / 2, -900)[1],
      ) > 35,
      "Front changes with depth",
    );
    for (const a of [Math.PI / 3, Math.PI / 2, (Math.PI * 2) / 3]) {
      const y = marianaPitRim(a),
        [x, z] = marianaPitPoint(a, y),
        f = marianaPitFrame(y),
        outside = new THREE.Vector3(x - f.x, 0, z - f.z)
          .normalize()
          .multiplyScalar(5);
      ray.set(
        new THREE.Vector3(x + outside.x, 20, z + outside.z),
        new THREE.Vector3(0, -1, 0),
      );
      ray.far = 350;
      const hit = ray.intersectObjects(meshes, false)[0];
      assert.ok(hit, "Rendered sloped entrance cap");
      assert.ok(hit.point.y > -180 && hit.point.y < -90);
    }
  } finally {
    ocean.dispose();
  }
});

test("Nursery-to-pit route and reverse remain open for a 32m body with actual floor projection", () => {
  const ocean = createMarianaOcean(new THREE.Scene()),
    route = [
      [0, -18, 75],
      [0, -75, -140],
      [0, -130, -280],
      [125, -130, -390],
      [125, -235, -390],
    ];
  try {
    const r = bodyRadius(32),
      bounds = {
        minX: W.minX + 5,
        maxX: W.maxX - 5,
        minZ: W.minZ + 5,
        maxZ: W.maxZ - 5,
        minY: -W.maxDepth,
        maxY: 4,
      };
    for (const path of [route, [...route].reverse()])
      for (let i = 1; i < path.length; i++) {
        const a = new THREE.Vector3(...path[i - 1]),
          b = new THREE.Vector3(...path[i]),
          forward = b.clone().sub(a).normalize(),
          result = resolveMotion(a, b, {
            colliders: ocean.colliders,
            length: 32,
            radius: r,
            forward,
            bounds,
            floorHeight: (x, z) => ocean.heightAt(x, z) + r,
          });
        assert.equal(
          result.blocked,
          false,
          JSON.stringify(result.contacts.map((c) => c.collider?.id)),
        );
        assert.equal(result.stuck, false);
        assert.ok(
          b.distanceTo(
            new THREE.Vector3(
              result.position.x,
              result.position.y,
              result.position.z,
            ),
          ) < 0.002,
        );
      }
  } finally {
    ocean.dispose();
  }
});
