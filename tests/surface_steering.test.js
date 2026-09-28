import assert from "node:assert/strict";
import test from "node:test";
import {
  stepSurfaceSteering,
  SURFACE_STEERING,
} from "../src/surface_steering.js";
import { MAX_SWIM_PITCH, stepSteering } from "../src/steering_rules.js";
import {
  createSurfaceState,
  getSurfaceWaterline,
  stepSurface,
} from "../src/surface_rules.js";

const movement = { yawRate: 1.15, pitchRate: 1.15 };
const radians = (degrees) => (degrees * Math.PI) / 180;
const surface = (length = 3) => ({
  length,
  positionY: getSurfaceWaterline(length),
  divingRequired: true,
});

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
}

function runAtSurface(pitch, input, duration, frames, options = surface()) {
  let orientation = { yaw: 0, pitch };
  for (let index = 0; index < frames; index++)
    orientation = stepSurfaceSteering(
      orientation,
      input,
      movement,
      duration / frames,
      options,
    );
  return orientation;
}

test("普通浮游从大上仰柔和收拢，松键与持续上仰都趋向20度而不突跳", () => {
  const initial = { yaw: 0.8, pitch: MAX_SWIM_PITCH };
  const first = stepSurfaceSteering(
    initial,
    { x: 0, y: 0 },
    movement,
    1 / 60,
    surface(),
  );
  assert.ok(first.pitch < initial.pitch && first.pitch > radians(79));
  assert.equal(first.yaw, initial.yaw);
  for (const y of [0, 0.3, 1]) {
    const settled = runAtSurface(initial.pitch, { x: 0, y }, 1, 60);
    assert.ok(settled.pitch > radians(20) && settled.pitch < radians(21));
    close(
      settled.pitch,
      runAtSurface(initial.pitch, { x: 0, y: 0 }, 1, 60).pitch,
    );
  }
  assert.deepEqual(initial, { yaw: 0.8, pitch: MAX_SWIM_PITCH });
});

test("水面持续上仰最高20度，水平和下俯方向不会被强行抬起", () => {
  close(runAtSurface(0, { x: 0, y: 1 }, 2, 120).pitch, radians(20));
  for (const pitch of [radians(-85), radians(-37), 0, radians(12), radians(20)])
    close(runAtSurface(pitch, { x: 0, y: 0 }, 1, 60).pitch, pitch);
  close(
    runAtSurface(radians(20), { x: 0, y: -1 }, 2, 120).pitch,
    -MAX_SWIM_PITCH,
  );
});

test("下俯立即生效，可越过水面舒适角度而无需等待收拢动画结束", () => {
  const pitch = radians(65);
  const neutral = runAtSurface(pitch, { x: 0, y: 0 }, 1 / 60, 1);
  const down = runAtSurface(pitch, { x: 0, y: -1 }, 1 / 60, 1);
  assert.ok(down.pitch < neutral.pitch);
  assert.ok(runAtSurface(pitch, { x: 0, y: -1 }, 1, 60).pitch < 0);
});

test("水面衰减与向下操纵跨20度的过程不受帧率影响，偏航沿用自由游泳", () => {
  for (const input of [
    { x: 0.45, y: 0 },
    { x: -0.4, y: 1 },
    { x: 0.6, y: -0.8 },
  ]) {
    const coarse = runAtSurface(MAX_SWIM_PITCH, input, 1, 1);
    for (const frames of [25, 60, 120]) {
      const fine = runAtSurface(MAX_SWIM_PITCH, input, 1, frames);
      close(coarse.pitch, fine.pitch);
      close(coarse.yaw, fine.yaw);
    }
  }
});

test("水下保持85度自由俯仰，仅身体水线附近受限且随体长与海平面调整", () => {
  for (const length of [3, 6, 30]) {
    for (const surfaceY of [4, 0, 12]) {
      const waterline = getSurfaceWaterline(length, surfaceY);
      for (const positionY of [
        waterline - 0.06,
        waterline - 8,
        waterline + 0.06,
      ]) {
        for (const pitch of [MAX_SWIM_PITCH, -MAX_SWIM_PITCH]) {
          const orientation = { yaw: 1, pitch };
          const input = { x: 0.6, y: 0 };
          assert.deepEqual(
            stepSurfaceSteering(orientation, input, movement, 0.2, {
              positionY,
              length,
              surfaceY,
            }),
            stepSteering(orientation, input, movement, 0.2),
          );
        }
      }
      const ordinary = stepSurfaceSteering(
        { yaw: 0, pitch: MAX_SWIM_PITCH },
        { x: 0, y: 1 },
        movement,
        0.1,
        { positionY: waterline - 0.02, length, surfaceY },
      );
      assert.ok(ordinary.pitch < MAX_SWIM_PITCH);
    }
  }
});

test("最后几厘米仍能保持合法蓄势方向，空中与回水姿态完全由原规则处理", () => {
  const orientation = { yaw: 0.3, pitch: radians(72) };
  const input = { x: 0.4, y: 0.8 };
  const free = stepSteering(orientation, input, movement, 0.04);
  for (const options of [
    {
      ...surface(),
      positionY: getSurfaceWaterline(3) - 0.02,
      boosting: true,
      divingRequired: false,
    },
    { ...surface(), airborne: true },
    { ...surface(), reentering: true },
  ]) {
    assert.deepEqual(
      stepSurfaceSteering(orientation, input, movement, 0.04, options),
      free,
    );
  }
  // 已贴水面再冲刺不属于合法起跳准备，依然柔和限制上仰。
  assert.ok(
    stepSurfaceSteering(orientation, input, movement, 0.04, {
      ...surface(),
      boosting: true,
    }).pitch < orientation.pitch,
  );
});

test("与真实破水规则组合后，持续水下冲刺的起跳时机和弹道完全不变", () => {
  for (const dt of [1 / 25, 1 / 60, 1 / 120]) {
    const run = (steering) => {
      const state = createSurfaceState();
      let position = { x: 0, y: getSurfaceWaterline(3) - 52, z: 0 };
      let orientation = { yaw: 0, pitch: MAX_SWIM_PITCH };
      let motion = null;
      let launchedAt = null;
      for (let frame = 0; frame < Math.ceil(3 / dt); frame++) {
        orientation = steering(orientation, { x: 0, y: 0 }, movement, dt, {
          ...surface(),
          positionY: position.y,
          airborne: state.airborne,
          reentering: state.reentryRemaining > 0,
          boosting: true,
          divingRequired: state.divingRequired,
        });
        const forward = {
          x: 0,
          y: Math.sin(orientation.pitch),
          z: -Math.cos(orientation.pitch),
        };
        motion = stepSurface(state, dt, {
          previousPosition: position,
          position: {
            x: position.x,
            y: position.y + forward.y * 32 * dt,
            z: position.z + forward.z * 32 * dt,
          },
          forward,
          speed: 32,
          boosting: true,
          length: 3,
        });
        position = motion.position;
        if (motion.launched) launchedAt = frame;
      }
      return { position, motion, launchedAt, state };
    };
    const limited = run(stepSurfaceSteering),
      original = run(stepSteering);
    assert.notEqual(limited.launchedAt, null);
    assert.deepEqual(limited, original);
  }
});

test("暂停和非法时间不推进水面收拢，缺少位置不会误判为浮在水面", () => {
  const orientation = { yaw: 0.3, pitch: radians(70) };
  for (const dt of [0, -1, Number.NaN, Infinity])
    assert.deepEqual(
      stepSurfaceSteering(orientation, { x: 1, y: 1 }, movement, dt, surface()),
      orientation,
    );
  for (const positionY of [undefined, Number.NaN, Infinity])
    assert.deepEqual(
      stepSurfaceSteering(orientation, { x: 0, y: 0 }, movement, 1, {
        ...surface(),
        positionY,
      }),
      orientation,
    );
  close(SURFACE_STEERING.maxUpwardPitch, radians(20));
});
