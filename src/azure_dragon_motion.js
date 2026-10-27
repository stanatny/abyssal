import * as T from "three";

/** 蛇形游曳的幻想飞行适配：后传的全身曲率，而非一串同向微摆。 */
export function createAzureDragonMotion(root, bones, axial, head, legs) {
  const state = { phase: 0, drive: 0, speed: 0, worldTravel: false };
  const distances = [0];
  for (let i = 1; i < axial.points.length; i++) {
    const a = axial.points[i - 1],
      b = axial.points[i];
    distances.push(distances[i - 1] + Math.hypot(...b.map((v, j) => v - a[j])));
  }
  const along = distances.map((d) => d / distances.at(-1));
  const absolute = axial.ids.map(() => new T.Quaternion());
  const previousInverse = new T.Quaternion(),
    euler = new T.Euler(0, 0, 0, "YXZ");
  root.userData.azureUndulation = state;
  root.userData.setSwimTravel = (distance, dt) => {
    if (!(dt > 0) || !Number.isFinite(distance)) return;
    state.worldTravel = true;
    state.speed = Math.max(0, distance) / dt;
  };
  root.userData.resetSwimTravel = () => {
    Object.assign(state, { phase: 0, drive: 0, speed: 0, worldTravel: false });
  };
  return (dt, effort, brace) => {
    const target = state.worldTravel
      ? Math.min(1.4, state.speed / Math.max(1, root.userData.length * 0.34))
      : Math.min(1.4, effort * 0.8);
    state.drive = T.MathUtils.damp(state.drive, target, 3.5, dt);
    state.phase += dt * (1.2 + state.drive * 1.8);
    const activity =
      0.32 + 0.68 * T.MathUtils.smoothstep(state.drive, 0.03, 0.75);
    for (let i = 0; i < axial.ids.length; i++) {
      const u = along[i],
        wave = state.phase - u * Math.PI * 2.1;
      // 使用绝对切线，再转成相邻骨的局部差；避免长链累积成僵硬 C 形。
      const yaw = Math.cos(wave) * (0.16 + u * 0.96) * activity;
      const pitch = Math.sin(wave - 0.65) * (0.045 + u * 0.28) * activity;
      absolute[i].setFromEuler(euler.set(pitch, yaw, 0, "YXZ"));
      const q = bones[axial.ids[i]].quaternion;
      if (i)
        q.copy(previousInverse.copy(absolute[i - 1]).invert()).multiply(
          absolute[i],
        );
      else q.copy(absolute[i]);
    }
    bones[axial.ids[0]].position.x = Math.sin(state.phase) * 0.012 * activity;
    bones[axial.ids[0]].position.y =
      axial.points[0][1] + Math.sin(state.phase - 0.8) * 0.009 * activity;
    // 颈部抵消胸段朝向，维持瞄准稳定；爪随躯干承重骨运动，只作轻微收放。
    bones[head.ids[0]].quaternion.copy(absolute[0]).invert();
    bones[head.ids[1]].rotation.x =
      -brace * 0.035 + Math.sin(state.phase) * 0.018 * (1 - brace);
    for (const c of legs) {
      const wave = state.phase - (c.front ? 0 : 2.8);
      bones[c.ids[0]].rotation.y =
        c.side * (0.08 * state.drive + 0.06 * Math.sin(wave));
      bones[c.ids[0]].rotation.z = c.side * 0.035 * activity * Math.cos(wave);
      bones[c.ids[1]].rotation.x =
        -0.12 * state.drive + 0.055 * Math.sin(wave - 0.45) - brace * 0.04;
    }
  };
}
