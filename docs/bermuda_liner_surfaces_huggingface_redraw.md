# Bermuda liner surfaces — HF candidate, 2026-10-23

Accepted appearance checkpoint — 2026-10-23: the user replies “可以，下一批吧”
after the corrosion/real-breach delivery. This accepts that visual pass and
authorizes the next HF batch; it does not request a commit or push and does not
establish physical-phone performance. Earlier candidate wording is historical.

The original surface candidate below is historical. The user requested stronger
corrosion and real damage; the [follow-up](#rust-and-open-breaches-follow-up--2026-10-23)
changes the hull and opening colliders. Visual acceptance remains pending.

## Scope and provenance

The user asks to continue the next Bermuda batch. The current agent works alone
on `art/bermuda-hf-redraw`, after local checkpoint `0ffd683`. The preceding
components and furnishings remain intact and uncommitted. This new surface pass
is a candidate for visual review, with no new commit, push or main publication.

Three original concepts were generated for riveted steel plating, weathered teak
and aged enamel bulkheads. Actual `microsoft/TRELLIS.2` GLBs were downloaded,
inspected in material and neutral views, and baked into color/height surfaces for
the existing explorable hull. This is **HF-derived surface work on the existing
geometry**, not a claim that HF generated a new complete, navigable liner.

The period direction continues the maritime references in the
[component review](bermuda_liner_components_huggingface_redraw.md) and
[furnishing review](bermuda_liner_furnishings_huggingface_redraw.md). It is a
fictional Bermuda wreck, not an exact Titanic reconstruction.

Space revision: `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`;
`microsoft/TRELLIS.2-4B` model revision:
`af44b45f2e35a493886929c6d786e563ec68364d`, MIT. Generation uses 1024 resolution,
12 steps and 100,000-triangle / 1024-texture export. Original concepts, source
GLBs, receipts and rejected experiments remain in ignored
`.local/bermuda_batch7_20261023/`; no credentials or private URLs are published.

| Surface |   Seed | Selected raw GLB bytes | Selected raw SHA-256                                               |
| ------- | -----: | ---------------------: | ------------------------------------------------------------------ |
| hull    | 743341 |              3,333,624 | `0293ab520b1a4131cc258ece795a21c0cf07cab5a651533a894c36205d4807fe` |
| deck    | 743342 |              4,239,972 | `feb356c2146ffe853518b9108d93a2a9ba05cff0b0c6a401c6de42ebb057989d` |
| enamel  | 743343 |              4,231,812 | `c8ac1f75e93e0983480021be461c41b3a905ad0fe719ec9a267910092fe05555` |

The initial thin hull/enamel concepts produced perforated or fragmented exports;
both were rejected. Thick surface samples produced usable second attempts.
The first hull job was slow: a separate export-only recovery ran before its
original export completed, consuming additional included quota; both exports are
retained as rejected evidence. No second generation was hidden as a free retry.
At 22:19 BJT, final API recheck reports **1,005.315964 / 2,400 seconds remaining**,
zero over-quota usage and reset **2026-10-24 17:55:02 BJT**. These are dated
measurements, not a future balance promise.

## Integration

- `scripts/bake_bermuda_surface_hf.mjs` projects the selected GLB face through
  unlit source color and geometric height. It records the source path, orientation
  and crop. `scripts/pack_bermuda_surface_hf.py` packs the images. Hull/enamel
  coverage is complete; 0.00353% of the deck's tiny projection-edge pixels use
  nearest valid-source expansion. Larger holes fail the offline guard.
- Three 1024² color maps and three 256² height maps total **143,180 WebP bytes**.
  Heights drive restrained bump mapping, not displacement or collision changes.
  Original positions, normals and indices of retained geometry are not warped.
- Dominant-face UVs use world-scale tiling. The curved hull uses a single Z/Y
  projection to avoid jumps where normals change dominant axis. Mirrored repeat
  keeps tile edges continuous. Materials remain opaque and use mipmaps.
- The old per-pixel procedural pattern is replaced only on the three selected
  wreck material groups. Other maps, characters, creatures and shared loaders
  are untouched. No new animation, light, draw mesh or gameplay rule is added.
- Duplicate planar outer-wall surfaces intersected the existing continuous hull
  and produced irregular patches in before captures. They now retain collision
  only; the continuous hull provides the appearance. Collider order and values
  are identical, including every opening and thin wall.
- Each wreck owns its six texture slots through the existing bounded material
  preparation/retry system. Before successful color loading it keeps the prior
  base color. A failed height load never makes the hull transparent or white.
  Region disposal releases the textures and bitmap sources; no immortal global
  surface cache is introduced.

## Measured cost and preserved contracts

The wreck stays at **17 mesh draws**, while triangles fall from **306,346 to
304,594** and merged attribute/index storage falls from **11,954,048 to
11,831,408 bytes**. The seven earlier immutable source assets remain 1,548,403
bytes. Exact ordered **410 colliders**, 11 rooms, 204 fixture metadata records,
routes, landmarks and local lights match the previous factory snapshot.

In one identical paused populated scene with 468 entities, both wrappers render
67 calls; triangles are 946,864 before and 945,112 after. This is a comparable
frame, not an FPS or thermal claim. The six new decoded textures add storage:
approximately **17 MiB** for RGBA8 plus complete mip chains, excluding driver,
CPU image and transient overhead. Added texture sampling also has a cost.
Original physical-phone performance issue PP-Q055 remains open.

## Validation and delivery evidence

- 1,619 / 1,619 final tests pass; formatting passes. The new tests verify UV-only
  changes and continuous projection on curved hull normals. Existing 32 m body
  route tests remain intact.
- Same-angle material and neutral comparisons cover hull, deck, bulkheads,
  atrium and the complete silhouette. Final water-scene captures use existing
  lighting/fog. The 18-second delivery video retains the three useful close views;
  its raw final distant view was too obscured by existing fog and is retained in
  evidence rather than presented as a readable overview.
- Native desktop Chrome blocks all six texture URLs, verifies non-white fallback,
  restores network and confirms all maps recover. Three Bermuda/Hawaii round trips
  each release 7 source geometries, 7 source materials and 13 textures (7 previous
  asset maps plus 6 new surfaces). 32 m native Space-key breach traversals pass
  both directions, followed by pause/Home and a Chinese 390px viewport check.
- Delivery MP4 decodes with 540 distinct frames / 18 seconds and no decode errors.
  Observer camera and initial diagnostic player placement are disclosed; the
  scene continues to simulate. Narrow desktop emulation is not a physical phone.

The rebuilt preview entry is `index-BzCxJur1.js`. **400 emitted artifacts**
(including compressed variants), **100,787,240 bytes**, match dist/local/public
byte-for-byte. Sixteen forbidden source/config/directory paths are rejected.
English 1440px and Chinese 390px native Guide/start/ability/pause/Home and
same-address reload pass without browser errors or production hooks. Eleven
wreck image requests succeed per language; the two tiny height maps are inlined
in the regional JavaScript and verified against their exact source bytes.
The first audit fixture incorrectly expected standalone requests for those two
inlined assets and searched only the entry bundle. The fixture was corrected to
inspect the regional chunks; no runtime change was needed.

A forced native WebGL context loss/recovery retains all six bitmap sources,
returns to play through the normal Continue button, and reproduces identical
32×32 GPU readback hashes for every color/height map. The initial screenshot
fixture captured too early and without restoring its diagnostic camera; the
corrected fixture waits for resumed rendering and compares actual uploaded
pixels. This checks restoration, not a claim to reproduce an out-of-memory
failure on the user's physical phone.

The source-preservation audit retains 1,294 of 1,299 preceding input hashes.
The five changed existing files are the four status/index documents and the wreck
factory; new surface files are separate additions. Earlier candidate assets and
all game rules stay byte-identical. The user has not yet accepted this appearance.

## Evidence and operations

Current receipts: `.local/bermuda_batch7_20261023/` (`contract_and_cost.json`,
`native/report.json`, `populated_cost.json`, `review/`, `tests_final.log`,
`packed_textures.json`, `delivery/`, source preservation and build fingerprints).
The original service manager remains `.local/mini_preview_20261007/manage.py`:
`status` inspects owned PIDs and `rebuild` archives/replaces the restricted runtime
without restarting services. Stop only through that manager after matching saved
process identity. No historical worktree or earlier candidate is removed.

The preview remains [the existing restricted Cloudflare address](https://saver-recorded-digit-could.trycloudflare.com/).
Formal main/Pages remains v0.11.16. The ghost ship and waterspouts remain later
batches; small legacy railings/debris are not claimed HF-redrawn by this pass.

## Rust and open breaches follow-up — 2026-10-23

User feedback: the liner should look rusted, ruined and perforated, rather than
an intact ship with a cleaner finish. The current agent independently reuses the
selected HF surfaces and adds local geometry/material work. No additional HF
request or included quota is consumed; no new commit/push is authorized.

### Appearance and structure

- Patchy brown corrosion, coarse flakes and downward streaks retain the baked
  plate texture. An early uniform orange pass was rejected as painted-looking;
  the selected pass modulates existing color/luminance instead. Teak receives
  dark waterlogged/algal variation. Opaque surfaces avoid overlapping transparent
  sheets, and the noise is static rather than animated.
- The original starboard entrance stays open. A large port opening and smaller
  starboard forward perforation are actual missing triangles, with jagged edges
  and 0.38 raw-unit plate thickness (0.95 m at the existing game scale).
  Cut edges and attached rusticles expose the interior decks and machinery.
- Two upper bulkheads have broken sections with thick, chipped edges. Three
  window panels that would otherwise float over the gaps are removed. The
  remaining 17 HF window placements, four funnels, boilers and furnishings keep
  their source assets. The fictional game scale is retained, not a naval survey.
- No whole-wreck collision box is introduced. Ten original outer-wall cells are
  removed; two upper-wall solids become four surviving segments. Thus the total
  changes from **410 to 402**. Small ragged edges still use the existing coarse
  wall approximation; the central adult passages are explicitly swept and played.

### Contracts, cost and verification

Exact comparison preserves all 11 room records, 204 fixtures (ignoring generated
collider IDs), their physical dimensions, landmarks, eight local light records
and four original exploration routes. Character rules, ecology, food and other
maps are untouched. The new module is isolated from shared fleet geometry.

The wreck remains **17 mesh draws**. Its triangles decrease **304,594 → 301,405**,
and merged attribute/index bytes decrease **11,831,408 → 11,568,970**. In one
identical paused populated scene with 468 entities, both versions use 67 calls,
with **945,112 → 941,923 triangles**. No textures/lights are added; the corrosion
shader adds three small procedural noise evaluations. These are cost accounting,
not FPS, battery, heat or physical-phone improvement claims; PP-Q055 stays open.

**11 focused and 1,621 full tests pass.** Ray tests demonstrate actual hull and
upper-wall openings, with solid plating beside them. The new port route accepts
32 m full-body sweeps in both directions; the four original routes retain their
1,304 samples and 136 turn checks. Triangulation initially produced zero-area
faces at collinear boundary points after Float32 conversion; these faces are now
removed before normal calculation, and the complete nondegenerate-mesh test passes.

Native desktop Chrome confirms the original and new openings with actual
Space-key travel at 32 m, not per-frame player repositioning. All six surface
textures recover after blocked loading. Three region round trips each release
seven source geometries/materials and 13 textures. Pause/Home, English desktop,
Chinese 390px emulation and shader compilation pass without browser errors.
Desktop narrow-screen emulation is not an actual phone test.

Same-angle before/after material and clay views cover hull, decks, bulkheads,
port breach, original entrance and full silhouette. The delivered game video
uses the original scene lighting/fog and a diagnostic observer camera; only its
initial positions are staged. The final MP4 contains 718 distinct decoded frames
(about 24 seconds), with no decoding errors. No third-party reference media is
redistributed.

Evidence: `.local/bermuda_wreck_decay_20261023/`, including snapshots,
`contract_and_cost.json`, `targeted.log`, `full_tests.log`, `review/`,
`native/report.json`, `populated_cost.json`, `delivery/` and delivery receipts.
Runtime publication and source-preservation checks are recorded after rebuilding.
Earlier uncommitted batches and historical worktrees remain in place.

The final rebuilt entry is `index-yFSekgi7.js`. All **400 artifacts / 100,793,579
bytes** match dist, restricted local origin and public HTTPS byte-for-byte.
Sixteen source/config/directory paths remain rejected. English 1440px and Chinese
390px production native flows, all 11 external wreck texture requests per language,
the two inline maps and same-address reload pass; no production hooks or browser
errors are present. A forced context loss/recovery retains all six surface image
sources and reproduces their GPU pixel hashes; the new shader renders after
Continue without errors. This does not establish recovery from the user's
physical-phone incident.

All four original service identities remain: DEV 35213, preview 23118, awake
23120, tunnel 35419. The manager archived the prior runtime before replacing
only allowed build content. Of 1,310 baseline inputs, 1,302 stay byte-identical;
eight changed files are documented source/test/status scope, with two new files
(decay module and focused test). All prior asset files are byte-identical.
The final source count is 1,312. Main/Pages remains v0.11.16; the current rust /
breach follow-up awaits the user's visual acceptance.
