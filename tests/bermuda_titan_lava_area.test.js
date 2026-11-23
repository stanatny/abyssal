import test from "node:test";
import assert from "node:assert/strict";
import {
  BERMUDA_TITAN_HAZARDS,
  createBermudaTitanHazards,
  titanLavaContact,
} from "../src/bermuda_titan_hazards.js";

const point = (x, y, z) => ({ x, y, z });
function warnedSheet({ awake = false, limit = Infinity } = {}) {
  const hazards = createBermudaTitanHazards({
    seed: 81,
    sites: [
      {
        id: "open_floor",
        impact: point(60, 0.12, 0),
        normal: point(0, 1, 0),
        roof: point(60, 100, 0),
        floorAt: () => 0,
        sector: "east",
      },
    ],
    cellClear: (cell) => cell.vertices.every((p) => Math.abs(p.z) <= limit),
  });
  hazards.step(0, {
    state: {
      phase: "charging",
      clock: 12,
      cycles: 0,
      hazardSeed: 81,
      relicHeld: awake,
      remaining: 4,
      phaseDuration: 4,
      guardAmount: 0,
      awareness: awake ? 0.5 : 0,
    },
    mouth: point(0, 30, 0),
    direction: point(1, 0, 0),
    position: point(-50, 30, -40),
    body: { length: 3, radius: 0.3 },
  });
  assert.equal(hazards.snapshot.lava.warningSheets.length, 1);
  return hazards.snapshot.lava.warningSheets[0];
}

test("Open cave space gains a chamber-scale complete spray and real lateral contact without extra mesh cells", () => {
  for (const [awake, width, addedEdge] of [
    [false, 180, 80],
    [true, 180, 80],
  ]) {
    const sheet = warnedSheet({ awake });
    assert.equal(sheet.width, width);
    assert.equal(sheet.vertices.length, 330);
    assert.equal(sheet.cells.length, 140);
    assert.equal(sheet.tetrahedra.length, 840);
    const added = point(64, 2, addedEdge),
      bypass = point(64, 2, width / 2 + 6);
    assert.equal(
      titanLavaContact([sheet], added, added, { radius: 0.1 }),
      true,
    );
    assert.equal(
      titanLavaContact([sheet], bypass, bypass, { radius: 0.1 }),
      false,
      "The larger fan still has a lateral escape beyond its visible edge",
    );
    assert.deepEqual(sheet.points[0], point(0, 30, 0));
  }
  assert.equal(BERMUDA_TITAN_HAZARDS.lavaDamage, 40);
  assert.equal(BERMUDA_TITAN_HAZARDS.lavaTravel, 1);
  assert.equal(BERMUDA_TITAN_HAZARDS.poolCooling, 3.5);
});

test("A constrained spray accepts a smaller expansion only when every complete cell fits", () => {
  const sheet = warnedSheet({ limit: 33 });
  assert.equal(sheet.width, 60);
  assert.ok(
    sheet.cells.every((cell) =>
      cell.vertices.every((p) => Math.abs(p.z) <= 33),
    ),
  );
});

test("Failed enlargement preserves the previously legal full sheet rather than narrowing or disabling it", () => {
  assert.equal(warnedSheet({ limit: 25 }).width, 48);
  assert.equal(warnedSheet({ limit: 9.1 }).width, 18);
});

test("A narrow first landing does not hide a broad legal chamber landing", () => {
  const site = (id, x) => ({
    id,
    impact: point(x, 0.12, 0),
    normal: point(0, 1, 0),
    roof: point(x, 100, 0),
    floorAt: () => 0,
    sector: "east",
  });
  const hazards = createBermudaTitanHazards({
    seed: 81,
    sites: [site("narrow", 45), site("broad", 60)],
    cellClear: (cell, { site }) =>
      site.id === "broad" || cell.vertices.every((p) => Math.abs(p.z) <= 25),
  });
  hazards.step(0, {
    state: {
      phase: "charging",
      clock: 12,
      cycles: 0,
      hazardSeed: 81,
      relicHeld: false,
      remaining: 4,
      phaseDuration: 4,
      guardAmount: 0,
      awareness: 0,
    },
    mouth: point(0, 30, 0),
    direction: point(1, 0, 0),
    position: point(45, 2, 0),
    body: { length: 3, radius: 0.3 },
  });
  const sheet = hazards.snapshot.lava.warningSheets[0];
  assert.equal(sheet.siteId, "broad");
  assert.equal(sheet.width, 180);
  assert.ok(hazards.snapshot.lava.validation.attempts <= 48);
});
