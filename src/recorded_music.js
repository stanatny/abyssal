import { REGIONAL_RECORDINGS } from "./regional_music_assets.js";

/** 仅保留当前地图录音；失败或过期的加载结果不启动播放。 */
export class RecordedMusic {
  constructor(
    context,
    destination,
    {
      catalog = REGIONAL_RECORDINGS,
      fetcher = (...args) => fetch(...args),
    } = {},
  ) {
    this.context = context;
    this.destination = destination;
    this.catalog = catalog;
    this.fetcher = fetcher;
    this.region = null;
    this.status = "idle";
    this.buffers = new Map();
    this.tracks = new Map();
    this.epochs = new Map();
    this.generation = 0;
    this.decodeQueue = Promise.resolve();
    this.stop();
  }

  /** 加载一张地图；内容哈希地址复用浏览器现有的 HTTP 缓存。 */
  setRegion(region) {
    if (
      region === this.region &&
      ["loading", "ready", "procedural"].includes(this.status)
    )
      return this.pending;
    this.stop();
    this.controller?.abort();
    this.region = region;
    const generation = ++this.generation;
    this.buffers.clear();
    const spec = this.catalog[region];
    if (!spec || !this.context.decodeAudioData) {
      this.status = "procedural";
      return Promise.resolve(false);
    }
    this.status = "loading";
    const controller = (this.controller = new AbortController());
    const timer = setTimeout(() => controller.abort(), 25000);
    const load = async () => {
      // 快速切图时仍串行解码，并放弃已过期的任务。
      const buffers = new Map();
      for (const [state, cue] of Object.entries(spec)) {
        if (generation !== this.generation) return false;
        const response = await this.fetcher(cue.url, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw Error(`Music request failed: ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (generation !== this.generation) return false;
        const buffer = await this.context.decodeAudioData(bytes);
        if (generation !== this.generation) return false;
        if (
          !Number.isFinite(buffer.duration) ||
          buffer.duration < cue.loopEnd ||
          cue.loopEnd - cue.loopStart < 5
        )
          throw Error("Invalid regional music duration");
        buffers.set(state, buffer);
      }
      this.buffers = buffers;
      this.status = "ready";
      return true;
    };
    this.pending = this.decodeQueue
      .catch(() => {})
      .then(load)
      .catch(() => {
        if (generation === this.generation) this.status = "unavailable";
        return false;
      })
      .finally(() => clearTimeout(timer));
    this.decodeQueue = this.pending;
    return this.pending;
  }

  get ready() {
    return this.status === "ready";
  }

  /** 静音、重置和切图时立即停止声源，只保留当前地图的解码结果。 */
  stop() {
    for (const track of this.tracks.values()) this.release(track);
    this.tracks.clear();
    this.epochs.clear();
    this.state = null;
    this.bossUntil = this.pursuitUntil = -Infinity;
    this.heldBoss = "lord";
  }

  release(track) {
    for (const { source, gain } of track.voices) {
      try {
        source.stop();
      } catch {
        /* 声源已结束 */
      }
      source.disconnect();
      gain.disconnect();
    }
    track.voices.clear();
    track.gain.disconnect();
  }

  level(track, now) {
    const e = track.envelope;
    const t = Math.max(0, Math.min(1, (now - e.start) / e.duration));
    const ease = t * t * (3 - 2 * t);
    const shape =
      e.to > e.from
        ? Math.sin((ease * Math.PI) / 2)
        : 1 - Math.cos((ease * Math.PI) / 2);
    return e.from + (e.to - e.from) * shape;
  }

  fade(track, target, now, duration) {
    const from = this.level(track, now);
    const param = track.gain.gain;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else param.cancelScheduledValues(now);
    param.setValueAtTime(from, now);
    const curve = new Float32Array(65);
    for (let i = 0; i < curve.length; i++) {
      const t = i / (curve.length - 1),
        ease = t * t * (3 - 2 * t);
      const shape =
        target > from
          ? Math.sin((ease * Math.PI) / 2)
          : 1 - Math.cos((ease * Math.PI) / 2);
      curve[i] = from + (target - from) * shape;
    }
    param.setValueCurveAtTime(curve, now, duration);
    track.envelope = { from, to: target, start: now, duration };
    track.retireAt = target ? Infinity : now + duration;
  }

  createTrack(state, now, restart) {
    const cue = this.catalog[this.region][state],
      buffer = this.buffers.get(state);
    const gain = this.context.createGain();
    gain.gain.value = 0;
    gain.connect(this.destination);
    const cycle = cue.loopEnd - cue.loopStart - 2;
    if (restart || !this.epochs.has(state)) this.epochs.set(state, now);
    const elapsed = now - this.epochs.get(state);
    const offset =
      elapsed === 0 ? cue.entry : cue.loopStart + (elapsed % cycle);
    const track = {
      state,
      cue,
      buffer,
      gain,
      voices: new Set(),
      envelope: { from: 0, to: 0, start: now, duration: 1 },
      retireAt: Infinity,
    };
    this.tracks.set(state, track);
    this.spawn(track, now, offset, false);
    return track;
  }

  spawn(track, at, offset, overlap) {
    const { cue, buffer } = track;
    const duration = cue.loopEnd - offset;
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    source.buffer = buffer;
    source.connect(gain).connect(track.gain);
    gain.gain.setValueAtTime(overlap ? 0 : 1, at);
    if (overlap) gain.gain.linearRampToValueAtTime(1, at + 2);
    gain.gain.setValueAtTime(1, at + duration - 2);
    gain.gain.linearRampToValueAtTime(0, at + duration);
    const voice = { source, gain, end: at + duration };
    track.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      track.voices.delete(voice);
    };
    source.start(at, offset, duration);
    track.nextLoop = at + duration - 2;
  }

  /** 按实际交战和追击选择音乐；2.5 秒退出延迟避免频繁切换。 */
  update({ boss = false, bossKind = null, pursuing = false } = {}) {
    if (!this.ready) return false;
    const now = this.context.currentTime;
    if (boss) {
      this.bossUntil = now + 2.5;
      this.heldBoss =
        this.region === "penglai" && bossKind === "sword_sage"
          ? "sage"
          : "lord";
    }
    if (pursuing) this.pursuitUntil = now + 2.5;
    const next =
      now < this.bossUntil
        ? this.heldBoss
        : now < this.pursuitUntil
          ? "chase"
          : "explore";
    if (next !== this.state) {
      const ambush = next === "lord" || next === "sage";
      const incoming =
        this.tracks.get(next) || this.createTrack(next, now, ambush);
      const duration = !this.state
        ? ambush
          ? 0.01
          : 1
        : ambush
          ? 0.01
          : next === "chase"
            ? 6
            : 8;
      for (const track of this.tracks.values())
        this.fade(
          track,
          track === incoming ? 1 : 0,
          now,
          track === incoming ? duration : ambush ? 0.15 : duration,
        );
      this.state = next;
    }
    for (const [state, track] of this.tracks) {
      if (now >= track.retireAt) {
        this.release(track);
        this.tracks.delete(state);
        continue;
      }
      if (track.nextLoop <= now + 0.3 && track.nextLoop < track.retireAt)
        this.spawn(
          track,
          Math.max(now, track.nextLoop),
          track.cue.loopStart,
          true,
        );
    }
    return true;
  }

  /** 开发验证使用的只读状态，不向生产页面暴露调试入口。 */
  snapshot() {
    return {
      region: this.region,
      status: this.status,
      state: this.state,
      decoded: this.buffers.size,
      decodedBytes: [...this.buffers.values()].reduce(
        (n, b) => n + b.length * b.numberOfChannels * 4,
        0,
      ),
      tracks: this.tracks.size,
      voices: [...this.tracks.values()].reduce((n, t) => n + t.voices.size, 0),
    };
  }
}
