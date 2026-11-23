import test from "node:test";
import assert from "node:assert/strict";
import {
  BERMUDA_TITAN_RULES as R,
  BERMUDA_TITAN_SEALS,
  createBermudaTitanState,
  resetBermudaTitanState,
  stepBermudaTitan,
  bermudaTitanVictory,
  createTitanBreathSegment,
  titanBreathContact,
  bermudaTitanGuardPose,
} from "../src/bermuda_titan_rules.js";
import { castSegment } from "../src/collision.js";

function advance(state, seconds, options = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 20); i++)
    events.push(...stepBermudaTitan(state, 0.05, options));
  return events;
}
function enter(state, seal) {
  stepBermudaTitan(state, 0, { seal: null });
  return stepBermudaTitan(state, 0, { seal });
}
function solve(state) {
  for (const seal of BERMUDA_TITAN_SEALS) enter(state, seal);
}
const point = (x, y, z) => ({ x, y, z });

test("The sleeping environmental titan retains full visible windup, breath and recovery on active time", () => {
  const state = createBermudaTitanState();
  assert.equal(state.sleeping, true);
  assert.equal(state.phase, "cooldown");
  assert.equal(state.remaining, 5);
  assert.deepEqual(advance(state, 4.95), []);
  assert.equal(state.phase, "cooldown");
  assert.deepEqual(advance(state, 0.05), [
    { kind: "phase", phase: "charging" },
  ]);
  assert.equal(state.remaining, R.charging);
  assert.deepEqual(advance(state, 2.45), []);
  assert.equal(state.phase, "charging");
  assert.deepEqual(advance(state, 0.05), [
    { kind: "phase", phase: "breath" },
    { kind: "breath_pulse", patternId: "low_fan" },
  ]);
  assert.deepEqual(advance(state, 3), [{ kind: "phase", phase: "cooldown" }]);
  assert.equal(state.remaining, 6.4);
  assert.equal(state.phaseDuration, 6.4);
  assert.equal(state.cycles, 1);
  assert.equal(state.sleeping, true);
  assert.equal("hp" in state, false);
  assert.equal("defeated" in state, false);
});

test("Pause/death/win gating freezes all clocks, attempts, contact locks and rewards", () => {
  const state = createBermudaTitanState();
  enter(state, "wave");
  const before = structuredClone(state);
  for (let i = 0; i < 300; i++)
    assert.deepEqual(
      stepBermudaTitan(state, 10, {
        active: false,
        seal: "bone",
        relic: true,
        beamContact: true,
      }),
      [],
    );
  assert.deepEqual(state, before);
  assert.equal(stepBermudaTitan(state, -1).length, 0);
  assert.equal(stepBermudaTitan(state, NaN).length, 0);
  assert.equal(stepBermudaTitan(state, Infinity).length, 0);
  assert.equal(state.clock, before.clock);
  // A huge resumed frame cannot skip the 2.5-second visible warning.
  stepBermudaTitan(state, 1000);
  assert.ok(state.clock - before.clock <= 0.12);
});

test("Three physical seal entries follow the tablet order; mistakes retain previous checkpoints", () => {
  const state = createBermudaTitanState();
  assert.deepEqual(enter(state, "wave"), [
    { kind: "seal", seal: "wave", completed: 1 },
  ]);
  assert.deepEqual(enter(state, "flame"), [
    {
      kind: "seal_wrong",
      seal: "flame",
      damage: 30,
      completed: 1,
    },
  ]);
  assert.equal(state.completed, 1);
  assert.equal(state.barrierOpen, false);
  assert.deepEqual(enter(state, "wave"), []);
  assert.deepEqual(enter(state, "bone"), [
    { kind: "seal", seal: "bone", completed: 2 },
  ]);
  assert.deepEqual(enter(state, "flame"), [
    { kind: "seal", seal: "flame", completed: 3 },
    { kind: "barrier_open" },
  ]);
  assert.equal(state.barrierOpen, true);
  for (const seal of BERMUDA_TITAN_SEALS)
    assert.deepEqual(enter(state, seal), []);
  assert.equal(state.completed, 3);
  assert.equal(state.relicCollected, false);
});

test("Held wrong contacts and rapid retriggers cannot bill damage each frame", () => {
  const state = createBermudaTitanState();
  assert.equal(enter(state, "bone")[0].damage, R.mistakeDamage);
  assert.deepEqual(advance(state, 2, { seal: "bone" }), []);
  assert.equal(state.completed, 0);
  assert.equal(enter(state, "bone")[0].kind, "seal_wrong");
  assert.deepEqual(enter(state, "flame"), []);
  assert.equal(state.completed, 0);
  assert.equal(enter(state, "wave")[0].kind, "seal");
});

test("Charging or active breath rejects a seal without penalty; the next safe-window re-entry succeeds", () => {
  const state = createBermudaTitanState();
  advance(state, 5);
  assert.deepEqual(enter(state, "wave"), [{ kind: "seal_wait", seal: "wave" }]);
  advance(state, 5.5, { seal: "wave" });
  assert.equal(state.phase, "cooldown");
  assert.equal(state.completed, 0);
  assert.deepEqual(stepBermudaTitan(state, 0, { seal: "wave" }), []);
  assert.equal(enter(state, "wave")[0].kind, "seal");
  assert.equal(state.completed, 1);
});

test("The relic needs all seals and its own safe-window entry, and settles exactly once", () => {
  const state = createBermudaTitanState();
  assert.deepEqual(stepBermudaTitan(state, 0, { relic: true }), [
    { kind: "relic_locked" },
  ]);
  solve(state);
  advance(state, state.remaining);
  assert.equal(state.phase, "charging");
  assert.deepEqual(stepBermudaTitan(state, 0, { relic: true }), [
    { kind: "relic_wait" },
  ]);
  assert.equal(state.relicCollected, false);
  advance(state, 5.5, { relic: true });
  assert.equal(state.relicCollected, false);
  advance(state, 2.5);
  stepBermudaTitan(state, 0, { relic: false });
  assert.deepEqual(stepBermudaTitan(state, 0, { relic: true }), [
    { kind: "relic_held", remaining: 60 },
  ]);
  assert.deepEqual(advance(state, 1, { relic: true }), []);
  stepBermudaTitan(state, 0, { relic: false });
  assert.deepEqual(stepBermudaTitan(state, 0, { relic: true }), []);
  assert.equal(state.relicHeld, true);
  assert.equal(state.relicCollected, false);
  assert.equal(state.sleeping, false);
});

test("Only actual active-beam contact produces bounded damage; recovery and pause cannot hurt", () => {
  const state = createBermudaTitanState();
  const events = advance(state, 10.5, { beamContact: true }),
    hits = events.filter((e) => e.kind === "breath_hit");
  assert.equal(hits.length, 3);
  assert.ok(hits.every((h) => h.damage === 40));
  assert.equal(state.phase, "cooldown");
  assert.equal(advance(state, 4.9, { beamContact: true }).length, 0);
  const before = structuredClone(state);
  assert.deepEqual(
    stepBermudaTitan(state, 100, { active: false, beamContact: true }),
    [],
  );
  assert.deepEqual(state, before);
  const noContact = createBermudaTitanState();
  assert.equal(
    advance(noContact, 50).some((e) => e.kind === "breath_hit"),
    false,
  );
});

test("Fixed-mouth beam respects real walls, finite reach, rear safety and whole-body swept crossing", () => {
  const layout = {
      mouth: point(0, 0, 0),
      direction: point(0, 0, -3),
      range: 100,
      radius: 4,
    },
    open = createTitanBreathSegment(layout),
    body = { length: 10, forward: point(0, 0, -1) },
    stationary = (p, beam = open, b = body) =>
      titanBreathContact(beam, p, p, b);
  assert.deepEqual(open.to, point(0, 0, -100));
  assert.equal(stationary(point(0, 0, -30)), true);
  assert.equal(stationary(point(0, 0, 20)), false);
  assert.equal(stationary(point(30, 0, -30)), false);
  assert.equal(stationary(point(0, 0, -120)), false);
  assert.equal(
    titanBreathContact(open, point(-25, 0, -50), point(25, 0, -50), body),
    true,
  );
  assert.equal(
    titanBreathContact(open, point(-25, 30, -50), point(25, 30, -50), body),
    false,
  );
  // A large side-on body's near end can touch while its centre is outside.
  assert.equal(
    stationary(point(13, 0, -50), open, {
      length: 32,
      forward: point(1, 0, 0),
    }),
    true,
  );
  const wall = [
      {
        id: "test_rock",
        type: "box",
        x: 0,
        y: 0,
        z: -45,
        halfSize: point(30, 30, 4),
      },
    ],
    clipped = createTitanBreathSegment(layout, (from, to, radius) =>
      castSegment(from, to, wall, radius),
    );
  assert.ok(clipped.distance < 41);
  assert.equal(stationary(point(0, 0, -25), clipped), true);
  assert.equal(stationary(point(0, 0, -65), clipped), false);
  const blockedMouth = createTitanBreathSegment(layout, () => ({
    point: point(0, 0, 0),
  }));
  assert.equal(stationary(point(0, 0, 0), blockedMouth), false);
  assert.deepEqual(layout.direction, point(0, 0, -3));
});

test("Repeated reset clears the round without replacing the public state object or creating a fifth boss", () => {
  const state = createBermudaTitanState(),
    reference = state;
  solve(state);
  advance(state, 1.75);
  stepBermudaTitan(state, 0, { relic: true });
  advance(state, 8, { beamContact: true });
  assert.equal(resetBermudaTitanState(state), reference);
  assert.deepEqual(state, createBermudaTitanState());
  for (const lordsDefeated of [0, 1, 2, 3, 4]) {
    assert.equal(
      bermudaTitanVictory({ lordsDefeated, relicCollected: false }),
      false,
    );
    assert.equal(
      bermudaTitanVictory({ lordsDefeated, relicCollected: true }),
      lordsDefeated === 4,
    );
  }
});

test("Real guard has a short 1.6s opening, visible preclosure and smooth independent-arm timing", () => {
  const state = createBermudaTitanState();
  assert.deepEqual(bermudaTitanGuardPose(state), {
    guardOpen: false,
    guardAmount: 1,
    guardClosing: false,
    guardCrushing: false,
  });
  advance(state, 1.35);
  assert.ok(state.guardAmount > 0 && state.guardAmount < 1);
  assert.equal(state.guardOpen, false);
  advance(state, 0.35);
  assert.equal(state.guardOpen, true);
  assert.ok(state.guardAmount < 1e-8);
  advance(state, 1.15);
  assert.equal(state.guardClosing, false);
  advance(state, 0.1);
  assert.equal(state.guardClosing, true);
  assert.equal(state.guardCrushing, false);
  advance(state, 0.35);
  assert.equal(state.guardOpen, false);
  advance(state, 0.3);
  assert.equal(state.guardCrushing, true);
  assert.ok(state.guardAmount > 0 && state.guardAmount < 1);
  const before = structuredClone(state);
  stepBermudaTitan(state, 10, {
    active: false,
    relic: true,
    guardContact: true,
  });
  assert.deepEqual(state, before);
  advance(state, 1.4);
  assert.equal(state.phase, "charging");
  assert.equal(state.guardAmount, 1);
  assert.equal(state.guardClosing, false);
});

test("Closing arms damage only actual contact, once per close, including after taking the heart", () => {
  const state = createBermudaTitanState();
  solve(state);
  advance(state, 1.75);
  stepBermudaTitan(state, 0, { relic: true });
  assert.equal(state.relicHeld, true);
  const events = advance(state, 7.8, { guardContact: () => true });
  assert.deepEqual(
    events.filter((e) => e.kind === "guard_crush"),
    [{ kind: "guard_crush", damage: 30 }],
  );
  assert.equal(state.guardOpen, false);
  assert.ok(state.guardAmount > 0);
  assert.deepEqual(
    advance(state, 0.1, { guardContact: true }).filter(
      (e) => e.kind === "guard_crush",
    ),
    [],
  );
  resetBermudaTitanState(state);
  advance(state, 3.5, { guardContact: false });
  assert.equal(state.crushCooldown, 0);
});

test("Unlocking grants an adult-sized breathing opening with advance closure warning", () => {
  const state = createBermudaTitanState();
  solve(state);
  assert.equal(state.phaseDuration, R.collectionCooldown);
  assert.equal(state.guardAmount, 1);
  let openTime = 0;
  let warningDuringOpening = 0;
  for (let i = 0; i < R.collectionCooldown * 100; i++) {
    if (state.guardOpen) {
      openTime += 0.01;
      if (state.guardClosing) warningDuringOpening += 0.01;
    }
    stepBermudaTitan(state, 0.01);
  }
  assert.ok(Math.abs(openTime - R.collectionWindow) < 0.02);
  assert.ok(Math.abs(warningDuringOpening - R.collectionWarning) < 0.02);
  assert.equal(state.guardAmount, 1);
  assert.equal(state.phase, "charging");
  assert.equal(state.relicHeld, false);
  assert.equal(state.escapeRemaining, 60);
});

test("The final seal promotes recovery without snapping a partially open or closing body", () => {
  for (const elapsed of [0, 0.7, 1.2, 1.6, 2, 2.95, 3.4, 3.7, 4.2, 4.9]) {
    const state = createBermudaTitanState();
    state.completed = 2;
    state.remaining = state.phaseDuration - elapsed;
    Object.assign(state, bermudaTitanGuardPose(state));
    const before = state.guardAmount;
    const events = stepBermudaTitan(state, 0, { seal: "flame" });
    assert.ok(events.some((e) => e.kind === "barrier_open"));
    assert.ok(
      Math.abs(before - state.guardAmount) < 1e-9,
      `pose at ${elapsed}s`,
    );
    assert.equal(state.escapeRemaining, 60);
  }
});

test("Pose-blocked relic attempts notify only on proximity entry; a newly clear real opening is one fresh contact", () => {
  const state = createBermudaTitanState();
  solve(state);
  assert.deepEqual(
    stepBermudaTitan(state, 0, { relic: true, relicAccessible: false }),
    [{ kind: "relic_guarded", reason: "guard_closed" }],
  );
  assert.deepEqual(
    advance(state, 1.8, { relic: true, relicAccessible: false }),
    [],
  );
  assert.equal(state.guardOpen, true);
  assert.equal(state.relicCollected, false);
  assert.deepEqual(
    stepBermudaTitan(state, 0, { relic: true, relicAccessible: false }),
    [],
  );
  assert.deepEqual(
    stepBermudaTitan(state, 0, { relic: true, relicAccessible: true }),
    [{ kind: "relic_held", remaining: 60 }],
  );
  assert.equal(state.relicHeld, true);
  assert.equal(state.relicCollected, false);
  stepBermudaTitan(state, 0, { relic: true, relicAccessible: false });
  assert.deepEqual(
    stepBermudaTitan(state, 0, { relic: true, relicAccessible: true }),
    [],
  );
  resetBermudaTitanState(state);
  solve(state);
  advance(state, 1.8);
  assert.deepEqual(
    stepBermudaTitan(state, 0, {
      relic: true,
      relicAccessible: { clear: true },
    }),
    [{ kind: "relic_guarded", reason: "occluded" }],
  );
  assert.equal(state.relicCollected, false);
});

function takeRelic() {
  const state = createBermudaTitanState();
  solve(state);
  advance(state, 1.75);
  const events = stepBermudaTitan(state, 0, { relic: true });
  assert.ok(events.some((e) => e.kind === "relic_held"));
  return state;
}

test("Pickup is held, never won; formal full-body exit plus three active seconds and physical doors secure the relic", () => {
  const state = takeRelic();
  assert.equal(state.relicHeld, true);
  assert.equal(state.escaping, true);
  assert.equal(state.escapeRemaining, 60);
  assert.equal(state.relicCollected, false);
  advance(state, 59);
  assert.ok(Math.abs(state.escapeRemaining - 1) < 1e-7);
  assert.deepEqual(
    stepBermudaTitan(state, 0.1, {
      escapeContact: { id: "north", crossing: 0.5 },
      escapeSafe: true,
    }).filter((e) => e.kind !== "phase" && e.kind !== "breath_pulse"),
    [{ kind: "escaped", portal: "north" }],
  );
  assert.equal(state.sealAmount, 0);
  advance(state, 2.95, { escapeSafe: true, portalsSealed: true });
  assert.equal(state.secured, false);
  const events = advance(state, 0.05, {
    escapeSafe: true,
    portalsSealed: true,
  });
  assert.ok(events.some((e) => e.kind === "secured"));
  assert.equal(state.relicCollected, true);
  assert.equal(state.secured, true);
  assert.equal(state.sealed, true);
  const final = structuredClone(state);
  assert.deepEqual(advance(state, 10, { escapeSafe: false }), []);
  assert.deepEqual(state, final);
});

test("Sealing animation without physical contacts cannot award victory, and returning inside requires another real crossing", () => {
  const state = takeRelic();
  stepBermudaTitan(state, 0, {
    escapeContact: { id: "north", crossing: 0 },
    escapeSafe: true,
  });
  advance(state, 3.1, { escapeSafe: true, portalsSealed: false });
  assert.equal(state.sealAmount, 1);
  assert.equal(state.secured, false);
  assert.deepEqual(
    stepBermudaTitan(state, 0, { escapeSafe: false, portalsSealed: true }),
    [{ kind: "escape_returned" }],
  );
  assert.equal(state.escaped, false);
  assert.equal(state.sealAmount, 0);
  advance(state, 1, { escapeSafe: true, portalsSealed: true });
  assert.equal(
    state.escaped,
    false,
    "outside coordinates alone cannot replace a fresh portal crossing",
  );
  stepBermudaTitan(state, 0, {
    escapeContact: { id: "north", crossing: 0 },
    escapeSafe: true,
  });
  assert.ok(
    advance(state, 3, { escapeSafe: true, portalsSealed: true }).some(
      (e) => e.kind === "secured",
    ),
  );
});

test("Escape countdown freezes on pause/death/menu; expiry is one fatal event and reset reopens a fresh round", () => {
  const state = takeRelic();
  advance(state, 59.9);
  const before = structuredClone(state);
  advance(state, 20, {
    active: false,
    escapeContact: { id: "north", crossing: 0 },
    escapeSafe: true,
    portalsSealed: true,
  });
  assert.deepEqual(state, before);
  const events = advance(state, 0.1);
  assert.deepEqual(
    events.filter((e) => e.kind === "entombed"),
    [{ kind: "entombed", fatal: true }],
  );
  assert.equal(state.entombed, true);
  assert.equal(state.relicCollected, false);
  assert.equal(state.secured, false);
  assert.deepEqual(advance(state, 10), []);
  resetBermudaTitanState(state);
  assert.deepEqual(state, createBermudaTitanState());
});

test("A last-frame portal crossing must precede the actual active deadline and still leave the full body safe", () => {
  for (const [crossing, safe, escaped] of [
    [0.2, true, true],
    [0.8, true, false],
    [0.1, false, false],
  ]) {
    const state = takeRelic();
    state.escapeRemaining = 0.03;
    stepBermudaTitan(state, 0.1, {
      escapeContact: { id: "north", crossing },
      escapeSafe: safe,
    });
    assert.equal(state.escaped, escaped);
    assert.equal(state.entombed, !escaped);
  }
});

test("Only the formal north exit can produce an escape, not annex gaps or outside-centre candidates", () => {
  for (const contact of [
    null,
    { id: "annex", crossing: 0 },
    { id: "west", crossing: 0 },
    { id: "south", crossing: 0 },
  ]) {
    const state = takeRelic();
    const events = stepBermudaTitan(state, 0.1, {
      escapeContact: contact,
      escapeSafe: true,
    });
    assert.equal(state.escaped, false);
    assert.equal(state.escaping, true);
    assert.equal(
      events.some((e) => e.kind === "escaped"),
      false,
    );
    assert.ok(state.escapeRemaining < 60);
  }
});

test("Slow active frames charge the full escape and sealing time but cannot skip visible breath warnings", () => {
  const state = takeRelic(),
    phaseRemaining = state.remaining;
  stepBermudaTitan(state, 0.04, { activeTimeDt: 12 });
  assert.equal(state.escapeRemaining, 48);
  assert.equal(state.phase, "charging");
  assert.equal(state.remaining, state.phaseDuration);
  assert.ok(
    state.remaining >= 2.4,
    "large frame cannot skip the newly entered warning",
  );
  const before = structuredClone(state);
  stepBermudaTitan(state, 0.04, { active: false, activeTimeDt: 90 });
  assert.deepEqual(state, before);
  stepBermudaTitan(state, 0.04, {
    activeTimeDt: 47,
    escapeContact: { id: "north", crossing: 0.5 },
    escapeSafe: true,
  });
  assert.equal(state.escaped, true);
  assert.ok(Math.abs(state.escapeRemaining - 24.5) < 1e-8);
  const event = stepBermudaTitan(state, 0.04, {
    activeTimeDt: 3,
    escapeSafe: true,
    portalsSealed: true,
  });
  assert.ok(event.some((e) => e.kind === "secured"));
  const trapped = takeRelic();
  assert.ok(
    stepBermudaTitan(trapped, 0.04, { activeTimeDt: 60 }).some(
      (e) => e.kind === "entombed",
    ),
  );
  assert.equal(trapped.secured, false);
});
