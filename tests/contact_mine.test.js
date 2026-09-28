import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createHumanModel, HUMAN_CATALOG } from "../src/vehicle_models.js";
import { createHumanActivity } from "../src/human_activity.js";
import { bodyRadius } from "../src/collision.js";
import { createPlayer } from "../src/simulation.js";
import { HUMAN_RULES } from "../src/human_rules.js";

test("球形接触水雷复用原种类，有限顶点及触角外缘与接触直径一致", () => {
  const entry = HUMAN_CATALOG.find((item) => item.kind === "torpedo");
  const mine = createHumanModel(entry.kind, entry.length);
  try {
    assert.equal(entry.name, "接触水雷");
    assert.equal(entry.latin, "CONTACT MINE");
    assert.equal(mine.children.length, 5);
    assert.equal(mine.userData.contactRadius, entry.length / 2);
    let triangleCount = 0,
      maxRadius = 0;
    for (const mesh of mine.children) {
      const vertices = mesh.geometry.getAttribute("position");
      const indices = mesh.geometry.index.array;
      triangleCount += indices.length / 3;
      for (const component of vertices.array)
        assert.ok(Number.isFinite(component));
      const a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3();
      for (let index = 0; index < indices.length; index += 3) {
        a.fromBufferAttribute(vertices, indices[index]);
        b.fromBufferAttribute(vertices, indices[index + 1]);
        c.fromBufferAttribute(vertices, indices[index + 2]);
        maxRadius = Math.max(maxRadius, a.length(), b.length(), c.length());
        assert.ok(b.sub(a).cross(c.sub(a)).lengthSq() > 1e-18);
      }
    }
    assert.ok(triangleCount < 12000);
    assert.ok(
      Math.abs(maxRadius * entry.length - mine.userData.contactRadius) < 1e-6,
    );
    const bounds = new THREE.Box3()
      .setFromObject(mine)
      .getSize(new THREE.Vector3());
    assert.ok(
      Math.min(bounds.x, bounds.y, bounds.z) /
        Math.max(bounds.x, bounds.y, bounds.z) >
        0.8,
    );
  } finally {
    mine.userData.dispose();
  }
});

test("水雷静态资源共享且灯光独立，最后一次释放销毁缓存", () => {
  const first = createHumanModel("torpedo", 3.6);
  const second = createHumanModel("torpedo", 1);
  const resources = new Set();
  for (let index = 0; index < first.children.length; index++) {
    const a = first.children[index],
      b = second.children[index];
    assert.equal(a.geometry, b.geometry);
    resources.add(a.geometry);
    if (!a.name.endsWith("warning")) {
      assert.equal(a.material, b.material);
      resources.add(a.material);
    }
  }
  const firstLight = first.getObjectByName("contact_mine_warning").material;
  const secondLight = second.getObjectByName("contact_mine_warning").material;
  assert.notEqual(firstLight, secondLight);
  let sharedDisposals = 0,
    firstLightDisposals = 0,
    secondLightDisposals = 0;
  for (const resource of resources)
    resource.addEventListener("dispose", () => sharedDisposals++);
  firstLight.addEventListener("dispose", () => firstLightDisposals++);
  secondLight.addEventListener("dispose", () => secondLightDisposals++);
  const initial = secondLight.emissiveIntensity;
  first.userData.animate(2);
  assert.equal(secondLight.emissiveIntensity, initial);
  assert.deepEqual(first.position.toArray(), [0, 0, 0]);
  first.userData.dispose();
  first.userData.dispose();
  assert.equal(sharedDisposals, 0);
  assert.equal(firstLightDisposals, 1);
  second.userData.animate(3);
  assert.ok(Number.isFinite(secondLight.emissiveIntensity));
  second.userData.dispose();
  second.userData.dispose();
  assert.equal(sharedDisposals, resources.size);
  assert.equal(secondLightDisposals, 1);
  const replacement = createHumanModel("torpedo", 3.6);
  assert.notEqual(replacement.children[0].geometry, first.children[0].geometry);
  replacement.userData.dispose();
});

test("球形触角外缘可被高速扫掠命中，范围外安全且每雷仅一次爆炸", () => {
  let flashes = 0,
    sounds = 0,
    damage = 0;
  const activity = createHumanActivity(new THREE.Scene(), {
    effects: { flash: () => flashes++ },
    audio: { hit: () => sounds++ },
    onDamage: () => damage++,
  });
  try {
    assert.equal(activity.hazards.length, HUMAN_RULES.torpedoCount);
    const player = createPlayer();
    const hazard = activity.hazards[0];
    const origin = hazard.mesh.position.clone();
    const forward = new THREE.Vector3(1, 0, 0);
    const radius =
      hazard.mesh.userData.contactRadius + bodyRadius(player.length);
    const crossAt = (offset) =>
      activity.onMovement(
        player,
        origin.clone().add(new THREE.Vector3(-12, offset, 0)),
        origin.clone().add(new THREE.Vector3(12, offset, 0)),
        forward,
        { speed: 72, now: 1 },
      );
    crossAt(radius + 0.02);
    assert.equal(hazard.active, true);
    assert.equal(player.health, 100);
    crossAt(radius - 0.02);
    assert.equal(hazard.active, false);
    assert.equal(player.health, 100 - HUMAN_RULES.torpedoDamage);
    assert.equal(hazard.mesh.visible, false);
    assert.equal(hazard.warning.visible, false);
    crossAt(radius - 0.02);
    assert.deepEqual([flashes, sounds, damage], [1, 1, 1]);
    activity.reset();
    assert.equal(hazard.active, true);
    assert.equal(hazard.mesh.visible, true);
    assert.equal(hazard.mesh.userData.contactRadius, 1.8);
  } finally {
    activity.dispose();
  }
});
