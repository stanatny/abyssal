export const TITAN_AWAKEN_SOUND = Object.freeze({
  duration: 3.8,
  peak: 0.68,
  gain: 0.96,
  musicDuck: 0.45,
  duckSeconds: 2.6,
});

const clamp = (value, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));
const smooth = (value) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};

function readable(buffer) {
  return (
    buffer &&
    Number.isFinite(buffer.sampleRate) &&
    buffer.sampleRate > 0 &&
    Number.isFinite(buffer.length) &&
    buffer.length > 0 &&
    typeof buffer.getChannelData === "function"
  );
}

function sample(buffer, seconds) {
  if (!readable(buffer) || seconds < 0) return 0;
  const at = seconds * buffer.sampleRate,
    first = Math.floor(at);
  if (first >= buffer.length - 1) return 0;
  let value = 0;
  const channels = Math.min(2, buffer.numberOfChannels || 1);
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel);
    value += data[first] + (data[first + 1] - data[first]) * (at - first);
  }
  return value / channels;
}

/** 复用既有HF吼声与岩裂录音的原PCM；调速、混合和低震颤均可离线逐样本复现。 */
export function createTitanAwakenPcm({
  sampleRate = 48000,
  roar = null,
  fault = null,
  variant = "massive",
} = {}) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new RangeError("Titan awakening requires a valid PCM sample rate");
  if (!["massive", "articulate"].includes(variant))
    throw new RangeError("Unknown titan awakening sound variant");
  const samples = new Float32Array(
      Math.round(TITAN_AWAKEN_SOUND.duration * sampleRate),
    ),
    sourceReady = readable(roar),
    rate = variant === "massive" ? 0.6 : 0.72,
    lowAlpha = 1 - Math.exp((-2 * Math.PI * 1400) / sampleRate),
    subAlpha = 1 - Math.exp((-2 * Math.PI * 88) / sampleRate),
    dcAlpha = 1 - Math.exp((-2 * Math.PI * 29) / sampleRate);
  let state = 0x72b68a31,
    low = 0,
    rumble = 0,
    dc = 0,
    phase = 0,
    mean = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const white = (state / 4294967296) * 2 - 1;
    rumble += subAlpha * (white - rumble);
    const throatTime = Math.max(0, t - 0.14),
      tremor =
        0.73 +
        0.14 * Math.sin(t * Math.PI * 2 * 4.3) +
        0.09 * Math.sin(t * Math.PI * 2 * 7.1),
      bodyEnvelope =
        smooth(t / 0.035) *
        (Math.exp(-t / 1.65) + 0.22 * Math.exp(-(((t - 1.6) / 0.7) ** 2)));
    phase += (2 * Math.PI * (46 - 12 * clamp(throatTime / 2.6))) / sampleRate;
    const fallback =
      (0.06 * Math.tanh(2.1 * Math.sin(phase)) +
        0.026 * Math.sin(phase * 2.01) +
        0.018 * Math.sin(phase * 3.03) +
        white * 0.022) *
      smooth(throatTime / 0.16) *
      Math.exp(-throatTime / 1.45) *
      tremor;
    const voice = sourceReady
      ? sample(roar, (t - 0.14) * rate) * 1.22
      : fallback;
    low += lowAlpha * (voice - low);
    const impact = sample(fault, (t - 0.018) * 0.7) * 0.43,
      sub =
        (rumble * 0.92 + Math.sin(phase * 0.83) * 0.023) *
        bodyEnvelope *
        tremor,
      mix = low + impact + sub;
    dc += dcAlpha * (mix - dc);
    samples[i] = mix - dc;
    mean += samples[i];
  }
  mean /= samples.length;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate,
      fade =
        smooth(t / 0.012) * smooth((TITAN_AWAKEN_SOUND.duration - t) / 0.46);
    samples[i] = (samples[i] - mean) * fade;
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const gain = TITAN_AWAKEN_SOUND.peak / Math.max(peak, 1e-6);
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  samples[0] = samples[samples.length - 1] = 0;
  return samples;
}

/** 苏醒仅一次事件；有限单声部不走长混响，静音/暂停/迟到解码均不积压重放。 */
export class BermudaTitanAwakenAudio {
  constructor() {
    this.context = null;
    this.buffer = null;
    this.roar = null;
    this.fault = null;
    this.voice = null;
    this.triggered = false;
    this.mode = "unprepared";
  }

  prepare(context, buffers = null) {
    if (!context?.createBuffer || context.state === "closed") return false;
    const existing = this.context === context,
      roar = buffers
        ? readable(buffers.get("roar"))
          ? buffers.get("roar")
          : null
        : existing
          ? this.roar
          : null,
      fault = buffers
        ? readable(buffers.get("fault"))
          ? buffers.get("fault")
          : null
        : existing
          ? this.fault
          : null;
    if (
      this.context === context &&
      this.buffer &&
      this.roar === roar &&
      this.fault === fault
    )
      return true;
    if (this.context && this.context !== context) this.stop();
    const pcm = createTitanAwakenPcm({
      sampleRate: context.sampleRate,
      roar,
      fault,
    });
    this.context = context;
    this.roar = roar;
    this.fault = fault;
    this.buffer = context.createBuffer(1, pcm.length, context.sampleRate);
    this.buffer.getChannelData(0).set(pcm);
    this.mode = roar ? "accepted_sample_mix" : "immediate_fallback";
    return true;
  }

  play(audio) {
    if (this.triggered) return false;
    this.triggered = true;
    const context = audio.context;
    if (!audio.canPlay() || (context.state !== "running" && !audio.isOffline()))
      return false;
    if (!this.buffer || this.context !== context)
      this.prepare(context, audio.lordAttackAudio?.buffers);
    if (!this.buffer) return false;
    const source = context.createBufferSource(),
      gain = context.createGain(),
      at = context.currentTime + 0.005,
      duration = this.buffer.duration;
    source.buffer = this.buffer;
    source.loop = false;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(TITAN_AWAKEN_SOUND.gain, at + 0.012);
    gain.gain.setValueAtTime(TITAN_AWAKEN_SOUND.gain, at + duration - 0.04);
    gain.gain.linearRampToValueAtTime(0, at + duration);
    source.connect(gain).connect(audio.combatEffects);
    this.voice = { source, gain };
    audio.releaseWhenEnded(source, [source, gain], () => {
      if (this.voice?.source === source) this.voice = null;
    });
    source.start(at);
    source.stop(at + duration + 0.012);
    audio.duckMusic(
      TITAN_AWAKEN_SOUND.musicDuck,
      TITAN_AWAKEN_SOUND.duckSeconds,
    );
    return true;
  }

  stop() {
    if (!this.voice) return;
    const { source, gain } = this.voice,
      now = this.context.currentTime;
    if (typeof gain.gain.cancelAndHoldAtTime === "function")
      gain.gain.cancelAndHoldAtTime(now);
    else {
      const level = gain.gain.value;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(level, now);
    }
    gain.gain.linearRampToValueAtTime(0, now + 0.018);
    try {
      source.stop(now + 0.02);
    } catch {
      /* 已结束声源无需再次停止。 */
    }
    this.voice = null;
  }

  reset() {
    this.stop();
    this.triggered = false;
  }

  dispose() {
    this.stop();
    this.buffer = this.roar = this.fault = this.context = null;
    this.triggered = true;
  }
}
