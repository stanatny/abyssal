import { RecordedAudioBank } from "./recorded_audio_bank.js";
import { LUMEN_LASH } from "./europa_lord_attacks.js";
import { ODYSSEY_ATTACKS } from "./odyssey_attack_rules.js";

export const LORD_ATTACK_URLS = Object.freeze({
  breath: new URL("./assets/audio/lord_breath.wav", import.meta.url).href,
  roar: new URL("./assets/audio/lord_roar.wav", import.meta.url).href,
  sword: new URL("./assets/audio/lord_sword.wav", import.meta.url).href,
  charge: new URL("./assets/audio/lord_charge.wav", import.meta.url).href,
  water: new URL("./assets/audio/lord_water.wav", import.meta.url).href,
  fire: new URL("./assets/audio/lord_fire.wav", import.meta.url).href,
  lightning: new URL("./assets/audio/lord_lightning.wav", import.meta.url).href,
  vortex: new URL("./assets/audio/lord_vortex.wav", import.meta.url).href,
  pulse: new URL("./assets/audio/lord_pulse.wav", import.meta.url).href,
  crystal: new URL("./assets/audio/lord_crystal.wav", import.meta.url).href,
  loom: new URL("./assets/audio/lord_loom.wav", import.meta.url).href,
  lash: new URL("./assets/audio/lord_lash.wav", import.meta.url).href,
  claw: new URL("./assets/audio/lord_claw.wav", import.meta.url).href,
  fault: new URL("./assets/audio/lord_fault.wav", import.meta.url).href,
});

/** 限制新音频下载并发；超时从真正开始传输算起，不让排队耗尽请求时间。 */
export function createLordAttackBank(
  fetcher = (...args) => globalThis.fetch(...args),
) {
  let active = 0;
  const queue = [];
  const pump = () => {
    while (active < 2 && queue.length) {
      const { url, resolve, reject } = queue.shift();
      active++;
      Promise.resolve()
        .then(() =>
          fetcher(url, { signal: globalThis.AbortSignal?.timeout?.(30000) }),
        )
        .then(async (response) => {
          // 包体完成后才释放槽位；仅限制收到响应头不能限制真正下载。
          const data = response.ok ? await response.arrayBuffer() : null;
          return {
            ok: response.ok,
            status: response.status,
            arrayBuffer: async () => data,
          };
        })
        .then(resolve, reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  };
  return new RecordedAudioBank(LORD_ATTACK_URLS, {
    fetcher: (url) =>
      new Promise((resolve, reject) => {
        queue.push({ url, resolve, reject });
        pump();
      }),
  });
}

/** 按实际招式选音色；同样是远程投射也区分水息、火羽、电弧与御剑。 */
export function lordAttackSound(kind, ability) {
  if (ability === "swords" || (kind === "sword_sage" && ability === "charge"))
    return "sword";
  if (ability === "volley")
    return kind === "vermilion_bird"
      ? "fire"
      : kind === "thunderbarbel"
        ? "lightning"
        : "breath";
  if (ability === "pulse") return kind === "brine_regent" ? "crystal" : "pulse";
  if (ability === "undertow") return "vortex";
  if (ability === "surge") return "water";
  return Object.hasOwn(LORD_ATTACK_URLS, ability) ? ability : null;
}

/** 只读既有技能时序。弹体另在真实发射点触发，不能在蓄力时预排未来音效。 */
export function lordAttackBeats(state, previousTime) {
  if (state.phase !== "attack" || ["volley", "swords"].includes(state.ability))
    return [];
  const count =
    state.ability === "lash" || state.ability === "fault"
      ? 3
      : state.ability === "pulse"
        ? (state.species.pulseWaveCount ?? 1)
        : 1;
  const interval =
    state.ability === "lash"
      ? LUMEN_LASH.interval
      : state.ability === "fault"
        ? ODYSSEY_ATTACKS.fault.interval
        : (state.species.pulseWaveInterval ?? 0);
  const beats = [];
  for (let i = 0; i < count; i++) {
    // 巨钳在既有攻击阶段0.8秒开始合击；不能把壳碰声提前到张钳时。
    const at = (state.ability === "claw" ? 0.8 : 0) + i * interval;
    // 卡帧时已过去的音效不挤在一起补放；当前波仍可发声。
    if (at > previousTime && at <= state.timer && state.timer - at < 0.18)
      beats.push(i);
  }
  return beats;
}

/** 独立的有限声部池；缓存只保存音频，不保存待播放事件。 */
export class LordAttackAudio {
  constructor(bank = createLordAttackBank()) {
    this.bank = bank;
    this.buffers = new Map();
    this.voices = new Map();
    this.state = "idle";
    this.pending = null;
    this.context = null;
  }

  prepare(context) {
    if (this.context === context && this.pending) return this.pending;
    this.context = context;
    this.state = "loading";
    this.pending = this.bank
      .load(context)
      .then((buffers) => {
        this.buffers = buffers;
        this.state = "ready";
        return true;
      })
      .catch(() => {
        this.state = "unavailable";
        this.pending = null;
        return false;
      });
    return this.pending;
  }

  /** 距离衰减、每领主最多3声、总共6声；不抢占玩家受伤/命中声部。 */
  play(
    audio,
    kind,
    ability,
    { owner, distance = 0, duration = 3, index = 0, strength = 1 } = {},
  ) {
    const cue = lordAttackSound(kind, ability);
    const buffer = this.buffers.get(cue);
    if (!buffer) return false;
    if (!audio.ready || !audio.enabled || audio.paused) return true;
    const attenuation = Math.max(0, Math.min(1, (300 - distance) / 220));
    if (!attenuation) return true;
    const context = audio.context,
      now = context.currentTime;
    const owned = [...this.voices].filter(([, v]) => v.owner === owner);
    if (owned.length >= 3) this.stopVoice(owned[0][0]);
    if (this.voices.size >= 6) this.stopVoice(this.voices.keys().next().value);
    const source = context.createBufferSource();
    source.buffer = buffer;
    // 小幅分拍变化；御剑冲阵的低音尾流区别于三把短剑。
    const rate =
      kind === "sword_sage" && ability === "charge"
        ? 0.82
        : 1 + ((index % 3) - 1) * 0.025;
    source.playbackRate.value = rate;
    const gain = context.createGain();
    const level =
      (["breath", "sword", "fire", "lightning"].includes(cue) ? 0.73 : 0.9) *
      attenuation *
      Math.max(0, Math.min(1, strength));
    const length = Math.max(0.06, Math.min(buffer.duration / rate, duration));
    const at = now + 0.004;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.008);
    gain.gain.setValueAtTime(level, at + Math.max(0.009, length - 0.07));
    gain.gain.linearRampToValueAtTime(0, at + length);
    source.connect(gain).connect(audio.combatEffects);
    this.voices.set(source, { owner, gain, cue });
    audio.releaseWhenEnded(source, [source, gain], () =>
      this.voices.delete(source),
    );
    source.start(at);
    source.stop(at + length + 0.01);
    audio.duckMusic(0.72, Math.min(length, 0.7));
    return true;
  }

  stopVoice(source) {
    const entry = this.voices.get(source);
    if (!entry) return;
    const now = this.context.currentTime;
    const param = entry.gain.gain;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
    }
    param.linearRampToValueAtTime(0, now + 0.018);
    source.stop(now + 0.02);
    this.voices.delete(source);
  }

  stop(owner) {
    for (const [source, entry] of this.voices)
      if (owner === undefined || entry.owner === owner) this.stopVoice(source);
  }
}
