# Atlantis creature redraw — batch 1, 2026-10-21

## Scope and status

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
