# Generated appearance recovery and human motion repair — 2026-10-20

The user rejected the eleventh-batch human shoulders and Diver posture, and reported missing colors on both shark players, Giant Pacific Octopus, Pliosaurus, Dunkleosteus and other creatures. This repair is an uncommitted candidate on `art/hawaii-lords-hf-redraw` / `0eafb80`. Batches 10–11 and their original evidence remain preserved. Formal main/Pages stays at v0.11.13 / `110494c`. The current AI agent works alone; no personal Skill change or new HF inference is involved.

## Reproduction and cause

Native Chrome against the actual old public preview reproduced a Mechanical Shark surface-map request aborting at the former five-second deadline. Its color request succeeded, but `Promise.all` discarded that success when the surface request failed. The cached preparation promise then permanently retained failure. Other generated-creature loaders used the same permanent-failure pattern with eight-second deadlines. More concurrent generated assets made this fragile behavior easier to encounter. The old player texture files themselves had not changed; unchanged file hashes did not establish correct runtime appearance.

`palette_public_before.json` and the public-before screenshots record that reproduction. A normal local run loaded both sharks successfully; this does not contradict the intermittent public failure, and the normal public Zombie request in the recorded run succeeded. Slow/failing requests are explicitly injected in the new regression, separate from the real public observation.

The shoulder spheres were an added runtime patch, not an acceptable anatomical feature. The previous articulated-shoulder clipping severed the original surface, while its old Euler rotations and limb pivots were poorly fitted to the new T-pose geometry. Tests that checked named bones or old angular ranges were insufficient evidence of natural deformation.

## Texture recovery

`src/material_loading.js` now provides one bounded queue for all generated appearances:

- At most six active downloads. A visible Guide model receives priority over queued background models.
- The 15-second request deadline starts when a request actually runs, excluding queue wait. One automatic retry follows a failure; this is bounded, not an endless download loop.
- Independently completed maps are applied and retained. Failure of a surface map no longer discards the color map, and later retries request only missing maps.
- Concurrent requests share one preparation task. Successful maps remain shared and are not downloaded again when revisiting the Guide.
- Failed preparations can recover after the retry interval, via an explicit Guide retry, or when the browser reports connectivity restored. The Guide displays bilingual loading/failure status instead of silently presenting fallback color as the finished appearance.
- Startup waits up to five seconds without aborting pending maps. Late completions update the existing shared material. Disposal cancels queued/active work and closes late decoded images without applying them to dead human materials.

The helper covers the four players, four Hawaii lords, 28 other ordinary Hawaii creatures, three eleventh-batch non-human creatures and four adult human variants: **43 appearances**. The five user-named/problem examples are included. Accepted color maps, material tuning, player effects, biological animation, combat and ecology remain unchanged, except for the explicit human corrections below. Network loss can still prevent loading; the result is a recoverable fallback with a visible Guide retry, not a claim that offline textures always exist.

## Human repair

All four original HF T-pose meshes are retained. The runtime now skins their continuous chest, shoulder and arm surface directly; shoulder clipping, the added spherical joints and the fourth joint draw are removed. Skin weights blend the chest into the shoulder and elbow. Shoulder rotations use the shortest quaternion from the actual T-pose axis to the swimming direction, and elbow/wrist flexion follows the transformed anatomical axis rather than an unrelated local Euler axis.

The hips, knees and ankles are fitted to the new mesh. Swimmers retain alternating front crawl and high-elbow recovery, with rearward ankles. Divers maintain horizontal trim, forward arms, modest alternating hip-driven kicks, relaxed knees and rearward fins. A uniform 0.94 visual fit, including bone offsets, keeps the full animated surface within the existing root-length contract after straightening the feet; collision size, population, speed, AI and gameplay do not change. All 15 bone names and the phase/animation interfaces remain available.

A separate offline finish correction stops the Diver cylinder valve being classified as hair: its existing geometry is unchanged, and its original surface detail is retained under a neutral equipment finish. Only the two Diver WebP maps change; all four source mesh arrays remain identical. This is an explicit cleanup of generated assets, not a claim that the raw generation was perfect.

Motion references remain [Swim England front crawl technique](https://www.swimming.org/masters/improving-front-crawl-technique/) and [SDI finning guidance](https://www.tdisdi.com/wp-content/uploads/2016/09/fin_kicks_infographic.pdf). The result is a game-scale adaptation, not a biomechanics simulation.

## Fresh validation

Evidence root: `.local/batch11_repair_20261020/`. Earlier batch results remain historical.

- `full_test.log`: **1,431/1,431** tests pass, including four meaningful loader regressions for partial failure/retry, concurrency/priority, bounded startup and late disposal. The subsequent Guide online-status synchronization is separately exercised by the browser retry fixture.
- Human tests retain surface-ray, size, symmetry, full-cycle pose, resource-sharing and disposal checks. New anatomical flexion assertions replace assumptions tied to the rejected Euler binding; geometry limits are not relaxed to hide a bad pose.
- `loading/report.json`: **43/43** generated appearances load correctly with selected first requests delayed nine seconds and other first texture requests failing once. Five reported examples are revisited without new downloads. No page errors.
- `retry/report.json`: an actual native retry button recovers a failed English Guide appearance, and an online event recovers the Chinese 390-pixel Guide, without reloading. Both display loading and failure states accurately. Narrow desktop emulation is not a physical-phone test.
- `native/report.json`: 12 Guide visits, 12 region transitions across Hawaii/Bermuda/Atlantis/Mariana, four real-world human motion recordings and pause checks pass. Of 310 audited skeletons, 251 are disposed; the remaining 59 belong to the retained 31-person pool and 28 current seabirds. This is the expected bounded cache, not a claim that every scene resource should disappear.
- `motion/report.json`: all four human Guide cycles and failed-texture fallbacks pass. Four 14-second deliveries combine controlled Guide motion with actual world movement; the world footage uses an observer camera and an invulnerable staged player, without replacing the entities' natural displacement.
- `review/`: same-camera rejected/corrected surfaces, including clay/underside views. `texture_finish_geometry_preservation.json` confirms unchanged Diver mesh arrays through rebaking. The three other eleventh-batch creature shapes and all tenth-batch assets remain preserved.

The repair removes one shoulder draw per human but does not claim an overall FPS, heat or physical-phone performance improvement. Download scheduling changes transient network load; successful shared-cache behavior remains. Public resource checks and final delivery receipts are appended below after they complete. Visual acceptance remains with the user; PP-Q037 and PP-Q036 remain open.

## Public delivery verification

The existing restricted origin, https://saver-recorded-digit-could.trycloudflare.com/, now serves `index-7B79I9Pi.js`. `artifacts.json` verifies all **56 runtime files / 31,854,053 bytes** against both the local restricted service and public responses. This is 4,149 bytes above the rejected delivery. All 11 checked source/configuration paths are denied. DEV35213, preview74197, awake74200 and tunnel35419 retain their identities; the previous runtime is archived as `runtime_before_20261020_004535`.

`public/report.json` records **86 native Guide checks** (all 43 appearances in English desktop and Chinese 390-pixel desktop touch emulation), all eight four-character start/boost/ability/pause/Home flows, successful texture responses, same-address refresh and absent production debug hooks. No observed page errors or failed public resources. These are fresh checks of this build; they do not establish physical-phone performance or guarantee availability during a later network outage.

`source_preservation.json` compares the preceding 973-input snapshot: 939 unchanged inputs and 34 explicitly scoped changes, plus the new loader, its tests and this repair record. Every original generated mesh file is unchanged; only the two Diver color images are rebaked. Other creature textures, accepted player animation/effects and the tenth-batch shapes remain unchanged. The wrappers only expose their existing material preparation callback. `delivery/` holds the human before/after sheet, public appearance recovery sheet and decoded 56-second human motion compilation. User review remains pending; no commit, push, main publication or HF quota consumption occurred.

## Swimmer recovery and loading contrast follow-up — 2026-10-20

The user confirms that colors now recover correctly, but rejects the photographed Swimmer pose and reports a pale box during loading. Color recovery is accepted feedback for that issue; the human candidate still needs review.

The previous arm motion rotated the upper arm through a largely planar circle and added strong elbow flexion. This let the hand fold toward the neck during recovery. The replacement tracks a continuous wrist path: shoulder-line entry, underwater push toward the thigh, then an outward recovery around the body. A two-bone solution places the elbow above and outside the wrist without changing the limb lengths. The two arms retain their half-cycle offset and original animation clock. Reduced knee flexion and an ankle orientation fitted to the actual foot surface keep the legs elongated and the toes rearward instead of hooked.

References were checked again: [Swim England's front crawl guidance](https://www.swimming.org/masters/improving-front-crawl-technique/) and [USA Swimming coach Russell Mark's Freestyle 2020 presentation, hosted by Pacific Swimming](https://www.pacswim.org/userfiles/kcfinder/files/Freestyle%202020.pdf), especially the photographed recovery sequence on slides 9–10. These support an outward, relaxed recovery and small continuous kicks. The reference PDF and inspected pages are retained locally. This remains a game-scale motion adaptation.

The white rectangle was the new loading-status button, not a missing texture tile. Its hard-coded light background combined with inherited dark-theme button text and font rules. The status now uses transparent background, the Guide's theme color and an explicit small type size, with sufficient selector specificity. It sits near the preview footer; failed loading retains an underlined retry action. The cyan model remains a temporary untextured fallback. The accepted download queue, recovery behavior, textures, model shapes, Diver motion and gameplay are unchanged.

Fresh evidence is in `.local/swim_loading_followup_20261020/`:

- 1,432/1,432 full tests and formatting pass; 15 focused human checks pass. A new actual-surface regression checks rearward toe alignment and outboard hand clearance throughout the cycle. The obsolete fixed-world-axis elbow assumption is replaced; actual stroke direction, high elbow, body bounds, joint continuity and resource assertions remain.
- Same-camera male/female comparisons and ten-phase oblique/top views inspect the complete surface, rather than one favorable pose. Two new 14-second clips combine Guide movement with real world displacement.
- Six human Guide visits, 12 transitions through four regions, both Swimmer world recordings and pause checks pass. The two unchanged Diver variants retain their focused motion/size regressions. The existing 310-skeleton audit still releases 251, retaining the expected 59 current/pool skeletons.
- Four loading/failure/retry cases cover light/dark themes and English desktop/Chinese 390-pixel touch emulation. All show transparent status background, 11-pixel type, no border, in-preview bounds and successful recovery after explicit retry. These are desktop browser tests, not physical-phone measurements.

No generated asset, external inference, combat/ecology change, commit or push is part of this follow-up. Public checks and final delivery are recorded after rebuilding the same restricted origin.

### Follow-up public verification

The same restricted preview now serves `index-Cw-3q--j.js`. Fresh `artifacts.json` checks all **56 runtime files / 31,854,858 bytes** against the build, local restricted service and public responses, and confirms all 11 tested source/configuration paths remain denied. The previous runtime is retained at `runtime_before_20261020_053408`; all four existing processes remain unchanged.

`public/report.json` records 20 Guide checks across ten representative appearances (including the reported players, octopus, pliosaur, Dunkleosteus, Hydra and both Swimmers) in English desktop and Chinese 390-pixel desktop touch emulation. All eight four-player native start/boost/ability/pause/Home flows, same-address refresh and absent production hooks pass, with no observed page errors or normal failed resources. `public_loading/report.json` separately repeats the four theme/language loading and explicit-retry cases on the production build using deliberately delayed/failed texture requests; all recover successfully.

`source_preservation.json` verifies 969 of the preceding 976 source inputs are unchanged. The seven differences are the Swimmer animation, Guide status CSS, focused human tests and four project documents. Every generated asset and the accepted material-loading implementation is unchanged. `final_fingerprints.json` records this follow-up's source/build state. `delivery/` contains the same-angle comparison, loading/ready screenshot pair and a fully decoded 28-second motion compilation with oblique, top and real-world views. The video is encoded at a constant 30 fps to avoid duplicated timestamps at the clip join. No new user acceptance is inferred from technical checks; the candidate remains uncommitted for review.

## Swimmer coordination and ankle pivots — 2026-10-20

The user rejects the preceding Swimmer candidate again, showing the recovery frame where both arms are drawn toward the shoulders. The earlier test passes and delivery remain historical; they did not establish visual acceptance. This follow-up preserves the accepted color recovery and transparent Guide loading status.

Diagnosis separates three defects. The previous equal-duration wrist trajectory let both arms be folded at once and left too little forward extension. Independently aiming the upper arm and forearm did not constrain elbow rotation to one anatomical hinge. The Swimmer ankle pivots were also above the actual ankle surface: rotating there bent the lower shin along with the foot, despite a rearward toe-vector assertion passing. Neutral-mesh/skeleton overlays and complete oblique/top cycles are retained in `.local/swimmer_pose_v3_20261020/`.

The new crawl has a longer forward-entry/extension phase and an outward, more extended recovery. At least one wrist stays ahead of the head throughout the cycle. The arm's bend plane determines the shoulder orientation, and the elbow flexes on one local axis. Small coordinated pelvis/chest roll supports the stroke while the head remains approximately face-down. Swimmer ankle position and rotation are fitted separately to the male/female mesh, with restrained hip-led alternating kicks. These are visual adaptations of the same [USA Swimming reference](https://www.pacswim.org/userfiles/kcfinder/files/Freestyle%202020.pdf), not a claim of biomechanical simulation.

No generated mesh, color map, triangle, draw, body scale, movement speed, collision rule, ecology or animation period changes. The shared fifteen-bone interface, independent instances and disposal contract remain. The Diver branch keeps its prior coordinates and motion: a fresh comparison verifies identical geometry attributes/indices and all world bone matrices over 240 phases for both variants. New regression coverage uses actual forward reach throughout the stroke, retaining actual toe alignment, stroke direction, high elbow, surface continuity, size, pause and resource checks. Phase-specific checks follow the new recovery timing; the size bounds are not widened.

Fresh validation and delivery receipts follow below. This candidate remains uncommitted and awaits the user's visual review.

Fresh checks pass 1,433/1,433 full tests, 16 focused human checks and formatting. `motion_measurements.json` samples both sexes over 240 phases: minimum leading-wrist reach relative to the head changes from -0.016/-0.019 to +0.092/+0.082 model units; the measured extraneous elbow-axis rotation is removed. Male/female triangle counts remain 8,848/8,898 with three draws each. These measurements support the diagnosis, not subjective acceptance or a device-performance claim.

`native/report.json` records six Guide visits, 12 transitions through four regions and both Swimmer real-world recordings with stable pause. The 310-skeleton audit retains the same expected 59 live/cache skeletons and releases 251. `motion/report.json` covers both Guide clips and failed-texture fallback. Same-camera before/after views and ten-phase side/top sheets show the actual surface. The fully decoded 33-second delivery combines oblique/top Guide views with ordinary entity displacement in the game, using an observer camera and staged invulnerable player.

The same restricted preview now serves `index-CoF1zL57.js`. All 56 runtime files / 31,855,034 bytes match the build, local restricted server and public responses; 11 source/configuration paths remain denied and all four service identities are preserved. The prior runtime is archived as `runtime_before_20261020_055733`. Public checks cover all four human variants in English desktop and Chinese 390-pixel desktop touch emulation (eight visits), two native start/boost/ability/pause/Home flows, same-address refresh and absent production hooks. No observed page errors or normal failed resources. This is not a physical-phone test.

The preceding 976-input snapshot differs in only seven scoped files: the two human modules, focused human tests and four project documents. Generated meshes/textures, accepted appearance loading and status CSS remain unchanged. Fresh fingerprints, media hashes and actual message receipts are retained in this follow-up's evidence directory. No commit, push, HF generation or personal Skill edit occurred; PP-Q037 and PP-Q036 remain open.

## Accepted local checkpoint — 2026-10-20

Accepted local Hawaii creature checkpoint — 2026-10-20: the user says “现在可以了，提交吧”, accepting the latest Swimmer repair and authorizing a local checkpoint of the delivered batches10–11 plus appearance-loading/human corrections. All976 source fingerprints and56 build artifacts match the final delivery before these acceptance notes; fresh1,433-test and native/public receipts retain their actual scope. No push/main publication is requested. Next, audit all remaining Hawaii elements, including the Torpedo Submarine; the existing creature queue did not claim vehicles or scenery were redrawn. Preserve gameplay, services and archives; the current AI agent works alone.
