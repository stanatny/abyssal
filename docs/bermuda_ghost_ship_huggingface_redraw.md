# Bermuda ghost ship — Hugging Face redraw

Accepted appearance — 2026-10-24: the user replies “可以，下一组”, accepting
this ghost-ship candidate and authorizing waterspouts next. No commit/push was
requested. The pending-review wording below describes the original delivery;
its technical evidence retains that scope.

## Scope and status — 2026-10-23

The user accepts the preceding wreck decay pass (“可以，下一批吧”) and
requests the next Bermuda batch. The current AI agent independently replaces
the Flying Dutchman-inspired ship's hull and seven sail surfaces with actual
TRELLIS.2 assets. This candidate awaits the user's visual review. It is neither
committed nor pushed. Accepted liner work remains in the same working tree;
formal main/Pages remains v0.11.16.

The ship now has a continuous salt-worn timber hull, carved layered stern,
aged canvas folds and torn hems. Two restrained lanterns complement the existing
spectral cannon effects. Existing captain, masts, rigging and cannon mechanisms
are reused; this is not a claim that every component was generated anew.
Waterspouts and remaining Bermuda scenery are separate subsequent batches.

## References and provenance

The primary shape reference is Royal Museums Greenwich,
[A Dutch three-masted ship under sail, PAD8379](https://www.rmg.co.uk/collections/objects/rmgc-object-112530),
by Cornelisz Verbeeck. The actual collection image was inspected for the raised
stern, curved hull and three-masted rig. It is a form reference for an original
fictional ghost ship, not a precise historic reconstruction or copied film asset.
The reference image is retained only in local evidence, not distributed in-game.

Two generated component concepts were submitted to
[Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2), using
[TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B) (MIT).
The checked Space revision was `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`;
model revision `af44b45f2e35a493886929c6d786e563ec68364d`.
The concepts are production inputs, not delivery screenshots.

| Component |   Seed | Actual GLB bytes | Actual GLB SHA-256                                                 |
| --------- | -----: | ---------------: | ------------------------------------------------------------------ |
| Hull      | 743351 |        5,035,012 | `e81c21f2164ecea6885702903810c3b79397c0e300e765632c6608251e61ee84` |
| Sail      | 743352 |        3,375,160 | `fdf030a3244b385b29e33e5235f1bf07f2a6e03d5f2a99f45bbbbd08baff1b2b` |

Generation/export used 1024 resolution, 12 sampling steps, export target 100,000
triangles and 1024 texture. The initial included quota was 1005.315964 seconds;
the last post-export reading was 913.109072 seconds, over-quota usage remained
zero. These are dated job readings, not a promise of the next session's balance.
The sail's initial download was truncated (curl 18). The same completed export
was downloaded again and validated against its GLB header/length; no second
GPU job was submitted for recovery. Both receipts, the failed partial file and
recovery record remain in `.local/bermuda_batch8_20261023/`.

## Conversion and integration

- `prepare_bermuda_dutchman_hf_asset.mjs` welds UV seams, simplifies geometry,
  restores orientation-safe normals and rebakes source color into new padded UVs.
  Hull: 31,640 triangles / 43,783 atlas vertices; sail: 4,992 / 4,940.
- `fit_bermuda_dutchman_hf_asset.mjs` fits the existing ship footprint with
  inverse-transpose normals. Hull bounds are x ±12.5, y -13..31, z ±48 metres.
  Sail width is one, top y=0 and lower edge y=-1; the top-edge depth is aligned
  with the retained yards before seven instances are scaled into place.
- The sail mesh/material is shared across all seven independent transforms.
  The two asset leases have finite fallback vertex colors, explicit asynchronous
  texture preparation, online retry and last-owner disposal.
- The old protruding rectangular cannon plaques were rejected after live review.
  The retained barrels extend into the new hull; their outer muzzle anchors stay
  exact. The captain is placed at `[4.2,21.52,36]`, supported by the actual new
  quarterdeck instead of floating above it. This is a visual placement change.
- No shared lighting/fog, ship motion, collision solids, cannon range/timing,
  damage, escape rule, ecology, rewards or bilingual text is changed.

## Verification

Raw textured/clay meshes were inspected from seven views. Matching old/new ship
renders cover side, bow, stern, top, underside and waterline. Live native Chrome
inspection retains the actual Bermuda weather and lighting, with a labeled
observer camera for the recording. Native play triggers the original warning
and broadside, while ship travel and sail motion continue; pause freezes both.

The regression checks cover the two unchanged ghost collision solids, all fleet
collider transforms at six times, twelve exact muzzle anchors, shared asset
ownership, finite geometry/normals, colored fallback and the captain's rendered
deck support. The existing ghost tests retain dive cancellation, fixed-target
volleys, 40-damage non-stacking hits, terrain cover and nursery exclusion.

- Full regression: 1,624 passed; final focused checks: 16 passed. Final lantern
  alignment is a local visual correction covered by the focused and native pass.
- Both new textures were deliberately blocked, colored fallback was observed,
  then online recovery succeeded. Three Bermuda/Hawaii round trips each released
  two new geometries, two materials and two textures exactly once.
- English desktop and Chinese 390px native checks cover start, pause and Home.
  390px is desktop emulation, not a physical-phone test; PP-Q055 remains open.
- Evidence includes `native/report.json`, `ghost_review/report.json`,
  `contract.json`, `populated_cost.json`, generation and conversion receipts,
  final public resource hashes and the encoded game video in the local batch
  directory. Earlier fitting passes remain archived, not silently overwritten.

## Measured cost and delivery boundaries

The populated 468-creature scene comparison uses the same paused state, lights,
camera and renderer while swapping only the ghost visual. The measured frame
changes from 249 to 250 calls and 1,594,280 to 1,612,236 triangles. This is a
bounded draw-cost comparison, not a phone FPS or thermal claim. Both new color
maps are 1024px and share across instances; actual WebP bytes are 240,776 and
182,202. Geometry and material ownership are separately checked above.

The existing loopback development and restricted production-preview services
are reused. The rebuilt preview exposes only `index.html` and `assets`, with
all served artifacts checked against `dist` and production debug hooks absent.
No source, credentials, personal Skill changes, commit, remote branch update or
main deployment is part of this turn.

## Final preview audit — 2026-10-23/24

Entry `index-BfF0OMYA.js`: all 406 current build artifacts (including compressed
variants; 103,822,160 bytes in aggregate) match dist, the restricted local origin
and Cloudflare byte-for-byte. This aggregate is not a first-visit download size.
Sixteen source/configuration paths are denied at both origins. Public English
1440px and Chinese 390px start/pause/Home and same-address refresh pass, without
production hooks or browser errors. The 23.73-second game video has 712 unique
frames and decodes without errors. The original four services retain their PIDs.
