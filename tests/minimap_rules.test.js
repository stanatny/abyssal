import assert from "node:assert/strict";
import test from "node:test";
import { WORLD } from "../src/world_config.js";
import {
  getMinimapState,
  projectMinimapPosition,
} from "../src/minimap_rules.js";

const SPAWN = { x: 0, y: -18, z: 75 };
const NORTH = { x: 0, y: 0, z: -1 };

test("世界四角在实际边界内，越界投影钳制且两个方向采用同一米制", () => {
  const nw = projectMinimapPosition({ x: WORLD.minX, z: WORLD.minZ });
  const se = projectMinimapPosition({ x: WORLD.maxX, z: WORLD.maxZ });
  assert.equal(nw.y, 9);
  assert.equal(se.y, 91);
  assert.ok(nw.x > 9 && se.x < 91);
  assert.deepEqual(projectMinimapPosition({ x: -1e6, z: -1e6 }), nw);
  assert.deepEqual(projectMinimapPosition({ x: 1e6, z: 1e6 }), se);
  const center = projectMinimapPosition({ x: 0, z: -500 });
  const east = projectMinimapPosition({ x: 100, z: -500 });
  const south = projectMinimapPosition({ x: 0, z: -400 });
  assert.ok(Math.abs(east.x - center.x - (south.y - center.y)) < 1e-10);
});

test("固定北向的八方朝向不会反转，返航相对方位随游向旋转", () => {
  for (const [x, z, expected] of [
    [0, -1, 0],
    [1, -1, 45],
    [1, 0, 90],
    [1, 1, 135],
    [0, 1, 180],
    [-1, 1, 225],
    [-1, 0, 270],
    [-1, -1, 315],
  ]) {
    const state = getMinimapState({
      position: { x: 0, y: -18, z: 0 },
      spawn: SPAWN,
      forward: { x, y: 0, z },
    });
    assert.ok(Math.abs((state.heading * 180) / Math.PI - expected) < 1e-9);
    assert.equal(state.bearing, Math.PI);
  }
  const ahead = getMinimapState({
    position: { x: 0, y: -18, z: 0 },
    spawn: SPAWN,
    forward: { x: 0, y: 0, z: 1 },
  });
  const behind = getMinimapState({
    position: { x: 0, y: -18, z: 0 },
    spawn: SPAWN,
    forward: NORTH,
  });
  assert.equal(ahead.relativeBearing, 0);
  assert.equal(behind.relativeBearing, Math.PI);
  assert.match(behind.homeLabel, /浅滩 ↓ 300m/);
});

test("出生点在正上方或下方时不伪造水平航向，显示实际升降米数", () => {
  const below = getMinimapState({
    position: { ...SPAWN, y: -200 },
    spawn: SPAWN,
    forward: NORTH,
  });
  assert.equal(below.bearing, null);
  assert.equal(below.relativeBearing, null);
  assert.equal(below.ascent, (200 - 18) * WORLD.displayDepthScale);
  assert.equal(below.homeLabel, "浅滩正上方");
  assert.equal(below.depthLabel, "上浮 728m");
  const above = getMinimapState({
    position: { ...SPAWN, y: 2 },
    spawn: SPAWN,
    forward: NORTH,
  });
  assert.equal(above.homeLabel, "浅滩正下方");
  assert.equal(above.depthLabel, "下潜 80m");
  assert.equal(above.depth, 0);
});

test("正下潜时保留上一水平航向，数组出生点和对象出生点结果一致", () => {
  const context = {
    position: { x: 100, y: -600, z: -1000 },
    forward: { x: 0, y: -1, z: 0 },
    fallbackHeading: Math.PI / 2,
  };
  const state = getMinimapState({ ...context, spawn: SPAWN });
  assert.equal(state.heading, Math.PI / 2);
  assert.deepEqual(state, getMinimapState({ ...context, spawn: [0, -18, 75] }));
  assert.equal(state.elevation, "above");
  assert.match(state.homeLabel, /浅滩 ↓ 4.3km/);
  assert.equal(state.depthLabel, "上浮 2328m");
});

test("离出生点很近时提示浅滩附近，无效坐标也不会产生NaN", () => {
  const nearby = getMinimapState({
    position: { ...SPAWN, x: 2 },
    spawn: SPAWN,
    forward: NORTH,
  });
  assert.equal(nearby.homeLabel, "浅滩附近");
  assert.equal(nearby.depthLabel, "水深 72m");
  const invalid = getMinimapState({
    position: null,
    spawn: null,
    forward: { x: NaN, z: Infinity },
  });
  assert.equal(invalid.heading, 0);
  assert.ok(
    Number.isFinite(invalid.player.x) && Number.isFinite(invalid.player.y),
  );
  assert.equal(invalid.ascent, 0);
});
