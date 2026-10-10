import * as THREE from "three";
import { createElectricDischarge } from "./electric_discharge.js";
import { createFluidTexture } from "./effect_textures.js";
import { createMinionTransitionEffect } from "./minion_transition_effect.js";
import { createRareBlessingEffect } from "./rare_blessing_effect.js";

/**
 * 创建捕食血雾、咬合水流、受击冲击与乌贼墨云；粒子池限定总量并可随重开清空。
 * @param {THREE.Scene} scene 承载世界特效的场景。
 * @returns {object} 发射、更新、清空与墨云浓度查询接口。
 */
export function createCombatEffects(scene, options = {}) {
  const group = new THREE.Group();
  group.name = "combat_effects";
  scene.add(group);
  const blessing = createRareBlessingEffect(group, options);
  const minionTransitions = createMinionTransitionEffect(group, options);
  const texture = createFluidTexture("mist");
  const inkTexture = createFluidTexture("ink");
  const bubbleTexture = createFluidTexture("bubble");
  const pool = Array.from({ length: 80 }, () => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    group.add(sprite);
    return {
      sprite,
      age: 0,
      life: 0,
      size: 1,
      alpha: 0,
      rise: 0,
      damp: 0.5,
      spin: 0.12,
      stretch: 1,
      grow: 1.9,
      phase: Math.random() * Math.PI * 2,
      velocity: new THREE.Vector3(),
    };
  });
  const discharge = createElectricDischarge(group);
  const clouds = [];
  const rings = Array.from({ length: 8 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.026, 5, 48, Math.PI * 1.55),
      new THREE.MeshBasicMaterial({
        color: 0xcbe5df,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    mesh.visible = false;
    group.add(mesh);
    return { mesh, age: 0, life: 0, size: 1 };
  });
  let cursor = 0,
    ringCursor = 0,
    ink = 0;

  function emit(
    point,
    {
      color,
      count,
      size,
      alpha,
      life,
      drift = 1,
      rise = 0,
      damp = 0.5,
      spin = 0.12,
      stretch = 1,
      grow = 1.9,
      spread = 0,
      bubble = false,
    },
  ) {
    for (let i = 0; i < count; i++) {
      const p = pool[cursor++ % pool.length];
      p.age = 0;
      p.life = life * (0.8 + Math.random() * 0.4);
      p.size = size * (0.7 + Math.random() * 0.6);
      p.alpha = alpha;
      p.rise = rise;
      p.damp = damp;
      p.spin = spin * (Math.random() < 0.5 ? -1 : 1);
      p.stretch = stretch;
      p.grow = grow;
      p.velocity.set(
        (Math.random() - 0.5) * drift,
        (Math.random() - 0.45) * drift,
        (Math.random() - 0.5) * drift,
      );
      p.sprite.position
        .copy(point)
        .addScaledVector(p.velocity, 0.2)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
          ),
        );
      p.sprite.material.map = bubble ? bubbleTexture : texture;
      p.sprite.material.blending = bubble
        ? THREE.AdditiveBlending
        : THREE.NormalBlending;
      p.sprite.material.color.set(color);
      p.sprite.material.rotation = Math.random() * Math.PI;
      p.sprite.material.opacity = alpha;
      p.sprite.scale.set(p.size * 0.35, p.size * 0.35 * stretch, 1);
      p.sprite.visible = true;
    }
  }
  function blood(point, length = 3, strength = 1) {
    // 分层扩散：浓核心、绯红中层、新鲜血色亮点、丝缕与上浮气泡。
    const reach = Math.max(1, length * 0.14);
    emit(point, {
      color: 0x4a0e1c,
      count: Math.min(9, 5 + Math.ceil(length / 6)),
      size: Math.min(6.4, 2 + length * 0.18),
      alpha: 0.52 * strength,
      life: 3.9,
      drift: 1.9,
      grow: 2.3,
      spin: 0.35,
      spread: 1.1 * reach,
    });
    emit(point, {
      color: 0x8e1f2e,
      count: 7,
      size: Math.min(5, 1.6 + length * 0.15),
      alpha: 0.46 * strength,
      life: 3.0,
      drift: 3.1,
      grow: 2.1,
      spin: 0.55,
      spread: 1.9 * reach,
    });
    emit(point, {
      color: 0xd64a52,
      count: 4,
      size: Math.min(2.6, 0.9 + length * 0.1),
      alpha: 0.55 * strength,
      life: 1.5,
      drift: 4.8,
      grow: 1.6,
      spread: 0.7 * reach,
    });
    emit(point, {
      color: 0x8c2333,
      count: 5,
      size: Math.min(3.8, 1.2 + length * 0.14),
      alpha: 0.4 * strength,
      life: 2.7,
      drift: 1.4,
      stretch: 2.9,
      spin: 0.9,
      grow: 2.4,
      spread: 2.4 * reach,
    });
    emit(point, {
      bubble: true,
      color: 0xd6f2f4,
      count: 6,
      size: 0.65,
      alpha: 0.6 * strength,
      life: 2.3,
      drift: 1,
      rise: 3.8,
      damp: 0.22,
      grow: 1.25,
      spread: 1.3 * reach,
    });
  }
  // 吞食完成时的小型余雾按猎物尺度收敛，微小鱼不会瞬间变成数米血云。
  function mealMist(point, preyLength = 1) {
    const length = Number.isFinite(preyLength) ? Math.max(0.01, preyLength) : 1;
    const size = THREE.MathUtils.clamp(
      0.18 + Math.sqrt(length) * 0.16,
      0.22,
      0.85,
    );
    emit(point, {
      color: 0x9c3443,
      count: Math.min(6, 2 + Math.ceil(Math.sqrt(length))),
      size,
      alpha: 0.3,
      life: 0.8,
      drift: size * 0.75,
      grow: 1.35,
      spin: 0.35,
      spread: size * 0.3,
    });
    emit(point, {
      color: 0x651d2c,
      count: 2,
      size: size * 0.8,
      alpha: 0.2,
      life: 1.1,
      drift: size * 0.45,
      grow: 1.6,
      stretch: 1.3,
      spread: size * 0.4,
    });
    emit(point, {
      bubble: true,
      color: 0xd8ebeb,
      count: 2,
      size: THREE.MathUtils.clamp(size * 0.38, 0.08, 0.25),
      alpha: 0.4,
      life: 0.55,
      drift: 0.35,
      rise: 0.8,
      grow: 1.15,
      spread: size * 0.4,
    });
  }
  function bite(point, direction, length = 6) {
    for (let i = 0; i < 2; i++) {
      const ring = rings[ringCursor++ % rings.length];
      ring.age = 0;
      ring.life = 0.46;
      ring.size = Math.max(0.5, length * 0.11);
      ring.mesh.position.copy(point);
      ring.mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction,
      );
      ring.mesh.rotateZ(i * Math.PI);
      ring.mesh.visible = true;
    }
    emit(point, {
      bubble: true,
      color: 0xe8fbff,
      count: 4,
      size: 0.5,
      alpha: 0.5,
      life: 0.6,
      drift: 6.5,
      rise: 1.4,
      damp: 0.35,
      grow: 1.3,
    });
  }
  function hurt(point, length) {
    blood(point, length, 0.7);
    emit(point, {
      bubble: true,
      color: 0xc5e4e5,
      count: 6,
      size: 0.7,
      alpha: 0.45,
      life: 0.55,
      drift: 8,
    });
  }
  function flash(point, color = 0x83edcd, size = 5) {
    emit(point, { color, count: 3, size, alpha: 0.45, life: 0.65, drift: 1 });
  }
  function spawnInk(point, radius = 16, duration = 6) {
    // 墨云几何与遮蔽查询共用同一中心和半径，离开云团后视野恢复。
    if (clouds.length >= 4) removeCloud(clouds.shift());
    const cluster = new THREE.Group();
    cluster.position.copy(point);
    group.add(cluster);
    // 三层结构：浓核心、紫黑中层、边缘絮状扩散层；每层独立翻涌。
    const layers = [
      {
        count: 5,
        color: 0x0d0f1c,
        opacity: 0.78,
        scale: 1.05,
        spread: 0.2,
        core: true,
      },
      {
        count: 6,
        color: 0x1a1529,
        opacity: 0.52,
        scale: 1.5,
        spread: 0.48,
        core: false,
      },
      {
        count: 7,
        color: 0x2b2140,
        opacity: 0.32,
        scale: 2.3,
        spread: 0.85,
        core: false,
      },
    ];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: inkTexture,
            color: layer.color,
            opacity: layer.opacity,
            transparent: true,
            depthWrite: false,
          }),
        );
        const orbit = radius * layer.spread * (0.55 + Math.random() * 0.9);
        sprite.userData = {
          orbit,
          speed: (0.12 + Math.random() * 0.26) * (Math.random() < 0.5 ? -1 : 1),
          phase: Math.random() * Math.PI * 2,
          bob: 0.5 + Math.random() * 1.3,
          bobRate: 0.5 + Math.random() * 0.8,
          scale: radius * layer.scale * (0.8 + Math.random() * 0.45),
          opacity: layer.opacity,
          spin: (Math.random() - 0.5) * 0.4,
          core: layer.core,
        };
        cluster.add(sprite);
      }
    }
    const cloud = { cluster, point: point.clone(), radius, duration, age: 0 };
    clouds.push(cloud);
    return cloud;
  }
  function removeCloud(cloud) {
    group.remove(cloud.cluster);
    for (const sprite of cloud.cluster.children) sprite.material.dispose();
  }
  function inkDensity(point) {
    let amount = 0;
    for (const cloud of clouds) {
      const swell = Math.min(1, 0.3 + cloud.age * 1.4);
      const fade = Math.min(1, (cloud.duration - cloud.age) / 1.5);
      // 浓度上限压低到0.62：云内视距受限但近处轮廓仍可读，离开后照旧归零。
      amount = Math.max(
        amount,
        0.62 *
          THREE.MathUtils.clamp(
            1 - point.distanceTo(cloud.point) / (cloud.radius * swell),
            0,
            1,
          ) *
          fade,
      );
    }
    return amount;
  }
  function update(dt, cameraPosition, playerPosition) {
    blessing.update(dt, cameraPosition, playerPosition);
    minionTransitions.update(dt);
    discharge.update(dt);
    for (const p of pool) {
      if (!p.sprite.visible) continue;
      p.age += dt;
      const t = p.age / p.life;
      p.sprite.visible = t < 1;
      p.velocity.y += p.rise * dt;
      p.sprite.position.addScaledVector(p.velocity, dt);
      // 轻微横向涡流使丝缕在水中卷动，参数受粒子寿命约束。
      p.sprite.position.x += Math.sin(p.age * 2.2 + p.phase) * dt * 0.22;
      p.sprite.position.z += Math.cos(p.age * 1.7 + p.phase) * dt * 0.17;
      p.velocity.multiplyScalar(Math.exp(-dt * p.damp));
      const spread = 0.45 + t * p.grow;
      p.sprite.scale.set(p.size * spread, p.size * spread * p.stretch, 1);
      p.sprite.material.opacity = p.alpha * Math.pow(Math.max(0, 1 - t), 1.2);
      p.sprite.material.rotation += dt * p.spin;
    }
    for (const ring of rings) {
      if (!ring.mesh.visible) continue;
      ring.age += dt;
      const t = ring.age / ring.life;
      ring.mesh.visible = t < 1;
      ring.mesh.scale.set(
        ring.size * (0.7 + t),
        ring.size * (0.45 + t * 0.6),
        1,
      );
      ring.mesh.material.opacity = Math.max(0, 0.7 * (1 - t));
    }
    for (let i = clouds.length - 1; i >= 0; i--) {
      const cloud = clouds[i];
      cloud.age += dt;
      if (cloud.age >= cloud.duration) {
        removeCloud(cloud);
        clouds.splice(i, 1);
        continue;
      }
      const swell = Math.min(1, 0.3 + cloud.age * 1.4);
      const fade = Math.min(1, (cloud.duration - cloud.age) / 1.5);
      cloud.cluster.scale.setScalar(swell);
      cloud.cluster.rotation.y += dt * 0.05;
      for (const sprite of cloud.cluster.children) {
        const d = sprite.userData;
        d.phase += d.speed * dt;
        sprite.position.set(
          Math.cos(d.phase) * d.orbit,
          Math.sin(cloud.age * d.bobRate + d.phase) * d.bob,
          Math.sin(d.phase) * d.orbit,
        );
        const pulse = 1 + Math.sin(cloud.age * 1.1 + d.phase * 2) * 0.08;
        sprite.scale.setScalar(d.scale * pulse);
        // 贴近相机的单片墨雾就近淡出，云内始终留出一圈可读视野。
        const worldX = cloud.point.x + sprite.position.x * swell;
        const worldY = cloud.point.y + sprite.position.y * swell;
        const worldZ = cloud.point.z + sprite.position.z * swell;
        const cameraGap = Math.hypot(
          cameraPosition.x - worldX,
          cameraPosition.y - worldY,
          cameraPosition.z - worldZ,
        );
        const nearFade = THREE.MathUtils.clamp(
          (cameraGap / (d.scale * pulse) - 0.28) / 0.55,
          0.06,
          1,
        );
        sprite.material.opacity =
          Math.min(d.opacity, d.opacity * fade * 1.6) * nearFade;
        sprite.material.rotation += dt * d.spin;
      }
    }
    const density = Math.max(
      inkDensity(cameraPosition),
      inkDensity(playerPosition) * 0.9,
    );
    ink = THREE.MathUtils.damp(ink, density, 5, dt);
  }
  function reset() {
    blessing.reset();
    minionTransitions.reset();
    discharge.reset();
    for (const p of pool) p.sprite.visible = false;
    for (const ring of rings) ring.mesh.visible = false;
    for (const cloud of clouds) removeCloud(cloud);
    clouds.length = 0;
    ink = 0;
  }
  return {
    blood,
    mealMist,
    bite,
    hurt,
    minionTransition: minionTransitions.emit,
    minionTransitions,
    flash,
    electricDischarge: discharge.emit,
    rareBlessing: blessing.emit,
    blessing,
    spawnInk,
    inkDensity,
    update,
    reset,
    dispose() {
      reset();
      scene.remove(group);
      for (const p of pool) p.sprite.material.dispose();
      for (const ring of rings) {
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
      }
      discharge.dispose();
      blessing.dispose();
      minionTransitions.dispose();
      texture.dispose();
      inkTexture.dispose();
      bubbleTexture.dispose();
      group.clear();
    },
    clouds,
    group,
    get ink() {
      return ink;
    },
    get activeParticles() {
      return pool.filter((p) => p.sprite.visible).length;
    },
  };
}
