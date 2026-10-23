# v0.11.16 — Atlantis redraw, combat readability and regional loading

## Authorization and scope

On 2026-10-23 the user accepts the loading candidate and explicitly requests
commit and push to main. Integrate the accepted `art/atlantis-hf-redraw` history
from v0.11.15 / `3aef21e` through neighborhood checkpoint `8f27834` and loading
checkpoint `3c28a7d`. All 1,229 delivered inputs match before acceptance/release
metadata changes. Historical candidate-only and no-push notes are superseded
for this scope. The current agent integrates alone; no tag or GitHub Release
is requested.

## Delivered behavior

- Actual Hugging Face redraws cover eight Atlantis-specific underwater species,
  the Brown Pelican, three night boats, Poseidon and six inscribed obelisks.
  Spadefish swimming includes the accepted anatomy/motion correction. Previously
  accepted shared creatures and players are retained.
- Civic and neighborhood architecture, city stone materials, quest mechanisms,
  inscriptions, the key and its glow, chests and household furnishings are
  upgraded while retaining the existing layout, openings and collision routes.
  Duplicate temple masonry and abrupt lighting transitions are corrected.
- Atlantis preparation reduces duplicate collision queries, packed-model decode
  allocations and mismatched HDR shader preparation. Graphics restoration
  recreates lighting resources and waits for a valid restored frame before
  allowing Continue.
- Kraken swimming and eight-arm capture respond to movement/attack state.
  Sprint escape costs 24–120 stamina according to distance, in addition to
  ordinary sprint use; an unsuccessful payment cannot bypass close capture.
- The accepted stable follow camera remains intact. Occluded players receive a
  silhouette and nearby large creatures receive an interior section. Ordinary
  large hunters have bounded player-body contact and stay behind after a bite
  while preparing the next attack. These are fitted body volumes, not exact
  skin collision or general NPC-to-NPC rigid-body physics. Extremely close
  bodies can still obscure the terrain.
- Seven unselected environment modules now load on demand. Content-hashed
  assets retain their existing caching and replacement behavior. Final-byte
  gzip generation and explicit failed-import Return Home/Reload recovery are
  covered by the accepted loading revision.

The rejected foreground-fading, moving-camera and far-detail LOD experiments
are excluded. No new gameplay tuning or art changes are introduced by release
metadata. See the individual implementation reviews linked from the handoff,
and [the loading review](region_environment_loading_revision.md).

## Verification and limits

The accepted loading candidate passed 1,583 unit tests, formatting/build,
sixteen native map/character cases, cache update/rollback, failed import,
resource disposal and graphics restoration checks. Its 340 public build files
match the delivered build. These are candidate receipts, not fresh release CI.

Release-only edits update package and bilingual footer to v0.11.16. Fresh local
format/build checks, exact-main Node 22 CI, downloaded Pages artifact comparisons
and bilingual native formal-page flows belong to `.local/release_v0_11_16/`.
Confirm workflow SHA, deployment success and actual public bytes before reporting
the formal page as updated. Preserve failed attempts with their final corrections.

On the development Mac, controlled cold startup improved from 15.2–15.8 seconds
to 11.9 seconds and initial compressed scripts decreased by about 1.79 MB.
Warm-load measurements are noisy. First selection of another sea still downloads
its deferred content and reconstructs that environment. No active-play GPU,
physical-phone FPS, heat or battery improvement is established. The original
physical-phone gate-entry stall/black-surface report remains a separate open
follow-up despite successful forced graphics-restoration regression checks.

## Operations

Keep development, restricted preview, tunnel and awake processes, logs, runtime
archives and historical worktrees. Production contains only `index.html` and
`assets/`, without development hooks or source maps. Confirm the project Pages
base path, same-address refresh and all runtime resources. The preceding formal
checkpoint is `3aef21e`; rollback requires an authorized revert and matching
version/footer metadata, without destructive resets or service cleanup.
