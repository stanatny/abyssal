import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createWindTrialRuntime,
  FITTED_WIND_GATES,
  HOMEWARD_FINISH,
} from "../src/odyssey_wind_trial.js";
import { traceTideGate } from "../src/odyssey_tide_rules.js";

const forward = new THREE.Vector3(0, 0, -1);
function fixture(length = 30) {
  const runtime = createWindTrialRuntime({ seed: 1 });
  runtime.setMonumentReady(true);
  const player = {
    length,
    invulnerable: 0,
    dead: false,
    timedOut: false,
    won: false,
    health: 100,
  };
  const position = new THREE.Vector3(0, -60, 0);
  const bosses = FITTED_WIND_GATES.map((gate) => ({
    enabled: true,
    state: { species: { kind: gate.guardian }, defeated: false },
  }));
  const damage = [],
    notices = [],
    sounds = [];
  const avatar = {
    updateWorldMatrix() {
      throw new Error("Puzzle must not traverse animated body meshes");
    },
  };
  const step = (dt = 0.1, options = {}) =>
    runtime.update(
      dt,
      player,
      position,
      forward,
      avatar,
      bosses,
      (...args) => notices.push(args),
      { quest: (key) => sounds.push(key) },
      { damage: (...args) => damage.push(args), ...options },
    );
  const poseForNose = (target, approach = 0) =>
    position.copy(target).addScaledVector(forward, -length * 0.42 - approach);
  const control = (index, gateIndex = 0) =>
    new THREE.Vector3(
      ...(index === 4
        ? runtime.layouts[gateIndex].master.position
        : runtime.layouts[gateIndex].rotors[index].position),
    );
  const enter = (index, options = {}, gateIndex = 0) => {
    const target = control(index, gateIndex);
    poseForNose(target, 12);
    step(0.1, options);
    poseForNose(target, 7);
    step(0.1, options);
    poseForNose(target, 2);
    return [...step(0.1, options)];
  };
  return {
    runtime,
    player,
    position,
    bosses,
    damage,
    notices,
    sounds,
    step,
    poseForNose,
    control,
    enter,
  };
}
function solution(variant) {
  for (let n = 0; n < 256; n++) {
    const rotations = [n & 3, (n >> 2) & 3, (n >> 4) & 3, (n >> 6) & 3];
    if (traceTideGate(variant, rotations).valid) return rotations;
  }
}
function defeat(f) {
  f.bosses[0].state.defeated = true;
  f.step();
}

test("runtime uses fixed native nose contacts and guardian-first controls with no mesh traversal", () => {
  for (const length of [6, 25, 30]) {
    const f = fixture(length),
      gate = f.runtime.state.gates.pillar_gate;
    assert.equal(FITTED_WIND_GATES[0].guardian, "polyphemus");
    assert.equal(
      f.enter(0).some((event) => event.type === "rotor_changed"),
      false,
    );
    assert.deepEqual(gate.rotations, [0, 0, 0, 0]);
    assert.match(f.runtime.notice, /守卫/);
    defeat(f);
    const events = f.enter(0);
    assert.equal(events.filter((e) => e.type === "rotor_changed").length, 1);
    assert.deepEqual(gate.rotations, [1, 0, 0, 0]);
    for (let i = 0; i < 10; i++) f.step();
    assert.deepEqual(
      gate.rotations,
      [1, 0, 0, 0],
      "Holding a knob cannot repeat",
    );
    f.enter(0);
    assert.deepEqual(
      gate.rotations,
      [2, 0, 0, 0],
      "Leaving the6m margin rearms a knob",
    );
    assert.equal(f.player.health, 100);
    assert.equal(f.runtime.nearPuzzle.state, gate);
    assert.equal(f.runtime.nearPuzzle.layout, f.runtime.layouts[0]);
    assert.ok(f.runtime.hint());
  }
});

test("fixed3.5m contact never grows with body length and backside or static occlusion rejects a touch", () => {
  for (const length of [6, 30]) {
    const f = fixture(length);
    defeat(f);
    const target = f.control(0).add(new THREE.Vector3(3.6, 0, 0));
    f.poseForNose(target, 12);
    f.step();
    f.poseForNose(target, 7);
    f.step();
    f.poseForNose(target, 2);
    f.step();
    assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 0);
    let rayCalls = 0;
    f.enter(0, {
      blocked: (from, to) => {
        assert.ok(from.isVector3 && to.isVector3);
        rayCalls++;
        return true;
      },
    });
    assert.ok(rayCalls > 0);
    assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 0);
  }
  const f = fixture();
  defeat(f);
  const target = f.control(0);
  const backwards = new THREE.Vector3(0, 0, 1);
  for (const approach of [12, 7, 2]) {
    f.position
      .copy(target)
      .addScaledVector(backwards, -f.player.length * 0.42 - approach);
    f.runtime.update(0.1, f.player, f.position, backwards, null, f.bosses);
  }
  assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 0);
});

test("teleports, paused restoration, protected contacts and terminal frames cannot queue interactions", () => {
  const f = fixture();
  defeat(f);
  f.poseForNose(f.control(0), 2);
  f.step();
  assert.equal(
    f.runtime.state.gates.pillar_gate.rotations[0],
    0,
    "A long jump is not a touch",
  );
  f.step();
  assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 0);
  f.player.invulnerable = 1;
  f.enter(0);
  assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 0);
  assert.match(f.runtime.notice, /保护/);
  f.player.invulnerable = 0;
  f.step();
  assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 0);
  f.step(0, { active: false });
  f.step();
  assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 0);
  f.enter(0);
  assert.equal(f.runtime.state.gates.pillar_gate.rotations[0], 1);
  for (const flag of ["dead", "timedOut", "won"]) {
    f.player[flag] = true;
    const before = JSON.stringify(f.runtime.state);
    f.enter(1);
    assert.equal(JSON.stringify(f.runtime.state), before);
    f.player[flag] = false;
  }
});

test("a real wrong master contact waits for flow, calls shared damage once and needs fresh re-entry", () => {
  const f = fixture();
  defeat(f);
  f.enter(0);
  f.step(0.5);
  const events = f.enter(4);
  assert.equal(events.filter((e) => e.type === "test_started").length, 1);
  assert.equal(f.damage.length, 0);
  f.step(1);
  assert.equal(f.damage.length, 0);
  f.step(0.5);
  assert.equal(f.damage.length, 1);
  assert.equal(f.damage[0][0], 20);
  assert.equal(f.damage[0][1].type, "puzzle_failed");
  assert.deepEqual(f.runtime.state.gates.pillar_gate.rotations, [0, 0, 0, 0]);
  assert.equal(
    f.player.health,
    100,
    "Runtime delegates health settlement rather than owning it",
  );
  f.step(4);
  f.step();
  assert.equal(f.damage.length, 1);
  assert.equal(f.runtime.state.gates.pillar_gate.testing, false);
  f.enter(4);
  assert.equal(f.runtime.state.gates.pillar_gate.testing, true);
});

test("correct physical adjustments, final test and statue progress use the authoritative pure state", () => {
  const f = fixture();
  defeat(f);
  const gate = f.runtime.state.gates.pillar_gate;
  for (const [index, turns] of solution(gate.variant).entries())
    for (let i = 0; i < turns; i++) f.enter(index);
  f.step(0.5);
  assert.equal(gate.solved, false);
  f.enter(4);
  f.step(1.5);
  assert.equal(gate.solved, true);
  assert.equal(f.runtime.status.stabilized, 1);
  assert.equal(f.runtime.state.monumentStep, 1);
  assert.equal(f.runtime.status.homewardAvailable, false);
  assert.equal(f.damage.length, 0);
  assert.ok(f.sounds.includes("guardian"));
  assert.equal(
    f.runtime.containsCurrent(
      new THREE.Vector3(...FITTED_WIND_GATES[0].center),
    ),
    true,
  );
  assert.equal(
    f.runtime
      .current(new THREE.Vector3(...FITTED_WIND_GATES[0].center))
      .length(),
    18,
  );
});

test("unsolved gates have no hostile flow and reset clears local interactions, notices and completed state", () => {
  const f = fixture();
  defeat(f);
  const center = new THREE.Vector3(...FITTED_WIND_GATES[0].center);
  assert.equal(f.runtime.containsCurrent(center), false);
  assert.equal(f.runtime.current(center).length(), 0);
  f.enter(0);
  const seed = f.runtime.state.seed;
  f.runtime.reset();
  assert.equal(f.runtime.status.stabilized, 0);
  assert.equal(f.runtime.status.arrived, false);
  assert.equal(f.runtime.notice, "");
  assert.equal(f.runtime.nearPuzzle, null);
  assert.notEqual(f.runtime.state.seed, seed);
  assert.deepEqual(f.runtime.state.gates.pillar_gate.rotations, [0, 0, 0, 0]);
  assert.equal(f.runtime.waypoints().length, 4);
  assert.notDeepEqual(f.runtime.waypoints()[0], {
    x: HOMEWARD_FINISH.center[0],
    y: HOMEWARD_FINISH.center[1],
    z: HOMEWARD_FINISH.center[2],
  });
});
