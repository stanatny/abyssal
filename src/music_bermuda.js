/** 原创风暴海域音型：不稳定的低弦幕、稀疏钟点与独立追猎节拍。 */
export const BERMUDA_SCORE = Object.freeze({
  beat: 60 / 46,
  phraseSteps: 32,
  harmony: [
    [29, 41, 48, 54],
    [29, 42, 47, 53],
    [27, 39, 46, 52],
    [28, 40, 47, 55],
    [29, 41, 46, 54],
    [26, 38, 45, 51],
    [27, 40, 46, 53],
    [28, 41, 47, 54],
  ],
});
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/** 沿用主音乐总线与资源管理，战斗有独立时钟，不等待探索拍点。 */
export class BermudaMusic {
  constructor(audio) {
    this.audio = audio;
    this.exploration = audio.makeBus(0.8, audio.music);
    this.pursuit = audio.makeBus(0, audio.music);
    this.guardian = audio.makeBus(0, audio.music);
    this.pressure = audio.makeBus(0, audio.music);
    this.combatActive = false;
    this.nextCombatStep = 0;
    this.combatStep = 0;
    for (const bus of this.buses) audio.musicDestinations.add(bus);
    audio.waves.bermuda_bow = audio.harmonicWave([
      1, 0.36, 0.11, 0.16, 0.03, 0.045,
    ]);
    audio.waves.bermuda_bell = audio.harmonicWave([
      1, 0.07, 0.32, 0.025, 0.18, 0.02, 0.07,
    ]);
  }
  get buses() {
    return [this.exploration, this.pursuit, this.guardian, this.pressure];
  }
  reset(now) {
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = now;
    for (const [i, bus] of this.buses.entries()) {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(i === 0 ? 0.8 : 0, now);
    }
  }
  update(now) {
    const a = this.audio,
      combat = a.pursuing || a.boss;
    this.exploration.gain.setTargetAtTime(combat ? 0.3 : 0.85, now, 0.4);
    this.pressure.gain.setTargetAtTime(
      0.16 + Math.min(1, a.depth / 580) * 0.5,
      now,
      1.4,
    );
    this.pursuit.gain.setTargetAtTime(
      combat ? 1.1 : 0,
      now,
      combat ? 0.08 : 0.85,
    );
    this.guardian.gain.setTargetAtTime(
      a.boss ? 0.9 : 0,
      now,
      a.boss ? 0.12 : 1,
    );
    if (!combat || !a.canPlay()) {
      this.combatActive = false;
      return;
    }
    if (!this.combatActive) {
      this.combatActive = true;
      this.combatStep = 0;
      this.nextCombatStep = now + 0.012;
    }
    const step = 60 / 118 / 2;
    if (this.nextCombatStep < now - step) {
      const missed = Math.ceil((now - this.nextCombatStep) / step);
      this.combatStep += missed;
      this.nextCombatStep += missed * step;
    }
    while (this.nextCombatStep < now + 0.17) {
      this.scheduleCombat(this.nextCombatStep, this.combatStep++);
      this.nextCombatStep += step;
    }
  }
  schedule(at, step) {
    const a = this.audio,
      section = Math.floor(step / 32) % 8,
      phrase = step % 32,
      chord = BERMUDA_SCORE.harmony[section],
      beat = BERMUDA_SCORE.beat;
    if (phrase === 0 || phrase === 14) {
      a.note(midi(chord[0]), at, beat * 10, 0.068, this.pressure, {
        type: "bermuda_bow",
        attack: 2.3,
        hold: 3,
        cutoff: 240,
        end: midi(chord[0] - 0.12),
        pan: -0.16,
      });
      for (const [i, n] of chord.slice(1).entries()) {
        a.note(
          midi(n),
          at + i * 0.31,
          beat * 9,
          0.022 - i * 0.003,
          this.exploration,
          {
            type: "bermuda_bow",
            attack: 2.6,
            hold: 2.8,
            cutoff: 470 + i * 160,
            detune: i % 2 ? 9 : -8,
            end: midi(n + (i % 2 ? 0.08 : -0.08)),
            pan: (i - 1) * 0.42,
          },
        );
      }
      // 长金属摩擦和相差半音的暗弦制造不安，不以规则钟声充当主旋律。
      a.noise(
        at + 0.7,
        beat * 8,
        0.039,
        this.pressure,
        310 + section * 19,
        "bandpass",
        2.1,
        {
          end: 170 + section * 13,
          q: 3.7,
          hold: 2.4,
          pan: section % 2 ? 0.5 : -0.5,
        },
      );
      a.note(
        midi(chord[1] + 0.3),
        at + 1.1,
        beat * 7,
        0.015,
        this.exploration,
        {
          type: "bermuda_bow",
          attack: 2.1,
          cutoff: 680,
          detune: -11,
          pan: 0.42,
        },
      );
    }
    if (phrase === (section % 2 ? 9 : 21)) {
      const fundamental = midi(chord[1] + 12);
      for (const [ratio, gain] of [
        [1, 0.036],
        [1.414, 0.018],
        [2.37, 0.009],
      ])
        a.note(fundamental * ratio, at, 6.2, gain, this.exploration, {
          type: "sine",
          attack: 0.07,
          cutoff: 1400,
          end: fundamental * ratio * 0.992,
          pan: section % 2 ? -0.48 : 0.48,
        });
      a.noise(
        at + 0.035,
        1.4,
        0.017,
        this.exploration,
        1750,
        "bandpass",
        0.08,
        { end: 490, q: 4.5, pan: 0.25 },
      );
    }
    if (phrase === 28)
      a.noise(at, 3.7, 0.019, this.pressure, 95, "lowpass", 0.9, {
        end: 210,
        hold: 0.5,
        pan: -0.25,
      });
  }
  scheduleCombat(at, step) {
    const a = this.audio,
      chord = BERMUDA_SCORE.harmony[Math.floor(step / 32) % 8],
      pulse = [0, 0, 1, 0, 6, 1, 0, 6][step % 8];
    a.note(midi(chord[0] + 24 + pulse), at, 0.21, 0.1, this.pursuit, {
      type: "bermuda_bow",
      attack: 0.013,
      cutoff: 1450,
      pan: step % 2 ? 0.15 : -0.15,
    });
    if (step % 4 === 0) a.drum(at, 0.22, this.pursuit, 0.52);
    if (a.boss && step % 4 === 0) {
      a.note(midi(chord[0]), at, 0.75, 0.1, this.guardian, {
        type: "bass",
        cutoff: 500,
      });
      a.noise(at, 0.32, 0.08, this.guardian, 900, "bandpass", 0.4, {
        end: 1800,
        q: 1.7,
      });
    }
  }
}
