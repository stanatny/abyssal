# Next Steps

## v0.6.10 delivery to main (2026-09-28)

The user completed this round's playtest review and explicitly requested a commit and push to remote `main`. This delivery combines v0.6.1–v0.6.10 with the previously committed v0.6 visual snapshot. The version remains 0.6.10, with no additional tag or Release. Pushing `main` triggers automatic deployment through the existing Pages workflow; see [Actions](https://github.com/stanatny/abyssal/actions/workflows/pages.yml) for deployment status. Candidate, uncommitted, and old production-version descriptions below are historical states.

The next priority is feedback from natural full runs and real phones, followed by further tuning of feeding feel, difficulty, and performance. Browser-emulated sizes must not be treated as real-device acceptance.

## v0.6.10 candidate at that stage

This round checked giant squid swimming direction against sources and user feedback, then restored the default pose with the mantle tip/fin end leading and the arms trailing. The capture point moved to the visible arm region, with the mouth anchor and intake direction aligned accordingly; see [this round's feedback](feedback_v0_6_10.md). This is a game choice. Iziko supports bidirectional movement in real giant squid; Robinson et al. 2021, §3.3/Figure 4, records hunting approaches and jet retreats but does not establish how often each direction is used in everyday cruising. This supersedes v0.6.9's fixed forward-facing arm crown; character animation, the shared feeding radius, and swept-contact recovery remain.

This round passed 239 unit tests, 11 targeted feeding/animation browser checks, a build, and 6 public-preview check groups. Checks covered the arm-region capture point, mouth coordinates, contact during sprinting and jetting, and the default swimming pose. Next, natural user playtests should confirm fish-catching feel and trailing-view animation; see the [verification record](verification.md) for evidence. At this stage, all earlier uncommitted changes remained, with no commit or push; production Pages was still v0.5.1.

## v0.6.9 previous candidate (orientation superseded by v0.6.10)

This round addressed difficulty feeding as a juvenile giant squid and stiff animation in both characters; see [this round's feedback](feedback_v0_6_9.md). The existing 3 m starting length, feeding eligibility, nursery bonus, and radius were confirmed to match. The capture point was aligned with the visible model's turning, and relative motion during the current frame was used to recover contact along the path, preserving the radius and occlusion rules. Feeding ends at the actual mouth anchor. The orca gained coordinated tailstock, fluke, and pectoral-fin motion; the squid gained segmented arms, fin waves, mantle contractions, and arm gathering, driven by actual speed, sprinting, jetting, and turning state.

This round passed 239 unit tests, 28 main browser-flow checks, 9 feeding-transition checks, and 11 checks targeting both characters. Full animation cycles were also recorded, and self-intersections in the old orca fluke were fixed. The final temporary public-preview state and asset receipts are in the [verification record](verification.md) and `.local/preview_state.json`. The next priorities were natural user feedback on squid fish-catching feel, both characters' trailing-view animation, and real-phone performance. Controlled scenes do not establish acceptance of a natural full run. At this stage, earlier uncommitted changes remained, with no commit or push; production Pages was still v0.5.1.

## v0.6.8 previous candidate

The user had accepted v0.6.7's recorded male/female screams and forward swimming motion. This round remade fish-feeding sounds in response to additional feedback: three short variants made from CC0 water foley replaced the old sine-wave bubbles. Adjacent variants do not repeat, and a softer water-entry impact and bubble tail remain. See [this round's feedback](feedback_v0_6_8.md) and [audio sources](audio_sources.md). Male/female voices, human swimming motion, and gameplay were unchanged.

This round completed 226 unit tests, 9 actual-feeding targeted checks, browser audio rendering and lifecycle checks, and playback/asset-consistency checks on the public preview at 1440/390/320 px; see the [verification record](verification.md). Next, the user should listen on actual devices to judge whether fish sounds feel natural and whether eating a shoal is too loud. Automated waveform checks do not establish subjective listening quality. At this stage, changes remained uncommitted and unpushed; production Pages was still v0.5.1, and only the temporary preview had been updated.

## v0.6.7 previous candidate (human voices and swimming accepted by the user)

This round replaced v0.6.6's synthetic human voices with CC0 recordings of male/female performers and corrected the full freestyle cycle: underwater strokes push toward the feet, while above-water recovery moves forward with a high elbow. See [this round's feedback](feedback_v0_6_7.md) and [audio sources](audio_sources.md). All earlier human appearance, shallow-water model, and gameplay changes remained. At this stage, changes were still uncommitted and unpushed, and production Pages was still v0.5.1.

That round verified actual recording routing, mute/pause/restart behavior, and complete male/female stroke cycles; the temporary public preview was updated at the time. See the [verification record](verification.md). The user subsequently accepted the result, so these human voices and swimming motions were retained. `samplePose(0…1)` reproduces the same pose, and side-view recordings of continuous cycles are available. Automated joint or waveform checks still do not establish acceptance of a natural full run.

## v0.6.6 previous candidate (synthetic human voices superseded by v0.6.7)

This round added male/female swimmers and divers with corresponding voices, redrew 13 shallow-water species and 5 modern Ocean Predators, and added a human-appearance switch to the Ocean Guide while retaining 35 entries. See [this round's feedback](feedback_v0_6_6.md) and the [verification record](verification.md). Changes remained uncommitted and unpushed, retaining all earlier feedback changes. The next priorities were feedback on model recognition, the sound of male/female screams, and shoal-scene smoothness on real phones.

## v0.6.5 candidate at that stage

Redraws of six Ancient Giants and four Abyss Lords, stronger human voices, 20-second orca sonar, and more forgiving close-range feeding on ordinary fish were complete; see [this round's feedback](feedback_v0_6_5.md) and the [verification record](verification.md). The candidate also included v0.6.3's slow reef prey/system theme and v0.6.4's 20° surface pose/fixed frenzy pickup/inverted vertical controls. All changes remained uncommitted and unpushed; production Pages was still v0.5.1, and the temporary-preview state was in `.local/preview_state.json`.

The next step was user playtesting of visual appeal, scream quality, and close-range feeding feel. Preserve the squid's original ability; 20-second orca detection is not a reason to lengthen the ink cloud. Continue checking real-phone performance, natural full runs, and deep-sea lighting readability against the checklist below.

## Implementation background through v0.6.2

The v0.6 visual snapshot was saved as local commit `94c2a95`; the user requested no push for the time being. The following v0.6.1 four-point playtest response and v0.6.2 nursery-shallows implementation remained uncommitted: free swimming direction and pitch scale, juvenile starts, feeding-gather transitions, and fixes to shallow-water ecology and human distribution. See the [feedback record](feedback_v0_6_1.md). The later nursery-shallows work changed the starting length to 3 m, added small fish, established a safe zone and two outer-reef challenges, and incorporated human redraws, differentiated feeding sounds, and clearer desktop hints; see [that round's feedback](feedback_v0_6_2.md). The overall visual upgrade had completed the previous round's integration acceptance; see the [v0.6 visual scope](visual_upgrade_v0_6.md). It added continuous body shapes, skin materials, and skeletal tail motion; refined seagrass, coral, the sea surface, ships, ink clouds, and sound waves; and restyled the home screen and Ocean Guide as an ocean expedition/specimen display. Production remained v0.5.1. New versions went to the user for review through a temporary preview before commit and release under explicit authorization.

The next priority was checking overall appearance, close-up character recognition, deep-sea readability, and phone smoothness against actual playtest feedback. Do not treat the completed UI structure as work that has not started. Continue natural full-run and real-device verification with the checklist below.

## v0.5.1 released baseline

This round made both orca and giant squid selectable, each with one active and one passive ability. It expanded ordinary creatures to 21 species, covering shallow-water shoals, modern hunters, and ancient beasts; added adult swimmers/divers, submarines destructible by ramming, and single-use contact torpedoes; and changed the four lord battles to repeated flank contact. The home-screen Ocean Guide had 32 entries; see the [feedback record](feedback_v0_5.md) and [ecology sources](ecology_sources_v0_5.md). Giant squid became player-only, with the wild species replaced by the giant Pacific octopus; see the [v0.5.1 addendum](feedback_v0_5_1.md). Fantasy Hawaii remained the only available map, with the other regions serving as future entry points.

The user authorized a commit of the v0.3–v0.5.1 functionality, then requested a push to GitHub, a public playable link, and README improvements. That release was v0.5.1, available on [GitHub Pages](https://stanatny.github.io/abyssal/), with deployment status in [Actions](https://github.com/stanatny/abyssal/actions/workflows/pages.yml). Actual verification is recorded in the [verification record](verification.md), `.local/pages_deployment.json`, and `.local/v5_1_pages_verification.json`; temporary-preview records remain in `.local/preview_state.json`. Overall UI refinement was to follow as a separate iteration on that baseline.

v0.6 now carries forward the overall UI and art redesign; do not automatically hand it back to Kimi. Adding species models does not establish that the overall visual issues are resolved. The main remaining gaps are natural full runs with both characters, real-phone multitouch input, and low-end-device performance after the expansion.

## Next natural playtests

- Start at spawn with each of the orca and squid, feed naturally, and record the time to the middle depths, the ancient-creature layer, the first lord battle, and final results. The reference model's 17:52 baseline for a 3 m juvenile start and 23:35 route with 25% longer durations are test assumptions, not evidence of completed natural playtests.
- Observe whether tiny shoals are easy to find and eat in succession, whether medium prey such as green turtles/sunfish bridge growth stages, and whether natural respawning of sparse large prey, such as the two megalodons, creates excessive late-game waits. Do not substitute an automated model's assumed feeding intervals for map-density acceptance.
- Compare the orca's 41.6 sprint speed with the squid's 32 sprint speed/flexible turning. Check whether the 10-second escape window after inking, 1.5-second directional jet, solid obstacles, and 60-second cooldown are understandable and usable during natural pursuits.
- Observe chase distances, warnings, and disengagement for ancient beasts, ordinary hunters, and lords. The orca now sprints faster than a lord's normal pursuit; confirm that interception and abilities still create pressure while allowing reliable evasive responses.
- Approach lords from the front, rear, above, and both flanks to assess flank detection, 0.35-second separation before reentry, the 1.2-second cooldown, and the 3-second vulnerability window. Confirm that battles requiring at least five effective hits allow maneuvering, and that staying pressed against the enemy is not optimal.
- Complete three actual submarine rams and observe hull blocking, turning room, destruction feedback, and the release of three divers. Confirm that torpedo warnings are readable and that 28-point single-hit damage is not repeated by same-frame contact.
- Compare feeding feedback and lost growth under severe injury, minor injury, and full health. Check that ordinary creatures, human prey, seagulls, and lord loot all clearly explain “heal first, then grow.”
- Exercise three result cases: 30 m without defeating a lord, 30 m with at least one lord defeated, and the 30-minute time limit. Pausing must freeze the timer. Rules already covered by targeted state setups still need checks for clear prompts during natural full runs.
- Explore different layers and check the displayed-depth multiplier of 4, terrain, habitats, return radar, and ascent prompts. Successfully returning to the shallows after getting lost in deep water matters more than merely seeing an indicator.
- Observe frightened flying-fish glides, momentum-based character breaches, seagull feeding, and the reentry camera. Confirm natural transitions among sky, splashes, and camera movement at different body sizes.
- On real phones in portrait and landscape, verify the joystick, sprint, character ability, countdowns, pause, home-screen marker preference, and page safe areas, especially sustained multitouch, long presses, and browser gestures.
- Listen through calm play, pursuit, lord combat, inking, escape, pause, and results, checking volume and transitions on actual speakers/headphones. The score and most event sounds are procedural; adult male/female screams use CC0 human recordings, and v0.6.8 changed fish feeding to CC0 water foley.

## Gameplay and content tuning

v0.6.3 added three slow shallow-water prey species—longhorn cowfish, green humphead parrotfish, and humphead wrasse—and made the Ocean Guide follow the system's light/dark theme. Continue using real playtests to assess whether the eight resident shoals are easy to find, early growth feels natural, and models/text are comfortable under a dark system theme.

Record feeding counts, healing, causes of injury, active-ability timing, effective flank hits, and causes of death at each stage of natural play before changing growth, hunger, or ecological density. The reference event model uses actual survival rules but does not simulate paths, respawn waits, or real combat. Do not work backward from the old “15–20 minutes” description to change test assumptions.

Evaluate the two random lords' combinations, territories, and respawn intervals to reduce dead time caused by inaccessible targets or repeated searching. Squid ink can interrupt nearby engaged lords; it does not freeze the whole map or grant invulnerability. Future abilities also need explicit targets, activation conditions, end conditions, and counterplay.

Orca and giant squid are already selectable. Future characters should retain clear active/passive differences and use the existing character configuration. The layout supports at most two active abilities; do not turn every passive into a button. Refine the existing characters before considering dolphins, sharks, or other characters and their separate resource tradeoffs.

When Mariana, Bermuda, and Atlantis open, assign species, terrain, and lords through region configuration. The current gathering of all species in Hawaii is a fantasy combination and must not become a claim of real geographic distribution in the Ocean Guide or publicity. Continue maintaining sources and measurement conventions for new living or extinct creatures, distinguishing body length, wingspan, carapace length, and total length including tentacles.

## Art, sound, and controls

- Continue refining the home screen, Ocean Guide, and HUD's art direction from actual v0.6 preview feedback, retaining layout and touch-input regression checks for desktops, small phones, large phones, and landscape screens.
- Refine body shape, mouths, skin, and motion for both player characters; further distinguish the playable giant squid, wild octopus, and mythical Kraken. Inspect the silhouettes and motion of the 14 added models at actual gameplay distances.
- Refine entrance shadows, environmental responses, ability animation, and attackable-flank cues for the original Maya-inspired beast and three-headed Hydra, reducing reliance on text explanations.
- Tune deep-sea lighting, bioluminescence, fog, and lava to retain atmosphere while keeping obstacles, enemies, and torpedoes ahead readable.
- Continue tuning keyboard/touch turning, camera behavior after growth, and close-range views during lord battles. v0.6.4 added inverted pitch and a comfortable 20° surface pose; continue assessing options to reduce camera movement, heartbeat, and damage flashes.
- Explain character active/passive abilities, flank attacks, rewards, and recovery gradually through short prompts instead of presenting all instructions at first entry.
- Adjust arrangements, human screams, and event sounds through listening on real devices, and maintain the [asset sources](audio_sources.md). Keep explicit license and processing records for introduced audio, distinguishing foley from real environmental recordings.

## Technical cleanup

- v0.6 profiling identified `sweepBody` and `colliderReach` as the main CPU costs in both old and new versions. Prioritize conservative spatial partitioning/candidate queries and caching repeated boundary calculations, retaining swept-contact and escape-from-geometry semantics and checking them against existing collision regressions. Do not directly simplify expanded ellipsoid boundaries or skip body-safety checks. Bloom has a separate GPU cost and can be disabled in smooth mode.

- With 24 ordinary species, new human activity, and abilities coexisting, check low-end frame rates, offscreen updates, long sessions, and resource release across repeated restarts.
- Improve collision approximations and escape after growth around large creatures, rock arches, and submarines. Check near-ground edge cases caused by jetting and turning.
- Keep character, survival, ecology, lord, and human-activity rules separate from scene presentation. The Ocean Guide should reuse configuration and model caches; extra content must not add a persistent RAF.
- Continue distinguishing rule unit tests, controlled-scene browser checks, public-preview checks, and natural playtests. Record actual findings for each round in the [verification record](verification.md).
- Continue with review first, then commit, push, and release under explicit authorization. Temporary previews do not replace GitHub Pages.

## Historical progress

- **v0.4 / v0.4.4**: Keyboard-only desktop play, prevention of accidental selection on phones, 10-second orca sonar/60-second cooldown, forward markers and 360-degree echo radar, return navigation, home-screen character/region entries, a 30-minute limit, and solid collisions. Later, reward descriptions moved into the Ocean Guide and buffs were standardized to 30 seconds. Only the orca was available then; v0.5 superseded this with two characters. See the [feedback record](feedback_v0_4.md).
- **v0.3**: Sound, blood mist, momentum-based breaching, ships, hunter abilities, and the Ocean Guide were completed on 2026-09-27. Kimi's visual redraw was integrated; Codex performed independent review and targeted fixes. See the [feature feedback](feedback_v0_3.md) and [visual handoff](visual_handoff_v0_3.md). The 13-species Ocean Guide from that stage has been superseded by the later expansion.
- **v0.2**: Added layered music, recovery-first feeding, lord battles, reward recognition, surface breaches, and deeper regions. Passed the 26 rule tests and 21 browser flows of that stage; the user authorized a commit on 2026-09-27. See the [feedback record](feedback_v0_2.md). These historical passes do not establish acceptance of the current round or real devices.
