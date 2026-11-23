import test from "node:test";
import assert from "node:assert/strict";
import {
  createBermudaTitanHazards,
  createTitanLavaSheet,
  createTitanLavaPool,
  sliceTitanLavaSheet,
  titanLavaContact,
} from "../src/bermuda_titan_hazards.js";

const p = (x, y, z) => ({ x, y, z }),
  mouth = p(0, 30, 0),
  direction = p(1, 0, 0),
  site = {
    id: "landing",
    impact: p(60, 0.12, 0),
    normal: p(0, 1, 0),
    roof: p(60, 80, 0),
    sector: "east",
    floorAt: () => 0,
  };
function fixture(extraOptions = {}) {
  const state = {
      hazardSeed: 7,
      cycles: 0,
      relicHeld: false,
      phase: "charging",
      remaining: 2.5,
      phaseDuration: 2.5,
      clock: 0,
      guardAmount: 1,
      awareness: 0,
    },
    controller = createBermudaTitanHazards({
      sites: [site],
      seed: 7,
      ...extraOptions,
    }),
    options = (extra = {}) => ({
      state,
      mouth,
      direction,
      position: p(-50, 30, 50),
      previous: p(-50, 30, 50),
      body: { length: 0, radius: 0.1 },
      ...extra,
    });
  function step(dt = 0, extra = {}) {
    state.clock += dt;
    state.remaining = Math.max(0, state.remaining - dt);
    return controller.step(dt, options(extra));
  }
  function phase(name, duration) {
    state.phase = name;
    state.remaining = state.phaseDuration = duration;
    return step();
  }
  function advance(seconds, extra = {}) {
    const events = [];
    for (let left = seconds; left > 1e-8; ) {
      const dt = Math.min(0.05, left);
      events.push(...step(dt, extra));
      left -= dt;
    }
    return events;
  }
  return { state, controller, step, phase, advance };
}
function midpoint(sheet, row, column = 5) {
  const n = sheet.rows * sheet.columns,
    a = sheet.vertices[row * sheet.columns + column],
    b = sheet.vertices[n + row * sheet.columns + column];
  return p((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

test("Fractional stream cuts keep closed exact cell/skin geometry and preserve full transverse width", () => {
  const full = createTitanLavaSheet(mouth, direction, site),
    part = sliceTitanLavaSheet(full, 2.25, 8.6);
  assert.equal(part.rowParameters[0], 2.25);
  assert.equal(part.rowParameters.at(-1), 8.6);
  assert.equal(part.vertices.length, part.rows * part.columns * 2);
  const faces = new Map();
  for (let i = 0; i < part.boundary.length; i += 3)
    for (let k = 0; k < 3; k++) {
      const a = part.boundary[i + k],
        b = part.boundary[i + ((k + 1) % 3)],
        key = [a, b].sort((a, b) => a - b).join("/");
      faces.set(key, (faces.get(key) || 0) + 1);
    }
  assert.ok(
    [...faces.values()].every((n) => n === 2),
    "cut planes cap the visible/harmful solid",
  );
  assert.ok(part.cells.length > 30);
  assert.equal(sliceTitanLavaSheet(full, 3, 3), null);
  const center = midpoint(part, 2);
  assert.equal(
    titanLavaContact([part], center, center, { length: 0, radius: 0.01 }),
    true,
  );
  assert.equal(
    titanLavaContact([part], mouth, mouth, { length: 0, radius: 0.01 }),
    false,
  );
});

test("Windup publishes only preview, then actual lava travels from the mouth before reaching the landing", () => {
  const f = fixture();
  f.step();
  const warning = f.controller.snapshot.lava.warningSheets[0];
  assert.ok(warning);
  assert.equal(f.controller.snapshot.lava.sheets.length, 0);
  assert.equal(f.controller.snapshot.lava.pools.length, 0);
  const start = f.phase("breath", 3);
  assert.equal(start.filter((e) => e.kind === "breath_pulse").length, 1);
  assert.equal(f.controller.snapshot.lava.sheets.length, 0);
  f.advance(0.25);
  const lava = f.controller.snapshot.lava,
    sheet = lava.sheets[0];
  assert.ok(sheet);
  assert.equal(lava.sheets, lava.paths);
  assert.equal(sheet.flow.connectedToMouth, true);
  assert.ok(Math.abs(sheet.flow.to - 0.25) < 1e-6);
  assert.equal(sheet.flow.from, 0);
  assert.deepEqual(midpoint(sheet, 0), mouth);
  const distant = midpoint(warning, 10);
  assert.equal(
    titanLavaContact(lava.sheets, distant, distant, {
      length: 0,
      radius: 0.01,
    }),
    false,
    "unreached full-field cells never hurt",
  );
  assert.equal(lava.pools.length, 0);
  f.advance(0.8);
  assert.equal(f.controller.snapshot.lava.pools.length, 1);
  assert.equal(f.controller.snapshot.lava.pools[0].temperature, 1);
});

test("Stopping emission detaches a moving tail instead of deleting the complete stream or following the new mouth", () => {
  const f = fixture();
  f.step();
  f.phase("breath", 3);
  f.advance(1.25);
  f.phase("cooldown", 5);
  f.advance(0.25, { mouth: p(20, 70, 0) });
  const sheet = f.controller.snapshot.lava.sheets[0];
  assert.ok(sheet);
  assert.equal(sheet.flow.connectedToMouth, false);
  assert.ok(Math.abs(sheet.flow.from - 0.25) < 1e-6);
  assert.equal(sheet.flow.to, 1);
  assert.equal(
    titanLavaContact([sheet], mouth, mouth, { length: 0, radius: 0.01 }),
    false,
  );
  assert.equal(f.controller.snapshot.lava.pools[0].feeding, true);
  f.advance(0.75);
  assert.equal(f.controller.snapshot.lava.sheets.length, 0);
  assert.equal(f.controller.snapshot.lava.phase, "cooling");
  assert.equal(f.controller.snapshot.lava.pools[0].feeding, false);
  assert.ok(f.controller.snapshot.lava.pools[0].age < 1e-6);
});

test("A short real pulse continues downstream after source-off and cannot create a pool before its head lands", () => {
  const f = fixture();
  f.step();
  f.phase("breath", 3);
  f.advance(0.2);
  f.phase("cooldown", 5);
  f.advance(0.3);
  let lava = f.controller.snapshot.lava;
  assert.equal(lava.pools.length, 0);
  assert.ok(lava.sheets[0].flow.from > 0.29 && lava.sheets[0].flow.to < 0.51);
  f.advance(0.5);
  lava = f.controller.snapshot.lava;
  assert.equal(lava.pools.length, 1);
  f.advance(0.2);
  assert.equal(f.controller.snapshot.lava.sheets.length, 0);
});

test("Residual sloped pool cools after the last inflow, shrinks its real height and safely fades cold before removal", () => {
  const f = fixture();
  f.step();
  f.phase("breath", 3);
  f.advance(1.2);
  f.phase("cooldown", 5);
  f.advance(1);
  const original = f.controller.snapshot.lava.pools[0],
    hot = structuredClone(original);
  assert.equal(original.temperature, 1);
  assert.equal(original.harmful, true);
  f.advance(1);
  let pool = f.controller.snapshot.lava.pools[0];
  assert.ok(pool.temperature < hot.temperature && pool.opacity < hot.opacity);
  assert.ok(pool.geometry.bounds.max.y < hot.geometry.bounds.max.y);
  assert.deepEqual(
    pool.geometry.footprint,
    hot.geometry.footprint,
    "cooling never invents an unvalidated ground footprint",
  );
  f.advance(2);
  pool = f.controller.snapshot.lava.pools[0];
  assert.ok(pool.temperature > 0 && pool.temperature < 0.25);
  assert.equal(pool.harmful, false);
  f.advance(0.5);
  assert.equal(f.controller.snapshot.lava.pools.length, 0);
});

test("Hot pool and stream share40damage/one-second settlement, while cold residue does not bill damage", () => {
  const f = fixture(),
    point = p(65, 1, 0);
  f.step();
  f.phase("breath", 3);
  f.advance(1.2);
  assert.equal(
    f.step(0, { position: point, previous: point }).filter((e) => e.damage)
      .length,
    1,
  );
  assert.equal(
    f
      .advance(0.99, { position: point, previous: point })
      .filter((e) => e.damage).length,
    0,
  );
  const hits = f
    .advance(0.01, { position: point, previous: point })
    .filter((e) => e.damage);
  assert.deepEqual(hits, [{ kind: "hazard_hit", source: "lava", damage: 40 }]);
  f.phase("cooldown", 5);
  f.advance(1);
  f.advance(3);
  assert.equal(f.controller.snapshot.lava.pools[0].harmful, false);
  assert.equal(
    f.step(1, { position: point, previous: point }).some((e) => e.damage),
    false,
  );
});

test("Pause/reset/secured/fatal terminal handle in-flight lava and pools without another timer or extra escape time", () => {
  const f = fixture();
  f.step();
  f.phase("breath", 3);
  f.advance(1.2);
  const frozen = structuredClone(f.controller.snapshot);
  f.step(10, { active: false });
  assert.deepEqual(f.controller.snapshot, frozen);
  f.state.entombed = true;
  f.step();
  assert.equal(f.controller.snapshot.lava.pools.length, 0);
  assert.equal(f.controller.snapshot.lava.sheets.length, 0);
  assert.equal(f.controller.snapshot.terminal.active, true);
  f.controller.presentTerminal(0.6);
  assert.equal(f.controller.snapshot.terminal.progress, 0.5);
  f.controller.reset();
  assert.equal(f.controller.snapshot.lava.pools.length, 0);
  assert.equal(f.controller.snapshot.lava.warningSheets.length, 0);
  const g = fixture();
  g.step();
  g.phase("breath", 3);
  g.advance(1.2);
  g.state.secured = true;
  g.step();
  assert.equal(g.controller.snapshot.lava.pools.length, 0);
  assert.equal(g.controller.snapshot.lava.sheets.length, 0);
});

test("A source reopened after solid cover starts again at its mouth rather than inheriting a full old stream", () => {
  let blocked = false,
    version = 0;
  const f = fixture({
    clearanceVersion: () => version,
    cellClear: (cell) => !(blocked && cell.row === 7),
  });
  f.step();
  f.phase("breath", 3);
  f.advance(1.2);
  assert.equal(f.controller.snapshot.lava.sheets[0].flow.to, 1);
  blocked = true;
  version++;
  f.step(0.05);
  assert.equal(f.controller.snapshot.lava.sheets.length, 0);
  blocked = false;
  version++;
  f.step(0.05);
  assert.equal(f.controller.snapshot.lava.sheets.length, 0);
  f.advance(0.2);
  assert.ok(f.controller.snapshot.lava.sheets[0].flow.to < 0.21);
});

test("A fresh leading front is a genuinely rounded inward nose, not a full-thickness rectangular cap", () => {
  const full = createTitanLavaSheet(mouth, direction, site),
    part = sliceTitanLavaSheet(full, 0, 8.6),
    n = part.rows * part.columns,
    row = part.rows - 1;
  const heights = Array.from(
    { length: part.columns },
    (_, col) =>
      part.vertices[n + row * part.columns + col].y -
      part.vertices[row * part.columns + col].y,
  );
  assert.ok(
    Math.max(...heights) <= 0.8,
    "the actual capped leading edge is thin and rounded",
  );
  assert.ok(
    part.rows > 10,
    "the rounded transition has real intermediate cross-sections",
  );
  for (const point of part.vertices)
    assert.equal(
      titanLavaContact([full], point, point, { length: 0, radius: 0.00001 }),
      true,
    );
});

test("The real residual pool is a low rounded puddle with a one-metre centre, thin edges and matching harmless upper water", () => {
  const f = fixture();
  f.step();
  const full = structuredClone(f.controller.snapshot.lava.warningSheets[0]);
  f.phase("breath", 3);
  f.advance(1.2);
  f.phase("cooldown", 5);
  f.advance(1);
  const pool = f.controller.snapshot.lava.pools[0],
    field = pool.geometry,
    n = field.rows * field.columns,
    heights = field.vertices
      .slice(0, n)
      .map((low, i) => field.vertices[n + i].y - low.y),
    center = midpoint(field, Math.floor(field.rows / 2));
  assert.ok(Math.max(...heights) >= 1 && Math.max(...heights) <= 1.2);
  for (let row = 0; row < field.rows; row++)
    for (let col = 0; col < field.columns; col++)
      if (
        row === 0 ||
        row === field.rows - 1 ||
        col === 0 ||
        col === field.columns - 1
      )
        assert.ok(
          heights[row * field.columns + col] >= 0.15 &&
            heights[row * field.columns + col] <= 0.3,
        );
  assert.equal(
    titanLavaContact([field], center, center, { length: 0, radius: 0.01 }),
    true,
  );
  assert.equal(
    titanLavaContact(
      [field],
      p(center.x, 2.5, center.z),
      p(center.x, 2.5, center.z),
      { length: 0, radius: 0.01 },
    ),
    false,
    "no invisible old four-metre brick above the visible puddle",
  );
  assert.ok(
    field.rows >= 7,
    "rounded ends are sampled rather than a three-row rectangle",
  );
  for (const point of field.vertices)
    assert.equal(
      titanLavaContact([full], point, point, { length: 0, radius: 0.00001 }),
      true,
      "pool stays in the validated full envelope",
    );
  const boxArea =
      (field.bounds.max.x - field.bounds.min.x) *
      (field.bounds.max.z - field.bounds.min.z),
    area =
      Math.abs(
        field.footprint.reduce((sum, point, i, all) => {
          const next = all[(i + 1) % all.length];
          return sum + point.x * next.z - next.x * point.z;
        }, 0),
      ) * 0.5;
  assert.ok(
    area / boxArea > 0.6 && area / boxArea < 0.92,
    "rounded corners actually remove the old rectangular ground area",
  );
  for (const ids of field.tetrahedra) {
    const [a, b, c, d] = ids.map((i) => field.vertices[i]);
    const ab = p(b.x - a.x, b.y - a.y, b.z - a.z),
      ac = p(c.x - a.x, c.y - a.y, c.z - a.z),
      ad = p(d.x - a.x, d.y - a.y, d.z - a.z);
    const volume6 =
      ab.x * (ac.y * ad.z - ac.z * ad.y) +
      ab.y * (ac.z * ad.x - ac.x * ad.z) +
      ab.z * (ac.x * ad.y - ac.y * ad.x);
    assert.ok(
      volume6 > 1e-7,
      "rounded pool has no collapsed or inverted damage tetrahedra",
    );
  }
});

test("Rounded residual lower skin follows the same sloped seabed and all hot/cold vertices remain in the validated plan", () => {
  const floor = (x, z) => x * 0.11 + z * 0.07,
    full = createTitanLavaSheet(
      mouth,
      direction,
      { ...site, impact: p(60, floor(60, 0) + 0.12, 0), floorAt: floor },
      { seed: 17 },
    );
  for (const temperature of [1, 0.6, 0.1]) {
    const pool = createTitanLavaPool(full, { temperature, floorAt: floor }),
      n = pool.rows * pool.columns;
    for (let i = 0; i < n; i++) {
      const low = pool.vertices[i],
        high = pool.vertices[n + i];
      assert.ok(Math.abs(low.y - floor(low.x, low.z) - 0.12) < 1e-8);
      assert.ok(high.y - low.y <= 1.1 * temperature + 1e-8);
      assert.equal(
        titanLavaContact([full], high, high, { length: 0, radius: 0.00001 }),
        true,
      );
    }
  }
});

test("Private site floor callbacks reseat each rounded XY point without leaking functions into snapshots", () => {
  const floor = (x, z) => 0.7 * Math.sin(x * 0.21) + 0.3 * Math.cos(z * 0.35),
    f = fixture({
      sites: [
        { ...site, floorAt: floor, impact: p(60, floor(60, 0) + 0.12, 0) },
      ],
    });
  f.step();
  f.phase("breath", 3);
  f.advance(1.2);
  const snapshot = structuredClone(f.controller.snapshot),
    pool = snapshot.lava.pools[0].geometry;
  for (let i = 0; i < pool.rows * pool.columns; i++) {
    const point = pool.vertices[i];
    assert.ok(
      Math.abs(point.y - floor(point.x, point.z) - pool.landingClearance) <
        1e-8,
      "new rounded coordinates sample the true floor and inherit the validated sheet clearance",
    );
  }
});

test("Every hot pool cell is checked once per real world or arm-pose version, including a noncentral pool blocker", () => {
  let version = 0,
    blocked = false,
    poolChecks = 0;
  const f = fixture({
    clearanceVersion: () => version,
    cellClear: (cell) => {
      if (cell.row >= 12) poolChecks++;
      return !(blocked && cell.row === 13 && cell.column === 5);
    },
  });
  f.step();
  f.phase("breath", 3);
  f.advance(1.2);
  f.phase("cooldown", 5);
  const count = poolChecks;
  f.advance(0.1);
  assert.equal(
    poolChecks,
    count,
    "unchanged cooling is a subset of the validated hot volume",
  );
  version++;
  f.step(0.1);
  assert.equal(poolChecks - count, 60);
  blocked = true;
  version++;
  f.step(0.1);
  assert.equal(f.controller.snapshot.lava.pools.length, 0);
  blocked = false;
  version++;
  f.step(0.1);
  assert.equal(f.controller.snapshot.lava.pools.length, 1);
  f.state.guardAmount = 0.4;
  const prior = poolChecks;
  f.step(0);
  assert.equal(
    poolChecks - prior,
    60,
    "the current real arm pose invalidates pool cover too",
  );
  const exactPrior = poolChecks;
  f.state.guardAmount = 0.401;
  f.step(0);
  assert.equal(
    poolChecks - exactPrior,
    60,
    "sub-bin arm movement cannot inherit a stale pool-volume acceptance",
  );
});
