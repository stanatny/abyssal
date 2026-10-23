# Bermuda rare creature and storm fleet redraw — 2026-10-23

Accepted Bermuda rare/fleet checkpoint — 2026-10-23: the user accepts Crimson
Sailfin, the Steel Cape freighter and storm tanker, and requests a local commit
followed by the next HF batch. All 1,270 delivered input hashes match before
these acceptance-only notes. Recorded 1,611 tests and native/public evidence
retain their original scope. Earlier pending labels for this batch are historical.
No push/main publication is requested; regional landmark work follows separately.

## Production brief

The user accepts the three predators and Cameroceras motion follow-up, locally
committed as `d454e7b`, and authorizes the next Hugging Face batch. The current
agent independently develops Crimson Sailfin, the 120 m / 23 m Steel Cape
freighter and the 145 m / 27 m storm tanker. This new batch remains uncommitted
and awaits visual acceptance. Formal main/Pages stays v0.11.16.

The rare creature keeps its crimson sail, silver flanks and long bill; a slender
continuous surface and restrained tail/fin motion replace the older primitive
assembly. It remains an original fantasy animal inspired by sailfish, not a real
red species. The existing reward, length, discovery, movement and capture rules
remain authoritative. Guide and world consume the same asset.

The two moving ships retain their original routes, rocking clock, ownership,
length/beam and ordered hull colliders. The freighter has stacked corrugated
containers; the tanker has an open pipe/manifold deck. Desaturated blue steel,
oxidized lower hulls and ivory aft bridges suit Bermuda's storm palette. Their
visual hulls are fitted to the original waterline and solid envelope offline;
new artwork does not create deck exploration or change impacts. Existing Hawaii
and Atlantis HF ships are visual quality precedents, not factories to replace.

Oil rig, explorable liner wreck, waterspouts and the Flying Dutchman-inspired
ghost ship remain separate future batches; this record does not mark them done.

## Reference and provenance

- [Florida Museum sailfish profile](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/sailfish/): long bill, forked tail and high dorsal sail guide silhouette. Crimson/gold palette and pose amplitudes are explicit fantasy/game adaptations.
- [Wärtsilä container ships](https://www.wartsila.com/encyclopedia/term/container-ships): deck cargo stacks and aft working-ship arrangement inform an original unbranded freighter.
- [Wärtsilä tankers](https://www.wartsila.com/encyclopedia/term/tankers): liquid cargo and piping distinguish the tanker from the freighter. This is not a replica of a named real vessel.

Original concept bitmaps use the built-in image generation tool; actual mesh
production uses the user-selected Microsoft TRELLIS.2 / TRELLIS.2-4B. The live
preflight on 2026-10-23 19:37 BJT confirms the Space running and the model's MIT
license. Included Pro quota is 2,148.711848 / 2,400 seconds with zero overage,
reset 2026-10-24 17:55 BJT; this is a dated receipt, not a future balance.
Raw concepts, complete GLBs, parameters, hashes, failed attempts and private
service receipts are retained under ignored `.local/bermuda_batch3_20261023/`.
Only the intended original concept images are uploaded; no source or credentials.

## Conversion and runtime

Three first-attempt GLBs completed on HF. Their original source hashes and
private receipts remain under the evidence directory. The final dated export
receipt at 19:42 BJT leaves 2,026.815144 / 2,400 included seconds, zero overage;
reset remains 2026-10-24 17:55 BJT. This batch used 121.896704 included seconds.

The sailfish and freighter require +pi/2 measured yaw. The tanker's hull is
rotated diagonally in the raw GLB; the initially assumed yaw is rejected and
archived. A measured -2.3591352564 rad yaw aligns its keel/bow. Offline fitting
preserves the original 120/145 m lengths, 23/27 m beams and 7 m local draft.
The generated tanker is an open-deck liquid-cargo vessel, not the old row of
cylindrical deck tanks. Source normals are transformed with the fit, then
renormalized. Fresh UV charts receive original HF surface colors; ship fallback
vertex colors are projected from the same source. Original GLBs stay untouched.

| Model                | Old draws / triangles | New draws / triangles | Runtime ownership                                  |
| -------------------- | --------------------- | --------------------- | -------------------------------------------------- |
| Crimson Sailfin      | 7 / 12,248            | 1 / 6,470             | Shared surface/color; independent 12-bone skeleton |
| Steel Cape freighter | 8 / 4,848             | 1 / 14,909            | Shared leased static mesh/material                 |
| Storm tanker         | 8 / 5,168             | 1 / 16,548            | Shared leased static mesh/material                 |

Crimson Sailfin keeps a rigid bill, a continuous posterior tail wave, separate
supported dorsal-sail bones and paired pectoral trim. Cruise/fast changes use the
existing integrated phase and effort smoothing. The rig does not change swimming
speed, habitat, population, capture difficulty, discovery/rainbow markers or
rewards. Its actual ecological length remains 1.8 m.

The ships keep exact original routes, wave rocking, hull colliders, damage and
reset behavior. Only `makeFreighter` changes; the ghost ship, cannon/impact
systems and oil rig are retained. Two ship leases may coexist; only the final
release destroys the shared geometry/material/color. All three atlases are 1024
square. Three uploaded RGBA8 atlases with mipmaps cost approximately 16 MiB in
the game context, plus 5.33 MiB for the rare in the separate Guide context. This
is an explicit quality/memory tradeoff, not a phone performance claim.

## Verification

Evidence is under `.local/bermuda_batch3_20261023/`.

- Raw color/clay views and fitted side/bow/stern/top/under views are inspected.
  Matched before/after views distinguish actual mesh detail from material color.
  Corrected tanker orientation is used in the final candidate only.
- Five new targeted tests cover unit scale/beam/draft, normal/skin-weight validity,
  actual fin/tail movement, stable bill, UV seam continuity, pause, culling,
  independent instances and idempotent/final-owner resource disposal.
- Twenty-four unaffected ordinary kinds exactly match the committed factory at
  60 poses each. Two ship routes and all ordered colliders, plus the unchanged
  ghost and rig meshes, match at 120 simulation times.
- Native Chrome uses three Bermuda/Hawaii/Atlantis revisits with unchanged
  population 468. Six retired ship leases each dispose geometry/material/color
  exactly once. A single world rare skeleton is reused by the established
  entity cache; Guide owns a different skeleton and reuses its own preview.
  Initial fixture assumptions about rare cache destruction are retained as failed
  diagnostics, not represented as runtime leaks or successful tests.
- First-entry testing without opening Guide found the missing automatic rare
  color request. The builder now calls the existing preparation entrypoint.
  A fresh browser deliberately aborts its color, keeps a colored fallback, then
  recovers through the existing online retry without opening Guide. Both ship
  colors pass equivalent failure/retry coverage. This fixes the integration
  omission; earlier warm-Guide success alone was insufficient evidence.
- Three actual-world clips retain normal entity/ship movement, observer camera,
  explicitly staged invulnerable player and unchanged fog/lighting. A one-time
  player approach exercises rare escape; there is no per-frame NPC pinning.
  Pause freezes ship transforms and rare bones. Initial camera angles obscured
  the freighter behind the ghost ship, so delivery is recaptured from the other
  side rather than hiding existing scene elements.
- Matched populated scene samples show rare triangles 615,577→609,811 with
  61 calls in both views; freighter 98→91 calls and 793,727→803,788 triangles;
  tanker 85→78 calls and 842,936→854,316 triangles. They compare the respective
  target in the same 468-entity scene, not a sustained FPS/CPU/heat benchmark.
  Physical-phone PP-Q055 stays open.

## Final delivery evidence

- Final full suite **1,611 / 1,611**, formatting, production build and diff
  whitespace checks pass. Vite retains the existing large-chunk advisory;
  this batch is not presented as a loading/FPS optimization.
- Production entry `index-Cs2KnVJF.js`: **370 runtime artifacts / 93,352,008
  bytes**, including precompressed siblings, match dist, restricted loopback
  server and public HTTPS byte-for-byte. Fifteen private/source/listing paths
  are refused at each origin; production has no development hook.
- Native public English 1440 px and Chinese 390 px cases pass Guide, start,
  boost/ability, pause, Home and same-address refresh with no page errors or
  failed HTTP responses. All three new color URLs return 200. The first public
  script closed before queued ship textures completed; its failed assertion is
  preserved, and the final script waits for real ordinary-entry responses.
  Narrow desktop touch emulation is not a physical-phone test.
- Final world recording has 935 independently decoded frames, all distinct,
  no decode errors, H.264/yuv420p/faststart. Actual target displacement over each
  clip: rare 23.677 m, freighter 2.314 m, tanker 1.912 m. Matched comparison
  images, final encoded samples and real sea views are inspected. Existing
  weather/ghost elements remain visible; they were not hidden for presentation.
- Of 1,256 baseline inputs, only seven existing files change for integration,
  catalogue expectation and project notes; all other 1,249 input hashes match.
  New model/conversion/test/review files are separately recorded in final hashes.
- Services retain DEV35213 / 5188, preview23118 / 7188, awake23120 and
  tunnel35419 / metrics20248, with ready status 200. `manage.py rebuild` keeps
  the same public URL and archives older runtime snapshots. Only index/assets
  are exposed; no source/Vite/credentials are published.

Review URL: https://saver-recorded-digit-could.trycloudflare.com/ .
Only the preceding accepted batch was committed as `d454e7b`; this new rare/fleet
candidate is uncommitted/unpushed and awaits the user's visual acceptance.
Formal main/Pages remains v0.11.16. Original physical-phone PP-Q055 stays open.
