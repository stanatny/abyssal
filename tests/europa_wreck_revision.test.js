import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createEuropaResearchWreckSteps,
  EUROPA_WRECK_SITE,
} from "../src/europa_research_wreck.js";
import { europaSeabedHeight, EUROPA_WORLD } from "../src/europa_config.js";
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

test("Enlarged research wreck preserves staged ownership and six differentiated unpowered rooms", () => {
  const w = wreck();
  try {
    assert.equal(EUROPA_WRECK_SITE.scale, 3);
    assert.deepEqual(EUROPA_WRECK_SITE.gallery, {
      width: 188.25,
      height: 119.25,
      length: 489.6,
    });
    assert.deepEqual(w.root.scale.toArray(), [3, 3, 3]);
    assert.equal(w.root.position.x, EUROPA_WRECK_SITE.x);
    assert.deepEqual(w.labels, [
      "research-pressure-hull",
      "research-gallery",
      "research-hardware",
      "research-debris",
    ]);
    assert.deepEqual(
      w.rooms.map((room) => room.id),
      [
        "sample_archive",
        "command",
        "wet_laboratory",
        "living_quarters",
        "engineering",
        "probe_hangar",
      ],
    );
    for (const name of [
      "wreck_sample_archive",
      "wreck_unmanned_probe_hangar",
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
      if (!node.userData.sharedEuropaScenery) {
        assert.ok(w.resources.has(node.geometry));
        assert.ok(w.resources.has(node.material));
      }
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
    assert.ok(Math.abs(w.root.userData.centralClearWidth - 53.1) < 1e-8);
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
        assert.ok(Math.abs(collider.radius - solid.radius * 3) < 1e-8);
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
            new THREE.Vector3(...solid.sizes).multiplyScalar(1.5),
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
        .axes.distanceTo(new THREE.Vector3(24, 3.6, 24)) < 1e-8,
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

test("Six compartments have physical bulkheads and a separate service loop with valid turns", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  const w = ocean.researchWreck;
  const at = (x, y, z) =>
    new THREE.Vector3(x, y, z).applyMatrix4(w.root.matrixWorld);
  try {
    assert.deepEqual(
      w.root.userData.bulkheadZ,
      [-42, -20, 2, 23, 42].map((z) => z * 1.2),
    );
    for (const [index, z] of w.root.userData.bulkheadZ.entries()) {
      for (const x of [-26.7, 22.7])
        assert.equal(
          isPositionBlocked(at(x, 30.5, z), {
            colliders: w.colliders,
            radius: 0.65,
          }),
          true,
        );
      for (const x of [w.root.userData.doorwayX[index], 27])
        assert.equal(
          isPositionBlocked(at(x, x === 27 ? 30.5 : 21, z), {
            colliders: w.colliders,
            radius: bodyRadius(x === 27 ? 16 : 32),
          }),
          false,
        );
    }
    // 侧道隔墙真实阻挡横穿；仅首尾舱的两个门洞可以进入侧道。
    for (const z of [-12, 12])
      assert.equal(
        isPositionBlocked(at(22.4, 30.5, z), {
          colliders: w.colliders,
          radius: 0.65,
        }),
        true,
      );
    for (const z of [-66, 66])
      assert.equal(
        isPositionBlocked(at(22.4, 30.5, z), {
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
    assert.ok(
      bounds.min.x >= EUROPA_WORLD.minX && bounds.max.x <= EUROPA_WORLD.maxX,
    );
    const hullBounds = new THREE.Box3().setFromObject(
      w.root.getObjectByName("wreck_pressure_hull"),
    );
    assert.ok(Math.abs(hullBounds.max.x - hullBounds.min.x - 489.6) < 0.1);
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
    assert.ok(localEnd.distanceTo(new THREE.Vector3(0, 21, -10.8)) < 1e-8);
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
      (solid) => solid.p?.[0] === 26.9 && solid.sizes?.[1] === 0.7,
    );
    assert.equal(deck.p[1], 26.5);
    assert.ok(w.root.userData.serviceLoopRoute.length > 7);
  } finally {
    w.dispose();
  }
});

test("The extended rooms remain free of external ledges across their whole interior", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    const w = ocean.researchWreck;
    const own = new Set(w.colliders);
    const external = ocean.colliders.filter((c) => !own.has(c));
    for (let x = -30; x <= 30; x += 4)
      for (let y = 7; y <= 39; y += 4)
        for (let z = -80; z <= 80; z += 5) {
          const p = w.root.localToWorld(new THREE.Vector3(x, y, z));
          assert.equal(
            isPositionBlocked(p, { colliders: external, radius: 0.25 }),
            false,
            `outside rock inside cabin at ${x},${y},${z}`,
          );
        }
  } finally {
    ocean.dispose();
  }
});

test("Europa local illumination crosses source ranges without changing the shader light count", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    const lamps = [];
    ocean.root.traverse((n) => {
      if (n.isPointLight) lamps.push(n);
    });
    assert.equal(lamps.length, 3);
    const identities = lamps.map((n) => n.uuid);
    const locations = [
      new THREE.Vector3(0, 10000, 0),
      ...ocean.lightSources.flatMap((source) => [
        source.position.clone().add(new THREE.Vector3(101, 0, 0)),
        source.position.clone(),
        source.position.clone().add(new THREE.Vector3(-101, 0, 0)),
      ]),
      new THREE.Vector3(0, 10000, 0),
    ];
    for (const [i, p] of locations.entries()) {
      ocean.update(i / 60, p, 1 / 60, i % 2 === 0);
      assert.deepEqual(
        lamps.map((n) => n.uuid),
        identities,
      );
      assert.ok(
        lamps.every((n) => n.visible),
        "visible light count must remain fixed",
      );
      const nearest = [...ocean.lightSources].sort(
        (a, b) =>
          a.position.distanceToSquared(p) - b.position.distanceToSquared(p),
      );
      for (const [k, lamp] of lamps.entries()) {
        assert.equal(
          lamp.intensity,
          nearest[k]?.position.distanceTo(p) < 100 ? nearest[k].intensity : 0,
        );
      }
    }
  } finally {
    ocean.dispose();
  }
});

test("Staggered pressure doors block end-to-end views while adults follow continuous bends", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    const w = ocean.researchWreck;
    w.root.updateWorldMatrix(true, true);
    for (const reverse of [false, true]) {
      const points = reverse ? [...w.route].reverse() : w.route;
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      let previous = curve.getPoint(0);
      for (let i = 1; i <= 1200; i++) {
        const desired = curve.getPoint(i / 1200);
        const result = resolveMotion(previous, desired, {
          colliders: ocean.colliders,
          radius: bodyRadius(32),
          length: 32,
          forward: curve.getTangent(i / 1200),
          floorHeight: (x, z) => ocean.heightAt(x, z) + bodyRadius(32) + 0.4,
        });
        assert.equal(result.contacts.length, 0, `continuous ${reverse}:${i}`);
        assert.equal(result.stuck, false);
        previous = result.position;
      }
      for (const x of [-15, 0, 15])
        for (const y of [10, 20, 30]) {
          const a = w.root.localToWorld(
            new THREE.Vector3(x, y, reverse ? -74 : 74),
          );
          const b = w.root.localToWorld(
            new THREE.Vector3(-x, y, reverse ? 74 : -74),
          );
          const ray = new THREE.Raycaster(
            a,
            b.clone().sub(a).normalize(),
            0,
            a.distanceTo(b),
          );
          const hit = ray.intersectObject(
            w.root.getObjectByName("wreck_room_bulkheads"),
            true,
          )[0];
          assert.ok(
            hit && hit.distance < a.distanceTo(b) * 0.55,
            "real opaque walls interrupt the view",
          );
        }
    }
  } finally {
    ocean.dispose();
  }
});

test("Pressure-frame joints have a single visible surface rather than coplanar overlapping faces", () => {
  const w = wreck();
  try {
    const ray = new THREE.Raycaster();
    for (const [i, z] of w.root.userData.bulkheadZ.entries()) {
      const door = w.root.userData.doorwayX[i];
      const samples = [
        ...[-30.57, 30.57].map((x) => [[x, 14, z - 4], [0, 0, 1], 15]),
        ...[-0.4, 0, 0.4].flatMap((dz) =>
          [-1, 1].map((side) => [[door, 14, z + dz], [side, 0, 0], 40]),
        ),
      ];
      for (const [p, d, far] of samples) {
        ray.set(
          w.root.localToWorld(new THREE.Vector3(...p)),
          new THREE.Vector3(...d).applyQuaternion(w.root.quaternion),
        );
        ray.far = far;
        const hits = ray.intersectObject(w.root, true);
        assert.ok(hits.length);
        for (let j = 1; j < hits.length; j++)
          if (hits[j - 1].face.normal.dot(hits[j].face.normal) > 0.99)
            assert.ok(
              Math.abs(hits[j - 1].distance - hits[j].distance) > 1e-5,
              `coplanar pressure face ${i}:${p}`,
            );
      }
    }
  } finally {
    w.dispose();
  }
});
