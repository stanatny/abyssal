/**
 * createWaterAmbience 生成轻柔、有色的循环水声；采样率为Hz，返回6秒单声道PCM。
 * 使用独立随机序列，不改变音乐、攻击和捕食声的随机状态；只在建图时调用。
 * 这是游戏环境音合成，不是水听器实录或物理声压模拟。
 */
export function createWaterAmbience(sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new RangeError("Unsupported ambience sample rate");
  const length = Math.round(sampleRate * 6),
    overlap = Math.round(sampleRate * 0.5),
    raw = new Float32Array(length + overlap),
    samples = new Float32Array(length),
    alpha = 1 - Math.exp((-2 * Math.PI * 600) / sampleRate);
  let seed = 0x63a5f17,
    smooth = 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  // 先预热滤波状态，避免每一轮都从零幅度起音。
  for (let i = 0; i < sampleRate * 0.1; i++)
    smooth += alpha * (next() - smooth);
  for (let i = 0; i < raw.length; i++) {
    smooth += alpha * (next() - smooth);
    raw[i] = smooth;
  }
  samples.set(raw.subarray(overlap));
  // 半秒余弦交叠接回开头，拼接前后取连续原样本，消除循环接缝。
  for (let i = 0; i < overlap; i++) {
    const blend = 0.5 - Math.cos((Math.PI * i) / (overlap - 1)) * 0.5;
    samples[length - overlap + i] =
      raw[length + i] * (1 - blend) + raw[i] * blend;
  }
  const mean = samples.reduce((sum, value) => sum + value, 0) / length;
  for (let i = 0; i < length; i++) samples[i] -= mean;
  return samples;
}
