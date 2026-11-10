import test from "node:test";
import assert from "node:assert/strict";
import {
  createWaterwheelState,
  stepWaterwheel,
  waterwheelTotal,
  waterwheelSettled,
} from "../src/atlantis_waterwheel_rules.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
} from "../src/expedition_objectives.js";
import { ATLANTIS_KEY_SITES } from "../src/atlantis_key_sites.js";
import { createPlayer, takeDamage } from "../src/simulation.js";
const run = (s, n = 50, options = {}) => {
  for (let i = 0; i < n; i++) stepWaterwheel(s, 0.1, options);
};
test("Only deliberate valid tests charge health; idle/contact, pause, range, immunity and cooldown cannot repeat a charge", () => {
  const s = createWaterwheelState();
  run(s);
  assert.equal(s.result, "");
  for (const options of [
    { active: false },
    { nearby: false },
    { vulnerable: false },
  ])
    assert.equal(stepWaterwheel(s, 0.1, { action: "test", ...options }), null);
  assert.deepEqual(stepWaterwheel(s, 0.1, { action: "test" }), {
    kind: "failed",
    damage: 30,
  });
  for (let i = 0; i < 20; i++)
    assert.equal(stepWaterwheel(s, 0.1, { action: "test" }), null);
  const frozen = JSON.stringify(s);
  run(s, 50, { active: false, action: "valve0" });
  assert.equal(JSON.stringify(s), frozen);
  run(s, 15);
  assert.equal(stepWaterwheel(s, 0.1, { action: "test" }).damage, 30);
});
test("Six distinct amounts always yield exactly one nontrivial three/four-valve solution", () => {
  let seed = 941;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const draws = [() => 0, () => 1, () => NaN, ...Array(200).fill(random)];
  for (const draw of draws) {
    const s = createWaterwheelState(draw);
    assert.equal(s.amounts.length, 6);
    assert.equal(new Set(s.amounts).size, 6);
    assert.ok(s.amounts.every((n) => Number.isInteger(n) && n > 0));
    const solutions = [];
    for (let mask = 0; mask < 64; mask++) {
      const trial = {
        ...s,
        valves: s.valves.map((_, i) => !!(mask & (1 << i))),
      };
      const sum = waterwheelTotal(trial);
      trial.level = sum;
      const event = stepWaterwheel(trial, 0, { action: "test" });
      if (sum === s.target) {
        solutions.push(mask);
        assert.equal(event.kind, "solved");
      } else {
        assert.equal(event.damage, 30);
        assert.equal(trial.result, sum < s.target ? "low" : "high");
      }
    }
    assert.equal(solutions.length, 1);
    assert.ok(
      [3, 4].includes(solutions[0].toString(2).replaceAll("0", "").length),
    );
  }
});
test("Metered contributions settle, close reverses them, and passing through target cannot win", () => {
  const s = createWaterwheelState(() => 0.5);
  for (let i = 0; i < 6; i++) stepWaterwheel(s, 0, { action: `valve${i}` });
  s.level = s.target;
  assert.equal(stepWaterwheel(s, 0, { action: "test" }), null);
  assert.equal(s.cooldown, 0);
  assert.equal(s.solved, false);
  run(s);
  const full = s.level;
  run(s, 100);
  assert.equal(s.level, full);
  assert.equal(stepWaterwheel(s, 0, { action: "test" }).damage, 30);
  assert.equal(s.result, "high");
  run(s);
  const amounts = [...s.amounts],
    target = s.target;
  assert.ok(s.valves.every((v) => !v));
  run(s);
  assert.equal(s.level, 0);
  assert.equal(waterwheelSettled(s), true);
  assert.deepEqual(s.amounts, amounts);
  assert.equal(s.target, target);
  const solution = Array.from({ length: 64 }, (_, mask) => mask).find(
    (mask) =>
      amounts.reduce((sum, n, i) => sum + (mask & (1 << i) ? n : 0), 0) ===
      target,
  );
  for (let i = 0; i < 6; i++)
    if (solution & (1 << i)) stepWaterwheel(s, 0, { action: `valve${i}` });
  run(s);
  assert.equal(s.result, "");
  assert.equal(s.solved, false);
  assert.deepEqual(stepWaterwheel(s, 0, { action: "test" }), {
    kind: "solved",
  });
  run(s, 40, { action: "test" });
  assert.equal(s.opening, 1);
  assert.equal(s.solved, true);
});
test("Invalid and inaccessible valve actions cannot change selections", () => {
  const s = createWaterwheelState();
  for (const action of ["valve6", "valve00", "valve-1", "wat", {}, null])
    stepWaterwheel(s, 0, { action });
  stepWaterwheel(s, 0, { action: "valve0", nearby: false });
  assert.ok(s.valves.every((v) => !v));
});
test("Every key draw is outside the mechanism complex; the two conspicuous plaque sites are absent", () => {
  assert.ok(
    !ATLANTIS_KEY_SITES.some((s) =>
      ["sanctuary_lower_west", "colonnade_east"].includes(s.id),
    ),
  );
  for (let i = 0; i <= 100; i++) {
    const o = createExpeditionObjective(
      { id: "atlantis", bossInstances: [{ id: "guard" }] },
      () => i / 100,
    );
    assert.ok(
      !(
        o.mechanismKind === "mural"
          ? ["harbor_sanctuary", "harbor_sunken_halls", "poseidon_temple_vault"]
          : ["agora_bridges", "agora_sunken_archive"]
      ).includes(
        ATLANTIS_KEY_SITES.find((s) => s.id === o.keySiteId).buildingId,
      ),
    );
  }
});
test("Key, mechanism and guardian unlock in all six orders, while death blocks mechanism reward", () => {
  for (const order of [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ]) {
    const p = createPlayer();
    p.length = 30;
    const b = { id: "guard", enabled: true, state: { defeated: false } },
      o = createExpeditionObjective(
        { id: "atlantis", bossInstances: [b] },
        () => 0,
      );
    for (let i = 0; i < 3; i++) {
      const action = order[i];
      if (action === 2) b.state.defeated = true;
      advanceExpeditionObjective(o, p, [b], {
        keyContact: action === 0,
        mechanismSolved: action === 1,
      });
      assert.equal(o.relicUnlocked, i === 2);
    }
    assert.equal(
      advanceExpeditionObjective(o, p, [b], { relicContact: true }).won,
      true,
    );
  }
  const p = createPlayer(),
    o = createExpeditionObjective({ id: "atlantis" }, () => 0);
  p.health = 10;
  takeDamage(p, 15);
  assert.equal(p.dead, true);
  advanceExpeditionObjective(o, p, [], { mechanismSolved: true });
  assert.equal(o.mechanismSolved, false);
});

test("Moving gate collider follows the actual slab, retains a clear adult approach and releases local resources once", async () => {
  const THREE = await import("three");
  const { createAtlantisWaterwheel } = await import(
    "../src/atlantis_waterwheel.js"
  );
  const { atlantisMaterials } = await import("../src/atlantis_art_geometry.js");
  const shared = new Set(Object.values(atlantisMaterials()));
  const parent = new THREE.Group(),
    w = createAtlantisWaterwheel(parent, [
      { id: "agora_bridges", x: 215, z: -447.5, lowerY: -226.35522794222976 },
    ]);
  const owned = new Map();
  w.root.traverse((n) => {
    for (const r of [n.geometry, n.material].filter(Boolean))
      if (!shared.has(r) && !owned.has(r)) {
        owned.set(r, 0);
        r.addEventListener("dispose", () => owned.set(r, owned.get(r) + 1));
      }
  });
  assert.equal(w.barriers.length, 1);
  assert.ok(!w.colliders.includes(w.barriers[0]));
  const before = w.barriers[0].y;
  w.state.solved = true;
  for (let i = 0; i < 30; i++) w.step(0.1, { active: true });
  w.update(3, w.root.position, 0.1);
  assert.equal(w.barriers[0].y, before + 10);
  w.reset();
  assert.equal(w.barriers[0].y, before);
  assert.equal(w.state.solved, false);
  w.dispose();
  w.dispose();
  assert.equal(parent.children.length, 0);
  assert.ok([...owned.values()].every((n) => n === 1));
});

test("Wrong low/high tests close every valve and drain without rerolling, while adjustment remains free", () => {
  for (const full of [false, true]) {
    const s = createWaterwheelState(() => 0.5),
      amounts = [...s.amounts],
      target = s.target;
    if (full)
      for (let i = 0; i < 6; i++) stepWaterwheel(s, 0, { action: `valve${i}` });
    run(s);
    assert.equal(stepWaterwheel(s, 0, { action: "test" }).damage, 30);
    assert.equal(s.result, full ? "high" : "low");
    assert.ok(s.valves.every((v) => !v));
    assert.equal(waterwheelTotal(s), 0);
    run(s, 40);
    assert.equal(s.level, 0);
    assert.equal(s.pressure, 0);
    assert.deepEqual(s.amounts, amounts);
    assert.equal(s.target, target);
    stepWaterwheel(s, 0, { action: "valve0", vulnerable: false });
    assert.equal(s.valves[0], true);
    stepWaterwheel(s, 0, { action: "valve0", vulnerable: false });
    assert.equal(s.valves[0], false);
  }
});

test("Visible wheels are reachable by actual 3/16/30 m bodies; distant, blocked and rear contacts do nothing", async () => {
  const THREE = await import("three");
  const { createAtlantisOcean } = await import("../src/atlantis_ocean.js");
  const { castBodySegment, bodyRadius, segmentBlocked } = await import(
    "../src/collision.js"
  );
  const ocean = createAtlantisOcean(new THREE.Group()),
    w = ocean.waterwheel;
  const colliders = [...ocean.colliders, ...ocean.barriers];
  const forward = new THREE.Vector3(0, 0, -1);
  for (const length of [3, 16, 30])
    for (let i = 0; i < 7; i++) {
      w.reset();
      const end = w.controls[i]
        .clone()
        .add(new THREE.Vector3(0, 0, length * 0.42 + 1.3));
      const start = end.clone().add(new THREE.Vector3(0, 0, 18));
      assert.equal(
        castBodySegment(start, end, {
          colliders,
          forward,
          length,
          radius: bodyRadius(length),
        }),
        null,
        `length ${length} valve ${i}`,
      );
      assert.equal(segmentBlocked(end, w.controls[i], colliders), false);
      let previous = start.clone(),
        events = [];
      for (let n = 0; n <= 30; n++) {
        const position = start.clone().lerp(end, n / 30);
        w.sense(position, length, (a, b) => segmentBlocked(a, b, colliders), {
          from: previous,
          forward,
        });
        const event = w.step(0.1, { active: true });
        if (event) events.push(event);
        if (n < 28) assert.ok(w.state.valves.every((v) => !v));
        previous.copy(position);
      }
      if (i < 6)
        assert.deepEqual(
          w.state.valves,
          w.state.valves.map((_, j) => i === j),
        );
      else assert.deepEqual(events, [{ kind: "failed", damage: 30 }]);
      // 贴住超过冷却、暂停后恢复，均不再触发。
      for (let n = 0; n < 80; n++) {
        w.sense(end, length, () => false, { from: end, forward });
        assert.equal(w.step(0.1), null);
      }
      if (i < 6) assert.equal(w.state.valves[i], true);
      for (const blocked of [() => true]) {
        w.reset();
        w.sense(end, length, blocked, { from: end, forward });
        w.step(0.1);
        assert.ok(w.state.valves.every((v) => !v));
        assert.equal(w.state.result, "");
      }
    }
  ocean.dispose();
});
