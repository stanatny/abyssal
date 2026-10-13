import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import {
  createCharacterLockProjector,
  characterLockShape,
  createCharacterLockCue,
} from "../src/lord_character_lock.js";
import { createLordLockFeedback } from "../src/lord_lock_feedback.js";

const focus = { x: 210, y: 390, radius: 44, width: 390, height: 667 };
test("character cue contracts around the body then remains red and softly pulses throughout pursuit", () => {
  let previous = Infinity;
  for (const age of [0, 0.2, 0.4, 0.8, 1.2, 1.6, 2, 2.2, 2.4]) {
    const cue = characterLockShape(age, focus);
    assert.equal(cue.x, focus.x);
    assert.equal(cue.y, focus.y);
    assert.ok(cue.radius <= previous);
    previous = cue.radius;
    assert.ok(cue.opacity > 0 && cue.opacity <= 1);
  }
  assert.ok(
    characterLockShape(0, focus).radius >
      characterLockShape(1.6, focus).radius * 2,
  );
  const peak = characterLockShape(1.6, focus),
    trough = characterLockShape(2.3, focus),
    continued = characterLockShape(60, focus);
  assert.equal(peak.phase, "warning");
  assert.equal(trough.phase, "warning");
  assert.equal(continued.phase, "warning");
  assert.equal(peak.radius, continued.radius);
  assert.ok(peak.opacity > trough.opacity + 0.3);
  for (let age = 1.6; age < 100; age += 0.13) {
    const cue = characterLockShape(age, focus);
    assert.ok(cue.opacity >= 0.55 - 1e-9 && cue.opacity <= 0.95 + 1e-9);
  }
});
test("release spreads from the last rendered radius and opacity, then fully disappears", () => {
  for (const lockAge of [0.5, 5]) {
    const previous = characterLockShape(lockAge, focus);
    const first = characterLockShape(0, focus, false, "released", previous);
    const fading = characterLockShape(0.45, focus, false, "released", previous);
    assert.equal(first.radius, previous.radius);
    assert.equal(first.opacity, previous.opacity);
    assert.equal(first.phase, "released");
    assert.ok(fading.radius > first.radius);
    assert.ok(fading.opacity < first.opacity);
    assert.equal(characterLockShape(0.9, focus, false, "released"), null);
  }
});
test("camera zoom cannot reopen the contracting cue, while its center and resized viewport still follow", () => {
  const attributes = new Map();
  const node = () => ({
    setAttribute(name, value) {
      attributes.set(this.id + name, String(value));
    },
  });
  const layer = { hidden: true, style: {}, dataset: {} },
    svg = node(),
    shape = node(),
    mask = node();
  svg.id = "svg";
  shape.id = "shape";
  mask.id = "mask";
  const cue = createCharacterLockCue({
    layer,
    svg,
    shape,
    mask,
    cuts: {},
    avoid: [],
  });
  const size = () =>
    Number(attributes.get("shapetransform").match(/scale\(([^)]+)/)[1]);
  cue.update(0, focus, false);
  const initial = size();
  cue.update(0.7, { ...focus, x: 230, radius: focus.radius * 3 }, false);
  const middle = size();
  assert.ok(middle < initial);
  assert.match(attributes.get("shapetransform"), /^translate\(230 390\)/);
  cue.update(1.6, { ...focus, radius: focus.radius * 3 }, false);
  assert.equal(size(), focus.radius / 100);
  cue.update(1.7, { ...focus, width: 320, radius: 66 }, false);
  assert.equal(attributes.get("svgviewBox"), "0 0 320 667");
  cue.update(2.6, focus, false);
  assert.equal(layer.hidden, false);
  assert.equal(layer.dataset.phase, "warning");
  const beforeRelease = size();
  cue.update(0, focus, false, "released");
  assert.equal(size(), beforeRelease);
  cue.update(0.45, { ...focus, x: 250 }, false, "released");
  assert.ok(size() > beforeRelease);
  assert.match(attributes.get("shapetransform"), /^translate\(250 390\)/);
  cue.update(0.9, focus, false, "released");
  assert.equal(layer.hidden, true);
  cue.update(0, focus, false);
  assert.equal(layer.hidden, false);
  cue.reset();
  assert.equal(layer.hidden, true);
});
test("reduced-motion body cue retains static size and opacity during pursuit, then fades without expansion", () => {
  const start = characterLockShape(0, focus, true),
    end = characterLockShape(2, focus, true);
  assert.equal(start.radius, end.radius);
  assert.equal(start.x, end.x);
  assert.equal(start.y, end.y);
  assert.equal(start.opacity, end.opacity);
  assert.equal(end.opacity, characterLockShape(40, focus, true).opacity);
  const first = characterLockShape(0, focus, true, "released", end);
  const last = characterLockShape(0.6, focus, true, "released", end);
  assert.equal(first.radius, last.radius);
  assert.ok(last.opacity < first.opacity);
});
test("cue bounds stay finite on narrow layouts and reject unavailable focus", () => {
  for (const radius of [5, 44, 1000]) {
    const cue = characterLockShape(0, { ...focus, width: 320, radius });
    assert.ok(cue.radius <= 320 * 0.42);
  }
  for (const invalid of [null, { ...focus, x: NaN }, { ...focus, width: 0 }])
    assert.equal(characterLockShape(0, invalid), null);
  for (const age of [NaN, -1, Infinity])
    assert.equal(characterLockShape(age, focus), null);
});
test("projection follows the actual player instead of the screen center through camera turns", () => {
  const camera = new PerspectiveCamera(60, 1440 / 900, 0.1, 1000);
  camera.position.set(0, 3, 12);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const project = createCharacterLockProjector(),
    position = new Vector3(2, -1, 0);
  const before = { ...project(position, 3, camera, 1440, 900) };
  assert.ok(before.x > 720);
  assert.ok(before.y > 450);
  position.x = -2;
  const moved = { ...project(position, 3, camera, 1440, 900) };
  assert.ok(moved.x < 720);
  camera.position.x = 4;
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const turned = project(position, 3, camera, 1440, 900);
  assert.notEqual(turned.x, moved.x);
  assert.ok(turned.radius > 0);
});
test("projection rejects points behind the camera and invalid viewport or size", () => {
  const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const project = createCharacterLockProjector();
  assert.equal(project(new Vector3(0, 0, 12), 3, camera, 390, 667), null);
  assert.equal(project(new Vector3(), 3, camera, 0, 667), null);
  assert.equal(project(new Vector3(), NaN, camera, 390, 667), null);
});
test("shared lock lifecycle routes persistent pursuit and actual release to the body cue, then clears it", () => {
  const events = [];
  const node = () => ({
    hidden: true,
    dataset: {},
    style: { setProperty() {} },
  });
  const ui = createLordLockFeedback({
    panel: node(),
    frame: node(),
    title: {},
    detail: {},
    characterCue: {
      update: (...args) => events.push(args),
      reset: () => events.push("reset"),
    },
  });
  const b = {
    enabled: true,
    state: { phase: "hunt", species: { label: "领主" } },
    mesh: { position: { x: 0, y: 0, z: 0 } },
  };
  ui.update(0.1, [b], { x: 0, y: 0, z: 0 }, false, () => focus);
  assert.equal(events[0][1], focus);
  assert.equal(events[0][0], 0);
  assert.equal(events[0][3], "locked");
  ui.update(0.6, [b], { x: 0, y: 0, z: 0 }, false, () => focus);
  assert.equal(events[1][0], 0.6);
  ui.update(2, [b], { x: 0, y: 0, z: 0 }, false, () => focus);
  assert.equal(events.at(-1)[3], "locked");
  b.state.phase = "return";
  ui.update(0.5, [b], { x: 0, y: 0, z: 0 }, false, () => focus);
  assert.equal(events.at(-1)[3], "released");
  assert.equal(events.at(-1)[0], 0);
  ui.update(0.9, [b], { x: 0, y: 0, z: 0 });
  assert.equal(events.at(-1), "reset");
  ui.reset();
  assert.equal(events.at(-1), "reset");
});
