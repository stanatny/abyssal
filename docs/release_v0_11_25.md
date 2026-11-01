# v0.11.25 — Distant city and lord visibility

## Scope

On 2026-11-01 the user authorizes publishing the accepted visual corrections
to main, following v0.11.24 / `4cd7b18`. All 2,150 recorded preview inputs
match before publication-only version and documentation edits.

- Atlantis retains lightweight geometry-derived silhouettes for all 32 city
  chunks and the main temple. Shared architectural haze makes the skyline
  readable from high underwater viewpoints while original near detail and
  terrain occlusion remain intact.
- Living, selected lords across all eight maps no longer disappear at the
  unrelated 230 m ordinary/alien or 850 m mythic body-distance thresholds.
  Existing camera frustum, regional fog and depth occlusion govern visibility.
  Defeated and unselected instances remain hidden.

Combat, ecology, puzzle rules, AI updates and movement are unchanged. No new
midgame gameplay, tag, separate GitHub Release or personal Skill change is
included. Earlier candidate status notes retain their historical scope.

## Verification and delivery

Fresh local validation passes all 2,160 tests, formatting and the production
build. Release checks and exact-main Actions/Pages receipts are retained in
`.local/visibility_main_delivery_20261101/`. Publication completion additionally
requires the existing Pages workflow to pass, followed by checking the formal
`/abyssal/` page and native map controls.
The footer and package metadata identify this release as v0.11.25.

Prior candidate evidence covers 309 Atlantis/preparation tests, 92 relevant
lord tests, actual eight-region scene inspection and same-machine rendering
comparisons. Those reviews describe their measured scope and limitations;
they are not claims of a new full playthrough or phone performance validation.
The temporary Cloudflare preview had intermittent HTTP 429 module preloads;
formal GitHub Pages verification is recorded separately. Existing preview
services, archived runtimes and historical worktrees are preserved.

See the [Atlantis skyline review](atlantis_distant_city.md) and
[shared lord visibility review](lord_distance_visibility.md).
