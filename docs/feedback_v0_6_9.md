# v0.6.9 Juvenile feeding alignment and player swimming

> Historical record: the fixed arms-leading swimming decision in this round was superseded on 2026-09-28 by [v0.6.10](feedback_v0_6_10.md). That round restored mantle-leading default swimming and moved capture back to the visible arm region. Continuous-contact correction, character motion, and existing parameters remain. Implementation and verification below describe v0.6.9 at the time.

The user reported that juvenile Giant Squid still struggled to catch small fish, requested parity with orca feeding tolerance, and wanted more natural cruising and sprinting poses for both characters. This follows v0.6.8 water audio and preserves earlier uncommitted feedback. It is a candidate without commit or push; local committed baseline remains `94c2a95` and official Pages v0.5.1.

## Feeding issue and correction

Code review confirmed both characters already started at 3 meters and shared initial mass, normal length eligibility, Frenzy eligibility, and nursery contact radius. Squid had no smaller tolerance. A 3-meter nursery character has an effective radius of about 1.191 game meters for 0.18-meter prey and 1.406 for 0.8-meter prey. This round preserves those values rather than extending intake distance.

Previously the squid's mantle tip led while its mouth and arm crown trailed, but the common capture point lay ahead. Logical heading also responded instantly while the visible model turned smoothly, amplifying the mismatch with squid's faster turning. In this round, the arm crown faces forward and capture transforms through the visible avatar quaternion, still at local forward `0.36 × length`. Capture range and swallowing endpoint are separate: the former handles close contact; the model's `getFeedingMouth()` supplies the latter in world coordinates, so prey converges on the actual mouth rather than mantle tip.

The old check also considered only frame-end distance. In a 40-millisecond physics step, orca sprint moves 1.664 meters, squid normal sprint 1.28, and squid jet 2.88. The character could cross a fish's contact range and end outside it. `sweptCaptureFraction()` now compares the capture point and prey's relative movement segment for entry into the original radius. Current-frame overlap keeps the old path; swept-only contact also requires an unobstructed path. Eligibility and prey-to-mouth terrain occlusion remain checked. Respawn, school relocation, restart, and development positioning cannot create cross-map sweeps.

This correction serves ordinary fish only. It does not expand human contact, lord flank attacks, or enemy damage, or change population, growth, active abilities, or stamina.

## Cruise, sprint, and feeding poses

Orca's tail stalk drives vertical fluke propulsion; pectorals vary with cruise, turning, and sprint. Sprint strengthens propulsion and streamlines posture. Giant Squid's eight arms, two feeding tentacles, and fins use segmented motion: traveling waves toward tips, cruise fin waves, sprint gathering, mantle contraction, and feeding arm closure. Ink Jet has independent motion intensity while movement and capture remain aligned.

`player_motion.js` manages separate motion clocks, smoothed input, and feeding triggers. The main loop calls `animate(time, effort, motionState)` with actual speed, sprint, jet, turn, pitch input, and airborne state in the third argument. Motion follows actual movement, not only fixed amplitude or held keys. Pause/restart use game time and reset flows. Guide and home screen retain the two-argument interface; shared geometry, independent skeletons, and no extra persistent loop remain.

Frame-by-frame review also found two self-intersections in the old orca fluke outline, producing thin lines and bright points from the side. This round changes only the outline into a continuous two-lobed shape, retaining span, thickness, and tail-bone linkage. Actual mesh assertions confirm no boundary self-intersections or degenerate triangles.

## Verification and delivery boundaries

**239 unit tests** passed. Eight feeding-rule tests cover juvenile parity, low-frame-rate mid-step contact, and boundaries. Seven player-motion tests cover state easing, pause, mouth coordinates, skin deformation/cache, restart cleanup, and fluke shape, alongside existing model tests. Formatting and production build passed.

The browser main flow passed 28 checks, feeding transitions 9, and the two-character suite 11. Both 3-meter juveniles caught autonomously fleeing fish offset by 1.25 meters; fish offset by 2.2 meters were not remotely eaten. Close prey behind a thin wall remained protected. Real keyboard input drove sprint/turn poses, and restart canceled previous-round state. At a 40-millisecond step, squid's actual J jet caught a fish crossed mid-step: endpoint distances were 1.400 and 1.473 meters, both beyond the old approximately 1.191-meter single-frame radius. That case fixed prey position to isolate contact behavior; it does not represent natural escape difficulty.

The motion demo uses actual guide models/rendering at 24 fps to show cruise, sprint, turning, and squid jet. It is controlled presentation, not a natural full-game recording. Final desktop/phone public-build receipts are in [verification](verification.md) and `.local/preview_state.json`. Natural feeding feel and real-phone appearance still need user playtesting. This round remains uncommitted and unpushed.
