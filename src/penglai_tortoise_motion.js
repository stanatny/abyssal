import * as THREE from "three";

/** 厚甲龟以前桨成对推水、后桨稳向；实例状态独立，不能随技能倍率原地踏步。 */
export function bindPenglaiTortoiseMotion(
  root,
  motions,
  limbs,
  head,
  serpentHead,
) {
  const state = {
    strokePhase: 0,
    drive: 0,
    brace: 0,
    speed: 0,
    worldTravel: false,
  };
  let previousTime,
    guarded = false;
  root.userData.aquaticUpright = true;
  root.userData.aquaticPitchLimit = 0.22;
  root.userData.tortoiseSwimRig = { state, limbs };
  root.userData.setSwimTravel = (distance, dt) => {
    if (!(dt > 0) || !Number.isFinite(distance)) return;
    state.worldTravel = true;
    state.speed = Math.max(0, distance) / dt;
  };
  root.userData.resetSwimTravel = () => {
    state.strokePhase = state.drive = state.brace = state.speed = 0;
    state.worldTravel = false;
    guarded = false;
    previousTime = undefined;
  };
  root.userData.setBossPhase = (phase) => {
    guarded = phase === "windup" || phase === "attack";
  };
  motions.push((t, effort) => {
    // 共用工厂已累积推进相位，这里还原活跃秒数，避免技能切换改变划水节奏。
    const dt =
      previousTime === undefined
        ? 0
        : Math.max(
            0,
            Math.min(0.12, (t - previousTime) / (1.7 + effort * 1.1)),
          );
    previousTime = t;
    const target = state.worldTravel
      ? Math.min(1.4, state.speed / Math.max(1, root.userData.length * 0.25))
      : Math.min(1.4, effort * 0.75);
    state.drive = THREE.MathUtils.damp(state.drive, target, 4, dt);
    state.brace = THREE.MathUtils.damp(state.brace, guarded ? 1 : 0, 4.5, dt);
    state.strokePhase += dt * (0.7 + state.drive * 2.55);
    const sprint = THREE.MathUtils.smoothstep(state.drive, 0.55, 1.2);
    for (const { limb, wrist, side, hind } of limbs) {
      const phase =
        state.strokePhase +
        (hind ? Math.PI + side * 0.1 : side * 0.07 * (1 - sprint));
      const cycle = (((phase / (Math.PI * 2)) % 1) + 1) % 1;
      const power = cycle < 0.58;
      const progress = power ? cycle / 0.58 : (cycle - 0.58) / 0.42;
      const eased = progress * progress * (3 - 2 * progress);
      const recovery = power ? 0 : Math.sin(progress * Math.PI);
      const activity = THREE.MathUtils.smoothstep(state.drive, 0.025, 0.3);
      const amplitude =
        (0.012 +
          activity *
            (hind
              ? (0.09 + state.drive * 0.035) * (1 - sprint * 0.3)
              : 0.25 + state.drive * 0.15)) *
        (1 - state.brace * 0.94);
      const sweep = (power ? 1 - eased * 2 : -1 + eased * 2) * amplitude;
      // 双前桨向后推水，后桨延后稳向；加速时同步收紧，不能像四足交替踏步。
      limb.rotation.y =
        side * ((hind ? -0.08 : 0.04) + sweep - state.brace * 0.12);
      limb.rotation.z =
        side *
        (0.62 +
          recovery * activity * 0.18 -
          sprint * 0.035 +
          state.brace * 0.22);
      limb.rotation.x = recovery * activity * (hind ? 0.025 : 0.05);
      wrist.rotation.y =
        -side * sweep * 0.3 + side * recovery * activity * 0.12;
      wrist.rotation.x =
        recovery * activity * (hind ? 0.28 : 0.7) + state.brace * 0.08;
    }
    head.rotation.x =
      Math.sin(state.strokePhase * 0.32) * 0.012 * (1 - state.brace * 0.7);
    serpentHead.rotation.y = Math.sin(state.strokePhase * 0.37) * 0.055;
    serpentHead.rotation.x = Math.sin(state.strokePhase * 0.45) * 0.04;
  });
}
