import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import * as THREE from "three";
import { createShips } from "../src/ships.js";
import { createAtlantisFleet } from "../src/atlantis_surface.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import { bodyClearOfHull } from "../src/surface_ship_impact.js";
import {
  createImpactState,
  createSubmarineState,
  HUMAN_RULES,
  stepImpact,
  stepSubmarineImpact,
} from "../src/human_rules.js";

const factories = [
  ["Hawaii", createShips, [3, 3, 1]],
  ["Atlantis", createAtlantisFleet, [1, 1, 1]],
];

const originalDocument = globalThis.document;
before(() => {
  // 仅提供现有帆布纹理所需接口；图形质量仍由实际浏览器检查。
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        createRadialGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };
});
after(() => {
  globalThis.document = originalDocument;
});

function attack(fleet, ship, now, { length = 18, speed = 30, y = -0.3 } = {}) {
  const previous = ship.root.localToWorld(
    new THREE.Vector3(-ship.width / 2 - 30, y, 0),
  );
  const desired = ship.root.localToWorld(new THREE.Vector3(0, y, 0));
  const forward = desired.clone().sub(previous).normalize();
  const player = { length, elapsed: now };
  const contacts = fleet.onMovement(player, previous, desired, forward, {
    speed,
    now,
  });
  return { contacts, previous, desired, forward, player };
}

function resourcesBelow(root) {
  const resources = new Set();
  root.traverse((node) => {
    if (node.geometry) resources.add(node.geometry);
    if (node.material) {
      resources.add(node.material);
      if (node.material.map) resources.add(node.material.map);
    }
  });
  return resources;
}

test("Shared 18 m / 20 m/s impact threshold rejects undersize, slow, non-finite and held contact", () => {
  assert.equal(HUMAN_RULES.impactLength, 18);
  for (const extra of [
    { length: 17.999 },
    { speed: 19.999 },
    { length: NaN },
    { speed: Infinity },
    { now: NaN },
  ]) {
    const state = createImpactState(3);
    const input = { touching: true, length: 18, speed: 20, now: 1, ...extra };
    assert.equal(stepImpact(state, input).hit, false);
    assert.equal(state.health, 3);
    assert.equal(
      stepImpact(state, { touching: true, length: 18, speed: 30, now: 3 }).hit,
      false,
    );
    assert.equal(
      stepImpact(state, {
        touching: true,
        clear: true,
        length: 18,
        speed: 20,
        now: 4,
      }).hit,
      true,
    );
    assert.equal(state.health, 2);
  }
  const state = createImpactState(3);
  const impact = (now, clear = false) =>
    stepImpact(state, { touching: true, clear, length: 18, speed: 20, now });
  assert.equal(impact(1).hit, true);
  assert.equal(impact(20).hit, false);
  assert.equal(impact(20, true).hit, true);
  assert.equal(impact(20.1, true).hit, false);
  assert.equal(impact(21).hit, false);
  assert.equal(impact(22, true).destroyed, true);
  assert.equal(impact(25, true).hit, false);
});

test("Shared full-body clearance keeps submarine pressure locked after cooldown and does not mutate inputs", () => {
  const length = 18;
  const radius = bodyRadius(length);
  const hull = {
    type: "capsule",
    a: { x: 0, y: 0, z: -6.2 },
    b: { x: 0, y: 0, z: 6.2 },
    radius: 2.8,
  };
  const forward = new THREE.Vector3(1, 0, 0);
  const previous = new THREE.Vector3(-25, 0, 0);
  const desired = new THREE.Vector3(0, 0, 0);
  const resolved = resolveMotion(previous, desired, {
    colliders: [hull],
    radius,
    length,
    forward,
  });
  const held = resolved.position;
  const inputSnapshot = JSON.stringify({ held, forward, hull });
  // 旧检查沿轴向缩短首尾采样，贴壳点会错误地被判断为已离开。
  assert.equal(
    isPositionBlocked(held, {
      colliders: [hull],
      radius: radius + 4,
      length,
      forward,
    }),
    false,
  );
  assert.equal(bodyClearOfHull(held, forward, length, radius, hull), false);
  assert.equal(bodyClearOfHull(held, forward, length, radius, [hull]), false);
  assert.equal(JSON.stringify({ held, forward, hull }), inputSnapshot);
  const state = createSubmarineState();
  assert.equal(
    stepSubmarineImpact(state, { touching: true, speed: 30, length, now: 1 })
      .hit,
    true,
  );
  for (const now of [1.8, 2, 4, 10]) {
    assert.equal(
      stepSubmarineImpact(state, {
        touching: true,
        clear: bodyClearOfHull(held, forward, length, radius, hull),
        speed: 30,
        length,
        now,
      }).hit,
      false,
    );
    assert.equal(state.health, 2);
  }
  assert.equal(bodyClearOfHull(previous, forward, length, radius, hull), true);
  assert.equal(
    stepSubmarineImpact(state, {
      touching: true,
      clear: bodyClearOfHull(previous, forward, length, radius, hull),
      speed: 30,
      length,
      now: 11,
    }).hit,
    true,
  );
});

for (const [region, createFleet, expected] of factories) {
  test(`${region}: ineffective hull contact reports once until the complete body clears`, () => {
    const scene = new THREE.Scene();
    const notices = [];
    const fleet = createFleet(scene, {
      onContact: (notice) => notices.push(notice),
    });
    const ship = fleet.ships[0];
    const player = { length: 17 };
    let position = ship.root.localToWorld(
      new THREE.Vector3(-ship.width / 2 - 25, -0.3, 0),
    );
    const forward = ship.root
      .localToWorld(new THREE.Vector3(0, -0.3, 0))
      .sub(position)
      .normalize();
    try {
      for (let frame = 0; frame < 120; frame++) {
        const desired = position.clone().addScaledVector(forward, 0.5);
        assert.equal(
          fleet.onMovement(player, position, desired, forward, {
            speed: 30,
            now: frame / 60,
          }).length,
          0,
        );
        position.copy(
          resolveMotion(position, desired, {
            colliders: fleet.colliders,
            radius: bodyRadius(player.length),
            length: player.length,
            forward,
          }).position,
        );
      }
      assert.equal(notices.length, 1);
      assert.equal(notices[0].entry, ship);
      assert.equal(notices[0].requiredLength, 18);
      assert.equal(notices[0].requiredSpeed, 20);
      assert.equal(ship.state.health, ship.state.maxHealth);
      attack(fleet, ship, 3, { length: 17 });
      assert.equal(notices.length, 2);
    } finally {
      fleet.dispose();
    }
  });
  test(`${region}: default world sweep prevents impact through a real obstacle`, () => {
    const scene = new THREE.Scene();
    const worldColliders = [];
    const fleet = createFleet(scene, { worldColliders });
    const ship = fleet.ships[0];
    try {
      const wallPosition = ship.root.localToWorld(
        new THREE.Vector3(-ship.width / 2 - 15, -0.3, 0),
      );
      worldColliders.push({
        type: "box",
        ...wallPosition,
        halfSize: { x: 15, y: 15, z: 15 },
      });
      assert.equal(attack(fleet, ship, 1).contacts.length, 0);
      assert.equal(ship.state.health, ship.state.maxHealth);
      worldColliders.length = 0;
      assert.equal(
        attack(fleet, ship, 2).contacts.filter((event) => event.entry === ship)
          .length,
        1,
      );
    } finally {
      fleet.dispose();
    }
  });
  test(`${region}: original hulls take 1 / 3 independent hits; destruction removes only their colliders`, () => {
    const scene = new THREE.Scene();
    const events = [];
    const fleet = createFleet(scene, {
      onImpact: (event) => events.push(event),
    });
    const colliderIdentity = fleet.colliders;
    const originalStates = fleet.ships.map((ship) => ship.state);
    const originalColliders = [...fleet.colliders];
    try {
      assert.deepEqual(
        fleet.ships.map((ship) => ship.state.maxHealth),
        expected,
      );
      for (const ship of fleet.ships) {
        const previousCount = fleet.colliders.length;
        for (let hit = 0; hit < ship.state.maxHealth; hit++) {
          const now = 1 + events.length * 2;
          fleet.update(now);
          const stroke = attack(fleet, ship, now);
          const event = stroke.contacts.find((entry) => entry.entry === ship);
          assert.ok(event, `${ship.kind} hit ${hit + 1}`);
          assert.equal(event.health, ship.state.maxHealth - hit - 1);
          assert.equal(event.kind, "surface_ship");
          assert.ok(
            event.position.distanceTo(ship.root.position) < ship.length,
          );
          if (!event.destroyed) {
            const resolved = resolveMotion(stroke.previous, stroke.desired, {
              colliders: ship.colliders,
              radius: bodyRadius(stroke.player.length),
              length: stroke.player.length,
              forward: stroke.forward,
            });
            assert.equal(resolved.blocked, true);
            const point = new THREE.Vector3().copy(resolved.position);
            assert.equal(
              fleet.onMovement(stroke.player, point, point, stroke.forward, {
                speed: 30,
                now: now + 1,
              }).length,
              0,
            );
            assert.equal(ship.state.health, event.health);
          }
        }
        assert.equal(ship.state.destroyed, true);
        assert.equal(ship.collidable, false);
        assert.equal(ship.wake.visible, false);
        assert.equal(
          fleet.colliders.length,
          previousCount - ship.colliders.length,
        );
        assert.ok(
          ship.colliders.every(
            (collider) => !fleet.colliders.includes(collider),
          ),
        );
        assert.equal(attack(fleet, ship, 40).contacts.length, 0);
        fleet.update(ship.state.lastImpact + 0.8);
        assert.equal(ship.root.visible, true);
        assert.ok(ship.root.position.y < ship.impact.sinkPosition.y);
        assert.ok(
          Math.abs(ship.root.rotation.z - ship.impact.sinkRotation.z) > 0.01,
        );
        assert.equal(
          ship.impact.scars.filter((scar) => scar.visible).length,
          ship.state.maxHealth,
        );
        fleet.update(ship.state.lastImpact + 7);
        assert.equal(ship.root.visible, false);
        assert.equal(ship.impact.fx.visible, false);
      }
      assert.equal(
        events.length,
        expected.reduce((sum, hits) => sum + hits, 0),
      );
      assert.equal(fleet.colliders, colliderIdentity);
      fleet.reset();
      assert.equal(fleet.colliders, colliderIdentity);
      assert.deepEqual(fleet.colliders, originalColliders);
      for (const [index, ship] of fleet.ships.entries()) {
        assert.notEqual(ship.state, originalStates[index]);
        assert.equal(ship.state.health, expected[index]);
        assert.equal(ship.state.armed, true);
        assert.equal(ship.state.destroyed, false);
        assert.equal(ship.collidable, true);
        assert.equal(ship.root.visible, true);
        assert.equal(ship.wake.visible, true);
        assert.equal(ship.impact.fx.visible, false);
        assert.ok(ship.impact.scars.every((scar) => !scar.visible));
      }
    } finally {
      fleet.dispose();
    }
    assert.equal(scene.children.length, 0);
  });

  test(`${region}: real body sweep rejects walls, distant hulls, deck-only and outward contacts`, () => {
    const scene = new THREE.Scene();
    let wall = null;
    const fleet = createFleet(scene, {
      castWorld: () => wall,
    });
    const ship = fleet.ships[0];
    try {
      wall = { time: 0 };
      assert.equal(attack(fleet, ship, 1).contacts.length, 0);
      assert.equal(ship.state.health, ship.state.maxHealth);
      wall = null;
      const far = ship.root.localToWorld(new THREE.Vector3(-80, -0.3, 0));
      const farther = ship.root.localToWorld(new THREE.Vector3(-79, -0.3, 0));
      const forward = farther.clone().sub(far).normalize();
      assert.equal(
        fleet.onMovement({ length: 18 }, far, farther, forward, {
          speed: 30,
          now: 2,
        }).length,
        0,
      );
      assert.equal(attack(fleet, ship, 3, { y: 16 }).contacts.length, 0);
      const inside = ship.root.localToWorld(
        new THREE.Vector3(-ship.width * 0.45, -0.3, 0),
      );
      const outside = ship.root.localToWorld(new THREE.Vector3(-30, -0.3, 0));
      const outward = outside.clone().sub(inside).normalize();
      assert.equal(
        fleet.onMovement({ length: 18 }, inside, outside, outward, {
          speed: 30,
          now: 4,
        }).length,
        0,
      );
      assert.equal(
        attack(fleet, ship, 5, { length: 17.99 }).contacts.length,
        0,
      );
      // 接触时长不能让低速第一次接触升级为持续损伤，必须真正离开再接近。
      const stroke = attack(fleet, ship, 6, { speed: 19.99 });
      assert.equal(stroke.contacts.length, 0);
      assert.equal(
        fleet.onMovement(
          { length: 18 },
          stroke.desired,
          stroke.desired,
          stroke.forward,
          { speed: 30, now: 9 },
        ).length,
        0,
      );
      assert.equal(
        attack(fleet, ship, 10).contacts.filter((entry) => entry.entry === ship)
          .length,
        1,
      );
    } finally {
      fleet.dispose();
    }
  });

  test(`${region}: ship movement, impact feedback and sinking freeze at a fixed game clock`, () => {
    const scene = new THREE.Scene();
    const fleet = createFleet(scene);
    const ship = fleet.ships.at(-1);
    try {
      const initial = ship.root.position.clone();
      fleet.update(100);
      assert.ok(ship.root.position.distanceTo(initial) > 1);
      attack(fleet, ship, 100);
      fleet.update(100.6);
      const position = ship.root.position.clone();
      const rotation = ship.root.rotation.clone();
      const plume = ship.impact.curtains[0].matrix.clone();
      const opacity = ship.impact.waterMaterial.opacity;
      const fxPosition = ship.impact.fx.position.clone();
      for (let frame = 0; frame < 30; frame++) fleet.update(100.6);
      assert.ok(ship.root.position.equals(position));
      assert.ok(ship.root.rotation.equals(rotation));
      assert.ok(ship.impact.curtains[0].matrix.equals(plume));
      assert.equal(ship.impact.waterMaterial.opacity, opacity);
      assert.ok(ship.impact.fx.position.equals(fxPosition));
      fleet.update(108);
      assert.equal(ship.root.visible, false);
      assert.equal(ship.impact.fx.visible, false);
    } finally {
      fleet.dispose();
    }
  });

  for (const fps of [15, 30, 60, 144]) {
    test(`${region}: ${fps} FPS swept contact damages once while held by the physical solver`, () => {
      const scene = new THREE.Scene();
      const fleet = createFleet(scene);
      const ship = fleet.ships[0];
      const player = { length: 18 };
      let position = ship.root.localToWorld(
        new THREE.Vector3(-ship.width / 2 - 25, -0.3, 0),
      );
      const forward = ship.root
        .localToWorld(new THREE.Vector3(0, -0.3, 0))
        .sub(position)
        .normalize();
      let hits = 0;
      try {
        for (let frame = 0; frame < fps * 2; frame++) {
          const desired = position.clone().addScaledVector(forward, 30 / fps);
          hits += fleet
            .onMovement(player, position, desired, forward, {
              speed: 30,
              now: frame / fps,
            })
            .filter((event) => event.entry === ship).length;
          const resolved = resolveMotion(position, desired, {
            colliders: fleet.colliders,
            radius: bodyRadius(player.length),
            length: player.length,
            forward,
          });
          position.copy(resolved.position);
        }
        assert.equal(hits, 1);
        assert.equal(ship.state.health, ship.state.maxHealth - 1);
      } finally {
        fleet.dispose();
      }
    });
  }

  test(`${region}: repeated reset/map disposal removes owned FX and releases each resource once`, () => {
    const scene = new THREE.Scene();
    for (let cycle = 0; cycle < 4; cycle++) {
      const fleet = createFleet(scene);
      const fxRoot = scene.getObjectByName("surface_ship_impact");
      const resources = resourcesBelow(fxRoot);
      for (const ship of fleet.ships)
        for (const scar of ship.impact.scars)
          for (const resource of resourcesBelow(scar)) resources.add(resource);
      const counts = new Map([...resources].map((resource) => [resource, 0]));
      for (const resource of resources)
        resource.addEventListener("dispose", () =>
          counts.set(resource, counts.get(resource) + 1),
        );
      const identity = fleet.colliders;
      for (let restart = 0; restart < 3; restart++) {
        attack(fleet, fleet.ships.at(-1), restart * 10 + 1);
        fleet.update(restart * 10 + 2);
        fleet.reset();
        assert.equal(fleet.colliders, identity);
        assert.ok(fleet.ships.every((ship) => !ship.state.destroyed));
      }
      fleet.dispose();
      fleet.dispose();
      fleet.reset();
      fleet.update(100);
      assert.equal(fleet.colliders, identity);
      assert.equal(fleet.colliders.length, 0);
      assert.ok([...counts.values()].every((count) => count === 1));
      assert.equal(scene.children.length, 0);
    }
  });
}
