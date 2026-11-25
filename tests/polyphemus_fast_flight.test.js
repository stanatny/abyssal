import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { POLYPHEMUS_COMBAT } from "../src/polyphemus_combat.js";
import { POLYPHEMUS_SITE } from "../src/odyssey_polyphemus_site.js";
import { buildPolyphemusHF } from "../src/polyphemus_hf_asset.js";
import {
  BOULDER,
  boulderFlight,
  boulderPoint,
  createPolyphemusBoulders,
} from "../src/polyphemus_boulder.js";

const species = ODYSSEY_LORDS.find((s) => s.kind === "polyphemus");

/** The production HF palm, real HF rock and production hazard lifecycle are used;
 * only the initial attack state, player path and optional test wall are staged. */
function fixture(t, distance, playerRadius = 4.8) {
  const scene = new T.Scene(),
    root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.position.fromArray(POLYPHEMUS_SITE.home);
  root.scale.setScalar(species.length);
  root.userData.setPolyphemusCombat({
    phase: "attack",
    ability: "boulder",
    progress: 0.42,
  });
  motions[0](
    POLYPHEMUS_COMBAT.hunt +
      POLYPHEMUS_COMBAT.windup +
      POLYPHEMUS_COMBAT.attack * 0.42,
  );
  scene.add(root);
  root.updateMatrixWorld(true);
  const origin = root.userData.getThrowAnchorWorldPosition(new T.Vector3());
  const target = origin.clone().add(new T.Vector3(0, 0, -distance));
  const system = createPolyphemusBoulders(scene),
    hits = [];
  const entry = {
    enabled: true,
    mesh: root,
    playerRadius,
    lockTarget: target.clone(),
    state: {
      phase: "windup",
      timer: POLYPHEMUS_COMBAT.windup - 0.1,
      phaseDuration: POLYPHEMUS_COMBAT.windup,
      defeated: false,
      species,
    },
  };
  const farPlayer = target.clone().add(new T.Vector3(0, 100, 0));
  const update = (dt, from = farPlayer, to = from, options = {}) => {
    system.update(entry, dt, 0, from, to, {
      hit: (...args) => {
        hits.push(args);
        return true;
      },
      ...options,
    });
    return system.entries.get(entry);
  };
  const launch = (dt, from = farPlayer, options = {}) => {
    entry.state.phase = "attack";
    entry.state.phaseDuration = POLYPHEMUS_COMBAT.attack;
    entry.state.timer = entry.state.phaseDuration * BOULDER.release;
    return update(dt, from, from, options);
  };
  t.after(() => {
    system.dispose();
    root.userData.disposeLocalMotion();
  });
  return {
    scene,
    root,
    origin,
    target,
    system,
    hits,
    entry,
    update,
    launch,
    farPlayer,
  };
}

test("The real palm-launched rock crosses measured scene distances at the faster speed and reaches the exact warned endpoint", (t) => {
  assert.equal(species.projectileSpeed, POLYPHEMUS_COMBAT.projectileSpeed);
  assert.equal(BOULDER.speed, 240);
  assert.equal(BOULDER.minFlightTime, 0.16);
  assert.equal(BOULDER.maxFlightTime, 3);
  // 138.6009537m is the complete palm-to-lock distance measured in the earlier
  // native30 new-range throw, whose old flight lasted1.3200091s.
  const cases = [
    [10, 0.16],
    [30, 0.16],
    [50, 5 / 24],
    [100, 5 / 12],
    [138.60095366898554, 0.5775039736207731],
    [200, 5 / 6],
  ];
  for (const fps of [60, 30, 15])
    for (const [distance, expected] of cases) {
      const f = fixture(t, distance),
        dt = 1 / fps,
        d = f.update(dt);
      const warning = d.warning.geometry.attributes.position;
      assert.ok(
        new T.Vector3()
          .fromBufferAttribute(warning, warning.count - 1)
          .distanceTo(f.target) < 1e-4,
      );
      f.launch(dt);
      assert.ok(
        Math.abs(d.flight.duration - expected) < 1e-9,
        `${distance}m actual flight duration`,
      );
      assert.ok(
        d.flight.origin.distanceTo(f.origin) < 1e-9,
        "Launch must use the actual posed HF palm",
      );
      assert.ok(
        d.flying.position.distanceTo(f.origin) < 1e-9,
        "Flight begins at the palm without an advance or teleport",
      );
      const flight = d.flight;
      assert.ok(boulderPoint(flight, expected).distanceTo(f.target) < 1e-9);
      let frames = 0;
      while (d.flight && frames++ < Math.ceil(expected * fps) + 2) f.update(dt);
      assert.equal(d.flight, null);
      assert.ok(Math.abs(d.age - expected) < 1e-9);
      assert.ok(
        d.wave.position.distanceTo(f.target) < 1e-9,
        `${fps}fps actual impact endpoint`,
      );
      assert.equal(frames, Math.ceil(expected * fps - 1e-8));
      assert.equal(f.hits.length, 0);
      for (let n = 0; n < Math.ceil(BOULDER.waveDuration * fps) + 2; n++)
        f.update(dt);
      assert.equal(d.wave.visible, false);
    }
  const extreme = boulderFlight(new T.Vector3(), new T.Vector3(0, 0, -1000));
  assert.equal(
    extreme.duration,
    3,
    "The existing maximum hazard lifetime remains bounded",
  );
  assert.ok(
    boulderPoint(extreme, 3).distanceTo(new T.Vector3(0, 0, -1000)) < 1e-8,
  );
});

test("240m/s real boulders sweep a simultaneously moving player at60/30/15fps without repeated direct or wave damage", (t) => {
  for (const fps of [60, 30, 15]) {
    const dt = 1 / fps,
      crossingTime = (Math.floor(0.25 / dt) + 0.5) * dt;
    for (const miss of [false, true]) {
      const f = fixture(t, 120, 0.48),
        crossingPoint = boulderPoint(
          boulderFlight(f.origin, f.target),
          crossingTime,
        );
      const playerAt = (time) =>
        crossingPoint
          .clone()
          .add(new T.Vector3(90 * (time - crossingTime), miss ? 30 : 0, 0));
      const d = f.launch(dt, playerAt(0));
      const flight = d.flight;
      if (fps === 15 && !miss) {
        const a = crossingTime - dt / 2,
          b = crossingTime + dt / 2,
          radius = f.system.radius + f.entry.playerRadius;
        assert.ok(boulderPoint(flight, a).distanceTo(playerAt(a)) > radius);
        assert.ok(
          boulderPoint(flight, b).distanceTo(playerAt(b)) > radius,
          "Both frame endpoints miss: real relative sweep must catch the middle",
        );
      }
      for (
        let k = 1;
        k <= Math.ceil((flight.duration + BOULDER.waveDuration + 0.2) * fps);
        k++
      )
        f.update(dt, playerAt((k - 1) * dt), playerAt(k * dt));
      assert.equal(
        f.hits.length,
        miss ? 0 : 1,
        `${fps}fps moving ${miss ? "near miss" : "crossing"}`,
      );
      if (!miss) assert.equal(f.hits[0][0], 30);
      assert.equal(d.flight, null);
      assert.equal(d.flying.visible, false);
      assert.equal(d.wave.visible, false);
    }
  }
});

test("Fast actual flight and its warning meet the same finite-radius wall at60/30/15fps", (t) => {
  for (const fps of [60, 30, 15]) {
    const f = fixture(t, 100),
      dt = 1 / fps,
      wall = f.origin.z - 50;
    const blocked = (a, b, radius = 0) => Math.min(a.z, b.z) - radius <= wall;
    const d = f.update(dt, f.target, f.target, { blocked });
    const warned = d.landing.position.clone();
    assert.ok(Math.abs(warned.z - (wall + f.system.radius)) < 0.003);
    f.launch(dt, f.target, { blocked });
    for (let n = 0; n < Math.ceil((3 + BOULDER.waveDuration) * fps); n++)
      f.update(dt, f.target, f.target, { blocked });
    assert.equal(f.hits.length, 0, `${fps}fps covered player`);
    assert.ok(
      d.wave.position.distanceTo(warned) < 0.01,
      "Fast stone must hit the warned near face rather than tunnel to the far side",
    );
    assert.equal(d.flight, null);
    assert.equal(d.wave.visible, false);
  }
});

test("The shortest0.16s flight freezes halfway during pause and resumes to its original endpoint", (t) => {
  const f = fixture(t, 30),
    d = f.launch(1 / 60);
  f.update(0.08);
  const half = d.flying.position.clone(),
    age = d.age,
    flight = d.flight;
  assert.ok(Math.abs(age - 0.08) < 1e-9);
  for (const dt of [0, -1, NaN, Infinity]) f.update(dt);
  f.update(60, f.farPlayer, f.farPlayer, { active: false });
  assert.equal(d.flight, flight);
  assert.equal(d.age, age);
  assert.ok(d.flying.position.equals(half));
  assert.equal(f.hits.length, 0);
  f.update(0.08);
  assert.equal(d.flight, null);
  assert.ok(Math.abs(d.age - 0.16) < 1e-9);
  assert.ok(d.wave.position.distanceTo(f.target) < 1e-9);
  f.system.reset();
  assert.equal(f.system.entries.size, 0);
  assert.equal(f.root.userData.throwAnchor.children.length, 0);
  assert.equal(d.wave.parent, null);
  assert.equal(d.flying.parent, null);
});
