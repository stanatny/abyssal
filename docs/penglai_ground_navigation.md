# Penglai ground navigation follow-up

Status: accepted local checkpoint based on v0.10.1 (`171be5f`), on `fix/penglai-ground-navigation`. The user authorized a local commit including the subsequent motion/density review on 2026-10-04. Formal Pages remains unchanged.

## Problem and implementation

The reported ground beasts could bury their heads and torsos in a mountain and stop moving. Center-height projection did not validate the body footprint or the space needed for a turn. Terrain steering and structure collision could also select conflicting recovery directions.

- Ground-bound movement samples the actual baked mountain triangles. The regular terrain strips expose a constant-time height lookup; aquatic/player terrain rules and mountain art remain unchanged. No additional mesh, renderer loop or terrain copy is created.
- Each ground model supplies a bounded numeric lower-envelope profile. Rigid heads/torsos must clear the terrain, while articulated legs and flexible tails retain their existing animation allowance. This is not a new foot-IK system.
- Initial and replacement habitats validate body orientation, terrain transitions, static solids, and a short usable forward route. Each individual keeps its resolved legal home within its original resident range; it is not moved into an unrelated habitat on respawn.
- Lookahead turns around unwalkable terrain. Final motion checks the body at both the old and proposed position, including rotation into nearby solids. A blocked animal can take a short legal side/back step while retaining its safe facing, then turn gradually. Static sliding is rechecked against the terrain; the correction does not teleport through a mountain or project onto a roof.
- White Tiger's patrol, pursuit, charge and attack lock also preserve legal rigid-body orientation. A rejected proposal does not replace the last safe heading.

Population, food/growth values, attack damage/cooldowns, guardian objectives, player controls and rendering quality are unchanged. Safe birth positions/headings can differ from v0.10.1. No player-facing rule or catalogue change requires new localization; the existing English/Chinese text remains in sync.

## Verification

- All **852 unit tests** pass, including new rigid-body mountain clearance, rendered-triangle/strip-seam agreement, cliff recovery, combined solid/terrain avoidance, and White Tiger's warned charge. After the final ground-only render-heading synchronization, all **26 focused navigation/encounter tests** and the rebuilt production bundle pass. Formatting passes; the existing large-bundle advisory remains.
- Native Chrome desktop **1440×900 English** (seed 71523) and touch **390×677 Chinese** (seed 96811) each observe all **38** ordinary ground residents over 200 samples at nominal 100 ms intervals, about 22 active seconds. Neither run records rigid-body mountain penetration, static-body overlap or a walking stop longer than 0.1 seconds. The controlled Zheng chase travels approximately 133/167 m. Actual pause freezes positions, and normal replacement preserves 38 residents with a legal, solid-clear body pose. Actual screenshots were inspected.
- Tests use actual terrain/model geometry and native game state rather than a screenshot-only proxy. Desktop/touch fixtures protect the player's vitals only to observe an uninterrupted chase; they do not replace creature AI. Viewport emulation is not physical-phone testing.
- Local raw receipts are ignored under `.local/ground_navigation_review/`: `native/report.json`, `full_units.log`, `final_heading_tests.log`, `check.log`, `build.log`, performance reports, screenshots, and the final preview manifest.
- Initial compiled checks pass fourteen desktop/touch flows across all seven maps on each local/public host. After the final White Tiger render-heading synchronization, incremental Penglai checks pass both English desktop and Chinese touch flows on each host. These cover starts, controls, pause/resume/Home and Guide behavior, with zero observed runtime errors. All nine final HTML/JS/CSS/image/audio artifacts match their built hashes; all 267 runtime source fingerprints match. Production development hooks are absent and private/source paths return 404. The same temporary public address serves this uncommitted candidate; formal v0.10.1 is unchanged.

### Runtime cost

Serial measurements reuse `scripts/verify_atlantis_performance.mjs` against an archived v0.10.1 source and the candidate: Apple M2 Pro, macOS 26.6.2, local dev hosts, Chrome headless, 1440×900/DPR 1, seeded Penglai, 25 m Orca at `[-395,121,-675]`, 120 frames per High/Smooth sample. No other test browser runs concurrently. CDP inclusive sample weights divided by 120 estimate CPU work per frame:

| Measurement                                                     |  v0.10.1 | Candidate |
| --------------------------------------------------------------- | -------: | --------: |
| High main-loop CPU                                              | 11.73 ms |  12.82 ms |
| High entity-update CPU                                          |  5.99 ms |   6.66 ms |
| Smooth main-loop CPU                                            | 12.15 ms |  14.51 ms |
| Smooth entity-update CPU                                        |  7.07 ms |   8.00 ms |
| Switch observation including the script's 800 ms settling delay |  2926 ms |   3115 ms |
| Largest observed preparation long task                          |  1177 ms |   1191 ms |

The additional collision work is measurable. Baked triangle lookup avoids repeatedly evaluating mountain noise, and an already valid retreat exits the bounded direction search early. An earlier exhaustive-retreat candidate measured 15.09/15.46 ms main-loop CPU in the same script and was replaced. Visible creature positions differ after correcting their habitats, so these are end-to-end fix measurements, not an isolated microbenchmark. These samples precede the final ground-only render-heading synchronization; that small follow-up received focused correctness and compiled-host checks, not a new performance claim. Headless animation pacing was noisy (approximately 12–15 FPS across both builds); it is not a desktop FPS target, mobile benchmark or thermal claim. Full natural-round and physical-device performance remain to be reviewed.

## Limits and rollback

This is bounded local terrain/solid avoidance, not global pathfinding. It retains upright animated ground bodies and their existing gait; individual foot contact on rough slopes is not solved with IK. Controlled traversal checks do not prove every future terrain/model combination or an entire natural round. Future ground habitats must have enough body/turning space for their intended residents.

Before release, review the actual candidate on the reported mountain route. Reverting this isolated uncommitted change restores the v0.10.1 runtime. The restricted preview keeps its preceding build as a local rollback snapshot; no formal deployment is part of this follow-up.
