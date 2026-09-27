import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  projectSonarContact,
  buildSonarMarkerLayout,
  overlapArea,
} from "../src/sonar_marker_layout.js";
import { createSonarWave } from "../src/sonar_wave.js";

function cameraFor(viewport) {
  const camera = new THREE.PerspectiveCamera(
    60,
    viewport.width / viewport.height,
    0.1,
    500,
  );
  camera.updateMatrixWorld();
  return camera;
}
function contact(id, x, y, z, options = {}) {
  return {
    id,
    position: { x, y, z },
    label: "珊瑚鱼",
    kind: "fish",
    length: 2,
    eligible: true,
    dangerous: false,
    status: "可捕食",
    distance: Math.hypot(x, y, z),
    ...options,
  };
}
function angled(id, horizontal, vertical = 0) {
  return contact(
    id,
    Math.tan((horizontal * Math.PI) / 180) * 30,
    Math.tan((vertical * Math.PI) / 180) * 30,
    -30,
  );
}

test("front markers use the camera's 30 degree horizontal and 25 degree vertical half angles", () => {
  const viewport = { width: 1440, height: 900 },
    camera = cameraFor(viewport);
  assert.ok(
    projectSonarContact(angled("near-limit", 29.9, 24.9), camera, viewport),
  );
  assert.equal(
    projectSonarContact(angled("outside-horizontal", 30.1), camera, viewport),
    null,
  );
  assert.equal(
    projectSonarContact(angled("outside-vertical", 0, 25.1), camera, viewport),
    null,
  );
  assert.equal(
    projectSonarContact(contact("behind", 0, 0, 30), camera, viewport),
    null,
  );
  assert.equal(
    projectSonarContact(contact("camera", 0, 0, 0), camera, viewport),
    null,
  );
});

test("portrait screen bounds narrow the cone and retain a readable screen margin", () => {
  const viewport = { width: 390, height: 667 },
    camera = cameraFor(viewport);
  const inside = projectSonarContact(angled("inside", 12), camera, viewport);
  assert.ok(inside);
  assert.ok(inside.anchor.x < 372);
  assert.equal(
    projectSonarContact(angled("near-edge", 18), camera, viewport),
    null,
  );
  assert.equal(
    projectSonarContact(angled("outside-screen", 25), camera, viewport),
    null,
  );
});

test("turning the camera replaces front targets while preserving source ids", () => {
  const viewport = { width: 1440, height: 900 },
    camera = cameraFor(viewport);
  const contacts = [
    contact("ahead", 0, 0, -40),
    contact("right", 40, 0, 0),
    contact("rear", 0, 0, 40),
  ];
  const first = buildSonarMarkerLayout({ contacts, camera, viewport });
  assert.deepEqual(
    first.contacts.map((entry) => entry.id),
    ["ahead"],
  );
  assert.equal(first.totalDetected, 3);
  assert.equal(first.frontVisible, 1);
  camera.rotation.y = -Math.PI / 2;
  const turned = buildSonarMarkerLayout({ contacts, camera, viewport });
  assert.deepEqual(
    turned.contacts.map((entry) => entry.id),
    ["right"],
  );
  assert.equal(turned.totalDetected, 3);
  assert.ok(turned.contacts.every((entry) => entry.onscreen && !entry.behind));
});

test("a dense forward school has one shared caption, two real points, and full group metadata", () => {
  const viewport = { width: 390, height: 667 },
    camera = cameraFor(viewport);
  const front = Array.from({ length: 91 }, (_, index) =>
    contact(`fish-${index}`, Math.sin(index), Math.cos(index), -30, {
      length: index % 2 ? 1.5 : 2.5,
    }),
  );
  const rear = Array.from({ length: 10 }, (_, index) =>
    contact(`rear-${index}`, index, 0, 30),
  );
  const result = buildSonarMarkerLayout({
    contacts: [...front, ...rear],
    camera,
    viewport,
  });
  assert.equal(result.totalDetected, 101);
  assert.equal(result.frontVisible, 91);
  assert.equal(result.markedCount, 91);
  assert.equal(result.shownGroups, 1);
  assert.equal(result.contacts.length, 2);
  assert.equal(result.labels[0].contacts.length, 91);
  assert.match(result.labels[0].text, /1.5–2.5m 可食 ×91/);
  assert.ok(
    result.contacts.every((entry) =>
      front.some((source) => source.id === entry.id),
    ),
  );
});

test("same species with different feeding eligibility retain distinct explicit captions", () => {
  const viewport = { width: 1440, height: 900 },
    camera = cameraFor(viewport);
  const contacts = [
    contact("small", -5, 0, -40),
    contact("large", 5, 0, -40, {
      length: 12,
      eligible: false,
      status: "不可捕食",
    }),
  ];
  const result = buildSonarMarkerLayout({ contacts, camera, viewport });
  assert.equal(result.labels.length, 2);
  assert.match(result.labels.find((entry) => entry.eligible).text, /可食/);
  assert.match(result.labels.find((entry) => !entry.eligible).text, /不可食/);
});

test("both mobile and desktop cap groups at four and prioritize visible dangerous targets", () => {
  for (const viewport of [
    { width: 390, height: 667 },
    { width: 1440, height: 900 },
  ]) {
    const camera = cameraFor(viewport);
    const contacts = Array.from({ length: 12 }, (_, index) =>
      contact(
        `kind-${index}`,
        ((index % 3) - 1) * 3,
        (Math.floor(index / 3) - 1.5) * 3,
        -40,
        {
          kind: `kind-${index}`,
          boss: index === 11,
          dangerous: index >= 8,
          eligible: false,
          label: index === 11 ? "利维坦" : "邓氏鱼",
        },
      ),
    );
    const result = buildSonarMarkerLayout({ contacts, camera, viewport });
    assert.equal(result.totalDetected, 12);
    assert.equal(result.frontVisible, 12);
    assert.equal(result.shownGroups, 4);
    assert.ok(result.contacts.length <= 8);
    assert.ok(result.labels[0].boss);
    assert.match(result.labels[0].text, /避开/);
  }
});

test("a HUD-covered target is omitted rather than moved across the entire screen", () => {
  const viewport = { width: 390, height: 667 },
    camera = cameraFor(viewport);
  const contacts = [contact("covered", 0, 0, -40)];
  const occlusions = [{ left: 60, top: 200, right: 330, bottom: 450 }];
  const result = buildSonarMarkerLayout({
    contacts,
    camera,
    viewport,
    occlusions,
  });
  assert.equal(result.totalDetected, 1);
  assert.equal(result.frontVisible, 1);
  assert.equal(result.markedCount, 0);
  assert.deepEqual(result.contacts, []);
  assert.deepEqual(result.labels, []);
});

test("nearby caption avoidance stays local and never intersects HUD or another caption", () => {
  const viewport = { width: 390, height: 667 },
    camera = cameraFor(viewport);
  const occlusions = [{ left: 150, top: 285, right: 235, bottom: 318 }];
  const contacts = [
    contact("first", -2, 0, -40),
    contact("second", 3, -1, -40, { kind: "tuna", label: "蓝鳍金枪鱼" }),
  ];
  const result = buildSonarMarkerLayout({
    contacts,
    camera,
    viewport,
    occlusions,
  });
  assert.ok(result.labels.length > 0);
  for (const label of result.labels) {
    assert.ok(
      Math.hypot(label.x - label.anchor.x, label.y - label.anchor.y) <= 70,
    );
    for (const block of occlusions)
      assert.equal(overlapArea(label.rect, block), 0);
  }
  if (result.labels.length === 2)
    assert.equal(overlapArea(result.labels[0].rect, result.labels[1].rect), 0);
});
test("wave uses fixed resources, follows orca, stops immediately, and disposes once", () => {
  const scene = new THREE.Scene();
  const wave = createSonarWave(scene);
  const resources = new Set();
  wave.group.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
  });
  let disposals = 0;
  for (const resource of resources)
    resource.addEventListener("dispose", () => disposals++);
  for (let frame = 0; frame < 300; frame++)
    wave.update({
      active: true,
      now: frame / 30,
      startedAt: 0,
      position: { x: frame, y: -25, z: 4 },
    });
  assert.equal(wave.group.children.length, 4);
  assert.equal(resources.size, 10);
  assert.equal(wave.group.position.x, 299);
  assert.equal(wave.group.visible, true);
  wave.update({
    active: false,
    now: 10,
    startedAt: 0,
    position: { x: 0, y: 0, z: 0 },
  });
  assert.equal(wave.group.visible, false);
  wave.dispose();
  wave.dispose();
  assert.equal(disposals, resources.size);
  assert.equal(scene.children.length, 0);
});

test("sonar wave freezes on an unchanged game clock and starts a fresh pulse after reset", () => {
  const scene = new THREE.Scene();
  const wave = createSonarWave(scene);
  const context = {
    active: true,
    now: 2,
    startedAt: 0,
    position: { x: 2, y: -30, z: 1 },
  };
  wave.update(context);
  const firstSizes = wave.group.children.map((entry) => entry.scale.x);
  for (let frame = 0; frame < 120; frame++) wave.update(context);
  assert.deepEqual(
    wave.group.children.map((entry) => entry.scale.x),
    firstSizes,
  );
  wave.reset();
  wave.update({ ...context, now: 64, startedAt: 64 });
  assert.equal(wave.group.children.filter((entry) => entry.visible).length, 1);
  assert.equal(wave.group.children[0].scale.x, 2.8);
  wave.dispose();
});
