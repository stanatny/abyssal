import * as THREE from "three";
import { ODYSSEY_ATTACKS } from "./odyssey_attack_rules.js";
const FRONT = new THREE.Vector3(0, 0, -1),
  UP = new THREE.Vector3(0, 1, 0);
/** 西方守卫专用效果不使用克拉肯的旋涡贴片、缠腕或遗迹符文。 */
export function isOdysseyAttack(species, ability) {
  return (
    !!species.western &&
    ["volley", "undertow", "surge", "claw", "fault"].includes(ability)
  );
}

/** 为每种技能预分配有限几何，交给共享战斗循环及其资源清理。 */
export function createOdysseyAttackFx(scene, ability, color, species) {
  const group = new THREE.Group();
  group.name = `odyssey_${ability}_telegraph`;
  group.visible = false;
  scene.add(group);
  const fx = {
    group,
    ability,
    odyssey: true,
    parts: [],
    scratch: new THREE.Vector3(),
    end: new THREE.Vector3(),
  };
  const mat = (opacity = 0.2) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      // 加法特效不混入实体雾色，避免半透明警戒区变成灰色硬面片。
      fog: false,
    });
  const mesh = (geo, name) => {
    const m = new THREE.Mesh(geo, mat());
    m.name = name;
    group.add(m);
    fx.parts.push(m);
    return m;
  };
  if (ability === "volley") {
    for (let i = 0; i < 6; i++) {
      mesh(new THREE.TorusGeometry(1, 0.055, 6, 32), `scylla_mouth_seal_${i}`);
      mesh(
        new THREE.CylinderGeometry(0.035, 0.1, 1, 6, 1, true),
        `scylla_locked_water_lane_${i}`,
      );
    }
  } else if (ability === "undertow") {
    // 漏斗朝巨口正前方，而非铺满周围海床的旋转漩涡。
    for (let i = 0; i < 14; i++)
      mesh(
        new THREE.CylinderGeometry(0.08, 0.25, 1, 5, 1, true),
        `maw_intake_ribbon_${i}`,
      );
    for (let i = 0; i < 3; i++)
      mesh(new THREE.TorusGeometry(1, 0.045, 5, 56), `maw_cone_warning_${i}`);
  } else if (ability === "surge") {
    const geometry = new THREE.PlaneGeometry(1, 1, 32, 8);
    const p = geometry.attributes.position;
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      p.setZ(i, Math.sin(p.getX(i) * Math.PI * 2) * 0.06);
      const fade =
        Math.max(0, Math.cos(p.getX(i) * Math.PI)) ** 0.6 *
        Math.max(0, Math.cos(p.getY(i) * Math.PI)) ** 0.7;
      colors.fill(fade, i * 3, i * 3 + 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    mesh(geometry, "locked_tidal_wall").material.vertexColors = true;
    for (let i = 0; i < 3; i++)
      mesh(
        new THREE.TorusGeometry(1, 0.012, 5, 56, Math.PI),
        "tidal_wall_crest",
      );
  } else if (ability === "claw") {
    for (let i = 0; i < 2; i++) {
      const r = ODYSSEY_ATTACKS.claw;
      const m = mesh(
        new THREE.RingGeometry(
          0.12,
          1,
          36,
          2,
          Math.PI / 2 - r.halfAngle,
          r.halfAngle * 2,
        ),
        `claw_sweep_sector_${i}`,
      );
      m.rotation.x = -Math.PI / 2;
      const edge = mesh(
        new THREE.TorusGeometry(1, 0.014, 5, 40, r.halfAngle * 2),
        `claw_sweep_edge_${i}`,
      );
      edge.rotation.x = -Math.PI / 2;
    }
    const r = ODYSSEY_ATTACKS.claw;
    const inner = mesh(
      new THREE.RingGeometry(
        0.04,
        1,
        40,
        2,
        Math.PI / 2 - r.innerHalfAngle,
        r.innerHalfAngle * 2,
      ),
      "claw_inner_sweep",
    );
    inner.rotation.x = -Math.PI / 2;
    const rim = mesh(
      new THREE.TorusGeometry(1, 0.015, 5, 44, r.innerHalfAngle * 2),
      "claw_inner_edge",
    );
    rim.rotation.x = -Math.PI / 2;
  } else if (ability === "fault") {
    for (let i = 0; i < 3; i++) {
      mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1, 5),
        `reef_fault_warning_${i}`,
      );
      mesh(new THREE.IcosahedronGeometry(1, 1), `reef_fault_pressure_${i}`);
    }
  }
  fx.update = (entry, dt, time, windup, attack, heightAt) =>
    update(fx, entry, dt, time, windup, attack, heightAt);
  return fx;
}
function line(mesh, a, b) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  const d = (mesh.userData.direction ||= new THREE.Vector3());
  d.copy(b).sub(a);
  mesh.scale.y = d.length();
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
}
/** 视觉读取同一攻击起点与锁定方向，预警不会扩大实际伤害。 */
function update(fx, e, dt, time, windup, attack, heightAt) {
  fx.group.visible = windup || attack;
  if (!fx.group.visible) return;
  const p = Math.min(1, e.state.timer / e.state.phaseDuration),
    r = ODYSSEY_ATTACKS[fx.ability];
  fx.group.position.copy(e.attackOrigin);
  fx.group.quaternion.identity();
  if (fx.ability === "volley") {
    fx.group.position.set(0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const seal = fx.parts[i * 2],
        path = fx.parts[i * 2 + 1];
      const mouth = e.mesh.userData.mouthAnchors?.[i];
      if (!mouth) continue;
      mouth.getWorldPosition(fx.scratch);
      seal.position.copy(fx.scratch);
      seal.quaternion.copy(e.mesh.quaternion);
      seal.scale.setScalar(2.5 + p * 2);
      seal.material.opacity = windup ? 0.18 + p * 0.2 : 0;
      line(path, fx.scratch, e.lockTarget);
      path.material.opacity = windup ? 0.045 + p * 0.025 : 0;
    }
  } else if (fx.ability === "undertow") {
    fx.group.quaternion.setFromUnitVectors(FRONT, e.heading);
    for (let i = 0; i < 14; i++) {
      const m = fx.parts[i],
        a = (i * Math.PI * 2) / 14;
      const u = attack ? 1 - ((time * 0.7 + i / 14) % 1) : 0.85;
      const z = u * r.range,
        rad = Math.tan(r.halfAngle) * z * 0.73;
      m.position.set(Math.cos(a) * rad, Math.sin(a) * rad, -z);
      fx.scratch.copy(m.position).multiplyScalar(-1).normalize();
      m.quaternion.setFromUnitVectors(UP, fx.scratch);
      m.scale.set(1, attack ? 6 : 2, 1);
      m.material.opacity = attack ? 0.26 * (1 - u) : 0.055 + p * 0.08;
    }
    for (let i = 0; i < 3; i++) {
      const m = fx.parts[14 + i],
        z = r.range * (0.3 + i * 0.32);
      m.position.set(0, 0, -z);
      m.scale.setScalar(Math.tan(r.halfAngle) * z * 0.73);
      m.material.opacity = windup ? 0.06 + p * 0.08 : 0.035;
    }
  } else if (fx.ability === "surge") {
    fx.group.quaternion.setFromUnitVectors(FRONT, e.heading);
    const distance = attack
      ? Math.min(r.range, e.state.timer * r.speed)
      : r.range;
    const wall = fx.parts[0];
    wall.position.z = -distance;
    wall.scale.set(r.width, r.height, 1);
    wall.material.opacity = attack
      ? 0.09 * Math.sin(p * Math.PI)
      : 0.025 + p * 0.035;
    for (let i = 1; i < 4; i++) {
      const m = fx.parts[i];
      m.position.set(0, (i - 2) * 4, -distance + 0.6 * (i - 1));
      m.scale.set(r.width * 0.5, r.height * 0.5, 1);
      m.rotation.z = time * 0.12;
      m.material.opacity = attack
        ? 0.33 * Math.sin(p * Math.PI)
        : 0.12 + p * 0.15;
    }
  } else if (fx.ability === "claw") {
    const base = Math.atan2(e.heading.x, -e.heading.z);
    for (let i = 0; i < 2; i++) {
      const a = base + (i ? 1 : -1) * r.spread;
      const sector = fx.parts[i * 2],
        edge = fx.parts[i * 2 + 1];
      sector.rotation.z = -a;
      sector.scale.setScalar(r.range);
      sector.material.opacity = windup
        ? 0.06 + p * 0.08
        : 0.13 * Math.sin(p * Math.PI);
      edge.rotation.z = Math.PI / 2 - a - r.halfAngle;
      edge.scale.setScalar(r.range * (attack ? 0.25 + p * 0.75 : 1));
      edge.material.opacity = attack ? 0.4 : 0.22;
    }
    const inner = fx.parts[4],
      rim = fx.parts[5];
    inner.rotation.z = -base;
    inner.scale.setScalar(r.innerRange);
    inner.material.opacity = windup
      ? 0.07 + p * 0.07
      : 0.16 * Math.sin(p * Math.PI);
    rim.rotation.z = Math.PI / 2 - base - r.innerHalfAngle;
    rim.scale.setScalar(r.innerRange);
    rim.material.opacity = windup ? 0.2 : 0.38 * Math.sin(p * Math.PI);
  } else if (fx.ability === "fault") {
    const a = Math.atan2(e.heading.x, -e.heading.z);
    for (let i = 0; i < 3; i++) {
      const angle = a + (i - 1) * r.spread,
        dx = Math.sin(angle),
        dz = -Math.cos(angle);
      const start = fx.scratch.set(
        e.attackOrigin.x,
        e.attackOrigin.y,
        e.attackOrigin.z,
      );
      const end = fx.end.set(
        start.x + dx * r.range,
        heightAt(start.x + dx * r.range, start.z + dz * r.range) + 8,
        start.z + dz * r.range,
      );
      // 根组只平移，故每条线都使用同一局部地层高度。
      const beam = fx.parts[i * 2];
      line(beam, start, end);
      beam.position.sub(e.attackOrigin);
      beam.material.opacity = windup ? 0.12 + p * 0.1 : 0.04;
      const age = e.state.timer - i * r.interval,
        travel = Math.min(r.range, Math.max(0, age) * r.speed);
      const wave = fx.parts[i * 2 + 1],
        x = start.x + dx * travel,
        z = start.z + dz * travel;
      wave.position.set(x - start.x, heightAt(x, z) + 8 - start.y, z - start.z);
      wave.scale.set(r.radius, r.height * 0.6, r.radius * 0.65);
      wave.rotation.y = angle;
      wave.material.opacity =
        attack && age >= 0 ? 0.22 * (1 - travel / r.range) : 0;
    }
  }
}
