# Mechanical Shark — first candidate verification

Current follow-up (2026-10-10): [companion blood/bone effects, opaque wound lining and 20/20 torpedo payment](minion_torpedo_revision.md) supersede the visual/payment details below; the original evidence remains historical.

The subsequent [ordinary durability follow-up](torpedo_durability_revision.md) changes equal/larger ordinary creatures to two hits; the three-hit observations below remain historical. Lords still require three valid hits.

Historical evidence below used the former 5-second cooldown. The subsequent [touch/control follow-up](touch_slow_torpedo_revision.md) changes the current interval to 2 seconds; retain earlier measurements as historical evidence.

Uncommitted development on `feature/mechanical-shark`, based on the accepted and pushed `e042fbb` checkpoint. No commit, push, main integration or formal release is authorized. Published Pages remains v0.8.3. The fourth character is available in the development candidate across all five destinations.

This records the first completed candidate. The user then requested longer plumes, richer armor and weak aiming correction; current behavior and new evidence are in [the refinement](mechanical_shark_refinement.md). The first-pass measurements below remain historical comparisons.

## Implemented rules

The authoritative character registry supplies home selection, Guide, movement and local completion records. Mechanical Shark shares ordinary growth, 3 m starts and Mariana's 15 m start. Sprint remains 32 m/s; Orca alone retains 41.6 m/s. Steel Body gives 1.5 times effective resistance: shared attack, contact and environmental damage is divided by 1.5. Starvation and voluntary skill payments are not reduced. Submarine impact notifications now display actual damage after armor.

Depth Torpedo is a straight underwater projectile with a 140-world-unit range, 70-unit speed and 14-unit blast radius. Successful firing costs a fixed 10 health and 10 stamina, representing 10% of each maximum rather than current values. Health must exceed 10; stamina must reach 10. Failed activation pays nothing. Cooldown is five active-play seconds. The physical launch point belongs to the animated hull; there is no homing, vehicle destruction or additional self-blast damage.

The user's revised size and reward rules replace the abandoned corpse-collection design:

- Ordinary sea creatures smaller than the current player need one explosion hit. Equal/larger ordinary creatures need three distinct hits. Check relative size at each hit; normal body capture still needs size advantage.
- A confirmed kill immediately grants shared size-scaled nutrition, healing, growth and one meal count. The victim retires to its existing habitat-aware respawn. Nonlethal hits grant no food. Hidden victims cannot award repeated meals. No corpse timer or separate collection branch remains.
- Lords require the real 25 m threshold. Each accepted ranged hit counts as one of the existing three hits, using the same bite cooldown, per-hit hunger, defeat loot and permanent regional objectives. Ranged contact is an alternative to melee flank/disengagement, not a bypass of eligibility. Lord hits do not use ordinary-prey reward settlement.

Relative swept contact accounts for moving ordinary prey. Lords use their actual contact meshes, including existing compatibility proxies. Indexed solid queries and sampled terrain/ice boundaries block flight and blast line of sight. Damage cannot pass through a building or seabed. Pause freezes flight and cooldown; death, victory, home and region reset clear targeting, durability and effects. No additional animation loop is introduced.

## Model, animation and effects

The original machine has a continuous load-bearing hull, 35 separated ceramic armor panels, recessed joints, steel ribs, rivets, cooling vents, narrow cyan optics, orange markings, a segmented jaw and ventral launch port. Hinged pectoral fins and an articulated tail preserve a shark silhouette. Twin shrouded thrusters have nozzle rings and internal vanes. Their blue-white/orange plumes appear only during actual sprint and fade when it ends. These are stylized underwater propulsion effects, not a real-combustion claim.

Home, Guide and gameplay use the same model. Immutable geometry/materials are cached; jaw, fins, tail and private flame uniforms remain independent per instance. The final model has 34,292 triangles, 31 meshes and eight materials, including the two normally hidden plumes. The idle Guide draws 29 meshes / 32,804 triangles. Flame meshes do not cast shadows. Multi-angle screenshots and full cruise, opposite-turn sprint, feed/recovery and launch keyframes are retained in ignored local evidence.

Two reusable projectiles, four explosion slots and one 120-instance bubble pool bound the weapon's resources. The pressure flash expands into two translucent shock rings and a rising bubble tail, then disappears after 1.35 seconds. Blood uses the existing effect pool. The user explicitly requested immediate explosion feeding, so this ranged kill does not borrow the ordinary mouth-swallow transition. Physical melee feeding retains it.

Launch and explosion sounds use the existing bounded `OceanAudio` graph. They combine a short charging transient, low underwater pressure, filtered noise and a bubble tail, with controlled music ducking. They are original procedural science-fiction effects, not recorded explosions. Production parameters and game-path clip fingerprints are in [the audio ledger](audio_sources.md). Subjective listening remains pending user review.

## Verification

Current evidence is stored under ignored `.local/mechanical_shark/`; scripts and raw captures are local verification inputs, not runtime assets.

| Check                     | Result and scope                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit regression           | 756/756 pass, including 13 new character/payment/armor/sweep/occlusion/meal/durability/lord/lifecycle/model/record checks.                                                                                                                                                                                          |
| Shared browser regression | 29 existing checks pass against the current development service.                                                                                                                                                                                                                                                    |
| Actual native runtime     | All five region starts and J launches; three prey killed by a real ranged explosion with immediate shared rewards; 28 m prey against a 20 m owner requires three projectiles; real Kraken mesh rejects 24.99 m, then three projectiles at 30 m settle one defeat and Hawaii victory with Mechanical Shark identity. |
| Touch UI                  | 390×667 Chinese and 320×568 English: real tap, five-second disabled countdown, paused cooldown, insufficient-resource block and no document overflow. These are browser touch emulations.                                                                                                                           |
| Animation and art         | Four Guide angles, close/small-screen and normal following-camera views; six pose keyframes validate jaw opening/recovery, opposite tail turns and sprint plume decay.                                                                                                                                              |
| Audio graph               | Two event clips and simultaneous overlap render through `OceanAudio`: peaks 0.1085 / 0.1172 / 0.1317, no clipped/nonfinite samples, voices released at the end. Listening quality is not established by these metrics.                                                                                              |
| Owned resources           | Sixteen isolated rendered firing/explosion/expiry/reset cycles stabilize at 14 geometries / one texture. Idempotent disposal returns to the one shared Three.js Sprite geometry / zero-texture control baseline.                                                                                                    |

The runtime combat fixtures hold designated enemies still and hide unrelated targets to isolate physical projectile contact; they do not establish natural battle difficulty. They retain the real ocean solids, model, projectile flight, damage and settlement. A first fixture computed its launch altitude before the debug length change had reached the avatar; the final fixture waits for the actual scale and aligns the target with the real launcher. The initial pose probe requested an absent debug field; final keyframes inspect the actual jaw rotation. Audio pause suspends and freezes the existing context rather than clearing every scheduled music voice; the final lifecycle probe checks that behavior.

### Bounded desktop cost sample

Headed Chrome 154 on Apple M2 Pro / ANGLE Metal, 1440×900, DPR 1, High. Each sample uses a 25 m character, an 800 ms warm-up and 120 animation frames. Hawaii samples `(180, -75, -320)`; Atlantis samples `(0, -688, -895)`. Slow-swim input is held. Character order is Orca → Mechanical idle → Mechanical with forced repeated visual bursts → Orca. Ecology remains 313 / 412 organisms respectively. The stress sample is an explicit effect-pool load, not a natural fire-rate measurement.

| Scene                 | Orca before  | Mechanical idle | Mechanical FX stress | Orca after   |
| --------------------- | ------------ | --------------- | -------------------- | ------------ |
| Hawaii FPS / p95 ms   | 60.01 / 18.4 | 60.17 / 18.9    | 60.18 / 18.6         | 60.16 / 18.4 |
| Atlantis FPS / p95 ms | 59.97 / 18.2 | 60.00 / 18.3    | 60.02 / 18.4         | 59.93 / 18.4 |

Mechanical weapon update averages approximately 0.0017–0.0042 ms idle and 0.0083–0.0233 ms during this visual stress. Its richer hull increases draw/triangle counts; these short VSync-limited samples do not prove no GPU cost. Broad renderer resources increased during a moving, naturally warming world sample, so that assertion is not reported as stable or as a weapon leak. The separate isolated owned-resource probe above establishes bounded allocation and disposal for this component. Whole-map caches and long-round behavior remain separate concerns.

### Final candidate delivery

Formatting, `git diff --check` and production build pass. The existing large-bundle warning remains (the current application JS is 1.68 MB / 563.5 KB gzip); it is not treated as a new character benchmark or solved here. The rebuilt restricted preview matches 209 current runtime source fingerprints and all eight artifacts. Ten compiled native cases per host pass on the local server and public HTTPS preview: English desktop and Chinese touch across all five regions, four-character selection/Guide, correct start, real firing/countdown, pause/help/resume/home and no page overflow. Both hosts deny development/private paths and expose no development game object. Page and console error lists are empty. Exact addresses, process identities, source hashes and receipts remain local.

The separate real-state effect check captures onset, expansion, fade and disappearance in desktop English and touch Chinese. Actual firing routes one launch and one explosion sound. Pausing suspends/freezes the audio context; a muted second shot creates no new weapon sound; home clears the weapon effects. The final runtime fixture also waits for the avatar's real scale before sampling the launcher, and verifies a live blast alongside immediate meal settlement. Its newest screenshots show the corrected distinction between kills and nonlethal hits; lord-specific progress notifications are preserved.

The candidate and game-path listening clips are ready for user review. It remains uncommitted and unpushed; the formal v0.8.3 Pages game is unchanged. Physical phones, simultaneous multitouch, speaker listening, sustained heat and natural full-round balance remain unverified.
