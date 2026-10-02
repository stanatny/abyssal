import { createIceCoveredSurface } from "./ice_surface.js";
import { regionalBirds, sampleBirdFlight } from "./surface_birds.js";
import { createMarianaFleet, createMarianaSky } from "./mariana_surface.js";
import { createBermudaFleet } from "./bermuda_fleet.js";
import { createAtlantisSky, createAtlantisFleet } from "./atlantis_surface.js";
import { tr, message } from "./i18n.js";
import * as THREE from "three";
import { createCreature } from "./creatures.js";
import { WORLD } from "./world_config.js";
import { consumePrey } from "./simulation.js";
import { createSurfaceState, stepSurface } from "./surface_rules.js";
import { createShips } from "./ships.js";
import { createFluidTexture } from "./effect_textures.js";

/**
 * 创建破水、海鸥、船舶与水面效果；第四参数可提供 onEat(point, length, bird) 与吞食过渡占用查询。
 * move 接收游泳前 previousPosition，空中完全由本模块积分运动。
 * 返回兼容的 move/update/reset/birds/airborne，额外暴露 ships、charge 与 dispose。
 */
export function createSurface(
  scene,
  audio,
  notify,
  {
    onEat,
    isSwallowing,
    regionId = "hawaii",
    surfaceMode = "open",
    worldBounds = WORLD,
    worldColliders,
    castWorld,
    onImpact,
    onContact,
    heightAt,
    onDamage,
  } = {},
) {
  if (surfaceMode === "ice") return createIceCoveredSurface({ worldBounds });
  const root = new THREE.Group();
  root.name = "surface_environment";
  scene.add(root);
  const resources = new Set();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const birds = [],
    splashes = [];
  let state = createSurfaceState();
  let lastPosition = null;
  const night = regionId === "atlantis";
  const storm = regionId === "bermuda";
  const trench = regionId === "mariana";
  const fleetOptions = {
    worldColliders,
    castWorld,
    onImpact,
    onContact,
    heightAt,
    onDamage,
    audio,
    notify,
  };
  const fleet = storm
    ? createBermudaFleet(scene, fleetOptions)
    : night
      ? createAtlantisFleet(scene, fleetOptions)
      : trench
        ? createMarianaFleet(scene, fleetOptions)
        : createShips(scene, fleetOptions);
  const nightSky = night
    ? createAtlantisSky(scene)
    : trench
      ? createMarianaSky(scene)
      : null;
  const dummy = new THREE.Object3D();
  const ringGeometry = keep(new THREE.RingGeometry(0.965, 1, 64));
  const rippleGeometry = keep(new THREE.RingGeometry(0.82, 1, 64));
  const dropletGeometry = keep(new THREE.SphereGeometry(0.11, 5, 4));
  const sheetGeometry = keep(
    new THREE.CylinderGeometry(1, 0.7, 1, 48, 4, true),
  );
  const crownPosition = sheetGeometry.attributes.position;
  for (let i = 0; i < crownPosition.count; i++) {
    const angle = Math.atan2(crownPosition.getZ(i), crownPosition.getX(i));
    const height = crownPosition.getY(i) + 0.5;
    const scallop =
      0.75 + Math.sin(angle * 9) * 0.14 + Math.sin(angle * 17 + 0.4) * 0.1;
    crownPosition.setY(i, -0.5 + height * scallop);
  }
  sheetGeometry.computeVertexNormals();
  const discGeometry = keep(new THREE.CircleGeometry(1, 48));
  const streakTexture = keep(makeStreakTexture());
  const foamTexture = keep(createFluidTexture("foam"));
  const localAnchors = [
    [0, 8, 57],
    [-10, 8.4, 50],
    [10, 9, 42],
    [-19, 8.2, 26],
    [18, 9.5, 19],
    [0, 8.6, 3],
    [-26, 9.4, -12],
    [25, 8.7, -18],
    [5, 10, -37],
    [-16, 8, -52],
    [33, 9.3, -68],
    [-40, 8.5, -92],
    [20, 10.2, -118],
    [-8, 9, -137],
    [40, 10.5, -176],
    [-45, 10, -218],
  ];
  const birdKinds = regionalBirds(regionId);
  for (let i = 0; i < 28; i += 1) {
    const species = birdKinds[i % 3 === 0 ? 1 : 0];
    const creature = createCreature(species.kind, species.length, i + 17);
    root.add(creature);
    const anchor = new THREE.Vector3(...(localAnchors[i] || [0, 9, 0]));
    birds.push({
      mesh: creature,
      species,
      flight: { point: new THREE.Vector3(), velocity: new THREE.Vector3() },
      anchor,
      phase: i * 1.7,
      cooldown: 0,
      ship:
        i >= localAnchors.length
          ? fleet.ships[(i - localAnchors.length) % fleet.ships.length]
          : null,
    });
  }
  const sun = new THREE.Mesh(
    keep(new THREE.SphereGeometry(13, 20, 12)),
    keep(new THREE.MeshBasicMaterial({ color: 0xffe9b5, fog: false })),
  );
  sun.position.set(-240, 155, -450);
  sun.visible = false;
  root.add(sun);
  const clouds = new THREE.Group();
  const cloudMaterial = keep(
    new THREE.SpriteMaterial({
      map: keep(createFluidTexture("mist")),
      color: 0xf4f3e7,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      fog: false,
    }),
  );
  for (let i = 0; i < 24; i += 1) {
    const cloud = new THREE.Sprite(cloudMaterial);
    cloud.position.set(
      Math.sin(i * 2.4) * 550,
      100 + (i % 4) * 22,
      Math.cos(i * 1.7) * 620,
    );
    cloud.scale.set(90 + (i % 3) * 32, 22 + (i % 4) * 4, 1);
    clouds.add(cloud);
  }
  clouds.visible = false;
  root.add(clouds);

  // 分散的细小白沫让水面可以辨识，实例化避免逐片绘制。
  const foamGeometry = keep(new THREE.PlaneGeometry(2, 2));
  foamGeometry.rotateX(-Math.PI / 2);
  const foamMaterial = keep(
    new THREE.MeshBasicMaterial({
      map: foamTexture,
      color: 0xe1eee7,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const foam = new THREE.InstancedMesh(foamGeometry, foamMaterial, 128);
  foam.name = "surface_whitecaps";
  foam.renderOrder = 2;
  foam.frustumCulled = false;
  root.add(foam);

  // 空中滴水池：破水后从虎鲸身上散落的水滴，只读状态不介入弹道积分。
  const dripMaterial = keep(
    new THREE.MeshBasicMaterial({
      color: 0xe4fbff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  );
  const dripCount = 26;
  const drips = new THREE.InstancedMesh(
    dropletGeometry,
    dripMaterial,
    dripCount,
  );
  drips.name = "airborne_drips";
  drips.renderOrder = 2;
  drips.frustumCulled = false;
  drips.visible = false;
  root.add(drips);
  const dripData = Array.from({ length: dripCount }, () => ({
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    size: 1,
  }));
  let dripCursor = 0,
    dripEmit = 0;

  function splash(point, length, landing) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xd8fbff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const veilMaterial = new THREE.MeshBasicMaterial({
      map: streakTexture,
      color: 0xc9f2fa,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const group = new THREE.Group();
    group.position.set(point.x, WORLD.surfaceY + 0.12, point.z);
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 2;
    group.add(ring);
    const ripple = new THREE.Mesh(rippleGeometry, veilMaterial);
    ripple.rotation.x = -Math.PI / 2;
    ripple.renderOrder = 2;
    group.add(ripple);
    const foamMaterial = material.clone();
    foamMaterial.map = foamTexture;
    const foamDisc = new THREE.Mesh(discGeometry, foamMaterial);
    foamDisc.rotation.x = -Math.PI / 2;
    foamDisc.renderOrder = 2;
    group.add(foamDisc);
    const sheet = new THREE.Mesh(sheetGeometry, veilMaterial);
    sheet.position.y = 0.5;
    sheet.renderOrder = 2;
    group.add(sheet);
    const droplets = new THREE.InstancedMesh(dropletGeometry, material, 26);
    droplets.renderOrder = 2;
    const particles = [];
    for (let i = 0; i < 26; i += 1) {
      const crown = i < 16;
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
      const rim = landing ? 1.1 : 0.72;
      particles.push({
        x: crown ? Math.cos(angle) * rim : (Math.random() - 0.5) * 0.5,
        y: crown ? 0.05 : 0.3,
        z: crown ? Math.sin(angle) * rim : (Math.random() - 0.5) * 0.5,
        vx: Math.cos(angle) * (crown ? 3.2 + Math.random() * 3.4 : 1.2),
        vy: (landing ? 4.6 : 3.1) + Math.random() * (crown ? 4.2 : 6.4),
        vz: Math.sin(angle) * (crown ? 3.2 + Math.random() * 3.4 : 1.2),
        size: crown ? 0.8 + Math.random() * 1.1 : 1.2 + Math.random() * 1.6,
      });
    }
    group.add(droplets);
    root.add(group);
    splashes.push({
      group,
      ring,
      ripple,
      foamDisc,
      sheet,
      droplets,
      particles,
      material,
      veilMaterial,
      foamMaterial,
      age: 0,
      life: 1.6,
      landing,
      scale: Math.min(5.5, length * 0.24),
    });
  }

  function move(
    dt,
    { position, previousPosition, forward, speed, boosting, length },
  ) {
    const previous =
      previousPosition ||
      lastPosition ||
      position.clone().addScaledVector(forward, -speed * dt);
    const result = stepSurface(state, dt, {
      previousPosition: previous,
      position,
      forward,
      speed,
      boosting,
      length,
      surfaceY: WORLD.surfaceY,
    });
    position.set(
      THREE.MathUtils.clamp(
        result.position.x,
        worldBounds.minX + 5,
        worldBounds.maxX - 5,
      ),
      result.position.y,
      THREE.MathUtils.clamp(
        result.position.z,
        worldBounds.minZ + 5,
        worldBounds.maxZ - 5,
      ),
    );
    if (position.x !== result.position.x) state.velocityX = 0;
    if (position.z !== result.position.z) state.velocityZ = 0;
    result.position = position;
    if (result.launched) {
      splash(position, length, false);
      audio.breach?.();
      notify("破浪跃起 · 空中保持惯性，接近海鸥即可捕食", 2.4);
    }
    if (result.landed) {
      splash(position, length, true);
      audio.splash?.();
    }
    lastPosition = position.clone();
    return result;
  }

  /**
   * 实体碰撞后去掉冲向船壳/礁石的惯性，防止空中每帧继续顶进障碍。
   * contacts 来自 resolveMotion；可选 position 用于同步下一帧的历史中心。
   */
  function applyCollision(contacts, position = null) {
    for (const { normal } of contacts) {
      const inward =
        state.velocityX * normal.x +
        state.velocityY * normal.y +
        state.velocityZ * normal.z;
      if (inward < 0) {
        state.velocityX -= normal.x * inward;
        state.velocityY -= normal.y * inward;
        state.velocityZ -= normal.z * inward;
      }
    }
    if (contacts.length) {
      // 被船底挡住的上冲不能积攒出下一次无条件起跳。
      state.chargeTime = 0;
      state.chargeDistance = 0;
    }
    if (position) lastPosition = position.clone();
  }

  function update(
    dt,
    time,
    player,
    position,
    camera,
    playing = true,
    highQuality = true,
  ) {
    const above = camera.position.y > WORLD.surfaceY;
    sun.visible = above && !night && !storm && !trench;
    clouds.visible = above && !night && !storm && !trench;
    nightSky?.update(time, position, { aboveWater: above, highQuality });
    fleet.update(time, position);
    for (const bird of birds) {
      bird.cooldown = Math.max(0, bird.cooldown - dt);
      if (isSwallowing?.(bird.mesh)) continue;
      if (bird.ship) {
        bird.anchor.copy(bird.ship.root.position);
        bird.anchor.y = WORLD.surfaceY + 5 + (bird.phase % 3);
      }
      const flight = sampleBirdFlight(bird, time, worldBounds, bird.flight);
      bird.mesh.position.copy(flight.point);
      bird.mesh.rotation.set(flight.pitch, flight.yaw, flight.bank, "YXZ");
      bird.mesh.visible =
        bird.cooldown <= 0 &&
        position.y > -45 &&
        bird.mesh.position.distanceTo(position) < 270;
      if (bird.mesh.visible) bird.mesh.userData.animate?.(time, 1.3);
      if (
        playing &&
        state.airborne &&
        bird.cooldown <= 0 &&
        bird.mesh.position.distanceTo(position) < player.length * 0.32 + 1.5 &&
        consumePrey(player, bird.species)
      ) {
        bird.cooldown = 35;
        bird.mesh.visible = false;
        audio.eat();
        onEat?.(bird.mesh.position, bird.species.length, bird);
        notify(
          message`捕食${bird.species.name} · ${player.lastMeal?.healed > 0 ? message`生命 +${Math.round(player.lastMeal.healed)}` : "空中猎食成功"}`,
          2,
        );
      }
    }
    foam.visible = position.y > -38;
    if (foam.visible) {
      const originX = Math.floor(position.x / 24) * 24;
      const originZ = Math.floor(position.z / 24) * 24;
      foamMaterial.opacity =
        0.28 + Math.min(0.12, Math.max(0, position.y) * 0.016);
      for (let i = 0; i < 128; i += 1) {
        const phase = i * 2.399;
        dummy.position.set(
          originX + ((i % 16) - 7.5) * 24 + Math.sin(phase) * 8,
          WORLD.surfaceY + 0.09 + Math.sin(time * 0.38 + phase) * 0.025,
          originZ + (Math.floor(i / 16) - 3.5) * 27 + Math.cos(phase) * 7,
        );
        dummy.rotation.set(0, phase, 0);
        const width = 1.2 + (i % 5) * 0.55;
        dummy.scale.set(
          width,
          1,
          width * (0.22 + Math.sin(time * 0.32 + phase) * 0.04),
        );
        dummy.updateMatrix();
        foam.setMatrixAt(i, dummy.matrix);
      }
      foam.instanceMatrix.needsUpdate = true;
    }
    for (let i = splashes.length - 1; i >= 0; i -= 1) {
      const effect = splashes[i];
      effect.age += dt;
      effect.life -= dt;
      const progress = effect.age / 1.6;
      effect.ring.scale.setScalar(effect.scale + effect.age * 8);
      effect.ripple.scale.setScalar(effect.scale * 0.55 + effect.age * 4.6);
      effect.foamDisc.scale.setScalar(
        Math.max(0.01, effect.scale * (0.8 + progress * 1.4)),
      );
      effect.foamMaterial.opacity = effect.material.opacity =
        Math.max(0, effect.life / 1.6) * 0.6;
      effect.foamDisc.position.y = 0.02;
      effect.sheet.scale.set(
        effect.scale * (0.55 + progress * 1.5),
        1 + effect.age * (effect.landing ? 1.4 : 2.6),
        effect.scale * (0.55 + progress * 1.5),
      );
      effect.sheet.position.y =
        0.5 +
        effect.age * (effect.landing ? 0.7 : 1.5) -
        progress * progress * 0.9;
      effect.sheet.rotation.y += dt * 0.7;
      effect.veilMaterial.opacity = Math.max(0, 0.42 - progress * 0.42);
      for (
        let particleIndex = 0;
        particleIndex < effect.particles.length;
        particleIndex += 1
      ) {
        const particle = effect.particles[particleIndex];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;
        particle.vy -= 12 * dt;
        dummy.position.set(particle.x, Math.max(-0.1, particle.y), particle.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(
          Math.max(
            0.01,
            effect.life * (particle.y < 0 ? 0.1 : 1) * particle.size,
          ),
        );
        dummy.updateMatrix();
        effect.droplets.setMatrixAt(particleIndex, dummy.matrix);
      }
      effect.droplets.instanceMatrix.needsUpdate = true;
      if (effect.life <= 0) {
        root.remove(effect.group);
        effect.material.dispose();
        effect.veilMaterial.dispose();
        effect.foamMaterial.dispose();
        effect.droplets.dispose();
        splashes.splice(i, 1);
      }
    }
    // 空中时从玩家位置散落水滴，落水后剩余水滴自然坠完。
    if (playing && state.airborne && position.y > WORLD.surfaceY + 0.4) {
      dripEmit -= dt;
      while (dripEmit <= 0) {
        dripEmit += 0.045;
        const d = dripData[dripCursor++ % dripCount];
        d.x = position.x + (Math.random() - 0.5) * 1.4;
        d.y = position.y - 0.4 - Math.random() * 0.8;
        d.z = position.z + (Math.random() - 0.5) * 1.4;
        d.vx = (Math.random() - 0.5) * 1.2;
        d.vy = -1 - Math.random() * 1.6;
        d.vz = (Math.random() - 0.5) * 1.2;
        d.life = 1.4;
        d.size = 0.5 + Math.random() * 1.1;
      }
    }
    let dripsActive = false;
    for (let i = 0; i < dripCount; i += 1) {
      const d = dripData[i];
      if (d.life <= 0) {
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0.001);
      } else {
        dripsActive = true;
        d.life -= dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        d.vy -= 9 * dt;
        if (d.y < WORLD.surfaceY - 0.25) d.life = 0;
        dummy.position.set(d.x, d.y, d.z);
        dummy.scale.setScalar(Math.max(0.05, Math.min(1, d.life)) * d.size);
      }
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      drips.setMatrixAt(i, dummy.matrix);
    }
    drips.visible = dripsActive;
    if (dripsActive) drips.instanceMatrix.needsUpdate = true;
  }

  function reset() {
    state = createSurfaceState();
    lastPosition = null;
    for (const bird of birds) {
      bird.cooldown = 0;
      bird.mesh.visible = false;
    }
    for (const effect of splashes) {
      root.remove(effect.group);
      effect.material.dispose();
      effect.veilMaterial.dispose();
      effect.foamMaterial.dispose();
      effect.droplets.dispose();
    }
    splashes.length = 0;
    for (const d of dripData) d.life = 0;
    drips.visible = false;
    dripEmit = 0;
    fleet.reset();
  }

  return {
    launchImpulse(velocity, position, length) {
      state.airborne = true;
      state.velocityX = velocity.x;
      state.velocityY = velocity.y;
      state.velocityZ = velocity.z;
      state.chargeTime = state.chargeDistance = 0;
      state.divingRequired = true;
      state.reentryRemaining = state.reentryLockRemaining = 0;
      position.y = Math.max(position.y, WORLD.surfaceY - length * 0.15 + 0.05);
    },
    get ghostThreat() {
      return fleet.danger ? { charging: fleet.charging } : null;
    },
    get danger() {
      return fleet.danger ?? false;
    },
    get ghost() {
      return fleet.ghost;
    },
    birds,
    ships: fleet.ships,
    colliders: fleet.colliders,
    updateColliders: fleet.update,
    onMovement: fleet.onMovement,
    applyCollision,
    move,
    update,
    reset,
    get airborne() {
      return state.airborne;
    },
    get charge() {
      return Math.min(1, state.chargeTime / 1.2, state.chargeDistance / 26);
    },
    get divingRequired() {
      return state.divingRequired;
    },
    dispose() {
      reset();
      fleet.dispose();
      nightSky?.dispose();
      scene.remove(root);
      foam.dispose();
      // 实例矩阵缓冲独立释放，共享水滴几何仍由资源集合统一管理。
      drips.dispose();
      for (const resource of resources) resource.dispose();
    },
  };
}

function makeStreakTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  // 竖向水纹条带，让水帘与涟漪有流动的丝状结构。
  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * 128;
    const width = 1 + Math.random() * 3.5;
    const alpha = 0.1 + Math.random() * 0.3;
    const gradient = context.createLinearGradient(x, 0, x, 64);
    gradient.addColorStop(0, tr`rgba(255,255,255,${alpha})`);
    gradient.addColorStop(0.7, tr`rgba(255,255,255,${alpha * 0.55})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(x - width / 2, 0, width, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}
