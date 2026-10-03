/** 原创雨林河道配乐：木质拨音与留白，追猎使用独立快速低音节奏。 */
export const AMAZON_SCORE = Object.freeze({
  beat: 60 / 68,
  harmony: [
    [45, 52, 57, 60],
    [43, 50, 55, 59],
    [41, 48, 53, 57],
    [40, 47, 52, 55],
  ],
  ambientWater: 0.5,
  ambientCurrent: 0.35,
});
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
export class AmazonMusic {
  constructor(audio) {
    this.audio = audio;
    this.exploration = audio.makeBus(0.82, audio.music);
    this.pressure = audio.makeBus(0.18, audio.music);
    this.pursuit = audio.makeBus(0, audio.music);
    this.guardian = audio.makeBus(0, audio.music);
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = 0;
    for (const bus of this.buses) audio.musicDestinations.add(bus);
    audio.waves.amazon_wood = audio.harmonicWave([1, 0.09, 0.26, 0.02, 0.035]);
    audio.waves.amazon_reed = audio.harmonicWave([1, 0.12, 0.09, 0.055, 0.024]);
    audio.waves.amazon_low = audio.harmonicWave([1, 0.2, 0.055, 0.014]);
  }
  get buses() {
    return [this.exploration, this.pressure, this.pursuit, this.guardian];
  }
  reset(now) {
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = now;
    this.buses.forEach((b, i) => {
      b.gain.cancelScheduledValues(now);
      b.gain.setValueAtTime(i === 0 ? 0.82 : i === 1 ? 0.18 : 0, now);
    });
  }
  update(now) {
    const a = this.audio,
      combat = a.pursuing || a.boss;
    this.exploration.gain.setTargetAtTime(combat ? 0.21 : 0.82, now, 0.6);
    this.pressure.gain.setTargetAtTime(
      0.12 + Math.min(1, a.depth / 400) * 0.14,
      now,
      1,
    );
    this.pursuit.gain.setTargetAtTime(
      combat ? 1 : 0,
      now,
      combat ? 0.045 : 0.7,
    );
    this.guardian.gain.setTargetAtTime(a.boss ? 0.8 : 0, now, 0.16);
    if (!combat || !a.canPlay()) {
      this.combatActive = false;
      return;
    }
    if (!this.combatActive) {
      this.combatActive = true;
      this.combatStep = 0;
      this.nextCombatStep = now + 0.015;
    }
    const interval = 60 / 132 / 2;
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
      chord = AMAZON_SCORE.harmony[Math.floor(step / 32) % 4],
      p = step % 32,
      b = AMAZON_SCORE.beat;
    if (p === 0 || p === 16) {
      for (let i = 0; i < 3; i++)
        a.note(
          midi(chord[i]),
          at + i * 0.2,
          b * 6,
          0.022 - i * 0.003,
          this.exploration,
          { type: "amazon_reed", attack: 1.1, cutoff: 900, pan: (i - 1) * 0.3 },
        );
      a.note(midi(chord[0] - 12), at, b * 5, 0.023, this.pressure, {
        type: "sine",
        attack: 0.9,
        cutoff: 170,
      });
    }
    if ([3, 8, 14, 21, 27].includes(p)) {
      const i = [3, 8, 14, 21, 27].indexOf(p),
        n = chord[[2, 3, 1, 2, 3][i]] + 12;
      a.note(midi(n), at, 0.58, 0.057, this.exploration, {
        type: "amazon_wood",
        attack: 0.012,
        cutoff: 2100,
        pan: Math.sin(i * 2) * 0.25,
      });
      if (i === 3)
        a.note(midi(n - 5), at + 0.27, 0.4, 0.023, this.exploration, {
          type: "amazon_wood",
          attack: 0.012,
          cutoff: 1900,
          pan: -0.25,
        });
    }
  }
  scheduleCombat(at, step) {
    const a = this.audio,
      c = AMAZON_SCORE.harmony[Math.floor(step / 32) % 4],
      accent = step % 4 === 0,
      offset = [0, 7, 0, 3, 0, 7, 1, 3][step % 8];
    a.note(
      midi(c[0] + 12 + offset),
      at,
      0.19,
      accent ? 0.105 : 0.065,
      this.pursuit,
      {
        type: "amazon_reed",
        attack: 0.018,
        cutoff: 1500,
        pan: step % 2 ? 0.15 : -0.15,
      },
    );
    if (step % 2 === 0)
      a.note(midi(c[0] - 12), at, 0.28, accent ? 0.14 : 0.08, this.pursuit, {
        type: "amazon_low",
        attack: 0.018,
        cutoff: 450,
      });
    if (accent)
      a.note(95, at, 0.25, 0.11, this.pursuit, {
        type: "sine",
        end: 52,
        attack: 0.006,
        cutoff: 200,
      });
    if (a.boss && step % 4 === 0) {
      a.note(midi(c[0] - 12), at, 0.68, 0.095, this.guardian, {
        type: "amazon_low",
        attack: 0.05,
        cutoff: 230,
      });
      a.note(midi(c[3] + 7), at + 0.11, 0.34, 0.037, this.guardian, {
        type: "amazon_reed",
        attack: 0.02,
        cutoff: 1450,
      });
    }
  }
}
