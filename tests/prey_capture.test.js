import test from "node:test";
import assert from "node:assert/strict";
import {
  preyCaptureRadius,
  sweptCaptureFraction,
} from "../src/prey_capture.js";
import { createPlayer, canEat } from "../src/simulation.js";
import { characterMovement } from "../src/character_rules.js";

test("育幼和成年捕食都增加近身容错，但额外范围不随巨型体长无限增长", () => {
  for (const player of [3, 4.5, 6, 15, 30])
    for (const prey of [0.18, 0.8, 1.7, 3, 16, 20])
      for (const nursery of [false, true]) {
        const before = player * 0.22 + prey * 0.28 + (nursery ? 0.25 : 0),
          after = preyCaptureRadius(player, prey, nursery);
        assert.ok(after > before && after <= before * 1.24 + 1e-10);
        assert.ok(after - before <= 0.65 + 1e-10);
      }
  // 原半径1.134米的幼年珊瑚鱼接触，现在允许1.30米轻微偏离，1.5米仍不成立。
  assert.ok(preyCaptureRadius(3, 0.8, true) > 1.3);
  assert.ok(preyCaptureRadius(3, 0.8, true) < 1.5);
  // 较小的容错不意味着体长资格改变。
  const player = createPlayer();
  assert.equal(canEat(player, 6.4), false);
});
test("非法体长不生成可用捕食半径", () => {
  for (const length of [0, -1, NaN, Infinity]) {
    assert.equal(preyCaptureRadius(length, 1), 0);
    assert.equal(preyCaptureRadius(3, length), 0);
  }
});

test("虎鲸和大王乌贼的幼年体长、捕食资格和浅滩口径完全对齐", () => {
  const orca = createPlayer("orca");
  const squid = createPlayer("squid");
  assert.equal(orca.length, 3);
  assert.equal(squid.length, orca.length);
  assert.equal(squid.mass, orca.mass);
  for (const preyLength of [0.18, 0.6, 0.8, 1.7, 2.9, 3, 6.4]) {
    assert.equal(canEat(squid, preyLength), canEat(orca, preyLength));
    assert.equal(canEat(squid, preyLength), preyLength < 3);
    for (const learning of [false, true])
      assert.equal(
        preyCaptureRadius(squid.length, preyLength, learning),
        preyCaptureRadius(orca.length, preyLength, learning),
      );
  }
  orca.buffs.frenzy = squid.buffs.frenzy = 30;
  for (const preyLength of [3, 4.5, 4.8, 5, 6.4])
    assert.equal(canEat(squid, preyLength), canEat(orca, preyLength));
});

test("冲刺与喷墨在低帧率下穿过小鱼时，两端都在口径外仍识别途中接触", () => {
  const radius = preyCaptureRadius(3, 0.18, true);
  const cases = [
    { speed: characterMovement("orca", true).sprintSpeed, side: 0.95 },
    { speed: characterMovement("squid", true).sprintSpeed, side: 1.04 },
    { speed: 72, side: 0 },
  ];
  const prey = point(0, 0, 0);
  for (const { speed, side } of cases) {
    const halfStep = (speed * 0.04) / 2;
    const start = point(side, 0, -halfStep);
    const end = point(side, 0, halfStep);
    assert.ok(Math.hypot(side, halfStep) > radius);
    assert.equal(sweptCaptureFraction(start, end, prey, prey, radius), 0.5);
  }
});

test("扫掠不放大口径，近旁掠过和恰好贴边仍不会被远距离吸入", () => {
  const prey = point(0, 0, 0);
  for (const side of [1, 1.000001, 1.2, 3])
    assert.equal(
      sweptCaptureFraction(
        point(side, 0, -2),
        point(side, 0, 2),
        prey,
        prey,
        1,
      ),
      null,
    );
  assert.equal(
    sweptCaptureFraction(
      point(0.999, 0, -2),
      point(0.999, 0, 2),
      prey,
      prey,
      1,
    ),
    0.5,
  );
});

test("按相对位移识别快速猎物对向穿越，路径交叉但不同时间到达不误捕", () => {
  assert.equal(
    sweptCaptureFraction(
      point(0, 0, -2),
      point(0, 0, 2),
      point(0, 0, 2),
      point(0, 0, -2),
      0.2,
    ),
    0.5,
  );
  // 两条几何路径都过原点，但玩家在半帧、猎物在四分之一帧到达。
  assert.equal(
    sweptCaptureFraction(
      point(-2, 0, 0),
      point(2, 0, 0),
      point(0, 0, -1),
      point(0, 0, 3),
      0.2,
    ),
    null,
  );
});

test("相对静止和零位移仍只在真实接触时命中，最近点限定在本帧内", () => {
  const origin = point(0, 0, 0);
  // 相对静止时每个时刻都等距，使用本帧末端作为稳定代表点。
  assert.equal(sweptCaptureFraction(origin, origin, origin, origin, 1), 1);
  assert.equal(
    sweptCaptureFraction(
      origin,
      point(0, 0, -2),
      point(0.5, 0, 0),
      point(0.5, 0, -2),
      1,
    ),
    1,
  );
  assert.equal(
    sweptCaptureFraction(origin, origin, point(2, 0, 0), point(2, 0, 0), 1),
    null,
  );
  assert.equal(
    sweptCaptureFraction(point(0.5, 0, 0), point(2, 0, 0), origin, origin, 1),
    0,
  );
  assert.equal(
    sweptCaptureFraction(point(2, 0, 0), point(0.5, 0, 0), origin, origin, 1),
    1,
  );
  assert.equal(
    sweptCaptureFraction(point(2, 0, 0), point(3, 0, 0), origin, origin, 1),
    null,
  );
});

test("扫掠拒绝非法半径或坐标，输入向量保持不变", () => {
  const vectors = [
    point(0, 0, -2),
    point(0, 0, 2),
    point(0, 0, 0),
    point(0, 0, 0),
  ];
  for (const radius of [0, -1, NaN, Infinity])
    assert.equal(sweptCaptureFraction(...vectors, radius), null);
  for (let index = 0; index < vectors.length; index++) {
    for (const invalid of [
      null,
      undefined,
      {},
      point(NaN, 0, 0),
      point(0, Infinity, 0),
    ]) {
      const args = [...vectors];
      args[index] = invalid;
      assert.equal(sweptCaptureFraction(...args, 1), null);
    }
  }
  const before = structuredClone(vectors);
  assert.equal(sweptCaptureFraction(...vectors, 1), 0.5);
  assert.deepEqual(vectors, before);
});

function point(x, y, z) {
  return { x, y, z };
}
