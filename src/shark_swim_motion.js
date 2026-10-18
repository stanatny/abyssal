/**
 * 胸鳍作为操纵面：巡游低幅俯仰/前后微调，内侧鳍下压并前展以转弯。
 * 冲刺减少升沉、适度后掠；推进节奏来自尾部。是两种幻想鲨鱼的表现化改编。
 * @param {Array} fins [side, bone] 胸鳍关节，头朝-Z，右侧为+X。
 * @param {number} phase 已连续累积的尾拍相位。
 * @param {object} state 实例时钟平滑过的冲刺/转向/俯仰输入。
 * @param {number} flexibility 控制自然鳍与机械鳍的细小巡游差异。
 */
export function poseSharkPectorals(fins, phase, state = {}, flexibility = 1) {
  const boost = state.boost || 0,
    turn = state.turn || 0,
    pitch = state.pitchInput || 0,
    q = phase * 0.72,
    lift =
      0.065 + Math.sin(q) * (0.2 - boost * 0.08) * flexibility + pitch * 0.1,
    sweep =
      0.035 +
      boost * 0.21 +
      Math.sin(q - 0.65) * (0.105 - boost * 0.045) * flexibility,
    feather =
      Math.cos(q - 0.35) * (0.06 - boost * 0.025) * flexibility - pitch * 0.14;
  for (const [side, fin] of fins) {
    fin.rotation.z = side * lift - turn * 0.12;
    fin.rotation.y = -side * sweep + turn * 0.1;
    fin.rotation.x = feather;
  }
}
