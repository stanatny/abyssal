import * as T from "three";

export const SCYLLA_SWIM = Object.freeze({
  pitchLimit: 0.38,
  turnRate: 1,
  pitchRate: 0.4,
  turnRadiusLengths: 0.5,
});
const attitude = new T.Euler(0, 0, 0, "YXZ");
const shortest = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** 六首厚躯按水平偏航转弯；正后方和垂直目标不能触发腹背翻转。 */
function swimAngles(orientation, direction, dt, turnRate, distance, length) {
  attitude.setFromQuaternion(orientation, "YXZ");
  const step = T.MathUtils.clamp(dt, 0, 0.12),
    horizontal = Math.hypot(direction.x, direction.z),
    yaw =
      horizontal > 1e-6 ? Math.atan2(-direction.x, -direction.z) : attitude.y,
    pitch = T.MathUtils.clamp(
      Math.atan2(direction.y, horizontal),
      -SCYLLA_SWIM.pitchLimit,
      SCYLLA_SWIM.pitchLimit,
    ),
    rate = Math.min(SCYLLA_SWIM.turnRate, Math.max(0, turnRate)),
    radius = Math.max(1, length * SCYLLA_SWIM.turnRadiusLengths),
    travel = Math.max(0, Number.isFinite(distance) ? distance : 0),
    // 慢速时不能仍按每秒一弧度转动：厚躯必须走出弧线，而非围着中心打转。
    yawStep = Math.min(rate * step, (travel * Math.cos(attitude.x)) / radius),
    pitchStep = Math.min(SCYLLA_SWIM.pitchRate * step, travel / radius);
  attitude.y += T.MathUtils.clamp(
    shortest(yaw - attitude.y),
    -yawStep,
    yawStep,
  );
  attitude.x += T.MathUtils.clamp(pitch - attitude.x, -pitchStep, pitchStep);
  attitude.z = 0;
}

/** 位移与身体共用同一姿态，保留游速而把直上直下变成缓坡游进。 */
export function steerScyllaSwim(
  out,
  orientation,
  direction,
  dt,
  turnRate = SCYLLA_SWIM.turnRate,
  distance = 0,
  length = 54,
) {
  swimAngles(orientation, direction, dt, turnRate, distance, length);
  const horizontal = Math.cos(attitude.x);
  return out.set(
    -Math.sin(attitude.y) * horizontal,
    Math.sin(attitude.x),
    -Math.cos(attitude.y) * horizontal,
  );
}

/** 只跟随实际通过碰撞检查的位移；停下蓄力/吐息时不让瞄准向量旋转躯干。 */
export function updateScyllaSwimAttitude(out, displacement, dt, length = 54) {
  const distance = displacement.length();
  if (!(dt > 0) || distance < 1e-7) return out;
  swimAngles(out, displacement, dt, SCYLLA_SWIM.turnRate, distance, length);
  return out.setFromEuler(attitude);
}

/** 先沿弧线把六首带到目标一侧，再进入固定站姿的吐息预警。 */
export function scyllaCanAim(orientation, direction) {
  attitude.setFromQuaternion(orientation, "YXZ");
  if (Math.hypot(direction.x, direction.z) < 1e-6) return true;
  return (
    Math.abs(shortest(Math.atan2(-direction.x, -direction.z) - attitude.y)) <=
    Math.PI / 3
  );
}

/** 十二鳍足沿身体依次推水，回桨收拢；动作时钟独立于攻击倍率。 */
export function bindScyllaSwim(root, motions, { bones, heads, feet, tail }) {
  const state = {
    clock: 0,
    stroke: 0,
    drive: 0,
    speed: null,
    attack: 0,
    windup: 0,
    attackAge: 0,
    phase: "dormant",
  };
  let previous;
  root.userData.aquaticUpright = true;
  root.userData.aquaticPitchLimit = SCYLLA_SWIM.pitchLimit;
  root.userData.scyllaSwim = state;
  root.userData.setBossPhase = (phase) => {
    if (phase !== state.phase) state.attackAge = 0;
    state.phase = phase;
  };
  root.userData.setSwimTravel = (distance, dt) => {
    if (dt > 0 && Number.isFinite(distance))
      state.speed = Math.max(0, distance / dt);
  };
  root.userData.resetSwimTravel = () => {
    state.clock =
      state.stroke =
      state.drive =
      state.attack =
      state.windup =
      state.attackAge =
        0;
    state.speed = null;
    state.phase = "dormant";
    previous = undefined;
  };
  motions.push((time, effort = 1) => {
    const dt =
      previous === undefined
        ? 0
        : T.MathUtils.clamp((time - previous) / (1.7 + effort * 1.1), 0, 0.12);
    previous = time;
    const target =
      state.speed === null
        ? T.MathUtils.clamp(effort * 0.65, 0, 1.3)
        : T.MathUtils.clamp(state.speed / 26, 0, 1.3);
    state.drive = T.MathUtils.damp(state.drive, target, 4, dt);
    state.attack = T.MathUtils.damp(
      state.attack,
      state.phase === "attack" ? 1 : 0,
      7,
      dt,
    );
    state.windup = T.MathUtils.damp(
      state.windup,
      state.phase === "windup" ? 1 : 0,
      5,
      dt,
    );
    state.clock += dt;
    // 巡游也需要清楚的推水节律；速度主要改变频率，不能把慢游动作压成静止。
    const moving = T.MathUtils.smoothstep(state.drive, 0.005, 0.08);
    state.stroke += dt * (1.65 + state.drive * 2.4);
    if (state.phase === "attack") state.attackAge += dt;
    for (let i = 0; i < heads.length; i++) {
      const h = heads[i],
        wave = state.stroke * 0.55 + i * 0.81,
        recoil =
          state.attack *
          Math.exp(-(((state.attackAge - i * 0.45 - 0.1) / 0.13) ** 2));
      for (let j = 0; j < h.ids.length; j++) {
        const b = bones[h.ids[j]];
        b.rotation.y =
          (Math.sin(wave - j * 0.55) * (0.045 + moving * 0.05)) / (j + 1);
        b.rotation.x =
          Math.sin(wave * 0.7 - j * 0.45) * (0.025 + moving * 0.03) -
          state.windup * 0.07 +
          recoil * 0.15 * (j === 0 ? 1 : 0.4);
        b.rotation.z = h.side * Math.sin(wave * 0.8) * 0.025;
      }
    }
    const active = 0.15 + moving * 0.85;
    for (const f of feet) {
      const phase = state.stroke - f.row * 0.72 + f.side * 0.08,
        cycle = (((phase / (Math.PI * 2)) % 1) + 1) % 1,
        power = cycle < 0.64,
        u = power ? cycle / 0.64 : (cycle - 0.64) / 0.36,
        eased = u * u * (3 - 2 * u),
        sweep = power ? 1 - 2 * eased : -1 + 2 * eased,
        recovery = power ? 0 : Math.sin(u * Math.PI),
        amplitude = active * (0.38 + state.drive * 0.03);
      bones[f.ids[0]].rotation.y = f.side * sweep * amplitude * 0.4;
      bones[f.ids[0]].rotation.z = f.side * recovery * active * 0.13;
      bones[f.ids[1]].rotation.y = f.side * sweep * amplitude * 0.8;
      bones[f.ids[1]].rotation.z = f.side * recovery * active * 0.24;
    }
    for (let j = 0; j < tail.ids.length; j++)
      bones[tail.ids[j]].rotation.y =
        (Math.sin(state.stroke - j * 0.55) *
          (0.04 + moving * 0.2 + state.drive * 0.035) *
          (j + 1)) /
        4;
  });
}
