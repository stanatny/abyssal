import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildPolyphemusHF } from "../src/polyphemus_hf_asset.js";
import { POLYPHEMUS_SITE } from "../src/odyssey_polyphemus_site.js";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { POLYPHEMUS_COMBAT as COMBAT } from "../src/polyphemus_combat.js";
import {
  BOULDER,
  createPolyphemusBoulders,
} from "../src/polyphemus_boulder.js";

const species = ODYSSEY_LORDS.find((s) => s.kind === "polyphemus");
// 只预设阶段时钟和站位；掌心、HF岩石、预警、掩体与飞行生命周期均为生产实现。
function fixture(t, distance = 120) {
  const scene = new T.Scene(),
    root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.position.fromArray(POLYPHEMUS_SITE.home);
  root.scale.setScalar(species.length);
  root.userData.setPolyphemusCombat({
    phase: "attack",
    ability: "boulder",
    progress: BOULDER.release,
  });
  motions[0](COMBAT.hunt + COMBAT.windup + COMBAT.attack * BOULDER.release);
  scene.add(root);
  root.updateMatrixWorld(true);
  const origin = root.userData.getThrowAnchorWorldPosition(new T.Vector3());
  const target = origin.clone().add(new T.Vector3(0, 0, -distance));
  const safe = target.clone().add(new T.Vector3(0, 100, 0));
  const entry = {
    enabled: true,
    mesh: root,
    playerRadius: 4.8,
    lockTarget: target.clone(),
    state: {
      species,
      phase: "windup",
      timer: 0.2,
      phaseDuration: COMBAT.windup,
      defeated: false,
    },
  };
  const system = createPolyphemusBoulders(scene),
    hits = [];
  const update = (dt = 0.05, options = {}) => {
    system.update(entry, dt, entry.state.timer, safe, safe, {
      hit: (...args) => hits.push(args),
      ...options,
    });
    return system.entries.get(entry);
  };
  const at = (phase, time, options = {}) => {
    entry.state.phase = phase;
    entry.state.timer = time;
    entry.state.phaseDuration =
      phase === "windup"
        ? COMBAT.windup
        : phase === "attack"
          ? COMBAT.attack
          : COMBAT.recover;
    return update(0.01, options);
  };
  t.after(() => {
    system.dispose();
    root.userData.disposeLocalMotion();
  });
  return { scene, root, origin, target, safe, entry, system, hits, update, at };
}
const threshold = COMBAT.windup - COMBAT.lockWindow;
const point = (attribute, index) =>
  new T.Vector3().fromBufferAttribute(attribute, index);

test("the tracking cue stays amber, has no brackets or flash, and follows the actual selected warning endpoint", (t) => {
  const f = fixture(t),
    d = f.update();
  assert.equal(d.targetLock.phase, "tracking");
  assert.equal(d.targetLock.committed, false);
  assert.equal(d.landing.material.color.getHex(), 0xf0c683);
  assert.equal(d.lockBrackets.visible, false);
  assert.equal(d.lockFlash.visible, false);
  assert.equal(d.lockBrackets.geometry.attributes.position.count, 48);
  const p = d.warning.geometry.attributes.position;
  assert.ok(point(p, 0).distanceTo(f.origin) < 2e-4);
  assert.ok(point(p, p.count - 1).distanceTo(d.targetLock.position) < 2e-4);
  f.entry.lockTarget.x += 20;
  f.at("windup", threshold - 0.01);
  assert.equal(d.targetLock.phase, "tracking");
  assert.ok(d.targetLock.position.equals(f.entry.lockTarget));
  assert.ok(d.targetLock.requestedTarget.equals(f.entry.lockTarget));
  assert.equal(d.flight, null);
});

test("the final0.6s creates one contracting flash and four stable incoming-facing brackets rather than a flashing loop", (t) => {
  const f = fixture(t),
    d = f.at("windup", threshold);
  assert.equal(d.targetLock.phase, "locked");
  assert.equal(d.targetLock.committed, true);
  assert.equal(d.targetLock.flashActive, true);
  assert.ok(d.targetLock.flashProgress < 1e-8);
  assert.equal(d.landing.material.color.getHex(), 0xffedc6);
  assert.equal(d.warning.material.color.getHex(), 0xffedc6);
  assert.ok(d.lockBrackets.position.equals(d.landing.position));
  assert.equal(d.lockBrackets.visible, true);
  const normal = new T.Vector3(0, 0, 1).applyQuaternion(
    d.lockBrackets.quaternion,
  );
  assert.ok(
    normal.dot(f.origin.clone().sub(d.landing.position).normalize()) > 0.999999,
  );
  const q = d.lockBrackets.quaternion.clone(),
    initial = d.lockFlash.scale.x;
  f.at("windup", threshold + 0.08);
  const middle = d.lockFlash.scale.x;
  assert.ok(middle < initial);
  f.at("windup", threshold + 0.24);
  assert.ok(d.lockFlash.scale.x < middle);
  f.at("windup", threshold + 0.33);
  assert.equal(d.lockFlash.visible, false);
  assert.equal(d.targetLock.flashActive, false);
  assert.equal(d.targetLock.flashProgress, 1);
  f.at("windup", COMBAT.windup - 0.01);
  f.at("attack", 0);
  assert.equal(d.lockFlash.visible, false);
  assert.equal(d.lockBrackets.visible, true);
  assert.ok(d.lockBrackets.quaternion.equals(q));
  assert.ok(d.lockBrackets.position.equals(d.targetLock.position));
});

test("late observation does not restart an elapsed commit flash and long updates do not create another animation clock", (t) => {
  const f = fixture(t),
    d = f.at("windup", threshold + 0.4);
  assert.equal(d.lockBrackets.visible, true);
  assert.equal(d.lockFlash.visible, false);
  const phase = d.targetLock.phase;
  f.update(2);
  assert.equal(d.targetLock.phase, phase);
  assert.equal(d.lockFlash.visible, false);
  assert.equal(d.targetLock.flashProgress, 1);
});

test("commit brackets and flash use the real finite-radius cover intercept rather than an unobstructed target behind a wall", (t) => {
  const f = fixture(t),
    wall = f.origin.z - 60;
  const blocked = (a, b, radius = 0) => Math.min(a.z, b.z) - radius <= wall;
  const d = f.at("windup", threshold, { blocked });
  assert.ok(
    Math.abs(d.targetLock.position.z - (wall + f.system.radius)) < 0.004,
  );
  assert.ok(d.targetLock.position.distanceTo(f.entry.lockTarget) > 50);
  assert.ok(d.targetLock.requestedTarget.equals(f.entry.lockTarget));
  assert.ok(d.lockBrackets.position.equals(d.targetLock.position));
  assert.ok(d.lockFlash.position.equals(d.targetLock.position));
  const a = d.warning.geometry.attributes.position;
  assert.ok(point(a, a.count - 1).distanceTo(d.targetLock.position) < 2e-4);
  assert.equal(d.flight, null);
});

test("a real600m palm flight keeps its original2.5s target and steady brackets until impact without changing collision timing", (t) => {
  const f = fixture(t, 600),
    d = f.at("windup", threshold);
  f.at("attack", COMBAT.attack * BOULDER.release);
  assert.ok(d.flight);
  assert.equal(BOULDER.speed, 240);
  assert.equal(BOULDER.maxFlightTime, 3);
  assert.ok(Math.abs(d.flight.duration - 2.5) < 1e-9);
  assert.ok(d.flight.origin.distanceTo(f.origin) < 1e-9);
  assert.ok(d.flying.position.distanceTo(f.origin) < 1e-9);
  assert.equal(d.targetLock.phase, "flight");
  assert.equal(d.lockFlash.visible, false);
  const q = d.lockBrackets.quaternion.clone();
  f.entry.lockTarget.add(new T.Vector3(120, 20, 0));
  for (let i = 0; i < 25; i++) f.update();
  assert.ok(d.flight);
  assert.ok(d.targetLock.position.distanceTo(f.target) < 1e-8);
  assert.ok(d.targetLock.requestedTarget.distanceTo(f.target) < 1e-8);
  assert.ok(d.lockBrackets.quaternion.equals(q));
  assert.equal(d.lockFlash.visible, false);
  for (let i = 0; i < 25; i++) f.update();
  assert.equal(d.flight, null);
  assert.ok(Math.abs(d.age - 2.5) < 1e-8);
  assert.ok(d.wave.position.distanceTo(f.target) < 1e-8);
  assert.equal(d.lockBrackets.visible, false);
  assert.equal(d.lockFlash.visible, false);
  assert.equal(d.targetLock.phase, "hidden");
  assert.equal(f.hits.length, 0);
});

test("pause and inactive frames freeze commit visuals while interruption, defeat and disabled entries hide them", (t) => {
  const f = fixture(t),
    d = f.at("windup", threshold + 0.1);
  const before = {
    cue: JSON.stringify(d.targetLock),
    flash: d.lockFlash.scale.toArray(),
    opacity: d.lockFlash.material.opacity,
    position: d.lockBrackets.position.toArray(),
    q: d.lockBrackets.quaternion.toArray(),
  };
  f.entry.state.timer = threshold + 0.3;
  for (const dt of [0, -1, NaN, Infinity]) f.update(dt);
  f.update(10, { active: false });
  assert.deepEqual(
    {
      cue: JSON.stringify(d.targetLock),
      flash: d.lockFlash.scale.toArray(),
      opacity: d.lockFlash.material.opacity,
      position: d.lockBrackets.position.toArray(),
      q: d.lockBrackets.quaternion.toArray(),
    },
    before,
  );
  f.at("disoriented", 0);
  assert.equal(d.targetLock.phase, "hidden");
  assert.equal(d.lockBrackets.visible, false);
  assert.equal(d.lockFlash.visible, false);
  f.at("windup", 0.2);
  assert.equal(d.targetLock.phase, "tracking");
  assert.equal(d.landing.material.color.getHex(), 0xf0c683);
  f.at("windup", threshold);
  f.entry.state.defeated = true;
  f.update(0);
  assert.equal(d.targetLock.phase, "hidden");
  assert.equal(d.lockBrackets.visible, false);
  assert.equal(d.lockFlash.visible, false);
  f.entry.state.defeated = false;
  f.at("windup", threshold);
  f.entry.enabled = false;
  f.update(0);
  assert.equal(d.lockBrackets.visible, false);
  assert.equal(d.lockFlash.visible, false);
});

test("repeated real flight cycles reuse a finite cue pool and reset/disposal release owned resources exactly once", (t) => {
  const f = fixture(t),
    d = f.update();
  const geometry = d.lockBrackets.geometry,
    material = d.lockBrackets.material,
    flashMaterial = d.lockFlash.material;
  const nodes = f.scene.children.length;
  for (let cycle = 0; cycle < 3; cycle++) {
    f.at("windup", 0.2);
    f.at("windup", threshold);
    f.at("attack", COMBAT.attack * BOULDER.release);
    for (let i = 0; i < 50; i++) f.update(0.1);
    assert.equal(d.flight, null);
    assert.equal(d.wave.visible, false);
    assert.equal(f.system.entries.size, 1);
    assert.equal(f.scene.children.length, nodes);
    assert.equal(d.lockBrackets.geometry, geometry);
    assert.equal(d.lockFlash.material, flashMaterial);
  }
  let geometryDisposals = 0,
    materialDisposals = 0,
    flashDisposals = 0;
  geometry.addEventListener("dispose", () => geometryDisposals++);
  material.addEventListener("dispose", () => materialDisposals++);
  flashMaterial.addEventListener("dispose", () => flashDisposals++);
  f.system.reset();
  assert.equal(f.system.entries.size, 0);
  assert.equal(d.lockBrackets.parent, null);
  assert.equal(d.lockFlash.parent, null);
  assert.equal(d.targetLock.phase, "hidden");
  assert.equal(geometryDisposals, 0);
  assert.equal(materialDisposals, 0);
  assert.equal(flashDisposals, 1);
  f.system.dispose();
  f.system.dispose();
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.equal(flashDisposals, 1);
});
