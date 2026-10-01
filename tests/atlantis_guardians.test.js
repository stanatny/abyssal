import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createEncounters, findBossContact } from "../src/encounters.js";
import { getExpedition } from "../src/expedition_config.js";
import { BOSS_BITE_HUNGER, BOSS_REQUIRED_HITS } from "../src/boss_rules.js";
import { consumePrey, createPlayer, tickVitals } from "../src/simulation.js";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { atlantisSeabedHeight as seabedHeight } from "../src/atlantis_terrain.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";
import { NURSERY, isNursery } from "../src/nursery_rules.js";
import { WORLD } from "../src/world_config.js";

// 只替换二维文字贴图，保留实际领主模型、接触判定和场景状态机。
const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (target, key) => target[key] ?? noop },
);
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
};
const atlantis = getExpedition("atlantis").region;
const hawaii = getExpedition("hawaii").region;
const forward = new THREE.Vector3(0, 0, -1);

function fixture(t, character = "orca") {
  const scene = new THREE.Scene();
  const events = { bites: 0, hits: 0, warnings: [] };
  const encounters = createEncounters(scene, {
    seabedHeight,
    audio: { eat: noop, hit: noop, bossAttack: noop },
    notify: (message) => events.warnings.push(message),
    onDamage: () => events.hits++,
    onBite: () => events.bites++,
  });
  t.after(() => encounters.dispose());
  const reset = (region = atlantis) =>
    encounters.reset(region.bossKinds, region.bossHomes, region.bossInstances);
  reset();
  const player = createPlayer(character);
  const position = new THREE.Vector3(...atlantis.spawn);
  let time = 0;
  const step = (dt = 1 / 60, heading = forward) => {
    time += dt;
    return encounters.update(dt, time, player, position, heading, {
      blockedBetween: () => false,
    });
  };
  return {
    scene,
    encounters,
    guardians: encounters.bosses.filter((entry) => entry.enabled),
    player,
    position,
    events,
    reset,
    step,
  };
}

test("三个固定克拉肯共用物种规则，但领地互不重叠且远离幼年区", (t) => {
  const f = fixture(t);
  assert.equal(f.guardians.length, 3);
  assert.equal(new Set(f.guardians.map((entry) => entry.id)).size, 3);
  assert.equal(new Set(f.guardians.map((entry) => entry.mesh)).size, 3);
  assert.equal(new Set(f.guardians.map((entry) => entry.state)).size, 3);
  assert.equal(new Set(f.guardians.map((entry) => entry.ring)).size, 3);
  assert.equal(new Set(f.guardians.map((entry) => entry.fx)).size, 3);
  assert.equal(
    new Set(f.guardians.map((entry) => entry.state.species)).size,
    1,
  );
  for (const [index, entry] of f.guardians.entries()) {
    assert.deepEqual(entry.home.toArray(), atlantis.bossInstances[index].home);
    assert.ok(-entry.home.y >= entry.state.species.depthMin);
    assert.ok(-entry.home.y <= entry.state.species.depthMax);
    // 32米包住真实48米克拉肯各姿态顶点，22米为现有追击超出领地的上限。
    assert.ok(entry.home.x - entry.radius - 22 - 32 >= WORLD.minX);
    assert.ok(entry.home.x + entry.radius + 22 + 32 <= WORLD.maxX);
    assert.ok(entry.home.z + entry.radius + 22 < NURSERY.minZ);
    assert.equal(isNursery(entry.home), false);
    for (const other of f.guardians.slice(index + 1))
      assert.ok(
        entry.home.distanceTo(other.home) > entry.radius + other.radius + 20,
      );
  }
  for (let i = 0; i < 600; i++) f.step();
  assert.equal(f.events.hits, 0);
  assert.ok(f.guardians.every((entry) => entry.state.phase === "dormant"));
});

test("每只守卫上方的真实城市战斗空间可容纳30米角色，巡游不钻入建筑", (t) => {
  const f = fixture(t);
  const city = createAtlantisCity(new THREE.Scene(), {
    heightAt: seabedHeight,
  });
  t.after(() => city.dispose());
  // 后城领地必须触及真实屋顶的接近水层，不能只在远离城市的空水域中安全悬停。
  const rear = f.guardians.find((entry) => entry.id === "atlantis_rear");
  const guardedRoofKinds = new Set(
    city.buildings
      .filter((building) => {
        const approach = new THREE.Vector3(
          building.x,
          building.y + building.height + 15,
          building.z,
        );
        return (
          approach.distanceTo(rear.home) < rear.radius &&
          !isPositionBlocked(approach, {
            colliders: city.colliders,
            radius: bodyRadius(30),
            length: 30,
            forward,
          })
        );
      })
      .map((building) => building.kind),
  );
  assert.ok(guardedRoofKinds.has("rotunda"));
  assert.ok(guardedRoofKinds.has("villa"));
  assert.ok(guardedRoofKinds.has("courtyard"));
  for (const entry of f.guardians) {
    for (const y of [-20, 0, 20]) {
      for (let x = -55; x <= 55; x += 11) {
        for (let z = -55; z <= 55; z += 11) {
          const point = entry.home.clone().add(new THREE.Vector3(x, y, z));
          assert.equal(
            isPositionBlocked(point, {
              colliders: city.colliders,
              radius: bodyRadius(30),
              length: 30,
              forward,
            }),
            false,
            `${entry.id} battle space ${point.toArray()}`,
          );
          assert.ok(point.y > seabedHeight(point.x, point.z) + bodyRadius(30));
        }
      }
    }
  }
  for (let i = 0; i < 90; i++) {
    f.step(1);
    for (const entry of f.guardians)
      assert.equal(
        isPositionBlocked(entry.mesh.position, {
          colliders: city.colliders,
          radius: bodyRadius(entry.state.species.length),
          length: entry.state.species.length,
          forward: entry.heading,
        }),
        false,
        `${entry.id} patrol`,
      );
  }
});

test("真实更新只唤醒所在领地守卫，越过空隙立即取消上一只的技能", (t) => {
  const f = fixture(t);
  for (const target of f.guardians) {
    f.reset();
    f.position
      .copy(target.home)
      .add(new THREE.Vector3(0, 0, -Math.min(75, target.radius - 10)));
    for (let i = 0; i < 200; i++) {
      f.step();
      f.player.health = 100;
      const engaged = f.guardians.filter((entry) =>
        ["hunt", "windup", "attack", "recover"].includes(entry.state.phase),
      );
      assert.deepEqual(
        engaged.map((entry) => entry.id),
        [target.id],
      );
      assert.ok(f.guardians.filter((entry) => entry.ring.visible).length <= 1);
    }
    assert.ok(target.state.attackCount > 0);
    const next = f.guardians.find((entry) => entry !== target);
    f.position
      .copy(target.home)
      .lerp(
        next.home,
        target.radius / target.home.distanceTo(next.home) + 0.02,
      );
    f.step();
    assert.equal(target.state.phase, "return");
    assert.equal(target.ring.visible, false);
    assert.ok(
      f.guardians.every(
        (entry) => !entry.ring.visible && !entry.fx.group.visible,
      ),
    );
    f.position.copy(next.home).add(new THREE.Vector3(0, 0, -65));
    f.step();
    assert.equal(next.state.phase, "hunt");
    assert.equal(target.state.phase, "return");
  }
});

test("向世界边缘追击时完整触腕仍在边界内，击败重生回到各自巢位", (t) => {
  const f = fixture(t);
  const bounds = new THREE.Box3();
  for (const target of f.guardians) {
    f.reset();
    const side = Math.sign(target.home.x) || 1;
    f.position
      .copy(target.home)
      .add(new THREE.Vector3(side * (target.radius - 1), 0, 0));
    for (let i = 0; i < 720; i++) {
      f.player.health = 100;
      f.step();
      if (i % 12 !== 0) continue;
      bounds.setFromObject(target.mesh);
      assert.ok(bounds.min.x >= WORLD.minX, `${target.id} left tentacles`);
      assert.ok(bounds.max.x <= WORLD.maxX, `${target.id} right tentacles`);
      assert.ok(bounds.min.z >= WORLD.minZ, `${target.id} rear tentacles`);
      assert.ok(bounds.max.z <= WORLD.maxZ, `${target.id} front tentacles`);
    }
    target.state.defeated = true;
    target.state.health = 0;
    f.position.fromArray(atlantis.spawn);
    f.step(400);
    assert.equal(target.state.defeated, true);
    assert.equal(target.state.health, 0);
    assert.equal(target.mesh.visible, false);
    assert.deepEqual(
      target.home.toArray(),
      atlantis.bossInstances.find((instance) => instance.id === target.id).home,
    );
  }
});

for (const character of ["orca", "squid"]) {
  test(`${character}对每只守卫独立执行25米门槛、三次侧咬与每口8点饱食`, (t) => {
    const f = fixture(t, character);
    const inward = new THREE.Vector3(-1, 0, 0);
    for (const target of f.guardians) {
      f.reset();
      Object.assign(f.player, {
        length: 24.9,
        mass: (24.9 / 6) ** 3,
        hunger: 40,
        biteCooldown: 0,
        bossesDefeated: 0,
        won: false,
      });
      target.state.phase = target.previousPhase = "recover";
      target.state.phaseDuration = 99;
      // 在真实网格侧翼找第一接触点；没有人为放大攻击判定。
      let contactX = null;
      for (let x = 40; x > 0; x -= 0.1) {
        const mouth = target.home.clone().add(new THREE.Vector3(x, 0, 6.3));
        if (findBossContact(target.mesh, mouth, 1.5)) {
          contactX = x;
          break;
        }
      }
      assert.notEqual(contactX, null);
      const attackPosition = target.home
        .clone()
        .add(new THREE.Vector3(contactX + 25 * 0.38, 0, 6.3));
      f.position.copy(attackPosition);
      f.step(1 / 60, inward);
      assert.equal(target.state.health, target.state.maxHealth);
      assert.equal(f.player.hunger, 40);
      f.player.length = 25;
      f.player.mass = (25 / 6) ** 3;
      let bites = 0;
      while (!target.state.defeated && bites < 8) {
        f.position.copy(attackPosition);
        f.player.hunger = 40;
        f.step(1 / 60, inward);
        assert.equal(target.lastBiteResult.hit, true);
        assert.equal(target.lastBiteResult.hungerRestored, BOSS_BITE_HUNGER);
        bites++;
        if (target.state.defeated) break;
        const health = target.state.health;
        f.step(1 / 60, inward);
        assert.equal(target.state.health, health);
        assert.equal(f.player.hunger, 48);
        f.position.x += 40;
        for (let i = 0; i < 90; i++) {
          tickVitals(f.player, 1 / 60);
          f.step(1 / 60, inward);
        }
      }
      assert.equal(bites, BOSS_REQUIRED_HITS);
      assert.equal(target.state.defeated, true);
      assert.equal(f.player.bossesDefeated, 1);
      assert.ok(
        f.guardians
          .filter((entry) => entry !== target)
          .every(
            (entry) =>
              entry.state.health === entry.state.maxHealth &&
              !entry.state.defeated,
          ),
      );
      const defeatedCount = f.player.bossesDefeated;
      f.step();
      assert.equal(f.player.bossesDefeated, defeatedCount);
      assert.equal(target.mesh.visible, false);
      f.player.length = 30;
      f.player.mass = 125;
      consumePrey(f.player, { length: 12, nutrition: 30, growth: 10 });
      assert.equal(f.player.won, true);
    }
  });
}

test("喷墨和冷却各归自己的实例，重开与切图复用网格且清除击败与技能状态", (t) => {
  const f = fixture(t);
  const [first, second, third] = f.guardians;
  f.position.copy(first.home).add(new THREE.Vector3(0, 0, -70));
  for (let i = 0; i < 80; i++) f.step();
  assert.equal(f.encounters.disorient(f.position, 90, 2, 10), 1);
  assert.equal(first.state.phase, "disoriented");
  assert.equal(second.state.phase, "dormant");
  assert.equal(third.state.phase, "dormant");
  const meshes = f.encounters.bosses.map((entry) => entry.mesh.uuid);
  const resources = () => {
    const nodes = new Set(),
      geometries = new Set(),
      materials = new Set();
    f.scene.traverse((node) => {
      nodes.add(node);
      if (node.geometry) geometries.add(node.geometry);
      if (node.material) materials.add(node.material);
    });
    return [nodes.size, geometries.size, materials.size];
  };
  const baseline = resources();
  for (let round = 0; round < 20; round++) {
    for (const entry of f.guardians) {
      entry.state.defeated = true;
      entry.state.health = 0;
      entry.state.biteCooldown = 3;
      entry.disorientedUntil = 100;
      entry.phaseHit = true;
      entry.ring.visible = entry.fx.group.visible = true;
    }
    f.reset(hawaii);
    const enabled = f.encounters.bosses.filter((entry) => entry.enabled);
    assert.equal(enabled.length, 2);
    assert.equal(
      new Set(enabled.map((entry) => entry.state.species.kind)).size,
      2,
    );
    assert.ok(enabled.every((entry) => entry.poolIndex === 0));
    f.reset();
    assert.deepEqual(
      f.encounters.bosses.map((entry) => entry.mesh.uuid),
      meshes,
    );
    assert.deepEqual(resources(), baseline);
    for (const entry of f.guardians) {
      assert.equal(entry.enabled, true);
      assert.equal(entry.state.defeated, false);
      assert.equal(entry.state.health, entry.state.maxHealth);
      assert.equal(entry.state.biteCooldown, 0);
      assert.equal(entry.disorientedUntil, 0);
      assert.equal(entry.persistentDefeat, true);
      assert.equal(entry.phaseHit, false);
      assert.equal(entry.ring.visible, false);
      assert.equal(entry.fx.group.visible, false);
      assert.deepEqual(entry.mesh.position.toArray(), entry.home.toArray());
    }
  }
  f.encounters.dispose();
  f.encounters.dispose();
  assert.equal(f.scene.children.length, 0);
});
