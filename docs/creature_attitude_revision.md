# Creature attitude correction — 2026-10-30

Status: new uncommitted candidate after accepted ecology checkpoint `6d5fb90`.
The user requests more coherent motion for non-fish, quadrupeds and deep lords,
particularly unexplained whole-body 360-degree flips. No push is requested.

## Diagnosis and correction boundary

The generic ordinary-creature and lord paths constructed a quaternion from a
single forward vector. This leaves the dorsal/up direction unspecified. A
behind-and-above target can produce an almost inverted torso even though the
head points at the target. A native Mariana Hydra encounter reproduces this:
the world-space dorsal vector reaches Y = -0.918 during normal combat updates.
This is an orientation defect, not a defective HF mesh or a missing leg cycle.

`creature_attitude.js` separates horizontal yaw, bounded pitch and roll recovery.
It retains the existing response factors, handles the yaw wrap, holds heading
for vertical targets and freezes on pause/zero direction. It adds no per-frame
geometry, texture, timer, instance cache or animation loop.

- Ordinary swimming uses a stable dorsal direction. Turtles, Hujiao, Hydra and
  Gran Maja use a moderate 0.65-radian torso pitch envelope; existing model
  limits take precedence. Ordinary fish/whales can still climb or dive steeply
  within 1.4 radians. These are expressive game constraints, not measured
  biological maxima.
- Ordinary flyers and mythic ascent use bounded pitch with separated yaw, so
  reversal does not take a shortest quaternion arc through a roll. Flying-fish
  breaching uses the same stable-up mechanism with its existing trajectory.
- Ground quadrupeds retain their horizontal steering, locked leap, terrain
  support and actual-travel gait. Scylla, Azure Dragon, Vermilion Bird and the
  Amazon pit lords retain their specialist controllers.
- Whole-body-clearance swimmers already had separated yaw/pitch. Their generic
  1.4-radian limit now honors the body's existing upright/pitch profile. This
  particularly corrects steep crocodilian posture; displacement continues to
  follow the visible head, including through avoidance. This is a steering
  envelope change for those swimmers, not only an independent visual offset.
- Generic lord navigation targets now use the same stable-up convention.
  Existing body probes and final-pose clearance checks remain in place.

Models, rig weights, local limb/head/tail animation, materials, population and
habitat data, attack timings, locked targets, projectile speed/damage, feeding,
health and rewards remain unchanged. Posed body contacts continue to use the
visible transform; no hitbox is enlarged to compensate for a new attitude.
Player, companion, weapon alignment and ingestion effects are separate paths
and are not rewritten by this NPC locomotion correction.

## Biological interpretation

Do not turn “no accidental flips” into “real animals never roll.” Fish et al.'s
[alligator study](https://pubmed.ncbi.nlm.nih.gov/17690228/) describes a deliberate
longitudinal rolling feeding maneuver after biting a target. That observation
supports treating rolls as specific behavior, rather than an incidental result
of ordinary steering. It does not establish a Hydra motion model or a universal
pitch limit. NOAA's [Giant Pacific Octopus account](https://www.fisheries.noaa.gov/science-blog/view-inside-kodiak-lab-aquarium-post-4)
distinguishes arm-based crawling and siphon propulsion; the previously accepted
Octopus/Kraken local propulsion remains separate from world orientation.

Hydra and other fantasy creatures have no directly observable real-world gait.
Their stable torso, directional turning and independently moving appendages are
a game adaptation to the accepted anatomy. This pass does not claim a complete
biomechanical simulation or prohibit future explicitly designed roll attacks.

## Verification

Evidence is under `.local/creature_orientation_20261030/`.

- The accepted ecology's 2,082 input hashes matched before its acceptance-only
  documentation and local commit. Its recorded 2,091 tests were not rerun for
  that documentation-only checkpoint.
- The new candidate passes **2,097/2,097** tests (`test_final.log`). Six added
  regressions cover the actual behind-above inversion, all regional attitude
  policies, yaw wrap/vertical/idle/pause behavior, model-specific limits,
  navigation orientation and clearance swimmers' head/displacement agreement.
  Existing ground, flight, Scylla, pit-lord navigation, attack and skin tests pass.
- `before_hydra` / `after_hydra` are native Chrome world recordings with the same
  one-time player/lord setup and slow key input. Only the observer camera is
  fixed; the lord is not pinned or animated by a second loop. Other actors are
  hidden and player invulnerability is enabled for comparison attribution.
  The old dorsal Y minimum is -0.918; the corrected one is +0.858. Both run
  hunt, windup, attack and recovery, including three-projectile volleys.
- `combat_final_hydra` repeats the encounter without invulnerability. The lord
  fires volleys and the player's health falls from 100 to 11.14, including
  discrete attack-time losses. This verifies that stable attitude retains
  effective attacks; it is not a balancing claim. The earlier `combat_hydra`
  fixture let the player leave the territory before attack and is retained as
  an unsuccessful damage demonstration, not counted as a combat pass.
- `world/` checks normal populated launches in all eight maps, with one-time
  nearby player placement for a representative animal. Actual root attitudes,
  movement and deformed skin are sampled. No sampled NPC root becomes inverted;
  pause remains stable. Taotie completes walk, windup and leap with visible
  deformed-foot movement. `world_final/` supersedes Amazon/Europa for the final
  clearance-profile refinement.
- The separate `ground_isolated/` recording hides other actors for an
  unobstructed view of Taotie's feet. The subject still uses normal ground AI,
  collision and gait, with a following observer camera. It supplements the
  populated `world/` checks; it does not establish encounter density.
- The videos are controlled native desktop observations, not natural encounter
  rates, an all-animal visual certification, or physical-phone performance
  evidence. Existing all-map ecology and visual feedback remain separate.
- The restricted preview is rebuilt in place as `assets/index-xp0xcfOl.js`.
  All 951 local runtime artifacts match the build. Public HTML/changed JS match
  byte-for-byte; eleven source/configuration/directory paths are rejected.
  Native Chrome reloads that build and completes normal launch, pause, resume
  and return-to-menu in all eight regions without recorded errors or failed
  resource requests. The production page has no private game hook.
- Final H.264 delivery clips are `delivery/hydra_comparison.mp4` (17.5 s) and
  `delivery/taotie_regression.mp4` (12 s). Both decode completely and their
  sampled frames were inspected. Neither fixture changes the shipped AI.

The local ecology checkpoint is committed; this new motion candidate remains
uncommitted for review. The official main/Pages release remains v0.11.23.

## Taotie head and expanded roster review — 2026-10-30

The user reports a permanently crooked Taotie head and asks whether creatures
other than Hydra were actually checked. The first pass covered shared attitude
rules and representative populated worlds, not individual visual certification
of the entire roster. This follow-up explicitly separates those evidence levels.

Taotie's unanimated HF surface already carries a sideways skull. A bilateral
fit of the forehead/muzzle surface measures approximately 18.24 degrees of yaw
relative to the body axis, with only 0.62 degrees of roll; asymmetric horns make
the impression stronger. The repair is an offline rest-surface alignment, not
an opposite idle animation. `scripts/align_taotie_head.mjs` rotates the skull,
blends through the upper neck, protects the lower legs and retains the original
muzzle-to-tail unit length. It transforms normals by the deformation Jacobian
and refits neck/jaw supports and the muzzle anchor. The minimum sampled Jacobian
is 0.674, without a local inversion. Earlier narrower transition trials were
rejected by that guard before overwriting the runtime asset.

The original source/provenance, 20,856 vertices, 17,992 triangles, indices, UVs,
color atlas, four-leg stride and tail remain. The geometry-keyed inside-body
core is regenerated only for Taotie; unrelated core records are preserved. The
paired forehead/muzzle regression checks real deformed surface points throughout
walking and leap phases, rather than checking only a bone rotation.

Fresh evidence: `.local/creature_attitude_followup_20261030/`.

| Scope                                                               | What was actually checked                                                                                       | Limit                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 157 distinct catalogue/rare/transformation/lord/surface-bird kinds  | Controlled direction/pose sweep, finite sampled skin and dorsal orientation                                     | Factory/controller probe; not every species' complete native AI                      |
| 61 selected high-risk kinds, including all 18 lord kinds            | Native renderer pose images, with sampled turn and local-animation views inspected                              | Controlled inspection scene, not natural encounter frequency                         |
| Kraken, Rootjaw, Abyss Weaver, Azure Dragon, White Tiger and Scylla | Real world updates run hunt, windup, attack and recovery; root attitude never inverts in recorded samples       | One-time player staging, invulnerability and isolated subjects; observer camera only |
| Taotie                                                              | Native walking, windup and leap; an additional non-invulnerable run reduces 30 m player health from 100 to 5.14 | Short controlled encounter, not whole-session balance                                |

The 61-kind inspection also includes all six ground quadruped kinds, turtles,
aquatic reptiles, cephalopods, bird/dragon flyers, alien giants and Odyssey's
upright humanoid/serpentine forms. No additional accidental inversion was found
in these samples. Specialist controllers are retained: ground locomotion does
not use a swimming pitch, Scylla turns with resolved travel, flying guardians
have bounded bank, and pit lords keep their own navigation. This is not a claim
that every motion is biologically exact or every possible encounter is tested.

The fresh full suite passes **2,098/2,098** tests; targeted Taotie surface,
interior and ground-navigation checks also pass. The matched front/top image and
12-second native Taotie clip are new follow-up evidence. The head correction and
previous attitude changes remain uncommitted and unpushed after `6d5fb90`.

The updated restricted build is `assets/index-DtjamBae.js`. All 951 local
runtime artifacts match `dist`; the seven changed public HTML/JS/gzip paths
match byte-for-byte and eleven private/source paths are rejected. Native Chrome
loads the corrected Taotie asset and color atlas through the normal Guide and
completes a Penglai launch, pause/resume and return-to-menu without recorded
errors. No private game hook is present in that public page. These are targeted
checks of this follow-up; the previous eight-region launch audit remains separate.

A closer five-subject observer-camera recording supplements the first six-lord
run (`world_specialists_close/`). Its Scylla excerpt ends during attack, so the
full recovery assertion uses the earlier run. A preliminary closer Kraken take
was not recorded: Hawaii's existing randomized two-lord roster did not select
Kraken on that restart. The earlier successful Kraken encounter is retained;
this is neither a missing-catalogue finding nor a passed second Kraken take.
The 40-second delivery montage shows Rootjaw, Abyss Weaver, Azure Dragon, White
Tiger and Scylla. It uses native AI and an inspection camera, not the player's
normal chase camera. Both delivered MP4s fully decode and their final encoded
sampled frames were inspected.

Source preservation compares 2,085 pre-turn inputs: only the four project
entry/review documents, Taotie's packed surface and its interior table changed.
The alignment tool and surface regression are new. All 689 unrelated interior
records are identical, and prior attitude implementation files are unchanged
from the already delivered candidate. Temporary diagnostics and media remain
under the ignored evidence directory. No extra model meshes or draw calls are
introduced by the head correction.

## Steep-target aiming correction — 2026-10-30

The user reports that Azure Dragon cannot aim at a player diagonally above it,
and asks whether the other adjusted animals have the same issue. The preceding
assurance relied on retaining three-dimensional target data; that was insufficient
without testing the final emitter, visible direction and damage together. This
follow-up is a new, uncommitted/unpushed candidate, not user acceptance.

### Reproduction and repair

Azure's existing specialist flight controller already limits body pitch. Its
water breath nevertheless reused a direction measured from the body centre,
translated to the moving mouth. This ray can miss the locked point even when the
player is stationary. In the complete encounter fixture, initial +80°, -60° and
-80° targets receive no damage before the repair. The diagnostic measures lateral
misses up to 18.68 world units. This is an emitter/direction mismatch; preserving
a 3D lock point alone does not prove vertical aiming works.

- Water breath now measures its direction from the **actual animated mouth to
  the locked world point**. Terrain clipping, rendered water and damage use the
  same ray. It does not reacquire the player's position after the lock window.
- A bounded, rate-limited neck motion raises or lowers the head toward that point
  while the existing stable flight attitude remains. The neck shares its rotation
  across three joints, relaxes after attack and has independent per-instance state.
- Larger neck motion exposed old threshold-based skull weights and a leg binding
  that replaced nearby neck weights. Continuous neck/skull blending and mixing the
  front-leg contribution remove those discontinuities. Changes are confined to
  Azure's binding branch; Black Tortoise and all raw mesh/texture bytes are preserved.
- The range of 145, radius of 7, damage, windup, lock window, recovery and player
  collision dimensions remain unchanged. No damage-radius expansion compensates
  for aiming. Shared stable-up work and Taotie's earlier fix remain intact.

### Verification and coverage limits

Evidence: `.local/vertical_aim_20261030/`.

- `before_probe.json` / `after_probe.json`: nine initial elevations from -80° to
  +80° through normal hunt, windup, attack and recovery. All corrected stationary
  targets receive one hit; the beam passes the locked point. Added regressions
  repeat the previously failing angles at 30, 60 and 120 Hz, and check actual mouth,
  visible ray, unchanged range, side/vertical escape and solid obstruction.
- Actual deformed neck edges are checked throughout upward/downward aiming, with
  continuity, pause, separate instances and reset. Initial drafts with stretched
  neck/shoulder edges failed and were corrected before delivery; failed logs remain.
  Existing trunk/tail, mouth-anchor, shared-resource and Black Tortoise tests pass.
- Eight other lords run complete unforced attack cycles at +60° and -60°:
  Hydra, Vermilion Bird, Scylla, Thunderbarbel, Sword Sage, Leviathan, Rootjaw and
  Lumen Stalker. All damage the stationary player. These are model/AI/combat tests
  over a controlled flat seabed, not all-terrain or every-creature certification.
- Native Chrome recordings in the real maps (`native_after/`, `native_roster/`)
  repeat upper/lower cases for Azure, Hydra and Sword Sage. Each damages the
  player without invulnerability. Azure deals the existing 35-point hit in both
  cases; sampled body-up Y remains at least 0.6845. The Sage is unlocked once
  for attribution. NPC AI, terrain and collisions remain active; subjects are
  not repositioned every frame. Other actors are hidden and a following observer
  camera is used. These staged desktop observations are not phone testing.
- `native_framed/` repeats Azure with both player and dragon in the camera frame
  for the delivered 24-second clip. The upper case includes two attack cycles;
  each water hit retains its original 35-point damage. Matching close observer
  images remain available in `delivery/azure_comparison.jpg`.
- The matched Azure baseline (`native_before/`) has invulnerability and is only
  a visual/ray comparison. Its lack of damage is **not** counted as evidence of
  the old bug; the non-invulnerable controlled reproduction establishes that.
- A native ordinary Rootback Colossus, length 27 against a 30 m player, approaches
  from initial upper/lower offsets through windup, active, recovery and idle.
  Both cases damage the player. The upper case ends in player death, so its first
  harness expected-pause action failed; the saved rows and dead state are retained,
  and the lower case handles the actual end mode. The cooldown is set ready once;
  movement/contact logic and the creature's position are not forced during play.
- Grounded claws, roars and near-floor pulse attacks retain their existing reach
  and vertical dodge opportunities. Passing an aimed breath/projectile check does
  not mean every ground attack should hit a target arbitrarily high above it.
- Full suite: **2,102/2,102**. The preview builds in place as
  `assets/index-BvCdU6Wc.js`; HTML and both changed JS representations match the
  public route byte for byte. Eleven source/private paths remain denied, all local
  runtime artifacts match dist, and service process identities are preserved.
  Native public Penglai launch, pause and resume pass without failed resources,
  runtime errors or a production debug hook.

The correction still awaits user review. It neither commits nor publishes main,
changes accepted music/art assets, nor claims that every animal's entire combat
space has been exhaustively tested.

## User confirmation — 2026-10-30

The user reports that the steep-target Azure Dragon aiming issue is resolved.
This acceptance does not authorize a commit or push; the following task concerns
floating-island surfaces and bamboo, recorded in
[penglai_island_bamboo_revision.md](penglai_island_bamboo_revision.md).
