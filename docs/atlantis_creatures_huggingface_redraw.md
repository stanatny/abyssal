# Atlantis creature redraw — 2026-10-21

Current status: batches 1 and 2, including the Spadefish swimming repair, are
accepted for local checkpoint. Batch 1 is `267d4d0`; the second checkpoint
follows the user’s “提交吧，下一批”. Earlier pending/rejected labels keep their
historical scope. Formal main/Pages remains v0.11.15.

## Batch 1 scope and historical status

The user requests bounded Hugging Face redraw batches for Atlantis and explicitly
excludes already improved creatures and scenery. The current AI agent works alone
on `art/atlantis-hf-redraw`, based on main `3aef21e` / v0.11.15. This first batch
contains Blue Shark, Swordfish, Helicoprion and Ichthyosaur. These are candidates
for individual visual review, not accepted or committed changes. Formal Pages
remains v0.11.15; no commit, push, tag or release is authorized by this task.

The source inventory distinguishes shared runtime assets from region-specific
names. Atlantis has 20 ordinary creature kinds. Thirteen already consume the
accepted Hawaii HF factories: Sardine, Sunfish, Tuna, Ray, Octopus, Plesiosaur,
Pliosaur, Mosasaur, Basilosaurus, Megalodon, Ichthyotitan, Moon Jelly and Spiny
Lobster. Its three lord placements use the already improved Kraken. All four
playable characters are shared accepted assets. None is redrawn here.

After these four candidates, the remaining ordinary creature candidates are
Spadefish, Seahorse and Cuttlefish; the regional Pearl Nautilus is a separate rare.
Scenery is a separate inventory: Atlantis has its own architecture, fleet,
underways, Poseidon temple, twelve key sites and conch hazards. Existing accepted
layout/model revisions must be checked before selecting any scenery batch; a
shared Hawaii ship name is not proof that Atlantis uses that ship's asset.

## References and interpretation

Primary references reviewed for this batch:

- [Florida Museum: Blue Shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/blue-shark/): slender body, pointed snout, long pectoral fins and blue dorsal surface.
- [NOAA: North Atlantic Swordfish](https://www.fisheries.noaa.gov/species/north-atlantic-swordfish) and [Florida Museum: Swordfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/swordfish/): flattened bill and adult anatomy, without sailfish pelvic streamers.
- [Idaho State University: Helicoprion reconstruction](https://www.isu.edu/news/2013-spring/idaho-state-university-researchers-solve-mysteries-of-ancient-shark-w-spiral-toothed-jaw-results-published-in-royal-societys-journal-biology-letters.html): the tooth-whorl belongs in the lower-jaw midline, not an external mechanical saw. Body, soft tissues and coloration remain an artistic reconstruction.
- [Natural History Museum: Ichthyosaurs](https://www.nhm.ac.uk/discover/what-is-an-ichthyosaur.html): marine reptiles with four flippers and fishlike bodies. This game's generic Ichthyosaur is not a claim of one exact fossil species.

Original project concept images were generated and then uploaded to HF, not
third-party reference photographs. The first Helicoprion concept looked like an
ordinary shark and was rejected before inference. Raw concepts, revised prompts,
exports and failures are retained in ignored evidence.

## Actual generation and preparation

The service was `microsoft/TRELLIS.2`, Space revision
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; model
`microsoft/TRELLIS.2-4B`, revision
`af44b45f2e35a493886929c6d786e563ec68364d`. Both cards reported MIT on this check.
Four actual textured GLBs were downloaded and verified; successful seeds are
742101 / 742102 / 742103 / 742104 for Blue Shark / Swordfish / Helicoprion /
Ichthyosaur. Generation and source textures used 1024 resolution.

The authenticated Pro quota was checked at 08:36 UTC: 2400 seconds remaining,
zero overage. At 09:28 UTC it was 2279.3682 seconds, zero overage, with the service
reporting reset at 2026-10-22 08:42:16 UTC. These are dated receipts, not a future
balance guarantee. Session cancellation, TLS and partial-download failures were
retained. The successful Ichthyosaur session was exported without re-inference;
the Helicoprion export was resumed and verified without re-inference. No paid
overage or credential/account changes were used. Private export URLs and session
identifiers stay out of tracked files.

Preparation scripts simplify the actual generated surfaces, normalize the measured
head axis to -Z and catalogue length to one, unwrap new UV charts and transfer
colors from the original high-resolution mesh. The Swordfish atlas rejected five
near-degenerate sliver triangles; only those below the recorded small-area limit
were removed. Larger invalid charts cause an error. This avoids a cross-chart
color smear instead of hiding it with roughness or emission.

Two bounded, offline anatomy corrections follow generation:

- Blue Shark: the generated pectorals had unequal neutral sweep. Retain the good
  half, clip continuously at the centerline and mirror original surface/UV/color.
- Helicoprion: narrow the generated lower-jaw tooth mass into a sagittal blade,
  with continuous falloff and inverse-transpose normal transport. Preserve its
  deep fleshy jaw and generated texture; do not add a detached spinning wheel.

The other raw meshes retain their generated forms after conversion. Runtime code
uses one shared geometry/material per kind, independent 8-bone skeletons for the
three fish and a 10-bone skeleton for Ichthyosaur. Tail-driven lateral waves are
separate from restrained fin trim; all four flippers on Ichthyosaur have fitted
supports. Motion uses the existing accumulated phase and smoothed effort. No
new clock, steering rule or gameplay state is introduced.

## Cost and behavior boundaries

| Kind        | Catalogue length / population | Vertices | Triangles before → candidate | Isolated draws before → candidate | Mesh JSON / WebP bytes |
| ----------- | ----------------------------- | -------- | ---------------------------- | --------------------------------- | ---------------------- |
| Blue Shark  | 3.8 m / 7                     | 7,300    | 8,660 → 7,886                | 9 → 1                             | 220,043 / 177,258      |
| Swordfish   | 4.2 m / 6                     | 7,981    | 8,160 → 6,427                | 7 → 1                             | 243,978 / 167,634      |
| Helicoprion | 6 m / 8                       | 12,381   | 7,692 → 8,974                | 8 → 1                             | 370,268 / 182,920      |
| Ichthyosaur | 10 m / 8                      | 8,507    | 8,060 → 8,000                | 11 → 1                            | 269,180 / 146,442      |

The new textures add download and GPU surface cost; fewer draw calls are not a
claim of lower heat or universally higher FPS. Guide and game have separate WebGL
contexts. A populated 561-entity scene was rendered at four matched fixed views:
calls fell 190→182, 214→208, 216→209 and 190→180 respectively. Helicoprion's visible
triangle count increased by 1,282. These are rendering-count comparisons, not a
controlled frame-time benchmark; cumulative renderer memory in that fixture also
includes the deliberately retained baseline models.

Only the four factory dispatches and their new appearance assets change. Catalogue
sizes/populations, terrain, contact rules, movement, food, rewards, keys, lord
logic, languages and accepted models remain unchanged.

## Verification and evidence

Evidence root: `.local/atlantis_batch1_20261021/`.

- `inventory.json` and `baseline_source_hashes.json`: actual consumers and clean-main input baseline.
- `preflight.json`, `quota_after.json`, per-kind generation/export receipts: dated service and generation evidence.
- `*_raw_views_*`, `converted/`, `review/`: actual raw textured/clay views, conversion measurements and matched baseline/candidate views. The pre-fit Helicoprion view remains separate.
- `focused.log`: 28 focused checks, including actual appendage vertex travel, seamless duplicated UV vertices, finite normals/unit skin weights, frozen pause, culling, instance isolation, atlas charts and catalogue contracts.
- `full_test.log`: fresh 1,513 tests pass.
- `native/report.json`: normal Guide entry, repeated three-region switches, shared material/geometry identities, real NPC displacement, turning and pause; 87 audited evicted skeletons release their bone textures. A preceding two-region run retained 29 instances correctly under the one-inactive-region cache; it is recorded as a cache observation, not a leak or successful eviction test.
- NPC clips use an invulnerable staged player and an observer camera. NPCs move through normal ecology; they are not pinned each frame. This is not a natural-progression or physical-phone test.

## Final delivery verification

- `unchanged_consumers.json`: all 21 retained creature/player/Kraken consumers
  preserve geometry attributes and 180 poses exactly against the immediate baseline.
- `motion/`: four nine-second Guide clips, cruise → higher effort → cruise.
  `material_recovery.json`: all four failed textures retain colored geometry,
  then recover through the actual Guide retry button. The first recovery fixture
  incorrectly expected a reopening inside the ten-second backoff to retry; its
  timeout is preserved, and no runtime workaround was added.
- `world_clear/`: a second observer recording uses a staged 30 m invulnerable
  player to reduce predator crowding. Every NPC still moves and turns naturally;
  the short delivery excerpts precede ordinary player-distance culling.
- Final encoded clips and sampled beginning/middle/end frames were inspected.
  `delivery/motion.mp4` presents isolated animation; `delivery/world.mp4` presents
  actual world displacement. Neither is a concept-image animation.
- `public/report.json`: all eight English desktop / Chinese 390 px Guide and
  native start/ability/pause/Home flows pass, same-address refresh selects the new
  entry, all four color textures load, and no browser errors or production hooks
  occur. The narrow screen is desktop touch emulation, not a physical phone.
- `artifacts.json`: all 215 current build files (62,322,024 bytes, including
  precompressed variants) match dist, restricted localhost and public HTTPS
  byte-for-byte. Eleven source/private/listing paths are denied on each origin;
  tunnel readiness and existing process identities pass.

Preview: https://saver-recorded-digit-could.trycloudflare.com/ . Entry:
`index-BgcZXvmy.js`. Refresh the original address, choose Ruins of Atlantis, and
use Ocean Predators / Ancient Giants in the Guide. User acceptance remains open.

The existing processes are retained: DEV35213/5188, restricted23118/7188,
awake23120, tunnel35419/20248. Logs and identity checks remain under
`.local/mini_preview_20261007/`; `manage.py status` reports them and `manage.py
rebuild` updates the same restricted origin. The prior runtime is archived as
`runtime_before_20261021_173854`. No Vite/source/debug exposure, service restart,
commit, push, release or personal Skill edit was performed.

Four 1024×1024 color maps add approximately 21.3 MiB of uncompressed RGBA mip
storage per WebGL context if all are uploaded; this is a format-based estimate,
not a driver-memory measurement. Actual region/Guide identity checks establish
reuse and bounded instance disposal, not physical-device thermal performance.

## User acceptance and local checkpoint — 2026-10-21

Accepted Atlantis first-batch checkpoint — 2026-10-21: the user says “可以，提交吧，下一批”, accepting Blue Shark, Swordfish, Helicoprion and Ichthyosaur and authorizing their local commit. All 1,103 delivered input hashes match before these acceptance notes. Recorded 1,513-test/native/public evidence retains its unchanged-input scope; no new test run is implied. The current AI agent continues independently with Spadefish, Seahorse, Cuttlefish and Pearl Nautilus. Preserve accepted assets, gameplay and services. New candidates require user review; no push or formal release is requested.

The acceptance applies to the four first-batch assets above and supersedes their earlier pending/no-commit labels. The next four remain a separate review batch. `acceptance_hash_check.json` records the pre-documentation match.

## Batch 2: Spadefish, Seahorse, Cuttlefish and Pearl Nautilus — 2026-10-21

The user accepts batch 1 and requests its commit followed by the next batch.
Commit `267d4d02553bf9b08dde0ebd7b0c9af67464a3cc` contains the four accepted
predators; all 1,103 delivered inputs matched before acceptance notes. This
second batch adds the three remaining Atlantis ordinary kinds plus its regional
rare. All 20 ordinary kinds now consume accepted shared/first-batch appearances
or these three new candidates. Pearl Nautilus is not counted as an ordinary fish.
Players, Kraken and scenery are excluded. This does not imply that all Atlantis
scenery has been redrawn. The new four await individual user review; no automatic
commit, push or release.

### Reference and generation

Original concept images were generated for this project, then all four were
actually inferred and exported through Hugging Face `microsoft/TRELLIS.2`.
Space/model revisions and MIT cards match the dated first-batch record. Seeds
742201 / 742202 / 742203 / 742204 identify Spadefish / Seahorse / Cuttlefish /
Pearl Nautilus. All four raw textured GLBs were downloaded and header/size/hash
validated before closing the Gradio clients. No third-party reference image was
uploaded. The concepts are planning inputs, not the delivered game models.

At 09:58 UTC the Pro account had 2,279.3682 of 2,400 included GPU seconds remaining;
the final Pearl Nautilus export receipt records 2,114.87852 remaining and zero
overage. The service reported reset at 2026-10-22 08:42:16 UTC. These are dated
service receipts, not a guarantee about later available quota. No extra payment
or account change was made. An early raw-inspection fixture requested Pearl's
file before download completed; its timeout is retained, then inspection was
rerun after successful download, without repeating inference.

Primary references and project interpretation:

- [Florida Museum: Atlantic Spadefish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/atlantic-spadefish/) informs the deep, laterally compressed body, dark bars and extended dorsal/anal fins.
- [MarLIN: Short-snouted Seahorse](https://www.marlin.ac.uk/species/detail/1788) informs the upright bony-ringed trunk, short snout and coiled prehensile tail. The trunk remains quiet while the small dorsal/pectoral fins move.
- [Monterey: Common Cuttlefish](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/common-cuttlefish) informs the mantle-side fin skirt and soft arm crown, with staggered fin undulation rather than fishlike tail beating.
- [Monterey: Chambered Nautilus](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/chambered-nautilus) and [cephalopod overview](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/cephalopods) inform a rigid external shell and many soft cirri. Pearl Nautilus remains a fantasy regional rare: its pearl coloration, existing 1.8 m catalogue length and movement are game adaptations. The generated visible cirri are not a scientific reconstruction of every natural tentacle.

### Integration and rejected conversion

`prepare_atlantis_batch2_hf_asset.mjs` normalizes measured forward to -Z,
Seahorse's upright height to one and the other catalogue lengths to one. It
simplifies the real HF surface and uses the existing offline UV-rebake tool to
transfer source colors into independent padded charts. Textures are sRGB and
use the existing retryable material preparation; ordinary world entry starts
loading automatically. Failed loads preserve species-colored geometry.

The first Cuttlefish and Pearl Nautilus simplifications lost thin-detail quality;
they were rejected. The final conversion uses a tighter error bound and locked
boundaries, retaining more triangles in their fins/cirri. The offline Nautilus
cleaner removes 152 triangles from 15 tiny disconnected distal fragments. It
keeps the main shell/body and complete connected cirri. Thresholds and source
hashes are reproducible; no runtime mask, glow or roughness hides broken geometry.

Spadefish uses a continuous tail chain with restrained pectoral trim. Seahorse
keeps its torso upright and nearly rigid, with dorsal/pectoral motion and subtle
tail-tip movement. Cuttlefish has seven independent fin controls on each side
and four soft arm-crown supports. Nautilus deforms only its soft parts; actual
shell vertices remain invariant. Each instance owns its skeleton and phase/effort
state, while geometry/material/texture are shared. The existing animation clock,
entity movement and pause govern all four; there is no extra RAF or gameplay rule.

### Cost and scope

| Kind           | Catalogue size / population | Vertices | Triangles before → candidate | Isolated draws before → candidate | JSON / WebP bytes |
| -------------- | --------------------------- | -------- | ---------------------------- | --------------------------------- | ----------------- |
| Spadefish      | 0.75 m / 138                | 3,804    | 2,948 → 2,790                | 7 → 1                             | 114,626 / 283,052 |
| Seahorse       | 0.15 m / 8                  | 6,495    | 17,656 → 5,492               | 7 → 1                             | 200,820 / 323,398 |
| Cuttlefish     | 0.5 m / 8                   | 19,939   | 12,992 → 15,184              | 14 → 1                            | 601,052 / 331,228 |
| Pearl Nautilus | 1.8 m / 1 regional rare     | 24,304   | 11,232 → 17,556              | 15 → 1                            | 728,201 / 340,194 |

Four 1024² RGBA mip chains are approximately 21.3 MiB per WebGL context if all
are uploaded, a format estimate rather than measured driver residency. Guide and
game are separate contexts. A populated 561-entity scene at four matched fixed
views records draw calls 250→127, 212→116, 246→125 and 101→87. Visible triangles
are respectively 696,202→685,568, 645,642→631,108, 706,018→695,362 and
496,158→502,482. This fixture retains comparison objects; cumulative memory is
not a leak or a whole-device measurement. The count reductions do not establish
frame-time, phone thermal or M4 power improvements.

Only four appearance dispatches/new assets and their tests change. Catalogue,
actual sizes/populations, movement, food/rewards, rare discovery/capture/blessing,
terrain, keys, lord combat, UI translations and accepted models remain intact.

### Fresh verification

Evidence: `.local/atlantis_batch2_20261021/`.

- `focused.log`: 48 targeted checks. Actual appendage vertices, UV-duplicate seam continuity, finite normals/unit weights, pose culling, independent state, frozen phase/pause, atlas charts and rigid shell are checked.
- `unchanged_consumers.json`: 22 retained creature/player/Kraken consumers preserve geometry and 180 poses exactly against the immediate committed baseline.
- `native/report.json`: 12 normal Guide selections and three rounds of Atlantis/Hawaii/Bermuda switching. Atlantis has 155 new instances among the unchanged 561 entities; the other two maps have zero. All 465 audited evicted skeletons release their bone textures; shared geometry/color identities remain stable. The four Guide models remain cached and reused.
- `material_recovery.json`: all four failed texture requests show colored geometry, then recover through the actual Guide retry button.
- `review/`: matched baseline/candidate textured and clay views from six directions, plus stronger-effort and final cleaned Nautilus views.
- `motion/`: four nine-second isolated Guide clips, cruise → stronger effort → cruise. `world_clear/` records actual ecology displacement, turning and frozen pause for all four; the Pearl rare's existing rainbow marker remains visible. An invulnerable staged player and an observer camera aid inspection; entities are not pinned or driven frame-by-frame. These are not natural-progression or physical-phone tests.
- Final H.264 clips were decoded and sampled across beginning/middle/end. `delivery/motion.mp4` shows isolated animation and `delivery/world_clear.mp4` shows actual world movement; no concept-image animation is substituted.

### Production and delivery verification

- `artifacts.json`: all 227 build files (66,139,851 bytes, including compressed
  variants) match dist, restricted localhost and public HTTPS byte-for-byte.
  Eleven source/private/listing paths are denied on each origin. Existing
  process identities and Cloudflare readiness pass.

- Fresh `full_test.log`: all 1,523 tests pass after the test-contract migration.
  Formatting and the production build also pass.

- The first full run found two historical assertions expecting ten/twelve separate
  procedural arm meshes. `tentacle_motion.test.js` now preserves both test cases
  against the integrated HF skin: 720 poses, finite/cullable actual vertices,
  shared-buffer immutability, independent second instance, frozen pause and
  idempotent local bone-texture disposal. The original failure log is retained;
  no runtime change was made to bypass it.
- `public/report.json`: all eight English desktop / Chinese 390 px Guide and
  native start/ability/pause/Home flows pass, all four textures load, same-address
  refresh selects `index-sNPqcheI.js`, and no browser errors or production hooks
  occur. The narrow screen is desktop touch emulation, not a physical phone.
- `source_preservation.json`: 1,096 of the 1,103 prior inputs are byte-identical.
  Only the four project entry/review documents, the appearance factory dispatch,
  and two adapting test files differ. Every previously existing model asset is
  unchanged. New source/converter/test/assets are separately listed by git.

Preview: https://saver-recorded-digit-could.trycloudflare.com/ . Refresh this
same address, choose Atlantis, then Small Fish & Shoals for the first three and
Regional Rares for Pearl Nautilus. First-batch local commit is `267d4d0`; this
second batch is uncommitted and awaits user visual acceptance. Formal main/Pages
remains v0.11.15 / `3aef21e`.

DEV35213/5188, restricted23118/7188, awake23120 and tunnel35419/20248 are retained.
`.local/mini_preview_20261007/manage.py status` reports their identities;
`manage.py rebuild` updates the same restricted origin and preserves old logs
and assets. This update archives `runtime_before_20261021_183116`. No service
restart, Vite/source/debug exposure, push, release or personal Skill edit.

### Spadefish swimming follow-up — 2026-10-21

The user rejects the second-batch Spadefish motion as unnatural. Earlier test
passes do not close this visual feedback. The current agent independently keeps
the same HF mesh/texture and changes only this species' binding and local pose.
Other second-batch candidates remain pending individual review.

The diagnostic weight render identifies a concrete defect: the chest-fin mask
extends below the body and assigns pectoral motion to pelvic-fin tips. Across
an 18-second matched cycle, those pelvic samples move as much as 0.03212 of body
length (about 2.41 cm at the unchanged 0.75 m catalogue length). The repaired
729 sampled pelvic vertices stay anchored. The 853 sampled forward-body
vertices remain stable in both versions; the previous body-drag suspicion was
not confirmed in those samples.

The tail also has a slow generic clock, about 0.4 Hz at Guide-like effort and
0.8 Hz at the higher inspection effort. Species-local continuous phase now gives
about 0.8 and 2.2 Hz in the same five-second sampled windows, returning to 0.8 Hz
without a snap. These are expressive game settings, not measured biological
frequencies. Chest fins row laterally with less vertical lift. Two supports let
the soft dorsal and anal fins follow gently, while the rear-body bend begins
behind the broad torso and the entire tail fan stays on one terminal support.

The [National Aquarium's Atlantic Spadefish profile](https://aqua.org/explore/animals/atlantic-spadefish)
supports the deep, compressed body and long fins. It also describes juvenile
sideways debris mimicry; this repair does not claim that all sideways poses are
biologically wrong. The rig is a game adaptation, not motion capture. A Florida
DHR San Pedro video page was found, but the embedded video could not be retrieved;
no unviewed footage is used as motion evidence.

Fresh evidence is isolated in `.local/spadefish_swim_20261021/`:

- `comparison/` and `motion/`: the immediate reported HF version and candidate
  share camera, lighting, size, seed and factory clock. The 18-second clip shows
  cruise, stronger effort and release; the old procedural model is not used as
  the before version. Textured/clay, side/front/top/underside views and final
  encoded samples were inspected.
- `world/report.json`: normal ecology movement over 12 seconds changes world
  coordinates by spans of 4.03/0.97/2.68 m, turns and freezes on pause. The
  observer camera follows the NPC; an invulnerable player is staged once, with
  no per-frame entity pinning or replacement movement.
- `audit.json`: actual pelvic/head/fin/tail deformation and sampled cadence.
  Geometry stays at 3,804 vertices and 2,790 triangles with one draw. Bones rise
  from 7 to 9; both skeletons still allocate a 1,024-byte bone texture. This
  small additional pose cost is not a device-performance improvement claim.
- `focused.log`: 33 targeted checks, including actual pelvic isolation,
  lateral chest motion, continuous speed transitions, seam consistency,
  culling, independent instances and local skeleton disposal.
- `unchanged_consumers.json`: all 25 retained consumers preserve geometry and
  180 poses exactly, including Seahorse, Cuttlefish and Pearl Nautilus.

Gameplay, AI/movement speed, length/population, material/texture, other species,
formal main/Pages and existing services are preserved. No new HF inference,
commit, push or personal Skill edit. This revision awaits the user's visual
review; desktop narrow-view checks are not physical-phone evidence.

#### Follow-up delivery checks

- `full_test.log`: all 1,525 tests pass; formatting and rebuild pass.
- `native/report.json`: three Guide reopens and three Atlantis/Hawaii/Bermuda
  cycles preserve shared geometry/texture identities. All 414 audited evicted
  Spadefish skeletons release their private bone textures. The populated
  561-entity fixed view is unchanged at 127 draw calls / 685,568 triangles.
  Cumulative texture counts include both comparison populations and first-use
  uploads; they are not a device-memory or leak measurement.
- `public/report.json`: English 1440 px and Chinese 390 px Guide/start/ability/
  pause/Home pass. Same-address refresh loads `index-Cl6MieIc.js`; the production
  debug hook is absent, and there are no browser/resource errors.
- `artifacts.json`: all 227 build files (66,140,311 bytes) are freshly downloaded
  from both restricted localhost and public HTTPS and match the local build.
  Eleven source/private/listing paths are denied on both origins. Service
  identities and tunnel readiness are unchanged.
- `source_preservation.json`: 1,110 of 1,116 immediate-baseline inputs are
  identical. Only this review, the three project entry documents, the small-HF
  factory and its targeted test differ. All existing model/texture assets are
  byte-identical, as are the other runtime files.

The same preview URL serves this candidate. Rebuild retains the previous runtime
as `runtime_before_20261021_191906`; no process was restarted. The encoded
18-second before/after and 12-second world clips were decoded and sampled for
visual review. User acceptance remains pending.

## Accepted second-batch checkpoint — 2026-10-21

Accepted Atlantis second-batch checkpoint — 2026-10-21: the user says
“提交吧，下一批”, accepting Spadefish (including its swimming follow-up),
Seahorse, Cuttlefish and Pearl Nautilus and authorizing their local commit.
All 1,116 delivered inputs match before these acceptance-only notes. The
recorded 1,525-test/native/public checks retain their original evidence scope.
The current agent continues independently with the next unredrawn Atlantis
batch. No push/main publication is requested; new candidates require review.

The user acceptance supersedes the earlier pending/rejected status for these
four delivered candidates only. `acceptance_hash_check.json` records the
unchanged input check; no new visual or device test is implied.
