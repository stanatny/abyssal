# Bermuda Hugging Face redraw — 2026-10-23

Accepted Bermuda rare/fleet checkpoint — 2026-10-23: the user accepts Crimson
Sailfin, the Steel Cape freighter and storm tanker, and requests a local commit
followed by the next HF batch. All 1,270 delivered input hashes match before
these acceptance-only notes. Recorded 1,611 tests and native/public evidence
retain their original scope. Earlier pending labels for this batch are historical.
No push/main publication is requested; regional landmark work follows separately.

## Current inventory — batch 3 candidate

All 24 ordinary Bermuda kinds now use accepted HF assets, including the three
predators locally committed as `d454e7b`. Existing four lords, four players and
shared birds remain accepted. The new uncommitted batch adds Crimson Sailfin and
the two regional moving cargo ships; user review is pending. See the
[rare/fleet review](bermuda_rare_fleet_huggingface_redraw.md). The dated baseline
and earlier pending labels below remain historical, not the current inventory.
Oil rig, explorable liner wreck, Flying Dutchman-inspired ghost ship, waterspouts
and other regional scenery still require separate review/production batches.

Accepted Bermuda predator checkpoint — 2026-10-23: the user accepts Tiger
Shark, Cameroceras and Livyatan, including the researched Cameroceras motion
follow-up, and requests a local commit followed by the next HF batch. All 1,256
delivered input hashes match before these acceptance-only notes. The recorded
1,606 tests and native/public evidence retain their original scope. Earlier
pending labels below are historical for this accepted batch only. No push or
main publication is requested; remaining regional content follows in separately
reviewed batches.

## Batch 1 accepted checkpoint

On 2026-10-23 the user accepts the delivered four fish and requests a local
commit followed by the next HF batch. All 1,243 delivered inputs match before
acceptance notes. The 1,594 tests and recorded native/public checks below are
historical evidence for this exact runtime, not new runs. Prior pending labels
below are superseded for batch 1 only; no push/main release is authorized.

The user explicitly adds offshore oil rigs, an explorable ocean-liner wreck
(referencing Titanic), waterspouts and a Flying Dutchman-inspired ghost ship
to the later scenery queue, after remaining creatures. These use distinct
Bermuda factories. Research their recognizable references when producing them;
retain playable openings, collision/exploration contracts and attack behavior.
Tiger Shark, Cameroceras and Livyatan form the next ordinary-creature batch;
Crimson Sailfin remains a separate rare-creature candidate.

## Scope and acceptance

The user authorizes Bermuda redraw after the included HF quota resets. The
current AI agent works independently on `art/bermuda-hf-redraw`, based on
main `0dcb05f` / v0.11.16. No commit or main publication is authorized; the existing restricted preview is
used for review. New batches
require the user's visual acceptance; existing accepted shared assets and
gameplay remain unchanged.

The runtime inventory contains 24 ordinary underwater kinds. Seventeen already
use accepted HF factories from Hawaii: Sardine, Herring, Turtle, Sunfish, Tuna,
Ray, Octopus, Great White Shark, Sperm Whale, Dunkleosteus, Pliosaur, Plesiosaur,
Mosasaur, Megalodon, Ichthyotitan, Moon Jelly and Spiny Lobster. The four lord
placements use the accepted Hydra, Kraken, Gran Maja and Leviathan. The four
players and shared Seagull/Pelican assets are also retained.

Seven Bermuda-specific ordinary kinds still used procedural models at baseline:
Queen Angelfish, Gray Triggerfish, Atlantic Needlefish, Great Barracuda, Tiger
Shark, Cameroceras and Livyatan. This first batch is limited to the first four.
The remaining three, Crimson Sailfin rare and regional scenery/fleet are later
batch candidates, not completed work. In particular, the regional freighters,
oil rig, Flying Dutchman and explorable ocean-liner wreck have distinct factories;
an accepted Hawaii/Atlantis ship does not mean those factories were redrawn.

## Reference and production

- [Florida Museum: Queen Angelfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/queen-angelfish/) informs the compressed oval body, forehead crown, yellow tail and extended dorsal/anal fins.
- [Florida Museum: Gray Triggerfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/gray-triggerfish/) informs the small mouth, high eyes, separate trigger spine, olive-gray coloration and median-fin propulsion.
- [New Jersey DEP: Atlantic Needlefish](https://www.nj.gov/dep/fgw/pdf/delriver/artdel_sp_atlneedlefish.pdf) informs the slender green/silver body, elongated paired jaws, posterior dorsal/anal fins and small pectorals.
- [Florida Museum: Great Barracuda](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/great-barracuda/) informs the pointed jaw, separate dorsal fins, silver flanks and dark markings.

These sources guide recognizable anatomy. Game speeds, populations, length,
food/combat eligibility and spawn anchors are preserved, including the existing
non-predator classification of Needlefish. Animation timing is a game adaptation,
not a measured species kinematic study.

Original concept images were generated with the built-in image tool from these
textual anatomy references. They are inputs to actual `microsoft/TRELLIS.2`
generation, not game screenshots or replacements for generated geometry.
The model card for `microsoft/TRELLIS.2-4B` reports MIT; the dated preflight stores
Space SHA `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d` and model SHA
`af44b45f2e35a493886929c6d786e563ec68364d`. Only included Pro quota is used.
At 17:54 BJT the balance was 2,400 seconds with zero overage. This is a dated
receipt, not a promise about a future balance.

Raw inputs, successful/failed attempts, complete GLBs, source hashes, conversion
receipts and private service receipts remain under ignored
`.local/bermuda_batch1_20261023/`. Private session/export URLs are not published.
`scripts/prepare_bermuda_hf_asset.mjs` applies measured orientation, uniform
unit-length normalization, attribute-aware simplification and the existing
offline atlas-rebake workflow. Original generation and source materials remain
available for comparison.

## Runtime integration and cost

| Kind                | Baseline mesh draws / triangles | Candidate mesh draws / triangles | Independent bones | Existing length / population |
| ------------------- | ------------------------------- | -------------------------------- | ----------------- | ---------------------------- |
| Queen Angelfish     | 13 / 15,792                     | 1 / 3,920                        | 9                 | 0.45 m / 12                  |
| Gray Triggerfish    | 13 / 15,248                     | 1 / 3,576                        | 9                 | 0.55 m / 32                  |
| Atlantic Needlefish | 11 / 17,104                     | 1 / 2,598                        | 7                 | 0.9 m / 48                   |
| Great Barracuda     | 15 / 19,032                     | 1 / 3,989                        | 7                 | 1.8 m / 8                    |

These counts describe the visible model, not an entire rendered frame. Each
species has one shared decoded geometry/material and one 1024-square sRGB color
atlas. Instances own only their skeleton and animation state. The new textures
add about 21.3 MiB of theoretical RGBA8+mipmap storage per context if all four
are uploaded; Guide and game have separate contexts. This is a real resource
tradeoff, not a claim of a free visual upgrade or measured phone FPS improvement.

The compressed deep bodies use soft dorsal/anal fin strokes; Needlefish and
Barracuda use a posterior body wave and a supported tail fan. Pectoral pivots
come from actual surface coordinates. The Queen's median-fin root follows the
body contour instead of cutting its long fin rays at one horizontal height.
Lateral pectoral and median weights occupy separate regions. The established
phase/effort clock provides smooth cruise/fast transitions and pause freezes.
No new timer, per-frame geometry rebuild or global shared-material edit is added.

The first full regression correctly rejected missing interior preparation for
the new Barracuda. The existing offline voxel/inset pipeline now adds exactly
one geometry-keyed record to `creature_interior_topology.json`; all prior records
are retained verbatim as JSON values. The source skin and gameplay collision are
unchanged. The 4,000-face proxy passes directed-edge orientation closure; the
raw helper reports non-manifold contacts, so it is not claimed as an exact
watertight anatomical reconstruction. At a deliberately enlarged 36 m render
fixture scale the interior pass activates inside the body, stays inactive 100 m
away, and leaves the camera matrix unchanged. Actual ecological length remains
1.8 m. See `docs/creature_interior_revision.md` for the established workflow.

For a future regeneration, export with
`node scripts/prepare_creature_interior.mjs --export PATH`, limit that ignored
export's manifest to `barracuda.json`, run
`scripts/prepare_creature_interior_hulls.py`, and merge the resulting single
record into the existing registry without replacing other records. Run both
`bermuda_hf.test.js` and `creature_interior.test.js` after changing the mesh.

## Verification evidence

Evidence is under `.local/bermuda_batch1_20261023/`.

- Four original GLBs, reference receipts, raw clay/textured views, measured
  orientation, simplification/rebake logs and production source hashes are kept.
  Needlefish faces the opposite raw axis to the other three and uses its own
  measured yaw. A premature raw-review job read an incomplete download; its
  failed receipt is retained, followed by successful review of the complete GLB.
- Fifteen targeted tests pass: unit length, weights/normals, UV-chart integrity,
  actual surface movement, independent instances, pause, culling bounds,
  disposal, unchanged population/length, anchored snouts and interior coverage.
  The diagnostic triangle-normal angle report is not a no-fold certificate;
  final textured/clay views and encoded motion were also inspected.
- Thirty-one unaffected shared consumers, including the four players and four
  Bermuda lords, exactly match the baseline geometry and 180 sampled poses.
- Native Chrome records 12 Guide visits and nine map transitions across three
  Bermuda/Hawaii/Atlantis cycles. Each Bermuda setup has the same 100 candidate
  instances; the other two maps have none. Shared geometry/texture identities
  stay stable and all 300 audited retired world skeletons are disposed.
- All four deliberately failed color loads keep a species-colored fallback;
  the actual Guide retry control restores all four color maps. No page errors.
- Four six-second world clips use normal NPC displacement and orientation,
  with an explicitly staged invulnerable player and an observer camera. They
  cover real movement/turning and pause stability, not four untouched encounters.
  Nine-second Guide clips cover cruise, fast effort and return to cruise.
- Four matched short scene renders reduce calls from 40→28, 93→51, 202→65 and
  69→55 at the selected cameras. These are scene-dependent draw counts, not a
  whole-session CPU, FPS or heat benchmark. Memory in that comparison includes
  both old and new models deliberately resident together.

- Final full suite: **1,594 / 1,594**; formatting and production build pass.
  The new geometry and interior preparation are covered by the final run.
- Production entry `index-BBgVxGGn.js`: all **352** built artifacts
  (**87,499,923 bytes**, including precompressed siblings) match the same-origin
  restricted server and public HTTPS downloads byte-for-byte. Eleven source,
  private and listing paths are denied at each origin. The initial system Python
  lacked `requests`; the verifier used an isolated cached uv environment instead.
  A serial transfer was resumed with six bounded read-only workers; cached
  downloads are explicitly marked as originating in this same audit.
- Eight native production cases cover each candidate in English 1440 px and
  Chinese 390 px touch emulation: Guide, start, boost/ability, pause and Home.
  All four color resources load, the production debug hook is absent, same-URL
  reload returns the new entry, and no browser/resource errors occur.
- Encoded 36-second Guide and 24-second world compilations decode completely:
  1,081 / 719 frames respectively, with no exactly repeated frames. Sampled
  final encoded frames were visually inspected; file hashes are recorded.
- Source preservation: 1,224 of the original 1,230 input files remain identical;
  six existing files change only for factory dispatch, interior record/test and
  review documentation. Thirteen files are added. The 620 old interior registry
  values are identical. No existing creature asset is overwritten.

The temporary review address is
https://saver-recorded-digit-could.trycloudflare.com/ . Refresh that same address
and select Bermuda Triangle in the Guide. Original dev/preview/awake/tunnel
process identities are retained (35213 / 23118 / 23120 / 35419); tunnel readiness
is 200. The private manager at `.local/mini_preview_20261007/manage.py` provides
`status`, `rebuild`, and identity-checked `stop NAME`; only `index.html` and
`assets` are exposed. Rebuild archives the old runtime and retains old hashed
assets for already-open clients. This is host-side public access verification,
not a user-device network test. The candidate awaits the user's visual review;
there is no new commit/push and formal Pages remains v0.11.16.
Physical-phone testing is not available here; desktop 390 px touch emulation
must not close the separate PP-Q055 physical-phone issue.

## Included quota

Four first-attempt generations completed. The last export receipt reports
2,260.630868 of 2,400 included seconds remaining, zero overage, with reset at
2026-10-24 17:55:02.619 BJT. The batch used 139.369132 included seconds measured
against the dated full-balance preflight. Check the live API before another
batch; this receipt is not a permanent balance.

## Predator batch 2 candidate — 2026-10-23

Tiger Shark, Cameroceras and Livyatan now have separately reviewed actual HF
assets and rigs. They remain uncommitted pending user acceptance; batch 1 is
accepted in `95713f5`. See the [batch review](bermuda_predators_huggingface_redraw.md).
Crimson Sailfin and the region-specific fleet/scenery remain subsequent work.
