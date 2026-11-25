import * as THREE from "three";
import { ODYSSEY_ATTACKS } from "./odyssey_attack_rules.js";
import {
  KARKINOS_COMBAT,
  karkinosClawSweep,
  karkinosFaultSweep,
  updateKarkinosFaultField,
} from "./karkinos_combat.js";
const FRONT = new THREE.Vector3(0, 0, -1),
  UP = new THREE.Vector3(0, 1, 0);
/** 西方守卫专用效果不使用克拉肯的旋涡贴片、缠腕或遗迹符文。 */
export function isOdysseyAttack(species, ability) {
  return (
    !!species.western &&
    [
      "volley",
      "undertow",
      "surge",
      "claw",
      "fault",
      "tail_sweep",
      "boulder",
    ].includes(ability)
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
  if (ability === "tail_sweep") {
    // 贴着真实尾节提示蓄力；不画与碰撞无关的满屏攻击圈。
    for (let i = 0; i < 12; i++)
      mesh(new THREE.TorusGeometry(1, 0.045, 5, 20), `ladon_tail_warning_${i}`);
  } else if (ability === "volley") {
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
    buildKarkinosClawFx(fx, mesh);
  } else if (ability === "fault") {
    buildKarkinosFaultFx(fx, mesh);
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
  if (fx.ability === "tail_sweep") {
    fx.group.position.set(0, 0, 0);
    const anchors = e.mesh.userData.tailSweepAnchors || [];
    for (let i = 0; i < fx.parts.length; i++) {
      const m = fx.parts[i],
        anchor = anchors[i];
      m.visible = !!anchor;
      if (!anchor) continue;
      anchor.getWorldPosition(m.position);
      m.quaternion.copy(e.mesh.quaternion);
      m.scale.setScalar(
        (anchor.userData.radius || 0.012) * e.state.species.length + 0.65,
      );
      m.material.opacity = windup
        ? 0.06 + 0.16 * p
        : 0.07 * Math.sin(p * Math.PI);
    }
  } else if (fx.ability === "volley") {
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
    updateKarkinosClawFx(fx, e, windup, attack);
  } else if (fx.ability === "fault") {
    updateKarkinosFaultFx(fx, e, windup, attack, heightAt);
  }
}

function clawRing(halfAngle, radialSegments = 1) {
  return new THREE.RingGeometry(
    0,
    1,
    36,
    radialSegments,
    Math.PI / 2 - halfAngle,
    halfAngle * 2,
  );
}
function fillClawRing(geometry, near, far, halfAngle) {
  const p = geometry.attributes.position,
    count = 37;
  const radialSegments = p.count / count - 1;
  for (let i = 0; i < p.count; i++) {
    const angle = Math.PI / 2 - halfAngle + ((i % count) / 36) * halfAngle * 2;
    const radius =
      near + ((far - near) * Math.floor(i / count)) / radialSegments;
    p.setXYZ(i, Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  }
  p.needsUpdate = true;
  geometry.computeBoundingSphere();
}
function clawCurtain(halfAngle) {
  const geometry = new THREE.CylinderGeometry(
    1,
    1,
    1,
    36,
    2,
    true,
    Math.PI - halfAngle,
    halfAngle * 2,
  );
  const p = geometry.attributes.position,
    colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const edge = (i % 37) / 36;
    const intensity =
      (0.25 + 0.75 * Math.sin(edge * Math.PI)) *
      (Math.abs(p.getY(i)) < 0.1 ? 1 : 0.4);
    colors.fill(intensity, i * 3, i * 3 + 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
function buildKarkinosClawFx(fx, mesh) {
  const r = KARKINOS_COMBAT.claw;
  fx.clawSides = [-1, 1].map((side) => {
    const warning = mesh(clawRing(r.halfAngle), `claw_sweep_sector_${side}`);
    fillClawRing(warning.geometry, r.pressureStart, r.range, r.halfAngle);
    warning.rotation.x = -Math.PI / 2;
    const curtain = [0, 1].map((edge) => {
      const m = mesh(
        clawCurtain(r.halfAngle),
        `claw_actual_waterpressure_${side}_${edge}`,
      );
      m.material.color.set(0xb5e9df);
      m.material.vertexColors = true;
      return m;
    });
    const caps = [-1, 1].map((height) => {
      const m = mesh(
        clawRing(r.halfAngle),
        `claw_pressure_height_${side}_${height}`,
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = height * r.height;
      m.material.color.set(0x9bd7d3);
      return m;
    });
    const source = mesh(
      new THREE.CylinderGeometry(0.5, 0.8, 1, 6, 1, true),
      `claw_actual_tip_source_${side}`,
    );
    source.material.color.set(0xd7f0df);
    return { side, warning, curtain, caps, source };
  });
  fx.innerWarning = mesh(clawRing(r.innerHalfAngle), "claw_inner_sweep");
  fillClawRing(fx.innerWarning.geometry, 0, r.innerRange, r.innerHalfAngle);
  fx.innerWarning.rotation.x = -Math.PI / 2;
  fx.innerCurtain = mesh(
    clawCurtain(r.innerHalfAngle),
    "claw_inner_waterpressure",
  );
  fx.innerCurtain.material.vertexColors = true;
  fx.innerCurtain.material.color.set(0xb5e9df);
  fx.innerCurtain.scale.set(r.innerRange, r.innerHeight * 2, r.innerRange);
}
function updateKarkinosClawFx(fx, e, windup, attack) {
  const r = KARKINOS_COMBAT.claw,
    wave = karkinosClawSweep(e.state.timer);
  const base = Math.atan2(e.heading.x, -e.heading.z);
  const p = Math.min(1, e.state.timer / Math.max(0.001, e.state.phaseDuration));
  for (const row of fx.clawSides) {
    const angle = base + row.side * r.spread;
    row.warning.rotation.z = -angle;
    row.warning.material.opacity = windup ? 0.04 + p * 0.07 : 0.018;
    row.curtain.forEach((m, i) => {
      const radius = i ? wave.visibleFar : wave.visibleNear;
      m.rotation.y = -angle;
      m.scale.set(
        Math.max(0.001, radius),
        r.height * 2,
        Math.max(0.001, radius),
      );
      m.visible = attack && wave.visible && radius >= r.pressureStart;
      m.material.opacity = i ? 0.34 : 0.15;
    });
    for (const m of row.caps) {
      m.rotation.z = -angle;
      m.visible = windup || (attack && wave.visible);
      fillClawRing(
        m.geometry,
        windup ? r.pressureStart : wave.visibleNear,
        windup ? r.range : wave.visibleFar,
        r.halfAngle,
      );
      m.material.opacity = windup ? 0.025 : 0.14;
    }
    const anchor = e.mesh.userData.clawAnchors?.[row.side < 0 ? 0 : 1];
    row.source.visible =
      Boolean(anchor) &&
      (windup || (attack && e.state.timer < r.releaseTime + 0.14));
    if (row.source.visible) {
      anchor.getWorldPosition(fx.scratch);
      fx.scratch.sub(e.attackOrigin);
      fx.end.set(
        Math.sin(angle) * r.pressureStart,
        0,
        -Math.cos(angle) * r.pressureStart,
      );
      line(row.source, fx.scratch, fx.end);
      row.source.material.opacity = windup ? 0.15 : 0.6;
    }
  }
  fx.innerWarning.rotation.z = -base;
  fx.innerWarning.material.opacity = windup
    ? 0.055 + p * 0.045
    : wave.innerActive
      ? 0.16
      : 0;
  fx.innerCurtain.rotation.y = -base;
  fx.innerCurtain.visible = windup || (attack && wave.innerActive);
  fx.innerCurtain.material.opacity = windup ? 0.025 : 0.22;
}

/** 沿海床的封闭水压壳；几何和攻击缓冲只在创建时分配。 */
function faultVolume(along, across) {
  const columns = across + 1,
    rows = along + 1;
  const index = (y, z, x) => y * rows * columns + z * columns + x;
  const indices = [];
  const quad = (a, b, c, d) => indices.push(a, b, c, b, d, c);
  for (let z = 0; z < along; z++)
    for (let x = 0; x < across; x++) {
      quad(
        index(0, z, x),
        index(0, z, x + 1),
        index(0, z + 1, x),
        index(0, z + 1, x + 1),
      );
      quad(
        index(1, z, x),
        index(1, z + 1, x),
        index(1, z, x + 1),
        index(1, z + 1, x + 1),
      );
    }
  for (let z = 0; z < along; z++)
    for (const x of [0, across])
      quad(
        index(0, z, x),
        index(1, z, x),
        index(0, z + 1, x),
        index(1, z + 1, x),
      );
  for (let x = 0; x < across; x++)
    for (const z of [0, along])
      quad(
        index(0, z, x),
        index(0, z, x + 1),
        index(1, z, x),
        index(1, z, x + 1),
      );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(rows * columns * 2 * 3), 3),
  );
  const colors = new Float32Array(rows * columns * 2 * 3);
  for (let y = 0; y <= 1; y++)
    for (let z = 0; z <= along; z++)
      for (let x = 0; x <= across; x++) {
        const strength = 0.28 + 0.72 * Math.sin((x / across) * Math.PI);
        colors.fill(strength, index(y, z, x) * 3, index(y, z, x) * 3 + 3);
      }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.userData.faultGrid = { along, across };
  return geometry;
}
function fillFaultVolume(
  geometry,
  origin,
  direction,
  near,
  far,
  heightAt,
  roundedCenter = null,
) {
  const r = KARKINOS_COMBAT.fault,
    { along, across } = geometry.userData.faultGrid;
  const p = geometry.attributes.position,
    columns = across + 1,
    rows = along + 1;
  for (let z = 0; z <= along; z++) {
    const distance = near + ((far - near) * z) / along;
    for (let x = 0; x <= across; x++) {
      const width =
        roundedCenter === null
          ? r.radius
          : r.radius *
            Math.sqrt(
              Math.max(0, 1 - ((distance - roundedCenter) / r.thickness) ** 2),
            );
      const side = -width + (width * 2 * x) / across;
      const xx = origin.x + direction.x * distance - direction.z * side;
      const zz = origin.z + direction.z * distance + direction.x * side;
      const floor = heightAt(xx, zz);
      for (let y = 0; y <= 1; y++)
        p.setXYZ(
          y * rows * columns + z * columns + x,
          xx - origin.x,
          floor + r.floorOffset + (y ? 1 : -1) * r.height - origin.y,
          zz - origin.z,
        );
    }
  }
  p.needsUpdate = true;
  geometry.computeBoundingSphere();
}
function buildKarkinosFaultFx(fx, mesh) {
  fx.faultLanes = Array.from({ length: 3 }, (_, i) => {
    const warning = mesh(faultVolume(30, 4), `reef_fault_actual_warning_${i}`);
    const crest = mesh(
      faultVolume(4, 8),
      `reef_fault_actual_pressure_volume_${i}`,
    );
    warning.material.vertexColors = crest.material.vertexColors = true;
    crest.material.color.set(0xb7e3d7);
    return { warning, crest };
  });
}
function updateKarkinosFaultFx(fx, e, windup, attack, heightAt) {
  const r = KARKINOS_COMBAT.fault;
  const field =
    e.karkinosFaultField ??
    updateKarkinosFaultField(
      fx.faultField,
      e.attackOrigin,
      e.heading,
      heightAt,
      undefined,
    );
  const changed = fx.faultField !== field;
  fx.faultField = field;
  const p = Math.min(1, e.state.timer / Math.max(0.001, e.state.phaseDuration));
  for (let i = 0; i < 3; i++) {
    const direction = field.lanes[i],
      row = fx.faultLanes[i];
    if (changed)
      fillFaultVolume(
        row.warning.geometry,
        e.attackOrigin,
        direction,
        0,
        direction.reach + r.thickness,
        heightAt,
      );
    row.warning.material.opacity = windup ? 0.012 + p * 0.018 : 0.008;
    const wave = karkinosFaultSweep(e.state.timer, 0, i, direction.reach);
    row.crest.visible = attack && wave.visible;
    if (row.crest.visible) {
      fillFaultVolume(
        row.crest.geometry,
        e.attackOrigin,
        direction,
        Math.max(0, wave.front - r.thickness),
        Math.min(direction.reach + r.thickness, wave.front + r.thickness),
        heightAt,
        wave.front,
      );
      const remaining =
        (direction.reach + r.thickness - wave.age * r.speed) / r.thickness;
      row.crest.material.opacity = 0.23 * Math.min(1, Math.max(0, remaining));
    }
  }
}
