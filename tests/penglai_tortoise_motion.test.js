import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { aquaticHeading } from "../src/aquatic_reptile_motion.js";
import {
  createLordNavigation,
  lordHeadingQuaternion,
} from "../src/lord_navigation.js";
import { createPlayer } from "../src/simulation.js";
import { createEncounters, findBossContact } from "../src/encounters.js";
import { updateLordBody } from "../src/lord_body.js";
const make = () => createCreature("black_tortoise", 50, 9);
const pose = (m, t, speed = 1.2) => {
  m.userData.animate(t, speed);
  m.updateMatrixWorld(true);
};
const feet = (m) => {
  const inverse = m.children[0].matrixWorld.clone().invert();
  return m.userData.tortoiseSwimRig.limbs.map(({ wrist }) =>
    wrist
      .getObjectByName("broad_turtle_armored_paw")
      .getWorldPosition(new T.Vector3())
      .applyMatrix4(inverse),
  );
};
const correlation = (a, b) => {
  const am = a.reduce((x, y) => x + y) / a.length,
    bm = b.reduce((x, y) => x + y) / b.length;
  let ab = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - am,
      y = b[i] - bm;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  }
  return ab / Math.sqrt(aa * bb);
};

test("Tortoise uses bounded dorsal-up orientation through vertical chase and near-reverse turns, including navigation proposals", () => {
  const m = make(),
    s = { length: 50 };
  const nav = createLordNavigation(m, s);
  assert.equal(nav.pitchLimit, 0.22);
  for (let yaw = -Math.PI; yaw <= Math.PI; yaw += 0.13)
    for (const y of [-1, -0.9, 0, 0.9, 1]) {
      const horizontal = Math.sqrt(1 - y * y),
        d = new T.Vector3(
          Math.sin(yaw) * horizontal,
          y,
          -Math.cos(yaw) * horizontal,
        ),
        q = aquaticHeading(
          new T.Quaternion(),
          d,
          0.8,
          m.userData.aquaticPitchLimit,
        ),
        proposal = lordHeadingQuaternion(
          new T.Quaternion(),
          d,
          false,
          nav.pitchLimit,
          0.8,
        );
      assert.ok(q.angleTo(proposal) < 1e-6);
      const up = new T.Vector3(0, 1, 0).applyQuaternion(q);
      assert.ok(up.y >= Math.cos(0.22) - 1e-10);
    }
  const normal = aquaticHeading(new T.Quaternion(), new T.Vector3(0, 1, 0));
  assert.ok(
    Math.abs(
      new T.Vector3(0, 0, -1).applyQuaternion(normal).y - Math.sin(0.65),
    ) < 1e-9,
    "other aquatic creatures retain their default pitch bound",
  );
});
test("Actual distal paddles pair their power strokes outside the flanks; shoulders remain fitted and the shell stays fixed", () => {
  const m = make(),
    rig = m.userData.tortoiseSwimRig;
  pose(m, 0);
  const roots = rig.limbs.map((l) => l.limb.position.toArray()),
    samples = [[], [], [], []],
    points = new T.Vector3();
  for (let i = 1; i <= 720; i++) {
    m.userData.setSwimTravel(22 / 60, 1 / 60);
    pose(m, i / 60);
    const f = feet(m);
    for (let k = 0; k < 4; k++) {
      assert.ok(Math.abs(f[k].x) > 0.34, "palm remains beside the shell");
      assert.ok(f[k].y > -0.1, "paws no longer hang as walking legs");
      samples[k].push(f[k].z);
      assert.deepEqual(rig.limbs[k].limb.position.toArray(), roots[k]);
    }
    for (const { wrist } of rig.limbs) {
      const palm = wrist.getObjectByName("broad_turtle_armored_paw"),
        inverse = m.children[0].matrixWorld.clone().invert(),
        p = palm.geometry.attributes.position;
      for (let v = 0; v < p.count; v += 17) {
        points
          .fromBufferAttribute(p, v)
          .applyMatrix4(palm.matrixWorld)
          .applyMatrix4(inverse);
        assert.ok(points.toArray().every(Number.isFinite));
        assert.ok(points.y > -0.16);
      }
    }
  }
  assert.ok(correlation(samples[0], samples[2]) > 0.95);
  assert.ok(correlation(samples[1], samples[3]) > 0.9);
  assert.ok(correlation(samples[0], samples[1]) < -0.6);
  assert.ok(Math.max(...samples[0]) - Math.min(...samples[0]) > 0.035);
  assert.deepEqual(m.position.toArray(), [0, 0, 0]);
  assert.deepEqual(m.quaternion.toArray(), [0, 0, 0, 1]);
});
test("Guarding, stopping and resuming blend smoothly using actual travel; frozen time and zero-delta inputs are inert", () => {
  const m = make(),
    r = m.userData.tortoiseSwimRig;
  pose(m, 0);
  let t = 0;
  for (let i = 0; i < 180; i++) {
    t += 1 / 60;
    m.userData.setSwimTravel(22 / 60, 1 / 60);
    pose(m, t);
  }
  assert.ok(r.state.drive > 1);
  m.userData.setBossPhase("windup");
  let last = r.limbs.map((l) => l.limb.quaternion.clone());
  for (let i = 0; i < 150; i++) {
    t += 1 / 60;
    m.userData.setSwimTravel(0, 1 / 60);
    pose(m, t, 2.5);
    for (let j = 0; j < 4; j++) {
      assert.ok(last[j].angleTo(r.limbs[j].limb.quaternion) < 0.08);
      last[j].copy(r.limbs[j].limb.quaternion);
    }
  }
  assert.ok(r.state.drive < 0.001);
  assert.ok(r.state.brace > 0.999);
  const frozen = r.limbs.map((l) => [
      ...l.limb.matrixWorld.elements,
      ...l.wrist.matrixWorld.elements,
    ]),
    state = structuredClone(r.state);
  m.userData.setSwimTravel(50, 0);
  pose(m, t, 2.5);
  assert.deepEqual(r.state, state);
  assert.deepEqual(
    r.limbs.map((l) => [
      ...l.limb.matrixWorld.elements,
      ...l.wrist.matrixWorld.elements,
    ]),
    frozen,
  );
  m.userData.setBossPhase("recover");
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    m.userData.setSwimTravel(3.4 / 60, 1 / 60);
    pose(m, t, 0.35);
  }
  assert.ok(r.state.brace < 0.001);
  assert.ok(r.state.drive > 0.2);
  m.userData.resetSwimTravel();
  assert.equal(r.state.worldTravel, false);
  assert.equal(r.state.brace, 0);
  assert.equal(r.state.speed, 0);
});
test("Guide/world instances share immutable geometry without coupled poses; length and actual shell contact remain", () => {
  const a = make(),
    b = make();
  a.updateMatrixWorld(true);
  b.updateMatrixWorld(true);
  assert.ok(
    Math.abs(
      new T.Box3().setFromObject(a, true).getSize(new T.Vector3()).z - 50,
    ) < 0.01,
  );
  pose(a, 0);
  pose(b, 0);
  const before = feet(b).map((p) => p.toArray());
  for (let i = 1; i < 240; i++) {
    a.userData.setSwimTravel(22 / 60, 1 / 60);
    pose(a, i / 60);
  }
  assert.deepEqual(
    feet(b).map((p) => p.toArray()),
    before,
  );
  const ap = a.userData.tortoiseSwimRig.limbs[0].wrist.getObjectByName(
      "broad_turtle_armored_paw",
    ),
    bp = b.userData.tortoiseSwimRig.limbs[0].wrist.getObjectByName(
      "broad_turtle_armored_paw",
    );
  assert.equal(ap.geometry, bp.geometry);
  assert.notEqual(ap.parent, bp.parent);
  const bodies = updateLordBody(a);
  assert.ok(bodies.length > 0);
  const c = bodies[0];
  assert.ok(
    findBossContact(a, new T.Vector3(c.x, c.y, c.z), 2.7, {
      visibleBody: true,
    }),
  );
});

test("Cruise strokes visibly push backward before feathering a faster forward recovery", () => {
  const m = make(),
    rig = m.userData.tortoiseSwimRig;
  pose(m, 0);
  let t = 0;
  for (let i = 0; i < 240; i++) {
    t += 1 / 60;
    m.userData.setSwimTravel(3.4 / 60, 1 / 60);
    pose(m, t);
  }
  const zs = [];
  let previous,
    backward = 0,
    powerCount = 0,
    forward = 0,
    recoveryCount = 0,
    maxFeather = 0;
  for (let i = 0; i < 720; i++) {
    t += 1 / 60;
    m.userData.setSwimTravel(3.4 / 60, 1 / 60);
    pose(m, t);
    const z = feet(m)[0].z,
      cycle = ((((rig.state.strokePhase - 0.07) / (2 * Math.PI)) % 1) + 1) % 1;
    zs.push(z);
    maxFeather = Math.max(maxFeather, rig.limbs[0].wrist.rotation.x);
    if (previous) {
      if (cycle > 0.06 && cycle < 0.52) {
        powerCount++;
        if (z > previous.z) backward++;
      }
      if (cycle > 0.64 && cycle < 0.94) {
        recoveryCount++;
        if (z < previous.z) forward++;
      }
    }
    previous = { z };
  }
  assert.ok(
    Math.max(...zs) - Math.min(...zs) > 0.055,
    "cruise needs a visible actual-palm travel, not a tiny idle yaw",
  );
  assert.ok(backward / powerCount > 0.9);
  assert.ok(forward / recoveryCount > 0.85);
  assert.ok(
    maxFeather > 0.6,
    "returning paws feather clearly rather than pushing in both directions",
  );
});

test("Natural patrol faces its actual forward travel without a second orientation delay or increased speed", () => {
  const originalDocument = globalThis.document,
    noop = () => {},
    context = new Proxy(
      {
        createRadialGradient: () => ({ addColorStop: noop }),
        createLinearGradient: () => ({ addColorStop: noop }),
      },
      { get: (t, k) => t[k] ?? noop },
    );
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  };
  const e = createEncounters(new T.Scene(), {
    seabedHeight: () => -90,
    groundHeightAt: () => -90,
    audio: { hit: noop, eat: noop, bossAttack: noop },
    notify: noop,
    onDamage: noop,
    onBite: noop,
  });
  try {
    e.reset(["black_tortoise"], { black_tortoise: [0, -16, 0] });
    const b = e.bosses.find((b) => b.enabled),
      p = createPlayer("orca", 15),
      at = new T.Vector3(400, 80, 400),
      forward = new T.Vector3(0, 0, -1);
    let moved = 0;
    for (let i = 1; i <= 240; i++) {
      const previous = b.mesh.position.clone();
      e.update(1 / 60, i / 60, p, at, forward, { blockedBetween: () => false });
      const delta = b.mesh.position.clone().sub(previous),
        distance = delta.length();
      if (distance < 1e-6) continue;
      moved++;
      assert.ok(
        Math.abs(distance * 60 - 3.4) < 1e-6,
        "patrol retains its existing 3.4 m/s speed",
      );
      const facing = new T.Vector3(0, 0, -1).applyQuaternion(b.mesh.quaternion);
      delta.normalize();
      const horizontal =
        (facing.x * delta.x + facing.z * delta.z) /
        (Math.hypot(facing.x, facing.z) * Math.hypot(delta.x, delta.z));
      assert.ok(
        horizontal > 0.999999,
        "displayed head and actual horizontal travel must align every frame",
      );
      const expected = Math.cos(
        Math.max(0, Math.abs(Math.asin(delta.y)) - 0.22),
      );
      assert.ok(
        facing.dot(delta) >= expected - 1e-8,
        "vertical differences are limited to the existing shallow-pitch posture",
      );
    }
    assert.ok(moved > 180);
  } finally {
    e.dispose();
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
