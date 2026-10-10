import { LORD_RECOVERY, recoveryGuardStatus } from "../src/lord_recovery.js";
import { finishNextBossAttack } from "./helpers/boss_cycle.js";
import { groundTerrainPose } from "../src/ground_navigation.js";
import { t } from "../src/i18n.js";
import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createEncounters, findBossContact } from "../src/encounters.js";
import { BOSS_SPECIES, createBossState } from "../src/boss_rules.js";
import { createPlayer, tickVitals } from "../src/simulation.js";

// 场景逻辑测试仅替换二维贴图绘制，不替换三维网格、状态机、弹体或接触判定。
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

function fixture(kind, floor = -900) {
  const scene = new THREE.Scene();
  const events = { hits: 0, bites: 0, warnings: [] };
  const encounters = createEncounters(scene, {
    seabedHeight: () => floor,
    audio: { hit: noop, eat: noop, bossAttack: noop },
    notify: (message) => events.warnings.push(t(message)),
    onDamage: () => {
      events.hits++;
      events.lastHitTime = time;
      events.lastHitHealth = player.health;
    },
    onBite: () => events.bites++,
  });
  const entry = encounters.bosses.find(
    (boss) => boss.state.species.kind === kind,
  );
  for (const boss of encounters.bosses) boss.enabled = boss === entry;
  entry.state = createBossState(entry.state.species);
  entry.previousPhase = "dormant";
  entry.home.set(0, -400, 0);
  entry.mesh.position.copy(entry.home);
  entry.heading.set(0, 0, -1);
  entry.mesh.quaternion.identity();
  entry.disorientedUntil = 0;
  const player = createPlayer();
  const position = new THREE.Vector3(0, -400, -95);
  const forward = new THREE.Vector3(0, 0, -1);
  let time = 0;
  const step = (dt = 1 / 60, blockedBetween = () => false) => {
    time += dt;
    tickVitals(player, dt);
    return encounters.update(dt, time, player, position, forward, {
      blockedBetween,
    });
  };
  return {
    scene,
    encounters,
    entry,
    player,
    position,
    forward,
    events,
    step,
    get time() {
      return time;
    },
  };
}

test("Restart clears an old Kraken grip even when that pooled lord is not selected", () => {
  const f = fixture("kraken");
  f.entry.grapple.held = true;
  f.entry.grapple.timer = 1;
  f.entry.mesh.userData.setKrakenGrip(1);
  f.entry.mesh.userData.animate(0, 1);
  f.entry.mesh.userData.animate(1, 1);
  f.encounters.reset(["hydra"]);
  assert.equal(f.entry.enabled, false);
  assert.deepEqual(f.entry.grapple, {
    exposure: 0,
    held: false,
    timer: 0,
    spent: false,
  });
  assert.equal(f.entry.mesh.getObjectByName("kraken_toothed_maw").scale.x, 1);
  assert.ok(f.entry.fxVariants.every((fx) => !fx.group.visible));
  f.encounters.dispose();
});

test("默认夏威夷首页初始名单不包含独立地图的领主，首次出发沿用名单仍安全", (t) => {
  // 反向抽签优先取物种池末尾，确保新增的独立地图领主不会只因随机运气漏检。
  const random = Math.random;
  let encounters;
  try {
    Math.random = () => 0;
    encounters = createEncounters(new THREE.Scene(), {
      seabedHeight: () => -900,
      audio: { hit: noop, eat: noop, bossAttack: noop },
      notify: noop,
      onDamage: noop,
      onBite: noop,
    });
  } finally {
    Math.random = random;
  }
  t.after(() => encounters.dispose());
  const enabled = encounters.bosses.filter((b) => b.enabled);
  assert.equal(enabled.length, 2);
  for (const b of enabled) {
    assert.ok(
      ["kraken", "mayan", "hydra", "leviathan"].includes(b.state.species.kind),
    );
    assert.ok(
      !b.state.species.alien &&
        !b.state.species.freshwater &&
        !b.state.species.mythic,
    );
  }
});

test("海德拉吐息从当前摆动吻端发射，三次射击保留原间隔", () => {
  const f = fixture("hydra");
  f.entry.mesh.rotation.set(0.12, 0.35, 0.08);
  f.entry.mesh.userData.animate(0, 0.7);
  f.entry.state.phase = "attack";
  f.entry.previousPhase = "attack";
  f.entry.state.timer = 0;
  f.entry.volleyShots = 0;
  f.entry.lockTarget.copy(f.position);
  for (const [index, timer] of [
    [0, 0],
    [1, 0.45],
    [2, 0.9],
  ]) {
    const expected = f.entry.mesh.userData.mouthAnchors[index].getWorldPosition(
      new THREE.Vector3(),
    );
    f.entry.state.timer = timer;
    f.encounters.update(0, timer, f.player, f.position, f.forward, {
      blockedBetween: () => false,
    });
    const projectiles = f.scene.children.filter(
      (part) => part.name === "hydra_breath_projectile",
    );
    assert.equal(projectiles.length, index + 1);
    assert.ok(projectiles.at(-1).position.distanceTo(expected) < 1e-6);
  }
});

for (const kind of ["kraken", "mayan", "hydra", "leviathan"]) {
  test(`${kind} 进入领地后的首轮技能可以命中停留玩家，锁定后变向能够躲开`, () => {
    const standing = fixture(kind);
    while (standing.time < (kind === "kraken" ? 9 : 6) && !standing.events.hits)
      standing.step();
    assert.ok(standing.entry.state.attackCount > 0);
    assert.ok(
      standing.events.hits > 0,
      `${kind} did not hit a stationary target`,
    );
    assert.ok(standing.player.health < 100);
    assert.ok(
      standing.events.warnings.some((message) => message.includes("·")),
    );

    const dodging = fixture(kind);
    let evading = false;
    while (dodging.time < (kind === "kraken" ? 9 : 6)) {
      const state = dodging.entry.state;
      if (
        state.phase === "windup" &&
        state.timer >= state.phaseDuration - state.species.lockWindow
      )
        evading = true;
      if (evading) {
        if (kind === "mayan") dodging.position.y += 32 / 60;
        else dodging.position.x += 32 / 60;
      }
      dodging.step();
    }
    assert.equal(
      dodging.events.hits,
      0,
      `${kind} hit a target evading after lock`,
    );
    assert.equal(dodging.player.health, 100);
  });
}

test("已发招领主可被喷墨打断且停止移动整整10秒，离开后不会立刻重新追杀", () => {
  const f = fixture("hydra");
  while (f.entry.state.phase !== "windup") f.step();
  const until = f.time + 10;
  const frozen = f.entry.mesh.position.clone();
  assert.equal(f.encounters.disorient(f.position, 150, f.time), 1);
  assert.equal(f.entry.state.phase, "disoriented");
  f.position.x += 160;
  while (f.time + 1 / 60 < until) {
    f.step();
    assert.equal(f.entry.state.phase, "disoriented");
    assert.ok(f.entry.mesh.position.distanceTo(frozen) < 1e-9);
  }
  assert.equal(f.entry.state.attackCount, 0);
  assert.equal(f.events.hits, 0);
  f.step(0.05);
  assert.equal(f.entry.state.phase, "return");
  assert.equal(f.encounters.disorient(f.position, 500, f.time), 0);
});

test("领主真实侧翼咬击需要离开实体和下一次完整技能，停顿内不能连咬", () => {
  const f = fixture("kraken");
  f.player.length = 30;
  f.player.mass = 125;
  f.entry.state.phase = f.entry.previousPhase = "recover";
  f.entry.state.phaseDuration = 99;
  f.forward.set(-1, 0, 0);
  let contactX = 0;
  for (let x = 40; x > 0; x -= 0.1) {
    if (findBossContact(f.entry.mesh, new THREE.Vector3(x, -400, 6.3), 1.8)) {
      contactX = x;
      break;
    }
  }
  assert.ok(contactX > 0);
  f.position.set(contactX + 30 * 0.38, -400, 6.3);
  f.step();
  assert.equal(f.events.bites, 1);
  assert.equal(f.entry.lastAttackSide, true);
  assert.equal(f.entry.lastBiteResult.hit, true);
  const health = f.entry.state.health;
  for (let i = 0; i < 100; i++) f.step();
  assert.equal(f.entry.state.health, health);
  assert.equal(f.entry.lastBiteResult.reason, "must_disengage");
  const attackPosition = f.position.clone();
  f.position.x += 40;
  for (let i = 0; i < 23; i++) f.step();
  assert.equal(f.entry.state.contactArmed, true);
  f.position.copy(attackPosition);
  f.step();
  assert.equal(f.events.bites, 1);
  assert.equal(f.entry.lastBiteResult.reason, "opening_spent");
  finishNextBossAttack(f.entry.state);
  f.step();
  assert.equal(f.events.bites, 2);
  assert.ok(f.entry.state.health < health);
});

test("织母真实前摇和扫网命中一次，垂直脱离与岩石遮挡均可规避", () => {
  for (const strategy of ["standing", "up", "cover"]) {
    const f = fixture("abyss_weaver");
    f.position.set(0, -400, -70);
    while (f.time < 6.2) {
      if (
        strategy === "up" &&
        f.entry.state.phase === "windup" &&
        f.entry.state.timer >= 1.5
      )
        f.position.y += 1;
      f.step(1 / 60, strategy === "cover" ? () => true : () => false);
    }
    if (strategy === "standing") {
      assert.equal(f.events.hits, 1);
      assert.ok(
        Math.abs(
          f.player.health - (68 + 0.5 * (f.time - f.events.lastHitTime)),
        ) < 0.001,
      );
      assert.ok(f.entry.state.attackCount >= 1);
      assert.ok(f.entry.fx.sectors.length === 3);
      assert.equal(f.entry.state.phase, "recover");
    } else {
      assert.equal(f.events.hits, 0);
      assert.equal(f.player.health, 100);
    }
    f.encounters.dispose();
  }
});

test("White Tiger patrol and warned charge respect the whole body beside a steep mountain", (t) => {
  const h = (x) => 20 + Math.max(0, x - 28) * 4;
  const encounters = createEncounters(new THREE.Scene(), {
    seabedHeight: h,
    groundHeightAt: h,
    audio: { hit: noop, eat: noop, bossAttack: noop },
    notify: noop,
    onDamage: noop,
    onBite: noop,
  });
  t.after(() => encounters.dispose());
  encounters.reset(["white_tiger"], {}, [
    { kind: "white_tiger", id: "tiger", home: [0, 40, 0], radius: 112 },
  ]);
  const e = encounters.bosses.find((e) => e.enabled),
    player = createPlayer(),
    position = new THREE.Vector3(42, 42, 0),
    forward = new THREE.Vector3(-1, 0, 0);
  const phases = new Set();
  let traveled = 0;
  for (let i = 0; i < 1200; i++) {
    const previous = e.mesh.position.clone();
    player.invulnerable = 100;
    encounters.update(1 / 60, i / 60, player, position, forward, {
      blockedBetween: () => false,
    });
    phases.add(e.state.phase);
    traveled += e.mesh.position.distanceTo(previous);
    const pose = groundTerrainPose(
      e.mesh.position,
      e.heading,
      e.groundHabitat,
      h,
    );
    assert.ok(pose.walkable);
    assert.ok(e.mesh.position.y >= pose.y - 1e-7);
    assert.ok(e.mesh.quaternion.x ** 2 + e.mesh.quaternion.z ** 2 < 1e-8);
    assert.ok(
      new THREE.Vector3(0, 0, -1)
        .applyQuaternion(e.mesh.quaternion)
        .dot(e.heading) > 0.999999,
    );
  }
  assert.ok(traveled > 20);
  assert.ok(phases.has("windup") && phases.has("attack"));
});

test("克拉肯真实漩涡靠近、缠腕、延迟绞咬；普通角色冲刺与遮挡均能脱身", () => {
  for (const strategy of ["trapped", "sprint", "cover"]) {
    const f = fixture("kraken");
    while (!f.entry.grapple.held && f.time < 9) f.step();
    assert.equal(
      f.entry.grapple.held,
      true,
      `${strategy}: never reached grapple`,
    );
    const before = f.player.health;
    const captured = f.time;
    while (!f.entry.grapple.spent && f.time < captured + 2) {
      if (strategy === "sprint") {
        const mouth = f.entry.mesh.userData.mouthAnchors[0].getWorldPosition(
          new THREE.Vector3(),
        );
        const direction = f.position.clone().sub(mouth).normalize();
        f.position.addScaledVector(direction, 32 / 60);
      }
      f.step(1 / 60, () => strategy === "cover");
    }
    assert.equal(f.entry.grapple.held, false);
    assert.equal(f.entry.grapple.spent, true);
    if (strategy === "trapped") {
      assert.ok(f.time - captured >= 1.49);
      assert.equal(before - f.player.health, 60);
      const damage = f.events.hits;
      while (f.entry.state.phase === "attack") f.step();
      assert.equal(
        f.events.hits,
        damage,
        "Same vortex must not bite repeatedly",
      );
      assert.equal(f.entry.state.phase, "recover");
      assert.equal(f.entry.state.phaseDuration, 4);
    } else
      assert.equal(f.player.health, before, `${strategy} failed to escape`);
    f.encounters.disorient(f.position, 500, f.time);
    assert.equal(f.entry.grapple.held, false);
    f.encounters.dispose();
  }
});

test("Kraken's native encounter applies stronger inner pull and stamina loss", () => {
  function sample(distance) {
    const f = fixture("kraken");
    const state = f.entry.state;
    state.phase = "attack";
    state.ability = "vortex";
    state.phaseDuration = 6;
    f.entry.previousPhase = "attack";
    f.entry.attackOrigin.copy(f.entry.mesh.position);
    f.entry.grapple.held = true;
    f.entry.mesh.updateMatrixWorld(true);
    const mouth = f.entry.mesh.userData.mouthAnchors[0].getWorldPosition(
      new THREE.Vector3(),
    );
    f.position.copy(mouth).add(new THREE.Vector3(distance, 0, 0));
    f.player.stamina = 50;
    const start = f.position.clone();
    f.step();
    const result = {
      movement: start.distanceTo(f.position),
      stamina: f.player.stamina,
      forces: { ...f.entry.grappleForces },
    };
    f.encounters.dispose();
    return result;
  }
  const near = sample(6);
  const far = sample(20);
  assert.ok(near.movement > far.movement);
  assert.ok(near.stamina < far.stamina);
  assert.ok(near.forces.gripPullSpeed > far.forces.gripPullSpeed);
});

test("青龙水息从实际吻端释放且方向锁定，一次命中、侧躲和地形遮挡均按真实战斗生效", () => {
  for (const strategy of ["standing", "side", "cover"]) {
    const f = fixture("azure_dragon");
    while (f.entry.state.phase !== "windup" && f.time < 5) f.step();
    assert.equal(f.entry.state.ability, "water");
    let locked;
    while (f.time < 8) {
      const s = f.entry.state;
      if (
        s.phase === "windup" &&
        s.timer >= s.phaseDuration - s.species.lockWindow
      ) {
        locked ||= f.entry.heading.clone();
        if (strategy === "side") f.position.x += 32 / 60;
      }
      if (s.phase === "attack" && strategy === "side") f.position.x += 32 / 60;
      f.step(1 / 60, (a, b) => strategy === "cover" && b.z < -60);
      if (f.entry.state.phase === "attack") {
        assert.ok(f.entry.heading.distanceTo(locked || f.entry.heading) < 1e-8);
        const mouth = f.entry.mesh.userData.mouthAnchors[0].getWorldPosition(
          new THREE.Vector3(),
        );
        assert.ok(f.entry.waterOrigin.distanceTo(mouth) < 1e-6);
        if (strategy === "cover") assert.ok(f.entry.waterRange < 145);
      }
      if (f.entry.state.phase === "recover") break;
    }
    assert.equal(f.events.hits, strategy === "standing" ? 1 : 0, strategy);
    assert.equal(f.entry.state.phase, "recover");
    assert.equal(f.entry.state.phaseDuration, 3.8);
    f.encounters.dispose();
  }
});

test("Lumen Stalker uses real sequential arm tips; sideways escape and solid cover stop damage", () => {
  for (const strategy of ["standing", "side", "cover"]) {
    const f = fixture("lumen_stalker");
    f.player.length = 20;
    const initial = f.entry.mesh.position.clone();
    while (f.time < 5.5) {
      if (
        strategy === "side" &&
        f.entry.state.phase === "windup" &&
        f.entry.state.timer >= 1.7
      )
        f.position.x += 32 / 60;
      f.step(1 / 60, strategy === "cover" ? () => true : () => false);
    }
    assert.equal(f.entry.state.ability, "lash");
    assert.equal(f.events.hits, strategy === "standing" ? 1 : 0, strategy);
    assert.ok(
      Math.abs(
        f.player.health -
          (strategy === "standing"
            ? 62 + 0.5 * (f.time - f.events.lastHitTime)
            : 100),
      ) < 0.001,
    );
    assert.ok(
      f.entry.mesh.position.distanceTo(initial) < 45,
      "No old whole-body charge",
    );
    assert.equal(f.entry.fx.targets.length, 3);
    f.encounters.dispose();
  }
});

test("Lumen patrol leaves attack paths inactive while its ordinary arms keep swimming", () => {
  const f = fixture("lumen_stalker");
  f.position.x = 500;
  for (let i = 0; i < 60; i++) f.step();
  assert.equal(f.entry.state.phase, "dormant");
  assert.equal(f.entry.lashReady, false);
  assert.ok(f.entry.lashSafeTargets.every((p) => p.lengthSq() === 0));
  const bone = f.entry.mesh.userData.lashArms[0].userData.tentacle.bones[6];
  assert.ok(bone.rotation.x !== 0 || bone.rotation.y !== 0);
  assert.equal(f.events.hits, 0);
  f.encounters.dispose();
});

test("Lumen lances cannot pass a newly entered rock plane and ink/reset removes an extended pose", () => {
  const f = fixture("lumen_stalker");
  f.player.length = 20;
  while (f.entry.state.phase !== "attack") f.step();
  const wall = (f.entry.mesh.position.z + f.position.z) / 2;
  const blocked = (a, b) =>
    (a.z >= wall && b.z < wall) || (a.z < wall && b.z >= wall);
  for (let i = 0; i < 108; i++) f.step(1 / 60, blocked);
  assert.equal(f.events.hits, 0);
  assert.ok(f.entry.lashSafeTargets.every((p) => p.z >= wall));
  f.entry.mesh.userData.poseLumenLash(f.entry.lashTargets, [
    { amount: 1 },
    { amount: 1 },
    { amount: 1 },
  ]);
  f.encounters.reset(["hydra"]);
  for (const arm of f.entry.mesh.userData.lashArms) {
    const { bones, points } = arm.userData.tentacle;
    assert.deepEqual(bones[1].position, points[1].clone().sub(points[0]));
  }
  f.encounters.dispose();

  const ink = fixture("lumen_stalker");
  ink.player.length = 20;
  while (ink.entry.state.phase !== "attack") ink.step();
  ink.entry.mesh.userData.poseLumenLash(ink.entry.lashTargets, [
    { amount: 1 },
    { amount: 1 },
    { amount: 1 },
  ]);
  assert.equal(ink.encounters.disorient(ink.position, 150, ink.time), 1);
  assert.equal(ink.entry.state.phase, "disoriented");
  assert.equal(ink.entry.fx.group.visible, false);
  for (const arm of ink.entry.mesh.userData.lashArms) {
    const { bones, points } = arm.userData.tentacle;
    assert.deepEqual(bones[1].position, points[1].clone().sub(points[0]));
  }
  for (let i = 0; i < 120; i++) ink.step();
  assert.equal(ink.events.hits, 0);
  assert.equal(ink.entry.state.phase, "disoriented");
  ink.encounters.dispose();
});

test("实际正面网格接触在恢复期命中，遮挡仍拒绝；实体在击败、切图和销毁时退出", () => {
  const f = fixture("kraken");
  f.player.length = 30;
  f.entry.state.phase = f.entry.previousPhase = "recover";
  f.entry.state.phaseDuration = 99;
  f.forward.set(0, 0, 1);
  f.step(0);
  let contactZ;
  for (let z = -50; z < 25; z += 0.1) {
    if (
      findBossContact(f.entry.mesh, new THREE.Vector3(0, -400, z), 2.7, {
        visibleBody: true,
      })
    ) {
      contactZ = z;
      break;
    }
  }
  assert.ok(contactZ !== undefined);
  f.position.set(0, -400, contactZ - 30 * 0.38);
  f.step(0, () => true);
  assert.equal(f.events.bites, 0);
  assert.equal(f.entry.lastBiteResult.reason, "out_of_range");
  f.step(0);
  assert.equal(f.events.bites, 1);
  assert.equal(f.entry.lastAttackSide, false);
  assert.ok(f.encounters.bodyColliders(f.position, 30).length);
  f.entry.state.defeated = true;
  assert.equal(f.encounters.bodyColliders(f.position, 30).length, 0);
  f.encounters.reset([]);
  assert.equal(f.encounters.bodyColliders(f.position, 30).length, 0);
  f.encounters.dispose();
  assert.equal(f.encounters.bodyColliders(f.position, 30).length, 0);
});

test("Sage pursues a directly vertical target while keeping a nonzero upright heading", () => {
  for (const height of [-100, 100]) {
    const f = fixture("sword_sage");
    f.player.length = 25;
    f.position.copy(f.entry.mesh.position);
    f.position.y += height;
    const start = f.entry.mesh.position.clone();
    for (let i = 0; i < 8; i++) {
      f.step(0.05);
      assert.ok(Math.abs(f.entry.heading.length() - 1) < 1e-10);
      assert.equal(f.entry.heading.y, 0);
      assert.ok(
        new THREE.Vector3(0, 1, 0).applyQuaternion(f.entry.mesh.quaternion).y >
          0.99999,
      );
    }
    assert.ok((f.entry.mesh.position.y - start.y) * Math.sign(height) > 10);
    assert.ok(Math.abs(f.entry.mesh.position.x - start.x) < 1e-10);
    assert.ok(Math.abs(f.entry.mesh.position.z - start.z) < 1e-10);
    assert.equal(f.entry.state.pursuitStarted, true);
    f.encounters.dispose();
  }
});

// 使用完整场景和各自真实技能时钟；不替换移动、地形或接触实现。
for (const species of BOSS_SPECIES) {
  test(`${species.kind} recovery keeps moving within the existing punish window and terrain`, (t) => {
    const f = fixture(species.kind, species.groundbound ? 20 : -900);
    t.after(() => f.encounters.dispose());
    finishNextBossAttack(f.entry.state);
    f.entry.previousPhase = "attack";
    // 真实陆行/海床居民从其合法地面高度开始，不能把返巢限位当作收势运动。
    if (species.seabedCrawler) f.entry.home.y = -900 + species.floorClearance;
    if (species.groundbound)
      f.entry.home.y = groundTerrainPose(
        f.entry.mesh.position,
        f.entry.heading,
        f.entry.groundHabitat,
        () => 20,
      ).y;
    f.entry.mesh.position.copy(f.entry.home);
    f.position.copy(f.entry.home).add(new THREE.Vector3(0, 0, -85));
    f.step(0);
    f.entry.home.copy(f.entry.mesh.position);
    f.position.copy(f.entry.home).add(new THREE.Vector3(0, 0, -85));
    const before = f.entry.mesh.position.clone();
    const duration = f.entry.state.phaseDuration;
    const count = f.entry.state.attackCount;
    for (let i = 0; i < 90; i++) f.step();
    assert.equal(f.entry.state.phase, "recover");
    assert.equal(f.entry.state.phaseDuration, duration);
    assert.equal(f.entry.state.attackCount, count);
    assert.equal(f.entry.state.validatedHits, 0);
    assert.ok(f.entry.mesh.position.distanceTo(before) > 1);
    assert.ok(
      f.entry.mesh.position.distanceTo(before) <= 9 * 1.5 + 1e-6,
      JSON.stringify({
        before: before.toArray(),
        after: f.entry.mesh.position.toArray(),
      }),
    );
    assert.ok(f.entry.mesh.quaternion.toArray().every(Number.isFinite));
    assert.ok(f.encounters.bodyColliders(f.position, 30).length);
    if (species.groundbound) {
      const pose = groundTerrainPose(
        f.entry.mesh.position,
        f.entry.heading,
        f.entry.groundHabitat,
        () => 20,
      );
      assert.ok(pose.walkable);
      assert.ok(Math.abs(f.entry.mesh.position.y - pose.y) < 1e-6);
    }
  });
}

test("Recovery maneuver cannot cross blocked cover; zero dt and ink freeze/cancel defense", (t) => {
  const f = fixture("sword_sage");
  t.after(() => f.encounters.dispose());
  finishNextBossAttack(f.entry.state);
  f.entry.previousPhase = "attack";
  f.position.set(0, -400, -20);
  f.step(0);
  const before = f.entry.mesh.position.clone();
  const timer = f.entry.state.timer;
  f.step(0);
  assert.equal(f.entry.state.timer, timer);
  assert.deepEqual(f.entry.mesh.position.toArray(), before.toArray());
  for (let i = 0; i < 45; i++) f.step(1 / 60, () => true);
  assert.deepEqual(f.entry.mesh.position.toArray(), before.toArray());
  assert.equal(f.entry.recovery.startedAt, -1);
  f.step();
  assert.equal(
    recoveryGuardStatus(f.entry.recovery.startedAt, f.entry.state.timer),
    "warning",
    JSON.stringify({
      state: f.entry.state,
      pos: f.entry.mesh.position.toArray(),
      player: f.position.toArray(),
    }),
  );
  assert.equal(f.entry.ring.visible, true);
  assert.equal(f.entry.ring.geometry.drawRange.count, 72);
  f.encounters.disorient(f.position, 500, f.time);
  assert.equal(f.entry.recovery.startedAt, -1);
  assert.equal(f.entry.ring.visible, false);
  const inkPosition = f.entry.mesh.position.clone();
  for (let i = 0; i < 90; i++) f.step();
  assert.deepEqual(f.entry.mesh.position.toArray(), inkPosition.toArray());
  assert.equal(f.events.hits, 0);
});

test("Close recovery defense gives a full locked warning, keeps body exposed and hits only once", (t) => {
  const f = fixture("sword_sage");
  t.after(() => f.encounters.dispose());
  finishNextBossAttack(f.entry.state);
  f.entry.previousPhase = "attack";
  f.position.set(0, -400, -20);
  f.forward.set(0, 0, 1);
  for (let i = 0; i < 37; i++) f.step();
  assert.equal(
    recoveryGuardStatus(f.entry.recovery.startedAt, f.entry.state.timer),
    "warning",
  );
  const started = f.entry.recovery.startedAt;
  const direction = f.entry.recovery.direction.clone();
  // 移到真正的前端表面，长度不足25米，故此夹具不自动咬击/杀死目标。
  function touchFront() {
    const origin = f.entry.mesh.position;
    let contact;
    for (let y = 0; y < 18 && !contact; y += 1)
      for (let z = -38; z < 0; z += 0.25) {
        const q = new THREE.Vector3(0, y, z)
          .applyQuaternion(f.entry.mesh.quaternion)
          .add(origin);
        if (findBossContact(f.entry.mesh, q, 0.4, { visibleBody: true })) {
          contact = q;
          break;
        }
      }
    assert.ok(contact);
    f.forward.copy(direction).negate();
    f.position
      .copy(contact)
      .addScaledVector(f.forward, -f.player.length * 0.38);
  }
  while (f.entry.state.timer - started < LORD_RECOVERY.warning - 1 / 60) {
    touchFront();
    f.step();
    assert.equal(f.events.hits, 0);
    assert.deepEqual(f.entry.recovery.direction.toArray(), direction.toArray());
  }
  while (
    f.entry.state.timer <
    started + LORD_RECOVERY.warning + LORD_RECOVERY.strike
  ) {
    touchFront();
    f.step();
  }
  assert.equal(f.events.hits, 1);
  assert.equal(
    f.events.lastHitHealth,
    100 - f.entry.state.species.damage * LORD_RECOVERY.damageFraction,
  );
  assert.equal(f.entry.state.openingSpent, false);
  assert.equal(f.entry.state.validatedHits, 0);
  assert.ok(f.events.lastHitTime - started >= LORD_RECOVERY.warning);
  assert.equal(
    f.events.warnings.filter((x) => x.includes("正面将有反击")).length,
    1,
  );
  f.entry.state.phase = "hunt";
  f.entry.state.timer = 0;
  f.entry.state.phaseDuration = 10;
  f.position.set(0, -400, -90);
  f.step();
  assert.equal(f.entry.recovery.startedAt, -1);
  assert.equal(f.entry.ring.geometry.drawRange.count, Infinity);
  f.encounters.reset([]);
  assert.equal(f.entry.recovery.startedAt, -1);
  assert.equal(f.entry.ring.visible, false);
});
