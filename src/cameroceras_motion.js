import * as THREE from "three";

/** 直壳类静水模型支持头下悬浮和壳尖先行；具体软体动作属于游戏复原。 */
export function createCamerocerasMotion(body) {
  const state = { travel: 0, hunting: 0, jet: 0, gathering: 0 };
  const attitude = new THREE.Quaternion();
  const feeding = new THREE.Quaternion();
  const angles = new THREE.Euler(0, Math.PI, 0, "YXZ");
  let previous;
  return {
    state,
    update(phase, speed, context) {
      // 用实际位移强度；图鉴没有世界位移时才使用它的展示速度。
      const travel = THREE.MathUtils.smoothstep(
        context?.travelSpeed ?? speed * 6,
        0.2,
        8,
      );
      const hunting = context?.hunting ? 1 : 0;
      const first = previous === undefined || phase < previous;
      // 工厂相位已经随运动强度加快；姿态过渡还原为秒，避免高速时突然翻转。
      const cadence =
        1.7 + THREE.MathUtils.clamp(Math.abs(speed), 0.15, 3) * 1.1;
      const delta = first
        ? 0
        : Math.min(0.12, Math.max(0, phase - previous) / cadence);
      previous = phase;
      if (!first && delta === 0) return state;
      const blend = first ? 1 : 1 - Math.exp(-delta * 1.8);
      state.travel += (travel - state.travel) * blend;
      state.hunting += (hunting - state.hunting) * blend;
      // 壳尖是原模型+Z：静止时朝上，游进时转向移动轴-Z，捕食时腕冠转回目标。
      // 先绕竖轴转向，再抬高壳尖；不能翻滚180度而把背腹也倒置。
      angles.x = -THREE.MathUtils.degToRad(75 - 67 * state.travel);
      attitude.setFromEuler(angles).slerp(feeding, state.hunting);
      if (first) body.quaternion.copy(attitude);
      else body.quaternion.slerp(attitude, blend);
      // 喷射的短促收缩接较长舒展滑行；不位移游戏根节点或改变生态速度。
      const cycle =
        (((phase * 0.38) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const pulse = cycle < 1.35 ? Math.sin((cycle / 1.35) * Math.PI) ** 2 : 0;
      state.jet = pulse * state.travel * (1 - state.hunting * 0.65);
      state.gathering = state.travel * (1 - state.hunting);
      return state;
    },
  };
}
