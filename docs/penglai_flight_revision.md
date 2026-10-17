# Penglai sprint ascent and gliding — 2026-10-17

## Accepted remote delivery — 2026-10-17

Accepted remote branch delivery — 2026-10-17: the user authorizes committing and pushing the reviewed Penglai flight and direction correction on `feat/deep-ruin-hazards`, together with accepted regional-hazard/weather checkpoint `538e032` and guardian/terrain checkpoint `7b67fd3`. All773 delivered source fingerprints and all11 compiled artifacts match before acceptance-only documentation updates. The current AI agent integrates alone. Earlier candidate-only/no-push labels below are historical and superseded for this accepted scope. Existing91 affected tests, native keyboard/CDP-touch, public bilingual flows and artifact receipts remain unchanged-input evidence, not newly rerun release checks. Preserve established services, runtime archives and canceled worktrees. This is a remote development-branch delivery; formal main/Pages stays v0.11.10, with no version bump, tag or GitHub Release. Future changes return to the default review/authorization rule.

Commit/push receipts are retained in ignored `.local/accepted_branch_push_20261017/`. The original implementation and validation record below retain their historical chronology.

Status: user-authorized gameplay candidate after accepted local `7b67fd3`, on `feat/deep-ruin-hazards`. The current AI agent works alone. No commit, push, release or personal Skill edit is authorized. Preserve the accepted guardians/terrain/combat and all services, history and canceled worktrees; published main/Pages v0.11.10 stays unchanged.

## Current direction-ownership correction

The user reports that merely pressing sprint pitches the character upward. A fresh native reproduction confirms the hidden-state defect: while the real glide direction is−5degrees, stored steering remains+30degrees; pressing Space alone rises10.655m over the next0.717 active seconds. The earlier media and receipts below describe that preceding candidate, not verification of this correction.

The shared `stepPenglaiFlightSteering` now starts each actual new airborne sprint from the preceding real flight pitch, then applies the current ordinary steering input. A released upward direction cannot resurrect an invisible old climb. Sprint with no direction change keeps the visible heading; upward input changes pitch at the existing turn rate. Already powered flight retains the direction the player chose, and water/new-round/no-prior-motion/paused states retain normal steering ownership. Lateral/downward input, glide/Slow rates, stamina costs, scenery/roof/body constraints, NPCs and all other regions remain unchanged. No new input latch, timer, loop or persistent resource is added.

Fresh91 affected checks include three added heading-ownership regressions and a revised two-cycle budget test with actual up steering. The native script now explicitly tests sprint alone and repeated sprint alone for all four characters, plus upward keyboard steering and simultaneous upward joystick/sprint touch. This supersedes the old assumption that an earlier hidden pitch could restart a climb. Both-language Guide/pause help explicitly says sprint never pitches up automatically. Evidence is ignored `.local/penglai_flight_direction_20261017/`; no commit/push/release is authorized.

Final direction-correction verification: all four native keyboard cases pass sprint-alone non-ascent, upward-directed climbing, recovery and repeated sprint-alone non-ascent, plus pause. Native CDP-touch also passes boost-alone non-ascent and simultaneous up-stick/boost ascent, waterline, Slow and restart. The four keyboard first/repeated sprint-only samples all descend; the touch-only boost descends2.164m, while its subsequent upward-stick/boost rises36.203m. These are controlled native input observations with the original world and resource clock, not physical-phone tests. The preceding four guardian contact receipts below are unchanged prior-scope evidence, not newly rerun for this steering-only follow-up.

The final compiled direction build is `assets/index-De3zZMFV.js` (sha256 `276011a22fb30fe48e7e9409ba7bee2a5f3a42d605f9e0f7b1d5bff59e2253a7`). All11 files byte-match dist/local restricted/Cloudflare and36 private paths per host remain denied. English1280/Chinese390/English390 public native cases additionally verify no upward pitch/height gain from sprint alone after gliding, then positive pitch after native up input, as well as Guide/help, Slow, Home and same-address reload. No browser errors or production hook are observed; narrow English help remains scrollable above fixed actions. Original process identities and readiness are unchanged. Earlier build/media receipts below are historical for their own candidates.

A7.02s silent normal-speed native-follow clip demonstrates the distinction: sprint alone−4.605m, up-input/sprint+60.254m, glide−2.092m, repeated sprint alone−4.583m. Initial route placement is controlled; the camera, original scene/rules and subsequent input-driven travel are retained. Phase captions do not change motion. Full H264/yuv420p decode and extracted-frame inspection pass. Exact source/build/public/media/operations receipts remain in the ignored correction directory. No commit or push.

## Problem and scope

Penglai's aether surface previously returned unchanged free-swimming motion. In a fresh native30-degree clear-air approach, normal cruise gains18.099m over3.0165 active seconds; Slow also gains8.623m over2.9941s. This makes upward flight independent of stamina, contrary to the requested climb/recover rhythm. These are controlled clear-route observations with the original populated scene, not whole-expedition difficulty measurements.

Only the player in Penglai gains new air constraints. Preserve existing underwater free steering, all other regional surfaces, NPC and lord flight, configured character speeds/turning/skills/costs, food, objectives, art and actual solid cover. No new fall damage, physics loop, timer, effect or resource pool is added.

## Implemented contract

`src/penglai_flight.js` defines the shared stateless step used by the existing aether surface after intended player movement and before the same world collision solver. Stamina-paid `tickVitals().boosting`, rather than merely holding a button or residual fast speed, permits positive air travel. Sprint preserves the chosen direction; level sprint does not automatically ascend. Normal air motion has a shallow nominal5-degree descent at12m/s (about1.046m/s down); Slow has a nominal40-degree descent at5m/s (about3.214m/s down). A deliberately steeper downward heading still works. Horizontal steering remains available.

The minimum sink rates remain bounded while speed eases after release: residual41.6m/s cannot multiply a modest glide into a sudden dive. At any given speed the actual pitch reflects that sink, rather than forcing a fixed angle during acceleration. Movement, body pose, collision/feeding direction and the attitude display use the corrected real direction. The initial candidate retained steering intent for the next sprint; the current direction-ownership correction above supersedes that hidden-pitch behavior. The existing visual quaternion damping keeps the visible transition smooth; animation does not move the gameplay root.

Below the waterline, existing free motion remains. A non-sprinting upward crossing stops at the actual surfaceY4, preventing repeated crossings from ratcheting altitude; real sprint can launch without the ordinary ocean breach-charge gate. Returning to water restores its ordinary movement on the next frame. The existing full-body620m ceiling, mountain/roof/guardian collision, terrain recovery and input release/pause/reset paths remain active. The step has no persistent momentum or extra airborne state. Unpowered active-skill jet motion also observes the glide constraint; its existing speed and ability cost remain.

Existing14 stamina/second sprint drain and19/second recovery remain unchanged. Budgeted two-cycle tests cover all four characters at15/30m and demonstrate net ascent while recovering to100 stamina. Ordinary gliding restores stamina through the existing vitals path; exhaustion cannot bypass the ascent gate, and a valid sprint retains priority over simultaneous Slow.

The subsequent native30m body-contact review passes against Azure Dragon, White Tiger, Vermilion Bird and Black Tortoise after natural attacks/recovery. Its old level-hover/Slow approach pilot misses the airborne Dragon under the new rules; preserve that failed receipt. The corrected controlled initial approach uses the actual40-degree Slow descent in air (level underwater), with real full-body static clearance and native input. Its2.1m geometric placement probe sits inside the unchanged2.7m actual combat radius to avoid a grazing starting point. No phase, hit, cooldown or collision override is used and no game rule is altered to make this fixture pass.

## Presentation and verification

HUD names distinguish Cloud sprint / Cloud glide / Fast descent. Menu introduction, bilingual departure hints, all four regional playable Guide counter descriptions and pause help explain sprint ascent and glide recovery. The old cloud-cruise descriptor is retained for NPCs; the new movement rule is player-only. No keyboard is invoked by these read-only explanations.

Fresh88 affected tests cover the new flight cases, existing Penglai terrain/roofs/ceiling/registries and bilingual Guide, shared vitals/character rules, steering and ordinary ocean breach behavior. These are current checks; the preceding guardian1,278-test receipt is historical. Native verification uses actual headed Chrome keyboard and CDP touch input with only initial legal clear-route placements. Original NPCs, weather, rendering, collision and clocks remain active; no stamina, speed, phase or time override is used. Desktop touch emulation is not physical-phone evidence. A first pilot passes four character cycles and touch movement but incorrectly tries to change language while paused; the selector intentionally requires Home. Preserve that failed fixture and use native Home before language switching in the corrected script.

Reproduce the native check with `ABYSSAL_DEV_URL=http://127.0.0.1:5188 node scripts/verify_penglai_flight.mjs`; choose `ABYSSAL_FLIGHT_OUT` to preserve separate receipts. Source baseline, native pre-change measurements, unit logs and all pilot/final receipts belong to ignored `.local/penglai_flight_20261017/`. Final compiled/public and native receipts follow after verification. This does not establish blind whole-round pacing, physical-phone ergonomics or performance/heat.

The corrected native script passes all four playable keyboard glide/Slow/two-climb/recovery/pause cases, real CDP-touch waterline takeoff/glide/Slow/reclimb, reset and Chinese pause help. The adult full-body ceiling stops at608.166m for the sampled upward30m pose, preserving the620m full-body boundary. The separate Hawaii normal-water ascent remains positive7.067m over its native sample, with Penglai-only help hidden. Typical touch observations are1.569m down over1.5 active glide seconds,3.857m down over1.2 Slow seconds, and21.696m up over the next1.2s resource-paid sprint. All stamina changes come from the real vitals path. Native fixture failures are retained; changing language is performed from Home in the passing final run.

## Final restricted-preview delivery

The source-matched restricted build serves `assets/index-B2dl9AQr.js` (sha256 `e93b733d4a8dbb2dd81aa70af20b45d8b23aeead36591a7035bbc44e2887be50`). Both local compiled and Cloudflare origins byte-match all11 runtime resources and deny36 private/source/debug probes each. Fresh public English1280/Chinese390/English390 native flows exercise actual sprint takeoff, normal glide, Slow descent, Guide/pause help, Home and same-address reload without observed errors or a production development hook. A first public pilot detects missing English in a line-break text fragment and the new region description; explicit dictionary entries and a regression fix these actual translation units. The final88-check receipt includes that localization fix. Narrow English help can scroll fully above the fixed action buttons. Original dev/restricted/awake/tunnel process identities35213/35216/35218/35419 and readiness remain unchanged; previous runtimes and failed fixtures are retained.

A10.01-second silent native-follow clip shows paid ascent, glide recovery, faster Slow descent and another paid ascent, with one initial clear-air observation placement and all original scene/rule/camera behavior retained. Actual worldY moves129.22→186.82→183.68→177.25→213.24; stamina moves100→57.99→100→100→71.78. The clip uses chronological normal-speed frames and phase captions only, fully decodes as H264/yuv420p and its extracted frames are inspected. This proves the sampled input/resource cycle, not a blind full expedition or a physical-phone test. Rebuild/status/stop guidance, exact fingerprints, screenshots, media and public receipts stay in the ignored evidence directory. No commit or push; formal main/Pages is unchanged.

---

# Historical flight, ward and guardian review — v0.9.0 candidate

The original review below is retained verbatim as historical evidence. Its free-flight-era scope, inventory, combat values and performance receipts do not verify or override the current2026-10-17 player-flight revision above.

# Penglai — flight, ward and guardian refinement

## Status

Uncommitted development candidate on `feature/penglai`, based on released `da0adbe` / v0.9.0. No commit, push, main integration or formal release is authorized. The preceding map and full-roster redraw remain intact. Earlier first-pass and redraw receipts are historical; fresh evidence belongs in ignored `.local/penglai_flight_revision/`.

## Implemented behavior

All four playable characters start Penglai at 15 m through the shared regional configuration. Cubic mass, growth baseline, native launch, menu and English/Chinese Guide explanations agree. Other regions retain their existing starts. The actual inventory remains eighteen ordinary mythic kinds / 418 live instances and five persistent guardians.

The transparent Four-Symbol ward is a hollow spherical shell around the monastery, not a filled exclusion sphere. Swept full-body movement and projectile occlusion respect its boundary. Each distinct guardian defeat dims its sector and updates the bilingual remaining names. Partial victories never create a bypass; the fourth removes the collider and visible ward. A new round restores all four sectors. Its desktop label uses bounded world scale above the sight line rather than filling the view. Narrow portrait screens use the existing objective/progress and blocked-passage notification, hiding the extra world billboard to avoid covering those status panels.

Wenyao retains a broad feathered-carp body; Luo has a slender bronze body, sharply swept wings and paired ribbon tails, with its own animation factory. The Sword Sage has a continuous clothed pelvis, two legs and boot ankles inside his robe. Both feet stand on one broad horizontal sword whose tip points forward. The same model is used in the Guide and encounters. Seven orbiting blades remain separate from the riding sword.

The Sage alternates three remote sword projectiles and a short straight sword-riding dash. Both have 2.2-second warnings. The volley is fixed after target prediction and leaves 3.5 seconds of recovery; the dash travels less than 60 world units and leaves four seconds. Sideways or vertical movement after the warning can evade them. The short dash handles its own continuous contact damage, avoiding an earlier generic contact hit stealing its damage through invulnerability; other lords retain their existing contact rules.

Six collidable floating mountain islands with thirty additional peach trees surround the temple. The original 522 ground trees and 418 residents are retained. The entrance carries the original brush-style raster plaque 以气御剑. Temple roofs, island bodies and tree trunks remain solid; near/far forest detail uses the existing spatial LOD and ownership paths.

## Four-Symbol roles

| Guardian       | Visual refinement                                                                                               | Combat role                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| White Tiger    | Broad chest/shoulders, heavier legs/paws, wider head and neck, proportionate tail                               | Fastest pursuit (44) and leap (110); short 1.05-second attack, visible windup and recovery                      |
| Black Tortoise | Massive dome/plastron, raised fitted scutes, bronze edge armor, thick limbs and continuously rim-coiled serpent | Lowest speed (22); bites and torpedoes are blocked during windup/pulse, followed by a 4.5-second exposed window |
| Vermilion Bird | Layered flame mane, heavier neck feathers, crown/brow, existing broad wings and streaming tail                  | Highest guardian attack damage (46), delivered by warned three-shot flame breath                                |
| Azure Dragon   | Curved undulating segmented body, overlapping joints, stronger brow, paired eyes, antlers and whiskers          | Balanced speed (32), damage (35) and charge, guarding the eastern mountain                                      |

Guarded Turtle contacts grant no hunger, growth or hit credit. Exposed attacks still require three separately validated hits; its stronger defense does not secretly add a fourth. All guardians retain the real 25 m eligibility gate. Four directional victories unlock the Sage; the fifth completes Penglai with no extra 30 m condition. This is game design informed by directional mythology, not a claim that an ancient text specifies these combat statistics.

## Verification method

Use actual shared-factory views and animation cycles, native keys/touch controls and the real collision/feeding/encounter paths. Controlled legal initial positions and isolated phase fixtures are identified as such; they are not a natural whole-expedition test. The ward presentation snapshots use staged defeat flags, while the separate completion regression performs fifteen actual separated mesh contacts and the resulting native ending/reset.

Fresh validation passes 807 unit checks, formatting, the 29-check shared browser regression and the native seven-region/four-character Penglai regression. The latter verifies actual 15 m launch before controlled size changes, aerial and underwater feeding/respawn, all fifteen separated guardian hits, ending and reset. All 23 shared-factory models have front/side/rear/cycle renders; the seven refined assets also have individual close views. Five responsive views (320×568, 390×667, 844×390, 1024×768, 1280×720) have no measured control/vital/boss-panel overlaps and no page-width overflow, with bilingual Guide checks.

Separate native Sage trials show both sword attacks causing damage and being avoidable after the warning: direct volley leaves 44 health; direct dash leaves 72; both lateral-dodge trials retain 100. The stronger Bird volley leaves 8 health when ignored and 100 when evaded. Tiger warning/leap damage and upward evasion pass. A frozen-phase real-mesh Turtle fixture confirms that its active shell grants no damage/hit/hunger credit and a newly staged exposed flank receives one real 70-damage / +8-hunger hit. Controlled positioning/phases and presentation-only ward defeat flags do not replace a natural round.

Short serial headed Chrome samples on M2 Pro / 16 GB / macOS 26.6.2, 1440×900, DPR1, High, controlled 25 m player, 150 frames per view:

| View          | Triangles | Draw calls |   FPS | Frame p95 | Render CPU mean |
| ------------- | --------: | ---------: | ----: | --------: | --------------: |
| Lotus nursery | 2,598,802 |      1,270 | 59.42 |   18.0 ms |         5.16 ms |
| Monastery     | 1,036,692 |        377 | 60.18 |   18.2 ms |         3.32 ms |
| Clouds        | 1,022,484 |        357 | 60.33 |   18.3 ms |         3.28 ms |

These are CPU render-call timings, not GPU elapsed measurements. Compared with the preceding redraw table, submitted triangles rise about 6–13% and draws rise as the floating islands, guardians and ward add work. This is a quality expansion, not a performance improvement. The final portrait billboard rule hides one sprite in that viewport and does not change these desktop conditions. Twenty-one serial map switches show equal geometry/texture counts in the second and third warm cycles; pause performs zero repeated renders and freezes active time. Stable lifecycle counts do not prove low heat or memory use.

The refreshed restricted build passes twenty native compiled cases on each local/public host: English desktop and Chinese touch-viewport starts, skills, pause/home across all seven destinations, plus all four Penglai character starts at 15 m. The Guide has eighteen mythic ordinary kinds and five guardians with synchronized role, ward and skill copy. All nine artifacts match both hosts and all 248 runtime source fingerprints still match the built source. Private source/config probes are denied, and the same public address serves the refreshed index. No debug API is exposed in the compiled candidate. Process/receipt details remain in ignored `.local/penglai_flight_revision/manifest.json`; formal six-region v0.9.0 is unchanged. Physical-phone performance/heat, full-round pacing and subjective visual acceptance remain player-review limits. Do not describe a touch-sized browser viewport or refresh-capped desktop FPS as physical-device acceptance.
