import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { createFeedingTransition } from "../src/feeding_transition.js";
import { createSwallowEffect } from "../src/swallow_effect.js";
import { createZombieMinion } from "../src/zombie_minion.js";
import { createPlayer } from "../src/simulation.js";
import { consumeMinionPrey } from "../src/zombie_shark_rules.js";

function pose(mesh) {
  return [
    mesh.position.toArray(),
    mesh.quaternion.toArray(),
    mesh.scale.toArray(),
  ];
}

function frame(owner) {
  owner.updateWorldMatrix(true, true);
  return {
    mouth: owner.userData.getFeedingMouth(new THREE.Vector3()),
    direction: new THREE.Vector3(0, 0, -1).applyQuaternion(
      owner.getWorldQuaternion(new THREE.Quaternion()),
    ),
  };
}

test("ordinary swallowing follows the actual turning, moving and growing mouth without an initial flip", () => {
  for (const kind of ["orca", "zombie_shark", "mechanical_shark"]) {
    const scene = new THREE.Scene(),
      owner = createCreature(kind, 3, 1),
      preyParent = new THREE.Group(),
      prey = createCreature("sardine", 0.4, 2),
      mist = [];
    scene.add(owner, preyParent);
    preyParent.position.set(-2, 0.5, 4);
    preyParent.rotation.y = 0.3;
    prey.position.copy(
      preyParent.worldToLocal(
        frame(owner)
          .mouth.clone()
          .add(new THREE.Vector3(0.25, 0.05, -0.45)),
      ),
    );
    prey.rotation.set(0.05, 0.3, -0.1);
    preyParent.add(prey);
    const original = pose(prey),
      initialQuaternion = prey.getWorldQuaternion(new THREE.Quaternion()),
      feeding = createFeedingTransition({
        scene,
        onMist: (point) => mist.push(point),
      });
    assert.equal(feeding.start(prey, 0.4, { swallowFrame: owner }), true);
    const duration = feeding.snapshot().entries[0].duration;
    assert.ok(duration >= 0.55 && duration <= 0.75);
    feeding.update(1 / 120, frame(owner));
    assert.ok(
      initialQuaternion.angleTo(
        prey.getWorldQuaternion(new THREE.Quaternion()),
      ) < 0.03,
      "the capture retains the entering pose rather than forcing a 180-degree flip",
    );
    owner.position.set(8, -4, -5);
    owner.rotation.set(0.07, 0.3, 0);
    owner.scale.setScalar(3.2);
    owner.userData.animate(0.1, 1, { dt: 0.05, speed: 12, turn: 0.2 });
    feeding.update(duration * 0.43 - 1 / 120, frame(owner));
    const early = prey.getWorldPosition(new THREE.Vector3());
    assert.ok(
      early.distanceTo(frame(owner).mouth) < 0.6,
      "moves with its eater",
    );
    assert.deepEqual(
      prey.scale.toArray(),
      original[2],
      "keeps its silhouette in transit",
    );
    assert.equal(mist.length, 0);
    feeding.update(duration * 0.42, frame(owner));
    assert.ok(
      prey
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(frame(owner).mouth) < 0.2,
    );
    assert.ok(
      prey.scale.x < original[2][0] * 0.4,
      "compresses at the real mouth",
    );
    assert.equal(mist.length, 0);
    feeding.update(duration * 0.08, frame(owner));
    assert.equal(mist.length, 1);
    assert.ok(mist[0].distanceTo(frame(owner).mouth) < 0.1);
    feeding.update(duration, frame(owner));
    assert.equal(prey.visible, false);
    assert.strictEqual(prey.parent, preyParent);
    assert.deepEqual(pose(prey), original);
    assert.equal(feeding.snapshot().completedCount, 1);
    feeding.dispose();
  }
});

test("new cover clips the visible intake and cannot compress or emit a meal splash far from the mouth", () => {
  const owner = new THREE.Group(),
    prey = new THREE.Group(),
    mist = [],
    feeding = createFeedingTransition({ onMist: (point) => mist.push(point) });
  owner.scale.setScalar(3);
  prey.position.set(-1, 0, -1.5);
  const original = pose(prey),
    anchors = {
      mouth: new THREE.Vector3(0, 0, -1.4),
      direction: new THREE.Vector3(0, 0, -1),
    };
  feeding.start(prey, 0.4, {
    swallowFrame: owner,
    blockedBetween: (a, b) => b.x > -0.6,
  });
  const duration = feeding.snapshot().entries[0].duration;
  for (let i = 0; i < 19; i++) {
    feeding.update(duration / 20, anchors);
    assert.ok(
      prey.position.x <= -0.6,
      "does not carry borrowed geometry through new cover",
    );
    assert.deepEqual(prey.scale.toArray(), original[2]);
  }
  assert.equal(mist.length, 0);
  feeding.update(duration, anchors);
  assert.equal(mist.length, 0);
  assert.deepEqual(pose(prey), original);
  assert.equal(prey.visible, false);
});

test("ordinary borrow ownership stays bounded, frozen on pause and restored on reset or disposal", () => {
  const scene = new THREE.Scene(),
    owner = new THREE.Group(),
    feeding = createFeedingTransition({ scene }),
    prey = Array.from({ length: 17 }, (_, i) => {
      const mesh = new THREE.Group();
      mesh.position.set(i * 0.01, 0, -1.5);
      mesh.rotation.y = i * 0.1;
      return mesh;
    }),
    originals = prey.map(pose),
    anchors = {
      mouth: new THREE.Vector3(0, 0, -1.4),
      direction: new THREE.Vector3(0, 0, -1),
    };
  owner.scale.setScalar(3);
  prey
    .slice(0, 16)
    .forEach((mesh) => feeding.start(mesh, 0.4, { swallowFrame: owner }));
  const invalid = new THREE.Group();
  invalid.scale.x = 0;
  assert.equal(feeding.start(prey[16], 0.4, { swallowFrame: invalid }), false);
  assert.equal(
    feeding.snapshot().evictedCount,
    0,
    "invalid frames cannot evict an owned prey",
  );
  assert.equal(feeding.start(prey[16], 0.4, { swallowFrame: owner }), true);
  assert.equal(feeding.has(prey[0]), false);
  assert.deepEqual(pose(prey[0]), originals[0]);
  assert.equal(prey[0].visible, false);
  assert.equal(feeding.snapshot().activeCount, 16);
  feeding.update(0.1, anchors);
  const frozen = prey.map(pose),
    snapshot = feeding.snapshot();
  for (const dt of [0, -1, NaN, Infinity]) feeding.update(dt, anchors);
  feeding.update(0.1, { ...anchors, direction: new THREE.Vector3() });
  assert.deepEqual(prey.map(pose), frozen);
  assert.deepEqual(feeding.snapshot(), snapshot);
  feeding.reset();
  assert.deepEqual(prey.map(pose), originals);
  assert.ok(prey.every((mesh) => !mesh.visible));
  assert.equal(scene.getObjectByName("swallow_intake_flow").visible, false);
  feeding.start(prey[0], 0.4, { swallowFrame: owner });
  feeding.dispose();
  feeding.dispose();
  assert.deepEqual(pose(prey[0]), originals[0]);
  assert.equal(feeding.start(prey[0], 0.4, { swallowFrame: owner }), false);
  assert.equal(scene.getObjectByName("swallow_intake_flow"), undefined);
});

test("the subtle mouth flow uses a fixed reusable channel, world anchors and reduced-motion-safe cleanup", () => {
  const parent = new THREE.Group();
  parent.position.set(8, -3, 5);
  parent.rotation.y = 0.4;
  parent.scale.setScalar(1.7);
  let quiet = false;
  const effect = createSwallowEffect(parent, { reducedMotion: () => quiet }),
    anchors = {
      mouth: new THREE.Vector3(1, 2, -3),
      direction: new THREE.Vector3(1, 0.1, -0.5).normalize(),
    },
    objects = effect.group.children.slice(),
    resources = new Set(
      objects
        .flatMap((node) => [
          node.isMesh ? node.geometry : undefined,
          node.material,
          node.material.map,
        ])
        .filter(Boolean),
    );
  let disposalCount = 0;
  resources.forEach((resource) =>
    resource.addEventListener("dispose", () => disposalCount++),
  );
  for (let i = 0; i < 50; i++) {
    assert.equal(effect.emit(0.4, 3), true);
    effect.update(0.01, anchors);
  }
  assert.equal(effect.snapshot().objects, 10);
  assert.deepEqual(effect.group.children, objects);
  assert.equal(
    effect.group.children.some((node) => node.isLight),
    false,
  );
  parent.updateWorldMatrix(true, true);
  assert.ok(
    effect.group
      .getWorldPosition(new THREE.Vector3())
      .distanceTo(anchors.mouth) < 0.1,
  );
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(
    effect.group.matrixWorld,
  );
  assert.ok(normal.dot(anchors.direction) > 0.999999);
  const frozen = effect.snapshot();
  effect.update(0, anchors);
  assert.deepEqual(effect.snapshot(), frozen);
  effect.update(1, anchors);
  assert.equal(effect.group.visible, false);
  quiet = true;
  effect.emit(0.4, 3);
  effect.update(0.1, anchors);
  const still = objects.map(pose);
  effect.update(0.1, anchors);
  assert.deepEqual(
    objects.map(pose),
    still,
    "reduced motion retains the intake cue without swirling",
  );
  effect.reset();
  assert.equal(effect.group.visible, false);
  effect.dispose();
  effect.dispose();
  assert.equal(disposalCount, resources.size);
  assert.equal(parent.children.length, 0);
  assert.equal(effect.emit(0.4, 3), false);
});

test("a real companion capture borrows the new intake while crediting its unchanged meal exactly once", () => {
  const scene = new THREE.Scene(),
    player = createPlayer("zombie_shark", 20),
    position = new THREE.Vector3(0, -50, 0),
    forward = new THREE.Vector3(0, 0, -1),
    prey = {
      species: { kind: "tuna", length: 8, nutrition: 30, growth: 2 },
      mesh: createCreature("tuna", 8, 1),
      hiddenFor: 0,
    };
  prey.mesh.position.set(14, -50, -15);
  scene.add(prey.mesh);
  const original = pose(prey.mesh);
  let meals = 0;
  const minion = createZombieMinion(scene, {
    blockedBetween: () => false,
    effects: { mealMist() {}, bite() {} },
    onConsume(entry, state, owner) {
      if (!consumeMinionPrey(state, owner, entry.species)) return false;
      entry.hiddenFor = 28;
      meals++;
      return true;
    },
  });
  minion.activate(player, position, forward);
  for (let i = 0; i < 900 && !meals; i++) {
    minion.beforePreyMotion();
    player.elapsed += 1 / 60;
    minion.update(1 / 60, player, position, forward, [prey]);
  }
  assert.equal(meals, 1);
  assert.equal(player.eaten, 1);
  assert.equal(player.health, 50);
  assert.equal(minion.feeding.snapshot().entries[0].swallowing, true);
  assert.ok(prey.mesh.visible);
  assert.ok(scene.getObjectByName("swallow_intake_flow").visible);
  for (let i = 0; i < 90; i++) {
    player.elapsed += 1 / 60;
    minion.update(1 / 60, player, position, forward, [prey]);
  }
  assert.equal(meals, 1);
  assert.equal(minion.feeding.snapshot().activeCount, 0);
  assert.deepEqual(pose(prey.mesh), original);
  assert.equal(prey.mesh.visible, false);
  minion.reset();
  assert.equal(scene.getObjectByName("swallow_intake_flow").visible, false);
});
