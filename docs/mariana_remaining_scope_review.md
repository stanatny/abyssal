# Mariana remaining-scope review — 2026-10-25

Follow-up: the user subsequently authorized wrap-up. The depth-aware image
preparation candidate is implemented and separately verified in the
[loading revision](mariana_refuge_loading_revision.md). The dated read-only
findings below remain the baseline; minor decorative work stays optional.

The user accepts the delivered sponge, starfish and snail and asks what else
needs optimization. This review changes documentation only. It does not start
another asset batch, commit, push or new Hugging Face generation. Earlier batch
records retain their dated candidate and acceptance history.

## Coverage and visual priorities

The regional inventory has 22 ordinary underwater kinds and one rare. The seven
previously procedural ordinary kinds and the rare now have HF replacements;
the other 15 ordinary kinds and four guardians reuse earlier accepted assets.
The current Mariana work also covers the shallow/deep colonies, small fossils,
four guardian formations, pit-wall and suspended-rock finishes, four refuge
buildings, plaza, three residents and two surface vessels.

Current native scene inspection sampled the survey buoy, Hydra bay, complete
refuge and its west arch. No additional major model replacement is identified
in this bounded review. Remaining procedural elements are not automatically
defects:

- The three small survey buoys remain legible and inexpensive. Optional future
  finishing could add restrained weathering or panel detail, preserving their
  current contact and beacon silhouettes.
- Small ledge supports, guardian apron/bridge surfaces and the refuge arches
  remain simpler than the neighboring HF assets. A light surface/edge treatment
  could improve consistency. The current open paths and bright refuge are worth
  retaining; another large model-generation batch is not justified by this alone.
- Water, pressure seals, sky and lights are intentional procedural effects,
  not missing HF conversions.

## Higher-value technical candidate: depth-aware preparation

Current code constructs the refuge during initial map preparation. Both
`addMarianaRefugeBuildings` and `addMarianaResidents` immediately call each
asset's material preparation. The refuge then remains hidden until the player
is below Y=-2400; its idle motion already returns early while hidden.

New native Chrome observations confirm this distinction:

- At the initial player position `[0, -18, 74.31]`, the refuge is hidden, but
  all four building and three resident textures are ready at 1024 × 1024.
- None of those seven textures has a renderer GPU upload at that shallow
  checkpoint. Download/decode readiness must not be described as seven active
  GPU textures or ongoing rendering work.
- A fresh production-preview context requests all seven before entering play.
  Their encoded response bodies total **1,945,094 bytes (1.85 MiB)**. The nominal
  RGBA8 image footprint is **28 MiB**, not a measured process-memory saving.
- Production serves `index-CcoCYL_k.js` and has no development hook. There are
  no page errors in this review. DEV timing entries did not capture those
  requests, so byte accounting uses the production responses.

The useful next experiment is to defer the lower refuge's visual preparation
and start it sufficiently before descent reaches the visible area. Preserve
collision/progression availability, warm-cache reuse, cancellation, fallback,
online recovery and fast arrival/visit-refuge flows. First compare cold entry,
warm return and first deep appearance; otherwise a shorter entry could merely
move a stall or color pop to the final approach. This is a candidate to reduce
initial loading/decoded-resource pressure, not an established steady-FPS gain.

Existing depth visibility, colony instancing/near-far selection, shared assets,
resident animation gating and disposal already exist. They should not be
presented as missing optimizations. No ecology or AI-rate reduction is proposed.

## Evidence and limits

Private evidence: `.local/mariana_scope_20261025/` contains the source-hash check,
read-only native fixture, four screenshots and `report.json`. All **1,472**
inputs match the last delivered resident fingerprint before documentation edits.
The first fixture attempt used the wrong debug position property and was
corrected; its failed report is retained, with no game-code change.

The machine is an Apple M6 with 32 GiB, Node 24.21.0 and native Chrome
155.0.8059.86. Cameras are staged in the actual populated scene while paused.
All-pass draw snapshots are recorded for reproducibility, not treated as a
frame-time benchmark. This review does not establish phone FPS, heat, power or
long-session memory behavior. Earlier 1,685-test and lifecycle results belong to
the resident delivery; they were not rerun or relabeled as this review's tests.

Only documentation checks are needed for this turn. Runtime sources, services,
preview artifacts, historical worktrees and other pending batches stay intact.
