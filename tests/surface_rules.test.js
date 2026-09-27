import assert from "node:assert/strict";
import test from "node:test";
import {
  createSurfaceState,
  getSurfaceWaterline,
  stepSurface,
  SURFACE_RULES,
} from "../src/surface_rules.js";

const UP = { x: 0, y: 0.6, z: -0.8 };
const FLAT = { x: 0, y: 0, z: -1 };
const DOWN = { x: 0, y: -0.7, z: -Math.sqrt(0.51) };

function frame(
  state,
  previous,
  {
    dt = 1 / 60,
    forward = UP,
    boosting = true,
    speed = 32,
    length = 6,
    proposed,
  } = {},
) {
  const position =
    proposed ||
    (state.airborne
      ? { ...previous }
      : {
          x: previous.x + forward.x * speed * dt,
          y: previous.y + forward.y * speed * dt,
          z: previous.z + forward.z * speed * dt,
        });
  return stepSurface(state, dt, {
    previousPosition: previous,
    position,
    forward,
    speed,
    boosting,
    length,
  });
}

function launch(length = 6) {
  const state = createSurfaceState();
  let position = { x: 0, y: getSurfaceWaterline(length) - 36, z: 0 };
  let result;
  for (let i = 0; i < 240; i += 1) {
    result = frame(state, position, { length });
    position = result.position;
    if (result.launched) return { state, position, result };
  }
  throw new Error("A valid underwater run did not breach");
}

function close(actual, expected, tolerance = 1e-7) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
}

test("浮在水面才开始加速不会起飞，也不能原地累积蓄势", () => {
  const state = createSurfaceState();
  let position = { x: 0, y: getSurfaceWaterline(6), z: 0 };
  for (let i = 0; i < 360; i += 1) {
    const result = frame(state, position);
    position = result.position;
    assert.equal(result.launched, false);
    assert.equal(result.airborne, false);
    assert.equal(result.charge, 0);
  }
  assert.equal(state.divingRequired, true);
  close(position.y, getSurfaceWaterline(6));
});

test("不足1.2秒的水下冲刺即使跨过水面也不能起跳", () => {
  const state = createSurfaceState();
  let position = { x: 0, y: getSurfaceWaterline(6) - 18, z: 0 };
  for (let i = 0; i < 100; i += 1) {
    const result = frame(state, position);
    position = result.position;
    assert.equal(result.launched, false);
  }
  close(position.y, getSurfaceWaterline(6));
  assert.equal(state.divingRequired, true);
});

test("深潜后持续冲刺并真实跨水线才破水，水平蓄势不能直接起飞", () => {
  const state = createSurfaceState();
  let position = { x: 0, y: getSurfaceWaterline(6) - 36, z: 0 };
  for (let i = 0; i < 90; i += 1) {
    const result = frame(state, position, { forward: FLAT });
    position = result.position;
    assert.equal(result.airborne, false);
  }
  assert.ok(state.chargeTime >= 1.2);
  let launched = false;
  for (let i = 0; i < 160; i += 1) {
    const previousY = position.y;
    const result = frame(state, position);
    position = result.position;
    if (result.launched) {
      assert.ok(previousY < getSurfaceWaterline(6));
      assert.ok(position.y >= getSurfaceWaterline(6));
      assert.ok(result.posePitch > 0);
      assert.equal(result.divingRequired, true);
      launched = true;
      break;
    }
  }
  assert.equal(launched, true);
});

test("松开冲刺会中断蓄势，不能使用之前的加速时间跳起", () => {
  const state = createSurfaceState();
  let position = { x: 0, y: getSurfaceWaterline(6) - 20, z: 0 };
  for (let i = 0; i < 90; i += 1)
    position = frame(state, position, { forward: FLAT }).position;
  position = frame(state, position, {
    forward: FLAT,
    boosting: false,
  }).position;
  assert.equal(state.chargeTime, 0);
  assert.equal(state.chargeDistance, 0);
  for (let i = 0; i < 100; i += 1) {
    const result = frame(state, position);
    position = result.position;
    assert.equal(result.launched, false);
  }
});

test("在水下卡住不计蓄势，一帧穿过水面也不能绕过时间条件", () => {
  const state = createSurfaceState();
  const position = { x: 0, y: -35, z: 0 };
  for (let i = 0; i < 150; i += 1)
    frame(state, position, { proposed: { ...position } });
  assert.equal(state.chargeTime, 0);
  const result = frame(state, position, { proposed: { x: 0, y: 8, z: -28 } });
  assert.equal(result.launched, false);
  close(result.position.y, getSurfaceWaterline(6));
});

test("空中按加速和上仰不会改变惯性或触发二段跳", () => {
  const first = launch();
  const secondState = structuredClone(first.state);
  const neutral = frame(first.state, first.position, {
    dt: 0.35,
    boosting: false,
  });
  const forced = frame(secondState, first.position, {
    dt: 0.35,
    boosting: true,
    speed: 999,
    forward: { x: 1, y: 1, z: 0 },
    proposed: { x: 999, y: 999, z: 999 },
  });
  close(neutral.position.x, forced.position.x);
  close(neutral.position.y, forced.position.y);
  close(neutral.position.z, forced.position.z);
  close(neutral.velocityY, forced.velocityY);
  assert.equal(forced.launched, false);
  assert.ok(forced.velocityY < first.result.velocityY);
});

test("抛物线积分不受帧率影响，姿态随速度自然从上仰变俯冲", () => {
  const initial = launch();
  const coarse = structuredClone(initial.state);
  const fine = structuredClone(initial.state);
  const one = frame(coarse, initial.position, { dt: 0.4 });
  let position = { ...initial.position };
  let result;
  for (let i = 0; i < 40; i += 1) {
    result = frame(fine, position, { dt: 0.01 });
    position = result.position;
  }
  close(one.position.y, position.y);
  close(one.position.z, position.z);
  close(one.velocityY, result.velocityY);
  const descent = frame(coarse, one.position, { dt: 1.15 });
  assert.equal(descent.airborne, true);
  assert.ok(descent.posePitch < 0);
});

test("落水先保留下潜惯性，持续上仰加速不能在水面连续弹跳", () => {
  const trip = launch();
  let position = trip.position;
  let landed = null;
  for (let i = 0; i < 300; i += 1) {
    const result = frame(trip.state, position);
    position = result.position;
    if (result.landed) {
      landed = result;
      break;
    }
  }
  assert.ok(landed);
  assert.equal(landed.airborne, false);
  assert.equal(landed.reentering, true);
  assert.ok(landed.posePitch < 0);
  const next = frame(trip.state, position, {
    dt: 0.12,
    forward: { x: 0, y: 0.9, z: -Math.sqrt(0.19) },
  });
  assert.ok(next.position.y < position.y);
  assert.ok(next.velocityY < 0);
  position = next.position;
  for (let i = 0; i < 420; i += 1) {
    const result = frame(trip.state, position);
    position = result.position;
    assert.equal(result.launched, false);
  }
  assert.equal(trip.state.divingRequired, true);
});

test("落水后再次深潜并重新冲刺，可以完成新的一次破水", () => {
  const trip = launch();
  let position = trip.position;
  for (let i = 0; i < 480; i += 1)
    position = frame(trip.state, position).position;
  while (position.y > getSurfaceWaterline(6) - 36)
    position = frame(trip.state, position, {
      forward: DOWN,
      boosting: false,
      speed: 12,
    }).position;
  assert.equal(trip.state.chargeTime, 0);
  let launches = 0;
  for (let i = 0; i < 240; i += 1) {
    const result = frame(trip.state, position);
    position = result.position;
    if (result.launched) {
      launches += 1;
      break;
    }
  }
  assert.equal(launches, 1);
});

test("不同体型按身体水线处理破水，重建状态清除飞行与蓄势", () => {
  for (const length of [6, 18, 30]) {
    const trip = launch(length);
    assert.ok(trip.position.y >= getSurfaceWaterline(length));
    assert.equal(trip.result.airborne, true);
    assert.ok(trip.result.velocityY <= 32 * UP.y);
  }
  const fresh = createSurfaceState();
  assert.equal(fresh.airborne, false);
  assert.equal(fresh.chargeTime, 0);
  assert.equal(fresh.velocityY, 0);
  assert.equal(fresh.posePitch, null);
  assert.equal(fresh.divingRequired, true);
  assert.equal(SURFACE_RULES.chargeSeconds, 1.2);
});

test("无效或零时间不推进飞行状态", () => {
  const trip = launch();
  const before = structuredClone(trip.state);
  for (const dt of [0, -0.5, NaN, Infinity])
    frame(trip.state, trip.position, { dt });
  assert.deepEqual(trip.state, before);
});
