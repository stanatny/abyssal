import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { findBossContact } from "../src/encounters.js";
import {
  BOSS_SPECIES,
  BOSS_BITE_HUNGER,
  BOSS_REQUIRED_HITS,
  createBossState,
  hitBoss,
  tickBoss,
  updateBossContact,
  isBossFlankContact,
} from "../src/boss_rules.js";
import {
  collectPickup,
  PLAYER_MOVEMENT,
  consumePrey,
  createPlayer,
  tickVitals,
} from "../src/simulation.js";
import { WORLD } from "../src/world_config.js";

const FLANK = { inRange: true, isFlank: true };
const CLOSE = { inTerritory: true, distance: 40, lineOfSight: true };

function grownPlayer(length = 30, characterId = "orca") {
  const player = createPlayer(characterId);
  player.length = length;
  player.mass = (length / 6) ** 3;
  return player;
}

test("四位主宰均大于玩家上限，技能不同且栖息区在世界之内", () => {
  assert.equal(
    BOSS_SPECIES.filter((s) => !s.alien && !s.freshwater && !s.mythic).length,
    4,
  );
  assert.equal(BOSS_SPECIES.length, 13);
  assert.equal(new Set(BOSS_SPECIES.map((s) => s.ability)).size, 6);
  for (const species of BOSS_SPECIES.filter((s) => !s.mythic)) {
    assert.equal(species.tier, 3);
    assert.ok(species.length > 30);
    assert.ok(species.depthMax <= (species.alien ? 900 : WORLD.maxDepth));
    assert.ok(species.depthMin < species.depthMax);
    assert.ok(species.speed > PLAYER_MOVEMENT.sprintSpeed);
    assert.ok(species.windupDuration >= 1.6 && species.windupDuration <= 2.5);
  }
});

test("只有领地内发现玩家才苏醒，接近前保持追猎", () => {
  const boss = createBossState(BOSS_SPECIES[0]);
  tickBoss(boss, 5, { ...CLOSE, inTerritory: false });
  assert.equal(boss.phase, "dormant");
  tickBoss(boss, 2, { ...CLOSE, lineOfSight: false });
  assert.equal(boss.phase, "dormant");
  tickBoss(boss, 2, { ...CLOSE, distance: 180 });
  assert.equal(boss.phase, "hunt");
  assert.equal(boss.timer, 0);
});

test("主宰完整经历蓄力预警、攻击和3秒恢复，再开始下一轮", () => {
  const boss = createBossState(BOSS_SPECIES[0]);
  tickBoss(boss, 1, CLOSE);
  assert.equal(boss.phase, "windup");
  tickBoss(boss, 2, CLOSE);
  assert.equal(boss.phase, "windup");
  tickBoss(boss, 0.1, CLOSE);
  assert.equal(boss.phase, "attack");
  assert.equal(boss.attackCount, 1);
  tickBoss(boss, boss.species.attackDuration, CLOSE);
  assert.equal(boss.phase, "recover");
  assert.equal(boss.phaseDuration, 3);
  tickBoss(boss, 2.9, CLOSE);
  assert.equal(boss.phase, "recover");
  tickBoss(boss, 0.1, CLOSE);
  assert.equal(boss.phase, "hunt");
});

test("离开领地或死亡会终止攻击，回巢后保留已造成的伤害", () => {
  const boss = createBossState(BOSS_SPECIES[0]);
  boss.health = 100;
  tickBoss(boss, 3.2, CLOSE);
  assert.equal(boss.phase, "attack");
  tickBoss(boss, 1, { ...CLOSE, inTerritory: false });
  assert.equal(boss.phase, "return");
  tickBoss(boss, 3, { ...CLOSE, inTerritory: false });
  assert.equal(boss.phase, "dormant");
  assert.equal(boss.health, 100);
  tickBoss(boss, 2, CLOSE);
  tickBoss(boss, 4, { ...CLOSE, playerAlive: false });
  assert.equal(boss.phase, "dormant");
});

test("四位领主始终要求真实25米，狂食不会降低门槛或允许直接吞噬", () => {
  for (const species of BOSS_SPECIES.filter((s) => !s.mythic)) {
    assert.equal(species.minAttackLength, 25);
    for (const frenzy of [false, true]) {
      const boss = createBossState(species);
      const player = grownPlayer(24);
      if (frenzy) collectPickup(player, "frenzy");
      assert.equal(hitBoss(player, boss, FLANK).reason, "too_small");
      player.length = 24.999;
      assert.equal(hitBoss(player, boss, FLANK).reason, "too_small");
      player.length = 25;
      player.mass = (25 / 6) ** 3;
      assert.equal(hitBoss(player, boss, FLANK).hit, true);
    }
  }
  const full = grownPlayer(30);
  collectPickup(full, "frenzy");
  const before = structuredClone(full);
  assert.equal(consumePrey(full, BOSS_SPECIES[0]), false);
  assert.deepEqual(full, before);
});

test("咬击检查距离，冷却为玩家全局1.2秒，不能交替主宰绕过", () => {
  const player = grownPlayer();
  const first = createBossState(BOSS_SPECIES[0]);
  const second = createBossState(BOSS_SPECIES[1]);
  assert.equal(
    hitBoss(player, first, { inRange: false }).reason,
    "out_of_range",
  );
  assert.equal(hitBoss(player, first, FLANK).hit, true);
  assert.equal(hitBoss(player, first, FLANK).reason, "cooldown");
  assert.equal(hitBoss(player, second, FLANK).reason, "cooldown");
  tickVitals(player, 1.21);
  tickBoss(first, 1.21, CLOSE);
  assert.equal(hitBoss(player, first, FLANK).reason, "must_disengage");
  updateBossContact(first, false, 0.35);
  assert.equal(hitBoss(player, first, FLANK).hit, true);
});

test("两种角色每次有效咬伤领主最多补8点饱食，不提前治疗或成长", () => {
  assert.equal(BOSS_BITE_HUNGER, 8);
  for (const characterId of ["orca", "squid"]) {
    for (const phase of ["hunt", "recover"]) {
      for (const hunger of [0, 37, 96, 100]) {
        const player = grownPlayer(25, characterId);
        player.health = 35;
        player.stamina = 18;
        player.hunger = hunger;
        const before = structuredClone(player);
        const boss = createBossState(BOSS_SPECIES[0]);
        boss.phase = phase;
        const result = hitBoss(player, boss, FLANK);
        assert.equal(result.hit, true);
        assert.ok(result.damage > 0);
        assert.equal(result.defeated, false);
        assert.equal(result.hungerRestored, Math.min(8, 100 - hunger));
        assert.equal(player.hunger, Math.min(100, hunger + 8));
        for (const field of [
          "health",
          "stamina",
          "mass",
          "length",
          "eaten",
          "bossesDefeated",
          "lastMeal",
        ]) {
          assert.deepEqual(player[field], before[field], field);
        }
      }
    }
  }
});

test("体型、角度、距离、冷却、未脱离或终态拒绝的攻击完全不补饱食", () => {
  const cases = [
    ["too_small", (player) => (player.length = 24), FLANK],
    ["out_of_range", () => {}, { ...FLANK, inRange: false }],
    ["armored_angle", () => {}, { ...FLANK, isFlank: false }],
    ["cooldown", (player) => (player.biteCooldown = 1), FLANK],
    ["cooldown", (_, boss) => (boss.biteCooldown = 1), FLANK],
    ["must_disengage", (_, boss) => (boss.contactArmed = false), FLANK],
    ["boss_defeated", (_, boss) => (boss.defeated = true), FLANK],
    ...["dead", "won", "timedOut"].map((status) => [
      "player_unavailable",
      (player) => (player[status] = true),
      FLANK,
    ]),
  ];
  for (const characterId of ["orca", "squid"]) {
    for (const [reason, prepare, options] of cases) {
      const player = grownPlayer(25, characterId);
      player.hunger = 30;
      const boss = createBossState(BOSS_SPECIES[0]);
      prepare(player, boss);
      const beforePlayer = structuredClone(player);
      const beforeBoss = structuredClone(boss);
      const result = hitBoss(player, boss, options);
      assert.equal(result.hit, false);
      assert.equal(result.reason, reason);
      assert.equal(result.hungerRestored, 0);
      assert.deepEqual(player, beforePlayer);
      assert.deepEqual(boss, beforeBoss);
    }
  }
});

test("领主最后一口先补饱食，再单次结算击败战利品，返回值不混入战利品", () => {
  for (const characterId of ["orca", "squid"]) {
    const player = grownPlayer(25, characterId);
    player.health = 20;
    player.hunger = 10;
    const mass = player.mass;
    const boss = createBossState(BOSS_SPECIES[0]);
    boss.validatedHits = BOSS_REQUIRED_HITS - 1;
    boss.health = 1;
    const result = hitBoss(player, boss, FLANK);
    assert.equal(result.hit, true);
    assert.equal(result.damage, 1);
    assert.equal(result.defeated, true);
    assert.equal(result.hungerRestored, 8);
    assert.equal(player.hunger, 100);
    assert.equal(player.health, 100);
    assert.equal(player.bossesDefeated, 1);
    assert.equal(player.lastMeal.nutrition, 82);
    assert.equal(player.lastMeal.healed, 80);
    assert.ok(Math.abs(player.mass - mass - boss.species.growth * 0.3) < 1e-8);
    const settled = structuredClone(player);
    const repeated = hitBoss(player, boss, FLANK);
    assert.equal(repeated.hungerRestored, 0);
    assert.equal(repeated.reason, "boss_defeated");
    assert.deepEqual(player, settled);
  }
});

test("嘴部接触按实际旋转缩放的表面判定，鳍片两面均可触及", () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  mesh.scale.set(3, 2, 5);
  mesh.rotation.set(0.35, 0.6, -0.2);
  mesh.position.set(20, -40, 8);
  mesh.updateMatrixWorld(true);
  const normal = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh.quaternion);
  const surface = mesh.localToWorld(new THREE.Vector3(1, 0, 0));
  assert.ok(
    findBossContact(mesh, surface.clone().addScaledVector(normal, 0.4), 0.5),
  );
  assert.equal(
    findBossContact(mesh, surface.clone().addScaledVector(normal, 0.6), 0.5),
    null,
  );

  const fin = new THREE.Mesh(new THREE.PlaneGeometry(4, 4));
  assert.ok(findBossContact(fin, new THREE.Vector3(0, 0, 0.1), 0.2));
  assert.ok(findBossContact(fin, new THREE.Vector3(0, 0, -0.1), 0.2));
  assert.equal(findBossContact(fin, new THREE.Vector3(0, 0, -2), 0.2), null);
});

test("进入闭合躯干后仍算接触，但克拉肯触腕和海德拉三颈之间不误判", () => {
  const kraken = createCreature("kraken", 42);
  assert.ok(findBossContact(kraken, new THREE.Vector3(0, 0, 6.3), 0.4));
  assert.equal(
    findBossContact(kraken, new THREE.Vector3(0, 0, -12.6), 0.4),
    null,
  );
  const hydra = createCreature("hydra", 46);
  assert.ok(findBossContact(hydra, new THREE.Vector3(0, 0, 6.9), 0.4));
  assert.equal(
    findBossContact(hydra, new THREE.Vector3(5.52, 11.04, -11.5), 0.4),
    null,
  );
  // 动画带动子网格后，检测主动更新矩阵而不依赖渲染器下一帧刷新。
  const moving = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 8));
  moving.add(head);
  moving.updateMatrixWorld(true);
  head.position.x = 20;
  assert.ok(findBossContact(moving, new THREE.Vector3(20, 0, 0), 0.3));
  assert.equal(findBossContact(moving, new THREE.Vector3(0, 0, 0), 0.3), null);
});

test("死亡、胜利或到时后即使保持接触也不伤害领主或领取奖励", () => {
  for (const status of ["dead", "won", "timedOut"]) {
    const player = grownPlayer();
    player[status] = true;
    const boss = createBossState(BOSS_SPECIES[0]);
    boss.health = 1;
    const beforePlayer = structuredClone(player);
    const beforeBoss = structuredClone(boss);
    assert.equal(hitBoss(player, boss, FLANK).reason, "player_unavailable");
    assert.deepEqual(player, beforePlayer);
    assert.deepEqual(boss, beforeBoss);
  }
});

test("两角色在25至30米，领主保留阶段护甲与三次独立有效侧咬", () => {
  assert.equal(BOSS_REQUIRED_HITS, 3);
  for (const species of BOSS_SPECIES)
    for (const characterId of ["orca", "squid"])
      for (const length of [25, 27.5, 30])
        for (const frenzy of [false, true])
          for (const phase of [
            "dormant",
            "hunt",
            "windup",
            "attack",
            "recover",
            "return",
            "disoriented",
          ]) {
            const player = grownPlayer(length, characterId);
            if (frenzy) collectPickup(player, "frenzy");
            const boss = createBossState(species);
            assert.equal(boss.validatedHits, 0);
            const guarded = species.guardedPhases?.includes(phase);
            if (guarded) {
              boss.phase = phase;
              assert.equal(
                hitBoss(player, boss, FLANK).reason,
                "shell_guarded",
              );
              assert.equal(boss.validatedHits, 0);
              assert.equal(boss.health, species.health);
            }
            for (let hits = 1; hits <= BOSS_REQUIRED_HITS; hits += 1) {
              boss.phase = guarded ? "recover" : phase;
              const result = hitBoss(player, boss, FLANK);
              assert.equal(result.hit, true);
              assert.equal(boss.validatedHits, hits);
              assert.ok(Math.abs(result.damage - species.health / 3) < 1e-9);
              assert.equal(result.defeated, hits === BOSS_REQUIRED_HITS);
              assert.equal(boss.defeated, hits === BOSS_REQUIRED_HITS);
              if (hits < BOSS_REQUIRED_HITS) {
                assert.ok(boss.health > 0);
                assert.equal(player.bossesDefeated, 0);
                tickVitals(player, 1.21);
                tickBoss(boss, 1.21, CLOSE);
                updateBossContact(boss, false, 0.35);
              }
            }
            assert.equal(boss.health, 0);
            assert.equal(boss.phase, "defeated");
            assert.equal(player.bossesDefeated, 1);
            assert.equal(player.won, player.length >= 30);
          }
});

test("奇数或非整数生命值第三口直接归零，恢复期不增加伤害", () => {
  for (const health of [101, 101.1, 1 / 7]) {
    const species = { ...BOSS_SPECIES[0], health };
    const player = grownPlayer(25);
    const boss = createBossState(species);
    let totalDamage = 0;
    for (const phase of ["hunt", "recover", "attack"]) {
      boss.phase = phase;
      const result = hitBoss(player, boss, FLANK);
      assert.equal(result.hit, true);
      totalDamage += result.damage;
      assert.ok(Math.abs(result.damage - health / 3) < 1e-9);
      if (!boss.defeated) {
        tickVitals(player, 1.21);
        tickBoss(boss, 1.21, CLOSE);
        updateBossContact(boss, false, 0.35);
      }
    }
    assert.equal(boss.validatedHits, 3);
    assert.equal(boss.health, 0);
    assert.equal(boss.defeated, true);
    assert.ok(Math.abs(totalDamage - health) < 1e-9);
  }
});

test("击败奖励只结算一次，25米先击败主宰后还需继续成长", () => {
  const player = grownPlayer(25);
  player.health = 20;
  player.hunger = 10;
  const boss = createBossState(BOSS_SPECIES[0]);
  while (!boss.defeated) {
    boss.phase = "recover";
    assert.equal(hitBoss(player, boss, FLANK).hit, true);
    if (boss.defeated) break;
    tickVitals(player, 1.21);
    tickBoss(boss, 1.21, CLOSE);
    updateBossContact(boss, false, 0.35);
  }
  assert.equal(player.bossesDefeated, 1);
  assert.ok(player.health > 90);
  assert.ok(player.lastMeal.healed > 70);
  assert.ok(player.length < 30);
  assert.equal(player.won, false);
  const before = structuredClone(player);
  assert.equal(hitBoss(player, boss, FLANK).reason, "boss_defeated");
  assert.deepEqual(player, before);
  assert.equal(boss.phase, "defeated");
});

test("从领地较远处即可发招，预警末段留有明确锁定和规避时间", () => {
  for (const species of BOSS_SPECIES.filter((s) => !s.mythic)) {
    const boss = createBossState(species);
    tickBoss(boss, 1, { ...CLOSE, distance: 105 });
    assert.equal(boss.phase, "windup");
    assert.ok(species.lockWindow >= 0.6);
    assert.ok(species.engageRange >= (species.freshwater ? 105 : 130));
    assert.ok(species.windupDuration > species.lockWindow);
  }
});

test("左右侧翼朝内攻击有效，头尾背部和反向贴靠都无效", () => {
  const context = {
    bossPosition: new THREE.Vector3(),
    bossForward: new THREE.Vector3(0, 0, -1),
  };
  for (const x of [-12, 12]) {
    assert.equal(
      isBossFlankContact({
        ...context,
        playerPosition: new THREE.Vector3(x, 0, 0),
        playerForward: new THREE.Vector3(-Math.sign(x), 0, 0),
      }),
      true,
    );
  }
  for (const position of [
    new THREE.Vector3(0, 0, -20),
    new THREE.Vector3(0, 0, 20),
    new THREE.Vector3(0, 20, 0),
  ]) {
    assert.equal(
      isBossFlankContact({
        ...context,
        playerPosition: position,
        playerForward: position.clone().normalize().negate(),
      }),
      false,
    );
  }
  assert.equal(
    isBossFlankContact({
      ...context,
      playerPosition: new THREE.Vector3(12, 0, 0),
      playerForward: new THREE.Vector3(1, 0, 0),
    }),
    false,
  );
  const player = grownPlayer();
  const boss = createBossState(BOSS_SPECIES[0]);
  assert.equal(hitBoss(player, boss).reason, "out_of_range");
  assert.equal(
    hitBoss(player, boss, { inRange: true }).reason,
    "armored_angle",
  );
  assert.equal(boss.health, boss.maxHealth);
});

test("持续贴住不连咬，脱离0.35秒且冷却完成才会重新武装", () => {
  for (const characterId of ["orca", "squid"]) {
    const player = grownPlayer(25, characterId);
    player.hunger = 30;
    const boss = createBossState(BOSS_SPECIES[0]);
    assert.equal(hitBoss(player, boss, FLANK).hit, true);
    assert.equal(player.hunger, 38);
    const health = boss.health;
    for (let i = 0; i < 10; i += 1) {
      tickVitals(player, 0.5);
      tickBoss(boss, 0.5, CLOSE);
      updateBossContact(boss, true, 0.5);
      const hunger = player.hunger;
      const result = hitBoss(player, boss, FLANK);
      assert.equal(result.hit, false);
      assert.equal(result.hungerRestored, 0);
      assert.equal(player.hunger, hunger);
    }
    assert.equal(boss.health, health);
    updateBossContact(boss, false, 0.2);
    assert.equal(hitBoss(player, boss, FLANK).reason, "must_disengage");
    updateBossContact(boss, true, 0.01);
    updateBossContact(boss, false, 0.2);
    assert.equal(boss.contactArmed, false);
    updateBossContact(boss, false, 0.15);
    const hunger = player.hunger;
    const result = hitBoss(player, boss, FLANK);
    assert.equal(result.hit, true);
    assert.equal(result.hungerRestored, 8);
    assert.equal(player.hunger, hunger + 8);
  }
});

test("喷墨打断前摇且迷失期间不施法，恢复时重新给出完整前摇", () => {
  const boss = createBossState(BOSS_SPECIES[2]);
  tickBoss(boss, 2, CLOSE);
  assert.equal(boss.phase, "windup");
  tickBoss(boss, 9.9, { ...CLOSE, disoriented: true });
  assert.equal(boss.phase, "disoriented");
  assert.equal(boss.attackCount, 0);
  tickBoss(boss, 0.1, CLOSE);
  assert.equal(boss.phase, "hunt");
  tickBoss(boss, 0.9, CLOSE);
  assert.equal(boss.phase, "windup");
  assert.ok(boss.timer < 0.01);
});

test("领主垂直转身时仍按模型真实左右侧判定，不产生无法攻击的角度", () => {
  const quaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2,
  );
  assert.equal(
    isBossFlankContact({
      bossPosition: new THREE.Vector3(),
      bossForward: new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion),
      bossRight: new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion),
      playerPosition: new THREE.Vector3(20, 0, 0),
      playerForward: new THREE.Vector3(-1, 0, 0),
    }),
    true,
  );
});
