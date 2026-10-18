# Shark swimming refinement — 2026-10-19

## Scope

The user asks for a real-shark reference review and more readable fin motion for Zombie Shark and Mechanical Shark, especially while sprinting. The current AI agent works alone on `art/mechanical-hf-redraw`, after local fin checkpoint `cb76194`, with the uncommitted blue Mechanical Shark candidate retained. No commit, push, model regeneration, gameplay change or service replacement is authorized. Existing HF meshes, skin weights, pivots, materials, armor, feeding/fission/muzzle anchors and effects remain.

## Biological references and adaptation

- [Hoffmann et al., 2019: Pacific spiny dogfish pectoral-fin yaw kinematics](https://pmc.ncbi.nlm.nih.gov/articles/PMC6361209/) measures three-axis fin rotation during turns. The inside fin depresses and protracts; the reported motions relate to turning angular velocity. This supports asymmetric control-surface movement, not a fixed universal shark pose.
- [Wilga and Lauder, 2000: leopard-shark pectoral-fin kinematics and wake](https://cpb-us-e1.wpmucdn.com/sites.harvard.edu/dist/6/58/files/2022/03/Wilgalauder2000.pdf) distinguishes steady swimming from rising/sinking maneuvers and documents changes to fin conformation and posterior-plane angle. In that species, pectoral fins initiate maneuvering; the paper does not support treating them as fixed aircraft wings providing steady lift.
- [Waller et al., 2023: shortfin mako cruising and burst measurements](https://plymsea.ac.uk/id/eprint/10003/) records substantially faster tail beats during bursts than cruising. The field observations concern two makos; they do not establish one animation frequency or fin-tuck angle for all sharks.

The game keeps expressive motion for two fictional sharks. Bounded cyclic fin trim makes movement readable from the follow camera; modest rearward sprint sweep is an artistic compromise, not a claimed measured mako posture. Main propulsion remains lateral posterior-body/tail motion. No ray-like flapping or extra movement of the gameplay root is introduced.

## Findings and implementation

The previous fins already had valid weights and moved, but most visible movement was slow vertical rotation. Fore/aft trim was weak, particularly on Mechanical Shark. Right-turn fin rotation raised the right fin relative to its support, partly opposing the existing rightward body bank; left turning mirrored it. The old cruise/sprint clock only changed approximately0.516→0.716 tail cycles/second at12/32m/s.

`src/shark_swim_motion.js` shares bounded three-axis pectoral poses between both models. Cruise adds more visible fore/aft trim and feathering. Turns depress/protract the inner fin; pitch changes fin inclination. Sprint keeps a moderate rearward sweep and reduces vertical oscillation. Mechanical fins use90% of the organic small-motion amplitude; its servo hardware follows the existing bones. Each instance still owns its own pose and skeleton; Zombie companions inherit the shared swimming model. Companion AI and its existing input wiring are unchanged.

`createPlayerMotion()` now gives only these two sharks a more distinct, continuously accumulated sprint cadence. Steering and sprint-pose transitions ease over the existing active-time update, including rapid input reversal. Orca/Squid clock behavior remains unchanged. Tail amplitude is slightly restrained during the faster sprint cycle; the complete tail fan remains on its original terminal joint. No new mesh, texture, material, animation loop or dynamic light is introduced.

## Measured comparison

Values below use actual skinned vertices in the supporting torso frame,128 equally spaced fin phases, and settled native animation clocks. Lengths are fractions of normalized full body length. They measure motion, not physiology, game speed or whole-frame performance.

| Measure                                       |  Before |   After |
| --------------------------------------------- | ------: | ------: |
| Both sharks cruise tail cadence at12m/s       | 0.516Hz | 0.538Hz |
| Both sharks sprint tail cadence at32m/s       | 0.716Hz | 1.178Hz |
| Zombie left fin cruise fore/aft excursion     |  0.0247 |  0.0418 |
| Mechanical left fin cruise fore/aft excursion |  0.0158 |  0.0336 |
| Zombie left fin cruise vertical excursion     |  0.0608 |  0.0643 |
| Mechanical left fin cruise vertical excursion |  0.0473 |  0.0530 |
| Zombie left fin sprint vertical excursion     |  0.0446 |  0.0384 |
| Mechanical left fin sprint vertical excursion |  0.0342 |  0.0320 |

The right fin retains matching bounded movement. The new maximum tip step in the60Hz abrupt sprint/turn/pitch sequence is0.00846 body lengths for Zombie and0.00954 for Mechanical; the existing0.01 regression bound remains. An early candidate exceeded this bound when releasing sprint and reversing pitch simultaneously; slower visual input easing corrects it without changing steering physics. Existing posed-surface3/15/30m bounds, UV-seam continuity, tail-fan rigidity and outside-body fin-tip limits remain.

Resource topology is unchanged: Zombie1 mesh/29,346 triangles/1 geometry/1 material; Mechanical16/45,966/13/9. No fresh FPS, GPU time or phone-heat improvement is claimed.

## Validation and delivery

Private evidence: `.local/shark_swim_20261019/`. `baseline_fingerprints.json` and saved modules preserve the immediate blue-palette baseline. `measure.mjs`/`metrics.json` contain the actual before/after vertex and clock measurements. `film.mjs` records paired31-second actual Guide-model sequences with the normal Guide loop stopped and a single controlled render loop; these are stationary inspection views, not natural swimming routes.

Fresh93 focused checks cover both actual meshes, revised turn direction, cruise/sprint clock separation, rapid reversal, pause/reset, independent instances, hardware attachments, feeding, Zombie emergence/corpse-blast rules and mechanical torpedo rules. No full-suite rerun is claimed. Native/public delivery results follow. Desktop390px touch emulation cannot establish physical-phone feel, appearance or thermal behavior.

Native Chrome completes all four combinations of Zombie/Mechanical ×1440/390px, including actual skill use, cruise, sprint, left/right turn, pitch, pause and restart. Zombie owner/companion geometry sharing and independent skeletons are checked; paused bone/phase snapshots remain identical. Reopening the round reuses the existing avatar, clears companion/torpedoes and resets the sprint pose. The400-update mixed-input comparison proves Orca/Squid motion clocks are byte-for-byte identical to the saved baseline states. Formatting/build and `git diff --check` pass.

The existing restricted preview serves `index-DFcS8LYE.js`. All13 runtime resources byte-match `dist` on localhost and the public URL;12 private/source paths per origin are denied. Native public English1440px and Chinese390px checks pass Guide/start/skill/sprint/pause/Home for both sharks, same-address refresh and absence of production hooks, with no browser errors. Processes35213/35216/35218/35419 and their identities remain unchanged. Main/Pages stays v0.11.12; this candidate remains uncommitted/unpushed.

`native.json`, `film.json`, `other_characters.json`, `invariants.json`, `public/report.json`, `artifacts.json` and `final_fingerprints.json` retain the exact verification scope. Each delivered review movie concatenates the31-second paired Guide comparison with about9 seconds of actual world-follow-camera footage; the latter uses native keyboard actions with the disclosed open-water12m fixture. It is not a natural progression or physical-phone recording. `delivery.json` retains video hashes, message receipts and the existing preview manager/log locations. Rebuild with `.local/mini_preview_20261007/manage.py rebuild`; inspect with `status`. Existing stop methods are not invoked.
