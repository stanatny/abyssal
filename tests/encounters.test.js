import { groundTerrainPose } from "../src/ground_navigation.js";
import { t } from "../src/i18n.js";
import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createEncounters, findBossContact } from "../src/encounters.js";
import { createBossState } from "../src/boss_rules.js";
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

function fixture(kind) {
  const scene = new THREE.Scene();
  const events = { hits: 0, bites: 0, warnings: [] };
  const encounters = createEncounters(scene, {
    seabedHeight: () => -900,
    audio: { hit: noop, eat: noop, bossAttack: noop },
    notify: (message) => events.warnings.push(t(message)),
    onDamage: () => events.hits++,
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

test("领主在真实侧翼网格接触时只咬一次，离开实体后可以重新进入攻击", () => {
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
  assert.equal(f.events.bites, 2);
  assert.ok(f.entry.state.health < health);
});

test("织母真实前摇和扫网命中一次，垂直脱离与岩石遮挡均可规避", () => {
  for (const strategy of ["standing", "up", "cover"]) {
    const f = fixture("abyss_weaver");
    f.position.set(0, -400, -70);
    while (f.time < 6) {
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
      assert.ok(Math.abs(f.player.health - 68) < 0.001);
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
