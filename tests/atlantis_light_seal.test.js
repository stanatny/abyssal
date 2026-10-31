import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  createLightLayout,
  createLightState,
  stepLight,
  traceLight,
} from "../src/atlantis_light_rules.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { castSegment } from "../src/collision.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
} from "../src/expedition_objectives.js";
import { createWaterwheelContact } from "../src/atlantis_waterwheel_contact.js";

const scene = new T.Scene(),
  ocean = createAtlantisOcean(scene);
test.after(() => ocean.dispose());

test("Three randomized templates have unobstructed physical reflected paths above terrain", () => {
  for (let route = 0; route < 3; route++) {
    const l = createLightLayout(route, ocean.city.poseidon.target.toArray());
    const result = traceLight(
      l,
      l.mirrors.map((m) => m.normals[0]),
      (a, b) => {
        const hit = castSegment(a, b, ocean.colliders);
        return hit
          ? new T.Vector3(hit.point.x, hit.point.y, hit.point.z)
          : null;
      },
    );
    assert.equal(result.hit, true, `route ${route}`);
    assert.deepEqual(result.reached, [0, 1, 2, 3, 4]);
    for (const s of result.segments)
      for (let f = 0; f <= 1; f += 0.02) {
        const p = s.from.clone().lerp(s.to, f);
        assert.ok(p.y > atlantisSeabedHeight(p.x, p.z) + 1);
      }
    // 由真实反射求解全部1024档位，不接受隐藏顺序或无源的末镜对准。
    let solutions = 0;
    for (let mask = 0; mask < 1024; mask++) {
      const n = l.mirrors.map((m, i) => m.normals[(mask >> (i * 2)) & 3]);
      const t = traceLight(l, n);
      if (t.hit) solutions++;
      assert.ok(t.segments.length <= 16);
    }
    assert.ok(solutions > 0 && solutions < 16);
    const dark = traceLight(
      l,
      l.mirrors.map((m, i) => m.normals[i === 0 ? 2 : 0]),
    );
    assert.equal(dark.hit, false);
    assert.equal(
      traceLight(
        l,
        l.mirrors.map((m) => m.normals[0]),
        (a) => a.clone(),
      ).hit,
      false,
    );
  }
});

test("All three built routes clear their own source and tower colliders after contact cycling", () => {
  for (let route = 0; route < 3; route++) {
    ocean.configureMechanism({ mechanismKind: "light", mechanismRoute: route });
    const seal = ocean.lightSeal;
    const forward = new T.Vector3(0, 0, -1);
    for (let i = 0; i < 5; i++) {
      while (seal.state.detents[i] !== 0) {
        const far = seal.controls[i].clone().add(new T.Vector3(0, 0, 5));
        const near = seal.controls[i].clone().add(new T.Vector3(0, 0, 1.26));
        seal.sense(far, 3, () => false, { forward, active: false });
        seal.sense(near, 3, () => false, { from: far, forward });
        assert.equal(seal.step(0.05)?.kind, "turned");
        for (let n = 0; n < 60; n++) seal.update(n * 0.05, near, 0.05);
      }
    }
    assert.equal(seal.trace.hit, true, `built route ${route}`);
    assert.deepEqual(seal.trace.reached, [0, 1, 2, 3, 4]);
  }
});

test("One active mechanism, no inactive scene root or collider, stable state across frame updates", () => {
  for (let i = 0; i < 8; i++) {
    const kind = i % 2 ? "light" : "water";
    ocean.configureMechanism({ mechanismKind: kind, mechanismRoute: i % 3 });
    assert.equal(!!ocean.waterwheel, kind === "water");
    assert.equal(!!ocean.lightSeal, kind === "light");
    assert.equal(
      ocean.root.children.filter((x) =>
        ["atlantis_waterwheel_gate", "atlantis_light_seal"].includes(x.name),
      ).length,
      1,
    );
    assert.equal(
      ocean.barriers.some((c) => c.kind === "reflection_tower"),
      kind === "light",
    );
    assert.equal(
      ocean.barriers.some((c) => c.kind === "atlantis_waterwheel"),
      kind === "water",
    );
    const state = ocean.mechanism.state;
    ocean.update(1, new T.Vector3(0, -18, 75), 0);
    assert.equal(ocean.mechanism.state, state);
    ocean.reset();
    assert.equal(ocean.mechanism.state.solved, false);
  }
});

test("No damage or reset on a wrong light route; settled connected illumination completes once", () => {
  const s = createLightState(() => 0.5);
  const before = [...s.detents];
  for (let i = 0; i < 100; i++) stepLight(s, 0.05, { hit: false });
  assert.deepEqual(s.detents, before);
  stepLight(s, 0.1, { action: 3 });
  assert.equal(s.detents[3], 3);
  for (let i = 0; i < 100; i++)
    stepLight(s, 0.1, { hit: true, settled: false });
  assert.equal(s.solved, false);
  for (let i = 0; i < 100; i++) stepLight(s, 0.1, { hit: true, active: false });
  assert.equal(s.hold, 0);
  let events = 0;
  for (let i = 0; i < 100; i++)
    if (stepLight(s, 0.05, { hit: true })?.kind === "solved") events++;
  assert.equal(events, 1);
  assert.equal(s.solved, true);
  assert.equal(s.damage, undefined);
});

test("Mirror wheels toggle once per entry for 3, 16 and 30 m bodies; staying and teleporting never repeat", () => {
  for (const length of [3, 16, 30]) {
    const p = new T.Vector3(0, 0, 0),
      c = createWaterwheelContact([p]);
    const player = new T.Vector3(0, 0, length * 0.42 + 1),
      nose = player
        .clone()
        .addScaledVector(new T.Vector3(0, 0, -1), length * 0.42);
    assert.equal(
      c.sample(new T.Vector3(0, 0, 4), nose, { front: player }),
      "valve0",
    );
    assert.equal(c.sample(nose, nose, { front: player }), null);
    c.sample(nose, new T.Vector3(0, 0, 5), { front: player });
    assert.equal(
      c.sample(new T.Vector3(0, 0, 5), nose, { front: player }),
      "valve0",
    );
    c.reset();
    assert.equal(
      c.sample(new T.Vector3(0, 0, 50), nose, { front: player }),
      null,
    );
  }
});

test("Random selection and objective edges share the solve cue and only the true guardian qualifies", () => {
  const region = {
    id: "atlantis",
    bossInstances: [{ id: "a" }, { id: "b" }, { id: "c" }],
  };
  for (const value of [0.1, 0.5, 0.9]) {
    const s = createExpeditionObjective(region, () => value),
      p = { length: 30, dead: false, timedOut: false };
    assert.equal(
      s.mechanismKind,
      ["water", "light", "mural"][Math.floor(value * 3)],
    );
    const bosses = region.bossInstances.map((b) => ({
      ...b,
      enabled: true,
      state: { defeated: b.id !== s.guardianId },
    }));
    assert.equal(advanceExpeditionObjective(s, p, bosses).guardianFound, false);
    const e = advanceExpeditionObjective(s, p, bosses, {
      keyContact: true,
      mechanismSolved: true,
    });
    assert.equal(e.keyFound, true);
    assert.equal(e.mechanismCompleted, true);
    assert.equal(e.unlocked, false);
    bosses.find((b) => b.id === s.guardianId).state.defeated = true;
    assert.equal(advanceExpeditionObjective(s, p, bosses).guardianFound, true);
    const again = advanceExpeditionObjective(s, p, bosses, {
      keyContact: true,
      mechanismSolved: true,
    });
    assert.equal(again.guardianFound, false);
    assert.equal(again.mechanismCompleted, false);
    assert.equal(again.keyFound, false);
  }
});
