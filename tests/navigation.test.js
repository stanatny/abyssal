import assert from "node:assert/strict";
import test from "node:test";
import { WORLD } from "../src/world_config.js";
import { steerWithinHabitat } from "../src/navigation.js";

const SHARK = { length: 10, speed: 17, depthMin: 65, depthMax: 200 };
const LEVIATHAN = { length: 28, speed: 19, depthMin: 215, depthMax: 265 };
const FLAT_DEEP_SEA = () => -275;

// 模拟游戏循环的速度插值与位置边界，观察持续运动而非仅校验单帧方向。
function simulate(position, desired, species, seabed, seconds) {
  const point = { ...position };
  const velocity = { ...desired };
  let heading = { ...desired };
  const samples = [];
  let distance = 0;
  const dt = 1 / 60;
  for (let i = 0; i < seconds / dt; i += 1) {
    const direction = steerWithinHabitat(point, heading, species, seabed);
    heading = direction;
    const previous = { ...point };
    for (const axis of ["x", "y", "z"]) {
      velocity[axis] += (direction[axis] - velocity[axis]) * dt * 2;
      point[axis] += velocity[axis] * species.speed * dt;
    }
    point.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, point.x));
    point.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, point.z));
    distance += Math.hypot(
      point.x - previous.x,
      point.y - previous.y,
      point.z - previous.z,
    );
    if (i % 60 === 0) samples.push({ ...point });
  }
  return { point, distance, samples };
}

test("四个水平边缘均向场内回转，方向始终有限且为单位长度", () => {
  for (const [position, direction, axis, expectedSign] of [
    [{ x: WORLD.maxX + 7, y: -100, z: -180 }, { x: 1, y: 0, z: 0 }, "x", -1],
    [{ x: WORLD.minX - 7, y: -100, z: -180 }, { x: -1, y: 0, z: 0 }, "x", 1],
    [{ x: 0, y: -100, z: WORLD.maxZ + 7 }, { x: 0, y: 0, z: 1 }, "z", -1],
    [{ x: 0, y: -100, z: WORLD.minZ - 7 }, { x: 0, y: 0, z: -1 }, "z", 1],
  ]) {
    const turned = steerWithinHabitat(
      position,
      direction,
      SHARK,
      FLAT_DEEP_SEA,
    );
    assert.ok(turned[axis] * expectedSign > 0.9);
    assert.ok(Math.abs(Math.hypot(turned.x, turned.y, turned.z) - 1) < 1e-9);
  }
});

test("持续向地图边缘游动仍沿边界推进，不会逐帧旋转并困在原地", () => {
  const result = simulate(
    { x: WORLD.maxX - 10, y: -100, z: -350 },
    { x: 1, y: 0, z: 0 },
    SHARK,
    FLAT_DEEP_SEA,
    25,
  );
  assert.ok(result.distance > SHARK.speed * 25 * 0.65);
  assert.ok(
    Math.hypot(result.point.x - (WORLD.maxX - 10), result.point.z + 350) > 150,
  );
  assert.ok(result.samples.every((point) => point.x < WORLD.maxX));
});

test("深海巨兽预测到上坡便转向，在连续巡游中保留身体所需水深", () => {
  const slope = (x, z) => -40 + z * 0.5;
  const result = simulate(
    { x: 0, y: -230, z: -450 },
    { x: 0, y: 0, z: 1 },
    LEVIATHAN,
    slope,
    45,
  );
  const requiredDepth = LEVIATHAN.depthMin + LEVIATHAN.length * 0.28 + 2;
  assert.ok(
    result.samples.every((point) => slope(point.x, point.z) < -requiredDepth),
  );
  assert.ok(result.distance > 45 * LEVIATHAN.speed * 0.55);
});

test("已误入浅水的深海生物优先退向深水，左右海沟壁也能识别", () => {
  const upwardSlope = (x, z) => -40 + z * 0.5;
  const deepward = steerWithinHabitat(
    { x: 0, y: -175, z: -300 },
    { x: 0, y: 0, z: 1 },
    LEVIATHAN,
    upwardSlope,
  );
  assert.ok(deepward.z < -0.9);
  const trenchWall = (x, z) => -270 + x * 0.5;
  const centerward = steerWithinHabitat(
    { x: 100, y: -210, z: -400 },
    { x: 1, y: 0, z: 0 },
    LEVIATHAN,
    trenchWall,
  );
  assert.ok(centerward.x < -0.9);
});

test("安全水域保留原方向且不改变输入，垂直游动不会越过栖息深度", () => {
  const position = { x: 0, y: -100, z: -200 };
  const direction = { x: 0.6, y: 0, z: -0.8 };
  const original = structuredClone({ position, direction });
  const turned = steerWithinHabitat(position, direction, SHARK, FLAT_DEEP_SEA);
  assert.deepEqual(turned, direction);
  assert.deepEqual({ position, direction }, original);
  const rising = simulate(
    { x: 0, y: -80, z: -200 },
    { x: 0.5, y: 0.5, z: 0.5 },
    SHARK,
    FLAT_DEEP_SEA,
    10,
  );
  assert.ok(rising.point.y <= -SHARK.depthMin);
});
