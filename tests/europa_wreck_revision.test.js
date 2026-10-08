import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createEuropaResearchWreckSteps,
  EUROPA_WRECK_SITE,
} from "../src/europa_research_wreck.js";
import { europaSeabedHeight } from "../src/europa_config.js";
import { createEuropaOcean } from "../src/europa_ocean.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";

function wreck() {
  const parent = new THREE.Group(),
    resources = new Set(),
    labels = [];
  const builder = createEuropaResearchWreckSteps(parent, {
    heightAt: europaSeabedHeight,
    keep: (resource) => (resources.add(resource), resource),
    time: { value: 0 },
  });
  let result;
  do {
    result = builder.next();
    if (!result.done) labels.push(result.value);
  } while (!result.done);
  parent.updateMatrixWorld(true);
  return {
    parent,
    ...result.value,
    labels,
    resources,
    dispose() {
      for (const resource of resources) resource.dispose();
    },
  };
}

test("Enlarged research wreck preserves staged ownership and four differentiated unpowered rooms", () => {
  const w = wreck();
  try {
    assert.equal(EUROPA_WRECK_SITE.scale, 2.2);
    assert.deepEqual(EUROPA_WRECK_SITE.gallery, {
      width: 79.2,
      height: 66,
      length: 184.8,
    });
    assert.deepEqual(w.root.scale.toArray(), [2.2, 2.2, 2.2]);
    assert.equal(w.root.position.x, 145);
    assert.deepEqual(w.labels, [
      "research-pressure-hull",
      "research-gallery",
      "research-hardware",
      "research-debris",
    ]);
    assert.deepEqual(
      w.rooms.map((room) => room.id),
      ["command", "wet_laboratory", "living_quarters", "engineering"],
    );
    for (const name of [
      "wreck_damaged_command_and_communications",
      "wreck_wet_sampling_laboratory",
      "wreck_empty_living_quarters",
      "wreck_pressure_engineering_service",
    ])
      assert.ok(w.root.getObjectByName(name)?.children.length >= 4);
    const roomPositions = w.rooms.map(
      (room) => w.root.worldToLocal(room.position.clone()).z,
    );
    assert.ok(
      roomPositions[1] - roomPositions[0] > 15 &&
        roomPositions[2] - roomPositions[1] > 15,
    );
    w.parent.traverse((node) => {
      if (!node.isMesh) return;
      assert.ok(w.resources.has(node.geometry));
      assert.ok(w.resources.has(node.material));
      assert.equal(node.material.transparent, false);
      if (
        node.material.emissiveIntensity > 0 &&
        node.material.emissive.getHex() !== 0
      )
        assert.ok(
          node.material.emissiveIntensity <= 0.16,
          "only restrained existing colony glow is allowed",
        );
    });
    assert.equal(w.lightSources.length, 1);
    assert.equal(w.lightSources[0].intensity, 38);
    assert.ok(Math.abs(w.root.userData.centralClearWidth - 39.38) < 1e-8);
  } finally {
    w.dispose();
  }
});

test("Scaled hull, foot disks and debris remain supported across their complete rendered footprints", () => {
  const w = wreck();
  const point = new THREE.Vector3();
  try {
    let minHull = Infinity;
    w.root.getObjectByName("wreck_pressure_hull").traverse((mesh) => {
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        const gap = point.y - europaSeabedHeight(point.x, point.z);
        minHull = Math.min(minHull, gap);
        assert.ok(gap >= -0.01, `hull penetrated terrain by ${-gap}`);
      }
    });
    assert.ok(
      minHull < 2,
      "support must not lift the entire floor needlessly far off the seabed",
    );
    const feet = w.parent.children.filter(
      (part) => part.name === "research_wreck_terrain_foot",
    );
    assert.equal(feet.length, 4);
    for (const foot of feet) {
      const p = foot.geometry.attributes.position;
      let minGap = Infinity;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) > -0.7) continue;
        point.fromBufferAttribute(p, i).applyMatrix4(foot.matrixWorld);
        const gap = point.y - europaSeabedHeight(point.x, point.z);
        assert.ok(gap > -0.01);
        minGap = Math.min(minGap, gap);
      }
      assert.ok(
        minGap < 0.15,
        "each full disk footprint needs a terrain contact",
      );
    }
    const debris = w.parent.getObjectByName("europa_research_debris");
    for (const mesh of debris.children) {
      for (const x of [-0.5, 0, 0.5])
        for (const z of [-0.5, 0, 0.5]) {
          point.set(x, -0.5, z).applyMatrix4(mesh.matrixWorld);
          assert.ok(point.y >= europaSeabedHeight(point.x, point.z) - 0.01);
        }
    }
  } finally {
    w.dispose();
  }
});

test("Every local structural solid uses the same full scaled transform as the visible fittings", () => {
  const w = wreck();
  try {
    const solids = w.root.userData.localSolids;
    const boxes = w.colliders.filter((solid) => solid.type === "box");
    const capsules = w.colliders.filter((solid) => solid.type === "capsule");
    assert.equal(boxes.length, solids.filter((solid) => !solid.a).length);
    assert.equal(capsules.length, solids.filter((solid) => solid.a).length);
    let boxIndex = 0,
      rodIndex = 0;
    for (const solid of solids) {
      if (solid.a) {
        const collider = capsules[rodIndex++];
        assert.ok(
          collider.a.distanceTo(
            solid.a.clone().applyMatrix4(w.root.matrixWorld),
          ) < 1e-8,
        );
        assert.ok(
          collider.b.distanceTo(
            solid.b.clone().applyMatrix4(w.root.matrixWorld),
          ) < 1e-8,
        );
        assert.ok(Math.abs(collider.radius - solid.radius * 2.2) < 1e-8);
      } else {
        const collider = boxes[boxIndex++];
        const center = new THREE.Vector3(...solid.p).applyMatrix4(
          w.root.matrixWorld,
        );
        assert.ok(
          center.distanceTo(
            new THREE.Vector3(collider.x, collider.y, collider.z),
          ) < 1e-8,
        );
        assert.ok(
          collider.halfSize.distanceTo(
            new THREE.Vector3(...solid.sizes).multiplyScalar(1.1),
          ) < 1e-8,
        );
        assert.ok(
          collider.rotation.angleTo(
            w.root.quaternion.clone().multiply(solid.q),
          ) < 1e-7,
        );
      }
    }
    assert.ok(
      w.colliders
        .find((solid) => solid.id === "europa_wreck_dish")
        .axes.distanceTo(new THREE.Vector3(17.6, 2.64, 17.6)) < 1e-8,
    );
  } finally {
    w.dispose();
  }
});

test("Both open ends and side breach admit 32 m full bodies with actual regional solids, and rooms allow turns", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    for (const route of ocean.researchWreck.routes)
      for (const length of route.bodyLengths)
        for (const reverse of [false, true]) {
          const points = reverse ? [...route.points].reverse() : route.points;
          for (let s = 1; s < points.length; s++) {
            const from = points[s - 1],
              to = points[s],
              forward = to.clone().sub(from).normalize();
            let previous = from;
            for (let step = 1; step <= 90; step++) {
              const desired = from.clone().lerp(to, step / 90);
              const result = resolveMotion(previous, desired, {
                colliders: ocean.colliders,
                radius: bodyRadius(length),
                length,
                forward,
                floorHeight: (x, z) =>
                  ocean.heightAt(x, z) + bodyRadius(length) + 0.4,
              });
              assert.equal(result.stuck, false);
              assert.equal(result.contacts.length, 0, route.id);
              assert.ok(
                new THREE.Vector3(
                  result.position.x,
                  result.position.y,
                  result.position.z,
                ).distanceTo(desired) < 0.01,
              );
              previous = result.position;
            }
          }
        }
    for (const room of ocean.researchWreck.rooms)
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
        assert.equal(
          isPositionBlocked(room.position, {
            colliders: ocean.colliders,
            radius: bodyRadius(32),
            length: 32,
            forward: new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)),
          }),
          false,
          `${room.id} turning ${angle}`,
        );
      }
    const wall = ocean.researchWreck.colliders.find(
      (solid) => solid.type === "box",
    );
    assert.equal(
      isPositionBlocked(wall, { colliders: ocean.colliders, radius: 0.65 }),
      true,
    );
  } finally {
    ocean.dispose();
  }
});

test("Four compartments have physical bulkheads and a separate service loop with valid turns", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  const w = ocean.researchWreck;
  const at = (x, y, z) =>
    new THREE.Vector3(x, y, z).applyMatrix4(w.root.matrixWorld);
  try {
    assert.deepEqual(w.root.userData.bulkheadZ, [-20, 2, 23]);
    for (const z of w.root.userData.bulkheadZ) {
      for (const x of [-13.7, 9.7])
        assert.equal(
          isPositionBlocked(at(x, 20.8, z), {
            colliders: w.colliders,
            radius: 0.65,
          }),
          true,
        );
      for (const x of [0, 14])
        assert.equal(
          isPositionBlocked(at(x, x ? 22.5 : 21, z), {
            colliders: w.colliders,
            radius: bodyRadius(x ? 16 : 32),
          }),
          false,
        );
    }
    // 侧道隔墙真实阻挡横穿；仅首尾舱的两个门洞可以进入侧道。
    for (const z of [-12, 12])
      assert.equal(
        isPositionBlocked(at(9.4, 22.5, z), {
          colliders: w.colliders,
          radius: 0.65,
        }),
        true,
      );
    for (const z of [-31, 33])
      assert.equal(
        isPositionBlocked(at(9.4, 22.5, z), {
          colliders: w.colliders,
          radius: bodyRadius(16),
        }),
        false,
      );
    const loop = w.routes.find(
      (route) => route.id === "starboard_service_loop",
    );
    assert.deepEqual(loop.bodyLengths, [10, 16]);
    assert.equal(loop.points[0].distanceTo(loop.points.at(-1)), 0);
    for (const point of loop.points)
      for (const length of loop.bodyLengths)
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 24)
          assert.equal(
            isPositionBlocked(point, {
              colliders: ocean.colliders,
              radius: bodyRadius(length),
              length,
              forward: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
            }),
            false,
            `${length} m side-loop turn at ${point.toArray()}`,
          );
    const bounds = new THREE.Box3().setFromObject(w.root);
    assert.ok(bounds.min.x >= -300 && bounds.max.x <= 300);
    const hullBounds = new THREE.Box3().setFromObject(
      w.root.getObjectByName("wreck_pressure_hull"),
    );
    assert.ok(Math.abs(hullBounds.max.x - hullBounds.min.x - 184.8) < 0.1);
  } finally {
    ocean.dispose();
  }
});

test("Adult breach approach bends continuously into the laboratory turning bay", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    const wreck = ocean.researchWreck;
    const route = wreck.routes.find((route) => route.id === "starboard_breach");
    const localEnd = wreck.root.worldToLocal(route.points.at(-1).clone());
    assert.ok(localEnd.distanceTo(new THREE.Vector3(0, 21, -9)) < 1e-8);
    // 连续曲线保留进入破口后转向上方中央舱室的弯道，不能靠分段瞬移航向证明通行。
    for (const reverse of [false, true]) {
      const points = reverse ? [...route.points].reverse() : route.points;
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      let previous = curve.getPoint(0);
      for (let step = 1; step <= 360; step++) {
        const fraction = step / 360;
        const desired = curve.getPoint(fraction);
        const result = resolveMotion(previous, desired, {
          colliders: ocean.colliders,
          radius: bodyRadius(32),
          length: 32,
          forward: curve.getTangent(fraction),
          floorHeight: (x, z) => ocean.heightAt(x, z) + bodyRadius(32) + 0.4,
        });
        assert.equal(result.stuck, false);
        assert.equal(
          result.contacts.length,
          0,
          `breach bend ${reverse}:${step}`,
        );
        assert.ok(
          new THREE.Vector3(
            result.position.x,
            result.position.y,
            result.position.z,
          ).distanceTo(desired) < 0.01,
        );
        previous = result.position;
      }
    }
    // 中央转身湾连同四米位置误差都要容纳三维转身，不再以低位入口作为掉头终点。
    const end = route.points.at(-1);
    for (const offset of [
      new THREE.Vector3(),
      ...[0, 1, 2].flatMap((axis) =>
        [-4, 4].map((value) => new THREE.Vector3().setComponent(axis, value)),
      ),
    ])
      for (
        let pitch = -Math.PI / 2;
        pitch <= Math.PI / 2;
        pitch += Math.PI / 12
      )
        for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 12)
          assert.equal(
            isPositionBlocked(end.clone().add(offset), {
              colliders: ocean.colliders,
              radius: bodyRadius(32),
              length: 32,
              forward: new THREE.Vector3(
                Math.cos(pitch) * Math.sin(yaw),
                Math.sin(pitch),
                Math.cos(pitch) * Math.cos(yaw),
              ),
            }),
            false,
            `turning bay offset ${offset.toArray()} pitch ${pitch} yaw ${yaw}`,
          );
  } finally {
    ocean.dispose();
  }
});

test("Raised service deck leaves adult pitch-recovery space above the low breach", () => {
  const w = wreck();
  try {
    for (const x of [6, 9, 12])
      for (const y of [10.5, 12, 13.5])
        for (const pitch of [-Math.PI / 12, 0, Math.PI / 12]) {
          const position = new THREE.Vector3(x, y, -0.8).applyMatrix4(
            w.root.matrixWorld,
          );
          const forward = new THREE.Vector3(
            Math.cos(pitch),
            Math.sin(pitch),
            0,
          ).applyQuaternion(w.root.quaternion);
          assert.equal(
            isPositionBlocked(position, {
              colliders: w.colliders,
              radius: bodyRadius(32),
              length: 32,
              forward,
            }),
            false,
            `adult recovery ${x},${y},${pitch}`,
          );
        }
    const deck = w.root.userData.localSolids.find(
      (solid) => solid.p?.[0] === 13.9 && solid.sizes?.[1] === 0.7,
    );
    assert.equal(deck.p[1], 18.5);
    assert.equal(w.root.userData.serviceLoopRoute.length, 7);
  } finally {
    w.dispose();
  }
});
