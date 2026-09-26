import * as THREE from "three";
import { createCreature } from "./creatures.js";
import {
  BOSS_SPECIES,
  createBossState,
  tickBoss,
  hitBoss,
} from "./boss_rules.js";
import { takeDamage } from "./simulation.js";
import { makeLabel } from "./rewards.js";

const TIPS = {
  vortex: "横向游出漩涡，绕岩柱切断牵引",
  pulse: "快速上浮或下潜，避开脉冲所在水层",
  volley: "横向变向躲开三连弹，不要直线后退",
  charge: "冲锋锁定后侧向闪避，等待撞击后的硬直",
};
const SKILLS = {
  vortex: "深渊漩涡",
  pulse: "遗迹脉冲",
  volley: "三重吐息",
  charge: "毁灭冲锋",
};
const COLORS = {
  vortex: 0xbc8dff,
  pulse: 0x73ffd0,
  volley: 0xffa16f,
  charge: 0x87dfff,
};

/** 稀有领地战的空间表现：技能前摇、可躲避攻击、撤退边界与多次咬击。 */
export function createEncounters(
  scene,
  { seabedHeight, audio, notify, onDamage },
) {
  const bosses = [],
    projectiles = [];
  let active = null;
  const ballGeo = new THREE.SphereGeometry(1, 10, 8),
    fxMat = new THREE.MeshBasicMaterial({
      color: 0xffbb8b,
      transparent: true,
      opacity: 0.9,
    });
  for (const species of BOSS_SPECIES) {
    const mesh = createCreature(
      species.kind,
      species.length,
      91 + bosses.length,
    );
    scene.add(mesh);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.018, 6, 72),
      new THREE.MeshBasicMaterial({
        color: COLORS[species.ability],
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const label = makeLabel("禁入领地", species.label, "#efbeab");
    scene.add(label);
    bosses.push({
      state: createBossState(species),
      mesh,
      home: new THREE.Vector3(),
      enabled: false,
      radius: 110,
      ring,
      label,
      previousPhase: "dormant",
      heading: new THREE.Vector3(0, 0, -1),
      attackOrigin: new THREE.Vector3(),
      lockTarget: new THREE.Vector3(),
      respawn: 0,
      contactCooldown: 0,
      phaseHit: false,
    });
  }
  function place(entry, index) {
    const species = entry.state.species;
    const x = (index === 0 ? -1 : 1) * (145 + Math.random() * 20);
    const targetDepth = species.depthMin + 25 + Math.random() * 35;
    let z = THREE.MathUtils.clamp(
      -200 - (targetDepth + 75 - 140) / 0.72,
      -1110,
      -520,
    );
    for (
      let i = 0;
      i < 12 &&
      seabedHeight(x, z) + species.length * 0.24 + 35 > -species.depthMin;
      i++
    )
      z = Math.max(-1120, z - 25);
    const floor = seabedHeight(x, z) + species.length * 0.24 + 35;
    const depth = Math.min(targetDepth, -floor, species.depthMax);
    entry.home.set(x, -depth, z);
    entry.mesh.position.copy(entry.home);
    entry.mesh.visible = true;
    entry.enabled = true;
    entry.previousPhase = "dormant";
    entry.contactCooldown = 0;
    entry.respawn = 0;
    entry.slot = index;
    entry.label.position.copy(entry.home).add(new THREE.Vector3(0, 25, 0));
    entry.label.scale.set(30, 7.5, 1);
  }
  function reset() {
    for (const p of projectiles) scene.remove(p.mesh);
    projectiles.length = 0;
    active = null;
    const shuffled = [...bosses].sort(() => Math.random() - 0.5);
    bosses.forEach((entry) => {
      entry.state = createBossState(entry.state.species);
      entry.enabled = false;
      entry.mesh.visible = false;
      entry.label.visible = false;
      entry.ring.visible = false;
    });
    shuffled.slice(0, 2).forEach((entry, index) => place(entry, index));
  }
  function damage(player, amount, message) {
    if (takeDamage(player, amount)) {
      audio.hit();
      onDamage();
      notify(message, 2.2);
      return true;
    }
    return false;
  }
  function enterPhase(entry, playerPosition) {
    const state = entry.state;
    if (state.phase === "windup") {
      entry.lockTarget.copy(playerPosition);
      entry.attackOrigin.copy(entry.mesh.position);
      entry.heading.copy(playerPosition).sub(entry.mesh.position).normalize();
      entry.phaseHit = false;
      notify(
        `${state.species.label} · ${SKILLS[state.ability]}\n${TIPS[state.ability]}`,
        2.8,
      );
      audio.bossAttack?.(state.species.kind);
    }
    if (state.phase === "attack" && state.ability === "volley") {
      for (const offset of [-0.22, 0, 0.22]) {
        const mesh = new THREE.Mesh(ballGeo, fxMat);
        mesh.scale.setScalar(2.6);
        mesh.position
          .copy(entry.mesh.position)
          .addScaledVector(entry.heading, state.species.length * 0.42);
        scene.add(mesh);
        const velocity = entry.lockTarget
          .clone()
          .sub(mesh.position)
          .normalize()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), offset)
          .multiplyScalar(38);
        projectiles.push({ mesh, velocity, life: 4, damage: 34 });
      }
    }
  }
  function update(
    dt,
    time,
    player,
    position,
    forward,
    { bite = false, blockedBetween },
  ) {
    active = null;
    for (const entry of bosses) {
      const state = entry.state;
      if (!entry.enabled) continue;
      if (state.defeated) {
        entry.mesh.visible = false;
        entry.label.visible = false;
        entry.ring.visible = false;
        entry.respawn -= dt;
        if (entry.respawn <= 0) {
          entry.state = createBossState(state.species);
          place(entry, entry.slot);
        }
        continue;
      }
      const distance = entry.mesh.position.distanceTo(position),
        homeDistance = entry.home.distanceTo(position),
        inTerritory = homeDistance < entry.radius;
      entry.mesh.visible = distance < 230;
      entry.label.visible = homeDistance < 175 && !inTerritory;
      entry.contactCooldown = Math.max(0, entry.contactCooldown - dt);
      const sight = !blockedBetween(entry.mesh.position, position);
      tickBoss(state, dt, {
        inTerritory,
        distance,
        lineOfSight: sight,
        playerAlive: !player.dead,
      });
      if (state.phase !== entry.previousPhase) {
        enterPhase(entry, position);
        entry.previousPhase = state.phase;
      }
      const attack = state.phase === "attack",
        windup = state.phase === "windup",
        recover = state.phase === "recover";
      const direction = position.clone().sub(entry.mesh.position).normalize();
      if (state.phase === "hunt") {
        entry.mesh.position.addScaledVector(
          direction,
          state.species.speed * dt,
        );
        entry.heading.lerp(direction, dt * 2).normalize();
      } else if (state.phase === "return") {
        const back = entry.home.clone().sub(entry.mesh.position);
        if (back.length() > 2) {
          back.normalize();
          entry.mesh.position.addScaledVector(back, 22 * dt);
          entry.heading.lerp(back, dt * 2).normalize();
        }
      } else if (state.phase === "dormant") {
        entry.mesh.position
          .copy(entry.home)
          .add(
            new THREE.Vector3(
              Math.sin(time * 0.08) * 17,
              Math.sin(time * 0.2) * 3,
              Math.cos(time * 0.08) * 17,
            ),
          );
        entry.heading.set(Math.cos(time * 0.08), 0, -Math.sin(time * 0.08));
      } else if (attack && state.ability === "charge")
        entry.mesh.position.addScaledVector(entry.heading, 46 * dt);
      entry.mesh.position.y = Math.max(
        entry.mesh.position.y,
        seabedHeight(entry.mesh.position.x, entry.mesh.position.z) +
          state.species.length * 0.2 +
          3,
      );
      // 领主被限制在自己的领域附近，不会穿越整张地图追杀初生玩家。
      const fromHome = entry.mesh.position.clone().sub(entry.home);
      if (fromHome.length() > entry.radius + 22)
        entry.mesh.position
          .copy(entry.home)
          .add(fromHome.setLength(entry.radius + 22));
      entry.mesh.quaternion.slerp(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          entry.heading,
        ),
        Math.min(1, dt * 2),
      );
      entry.mesh.userData.animate?.(time, attack ? 2.5 : recover ? 0.35 : 1.2);
      entry.ring.visible = windup || attack;
      entry.ring.position.copy(
        state.ability === "pulse" ? entry.attackOrigin : entry.mesh.position,
      );
      let ringSize =
        state.ability === "vortex"
          ? 42
          : state.ability === "pulse"
            ? windup
              ? 100
              : 10 + (90 * state.timer) / state.phaseDuration
            : state.species.length * 0.65;
      entry.ring.scale.setScalar(ringSize);
      entry.ring.material.opacity = windup
        ? 0.35 + Math.sin(time * 12) * 0.2
        : 0.8;
      if (attack && sight) {
        if (state.ability === "vortex" && distance < 65) {
          position.addScaledVector(direction, -11 * dt);
          player.stamina = Math.max(0, player.stamina - 10 * dt);
          if (distance < state.species.length * 0.5 && !entry.phaseHit)
            entry.phaseHit = damage(
              player,
              state.species.damage,
              "触腕绞击 · 横向游出漩涡！",
            );
        }
        if (state.ability === "pulse") {
          const radial = Math.hypot(
            position.x - entry.attackOrigin.x,
            position.z - entry.attackOrigin.z,
          );
          if (
            Math.abs(radial - ringSize) < 8 &&
            Math.abs(position.y - entry.attackOrigin.y) < 10 &&
            !entry.phaseHit
          )
            entry.phaseHit = damage(
              player,
              state.species.damage,
              "遗迹脉冲命中 · 上下换层可躲避",
            );
        }
        if (
          state.ability === "charge" &&
          distance < state.species.length * 0.42 + player.length * 0.18 &&
          !entry.phaseHit
        )
          entry.phaseHit = damage(
            player,
            state.species.damage,
            "毁灭冲锋命中 · 锁定后向侧面闪避",
          );
      }
      const mouth = position
        .clone()
        .addScaledVector(forward, player.length * 0.38);
      const inRange =
        mouth.distanceTo(entry.mesh.position) <
        state.species.length * 0.4 + player.length * 0.23;
      if (bite && inTerritory) {
        const result = hitBoss(player, state, { inRange: inRange && sight });
        if (result.hit) {
          audio.eat();
          notify(
            result.defeated
              ? `击败 ${state.species.label} · 深渊印记已获得`
              : `咬击 ${Math.round(result.damage)} · ${recover ? "弱点暴露！" : "等待技能后的破绽"}`,
            2,
          );
          if (result.defeated) entry.respawn = 150 + Math.random() * 60;
        }
      }
      if (
        !state.defeated &&
        !recover &&
        !windup &&
        inTerritory &&
        sight &&
        distance < state.species.length * 0.3 + player.length * 0.18 &&
        entry.contactCooldown <= 0
      ) {
        damage(
          player,
          state.species.damage * 0.6,
          `${state.species.label} 撕咬 · 不要贴身硬拼`,
        );
        entry.contactCooldown = 2.4;
      }
      if (inTerritory || state.phase === "return")
        if (!active || distance < active.distance)
          active = {
            entry,
            state,
            distance,
            homeDistance,
            tip: recover
              ? "破绽已出现 · 靠近后按 F / 点击咬击"
              : TIPS[state.ability],
          };
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i],
        old = p.mesh.position.clone();
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (blockedBetween(old, p.mesh.position)) p.life = 0;
      if (
        p.life > 0 &&
        p.mesh.position.distanceTo(position) < 4 + player.length * 0.2
      ) {
        damage(player, p.damage, "三重吐息命中 · 横向变向躲避");
        p.life = 0;
      }
      if (p.life <= 0) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }
    return active;
  }
  reset();
  return {
    bosses,
    update,
    reset,
    get active() {
      return active;
    },
  };
}
