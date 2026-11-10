import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  createMuralState,
  createMuralLayout,
  MURAL_RULES,
  muralCrossing,
  muralSymbol,
  stepMural,
} from "../src/atlantis_mural_rules.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import {
  createExpeditionObjective,
  ATLANTIS_KEY_SITES,
} from "../src/expedition_objectives.js";
import { castBodySegment, bodyRadius, castSegment } from "../src/collision.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";

const correctTime = (s, i) =>
  ((s.cycles[i].indexOf(s.answer[i]) - s.offsets[i] + 4) % 4) * 4 + 1;
function pass(s) {
  const i = s.completed;
  s.clock = correctTime(s, i);
  return stepMural(s, 0.02, { crossing: { stage: i, fraction: 0.5 } });
}

test("Generated mural problems have five distinct marks and one matching slot per four-symbol cycle", () => {
  for (let seed = 0; seed < 300; seed++) {
    const s = createMuralState(seed);
    assert.equal(new Set(s.answer).size, 5);
    for (let i = 0; i < 5; i++) {
      assert.equal(new Set(s.cycles[i]).size, 4);
      assert.equal(s.cycles[i].filter((x) => x === s.answer[i]).length, 1);
    }
    assert.deepEqual(s, createMuralState(seed));
  }
  const source = createMuralState(47);
  let wins = 0;
  for (let mask = 0; mask < 1024; mask++) {
    const s = createMuralState(47);
    for (let i = 0; i < 5; i++) {
      const slot = (mask >> (2 * i)) & 3;
      s.clock = ((slot - s.offsets[i] + 4) % 4) * 4 + 0.1;
      const e = stepMural(s, 0.01, { crossing: { stage: i, fraction: 0.2 } });
      if (e?.kind === "failed") break;
    }
    if (s.solved) wins++;
  }
  assert.equal(wins, 1);
  assert.equal(source.completed, 0);
});
test("Only current gate judges; wrong crossing preserves passed gates and retries only the current gate", () => {
  for (let stage = 0; stage < 5; stage++) {
    const s = createMuralState(53),
      answers = JSON.stringify([s.answer, s.cycles, s.offsets]);
    for (let i = 0; i < stage; i++) pass(s);
    const before = s.completed;
    assert.equal(
      stepMural(s, 0.01, {
        crossing: { stage: (stage + 1) % 5, fraction: 0.3 },
      }),
      null,
    );
    assert.equal(s.completed, before);
    s.clock = correctTime(s, stage) + 4;
    const e = stepMural(s, 0.02, { crossing: { stage, fraction: 0.5 } });
    assert.equal(e.kind, "failed");
    assert.equal(e.damage, 30);
    assert.equal(s.completed, stage);
    assert.equal(s.cooldown, 3);
    assert.equal(s.clock, correctTime(s, stage) + 4 + 0.02);
    assert.equal(JSON.stringify([s.answer, s.cycles, s.offsets]), answers);
    assert.equal(
      stepMural(s, 0.01, { crossing: { stage, fraction: 0.5 } }).kind,
      "blocked",
    );
    assert.equal(s.completed, stage);
    for (let i = 0; i < 31; i++) stepMural(s, 0.1);
    assert.equal(s.completed, stage, "Recovery alone cannot pass the gate");
    for (let i = stage; i < 5; i++) pass(s);
    assert.equal(s.solved, true);
    assert.equal(
      stepMural(s, 0.1, { crossing: { stage: 4, fraction: 0.5 } }),
      null,
    );
  }
});
test("Swept boundary time agrees with visible symbol rather than end-of-frame time", () => {
  const a = createMuralState(7);
  a.answer[0] = a.cycles[0][a.offsets[0]];
  a.clock = 3.99;
  assert.equal(
    stepMural(a, 0.02, { crossing: { stage: 0, fraction: 0.25 } }).kind,
    "passed",
  );
  const b = createMuralState(7);
  b.answer[0] = b.cycles[0][b.offsets[0]];
  b.clock = 3.99;
  assert.equal(
    stepMural(b, 0.02, { crossing: { stage: 0, fraction: 0.75 } }).kind,
    "failed",
  );
  const c = createMuralState(7);
  c.clock = 4;
  assert.equal(muralSymbol(c, 0), c.cycles[0][(c.offsets[0] + 1) % 4]);
});
test("Pause and protected attempts never progress or charge, and resume does not replay crossings", () => {
  const s = createMuralState(3),
    before = structuredClone(s);
  stepMural(s, 0.1, { active: false, crossing: { stage: 0, fraction: 0.5 } });
  assert.deepEqual(s, before);
  assert.equal(
    stepMural(s, 0.1, {
      vulnerable: false,
      crossing: { stage: 0, fraction: 0.5 },
    }).kind,
    "blocked",
  );
  assert.equal(s.completed, 0);
  assert.equal(s.cooldown, 0);
  stepMural(s, 0.1);
  assert.equal(s.completed, 0);
  for (let i = 0; i < 5; i++) pass(s);
  assert.equal(s.completed, 5);
});
test("Crossing requires entrance direction inside aperture; walls, jumps, tail and reverse do not submit", () => {
  const g = { point: new T.Vector3(), halfWidth: 20, halfHeight: 15 },
    a = new T.Vector3(0, 0, 2),
    b = new T.Vector3(0, 0, -2);
  assert.equal(muralCrossing(a, b, g).fraction, 0.5);
  assert.equal(muralCrossing(b, a, g), null);
  assert.equal(muralCrossing(b, b, g), null);
  assert.equal(
    muralCrossing(a, b, g, () => true),
    null,
  );
  assert.equal(muralCrossing(new T.Vector3(0, 0, 15), b, g), null);
  assert.equal(muralCrossing(a.clone().setX(21), b.clone().setX(21), g), null);
  assert.equal(muralCrossing(a.clone().setY(16), b.clone().setY(16), g), null);
});
const ocean = createAtlantisOcean(new T.Scene());
test.after(() => ocean.dispose());
test("All built routes descend with adult passage and physical terrain/collider clearance", () => {
  for (let route = 0; route < 3; route++) {
    ocean.configureMechanism({
      mechanismKind: "mural",
      mechanismRoute: route,
      mechanismSeed: 12,
    });
    const m = ocean.muralPath;
    let last = Infinity;
    for (const g of m.layout) {
      assert.ok(g.point.y < last);
      last = g.point.y;
      assert.ok(Math.abs(g.point.x) + 26 < 300, "frame inside world bounds");
      for (const [x, y, z, radius] of [
        [0, -420, -815, 125],
        [-162, -360, -670, 78],
        [155, -555, -930, 86],
      ]) {
        for (const dz of [-25, 0, 70])
          assert.ok(
            Math.hypot(g.point.x - x, g.point.y - y, g.point.z + dz - z) >
              radius + 30,
            "passage/wait outside lord territory",
          );
      }
      const all = [...ocean.colliders, ...ocean.barriers];
      for (const length of [3, 16, 30])
        for (const x of [-4, 0, 4]) {
          const a = g.point.clone().add(new T.Vector3(x, 0, 30)),
            b = g.point.clone().add(new T.Vector3(x, 0, -30));
          assert.equal(
            castBodySegment(a, b, {
              colliders: all,
              forward: new T.Vector3(0, 0, -1),
              length,
              radius: bodyRadius(length),
            }),
            null,
            `route ${route} gate ${g.id} length ${length} x${x}`,
          );
          for (let f = 0; f <= 1; f += 0.1) {
            const p = a.clone().lerp(b, f);
            assert.ok(
              p.y - bodyRadius(length) > atlantisSeabedHeight(p.x, p.z),
            );
          }
        }
    }
    const p = m.muralPoint;
    assert.equal(
      castSegment(
        p.clone().add(new T.Vector3(-25, 0, 0)),
        p,
        ocean.colliders,
        3,
      ),
      null,
    );
  }
});
test("Native caller uses swimming front, never large-body overlap, and one visible gate marker advances", () => {
  for (const length of [3, 16, 30]) {
    ocean.configureMechanism({
      mechanismKind: "mural",
      mechanismRoute: 2,
      mechanismSeed: 41,
    });
    const m = ocean.muralPath,
      g = m.layout[0],
      f = new T.Vector3(0, 0, -1);
    m.state.clock = correctTime(m.state, 0);
    const a = g.point.clone().add(new T.Vector3(0, 0, length * 0.42 + 1)),
      b = a.clone().add(new T.Vector3(0, 0, -2));
    m.sense(b, length, () => false, { from: a, forward: f });
    assert.equal(m.step(0.02).kind, "passed");
    m.sense(b, length, () => false, { from: b, forward: f });
    assert.equal(m.step(0.02), null);
    assert.equal(m.state.completed, 1);
    assert.deepEqual(
      m.markers.filter((p) => p.index > 0).map((p) => p.index),
      [2],
    );
  }
});
test("Random family excludes inactive geometry; mural key never shares the clue's complex", () => {
  const region = { id: "atlantis", bossInstances: [{ id: "a" }, { id: "b" }] };
  for (const value of [0.1, 0.5, 0.9]) {
    const obj = createExpeditionObjective(region, () => value);
    ocean.configureMechanism(obj);
    assert.equal(
      ocean.root.children.filter((n) =>
        [
          "atlantis_waterwheel_gate",
          "atlantis_light_seal",
          "atlantis_mural_path",
        ].includes(n.name),
      ).length,
      1,
    );
    assert.equal(
      ocean.barriers.some((c) => c.kind === "mural_masonry"),
      obj.mechanismKind === "mural",
    );
  }
  for (let i = 0; i < 40; i++) {
    let draw = 0;
    const obj = createExpeditionObjective(
      region,
      () => [0.1, i / 40, 0.9, 0.5, 0.2][draw++],
    );
    assert.equal(obj.mechanismKind, "mural");
    assert.ok(
      ![
        "harbor_sanctuary",
        "harbor_sunken_halls",
        "poseidon_temple_vault",
      ].includes(
        ATLANTIS_KEY_SITES.find((s) => s.id === obj.keySiteId).buildingId,
      ),
    );
  }
});

test("Membranes cover the crossing plane, share geometry and never disclose a matching candidate", () => {
  ocean.configureMechanism({ mechanismKind: "mural", mechanismSeed: 19 });
  const m = ocean.muralPath,
    pos = m.layout[0].point;
  m.update(0, pos, 0);
  const active = m.stations[0].membrane;
  assert.equal(
    new Set(m.stations.map((s) => s.membrane.sheet.geometry)).size,
    1,
  );
  assert.equal(
    active.sheet.geometry.parameters.width,
    MURAL_RULES.halfWidth * 2,
  );
  assert.equal(
    active.sheet.geometry.parameters.height,
    MURAL_RULES.halfHeight * 2,
  );
  assert.equal(active.sheet.position.z, 0);
  assert.equal(active.sheet.material.depthWrite, false);
  const snapshot = () =>
    JSON.stringify({
      shader: Object.fromEntries(
        Object.entries(active.uniforms).map(([k, u]) => [k, u.value]),
      ),
      icons: active.icons.map((i) => i.visible),
    });
  const before = snapshot();
  m.state.answer[0] = (m.state.answer[0] + 1) % 8;
  m.update(0, pos, 0);
  assert.equal(
    snapshot(),
    before,
    "Changing the hidden answer must not alter active presentation",
  );
  const original = active.uniforms.symbol.value;
  for (let i = 0; i < 40; i++) m.step(0.1);
  m.update(4, pos, 0.1);
  assert.notEqual(active.uniforms.symbol.value, original);
  assert.equal(
    active.icons.findIndex((i) => i.visible),
    muralSymbol(m.state, 0),
  );
  const frozen = snapshot();
  m.step(0.1, { active: false });
  m.update(100, pos, 0);
  assert.equal(
    snapshot(),
    frozen,
    "Paused visual time is frozen independent of wall clock",
  );
});

test("Crossing feedback preserves passed films and markers, isolates recovery, and reduces motion", () => {
  ocean.configureMechanism({ mechanismKind: "mural", mechanismSeed: 31 });
  const m = ocean.muralPath,
    f = new T.Vector3(0, 0, -1);
  function cross(stage, correct) {
    m.state.clock = correctTime(m.state, stage) + (correct ? 0 : 4);
    const p = m.layout[stage].point,
      a = p.clone().add(new T.Vector3(0, 0, 2.26));
    const b = a.clone().add(new T.Vector3(0, 0, -2));
    m.sense(b, 3, () => false, { from: a, forward: f });
    const e = m.step(0.02);
    m.update(0, p, 0.02);
    return e;
  }
  assert.equal(cross(0, true).kind, "passed");
  assert.equal(m.stations[0].membrane.uniforms.mode.value, 2);
  assert.equal(m.stations[0].membrane.uniforms.eventKind.value, 1);
  assert.equal(m.stations[1].membrane.uniforms.mode.value, 1);
  assert.equal(cross(1, false).kind, "failed");
  assert.equal(m.state.completed, 1);
  assert.equal(m.markers.at(-1).index, 2);
  assert.equal(m.stations[0].membrane.uniforms.mode.value, 2);
  assert.equal(m.stations[0].membrane.uniforms.eventKind.value, 1);
  assert.equal(m.stations[1].membrane.uniforms.mode.value, 3);
  assert.equal(m.stations[1].arrow.visible, false);
  assert.equal(m.stations[1].membrane.uniforms.eventKind.value, 2);
  assert.equal(m.stations[2].membrane.uniforms.mode.value, 0);
  assert.equal(m.stations[2].membrane.uniforms.eventKind.value, 0);
  for (let i = 0; i < 32; i++) {
    m.step(0.1);
    m.update(0, m.entry, 0.1);
  }
  m.update(0, m.entry, 0.02, true);
  const film = m.stations[1].membrane;
  assert.equal(film.uniforms.mode.value, 1);
  assert.equal(film.uniforms.reduced.value, 1);
  assert.equal(film.uniforms.time.value, 0);
  assert.equal(
    film.icons.findIndex((i) => i.visible),
    muralSymbol(m.state, 1),
  );
  assert.equal(m.stations[1].arrow.visible, true);
  assert.equal(m.markers.at(-1).index, 2);
  m.reset(0, 31);
  m.update(0, m.entry, 0);
  assert.equal(film.uniforms.eventKind.value, 0);
  assert.equal(film.uniforms.eventAge.value, 1);
});
