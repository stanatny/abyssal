/** 海沟原创配乐：悬浮玻璃泛音、缓慢下降的低声部与独立的追击节拍。 */
export const MARIANA_SCORE = Object.freeze({
  beat: 60 / 58,
  phraseSteps: 32,
  harmony: [
    [38, 45, 52, 57],
    [35, 42, 49, 54],
    [33, 40, 47, 52],
    [31, 38, 45, 50],
    [38, 43, 50, 57],
    [35, 42, 47, 54],
  ],
});
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
export class MarianaMusic {
  constructor(audio) {
    this.audio = audio;
    this.exploration = audio.makeBus(0.85, audio.music);
    this.depthBed = audio.makeBus(0.25, audio.music);
    this.pursuit = audio.makeBus(0, audio.music);
    this.guardian = audio.makeBus(0, audio.music);
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = 0;
    for (const bus of this.buses) audio.musicDestinations.add(bus);
    audio.waves.mariana_glass = audio.harmonicWave([
      1, 0.08, 0.15, 0.012, 0.055, 0.008,
    ]);
    audio.waves.mariana_cello = audio.harmonicWave([
      1, 0.28, 0.18, 0.085, 0.025,
    ]);
  }
  get buses() {
    return [this.exploration, this.depthBed, this.pursuit, this.guardian];
  }
  reset(now) {
    this.combatActive = false;
    this.combatStep = 0;
    this.nextCombatStep = now;
    for (const [i, bus] of this.buses.entries()) {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(i === 0 ? 0.85 : i === 1 ? 0.25 : 0, now);
    }
  }
  update(now) {
    const a = this.audio,
      combat = a.pursuing || a.boss,
      deep = Math.min(1, a.depth / 2600);
    this.exploration.gain.setTargetAtTime(combat ? 0.38 : 0.88, now, 0.65);
    this.depthBed.gain.setTargetAtTime(0.16 + deep * 0.54, now, 1.3);
    this.pursuit.gain.setTargetAtTime(
      combat ? 1.15 : 0,
      now,
      combat ? 0.06 : 0.8,
    );
    this.guardian.gain.setTargetAtTime(
      a.boss ? 0.92 : 0,
      now,
      a.boss ? 0.1 : 1,
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
    const step = 60 / 108 / 2;
    if (this.nextCombatStep < now - step) {
      const skip = Math.ceil((now - this.nextCombatStep) / step);
      this.combatStep += skip;
      this.nextCombatStep += skip * step;
    }
    while (this.nextCombatStep < now + 0.17) {
      this.scheduleCombat(this.nextCombatStep, this.combatStep++);
      this.nextCombatStep += step;
    }
  }
  schedule(at, step) {
    const a = this.audio,
      chord = MARIANA_SCORE.harmony[Math.floor(step / 32) % 6],
      phrase = step % 32,
      beat = MARIANA_SCORE.beat;
    if (phrase === 0 || phrase === 16) {
      for (let i = 0; i < 3; i++)
        a.note(
          midi(chord[i]),
          at + i * 0.19,
          beat * 8,
          0.03 - i * 0.004,
          this.exploration,
          {
            type: "mariana_cello",
            attack: 1.6,
            hold: 1.2,
            cutoff: 650 + i * 180,
            pan: (i - 1) * 0.42,
            detune: i === 1 ? 3 : -2,
          },
        );
      a.note(midi(chord[0] - 12), at, beat * 9, 0.045, this.depthBed, {
        type: "bass",
        attack: 1.4,
        hold: 1.3,
        cutoff: 160,
      });
      a.noise(at + 0.4, beat * 7, 0.012, this.depthBed, 240, "bandpass", 1.5, {
        end: 155,
        q: 1.8,
        pan: phrase === 0 ? -0.35 : 0.35,
      });
    }
    if ([3, 9, 14, 22, 29].includes(phrase)) {
      const index = [3, 9, 14, 22, 29].indexOf(phrase),
        n = chord[[3, 2, 1, 2, 0][index]] + 12;
      a.note(midi(n), at, beat * 3.7, 0.034, this.exploration, {
        type: "mariana_glass",
        attack: 0.12,
        cutoff: 2300,
        pan: Math.sin(index * 1.4) * 0.5,
      });
      a.note(midi(n + 12), at + 0.025, beat * 2.9, 0.007, this.exploration, {
        type: "sine",
        attack: 0.2,
        pan: -Math.sin(index * 1.4) * 0.4,
      });
    }
  }
  scheduleCombat(at, step) {
    const a = this.audio,
      chord = MARIANA_SCORE.harmony[Math.floor(step / 32) % 6],
      offset = [0, 7, 0, 3, 0, 7, 2, 3][step % 8];
    a.note(midi(chord[0] + 12 + offset), at, 0.22, 0.105, this.pursuit, {
      type: "mariana_cello",
      attack: 0.015,
      cutoff: 1500,
      pan: step % 2 ? 0.2 : -0.2,
    });
    if (step % 4 === 0) a.drum(at, 0.2, this.pursuit, 0.52);
    if (a.boss && step % 4 === 0) {
      a.note(midi(chord[0] - 12), at, 0.65, 0.12, this.guardian, {
        type: "bass",
        attack: 0.022,
        cutoff: 330,
      });
      a.note(midi(chord[1] + 12), at, 0.8, 0.045, this.guardian, {
        type: "mariana_glass",
        attack: 0.03,
        cutoff: 1850,
      });
    }
  }
}
