import { europaWorldPoint } from "./europa_config.js";

// Fit the final, shared-density population to the expanded basin. These are
// independent homes, not extra spawns: three modest feeding sites around each
// lord, plus the existing progression routes. No food is placed in the wreck.
const CROWN_HOMES = [
  [200, -255, -360],
  [165, -245, -355],
  [75, -245, -330],
  [-80, -215, -305],
  [20, -225, -325],
  [-115, -270, -350],
  [215, -320, -400],
  [-235, -325, -400],
  [-195, -365, -475],
  [240, -400, -500],
  [-225, -450, -540],
  [240, -420, -540],
  [-175, -455, -570],
  [155, -445, -570],
  [10, -450, -565],
];

const HOME_REPLACEMENTS = {
  // The enlarged hull enclosed five old hunter homes. Keep those residents
  // outside its pressure rooms, on the eastern rim and the basin approach.
  prism_hunter: {
    2: [240, -380, -445],
    4: [250, -425, -500],
    5: [135, -500, -600],
    6: [10, -490, -570],
    9: [-155, -510, -620],
  },
  bell_carrier: {
    0: [-165, -425, -530],
    3: [-190, -385, -510],
    6: [-90, -500, -600],
    9: [15, -510, -615],
  },
  siphon_colossus: { 2: [-55, -725, -720], 5: [-165, -650, -700] },
  spiral_grazer: {
    1: [45, -690, -730],
    4: [-60, -750, -790],
    7: [150, -680, -735],
  },
};

/** Preserve final stocks and meal/combat rules while fitting Europa residents. */
export function fitEuropaEcology(species) {
  return Object.freeze(
    species.map((entry) => {
      const replacements = HOME_REPLACEMENTS[entry.kind];
      if (entry.kind !== "crown_filterer" && !replacements) return entry;
      const spawnAnchors = entry.spawnAnchors.map((home, i) => {
        const fitted =
          entry.kind === "crown_filterer" ? CROWN_HOMES[i] : replacements[i];
        return fitted ? Object.freeze(europaWorldPoint(fitted)) : home;
      });
      return Object.freeze({
        ...entry,
        spawnAnchors: Object.freeze(spawnAnchors),
      });
    }),
  );
}
