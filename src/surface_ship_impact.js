import * as THREE from "three";
import { bodyRadius, castSegment, isPositionBlocked } from "./collision.js";
import { createFluidTexture } from "./effect_textures.js";
import { createImpactState, HUMAN_RULES, stepImpact } from "./human_rules.js";
import { WORLD } from "./world_config.js";

/**
 * 为真实船壳添加共享冲撞状态、损伤与有限沉没效果；不自行创建动画循环。
 * @param {THREE.Scene} scene 特效所属场景。
 * @param {object[]} ships 保留原模型与航线的船只元数据。
 * @param {object[]} colliders 原地维护的动态碰撞数组。
 * @param {object} options worldColliders、castWorld、onImpact 和 onContact 回调。
 * @returns {object} onMovement/update/reset/dispose；update 在航线姿态写入后、碰撞坐标同步前调用。
 */
export function createSurfaceShipImpact(
  scene,
  ships,
  colliders,
  {
    worldColliders = [],
    castWorld = (from, to, radius) =>
      castSegment(from, to, worldColliders, radius),
    onImpact,
    onContact,
  } = {},
) {
  const root = new THREE.Group();
  root.name = "surface_ship_impact";
  scene.add(root);
  const resources = new Set();
  const keep = (resource) => (resources.add(resource), resource);
  const foam = keep(createFluidTexture("foam"));
  foam.wrapS = foam.wrapT = THREE.RepeatWrapping;
  foam.repeat.set(3, 3);
  const streams = keep(makeWaterCurtainTexture());
  const plumeGeometry = keep(makeWaterCurtainGeometry());
  const rippleGeometry = keep(new THREE.RingGeometry(0.93, 1, 48));
  const splinterGeometry = keep(makeSplinterGeometry());
  const tornGeometry = keep(makeTornGeometry());
  const tornMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: "#071c23",
      roughness: 0.96,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  const edgeMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: "#9f8463",
      roughness: 0.91,
      side: THREE.DoubleSide,
    }),
  );
  const woodMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#9d7650", roughness: 0.91 }),
  );
  const metalMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: "#36515c",
      roughness: 0.73,
      metalness: 0.25,
    }),
  );
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const local = new THREE.Vector3();
  const inverse = new THREE.Quaternion();
  const planeNormal = new THREE.Vector3(0, 0, 1);
  let disposed = false;

  const records = ships.map((ship) => {
    const fx = new THREE.Group();
    fx.name = `${ship.kind}_impact_water`;
    fx.visible = false;
    root.add(fx);
    const waterMaterial = keep(
      new THREE.MeshBasicMaterial({
        color: "#d3eff0",
        map: streams,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const rippleMaterial = keep(
      new THREE.MeshBasicMaterial({
        color: "#dbf1ed",
        map: foam,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    ripple.rotation.x = -Math.PI / 2;
    fx.add(ripple);
    const curtains = Array.from({ length: 4 }, (_, index) => {
      const mesh = new THREE.Mesh(plumeGeometry, waterMaterial);
      mesh.rotation.y = (index * Math.PI) / 4;
      mesh.rotation.z = (index % 2 ? 1 : -1) * 0.2;
      fx.add(mesh);
      return mesh;
    });
    const splinters = Array.from({ length: 7 }, (_, index) => {
      const mesh = new THREE.Mesh(
        splinterGeometry,
        ship.kind === "cruise" ? metalMaterial : woodMaterial,
      );
      mesh.visible = false;
      fx.add(mesh);
      return { mesh, angle: index * 2.39996 + ship.phase, reach: 0, size: 0 };
    });
    const scars = Array.from({ length: ship.length > 24 ? 3 : 1 }, () => {
      const scar = new THREE.Group();
      scar.name = "ship_hull_damage";
      scar.visible = false;
      const edge = new THREE.Mesh(
        tornGeometry,
        ship.kind === "cruise" ? metalMaterial : edgeMaterial,
      );
      const tear = new THREE.Mesh(tornGeometry, tornMaterial);
      tear.scale.set(0.8, 0.82, 1);
      tear.position.z = 0.025;
      scar.add(edge, tear);
      ship.root.add(scar);
      return scar;
    });
    const record = {
      ship,
      hulls: ship.colliders.filter((collider) => collider.kind === "ship_hull"),
      fx,
      waterMaterial,
      rippleMaterial,
      ripple,
      curtains,
      splinters,
      scars,
      impactAt: -Infinity,
      destroyedAt: Infinity,
      sinkPosition: new THREE.Vector3(),
      sinkRotation: new THREE.Euler(),
      side: 1,
      strength: 1,
    };
    ship.impact = record;
    return record;
  });

  /** 物理推开前扫掠完整鱼身；speed 必须是本帧真实移动速度，now 使用游戏时钟。 */
  function onMovement(player, previous, desired, forward, options = {}) {
    if (disposed || player.dead || player.won || player.timedOut) return [];
    const { speed = 0, now = player.elapsed || 0 } = options;
    const contacts = [];
    const radius = bodyRadius(player.length);
    direction.copy(forward).normalize();
    for (const record of records) {
      const { ship, hulls } = record;
      if (ship.state.destroyed) continue;
      const hit = sweepHull(
        previous,
        desired,
        direction,
        player.length,
        radius,
        hulls,
      );
      const clear = bodyClearOfHull(
        previous,
        direction,
        player.length,
        radius,
        hulls,
      );
      const newContact = hit && (ship.state.armed || clear);
      const result = stepImpact(ship.state, {
        touching: Boolean(hit),
        clear,
        speed,
        length: player.length,
        now,
      });
      if (!result.hit) {
        if (newContact)
          onContact?.({
            entry: ship,
            length: player.length,
            speed,
            now,
            requiredLength: HUMAN_RULES.impactLength,
            requiredSpeed: HUMAN_RULES.impactSpeed,
          });
        continue;
      }
      const position = new THREE.Vector3()
        .copy(hit.point)
        .addScaledVector(hit.normal, -radius);
      markDamage(record, position, hit.normal, now, result.destroyed);
      if (result.destroyed) {
        ship.collidable = false;
        // 保持公共数组身份，主循环在本次冲撞之后读取最新实体列表。
        for (let index = colliders.length - 1; index >= 0; index--)
          if (ship.colliders.includes(colliders[index]))
            colliders.splice(index, 1);
        record.destroyedAt = now;
        record.sinkPosition.copy(ship.root.position);
        record.sinkRotation.copy(ship.root.rotation);
        if (ship.wake) ship.wake.visible = false;
      }
      ship.root.userData.health = ship.state.health;
      const event = {
        kind: "surface_ship",
        entry: ship,
        ...result,
        health: ship.state.health,
        maxHealth: ship.state.maxHealth,
        position,
        normal: new THREE.Vector3().copy(hit.normal),
      };
      contacts.push(event);
      onImpact?.(event);
    }
    return contacts;
  }

  function sweepHull(previous, desired, forward, length, radius, hulls) {
    const dx = desired.x - previous.x;
    const dy = desired.y - previous.y;
    const dz = desired.z - previous.z;
    // 停在壳边不会把冲刺标志当成实际撞击；离壳运动也不计入新冲撞。
    if (Math.hypot(dx, dy, dz) < 1e-7) return null;
    const extent = Math.max(0, length * 0.42 - radius);
    const count = Math.max(
      4,
      Math.min(12, Math.ceil((extent * 2) / Math.max(radius * 1.3, 0.5))),
    );
    let earliest = null;
    for (let index = 0; index <= count; index++) {
      const offset = -extent + (extent * 2 * index) / count;
      from.copy(previous).addScaledVector(forward, offset);
      to.copy(desired).addScaledVector(forward, offset);
      const hit = castSegment(from, to, hulls, radius);
      if (
        !hit ||
        hit.time <= 1e-7 ||
        dx * hit.normal.x + dy * hit.normal.y + dz * hit.normal.z >= -1e-7
      )
        continue;
      const wall = castWorld(from, to, radius);
      if (wall && wall.time < hit.time - 1e-7) continue;
      if (!earliest || hit.time < earliest.time) earliest = hit;
    }
    return earliest;
  }

  function markDamage(record, position, hitNormal, now, destroyed) {
    const { ship, scars } = record;
    const damageIndex = ship.state.maxHealth - ship.state.health - 1;
    const scar = scars[damageIndex];
    ship.root.updateWorldMatrix(true, false);
    local.copy(position);
    ship.root.worldToLocal(local);
    inverse.copy(ship.root.quaternion).invert();
    normal.copy(hitNormal).applyQuaternion(inverse).normalize();
    scar.position
      .copy(local)
      .addScaledVector(normal, 0.04 + damageIndex * 0.025);
    scar.quaternion.setFromUnitVectors(planeNormal, normal);
    scar.rotateZ(damageIndex * 0.17);
    const size = Math.min(2.4, ship.width * 0.4) * (1 + damageIndex * 0.2);
    scar.scale.set(size, size * 0.63, size);
    scar.visible = true;
    record.side = local.x < 0 ? -1 : 1;
    record.impactAt = now;
    record.strength = destroyed ? 1.45 : 1;
    record.fx.position.set(position.x, WORLD.surfaceY + 0.08, position.z);
    record.fx.rotation.y = Math.atan2(hitNormal.x, hitNormal.z);
    record.fx.visible = true;
    for (const splinter of record.splinters) {
      splinter.mesh.visible = destroyed;
      splinter.reach = 1.8 + (splinter.angle % 2.4) * 0.7;
      splinter.size =
        (ship.kind === "cruise" ? 0.75 : 0.5) +
        (Math.sin(splinter.angle) + 1) * 0.18;
    }
  }

  /** 仅使用游戏时钟推进已有资源，暂停时相同时钟给出相同姿态。 */
  function update(time, playerPosition = null) {
    if (disposed) return;
    for (const record of records) {
      const { ship } = record;
      const age = Math.max(0, time - record.impactAt);
      if (ship.state.destroyed) {
        const sinkAge = Math.max(0, time - record.destroyedAt);
        const duration = ship.length > 24 ? 5.4 : 4.4;
        const t = Math.min(1, sinkAge / duration);
        const capsize = smooth(Math.min(1, sinkAge / 2.5));
        ship.root.position.copy(record.sinkPosition);
        ship.root.position.y -= t * t * (ship.length > 24 ? 18 : 12);
        ship.root.rotation.copy(record.sinkRotation);
        ship.root.rotation.z +=
          record.side * capsize * (ship.length > 24 ? 0.95 : 1.65);
        ship.root.rotation.x -= t * 0.18;
        ship.root.visible =
          t < 1 &&
          (!playerPosition ||
            ship.root.position.distanceTo(playerPosition) < 500);
        if (ship.lanternLight) ship.lanternLight.intensity = 0;
        if (ship.glowMaterial) ship.glowMaterial.opacity = 0;
      } else {
        const damage = 1 - ship.state.health / ship.state.maxHealth;
        ship.root.rotation.z +=
          record.side * damage * 0.05 +
          (Number.isFinite(age)
            ? record.side * Math.sin(age * 12) * Math.exp(-age * 3.5) * 0.045
            : 0);
      }
      const life = age / 2.3;
      record.fx.visible = life < 1;
      if (!record.fx.visible) continue;
      const onset = Math.min(1, age * 12);
      record.waterMaterial.opacity = onset * Math.max(0, 1 - life) ** 2 * 0.76;
      record.rippleMaterial.opacity = onset * Math.max(0, 1 - life) * 0.5;
      record.ripple.scale.setScalar(1 + age * 4.5 * record.strength);
      for (let index = 0; index < record.curtains.length; index++) {
        const curtain = record.curtains[index];
        const height =
          (0.65 + Math.sin(Math.min(1, age / 1.3) * Math.PI) * 2.5) *
          record.strength;
        curtain.position.set(
          Math.sin(index * 2.4) * age * 0.9,
          height * 0.35,
          Math.cos(index * 2.4) * age * 0.9,
        );
        curtain.scale.set((1.8 + age * 2.1) * record.strength, height, 1);
      }
      for (const splinter of record.splinters) {
        if (!splinter.mesh.visible) continue;
        const flight = Math.min(age, 0.85);
        splinter.mesh.position.set(
          Math.cos(splinter.angle) * splinter.reach * age,
          Math.max(0.02, flight * 2.4 - flight * flight * 2.8) +
            Math.sin(time * 2.3 + splinter.angle) * 0.035,
          Math.sin(splinter.angle) * splinter.reach * age,
        );
        splinter.mesh.rotation.set(
          age * 1.3,
          splinter.angle + age * 0.7,
          age * 0.8,
        );
        splinter.mesh.scale.set(
          splinter.size,
          splinter.size,
          splinter.size * (1 - life * life),
        );
      }
    }
  }

  /** 重开创建全新耐久，原地恢复动态碰撞数组并清除所有损伤与水面残留。 */
  function reset() {
    if (disposed) return;
    colliders.length = 0;
    for (const record of records) {
      const { ship } = record;
      ship.state = createImpactState(ship.length > 24 ? 3 : 1);
      ship.root.userData.health = ship.state.health;
      ship.collidable = true;
      ship.root.visible = true;
      if (ship.wake) ship.wake.visible = true;
      colliders.push(...ship.colliders);
      record.impactAt = -Infinity;
      record.destroyedAt = Infinity;
      record.side = 1;
      record.fx.visible = false;
      for (const scar of record.scars) scar.visible = false;
      for (const splinter of record.splinters) splinter.mesh.visible = false;
    }
  }

  /** 从场景移除专属特效并仅释放一次，不处理原船只共享建模资源。 */
  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(root);
    colliders.length = 0;
    for (const record of records)
      for (const scar of record.scars) record.ship.root.remove(scar);
    for (const resource of resources) resource.dispose();
    resources.clear();
  }

  reset();
  return { root, onMovement, update, reset, dispose };
}

/**
 * 检查完整躯干是否已离开船壳，可供水面船与潜艇共享独立冲撞的重武装条件。
 * @param {object} position 角色中心位置，不修改输入。
 * @param {object} forward 躯干方向，将按单位方向采样。
 * @param {number} length 实际体长。
 * @param {number} radius 实际躯干碰撞半径，不包含离壳余量。
 * @param {object[]|object} colliders 目标船壳数组或单个碰撞体。
 * @param {number} margin 重武装前额外离壳距离，默认 4 米。
 * @returns {boolean} 每个真实躯干采样球均与扩张船壳分离才返回 true。
 */
export function bodyClearOfHull(
  position,
  forward,
  length,
  radius,
  colliders,
  margin = 4,
) {
  const targets = Array.isArray(colliders) ? colliders : [colliders];
  const extent = Math.max(0, length * 0.42 - radius);
  const count = Math.max(
    4,
    Math.min(12, Math.ceil((extent * 2) / Math.max(radius * 1.3, 0.5))),
  );
  const magnitude = Math.hypot(forward.x, forward.y, forward.z) || 1;
  // 保持真实躯干采样位置再加离壳余量；直接增大 bodyRadius 会缩短首尾偏移。
  for (let index = 0; index <= count; index++) {
    const offset = (-extent + (extent * 2 * index) / count) / magnitude;
    const point = {
      x: position.x + forward.x * offset,
      y: position.y + forward.y * offset,
      z: position.z + forward.z * offset,
    };
    if (
      isPositionBlocked(point, { colliders: targets, radius: radius + margin })
    )
      return false;
  }
  return true;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function makeWaterCurtainGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1, 16, 8);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const height = positions.getY(index) + 0.5;
    const scallop =
      0.87 + Math.sin(x * 29) * 0.08 + Math.sin(x * 47 + 1) * 0.05;
    positions.setY(index, height * scallop - 0.5);
    positions.setZ(index, Math.sin(x * 13 + height * 4) * height * 0.045);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeWaterCurtainTexture() {
  const width = 128;
  const height = 64;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const stream =
        (0.5 +
          0.5 *
            Math.sin(
              u * 145 +
                Math.sin(u * 29) * 2 +
                v * 6 +
                Math.sin(v * 13 + u * 40) * 1.8,
            )) **
        18;
      const fine = (0.5 + 0.5 * Math.sin(u * 317 + v * 3)) ** 18;
      const edge = Math.sin(u * Math.PI) ** 0.55;
      const tip = Math.sin(v * Math.PI) ** 0.6;
      const broken = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(u * 13 + v * 31)) ** 2;
      const alpha = Math.min(
        1,
        (stream * 0.65 + fine * 0.25) * edge * tip * broken,
      );
      const offset = (y * width + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeTornGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.54, -0.1);
  for (const [x, y] of [
    [-0.32, -0.37],
    [-0.1, -0.27],
    [0.07, -0.44],
    [0.25, -0.25],
    [0.55, -0.13],
    [0.37, 0.05],
    [0.49, 0.24],
    [0.2, 0.19],
    [0.08, 0.43],
    [-0.13, 0.26],
    [-0.4, 0.34],
    [-0.33, 0.09],
  ])
    shape.lineTo(x, y);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function makeSplinterGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.12, -0.045, -0.7, 0.12, -0.045, -0.52, 0.08, -0.045, 0.75, -0.09,
        -0.045, 0.46, -0.12, 0.045, -0.7, 0.12, 0.045, -0.52, 0.08, 0.045, 0.75,
        -0.09, 0.045, 0.46,
      ],
      3,
    ),
  );
  geometry.setIndex([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2,
    3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}
