# Player sprint motion — 2026-10-19

The user accepts the Orca texture-seam correction and requests a local checkpoint before asking for faster, stronger fin motion during sprint. The accepted work is committed as `6bd4821`; this new animation refinement remains uncommitted on `art/mechanical-hf-redraw`, awaiting review. The current AI agent works alone. No push, main release, new generation request or personal Skill change is included.

## Observation and adaptation

The existing sprint poses accelerated propulsion but suppressed chest-fin motion enough to look stiff. Orca flippers retained only 30% of their vertical trim; normal Squid sprint folded the fins as strongly as its special jet. The correction retains a streamlined sprint silhouette while making effort easier to read.

Biological references distinguish the roles of each appendage:

- [Waller et al., shortfin mako observations](https://plymsea.ac.uk/id/eprint/10003/) document faster tailbeats during burst swimming. [Hoffmann et al., dogfish turning](https://pubmed.ncbi.nlm.nih.gov/30584070/) describe three-axis pectoral reorientation during maneuvers. These are species-specific observations, not instructions to flap every shark fin like a wing.
- [Rohr and Fish, odontocete kinematics](https://pubmed.ncbi.nlm.nih.gov/15073196/) examine speed, tailbeat frequency and amplitude across cetaceans including Orca. This supports reviewing their relationship; it does not establish that every faster swim needs a large amplitude increase.
- [Stanford's Gilly Lab locomotion observations](https://gillylab.stanford.edu/locomotion2) describe coordinated fin and jet propulsion in Humboldt squid. This informs expressive coordination, not measured giant-squid kinematics.

The animation values below are game adaptations. Zombie and Mechanical Sharks are fictional; controlled 12/32 m/s visual inputs are not a claim about real animal speeds.

## Changes

- Zombie and Mechanical Sharks: faster continuous tail phase, about 9–10% more measured tail-tip excursion during sprint, and less suppression of chest-fin trim. Their fins still sweep backward; Mechanical Shark retains rigid hydrofoils and its pale-blue side boosters.
- Orca: faster vertical tailbeats with a modest increase in travel. Restore visible flipper trim while retaining rearward sweep and airborne restraint.
- Giant Squid: distinguish normal sprint from the stronger jet ability. Normal sprint keeps a clearer fin wave and more mantle contraction; the strong jet's settled cadence, contraction and tucked fins remain unchanged.

Only six animation modules change. Movement speed, stamina, steering physics, damage, feeding, skill costs and muzzle/contact anchors remain unchanged. Existing continuous phase and input smoothing prevent a pose jump when sprint begins or ends. No mesh, material, texture, render pass or update loop is added.

## Measurements and verification

Evidence lives in ignored `.local/player_sprint_20261019/`. `baseline.json` and saved modules preserve the exact post-checkpoint input. `measure.mjs` builds both versions, settles each state for 240 frames and samples 480 frames at 60 Hz. Fin and tail tips are actual deformed vertices, not just bone angles.

| Character        | Sprint base phase, cycles/s, before → after | Tail-tip full travel, body-length units, before → after |
| ---------------- | ------------------------------------------- | ------------------------------------------------------- |
| Zombie Shark     | 1.178 → 1.305                               | lateral 0.1876 → 0.2072                                 |
| Mechanical Shark | 1.178 → 1.305                               | lateral 0.1647 → 0.1801                                 |
| Orca             | 1.079 → 1.238                               | vertical 0.1586 → 0.1743                                |
| Giant Squid      | 0.716 → 0.891                               | jet/fin propulsion; no tailbeat claim                   |

These are base phase rates: chest-fin trim and Squid fin/mantle waves apply their own multipliers. Squid sprint mantle contraction range increases from 0.036 to 0.056; its strong-jet range remains about 0.081. All four retain identical sampled ordinary-cruise vertices, including mixed turn/pitch inputs (maximum difference zero). Sprint chest-fin excursions remain below ordinary cruise; stronger visual effort does not mean broad wing-like flapping.

Fresh targeted checks: 31/31 in `player_motion`, `zombie_hf_asset`, `mechanical_hf_asset` and `organic_hf_assets`. Existing actual-vertex continuity bounds were not weakened. These cover seam/weight integrity, independent rigs, abrupt inputs and reset/pause behavior, with Mechanical anchors/bounds at 3/15/30 m. Historical full-suite receipts are not rerun results for this change.

Fresh native Chrome verification passes all eight character/viewport cases (four characters at 1440 px and 390 px): actual start, skill trigger, sprint, bilateral turns, pitch, release, pause freeze, Home and restart. The Zombie companion shares geometry but retains an independent skeleton/state. Mechanical shots, Orca sonar and Squid ink activation were checked through the real input path. The local fixture stages 12 m characters in open water with invulnerability; it is not natural progression. See `native.json` and the separate actual follow-camera recordings.

The final 60-second H.264 comparison uses the actual Guide models and lighting, saved baseline modules on the left and the candidate on the right. Its single controlled loop suspends the normal Guide loop; camera/inputs match. Decoded final frames and full-file decode were inspected. These stationary comparisons isolate motion, not world travel. Ordinary follow-camera sprint captures were inspected separately.

The existing restricted preview is rebuilt at the same address, with entry `index-CYhGYEuK.js`. All 17 runtime files match dist, the local restricted origin and the public origin byte-for-byte; eleven private paths per origin remain denied. Public native English desktop/Chinese 390 px Guide/start/ability/pause/Home flows pass for all four characters, including same-address reload and absent production hooks, with no observed browser errors. All four original service identities remain unchanged; tunnel readiness passes. Operations remain in `.local/mini_preview_20261007/processes.json`; `manage.py rebuild` retains the previous runtime, and `manage.py stop` remains the explicitly requested shutdown path. No service was replaced or stopped.

All asset, physics and gameplay files match the post-checkpoint baseline; only the six animation modules and review/entry documents differ. This adds no resource-heavy feature and makes no measured frame-rate improvement claim. Narrow desktop touch emulation does not establish physical-phone behavior or heat. Final source/artifact fingerprints, public receipts and delivery message IDs belong to the evidence directory. User visual acceptance of this new sprint motion remains pending.
