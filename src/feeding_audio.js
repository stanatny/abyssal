/**
 * 生成录音加载失败时的短水流PCM；正常吞食使用fish_bite_assets中的水声拟音。
 * @param {"fish"} kind 捕食反馈类别。
 * @param {number} sampleRate 目标上下文采样率。
 * @returns {Float32Array} 已限制峰值并收拢首尾的单声道样本。
 */
export function createFeedingSound(kind, sampleRate) {
  if (kind !== "fish") throw new RangeError("Unknown feeding sound kind");
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new RangeError("Unsupported feeding sound sample rate");
  const duration = 0.3;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  renderWetBite(samples, sampleRate, seededNoise(853107));
  const highpass = lowpass(38, sampleRate);
  let peak = 0;
  for (let index = 0; index < samples.length; index++) {
    const at = index / sampleRate;
    const taper = Math.min(1, at / 0.01, (duration - at) / 0.028);
    samples[index] = (samples[index] - highpass(samples[index])) * taper;
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  const scale = peak > 0 ? 0.3 / peak : 0;
  for (let index = 0; index < samples.length; index++) samples[index] *= scale;
  return samples;
}

function renderWetBite(samples, sampleRate, random) {
  const body = lowpass(680, sampleRate);
  const undertow = lowpass(180, sampleRate);
  for (let index = 0; index < samples.length; index++) {
    const at = index / sampleRate;
    const noise = random();
    // 仅作为录音未就绪时的柔水流兜底，不生成清脆爆音或有旋律的气泡。
    const envelope = (1 - Math.exp(-at / 0.018)) * Math.exp(-at / 0.048);
    samples[index] = (body(noise) * 0.72 + undertow(noise) * 0.28) * envelope;
  }
}

function lowpass(frequency, sampleRate) {
  const alpha = 1 - Math.exp((-Math.PI * 2 * frequency) / sampleRate);
  let value = 0;
  return (sample) => (value += alpha * (sample - value));
}

function seededNoise(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 4294967296) * 2 - 1;
  };
}
