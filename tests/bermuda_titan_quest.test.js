import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { castSegment } from "../src/collision.js";
import { createBermudaTitanQuest } from "../src/bermuda_titan_quest.js";

const layout = () => ({
  seals: [
    { id: "wave", point: [-40, -100, 25] },
    { id: "bone", point: [40, -100, 25] },
    { id: "flame", point: [40, -100, -60] },
  ],
  tablet: [-40, -100, 50],
  relic: [0, -100, -55],
  mouth: [0, -100, 0],
  direction: [0, 0, -1],
  range: 100,
});
function create(t, options = {}) {
  const parent = new T.Group(),
    notices = [],
    damages = [],
    collected = [],
    quest = createBermudaTitanQuest(parent, {
      layout: layout(),
      heightAt: () => -170,
      // 组件单测显式提供受控姿态判断；真实world必须接入真实HF回调。
      canAccessRelic: () => true,
      hazardSeed: 1,
      hazardSites: [
        {
          id: "test_floor",
          impact: { x: 0, y: -169.8, z: -65 },
          normal: { x: 0, y: 1, z: 0 },
          roof: { x: 0, y: -60, z: -65 },
          sector: "cradle",
        },
      ],
      onNotice: (e) => notices.push(e),
      onDamage: (d, k) => damages.push([d, k]),
      onCollected: (e) => collected.push(e),
      ...options,
    });
  t.after(() => quest.dispose());
  return { parent, quest, notices, damages, collected };
}
function tick(quest, position, seconds, active = true) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 20); i++)
    events.push(...quest.step(0.05, { position, active, playerLength: 10 }));
  return events;
}

test("A held crystal's actual pose supplies the same-frame rendered and eight-metre pickup target", (t) => {
  for (const intoReach of [true, false]) {
    const actual = new T.Vector3(intoReach ? 4 : 80, -100, -55),
      data = layout();
    data.relic = [intoReach ? 80 : 4, -100, -55];
    let checkedTarget = null;
    const { quest } = create(t, {
      layout: data,
      hazardSites: [],
      syncBreathPose() {
        return { relicPoint: actual };
      },
      canAccessRelic({ relicPoint }) {
        checkedTarget = relicPoint.clone();
        return true;
      },
    });
    Object.assign(quest.state, {
      completed: 3,
      barrierOpen: true,
      phase: "cooldown",
      phaseDuration: 5,
      remaining: 2.5,
    });
    quest.step(0, {
      position: new T.Vector3(0, -100, -55),
      intakePoint: new T.Vector3(0, -100, -55),
      playerLength: 3,
    });
    assert.ok(quest.records.relic.distanceTo(actual) < 1e-9);
    assert.equal(quest.state.relicHeld, intoReach);
    if (intoReach) assert.ok(checkedTarget.distanceTo(actual) < 1e-9);
    else assert.equal(checkedTarget, null);
  }
});

test("A wall-mounted tablet aligns its local front with the actual supplied surface normal", (t) => {
  const data = layout();
  data.tabletNormal = [-1, 0, 0];
  const { quest } = create(t, { layout: data }),
    tablet = quest.root.getObjectByName("titan_seal_order_tablet");
  assert.ok(
    new T.Vector3(0, 0, -1)
      .applyQuaternion(tablet.quaternion)
      .distanceTo(new T.Vector3(-1, 0, 0)) < 1e-8,
  );
  assert.ok(
    quest.records.tablet.distanceTo(new T.Vector3(...data.tablet)) < 1e-8,
  );
});

test("Whole-sheet dynamic cover requests the actual cell AABB and unchanged quarter-metre SAT clearance", (t) => {
  const calls = [],
    { quest } = create(t, {
      dynamicContacts(a, b, dimensions) {
        if (dimensions.padding === 0.25)
          calls.push({ a: a.clone(), b: b.clone(), ...dimensions });
        return [];
      },
    });
  Object.assign(quest.state, {
    phase: "charging",
    phaseDuration: 2.5,
    remaining: 1,
  });
  quest.step(0, { position: new T.Vector3(90, -100, 90) });
  assert.equal(quest.hazards.lava.warningSheets.length, 1);
  assert.ok(calls.length >= 100);
  for (const call of calls) {
    assert.equal(call.radius, 0);
    assert.equal(call.padding, 0.25);
    assert.equal(call.segment, false);
    assert.ok(
      call.a.x <= call.b.x && call.a.y <= call.b.y && call.a.z <= call.b.z,
    );
    assert.ok(call.a.distanceTo(call.b) > 0);
  }
});

test("Pickup keeps the centre eight-metre gate and passes only the same real surface points cleared by static cover", (t) => {
  const centre = new T.Vector3(...layout().relic),
    wall = {
      id: "small_cover_over_the_centre",
      type: "box",
      x: centre.x + 3.9,
      y: centre.y,
      z: centre.z,
      halfSize: new T.Vector3(0.1, 0.25, 0.25),
      quaternion: new T.Quaternion(),
    };
  let called = 0;
  const { quest } = create(t, {
    hazardSites: [],
    colliders: [wall],
    canAccessRelic(args) {
      called++;
      assert.ok(args.intakePoint.distanceTo(args.relicPoint) <= 8);
      assert.ok(
        args.surfacePoints.length > 0 && args.surfacePoints.length <= 6,
      );
      assert.ok(castSegment(args.intakePoint, args.relicPoint, [wall]));
      for (const point of args.surfacePoints) {
        assert.ok(args.intakePoint.distanceTo(point) <= 8.00001);
        assert.equal(castSegment(args.intakePoint, point, [wall], 0.2), null);
      }
      // 真实HF回调必须在这一批同点内成功；静态清晰的表面不允许替换另一条被挡射线。
      return args.surfacePoints.some((p) => p.y > centre.y + 1);
    },
  });
  for (const s of layout().seals)
    quest.step(0, { position: new T.Vector3(...s.point) });
  tick(quest, new T.Vector3(90, -100, 90), 1.8);
  const outside = centre.clone().add(new T.Vector3(8.01, 0, 0));
  quest.step(0, {
    position: outside,
    previous: outside,
    intakePoint: outside,
    previousIntakePoint: outside,
  });
  assert.equal(
    called,
    0,
    "A nearer actual crystal surface cannot enlarge the centre gate",
  );
  assert.equal(quest.state.relicHeld, false);
  const mouth = centre.clone().add(new T.Vector3(7.5, 0, 0));
  quest.step(0, {
    position: mouth,
    previous: mouth,
    intakePoint: mouth,
    previousIntakePoint: mouth,
  });
  assert.equal(called, 1);
  assert.equal(
    quest.state.relicHeld,
    true,
    "A real exposed crystal tip can be touched while cover hides its centre",
  );
});

test("Actual closing-arm body contacts feed normal damage without repeated notice or pause advancement", (t) => {
  let guard = 0;
  const p = new T.Vector3(90, -100, 90),
    { quest, damages, notices } = create(t, {
      hazardSites: [],
      syncBreathPose(frame, state) {
        guard = state.guardAmount;
        return {
          mouth: new T.Vector3(0, -100, 0),
          direction: new T.Vector3(0, 0, -1),
        };
      },
      dynamicContacts: () =>
        guard > 0
          ? [
              {
                id: "actual_arm",
                type: "box",
                x: 90,
                y: -100,
                z: 90,
                halfSize: new T.Vector3(2, 2, 2),
                titanGuardArm: true,
              },
            ]
          : [],
    });
  Object.assign(quest.state, {
    phase: "cooldown",
    phaseDuration: 5,
    remaining: 1.5,
    relicHeld: true,
    escaping: true,
  });
  const frozen = structuredClone(quest.state);
  quest.step(5, { active: false, position: p });
  assert.deepEqual(quest.state, frozen);
  const events = quest.step(0.05, {
    position: p,
    previous: p,
    playerLength: 30,
  });
  assert.ok(events.some((e) => e.kind === "guard_crush" && e.damage === 30));
  assert.deepEqual(damages, [[30, "guard_crush"]]);
  assert.equal(
    notices.some((e) => e.kind === "guard_crush"),
    false,
  );
  tick(quest, p, 0.2);
  assert.equal(damages.length, 1);
});

test("Scene contact advances three real seals and one relic through callbacks; held or revisited contacts are harmless", (t) => {
  const { quest, damages, collected } = create(t),
    p = (a) => new T.Vector3(...a),
    leave = p([80, -100, 60]);
  quest.step(0, { position: p(layout().seals[0].point) });
  assert.equal(quest.state.completed, 1);
  quest.step(0, { position: p(layout().seals[2].point) });
  assert.deepEqual(damages, [[30, "seal_wrong"]]);
  tick(quest, p(layout().seals[2].point), 1);
  assert.equal(damages.length, 1);
  quest.step(0, { position: leave });
  quest.step(0, { position: p(layout().seals[1].point) });
  quest.step(0, { position: p(layout().seals[2].point) });
  assert.equal(quest.state.completed, 3);
  assert.equal(quest.state.barrierOpen, true);
  quest.step(0, { position: p(layout().relic) });
  tick(quest, p(layout().relic), 1.8);
  assert.equal(collected.length, 0);
  assert.equal(quest.state.relicHeld, true);
  assert.equal(quest.state.relicCollected, false);
  assert.equal(
    quest.colliders.length,
    0,
    "interaction rings never wall off the swimming route",
  );
});

test("Actual cover rejects a whole lava path, while a clear path renders and hurts from the same full snapshot", (t) => {
  const wall = {
      id: "cover",
      type: "box",
      x: 0,
      y: -100,
      z: -35,
      halfSize: new T.Vector3(30, 30, 4),
    },
    sealWall = {
      id: "seal_cover",
      type: "box",
      x: -40,
      y: -100,
      z: 30,
      halfSize: new T.Vector3(20, 20, 1),
    },
    { quest, damages } = create(t, { colliders: [wall, sealWall] });
  quest.step(0, { position: new T.Vector3(-40, -100, 34), playerLength: 3 });
  assert.equal(quest.state.completed, 0);
  Object.assign(quest.state, {
    phase: "breath",
    remaining: 2,
    phaseDuration: 3,
  });
  quest.step(0, { position: new T.Vector3(0, -165, -65), playerLength: 3 });
  assert.equal(
    quest.hazards.lava.paths.length,
    0,
    "no truncated visible fragment behind cover",
  );
  assert.equal(damages.length, 0);
  const clear = create(t),
    point = new T.Vector3(0, -166, -65);
  Object.assign(clear.quest.state, {
    phase: "breath",
    remaining: 2,
    phaseDuration: 3,
  });
  clear.quest.step(0, { position: point, previous: point, playerLength: 3 });
  assert.deepEqual(clear.damages, [[40, "hazard_hit"]]);
  assert.equal(clear.quest.hazards.lava.paths[0].points.length, 13);
  clear.quest.update(1, point);
  assert.equal(
    clear.quest.root.getObjectByName("titan_complete_molten_salvo").visible,
    true,
  );
});

test("Real floor truncates the downward beam while only explicitly marked hero contacts are excluded", (t) => {
  const hero = {
      id: "sleeping_hero",
      titanBreathIgnore: true,
      type: "box",
      x: 0,
      y: -100,
      z: -5,
      halfSize: new T.Vector3(15, 15, 5),
    },
    { quest } = create(t, { colliders: [hero], heightAt: () => -140 });
  quest.setBreath({
    mouth: [0, -100, 0],
    direction: [0, -1, -1],
    range: 100,
    radius: 8,
  });
  assert.ok(quest.segment.distance > 35 && quest.segment.distance < 50);
  assert.ok(
    quest.segment.to.y > -133,
    "the finite-radius beam stays above the physical floor",
  );
  hero.titanBreathIgnore = false;
  // Replacing the source array triggers the explicit static-collider refresh;
  // in production the hero marker is set before the immutable world is wired.
  const blocked = create(t, { colliders: [{ ...hero }] }).quest;
  assert.equal(blocked.segment.distance, 0);
});

test("Visual update cannot advance paused gameplay; reset and disposal reuse or release every owned instance", (t) => {
  const { quest, parent, damages } = create(t),
    pos = new T.Vector3(0, -100, -15),
    state = structuredClone(quest.state),
    counts = () => {
      let meshes = 0;
      quest.root.traverse((m) => {
        if (m.isMesh) meshes++;
      });
      return meshes;
    },
    count = counts(),
    relic = quest.records.relic;
  for (let i = 0; i < 200; i++) {
    quest.update(i, pos, { reducedMotion: true });
    quest.step(0.1, { active: false, position: pos });
  }
  assert.deepEqual(quest.state, state);
  assert.equal(damages.length, 0);
  assert.equal(counts(), count);
  quest.setRelicPoint([0, -100, -70]);
  assert.equal(quest.records.relic, relic);
  assert.equal(relic.z, -70);
  quest.state.completed = 2;
  quest.reset();
  quest.reset();
  assert.deepEqual(quest.state, state);
  assert.equal(counts(), count);
  quest.dispose();
  quest.dispose();
  assert.equal(parent.children.length, 0);
  assert.equal(quest.root.children.length, 0);
  assert.deepEqual(quest.step(1, { position: pos }), []);
  const stillLive = create(t).quest;
  assert.ok(stillLive.root.getObjectByName("titan_seal_wave"));
});

test("Only one entry hint and deliberate tablet reads notify; repeated phase changes and beam contacts stay quiet", (t) => {
  const { quest, notices } = create(t, { inLair: () => true }),
    point = new T.Vector3(-40, -100, 50);
  tick(quest, point, 32);
  assert.equal(notices.filter((e) => e.kind === "discovered").length, 1);
  assert.equal(notices.filter((e) => e.kind === "tablet").length, 1);
  assert.equal(
    notices.some((e) =>
      ["phase", "breath_hit", "breath_pulse"].includes(e.kind),
    ),
    false,
  );
  const read = notices.find((e) => e.kind === "tablet");
  assert.deepEqual(read.order, ["wave", "bone", "flame"]);
  tick(quest, new T.Vector3(0, -100, -15), 30);
  assert.equal(
    notices.some((e) =>
      ["phase", "breath_hit", "breath_pulse"].includes(e.kind),
    ),
    false,
  );
  quest.step(0, { position: point });
  assert.equal(notices.filter((e) => e.kind === "tablet").length, 2);
  assert.equal(notices.filter((e) => e.kind === "discovered").length, 1);
});

test("Lava propagates from the mouth, drains after source-off and cools in the same bounded reused buffers", (t) => {
  const { quest } = create(t),
    point = new T.Vector3(0, -160, -65),
    stream = quest.root.getObjectByName("titan_complete_molten_salvo"),
    geometry = stream.geometry,
    data = geometry.attributes.position.array;
  Object.assign(quest.state, {
    phase: "charging",
    remaining: 2,
    phaseDuration: 2.5,
  });
  quest.step(0, { position: point, previous: point });
  quest.update(1, point);
  assert.equal(stream.visible, false, "no faint or half stream during warning");
  assert.equal(
    quest.root.getObjectByName("titan_hazard_ground_marks").visible,
    true,
  );
  const targets = quest.hazards.lava.warningSheets.map((p) => p.impact);
  assert.ok(targets.length > 0);
  Object.assign(quest.state, {
    phase: "breath",
    remaining: 2.9,
    phaseDuration: 3,
  });
  quest.step(0, { position: point, previous: point });
  quest.update(2, point);
  assert.equal(stream.visible, true);
  const count = geometry.drawRange.count;
  assert.ok(count > 0);
  assert.ok(quest.hazards.lava.sheets[0].flow.to > 0);
  assert.ok(quest.hazards.lava.sheets[0].flow.to < 1);
  assert.deepEqual(
    quest.hazards.lava.paths.map((p) => p.impact),
    targets,
  );
  tick(quest, point, 1.05);
  quest.update(3, point);
  assert.ok(geometry.drawRange.count > count);
  assert.equal(quest.hazards.lava.sheets[0].flow.to, 1);
  assert.equal(geometry.attributes.position.array, data);
  Object.assign(quest.state, {
    phase: "cooldown",
    remaining: 5,
    phaseDuration: 5,
  });
  quest.step(0, { position: point, previous: point });
  quest.update(4, point);
  assert.equal(quest.hazards.lava.emitting, false);
  assert.equal(stream.visible, true, "already emitted lava still travels");
  assert.equal(
    quest.lightSources[0].intensity,
    0,
    "the mouth stops glowing with source-off",
  );
  tick(quest, point, 1.05);
  quest.update(5, point);
  assert.equal(
    stream.visible,
    false,
    "the last packet has left the flight path",
  );
  assert.ok(quest.hazards.lava.pools.some((p) => p.harmful));
  const paused = JSON.stringify(quest.hazards);
  quest.step(1, { position: point, active: false });
  assert.equal(JSON.stringify(quest.hazards), paused);
  tick(quest, point, 3.6);
  quest.update(9, point);
  assert.equal(quest.hazards.lava.pools.length, 0);
  quest.reset();
  assert.equal(quest.hazards.lava.sheets.length, 0);
  assert.equal(quest.hazards.lava.pools.length, 0);
  assert.equal(geometry.attributes.position.array, data);
  assert.equal(
    quest.root.children.some((m) => m.isLight),
    false,
  );
});

test("A relic cradled behind and below the mouth keeps the same seal/cooldown gate without retargeting breath", (t) => {
  const config = layout();
  config.relic = [0, -115, 25];
  const { quest, damages, collected } = create(t, { layout: config }),
    originalBeam = structuredClone(quest.segment),
    far = new T.Vector3(90, -100, 90);
  for (const seal of config.seals) {
    const point = new T.Vector3(...seal.point);
    quest.step(0, { position: point, previous: point });
  }
  assert.equal(quest.state.completed, 3);
  assert.equal(quest.state.barrierOpen, true);
  // 真正爪间点由HF落位后调整，调整宝心不会把固定喷口偷偷转向宝物或玩家。
  quest.setRelicPoint([12, -116, 30]);
  const cradle = quest.records.relic.clone();
  assert.deepEqual(quest.segment, originalBeam);
  tick(quest, far, quest.state.remaining + 2.5);
  assert.equal(quest.state.phase, "breath");
  const blocked = quest.step(0, {
    position: cradle,
    previous: cradle,
    playerLength: 25,
  });
  assert.ok(blocked.some((e) => e.kind === "relic_wait"));
  assert.equal(
    blocked.some((e) => e.kind === "breath_hit"),
    false,
  );
  assert.equal(quest.state.relicCollected, false);
  tick(quest, far, 3);
  assert.equal(quest.state.phase, "cooldown");
  tick(quest, far, 2.5);
  const claimed = quest.step(0, {
    position: cradle,
    previous: cradle,
    playerLength: 25,
  });
  assert.ok(claimed.some((e) => e.kind === "relic_held"));
  assert.equal(collected.length, 0);
  assert.equal(quest.state.relicHeld, true);
  assert.equal(damages.length, 0);
  assert.equal(quest.state.sleeping, false);
  assert.deepEqual(quest.segment, originalBeam);
});

test("Actual-pose access is mandatory, excludes only marked moving-arm rest contacts and preserves wall occlusion", (t) => {
  const arm = {
      id: "rest_crossed_arm",
      titanGuardArm: true,
      type: "box",
      x: 0,
      y: -100,
      z: -50,
      halfSize: new T.Vector3(20, 20, 1),
    },
    p = new T.Vector3(0, -100, -48),
    far = new T.Vector3(90, -100, 90);
  let clear = false,
    calls = 0;
  const { quest, notices } = create(t, {
    colliders: [arm],
    canAccessRelic(args) {
      calls++;
      assert.equal(args.guardOpen, true);
      assert.ok(args.guardAmount < 1e-8);
      assert.equal(args.playerLength, 25);
      return clear;
    },
  });
  for (const s of layout().seals)
    quest.step(0, { position: new T.Vector3(...s.point) });
  quest.step(0, { position: p, previous: p, playerLength: 25 });
  assert.equal(calls, 0);
  assert.equal(quest.state.relicCollected, false);
  tick(quest, far, 1.8);
  quest.step(0, { position: p, previous: p, playerLength: 25 });
  assert.equal(quest.state.relicCollected, false);
  const guarded = notices.filter((e) => e.kind === "relic_guarded").length;
  for (let i = 0; i < 10; i++)
    quest.step(0, { position: p, previous: p, playerLength: 25 });
  assert.equal(
    notices.filter((e) => e.kind === "relic_guarded").length,
    guarded,
  );
  clear = true;
  assert.ok(
    quest
      .step(0, { position: p, previous: p, playerLength: 25 })
      .some((e) => e.kind === "relic_held"),
  );
  const callCount = calls;
  quest.step(0, { position: p, previous: p, playerLength: 25 });
  assert.equal(calls, callCount);
  for (const options of [
    { canAccessRelic: null },
    {
      colliders: [{ ...arm, titanGuardArm: false }],
      canAccessRelic: () => true,
      hazardSeed: 1,
      hazardSites: [
        {
          id: "test_floor",
          impact: { x: 0, y: -169.8, z: -65 },
          normal: { x: 0, y: 1, z: 0 },
          roof: { x: 0, y: -60, z: -65 },
          sector: "cradle",
        },
      ],
    },
  ]) {
    const blocked = create(t, options).quest;
    for (const s of layout().seals)
      blocked.step(0, { position: new T.Vector3(...s.point) });
    tick(blocked, far, 1.8);
    const events = blocked.step(0, {
      position: p,
      previous: p,
      playerLength: 25,
    });
    assert.ok(
      events.some((e) => e.kind === "relic_guarded" && e.reason === "occluded"),
    );
    assert.equal(blocked.state.relicCollected, false);
  }
});

test("Escape consumes the real portal callback, rejects teleport/outside-only exits, hides held treasure and needs closed safe doors", (t) => {
  let closed = false,
    resets = 0,
    last = null;
  const { quest, collected, notices } = create(t, {
    checkEscape(prev, now, body) {
      assert.equal(body.length, 25);
      assert.ok(body.radius > 0);
      last = { prev: prev.clone(), now: now.clone() };
      return prev.z < 15 && now.z >= 15 ? { id: "north", crossing: 0.5 } : null;
    },
    isEscapeSafe: (p, body, id) => id === "north" && p.z >= 15,
    sealPortals: (progress) => progress >= 1 && closed,
    resetPortals: () => {
      resets++;
    },
  });
  for (const s of layout().seals)
    quest.step(0, { position: new T.Vector3(...s.point) });
  tick(quest, new T.Vector3(90, -100, 90), 1.75);
  quest.step(0, {
    position: quest.records.relic,
    previous: quest.records.relic,
    playerLength: 25,
  });
  assert.equal(quest.state.relicHeld, true);
  quest.update(1, quest.records.relic);
  assert.equal(
    quest.root.getObjectByName("sleeping_titan_relic").visible,
    false,
  );
  assert.equal(collected.length, 0);
  quest.step(0.05, {
    position: new T.Vector3(0, -100, 20),
    previous: new T.Vector3(0, -100, -55),
    playerLength: 25,
  });
  assert.equal(
    quest.state.escaped,
    false,
    "large position jumps never create a formal outward crossing",
  );
  assert.ok(last.prev.equals(last.now));
  quest.step(0.05, {
    position: new T.Vector3(0, -100, 17),
    previous: new T.Vector3(0, -100, 12),
    playerLength: 25,
  });
  assert.equal(quest.state.escaped, true);
  for (let i = 0; i < 60; i++)
    quest.step(0.05, {
      position: new T.Vector3(0, -100, 17),
      playerLength: 25,
    });
  assert.equal(quest.state.secured, false);
  quest.step(0, {
    position: new T.Vector3(0, -100, 12),
    previous: new T.Vector3(0, -100, 17),
    playerLength: 25,
  });
  assert.equal(quest.state.escaped, false);
  assert.equal(resets, 1);
  quest.step(0, {
    position: new T.Vector3(0, -100, 17),
    previous: new T.Vector3(0, -100, 12),
    playerLength: 25,
  });
  closed = true;
  for (let i = 0; i < 60; i++)
    quest.step(0.05, {
      position: new T.Vector3(0, -100, 17),
      playerLength: 25,
    });
  assert.equal(quest.state.secured, true);
  assert.equal(quest.state.relicCollected, true);
  assert.equal(collected.length, 1);
  assert.equal(notices.filter((e) => e.kind === "escaped").length, 2);
  const before = structuredClone(quest.state);
  quest.step(10, { active: false, position: quest.records.relic });
  assert.deepEqual(quest.state, before);
  quest.reset();
  assert.equal(resets, 2);
  assert.equal(quest.state.relicHeld, false);
  assert.equal(quest.state.sealed, false);
});

test("Failed escape seals actual portals in the fatal frame, never secures loot, and reset reopens them", (t) => {
  const progress = [];
  let opened = 0;
  const { quest, collected } = create(t, {
    sealPortals: (value) => {
      progress.push(value);
      return value === 1;
    },
    resetPortals: () => {
      opened++;
    },
  });
  for (const s of layout().seals)
    quest.step(0, { position: new T.Vector3(...s.point) });
  tick(quest, new T.Vector3(90, -100, 90), 1.75);
  quest.step(0, {
    position: quest.records.relic,
    previous: quest.records.relic,
    playerLength: 25,
  });
  quest.state.escapeRemaining = 0.05;
  const events = quest.step(0.05, {
    position: quest.records.relic,
    playerLength: 25,
  });
  assert.deepEqual(
    events.filter((e) => e.kind === "entombed"),
    [{ kind: "entombed", fatal: true }],
  );
  assert.deepEqual(progress, [1]);
  assert.equal(quest.state.sealed, true);
  assert.equal(quest.state.secured, false);
  assert.equal(quest.state.relicCollected, false);
  assert.equal(collected.length, 0);
  quest.step(10, { active: false, position: quest.records.relic });
  assert.deepEqual(progress, [1]);
  quest.reset();
  assert.equal(opened, 1);
  assert.equal(quest.state.sealed, false);
});

test("A large player's actual intake can reach the cradle from outside, while the body centre and length cannot manufacture contact", (t) => {
  let observed;
  const { quest } = create(t, {
    canAccessRelic: (args) => {
      observed = args;
      return true;
    },
  });
  for (const s of layout().seals)
    quest.step(0, { position: new T.Vector3(...s.point) });
  tick(quest, new T.Vector3(90, -100, 90), 1.75);
  const body = new T.Vector3(0, -100, -35),
    mouth = new T.Vector3(0, -100, -49);
  quest.step(0, { position: body, previous: body, playerLength: 30 });
  assert.equal(
    quest.state.relicHeld,
    false,
    "30m length alone never enlarges an unlimited relic sphere",
  );
  const events = quest.step(0, {
    position: body,
    previous: body,
    intakePoint: mouth,
    previousIntakePoint: mouth,
    playerLength: 30,
  });
  assert.ok(events.some((e) => e.kind === "relic_held"));
  assert.ok(observed.position.equals(body));
  assert.ok(observed.intakePoint.equals(mouth));
  assert.equal(observed.playerLength, 30);
  assert.deepEqual(observed.forward, { x: 0, y: 0, z: -1 });
  quest.reset();
  assert.equal(quest.state.relicHeld, false);
});

test("Scene shares real active-time scheduling with escape, preserves full warning frames and freezes paused callers", (t) => {
  const { quest } = create(t);
  for (const s of layout().seals)
    quest.step(0, { position: new T.Vector3(...s.point) });
  tick(quest, new T.Vector3(90, -100, 90), 1.75);
  quest.step(0, {
    position: quest.records.relic,
    previous: quest.records.relic,
    playerLength: 25,
  });
  const breathBefore = quest.state.remaining;
  quest.step(0.04, {
    activeTimeDt: 20,
    position: quest.records.relic,
    playerLength: 25,
  });
  assert.equal(quest.state.escapeRemaining, 40);
  assert.equal(quest.state.phase, "charging");
  assert.equal(quest.state.remaining, quest.state.phaseDuration);
  assert.ok(quest.state.remaining >= 2.4);
  const before = structuredClone(quest.state);
  quest.step(0.04, {
    active: false,
    activeTimeDt: 100,
    position: quest.records.relic,
    playerLength: 25,
  });
  assert.deepEqual(quest.state, before);
});

test("The protected relic is the fixed opaque amber heart, never a spinning conch/key duplicate", (t) => {
  const { quest } = create(t),
    heart = quest.root.getObjectByName("bermuda_amber_heart");
  assert.ok(heart);
  const rotation = heart.quaternion.clone(),
    scale = heart.scale.clone();
  let meshes = 0;
  heart.traverse((mesh) => {
    if (mesh.isMesh) {
      meshes++;
      assert.equal(mesh.material.transparent, false);
      assert.ok(mesh.geometry.attributes.position.count > 20);
    }
  });
  assert.ok(meshes > 0);
  const p = quest.records.relic.clone();
  for (let i = 0; i < 20; i++) quest.update(i, p);
  assert.ok(heart.quaternion.equals(rotation));
  assert.ok(heart.scale.equals(scale));
  assert.ok(heart.parent.position.equals(p));
  quest.setRelicPoint([12, -116, 30]);
  assert.ok(heart.parent.position.equals(new T.Vector3(12, -116, 30)));
  quest.state.relicHeld = true;
  quest.update(21, p);
  assert.equal(heart.parent.visible, false);
});

test("The amber cradle retains a faint six-metre seal and warm light without changing the actual eight-metre intake gate", (t) => {
  const { quest } = create(t),
    relic = quest.root.getObjectByName("sleeping_titan_relic"),
    barrier = relic.children.find((n) => n.geometry?.type === "SphereGeometry");
  assert.equal(barrier.geometry.parameters.radius, 6);
  assert.equal(barrier.material.opacity, 0.08);
  assert.equal(
    quest.lightSources.find((s) => s.position === quest.records.relic).color,
    0xffbf5e,
  );
  quest.update(1, quest.records.relic, { reducedMotion: true });
  assert.equal(barrier.material.opacity, 0.06);
  quest.update(2, quest.records.relic, { reducedMotion: false });
  assert.ok(
    barrier.material.opacity >= 0.045 && barrier.material.opacity <= 0.075,
  );
});

test("Portal queries receive actual previous facing and discard that orientation after a large body teleport", (t) => {
  const pairs = [],
    { quest } = create(t, {
      checkEscape: (a, b, body) => {
        pairs.push({ a: a.clone(), b: b.clone(), ...body });
        return null;
      },
    });
  quest.state.relicHeld = true;
  quest.state.escaping = true;
  const previousForward = { x: 1, y: 0, z: 0 },
    forward = { x: 0, y: 0, z: 1 };
  quest.step(0, {
    position: new T.Vector3(0, -100, 1),
    previous: new T.Vector3(0, -100, 0),
    forward,
    previousForward,
    playerLength: 30,
  });
  assert.equal(pairs[0].forward, forward);
  assert.equal(pairs[0].previousForward, previousForward);
  quest.step(0, {
    position: new T.Vector3(0, -100, 30),
    previous: new T.Vector3(0, -100, 1),
    forward,
    previousForward,
    playerLength: 30,
  });
  assert.equal(pairs[1].previousForward, forward);
  assert.ok(pairs[1].a.equals(pairs[1].b));
});
