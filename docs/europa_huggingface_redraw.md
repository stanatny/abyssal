# Europa Hugging Face redraw — 2026-10-26

Publication scope — 2026-10-26: the user requests a final audit and main
publication if no blocking work remains. The audit clears this delivered scope
for v0.11.20. Earlier pending, rejected and no-push statements below retain their
dated revision context; superseded appearances are not restored. See the
[release record](release_v0_11_20.md) for final scope, verification and limitations.

## Scope and production contract

The user authorizes a new regional redraw after Amazon v0.11.19 is pushed to
main (`72ce40d`). Work proceeds independently on `art/europa-hf-redraw`, in
reviewable batches. New candidates are not authorized for commit or publication.
Keep all existing Chinese/English creature descriptions byte-identical. Forms
are inferred from those descriptions rather than copied from the old procedural
meshes. No film name or attribution is added to player descriptions.

Europa remains a speculative five-layer ice ocean: nursery bay, salt arches,
suspended garden, vent basin and the Weaver hollow. The compressed world reaches
900 world metres deep, with existing routes, arches, research wreck, stock,
three-lord objective, survival, music and combat rules preserved. Accepted
players and already polished shared assets are reused. Later scenery batches
must inventory the actual terrain/factory and provide adult route evidence
before replacement; this first batch changes only lord appearance.

## First batch: three lords

- **Brine Regent:** 48 m, salt-layer home `[125,-255,-360]`. Continuous mantle
  beneath thick overlapping mineral plates, six radial jaws, three paired
  layered fins, a two-lobed tail and amber pressure organs. Preserve the warned
  horizontal pulse and vertical escape.
- **Lumen Stalker:** 62 m, vent/wreck home `[-90,-465,-570]`. Eight unbranched
  long arms around a compact muscular mantle, clustered cold luminous chambers
  and separated arm photophores. Preserve three sequential locked-target lashes
  using the actual posed arm tips and terrain occlusion.
- **Abyss Weaver:** 58 m, hollow home `[0,-730,-745]`. Three mantle lobes around
  a pulsing organ, six forked arms and a ventral radial mouth. Preserve the
  existing warned tidal-web attack and recovery.

Accepted Amazon/Hawaii lord meshes establish the detail and continuous-skin
standard, not an anatomical template. New reference concepts are original
image-assisted designs derived from the unchanged descriptions. They are
intermediate image-to-3D inputs, not game screenshots or proof of correct rigs.
Use Microsoft's TRELLIS.2 Space for actual mesh generation and extraction;
retain raw files, seeds, private receipts and source hashes under
`.local/europa_lords_hf_20261026/`. Only the user's included HF quota is allowed.

## Integration and review requirements

Measure neutral anatomy, actual fin/arm roots and mouth/core bounds before
binding. The factory used by Guide and world must be the same. Preserve independent
skeletons and the current simulation clock; pause, recovery and reset cannot
leave displaced attack tips. Fitted solid cores must exclude gaps between arms.
Keep existing audio and warning/impact effects attached to actual attacks.

Inspect color and clay from both sides, front, above and below; compare normal
follow-camera views, complete cruise/attack/recovery cycles, and each real
ability. Record shared loading/retry/disposal, source preservation, draw/triangle
and texture costs, bilingual Guide and narrow desktop emulation. Native Chrome
emulation does not establish physical-phone performance. New appearances await
user review even when technical checks pass.

## First candidate integration

Three genuine TRELLIS.2 exports are reduced, UV-rebaked and fitted to the existing
normalized axial lengths. Original exports, conversions and rejected fitting
experiments remain in the ignored evidence folder. Brine retains six separate
jaw joints, three paired fins and a continuous tail. Weaver retains six forked
arms and a broad mantle/arm silhouette. Lumen's eight unbranched arms are fitted
from the generated flat crown into a three-dimensional crown with independent
continuous chains; three retain the existing locked-target lash interface.

A first nearest-arm hard warp was rejected for tearing at shared roots. The
candidate uses a continuous spatial fit and source-surface binding with welded
UV-neighbour smoothing; rounded weight packing must sum to 65535 without
unsigned overflow. Lumen photophores are a shared scalar vertex attribute and
an instance-owned shader uniform, with no new point lights or render loop.
Initial skeleton transforms are synchronized before the first scaled bounds
query. Three closed internal seals preserve the existing near-camera interior
behavior; they do not alter visible skin or gameplay collision.

New tests sample the actual deformed surface, normalized dimensions, UV seam
weights, independent instances, active-clock pause, 82 m transformed lash
reach, local disposal and existing indexed contact bounds. Existing tests now
inspect the single HF skin instead of retired procedural arm meshes or named
sensor spheres. Original attack clocks, damage/range, warning effects and audio
are unchanged. Creature lore, backgrounds and Chinese/English descriptions
remain byte-identical to the released baseline.

Texture failure keeps an opaque fallback. Explicit Guide retries forward their
priority/retry options, and all live per-instance materials subscribe to shared
loading completion. Disposal removes subscriptions and releases only local
material/skeleton resources; another instance and shared colors remain valid.

### Measured cost and limitations

| Lord          | Previous draws / triangles | New draws / triangles | Shared vertex/index bytes | Local bones |
| ------------- | -------------------------- | --------------------- | ------------------------- | ----------- |
| Brine Regent  | 27 / 24,520                | 1 / 22,000            | 1,586,822                 | 32          |
| Lumen Stalker | 38 / 48,396                | 1 / 29,890            | 2,389,952                 | 201         |
| Abyss Weaver  | 16 / 26,216                | 1 / 25,846            | 2,305,449                 | 67          |

These are isolated native-Chrome model measurements, excluding the existing
scene, effects, post-processing and optional internal seal. They are not phone
FPS or thermal measurements. Textures add three shared atlases; see
`asset_cost.json` for exact file bytes. Only included HF time was consumed:
2026-10-26 01:36 BJT readback has 1,717.322278 of 2,400 seconds remaining,
zero overquota, with the service returning 17:58:22 BJT as its reset time.
This is a dated receipt, not a future balance guarantee.

### Evidence

- `raw_review/`, `converted/`, `final/`: six-angle source and fitted color/clay
  inspection; `candidate*` contains intermediate/rejected states.
- `native/report.json`: actual region/Guide factories, en/zh-CN, three native
  attack/recovery cycles, world displacement, pause and repeated region switching.
  Movies use a staged 30 m invulnerable player and an observation camera; they
  do not represent an unassisted normal playthrough.
- `material_recovery.json`: deliberate texture failures and successful native
  retry; `cost_lifecycle.json`: shared buffers, GPU draws, active internal seals
  and idempotent encounter disposal.
- `targeted_final2.log`, `full_tests_final.log`, `check.log`: regression checks.
- `artifacts.json`, `public/report.json`, `final_fingerprints.json`: restricted
  preview byte identity, source denial, native production flows and reload.

All three appearances are new candidates awaiting user review. They are not
committed or merged into the released main branch. Ordinary Europa aliens and
regional scenery remain the next batches; accepted players and other regions
are not redrawn.

### Delivery verification — 2026-10-26

All **1,797** tests pass; formatting and the production build pass. The restricted
preview serves `index-CT0gn2FN.js`; all **608 artifacts** match dist/local/public
byte-for-byte, and eleven source/private/directory routes are denied on each
origin. Native production en/1440 and zh-CN/390 Guide/start/ability/pause/Home
flows pass, including same-address reload and absence of development hooks.
No page or failed-resource errors were recorded. The narrow case is desktop
Chrome emulation, not a physical phone.

The normal world cycles show all three original attacks/recovery and real world
displacement. Network recovery additionally verifies that an already-existing
live clone regains its shared color while a disposed clone stays detached
(`online_recovery.json`). The 36-second delivery film is encoded/decoded and its
12 sampled frames inspected. New appearances remain pending user acceptance.

The baseline audit covers **1,605** prior tracked inputs. Only entry docs, the
factory dispatch, legacy test adapters and three appended interior records
change; the existing 640 interior records and every other model/gameplay/lore
input remain identical. Four service identities and their logs are preserved.
The official main release remains `72ce40d` / v0.11.19; this new batch stays local.

## Lumen locomotion follow-up — 2026-10-26

The user rejected the constantly spread cruising silhouette and requested
octopus-like motion. This revision reuses the same HF mesh, colors and rig; no
new generation or quota consumption. The prior first-batch visual acceptance is
still pending, and this follow-up is also a review candidate, not a commit.

[Monterey Bay Aquarium's giant Pacific octopus account](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/giant-pacific-octopus)
supports mantle/siphon-driven jet propulsion. Lumen remains a fictional animal:
its chosen cruising direction, motion rhythm and attack transition are game
adaptations, not a claim that all real octopus locomotion uses the same pose.

`lumen_swim.js` folds the eight existing chains into a three-dimensional trailing
bundle. Segment lengths remain unchanged; the mesh is neither flattened nor
uniformly shrunk. Mantle-first transit rotates only the anatomy, never the
gameplay heading/root. The existing `setSwimTravel` hook supplies post-collision
world displacement: stopped or blocked travel releases the fold. Guide uses its
existing demonstration effort. A mild mantle compression cycle compensates the
arm supports, while small delayed distal motion keeps trailing tips alive.

During the existing wind-up the body turns and presents its arm crown; the same
three locked-target lashes still reach their targets. Recovery returns to the
live swimming pose rather than snapping to the bind pose. Fixed per-segment fold
rotations separate gathering from small drift, avoiding shortest-arc flips near
opposite tangents. Blending uses elapsed time corrected for the existing gait
clock, and repeated paused timestamps remain identical.

The unit bind length and all gameplay settings remain unchanged. Gathering
reorients the previously very wide arm span along travel, so the animated axial
envelope is longer; it does not increase arm lengths or the 88 m damage range.
The broad-phase rounding padding now scales with the displayed body scale
(0.000062 m for this 62 m lord), covering Float32 skin-weight boundary error.
Actual skin triangles still decide contact. No visible contact reach is added.

Evidence under `.local/lumen_swim_20261026/` separates fixed-camera motion
demonstration from actual native encounters. Actual travel, turning, three
attack/recovery cycles, pause, English/Chinese Guide and repeated region changes
are exercised in `native_final/report.json`; controlled movement is labeled
explicitly in the delivered close-up clip. The mesh/UV/texture payloads remain
byte-identical. Two other new lords match their previous actual vertices over
180 poses each. No new geometry, texture, light, draw call or render loop is added;
per-instance pose scratch is reused. No physical-phone performance claim is made.

Current verification: 30 focused motion/contact/regional tests and 1,799 full tests pass.
Continuous skin audits check finite vertices, welded UV seams, folded/extended
poses and locked-point reach; independent state and idempotent disposal remain
covered. Production build/preview evidence and delivery receipts are retained
with this revision.

## Ordinary-creature batch 2 — 2026-10-26

The user accepts proceeding after the delivered Lumen swimming correction and
requests the next batch. This does not authorize committing or publishing the
Europa candidates. This batch covers four ordinary fictional lifeforms; twelve
other ordinary kinds remain for later redraw, with the rare/scenery inventory
still separate. All existing Chinese/English descriptions are retained.

### Source, anatomy and motion

Four new concept references were generated for this project's existing written
descriptions, then each was exported through Microsoft TRELLIS.2 on Hugging Face.
Each original GLB, reference, sanitized receipt, source hash and quota observation
is retained under `.local/europa_batch2_20261026/`. All four succeed on attempt 01;
no replacement generation is needed. The model card identifies the MIT license:
[Microsoft TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B).

| Kind         | Existing length | Final triangles | Bones | Appearance and movement                                                                        |
| ------------ | --------------: | --------------: | ----: | ---------------------------------------------------------------------------------------------- |
| Glass Seed   |           0.9 m |           2,800 |     9 | Six blue-gray shell plates and an amber seam/core; subtle breathing and paired steering leaves |
| Ribbon Spore |           1.4 m |           3,970 |    13 | Continuous purple membrane and three trailing filaments; a delayed axial wave                  |
| Tripod Bloom |           2.2 m |          14,000 |     7 | Three fleshy lobes around a central filtering mouth; continuous soft lobe flexion              |
| Sail Crawler |           3.2 m |          15,764 |    18 | Layered olive armor, dorsal sail, six rowing paddles and forward sensory antennae              |

Normalization rotates each measured source into -Z forward / +Y up, then scales
uniformly. Tripod's source needs a pitch rotation; the offline atlas rebaker now
reads an explicit source matrix when present and otherwise keeps its original
Y-yaw path. No existing asset is regenerated through this change.

The initial low-detail reductions of Tripod/Sail were rejected after clay review.
The final meshes retain more raised lobe/armor detail. They weld coincident source
positions, remove duplicate/degenerate faces, retain continuous attachment skin,
rebake a fresh UV atlas from source colors, and transfer original surface normals
offline. Tiny source surface irregularities remain, particularly at extreme
close-up; additional triangles are not claimed to make the generated topology
perfect. No double-sided patch, overlay or joint sphere hides a missing attachment.
Ribbon's disconnected frontal scraps are removed while keeping its continuous
membrane and all three actual trailing filaments. The removal and normalization
are recorded by the reproducible fit script.

Each kind uses one opaque SkinnedMesh and one shared 1024-square color map. Its
instances own their skeletons, not duplicate materials or textures. Animation
uses the existing gait clock, smooth effort changes and bounded continuous
weights; pause does not advance the pose. There are no additional lights,
particles, gameplay movement rules, prey populations or attack effects.

### Verification and resource accounting

The base species populations sum to 140. Existing feeding-distribution rules
expand these to **190 actual inhabitants (65/50/35/40)** in the normal Europa
world, whose full population remains 353. Early fixture assumptions using the
base count were corrected; production population code was not changed.

- 17 focused anatomy/lord/Lumen checks and all **1,807** tests pass.
- Native Chrome exercises 12 repeated Guide visits, nine region transitions,
  eight bilingual Guide cases and normal-world movement/pause for all four kinds.
  Recorded world displacement spans exceed 2.4 m for the three smaller kinds and
  8.8 m for Sail Crawler; the movie uses a labeled following observer camera, not
  pinned entities or a replacement motion loop.
- Actual vertex samples for twelve untouched ordinary kinds, three lords and
  four player characters remain exactly equal to the pre-batch factory across
  90 poses each. All unrelated source inputs are compared against the baseline.
- Three completed population cycles dispose **570** skeletons. Guide/world share
  each kind's geometry and color texture while retaining independent bones.
- Aborted color requests retain fallback surfaces; restoring the connection
  repairs existing live instances through the shared material. Disposing one
  instance releases its skeleton while intentionally retaining the shared color.
- Four matched paused-world render probes reduce draw calls from 118/53/253/57
  to 58/44/107/48 and triangles from 204270/110988/372846/152748 to
  158958/108882/355774/150224. These are scene-specific render counts, not FPS,
  battery, thermal or physical-phone measurements. The more detailed meshes
  require four new color caches and per-instance bones.

Evidence: `native/report.json`, `motion/report.json`, `other_models_regression.json`,
`online_recovery.json`, targeted/full logs and baseline/source preservation files.
The previous 3-lord work is retained. Public delivery verification follows below.

### Batch 2 public delivery verification

Formatting and production build pass. The same restricted preview now serves
`index-Ck76Th1w.js`. All **620 artifacts** match dist/local/public byte-for-byte;
eleven source/private/directory routes are rejected on each origin. Eight native
production Guide/start/ability/pause/Home cases pass (English 1440 px and Chinese
390 px), followed by same-address reload. All four new color maps load, with no
page/resource errors or production debug hook. This is desktop Chrome, including
a narrow touch emulation; physical-phone performance remains unmeasured.

The 32-second actual-world film is encoded, fully decoded and inspected through
twelve sampled frames. Two matched-angle before/after image sheets accompany it.
The four existing service identities and original logs remain intact; the manager
archives the old runtime and serves only index.html/assets. No commit or push.

HF quota at 07:42:59 Beijing time: **1,571.349015 of 2,400 included GPU seconds**
remain, paid overage **0**; the returned reset is 17:58:22 Beijing time on
2026-10-26. The batch consumes approximately 145.97 included seconds between the
two observations. These are dated observations, not a future quota guarantee.

`source_preservation.json` compares 1,619 existing inputs: only the entry/review
documents, factory dispatch and optional offline source-rotation handling change.
Every other prior input, including species/lore/i18n/gameplay, remains identical.
Fourteen new files contain this batch's assets, builders, conversion helpers and
regression tests. User visual acceptance of these four appearances is pending.

## Ribbon Spore soft-motion follow-up — 2026-10-26

The user accepts the four batch-2 appearances, requests more soft-body movement
for Ribbon Spore, and reiterates that future models may depart completely from
previous silhouettes/colors. New designs should interpret the unchanged written
descriptions and coherent anatomy rather than trace old assets. This supersedes
the previous batch-2 pending-acceptance label above; the motion follow-up itself
is a new review candidate. It does not authorize a commit or push.

The previous 12-joint axial chain moved only subtly: middle/rear sampled vertical
excursions were 0.061/0.089 normalized body lengths. The revised curvature wave
travels from the steady leading end toward the tail; it combines smooth dorsoventral
bending, restrained lateral flexion and slower membrane twist. The distal filaments
receive a delayed smaller wave. The existing continuously accumulated gait phase
already responds to speed, so no second speed multiplication or separate clock is
introduced. Segment lengths, root position, source geometry/UV/colors, shared
materials, skeleton count and all gameplay remain unchanged. No new HF generation
or quota consumption is required for this animation-only correction.

Actual skin sampling through slow/fast/release transitions measures middle/rear
excursions of 0.131/0.224 body lengths, while the leading probe remains below
0.003. The maximum sampled per-frame step at 60 Hz is 0.0115 body lengths. UV
seam gaps remain zero; sampled triangle edge ratios are 0.750–1.270, and all skin
vertices remain inside the existing culling sphere. The three other batch-2
creatures match their previous skin samples exactly across 180 poses each.

The focused tests check a steady leading end, readable rear/filament flexion,
paused timestamps, changed-speed continuity, bounds, shared resources and
independent poses. The matched comparison is explicitly a fixed-camera animation
demonstration; normal-world travel is separately recorded with a labeled observer
camera. Evidence resides in `.local/ribbon_soft_motion_20261026/`. Existing terrain,
statistics, feeding, collisions, descriptions and the prior Lumen correction are
retained. No physical-device performance claim is made.

Follow-up validation: **18 focused tests**, formatting and production build pass.
Native Chrome records both Guide languages and normal-world travel with position
ranges of 2.72/0.83/2.61 m across the three axes; the paused pose stays fixed.
The 21-second delivered film contains a matched before/after animation comparison
followed by actual-world travel. It was fully decoded and visually reviewed at
nine sampled frames. The other three batch-2 appearances and motions are retained.

The same restricted preview now serves `index-CEjFG59z.js`. Two native production
flows pass (English 1440 px, Chinese 390 px touch emulation), including Guide,
start, ability, pause, Home and same-address reload. No browser/resource errors
or production debug hooks are present. Six changed/affected artifacts, including
the Ribbon Spore geometry and color, match dist/local/public byte-for-byte;
617 other artifact hashes are locally identical to the previous verified build.
This is a delta verification, not a new download of all 620 artifacts. Six private
routes remain 404 on each origin and all four service identities are unchanged.

Source preservation compares 1,633 existing inputs. Only the three entry documents,
this review, the small-creature pose builder and its focused test changed. No
inputs were removed or added; assets, gameplay and other models remain identical.
The user has accepted batch-2 appearances; this soft-motion adjustment awaits
review. No commit or push.

## Ordinary-creature batch 3 — 2026-10-26

The user's next-batch request accepts the preceding Ribbon Spore motion follow-up
and authorizes another appearance batch. This group replaces Brine Rosette,
Hinge Walker, Lantern Pod and Veil Glider. It interprets their unchanged written
descriptions without treating legacy silhouettes or palettes as constraints.
It does not authorize a commit, push or main release. These four new appearances
remain pending user review.

Four original reference images were used with Microsoft TRELLIS.2-4B. Actual
GLBs, input hashes, stage receipts, dated quota observations and rejected variants
are preserved under `.local/europa_batch3_20261026/`. The primary model source is
[Microsoft's model card](https://huggingface.co/microsoft/TRELLIS.2-4B), with
[ZeroGPU documentation](https://huggingface.co/docs/hub/spaces-zerogpu) and the
[Space implementation](https://huggingface.co/spaces/microsoft/TRELLIS.2/blob/main/app.py)
checked for the generation path. All GPU stages use included quota; no paid
overage is authorized or used.

| Kind          | New anatomy and motion                                                               | Triangles | Bones | Body draws |
| ------------- | ------------------------------------------------------------------------------------ | --------: | ----: | ---------: |
| Brine Rosette | Six shell valves open slightly around a gently pulsing central organ                 |    11,378 |     8 |          1 |
| Hinge Walker  | Layered carapace, long feelers and six articulated legs with alternating lift/return |    17,570 |    23 |          1 |
| Lantern Pod   | Arched ivory ribs around a warm internal sac; five flexible rear skirt leaves        |    12,792 |    11 |          1 |
| Veil Glider   | Dark double-layer wings, a solid keel and a forked tail with delayed wing curvature  |     8,346 |    23 |          1 |

Body length remains normalized on the existing Z axis. The two benthic models
retain the configured floor offsets: 0.20 m for Rosette and 0.27 m for Walker.
Game root transforms, movement speeds, counts, feeding/contact rules, rewards,
species lore and bilingual UI are unchanged. Active gait phase uses the existing
clock; limb motion does not introduce a second game-speed multiplier. Geometry,
materials and color preparation are shared; each creature owns its skeleton.
Lantern's warm tissue emission is selective and adds no scene light.

### Generation and integration corrections

The first Lantern export contained six skirt lobes, so it was not accepted as-is.
A second export from a more explicit reference produced unsuitable anatomy and
is retained as a rejected candidate. The selected first export is authored offline:
the extra lateral lobe is removed/retracted, the other five are redistributed,
and the paired inner/outer cut loops are stitched together using a minimum-span
monotonic zipper. The cut collar is closed into a continuous soft base and gently
relaxed; zero-area faces from that local closure are removed. This is a documented
mesh repair, not a claim that HF generated a correct five-leaf result directly.
The original ribbed organ, five retained leaf surfaces and baked source colors
remain. A small detached diamond between Veil's intact forked tail tips is removed;
the two principal wing surfaces and both eye components are retained.

An aggressive attribute-based reduction produced visible shell/rib damage and
color islands. It is rejected. The selected solid-body reduction preserves a
0.003 normalized geometric error bound before UV rebaking and source-normal
transfer; Rosette retains 11,378 triangles rather than forcing its nominal 10,000
target. Veil retains the individually reviewed thin-surface conversion. This
batch does not silently trade accepted shape quality for a lower triangle count.

Conversion helpers are `prepare_europa_mid_hf_asset.mjs`,
`restore_europa_mid_hf_normals.mjs`, `fit_europa_mid_hf_asset.mjs`, and
`seal_europa_lantern_skirt.mjs`. The original raw GLBs are immutable. Five-view
baseline captures and seven-view color/clay/back/bottom candidate captures use
matched framing; initial conversions and rejected footage remain archived.

### Validation and resource scope

The focused checks cover actual deformed vertices and UV seams, rigid chain
lengths, bounded skin stretch, culling, paused timestamps, shared resources,
independent poses and idempotent skeleton disposal. The existing all-alien axial
length check caught Rosette's initial diameter normalization; the asset was
corrected to the existing Z-axis contract rather than weakening that check.
The other 19 Europa creatures/lords and playable characters match prior sampled
world surfaces exactly across 90 poses each.

Native Chrome checks ordinary Guide and world loading without explicit forced
preparation, three cycles through Europa/Hawaii/Atlantis, and network-failure
recovery. The active population remains 90 for these four kinds (10 Rosettes,
12 Walkers, 36 Pods, 32 Gliders after existing population rules). All 270 audited
retired world skeletons release their bone textures. Reopened Guide models keep
shared geometry/textures while world instances keep independent skeletons.

Matched populated views reduce submitted calls from 58/63/55/67 to 53/55/49/64
for Rosette/Walker/Pod/Glider views. Geometry increases, most notably Rosette;
these draw counts do not prove better frame time or physical-phone thermals.
The native cost record predates the final 111-triangle Lantern cut-edge seal;
that final local repair preserves its single draw and resource ownership.
No physical-phone performance claim is made.

The gameplay film uses normally moving NPCs, a one-time invulnerable player
placement and a labeled following observer camera. It does not pin entities or
modify the game clock. Both Guide languages, actual travel/turning and pause are
checked. A Lantern take with an obstructed camera was rejected and recorded again
from a clear existing school. Presentation and public delivery results follow.

Dated quota observations: at 08:15 Beijing time, 1,571.349015 of 2,400 included
GPU seconds remained; at 08:46, 1,322.640143 remained, with paid overage 0.
The returned reset is 2026-10-26 17:58:22 Beijing time. The difference includes
four original exports and the rejected second Lantern attempt, about 248.71
included seconds. These are dated observations, not a promise of future balance.

### Batch 3 final checks and presentation

After the final Lantern collar repair, `npm test` passes 1,816/1,816 checks,
including the unchanged all-alien geometry contract. The final focused geometry
run passes 18/18; the earlier broader Europa selection passes 36/36.
`npm run check` and the production build pass. The final Lantern mesh contains
12,792 triangles after degenerate-face removal. Its fresh world take records
8.43/1.86/7.56 m ranges along X/Y/Z, plus an unchanged paused pose. The other
three world takes remain valid and are included in the same reviewed 32-second
H.264 film. The full encoded film decodes without errors; matched before/after
images and twelve sampled encoded frames are inspected.

The updated production preview passes eight native Guide/start/ability/pause/Home
flows: the four kinds in English at 1440 px and Chinese at 390 px. All four color
textures load, there are no page/console/resource errors, and same-address reload
retains the new entry `index-CMUwkf4D.js`. Production exposes no development hook.
The narrow layout is desktop Chrome emulation, not a physical-phone test.

Evidence stays in `.local/europa_batch3_20261026/`: `test_release.log`,
`final_geometry_tests.log`, `check.log`, `native/report.json`, `motion/report.json`,
`motion/lantern_retake.json`, `online_recovery.json`, `other_models_regression.json`,
`final_assets.json`, `public/report.json` and the `delivery/` media. The baseline
contains 1,633 inputs. Only the existing factory and four project documentation
files change; 15 new production/helper/test inputs are added. Earlier Europa
candidate files remain byte-identical. Eight of Europa's sixteen ordinary kinds
now have HF appearances; the remaining eight and the scenery inventory are later
batches. This batch awaits user review and remains uncommitted/unpublished.

All 632 production artifacts (164110937 bytes) match SHA-256 across the built,
restricted local and public copies. Eleven private/source routes are refused on
each origin. Existing dev/preview/awake/tunnel PIDs 35213/23118/23120/35419 retain
their recorded identities, tunnel readiness is healthy, and the previous runtime
is archived. Final source/build hashes and delivery receipts remain beside
`artifacts.json` and `source_preservation.json`.

### Batch 3 spawn-overlap audit — 2026-10-26

The user observes bodies initially piling up and then separating in the delivered
film. This is a confirmed initialization defect for the two benthic kinds, not
accepted natural grouping. In a fresh native start with the player untouched,
all ten Rosettes occupy two exact sites (five per site, twenty coincident pairs).
Eight of the twelve Walkers occupy two exact sites (four per site, twelve
coincident pairs); the four density-added individuals have separate positions.
The video-style one-time player placement reproduces the same initial counts.
Individual headings subsequently disperse the overlapping bodies.

`initialSpeciesAnchor` cycles the two declared homes without scatter for these
kinds. `habitatPosition` accepts a valid terrain point without checking another
creature at that point. The original resident anchors therefore remain repeated;
the density pass only offsets its newly added individuals. Main simulation,
Europa species, feeding distribution and ecosystem-population sources are
byte-identical to HEAD before this audit. The redraw exposed an existing defect.
Previous model/motion checks did not test this initialization contract.

Lantern/Glider have no exactly coincident starts in either run; their existing
schools have close centres (minimum 2.22/2.09 m respectively). Grouping itself is
expected, and centre distance alone does not establish actual posed-surface
intersection. Any spacing repair must retain population, layers, resident homes
and feeding values, then check natural start, reset and replenishment rather
than delaying the video until bodies have separated. No runtime changes are made
in this diagnostic turn. This issue remains open before batch acceptance.
Evidence: `.local/europa_spawn_overlap_20261026/diagnosis.json` and
`ecology_vs_head.diff` (empty), plus the reproducible `diagnose.mjs`.

### Batch 3 population-spacing repair — 2026-10-26

The user explicitly authorizes correcting the audited overlap. Four kinds now
opt into `populationSpacing`: Rosette 1.05 m, Walker 2.50 m, Pod 6.30 m and
Glider 9.50 m. These are centre clearances covering sampled actual deformed
bodies, including Glider wings. Every candidate is tested after terrain/depth
correction against same-kind live occupants. Reused home anchors therefore
produce separate valid positions within their existing resident radii. Pod and
Glider also use the clearance as their minimum school-slot spacing.

Initialization and reset retain stable population indices and exclude the
individual's own previous position. School centres are navigation references,
not occupants. Replenishment excludes retired entities; if both the local and
original-habitat searches fail, the creature remains hidden and retries after
0.25 active seconds. Migration plans the whole school against other residents
and its own earlier reserved positions, then commits only a complete valid set.
No new per-frame population collision scan is introduced. This corrects placement
and school spacing; ordinary roaming can still bring moving individuals near one
another and is not a full NPC rigid-body simulation.

Counts remain 10/12/36/32. All source models, skins, animation, descriptions,
feeding values, speeds, habitat layers, resident anchors/radii and combat rules
are unchanged. Other populations do not opt into the new placement checks or
slot spacing. A controlled old/new comparison across 1,876 unconfigured placement
cases is identical; this is a helper-contract comparison, not a natural-play claim.

Validation: 21 focused tests and 1,819 full tests pass, together with formatting
and production build. Actual posed vertices fit inside the configured clearance.
A native Chrome runtime checks three normal starts/resets with the player left
untouched: minimum starting distances are 1.603/2.744/6.300/9.527 m and no exact
coincidences. The same `hiddenFor` replenishment path succeeds for all four kinds.
Controlled timers trigger actual Pod and Glider migrations, preserving at least
6.300/9.528 m centre clearance at observation. A temporary collider fixture
blocks the habitat, confirms deferred hidden replenishment without a game error,
and confirms recovery after that fixture is removed. These controlled lifecycle
checks are distinguished from the video.

The delivered 12-second video records fresh starts of the two benthic kinds
from fixed observer cameras;
only the player is placed once outside each group and made invulnerable for
recording. Creatures are not repositioned or held still. The longer four-kind film has
late Pod/Glider views obscured by other scene geometry/creatures, so those clips
are retained as rejected presentation takes rather than delivered. The lifecycle
and starting-clearance records still cover all four kinds. Evidence stays under
`.local/europa_spacing_fix_20261026/`: `native.json`, `lifecycle.json`,
`diagnosis.json`, `focused.log`, `test.log`, `unaffected.json` and `delivery/`.
The earlier diagnostic and rejected overlapping footage remain intact.
This correction awaits visual review, with no commit/push or formal release.

The same restricted preview now serves `index-Dn3259Cb.js`. All 632 production
artifacts (164,111,857 bytes) match the build, local restricted origin and public
origin byte-for-byte. Eight native English/Chinese Guide/start/ability/pause/Home
flows, same-address reload and absence of the production debug hook pass without
page/console/resource errors. Eleven source/private routes are refused on each
origin. Existing service identities and tunnel readiness are preserved. The
390 px layout is desktop emulation, not an actual-phone test. Source preservation
confirms all previous model/texture files remain unchanged; only the three
placement/config runtime files and project notes change, with one new test file.
Final hashes, source preservation and delivery receipts are retained alongside
the audit. Public readiness is not a claim that the user accepted the correction.

### Ordinary-creature batch 4 — 2026-10-26

The user accepts continuing after the spacing repair. Four hunters receive new
appearances derived from their existing written descriptions, without tracing
legacy geometry or changing player-facing lore. Actual TRELLIS.2 GLBs provide
all visible surfaces; independent fitted rigs carry the original hunter phase
and motion inputs. The three preceding Europa groups remain in this same
uncommitted branch. No formal publication is authorized by “next batch”.

| Creature        | Design and motion                                                                                                       | Triangles | Vertices | Bones | Mesh / material |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | --------: | -------: | ----: | --------------: |
| Forkjaw Stalker | Overlapping chest armor, curved paired jaws, fitted paired fins and tail; jaws open during the existing wind-up         |    13,905 |   12,915 |    12 |           1 / 1 |
| Prism Hunter    | Three main hard blades around a dart-like core; three tail rudders fold toward its measured tail root before the charge |    11,996 |    9,266 |     8 |           1 / 1 |
| Rift Reaver     | Slender hooked armor and dorsal spines; seven-section travelling tail wave with separately fitted hook jaws             |    17,908 |   18,496 |    10 |           1 / 1 |
| Void Siphon     | Four thick mouth lobes around a recessed cavity, ring armor and a tapered body; restrained tail and mouth motion        |    15,977 |   14,486 |    10 |           1 / 1 |

Original concepts feed the hosted [TRELLIS.2 model](https://huggingface.co/microsoft/TRELLIS.2-4B).
The first Prism export has an ambiguous double-ended tail and is rejected, with
its concept, GLB and receipt retained. Its second export is selected; the other
three use their first exports. Each final GLB is downloaded and hash-verified
before releasing its Gradio session. Generation uses included Pro quota only:
at 10:33:49 BJT it reports 1,322.640143 / 2,400 seconds; after the five exports,
at 10:59:08 it reports 1,178.635099 seconds, with zero overage. This is a dated
reading, not a guarantee for later work. The reported reset is 17:58:22 BJT.

The conversion performs bounded reduction, welded coincident positions, atlas
rebaking from actual HF colors and retained-source normal transfer. Four 1024 px
color maps share preparation/retry ownership between Guide and world instances;
skeletons and motion state remain independent. Eight source mesh/texture files
total 3,058,348 bytes. Four new closed interior proxies extend the existing
near-camera solid-section behavior, without changing visible skins or physical
contact geometry. Existing topology records remain unchanged.

Surface review found two fitting defects before delivery: the Reaver's curved
upper hook crossed a naive global jaw split, and Prism's three-rudder weights
used the wrong vertical centre. The jaw seam now follows the real mouth gap;
Prism uses the measured off-centre tail root and continuous three-way weights.
Void's lobe roots also use wider angular blending to avoid edge stretching.
Actual skinned vertices, duplicate UV seams, sampled attachment edges, moving
tips, bounded culling and pause continuity are checked, rather than accepting
bone-angle assertions alone. Rift retains its continuous-serpentine marker for
existing downstream contracts.

Native footage also exposes an existing birth-placement problem in this group:
12 Forkjaws occupy three repeated homes (18 exactly coincident pairs), while the
10 runtime Prisms include centres only 7.06 m apart. Only these two species opt
into the previously verified placement checks, at 9.5 m and 15.8 m respectively.
Three fresh starts then retain 12/10/3/2 hunters with no close or coincident pairs.
The clearances enclose sampled deformed bodies, remain within original habitat
rules and apply through the existing reset/replenishment path. No new per-frame
NPC collision scan is added. Ordinary roaming can still bring NPCs near one
another; this is not a full fish-to-fish rigid-body simulation. Speeds, damage,
cooldowns, rewards, descriptions, resident homes/radii and other species remain.

Validation: 18 focused checks and all 1,827 tests pass, together with formatting
and the production build. The first full run caught missing interior proxies
and the Reaver's omitted serpentine marker; these are repaired, with a fresh full
run passing. Native Chrome checks 12 Guide openings and nine region states across
three cycles, with stable shared geometry/color identities and all 81 observed
world skeletons released. Four deliberate texture failures recover through the
normal online retry path, including disposal of a sibling instance. Nineteen
unaffected species/characters retain exactly identical sampled surfaces across
90 poses against the preserved factory. All 643 prior interior records remain
identical; only four new records are appended.

The final four 8-second clips show actual world movement, turning, idle/wind-up/
active/recovery phases and stable pause. The encoded 32-second delivery is decoded
and visually inspected. Eight bilingual development Guide views and production
checks cover ordinary material readiness; no fixture-only prepare call is used
to conceal a missing entry-path load. Early fixture navigation and a stale debug
field error are recorded separately and rerun successfully, not counted as game
failures or successful validation.

Matched paused populated-world observations keep all 353 entities present:

| Observed hunter view | Draw calls before → after | Triangles before → after |
| -------------------- | ------------------------: | -----------------------: |
| Forkjaw              |                   58 → 50 |        159,092 → 160,941 |
| Prism                |                   82 → 71 |        332,228 → 336,792 |
| Reaver               |                   43 → 38 |          54,248 → 58,448 |
| Siphon               |                   37 → 29 |          41,084 → 45,573 |

These matched views isolate visual replacement cost, before the additional
birth-spacing correction. They are not FPS, sustained thermal or physical-phone
measurements. Added detail raises triangles despite fewer drawing objects. The
runtime still shares immutable geometry/colors and avoids per-frame allocation
or new animation loops. Final preview verification is recorded below.
Evidence: `.local/europa_batch4_20261026/`, including selected and rejected HF
receipts, matched seven-angle captures, `asset_cost.json`, actual-surface tests,
`spawn_before.json`, `spawn_after.json`, native loading/disposal and world-film
reports. Footage uses an invulnerable player placed once and a following observer
camera; one initial hunter cooldown is shortened to show its ordinary phase
cycle. Neither player nor NPC is repositioned per frame. This is controlled
presentation evidence, not natural encounter-rate or physical-phone evidence.

The restricted preview now serves `index-D6p_Pk0r.js`. All 644 served artifacts
(168,487,823 bytes across the complete compatibility-retaining artifact set, not
one page's downloads) match the build and both local/public origins byte-for-byte.
Eight native English 1440 px / Chinese 390 px Guide/start/ability/pause/Home
flows pass, including same-address refresh and no production debug hook. No
page, console or failed-resource errors occur. Eleven private/source paths are
refused on each origin; existing service identities and tunnel readiness remain.
The narrow viewport is desktop touch emulation, not a physical-phone test.
Final fingerprints, source preservation, actual delivery receipts, source
provenance and process records remain in the ignored evidence directory.

These four appearances await user review and remain uncommitted/unpushed. Four
ordinary Europa creatures remain for the next group: Crown Filterer, Bell Carrier,
Siphon Colossus and Spiral Grazer. This batch does not authorize their generation
or further changes before the user's next review.

## Batch 4 hunter spacing and swimming repair — 2026-10-26

The user rejects the batch-4 delivery: “你这里又出现了挤在一起的情况，以及游动姿势不对”. The earlier birth-only clearance and its passing checks did not establish continuous spacing or convincing travel. Preserve that rejected evidence in `.local/europa_batch4_20261026/`; this follow-up is a new uncommitted candidate, not accepted art.

### Findings and correction

- Native continuous observation reproduced convergence after birth: Forkjaw/Prism inspections had 669/683 and 546/614 frames with at least one substantially overlapping conservative body envelope. The nearest centre ratios fell to 0.00016 and 0.144 relative to the paired clearance, despite valid initial spacing. Independent predators steered toward the same destination without swimmer-neighbour avoidance.
- The old root orientation lagged behind movement. Static collision sliding could also move an animal almost backwards relative to its head (observed maxima about 169 degrees). Animating the tail harder would not correct that path/orientation disagreement.
- Only the four current hunters opt into `swimClearance`. Bounded neighbour steering, approach braking and swept whole-body clearance prevent new intersections during travel, including fast crossing. An active warned charge retains its intended heading; physical neighbour contact can stop it. No animal is deleted or teleported to make the group look separate. The 27 instantiated hunters retain their original population, lengths, habitats, descriptions and damage/timers.
- Heading now turns gradually with dorsal-up yaw/pitch, and forward travel follows the turned body. When rock resolution would slide the animal sideways/backwards, it waits and turns toward the safe tangent instead. The avoidance latch clears on new rounds and replenishment. This deliberately changes the defective navigation response, not the player's controls/camera or the attack/reward rules.
- The fitted rig uses travelling absolute spine tangents converted to relative joint rotations, avoiding an accumulated rigid C bend. Armoured fronts remain steady; the serpent carries a longer wave, the dart uses restrained tail steering, and the tube-bodied hunter moves its tail more slowly. Resolved displacement drives visual effort after contact, so a blocked hunter settles and a real burst intensifies. The Guide uses its own ordinary cruise input. Meshes, colors, skin weights, bone counts, shared assets and gameplay-size contracts remain unchanged.
- The posed-surface envelope is checked against all four meshes. Prism needs a slightly larger 0.56-length radius, with its birth spacing raised from 15.8 to 16.4 m; the other three use 0.54. This is neighbour clearance only, not an enlarged player bite or damage volume.

### Evidence and limits

Evidence lives in `.local/europa_hunter_motion_20261026/`, with immutable immediate-source snapshots and before/after receipts. The final two 12-second native observation runs inspect all four hunter kinds while staging the player near Forkjaw and Prism. They retain all individuals and have no clearance overlap in 725 and 726 frames respectively; minimum paired ratios remain above 1.0. Maximum observed movement/head deviation falls below 20 degrees, allowing bounded rock deflection. These are finite observations, not a proof for every possible encounter.

The four continuous 12-second world clips show normal ecology movement and all idle/windup/active/recover phases. Their player placement and observer camera are staged, with Slow held and damage enabled; no NPC is pinned or repositioned per frame. The attempted high-health setup is immediately clamped to the game's normal 100, as recorded in health samples. A separate close-contact fixture confirms each selected hunter can actually damage the player and enter its existing rear-follow state, including Void Siphon. The world film is not a natural-progression difficulty benchmark.

Matched isolated views use the same camera/light/scale and cruise inputs; actual mesh seams, attachment lengths, bounds, independent instance state, pause continuity, stop/cruise/burst/release and continuous 12-animal convergence have focused checks. The 19 other creature kinds retain identical sampled surfaces through 90 poses each. Geometry/texture assets and per-model GPU resources are unchanged; the new CPU work is a bounded neighbour list for these 27 hunters, without an FPS/thermal improvement claim. Native desktop Chrome is used; no physical-phone result is claimed.

Final checks, preview artifact identity and delivery receipt are appended after verification. No new HF generation, extra paid usage, commit, push or personal Skill edit is part of this repair.

Verification completed for this repair: all **1,835 tests** and the repository formatting/build checks pass. Native checks cover 12 Guide visits, nine regional world constructions, 81 released hunter skeletons, pause stability for all four filmed animals, and clearing stale avoidance state on restart. The initial reset fixture incorrectly injected an expiry without its heading vector; its failed receipt is retained as `native_invalid_fixture.json`. The corrected fixture supplies a valid complete state and passes; the runtime assertion was not relaxed.

The restricted build is `index-D-yheY4q.js`. All 644 artifacts match the reviewed build byte-for-byte at both local and public origins; each rejects 11 source/private/debug paths. Eight English desktop / Chinese 390 px native flows pass, including Guide, Start, ability, Pause, Home and same-address reload; the production debug hook is absent. This is desktop touch emulation, not a physical phone test. The existing DEV, restricted preview, awake and tunnel processes are retained. The final gameplay-data comparison preserves all 16 ordinary species except the explicit four navigation clearances and Prism's birth spacing. `source_preservation.json` preserves 1,643 prior inputs outside the declared repair, and `delivery.json` records the actual sent evidence and pending user review.

The delivered movie uses 12 seconds each for Forkjaw, Prism and Void, and the first eight seconds of the 12-second Rift recording (44 seconds total). The remainder of the Rift observer view is blocked by intervening scenery; its complete raw recording and measurements are retained. No simulation speed is changed in encoding.

## Ordinary-creature batch 5 — 2026-10-26

The user accepts continuing after the hunter-motion repair: “好的，下一批”.
This authorizes four remaining ordinary giants: Crown Filterer, Bell Carrier,
Siphon Colossus and Spiral Grazer. Earlier rejected batch-4 evidence remains
historical. This batch is a new candidate awaiting review; no commit or push.

### Generation and surface integration

Four separate concepts derive from the existing descriptions rather than the
legacy procedural silhouettes. Microsoft TRELLIS.2 produces actual downloaded
GLBs. Original inputs, private generation receipts and rejected attempts remain
in `.local/europa_batch5_20261026/`. Included PRO quota is checked before each GPU
stage; no paid overage is enabled or consumed.

- Crown Filterer: pear-shaped mantle, thick-to-fine filtering arms, fitted
  mantle pulse and backward gathering during transit. The first export contained
  excess central tissue; an attempted cut-and-cap cleanup was rejected. A second
  generated source replaces it without those cuts. Soft arm motion stays distinct
  from the armoured mantle.
- Bell Carrier: a broad continuous violet canopy with several trailing bell
  organs. The first rough canopy simplified poorly and was rejected. The second
  source has a smooth hood; a 23,500-triangle conversion retains its thin surfaces.
  Source-normal-directed color projection avoids transferring pale underside
  colors onto the dark outer canopy. The canopy pulses, with delayed movement
  along the pendant tissues.
- Siphon Colossus: two forward siphons, a broad ribbed abdomen and an undulating
  lower skirt. The torso does not acquire a fish-like tail wag.
- Spiral Grazer: a rigid coiled shell, paired swimming wings, sensing filaments
  and a moving soft foot. Shell vertices remain rigid through the motion cycle.

Each model uses one draw mesh and one shared material/color texture, with its own
skeleton. Crown/Bell skin weights are diffused along surface adjacency offline;
matching UV vertices retain equal weights. This removes abrupt branch seams
without adding per-frame mesh processing. Rejected binding trials are not
verification of the final candidate. No description, population, length, speed,
food reward, combat or player-control constants are changed.

### Continuous distribution and reset correction

The four giants opt into the previously accepted continuous swimmer-clearance
mechanism as well as occupied birth slots. Their already-existing independent
homes and populations remain. Actual resolved travel drives the soft-body effort.
They turn before advancing and wait/turn at rocks rather than sliding sideways.

Native repeated rounds exposed a separate placement defect: reset considered
positions left over from the previous round as occupied new-round slots. It now
marks those old placements inactive before sequentially placing the new round.
Configured non-benthic residents retain the original planar search first, then
search their existing three-dimensional home volume if that plane is occupied.
A fully occupied legal habitat still returns failure rather than overlapping or
teleporting out of its territory. Other species' birth search is unchanged.

### Final evidence, cost and delivery

All **1,845 tests**, formatting and the production build pass. The initial full
run caught three integration contracts: the anatomy hook name, legacy tentacle
expectations and missing interior closures. The hook is preserved, tentacle
coverage now checks these fitted HF surfaces, and four watertight, oriented
interior cores retain the existing close-camera solid-body treatment. Their
1,188 / 3,448 / 1,228 / 1,224 triangles are separate from the visible meshes;
all 647 previous interior records are unchanged. Rejected non-watertight proxy
experiments remain in the evidence folder.

| Creature        | Visible triangles | Independent bones | Draw meshes / materials |
| --------------- | ----------------: | ----------------: | ----------------------: |
| Crown Filterer  |            17,990 |                34 |                   1 / 1 |
| Bell Carrier    |            23,500 |                14 |                   1 / 1 |
| Siphon Colossus |            17,921 |                13 |                   1 / 1 |
| Spiral Grazer   |            15,982 |                16 |                   1 / 1 |

These visible triangle totals are higher than the former procedural models;
their draw meshes fall from 18 / 12 / 8 / 6 to one each. The eight mesh/color
source assets total 4,215,559 bytes. Color textures are shared 1,024-pixel WebPs.
This is an art/cost tradeoff, not a claim of better physical-phone performance.
The final export receipt records 821.082058 of 2,400 included GPU seconds left,
zero overage, and a returned reset time of 2026-10-26 17:58:22 Beijing time.
That is a dated generation receipt, not a live quota reading.

Four native world observations sampled 2,646 frames across the giant populations
without intersecting their conservative neighbour envelopes. This is finite
coverage, not proof that every encounter is collision-free. Separate recordings
show actual forward travel, turns, soft-body motion and exact pause stability.
The player start and observer camera are staged; animals use the running ecology
without per-frame position pinning. The 32-second delivery movie takes eight
seconds from each longer recording at normal simulation speed. Some ice passes
between the camera and animals; the complete recordings and measurements remain
available alongside the final decoded contact sheet.

Native checks cover 12 Guide visits and nine region constructions across three
cycles. All 135 monitored world skeletons are released; the four shared color
textures remain stable. The other 12 ordinary Europa kinds, three lords and four
players retain exactly matching sampled surfaces through 90 poses each. The
first comparison attempt failed because its copied factory had unresolved local
imports; correcting only that fixture's import paths produced the passing
comparison. Previous inputs are retained byte-for-byte outside the 14 declared
integration/documentation paths, with 1,650 of 1,664 baseline files unchanged.

The restricted preview is `index-Ch-ZfHjz.js`. All **656 artifacts** match the
reviewed build byte-for-byte at local and public origins. Both origins refuse
11 source/private/debug paths. Eight English desktop / Chinese 390 px native
Guide, Start, ability, Pause and Home flows pass, including same-address reload,
successful texture responses and no production debug hook or browser error.
The narrow viewport is desktop emulation, not an actual phone. Existing DEV,
preview, awake and tunnel service identities are preserved.

Evidence, final fingerprints, generation provenance, matched comparisons,
decoded movie checks and actual message receipts are kept in
`.local/europa_batch5_20261026/`. With this batch, all 16 ordinary Europa species
have HF candidates, alongside the three previously redrawn lords. The four new
appearances still await user review; earlier accepted work is preserved and no
new commit, push, main publication or personal Skill edit is performed.

## Batch 5 swimming and terrain repair — 2026-10-26

The user rejects the octopoid swimming and reports creatures passing through
walls. The delivered batch-5 appearance is therefore **rejected pending this
repair**. Its earlier test/preview receipts are historical, not evidence that
this feedback was solved. This candidate has not been committed or pushed.

### Crown Filterer motion and regeneration

The old HF source spreads its short arms around the body. Stronger folding of
that source produced stretched attachments rather than convincing trailing arms;
those experiments were rejected and kept outside runtime. A new authorized
TRELLIS.2 export instead has a mantle-leading body and eight naturally rearward
arms. The downloaded GLB is 3,786,024 bytes, SHA-256
`51d3fb8c64f28a4e137caa599570ce525877f217f83b0c6ef29642a21131492a`.
Its new concept, raw export, conversion, seven-angle clay/color renders and
receipts are retained under `.local/europa_giant_repair_20261026/`.

The [Monterey Bay Aquarium's jet-propulsion account](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/giant-pacific-octopus)
describes mantle contraction driving water through a siphon. Crown Filterer is
fictional: the mantle-leading jet/glide rhythm and trailing arm bundle are a game
adaptation, not a claim that this is a real species or that all octopus movement
uses the same pose. Existing written descriptions are unchanged.

The fitted supports form a continuous soft-tissue field. Hovering loosens the
arms; resolved travel gathers them, with mantle pulses and small delayed tip
motion rather than radial rowing. Stopping releases the gathering gradually.
The new normalized mesh retains body length and uses 17,957 visible triangles,
34 independent bones, one draw mesh and one shared color material. Offline
adjacency smoothing preserves duplicated UV seams. Its replacement watertight
interior core has 724 triangles; all 651 prior records remain unchanged.
No per-frame vertex deformation or new animation loop is added to the game.

Tests inspect actual skin: the rear arm surface stays behind the mantle, remains
volumetric, narrows during travel and loosens after stopping. They also check
seams, culling bounds, independent state and exact paused position/rotation/scale.
An additional exhaustive edge audit is retained: very short edges still have
more strain than broad tissue, so the check is not described as zero deformation.
The final neutral/posed renders and encoded clips are the visual review basis.

### Terrain contact, including slopes

The existing navigation capsule protected a narrow fish centreline, not the new
wide skins. Birth selection also used that narrow radius. Native baseline
observations found actual skin vertices inside ice/rock colliders, including
Crown, Bell, Siphon, Forkjaw and Prism. The fix uses the already measured posed
sphere for **Forkjaw Stalker, Crown Filterer, Prism Hunter, Bell Carrier, Siphon
Colossus, Spiral Grazer, Rift Reaver and Void Siphon** at birth and during swept
rock contact. It protects turns as well as forward travel. Narrow passages can
now be rejected by these wide swimmers instead of admitting only their centres.

The first rock correction exposed a second defect: centre-only floor sampling
still let Siphon/Spiral edges cut a sloping seabed by approximately three metres.
The shared opted-in floor helper now samples the lower spherical footprint,
with a small allowance for gaps between samples. Birth, anticipatory steering,
ordinary travel, collision resolution and post-contact safety use this same
floor constraint. Static cliffs/arches retain their actual swept colliders.
The finite sampling is tailored to Europa's sloping/rippled bed, not a general
proof for arbitrarily discontinuous height functions. Other species retain their
existing floor margin and narrow body navigation.

Population counts, habitat bands/homes, speed constants, damage, attack timing,
food rewards, player controls, descriptions and terrain itself are unchanged.
Valid swimming space is intentionally more conservative for these eight kinds.

### Verification and limitations

All **1,855 tests** pass, including 23 targeted surface, population and terrain
checks. The terrain tests sweep the real posed bodies into a thin wall and rotate
them there, plus check full lower envelopes against slopes in many directions.
Four final native world observations span 1,959 frames and 100 sampled states
across the opted-in populations, with no sampled actual vertex inside a rock or
below the bed. This is finite coverage, not a universal collision-free claim.
The earlier failed floor run and the original baseline are retained separately.

Four real-ecology recordings show measurable forward movement and turns, plus
exact pause stability of body and bones. Their observer camera and initial small
invulnerable player are staged; entities are not repositioned every frame. A
separate isolated action clip explicitly labels staged hover/cruise/fast/stop
inputs. Neither fixture is physical-phone testing. Scenery/other animals can
briefly occlude the observer view; this is not hidden with per-frame NPC edits.

Twelve Guide visits and nine region constructions retain shared textures/geometry
and release all 135 monitored world skeletons. Restart clears avoidance state.
Nineteen other models retain identical sampled surfaces over 90 poses; the other
three giants retain identical surfaces over 180 poses. Their source assets and
accepted motions are preserved. Runtime cost remains one visible mesh/material
and 34 bones for Crown; footprint checks add bounded height queries for opted-in
swimmers. No physical-device performance improvement is claimed.

The completed export receipt, dated 2026-10-26 13:50 Beijing time, records
794.735382 of 2,400 included GPU seconds remaining, zero paid overage and a returned
reset at 17:58:22 Beijing time. This is not a live quota reading. All work/evidence
stays under this Developer project; no personal Skill or Documents work cache is
changed. Production preview verification and final delivery receipts follow.

The final restricted preview entry is `index-DahmYO5x.js`. All **656 artifacts**
(174,621,890 bytes) match the reviewed build at both local and public origins;
both origins deny 11 source/private/debug paths. An initial curl TLS handshake
failure interrupted the first audit; the retained retry completes with reused
HTTP connections. Eight native English desktop / Chinese 390 px Guide, Start,
ability, Pause and Home flows pass, including same-address reload, successful
color responses and no production debug hook or browser error. The narrow
viewport is desktop emulation. All four existing service identities are retained.

Source preservation verifies 1,666 of 1,678 baseline inputs byte-identical, with
12 declared modified files and two new helper/test files; no baseline input is
missing. The matched before/after image and decoded 23-second Crown clip were
sent as `om_x100b62db42b118a0df22c73e7616f4a`, with video attachment
`om_x100b62db426cc4a0c0bfd76d30d94b5`. A separate four-creature world clip and
final message receipts are stored in the local delivery record. The candidate
still awaits user visual acceptance; main/Pages remain v0.11.19.

## Crown Filterer arm-motion follow-up — 2026-10-26

The user asks whether the arms move at all. The previous candidate did animate
its tips, but the motion was too small at a normal viewing distance. That prior
technical pass is not visual acceptance. This follow-up retains the actual HF
shape, colors and rearward arm bundle and repairs motion/binding only.

A continuous travelling bend now moves from the attached roots toward the tips,
with gentle radial variation between the arms. Actual travel still controls the
cadence and gathering; fast travel speeds the motion, while stopping eases back
to a loose, slow pose. The initial amplitude-only experiment creased the skin:
surface diffusion followed by selecting four strongest influences had changed
the axial weight sums between adjacent vertices. Crown now retains its analytic
angular/axial interpolation, including identical UV-seam weights. Other anatomical
rigs retain their previous baked bindings. The rejected experiment is preserved
under `.local/crown_arm_motion_20261026/` rather than shipped.

Matched steady-cruise measurements show about **3.31 times** the former average
excursion across eight trailing-surface sectors. The broad connected-edge audit
in this clip remains within 0.780–1.185 times rest length. A new regression checks
every connected edge longer than 0.004 normalized units over cruise/fast samples,
as well as readable surface movement; it would reject the amplitude-only defect.
All **20 focused motion/terrain tests** pass, including seams, independent poses,
exact pause, the existing culling envelope and full body terrain clearance.
The other three giants retain exactly matching sampled surfaces over 180 poses.
Earlier all-suite results remain historical; the full suite was not repeated for
this isolated motion correction.

The position, normal, UV and triangle data and the color image are unchanged;
only the Crown asset's binding fields differ. Runtime cost remains 17,957 visible
triangles, one mesh/material and 34 bones, with no extra textures, draw calls or
per-frame vertex uploads. Gameplay, movement speed, population, descriptions and
the previous terrain repair are unchanged. No HF generation/quota was used.

Native Chrome checks cover both-language Guide entry and real ecology movement,
turns and paused bones. An observer-camera take obscured by another animal was
retained; the delivery take selects a clearer camera without moving or hiding
other creatures. A matched isolated clip separately labels staged normal/fast/
stopped inputs. The world entity is not pinned or animated by the fixture.
These are desktop checks, not physical-phone measurements. Final preview and
encoded-media verification are recorded below; user acceptance is pending.

Final verification: formatting and the production build pass. Restricted preview
`index-DRdd5zhP.js` serves all **656 artifacts / 174,603,682 bytes** identically
at local and public origins; both reject 11 private/source/debug paths. Two
native production flows (English 1440 px and Chinese 390 px desktop emulation)
pass Guide, Start, ability, Pause, Home and same-address refresh, with successful
colors, no browser error and no production hook. The four service identities
remain unchanged. Preservation checks retain 1,672 of 1,680 baseline inputs
byte-identically; only eight declared source/test/document files changed, with
no added/missing input. No commit or push was made.

The final matched comparison and real-world excerpt total 19.5 seconds, encoded
at 30 fps and decoded successfully. The full world take records 629 frames and
movement spanning approximately 9.5 / 2.2 / 22.7 metres on its axes; pause is
exactly stable. Encoded frames were inspected. The observer-camera excerpt is
identified in-frame; the isolated comparison is not presented as gameplay.
Evidence, original/rejected takes and delivery receipts remain in
`.local/crown_arm_motion_20261026/`. This motion revision awaits user review.

## Batch 6 — exclusive rare and rooted colonies — 2026-10-26

The user accepts continuing after the Crown Filterer arm follow-up. This batch
replaces Six-wing Crystal Seraph and two rooted colony forms with actual
Microsoft TRELLIS.2 exports. New appearances await review; no commit or push.
The 16 ordinary creatures, three lords, characters and earlier terrain/spacing
repairs remain. The research wreck, ice/rock architecture and geochemistry are
still future scenery work, not silently counted as complete.

### Source and selection

Original modeling references were made with imagegen, followed by authenticated
[Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2) generation,
GLB export and validated local download. Inputs, receipts and raw meshes are in
`.local/europa_rare_colonies_hf_20261026/`. First Seraph export had only five
readable membranes and was rejected; attempt 02 has three distinct pairs.
These are original fictional anatomy interpretations of the unchanged written
descriptions, not reuse of the previous procedural shapes. Source descriptions,
labels, ecology, rare capture/blessing and combat files are preserved.

| Asset                   | Selected seed | Source GLB bytes | Runtime triangles | Far triangles | Color bytes |
| ----------------------- | ------------: | ---------------: | ----------------: | ------------: | ----------: |
| Six-wing Crystal Seraph |        746062 |          3319896 |              8000 |             — |      231660 |
| Rooted siphon           |        746062 |          4063736 |              6930 |           476 |      357226 |
| Fan colony              |        746063 |          3779648 |              2136 |           378 |      212234 |

Full source/texture hashes, packed sizes and vertices are in `asset_cost.json`.
Quota was 794.735382 included seconds at 15:11 BJT, and 624.885641 at 16:15 BJT;
reset returned approximately 17:58 BJT. Over-quota usage remained zero. These
are dated measurements, not a promised current balance. Rejected generation is
included in this consumption; no paid overage was used.

### Integration and corrections

- Seraph retains its 1.8 m gameplay length. Six actual membranes have 18 fitted
  supports and a sensory-sac root. Connected-surface labels prevent a broad wing
  from switching to its neighbour's skeleton; continuous root blending preserves
  the flesh connection. A staggered wave passes through each pair, with smooth
  effort changes and a restrained sensory-tip glow. Guide framing includes the
  fully spread silhouette. Geometry/material/color loading are shared, while
  the 19-bone skeleton and pose state are per instance.
- The siphon has a sculpted hollow lip, longitudinal ribs and an anchored foot;
  the fan has physical branching veins and a shaped membrane. Old fan geometry
  extended from y=-9 to 0, below its ground anchor. The replacement stands from
  y=0 to 9, fixing the orientation while preserving its instance transform.
- All 305 rooted siphons, 24 hanging siphons and 305 fans retain their placement
  matrices. The old 305 detached torus collars are replaced by the generated
  siphon's integrated lip; 120 egg forms remain. All 585 collision records,
  light-source records, terrain, wreck/arch access and navigation are unchanged.
- Early coarse siphon reductions lost the lip/folds and were rejected. Near
  detail is retained, with lower-detail indices sharing exactly the same vertex,
  UV and color buffers. Both colony types use bounded near/far instance lists,
  rebuilt only after 8 m of observer movement or a quality-mode change. No new
  per-organism JavaScript animation loop, lights or post-processing were added.
- Scene instances own time uniforms/material clones. Shared surfaces and color
  queues are reference-counted and released after the last owner, including
  cancellation. The existing material queue provides fallback and retries.

### Verification and measured limits

Evidence: `targeted_final.log`, `full_tests_final.log`, `compare/report.json`,
`motion/report.json`, `scenery/report.json`, `loading_lifecycle.json`.

- Six actual membrane tips move through cruise/fast/stop; all substantial
  triangle edges remain within 0.65–1.45 of rest length, duplicated seam vertices
  coincide, bounds contain posed surfaces, and instances/pause/disposal remain
  independent. The first nearest-chain binding failed the edge test and was
  replaced by connectivity-based membrane assignment rather than loosening it.
- Native Chrome Guide and real Europa NPC travel pass in Chinese and English.
  The recorded rare traversed 32.25 m X, 5.03 m Y and 76.11 m Z with its ordinary
  ecology steering. A one-time small-player placement and following observer
  camera are inspection aids; the creature was not pinned or moved per frame.
- Scene comparison preserves all collision/light records and colony transforms.
  Three matched views draw 414700 / 372890 / 439570 triangles after, versus
  374076 / 375084 / 392492 before; calls are 59 / 60 / 62 versus 60 / 61 / 63.
  The first unbounded-detail candidate reached 913138 triangles in the close
  view and was replaced. The final near views still cost roughly 11–12% more
  triangles; this is not a measured CPU, GPU-time or thermal improvement.
- Intentional 503 failures for all three colors retain visible fallback surfaces;
  explicit retries load the selected colors. Colony texture/geometry release
  occurs exactly once, and duplicate disposal is safe. Scene materials share
  colors across near/far lists without sharing mutable time between oceans.
- Final checks pass 30 focused regressions, all 1,859 tests, formatting and
  production build. Desktop Chrome touch/390 px checks are not physical-phone
  measurements.

The paired model clip is an isolated matched-camera fixture. The rare travel
clip uses the game, and the colony orbit uses the real scene construction with
an inspection camera. No third-party reference footage is redistributed.

### Batch 6 final delivery checks

The same restricted preview now serves `index-pDhkgunw.js`. All 665 artifacts
(176,340,720 bytes including compressed siblings) match `dist`, local runtime
and the public origin byte-for-byte. Both origins reject 11 source/private/debug
paths. Existing DEV/preview/awake/tunnel process identities are unchanged.
These counts describe all served artifacts, not bytes downloaded in one visit.

English desktop and Chinese 390 px native Guide/Start/ability/Pause/Home and
same-URL reload pass, with no page or resource errors and no production debug
hook. Guide framing includes the full spread. The short menu flow did not wait
for the colony textures; a separate native start, with no Guide prewarming,
confirms both colors load automatically with HTTP 200. In that concurrent
public-artifact audit, the game starts at 43.45 seconds and both colors complete
at 61.57 seconds from initial navigation. Fallback remains during queued loads;
this is not a cold-load performance benchmark or a claim of instant colors.
See `public/report.json`, `public/colony_loading.json` and `artifacts.json`.

`source_preservation.json` preserves 1,673 of the 1,680 baseline inputs exactly.
The seven changed inputs are the four project status/review documents, factory
dispatch, Europa scenery and the rare-art test; fourteen new files contain only
this batch's assets, builders, conversion/binding/LOD scripts and tests. Earlier
creature meshes, motions and gameplay files remain byte-identical.

The selected fan uses area-weighted reduced-surface normals joined across UV
seams (`smooth_normals.mjs` in the ignored evidence directory), while Seraph and
siphon use recorded source-normal transfer. Final packed assets retain this
provenance. The 29.5-second H.264 delivery combines a matched-camera before/after
model clip, actual rare travel and a real-scene colony orbit; the complete encode
was decoded without error and its contact sheet inspected. `delivery.json`
records the actual sent media receipts. This batch awaits user visual acceptance
and remains uncommitted/unpushed.

## Movement black blocks and missed predator attacks — 2026-10-26

The user reports flashing black squares during travel and ineffective large
hunters. These are defects in the candidate, not a new appearance batch. The
current agent investigates and repairs them without committing or pushing.
Evidence is under `.local/europa_flicker_combat_20261026/`.

### Black blocks: invalid source normals amplified by bloom

Native Chrome captured two moving-world frames with three non-finite HDR color
channels each. One bad pixel expanded through bloom into a black rectangle
covering most of the screen. Pixel-ray inspection implicated a distant Lantern
Pod, rather than the player's Zombie Shark. A separate repeatable 48-view native
GPU rendering of the actual Lantern mesh reproduced five bad frames, with up to
96 non-finite channels. The same views after repair contain none.

The packed-asset audit found 139 zero normals on referenced Lantern Pod vertices
(including eight entirely zero-normal triangles), 12 on Lumen Stalker and 36 on
Abyss Weaver. `repair_packed_normals.mjs` repairs only invalid normals using the
same-position authored normal or adjacent surface normals; isolated unused
vertices can use the nearest valid authored normal. It preserves all other asset
fields and every existing valid normal. The lord fitting, mid-species source
normal transfer and Lantern closure tools now apply this check at export, and a
regression test audits the packed catalog. Geometry, UVs, colors, rigs, sizes and
motion remain byte-identical. No extra runtime shader pass, lighting change,
reduced bloom or new resource allocation is introduced.

Earlier broad camera probes also captured close-up opaque player skin after
staged growth/placement beside rock. That is a different occlusion observation,
not proof of this square-block defect. Camera behavior is unchanged. Native
samples and desktop touch emulation do not establish physical-phone results.

### Predators: patrol homing overrode legal pursuit

Europa's four ordinary hunters have 35 m resident patrol radii. Previously the
patrol-home steering ran even during a legal chase, turning a lunging hunter
back toward its home after approaching the player. Initial before-repair cases
against a slowly moving 3 m player recorded no damage for all four hunters;
Rift Reaver and Void Siphon could already hit a 30 m player in close contact.
The previous short close-contact checks therefore did not cover this approach
failure.

`steerResidentHabitat` now preserves an actively pursuing water predator's chase
direction. The caller supplies the existing retaliation/territory permission and
chase state. Once the chase ends, patrol homing resumes. Land/flying residents
and non-predators retain their old behavior. This shared correction also applies
to swimming predators using the same resident-home path in other regions.
Nursery/territory limits, terrain/body contacts, evasion, speed, damage, cooldown,
food eligibility and the existing post-bite rear-follow behavior remain.

Native moving-world checks confirm Forkjaw, Prism, Rift and Void can damage the
player. Prism's original case approaches the research wreck and is legitimately
blocked; a separate naturally spawned Prism in open water reaches and bites.
Rift/Void also still attack a 30 m player. Fixtures place the player once ahead
of an existing hunter, isolate other attackers for attribution and use native
Slow input; NPCs are not pinned or moved per frame. These controlled cases prove
contact behavior, not unassisted progression or balanced difficulty.

### Verification scope

The full current Node suite passes **1,863/1,863**, including the new normal-data
and pursuit/return regressions, existing nursery permissions, directed mouth
sweeps and solid-body contact. Asset-field comparison records only `normal`
changes in the three affected JSONs. Native GPU, chase/evasion/pause, final build,
source preservation and restricted-preview receipts are retained in the above
evidence directory; historical batch receipts retain their original scope.

Final checks for this repair: all three corrected meshes pass 48 native GPU
views each (144 total); Lantern's matched baseline was 5/48 bad frames. The
post-fix moving-world high-quality repeat samples 867 frames without non-finite
HDR values; Smooth samples 908 output frames without rendering errors. The
12.3-second delivered film records real Prism/Void bites, retained rear-follow,
and an early sprint escape (health 100). Side observation cameras in its first
two cases are labelled; the escape uses the normal follow camera. Pause freezes
simulation time.

Local production and public production each pass six Guide/start/ability/pause/
Home cases across English 1440 px and Chinese 390 px desktop touch emulation,
with successful color loading, no browser errors, no production debug hook and
same-address reload onto `index-SvHfoWXk.js`. The first public cold-navigation
attempt timed out during concurrent bulk artifact fetching; that failed receipt
is retained in `public_initial_timeout/`, and the isolated retry passed. This
is not a loading-speed benchmark. All **665 artifacts / 176,341,139 bytes**
match dist, restricted localhost and public preview; 11 source/private paths
remain denied per origin. The four service identities are unchanged. The final
encoded clip was decoded and visually inspected. Of the 1,694 preceding source
inputs, only the explicitly recorded repair/docs paths changed; two new offline
repair/test files bring the count to 1,696. Main/Pages remain unchanged and this
candidate awaits user review.
