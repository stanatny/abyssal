# Mariana Hugging Face redraw — batch 1, 2026-10-24

The user authorizes checking the current included HF allowance and continuing
Mariana if sufficient. The current agent works independently on
`art/mariana-hf-redraw`, based on main `1ae99d5` / v0.11.17. This is a new visual
candidate awaiting user review, without commit or push. Existing shared assets,
region layout, sizes, populations, movement, food and combat rules are preserved.

## Inventory and scope

The actual final regional factory inventory, including population adjustments,
contains 22 ordinary underwater kinds. Fifteen already use accepted HF surfaces.
Seven still use procedural surfaces: Moorish Idol, Lanternfish, Barreleye,
Dragonfish, Mariana Snailfish, Goblin Shark and Shonisaurus. The regional rare
Glass Prawn also remains a separate later candidate. Four guardian models reuse
the already accepted Hydra, Kraken, Gran Maja and Leviathan assets.

This batch replaces **Moorish Idol, Lanternfish and Goblin Shark** only. Do not
infer that Shonisaurus was redrawn because other marine reptiles share its
factory. Final stock is 32, 54 and 5 respectively, not the lower pre-adjustment
numbers in `mariana_ecology.js`. The remaining four ordinary kinds, rare creature
and regional scenery are future batches. Shared creatures, people, birds and
player characters must not be regenerated simply because they occur here.

## Reference and portrayal

- [Waikiki Aquarium: Moorish Idol](https://www.waikikiaquarium.org/experience/animal-guide/fishes/moorish-idol/moorish-idol/)
  supports the compressed oval body, orange jaw saddle, black tail, long white
  dorsal filament and predominantly pectoral propulsion. The game rig therefore
  uses paired pectoral strokes, a restrained tail and a separate filament chain.
- [WHOI: Lanternfishes](https://www.whoi.edu/ocean-learning-hub/ocean-facts/lanternfishes/)
  supports belly/side photophores and the family-level identification. This is a
  representative myctophid, not a newly asserted exact species. Its game motion
  uses lateral posterior undulation with small fin trim. Source-color emission
  is restricted, with a small fitted ventral dot row added for readability;
  the silver body does not become a solid luminous stripe. No extra lights/draws.
- [Florida Museum: Goblin Shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/goblin-shark/)
  supports the flattened rostrum, small eyes, short rounded fins, long asymmetric
  tail and normally retracted jaw. The new model retains these features and uses
  a slower posterior wave, not a crescent-tail great-white silhouette.
- [UH: natural-habitat observations](https://manoa.hawaii.edu/news/article.php?aId=14643)
  documents the recent in-situ observations. Its linked Nautilus interview was
  located, but the video download was unavailable; no claim is made to have
  measured this species' cadence from that clip. Timing, the family-composite
  lanternfish and the retained game depths/speeds remain artistic/game choices.

Reference pages were researched, not copied into game textures. Original image
concepts were generated as inputs, then actual HF TRELLIS.2 GLBs were downloaded.
The original concepts, input images, private receipts and raw meshes stay local.

## Generation and construction

Live included quota at 11:03 BJT was **406.193907 / 2400 seconds**, with zero
extra usage and a returned reset around **17:55 BJT, 2026-10-24**. Current Space
source declared 120-second generation and 120-second export reservations; the
client kept conservative 260/130-second stage gates. All three actual GLBs were
retrieved. One interrupted Moorish Idol download was recovered from the same
export, without repeating its GPU job. Post-batch quota was **280.966945 seconds**,
extra usage still zero. These are dated readings, not future balance guarantees.

Provider: `microsoft/TRELLIS.2`, revision
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; model `TRELLIS.2-4B`, revision
`af44b45f2e35a493886929c6d786e563ec68364d`. Both current cards declare MIT;
this does not imply exclusive rights to generated output. Seeds 744251–744253.
No paid excess, account switching or provider fallback was used.

Raw material/clay views confirmed both sides, fins and front axis. The offline
pipeline rotates by pi around Y and uniformly normalizes length, reduces geometry
with normal/UV constraints, unwraps a new atlas and projects original HF color.
The original assets and failed/intermediate artifacts are retained. Packed meshes
use immutable shared surfaces and independently disposable skeletons. Pectoral
roots and the Moorish Idol's dorsal filament are fitted to the actual vertices.
Thin-fin transition bounds were revised after measured stretch was found; tests
are not treated as proof of visual acceptance.

Goblin Shark receives its own closed 4,000-face interior proxy for the existing
camera treatment. The earlier unrelated proxy entries remain exact. The proxy
uses the largest eroded/closed volume and transfers original skin weights; it
changes neither visible surface nor collision rules. Its first open prototype
was rejected before integration.

| Kind         | Old meshes / triangles | New meshes / triangles | Color download |
| ------------ | ---------------------: | ---------------------: | -------------: |
| Moorish Idol |            16 / 15,024 |              1 / 4,322 |      261,606 B |
| Lanternfish  |            14 / 34,912 |              1 / 3,188 |      254,180 B |
| Goblin Shark |            16 / 17,284 |              1 / 5,716 |      164,558 B |

Each color texture decodes to 1024 squared; the three RGBA textures together are
about 12 MiB before mipmaps per WebGL context. Guide and game uploads are separate.
The new geometry reduces draws and triangles but adds three color downloads;
this is not a physical-phone FPS, memory or thermal result.

## Verification and evidence

Local evidence root: `.local/mariana_batch1_20261024/`.

- Nine model tests cover scale, weights, actual appendage movement, UV-seam
  continuity, independent skeletons, repeated disposal and repeated-phase pause.
  Interior tests also cover the new predator's closed oriented proxy.
- Nineteen unchanged shared/remaining creatures match the baseline geometry,
  transforms and poses exactly across 60 inputs each.
- Native Chrome: nine Guide entries and nine region switches over three cycles;
  all 273 candidate skeletons were released. Geometry/color identities remain
  stable and ordinary entry loads the colors without fixture preparation calls.
- Failed color requests retain full geometry with species-colored fallback;
  the normal Guide retry recovers all three colors.
- Real ecology travel/turning and pause were recorded for all three. The world
  clips use a staged observer camera and invulnerable player, with no per-frame
  entity pinning. Separate Guide clips show cruise, faster motion and release.
- Populated 459-entity scene near-view snapshots reduced calls 74→44, 67→54,
  70→55 respectively. These particular views and first uploads are not a steady
  frame-time benchmark. Existing physical-phone follow-up PP-Q055 remains open.
- The final full suite passes 1,651/1,651, with formatting and build passing.
  The first full run exposed a legacy minimum-mesh-count assertion; it was
  updated to verify the paired pectoral supports on a combined skin instead.
  The earlier failed result remains in the local logs. Tests and desktop 390px
  emulation do not establish user acceptance or physical-phone behavior.

No source/debug/credential paths are published. The existing preview processes,
logs, old runtime archives and all historical worktrees are preserved.

## Final delivery verification — 2026-10-24

The same restricted preview now serves `index-DXE89wTS.js`. All **436 files /
110,996,239 bytes** match dist, local restricted origin and public origin by
SHA-256. Twenty-six source/private paths are denied at each origin. Native
production Chrome passes six cases (three kinds × English 1440px and Chinese
390px desktop touch emulation), covering Guide color completion, start, ability,
pause/Home and same-address reload. There are no page/console errors or failed
resources, and the production debug hook is absent.

All 624 pre-existing interior-proxy records remain numerically exact; one Goblin
Shark record is added. Of 1,370 baseline inputs, seven existing files change for
this batch and the other 1,363 preserve their hashes. Nineteen representative
shared creatures/characters retain exact geometry and animation. Process
identities remain DEV35213, preview23118, awake23120 and tunnel35419; ready200.

At **11:36 BJT**, the final live quota read still shows **280.966945 seconds**,
zero overquota, with reset **2026-10-24 17:55:01.946 BJT**. No further generation
ran after that read. This batch remains a candidate for the user's appearance
and motion review; no commit/push or personal-Skill edit is performed.

Evidence: `final_fingerprints.json`, `source_preservation.json`, `asset_cost.json`,
`native/report.json`, `material_recovery.json`, `unchanged_models.json`,
`public/report.json`, `artifacts.json`, `quota_final.json` and final test logs.
Three matched side comparisons and both encoded motion/world videos are retained
under `review/` and `delivery/`. World videos use an observer camera, not a claim
of an unmodified player recording. Final encoded MP4s decode without errors.

## Batch 1 accepted; batch 2 authorized — 2026-10-24

The user replies “可以做下一批吧”, accepting the delivered first three appearances
and authorizing the next batch. No commit or push is requested. Earlier pending
labels are historical for batch 1 only. At 12:01 BJT a fresh included-quota read
shows 280.966945 seconds, zero overquota and reset at 17:55 BJT. Batch 2 targets
Barreleye, Dragonfish and Mariana Snailfish; remaining Shonisaurus/Glass Prawn
and scenery stay later. Existing shared content and gameplay are preserved.

The live Space still uses 120-second GPU-stage reservations. This round checks
at least 130 included seconds before each generation and export separately,
with no paid excess. A remaining balance can cover an actual short job but
fail a later reservation: stop/defer that stage rather than claiming full quota
use or changing accounts. Current receipts supersede dated allowance estimates.

## Batch 2 candidate — 2026-10-24

The user accepts batch 1 and asks for the next batch. The current agent independently
adds Barreleye, Dragonfish and Mariana Snailfish. Batch 1 remains accepted and
uncommitted; this separate appearance is pending visual review. No commit, push,
model delegation or personal Skill change is authorized by this turn.

### References and adaptation

- [MBARI Barreleye](https://www.mbari.org/animal/barreleye-fish/),
  [MBARI tubular-eye research](https://www.mbari.org/news/researchers-solve-mystery-of-deep-sea-fish-with-tubular-eyes-and-transparent-head/)
  and [Monterey species entry](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/barreleye):
  a transparent head shield encloses two upward-looking tubular eyes; the frontal
  spots are olfactory organs. Large pectoral fins support hovering. The animation
  is a restrained game adaptation, not a measured biological cadence.
- [MBARI Dragonfish](https://www.mbari.org/animal/dragonfish/): the existing game
  entry represents Stomiidae as a group, with a dark elongated body, needle-like
  teeth, chin barbels and ventral photophores. It is not a new exact-species claim.
- [Gerringer et al. 2017, original description of Pseudoliparis swirei](https://www.biotaxa.org/Zootaxa/article/download/zootaxa.4358.1.7/30549),
  DOI 10.11646/zootaxa.4358.1.7: soft pale body, small eyes, broad pectoral fins and
  continuous median fins inform the Snailfish candidate. The generated color
  and smooth tail wave remain artistic adaptations.

New original reference illustrations were generated locally for these three
creatures, then actually uploaded to Microsoft TRELLIS.2. External reference
images were not uploaded. Each reference, raw GLB, stage receipt, rejected axis
conversion and raw multi-view inspection is retained in
`.local/mariana_batch2_20261024/`; private session/download data stays ignored.

Space `microsoft/TRELLIS.2` was checked at
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; model `microsoft/TRELLIS.2-4B`
at `af44b45f2e35a493886929c6d786e563ec68364d`, both MIT. Seeds are
744261 / 744262 / 744263. All three generated and exported successfully;
complete GLB byte lengths are 3,496,856 / 3,651,476 / 3,365,624.

### Appearance and implementation

- `creature_mariana_deep_hf.js` and `mariana_deep_fish_asset.js` add a separate
  shared surface cache and independent 7 / 10 / 7-bone skeletons. Factory
  dispatch changes only these three kinds. The first batch module is untouched.
- Raw anatomy is inspected before fitting. Barreleye and Dragonfish use a pi
  yaw; Snailfish uses minus pi/2. The first wrong-axis Snailfish conversion was
  rejected before integration, without another GPU generation.
- Original HF color is projected into a new atlas with padded islands.
  Species-specific roots blend continuously into each pectoral fin, posterior
  wave and whole caudal fan; Dragonfish also has a lightly moving barbel chain.
  Normal entry requests the color map, preserves shaped fallback colors on
  failure, and uses the existing retry path.
- TRELLIS baked the Barreleye shield/eyes into an opaque surface. That is not
  accepted as true transparency: `mariana_barreleye_head.js` fits the existing
  head surface to a smooth shield, uses localized translucent shading and adds
  two actual upward tube/lens pairs inside it. The torso and mouth retain the
  generated surface. An earlier hard-cut shield and flat interior were rejected;
  the final version blends the existing head surface instead. This is a fitted
  local anatomy correction, not a claim that HF generated the transparent parts.
  No transmission pass or new point light is introduced.
- An offline Snailfish refinement experiment raised 4,194 triangles to 7,820
  without justifying its cost and was discarded; the final candidate retains
  4,194. Edge/normal audits are diagnostic measurements, not proof of anatomical
  quality. Actual posed views and encoded motion must also be reviewed.
- Existing population, size, nutrition, depth, speed, combat, abilities, bilingual
  copy, terrain and already accepted models remain unchanged.

### Measured local asset cost

| Kind       | Before draws / triangles | Candidate draws / triangles | Bones | New color bytes |
| ---------- | -----------------------: | --------------------------: | ----: | --------------: |
| Barreleye  |              14 / 14,816 |                   3 / 6,178 |     7 |         288,162 |
| Dragonfish |              18 / 37,268 |                   1 / 4,988 |    10 |         169,324 |
| Snailfish  |              13 / 13,792 |                   1 / 4,194 |     7 |         102,764 |

These are isolated model counts, not frame-time or phone/temperature results.
The three kinds populate 8 / 8 / 16 individuals, retaining the original size
0.15 / 0.38 / 0.28 m. Shared geometry/materials do not remove each instance's
skeleton cost; each WebGL context uploads its own textures. Desktop Chrome
narrow-view tests are not a physical-phone test. PP-Q055 remains open.

### Included HF quota

The live initial balance at 12:01 BJT was 280.966945 / 2400 seconds. The Space
currently declares a 120-second reservation separately for generation and export.
Each stage was freshly gated on at least 130 included seconds; no extra spending
or provider change was used. This avoids treating the sum of two reservations as
one simultaneous charge, while allowing export to defer if the remaining quota
is insufficient. The completed receipts report 196.923139 seconds remaining at
12:15 BJT, over-quota usage zero, reset about 17:55 BJT on 2026-10-24. These are
dated observations, not a future balance or a guarantee of another successful job.

### Batch 2 verification and delivery

- `tests/mariana_deep_hf.test.js`: 10 targeted checks pass, covering shared
  surfaces / separate disposable skeletons, normalized size and weights,
  actual skinned fin/barbel/tail tips, UV seams and charts, stable head anchors,
  pause behavior, and real internal eye geometry. Full suite: **1,661 / 1,661**.
  Formatting and build pass.
- `source_preservation.json`: 1,381 existing input hashes checked; only the
  four scope/status documents and the factory dispatch differ from the accepted
  batch-1 baseline. All other old inputs remain exact. `unchanged_models.json`
  compares 19 representative unaffected kinds (including all three batch-1 fish)
  for 60 poses each with exact surface/transform/bone agreement.
- Native Chrome: nine Guide openings and three Mariana/Hawaii/Atlantis switch
  cycles retain shared surface/texture identities; all **96** audited candidate
  world skeletons release their bone textures when their scenes leave. Normal
  entry loads colors without relying on an inspection-only prepare call.
- Three color-download fault cases keep shaped species-colored fallback, then
  recover through the actual Guide retry. No page errors are reported.
- Three six-second real NPC recordings preserve the normal ecology update,
  include changing headings and actual displacement, and freeze poses on pause.
  The observer camera and invulnerable 30-m player are staged inspection aids;
  NPCs are not pinned, and this is not natural progression or a physical phone.
  Guide clips additionally show cruise / faster input / cruise recovery.
  The encoded H.264 frames and labels were inspected; original WebM is retained.
- Native populated-scene observations show draw counts 69→57 / 74→57 / 43→31
  in matched paused cameras for the three candidates; these are rendering counts,
  not sustained CPU/GPU/thermal measurements. The final build grows from
  110,996,239 to 112,346,620 bytes across all served files, so added downloaded
  assets are not described as a loading-speed improvement.
- Production preview: all **445 files / 112,346,620 bytes** match the build,
  restricted local service and public URL byte for byte. Twenty-nine source,
  debug and private paths are refused on both origins. The tunnel is ready;
  DEV35213 / restricted23118 / awake23120 / tunnel35419 identities are retained.
- Six native production flows (three species, English 1440 and Chinese 390px)
  pass Guide / start / ability / pause / Home and same-address reload, with no
  browser/resource error and no production debug hook. The 390px case is desktop
  touch emulation. Entry is `index-Drpc5EDY.js` at
  https://saver-recorded-digit-could.trycloudflare.com/ . Formal main/Pages stays
  `1ae99d5` / v0.11.17; this candidate is not committed or pushed.
- A final live quota check at **12:32 BJT** reports **196.923139 / 2400 seconds**,
  zero over-quota usage, next reset about **17:55 BJT on 2026-10-24**. Evidence
  includes `quota_final.json`, provider receipts, `asset_cost.json`,
  `native/report.json`, `material_recovery.json`, `public/report.json`,
  `artifacts.json`, and delivered media / receipts under the batch evidence folder.

Next inventory: Shonisaurus, Glass Prawn and regional scenery remain for separate
batches. Existing accepted shared creatures and four guardians are not regenerated.
Batch 2 remains pending the user's appearance/motion acceptance (PP-Q075);
PP-Q074 is closed by the user's current acceptance of batch 1.

## Batch 2 accepted; batch 3 started — 2026-10-24

The user says “可以，下一批”, accepting the delivered Barreleye, Dragonfish and Snailfish appearance/motion. The six accepted Mariana candidates remain uncommitted. This authorizes the next included-quota HF batch (Shonisaurus and Blue-lantern Prawn), not commit/push. Evidence for the new batch is retained under `.local/mariana_batch3_20261024/`; baseline 1,392 input hashes match before edits.

## Batch 3 candidate — Shonisaurus and Glass Prawn, 2026-10-24

The current agent independently replaces the remaining regional ancient reptile
and rare prawn with two actual HF TRELLIS.2 meshes. The six accepted Mariana
creatures and all shared assets remain intact. This candidate awaits the user's
appearance/motion review; no commit or push is performed.

### Reference, generation and repairs

The [Smithsonian ichthyosaur account](https://ocean.si.edu/through-time/ancient-seas/mystery-ichthyosaur-graveyard-revealed)
and its [Shonisaurus reconstruction record](https://3d.si.edu/enter-sea-dragon)
provided the long skull and four extended flippers. The latter's indexed primary
extract was available, but its full page fetch failed; no claim is made to have
inspected its entire page. Color, soft tissues, game cadence and trench habitat
are artistic/game adaptations rather than known paleobiological facts.
[California Sea Grant's shrimp description](https://caseagrant.ucsd.edu/seafood-profiles/spot-prawn)
provided a reference for walking legs, swimmerets and a segmented abdomen.
The Blue-lantern Glass Prawn is a fantasy rare creature, not that real species.

Original generated concepts were used as TRELLIS inputs, with no third-party
reference image uploaded. The actual raw GLBs, concepts, receipts and both
material/clay views are retained in `.local/mariana_batch3_20261024/`.
Space and model revisions match the dated MIT cards recorded for batch 1;
seeds are **744271 / 744272**. A live preflight at **12:39 BJT** reported
**196.923139 / 2400 included GPU seconds**, zero excess. Each generation and
export stage checked the remaining reservation separately. Both jobs exported
and downloaded completely; the prawn's slower download did not require another
GPU job. After export, **135.579738 seconds** remained, with zero excess and a
returned reset around **17:55 BJT on October 24**. These are dated readings.

The raw Shonisaurus faces +Z and is rotated by pi into the game's -Z convention.
The prawn already faces -Z. Both use uniform unit-length normalization,
UV/normal-aware reduction, a new atlas and original-color rebaking.
Shonisaurus receives a restrained lateral tail wave and independent front/rear
flipper trim, preserving its existing ancient-anatomy metadata and 15 m size.
A separate watertight 4,000-triangle interior proxy supports the existing camera
interior treatment; the 625 previous proxy entries remain exact.

The prawn's raw antenna tips were fused, and only three pairs of swimming leaves
were readable. The offline finish removes the joined tips and copies the actual
HF leaf geometry/UVs into two additional paired positions. These local repairs
are recorded in the asset metadata and reproducible finish script; they are not
claimed as a perfect provider output. Five pairs now follow staggered swimming
strokes, with separate walking-leg, abdominal, tail-fan and antenna motion.
Its pearly ice-blue surface has restrained localized cyan emission; it does not
use physical refraction, global transparency or extra dynamic lights.

### Scope and cost

The final regional catalogue retains **10 Shonisaurus at 15 m**, rather than the
raw pre-adjustment count of eight, plus **one 1.8 m Glass Prawn** from the separate
rare catalogue. No ecological count, size, speed, reward, collision or combat
rule is changed. Immutable geometry/materials are shared, while instance bones
and their disposal are independent.

| Kind        | Old meshes / triangles | New meshes / triangles | Bones | Color download |
| ----------- | ---------------------: | ---------------------: | ----: | -------------: |
| Shonisaurus |             10 / 8,216 |              1 / 7,473 |    10 |      186,738 B |
| Glass Prawn |             14 / 9,092 |              1 / 8,157 |    33 |      280,200 B |

The two 1024-square color textures add about 8 MiB before mipmaps per WebGL
context, uploaded separately by Guide/game. A matched populated camera observed
66→60 draws and 617,766→641,683 triangles for Shonisaurus; another observed
67→54 draws and 526,162→525,227 triangles for the prawn. Whole-scene culling and
interior rendering are included in these counts. Fewer asset draws do not imply
that every frame costs less, and no physical-phone FPS/heat improvement is claimed.

### Current verification

- New anatomy tests cover actual skinned appendage vertices, UV seams/charts,
  normalized weights and length, head anchors, culling bounds, pause, independent
  skeleton ownership and disposal. The first full run exposed missing legacy
  `ancientAnatomy` metadata on Shonisaurus; the factory contract was restored.
  The final full run passes **1,667 / 1,667** tests.
- Twenty unaffected kinds, including the six accepted Mariana creatures, all
  four player kinds and all four guardian kinds, match the previous factory exactly across 60 poses
  each. Existing raw assets and unrelated source changes are retained.
- Six ordinary Guide openings and three Mariana/Hawaii/Atlantis switch cycles
  retain shared geometry/texture identities and independent skeletons. All **33**
  audited new world skeletons release their bone textures after leaving the scene.
- Matched old/new Guide views include both sides, top, underside and clay.
  Separate cruise/faster/recovery clips inspect final deformation. Real NPC
  recordings use normal ecology updates and an explicitly staged observer camera;
  their pause checks freeze the actual bones. The first recording's Shonisaurus
  view was obscured by the staged large player, so it is retained as rejected
  media and re-recorded with a small player away from the observation view.

Public verification and final delivery receipts are appended after rebuilding the
restricted preview. Technical checks do not substitute for user appearance review.
After this batch, all seven originally unredrawn ordinary kinds and the regional
rare have candidates; regional scenery, layer landmarks and the bottom refuge
remain a separate inventory. Accepted shared creatures and four guardians are
not regenerated.

### Batch 3 public delivery verification

- Both intentionally aborted color downloads retain shaped vertex-color fallback
  and recover via the actual Guide retry control, with no page error.
- The final real-world clips contain 347 / 360 rendered frames over six seconds.
  Shonisaurus spans 26.01 / 2.32 / 30.71 m on XYZ; the prawn spans
  12.11 / 2.62 / 60.98 m. Both change heading and freeze their bones on pause.
  Encoded H.264 clips were decoded without errors and sampled visually, including
  the final unobscured observer views. The delivery combines each creature's
  Guide motion and world clip; no third-party reference footage is distributed.
- Formatting and production build pass. All **451 files / 113,857,577 bytes**
  match dist, the restricted localhost service and the public origin byte for
  byte. This is **1,510,957 bytes more** than batch 2, including precompressed
  alternatives, and is not the amount every session necessarily downloads.
- Four native production cases (two species, English 1440px and Chinese 390px)
  pass Guide / start / ability / pause / Home and same-address reload. Both new
  color files load successfully, no browser/resource error is reported, and the
  production debug hook is absent. The 390px case is desktop touch emulation.
- Thirty-two source/debug/private paths are refused on both origins. The tunnel
  reports ready, and DEV35213 / restricted23118 / awake23120 / tunnel35419 keep
  their recorded identities. Entry is `index-DC4nM7qJ.js` at the existing
  https://saver-recorded-digit-could.trycloudflare.com/ . Formal main remains
  `1ae99d5` / v0.11.17. No service is replaced or stopped.
- Final live included quota at **13:01 BJT** is **135.579738 / 2400 seconds**,
  zero over-quota usage; returned reset **17:55:02 BJT, 2026-10-24**.
- The 1,392 baseline inputs differ only in four scope/status documents, factory
  dispatch, the interior-proxy table and its test, and the rare-art expectation
  test. All other existing inputs remain exact; all 625 old proxy entries also
  remain semantically exact. New receipts, costs, native/public reports, final
  fingerprints and actual Lark delivery receipts are kept under the evidence root.

PP-Q075 is closed by the user's acceptance of batch 2. Batch 3 remains an
uncommitted candidate for PP-Q076; PP-Q055 physical-device follow-up stays open.

## Batch 3 acceptance and scenery continuation — 2026-10-24

The user says “可以，继续下一批吧”, accepting Shonisaurus and Glass Prawn.
Earlier pending labels for batch 3 are historical. No commit/push is requested.
The separate shallow-coral/ledge-fan candidate is described in
[the scenery review](mariana_scenery_huggingface_redraw.md); other regional scenery
remains future work.
