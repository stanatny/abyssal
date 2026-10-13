import test from "node:test";
import assert from "node:assert/strict";
import {
  createLordLockState,
  tickLordLock,
  createLordLockFeedback,
} from "../src/lord_lock_feedback.js";
import {
  BOSS_SPECIES,
  createBossState,
  tickBoss,
  bossEngagement,
} from "../src/boss_rules.js";

const position = { x: 0, y: 0, z: 0 };
function entry(kind = "kraken", x = 10) {
  return {
    enabled: true,
    state: createBossState(BOSS_SPECIES.find((s) => s.kind === kind)),
    mesh: { position: { x, y: 0, z: 0 } },
  };
}
function tick(state, entries, dt = 0.1) {
  return tickLordLock(state, dt, entries, position);
}

test("actual engagement, attack/recovery and territorial return drive lock feedback", () => {
  const b = entry(),
    state = createLordLockState();
  tick(state, [b]);
  assert.equal(state.mode, "idle");
  tickBoss(b.state, 0, { inTerritory: true, distance: 40 });
  tick(state, [b]);
  assert.equal(state.mode, "locked");
  for (let i = 0; i < 300; i++) {
    tickBoss(b.state, 0.1, { inTerritory: true, distance: 40 });
    tick(state, [b]);
    assert.equal(state.mode, "locked", b.state.phase);
  }
  tickBoss(b.state, 0, { inTerritory: false });
  assert.equal(b.state.phase, "return");
  tick(state, [b], 0.44);
  assert.equal(state.mode, "locked");
  tick(state, [b], 0.02);
  assert.equal(state.mode, "released");
  tick(state, [b], 2.6);
  assert.equal(state.mode, "idle");
});

test("inactive, ward-locked and defeated lords cannot acquire a lock", () => {
  for (const field of ["disabled", "locked", "defeated"]) {
    const b = entry(),
      state = createLordLockState();
    b.state.phase = "hunt";
    if (field === "disabled") b.enabled = false;
    else b.state[field] = true;
    tick(state, [b]);
    assert.equal(state.mode, "idle");
  }
});

test("temporary ink interference retains existing pursuit but never invents one", () => {
  const b = entry(),
    state = createLordLockState();
  tickBoss(b.state, 0, { inTerritory: true, distance: 40 });
  tick(state, [b]);
  tickBoss(b.state, 1, { inTerritory: false, disoriented: true });
  tick(state, [b], 1);
  assert.equal(state.mode, "locked");
  tickBoss(b.state, 0, { inTerritory: false });
  tick(state, [b], 0.5);
  assert.equal(state.mode, "released");
  tick(createLordLockState(), [b]);
  b.state.phase = "disoriented";
  assert.equal(tick(createLordLockState(), [b]).mode, "idle");
});

test("all pursuers must stop before release; changing nearest lord does not replay entry", () => {
  const a = entry(),
    b = entry("hydra", 20),
    state = createLordLockState();
  a.state.phase = b.state.phase = "hunt";
  tick(state, [a, b]);
  assert.equal(state.count, 2);
  tick(state, [a, b], 2);
  b.mesh.position.x = 5;
  tick(state, [a, b]);
  assert.equal(state.primary, b);
  assert.ok(state.age >= 2);
  a.state.defeated = true;
  tick(state, [a, b]);
  assert.equal(state.mode, "locked");
  assert.equal(state.count, 1);
  b.enabled = false;
  assert.equal(tick(state, [a, b], 0.5).mode, "released");
});

test("brief boundary re-entry keeps a continuous lock; re-entry during release cancels all-clear", () => {
  const b = entry(),
    state = createLordLockState();
  b.state.phase = "hunt";
  tick(state, [b]);
  tick(state, [b], 2);
  b.state.phase = "return";
  tick(state, [b], 0.2);
  b.state.phase = "hunt";
  tick(state, [b]);
  assert.equal(state.quiet, 0);
  assert.ok(state.age > 2);
  b.state.phase = "return";
  tick(state, [b], 0.5);
  assert.equal(state.mode, "released");
  b.state.phase = "hunt";
  tick(state, [b]);
  assert.equal(state.mode, "locked");
  assert.equal(state.age, 0);
});

test("unlocked persistent Sage remains locked outside the monastery", () => {
  const b = entry("sword_sage"),
    state = createLordLockState();
  assert.equal(bossEngagement(b.state, false), true);
  tickBoss(b.state, 0.1, {
    inTerritory: true,
    distance: 500,
    lineOfSight: false,
  });
  tick(state, [b]);
  assert.equal(state.mode, "locked");
  b.state.locked = true;
  tick(state, [b], 0.5);
  assert.equal(state.mode, "released");
});

test("paused zero steps preserve release timing; long active steps expire it", () => {
  const b = entry(),
    state = createLordLockState();
  b.state.phase = "hunt";
  tick(state, [b]);
  b.state.phase = "return";
  tick(state, [b], 0.5);
  tick(state, [b], 0);
  tick(state, [b], NaN);
  tick(state, [b], -10);
  assert.equal(state.age, 0);
  tick(state, [b], 8);
  assert.equal(state.mode, "idle");
});

test("DOM feedback is bounded, reduced-motion readable and reset clears both reused surfaces", () => {
  const node = () => ({
    hidden: true,
    dataset: {},
    style: { setProperty() {} },
  });
  const panel = node(),
    frame = node(),
    title = {},
    detail = {};
  const ui = createLordLockFeedback({ panel, frame, title, detail });
  const b = entry();
  b.state.phase = "hunt";
  ui.update(0.1, [b], position, true);
  assert.equal(panel.hidden, false);
  assert.equal(frame.style.opacity, "0");
  assert.equal(frame.hidden, true);
  assert.equal(title.textContent, "领主已锁定你");
  ui.update(2.6, [b], position, true);
  assert.equal(title.textContent, "深渊领主锁定");
  assert.equal(panel.dataset.acquired, "false");
  b.state.phase = "return";
  ui.update(0.5, [b], position, true);
  assert.equal(title.textContent, "已脱离领主锁定");
  assert.equal(frame.hidden, false);
  ui.reset();
  assert.equal(panel.hidden, true);
  assert.equal(frame.hidden, true);
  assert.equal(frame.style.opacity, "0");
  ui.update(0.1, [b], position);
  assert.equal(panel.hidden, true);
});
