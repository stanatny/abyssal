/** 原创巢穴音型：慢起暗弦、错开的泛音与稀疏水晶回应，不使用战斗鼓点。 */
export const BERMUDA_CAVE_SCORE = Object.freeze({
  beat: 60 / 46,
  phraseSteps: 32,
  roots: Object.freeze([29, 27, 30, 26]),
});

const midi = (note) => 440 * 2 ** ((note - 69) / 12);

/** 同一乐句用于区域原生合成兜底与离线录音，归属现有音乐总线和声部回收。 */
export function scheduleBermudaCave(audio, at, step, { bed, glint }) {
  const { beat, roots } = BERMUDA_CAVE_SCORE,
    phrase = step % 32,
    section = Math.floor(step / 32) % roots.length,
    root = roots[section];
  if (phrase === 0 || phrase === 16) {
    for (const [i, offset] of [0, 12, 19, 25].entries())
      audio.note(
        midi(root + offset),
        at + i * 0.19,
        beat * 8,
        [0.075, 0.032, 0.02, 0.011][i],
        bed,
        {
          type: "bermuda_bow",
          attack: 2.1 + i * 0.25,
          hold: 2.4,
          cutoff: 270 + i * 145,
          detune: i % 2 ? 5 : -5,
          end: midi(root + offset + (i % 2 ? 0.07 : -0.06)),
          pan: (i - 1.5) * 0.24,
        },
      );
  }
  if ([6, 21, 27].includes(phrase))
    audio.note(
      midi([67, 66, 69, 64][section] + (phrase === 21 ? 7 : 0)),
      at,
      beat * 4,
      phrase === 27 ? 0.016 : 0.025,
      glint,
      {
        type: "bermuda_bell",
        attack: 0.035,
        hold: 0.1,
        cutoff: 1450,
        pan: phrase === 6 ? -0.55 : 0.52,
      },
    );
  if (phrase === 11 || phrase === 29)
    audio.noise(at, beat * 3, 0.008, bed, 240, "bandpass", 1.1, {
      end: 410,
      q: 0.35,
      pan: phrase === 11 ? -0.28 : 0.35,
      hold: 0.1,
    });
}
