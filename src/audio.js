import { FishBiteBank } from "./fish_bite_assets.js";
import { HumanVoiceBank } from "./human_voice_assets.js";
import { createFeedingSound } from "./feeding_audio.js";

/**
 * OceanAudio 提供原创海洋配乐、分层水下音效与随应用打包的真人呼喊。
 * 参数：options.context 可传入 OfflineAudioContext，便于真实离线验音。
 * 音频图仅在用户手势后创建，start 可重复调用，所有节拍由 update 推进。
 */
export class OceanAudio {
  constructor({
    context = null,
    humanVoiceBank = new HumanVoiceBank(),
    fishBiteBank = new FishBiteBank(),
  } = {}) {
    this.context = context;
    this.humanVoiceBank = humanVoiceBank;
    this.fishBiteBank = fishBiteBank;
    this.fishSoundState = "idle";
    this.fishSoundPreparation = null;
    this.lastFishVariant = -1;
    this.humanVoiceState = "idle";
    this.humanVoicePreparation = null;
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
    this.ink = 0;
    this.voices = new Set();
    this.feedingVoices = new Map();
    this.feedingBuffers = new Map();
    this.cooldowns = new Map();
    this.beat = 60 / 80;
    this.randomState = 82197;
  }

  /** start 激活或恢复音频，复用已有音频图；无参数，无返回值。 */
  start() {
    if (!this.context) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
    }
    if (this.context.state === "closed") return;
    if (!this.ready) this.createGraph();
    void this.prepareHumanVoices();
    void this.prepareFishSounds();
    this.setPaused(false);
    this.update(0, this.lastDanger, {
      boss: this.boss,
      depth: this.depth,
      aboveWater: this.aboveWater,
      ink: this.ink,
    });
  }

  /** preloadHumanVoices 在菜单预取录音，不激活AudioContext；返回是否成功。 */
  preloadHumanVoices() {
    return this.humanVoiceBank
      .preload()
      .then(() => true)
      .catch(() => false);
  }

  /** prepareHumanVoices 解码并缓存男女声线；异步完成不会补播此前的捕食。 */
  prepareHumanVoices() {
    if (this.humanVoicePreparation) return this.humanVoicePreparation;
    if (!this.context?.decodeAudioData || this.context.state === "closed")
      return Promise.resolve(false);
    this.humanVoiceState = "loading";
    this.humanVoicePreparation = this.humanVoiceBank
      .load(this.context)
      .then((buffers) => {
        for (const [sex, buffer] of buffers)
          this.feedingBuffers.set(`human_${sex}`, buffer);
        this.humanVoiceState = "ready";
        return true;
      })
      .catch(() => {
        this.humanVoiceState = "unavailable";
        this.humanVoicePreparation = null;
        return false;
      });
    return this.humanVoicePreparation;
  }

  /** preloadFishSounds 在菜单预取水声，独立于人声，不开启音频上下文。 */
  preloadFishSounds() {
    return this.fishBiteBank
      .preload()
      .then(() => true)
      .catch(() => false);
  }

  /** prepareFishSounds 缓存三个吞食变体；失败或完成都不重放旧捕食事件。 */
  prepareFishSounds() {
    if (this.fishSoundPreparation) return this.fishSoundPreparation;
    if (!this.context?.decodeAudioData || this.context.state === "closed")
      return Promise.resolve(false);
    this.fishSoundState = "loading";
    this.fishSoundPreparation = this.fishBiteBank
      .load(this.context)
      .then((buffers) => {
        for (const [variant, buffer] of buffers)
          this.feedingBuffers.set(`fish_${variant}`, buffer);
        this.fishSoundState = "ready";
        return true;
      })
      .catch(() => {
        this.fishSoundState = "unavailable";
        this.fishSoundPreparation = null;
        return false;
      });
    return this.fishSoundPreparation;
  }

  /** toggle 切换声音，首次使用时直接激活；返回当前是否启用声音。 */
  toggle() {
    if (!this.ready) {
      this.enabled = true;
      this.start();
      return this.enabled;
    }
    this.enabled = !this.enabled;
    this.master.gain.setTargetAtTime(
      this.enabled ? 0.76 : 0,
      this.context.currentTime,
      0.035,
    );
    if (this.enabled && !this.paused) {
      this.nextStep = this.context.currentTime + 0.035;
      this.step -= this.step % 16;
      this.resumeContext();
    }
    return this.enabled;
  }

  /** setPaused 暂停或继续声音时钟，参数为暂停状态，无返回值。 */
  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.context || !this.ready) return;
    this.pauseGate.gain.setValueAtTime(
      this.paused ? 0 : 1,
      this.context.currentTime,
    );
    if (this.isOffline()) return;
    if (this.paused) {
      if (this.context.state === "running")
        this.context.suspend().catch(() => {});
    } else this.resumeContext();
  }

  /** reset 清除上一局尾音和节拍，复用声音开关与主图；无参数，无返回值。 */
  reset() {
    this.lastDanger = 0;
    this.boss = false;
    this.depth = 0;
    this.aboveWater = false;
    this.ink = 0;
    this.step = 0;
    this.cooldowns.clear();
    this.feedingVoices.clear();
    if (!this.ready) return;
    const now = this.context.currentTime;
    for (const source of this.voices) {
      try {
        source.stop(now);
      } catch {
        /* 已结束的声部可以直接回收。 */
      }
    }
    this.voices.clear();
    this.nextStep = now + 0.035;
    this.nextHeartbeat = now + 0.5;
    for (const [node, value] of [
      [this.calm, 1],
      [this.chase, 0],
      [this.bossLayer, 0],
      [this.musicDuck, 1],
    ]) {
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(value, now);
    }
    // 替换卷积节点清掉上一局的混响缓存，输入与输出总线继续复用。
    this.reverbInput.disconnect(this.convolver);
    this.convolver.disconnect();
    this.connectReverb();
  }

  /**
   * update 更新分层配乐与水下混音；time 为游戏时间，danger 为 0–1 危险值。
   * options 接收 boss、世界单位 depth、aboveWater 和 0–1 的 ink；无返回值。
   */
  update(
    time,
    danger,
    { boss = false, depth = 0, aboveWater = false, ink = 0 } = {},
  ) {
    void time;
    this.lastDanger = clamp(danger, 0, 1);
    this.boss = Boolean(boss);
    this.depth = Math.max(0, Number.isFinite(depth) ? depth : 0);
    this.aboveWater = Boolean(aboveWater);
    this.ink = clamp(ink, 0, 1);
    if (!this.ready || this.paused) return;
    const now = this.context.currentTime;
    const intensity = Math.sqrt(this.lastDanger);
    const depthRatio = clamp(this.depth / 740, 0, 1);
    const muffling = 1 - this.ink * 0.67;
    this.calm.gain.setTargetAtTime(
      this.boss ? 0.22 : 0.86 * (1 - intensity * 0.55),
      now,
      0.8,
    );
    this.chase.gain.setTargetAtTime(this.boss ? 0.6 : intensity, now, 0.38);
    this.chaseFast.gain.setTargetAtTime(
      this.boss ? 0.8 : this.lastDanger ** 2,
      now,
      0.35,
    );
    this.bossLayer.gain.setTargetAtTime(
      this.boss ? Math.max(0.72, intensity) : 0,
      now,
      0.5,
    );
    this.chaseFilter.frequency.setTargetAtTime(
      520 + this.lastDanger * 1150,
      now,
      0.6,
    );
    this.musicFilter.frequency.setTargetAtTime(
      (this.aboveWater ? 7800 : 3500 - depthRatio * 1600) * muffling,
      now,
      0.4,
    );
    this.effectsFilter.frequency.setTargetAtTime(
      (this.aboveWater ? 8500 : 4300 - depthRatio * 1500) * muffling,
      now,
      0.18,
    );
    this.waterFilter.frequency.setTargetAtTime(
      this.aboveWater ? 1700 : 340 - depthRatio * 150,
      now,
      0.55,
    );
    this.waterGain.gain.setTargetAtTime(
      this.aboveWater ? 0.035 : 0.058 + depthRatio * 0.023 + this.ink * 0.01,
      now,
      0.6,
    );
    this.currentGain.gain.setTargetAtTime(
      this.aboveWater ? 0.012 : 0.021 + intensity * 0.012,
      now,
      0.7,
    );
    if (!this.enabled) return;

    // 跳过掉帧期间错过的拍点，避免恢复画面时堆叠大量音符。
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
    if (this.lastDanger > 0.23 && now >= this.nextHeartbeat) {
      const level = 0.065 + this.lastDanger * 0.055;
      this.note(61, now + 0.01, 0.16, level, this.effects, {
        end: 38,
        type: "bass",
      });
      this.note(53, now + 0.19, 0.15, level * 0.58, this.effects, { end: 33 });
      this.nextHeartbeat = now + 1.15 - this.lastDanger * 0.44;
    }
  }

  /** eat 播放咬合、水压与水泡；size 为可选的 0.5–2 捕食强度，无返回值。 */
  eat(size = 1) {
    if (!this.effectReady("eat", 0.075)) return;
    const at = this.context.currentTime + 0.004;
    const strength = clamp(size, 0.5, 2);
    this.note(126, at, 0.18, 0.22 * strength, this.effects, {
      end: 47,
      type: "bass",
      cutoff: 850,
    });
    this.noise(
      at,
      0.075,
      0.18 * strength,
      this.effects,
      690,
      "bandpass",
      0.003,
      { end: 380, q: 0.7 },
    );
    this.noise(
      at + 0.035,
      0.38,
      0.14 * strength,
      this.effects,
      460,
      "lowpass",
      0.024,
      { end: 180 },
    );
    this.bubbles(at + 0.045, 4, 0.045 * strength, 330, 0.045);
    this.duckMusic(0.82, 0.14);
  }

  /** eatFish 播放短湿咬合、水流与气泡；size 为 0.5–2 强度，无返回值。 */
  eatFish(size = 1) {
    this.playFeeding("fish", size);
  }

  /** eatHuman 按sex播放成年男女惨叫；size为0.5–2强度，sex默认male，无返回值。 */
  eatHuman(size = 1, sex = "male") {
    this.playFeeding("human", size, sex === "female" ? "female" : "male");
  }

  /** hit 播放身体冲击、低频水压与震荡尾声；strength 为可选受击强度，无返回值。 */
  hit(strength = 1) {
    if (!this.effectReady("hit", 0.16)) return;
    const at = this.context.currentTime + 0.004;
    const level = clamp(strength, 0.5, 1.6);
    this.note(148, at, 0.47, 0.35 * level, this.effects, {
      end: 32,
      type: "bass",
      cutoff: 720,
    });
    this.note(48, at + 0.03, 0.84, 0.18 * level, this.effects, {
      end: 35,
      attack: 0.022,
    });
    this.noise(at, 0.16, 0.3 * level, this.effects, 780, "lowpass", 0.003, {
      end: 320,
    });
    this.noise(
      at + 0.055,
      0.68,
      0.2 * level,
      this.effects,
      220,
      "bandpass",
      0.045,
      { end: 110, q: 0.8 },
    );
    this.duckMusic(0.54, 0.42);
  }

  /** sonar 播放柔和声呐及两次衰减回声；无参数，无返回值。 */
  sonar() {
    if (!this.effectReady("sonar", 0.4)) return;
    const at = this.context.currentTime + 0.006;
    for (const [delay, volume] of [
      [0, 0.2],
      [0.43, 0.055],
      [0.86, 0.025],
    ]) {
      this.note(660, at + delay, 1.14, volume, this.effects, {
        end: 636,
        attack: 0.025,
        cutoff: 1400,
        pan: delay ? -0.18 : 0.18,
      });
      this.note(990, at + delay + 0.012, 0.56, volume * 0.11, this.effects, {
        end: 971,
        attack: 0.024,
      });
    }
  }

  /** breach 播放从低通水流打开到空气的破水声；无参数，无返回值。 */
  breach() {
    if (!this.effectReady("breach", 0.3)) return;
    const at = this.context.currentTime + 0.005;
    this.noise(at, 0.68, 0.32, this.effects, 390, "lowpass", 0.065, {
      end: 4900,
      hold: 0.12,
      pan: -0.16,
    });
    this.noise(at + 0.12, 0.55, 0.17, this.effects, 1900, "bandpass", 0.075, {
      end: 3300,
      q: 0.48,
      pan: 0.18,
    });
    this.note(95, at, 0.25, 0.14, this.effects, { end: 44 });
    this.bubbles(at + 0.08, 5, 0.037, 380, 0.06);
  }

  /** splash 播放落水撞击、翻涌水花和闭合的水下滤波；无参数，无返回值。 */
  splash() {
    if (!this.effectReady("splash", 0.3)) return;
    const at = this.context.currentTime + 0.005;
    this.note(138, at, 0.49, 0.29, this.effects, { end: 35, type: "bass" });
    this.noise(at, 0.22, 0.37, this.effects, 3600, "lowpass", 0.007, {
      end: 780,
      pan: -0.12,
    });
    this.noise(at + 0.035, 1.14, 0.3, this.effects, 1850, "lowpass", 0.055, {
      end: 180,
      hold: 0.11,
      pan: 0.14,
    });
    this.bubbles(at + 0.18, 8, 0.038, 420, 0.075);
    this.duckMusic(0.7, 0.38);
  }

  /** pickup 播放奖励和声；kind 为 stamina、flow 或 frenzy，无返回值。 */
  pickup(kind) {
    if (!this.effectReady("pickup", 0.16)) return;
    const at = this.context.currentTime + 0.006;
    const chord =
      kind === "frenzy"
        ? [50, 57, 62, 65]
        : kind === "flow"
          ? [57, 64, 69, 74]
          : [62, 69, 74];
    chord.forEach((pitch, index) => {
      this.note(midi(pitch), at + index * 0.11, 1.05, 0.12, this.effects, {
        type: "felt",
        attack: 0.055,
        cutoff: 2100,
        pan: (index - 1.5) * 0.16,
      });
    });
    this.bubbles(at, 4, 0.03, 290, 0.06);
    if (kind === "frenzy")
      this.note(73.42, at, 1.2, 0.2, this.effects, {
        type: "warm",
        attack: 0.1,
        cutoff: 470,
        end: 55,
      });
  }

  /** hunter 播放捕食者逼近声；kind 决定共鸣频段，同类自动限频，无返回值。 */
  hunter(kind = "shark") {
    if (!this.effectReady(`hunter_${kind}`, 2.6)) return;
    const at = this.context.currentTime + 0.006;
    const root =
      {
        shark: 83,
        dunkleosteus: 69,
        angler: 112,
        squid: 61,
        octopus: 67,
        kraken: 44,
        leviathan: 36.71,
        mayan: 52,
        hydra: 48,
      }[kind] || 76;
    this.note(root * 1.5, at, 1.32, 0.15, this.effects, {
      type: "reed",
      end: root * 0.83,
      cutoff: 520,
      attack: 0.13,
      hold: 0.12,
      pan: -0.14,
    });
    this.note(root * 1.015, at + 0.1, 1.46, 0.14, this.effects, {
      type: "warm",
      end: root * 0.72,
      attack: 0.16,
      pan: 0.14,
    });
    this.noise(
      at + 0.025,
      1.08,
      0.19,
      this.effects,
      root * 4.1,
      "bandpass",
      0.15,
      { end: root * 2, q: 1.2, hold: 0.18 },
    );
    this.duckMusic(0.69, 0.7);
  }

  /** bossAttack 播放领主攻击前兆，kind 决定共鸣基音；无返回值。 */
  bossAttack(kind) {
    if (!this.effectReady("boss_attack", 0.7)) return;
    const at = this.context.currentTime + 0.006;
    const root =
      kind === "kraken"
        ? 43.65
        : kind === "leviathan"
          ? 36.71
          : kind === "hydra"
            ? 48.99
            : 51.91;
    this.note(root * 2.8, at, 1.65, 0.19, this.effects, {
      type: "reed",
      end: root * 1.13,
      attack: 0.22,
      cutoff: 610,
      hold: 0.28,
      pan: -0.21,
    });
    this.note(root * 1.035, at + 0.12, 1.85, 0.19, this.effects, {
      type: "warm",
      end: root * 0.78,
      attack: 0.26,
      hold: 0.19,
      pan: 0.19,
    });
    this.noise(at + 0.06, 1.5, 0.25, this.effects, 490, "bandpass", 0.2, {
      end: 180,
      q: 0.95,
      hold: 0.24,
    });
    this.drum(at + 0.48, 0.27, this.effects, 0.67);
    this.duckMusic(0.48, 1.1);
  }

  /** victory 播放温暖而舒展的终局和声；无参数，无返回值。 */
  victory() {
    if (!this.effectReady("victory", 2)) return;
    const at = this.context.currentTime + 0.025;
    [62, 66, 69, 74, 78, 81].forEach((pitch, index) => {
      this.note(midi(pitch), at + index * 0.22, 2.2, 0.12, this.effects, {
        type: "felt",
        attack: 0.07,
        cutoff: 2800,
        pan: (index - 2.5) * 0.12,
      });
    });
    [50, 57, 62, 66, 69].forEach((pitch, index) =>
      this.pad(
        midi(pitch),
        at + 0.35,
        4.4,
        0.045,
        this.effects,
        (index - 2) * 0.22,
      ),
    );
    this.duckMusic(0.65, 2.2);
  }

  /** tone 保留通用接口，参数依次为频率、时长、音量及结束频率；无返回值。 */
  tone(frequency, duration = 0.3, volume = 0.2, end = frequency) {
    if (!this.canPlay()) return;
    this.note(
      frequency,
      this.context.currentTime + 0.005,
      duration,
      volume,
      this.effects,
      { end, type: "felt", cutoff: 2200 },
    );
  }

  /*********************************************
   * 内部声部、空间与调度
   ********************************************/

  createGraph() {
    const context = this.context;
    this.mix = context.createGain();
    const rumbleCut = context.createBiquadFilter();
    rumbleCut.type = "highpass";
    rumbleCut.frequency.value = 24;
    rumbleCut.Q.value = 0.5;
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.22;
    const safety = context.createWaveShaper();
    const curve = new Float32Array(4097);
    for (let index = 0; index < curve.length; index++) {
      const input = (index / (curve.length - 1)) * 2 - 1;
      curve[index] = Math.tanh(input * 1.14) * 0.94;
    }
    safety.curve = curve;
    safety.oversample = "2x";
    this.master = context.createGain();
    this.master.gain.value = this.enabled ? 0.76 : 0;
    this.pauseGate = context.createGain();
    this.mix
      .connect(rumbleCut)
      .connect(this.compressor)
      .connect(safety)
      .connect(this.master)
      .connect(this.pauseGate)
      .connect(context.destination);

    this.music = this.makeBus(0.69);
    this.musicDuck = this.makeBus(1);
    this.musicFilter = context.createBiquadFilter();
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 3500;
    this.musicFilter.Q.value = 0.45;
    this.music
      .connect(this.musicDuck)
      .connect(this.musicFilter)
      .connect(this.mix);
    this.effects = this.makeBus(0.86);
    this.effectsFilter = context.createBiquadFilter();
    this.effectsFilter.type = "lowpass";
    this.effectsFilter.frequency.value = 4300;
    this.effectsFilter.Q.value = 0.45;
    this.effects.connect(this.effectsFilter).connect(this.mix);
    this.calm = this.makeBus(0.86, this.music);
    this.chaseFilter = context.createBiquadFilter();
    this.chaseFilter.type = "lowpass";
    this.chaseFilter.frequency.value = 520;
    this.chaseFilter.Q.value = 0.55;
    this.chaseFilter.connect(this.music);
    this.chase = this.makeBus(0, this.chaseFilter);
    this.chaseFast = this.makeBus(0, this.chase);
    this.bossLayer = this.makeBus(0, this.music);

    this.waves = {
      warm: this.harmonicWave([1, 0.2, 0.095, 0.028, 0.012]),
      bass: this.harmonicWave([1, 0.31, 0.075, 0.019]),
      felt: this.harmonicWave([1, 0.29, 0.12, 0.048, 0.012]),
      reed: this.harmonicWave([1, 0.13, 0.29, 0.047, 0.085]),
    };
    this.reverbInput = this.makeBus(1);
    this.musicWet = this.makeBus(0.26, this.reverbInput);
    this.effectsWet = this.makeBus(0.14, this.reverbInput);
    this.musicFilter.connect(this.musicWet);
    this.effectsFilter.connect(this.effectsWet);
    this.reverbFilter = context.createBiquadFilter();
    this.reverbFilter.type = "lowpass";
    this.reverbFilter.frequency.value = 1700;
    this.reverbFilter.Q.value = 0.4;
    this.reverbFilter.connect(this.mix);
    this.reverbImpulse = this.createImpulse(2.6);
    this.connectReverb();

    this.noiseBuffer = context.createBuffer(
      1,
      context.sampleRate * 3,
      context.sampleRate,
    );
    const samples = this.noiseBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++)
      samples[index] = this.random() * 2 - 1;
    this.waterSource = context.createBufferSource();
    this.waterSource.buffer = this.noiseBuffer;
    this.waterSource.loop = true;
    this.waterFilter = context.createBiquadFilter();
    this.waterFilter.type = "lowpass";
    this.waterFilter.frequency.value = 340;
    this.waterFilter.Q.value = 0.6;
    this.waterGain = this.makeBus(0.058, this.mix);
    this.waterSource.connect(this.waterFilter).connect(this.waterGain);
    this.currentFilter = context.createBiquadFilter();
    this.currentFilter.type = "bandpass";
    this.currentFilter.frequency.value = 720;
    this.currentFilter.Q.value = 0.4;
    this.currentGain = this.makeBus(0.021, this.mix);
    this.waterSource.connect(this.currentFilter).connect(this.currentGain);
    this.waterSource.start();
    this.nextStep = context.currentTime + 0.035;
    this.ready = true;
  }

  playFeeding(kind, size, sex = "male") {
    if (!this.canPlay()) return;
    const human = kind === "human";
    let bufferKey = human ? `human_${sex}` : kind;
    // 首次加载或网络失败时只给短水声，不回退电子人声，也不在下载完成后补叫。
    if (human && !this.feedingBuffers.has(bufferKey)) {
      this.playFeeding("fish", size);
      return;
    }
    // 密集鱼群最多叠三口，人声最多一条；优先让新发生的人类捕食获得清晰反馈。
    if (human && [...this.feedingVoices.values()].includes("human")) return;
    if (this.feedingVoices.size >= 3 && !human) return;
    const cooldown = human
      ? this.feedingBuffers.get(bufferKey).duration + 0.12
      : 0.09;
    if (!this.effectReady(`eat_${kind}`, cooldown)) return;
    if (this.feedingVoices.size >= 3) {
      const oldest = this.feedingVoices.keys().next().value;
      oldest.stop(this.context.currentTime);
      this.feedingVoices.delete(oldest);
    }
    // 只在准许播放后选择下一个样本，连续吃鱼不重复同一口；拒绝的事件不消耗变体。
    if (!human && this.fishSoundState === "ready") {
      this.lastFishVariant =
        (this.lastFishVariant + 1 + Math.floor(this.random() * 2)) % 3;
      bufferKey = `fish_${this.lastFishVariant}`;
    }
    // 录音优先，鱼声未就绪时用短柔水流立即反馈，不沿用旧爆音和音高气泡。
    let buffer = this.feedingBuffers.get(bufferKey);
    if (!buffer) {
      const samples = createFeedingSound(kind, this.context.sampleRate);
      buffer = this.context.createBuffer(
        1,
        samples.length,
        this.context.sampleRate,
      );
      buffer.getChannelData(0).set(samples);
      this.feedingBuffers.set(bufferKey, buffer);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    source.playbackRate.value = human ? 1 : 0.97 + this.random() * 0.06;
    const level = clamp(size, 0.5, 2);
    const gain = this.makeBus((human ? 0.38 : 0.32) * Math.sqrt(level));
    const nodes = [source, gain];
    const at = this.context.currentTime + 0.004;
    if (human) {
      // 保留真人起音和自然声线，仅在后半段模拟入水闷化，不拉伸或移调。
      const water = this.context.createBiquadFilter();
      water.type = "lowpass";
      water.Q.value = 0.5;
      water.frequency.setValueAtTime(7800, at);
      water.frequency.setValueAtTime(7800, at + buffer.duration * 0.5);
      water.frequency.exponentialRampToValueAtTime(
        950,
        at + buffer.duration * 0.94,
      );
      source.connect(water).connect(gain);
      nodes.push(water);
    } else source.connect(gain);
    this.connectVoice(gain, this.effects, (this.random() - 0.5) * 0.24, nodes);
    this.feedingVoices.set(source, kind);
    this.releaseWhenEnded(source, nodes, () =>
      this.feedingVoices.delete(source),
    );
    source.start(at);
    source.stop(at + buffer.duration / source.playbackRate.value + 0.01);
    // 人声的主要呼喊段留出配乐空间；期间的小鱼音效不能提前解除该让位。
    if (human) this.duckMusic(0.68, buffer.duration * 0.84);
    else if (![...this.feedingVoices.values()].includes("human"))
      this.duckMusic(0.96, 0.08);
  }

  scheduleMusicStep(at, step) {
    const subdivision = this.beat / 2;
    const bar = Math.floor(step / 16) % 4;
    const inPhrase = step % 16;
    const harmony = [
      [50, 57, 60, 65],
      [46, 53, 57, 62],
      [53, 60, 64, 69],
      [48, 55, 62, 65],
    ][bar];
    const bass = harmony[0] - 12;

    // 舒缓层以长起音的双振荡和声铺底，旋律只在留白处出现。
    if (inPhrase === 0) {
      harmony.forEach((pitch, index) =>
        this.pad(
          midi(pitch),
          at + index * 0.04,
          this.beat * 8.9,
          0.044,
          this.calm,
          (index - 1.5) * 0.31,
        ),
      );
      this.note(midi(bass), at, this.beat * 7.4, 0.1, this.calm, {
        type: "warm",
        attack: 0.5,
        hold: this.beat * 3.4,
        cutoff: 680,
      });
    }
    if (inPhrase === 5 || inPhrase === 13) {
      const pitch = [
        [69, 74],
        [65, 69],
        [72, 76],
        [67, 74],
      ][bar][inPhrase === 5 ? 0 : 1];
      this.note(midi(pitch), at, 2.6, 0.1, this.calm, {
        type: "felt",
        attack: 0.17,
        hold: 0.17,
        cutoff: 1500,
        pan: inPhrase === 5 ? -0.32 : 0.3,
      });
      this.noise(at + 0.035, 1.4, 0.016, this.calm, 1150, "bandpass", 0.21, {
        q: 0.7,
        pan: inPhrase === 5 ? 0.23 : -0.23,
      });
    }

    if (this.lastDanger > 0.015 || this.boss) {
      const pitch = bass + [0, 0, 7, 0, 3, 0, 7, -1][step % 8];
      this.note(midi(pitch), at, 0.29, 0.19, this.chase, {
        type: "bass",
        attack: 0.019,
        hold: 0.052,
        cutoff: 1050,
      });
      this.note(
        midi(pitch + (step % 2 ? 0 : 7)),
        at + subdivision * 0.5,
        0.17,
        0.105,
        this.chaseFast,
        {
          type: "felt",
          attack: 0.015,
          hold: 0.026,
          cutoff: 1300,
          pan: step % 2 ? -0.16 : 0.16,
        },
      );
      if (step % 4 === 0 || step % 8 === 7)
        this.drum(at, 0.27, this.chase, 0.9);
      if (step % 4 === 2) {
        this.noise(at, 0.17, 0.09, this.chase, 730, "bandpass", 0.006, {
          end: 410,
          q: 0.6,
        });
        this.note(138, at + 0.01, 0.22, 0.065, this.chase, {
          end: 82,
          type: "felt",
        });
      }
      this.noise(
        at + subdivision * 0.5,
        0.09,
        0.025,
        this.chaseFast,
        1400,
        "bandpass",
        0.01,
        { q: 0.5, pan: step % 2 ? 0.3 : -0.3 },
      );
      if (inPhrase === 0)
        this.pad(midi(bass + 19), at, this.beat * 7.5, 0.044, this.chase, 0.13);
    }

    // 领主使用独立的六拍战鼓型与低共鸣，而非把追逐旋律简单加响。
    if (this.boss) {
      const bossStep = step % 12;
      if ([0, 3, 4, 8, 10].includes(bossStep)) {
        this.drum(
          at,
          bossStep === 0 ? 0.37 : 0.24,
          this.bossLayer,
          bossStep % 2 ? 0.79 : 0.61,
        );
        this.noise(
          at + 0.035,
          0.45,
          0.13,
          this.bossLayer,
          340,
          "lowpass",
          0.035,
          { end: 170 },
        );
      }
      if (step % 4 === 1)
        this.note(midi(bass + 7), at, 0.65, 0.12, this.bossLayer, {
          type: "reed",
          cutoff: 620,
          attack: 0.05,
          pan: step % 8 ? -0.2 : 0.2,
        });
      if (inPhrase === 0) {
        this.pad(midi(bass), at, this.beat * 8.5, 0.09, this.bossLayer, -0.1);
        this.note(
          midi(bass + 13),
          at + 0.14,
          this.beat * 7.5,
          0.075,
          this.bossLayer,
          { type: "reed", attack: 0.8, hold: 1.3, cutoff: 490, pan: 0.16 },
        );
      }
    }
  }

  pad(frequency, at, duration, volume, destination, pan = 0) {
    for (const sign of [-1, 1])
      this.note(frequency, at, duration, volume, destination, {
        type: "warm",
        attack: Math.min(1.15, duration * 0.25),
        hold: duration * 0.43,
        cutoff: 1250,
        detune: sign * 4.1,
        pan: clamp(pan + sign * 0.15, -0.8, 0.8),
      });
  }

  note(
    frequency,
    at,
    duration,
    volume,
    destination,
    {
      type = "sine",
      end = frequency,
      attack = 0.012,
      hold = 0,
      cutoff = 0,
      pan = 0,
      detune = 0,
    } = {},
  ) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const onset = Math.max(context.currentTime, at);
    const length = Math.max(0.04, duration);
    if (this.waves[type]) oscillator.setPeriodicWave(this.waves[type]);
    else
      oscillator.type = ["sine", "triangle", "sawtooth", "square"].includes(
        type,
      )
        ? type
        : "sine";
    oscillator.detune.value = detune;
    oscillator.frequency.setValueAtTime(clamp(frequency, 18, 12000), onset);
    if (end !== frequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        clamp(end, 18, 12000),
        onset + length,
      );
    this.envelope(envelope.gain, onset, length, volume, attack, hold);
    const nodes = [oscillator, envelope];
    if (cutoff > 0) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      filter.Q.value = 0.45;
      oscillator.connect(filter).connect(envelope);
      nodes.push(filter);
    } else oscillator.connect(envelope);
    this.connectVoice(envelope, destination, pan, nodes);
    this.releaseWhenEnded(oscillator, nodes);
    oscillator.start(onset);
    oscillator.stop(onset + length + 0.02);
  }

  noise(
    at,
    duration,
    volume,
    destination,
    frequency = 1200,
    filterType = "bandpass",
    attack = 0.01,
    { end = frequency, q = 0.55, pan = 0, hold = 0 } = {},
  ) {
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    const envelope = context.createGain();
    const onset = Math.max(context.currentTime, at);
    const length = Math.max(0.04, duration);
    filter.frequency.setValueAtTime(clamp(frequency, 25, 10000), onset);
    if (end !== frequency)
      filter.frequency.exponentialRampToValueAtTime(
        clamp(end, 25, 10000),
        onset + length,
      );
    this.envelope(envelope.gain, onset, length, volume, attack, hold);
    source.connect(filter).connect(envelope);
    const nodes = [source, filter, envelope];
    this.connectVoice(envelope, destination, pan, nodes);
    this.releaseWhenEnded(source, nodes);
    source.start(onset, this.random() * 1.8);
    source.stop(onset + length + 0.02);
  }

  bubbles(at, count, volume, frequency, gap) {
    for (let index = 0; index < count; index++) {
      const pitch = frequency * (0.74 + this.random() * 0.82);
      this.note(
        pitch,
        at + index * gap + this.random() * 0.012,
        0.075 + this.random() * 0.07,
        volume * (1 - index / (count + 2)),
        this.effects,
        {
          end: pitch * 0.43,
          attack: 0.006,
          cutoff: 1100,
          pan: (this.random() - 0.5) * 0.8,
        },
      );
    }
  }

  drum(at, volume, destination, pitch = 1) {
    this.note(123 * pitch, at, 0.59, volume, destination, {
      end: 42 * pitch,
      type: "bass",
      cutoff: 720,
      attack: 0.007,
    });
    this.note(171 * pitch, at + 0.008, 0.27, volume * 0.24, destination, {
      end: 86 * pitch,
      type: "felt",
      attack: 0.009,
    });
    this.noise(
      at + 0.003,
      0.09,
      volume * 0.31,
      destination,
      660,
      "lowpass",
      0.004,
      { end: 310 },
    );
  }

  envelope(parameter, onset, duration, volume, attack, hold) {
    const rise = Math.max(0.002, Math.min(attack, duration * 0.35));
    const sustain = Math.min(Math.max(0, hold), duration - rise - 0.018);
    parameter.setValueAtTime(0.00001, onset);
    parameter.linearRampToValueAtTime(
      clamp(volume, 0.00002, 1.2),
      onset + rise,
    );
    if (sustain > 0)
      parameter.linearRampToValueAtTime(
        clamp(volume * 0.87, 0.00002, 1.2),
        onset + rise + sustain,
      );
    parameter.exponentialRampToValueAtTime(0.00001, onset + duration);
  }

  connectVoice(envelope, destination, pan, nodes) {
    if (
      Math.abs(pan) > 0.01 &&
      typeof this.context.createStereoPanner === "function"
    ) {
      const panner = this.context.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      envelope.connect(panner).connect(destination);
      nodes.push(panner);
    } else envelope.connect(destination);
  }

  duckMusic(level, hold) {
    const at = this.context.currentTime;
    const gain = this.musicDuck.gain;
    if (typeof gain.cancelAndHoldAtTime === "function")
      gain.cancelAndHoldAtTime(at);
    else {
      gain.cancelScheduledValues(at);
      gain.setValueAtTime(gain.value, at);
    }
    gain.setTargetAtTime(level, at, 0.018);
    gain.setTargetAtTime(1, at + hold, 0.27);
  }

  harmonicWave(partials) {
    const real = new Float32Array(partials.length + 1);
    const imaginary = new Float32Array(partials.length + 1);
    partials.forEach((value, index) => {
      imaginary[index + 1] = value;
    });
    return this.context.createPeriodicWave(real, imaginary);
  }

  createImpulse(duration) {
    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(
      2,
      length,
      this.context.sampleRate,
    );
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let smooth = 0;
      for (let index = 0; index < length; index++) {
        smooth = smooth * 0.62 + (this.random() * 2 - 1) * 0.38;
        const progress = index / length;
        samples[index] =
          smooth *
          (1 - progress) ** 2.8 *
          Math.min(1, index / (this.context.sampleRate * 0.014));
      }
      for (const [delay, amplitude] of [
        [0.039 + channel * 0.007, 0.2],
        [0.091 - channel * 0.009, 0.12],
        [0.163 + channel * 0.014, 0.055],
      ])
        samples[Math.floor(delay * this.context.sampleRate)] += amplitude;
    }
    return buffer;
  }

  connectReverb() {
    this.convolver = this.context.createConvolver();
    this.convolver.buffer = this.reverbImpulse;
    this.reverbInput.connect(this.convolver).connect(this.reverbFilter);
  }

  makeBus(gain, destination = null) {
    const node = this.context.createGain();
    node.gain.value = gain;
    if (destination) node.connect(destination);
    return node;
  }

  releaseWhenEnded(source, nodes, onEnded = null) {
    this.voices.add(source);
    source.onended = () => {
      for (const node of nodes) node.disconnect();
      this.voices.delete(source);
      onEnded?.();
    };
  }

  effectReady(name, interval) {
    if (!this.canPlay()) return false;
    const now = this.context.currentTime;
    if (now < (this.cooldowns.get(name) ?? -Infinity)) return false;
    this.cooldowns.set(name, now + interval);
    return true;
  }

  random() {
    this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  canPlay() {
    return (
      this.ready &&
      this.enabled &&
      !this.paused &&
      this.context.state !== "closed"
    );
  }

  isOffline() {
    return this.context && typeof this.context.startRendering === "function";
  }

  resumeContext() {
    if (!this.isOffline() && this.context.state === "suspended")
      this.context.resume().catch(() => {});
  }
}

/** midi 将原创乐句的音高换算为赫兹。 */
function midi(pitch) {
  return 440 * 2 ** ((pitch - 69) / 12);
}

/** clamp 限制有限数值，避免无效游戏状态进入音频参数。 */
function clamp(value, minimum, maximum) {
  return Math.max(
    minimum,
    Math.min(maximum, Number.isFinite(value) ? value : minimum),
  );
}
