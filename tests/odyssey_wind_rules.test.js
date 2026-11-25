import test from "node:test";
import assert from "node:assert/strict";
import {
  ODYSSEY_WIND_GATES,
  ODYSSEY_WIND_RULES,
  createOdysseyWindTrial,
  updateOdysseyWindTrial,
  windBodyEnvelope,
  windGateCurrent,
  windGateStatus,
  windTrialStatus,
} from "../src/odyssey_wind_rules.js";

const gate = (id = "test", guardian = "ladon", x = 0) => ({
  id,
  guardian,
  center: [x, -100, 0],
  normal: [0, 0, -1],
  width: 60,
  height: 55,
  throat: 8,
});
const trial = (gates = [gate()]) =>
  createOdysseyWindTrial({
    gates,
    finish: { center: [100, -100, -100], radius: 20 },
  });
function body(z, { x = 0, y = -100, length = 30, forward = [0, 0, -1] } = {}) {
  return windBodyEnvelope({
    position: [x, y, z],
    forward,
    length,
    radius: 5,
    verticalRadius: 4,
  });
}
function step(
  state,
  actor,
  { dt = 0.1, phase = "recover", defeated = false } = {},
) {
  return updateOdysseyWindTrial(state, dt, {
    body: actor,
    guardians: { ladon: { phase, defeated } },
  }).map((e) => ({ ...e }));
}
function ready(state, actor = body(45)) {
  step(state, actor);
  for (let i = 0; i < 60; i++) step(state, actor);
  assert.equal(state.gates.test.phase, "favorable");
}
function cross(state, options = {}) {
  const events = [];
  for (let z = 45; z >= -35; z -= 1.2)
    events.push(...step(state, body(z, options)));
  return events;
}

test("four default reservations have unique guardians and terrain-derived underwater centers", () => {
  assert.equal(ODYSSEY_WIND_GATES.length, 4);
  assert.equal(new Set(ODYSSEY_WIND_GATES.map((g) => g.guardian)).size, 4);
  for (const g of ODYSSEY_WIND_GATES) {
    assert.ok(g.center[1] < 0);
    assert.equal(g.width, 60);
    assert.equal(g.height, 55);
    assert.equal(Math.hypot(...g.normal), 1);
  }
});

test("invalid or ambiguous gate definitions are rejected", () => {
  assert.throws(() => trial([gate(), gate()]));
  assert.throws(() => trial([{ ...gate(), normal: [0, 1, 0] }]));
  assert.throws(() => trial([{ ...gate(), width: 0 }]));
  assert.throws(() =>
    createOdysseyWindTrial({ finish: { center: [0, 0, 0], radius: 0 } }),
  );
});

test("pause freezes clocks, body snapshots, defeat and completion", () => {
  const state = trial();
  step(state, body(45));
  const before = JSON.stringify(state);
  updateOdysseyWindTrial(state, 0, {
    body: body(-40),
    guardians: { ladon: { defeated: true } },
  });
  assert.equal(JSON.stringify(state), before);
  updateOdysseyWindTrial(state, 3, { active: false, body: body(-40) });
  assert.equal(JSON.stringify(state), before);
});

test("wind schedules against recovery without mutating any lord state or clock", () => {
  const state = trial();
  const guardian = Object.freeze({ phase: "attack", elapsed: 1.5 });
  for (let i = 0; i < 65; i++)
    updateOdysseyWindTrial(state, 0.1, {
      body: body(45),
      guardians: { ladon: guardian },
    });
  assert.equal(state.gates.test.phase, "warning");
  assert.equal(guardian.elapsed, 1.5);
  step(state, body(45), { phase: "recover" });
  assert.equal(state.gates.test.phase, "favorable");
  assert.equal(
    state.gates.test.phaseRemaining,
    ODYSSEY_WIND_RULES.favorableDuration,
  );
  assert.equal(windGateCurrent(state, "test").favorable, true);
});

test("an invalid continuous attack flag cannot postpone the current forever", () => {
  const state = trial();
  for (let i = 0; i < 125; i++) step(state, body(45), { phase: "attack" });
  assert.equal(state.gates.test.phase, "favorable");
});

test("a legal normal-speed whole body traversal counts after the tail clears", () => {
  const state = trial();
  ready(state);
  let entry;
  for (let z = 45; z > -15; z -= 1.2) {
    const events = step(state, body(z));
    entry ||= events.find((event) => event.type === "passage_entered");
    assert.equal(state.gates.test.crossed, false);
  }
  assert.ok(entry);
  for (let z = -15; z > -35; z -= 1.2) step(state, body(z));
  assert.equal(state.gates.test.crossed, true);
  assert.equal(state.gates.test.defeated, false);
  assert.equal(state.gates.test.stabilized, false);
});

test("crossing first and defeating first each stabilize once and preserve progress", () => {
  for (const defeatedFirst of [false, true]) {
    const state = trial();
    ready(state);
    if (defeatedFirst) step(state, body(45), { defeated: true });
    const events = cross(state);
    events.push(...step(state, body(-35), { defeated: true }));
    assert.equal(state.gates.test.stabilized, true);
    assert.equal(state.gates.test.phase, "stable");
    assert.equal(events.filter((e) => e.type === "gate_stabilized").length, 1);
    const later = step(state, body(100));
    assert.equal(state.gates.test.crossed, true);
    assert.equal(state.gates.test.defeated, true);
    assert.ok(!later.some((e) => e.type === "gate_stabilized"));
  }
});

test("reverse traversal and swimming backward through the aperture cannot complete", () => {
  const state = trial();
  ready(state, body(-45));
  for (let z = -45; z < 45; z += 1.2)
    step(state, body(z, { forward: [0, 0, 1] }));
  assert.equal(state.gates.test.crossed, false);
  ready(trial());
  const wrongHeading = trial();
  ready(wrongHeading);
  for (let z = 45; z > -40; z -= 1.2)
    step(wrongHeading, body(z, { forward: [0, 0, 1] }));
  assert.equal(wrongHeading.gates.test.crossed, false);
});

test("rim contact, leaving the aperture and approaching from the exit cannot count", () => {
  for (const options of [{ x: 29 }, { y: -73 }]) {
    const state = trial();
    ready(state, body(45, options));
    cross(state, options);
    assert.equal(state.gates.test.crossed, false);
  }
  const escape = trial();
  ready(escape);
  for (let z = 45; z >= -5; z -= 1.2) step(escape, body(z));
  for (let x = 0; x <= 36; x += 2) step(escape, body(-5, { x }));
  for (let z = -5; z > -40; z -= 1.2) step(escape, body(z, { x: 36 }));
  assert.equal(escape.gates.test.crossed, false);
});

test("teleport and invalid body jumps discard attempts rather than awarding progress", () => {
  const state = trial();
  ready(state);
  step(state, body(-40));
  assert.equal(state.gates.test.crossed, false);
  step(state, body(45));
  for (let z = 45; z >= 8; z -= 1.2) step(state, body(z));
  assert.ok(state.gates.test.attempt);
  const events = step(state, body(-80));
  assert.ok(events.some((e) => e.type === "passage_discontinuous"));
  assert.equal(state.gates.test.attempt, null);
  assert.equal(state.gates.test.crossed, false);
  step(state, {
    position: [0, -100, -100],
    forward: [0, 0, -1],
    length: 30,
    points: [],
  });
  assert.equal(state.previousBody, null);
});

test("late admission uses full remaining tail distance and normal swim speed", () => {
  const state = trial();
  ready(state);
  while (state.gates.test.phaseRemaining > 1.2) step(state, body(20));
  const events = step(state, body(18.8));
  assert.ok(events.some((e) => e.type === "passage_too_late"));
  assert.equal(state.gates.test.attempt, null);
  assert.equal(state.gates.test.crossed, false);
});

test("a stalled attempt has bounded favorable tail grace and never moves the body", () => {
  const state = trial();
  ready(state);
  for (let z = 45; z >= 8; z -= 1.2) step(state, body(z));
  assert.ok(state.gates.test.attempt);
  const actor = body(8);
  const before = JSON.stringify(actor);
  let expired = false;
  for (let i = 0; i < 150; i++)
    expired ||= step(state, actor).some((e) => e.type === "passage_expired");
  assert.equal(expired, true);
  assert.equal(state.gates.test.attempt, null);
  assert.equal(state.gates.test.crossed, false);
  assert.equal(JSON.stringify(actor), before);
});

test("a visible hull rotated to fit can pass; wide actual supports cannot", () => {
  const state = trial();
  ready(state);
  const wide = body(45);
  wide.points[0][0] = 40;
  step(state, wide);
  for (let z = 44; z >= -35; z -= 1.2) {
    const actor = body(z);
    actor.points[0][0] = 40;
    step(state, actor);
  }
  assert.equal(state.gates.test.crossed, false);
});

test("all four gate records and 30 m unlock a route, then a physical arrival wins once", () => {
  const state = trial([
    gate("test", "ladon"),
    gate("second", "karkinos", 200),
    gate("third", "scylla", 400),
    gate("fourth", "charybdis", 600),
  ]);
  // 本用例隔离归航结算；穿门本身由前面的连续运动测试验证。
  for (const g of Object.values(state.gates)) g.crossed = g.defeated = true;
  step(state, body(0, { x: 100, length: 29.9 }));
  assert.equal(windTrialStatus(state).stabilized, 4);
  assert.equal(state.unlocked, false);
  step(state, body(0, { x: 100 }));
  assert.equal(state.unlocked, true);
  assert.equal(state.won, false);
  const events = [];
  for (let z = 0; z >= -100; z -= 1.2)
    events.push(...step(state, body(z, { x: 100 })));
  assert.equal(state.won, true);
  assert.equal(events.filter((e) => e.type === "homeward_arrived").length, 1);
  assert.deepEqual(step(state, body(-100, { x: 100 })), []);
  assert.equal(windTrialStatus(state).ruleset, "odyssey_four_winds_v1");
});

test("unlocking inside the finish or teleporting there never grants immediate victory", () => {
  const state = trial();
  state.gates.test.crossed = state.gates.test.defeated = true;
  step(state, body(-100, { x: 100 }));
  assert.equal(state.unlocked, true);
  assert.equal(state.won, false);
  step(state, body(-100, { x: 100 }));
  assert.equal(state.won, false);
  step(state, body(0, { x: 100 }));
  step(state, body(-100, { x: 100 }));
  assert.equal(state.won, false);
  assert.equal(createOdysseyWindTrial().unlocked, false);
});

test("status snapshots cannot mutate an attempt and independent rounds stay isolated", () => {
  const state = trial();
  ready(state);
  for (let z = 45; z >= 8; z -= 1.2) step(state, body(z));
  const copy = windGateStatus(state, "test");
  copy.attempt.remaining = 999;
  assert.notEqual(state.gates.test.attempt.remaining, 999);
  assert.equal(windGateStatus(state, "missing"), null);
  assert.equal(windGateCurrent(state, "missing"), null);
  assert.equal(trial().gates.test.attempt, null);
});
