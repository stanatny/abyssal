import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SWIM_PITCH,
  stepSteering,
  getSwimmingAttitude,
} from "../src/steering_rules.js";
import { characterMovement } from "../src/character_rules.js";

const NORMAL = { yawRate: 1.15, pitchRate: 1.15 };

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
}

test("俯仰与左右方向均按角速度累加，松键后保持任意组合游向", () => {
  const initial = { yaw: 0.3, pitch: 0.1 };
  const input = { x: 0.5, y: 0.8 };
  const turned = stepSteering(initial, input, NORMAL, 0.4);
  close(turned.yaw, 0.3 - 0.5 * 1.15 * 0.4);
  close(turned.pitch, 0.1 + 0.8 * 1.15 * 0.4);
  let held = turned;
  for (let frame = 0; frame < 300; frame++) {
    held = stepSteering(held, { x: 0, y: 0 }, NORMAL, 1 / 60);
  }
  assert.deepEqual(held, turned);
  assert.deepEqual(initial, { yaw: 0.3, pitch: 0.1 });
  assert.deepEqual(input, { x: 0.5, y: 0.8 });
});

test("反向输入能连续越过水平，摇杆部分幅度按比例调整俯仰", () => {
  const initial = { yaw: 0, pitch: 0.4 };
  const half = stepSteering(initial, { x: 0, y: -0.5 }, NORMAL, 1);
  const full = stepSteering(initial, { x: 0, y: -1 }, NORMAL, 1);
  close(0.4 - half.pitch, (0.4 - full.pitch) * 0.5);
  assert.ok(half.pitch < 0 && full.pitch < half.pitch);
});

test("所有角色及冲刺均可到达85度，切换转向速率不压回当前姿态", () => {
  for (const id of ["orca", "squid"]) {
    for (const sprint of [false, true]) {
      const movement = characterMovement(id, sprint);
      for (const sign of [-1, 1]) {
        const atLimit = stepSteering(
          { yaw: 0, pitch: 0 },
          { x: 0, y: sign },
          movement,
          10,
        );
        close(atLimit.pitch, sign * MAX_SWIM_PITCH);
        assert.deepEqual(
          stepSteering(
            atLimit,
            { x: 0, y: 0 },
            characterMovement(id, !sprint),
            1,
          ),
          atLimit,
        );
      }
    }
  }
});

test("俯仰不随帧率改变，暂停零时间不消耗输入也不回平", () => {
  const initial = { yaw: -0.3, pitch: 0.2 };
  const input = { x: -0.3, y: -0.7 };
  const one = stepSteering(initial, input, NORMAL, 1);
  for (const fps of [20, 60, 144]) {
    let split = initial;
    for (let frame = 0; frame < fps; frame++) {
      split = stepSteering(split, input, NORMAL, 1 / fps);
    }
    close(split.yaw, one.yaw);
    close(split.pitch, one.pitch);
  }
  assert.deepEqual(stepSteering(initial, input, NORMAL, 0), initial);
});

test("过量与无效输入保持有限姿态，不会越过垂直而翻转方向", () => {
  const limited = stepSteering(
    { yaw: 0, pitch: 0 },
    { x: 3, y: -8 },
    NORMAL,
    9,
  );
  close(limited.pitch, -MAX_SWIM_PITCH);
  assert.ok(Math.cos(limited.pitch) > 0);
  assert.deepEqual(
    stepSteering(
      { yaw: NaN, pitch: Infinity },
      { x: NaN, y: Infinity },
      {},
      NaN,
    ),
    { yaw: 0, pitch: 0 },
  );
});

test("姿态读数对应实际前向，任意航向与非单位向量均显示正确仰俯角", () => {
  for (const degrees of [-85, -42, 0, 31, 85]) {
    const pitch = (degrees * Math.PI) / 180;
    for (const yaw of [0, 1.2, Math.PI]) {
      const attitude = getSwimmingAttitude({
        x: -Math.sin(yaw) * Math.cos(pitch) * 3,
        y: Math.sin(pitch) * 3,
        z: -Math.cos(yaw) * Math.cos(pitch) * 3,
      });
      assert.equal(attitude.degrees, degrees);
      close(attitude.pitch, pitch);
      assert.match(
        attitude.label,
        degrees > 0 ? /上仰/ : degrees < 0 ? /下俯/ : /平游/,
      );
    }
  }
  assert.equal(getSwimmingAttitude({ x: 0, y: 1, z: 0 }).fraction, 1);
  assert.equal(getSwimmingAttitude({ x: 0, y: -1, z: 0 }).fraction, -1);
  assert.equal(getSwimmingAttitude(null).label, "平游 0°");
});
