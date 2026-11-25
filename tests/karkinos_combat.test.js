import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  KARKINOS_COMBAT as C,
  karkinosClawSweep,
  inKarkinosClaws,
  karkinosFaultDirection,
  buildKarkinosFaultField,
  updateKarkinosFaultField,
  karkinosFaultSweep,
  inKarkinosFault,
} from "../src/karkinos_combat.js";
import {
  ODYSSEY_ATTACKS,
  inCrabClaws,
  inReefFault,
} from "../src/odyssey_attack_rules.js";
import { createOdysseyAttackFx } from "../src/odyssey_combat_fx.js";
import { castSegment } from "../src/collision.js";
const origin = new T.Vector3(),
  forward = new T.Vector3(0, 0, -1);
const point = (r, a = 0, y = 0) =>
  new T.Vector3(Math.sin(a) * r, y, -Math.cos(a) * r);
const floor = () => -22;

test("only crab warnings and real rules share the broadened policy and retain long counter windows", () => {
  assert.equal(ODYSSEY_ATTACKS.claw, C.claw);
  assert.equal(ODYSSEY_ATTACKS.fault, C.fault);
  assert.equal(C.engageRange, 200);
  assert.deepEqual(C.abilityEngageRanges, { fault: 200, claw: 90 });
  assert.deepEqual(C.abilityCycle, ["fault", "claw"]);
  assert.equal(C.abilityTimings.claw.recover, 4.5);
  assert.equal(C.abilityTimings.fault.recover, 4.5);
  assert.ok(
    C.fault.range / C.fault.speed + 2 * C.fault.interval <
      C.abilityTimings.fault.attack,
  );
  assert.ok(
    Object.isFrozen(C) && Object.isFrozen(C.claw) && Object.isFrozen(C.fault),
  );
});

test("pincers advertise broader sectors but actual pressure travels from the claws instead of hitting all distant water instantly", () => {
  const p = point(90, C.claw.spread);
  const hitAt = C.claw.releaseTime + (90 - C.claw.pressureStart) / C.claw.speed;
  assert.equal(
    inCrabClaws(p, origin, forward, 0, C.claw.releaseTime - 0.01, 0.02),
    false,
  );
  assert.equal(inCrabClaws(p, origin, forward, 0, 0.85, 0.02), false);
  assert.equal(inCrabClaws(p, origin, forward, 0, hitAt, 0.02), true);
  assert.equal(inCrabClaws(p, origin, forward, 0, 1.5, 0.02), false);
  assert.equal(inCrabClaws(p, origin, forward), true);
  assert.equal(
    inCrabClaws(p, origin, forward, 0, 1.3, 0.4),
    true,
    "大帧仍扫过此前可见的波前",
  );
  assert.equal(inCrabClaws(point(105, C.claw.spread), origin, forward), false);
});

test("the advertised overlapping pressure fans threaten the aimed front while rear, flanks and upper water stay safe", () => {
  assert.equal(
    inKarkinosClaws(point(20, 0, 24), origin, forward, 0, 0.8, 0.01),
    true,
  );
  assert.equal(
    inKarkinosClaws(point(20, Math.PI), origin, forward, 0, 0.8, 0.01),
    false,
  );
  assert.equal(
    inKarkinosClaws(point(60, 0), origin, forward, 0, 1, 0.01),
    true,
  );
  assert.equal(
    inKarkinosClaws(point(60, 1.5), origin, forward, 0, 1, 0.01),
    false,
  );
  assert.equal(
    inKarkinosClaws(point(20, 0, 30), origin, forward, 3.6, 0.8, 0.01),
    false,
  );
  assert.equal(
    inKarkinosClaws(
      point(90, C.claw.spread, 24),
      origin,
      forward,
      3.6,
      1.15,
      0.01,
    ),
    false,
  );
  const rotated = new T.Vector3(1, 0, 0);
  assert.equal(
    inKarkinosClaws(new T.Vector3(60, 0, 43), origin, rotated),
    true,
  );
});

test("all three broad crests reach the new far field before the attack ends and follow actual local bed height", () => {
  const heightAt = (x, z) => -50 + 0.03 * x + 0.07 * z;
  for (let lane = 0; lane < 3; lane++) {
    const d = karkinosFaultDirection(forward, lane),
      r = 220,
      p = new T.Vector3(d.x * r, 0, d.z * r);
    p.y = heightAt(p.x, p.z) + C.fault.floorOffset;
    const time = lane * C.fault.interval + r / C.fault.speed;
    assert.equal(inReefFault(p, origin, forward, time, 1 / 60, heightAt), true);
    assert.equal(
      inReefFault(
        p.clone().add(new T.Vector3(0, 27, 0)),
        origin,
        forward,
        time,
        1 / 60,
        heightAt,
        3.6,
      ),
      false,
    );
    assert.equal(
      inReefFault(p, origin, forward, time - 0.5, 1 / 60, heightAt),
      false,
    );
  }
  const end = 2 * C.fault.interval + C.fault.range / C.fault.speed;
  assert.ok(end < 3);
  assert.ok(
    Math.abs(karkinosFaultSweep(end, 1 / 60, 2).front - C.fault.range) < 1e-9,
  );
});

test("round pressure fronts retain real gaps and avoid invisible square-corner damage", () => {
  assert.equal(
    inKarkinosFault(point(180), origin, forward, 0.28 + 180 / 110, 0.02, floor),
    true,
  );
  assert.equal(
    inKarkinosFault(point(210, 0.24), origin, forward, 2.4, 0.4, floor, 3.6),
    false,
  );
  assert.equal(
    inKarkinosFault(
      new T.Vector3(10, 0, -115),
      origin,
      forward,
      1.28,
      0,
      floor,
    ),
    false,
    "半轴12×6的波头不以方盒四角伤人",
  );
  assert.equal(
    inKarkinosFault(new T.Vector3(0, 0, 10), origin, forward, 0.1, 0.1, floor),
    false,
  );
  assert.equal(
    inKarkinosFault(point(50), origin, forward, 1, 0.1, () => NaN),
    false,
  );
});

test("actual finite-width cover clips all warning paths and their damage, while a frozen field reuses the same work", () => {
  const wall = {
    type: "box",
    id: "reef_wall",
    x: 0,
    y: 0,
    z: -81,
    halfSize: new T.Vector3(300, 60, 1),
  };
  let calls = 0;
  const blocked = (a, b, r) => {
    calls++;
    return Boolean(castSegment(a, b, [wall], r));
  };
  const field = buildKarkinosFaultField(origin, forward, floor, blocked);
  assert.ok(field.lanes.every((l) => l.reach < 80));
  assert.equal(
    inReefFault(point(150), origin, forward, 0.28 + 150 / 110, 0.02, floor),
    true,
  );
  assert.equal(
    inReefFault(
      point(150),
      origin,
      forward,
      0.28 + 150 / 110,
      0.02,
      floor,
      0,
      field,
    ),
    false,
  );
  const n = calls;
  assert.equal(
    updateKarkinosFaultField(field, origin, forward, floor, blocked),
    field,
  );
  assert.equal(calls, n);
  assert.notEqual(
    updateKarkinosFaultField(
      field,
      new T.Vector3(1, 0, 0),
      forward,
      floor,
      blocked,
    ),
    field,
  );
});

function boundsOf(mesh) {
  mesh.updateMatrixWorld(true);
  return new T.Box3().setFromObject(mesh);
}
test("claw pressure geometry shows the same moving near/far/height envelope and disappears after the real pulse", () => {
  const fx = createOdysseyAttackFx(new T.Group(), "claw", 0xe3b274, {});
  const e = {
    state: { timer: 1.1, phaseDuration: 1.6 },
    attackOrigin: origin.clone(),
    heading: forward.clone(),
    mesh: new T.Group(),
  };
  fx.update(e, 1 / 60, 1.1, false, true, floor);
  const wave = karkinosClawSweep(1.1),
    row = fx.clawSides[0];
  assert.equal(row.curtain[0].scale.x, wave.visibleNear);
  assert.equal(row.curtain[1].scale.x, wave.visibleFar);
  assert.equal(row.curtain[0].scale.y, C.claw.height * 2);
  assert.ok(boundsOf(row.curtain[1]).max.y >= C.claw.height - 0.001);
  e.state.timer = 1.5;
  fx.update(e, 1 / 60, 1.5, false, true, floor);
  assert.ok(fx.clawSides.every((s) => s.curtain.every((m) => !m.visible)));
  assert.equal(fx.innerCurtain.visible, false);
  e.state.timer = 1;
  fx.update(e, 1 / 60, 1, true, false, floor);
  assert.equal(fx.innerCurtain.visible, true);
  assert.equal(fx.innerCurtain.scale.y, C.claw.innerHeight * 2);
});

test("fissure geometry is a broad, tall, terrain-following crest that shares clipped reach with real hits", () => {
  const fx = createOdysseyAttackFx(new T.Group(), "fault", 0xda9b7e, {});
  const wall = {
    type: "box",
    id: "reef_wall",
    x: 0,
    y: 0,
    z: -81,
    halfSize: new T.Vector3(300, 60, 1),
  };
  const blocked = (a, b, r) => Boolean(castSegment(a, b, [wall], r));
  const field = buildKarkinosFaultField(origin, forward, floor, blocked);
  const e = {
    state: { timer: 0.28 + 0.5, phaseDuration: 3 },
    attackOrigin: origin.clone(),
    heading: forward.clone(),
    mesh: new T.Group(),
    karkinosFaultField: field,
  };
  fx.update(e, 0.02, 0.78, false, true, floor);
  const crest = fx.faultLanes[1].crest,
    b = boundsOf(crest);
  assert.ok(b.max.x - b.min.x >= C.fault.radius * 1.99);
  assert.ok(
    Math.abs(b.max.y - C.fault.height) < 0.001 &&
      Math.abs(b.min.y + C.fault.height) < 0.001,
  );
  const warning = boundsOf(fx.faultLanes[1].warning);
  assert.ok(warning.min.z > -81, "真实障碍前截断预警");
  const geometries = fx.parts.map((m) => m.geometry),
    arrays = fx.parts.map((m) => m.geometry.attributes.position.array);
  for (let i = 0; i < 100; i++) {
    e.state.timer = i / 30;
    fx.update(e, 1 / 30, i / 30, i < 20, i >= 20, floor);
  }
  assert.deepEqual(
    fx.parts.map((m) => m.geometry),
    geometries,
  );
  assert.deepEqual(
    fx.parts.map((m) => m.geometry.attributes.position.array),
    arrays,
  );
  fx.update(e, 0, 100, false, false, floor);
  assert.equal(fx.group.visible, false);
});
