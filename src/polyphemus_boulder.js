import * as THREE from "three";
import { POLYPHEMUS_COMBAT } from "./polyphemus_combat.js";
import rock from "./assets/models/bermuda_rock_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

export const BOULDER = Object.freeze({
  size: 10,
  gravity: 8,
  speed: POLYPHEMUS_COMBAT.projectileSpeed,
  release: 0.42,
  minFlightTime: POLYPHEMUS_COMBAT.minFlightTime,
  maxFlightTime: POLYPHEMUS_COMBAT.maxFlightTime,
  waveRadius: POLYPHEMUS_COMBAT.waveRadius,
  waveDuration: POLYPHEMUS_COMBAT.waveDuration,
  waveWidth: POLYPHEMUS_COMBAT.waveWidth,
  step: 0.05,
});
const UP = new THREE.Vector3(0, 1, 0);
const MARK_NORMAL = new THREE.Vector3(0, 0, 1);
/** 固定落点的有限抛物线；预警、实体轨迹和判定读取同一条曲线。 */
export function boulderFlight(origin, target, speed = BOULDER.speed) {
  const duration = THREE.MathUtils.clamp(
    origin.distanceTo(target) /
      (Number.isFinite(speed) && speed > 0 ? speed : BOULDER.speed),
    BOULDER.minFlightTime,
    BOULDER.maxFlightTime,
  );
  return {
    duration,
    origin: origin.clone(),
    velocity: target
      .clone()
      .sub(origin)
      .divideScalar(duration)
      .addScaledVector(UP, (BOULDER.gravity * duration) / 2),
  };
}
export function boulderPoint(flight, time, out = new THREE.Vector3()) {
  out.copy(flight.origin).addScaledVector(flight.velocity, time);
  out.y -= (BOULDER.gravity * time * time) / 2;
  return out;
}
/** 两个同时移动的中心进行相对扫掠，避免只检测末帧位置而漏掉交叉。 */
export function boulderContactTime(
  rockFrom,
  rockTo,
  playerFrom,
  playerTo,
  radius,
) {
  const x = rockFrom.x - playerFrom.x,
    y = rockFrom.y - playerFrom.y,
    z = rockFrom.z - playerFrom.z;
  const dx = rockTo.x - playerTo.x - x,
    dy = rockTo.y - playerTo.y - y,
    dz = rockTo.z - playerTo.z - z;
  const c = x * x + y * y + z * z - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy + dz * dz,
    b = 2 * (x * dx + y * dy + z * dz);
  const discriminant = b * b - 4 * a * c;
  if (a < 1e-12 || discriminant < 0) return null;
  const u = (-b - Math.sqrt(discriminant)) / (2 * a);
  return u >= 0 && u <= 1 ? u : null;
}
/** 已对准巨人只向当前前方160度投掷；瞄准扇区不代替独眼弱点判定。 */
export function polyphemusCanAim(quaternion, targetDirection) {
  const local = targetDirection
    .clone()
    .applyQuaternion(quaternion.clone().invert());
  const horizontal = Math.hypot(local.x, local.z);
  return (
    horizontal > 1e-6 && -local.z / horizontal >= Math.cos((Math.PI * 80) / 180)
  );
}

/** 玩家冲向巨像时，预判不能越过固定躯干；无效预判退回当前合法水层。 */
export function polyphemusThrowTarget(
  origin,
  quaternion,
  current,
  predicted,
  out = new THREE.Vector3(),
) {
  const forecast = predicted.clone().sub(origin);
  // 600米是新攻击的发现/起手范围；预判也不外推到该范围之外而被3秒钳制变相加速。
  return out.copy(
    forecast.length() <= POLYPHEMUS_COMBAT.engageRange &&
      polyphemusCanAim(quaternion, forecast)
      ? predicted
      : current,
  );
}

/** 每位巨人只有一块掌中岩石、一枚飞石和有限预警水浪；全部由共享帧驱动。 */
export function createPolyphemusBoulders(scene) {
  const geometry = decodeOrganicMesh(rock, null, (_x, _y, _z, c) =>
    c.set(0x9c9686),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  geometry.computeBoundingBox();
  const size = new THREE.Vector3(),
    center = new THREE.Vector3();
  geometry.boundingBox.getSize(size);
  geometry.boundingBox.getCenter(center);
  const extent = Math.max(...size.toArray());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / extent, 1 / extent, 1 / extent);
  geometry.computeBoundingSphere();
  const radius = geometry.boundingSphere.radius * BOULDER.size;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
  });
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/bermuda_rock_hf_color.webp",
          import.meta.url,
        ),
        colorSpace: THREE.SRGBColorSpace,
        apply(texture) {
          material.map = texture;
          material.vertexColors = false;
          material.needsUpdate = true;
        },
      },
    ],
    () => {},
  );
  prepare();
  const ringGeo = new THREE.TorusGeometry(1, 0.025, 5, 64),
    lineGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 25 }, () => new THREE.Vector3()),
    );
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xf0c683,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xd4f2e5,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const warningMat = new THREE.MeshBasicMaterial({
    color: 0xf0c683,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  // 四个稳定直角框与一次收拢环区分“追踪中”和“已锁定”，不以反复闪烁提示。
  const bracketPositions = [];
  const addBracketRectangle = (x0, y0, x1, y1) => {
    bracketPositions.push(
      x0,
      y0,
      0,
      x1,
      y0,
      0,
      x1,
      y1,
      0,
      x0,
      y0,
      0,
      x1,
      y1,
      0,
      x0,
      y1,
      0,
    );
  };
  for (const x of [-1, 1])
    for (const y of [-1, 1]) {
      addBracketRectangle(
        x * 0.77 - 0.23,
        y - 0.035,
        x * 0.77 + 0.23,
        y + 0.035,
      );
      addBracketRectangle(
        x - 0.035,
        y * 0.77 - 0.23,
        x + 0.035,
        y * 0.77 + 0.23,
      );
    }
  const bracketGeometry = new THREE.BufferGeometry();
  bracketGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(bracketPositions, 3),
  );
  bracketGeometry.computeBoundingSphere();
  const bracketMaterial = new THREE.MeshBasicMaterial({
    color: 0xffedc6,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const entries = new Map(),
    previous = new THREE.Vector3(),
    next = new THREE.Vector3(),
    palm = new THREE.Vector3(),
    playerA = new THREE.Vector3(),
    playerB = new THREE.Vector3(),
    impact = new THREE.Vector3(),
    lockDirection = new THREE.Vector3();
  let disposed = false;
  function register(entry) {
    if (
      !entry.mesh.userData.throwAnchor ||
      !entry.mesh.userData.getThrowAnchorWorldPosition
    )
      throw new Error("Polyphemus requires an actual posed palm anchor.");
    const held = new THREE.Mesh(geometry, material),
      flying = new THREE.Mesh(geometry, material),
      warning = new THREE.Line(lineGeo.clone(), lineMat.clone()),
      wave = new THREE.Mesh(new THREE.RingGeometry(0, 1, 64), ringMat.clone());
    const targetMaterial = warningMat.clone();
    const landing = new THREE.Mesh(ringGeo, targetMaterial),
      surge = new THREE.Mesh(ringGeo, targetMaterial),
      lockBrackets = new THREE.Mesh(bracketGeometry, bracketMaterial),
      lockFlash = new THREE.Mesh(ringGeo, warningMat.clone());
    lockFlash.material.color.setHex(0xffedc6);
    lockFlash.material.side = THREE.DoubleSide;
    held.name = "polyphemus_actual_palm_held_HF_rock";
    flying.name = "polyphemus_finite_HF_boulder";
    warning.name = "polyphemus_locked_throw_arc";
    wave.name = "polyphemus_impact_water_ring";
    landing.name = "polyphemus_actual_rock_radius_warning";
    surge.name = "polyphemus_maximum_water_ring_warning";
    lockBrackets.name = "polyphemus_committed_target_four_brackets";
    lockFlash.name = "polyphemus_target_commit_single_contraction";
    held.scale.setScalar(BOULDER.size / entry.state.species.length);
    flying.scale.setScalar(BOULDER.size);
    for (const ring of [wave, landing, surge, lockFlash])
      ring.rotation.x = -Math.PI / 2;
    lockBrackets.scale.setScalar(radius + 2);
    landing.scale.setScalar(radius);
    surge.scale.setScalar(BOULDER.waveRadius + BOULDER.waveWidth);
    for (const node of [
      flying,
      warning,
      wave,
      landing,
      surge,
      lockBrackets,
      lockFlash,
    ])
      node.visible = false;
    entry.mesh.userData.throwAnchor.add(held);
    scene.add(flying, warning, wave, landing, surge, lockBrackets, lockFlash);
    const data = {
      held,
      flying,
      warning,
      wave,
      landing,
      surge,
      lockBrackets,
      lockFlash,
      targetLock: {
        phase: "hidden",
        committed: false,
        position: new THREE.Vector3(),
        requestedTarget: new THREE.Vector3(),
        flashProgress: 1,
        flashActive: false,
      },
      flight: null,
      age: 0,
      waveAge: Infinity,
      hit: false,
      lastPhase: "",
      launched: false,
    };
    entries.set(entry, data);
    return data;
  }
  function clear(entry) {
    const data = entries.get(entry);
    if (!data) return;
    for (const key of [
      "held",
      "flying",
      "warning",
      "wave",
      "landing",
      "surge",
      "lockBrackets",
      "lockFlash",
    ])
      data[key].visible = false;
    hideTargetLock(data);
    data.flight = null;
    data.waveAge = Infinity;
    data.launched = false;
    data.hit = false;
    data.lastPhase = "";
  }
  function hideTargetLock(data) {
    data.lockBrackets.visible = data.lockFlash.visible = false;
    data.targetLock.phase = "hidden";
    data.targetLock.committed = false;
    data.targetLock.flashActive = false;
    data.targetLock.flashProgress = 1;
  }
  function updateTargetLock(data, entry) {
    const { state } = entry,
      cue = data.targetLock;
    const wasCommitted = cue.committed;
    if (!data.warning.visible && !data.flight) {
      hideTargetLock(data);
      return;
    }
    const window = state.species.lockWindow ?? POLYPHEMUS_COMBAT.lockWindow;
    const windup = state.phase === "windup";
    const committed =
      Boolean(data.flight) ||
      state.phase === "attack" ||
      (windup && state.timer >= state.phaseDuration - window - 1e-9);
    const lockAge = windup
      ? Math.max(0, state.timer - Math.max(0, state.phaseDuration - window))
      : window + Math.max(0, state.timer);
    cue.phase = data.flight ? "flight" : committed ? "locked" : "tracking";
    cue.committed = committed;
    cue.position.copy(data.landing.position);
    if (data.flight)
      boulderPoint(data.flight, data.flight.duration, cue.requestedTarget);
    else cue.requestedTarget.copy(entry.lockTarget);
    data.landing.material.color.setHex(committed ? 0xffedc6 : 0xf0c683);
    data.landing.material.opacity = committed ? 0.6 : 0.42;
    data.warning.material.color.setHex(committed ? 0xffedc6 : 0xf0c683);
    data.lockBrackets.visible = committed;
    data.lockBrackets.position.copy(cue.position);
    if (committed && !wasCommitted) {
      // 四角立面在锁定瞬间朝向来石方向，随后不再自转，普通追尾视角也能看清。
      lockDirection.copy(data.flight?.origin ?? palm).sub(cue.position);
      if (lockDirection.lengthSq() < 1e-8) lockDirection.copy(MARK_NORMAL);
      data.lockBrackets.quaternion.setFromUnitVectors(
        MARK_NORMAL,
        lockDirection.normalize(),
      );
    }
    // 同一阶段时钟只经过一次0.32秒收拢；暂停、跳帧和恢复都不另起计时器。
    const flashProgress = THREE.MathUtils.clamp(lockAge / 0.32, 0, 1);
    const eased = flashProgress * flashProgress * (3 - 2 * flashProgress);
    cue.flashProgress = committed ? flashProgress : 1;
    cue.flashActive = committed && flashProgress < 1;
    data.lockFlash.visible = cue.flashActive;
    data.lockFlash.position.copy(cue.position);
    data.lockFlash.scale.setScalar((radius + 2) * (1.75 - 0.7 * eased));
    data.lockFlash.material.opacity = 0.72 * (1 - eased);
  }
  function cover(from, to, blocked) {
    if (!blocked(from, to, radius)) return 1;
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      impact.copy(from).lerp(to, mid);
      if (blocked(from, impact, radius)) hi = mid;
      else lo = mid;
    }
    return lo;
  }
  function updateWave(data, dt, from, to, playerRadius, blocked, hit, damage) {
    if (!(data.waveAge < BOULDER.waveDuration) || !(dt > 0)) return;
    const last = data.waveAge / BOULDER.waveDuration;
    data.waveAge = Math.min(BOULDER.waveDuration, data.waveAge + dt);
    const progress = data.waveAge / BOULDER.waveDuration,
      r = progress * BOULDER.waveRadius;
    data.wave.visible = progress < 1;
    data.wave.material.opacity = 0.5 * (1 - progress);
    const attr = data.wave.geometry.attributes.position;
    const segmentCount = attr.count / 2 - 1;
    for (let i = 0; i < attr.count; i++) {
      const a = (2 * Math.PI * (i % (segmentCount + 1))) / segmentCount;
      const outer = i > segmentCount,
        edge = outer
          ? r + BOULDER.waveWidth
          : Math.max(0, r - BOULDER.waveWidth);
      attr.setXYZ(i, Math.cos(a) * edge, Math.sin(a) * edge, 0);
    }
    attr.needsUpdate = true;
    data.wave.geometry.computeBoundingSphere();
    const d = Math.hypot(
        to.x - data.wave.position.x,
        to.z - data.wave.position.z,
      ),
      low = last * BOULDER.waveRadius - BOULDER.waveWidth - playerRadius,
      high = r + BOULDER.waveWidth + playerRadius;
    if (
      !data.hit &&
      d >= low &&
      d <= high &&
      Math.abs(to.y - data.wave.position.y) < 5 + playerRadius &&
      !blocked(data.wave.position, to)
    ) {
      data.hit = true;
      hit(damage * 0.7, "巨岩冲击水浪命中 · 上下换层避开");
    }
  }
  function update(
    entry,
    dt,
    _time,
    from,
    to,
    { blocked = () => false, hit = () => false, active = true } = {},
  ) {
    if (disposed) return;
    if (entry.state.defeated || !entry.enabled) {
      clear(entry);
      return;
    }
    if (!active || !Number.isFinite(dt) || dt <= 0) return;
    const data = entries.get(entry) || register(entry),
      { state } = entry;
    if (state.phase !== data.lastPhase) {
      if (state.phase === "windup") data.launched = false;
      data.lastPhase = state.phase;
    }
    const progress = state.timer / Math.max(0.001, state.phaseDuration),
      windup = state.phase === "windup",
      attack = state.phase === "attack";
    data.held.visible =
      windup ||
      (attack && progress < BOULDER.release) ||
      state.phase === "dormant" ||
      state.phase === "hunt";
    data.warning.visible = windup || (attack && !data.launched);
    entry.mesh.updateWorldMatrix(true, true);
    entry.mesh.userData.getThrowAnchorWorldPosition(palm);
    if (data.warning.visible) {
      const f = boulderFlight(
          palm,
          entry.lockTarget,
          state.species.projectileSpeed,
        ),
        p = data.warning.geometry.attributes.position;
      let visibleDuration = f.duration;
      boulderPoint(f, 0, previous);
      for (let i = 1; i <= 12; i++) {
        boulderPoint(f, (f.duration * i) / 12, next);
        const fraction = cover(previous, next, blocked);
        if (fraction < 1) {
          visibleDuration = (f.duration * (i - 1 + fraction)) / 12;
          break;
        }
        previous.copy(next);
      }
      for (let i = 0; i < p.count; i++) {
        boulderPoint(f, (visibleDuration * i) / (p.count - 1), previous);
        p.setXYZ(i, previous.x, previous.y, previous.z);
      }
      p.needsUpdate = true;
      data.warning.geometry.computeBoundingSphere();
      boulderPoint(f, visibleDuration, data.landing.position);
      data.surge.position.copy(data.landing.position);
    }
    data.landing.visible = data.surge.visible =
      data.warning.visible || Boolean(data.flight);
    let elapsed = dt;
    if (attack && progress >= BOULDER.release && !data.launched) {
      data.launched = true;
      data.flight = boulderFlight(
        palm,
        entry.lockTarget,
        state.species.projectileSpeed,
      );
      data.age = 0;
      data.hit = false;
      data.flying.position.copy(palm);
      data.flying.visible = true;
      data.warning.visible = false;
      data.held.visible = false;
      elapsed = Math.min(
        dt,
        Math.max(0, state.timer - state.phaseDuration * BOULDER.release),
      );
    }
    const playerRadius = Math.max(0, entry.playerRadius || 0),
      moving = from.distanceTo(to) <= 100 * dt + 0.3;
    let consumed = 0;
    while (data.flight && elapsed > 1e-9) {
      const flight = data.flight,
        step = Math.min(elapsed, BOULDER.step, flight.duration - data.age);
      boulderPoint(flight, data.age, previous);
      boulderPoint(flight, data.age + step, next);
      const end = cover(previous, next, blocked),
        wall = end < 1;
      next.lerpVectors(previous, next, end);
      playerA.copy(moving ? from : to).lerp(to, consumed / dt);
      playerB.copy(moving ? from : to).lerp(to, (consumed + step * end) / dt);
      const contact = boulderContactTime(
        previous,
        next,
        playerA,
        playerB,
        radius + playerRadius,
      );
      if (contact !== null) {
        next.lerpVectors(previous, next, contact);
        if (!data.hit) {
          data.hit = true;
          hit(state.species.damage, "巨岩命中 · 变向或借石柱躲避");
        }
      }
      data.age += step;
      elapsed -= step;
      consumed += step;
      data.flying.position.copy(next);
      data.flying.rotation.x += step * 1.6;
      data.flying.rotation.z += step * 0.9;
      if (wall || contact !== null || data.age >= flight.duration - 1e-9) {
        data.wave.position.copy(next);
        data.waveAge = 0;
        data.flight = null;
        data.flying.visible = false;
        data.landing.visible = data.surge.visible = false;
      }
    }
    if (data.flight) {
      data.landing.visible = data.surge.visible = true;
    }
    if (data.waveAge < BOULDER.waveDuration)
      updateWave(
        data,
        elapsed,
        from,
        to,
        playerRadius,
        blocked,
        hit,
        state.species.damage,
      );
    else data.wave.visible = false;
    updateTargetLock(data, entry);
  }
  function reset() {
    for (const d of entries.values()) {
      for (const key of [
        "held",
        "flying",
        "warning",
        "wave",
        "landing",
        "surge",
        "lockBrackets",
        "lockFlash",
      ])
        d[key].removeFromParent();
      hideTargetLock(d);
      d.warning.geometry.dispose();
      d.warning.material.dispose();
      d.landing.material.dispose();
      d.lockFlash.material.dispose();
      d.wave.geometry.dispose();
      d.wave.material.dispose();
    }
    entries.clear();
  }
  return {
    update,
    reset,
    clear,
    prepare,
    radius,
    entries,
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      prepare.dispose();
      geometry.dispose();
      material.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      warningMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      bracketGeometry.dispose();
      bracketMaterial.dispose();
    },
  };
}
