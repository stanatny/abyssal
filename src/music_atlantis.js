/**
 * ATLANTIS_SCORE 定义原创遗城配乐的八段和声与稀疏动机。
 * 一个完整和声周期约 148 秒；每两轮动机换位，避免短小机械循环。
 */
export const ATLANTIS_SCORE = Object.freeze({
  beat: 60 / 52,
  phraseSteps: 32,
  harmony: [
    [38, 57, 60, 64, 69],
    [36, 55, 59, 62, 66],
    [34, 53, 57, 60, 65],
    [38, 57, 62, 64, 69],
    [41, 57, 60, 64, 67],
    [36, 55, 60, 62, 67],
    [43, 58, 62, 65, 69],
    [33, 55, 59, 62, 64],
  ],
  motifs: [
    [
      [3, 76],
      [11, 81],
      [23, 74],
    ],
    [
      [6, 78],
      [15, 74],
    ],
    [
      [4, 77],
      [13, 72],
      [26, 69],
    ],
    [
      [8, 76],
      [18, 74],
    ],
    [
      [3, 79],
      [12, 76],
      [24, 72],
    ],
    [
      [7, 74],
      [20, 79],
    ],
    [
      [5, 77],
      [16, 81],
      [27, 74],
    ],
    [
      [6, 76],
      [17, 71],
      [25, 69],
    ],
  ],
});

/**
 * AtlantisMusic 编排慢速弦幕、共鸣石钟、水流纹理与独立追逐/领主层。
 * 参数 audio 为 OceanAudio，输出沿用它的音乐总线、滤波与警报让位。
 */
export class AtlantisMusic {
  constructor(audio) {
    this.audio = audio;
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = 0;
    this.combatBeat = 60 / 104;
    this.pressure = audio.makeBus(0, audio.music);
    this.exploration = audio.makeBus(0.82, audio.music);
    this.pursuit = audio.makeBus(0, audio.music);
    this.guardian = audio.makeBus(0, audio.music);
    for (const bus of this.buses) audio.musicDestinations.add(bus);
    audio.waves.atlantis_veil = audio.harmonicWave([
      1, 0.08, 0.24, 0.025, 0.064, 0.008, 0.015,
    ]);
    audio.waves.atlantis_bow = audio.harmonicWave([
      1, 0.4, 0.22, 0.13, 0.065, 0.03,
    ]);
    audio.waves.atlantis_stone = audio.harmonicWave([1, 0.14, 0.035]);
  }

  /** buses 返回可回收的音乐层，不包含音效与水体环境声。 */
  get buses() {
    return [this.exploration, this.pressure, this.pursuit, this.guardian];
  }

  /** update 随深度、追逐与领主状态平滑调配声部；无返回值。 */
  update(now) {
    const audio = this.audio;
    const danger = Math.sqrt(audio.lastDanger);
    const pressure = Math.min(1, audio.depth / 560);
    const combat = audio.pursuing || audio.boss;
    this.exploration.gain.setTargetAtTime(
      combat ? (audio.boss ? 0.3 : 0.33) : 0.9,
      now,
      combat ? 0.18 : 1.3,
    );
    this.pressure.gain.setTargetAtTime(0.16 + pressure * 0.62, now, 2.2);
    this.pursuit.gain.setTargetAtTime(
      combat ? (audio.boss ? 0.95 : 1.05 + danger * 0.25) : 0,
      now,
      combat ? 0.085 : 0.9,
    );
    this.guardian.gain.setTargetAtTime(
      audio.boss ? 1.05 : 0,
      now,
      audio.boss ? 0.12 : 1.1,
    );
    if (!combat || !audio.canPlay()) {
      this.combatActive = false;
      return;
    }
    // 追击采用独立的双倍速度时钟，不等待慢速探索乐句的下一个稀疏落点。
    if (!this.combatActive) {
      this.combatActive = true;
      this.combatStep = 0;
      this.nextCombatStep = now + 0.012;
    }
    const subdivision = this.combatBeat / 2;
    if (this.nextCombatStep < now - subdivision) {
      const skipped = Math.ceil((now - this.nextCombatStep) / subdivision);
      this.combatStep += skipped;
      this.nextCombatStep += skipped * subdivision;
    }
    while (this.nextCombatStep < now + 0.18) {
      this.scheduleCombat(this.nextCombatStep, this.combatStep);
      this.nextCombatStep += subdivision;
      this.combatStep++;
    }
  }

  /** reset 清除音量自动化；源与尾音由 OceanAudio 统一回收。 */
  reset(now) {
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = now;
    for (const [index, bus] of this.buses.entries()) {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(index === 0 ? 0.82 : 0, now);
    }
  }

  /** schedule 根据长乐句进度安排一拍，参数 at 为音频时间、step 为细分拍。 */
  schedule(at, step) {
    const audio = this.audio;
    const beat = ATLANTIS_SCORE.beat;
    const section = Math.floor(step / 32) % 8;
    const phrase = step % 32;
    const cycle = Math.floor(step / 256);
    const harmony = ATLANTIS_SCORE.harmony[section];
    const root = harmony[0];

    // 18 秒和声中间缓慢换位，保留开放五度与九度，石钟之间有清楚留白。
    if (phrase === 0 || phrase === 16) {
      const second = phrase === 16;
      harmony.slice(1).forEach((pitch, index) => {
        const inversion = second && index === 0 ? 12 : 0;
        this.veil(
          pitch + inversion,
          at + index * 0.12,
          beat * 10.5,
          0.024,
          (index - 1.5) * 0.36,
        );
      });
      audio.note(midi(root), at, beat * 10.8, 0.075, this.exploration, {
        type: "atlantis_stone",
        attack: 1.6,
        hold: 3.7,
        cutoff: 380,
      });
      audio.noise(
        at + 0.2,
        beat * 9.9,
        0.055,
        this.pressure,
        230 + section * 16,
        "bandpass",
        2.1,
        {
          end: second ? 160 : 480,
          q: 1.3,
          hold: 2.5,
          pan: second ? 0.32 : -0.32,
        },
      );
      audio.note(midi(root + 12), at + 0.18, beat * 10, 0.022, this.pressure, {
        type: "atlantis_veil",
        attack: 2.1,
        hold: 3.2,
        cutoff: 600,
        detune: -7,
        pan: -0.24,
      });
    }

    for (const [position, pitch] of ATLANTIS_SCORE.motifs[section]) {
      if (phrase !== position) continue;
      const pan = position % 2 ? -0.33 : 0.3;
      const octave = cycle % 3 === 2 && position > 15 ? -12 : 0;
      this.stone(pitch + octave, at, 0.068, pan);
      // 隔轮才出现低一八度的远方应答，淡入淡出而不使用反馈延迟环。
      if (cycle % 2 && position < 16)
        this.stone(pitch - 12, at + beat * 2.6, 0.024, -pan);
    }
  }

  /** scheduleCombat 推进独立战斗乐句，保留探索和声但增加快速中音弦与明确重拍。 */
  scheduleCombat(at, step) {
    const audio = this.audio;
    const section = Math.floor(audio.step / 32) % 8;
    const harmony = ATLANTIS_SCORE.harmony[section];
    const root = harmony[0];
    const pulse = step % 8;
    const interval = [0, 7, 0, 3, 5, 0, 7, 2][pulse];
    // 中音弦保留手机扬声器可辨识的泛音；低弦及鼓体提供重量，避免只剩低频噪声。
    if ([0, 2, 3, 4, 6].includes(pulse)) {
      audio.note(midi(root + 24 + interval), at, 0.32, 0.145, this.pursuit, {
        type: "atlantis_bow",
        attack: 0.024,
        hold: 0.07,
        cutoff: 1850,
        pan: pulse % 3 ? 0.2 : -0.2,
      });
      audio.note(midi(root + 12), at, 0.42, 0.17, this.pursuit, {
        type: "atlantis_stone",
        attack: 0.02,
        hold: 0.085,
        cutoff: 1150,
      });
    }
    if (pulse === 0 || pulse === 4)
      this.frameDrum(at, pulse === 0 ? 0.24 : 0.18, this.pursuit, root);
    if (pulse === 3 || pulse === 7)
      audio.noise(at, 0.15, 0.065, this.pursuit, 1450, "bandpass", 0.012, {
        end: 820,
        q: 0.8,
        pan: pulse === 3 ? -0.26 : 0.26,
      });
    if (step % 16 === 10)
      audio.note(midi(harmony[2] + 12), at, 0.66, 0.105, this.pursuit, {
        type: "atlantis_bow",
        attack: 0.08,
        cutoff: 1800,
        pan: 0.3,
      });

    if (audio.boss) {
      const ceremonial = step % 10;
      if ([0, 4, 7].includes(ceremonial))
        this.frameDrum(
          at,
          ceremonial === 0 ? 0.28 : 0.17,
          this.guardian,
          root - 5,
        );
      if (step % 16 === 0) {
        for (const [interval, pan] of [
          [0, -0.22],
          [7, 0.22],
        ])
          audio.note(
            midi(root + interval),
            at,
            this.combatBeat * 6.3,
            0.09,
            this.guardian,
            {
              type: "atlantis_bow",
              attack: 0.18,
              hold: 1.1,
              cutoff: 980,
              pan,
            },
          );
      }
      if (step % 16 === 5 || step % 16 === 13)
        this.stone(
          harmony[2] + 12,
          at,
          0.063,
          step % 16 === 5 ? 0.22 : -0.22,
          this.guardian,
        );
    }
  }

  veil(pitch, at, duration, volume, pan) {
    for (const sign of [-1, 1])
      this.audio.note(midi(pitch), at, duration, volume, this.exploration, {
        type: "atlantis_veil",
        attack: 2.3,
        hold: 3.7,
        cutoff: 1450,
        detune: sign * (4.5 + (pitch % 3) * 0.7),
        pan: pan + sign * 0.11,
      });
  }

  stone(pitch, at, volume, pan, bus = this.exploration) {
    // 非整数泛音与各自衰减构成软石钟，避免单一正弦提示音的听感。
    for (const [ratio, level, duration] of [
      [1, 1, 5.8],
      [2.005, 0.24, 3.5],
      [2.756, 0.105, 2.4],
      [5.404, 0.025, 1.5],
    ])
      this.audio.note(midi(pitch) * ratio, at, duration, volume * level, bus, {
        type: "atlantis_stone",
        attack: 0.045 + ratio * 0.009,
        cutoff: 2900,
        pan: pan * (ratio > 2 ? -0.6 : 1),
      });
  }

  frameDrum(at, volume, bus, pitch) {
    this.audio.note(midi(pitch + 12) * 1.35, at, 1.12, volume, bus, {
      end: midi(pitch + 12),
      type: "atlantis_stone",
      attack: 0.023,
      cutoff: 560,
    });
    this.audio.note(midi(pitch + 19), at + 0.02, 0.76, volume * 0.2, bus, {
      type: "atlantis_bow",
      attack: 0.035,
      cutoff: 650,
    });
    this.audio.noise(
      at + 0.006,
      0.56,
      volume * 0.5,
      bus,
      530,
      "bandpass",
      0.025,
      { end: 220, q: 1.3 },
    );
  }
}

function midi(pitch) {
  return 440 * 2 ** ((pitch - 69) / 12);
}
