import test from "node:test";
import assert from "node:assert/strict";
import {
  TIDE_RULES,
  makeTideVariant,
  traceTideGate,
  createTideTrial,
  rotateTideRotor,
  testTideGate,
  updateTideTrial,
  tideTrialStatus,
} from "../src/odyssey_tide_rules.js";

const gateDefs = ["cyclops", "crab", "heads", "whirlpool"].map(
  (guardian, i) => ({
    id: `gate_${i}`,
    guardian,
    center: [i * 100, -100, -100],
  }),
);
const finish = { center: [0, -30, 0], radius: 10 };
const create = (seed = 1) => createTideTrial({ gateDefs, finish, seed });
const guardians = Object.fromEntries(
  gateDefs.map((g) => [g.guardian, { defeated: true }]),
);
const tick = (state, dt = 0.1, rest = {}) =>
  updateTideTrial(state, dt, { position: [0, -30, -50], length: 30, ...rest });
function allRotations() {
  return Array.from({ length: 256 }, (_, n) => [
    n & 3,
    (n >> 2) & 3,
    (n >> 4) & 3,
    (n >> 6) & 3,
  ]);
}
function solutions(variant) {
  return allRotations().filter((r) => traceTideGate(variant, r).valid);
}
function unlock(state) {
  tick(state, 0.1, { guardians });
}
function adjust(state, id, target) {
  const gate = state.gates[id];
  for (let i = 0; i < 4; i++) {
    const count = (target[i] - gate.rotations[i] + 4) % 4;
    for (let j = 0; j < count; j++)
      assert.equal(rotateTideRotor(state, id, i).kind, "rotated");
  }
  tick(state, TIDE_RULES.settleDuration);
}
function solve(state, id) {
  adjust(state, id, solutions(state.gates[id].variant)[0]);
  assert.equal(testTideGate(state, id).kind, "testing");
  return [...tick(state, TIDE_RULES.testDuration)];
}

test("the authored four-joint path uses every rotor with no leak", () => {
  const variant = makeTideVariant();
  assert.deepEqual(variant.source, { tile: 0, port: 3 });
  assert.deepEqual(variant.sink, { tile: 1, port: 1 });
  const r = traceTideGate(variant, [2, 1, 0, 3]);
  assert.equal(r.valid, true);
  assert.deepEqual(r.path, [0, 2, 3, 1]);
  assert.deepEqual(r.segments, [
    { tile: 0, entry: 3, exit: 2 },
    { tile: 2, entry: 0, exit: 1 },
    { tile: 3, entry: 3, exit: 0 },
    { tile: 1, entry: 2, exit: 1 },
  ]);
  assert.deepEqual(r.leaks, []);
  assert.equal(traceTideGate(variant, [0, 0, 0, 0]).valid, false);
});

test("every D4 orientation and reverse has exactly one noninitial answer among256 choices", () => {
  for (const reflected of [false, true])
    for (const reversed of [false, true])
      for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
        const variant = makeTideVariant({ quarterTurns, reflected, reversed });
        const correct = solutions(variant);
        assert.equal(correct.length, 1, JSON.stringify(variant));
        assert.notDeepEqual(correct[0], [0, 0, 0, 0]);
        assert.equal(traceTideGate(variant, correct[0]).path.length, 4);
        for (const rotations of allRotations()) {
          const r = traceTideGate(variant, rotations);
          if (r.valid) assert.ok(r.reachedSink && r.leaks.length === 0);
        }
      }
});

test("seeded rounds give four distinct layouts and stable retry clues", () => {
  for (let seed = 0; seed < 64; seed++) {
    const a = create(seed),
      b = create(seed);
    assert.deepEqual(a, b);
    assert.equal(
      new Set(Object.values(a.gates).map((g) => solutions(g.variant)[0].join()))
        .size,
      4,
    );
    assert.ok(
      Object.values(a.gates).every(
        (g) => g.rotations.every((r) => r === 0) && !g.solved && !g.defeated,
      ),
    );
  }
  assert.notDeepEqual(create(1).gates, create(2).gates);
});

test("guardian defeat must precede every adjustment or test; swimming cannot solve a board", () => {
  const state = create(),
    gate = state.gates.gate_0;
  const before = JSON.stringify(gate);
  assert.deepEqual(rotateTideRotor(state, "gate_0", 0), {
    kind: "blocked",
    reason: "locked",
  });
  assert.deepEqual(testTideGate(state, "gate_0"), {
    kind: "blocked",
    reason: "locked",
  });
  assert.equal(JSON.stringify(gate), before);
  for (let i = 0; i < 40; i++)
    tick(state, 0.1, { position: [0, -100, -120 + i] });
  assert.equal(gate.solved, false);
  assert.equal(gate.stabilized, false);
  const events = tick(state, 0.1, {
    guardians: { cyclops: { defeated: true } },
  });
  assert.equal(events.filter((e) => e.type === "guardian_defeated").length, 1);
  assert.equal(rotateTideRotor(state, "gate_0", 0).kind, "rotated");
  assert.equal(rotateTideRotor(state, "gate_1", 0).reason, "locked");
  assert.equal(
    tick(state, 0.1, { guardians: { cyclops: { defeated: true } } }).some(
      (e) => e.type === "guardian_defeated",
    ),
    false,
  );
});

test("correct adjustment alone reveals no success and the explicit visible test lasts1.5 seconds", () => {
  const state = create();
  unlock(state);
  const gate = state.gates.gate_0;
  adjust(state, gate.id, solutions(gate.variant)[0]);
  assert.equal(gate.solved, false);
  assert.equal(gate.result, "");
  assert.equal(gate.lastTrace, null);
  assert.equal(testTideGate(state, gate.id).kind, "testing");
  assert.equal(gate.testing, true);
  assert.equal(gate.lastTrace, null);
  assert.equal(rotateTideRotor(state, gate.id, 0).reason, "testing");
  assert.equal(testTideGate(state, gate.id).reason, "testing");
  let events = [...tick(state, 1.49)];
  assert.equal(gate.solved, false);
  assert.equal(
    events.some((e) => e.type === "gate_solved"),
    false,
  );
  events = [...tick(state, 0.01)];
  assert.equal(gate.solved, true);
  assert.equal(gate.stabilized, true);
  assert.equal(gate.testRemaining, 0);
  assert.equal(gate.testingRemaining, 0);
  assert.equal(gate.lastTrace.valid, true);
  assert.equal(events.filter((e) => e.type === "gate_solved").length, 1);
  assert.equal(events.find((e) => e.type === "gate_solved").completed, 1);
  assert.equal(testTideGate(state, gate.id).reason, "solved");
  assert.equal(
    tick(state, 3).some((e) => e.type === "gate_solved"),
    false,
  );
});

test("wrong tests emit one20-base-damage event after flow, reset all rotors and retain the exact variant", () => {
  const state = create();
  unlock(state);
  const gate = state.gates.gate_0,
    variant = JSON.stringify(gate.variant);
  rotateTideRotor(state, gate.id, 0);
  assert.equal(testTideGate(state, gate.id).reason, "settling");
  tick(state, TIDE_RULES.settleDuration);
  assert.equal(testTideGate(state, gate.id).kind, "testing");
  assert.equal(
    tick(state, 1.4).some((e) => e.type === "puzzle_failed"),
    false,
  );
  const events = [...tick(state, 0.1)];
  assert.deepEqual(gate.rotations, [0, 0, 0, 0]);
  assert.equal(gate.cooldown, 3);
  assert.equal(gate.result, "failed");
  assert.equal(gate.lastResult, "failed");
  assert.equal(JSON.stringify(gate.variant), variant);
  assert.equal(events.filter((e) => e.type === "puzzle_failed").length, 1);
  assert.equal(events.find((e) => e.type === "puzzle_failed").damage, 20);
  assert.equal(testTideGate(state, gate.id).reason, "cooldown");
  assert.equal(
    rotateTideRotor(state, gate.id, 1).kind,
    "rotated",
    "Adjustment remains free during retry",
  );
  assert.equal(
    tick(state, 2).some((e) => e.type === "puzzle_failed"),
    false,
  );
  tick(state, 1);
  assert.equal(testTideGate(state, gate.id).kind, "testing");
});

test("protected, inactive, ineligible and invalid input cannot adjust, test or queue a probe", () => {
  const state = create();
  unlock(state);
  tick(state);
  for (const options of [
    { protected: true },
    { active: false },
    { eligible: false },
  ]) {
    const before = JSON.stringify(state);
    assert.equal(rotateTideRotor(state, "gate_0", 0, options).kind, "blocked");
    assert.equal(testTideGate(state, "gate_0", options).kind, "blocked");
    assert.equal(JSON.stringify(state), before);
  }
  assert.equal(rotateTideRotor(state, "gate_0", 4).reason, "invalid_rotor");
  assert.equal(testTideGate(state, "missing").reason, "unknown_gate");
  assert.equal(
    tick(state, 10).some((e) =>
      ["test_started", "puzzle_failed", "gate_solved"].includes(e.type),
    ),
    false,
  );
});

test("protection during flow cancels both correct and wrong tests without exposing or queuing a result", () => {
  for (const correct of [false, true]) {
    const state = create();
    unlock(state);
    const gate = state.gates.gate_0;
    if (correct) adjust(state, gate.id, solutions(gate.variant)[0]);
    else adjust(state, gate.id, [1, 0, 0, 0]);
    const rotations = [...gate.rotations];
    assert.equal(testTideGate(state, gate.id).kind, "testing");
    tick(state, 0.5);
    const events = [...tick(state, 1, { protected: true })];
    assert.deepEqual(
      events.map((e) => e.type),
      ["test_cancelled"],
    );
    assert.equal(events[0].reason, "protected");
    assert.equal(gate.testing, false);
    assert.equal(gate.testRemaining, 0);
    assert.equal(gate.testingRemaining, 0);
    assert.equal(gate.testRotations, null);
    assert.equal(gate.lastTrace, null);
    assert.equal(gate.result, "");
    assert.equal(gate.lastResult, "");
    assert.equal(gate.solved, false);
    assert.equal(gate.cooldown, 0);
    assert.deepEqual(gate.rotations, rotations);
    assert.deepEqual(tick(state, 10), []);
    assert.equal(
      gate.solved,
      false,
      "No delayed success after protection expires",
    );
    assert.equal(
      testTideGate(state, gate.id).kind,
      "testing",
      "A new physical master entry may submit again",
    );
  }
});

test("pause, zero dt and inactive death/terminal frames freeze a submitted test without replay", () => {
  const state = create();
  unlock(state);
  testTideGate(state, "gate_0");
  const snapshot = JSON.stringify(state);
  assert.deepEqual(updateTideTrial(state, 9, { active: false, guardians }), []);
  assert.equal(JSON.stringify(state), snapshot);
  assert.deepEqual(updateTideTrial(state, 0, { guardians }), []);
  assert.equal(JSON.stringify(state), snapshot);
  assert.deepEqual(updateTideTrial(state, NaN, {}), []);
  assert.equal(JSON.stringify(state), snapshot);
  const events = [...tick(state, 1.5)];
  assert.equal(events.filter((e) => e.type === "test_started").length, 1);
  assert.equal(events.filter((e) => e.type === "puzzle_failed").length, 1);
});

test("four actual solves raise four steps once and retain them below the30m finish gate", () => {
  const state = create();
  unlock(state);
  const events = [];
  for (const definition of gateDefs)
    events.push(...solve(state, definition.id));
  assert.deepEqual(
    events.filter((e) => e.type === "gate_solved").map((e) => e.completed),
    [1, 2, 3, 4],
  );
  assert.equal(state.monumentStep, 4);
  assert.equal(state.unlocked, true);
  assert.equal(events.filter((e) => e.type === "homeward_unlocked").length, 1);
  assert.equal(tideTrialStatus(state).solved, 4);
  assert.equal(tideTrialStatus(state).defeated, 4);
  const smaller = create();
  unlock(smaller);
  for (const definition of gateDefs) {
    adjust(
      smaller,
      definition.id,
      solutions(smaller.gates[definition.id].variant)[0],
    );
    testTideGate(smaller, definition.id);
    tick(smaller, 1.5, { length: 29.999 });
  }
  assert.equal(smaller.unlocked, false);
  assert.equal(smaller.solvedCount, 4);
  const unlocked = [...tick(smaller, 0.1, { length: 30 })];
  assert.equal(
    unlocked.filter((e) => e.type === "homeward_unlocked").length,
    1,
  );
  assert.equal(
    tick(smaller, 0.1).some((e) => e.type === "homeward_unlocked"),
    false,
  );
});

test("homecoming requires a continuous outside-to-inside swim and settles victory once", () => {
  const state = create();
  unlock(state);
  for (const definition of gateDefs) solve(state, definition.id);
  assert.equal(state.won, false);
  tick(state, 0.1, { position: finish.center });
  assert.equal(state.won, false, "A teleported finish must not grant victory");
  tick(state, 0.1, { position: [0, -30, -14] });
  const events = [...tick(state, 0.1, { position: [0, -30, -9] })];
  assert.equal(state.won, true);
  assert.equal(events.filter((e) => e.type === "homeward_arrived").length, 1);
  const snapshot = JSON.stringify(state);
  assert.deepEqual(tick(state, 100), []);
  assert.equal(JSON.stringify(state), snapshot);
  assert.equal(testTideGate(state, "gate_0").reason, "terminal");
});

test("unlocking while already inside still requires leaving and swimming back", () => {
  const state = create();
  unlock(state);
  for (const definition of gateDefs) {
    adjust(
      state,
      definition.id,
      solutions(state.gates[definition.id].variant)[0],
    );
    testTideGate(state, definition.id);
    tick(state, 1.5, { position: finish.center });
  }
  assert.equal(state.unlocked, true);
  assert.equal(state.won, false);
  assert.equal(state.finishArmed, false);
  tick(state, 0.1, { position: [0, -30, -14] });
  tick(state, 0.1, { position: [0, -30, -9] });
  assert.equal(state.won, true);
});

test("inputs and shared player values remain untouched and large frame steps cannot count as arrival", () => {
  const state = create();
  unlock(state);
  const body = { position: [0, -30, -20], length: 30, health: 100 };
  const original = structuredClone(body);
  updateTideTrial(state, 0.1, { body, guardians });
  assert.deepEqual(body, original);
  assert.ok(!Object.hasOwn(state, "health"));
  for (const definition of gateDefs) solve(state, definition.id);
  tick(state, 1, { position: finish.center });
  assert.equal(state.won, false);
});

test("invalid boards and incomplete gate configurations fail closed", () => {
  assert.equal(traceTideGate(null, [0, 0, 0, 0]).valid, false);
  assert.equal(traceTideGate(makeTideVariant(), [0, 0, 4, 0]).valid, false);
  assert.throws(() =>
    createTideTrial({ gateDefs: gateDefs.slice(0, 3), finish }),
  );
  assert.throws(() =>
    createTideTrial({
      gateDefs: [...gateDefs.slice(0, 3), gateDefs[0]],
      finish,
    }),
  );
  assert.throws(() =>
    createTideTrial({
      gateDefs: gateDefs.map((g) => ({ ...g, guardian: "cyclops" })),
      finish,
    }),
  );
  assert.throws(() =>
    createTideTrial({ gateDefs, finish: { center: [NaN, 0, 0], radius: 1 } }),
  );
  assert.throws(() => makeTideVariant({ quarterTurns: 0.5 }));
});

test("homecoming waits for the fully raised open arch and still requires a fresh physical entry", () => {
  const state = create();
  unlock(state);
  for (const definition of gateDefs) solve(state, definition.id);
  assert.equal(state.unlocked, true);
  for (let z = -45; z <= 0; z += 5)
    tick(state, 0.1, { position: [0, -30, z], finishReady: false });
  assert.equal(state.won, false);
  assert.equal(tideTrialStatus(state).homewardReady, false);
  tick(state, 0.1, { position: [0, -30, 0], finishReady: true });
  assert.equal(
    state.won,
    false,
    "An already-inside actor cannot auto-complete as the gate opens",
  );
  for (let z = -5; z >= -20; z -= 5)
    tick(state, 0.1, { position: [0, -30, z], finishReady: true });
  for (let z = -15; z <= 0 && !state.won; z += 5)
    tick(state, 0.1, { position: [0, -30, z], finishReady: true });
  assert.equal(state.won, true);
});
