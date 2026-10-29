// 保留原来的 D 小调海洋主题，八组问答与留白在 192 秒后完整回到开头。
export const HAWAII_SCORE = Object.freeze({
  beat: 60 / 80,
  stepsPerPhrase: 16,
  phrases: 32,
  duration: 192,
  pursuitReleaseHold: 2.5,
});

const harmonies = [
  [50, 57, 60, 65],
  [46, 53, 57, 62],
  [53, 60, 64, 69],
  [48, 55, 62, 65],
];

// 前四句逐音沿用原作；后续以同一音色发展旋律，不把短循环机械拼接。
const melodies = [
  [69, 74],
  [65, 69],
  [72, 76],
  [67, 74],
  [74, 72],
  [69, 65],
  [76, 72],
  [74, 67],
  [65, 69],
  [62, 65],
  [69, 72],
  [67, 65],
  [74, null],
  [null, 69],
  [72, null],
  [null, 67],
  [69, 77],
  [65, 74],
  [72, 79],
  [67, 74],
  [77, 74],
  [74, 69],
  [79, 76],
  [74, 72],
  [69, 65],
  [65, 62],
  [72, 69],
  [67, 62],
  [74, 69],
  [69, 65],
  [72, 69],
  [67, 62],
];

export function hawaiiPhrase(step) {
  const phrase =
    Math.floor(step / HAWAII_SCORE.stepsPerPhrase) % HAWAII_SCORE.phrases;
  return { harmony: harmonies[phrase % 4], melody: melodies[phrase] };
}

// 普通追击保留主旋律，只缓慢加入同拍的推动层；领主才显著提高强度。
export function hawaiiMix(danger, pursuing, boss) {
  const intensity = Math.sqrt(Math.max(0, Math.min(1, danger)));
  return {
    calm: boss ? 0.22 : pursuing ? 0.78 : 0.86,
    chase: boss ? 1.05 : pursuing ? 0.58 + intensity * 0.12 : 0,
    fast: boss ? 0.9 : 0,
    guardian: boss ? Math.max(0.85, intensity) : 0,
    cutoff: boss ? 1550 + danger * 500 : pursuing ? 1250 : 520,
    response: boss ? 0.3 : pursuing ? 1.2 : 1.8,
  };
}
