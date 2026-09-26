/**
 * OceanAudio 用 Web Audio 合成原创海洋配乐与游戏音效。
 * 参数：可选 options.context 用于离线验音；默认在用户手势后创建 AudioContext。
 * 所有节奏由 update 推进，无后台定时器；重复 start 不会创建第二套声部。
 */
export class OceanAudio {
  constructor({ context = null } = {}) {
    this.context = context;
    this.enabled = true;
    this.paused = false;
    this.ready = false;
    this.step = 0;
    this.nextStep = 0;
    this.nextHeartbeat = 0;
    this.lastDanger = 0;
    this.boss = false;
    this.depth = 0;
    this.aboveWater = false;
    this.voices = new Set();
    this.beat = 60 / 76;
  }

  /** start 激活音频并继续调度；无参数，无返回值，允许重复调用。 */
  start() {
    if (!this.context) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
    }
    if (!this.ready) this.createGraph();
    this.setPaused(false);
    this.update(0, this.lastDanger, {
      boss: this.boss,
      depth: this.depth,
      aboveWater: this.aboveWater,
    });
  }

  /** toggle 切换声音；首次点击直接激活声音，返回切换后的启用状态。 */
  toggle() {
    if (!this.ready) {
      this.enabled = true;
      this.start();
      return this.enabled;
    }
    this.enabled = !this.enabled;
    this.master.gain.setTargetAtTime(
      this.enabled ? 0.68 : 0,
      this.context.currentTime,
      0.09,
    );
    if (this.enabled && !this.paused) this.resumeContext();
    return this.enabled;
  }

  /** setPaused 暂停或恢复音频时钟；参数为暂停状态，无返回值。 */
  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.context || this.isOffline()) return;
    if (this.paused) {
      if (this.context.state === "running")
        this.context.suspend().catch(() => {});
    } else {
      this.resumeContext();
    }
  }

  /**
   * update 推进配乐与混音；time 为游戏秒数，danger 为 0–1 危险程度。
   * options 接收 boss、世界单位 depth 与 aboveWater；无返回值。
   */
  update(time, danger, { boss = false, depth = 0, aboveWater = false } = {}) {
    void time;
    this.lastDanger = clamp(danger, 0, 1);
    this.boss = Boolean(boss);
    this.depth = Math.max(0, Number.isFinite(depth) ? depth : 0);
    this.aboveWater = Boolean(aboveWater);
    if (!this.ready || this.paused) return;
    const now = this.context.currentTime;
    const intensity = Math.sqrt(this.lastDanger);
    const bossLevel = this.boss ? Math.max(0.6, intensity) : 0;
    const calmLevel = this.boss ? 0.12 : 1 - intensity * 0.9;
    const chaseLevel = this.boss ? 0.64 : intensity;
    this.calm.gain.setTargetAtTime(calmLevel, now, 0.55);
    this.chase.gain.setTargetAtTime(chaseLevel, now, 0.34);
    this.bossLayer.gain.setTargetAtTime(bossLevel, now, 0.42);
    const depthRatio = clamp(this.depth / 270, 0, 1);
    this.musicFilter.frequency.setTargetAtTime(
      this.aboveWater ? 10500 : 6200 - depthRatio * 2100,
      now,
      0.6,
    );
    this.waterFilter.frequency.setTargetAtTime(
      this.aboveWater ? 1700 : 280 - depthRatio * 130,
      now,
      0.4,
    );
    this.waterGain.gain.setTargetAtTime(
      this.aboveWater ? 0.045 : 0.022 + depthRatio * 0.006,
      now,
      0.5,
    );

    // 大幅掉帧只跳过已错过的拍点，避免一次堆积许多音符。
    const subdivision = this.beat / 2;
    if (this.nextStep < now - subdivision) {
      const skipped = Math.ceil((now - this.nextStep) / subdivision);
      this.step += skipped;
      this.nextStep += skipped * subdivision;
    }
    while (this.nextStep < now + 0.23) {
      this.scheduleMusicStep(this.nextStep, this.step);
      this.nextStep += subdivision;
      this.step += 1;
    }
    if (this.lastDanger > 0.06 && now >= this.nextHeartbeat) {
      const level = 0.11 + this.lastDanger * 0.12;
      this.note(64, now + 0.01, 0.13, level, this.effects, { end: 38 });
      this.note(56, now + 0.19, 0.14, level * 0.65, this.effects, { end: 32 });
      this.nextHeartbeat = now + 1.05 - this.lastDanger * 0.43;
    }
  }

  /** eat 播放清晰短促的吞食水泡与上行音；无参数、无返回值。 */
  eat() {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.005;
    this.noise(now, 0.12, 0.12, this.effects, 920, "bandpass");
    this.note(210, now, 0.12, 0.27, this.effects, { end: 580 });
    this.note(587.33, now + 0.075, 0.25, 0.14, this.effects, {
      type: "triangle",
    });
  }

  /** hit 播放受击低频与撞击噪声；无参数、无返回值。 */
  hit() {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.005;
    this.note(125, now, 0.48, 0.5, this.effects, { end: 33, type: "triangle" });
    this.noise(now, 0.26, 0.36, this.effects, 680, "lowpass");
    this.note(48, now + 0.04, 0.58, 0.31, this.effects);
  }

  /** sonar 播放带回声的双频声呐；无参数、无返回值。 */
  sonar() {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.005;
    this.note(880, now, 0.9, 0.3, this.effects, { end: 830 });
    this.note(1320, now + 0.045, 0.65, 0.09, this.effects);
    this.note(880, now + 0.4, 0.7, 0.075, this.effects, { end: 830 });
  }

  /** breach 播放冲出水面的上扬气流；无参数、无返回值。 */
  breach() {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.005;
    this.noise(now, 0.65, 0.35, this.effects, 1800, "highpass", 0.055);
    this.note(180, now, 0.48, 0.15, this.effects, {
      end: 620,
      type: "triangle",
    });
  }

  /** splash 播放落水的低频冲击和水花尾声；无参数、无返回值。 */
  splash() {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.005;
    this.noise(now, 0.95, 0.53, this.effects, 1450, "lowpass", 0.006);
    this.noise(now + 0.06, 0.72, 0.2, this.effects, 3600, "highpass", 0.04);
    this.note(105, now, 0.42, 0.34, this.effects, { end: 34 });
    for (let i = 0; i < 4; i += 1) {
      this.note(330 + i * 93, now + 0.22 + i * 0.1, 0.12, 0.06, this.effects, {
        end: 130 + i * 35,
      });
    }
  }

  /** pickup 播放奖励提示；kind 为 stamina、flow 或 frenzy，无返回值。 */
  pickup(kind) {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.005;
    const phrase =
      kind === "frenzy"
        ? [62, 65, 69, 74]
        : kind === "flow"
          ? [69, 74, 76, 81]
          : [74, 78, 81];
    phrase.forEach((pitch, index) => {
      this.note(midi(pitch), now + index * 0.095, 0.65, 0.21, this.effects, {
        type: "triangle",
      });
    });
    if (kind === "frenzy")
      this.note(73.42, now, 0.85, 0.22, this.effects, {
        type: "sawtooth",
        cutoff: 340,
      });
  }

  /** bossAttack 播放巨兽攻击前兆；kind 接收巨兽标识，无返回值。 */
  bossAttack(kind) {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.005;
    const root = kind === "kraken" ? 55 : kind === "leviathan" ? 41.2 : 49;
    this.note(root * 2.6, now, 1.15, 0.25, this.effects, {
      type: "sawtooth",
      end: root,
      cutoff: 520,
      attack: 0.12,
    });
    this.note(root * 1.03, now + 0.05, 1.25, 0.25, this.effects, {
      type: "triangle",
      end: root * 0.8,
      attack: 0.16,
    });
    this.noise(now + 0.08, 1.15, 0.22, this.effects, 410, "bandpass", 0.16);
    this.note(90, now + 0.38, 0.65, 0.28, this.effects, { end: 28 });
  }

  /** victory 播放原创上行胜利乐句；无参数、无返回值。 */
  victory() {
    if (!this.canPlay()) return;
    const now = this.context.currentTime + 0.025;
    [62, 66, 69, 74, 78, 81, 86].forEach((pitch, index) => {
      this.note(
        midi(pitch),
        now + index * 0.17,
        1.5,
        index === 6 ? 0.28 : 0.2,
        this.effects,
        { type: "triangle", attack: 0.015 },
      );
    });
    [50, 57, 62, 66, 69].forEach((pitch) => {
      this.note(midi(pitch), now + 0.5, 3.1, 0.09, this.effects, {
        type: "triangle",
        attack: 0.2,
      });
    });
  }

  /** tone 保留原有通用音效接口；参数依次为频率、秒数、音量与结束频率。 */
  tone(frequency, duration = 0.3, volume = 0.2, end = frequency) {
    if (!this.canPlay()) return;
    this.note(
      frequency,
      this.context.currentTime + 0.005,
      duration,
      volume,
      this.effects,
      { end },
    );
  }

  /*********************************************
   * 内部合成与调度
   ********************************************/

  createGraph() {
    const context = this.context;
    this.master = context.createGain();
    this.master.gain.value = this.enabled ? 0.68 : 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -15;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.28;
    this.master.connect(compressor).connect(context.destination);

    this.music = context.createGain();
    this.music.gain.value = 0.72;
    this.musicFilter = context.createBiquadFilter();
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 6200;
    this.musicFilter.Q.value = 0.4;
    this.music.connect(this.musicFilter).connect(this.master);
    this.effects = context.createGain();
    this.effects.gain.value = 0.8;
    this.effects.connect(this.master);
    this.calm = this.makeBus(1, this.music);
    this.chase = this.makeBus(0, this.music);
    this.bossLayer = this.makeBus(0, this.music);

    // 共用一条短混响，提供空间感，又避免把节拍和提示声淹没。
    const convolver = context.createConvolver();
    const impulseLength = Math.floor(context.sampleRate * 1.8);
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate);
    let noiseSeed = 6187;
    const random = () => {
      noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
      return noiseSeed / 4294967296;
    };
    for (let channel = 0; channel < 2; channel += 1) {
      const samples = impulse.getChannelData(channel);
      for (let i = 0; i < impulseLength; i += 1) {
        samples[i] = (random() * 2 - 1) * (1 - i / impulseLength) ** 3;
      }
    }
    convolver.buffer = impulse;
    const reverb = this.makeBus(0.2, this.master);
    this.music.connect(convolver);
    this.effects.connect(convolver);
    convolver.connect(reverb);

    this.noiseBuffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const noiseSamples = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseSamples.length; i += 1)
      noiseSamples[i] = random() * 2 - 1;
    this.waterSource = context.createBufferSource();
    this.waterSource.buffer = this.noiseBuffer;
    this.waterSource.loop = true;
    this.waterFilter = context.createBiquadFilter();
    this.waterFilter.type = "lowpass";
    this.waterFilter.frequency.value = 240;
    this.waterFilter.Q.value = 0.4;
    this.waterGain = this.makeBus(0.022, this.master);
    this.waterSource.connect(this.waterFilter).connect(this.waterGain);
    this.waterSource.start();
    this.nextStep = context.currentTime + 0.035;
    this.ready = true;
  }

  scheduleMusicStep(at, step) {
    const subdivision = this.beat / 2;
    const inBar = step % 8;
    const bar = Math.floor(step / 8) % 4;
    const phrase = Math.floor(step / 32) % 2;
    const harmony = [
      [50, 57, 60, 64],
      [46, 53, 57, 60],
      [53, 60, 64, 69],
      [48, 55, 62, 67],
    ][bar];
    const bass = harmony[0] - 12;

    // 舒缓声部：四小节和声、清晰的钟琴旋律与柔和低音。
    if (inBar === 0) {
      harmony.forEach((pitch, index) => {
        this.note(
          midi(pitch),
          at + index * 0.018,
          this.beat * 4.35,
          0.1,
          this.calm,
          { type: "triangle", attack: 0.3, cutoff: 2000 },
        );
      });
      this.note(midi(bass), at, this.beat * 3.7, 0.17, this.calm, {
        attack: 0.08,
      });
    }
    const melody = [
      [74, null, 69, 72, 76, null, 74, 69],
      [72, null, 69, null, 65, 69, 72, null],
      [77, null, 76, 72, 69, null, 72, 76],
      [74, null, 79, null, 76, 74, 72, null],
    ][bar][inBar];
    if (melody !== null) {
      const pitch = melody + (phrase && inBar === 4 ? 12 : 0);
      this.note(midi(pitch), at, subdivision * 2.35, 0.2, this.calm, {
        type: "sine",
        attack: 0.009,
      });
      this.note(midi(pitch) * 2, at, subdivision * 0.8, 0.038, this.calm, {
        attack: 0.004,
      });
    }
    if (inBar % 2 === 1) {
      this.note(
        midi(harmony[(inBar + bar) % 4] + 12),
        at,
        0.52,
        0.055,
        this.calm,
        { type: "triangle" },
      );
    }

    // 追击声部保持同一和声，双倍细分的低弦音型和鼓点带来紧张感。
    for (let half = 0; half < 2; half += 1) {
      const moment = at + half * subdivision * 0.5;
      const pitch = bass + [0, 7, 12, 7][(step * 2 + half) % 4];
      this.note(midi(pitch), moment, subdivision * 0.46, 0.17, this.chase, {
        type: "sawtooth",
        cutoff: 760,
        attack: 0.012,
      });
      this.noise(
        moment,
        0.065,
        half ? 0.028 : 0.045,
        this.chase,
        5700,
        "highpass",
      );
    }
    if (inBar % 4 === 0 || inBar === 7) this.drum(at, 0.32, this.chase);
    if (inBar === 2 || inBar === 6) {
      this.noise(at, 0.16, 0.14, this.chase, 1450, "bandpass");
      this.note(170, at, 0.12, 0.07, this.chase, {
        end: 105,
        type: "triangle",
      });
    }
    if (inBar === 0 || inBar === 4) {
      this.note(midi(harmony[2] + 12), at, this.beat * 1.7, 0.08, this.chase, {
        type: "sawtooth",
        cutoff: 1700,
        attack: 0.16,
      });
    }

    // 巨兽声部添加沉重战鼓、低八度和半音摩擦，保留清楚的节奏脉冲。
    this.note(midi(bass - 12), at, subdivision * 0.9, 0.2, this.bossLayer, {
      type: "triangle",
      attack: 0.012,
    });
    if (inBar % 2 === 0) {
      this.drum(at, 0.4, this.bossLayer, 0.72);
      this.noise(at + 0.012, 0.24, 0.11, this.bossLayer, 650, "lowpass");
    }
    const tensionPitch = harmony[2] + 12 + (inBar % 4 === 3 ? 1 : 0);
    this.note(
      midi(tensionPitch),
      at,
      subdivision * 0.72,
      0.12,
      this.bossLayer,
      { type: "sawtooth", cutoff: 1500, attack: 0.025 },
    );
    if (inBar === 0) {
      this.note(midi(bass + 7), at, this.beat * 3.8, 0.13, this.bossLayer, {
        type: "sawtooth",
        cutoff: 480,
        attack: 0.35,
      });
    }
  }

  note(
    frequency,
    at,
    duration,
    volume,
    destination,
    { type = "sine", end = frequency, attack = 0.008, cutoff = 0 } = {},
  ) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const onset = Math.max(context.currentTime, at);
    const finish = onset + Math.max(0.04, duration);
    const rise = Math.min(attack, duration * 0.35);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(12, frequency), onset);
    if (end !== frequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(12, end),
        finish,
      );
    envelope.gain.setValueAtTime(0.0001, onset);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      onset + Math.max(0.002, rise),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, finish);
    const nodes = [oscillator, envelope];
    if (cutoff > 0) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      filter.Q.value = 0.5;
      oscillator.connect(filter).connect(envelope);
      nodes.push(filter);
    } else oscillator.connect(envelope);
    envelope.connect(destination);
    this.releaseWhenEnded(oscillator, nodes);
    oscillator.start(onset);
    oscillator.stop(finish + 0.025);
  }

  noise(
    at,
    duration,
    volume,
    destination,
    frequency = 1200,
    filterType = "bandpass",
    attack = 0.006,
  ) {
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.75;
    const envelope = context.createGain();
    const onset = Math.max(context.currentTime, at);
    envelope.gain.setValueAtTime(0.0001, onset);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      onset + Math.min(attack, duration * 0.4),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, onset + duration);
    source.connect(filter).connect(envelope).connect(destination);
    this.releaseWhenEnded(source, [source, filter, envelope]);
    source.start(onset, (at * 0.731) % 0.5);
    source.stop(onset + duration + 0.025);
  }

  drum(at, volume, destination, pitch = 1) {
    this.note(135 * pitch, at, 0.36, volume, destination, { end: 42 * pitch });
    this.noise(at, 0.055, volume * 0.18, destination, 1800, "lowpass");
  }

  makeBus(gain, destination) {
    const node = this.context.createGain();
    node.gain.value = gain;
    node.connect(destination);
    return node;
  }

  releaseWhenEnded(source, nodes) {
    this.voices.add(source);
    source.onended = () => {
      for (const node of nodes) node.disconnect();
      this.voices.delete(source);
    };
  }

  canPlay() {
    return this.ready && this.enabled && !this.paused;
  }

  isOffline() {
    return this.context && typeof this.context.startRendering === "function";
  }

  resumeContext() {
    if (!this.isOffline() && this.context.state === "suspended")
      this.context.resume().catch(() => {});
  }
}

/** midi 将 MIDI 音高换算为赫兹，仅用于内部原创乐句。 */
function midi(pitch) {
  return 440 * 2 ** ((pitch - 69) / 12);
}

/** clamp 约束有限数值，避免无效危险程度进入音频自动化。 */
function clamp(value, minimum, maximum) {
  return Math.max(
    minimum,
    Math.min(maximum, Number.isFinite(value) ? value : minimum),
  );
}
