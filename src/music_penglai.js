/** 蓬莱原创五声音阶：拨弦、气息长音与低鼓分层，追猎使用独立紧拍。 */
export const PENGLAI_SCORE = Object.freeze({
  beat: 60 / 72,
  ambientWater: 0.35,
  ambientCurrent: 0.24,
});
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const pentatonic = [60, 62, 64, 67, 69, 72, 74, 76];
export class PenglaiMusic {
  constructor(audio) {
    this.audio = audio;
    this.exploration = audio.makeBus(0.85, audio.music);
    this.pursuit = audio.makeBus(0, audio.music);
    this.guardian = audio.makeBus(0, audio.music);
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = 0;
    for (const b of this.buses) audio.musicDestinations.add(b);
    audio.waves.penglai_pluck = audio.harmonicWave([
      1, 0.28, 0.14, 0.07, 0.033, 0.015,
    ]);
    audio.waves.penglai_breath = audio.harmonicWave([
      1, 0.1, 0.065, 0.025, 0.01,
    ]);
    audio.waves.penglai_bell = audio.harmonicWave([
      1, 0.015, 0.36, 0.01, 0.17, 0.005, 0.06,
    ]);
  }
  get buses() {
    return [this.exploration, this.pursuit, this.guardian];
  }
  reset(now) {
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = now;
    this.buses.forEach((b, i) => {
      b.gain.cancelScheduledValues(now);
      b.gain.setValueAtTime(i === 0 ? 0.85 : 0, now);
    });
  }
  update(now) {
    const a = this.audio,
      combat = a.pursuing || a.boss;
    this.exploration.gain.setTargetAtTime(combat ? 0.25 : 0.85, now, 0.5);
    this.pursuit.gain.setTargetAtTime(
      combat ? 1 : 0,
      now,
      combat ? 0.045 : 0.7,
    );
    this.guardian.gain.setTargetAtTime(a.boss ? 0.7 : 0, now, 0.16);
    if (!combat || !a.canPlay()) {
      this.combatActive = false;
      return;
    }
    if (!this.combatActive) {
      this.combatActive = true;
      this.combatStep = 0;
      this.nextCombatStep = now + 0.015;
    }
    const interval = 60 / 138 / 2;
    if (this.nextCombatStep < now - interval) {
      const skip = Math.ceil((now - this.nextCombatStep) / interval);
      this.combatStep += skip;
      this.nextCombatStep += skip * interval;
    }
    while (this.nextCombatStep < now + 0.17) {
      this.scheduleCombat(this.nextCombatStep, this.combatStep++);
      this.nextCombatStep += interval;
    }
  }
  schedule(at, step) {
    const a = this.audio,
      p = step % 32,
      phrase = Math.floor(step / 32) % 4;
    if (p === 0 || p === 16)
      a.note(midi([48, 43, 45, 48][phrase]), at, 3.2, 0.036, this.exploration, {
        type: "penglai_breath",
        attack: 0.45,
        cutoff: 1250,
        pan: -0.2,
      });
    if ([0, 3, 8, 12, 17, 21, 27, 30].includes(p)) {
      const i = [0, 3, 8, 12, 17, 21, 27, 30].indexOf(p),
        n = pentatonic[[0, 2, 4, 3, 5, 4, 2, 1][(i + phrase) % 8]];
      a.note(midi(n), at, 0.7, 0.062, this.exploration, {
        type: "penglai_pluck",
        attack: 0.008,
        cutoff: 2500,
        pan: Math.sin(i * 1.3) * 0.32,
      });
      if (i === 4)
        a.note(midi(n + 12), at + 0.14, 0.55, 0.024, this.exploration, {
          type: "penglai_bell",
          attack: 0.015,
          cutoff: 2800,
        });
    }
    if (p === 10 || p === 24)
      a.note(
        midi(pentatonic[(phrase + 4) % 8]),
        at,
        1.45,
        0.037,
        this.exploration,
        { type: "penglai_breath", attack: 0.25, cutoff: 1800, pan: 0.22 },
      );
  }
  scheduleCombat(at, step) {
    const a = this.audio,
      accent = step % 4 === 0;
    a.note(
      midi([48, 55, 48, 57, 50, 55, 52, 55][step % 8]),
      at,
      0.17,
      accent ? 0.12 : 0.075,
      this.pursuit,
      {
        type: "penglai_pluck",
        attack: 0.009,
        cutoff: 1600,
        pan: step % 2 ? 0.18 : -0.18,
      },
    );
    if (step % 2 === 0)
      a.note(accent ? 100 : 85, at, 0.23, accent ? 0.15 : 0.08, this.pursuit, {
        type: "sine",
        end: 45,
        attack: 0.004,
        cutoff: 220,
      });
    if (a.boss && accent) {
      a.note(
        midi(36 + (step % 8 === 0 ? 0 : 7)),
        at,
        0.45,
        0.09,
        this.guardian,
        { type: "penglai_breath", attack: 0.018, cutoff: 600 },
      );
      a.note(midi(84), at + 0.03, 0.28, 0.035, this.guardian, {
        type: "penglai_bell",
        attack: 0.008,
        cutoff: 3100,
      });
    }
  }
}
