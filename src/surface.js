import * as THREE from "three";
import { createCreature } from "./creatures.js";
import { WORLD } from "./world_config.js";
import { consumePrey } from "./simulation.js";

/** 管理破水抛物线、海鸥、海面天空与水花；游泳平移由主循环处理。 */
export function createSurface(scene, audio, notify) {
  const birds = [],
    splashes = [];
  let airborne = false,
    velocityY = 0,
    cooldown = 0;
  const ringGeometry = new THREE.RingGeometry(0.85, 1, 40);
  for (let i = 0; i < 20; i++) {
    const mesh = createCreature("seagull", 1.6, i + 17);
    scene.add(mesh);
    const anchor = new THREE.Vector3(
      ((i % 5) - 2) * 13,
      7 + (i % 3) * 1.3,
      70 - Math.floor(i / 5) * 32,
    );
    birds.push({ mesh, anchor, phase: i * 1.7, cooldown: 0 });
  }
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(13, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9b5, fog: false }),
  );
  sun.position.set(-240, 155, -450);
  scene.add(sun);
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xecf8fc,
    transparent: true,
    opacity: 0.72,
    fog: false,
  });
  const cloudGeo = new THREE.SphereGeometry(1, 9, 6);
  for (let i = 0; i < 24; i++) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    cloud.position.set(
      Math.sin(i * 2.4) * 550,
      100 + (i % 4) * 22,
      Math.cos(i * 1.7) * 620,
    );
    cloud.scale.set(42 + (i % 3) * 18, 5, 14);
    clouds.add(cloud);
  }
  scene.add(clouds);
  function splash(point) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xd8fbff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(point.x, WORLD.surfaceY + 0.12, point.z);
    scene.add(mesh);
    splashes.push({ mesh, life: 1.3 });
  }
  function move(dt, { position, forward, speed, boosting, length }) {
    cooldown = Math.max(0, cooldown - dt);
    const ceiling = WORLD.surfaceY - length * 0.15;
    if (
      !airborne &&
      boosting &&
      forward.y > 0.32 &&
      speed > 18 &&
      position.y >= ceiling - 1.8 &&
      cooldown <= 0
    ) {
      airborne = true;
      velocityY = 14 + forward.y * 10;
      position.y = Math.max(position.y, ceiling);
      splash(position);
      audio.breach?.();
      notify("破浪跃起 · 接近海鸥即可捕食", 2);
    }
    if (airborne) {
      velocityY -= 18 * dt;
      position.y += velocityY * dt - speed * forward.y * dt;
      if (position.y < ceiling && velocityY < 0) {
        airborne = false;
        position.y = ceiling;
        cooldown = 1.4;
        splash(position);
        audio.splash?.();
      }
    } else position.y = Math.min(position.y, ceiling);
    return { airborne, velocityY };
  }
  function update(dt, time, player, position, camera, playing = true) {
    const above = camera.position.y > WORLD.surfaceY;
    sun.visible = above;
    clouds.visible = above;
    for (const bird of birds) {
      bird.cooldown = Math.max(0, bird.cooldown - dt);
      bird.mesh.visible = bird.cooldown <= 0 && position.y > -10;
      bird.mesh.position.set(
        bird.anchor.x + Math.sin(time * 0.16 + bird.phase) * 8,
        bird.anchor.y + Math.sin(time * 0.65 + bird.phase) * 0.8,
        bird.anchor.z + Math.cos(time * 0.16 + bird.phase) * 9,
      );
      bird.mesh.rotation.y = -time * 0.16 - bird.phase;
      bird.mesh.userData.animate?.(time, 1.3);
      if (
        playing &&
        airborne &&
        bird.cooldown <= 0 &&
        bird.mesh.position.distanceTo(position) < player.length * 0.32 + 1.5 &&
        consumePrey(player, { length: 2.6, nutrition: 28, growth: 0.28 })
      ) {
        bird.cooldown = 35;
        bird.mesh.visible = false;
        audio.eat();
        notify(
          `捕食海鸥 · ${player.lastMeal?.healed > 0 ? "生命 +" + Math.round(player.lastMeal.healed) : "空中猎食成功"}`,
          2,
        );
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const p = splashes[i];
      p.life -= dt;
      p.mesh.scale.setScalar(2 + (1.3 - p.life) * 12);
      p.mesh.material.opacity = Math.max(0, p.life / 1.3) * 0.8;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        splashes.splice(i, 1);
      }
    }
  }
  return {
    birds,
    move,
    update,
    get airborne() {
      return airborne;
    },
    reset() {
      airborne = false;
      velocityY = 0;
      cooldown = 0;
      for (const bird of birds) bird.cooldown = 0;
    },
  };
}
