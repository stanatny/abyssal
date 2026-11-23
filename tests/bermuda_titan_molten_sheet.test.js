import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createTitanLavaSheet,
  isTitanLavaCellBlocked,
  titanLavaContact,
  createBermudaTitanHazards,
} from "../src/bermuda_titan_hazards.js";
import { createBermudaTitanHazardVisuals } from "../src/bermuda_titan_hazard_visuals.js";
const p = (x, y, z) => ({ x, y, z }),
  mouth = p(0, 30, 0),
  direction = p(1, 0, 0),
  site = {
    id: "ground",
    impact: p(60, 0.12, 0),
    normal: p(0, 1, 0),
    roof: p(60, 100, 0),
    floorAt: () => 0,
    sector: "east",
  };
const sheet = () =>
  createTitanLavaSheet(mouth, direction, site, {
    id: "sheet",
    width: 48,
    seed: 81,
  });
const state = (phase = "charging") => ({
  phase,
  clock: 12,
  cycles: 0,
  hazardSeed: 81,
  relicHeld: false,
  remaining: 4,
  phaseDuration: 4,
  guardAmount: 0,
  awareness: 0,
});
const options = (s, extra = {}) => ({
  state: s,
  mouth,
  direction,
  position: p(-50, 30, -40),
  body: { length: 3, radius: 0.3 },
  ...extra,
});
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

function centroid(v) {
  return v.reduce(
    (a, b) =>
      p(a.x + b.x / v.length, a.y + b.y / v.length, a.z + b.z / v.length),
    p(0, 0, 0),
  );
}

test("A continuous closed broad sheet and four-metre sloped apron share 840 real tetrahedra without degenerate cells or ray gaps", () => {
  const s = sheet(),
    edges = new Map();
  assert.equal(s.vertices.length, 330);
  assert.equal(s.cells.length, 140);
  assert.equal(s.tetrahedra.length, 840);
  assert.equal(s.boundary.length / 3, 656);
  for (const ids of s.tetrahedra) {
    const [a, b, c, d] = ids.map((i) =>
      new THREE.Vector3().copy(s.vertices[i]),
    );
    assert.ok(b.sub(a).dot(c.sub(a).cross(d.sub(a))) > 1e-7);
  }
  for (let i = 0; i < s.boundary.length; i += 3)
    for (let j = 0; j < 3; j++) {
      const a = s.boundary[i + j],
        b = s.boundary[i + ((j + 1) % 3)],
        key = [a, b].sort((a, b) => a - b).join("/");
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  assert.ok([...edges.values()].every((x) => x === 2));
  for (const z of [-20, -13, -5, 0, 7, 17, 22])
    assert.equal(
      titanLavaContact([s], p(64, 2, z), p(64, 2, z), { radius: 0.1 }),
      true,
      `filled lateral point z=${z}`,
    );
  assert.equal(
    titanLavaContact([s], p(64, 8, 0), p(64, 8, 0), { radius: 0.1 }),
    false,
  );
  assert.equal(
    titanLavaContact([s], p(64, 2, 30), p(64, 2, 30), { radius: 0.1 }),
    false,
  );
  assert.equal(
    titanLavaContact([s], p(64, 2, -35), p(64, 2, 35), { radius: 0.1 }),
    true,
    "fast sweep hits between old separate rays",
  );
  const sloped = createTitanLavaSheet(
    mouth,
    direction,
    { ...site, floorAt: (x, z) => z * 0.2 },
    { width: 48 },
  );
  for (let row = 12; row < 15; row++)
    for (let col = 0; col < 11; col++) {
      const low = sloped.vertices[row * 11 + col],
        high = sloped.vertices[165 + row * 11 + col];
      assert.ok(Math.abs(low.y - (low.z * 0.2 + 0.12)) < 1e-9);
      assert.ok(Math.abs(high.y - low.y - 4) < 1e-9);
    }
});

test("Full-volume tetra cover finds a thin rotated solid between every centre/edge guide and respects hollow shells", () => {
  const s = sheet(),
    cell = s.cells[71],
    center = centroid(cell.tetrahedra[2].map((i) => cell.vertices[i])),
    box = {
      type: "box",
      ...center,
      halfSize: p(0.05, 0.08, 0.7),
      rotation: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        0.8,
      ),
    };
  assert.equal(isTitanLavaCellBlocked(cell, [box]), true);
  assert.equal(
    isTitanLavaCellBlocked(cell, [{ ...box, y: center.y + 20 }]),
    false,
  );
  assert.equal(
    isTitanLavaCellBlocked(cell, [
      { type: "sphere_shell", ...center, radius: 100, thickness: 1 },
    ]),
    false,
    "hollow shell interior is real water",
  );
  assert.equal(
    isTitanLavaCellBlocked(cell, [
      { type: "ellipsoid", ...center, axes: p(0.2, 0.3, 0.4) },
    ]),
    true,
  );
  assert.equal(
    isTitanLavaCellBlocked(cell, [
      {
        type: "capsule",
        a: p(center.x, center.y - 1, center.z),
        b: p(center.x, center.y + 1, center.z),
        radius: 0.1,
      },
    ]),
    true,
  );
});

test("One seeded fan locks its preview, memoizes true cover, follows the mouth and restarts propagation after a non-central blocker", () => {
  let blocked = false,
    version = 0,
    queries = 0;
  const c = createBermudaTitanHazards({
      sites: [site],
      seed: 8,
      clearanceVersion: () => version,
      cellClear: (cell) => {
        queries++;
        return !(blocked && cell.row === 7 && cell.column === 1);
      },
    }),
    s = state();
  c.step(0, options(s));
  assert.equal(c.snapshot.lava.warningSheets.length, 1);
  assert.equal(c.snapshot.lava.sheets.length, 0);
  assert.equal(c.snapshot.lava.sheets, c.snapshot.lava.paths);
  const first = c.snapshot.lava.warningSheets[0],
    count = queries;
  c.step(0.01, options(s));
  assert.equal(queries, count, "stable windup does not rescan all cover");
  const shifted = p(0.04, 30, 0);
  c.step(0.01, options(s, { mouth: shifted }));
  assert.deepEqual(c.snapshot.lava.warningSheets[0].points[0], shifted);
  assert.equal(
    queries,
    count + 20,
    "only the moved twenty nozzle cells are checked, not all 140",
  );
  s.phase = "breath";
  s.remaining = s.phaseDuration = 3;
  c.step(0, options(s));
  assert.equal(c.snapshot.lava.sheets.length, 0);
  advance(c, s, 1);
  assert.equal(c.snapshot.lava.sheets[0].siteId, first.siteId);
  assert.equal(c.snapshot.lava.sheets[0].width, first.width);
  assert.equal(c.snapshot.lava.sheets[0].flow.to, 1);
  blocked = true;
  version++;
  c.step(0.01, options(s));
  assert.equal(
    c.snapshot.lava.sheets.length,
    0,
    "a real off-axis blocker removes the intersecting stream",
  );
  blocked = false;
  version++;
  c.step(0.01, options(s));
  assert.equal(
    c.snapshot.lava.sheets.length,
    0,
    "reopening cannot reveal an old already-arrived front",
  );
  advance(c, s, 0.25);
  const reopened = c.snapshot.lava.sheets[0];
  assert.equal(reopened.id, first.id);
  assert.equal(reopened.siteId, first.siteId);
  assert.ok(Math.abs(reopened.flow.to - 0.25) < 1e-8);
  const paused = structuredClone(c.snapshot);
  c.step(20, options(s, { active: false }));
  assert.deepEqual(c.snapshot, paused);
  s.phase = "cooldown";
  s.remaining = s.phaseDuration = 5;
  c.step(0, options(s));
  advance(c, s, 0.1);
  assert.equal(c.snapshot.lava.sheets[0].flow.connectedToMouth, false);
  assert.ok(Math.abs(c.snapshot.lava.sheets[0].flow.from - 0.1) < 1e-8);
  advance(c, s, 0.9);
  assert.equal(c.snapshot.lava.sheets.length, 0);
  assert.equal(c.snapshot.lava.phase, "cooling");
  assert.equal(c.snapshot.lava.pools.length, 1);
  advance(c, s, 3.5);
  assert.equal(c.snapshot.lava.pools.length, 0);
  assert.equal(c.snapshot.lava.phase, "off");
  c.reset();
  assert.equal(c.snapshot.lava.warningSheets.length, 0);
  assert.equal(c.snapshot.lava.sheets.length, 0);
  assert.equal(c.snapshot.lava.pools.length, 0);
});

test("An obstructed wide fan fits one genuinely broad connected main fan, rather than splitting pipes or leaving no hazard", () => {
  const c = createBermudaTitanHazards({
      sites: [site],
      cellClear: (cell) =>
        cell.row < 10 ||
        Math.max(...cell.vertices.map((p) => Math.abs(p.z))) < 15,
    }),
    s = state();
  c.step(0, options(s));
  const fan = c.snapshot.lava.warningSheets[0];
  assert.ok(fan && fan.width >= 18 && fan.width < 30);
  assert.ok(
    fan.cells
      .filter((cell) => cell.row >= 10)
      .every(
        (cell) => Math.max(...cell.vertices.map((p) => Math.abs(p.z))) < 15,
      ),
    "Any accepted expansion still fits every actual obstructed landing cell",
  );
  assert.equal(fan.tetrahedra.length, 840);
});

test("Renderer uses the exact closed sheet skin, only its ground outline before firing, and six existing resource objects", () => {
  const v = createBermudaTitanHazardVisuals(new THREE.Group()),
    s = sheet(),
    snapshot = {
      clock: 12,
      lava: {
        phase: "warning",
        progress: 0.5,
        warningSheets: [s],
        sheets: [],
        paths: [],
        pools: [],
      },
      rocks: [],
      terminal: { active: false },
    };
  try {
    v.update(snapshot);
    const mesh = v.root.getObjectByName("titan_complete_molten_salvo"),
      marks = v.root.getObjectByName("titan_hazard_ground_marks");
    assert.equal(mesh.visible, false);
    assert.equal(marks.count, 1);
    assert.equal(marks.material.uniforms.uSheetFootCount.value, 26);
    snapshot.lava.phase = "active";
    snapshot.lava.warningSheets = [];
    snapshot.lava.sheets = snapshot.lava.paths = [s];
    v.update(snapshot);
    assert.equal(v.stats.triangles, 656);
    assert.equal(v.stats.vertices, 428);
    assert.equal(v.stats.impactTriangles, 0);
    const g = mesh.geometry,
      range = mesh.userData.pathRanges[0];
    assert.equal(range.vertexCount, 330);
    for (let i = 0; i < 330; i++) {
      const a = new THREE.Vector3().fromBufferAttribute(
          g.attributes.position,
          i,
        ),
        n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, i);
      assert.ok(a.distanceTo(s.vertices[i]) < 0.00001);
      assert.ok(Math.abs(n.length() - 1) < 1e-5);
    }
    assert.equal(range.skinVertexCount, 428);
    for (let i = 0; i < s.boundary.length; i++) {
      const shown = new THREE.Vector3().fromBufferAttribute(
        g.attributes.position,
        g.index.array[i],
      );
      assert.ok(
        shown.distanceTo(s.vertices[s.boundary[i]]) < 0.00001,
        "UV seams never move the authority skin",
      );
    }
    const base = s.rows * s.columns;
    for (let face = 0; face < s.boundary.length; face += 3) {
      const ids = s.boundary.slice(face, face + 3);
      if (!ids.some((i) => i < base) || !ids.some((i) => i >= base)) continue;
      const [a, b, c] = ids.map((_, k) =>
        new THREE.Vector2().fromBufferAttribute(
          g.attributes.uv,
          g.index.array[face + k],
        ),
      );
      const area = Math.abs(
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x),
      );
      assert.ok(
        area > 1e-7,
        "every cap and thick side has real two-dimensional texture coordinates",
      );
    }
    assert.equal(g.attributes.aLavaExposure.normalized, true);
    assert.ok(g.attributes.aLavaExposure.array.some((value) => value === 255));
    assert.equal(mesh.material.side, THREE.DoubleSide);
    v.root.updateMatrixWorld(true);
    g.computeBoundingSphere();
    const interior = new THREE.Vector3(64, 2, 0),
      ray = new THREE.Raycaster(interior, new THREE.Vector3(0, 1, 0));
    assert.ok(
      ray
        .intersectObject(mesh, false)
        .some((hit) => hit.distance > 1 && hit.distance < 3),
      "a camera inside the real sheet keeps seeing its molten skin",
    );
    assert.equal(v.root.children.length, 6);
    assert.ok(v.stats.bufferBytes < 192 * 1024);
    assert.ok(v.stats.visibleDrawCalls <= 6);
    snapshot.lava.phase = "off";
    v.update(snapshot);
    assert.ok(v.root.children.every((m) => !m.visible));
  } finally {
    v.dispose();
  }
});

test("Directly underneath and rearward landings are rejected rather than publishing degenerate or self-folded water volumes", () => {
  for (const impact of [p(0, 0.12, 0), p(-60, 0.12, 0), p(10, 0.12, 0)])
    assert.throws(
      () => createTitanLavaSheet(mouth, direction, { ...site, impact }),
      /in front of the mouth/,
    );
  const c = createBermudaTitanHazards({
    sites: [
      { ...site, id: "under", impact: p(0, 0.12, 0) },
      { ...site, id: "rear", impact: p(-60, 0.12, 0) },
      site,
    ],
    seed: 2,
  });
  c.step(0, options(state()));
  assert.equal(c.snapshot.lava.warningSheets.length, 1);
  assert.equal(c.snapshot.lava.sheets.length, 0);
  assert.equal(c.snapshot.lava.warningSheets[0].siteId, "ground");
});

test("A sub-bin real-mouth shift checks static nozzle volume and removes the whole field if that entrance becomes blocked", () => {
  let blocked = false;
  const c = createBermudaTitanHazards({
      sites: [site],
      cellClear: (cell) => !(blocked && cell.row === 1),
    }),
    s = state();
  c.step(0, options(s));
  assert.equal(c.snapshot.lava.warningSheets.length, 1);
  blocked = true;
  c.step(0.01, options(s, { mouth: p(0.04, 30, 0) }));
  assert.equal(c.snapshot.lava.warningSheets.length, 0);
  assert.equal(c.snapshot.lava.sheets.length, 0);
});

test("Impossible worlds use a deterministic hard search budget and stable active fields do not hide additional candidate work", () => {
  const candidates = Array.from({ length: 50 }, (_, i) => ({
    ...site,
    id: `blocked${i}`,
    impact: p(40 + i * 3, 0.12, (i % 5) * 6),
  }));
  let cells = 0;
  const c = createBermudaTitanHazards({
    sites: candidates,
    seed: 81,
    cellClear: () => {
      cells++;
      return false;
    },
  });
  c.step(0, options(state()));
  const result = c.snapshot.lava.validation;
  assert.equal(result.candidates, 8);
  assert.equal(result.attempts, 48);
  assert.equal(result.preflightChecks, 48);
  assert.equal(cells, 48);
  assert.equal(c.snapshot.lava.warningSheets.length, 0);
  assert.equal(c.snapshot.lava.sheets.length, 0);
});
