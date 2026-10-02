/** 冰下原创谱：干净玻璃和声与低音脉动，追击时独立加速，不用白噪声制造紧张。 */
export const EUROPA_SCORE = Object.freeze({
  beat: 60 / 46,
  phraseSteps: 32,
  ambientWater: 0.2,
  ambientCurrent: 0.08,
  harmony: [
    [43, 50, 57, 62],
    [40, 47, 54, 59],
    [38, 45, 52, 57],
    [41, 48, 55, 60],
    [43, 50, 55, 64],
    [36, 43, 50, 57],
  ],
});
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
export class EuropaMusic {
  constructor(audio) {
    this.audio = audio;
    this.exploration = audio.makeBus(0.85, audio.music);
    this.pressure = audio.makeBus(0.2, audio.music);
    this.pursuit = audio.makeBus(0, audio.music);
    this.guardian = audio.makeBus(0, audio.music);
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = 0;
    for (const bus of this.buses) audio.musicDestinations.add(bus);
    audio.waves.europa_glass = audio.harmonicWave([
      1, 0.008, 0.045, 0.003, 0.016,
    ]);
    audio.waves.europa_strings = audio.harmonicWave([
      1, 0.32, 0.15, 0.075, 0.028, 0.012,
    ]);
    audio.waves.europa_pulse = audio.harmonicWave([1, 0.12, 0.035, 0.009]);
  }
  get buses() {
    return [this.exploration, this.pressure, this.pursuit, this.guardian];
  }
  reset(now) {
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = now;
    this.buses.forEach((bus, i) => {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(i === 0 ? 0.85 : i === 1 ? 0.2 : 0, now);
    });
  }
  update(now) {
    const a = this.audio,
      combat = a.pursuing || a.boss;
    this.exploration.gain.setTargetAtTime(combat ? 0.19 : 0.85, now, 0.55);
    this.pressure.gain.setTargetAtTime(
      0.14 + Math.min(1, a.depth / 900) * 0.17,
      now,
      1.2,
    );
    this.pursuit.gain.setTargetAtTime(
      combat ? 1.08 : 0,
      now,
      combat ? 0.045 : 0.7,
    );
    this.guardian.gain.setTargetAtTime(
      a.boss ? 0.82 : 0,
      now,
      a.boss ? 0.1 : 0.8,
    );
    if (!combat || !a.canPlay()) {
      this.combatActive = false;
      return;
    }
    if (!this.combatActive) {
      this.combatActive = true;
      this.combatStep = 0;
      this.nextCombatStep = now + 0.015;
    }
    const interval = 60 / 126 / 2;
    if (this.nextCombatStep < now - interval) {
      const skip = Math.ceil((now - this.nextCombatStep) / interval);
      this.nextCombatStep += skip * interval;
      this.combatStep += skip;
    }
    while (this.nextCombatStep < now + 0.17) {
      this.scheduleCombat(this.nextCombatStep, this.combatStep++);
      this.nextCombatStep += interval;
    }
  }
  schedule(at, step) {
    const a = this.audio,
      chord = EUROPA_SCORE.harmony[Math.floor(step / 32) % 6],
      p = step % 32,
      b = EUROPA_SCORE.beat;
    if (p === 0 || p === 17) {
      for (let i = 0; i < 3; i++)
        a.note(
          midi(chord[i]),
          at + i * 0.27,
          b * 7,
          0.028 - i * 0.004,
          this.exploration,
          {
            type: "europa_glass",
            attack: 1.2,
            cutoff: 1050,
            pan: (i - 1) * 0.3,
          },
        );
      a.note(midi(chord[0] - 12), at, b * 6, 0.018, this.pressure, {
        type: "sine",
        attack: 1.6,
        cutoff: 140,
      });
    }
    if ([4, 11, 21, 28].includes(p)) {
      const i = [4, 11, 21, 28].indexOf(p),
        n = chord[[3, 2, 3, 1][i]] + 12;
      a.note(midi(n), at, b * 2.5, 0.044, this.exploration, {
        type: "europa_glass",
        attack: 0.17,
        cutoff: 1700,
        pan: Math.sin(i * 2) * 0.35,
      });
      if (i === 2)
        a.note(midi(n + 7), at + 0.46, b * 1.7, 0.016, this.exploration, {
          type: "europa_glass",
          attack: 0.22,
          cutoff: 1500,
          pan: -0.3,
        });
    }
  }
  scheduleCombat(at, step) {
    const a = this.audio,
      chord = EUROPA_SCORE.harmony[Math.floor(step / 32) % 6],
      offset = [0, 7, 0, 1, 0, 7, 3, 1, 0, 7, 1, 3, 0, 7, 3, 8][step % 16],
      accent = step % 4 === 0;
    // 半音与短弓节奏给出追击辨识，不叠持续嘶声或噪声鼓点。
    a.note(
      midi(chord[0] + 24 + offset),
      at,
      0.2,
      accent ? 0.12 : 0.085,
      this.pursuit,
      {
        type: "europa_strings",
        attack: 0.018,
        hold: 0.024,
        cutoff: 1900,
        pan: step % 2 ? 0.18 : -0.18,
      },
    );
    a.note(
      midi(chord[0] + (step % 4 === 2 ? 7 : 0)),
      at,
      0.29,
      accent ? 0.16 : 0.065,
      this.pursuit,
      { type: "europa_pulse", attack: 0.025, cutoff: 510 },
    );
    if (accent) {
      a.note(88, at, 0.36, 0.15, this.pursuit, {
        end: 52,
        type: "sine",
        attack: 0.014,
        cutoff: 230,
      });
      a.note(
        midi(chord[0] + 36 + (step % 16 < 8 ? 7 : 8)),
        at + 0.055,
        0.38,
        0.035,
        this.pursuit,
        { type: "europa_strings", attack: 0.04, cutoff: 2100, pan: -0.16 },
      );
    }
    if (a.boss && step % 4 === 0) {
      a.note(midi(chord[0] - 12), at, 0.6, 0.095, this.guardian, {
        type: "europa_pulse",
        attack: 0.05,
        cutoff: 230,
      });
      a.note(midi(chord[1] + 12), at + 0.12, 0.7, 0.042, this.guardian, {
        type: "europa_strings",
        attack: 0.1,
        cutoff: 1300,
      });
    }
  }
}
