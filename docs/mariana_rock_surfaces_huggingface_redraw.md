# Mariana wall and suspended-rock surface pass — 2026-10-24

The user accepts the four guardian rock bays and asks for the next batch. This
candidate addresses the connecting pit walls and all eight large suspended rocks.
It does not regenerate their route-defining geometry: existing positions,
normals, indices, vertex palettes, collision solids, pressure gates and paths
must remain exact. The four accepted side bays and bright refuge stay intact.
No commit, push, personal Skill change or delegation is authorized by this batch.

## Production brief

- Maintain the irregular descending pit and its alternating maze passages.
- Pit walls receive layered gray sedimentary stone with restrained pale seams;
  suspended platforms receive fractured slate basalt with wider mineral cracks.
- Use two actual TRELLIS.2 rock specimens as the source for color and geometric
  relief. Bake the exported GLBs with unlit base color and a separate geometric
  depth pass, then store the latter at lower resolution separately. Concept images are inputs, not
  delivered 3D assets. Both maps remain opaque; terrain opacity stays unchanged.
- Use continuous world-space projection across existing section boundaries,
  mipmaps and bounded filtering. No runtime displacement, new lamps, extra draw
  calls, collision growth or noise animation is needed for this material pass.
- Budget: two 1024-square color textures and two 256-square height textures, at most 12 MiB of RGBA mipmapped GPU
  storage; measure transfer bytes and populated scene rendering separately.
- Compare against the accepted four HF rock bays, both nearby and at normal
  follow-camera distance. Review visible repetition, flicker, roughness, corners,
  underwater depth colors and the transition to the warm final refuge.
- Verify normal loading, failure fallback, online recovery, pause and map-owned
  disposal. Native desktop narrow views are not physical-phone tests.

Private evidence lives in `.local/mariana_wall_finish_20261024/`. Previous evidence
and accepted candidates are retained. This appearance is pending user review.

## Sources and authority

The selected [TRELLIS.2 model](https://huggingface.co/microsoft/TRELLIS.2-4B)
supports image-conditioned 3D exports under MIT. The official Space and model
metadata are recorded at execution time. Included allowance is checked before
both generation and mesh export; paid excess is not authorized. Current
[ZeroGPU usage rules](https://huggingface.co/docs/hub/spaces-zerogpu) distinguish
included quota from credits and queue time.

## Actual sources and rejected attempts

Both selected specimens were actually generated and exported by TRELLIS.2,
not inferred from a concept render. Original GLBs, receipts and five-view checks
remain in the private evidence directory.

| Surface                  | Selected export                              |     Bytes | SHA-256                                                            |
| ------------------------ | -------------------------------------------- | --------: | ------------------------------------------------------------------ |
| Layered pit wall         | `wall_attempt_03/wall_trellis_raw.glb`       | 3,502,548 | `4f263163497ea064d490594709a43a3b1de20a6cb04b72237f5ae854a25892a2` |
| Fractured suspended rock | `outcrop_attempt_02/outcrop_trellis_raw.glb` | 3,421,508 | `85bb05b8209d7227cf5830ed3bb6e5ffcc5024013a60ece3f586f97f13ea8a4c` |

The first wall job was cancelled by the service. The next wall and first outcrop
exports had large holes after flat-swatch inputs, and were rejected. New solid
rock-block concepts produced the selected specimens. These failures are retained;
large missing areas were not painted over and presented as valid exports.
The last actual quota receipt, after export at approximately 20:31 Beijing time,
records 2,065.35 of 2,400 included seconds, zero paid excess, and a returned reset
near 2026-10-25 17:58 Beijing time. This is a dated receipt, not a live balance.

## Surface integration and cost

`scripts/bake_mariana_rock_surface_hf.mjs` renders the actual GLB with unlit base
color and a separate geometric height pass. `scripts/pack_mariana_rock_surfaces_hf.py`
packages 1024-square color and 256-square height WebPs. Wall coverage is complete;
outcrop edge fill is only 0.0345 percent and is recorded. The incomplete earlier
exports exceeded the allowed coverage threshold and were not used.

`src/mariana_rock_surfaces.js` owns four textures per map, uses mipmaps and bounded
anisotropy, and projects color/relief in world space across existing wall chunks.
It replaces the former procedural surface-detail shader only on the wall and
suspended-rock materials. Existing vertex depth colors and material roughness
remain. Initial excessive darkness and contrast were revised after native views.
No geometry displacement, transparency, new lighting or runtime noise is added.

The four inputs total **100,252 bytes** (97.9 KiB). Uncompressed RGBA bitmap storage
is 8.5 MiB; mipmapped GPU storage is approximately 11.33 MiB per rendering context.
Three external texture files are emitted; the 2,272-byte wall height map is
inlined byte-for-byte in `mariana_ocean-B3YuVHAh.js`. This is a surface pass derived
from HF models, not regeneration of the entire terrain mesh.

## Verification and limits

- All 1,680 unit tests pass, along with the repository format/check command and
  production build. An unnecessary roughness change was caught by the existing
  frozen-geometry/material oracle and removed before the passing run.
- Before and after both contain 286 meshes and 42,271 collision shapes. Position,
  normal, color and index buffers, transforms, instancing, landmarks and barriers
  match. Geometry digest: `d3e7785cd554a22ef7148e7afdaa6c9ff48b91124dcf9062e9bfdc6795510b42`;
  collider digest: `95a595f2aee1d346bcd06d9039a2bf38d40ef6fde144ff7b9ce1c8e64febd347`.
- Three native Mariana/Europa switches each release the two relevant materials
  and four textures exactly once. Forced failure preserves opaque fallback
  surfaces; an ordinary online event restores all four textures. Pause time
  remains fixed. No browser errors occurred in these checks.
- Matched populated-scene material-only A/B/A/B views have unchanged draw counts:
  upper 59, middle 68, deep 80, lower 82. Corresponding rendered triangle counts
  are unchanged. Short render-call CPU medians range from 0.8 to 1.0 ms before and
  0.9 to 1.0 ms after. These are desktop Chrome observations, **not GPU timers,
  mobile frame rates, sustained heat measurements or a performance improvement**.
- Four same-angle before/after views and a 20-second game-scene observation video
  cover upper shelves, layered middle walls, deep rocks and the lower approach.
  The video uses a staged observation camera; ordinary player movement and pause
  were checked separately. The unchanged route tests cover adult passage.

Evidence: `geometry_audit.json`, `native/report.json`, `review/report.json`,
`performance_summary.json`, `movie/report.json`, `packed_textures.json`, the full
test/check logs and final source/artifact fingerprints in the private directory.
The native narrow-screen checks are desktop emulation, not physical-phone tests.

## Delivery state

The four prior guardian bays are accepted by the user's “可以，下一批吧”. This
new connecting-wall/eight-platform appearance remains pending visual acceptance.
The original layouts, warm refuge and all previous candidate assets are retained.
The restricted preview is rebuilt in place; the original service identities and
archive are preserved. Main/Pages remains v0.11.17; no commit or push is made.

Production verification: all 471 build artifacts (117,694,287 decoded bytes,
including both ordinary and gzip files) match dist/local/public byte-for-byte;
43 non-runtime/source paths are denied on both origins. The public entry is
`index-Bf6zhW4j.js`. Four English desktop/Chinese 390px native Guide/start/skill/
pause/Home flows and same-address reload pass with no browser errors and no
production debug hook. The external three textures return 200; the fourth height
texture is verified inlined exactly in the hashed region bundle. The first audit
fixture closed its pages before the bounded texture queue completed and wrongly
expected four external files. Its failed report is preserved; explicit ordinary
load completion and the correct three-file expectation pass on rerun.

## Acceptance and remaining-scope review — 2026-10-24

The user says “可以了，还有可以优化的的地方么”, accepting the wall/eight-rock
surface appearance. Earlier pending labels above are historical for this scope.
No new generation, game-code edit, commit or push is requested by this review.
All 1,436 delivered input hashes matched before acceptance-only notes.

A current source and native scene inspection identifies the original procedural
bottom refuge as the clearest remaining visual target: the pineapple house,
stone-face house, rock house, restaurant and broad plain plaza still lack the
surface treatment of the accepted trench scenery. A later, separate pass could
refine the sponge/starfish/snail residents. Smaller optional work includes the
180 instanced sea-fan support rocks, five spur groups and the final warm crown.
The terrace rings already share the updated cliff material; they must not be
misreported as wholly untreated. Accepted creatures and the four guardian bays
should not be regenerated just to fill another batch.

Recommended next batch: four refuge buildings plus plaza materials/ground-edge
integration, preserving the warm ending and adult approach. Residents follow
separately. These are prioritized proposals, not newly implemented assets.
Read-only evidence is under `.local/mariana_remaining_review_20261024/`.
The earlier 1,680 tests retain their original scope and were not rerun for this
review. Physical-phone performance remains unverified by this desktop inspection.
