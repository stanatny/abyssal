import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerMotion } from "../src/player_motion.js";

function sample(kind, dt) {
  const clock = createPlayerMotion(kind);
  clock.feed();
  const values = [];
  for (let i = 1; i <= Math.ceil(2 / dt); i++) {
    clock.update(i * dt, 1, { dt, speed: 8 });
    values.push({ t: i * dt, feed: clock.state.feed });
  }
  return values;
}

test("a single ordinary meal holds the visible head pose long enough to read and then closes", () => {
  for (const kind of ["orca", "mechanical_shark", "zombie_shark"]) {
    for (const dt of [1 / 120, 1 / 60, 1 / 30]) {
      const values = sample(kind, dt);
      const open = values.filter(({ feed }) => feed >= 0.5);
      assert.ok(open.at(-1).t - open[0].t >= 0.4);
      assert.ok(open.at(-1).t - open[0].t < 0.7);
      assert.ok(values.every(({ feed }) => feed >= 0 && feed <= 1));
      assert.ok(values.at(-1).feed < 0.001);
    }
  }
});

test("the held pulse freezes on pause, refreshes on another meal, resets and remains per instance", () => {
  const a = createPlayerMotion("orca"),
    b = createPlayerMotion("orca");
  a.feed();
  for (let i = 0; i < 12; i++) a.update(i / 60, 1, { dt: 1 / 60 });
  const before = a.state.feed;
  for (let i = 0; i < 100; i++) a.update(100 + i, 1, { dt: 0 });
  assert.equal(a.state.feed, before);
  assert.equal(b.state.feed, 0);
  a.feed();
  for (let i = 0; i < 12; i++) a.update(i / 60, 1, { dt: 1 / 60 });
  assert.ok(a.state.feed > before);
  a.reset();
  assert.equal(a.state.feed, 0);
  for (let i = 0; i < 60; i++) a.update(i / 60, 1, { dt: 1 / 60 });
  assert.equal(a.state.feed, 0, "reset cannot leave a hidden hold behind");
});

test("Giant Squid retains its original unheld impulse at every sampled frame", () => {
  for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.1]) {
    const clock = createPlayerMotion("squid");
    let target = 1,
      expected = 0;
    clock.feed();
    for (let i = 1; i <= 120; i++) {
      expected += (target - expected) * (1 - Math.exp(-dt * 8));
      target *= Math.exp(-dt * 5);
      clock.update(i * dt, 1, { dt });
      assert.equal(clock.state.feed, expected);
    }
  }
});

test("elapsed-time callers keep the held pulse and mixed-dt Squid retriggers retain the old recurrence", () => {
  const elapsed = createPlayerMotion("orca"),
    explicit = createPlayerMotion("orca");
  elapsed.update(0);
  explicit.update(0, 1, { dt: 0 });
  elapsed.feed();
  explicit.feed();
  for (let i = 1; i <= 120; i++) {
    elapsed.update(i / 60);
    explicit.update(i / 60, 1, { dt: 1 / 60 });
    assert.ok(Math.abs(elapsed.state.feed - explicit.state.feed) < 1e-12);
  }
  const squid = createPlayerMotion("squid"),
    deltas = [1 / 120, 0, 1 / 30, 0.2, 1 / 60, 0.005];
  let expected = 0,
    target = 0,
    time = 0;
  for (let i = 0; i < 210; i++) {
    if ([0, 21, 87, 140].includes(i)) {
      squid.feed();
      target = 1;
    }
    const inputDt = deltas[i % deltas.length],
      dt = Math.min(0.12, inputDt);
    time += inputDt;
    expected += (target - expected) * (1 - Math.exp(-dt * 8));
    target *= Math.exp(-dt * 5);
    squid.update(time, 1, { dt: inputDt });
    assert.equal(squid.state.feed, expected);
  }
});
