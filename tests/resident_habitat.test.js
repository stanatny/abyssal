import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  steerResidentHabitat,
} from "../src/ecosystem_population.js";

const residents = getRegionSpecies("atlantis").filter(
  (species) => species.residentRadius > 0,
);
// 未注册到任何已发布地图的未来物种，证明逻辑只依赖栖息配置。
const futureResident = Object.freeze({
  kind: "future_reef_resident",
  population: 3,
  length: 0.4,
  speed: 1.2,
  schoolSize: 1,
  depthMin: 8,
  depthMax: 35,
  residentRadius: 9,
  spawnAnchors: Object.freeze([
    Object.freeze([90, -20, -90]),
    Object.freeze([120, -24, -125]),
    Object.freeze([160, -28, -160]),
  ]),
});
const profiles = [...residents, futureResident];
const heightAt = () => -60;

test("散居居民保持真实尺寸和独立个体，近前方水层可找到两种居民", () => {
  assert.deepEqual(
    residents.map((s) => s.kind),
    ["seahorse", "cuttlefish"],
  );
  for (const s of residents) {
    assert.equal(s.population, 8);
    assert.equal(s.schoolSize, 1);
    assert.equal(s.length, s.kind === "seahorse" ? 0.15 : 0.5);
    const nearRoute = s.spawnAnchors.filter(
      ([x, y, z]) =>
        Math.abs(x) <= 7 && Math.abs(y + 18) <= 3 && z < 70 && z > 25,
    );
    assert.ok(nearRoute.length >= 2, s.kind);
  }
  assert.equal(
    getRegionSpecies("hawaii").some((s) => s.residentRadius),
    false,
  );
});

test("散居居民复活回原栖息地，玩家在浅滩或深海都不会把居民搬走", () => {
  for (const s of profiles) {
    for (let i = 0; i < s.population; i++) {
      const anchor = initialSpeciesAnchor(s, i);
      for (const playerPosition of [
        new THREE.Vector3(0, -18, 75),
        new THREE.Vector3(0, -400, -700),
      ]) {
        const point = habitatPosition(s, {
          heightAt,
          near: true,
          playerPosition,
          populationIndex: i,
          random: () => 0.5,
        });
        assert.ok(point.distanceTo(anchor) < 1e-8, `${s.kind} ${i}`);
      }
    }
  }
});

test("被遮挡居民的合法复活搜索不会跳到活动区之外", () => {
  for (const s of profiles) {
    const anchor = initialSpeciesAnchor(s, 0);
    const blocker = {
      type: "box",
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      halfSize: { x: 0.7, y: 3, z: 0.7 },
    };
    const point = habitatPosition(s, { heightAt, colliders: [blocker] });
    assert.ok(point);
    assert.ok(point.distanceTo(anchor) > 1);
    assert.ok(point.distanceTo(anchor) <= s.residentRadius);
    const impossible = { ...blocker, halfSize: { x: 30, y: 30, z: 30 } };
    assert.equal(
      habitatPosition(s, { heightAt, colliders: [impossible] }),
      null,
    );
  }
});

test("散居居民可近身逃逸，但接近活动区边缘会回转", () => {
  const away = { x: 1, y: 0, z: 0 };
  for (const s of profiles) {
    const origin = initialSpeciesAnchor(s, 0);
    assert.equal(steerResidentHabitat(s, 0, origin, away), away);
    const edge = origin.clone().add(new THREE.Vector3(s.residentRadius, 0, 0));
    const turned = steerResidentHabitat(s, 0, edge, away);
    assert.ok(turned.x < -0.99, s.kind);
    assert.deepEqual(away, { x: 1, y: 0, z: 0 });
  }
  const normal = getRegionSpecies("hawaii")[0];
  assert.equal(
    steerResidentHabitat(normal, 0, { x: 200, y: -20, z: 0 }, away),
    away,
  );
});

test("连续巡游和惯性更新保持居民在各自活动区附近，不累积漂移", () => {
  for (const s of profiles) {
    for (const phase of [0, 1, 2, 3]) {
      const origin = initialSpeciesAnchor(s, phase);
      const position = origin.clone();
      const velocity = new THREE.Vector3();
      let maximum = 0;
      for (let step = 0; step < 3600; step++) {
        const t = step / 30;
        const direction = steerResidentHabitat(s, phase, position, {
          x: Math.sin(t * 0.15 + phase),
          y: Math.sin(t * 0.32) * 0.08,
          z: Math.cos(t * 0.15 + phase),
        });
        velocity.lerp(
          new THREE.Vector3(direction.x, direction.y, direction.z),
          2 / 30,
        );
        position.addScaledVector(velocity, s.speed / 30);
        maximum = Math.max(maximum, position.distanceTo(origin));
      }
      assert.ok(maximum < s.residentRadius * 1.12, `${s.kind}: ${maximum}`);
    }
  }
});

test("地形或边界校正不能把未来居民推出独立活动区", () => {
  for (const s of profiles) {
    const anchor = initialSpeciesAnchor(s, 0);
    const margin = Math.max(
      3 + s.length * 0.35,
      Math.max(0.45, s.length * (s.cityHabitat ? 0.55 : 0.18)) + 1.5,
    );
    const raisedFloor = () => anchor.y + s.residentRadius + 0.5 - margin;
    assert.equal(habitatPosition(s, { heightAt: raisedFloor }), null, s.kind);
    const outside = { ...s, spawnAnchors: [[900, anchor.y, anchor.z]] };
    assert.equal(habitatPosition(outside, { heightAt }), null, s.kind);
    const legal = habitatPosition(s, { heightAt: () => anchor.y + 1 - margin });
    assert.ok(legal && legal.distanceTo(anchor) <= s.residentRadius, s.kind);
  }
});
