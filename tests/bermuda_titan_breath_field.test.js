import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { castSegment, bodyRadius } from "../src/collision.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import {
  BERMUDA_TITAN_BREATH_PROFILES as PROFILES,
  BERMUDA_TITAN_RULES,
  createBermudaTitanState,
  stepBermudaTitan,
  bermudaTitanBreathFrame,
  createTitanBreathField,
  titanBreathFieldContact,
} from "../src/bermuda_titan_rules.js";
const p = (x, y, z) => ({ x, y, z });
function phase(cycle, name, progress = 0) {
  const state = createBermudaTitanState();
  Object.assign(state, {
    cycles: cycle,
    phase: name,
    phaseDuration: PROFILES[cycle % 3][name],
    remaining: PROFILES[cycle % 3][name] * (1 - progress),
  });
  return state;
}
function field(state, obstruct) {
  return createTitanBreathField(
    {
      mouth: p(0, 30, 0),
      direction: p(1, 0, 0),
      frame: bermudaTitanBreathFrame(state),
    },
    obstruct,
  );
}

test("Historical curve compatibility retains timing, stable cycle selection and complete emission edges", () => {
  const ids = [];
  for (let cycle = 0; cycle < 24; cycle++) {
    const state = createBermudaTitanState();
    state.cycles = cycle;
    const f = bermudaTitanBreathFrame(state);
    ids.push(f.patternId);
    assert.deepEqual(bermudaTitanBreathFrame(structuredClone(state)), f);
    assert.ok(Math.hypot(f.headYaw, f.headPitch) <= 0.035 + 1e-9);
  }
  assert.deepEqual(
    ids.slice(0, 3),
    PROFILES.map((p) => p.id),
  );
  assert.notDeepEqual(
    ids.slice(3, 12),
    Array.from({ length: 9 }, (_, i) => PROFILES[i % 3].id),
  );
  for (let cycle = 0; cycle < 3; cycle++) {
    const state = phase(cycle, "cooldown");
    let openTime = 0;
    for (let i = 0; i < Math.round(state.phaseDuration * 100) - 1; i++) {
      const events = stepBermudaTitan(state, 0.01, { beamContact: true });
      if (state.guardOpen) openTime += 0.01;
      assert.equal(
        events.some((e) => e.kind === "breath_hit"),
        false,
      );
    }
    assert.ok(openTime >= 1.58);
    assert.ok(Math.abs(openTime - BERMUDA_TITAN_RULES.guardWindow) < 0.03);
  }
  const state = phase(1, "breath");
  const edges = [];
  for (let i = 0; i < 290; i++) {
    const events = stepBermudaTitan(state, 0.01, { beamContact: true });
    if (events.some((e) => e.kind === "breath_pulse"))
      edges.push(state.remaining);
  }
  assert.equal(
    edges.length,
    1,
    "one complete salvo, no partial-stream timing gap",
  );
});

test("Historical curve helper replays its complete bounded geometry without driving live hazards", () => {
  for (let cycle = 0; cycle < 3; cycle++)
    for (const progress of [0, 0.2, 0.4, 0.6, 0.8, 0.98]) {
      const chargeProgress =
          (0.35 + progress * (PROFILES[cycle].charging - 0.35)) /
          PROFILES[cycle].charging,
        charged = field(phase(cycle, "charging", chargeProgress)),
        actual = field(phase(cycle, "breath", progress));
      assert.equal(charged.cells.length, actual.cells.length);
      charged.cells.forEach((cell, i) => {
        assert.equal(cell.radius, actual.cells[i].radius);
        for (const end of ["from", "to"])
          for (const axis of ["x", "y", "z"])
            assert.ok(
              Math.abs(cell[end][axis] - actual.cells[i][end][axis]) < 1e-10,
              "same replayed curve, allowing only floating-point duration division",
            );
      });
      assert.equal(charged.active, false);
      assert.equal(charged.warning, true);
      assert.equal(
        titanBreathFieldContact(charged, p(25, 0, 0), p(25, 0, 0), {
          length: 30,
        }),
        false,
      );
      assert.ok(actual.cells.length <= 56);
      assert.ok(actual.cells[0].radius < 1.5);
      assert.ok(actual.cells.some((c) => c.to.y < 10));
      for (const cell of actual.cells)
        assert.ok(cell.radius >= 1.25 && cell.radius <= 4.6);
    }
  assert.equal(field(phase(1, "breath", 0.4)).active, true);
  assert.equal(field(phase(0, "cooldown", 0.5)).cells.length, 0);
});

test("Cover clips every fan lane and whole-body sweeps cannot tunnel across visible flame", () => {
  const state = phase(0, "breath", 0.7),
    open = field(state),
    wall = { type: "box", x: 12, y: 20, z: 0, halfSize: p(1, 50, 60) },
    covered = field(state, (a, b, r) => castSegment(a, b, [wall], r));
  assert.equal(
    titanBreathFieldContact(open, p(25, 15, -30), p(25, 15, 30), {
      length: 3,
      radius: 1,
    }),
    true,
  );
  assert.equal(
    titanBreathFieldContact(covered, p(25, 15, -30), p(25, 15, 30), {
      length: 3,
      radius: 1,
    }),
    false,
  );
  assert.ok(covered.cells.every((c) => c.to.x + c.radius <= 11 + 1e-6));
  assert.equal(
    titanBreathFieldContact(open, p(-25, 30, 0), p(-25, 30, 0), {
      length: 3,
      radius: 1,
    }),
    false,
  );
  const vertical = createTitanBreathField({
    mouth: p(0, 30, 0),
    direction: p(0, -1, 0),
    frame: bermudaTitanBreathFrame(state),
  });
  assert.ok(
    vertical.cells.every((c) => Object.values(c.to).every(Number.isFinite)),
  );
});

test("Tiny head lean returns smoothly on the preceding profile, resets to rest and freezes with gameplay", () => {
  const state = phase(0, "breath", 1 - 1e-8),
    last = bermudaTitanBreathFrame(state);
  stepBermudaTitan(state, 0.01);
  const first = bermudaTitanBreathFrame(state);
  assert.equal(state.phase, "cooldown");
  assert.ok(Math.abs(first.headYaw - last.headYaw) < 1e-8);
  assert.ok(Math.abs(first.headPitch - last.headPitch) < 1e-8);
  for (let i = 0; i < 4; i++) stepBermudaTitan(state, 0.1);
  const middle = bermudaTitanBreathFrame(state);
  assert.ok(Math.hypot(middle.headYaw, middle.headPitch) < 0.035);
  assert.ok(Math.hypot(middle.headYaw, middle.headPitch) > 0.005);
  const held = structuredClone(state);
  stepBermudaTitan(state, 1, { active: false });
  assert.deepEqual(state, held);
  for (let i = 0; i < 5; i++) stepBermudaTitan(state, 0.1);
  assert.equal(Math.abs(bermudaTitanBreathFrame(state).headPitch), 0);
  assert.equal(
    Math.abs(bermudaTitanBreathFrame(createBermudaTitanState()).headPitch),
    0,
  );
});
