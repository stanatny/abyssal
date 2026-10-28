# Amazon deep-pit lord navigation repair — 2026-10-28

## Report and status

The user reports Rootjaw getting stuck against the deep-pit wall after charging,
and asks to check the other deep-pit lord. The preceding Odyssey work is locally
committed as `10b8688`; this repair is a separate checkpoint. After reviewing the
repair, the user authorizes committing and pushing `art/odyssey-hf-redraw`.
The branch includes the preceding Odyssey and project-knowledge commits.
All 2,048 delivered input hashes and 929 build artifact hashes match before
acceptance-only documentation changes. Main/Pages publication and a version bump
are outside this branch delivery. Existing runtime verification below is recorded
evidence for unchanged inputs, not a newly repeated test run.

## Reproduction and cause

A deterministic run uses the actual Amazon terrain, static colliders, encounter
AI and HF models. The player is staged at a legal position relative to the lord's
home for 25 seconds, then returns to the home for another 20 seconds. No lord
position or attack phase is pinned during the run.

- Rootjaw, offset `[-55, 35, 60]`: the original version remains at the same pose
  for the entire last 20 seconds after the target returns. Its whole-body
  collision check correctly rejects the wall, but movement tries the completed
  target rotation before taking a gradual turn. All candidate headings can be
  rejected, with no swimming recovery path to make room for turning.
- Yacumama, offset `[0, -25, 75]`: this is a different defect. The previous
  centre-height correction does not keep the long posed body outside the steep
  banks. Sampled animated skin penetrates the terrain by 38.04 world units.
  Five other original target placements remain patrol scenarios after terrain
  clamping; those are not reported as combat coverage.

Evidence: `.local/amazon_lord_escape_20261028/before.json`, `probe.mjs` and the
four unchanged source snapshots in the same directory.

## Change

Only Rootjaw and Yacumama opt into swimming recovery. When the normal route is
blocked, the fallback tests the attitude the body can actually reach in this
frame. If that also fails, it selects a clear, short retreat while preserving
orientation, holds that escape direction for one second, then resumes steering.
The retreat is at most 10 world units/second. Candidate movement still obeys the
complete body, terrain, obstacles, territory and height limits. A sealed volume
stays blocked; pause and a direction-locked strike do not invoke recovery.

Yacumama also receives whole-body navigation with a four-unit allowance for its
existing body wave. Its explicit 0.65-radian pitch limit matches its previous
upright visual limit. Both use bounded 2.4-radian/second attitude changes. Rootjaw retains its prior
cap; Yacumama adopts it in place of the previous interpolated attitude.
The final pose check still rolls back any illegal motion before trying recovery.

The flying recovery path is retained. Model/texture/skin/animation assets,
terrain, ecology, spawn homes, sizes, health, attack damage, charge speed,
telegraphs, cooldowns, recovery openings and bite eligibility are unchanged.

## Verification

- New regression: the two originally failing routes at 20/30/60 Hz, with a
  continuous body sweep, bounded movement/rotation, actual deformed-skin samples,
  renewed pursuit, complete attack/recovery phases, restart and blocked/pause/
  direction-lock negatives.
- The original six 30 Hz routes per lord are rerun. Rootjaw's failing return
  segment changes from zero to 427.0 world units of travel. Yacumama's failing
  route changes from -38.04 to +11.64 units of minimum sampled skin clearance.
  These are deterministic route measurements, not exhaustive geometric proof.
- 19 targeted tests pass, including existing Rootjaw physical charge contact,
  dodge/occlusion and the Penglai long-body recovery regressions. The full suite
  passes 2,075 tests in this run.
- A separate real-terrain Yacumama combat fixture at 20/60 Hz confirms its vortex
  still inflicts the existing 57-damage bite and subsequent 22.8-damage contact.
  A lateral escape avoids damage. Fully blocked sight prevents engagement.
  An earlier target on the far slope was excluded from damage evidence because
  terrain resolution moved it out of the encounter area.
- Native desktop Chrome records each lord for about 24 simulation seconds with
  normal AI and collisions after one-time staging, a slow-input 30 m invulnerable
  player and a labelled observer camera. Rootjaw starts at its original stranded
  pose and resumes pursuit/attacks; Yacumama completes three attack cycles.
  Sampled skin clearance stays above 8.52 / 13.71 units respectively. Both pause
  with position, orientation, bones, state timer and retreat timer unchanged.
  The videos are encoded to 20-second H.264 clips and decoded for validation.

Evidence: `after_trial1.json`, `targeted.log`, `full_test.log`,
`yacumama_combat_inside.json`, `native/` and `delivery/` in the evidence directory.
Native viewports are desktop verification, not physical-phone testing. No FPS,
battery or thermal improvement is claimed.

## Preview delivery

The restricted preview is updated to `index-B8D9aJ5F.js`. All 929 local build /
runtime artifacts match; the three changed artifacts also match fresh local and
public HTTP responses. The other 926 artifact hashes are unchanged and rely on
prior dated public verification; this is not a new full-public download claim.
Eleven private/source paths remain denied at both origins. Native public English
1280 px and Chinese 390 px flows pass start/movement, quality switching, pause,
resume and home; development hooks are absent and no runtime error is observed.
The 390 px case is desktop layout emulation only.

Native switching through Hawaii, Amazon, Odyssey and Amazon restores all three
Amazon lords with zero retreat state and both pit navigation instances ready.
Service identities 35213/23118/23120/35419 and archived runtimes are retained.
The user has accepted this candidate for commit and branch push. See
`artifacts.json`, `public/report.json` and `native/lifecycle.json` in the evidence
directory. Preview: https://saver-recorded-digit-could.trycloudflare.com/ .
