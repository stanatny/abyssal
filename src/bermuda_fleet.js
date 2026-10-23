import { createBermudaOilRig } from "./bermuda_oil_rig.js";
import { acquireBermudaFleetAsset } from "./bermuda_fleet_asset.js";
import * as THREE from "three";
import { bermudaMaterials } from "./bermuda_geometry.js";
import { createSurfaceShipImpact } from "./surface_ship_impact.js";
import { castSegment } from "./collision.js";
import { stormWaveHeight } from "./bermuda_water.js";
import { createFlyingDutchman } from "./bermuda_dutchman.js";
import { createCannonEffects } from "./bermuda_cannon_effects.js";
import { takeDamage } from "./simulation.js";
import { isNursery } from "./nursery_rules.js";
import { BERMUDA_HAZARDS } from "./bermuda_hazard_rules.js";

/** 风暴外海船队、海底支撑钻井与幽灵三桅帆船；统一时钟与实体船壳。 */
export function createBermudaFleet(parent, options = {}) {
  const root = new THREE.Group();
  root.name = "bermuda_fleet";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    m = bermudaMaterials(keep),
    colliders = [];
  const ships = [
    makeFreighter("storm_freighter", 120, 23, m, keep),
    makeFreighter("storm_tanker", 145, 27, m, keep),
  ];
  ships.forEach((ship, i) => {
    ship.anchor = new THREE.Vector3(i ? 125 : -85, 4, i ? -660 : -365);
    ship.phase = i * 2 + 0.6;
    ship.kind = "cruise";
    ship.label = i ? "风暴远洋油轮" : "钢岬号货轮";
    root.add(ship.root);
  });
  const ghost = createFlyingDutchman(m, keep);
  root.add(ghost.root);
  ghost.anchor = new THREE.Vector3(-172, 4, -265);
  ghost.heading = 0;
  ghost.phase = 1.4;
  ghost.label = "飞翔的荷兰人号";
  const all = [...ships, ghost];
  for (const ship of all) {
    ship.colliders = ship.localColliders.map((spec, i) => ({
      id: `${ship.root.name}_${i}`,
      type: "box",
      kind: "ship_hull",
      owner: "ship",
      x: 0,
      y: 0,
      z: 0,
      halfSize: new THREE.Vector3(...spec.size).multiplyScalar(0.5),
      rotation: new THREE.Quaternion(),
      localCenter: new THREE.Vector3(...spec.center),
    }));
    colliders.push(...ship.colliders);
  }
  const rig = createBermudaOilRig(m, keep, options.heightAt);
  root.add(rig.root);
  colliders.push(...rig.colliders);
  const impact = createSurfaceShipImpact(parent, ships, colliders, options);
  const shotGeometry = keep(new THREE.SphereGeometry(1, 12, 8)),
    shotMaterial = keep(
      new THREE.MeshBasicMaterial({
        color: 0x8cebd2,
        transparent: true,
        opacity: 0.9,
      }),
    );
  const shots = Array.from({ length: 10 }, () => {
    const mesh = new THREE.Mesh(shotGeometry, shotMaterial);
    mesh.visible = false;
    root.add(mesh);
    return {
      mesh,
      velocity: new THREE.Vector3(),
      previous: new THREE.Vector3(),
      life: 0,
      remaining: 0,
    };
  });
  const warningMaterial = keep(
    new THREE.MeshBasicMaterial({
      color: 0x69edc5,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const warning = new THREE.Mesh(
    keep(new THREE.RingGeometry(11.5, 12.2, 64)),
    warningMaterial,
  );
  warning.rotation.x = -Math.PI / 2;
  warning.visible = false;
  root.add(warning);
  const target = new THREE.Vector3(),
    temp = new THREE.Vector3(),
    muzzle = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    effects = createCannonEffects(root, keep);
  const worldZ = new THREE.Vector3(0, 0, 1);
  const coverColliders = colliders.filter((c) => !ghost.colliders.includes(c));
  let windup = -1,
    nextAttack = 0,
    clock = 0,
    danger = false,
    disposed = false;
  function sync(ship) {
    ship.root.updateMatrixWorld(true);
    for (const collider of ship.colliders) {
      temp.copy(collider.localCenter).applyMatrix4(ship.root.matrixWorld);
      collider.x = temp.x;
      collider.y = temp.y;
      collider.z = temp.z;
      collider.rotation.copy(ship.root.quaternion);
    }
  }
  function update(time, position) {
    if (disposed) return;
    clock = time;
    ships.forEach((ship, i) => {
      const angle = time * 0.005 + ship.phase;
      ship.root.position.copy(ship.anchor);
      ship.root.position.x += Math.sin(angle) * 32;
      ship.root.position.z += Math.cos(angle) * 52;
      ship.root.rotation.set(
        0,
        Math.atan2(32 * Math.cos(angle), 52 * Math.sin(angle)) + Math.PI,
        0,
      );
      ship.root.position.y +=
        stormWaveHeight(ship.root.position.x, ship.root.position.z, time) *
        0.55;
      ship.root.rotation.x = Math.sin(time * 0.48 + i) * 0.022;
      ship.root.rotation.z = Math.sin(time * 0.39 + i) * 0.032;
      ship.heading = ship.root.rotation.y;
    });
    const angle = time * 0.007 + ghost.phase;
    ghost.root.position.copy(ghost.anchor);
    ghost.root.position.x += Math.sin(angle) * 32;
    ghost.root.position.z += Math.cos(angle) * 32;
    ghost.root.rotation.y = angle;
    ghost.root.position.y +=
      stormWaveHeight(ghost.root.position.x, ghost.root.position.z, time) * 0.6;
    ghost.root.rotation.x = Math.sin(time * 0.52) * 0.026;
    ghost.root.rotation.z = Math.sin(time * 0.41) * 0.035;
    ghost.heading = angle;
    ghost.captain.update(time, windup >= 0);
    ghost.sails.forEach((sail, i) => {
      sail.rotation.z = Math.sin(time * 0.7 + i) * 0.025;
    });
    impact.update(time, position);
    all.forEach(sync);
    warning.visible = windup >= 0;
    warningMaterial.opacity =
      windup >= 0 ? 0.35 + Math.sin(time * 9) * 0.12 : 0;
    warning.position.copy(target);
    warning.position.y = Math.max(-40, target.y);
    root.updateMatrixWorld(true);
  }
  function onMovement(player, previous, position, forward, input = {}) {
    impact.onMovement(player, previous, position, forward, input);
    const now = input.now ?? clock,
      dt = Math.min(0.1, Math.max(0, now - lastStep));
    lastStep = now;
    danger =
      !isNursery(position) &&
      position.y > -BERMUDA_HAZARDS.ghostEscapeDepth &&
      ghost.root.position.distanceTo(position) < BERMUDA_HAZARDS.ghostRange;
    if (!danger) windup = -1;
    if (danger && windup < 0 && now >= nextAttack) {
      target.copy(position);
      windup = now;
      nextAttack = now + BERMUDA_HAZARDS.ghostCooldown;
      options.notify?.("飞翔的荷兰人号 · 死亡齐射蓄势，立即深潜或转向！", 2.5);
      options.audio?.ghostWarning?.();
    }
    // 蓄力前段跟随目标，最后0.6秒固定落点；普通慢游不能自动躲掉整轮，冲刺仍有反应窗口。
    if (
      windup >= 0 &&
      now - windup < BERMUDA_HAZARDS.ghostWindup - BERMUDA_HAZARDS.ghostLockLead
    )
      target.copy(position);
    if (windup >= 0 && now - windup >= BERMUDA_HAZARDS.ghostWindup) {
      const side = position.x < ghost.root.position.x ? -1 : 1;
      const ports = ghost.muzzles.filter((p) => Math.sign(p.x) === side);
      for (let i = 0; i < 5; i++) {
        const shot = shots.find((s) => s.life <= 0);
        if (!shot) break;
        muzzle
          .copy(ports[i % ports.length])
          .applyMatrix4(ghost.root.matrixWorld);
        shot.mesh.scale.set(1.2, 1.2, 5);
        shot.mesh.position.copy(muzzle);
        shot.previous.copy(muzzle);
        direction.copy(target);
        direction.x += (i - 2) * 6;
        shot.velocity.copy(direction).sub(muzzle);
        shot.remaining = shot.velocity.length();
        shot.velocity
          .normalize()
          .multiplyScalar(BERMUDA_HAZARDS.ghostShotSpeed);
        shot.mesh.quaternion.setFromUnitVectors(
          worldZ,
          temp.copy(shot.velocity).normalize(),
        );
        shot.life = 4.8;
        shot.mesh.visible = true;
        effects.emit(muzzle, true);
      }
      options.audio?.ghostShot?.();
      windup = -1;
    }
    for (const shot of shots) {
      if (shot.life <= 0) continue;
      shot.previous.copy(shot.mesh.position);
      const travel = Math.min(
        BERMUDA_HAZARDS.ghostShotSpeed * dt,
        shot.remaining,
      );
      shot.mesh.position.addScaledVector(
        shot.velocity,
        travel / BERMUDA_HAZARDS.ghostShotSpeed,
      );
      shot.life -= dt;
      const staticBlock = options.castWorld?.(
        shot.previous,
        shot.mesh.position,
        1.4,
      );
      const dynamicBlock = castSegment(
        shot.previous,
        shot.mesh.position,
        coverColliders,
        1.4,
      );
      const obstructed =
        staticBlock && dynamicBlock
          ? staticBlock.time < dynamicBlock.time
            ? staticBlock
            : dynamicBlock
          : staticBlock || dynamicBlock;
      shot.remaining -= travel;
      const segment = direction.copy(shot.mesh.position).sub(shot.previous),
        distance = segment.length();
      const projection =
        distance > 0
          ? Math.max(
              0,
              Math.min(
                1,
                temp.copy(position).sub(shot.previous).dot(shot.velocity) /
                  BERMUDA_HAZARDS.ghostShotSpeed /
                  distance,
              ),
            )
          : 0;
      muzzle.copy(shot.previous).lerp(shot.mesh.position, projection);
      const hit =
        !isNursery(position) &&
        muzzle.distanceTo(position) < player.length * 0.13 + 2.2;
      if (hit || obstructed || shot.remaining <= 0 || shot.life <= 0) {
        if (obstructed && (!hit || obstructed.time <= projection))
          shot.mesh.position
            .copy(shot.previous)
            .lerp(shot.mesh.position, obstructed.time);
        else if (hit) shot.mesh.position.copy(muzzle);
        shot.life = 0;
        effects.emit(shot.mesh.position);
        const splashHit =
          !isNursery(position) &&
          shot.mesh.position.distanceTo(position) <
            BERMUDA_HAZARDS.ghostBlastRadius + player.length * 0.13;
        const cover =
          options.castWorld?.(shot.mesh.position, position, 0.1) ||
          castSegment(shot.mesh.position, position, coverColliders, 0.1);
        if (
          splashHit &&
          !cover &&
          takeDamage(player, BERMUDA_HAZARDS.ghostDamage)
        ) {
          options.audio?.hit?.();
          options.onDamage?.();
          options.notify?.("荷兰人号炮击 · 深潜离开死亡齐射！", 2.5);
        }
      }
      shot.mesh.visible = shot.life > 0;
    }
    effects.update(dt);
  }
  let lastStep = 0;
  function reset() {
    impact.reset();
    effects.reset();
    windup = -1;
    nextAttack = 0;
    lastStep = 0;
    danger = false;
    shots.forEach((s) => {
      s.life = 0;
      s.mesh.visible = false;
    });
    warning.visible = false;
    update(0);
  }
  reset();
  return {
    root,
    ships,
    ghost,
    rig,
    colliders,
    update,
    onMovement,
    reset,
    get charging() {
      return windup >= 0;
    },
    get danger() {
      return danger;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      impact.dispose();
      root.removeFromParent();
      for (const r of resources) r.dispose();
      resources.clear();
      colliders.length = 0;
      root.clear();
    },
  };
}

function makeFreighter(name, length, width, m, keep) {
  const root = new THREE.Group();
  root.name = name;
  const asset = acquireBermudaFleetAsset(name);
  // 缓存与场景资源分离：释放租约，不能直接销毁仍在另一场景使用的表面。
  keep({ dispose: asset.release });
  const body = new THREE.Mesh(asset.geometry, asset.material);
  body.name = `${name}_hf_surface`;
  body.scale.setScalar(length);
  root.add(body);
  root.userData.artRevision = "bermuda-storm-fleet-hf-20261023";
  root.userData.shipArt = { body };
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  const localColliders = [
    { center: [0, -2, 0], size: [width, 10, length * 0.82] },
  ];
  return { root, length, width, localColliders };
}
