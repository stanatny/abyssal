import test from "node:test";
import assert from "node:assert/strict";
import {
  createBermudaTitanHazards,
  createTitanLavaPath,
  titanLavaContact,
  titanLavaImpactContact,
  titanFallingRockContact,
} from "../src/bermuda_titan_hazards.js";
import {
  createBermudaTitanState,
  stepBermudaTitan,
  bermudaTitanPhaseDuration,
} from "../src/bermuda_titan_rules.js";
const p = (x, y, z) => ({ x, y, z }),
  mouth = p(0, 30, 0),
  direction = p(1, 0, 0),
  sites = Array.from({ length: 8 }, (_, i) => ({
    id: `site${i}`,
    impact: p(35 + i * 16, 0, (i % 2) * 25),
    normal: p(0, 1, 0),
    roof: p(35 + i * 16, 80, (i % 2) * 25),
    sector: i < 4 ? "north" : "south",
  })),
  options = (state, extra = {}) => ({
    state,
    mouth,
    direction,
    position: p(-50, 40, -50),
    previous: p(-50, 40, -50),
    body: { length: 3, radius: 0.5 },
    ...extra,
  });
function state(phase = "charging", awake = false) {
  const s = createBermudaTitanState();
  s.relicHeld = awake;
  s.phase = phase;
  s.phaseDuration = bermudaTitanPhaseDuration(s, phase);
  s.remaining = s.phaseDuration;
  return s;
}

function advance(controller, s, seconds, extra = {}) {
  const events = [];
  for (let left = seconds; left > 1e-8; ) {
    const dt = Math.min(0.05, left);
    s.clock += dt;
    s.remaining = Math.max(0, s.remaining - dt);
    events.push(...controller.step(dt, options(s, extra)));
    left -= dt;
  }
  return events;
}

test("A seeded continuous fan locks its warning, travels from the mouth, drains and cools without tracking later player positions", () => {
  const a = createBermudaTitanHazards({ sites, seed: 81 }),
    b = createBermudaTitanHazards({ sites, seed: 81 }),
    s = state();
  assert.deepEqual(a.step(0, options(s)), []);
  b.step(0, options(s));
  assert.deepEqual(a.snapshot, b.snapshot);
  const warned = structuredClone(a.snapshot.lava.warningSheets);
  assert.equal(warned.length, 1);
  assert.equal(warned[0].type, "molten_sheet");
  assert.equal(warned[0].tetrahedra.length, 840);
  assert.ok(warned.every((r) => r.points.length === 13));
  assert.equal(a.snapshot.lava.sheets.length, 0);
  assert.equal(a.snapshot.lava.pools.length, 0);
  s.phase = "breath";
  s.remaining = s.phaseDuration = 3;
  const events = a.step(0, options(s, { position: p(100, 0, 25) }));
  assert.equal(events.filter((e) => e.kind === "breath_pulse").length, 1);
  assert.equal(a.snapshot.lava.warningSheets.length, 0);
  assert.equal(
    a.snapshot.lava.paths.length,
    0,
    "the leading front starts at the mouth, not the landing",
  );
  assert.equal(
    advance(a, s, 0.25, { position: p(100, 0, 25) }).some(
      (e) => e.kind === "breath_pulse",
    ),
    false,
  );
  const partial = a.snapshot.lava.sheets[0];
  assert.equal(partial.siteId, warned[0].siteId);
  assert.deepEqual(partial.impact, warned[0].impact);
  assert.ok(Math.abs(partial.flow.to - 0.25) < 1e-8);
  assert.equal(partial.flow.from, 0);
  assert.equal(partial.flow.connectedToMouth, true);
  assert.equal(a.snapshot.lava.paths, a.snapshot.lava.sheets);
  assert.ok(partial.tetrahedra.length < warned[0].tetrahedra.length);
  advance(a, s, 0.75);
  assert.equal(a.snapshot.lava.sheets[0].flow.to, 1);
  assert.equal(a.snapshot.lava.pools.length, 1);
  s.phase = "cooldown";
  s.remaining = s.phaseDuration = 5;
  a.step(0, options(s));
  advance(a, s, 0.1);
  assert.equal(a.snapshot.lava.lifecycle, "draining");
  assert.equal(a.snapshot.lava.sheets[0].flow.connectedToMouth, false);
  assert.ok(Math.abs(a.snapshot.lava.sheets[0].flow.from - 0.1) < 1e-8);
  advance(a, s, 0.9);
  assert.equal(a.snapshot.lava.paths.length, 0);
  assert.equal(a.snapshot.lava.phase, "cooling");
  assert.equal(a.snapshot.lava.pools[0].feeding, false);
  advance(a, s, 3.5);
  assert.equal(a.snapshot.lava.phase, "off");
  assert.equal(a.snapshot.lava.pools.length, 0);
  a.reset(82);
  a.step(0, options(state()));
  assert.notDeepEqual(
    a.snapshot.lava.warningSheets.map((p) => p.impact),
    warned.map((p) => p.impact),
  );
});

test("A blocked trajectory rejects the entire stream instead of displaying or damaging from a clipped fragment", () => {
  const blocked = createBermudaTitanHazards({
      sites,
      seed: 2,
      pathClear: () => false,
    }),
    s = state("breath");
  assert.deepEqual(blocked.step(0.05, options(s, { position: mouth })), []);
  assert.equal(blocked.snapshot.lava.paths.length, 0);
  const path = createTitanLavaPath(mouth, direction, sites[0], { id: "whole" });
  assert.deepEqual(path.points[0], mouth);
  assert.deepEqual(path.impact, sites[0].impact);
  assert.ok(path.points.at(-1).y > path.impact.y);
  assert.equal(
    titanLavaContact([path], mouth, mouth, { length: 3, radius: 0.5 }),
    true,
  );
});

test("Four-metre impact cylinders preserve tilt and sweeps, while actual landing damage waits for arrival and retains its one-second interval", () => {
  const path = createTitanLavaPath(mouth, direction, sites[0]),
    point = p(35, 3, 0);
  assert.equal(path.impactHeight, 4);
  assert.equal(
    titanLavaImpactContact(path, point, point, { radius: 0.5 }),
    true,
  );
  assert.equal(
    titanLavaImpactContact(path, p(35, 6, 0), p(35, 6, 0), { radius: 0.5 }),
    false,
    "no invisible eight-metre sphere above the visible splash",
  );
  assert.equal(
    titanLavaImpactContact(path, p(20, 2, 0), p(50, 2, 0), { radius: 0.5 }),
    true,
    "fast sweep cannot tunnel through the impact",
  );
  const controller = createBermudaTitanHazards({ sites: [sites[0]], seed: 1 }),
    s = state();
  assert.equal(
    controller
      .step(0.1, options(s, { position: point, previous: point }))
      .some((e) => e.damage),
    false,
  );
  s.phase = "breath";
  s.remaining = s.phaseDuration = 3;
  const landing = p(41, 0.5, 0),
    atLanding = {
      position: landing,
      previous: landing,
      body: { length: 0, radius: 0.1 },
    };
  controller.step(0, options(s, atLanding));
  assert.equal(
    advance(controller, s, 0.9, atLanding).some((e) => e.damage),
    false,
    "the warning and unarrived front cannot hurt the distant apron",
  );
  assert.equal(controller.snapshot.lava.pools.length, 0);
  assert.deepEqual(
    advance(controller, s, 0.1, atLanding).filter((e) => e.damage),
    [{ kind: "hazard_hit", source: "lava", damage: 40 }],
  );
  assert.equal(controller.snapshot.lava.pools[0].harmful, true);
  assert.equal(
    advance(controller, s, 0.9, atLanding).some((e) => e.damage),
    false,
  );
  assert.deepEqual(
    advance(controller, s, 0.1, atLanding).filter((e) => e.damage),
    [{ kind: "hazard_hit", source: "lava", damage: 40 }],
  );
  const tilted = { ...path, impactNormal: p(Math.SQRT1_2, Math.SQRT1_2, 0) };
  assert.equal(
    titanLavaImpactContact(tilted, p(37, 2, 0), p(37, 2, 0), { radius: 0.2 }),
    true,
  );
  assert.equal(
    titanLavaContact(
      [{ ...path, points: [] }],
      point,
      point,
      { radius: 0.5 },
      () => true,
    ),
    false,
    "real cover blocks a splash through a wall",
  );
});

test("Falling rocks have readable bounded warnings, real same-time swept spheres, impact-only visuals, and bounded populations", () => {
  const controller = createBermudaTitanHazards({ sites, seed: 5 }),
    s = state("cooldown", true);
  for (let i = 0; i < 80; i++) {
    s.clock += 0.1;
    controller.step(0.1, options(s));
  }
  assert.ok(
    controller.snapshot.rocks.length > 0 &&
      controller.snapshot.rocks.length <= 6,
  );
  const first = controller.snapshot.rocks[0];
  assert.equal(first.phase, "warning");
  const target = first.warningPoint;
  for (let i = 0; i < 8; i++)
    assert.equal(
      controller
        .step(0.1, options(s, { position: target, previous: target }))
        .some((e) => e.damage),
      false,
    );
  assert.equal(controller.snapshot.rocks[0].phase, "warning");
  let seenFall = false,
    seenImpact = false;
  for (let i = 0; i < 150; i++) {
    s.clock += 0.1;
    controller.step(0.1, options(s));
    seenFall ||= controller.snapshot.rocks.some((r) => r.phase === "falling");
    seenImpact ||= controller.snapshot.rocks.some((r) => r.phase === "impact");
    assert.ok(controller.snapshot.rocks.length <= 6);
  }
  assert.ok(seenFall && seenImpact);
  assert.equal(
    titanFallingRockContact(
      { previous: p(0, 10, 0), position: p(0, -10, 0), radius: 2 },
      p(0, 0, 0),
      p(0, 0, 0),
      { radius: 0.5 },
    ),
    true,
  );
  assert.equal(
    titanFallingRockContact(
      { previous: p(0, 10, 0), position: p(0, -10, 0), radius: 1 },
      p(-10, 0, 0),
      p(0, 0, 0),
      { radius: 0.5 },
    ),
    false,
    "space paths cross at different times, not a hit",
  );
});

test("Authoritative lava phases accelerate after pickup, warnings survive huge frames, pause freezes all and expiry cannot grant extra escape time", () => {
  const s = createBermudaTitanState(),
    controller = createBermudaTitanHazards({ sites, seed: 7 });
  s.phase = "charging";
  s.phaseDuration = s.remaining = 2.5;
  stepBermudaTitan(s, 0.01, { activeTimeDt: 15 });
  assert.equal(s.phase, "charging");
  assert.equal(s.remaining, 2.25);
  assert.equal(s.clock, 15);
  for (let i = 0; i < 3; i++) {
    const awake = state("charging", true);
    awake.cycles = i;
    assert.ok(bermudaTitanPhaseDuration(awake, "charging") >= 2.4);
    assert.ok(bermudaTitanPhaseDuration(awake, "cooldown") <= 3.4);
  }
  controller.step(0.1, options(s));
  const before = structuredClone(controller.snapshot);
  controller.step(10, options(s, { active: false }));
  assert.deepEqual(controller.snapshot, before);
  s.relicHeld = true;
  s.escaping = true;
  s.escapeRemaining = 0.1;
  const events = stepBermudaTitan(s, 0.01, { activeTimeDt: 0.1 });
  assert.ok(events.some((e) => e.kind === "entombed" && e.fatal));
  controller.step(0.1, options(s));
  assert.equal(controller.snapshot.terminal.active, true);
  assert.equal(controller.snapshot.lava.paths.length, 0);
  controller.presentTerminal(0.6);
  assert.equal(controller.snapshot.terminal.progress, 0.5);
  assert.equal(s.secured, false);
  assert.equal(s.escapeRemaining, 0);
  controller.reset();
  assert.equal(controller.snapshot.terminal.active, false);
  assert.equal(controller.snapshot.rocks.length, 0);
});

test("Extinguished lava releases its route sector for later random volleys while live hazards retain one escape side", () => {
  const controller = createBermudaTitanHazards({ sites, seed: 81 }),
    s = state(),
    seen = new Set();
  for (let cycle = 0; cycle < 20; cycle++) {
    s.cycles = cycle;
    s.phase = "charging";
    controller.step(
      0,
      options(s, { position: cycle % 2 ? p(130, 0, 25) : p(35, 0, 0) }),
    );
    const sectors = new Set(
      controller.snapshot.lava.warningSheets.map((p) => p.sector),
    );
    assert.ok(sectors.size <= 1);
    for (const sector of sectors) seen.add(sector);
    s.phase = "cooldown";
    controller.step(0, options(s));
  }
  assert.deepEqual(
    [...seen].sort(),
    ["north", "south"],
    "a spent volley cannot permanently pin every later attack to one route",
  );
});

test("High-roof rocks detach from the actual roof and traverse the entire visible fall in bounded active time", () => {
  const high = {
      id: "high_roof",
      impact: p(60, 0, 0),
      normal: p(0, 1, 0),
      roof: p(60, 210, 0),
      sector: "east",
    },
    controller = createBermudaTitanHazards({ sites: [high], seed: 42 }),
    s = state("cooldown", true);
  controller.step(7, options(s));
  const rock = controller.snapshot.rocks[0];
  assert.ok(rock);
  assert.ok(
    Math.abs(rock.position.y + rock.radius + 0.5 - high.roof.y) < 1e-8,
    "not a fake spawn forty-eight metres above ground",
  );
  assert.equal(rock.position.x, high.impact.x);
  assert.equal(rock.position.z, high.impact.z);
  for (let i = 0; i < 24; i++) {
    controller.step(0.1, options(s));
    if (
      controller.snapshot.rocks.find((r) => r.id === rock.id)?.phase ===
      "falling"
    )
      break;
  }
  const start = controller.snapshot.rocks.find((r) => r.id === rock.id);
  assert.equal(start.phase, "falling");
  assert.equal(
    start.position.y,
    rock.position.y,
    "warning-to-fall transition does not skip the top half",
  );
  controller.step(0.1, options(s));
  const moved = controller.snapshot.rocks.find((r) => r.id === rock.id);
  assert.ok(
    moved.position.y < start.position.y &&
      moved.position.y > start.position.y - 15,
  );
  let elapsed = 0.1,
    impact = false;
  for (let i = 0; i < 42; i++) {
    controller.step(0.1, options(s));
    elapsed += 0.1;
    if (
      controller.snapshot.rocks.some(
        (r) => r.id === rock.id && r.phase === "impact",
      )
    ) {
      impact = true;
      break;
    }
  }
  assert.ok(
    impact && elapsed >= 1.6 && elapsed <= 4,
    "whole actual roof-to-floor distance is shown, not teleported halfway",
  );
});

test("A neutral main-fan landing does not occupy either formal exit sector", () => {
  for (const firstSector of ["cradle", "east"]) {
    const choices = [
      {
        id: "near",
        impact: p(35, 0, 0),
        normal: p(0, 1, 0),
        roof: p(0, 90, 0),
        sector: firstSector,
      },
      {
        id: "north",
        impact: p(75, 0, 0),
        normal: p(0, 1, 0),
        roof: p(40, 90, 0),
        sector: "north",
      },
      {
        id: "south",
        impact: p(115, 0, 0),
        normal: p(0, 1, 0),
        roof: p(-40, 90, 0),
        sector: "south",
      },
    ];
    let covered = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const controller = createBermudaTitanHazards({ sites: choices, seed });
      controller.step(
        0,
        options(state("charging", true), { position: p(0, 5, 0) }),
      );
      const paths = controller.snapshot.lava.warningSheets;
      if (paths[0]?.sector !== firstSector) continue;
      covered++;
      assert.equal(
        paths.length,
        1,
        "one neutral landing is one continuous fan, not an extra two exit rays",
      );
      assert.equal(paths[0].sector, firstSector);
      assert.equal(
        new Set(
          paths
            .map((p) => p.sector)
            .filter((s) => s === "north" || s === "south"),
        ).size,
        0,
        "a neutral fan does not reserve a nonexistent exit sector",
      );
    }
    assert.ok(
      covered > 0,
      "seeded fixture actually exercised the neutral-sector-first case",
    );
  }
});
