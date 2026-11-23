import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaTitanHazardVisuals } from "../src/bermuda_titan_hazard_visuals.js";
const p = (x, y, z) => ({ x, y, z }),
  boundary = [
    0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0,
    2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3,
  ];
function field({
  start = 0,
  end = 4,
  y = 0,
  height = 4,
  id = "flow",
  connected = true,
} = {}) {
  const vertices = [];
  for (const layer of [0, 1])
    for (const z of [start, end])
      for (const x of [-3, 3])
        vertices.push(
          p(x, y - z * 0.05 + (layer ? height / 2 : -height / 2), z),
        );
  return {
    type: "molten_sheet",
    id,
    rows: 2,
    columns: 2,
    width: 6,
    vertices,
    boundary: [...boundary],
    points: [p(0, y, 0), p(0, y - end * 0.05, end)],
    rowDistances: [start, end],
    footprint: [
      p(-3, -2, start),
      p(3, -2, start),
      p(3, -2, end),
      p(-3, -2, end),
    ],
    radius: 1.6,
    impact: p(0, -2, end),
    impactNormal: p(0, 1, 0),
    impactRadius: 6.5,
    impactHeight: 4,
    flow: {
      from: start / 20,
      to: end / 20,
      connectedToMouth: connected,
      headProgress: end / 20,
      tailProgress: start / 20,
    },
  };
}
function snapshot({
  phase = "active",
  sheets = [],
  warningSheets = [],
  pools = [],
  clock = 10,
} = {}) {
  return {
    clock,
    lava: { phase, progress: 0.4, sheets, paths: sheets, warningSheets, pools },
    rocks: [],
    terminal: { active: false, progress: 0 },
  };
}
const child = (v, name) => v.root.getObjectByName(name),
  stream = (v) => child(v, "titan_complete_molten_salvo"),
  poolMesh = (v) => child(v, "titan_four_metre_molten_impact_crowns"),
  muzzle = (v) => child(v, "titan_mouth_molten_charge");
function withVisual(fn) {
  const v = createBermudaTitanHazardVisuals(new T.Group());
  try {
    fn(v);
  } finally {
    v.dispose();
  }
}
function exactSkin(geometry, vertices) {
  const a = new T.Vector3();
  for (let i = 0; i < vertices.length; i++)
    assert.ok(
      a
        .fromBufferAttribute(geometry.attributes.position, i)
        .distanceTo(vertices[i]) < 1e-5,
    );
}

test("Full landing warnings use warningSheets even before a stream exists, without drawing an untravelled hot field", () =>
  withVisual((v) => {
    const full = field({ end: 20 });
    v.update(snapshot({ phase: "warning", warningSheets: [full] }));
    assert.equal(stream(v).visible, false);
    assert.equal(poolMesh(v).visible, false);
    assert.equal(muzzle(v).visible, true);
    assert.equal(child(v, "titan_hazard_ground_marks").count, 1);
  }));

test("Advancing and draining skins follow only authoritative fractional geometry; the short muzzle stays within the connected first cell", () =>
  withVisual((v) => {
    for (const end of [0.4, 1.5, 4]) {
      const current = field({ end });
      const s = snapshot({ sheets: [current] });
      v.update(s);
      exactSkin(stream(v).geometry, current.vertices);
      assert.equal(stream(v).geometry.drawRange.count, boundary.length);
      assert.equal(muzzle(v).visible, true);
      v.root.updateMatrixWorld(true);
      const pos = new T.Vector3();
      for (let i = 0; i < muzzle(v).geometry.attributes.position.count; i++) {
        pos
          .fromBufferAttribute(muzzle(v).geometry.attributes.position, i)
          .applyMatrix4(muzzle(v).matrixWorld);
        assert.ok(Math.abs(pos.x) <= 3.001);
        assert.ok(Math.abs(pos.y + pos.z * 0.05) <= 2.001);
        assert.ok(
          pos.z >= -0.001 && pos.z <= end + 0.001,
          "no nozzle ahead of the actual front",
        );
      }
      const before = Array.from(
        stream(v).geometry.attributes.position.array.slice(
          0,
          current.vertices.length * 3,
        ),
      );
      v.update({ ...s, clock: 300 });
      assert.deepEqual(
        Array.from(
          stream(v).geometry.attributes.position.array.slice(
            0,
            current.vertices.length * 3,
          ),
        ),
        before,
        "renderer clock does not advance a physical field",
      );
    }
    const drain = field({ start: 4, end: 9, connected: false });
    v.update(snapshot({ sheets: [drain] }));
    exactSkin(stream(v).geometry, drain.vertices);
    assert.equal(
      muzzle(v).visible,
      false,
      "a detached tail must not leave a source jet at the mouth",
    );
    assert.ok(
      Math.abs(stream(v).geometry.attributes.uv.getY(0) - 4 * 0.14) < 1e-6,
    );
  }));

test("Residual pools remain during cooldown and use the actual cooling geometry, temperature and alpha, then fully disappear", () =>
  withVisual((v) => {
    const warm = {
      id: "pool1",
      geometry: field({
        start: 20,
        end: 26,
        y: 0,
        height: 4,
        connected: false,
      }),
      temperature: 1,
      opacity: 1,
      harmful: true,
      feeding: true,
    };
    v.update(snapshot({ phase: "cooling", pools: [warm] }));
    const mesh = poolMesh(v);
    assert.equal(stream(v).visible, false);
    assert.equal(mesh.visible, true);
    assert.equal(muzzle(v).visible, false);
    assert.equal(v.stats.pools, 1);
    exactSkin(mesh.geometry, warm.geometry.vertices);
    assert.equal(mesh.material.transparent, true);
    assert.equal(mesh.material.side, T.DoubleSide);
    assert.equal(mesh.material.forceSinglePass, true);
    assert.equal(mesh.material.depthWrite, false);
    const cold = {
      ...warm,
      geometry: field({
        start: 20,
        end: 26,
        y: -1.7,
        height: 0.6,
        connected: false,
      }),
      temperature: 0.15,
      opacity: 0.12,
      harmful: false,
      feeding: false,
    };
    v.update(snapshot({ phase: "cooling", pools: [cold] }));
    exactSkin(mesh.geometry, cold.geometry.vertices);
    for (let i = 0; i < cold.geometry.vertices.length; i++) {
      assert.ok(
        Math.abs(mesh.geometry.attributes.aLavaThermal.getX(i) - 0.15) < 1e-6,
      );
      assert.ok(
        Math.abs(mesh.geometry.attributes.aLavaThermal.getY(i) - 0.12) < 1e-6,
      );
    }
    v.update(
      snapshot({
        phase: "off",
        pools: [{ ...cold, temperature: 0, opacity: 0 }],
      }),
    );
    assert.ok(v.root.children.every((m) => !m.visible));
  }));

test("Two residual pools share the bounded impact batch and terminal geometry restores its original opaque indices", () =>
  withVisual((v) => {
    const one = {
        id: "one",
        geometry: field({ height: 3, connected: false }),
        temperature: 0.7,
        opacity: 0.8,
      },
      two = {
        id: "two",
        geometry: field({ start: 8, end: 12, height: 1, connected: false }),
        temperature: 0.2,
        opacity: 0.1,
      };
    const before = v.root.children.map((m) => ({
      geometry: m.geometry,
      positions: m.geometry.attributes.position.array,
      index: m.geometry.index?.array,
    }));
    v.update(snapshot({ phase: "cooling", pools: [one, two] }));
    assert.equal(v.stats.pools, 2);
    assert.equal(v.stats.impactTriangles, 24);
    assert.equal(poolMesh(v).userData.poolRanges[1].firstVertex, 18);
    assert.equal(v.stats.bufferBytes, 186519);
    assert.ok(v.stats.bufferBytes < 192 * 1024);
    assert.equal(v.root.children.length, 6);
    assert.ok(v.stats.visibleDrawCalls <= 6);
    v.update({
      clock: 30,
      lava: { phase: "off", sheets: [], pools: [] },
      rocks: [],
      terminal: {
        active: true,
        progress: 1,
        center: p(0, -600, 0),
        ground: p(0, -670, 0),
        roof: p(0, -450, 0),
      },
    });
    assert.equal(poolMesh(v).material.transparent, false);
    assert.equal(poolMesh(v).geometry.drawRange.count, 720);
    assert.equal(v.stats.pools, 0);
    assert.ok(poolMesh(v).userData.poolRanges.every((r) => !r.active));
    v.root.children.forEach((m, i) => {
      assert.equal(m.geometry, before[i].geometry);
      assert.equal(m.geometry.attributes.position.array, before[i].positions);
      assert.equal(m.geometry.index?.array, before[i].index);
    });
    v.reset();
    assert.ok(v.root.children.every((m) => !m.visible));
  }));
