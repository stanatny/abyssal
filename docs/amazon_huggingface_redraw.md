# Amazon Hugging Face redraw — 2026-10-25

The user authorizes the next regional redraw after the Developer-directory
cleanup, beginning with the three abyss lords. This candidate is developed by
the current agent alone on `art/amazon-hf-redraw`, based on main
`591f357c21447f917e57b545ccc9ce8d0854fb71` / v0.11.18. It awaits appearance
acceptance; there is no commit, push or formal-release change in this task.

## Scope and remaining inventory

- **Thunderbarbel / 雷须鲶王:** broad armored catfish head, forked tail, six
  fitted moving barbels and an independently charged barbel-tip surface.
- **Yacumama / 雅库玛玛:** olive, dark-spotted river serpent, continuous long
  body and a travelling lateral wave with a stable head.
- **Rootjaw Sovereign / 根颚君王:** crocodilian jaws, root-like bony crest and
  dorsal armor, webbed feet held alongside the body during tail-driven swimming.

The three kinds retain their 46/57/49 m lengths, 210 HP, original volley/vortex/
charge rules, damage, attack gates, timings, homes and navigation. Contact
samples follow the replacement skin. Their silhouettes and corresponding solid
anatomy change with the art; this is not a claim of bit-identical hit volumes.
Existing sounds and attack effects remain active, with volley emission anchors
fitted to the new catfish head.

The four accepted player models remain unchanged. Twenty ordinary Amazon kinds
remain for subsequent review batches: Neon Tetra, Amazon Discus, Silver
Hatchetfish, Armored Cory, Amazon Pacu, Silver Arowana, Arapaima, Redtail Catfish,
Amazon River Turtle, Red Piranha, Electric Eel, River Stingray, Black Caiman,
Green Anaconda, Saltwater Crocodile, Titanoboa, Purussaurus, Stupendemys, Flood
Arapaima and Rootback Colossus. The separate regional rare, Jade Arowana
(`jade_arowana`), also remains for a later batch. Shared accepted assets should be reused when
inventorying birds, people and scenery; those are not counted as completed by
this lord batch.

## References and portrayal

These are fantasy guardians, not zoological reconstructions. Original concept
illustrations were generated for this task; no third-party image was submitted
to the model service. Anatomical references informed silhouette and motion:

- [Smithsonian: Green Anaconda](https://nationalzoo.si.edu/animals/green-anaconda)
  documents olive/dark markings, aquatic adaptation and the Amazon distribution.
  The exaggerated guardian size and vortex remain game adaptations.
- [Australian Museum: Estuarine Crocodile](https://australian.museum/learn/animals/reptiles/estuarine-crocodile/)
  describes broad jaws, dorsal osteoderms, muscular tail and webbed feet.
  Rootjaw's root crown and Amazon mythic identity are original designs.
- [Florida Museum: Channel Catfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/channel-catfish/)
  provides a catfish anatomical comparison, including sensory barbels. It is
  a North American species, not the identity of this invented Amazon lord.

## Generation and reproducible processing

The actual service is [Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2),
using the [MIT-labelled model](https://huggingface.co/microsoft/TRELLIS.2-4B).
The model license does not certify rights to arbitrary inputs. This batch uses
its own original references and retains their hashes with private receipts.

All three GLBs were generated, exported, downloaded and parsed. Thunderbarbel
seed 745001 produced 3,813,636 bytes; Yacumama seed 745002 produced 3,237,248 bytes;
Rootjaw seed 745004 produced 3,777,212 bytes. Rootjaw's first generation returned
`CancelledError`; its second attempt completed. No procedural stand-in is
reported as a successful HF export.

The generator used 1024 resolution, 12 steps at each stage and a 100,000-face /
1024-texture export request. The included quota was checked before generation
and export against the service's dated 120-second reservation. At 08:44:26 BJT,
1298.041842 of 2400 included seconds remained, with zero paid overage and a
returned reset of 17:58:07 BJT on October 25. These are dated observations,
not a promise about later availability. The initial 08:18 reading was
1389.528455 seconds.

`scripts/prepare_amazon_lord_hf_asset.mjs` retains material-aware reduction,
per-asset measured orientation, uniform length normalization, new atlas baking
through `rebake_atlantis_hf_asset.mjs`, and final neutral-centerline correction
in `scripts/lib/center_amazon_lord.mjs`. Measured yaw is pi for Thunderbarbel,
-pi/2 for Yacumama and pi/2 for Rootjaw. An early wrong serpent axis was rejected
by the correction-envelope guard and never entered the game. UV projection
precedes neutral correction; normals receive the inverse-transpose correction.
Raw/converted/clay views remain in the ignored evidence folder.

`amazon_lord_asset.js` shares immutable buffers and retryable color preparations.
The new asset materials lift baked darkness slightly without changing scene
lighting or other creatures' materials. `creature_amazon_lords_hf.js` creates
independent skeletons, fitted fins/limbs/jaws and phase-clocked animation. A
front-foot/lower-jaw weight overlap found in posed review was removed. UV
seams receive identical weights. There is no added animation loop or per-frame
geometry allocation.

The interior-seal compatibility bake adds three geometry-keyed records while
all 626 prior records remain exact. The optional `--largest-solid` mode in
`prepare_creature_interior_hulls.py` keeps the connected core and uses a coarse,
closed marching surface. Direct simplification had pinched tiny appendages;
those rejected proxies were replaced by watertight 1,864 / 784 / 2,708-triangle
seals. This affects the invisible inside-body presentation, not skin or hits.
Export only the three new geometries with `creatureGeometryKey`, run that mode,
and merge the three new `hulls.json` records into the existing table; do not
replace unrelated records.

## Measured cost and lifecycle

Same native Chrome renderer and camera, isolated model draw counts:

| Kind          | Before / after draws | Before / after triangles | New bones | Mesh JSON + WebP bytes |
| ------------- | -------------------: | -----------------------: | --------: | ---------------------: |
| Thunderbarbel |               25 / 2 |          30,648 / 19,990 |        31 |              1,011,186 |
| Yacumama      |                4 / 1 |          24,092 / 17,996 |        20 |                663,345 |
| Rootjaw       |                4 / 1 |          29,304 / 24,000 |        20 |              1,188,985 |

The three new 1024-square colors add 763,104 compressed bytes, approximately
16 MiB of RGBA GPU storage including mipmaps per renderer context. CPU geometry
attributes total 4,234,542 bytes versus 7,585,436 in the isolated old models.
These model measurements do not establish whole-scene FPS, phone thermals or
loading-time improvements. The downloaded mesh data is an additional transfer
cost compared with procedural construction.

Map switches retain the encounter pool: the same three skeletons and shared
textures are reused. Explicit encounter disposal releases each skeleton once
and Thunderbarbel's owned charged material once, without disposing shared skin
buffers/materials. The next instance remains valid. The isolated interior pass
also successfully renders each new seal.

## Verification and evidence

All evidence is under `.local/amazon_lords_hf_20261025/` in Developer:

- `before/`, `final/`, `raw_review/`: matched camera/lighting and neutral-material
  inspections; final captures are rendered game meshes, not concept images.
- `targeted.log`, `interior_tests.log`, `full_tests_final.log`: focused weights,
  real posed surface/contact, pause, transition, ownership and full regression.
  Old procedural-only tests retain ordinary species; corresponding HF lord
  behavior moved to `tests/amazon_lords_hf.test.js` rather than being dropped.
- `source_regression.json`: all 20 ordinary Amazon kinds and all four player
  kinds have identical sampled surfaces over 120 slow/fast/braking poses each.
- `native/report.json`: six bilingual Guide entries, nine region selections,
  ordinary texture preparation and three real habitat attack recordings. Each
  lord completes hunt/windup/attack/recover twice. Pause freezes both transforms
  and bones. No browser errors were observed.
- `world_close/`: final closer observer recordings kept above the
  actual terrain. Earlier distant observer views intersected a riverbank and are retained
  as rejected delivery takes. No boss movement or attack state is pinned.
- `material_recovery.json`: each new color blocked, complete colored fallback
  retained, then recovered through the normal Guide retry control.
- `cost_lifecycle.json`, `asset_cost.json`, `interiors/hulls_report.json`:
  measured ownership/cost and closed proxy geometry.

Recordings stage an invulnerable adult and an observation camera; they show
actual encounter simulation, not natural progression or balance acceptance.
Desktop narrow-view checks are not physical-phone tests. Final public resource
and delivery results are appended below after the same-origin build is checked.

## Public delivery verification — 2026-10-25

All 1,699 tests pass after adding the three interior records; formatting and
production build pass. The build contains 507 files including precompressed
variants, totaling 131,724,626 bytes. Every file matches dist, the restricted
local server and the public Cloudflare origin byte for byte. Eleven source,
debug and private paths are denied at each origin. The production entry is
`index-TPzNcS2B.js`.

Native production Chrome passes six Guide/start/ability/pause/Home cases
(three kinds, English 1440 px and Chinese 390 px touch emulation). All three
color requests return 200, there are no browser/resource errors, the production
DEV hook is absent, and same-address refresh retains the expected entry. The
507-file total is stored build size, not the bytes downloaded on one playthrough.

The existing DEV 35213, restricted preview 23118, awake 23120 and tunnel 35419
process identities remain unchanged. The same restricted preview serves only
index/assets at <https://saver-recorded-digit-could.trycloudflare.com/>. Formal
Pages and remote main remain v0.11.18. Evidence: `artifacts.json`,
`public/report.json`, `source_preservation.json`, `final_fingerprints.json` and
`delivery/`. Of the 1,476 baseline files, 1,465 remain byte-identical; the eleven
changed existing files are the documented dispatch, seal data/tooling, migrated
regression tests and project notes. New asset/module files are listed separately
in the final fingerprint. The user has not yet accepted these three appearances.

## Rootjaw swimming follow-up — 2026-10-25

The user rejected the first candidate because its four limbs looked like a
terrestrial crawl underwater. The earlier screenshots, tests and delivery are
historical evidence, not acceptance of that posture.

The [IUCN Crocodile Specialist Group locomotion account](https://www.iucncsg.org/pages/Locomotion.html)
describes tail-powered swimming with limbs held against the body. Floating,
slow manoeuvring and diving can use different limb positions; the change does
not assert that every spread-limb pose is biologically wrong.
[Davenport and Sayer's observations](https://www.thebhs.org/publications/the-herpetological-journal/volume-1-number-8-december-1989/1206-06-observations-on-the-aquatic-locomotion-of-young-salt-water-crocodiles-crocodylus-porosus-schneider/file)
and [Seebacher et al.](https://doi.org/10.1071/ZO02036) also distinguish tail-driven
rapid swimming from low-speed limb use. These are anatomical references, not a
claim that a 49 m fantasy lord is an observed animal.

Large rotations of the old standing mesh pinched the shoulder/ankle surfaces.
Those trials were rejected, including the temporary geodesic-mask and dual-
quaternion experiments; none is part of the runtime. Instead, the original
concept was edited with the built-in image generator to retain the head, root
crown, dorsal armor and green/brown design while sweeping all four limbs back.
The derived concept and design brief are retained in the private evidence.
TRELLIS.2 seed **745013** produced a new **4,016,980-byte** GLB. It is a new
reconstruction, not a pixel- or vertex-identical modification of the old body.

The model was inspected from both sides, above, below, head-on and in clay.
The raw limb pose was already backward-facing. Its actual shoulder/hip, elbow
and wrist locations now drive modest adduction, rather than folding a standing
leg through a large angle. Palms trail the body in cruise and fast motion; the
limbs make only small balancing adjustments. The existing posterior wave and
speed-driven phase provide propulsion. The reconstructed lateral tail bend was
measured and straightened before rigging, using the optional measured-axis
input to the offline converter. The earlier models' default fitting remains
unchanged.

The replacement retains the **24,000-triangle** skin, one shared geometry,
one shared 1024 color texture, and independent skeleton ownership. Its updated
closed interior seal has **2,998 triangles** (previously 2,708), used only by the
existing interior-rendering path. No new light, animation loop, material layer
or runtime mesh-deformation pass was added. This is not a phone performance or
thermal measurement.

Evidence lives in `.local/rootjaw_swim_20261025/`:

- `before/` and `previous_assets/`: preserved first candidate and matching views.
- `rootjaw_concept.png`, `rootjaw_attempt_01/receipt.json`, raw GLB and `raw_review/`:
  actual generation/export/download and multiview inspection.
- `converted/`, `measured_axis.json`, `convert.log`, `interiors/`: conversion,
  source color rebake and updated interior topology. The neutral-axis file is
  applied to the zero-axis converted copy, never repeatedly to a fitted asset.
- `targeted.log`: **39/39** checks, including cruise/fast actual palm positions,
  continuous skin, posed contact, independent instances, pause and disposal.
- `other_lords.json`: Thunderbarbel and Yacumama have identical bone matrices and
  sampled deformed vertices against the previous builder over **240 poses each**.
- `world/report.json`: native Chrome, ordinary Rootjaw hunt/windup/attack/recover
  with actual position changes, turn and pause. A 30 m invulnerable player and
  observer camera stage the encounter; movement, homes and attack clocks remain
  the game's normal implementation. This is not an ordinary encounter-frequency
  measurement or physical-phone test.
- `motion/`: a separate controlled side/overhead cruise-fast inspection using
  the game's actual model factory. It does not claim world travel.

Fresh included quota was 1,298.041842 seconds before this follow-up generation
and 1,266.261463 seconds after export, with zero over-quota usage. These are dated
2026-10-25 receipts, not a promise of the current balance. No extra paid usage,
commit, push or main/Pages publication is authorized by this follow-up.

The follow-up also passes `npm run check` and all **1,699/1,699** tests.
`world_overhead/` repeats the actual encounter from a higher observation camera
so the bank does not obscure the attack in the delivery clip. The first
`world/` recording remains evidence, including its obstructed-camera interval.

The rebuilt restricted preview uses `index-BwgHht0i.js`. All **507 files /
131,877,548 bytes** match dist, the restricted local origin and the public
origin. Eleven source/configuration paths are denied at each origin; all four
service identities are preserved. `artifacts.json` retains the successful
verification. The initial bulk fetch saw TLS/HTTP2 closures and one HTTP 520;
its logs remain beside the bounded HTTP/1.1 retry, which reused only downloads
whose complete SHA-256 already matched this build. These connection failures
are not omitted from the evidence.

`delivery/rootjaw_swimming.mp4` is a fully decoded 22-second H.264 clip:
14 seconds of controlled side/overhead motion followed by 8 seconds of the
staged actual encounter. Matched side and overhead comparisons retain the same
camera, lighting and sampled animation time. The video was sent as Lark media
`om_x100b62e1a7b004a8c3cf91748cf2c3a`. User visual acceptance is still pending.

The first public browser attempt completed the three English cases, then saw
connection closures and the Chinese texture-retry fallback; it is preserved in
`public_first_attempt/`. After bulk downloads completed, the separate normal
Chrome rerun in `public_retry/report.json` passes **six cases**: all three lords
in English desktop (1440 px) and Chinese touch-layout emulation (390 px), with
native Guide/start/ability/pause/Home, loaded colors, no console or resource
errors, absent production debug hooks and same-address refresh to the new
entry. The 390 px run is desktop emulation, not a physical phone measurement.
Of the 1,488 pre-follow-up inputs, **1,477 remain byte-identical**; the eleven
changed files are limited to Rootjaw geometry/color/rig/seal, its offline fitting
and regression test, and project notes. `source_preservation.json` and
`final_fingerprints.json` record this scope. Formal main/Pages is unchanged.

## Rootjaw terrain and pitch follow-up — 2026-10-25

The user identifies a head entering the bank in the preceding delivery and asks
for the body to tilt when changing depth. This rejects that part of the previous
candidate; previous passing tests and video delivery do not establish acceptance
of terrain clearance. The swimming-neutral HF mesh, folded limbs, textures and
tail animation from the preceding turn are retained unchanged.

The failure was in world movement. Rootjaw had no full-body navigation contract;
only its centreline was checked against objects, then its centre was lifted
above the riverbed. Neither the long snout nor the tail constrained that height
correction. Lifting the centre could therefore produce horizontal climbing while
the visible head passed through a steep bank.

Rootjaw now opts into the existing `worldNavigation` path, with eight anatomical
probes and a 2 m allowance for animated skin. Actual final position and rotation
are checked together against terrain and static obstacles; an unsafe move is
rejected instead of lifting the body through the bank. Its visual and navigation
proposals share a 1.05 radian pitch limit (about 60 degrees), with the back above
the belly. Rotation is bounded to 2.4 radians/second, including attack-lock
changes, to prevent instantaneous flips. This rate is opt-in metadata; no other
lord sets it. Blocked charges now respect the body-sized space. Health, damage,
attack clocks, speeds, territory and home coordinates are unchanged, but terrain
can correctly obstruct a route that previously penetrated the bank.

Evidence is under `.local/rootjaw_terrain_20261025/`:

- The before source copies and `before/` retain the actual problem. Native
  sampled head clearance reached **-46.03 m** below the analytic riverbed.
  The matching final bank scenario reaches a minimum **+13.27 m** at sampled
  head vertices, with real movement over 40.75/20.52/63.84 m on X/Y/Z.
- `audit.json` exercises three 15-second bank/up/down encounters against the
  actual Amazon ocean and static colliders. Minimum sampled deformed-skin
  clearance is **10.66 / 13.44 / 8.77 m**; the maximum per-frame displacement is
  85/60 m and rotation is 0.04 radian at 60 Hz. Up/down pitches reach the bounded
  range instead of merely translating a level body. These are sampled scenarios,
  not proof of all possible terrain paths.
- `audit_initial_nav.json` preserves the intermediate failure: enabling probes
  and pitch alone still allowed abrupt attack-lock turns and a small tail scrape.
  The final allowance and bounded rotation address both. `audit_escape.json`
  moves the player back toward the home after 15 seconds: all three blocked
  encounters resume movement, covering another 77–131 m in five seconds.
- `tests/rootjaw_navigation.test.js` verifies deformed skin, turn continuity,
  actual depth changes, terrain obstruction/recovery and restart. The focused
  suite passes **60/60**, the full suite **1,702/1,702**, and formatting passes.
- `final_bank/` and `final_side/` are separate native Chrome world recordings.
  The player is staged at 30 m and invulnerable; only the observation camera is
  overridden. Normal AI, movement, attack phases and populated scenery run.
  Pause freezes the root and bones. All three cases have no browser errors.
  `final_pitch/` retains the earlier less-readable camera attempt.
- `delivery/rootjaw_pitch.mp4` combines ten seconds each of the final upward
  and downward encounter. Its full H.264 stream was decoded and sampled frames
  reviewed. It shows actual world travel, not a posed Guide model.

No new generation, texture, mesh, skeleton, light or render pass is introduced.
Eight existing-navigation probes add bounded CPU collision work for this one
lord; this is a correctness change, without a claimed phone or thermal gain.
No physical phone was tested. No commit/push or main publication is performed.

`rendered_ground.json` additionally raycasts the actual triangulated riverbed
beneath the lowest sampled skin point. Minimum rendered-surface clearance is
**10.62 / 13.42 / 8.73 m** for the three scenarios, consistent with the analytic
terrain checks. The matched bank comparison uses the same encounter setup,
camera offset and five-second timestamp; obstacle avoidance changes the route,
so the final world positions intentionally differ.

The final build entry is `index-C2baYvgu.js`. Source preservation compares the
immediate preceding candidate, including its uncommitted assets: **1,481 of
1,488** inputs are unchanged, with seven changes confined to the three runtime
files and four project notes, plus the new navigation regression test. No
unrelated asset or earlier batch is overwritten.

All **507 files / 131,877,873 bytes** in the new build match the restricted local
server and public preview byte for byte. Eleven source/configuration paths are
denied at each origin, the tunnel is ready, and all four service identities are
preserved. The build was updated without restarting those services. The actual
video was delivered as Lark attachment `om_x100b62e274d844a4de696982437eef8`;
comparison image delivery is `om_x100b62e2707d40a4c0c18471d2baf40`.

The final public Chrome run passes all **six** normal UI cases: the three Amazon
lords in English desktop and Chinese 390 px touch-layout emulation, loaded
Guide colors, start/ability/pause/Home, absent production debug hooks, and
same-address refresh to the new entry. There are no browser or resource errors.
This desktop emulation is not physical-phone testing. See `public/report.json`.

## Rootjaw charge-contact verification — 2026-10-25

The user accepts the riverbank/pitch correction conditional on attacks working,
and authorizes the next batch. A fresh native test exposed a contact mismatch:
physical collision separated the player from the HF body before the old
centre-line charge radius could hit. The native baseline completed an attack
without charge damage. Phase progression alone had not established damage.

Rootjaw now queries the same swept player capsule and posed solid core used by
movement, after the full-body navigation accepts the final pose. Relative
translation includes both participants' motion. It charges once per attack and
preserves occlusion, invulnerability, warning/lock/recovery, 42 damage, 85 m/s and
all other combat values. Rootjaw's generic contact cannot double-charge during
this attack; other lords retain their existing path. No extra collision volume,
fin blockade or moving-camera behavior is introduced.

Fresh checks at 20/60 simulation steps per second in the actual Amazon terrain
confirm 42 charge damage on contact, a successful locked-direction sidestep,
no damage behind supplied occlusion, and a complete second attack/recovery
cycle. The second charge can legitimately miss after the first collision moves
the participants apart. The native desktop game independently drops health from
100 to approximately 58 (ordinary regeneration resumes), with `phaseHit` true,
and remains pause-stable. The 20 targeted collision/navigation checks pass.
Evidence: `.local/amazon_batch2_20261025/combat_native_before.json`,
`combat_native/report.json`, `combat_scenarios.json` and `combat_tests.log`.
The appearance acceptance is recorded; this contact repair has not been
committed or pushed. Desktop evidence is not physical-phone testing.

## Batch 2: small river fish — 2026-10-25

The user accepts the preceding Rootjaw correction provided normal attacks work,
then authorizes the next batch. The charge-contact verification above completes
that condition. Four ordinary kinds now have actual TRELLIS.2 replacements:
Neon Tetra, Amazon Discus, Silver Hatchetfish and Armored Cory. These four new
appearances remain candidates awaiting user review. No commit or push is made.
The sixteen other ordinary Amazon kinds, Jade Arowana, the three lord skins and
four player models retain their preceding implementation. Earlier batch-1
statements about twenty remaining ordinary kinds describe that earlier state.

### Portrayal, generation and provenance

All four input concepts are original images generated for this task. No
third-party photograph was uploaded. The designs distinguish the neon stripe
and posterior red flank, laterally compressed discus and median fins, deep
hatchet-shaped chest with high pectorals, and Cory armor/barbels. Reference
observations inform the forms, while the existing game lengths, habitats and
movement remain adaptations:

- [University of Michigan ADW: Gasteropelecus sternicla](https://animaldiversity.org/accounts/Gasteropelecus_sternicla/)
  describes the compressed chest, high pectorals and posterior fins. Surface
  escape behavior is not a new flight mechanic in this batch.
- [UF/IFAS: Discus](https://ask.ifas.ufl.edu/publication/FA166) supplies species
  background for the discus design.
- [Seriously Fish: Paracheirodon innesi](https://www.seriouslyfish.com/species/paracheirodon-innesi/)
  is a specialist identification reference for the neon pattern; this is not
  a claim that a generated color map is a scientific reconstruction.

The same MIT-labelled Microsoft Space/model used in batch 1 is retained;
service revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`, model revision
`af44b45f2e35a493886929c6d786e563ec68364d`. All four first attempts complete
1024-resolution / 12-step generation and 100,000-face / 1024-texture export.
Each GLB is downloaded and parsed before its Gradio session closes.

| Kind               |   Seed | Original GLB bytes | Original GLB SHA-256                                               |
| ------------------ | -----: | -----------------: | ------------------------------------------------------------------ |
| Neon Tetra         | 745021 |          3,655,276 | `487e93c91eaf0f4317043e02764d4977ab04c30544fa78601188f1905fe07456` |
| Amazon Discus      | 745022 |          3,447,676 | `e4017473d355ea72a581a67b595468ec1b72cf4f54b67fa4915aa364e9b7b72e` |
| Silver Hatchetfish | 745023 |          3,454,300 | `b45dbefd94080fbd7039a6324eb5cd352be9c53bdc9adb9de80db0a8f6045e11` |
| Armored Cory       | 745024 |          3,822,244 | `2fe6cb020f747fe870b3b980b96b05224ac428a53c9f81e73be1a3448b67b6a1` |

At the 10:26:51 BJT preflight, 1,266.261463 / 2,400 included GPU seconds
remain. After the four exports, the last receipt records 1,132.533985 seconds,
zero paid overage, and a returned reset at 17:58:07 BJT on October 25. These are
dated service observations, not live quota promises. The generated-image
references and HF GPU allowance are separate services.

### Surface and motion integration

`prepare_amazon_small_hf_asset.mjs` performs material-aware reduction, measured
axis conversion, uniform unit-length normalization and padded UV rebaking
through the existing atlas workflow. Neon/Discus yaw is pi; Hatchet/Cory yaw is
-pi/2. Original colors are projected from the actual HF exports. No source mesh
is replaced with an unrelated procedural stand-in.

`amazon_small_asset.js` shares immutable geometry/materials and the existing
retryable SRGB color loader. `creature_amazon_small_hf.js` fits each species:
continuous caudal weights, one terminal support for the complete tail fan,
independent pectoral trim, and gentle discus dorsal/anal-fin motion. The discus
body stays stable; widening its pectoral-root blend removes a local compression
found during the posed-surface audit. No extra frame loop, geometry deformation
allocation, population change or swimming-physics change is added.

Each instance owns its skeleton and smoothed visual effort, with idempotent
local disposal. Game and Guide both select these models through the shared
factory. The 0.12 / 0.35 / 0.20 / 0.28 m lengths and 36 / 36 / 44 / 32 populations
remain unchanged. As before, small fish use the ordinary ecology animation
clock; inspection clips distinguish visual effort from actual world movement.

### Measured cost and verification

| Kind               | Old / new meshes | Old / new triangles | New vertices | Bones | Mesh JSON + WebP bytes |
| ------------------ | ---------------: | ------------------: | -----------: | ----: | ---------------------: |
| Neon Tetra         |           10 / 1 |      11,212 / 2,794 |        3,309 |     7 |                381,807 |
| Amazon Discus      |           10 / 1 |      13,824 / 3,794 |        4,610 |     9 |                502,608 |
| Silver Hatchetfish |           10 / 1 |      11,116 / 3,186 |        3,528 |     7 |                373,991 |
| Armored Cory       |           11 / 1 |      13,548 / 3,766 |        5,026 |     7 |                457,278 |

The four 1024-square color maps add 1,207,948 compressed bytes, approximately
21.33 MiB RGBA storage including mipmaps in each renderer context that uses all
four. Skeleton textures are per instance. Geometry and color reuse does not
mean the Guide and game share one GPU context.

Four matched populated-scene camera samples contain all 410 Amazon entities.
Old/new draw counts are 186/66, 364/140, 82/55 and 74/54; corresponding triangle
counts are 476,126/370,778, 767,010/554,598, 360,698/336,908 and 354,446/334,882.
These are renderer-cost samples, not measured phone FPS, CPU time or thermals.
They precede the final discus weight refinement, which changes neither mesh
counts, topology nor population.

Evidence is under `.local/amazon_batch2_20261025/`:

- Private receipts, original GLBs, raw colored/clay views and matched Guide
  captures establish actual exports and inspected surfaces.
- `targeted_final.log` covers fitted weights, actual posed vertices, bounded
  attachments, independent instances, pause, dimensions, source atlas and
  charge/navigation regression. `test_final.log` is the final full suite.
- `unchanged_models.json` compares the sixteen remaining ordinary kinds, rare,
  three lords and four players over sixty poses each with the immediate prior
  factory. All 24 retain exactly matching geometry/transforms/bones.
- `native/report.json` covers twelve normal Guide entries and nine map switches
  across Amazon/Hawaii/Atlantis. All 148 replacement fish share their per-kind
  geometry/texture, with independent skeletons. All 444 disposed skeletons
  across three cycles release their owned bone texture; shared maps persist.
- `material_recovery.json` aborts each color request, confirms visible fallback,
  then restores transport and uses the actual retry UI. All four recover.
- `motion/` shows fitted motion from the existing Guide scene. `world_clear/`
  records true ecology travel and turning against the river; `world_final/`
  repeats the refined discus. The observer camera and invulnerable distant
  player are staged, with no per-frame fish pinning. Pause freezes all rigs.
- `combat_native/` uses a staged 30 m player with invulnerability disabled and
  the actual Rootjaw attack state/damage, as described above.

Native verification uses desktop Chrome; narrow touch layout is emulation,
not a physical-phone test. This batch awaits visual acceptance separately from
technical checks. Remaining scope is sixteen ordinary kinds, the regional rare,
and the later surface/river scenery inventory.

The final focused run passes **31/31**, the complete suite **1,715/1,715**,
and formatting/build pass. The source-preservation audit finds **1,480 of
1,489** prior inputs unchanged. Nine changes are the intended combat/factory,
collision test and project notes; thirteen new files contain the four assets,
loader/rig/converter and focused tests. No previous asset is overwritten.

The final entry is `index-CTC8rMDg.js`. Eight fresh public Chrome cases pass:
four Guide entries in English desktop and Chinese 390 px touch-layout emulation,
normal start/ability/pause/Home, loaded colors, no browser/resource errors,
absent production hooks and same-address refresh. Public and local resource
hash results are recorded separately in `artifacts.json`; no physical phone
or other external device was tested.

Review images were delivered as Lark message
`om_x100b62e2b43620a0dd576fdc12c617a`. The actual river-motion video attachment
is `om_x100b62e2b2849ca8dfc0b8cbae598f2`; its explanatory message is
`om_x100b62e2b2e1d8a0de4db03b8f394e6`. Both final H.264 fish-motion clips and the
Rootjaw attack clip fully decode; sampled final frames are visually reviewed.

All **519 build files / 133,860,786 bytes** match the restricted local server
and public preview byte for byte. Eleven source/configuration paths are denied
at each origin, the tunnel is ready, and DEV 35213 / preview 23118 / awake 23120 /
tunnel 35419 retain their identities. The existing manager archives the old
runtime and replaces only the entry after the new hashed assets exist.
A final comment-language correction rebuild produces exactly the same 519
artifact hashes; only project notes change afterward. Runtime operating records
and rebuild/stop instructions remain in `.local/mini_preview_20261007/`.
The Rootjaw attack video attachment is `om_x100b62e2b05ea4a0c1b63a49e4114b4`.

## Batch 3: larger river fish — 2026-10-25

The user's “可以，下一批” accepts the preceding small-fish and verified-charge
candidate and authorizes the next four ordinary Amazon kinds. It does not
request a commit or push. Amazon Pacu, Silver Arowana, Arapaima and Redtail
Catfish now use actual TRELLIS.2 exports, rather than the earlier procedural
renderers. The previous three lords and small-fish batch remain intact.

### References and generation

Original concept images were prepared for reconstruction; no third-party
photograph was uploaded. Anatomy was checked against the Smithsonian
[Black Pacu](https://www.nationalzoo.si.edu/animals/black-pacu) and
[Arapaima](https://nationalzoo.si.edu/animals/arapaima) pages, the Barcelona
Aquarium [Silver Arowana](https://www.aquariumbcn.com/en/especies/tropical-river/silver-arowana/)
page and the USFWS
[Redtail Catfish species assessment](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Redtail-Catfish.pdf).
These support recognizable body/fins/barbels. The animations are fitted game
adaptations, not measured locomotion reproductions.

The included PRO balance was checked before generation and export. Receipts,
original concept images, downloaded GLBs and source hashes are retained in
`.local/amazon_batch3_20261025/`. Model revision and the Space revision are
recorded in `preflight.json`; no paid overage was enabled. The first Silver
Arowana export was rejected after a top/clay view exposed a folded dorsal
surface, independent of its texture. Its original export remains in attempt 01.

### Fitted surfaces and motion

The shared factory selects all four in both Guide and world. Conversion
preserves uniform normalized length, reduces topology with normal/UV-aware
error, then unwraps and rebakes color from the actual source. Original GLBs
remain available for comparison. One shared surface/material per kind replaces
the earlier multi-part renderer; each fish keeps its own disposable skeleton.

Pacu has a deep body, stable head and tail-driven motion with restrained paired
pectoral trim. Arowana uses a long posterior wave with separately supported
median-fin margins. Arapaima keeps its broad bony head stable while the rear
body and tail propel it. Redtail Catfish retains its broad head and six fitted
barbel chains; barbel weights exclude the mouth and pectoral tips. The latter
required an offline yaw and centerline alignment before binding. Fin-root
weight transitions were broadened after actual deformed-vertex inspection.

Existing ecology supplies phase and visual effort. These clips increase swing
strength without claiming a new speed/cadence or steering mechanic. Pause
freezes each rig. No population, food eligibility, combat, reward or movement
physics is changed: lengths remain 1.65 / 1.2 / 3.1 / 2.2 m and populations
32 / 36 / 36 / 36 respectively (140 individuals).

### Verification and delivery

Technical verification and visual approval are separate. This batch remains a
candidate for the user, with no commit/push. Desktop Chrome is the inspected
browser; 390 px touch layout is emulation, not a physical-phone measurement.
World captures use an observer camera and a distant invulnerable player while
fish move through the actual ecology; they do not pin fish every frame.

The accepted conversion inputs for this candidate are Pacu seed 745031,
Silver Arowana **attempt 02 / seed 745033**, Arapaima seed 745033 and Redtail
Catfish seed 745034. The second Arowana's top, bottom, clay and posed surfaces
are inspected separately. It has the original two barbels and needs no spur
removal. The converter's optional removal flag exists only to reproduce the
rejected first attempt. Its final post-export receipt records 984.061648 included
seconds remaining, zero overage, reset 2026-10-25 17:58:06.992 BJT; this is a
dated service result, not a promise of future available quota.

| Kind            | Old/new meshes | Old/new triangles | New vertices | Bones | Mesh JSON + WebP bytes |
| --------------- | -------------: | ----------------: | -----------: | ----: | ---------------------: |
| Amazon Pacu     |         10 / 1 |    13,824 / 4,792 |        6,019 |     7 |                475,953 |
| Silver Arowana  |         10 / 1 |    14,208 / 5,997 |        8,180 |    15 |                442,162 |
| Arapaima        |         10 / 1 |    13,632 / 5,928 |        7,362 |     7 |                437,757 |
| Redtail Catfish |         11 / 1 |    16,064 / 6,060 |        8,964 |    31 |                560,247 |

The four 1024-square color maps add 997,072 compressed input bytes and about
21.33 MiB RGBA/mipmap storage in each renderer context using all four. Lower
geometry/draw cost does not imply lower texture memory. Matching paused cameras
in the populated 410-entity scene show old/new draw counts 166/148, 66/57,
68/59 and 69/59. Triangle counts are 594,646/576,582, 394,294/386,083,
405,466/397,762 and 407,898/397,894. These are renderer samples, not phone
FPS/CPU/thermal measurements; unrelated resources may warm during inspection.

Evidence in the batch directory includes:

- `targeted_final.log`: 11 fitted-rig, real-vertex, seam, independent ownership,
  pause, source-atlas and population checks. `test.log`: 1,726/1,726 full tests.
  Formatting passes; source `unchanged_models.json` compares 24 untouched kinds
  over sixty poses each, including the previous small fish, lords and players.
- `review/`: matched old/new color, clay, top, underside and stronger-motion
  captures. `raw_review_retry/` preserves the second Arowana's raw inspection.
  `deform_audit.json` records sampled edge strain and face-normal direction
  changes for inspection, not a claim that each direction change is an inverted
  triangle or that every generated surface is anatomically exact.
- `native/report.json`: twelve normal Guide entries, nine region switches,
  shared per-kind geometry/color and independent skeletons. All 420 observed
  discarded world skeletons release their owned bone textures over three cycles;
  shared maps remain reusable. `material_recovery.json` passes four failed
  requests followed by successful retry through the actual Guide UI.
- `motion/`: 9-second fitted Guide motion per fish. `world_clear/`: six seconds
  of actual ecological travel/turning per fish and a stable pause. Only the
  observation camera and distant invulnerable player are staged.

Twelve ordinary Amazon species and the regional rare remain for later visual
batches; scene elements remain a separate subsequent inventory. The previous
batch's acceptance does not count as approval of these four new models.

The reviewed production entry is `index-DB62Txry.js`. Eight public native Chrome
flows pass in English desktop and Chinese 390 px touch emulation: Guide colors,
start/ability/pause/Home, no page/resource errors, no production debug hook and
same-address reload. The immediate source baseline retains 1,497 of 1,502
inputs exactly; only the shared factory and four project-note files change,
with twelve new files for the four asset pairs, loader/rig/converter and tests.
No earlier source asset is modified. Final fingerprint and served-resource
checks are recorded separately with this candidate's delivery evidence.

The two rendered comparison images were sent as Lark message
`om_x100b62e3c61a38acdfb43417dc56d61`. Both delivery H.264 clips fully decode;
sampled final frames, including ordinary river travel, are visually inspected.

All **531 build files / 136,244,756 bytes** match dist, the restricted local
server and the public preview byte for byte. Curl recovered transient transfer
failures during the artifact audit; the final assertions cover every file.
Eleven source/configuration paths are denied at each origin, the tunnel is ready,
and DEV 35213 / preview 23118 / awake 23120 / tunnel 35419 retain their identities.
No service is restarted. The previous runtime is archived by the existing
manager, with rebuild/stop instructions retained under
`.local/mini_preview_20261007/`. Project notes alone change after this build.

The actual river video attachment is `om_x100b62e3c4b084a0dd624ea698ae78d`, with
caption message `om_x100b62e3c49374a4dd5bed13aeff2f0`. The exact delivery record,
source preservation and final fingerprints are local evidence for continuation.

## Batch 4: piranha, eel, ray and river turtle — 2026-10-25

The user accepts batch 3 and requests the next group. Red Piranha, Electric Eel,
River Stingray and Amazon River Turtle now use four actual TRELLIS.2 exports.
Earlier Amazon work remains intact and uncommitted. This new group awaits user
appearance review; no commit, push, version bump or personal-Skill change is
part of this turn. Evidence stays under `.local/amazon_batch4_20261025/`.

### References, generation and fitted motion

Original concept images, rather than third-party reference images, are the HF
inputs. Anatomical sources and their limits are recorded with this batch:

- [Los Angeles Zoo: Red-bellied Piranha](https://lazoo.org/explore-your-zoo/our-animals/fish/red-bellied-piranha/)
  informs the compressed silver body and reddish underside. Tail-driven motion,
  restrained pectoral movement and the game's existing aggression are retained.
- [Smithsonian: Electric Eel](https://nationalzoo.si.edu/animals/electric-eel)
  describes the long anal fin used for forward/backward movement and hovering,
  without dorsal or pelvic fins. This is an Electrophorus reference, not a claim
  of species-specific measured kinematics for the game's E. voltai label. Eleven
  fitted ribbon supports carry a travelling wave separately from the quiet body.
- [Waikiki Aquarium: Freshwater Stingray](https://www.waikikiaquarium.org/experience/animal-guide/fishes/sharks-and-rays/freshwater-stingray/)
  supports dorsal eyes/spiracles and ventral mouth/five gill pairs for P. motoro.
  [The 2023 P. motoro muscle study](https://onlinelibrary.wiley.com/doi/10.1002/jmor.21548)
  distinguishes its undulatory locomotion from the oscillatory comparison ray.
  The fitted disc has front-to-back margin waves around a stable central body,
  with a separately supported tail. Frequencies/amplitudes are game adaptations.
- [National Aquarium: Giant South American River Turtle](https://aqua.org/explore/animals/giant-south-american-river-turtle)
  anchors the aquatic river-turtle identity. Four webbed feet paddle alternately;
  the carapace stays rigid. This is a qualitative fitted animation, not a measured
  P. expansa stroke reconstruction or a marine-flipper rig.

HF source receipts are Red Piranha attempt 02 / seed 745042, Electric Eel
attempt 02 / seed 745043, River Stingray attempt 01 / seed 745043 and River
Turtle attempt 01 / seed 745044. Their first piranha/eel jobs returned
`CancelledError`; successful retries are preserved separately. Four downloaded
GLBs are 3,636,588 / 3,386,464 / 3,572,080 / 3,525,168 bytes. None is a procedural
replacement presented as an HF result. The 11:40 BJT preflight recorded
984.061648 of 2400 included seconds; the last export receipt records
807.519120 seconds and zero overage, resetting at 17:58:06 BJT that day.
These are dated observations, not a current-quota promise.

`prepare_amazon_varied_hf_asset.mjs` reduces the actual meshes, rotates measured
axes (pi / -pi/2 / pi / zero), normalizes uniformly to unit length, and rebakes
source colors onto new UV islands. Raw clay, underside and both-side views are
retained. The ray's HF underside lacked mouth/gill details: the offline
`finish_amazon_ray_hf_asset.mjs` adds surface-fitted creases, and the local ray
material lightens its underside while preserving dorsal markings. This repair
adds one shared draw, 726 vertices and 1,100 triangles; it is explicitly local
finishing, not a claim that the original generation contained correct anatomy.

`amazon_varied_asset.js` caches immutable geometry and color preparation;
`creature_amazon_varied_hf.js` supplies independent rigs through the shared
Guide/world factory. Initial turtle weights stretched the hind-foot root and
clipped a forefoot by a coordinate mask. The fitted root, broader transition
and whole-foot coverage were corrected before the final videos. Actual sampled
maximum edge-length ratios decreased from 2.31 to 1.78. Edge/normal diagnostics
are inspection aids; face-normal sign changes alone do not establish inversion.
No new frame loop or per-frame geometry allocation is added.

### Compatibility and measured costs

Original lengths are 0.55 / 2.5 / 1.6 / 1.1 m and populations 8 / 6 / 5 / 24,
for 43 individuals. Region membership, movement physics, food/contact rules,
rewards, attacks and warning colors remain unchanged. A real river-scene test
observes the eel's yellow windup, one 12 m discharge, the existing 18 damage and
recovery. The fixture places the player nearby once, shortens only the initial
ability wait and hides unrelated fish for attribution; it does not pin entities
or replace the running attack logic.

The first full regression exposed missing geometry-keyed interior sections for
the three new predator meshes. Three closed proxies now preserve the existing
near-camera inside-body treatment, without changing visible skin or gameplay
contacts. All 629 prior topology records remain exact; 2,476 / 1,028 / 2,916
proxy triangles are added for piranha/eel/ray. Native inside/outside-camera
stress views confirm the pass activates without moving the camera. Their
artificial 36 m diagnostic scale does not change real species sizes.

| Kind                | Old/new meshes | Old/new triangles | New vertices | Bones | Mesh JSON + WebP bytes |
| ------------------- | -------------: | ----------------: | -----------: | ----: | ---------------------: |
| Red Piranha         |         10 / 1 |    15,000 / 4,980 |        5,890 |     7 |                499,853 |
| Electric Eel        |          8 / 1 |    12,320 / 6,775 |        6,708 |    25 |                311,214 |
| River Stingray      |          5 / 2 |    13,984 / 7,594 |        6,957 |    16 |                572,456 |
| Amazon River Turtle |         11 / 1 |    24,888 / 7,780 |        8,832 |    11 |                550,086 |

For all 43 individuals, visible model meshes fall from 417 to 48 and triangles
from 861,152 to 305,180, while skeleton bones increase from 306 to 550. Four
1024-square color maps add 938,582 compressed bytes and about 21.33 MiB of RGBA
storage with mipmaps per renderer context. These are different resource costs;
no physical-phone FPS, CPU or thermal improvement is claimed. Matching paused
cameras in the populated scene show draws 67/58, 67/60, 72/62 and 72/54, with
triangles 405,646/395,626, 414,714/409,169, 428,698/416,763 and 372,150/342,910.

### Verification, remaining scope and review

- Fitted-rig tests cover actual moving appendage vertices, stable piranha/eel
  snouts and turtle carapace, independent eel ribbon motion, stable ray center,
  seam coherence, culling, independent state/disposal, pause and original stock.
- Matched old/new color, clay, dorsal/ventral and stronger-motion captures live
  in `review/`; raw views and rejected binding drafts remain separately.
- `native/report.json` covers twelve ordinary Guide entries, nine region
  switches and per-kind geometry/texture identity. All 129 tracked discarded
  world skeletons release their owned bone textures; shared colors remain reusable.
- `material_recovery.json` checks four failed color requests, visible fallback
  and recovery through the real Guide retry button. `eel_ability/report.json`
  covers the original shock; `interior_native/report.json` covers three seals.
- `world_clear/` records six seconds of actual ecological travel/turning per
  species and stable pause, with an observer camera and distant invulnerable
  player. World displacement ranges reach 20.1 / 26.3 / 24.0 / 4.4 m along the
  largest axis. `motion/` records nine seconds per fitted rig. These clips show
  different evidence; a Guide animation alone is not proof of world travel.
- `unchanged_models.json` compares 24 other kinds over sixty poses each,
  including accepted fish, lords and playable characters. They remain exact.

Eight ordinary kinds remain: Black Caiman, Green Anaconda, Saltwater Crocodile,
Titanoboa, Purussaurus, Stupendemys, Flood Arapaima and Rootback Colossus. Jade
Arowana is a separate remaining rare. Regional scenery is still a later inventory;
shared accepted assets should not be unnecessarily redrawn.

The final full suite passes **1,739/1,739** after the interior compatibility
repair. Formatting and production build pass. The reviewed entry is
`index-P7UEX-m8.js`; eight native public flows pass in English desktop and
Chinese 390 px touch emulation, with all four new colors loaded, ordinary
start/sonar/sprint/pause/Home controls, no page/resource errors, no production
hook and same-address refresh. This is not physical-phone verification.

The source audit preserves 1,506 of 1,514 prior inputs exactly. The eight changed
inputs are four project-note files, the shared factory, interior lookup and two
affected regression files; thirteen new files supply this batch's assets,
loader/rig, conversion/finishing scripts and focused tests. All earlier candidate
asset files remain byte-identical. No other species' source or animation changes.

Final encoded H.264 videos fully decode and their sampled frames are inspected.
Lark delivery image message is `om_x100b62ec5cb9d8acc04125489cfc297`; motion and
river video attachments are `om_x100b62ec5b0390acc1f3bb1c068900e` and
`om_x100b62ec5b2a7ca0c3033000f1cda25`. User acceptance is still pending.

All **543 production files / 138,816,891 bytes** match dist, the restricted local
server and public preview byte for byte. Two transient curl transfers timed out
and completed on retry; the final assertions cover every resource. Eleven
source/configuration paths are refused at each origin; the tunnel reports ready.
DEV 35213, restricted preview 23118, awake 23120 and tunnel 35419 preserve their
recorded identities. The manager retains the old runtime and rebuild/stop records
under `.local/mini_preview_20261007/`; no service is restarted. Only project notes
change after the reviewed build. Final source preservation, fingerprints and
actual message IDs are stored with this batch's delivery evidence.

## Electric Eel discharge follow-up — 2026-10-25

The user requests a visible discharge effect for the new Electric Eel. The
previous presentation was a flat set of thin yellow lines with a range ring;
the animal itself did not show charge buildup. This candidate adds four small
arcing paths along its body during the real windup, branching blue-white spatial
arcs on the real release, and a short fading residual. The existing yellow range
warning remains. This is expressive game feedback, not a literal depiction of
an electric fish's otherwise invisible field.

The original 1.2-second windup, 12 m radius, single 18-health settlement,
0.3-second active phase, recovery/cooldown, audio and ecology are unchanged.
The actual hit happens on release; fading arcs cannot apply another hit.
All four batch-4 HF meshes, colors and fitted swim poses are unchanged. No new
Hugging Face job or quota is required for this runtime effect.

`electric_arcs.js` uses preallocated cylinder instances for a thin bright core
and blue halo, preserving visibility at oblique angles. Each active body effect
adds two draws / 960 triangles; each burst adds two draws / 1,760 triangles.
There are six independent eel body effects and the existing maximum of four
world bursts. Idle effects draw nothing. Together their instance matrices use
81,920 CPU bytes, plus 4,440 geometry bytes; renderer-side storage is additional.
No textures, lights, postprocessing pass or independent animation loop is added.
Near-camera arc transparency prevents oversized bright strips from obscuring the
follow view when the player crosses a discharge.
This is a bounded cost, not a measured phone-performance improvement.

The body cue consumes actual hunter phase/timer values. Pausing freezes it;
leaving range during windup cancels without a false release. Idle/Guide,
consumption, reset and return Home clear the local cue. Population eviction and
Guide teardown release instance resources without disposing shared skin or
color. Reduced motion keeps arc geometry still while its intensity fades.

Evidence is retained in `.local/amazon_eel_discharge_20261025/`:

- Matched `before`/`refined` true-attack recordings preserve a single 18-health
  hit and the 12 m radius. Both run the normal movement/combat loop, with initial
  proximity/cooldown staging and a fixed inspection camera. The separate
  `follow` recording uses the normal follow camera. Other fish are temporarily
  hidden for attribution; these are inspection fixtures, not normal progression.
- `lifecycle.json` covers pause/resume, canceled windup, Home reset, idle Guide,
  and three region-eviction cycles: 18 eel instances release all 90 private
  resources. `rig_regression.json` confirms exact body geometry, shared material
  and 120 poses for each of the four batch-4 kinds.
- Targeted tests check physical arc vertices remain within 12 m, pool reuse,
  independent charge state, cancellation, reduced motion and owned disposal.

The full suite passes 1,744/1,744. The final near-camera shader adjustment is
additionally checked by 29 focused tests and freshly rendered fixed/follow and
390 px attack captures with no shader/console errors. The follow recording uses
the ordinary slow-swim key to remain near the eel. Formatting and production
build pass. Final native production checks cover English desktop and Chinese
390 px Guide/start/ability/pause/Home and same-address reload, with no debug hook
or browser/resource error. All 543 build resources (138,820,772 bytes) match the
local and public origins; 11 source/private paths are rejected. Unchanged files
verified earlier in this same audit are hash-reused for the final shader build;
changed artifacts are freshly fetched. Existing service identities are retained.
These desktop/emulated checks do not establish physical-phone performance.

The candidate remains uncommitted for review. This does not mark the preceding
four-creature appearance batch accepted or publish a new Pages version.

## Batch 5: four crocodilians — 2026-10-25

The user accepts the Electric Eel discharge and authorizes the next batch. Four
actual TRELLIS.2 exports replace Black Caiman, Saltwater Crocodile, Purussaurus
and Rootback Colossus. These are ordinary predators, separate from the already
accepted Rootjaw lord. The four new appearances await review; no commit/push.

### References and visible distinctions

The [IUCN Crocodile Specialist Group locomotion account](https://www.iucncsg.org/pages/Locomotion.html)
and [direct swimming-kinematics research](https://doi.org/10.1071/ZO02036) support
tail-driven propulsion with limbs generally held close during sustained swimming.
The rig uses a stable head/forebody, a posterior lateral tail wave and separately
fitted backward-folded fore/hind limbs. Stronger motion uses the existing faster
animation clock, with restrained amplitude and gradual trim; there is no walking
cycle or new movement physics. This does not claim crocodilians never use limbs
in slow maneuvering or diving.

The [Australian Museum species account](https://australian.museum/learn/animals/reptiles/estuarine-crocodile/)
informs the Saltwater Crocodile's broad toothed muzzle, dorsal armor and muscular
tail. Its existing non-native/fantasy explanation stays intact. Black Caiman is
charcoal/cream; Saltwater Crocodile uses olive/ochre variation. Purussaurus has a
shorter, heavier broad skull, informed by [published fossil research](https://doi.org/10.1371/journal.pone.0117944);
its colors and living motion remain an interpretation. Rootback Colossus is the
project's fantasy animal, with natural-looking root-shaped armor, not Rootjaw's
lord silhouette. All four input concepts are original generated references.

### Export, fitting and cost

Raw GLBs, concepts, private receipts, conversion records and matched renders stay
in `.local/amazon_batch5_20261025/`. Black Caiman, Saltwater Crocodile and Rootback
Colossus use attempt 01; Purussaurus attempt 01 was canceled by the service and
attempt 02 completed. Each downloaded GLB was parsed before the client closed.
There is no paid excess. The dated quota check at 13:37:43 BJT showed 672.340422
of 2,400 included seconds remaining, with reset reported for 17:58:07 BJT; this
is a historical receipt, not a live balance.

All raw models face +Z. Conversion rotates them to the game's -Z heading,
normalizes each to unit body length, simplifies with material boundaries and
rebakes source color into a padded 1024-pixel WebP atlas. Anatomy is fitted from
the actual top/side surfaces. Twenty-one independent bones control the tail,
limbs and jaw; one shared immutable skin/material is cached per kind.

The first broad limb mask pulled abdominal skin; a narrow distance-only mask
then incorrectly faded distal toes. Both rejected drafts are retained. The final
binding follows the narrowing trunk and includes complete feet while limiting
limb influence by actual chain distance. UV copies retain identical weights.
Color, neutral/clay, underside and full moving surfaces are reviewed together.

| Kind                | Old draws / triangles | New draws / triangles | Old / new bones |
| ------------------- | --------------------: | --------------------: | --------------: |
| Black Caiman        |            4 / 28,008 |             1 / 6,996 |         15 / 21 |
| Saltwater Crocodile |            4 / 28,008 |             1 / 7,493 |         15 / 21 |
| Purussaurus         |            4 / 28,008 |             1 / 8,484 |         15 / 21 |
| Rootback Colossus   |            4 / 28,728 |             1 / 9,981 |         15 / 21 |

These are isolated visible-body costs. Four new color textures and six additional
bones per instance trade memory for richer art; lower draw/triangle counts alone
do not prove phone FPS or temperature improvement. Four closed interior hulls
are added to the existing lookup for near-camera compatibility, retaining every
earlier record.

Original sizes and actual Amazon stocks remain 5 × 5.4 m, 4 × 6.4 m, 8 × 12.5 m
and 3 × 27 m: twenty animals in total. Gameplay definitions, food, attack values,
rewards, movement and prior accepted assets are preserved.

### Verification and remaining scope

All **1,754/1,754** tests pass, including actual skin vertices, head stability,
UV seams, trailing feet, tail movement, cruise/strong/release transitions and
pause. A 40-pose edge audit also catches the rejected abdomen/toe stretching.
The older procedural-builder tests retain their low-level coverage separately;
the regional visible-skin regression now follows the actual HF factory.

Native evidence under the batch directory includes:

- `review/` and `motion/`: matched old/new color/clay/underside views and nine
  seconds of isolated cruise/strong/release motion per species.
- `world_clear/`: normal ecological movement with an observation camera and
  initially distant invulnerable player. Largest-axis displacement spans
  32.7 / 45.5 / 56.6 / 47.2 m over six seconds; pause freezes all four rigs.
  A separate higher-angle Rootback recording avoids neighboring bodies obscuring
  the subject. No entity is pinned or moved every frame.
- `native/report.json`: twelve Guide visits and nine region switches retain
  shared geometry/color identities and independent skeletons. All sixty tracked
  evicted skeletons release their owned bone textures.
- `material_recovery.json`: all four missing-color fallbacks render and recover
  through the actual Guide retry button; `interior_native/` checks all four
  near-camera seals without moving the follow camera.
- `unchanged_models.json`: twenty-four other kinds remain exact over sixty
  poses each, including the previous fish, lords and playable characters.

Matched populated-scene views retain 410 animals. Draw calls change from
65/72/70/70 to 62/66/67/67; triangles change from
451,522/501,838/494,950/505,042 to 430,510/460,311/475,426/486,295.
These are same-camera render counts, not frame-time benchmarks. Both old and new
models coexist during that diagnostic, so its total memory counts are not a
standalone production-memory comparison. This work does not establish physical
phone performance or heat improvement.

Four ordinary kinds remain: Green Anaconda, Titanoboa, Stupendemys and Flood Arapaima.
Jade Arowana is the remaining rare; regional scenery follows a separate inventory.

Formatting and production build pass. The reviewed entry is `index-C7wDTfG2.js`.
Eight native public flows pass in English desktop and Chinese 390 px touch
emulation, including all four ordinary Guide texture loads, start/sonar/sprint/
pause/Home and same-address refresh. No production hook, page error or failed
resource appears. This is not a physical-phone test.

The final source comparison preserves 1,522 of 1,530 prior inputs exactly.
Eight changes are the four project notes, shared factory, interior lookup and
two affected regression files. Twelve additions are the four mesh/color pairs,
loader, rig, converter and focused tests. All previously accepted generated
assets and the Electric Eel effect sources remain byte-identical. Twenty-four
unaffected model kinds also retain exact animation output.

Final H.264 clips fully decode and sampled frames are inspected. Image delivery
is `om_x100b62edd76dd4a4c1fa7fa78efe4fa`; motion and river attachments are
`om_x100b62edd3d910a4c0ebf1c0a53e582` and
`om_x100b62edd3fe70a8de855585a227f11`. These are actual game renders, not concepts.
The new four-creature batch remains uncommitted and awaits user acceptance.

All **555 production files / 142,222,635 bytes** match dist, the restricted local
server and the public preview byte for byte. Eleven source/configuration paths
are refused at both origins and the tunnel reports ready. DEV 35213, restricted
preview 23118, awake 23120 and tunnel 35419 retain their recorded identities.
The previous runtime is archived as `runtime_before_20261025_135251`; rebuilding
and stopping remain documented in `.local/mini_preview_20261007/manage.py`.
No service is restarted or replaced. Only project notes change after this build.
Final fingerprints, source preservation, raw provenance and delivery IDs remain
with the batch evidence. Main and formal Pages remain v0.11.18.

## Batch 6: serpents, Stupendemys and Flood Arapaima — 2026-10-25

The user accepts the four crocodilians and requests the next batch. The current
agent independently redraws Green Anaconda, Titanoboa, Stupendemys and Flood
Arapaima through actual Microsoft TRELLIS.2 exports. These four new appearances
await review; all earlier accepted work stays intact, with no commit or push.

### Reference and production choices

- [Smithsonian's Green Anaconda account](https://nationalzoo.si.edu/animals/green-anaconda)
  informs the olive body, dark oval markings and high-set eyes/nostrils. A
  travelling lateral body wave is fitted to a continuous skin; the head remains
  stable. This is an expressive game rig, not a measured biological simulation.
- [Florida Museum's Titanoboa reconstruction](https://www.floridamuseum.ufl.edu/100-years/object/titanoboa/)
  informs the heavy-bodied extinct boa silhouette. The brown saddle markings and
  swimming cadence are artistic choices, not fossil-preserved evidence.
- [UZH's Stupendemys account](https://www.news.uzh.ch/en/articles/2020/Giant-Turtle.html)
  and the [primary fossil study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7015691/)
  inform the broad freshwater turtle shell and raised anterior rim. Four webbed,
  clawed feet replace the old disconnected primitive limbs. The existing 7 m
  game size is fantasy scale; the shell stays rigid during alternating strokes.
- [Smithsonian's Arapaima account](https://nationalzoo.si.edu/animals/arapaima)
  informs the heavy scales, elongated body and reddish posterior. Flood Arapaima
  remains the existing fictional 7.8 m population, separate from the previously
  accepted ordinary Arapaima. Its tail drives propulsion and paired pectorals
  make restrained stabilizing strokes.

Four original concept inputs, all raw exports, private receipts, coordinate
plots, matched color/clay captures and conversion logs are retained under
`.local/amazon_batch6_20261025/`. Each runtime asset records its raw GLB SHA-256;
color is rebaked from that same source onto a new padded atlas. The two serpent
neutral axes are straightened offline after projection, with corresponding
inverse-transpose normal correction; their measured maximum normalized shifts
are 0.01753 and 0.06728. This removes reconstruction curvature before posing
rather than counter-bending it in the animation. Species-specific raw headings
are checked independently; Flood Arapaima needs a different axial rotation.

The four first attempts export successfully using included PRO quota only.
The pre-generation live check at 13:58:51 BJT reports 672.340422 seconds remaining,
zero paid excess, with reset at 17:58:06 BJT. This is dated evidence, not a live
quota promise. No additional paid usage is authorized or used.

### Runtime scope and cost

`amazon_final_asset.js` shares each immutable geometry, recoverable color map and
material. `creature_amazon_final_hf.js` owns independent instance skeletons and
visual state; it uses the existing animation phase, with no new scheduler.
Only the four early factory dispatches change. Body lengths, speeds, populations,
food eligibility, combat and all previous assets remain unchanged.

| Kind           | Population / length | Old meshes / triangles | New meshes / triangles | Bones | Color bytes |
| -------------- | ------------------- | ---------------------- | ---------------------- | ----- | ----------- |
| Green Anaconda | 5 / 8.2 m           | 4 / 19,228             | 1 / 6,998              | 22    | 140,670     |
| Titanoboa      | 8 / 13 m            | 4 / 19,228             | 1 / 8,994              | 22    | 155,528     |
| Stupendemys    | 9 / 7 m             | 11 / 25,224            | 1 / 8,994              | 11    | 295,644     |
| Flood Arapaima | 36 / 7.8 m          | 10 / 13,632            | 1 / 7,778              | 7     | 285,610     |

Four closed near-camera interior records are baked for the new surfaces; all
636 existing records remain intact. These seals retain the existing interior
rendering policy and do not change physics or the follow camera. Guide and world
share JavaScript asset identities but may upload separately to their WebGL
contexts. Lower mesh/triangle counts alone do not establish phone FPS, heat or
load-time improvement.

### Verification record

The focused suite checks real skinned vertices through cruise/stronger-motion/
release, head or shell stability, fin/foot excursion, continuous atlas seams,
edge stretching, bounds, independent instances, frozen repeated phase and
idempotent skeleton disposal. The existing serpent tests now inspect the new
continuous HF bodies instead of the removed primitive body names.

All twenty ordinary Amazon species now have HF candidates/accepted redraws.
Jade Arowana remains the regional rare to review next; the river environment
requires a separate scenery inventory. This does not mark the entire map complete.

All **1,761/1,761 tests** pass, including ten focused final-batch/serpent checks;
formatting passes. Native Chrome records twelve ordinary Guide loads, nine
regional switches, and all 174 observed new world skeletons released after
population eviction. Shared geometry/color identities stay stable. Four blocked
texture loads render fallback colors and recover through the real retry UI;
four interior stress views render their new closed seals. Twenty-four other
model kinds remain exactly unchanged across sixty poses each.

Each actual river NPC travels against visible terrain and pauses without further
pose change. Captures use an observer camera and an invulnerable, staged player;
they do not pin NPCs or alter movement. Flood Arapaima is additionally filmed
using the most isolated existing school member to improve readability, without
hiding neighboring fish. Guide clips compare cruise, stronger motion and release.
These are native desktop checks, not a physical-phone test.

Matched populated-scene views retain 410 animals. Calls change from 68/75/85/76
to 65/69/72/70. Triangles change from 465,050/506,586/522,822/480,574 to
452,820/484,122/494,362/500,901. The final school view increases submitted triangles
despite cheaper isolated models; view bounds and culling also affect populated
counts. No across-the-board frame-time gain is claimed. Before and after models
coexist only in this diagnostic, so total renderer memory is not a clean
standalone production-memory comparison.

The post-generation check at 14:12:01 BJT reports **521.069569 included seconds**
remaining and zero overquota usage, with reset at 17:58:06 BJT. Four completed
models use approximately 151.27 seconds from the pre-generation reading.

The production build succeeds with entry `index-Br9K4fWp.js`. Eight native public
flows pass for English desktop and Chinese 390 px touch emulation: ordinary
Guide color loading, start, sonar/sprint, pause, Home and same-address reload.
There is no production hook, page error or failed resource. The final H.264
motion and river clips fully decode; sampled final frames are visually inspected.

Source preservation retains 1,535 of 1,542 baseline inputs byte-identically.
Seven allowed changes are the four project notes, early factory dispatch,
interior lookup and serpent regression. Thirteen additions are the eight asset
files, loader, rig, converter, neutral-axis helper and focused test file.
Previously accepted assets and eel effects remain exact. No commit/push occurs;
main and formal Pages remain v0.11.18. The existing preview processes are reused
and the prior runtime is archived as `runtime_before_20261025_141500`.

All **567 production files / 144,993,847 bytes** match dist, restricted local
preview and public preview byte for byte. Eleven private/source paths are refused
at each origin and the tunnel is ready. DEV 35213, preview 23118, awake 23120 and
tunnel 35419 preserve their recorded identities; no service is restarted.
`.local/mini_preview_20261007/manage.py` retains rebuilding/stopping and log
locations. Only project notes change after this reviewed build.

The native factory inventory confirms all twenty ordinary Amazon kinds use their
HF rigs. Delivery images are `om_x100b62eda54fbca8c0ffc7dbaba1ff7`; actual motion
and river attachments are `om_x100b62eda09a80a4c135972aa7e8040` and
`om_x100b62eda0bbd4a4dd7c1d70694c498`. Final fingerprints, provenance, source
preservation and message IDs are retained with the batch evidence. This new
four-creature appearance remains a review candidate.

## Batch 7: Jade Arowana and riverbed driftwood — 2026-10-25

The user accepts batch 6 and requests the next group. The current agent independently
replaces the regional rare Jade Arowana and riverbed driftwood through actual
Microsoft TRELLIS.2 exports. These two appearances await review. The twenty
ordinary species, three lords and all four players retain their accepted models;
canopy, buttress/hanging roots, river stones and riverbank/floor surfaces remain
separate scenery work. No commit, push or personal Skill edit occurs.

### Source and adaptation

Two original concept images feed the authorized
[TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2). Jade Arowana
is the existing fictional rare: emerald scale colors, ivory belly, restrained
gold fin rays and two chin barbels. Its actual export has a stable forebody,
continuous posterior propulsion and individually fitted pectoral, pelvic and
median-fin support; the scales are primarily texture detail, not separately
modeled relief. Weathered driftwood has peeling bark, broken short branches and
splintered ends in the actual exported geometry.

Raw color/clay views, original GLBs, receipts, axis inspection and fresh UV/color
projection are retained in `.local/amazon_batch7_20261025/`. The first wood
attempt ends in `CancelledError` before export; its receipt is preserved, and a
second attempt completes. Both runtime assets embed the matching raw source hash.
Only included PRO quota is used. A post-generation reading at **15:58:35 BJT**
shows **456.330936/2,400 seconds** remaining, zero overquota use and reset at
**17:58:07 BJT**. This is a dated reading, not a current quota promise.

| Asset              | Successful seed / attempt | Raw GLB bytes | Runtime triangles / vertices | Mesh / color bytes |
| ------------------ | ------------------------- | ------------- | ---------------------------- | ------------------ |
| Jade Arowana       | 745071 / 01               | 3,491,980     | 6,994 / 7,798                | 244,173 / 288,252  |
| Riverbed driftwood | 745073 / 02               | 4,237,992     | 1,958 / 3,119                | 91,589 / 299,974   |

`amazon_rare_asset.js` owns the shared recoverable rare surface;
`creature_amazon_rare_hf.js` owns seventeen independent bones per instance. Its
old seven meshes / 10,136 triangles become one mesh / 6,994 triangles. Discovery,
catching, blessing, population, length and movement/combat rules are unchanged.

`amazon_driftwood_asset.js` shares a static surface across **112 logs in fourteen
instanced groups**. The final low-cost export replaces an intermediate 4,652-triangle
candidate; the original log was 1,176 triangles. No per-log animation, extra
light, draw group or scheduler is added. Reference ownership releases geometry,
material and color after the last scene; aborted construction also releases its
acquisition. Normal map construction initiates color loading without needing a
Guide visit. Failed loads show a wood-colored fallback and recover on reconnect.

### Necessary placement correction

The original seeded layout places many logs at the same center as river rocks.
Actual scene review exposes this overlap, which hides the improved surface.
The initial exact-transform diagnostic is preserved as history, but superseded
by a bounded fit in `amazon_driftwood_placement.js`. The fit tries nearby positions
and yaw, then follows the local slope, after all river rocks have been generated
so neighboring chunks are also considered. The same transform updates each
existing collision capsule. This is an intentional placement/collision change,
not a claim that all collider coordinates remain identical.

All 112 logs remain, with **maximum horizontal relocation of 12 m**. Thirteen
samples along every trunk clear the expanded river-rock ellipsoids; support
samples, the 72 m central corridor and three crossing bands pass. All **2,050
other colliders are exactly unchanged**; the total stays 2,162. Hanging roots,
stone/plant transforms, population seeds and progression geometry are preserved.
The helper runs during construction, not every frame. The source snapshot and
`layout_final.json` retain the measured comparison.

### Validation and cost limits

All **1,767/1,767 tests** pass, including **26 focused checks** for this batch and
existing Amazon/rare contracts. Actual skinned vertices verify stable head,
paired-fin movement, tail propulsion, atlas-seam continuity, finite bounds,
independent instances, smooth transitions, repeated-phase freezing and idempotent
skeleton release. Twenty-seven other model kinds remain exactly unchanged across
sixty poses each. These checks support the visual review; they do not substitute
for user acceptance.

Native desktop Chrome checks ordinary Guide loading, nine regional switches,
independent rare instances and released world skeletons. A blocked rare texture
recovers through the real retry UI. Three further Amazon/Hawaii cycles release
each wood geometry and texture once; blocked wood color recovers on an `online`
event. Cancelled scene construction is covered separately. No browser page error
occurs in these checks.

The actual rare NPC moves through the river and turns, with a frozen pose when
paused. Guide clips show cruise, stronger movement and recovery. The wood clip
shows actual scene placements with a moving observer camera; it does not hide
nearby rocks or vegetation. The staged/invulnerable player and observer camera
are disclosed in these diagnostics. Desktop 390 px touch emulation is not a
physical-phone test.

A matched populated rare view changes from 67 calls / 423,090 triangles to
61 calls / 419,948 triangles. The final wood surface adds 782 triangles per log;
three populated captures retain 106/91/123 calls and add 39,882 submitted triangles
per view. This modest scene increase is a quality tradeoff, not a measured FPS
or heat improvement. Total renderer memory in before/after diagnostics includes
both versions and is not a clean standalone memory comparison.

Formatting and production build pass with entry `index-LFxFwyC9.js`. All **575
production files / 146,102,124 bytes** match dist, restricted local preview and
public preview. Eleven private/source paths are refused at each origin, the
tunnel is ready, and the four recorded service identities remain unchanged.
The previous runtime is archived as `runtime_before_20261025_161225`.

Native English 1440 px and Chinese 390 px production flows pass Guide/start/
boost/sonar/pause/Home and same-address reload, without a production debug hook.
The first diagnostic closed pages before the lower-priority scenery texture
finished its queue; final checks explicitly wait for the real wood response.
A retry during simultaneous full-file network verification encounters one
transient connection close; its report is retained. The final serial review
passes without page or console errors, and both new textures return 200.
One cancelled old Hawaii sloop request is recorded during a regional switch;
it is not a missing Amazon asset. No physical-phone claim is made.

The final H.264 clips fully decode and sampled encoded frames are reviewed.
Source preservation retains **1,548 of 1,555** baseline files byte-identically;
seven allowed changes are the four project notes, factory dispatch, riverbed
integration and rare regression, plus eleven new files. The raw-source hashes,
final build/source fingerprints, terrain audit and actual delivery IDs are
retained with the batch evidence. No commit or push occurs.

The images are delivered in `om_x100b62efec2cd8b0dfba16c44e0ab2d`; actual motion
and scenery attachments are `om_x100b62efe8554ca4c09a32bf74df055` and
`om_x100b62efe87d8ca8dd30da223cef5aa`. The user then requests the next batch;
this accepts the shown batch 7 appearances and authorizes continuing with scene
roots. Later scenery work must preserve this candidate and its checks.

## Batch 8: flooded bank roots and island hanging roots — 2026-10-25

The user accepts batch 7 and requests “继续下一批”. This candidate replaces
56 existing riverbank root surfaces and 30 existing island hanging roots with
two actual Hugging Face TRELLIS.2 exports. Previously accepted creatures,
effects, dead driftwood and gameplay remain unchanged. The current agent works
alone; no commit, push, personal-Skill change or paid excess is authorized.
Work and evidence stay in `.local/amazon_batch8_20261025/` under Developer.

### Sources and fitting

Original concept images describe continuous tropical bark/root forms, with a
stout bank root and a thinner branching suspended root. These are fictional
river-scene assets, not an exact botanical species reconstruction. Both actual
GLBs are inspected from multiple directions in color and clay before conversion.
The first local bank-root conversion used the wrong long axis and failed the
source-surface bake. That rejected conversion is preserved; corrected Z-axis
orientation uses the same successful HF export, without another GPU request.

| Asset             | Actual HF seed / raw bytes | Raw SHA-256                                                        | Runtime triangles | Mesh / color bytes |
| ----------------- | -------------------------- | ------------------------------------------------------------------ | ----------------- | ------------------ |
| Flooded bank root | 745081 / 3,361,712         | `7f74536f4442c7550e2b49bf59c4346f3960596a316fa8ca5c64d97216b8f65c` | 1,500             | 55,713 / 165,776   |
| Hanging root      | 745082 / 3,843,320         | `d47c46ce60d439784eca0bcbb67f58689499336f3eeb5d71f313817afb2e6187` | 1,472             | 66,746 / 192,126   |

At 16:31:26 BJT on October 25, the freshly queried included balance was
406.685573 of 2,400 GPU seconds, with zero excess and the service reporting
17:58:07 BJT as reset. This is a dated receipt, not a continuing live-balance
claim. The two exports consume about 49.65 seconds versus the preceding receipt.

The bank asset bends along each existing three-point root curve. Its radial
surface remains inside the existing capsule envelope. The local deformation
Jacobian transforms normals by inverse transpose; the atlas coordinates and
seam positions are preserved. Normal validation allows the measured normalized
Int16 quantization error instead of requiring impossible float precision.
The hanging asset's thicker end points into the island and its fine tips extend
into water. Its existing object placement, rotation and scale are unchanged.
A local axial fit concentrates the surface in the lower portion of the old
capsule: the first full-length fit left most of the trunk buried in the ceiling
and exposed only fine tips. The final surface remains entirely inside the
existing 0.7 m capsule (maximum measured distance about 0.578 m), with attachment
vertices above the ceiling and visible root vertices at least 0.5 m below it in
all 30 placements. This is a mesh fit, not a collision or terrain relocation.

### Scope, cost and lifecycle

The exact layout comparison preserves all **2,162 colliders**, including 448
bank-root capsules and 30 hanging-root capsules. River routes, island geometry,
vegetation counts, seeds and gameplay files are unchanged. All 56 bank roots
remain merged into one draw; 30 hanging-root meshes share a geometry/material.
No new per-frame animation or root-update loop is introduced.

This is a quality increase, not a performance optimization: bank-root geometry
changes from 10,976 to 84,000 triangles in its single merged draw, while each
hanging root changes from 1,176 to 1,472 triangles. The two colors total 357,902
compressed bytes. The deformation runs during scene construction only. Source
geometry and prepared materials are reference-counted; scene copies and final
owners release separately. No FPS, heat or physical-phone improvement is claimed.

Focused checks cover actual bent vertices, atlas seams, normals, source
immutability, shared ownership, automatic color loading and cancelled scene
construction. Three native Amazon/Hawaii cycles release each observed geometry
and color exactly once. Both blocked colors use the existing vertex-color
fallback and recover after the real online event, without page errors.

Initial observer cameras were occluded by banks or an island support column;
those captures are retained as rejected evidence, not delivered as successful
reviews. Final comparisons use the same geometry placements and camera on both
versions, keeping terrain, population and actual game lighting. The player is
staged for inspection, the scene is paused, and the video moves an observer
camera; it is not a normal input-driven traversal or a mobile-device benchmark.
The shaded island interior remains intentionally darker than the open channel.

This new appearance awaits user review. Canopy/understory, river stone and
terrain materials remain later scenery batches; this entry does not claim that
the entire Amazon environment is finished.

### Final batch checks and delivery

All **1,771/1,771 tests**, formatting and the production build pass on the final
fitted geometry. The four focused root checks include all 30 actual hanging
placements, not only a prototype at the origin. Source preservation keeps
**1,560 of 1,566 baseline inputs byte-identical**: only the two scenery factories
and four project notes change, plus seven new asset/loader/converter/test files.
The current branch and HEAD remain unchanged.

Matched populated bank views retain 102/87/91 draws and add 73,024 submitted
triangles. The final hanging views retain 169/152/136 draws and add
74,800/74,504/73,912 triangles respectively, including the bank-root replacement
visible elsewhere in the same scenes. These are render counters from paused
observer captures, not frame-time measurements. Both delivered seven-second
H.264 clips fully decode, and their encoded sampled frames are inspected.

Comparison images are delivered in `om_x100b62e86a840ca0c1b346ea59d9c4b`.
Actual scene-video attachments are `om_x100b62e86618d0a4dc18434b028940a` and
`om_x100b62e86620c4a0df1e979cbb74c67`. The user has not yet accepted this batch.

The restricted preview uses `index-DZSG37wK.js`; all **581 build files /
146,646,184 bytes** match dist, local preview and public preview. Eleven source
and private paths are refused at both served origins. The same service PIDs
35213/23118/23120/35419 are retained, with the preceding runtime archived as
`runtime_before_20261025_164743`.

Native public English 1440 px and Chinese 390 px flows pass region selection,
Guide, start, boost/sonar, pause, Home and same-address reload. Both new root
colors are explicitly observed returning 200; there are no page/console errors
or failed HTTP assets. The production debug hook is absent. The 390 px case is
desktop touch emulation, not a physical-phone test. Final source/build hashes,
raw receipts, fitting and disposal checks, rejected diagnostic cameras and
delivery message IDs remain in the batch evidence directory.

## Batch 9: rainforest canopy, surface timber and spider monkeys — 2026-10-25

The user accepts batch 8 and requests floating timber, more distinctive rainforest
trees and animals moving through them. This acceptance supersedes batch 8's
historical candidate label. The current agent works alone, preserves all earlier
uncommitted Amazon work, and does not commit/push this new batch. Working evidence
stays in the repository's ignored `.local/amazon_batch9_20261025/`; no project
artifacts are written to Documents or personal Skills.

### Direction and actual generated sources

The landscape combines tall, buttressed kapok-inspired broadleaf trees and
slender acai-inspired palms, with sparse red-faced spider monkeys. This is a
South American adaptation of the user's hanging-primate suggestion: the
[Wisconsin primate species account](https://primate.wisc.edu/primate-info-net/pin-factsheets/black-spider-monkey/)
supports local distribution, suspensory movement and a prehensile tail.
The game uses a readable hand-over-hand traverse, not a claim that this is the
animal's only locomotion. The tail sways; it is not presented as gripping a
support. Tree references include [Kew's acai account](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:666941-1)
and [NParks' kapok account](https://www.nparks.gov.sg/florafaunaweb/flora/2/7/2797).
No third-party photographs or footage are shipped.

Generated reference images feed actual TRELLIS.2 exports. Raw colored and clay
surfaces were inspected before reduction, atlas rebaking and runtime fitting.
The first kapok's reduced crown was too sparse, and the first monkey had webbed,
hollow-looking tail geometry; both are retained as rejected candidates. A kapok
transport failure was retried once with its retained session, which had lost
export state; a fresh successful export then replaced it. The final monkey's
small disconnected source curl is removed by component analysis, keeping its
continuous principal body/tail surface. No spherical shoulder patches are added.

| Asset               | Actual HF seed / raw bytes | Raw SHA-256                                                        | Runtime triangles       | Mesh / color bytes                    |
| ------------------- | -------------------------- | ------------------------------------------------------------------ | ----------------------- | ------------------------------------- |
| Kapok-inspired tree | 745093 / 7,267,184         | `1449693da4096a024f22025f873394400faab86fdd42897159119c0b00150aba` | 14,956 near / 3,442 far | 911,145 + 233,529 / 230,010 + 209,500 |
| Acai-inspired palm  | 745092 / 4,910,660         | `c003285207ceadf1dd098441dd181fd750ec365fe4f3931055783e821fe2e71b` | 5,200                   | 264,817 / 264,366                     |
| Spider monkey       | 745094 / 4,017,160         | `8e1955c429471ae3d5db7eef08a5d1a11c15b14079c0660149057168c1d870c1` | 6,398                   | 259,836 / 120,626                     |

Near/far trees normalize against the same raw source bounds. A preliminary
conversion accidentally reused the near atlas output name for far geometry;
that output is rejected. The final converter emits distinct stems and the
validated `final_tree_v2` files are the runtime inputs. Initial reduced-asset
viewer images also used an incorrect texture flip; corrected views match the
runtime loader. These diagnostic mistakes are not treated as production proof.

The palm's completed generation session was retained when included quota fell
below the 120-second export reservation. It exported after the actual reset,
without paid excess or identity changes. At **18:46:45 BJT on October 25**, the
fresh service receipt reports **2,025.20942 / 2,400 included GPU seconds**, zero
excess, and reset at **17:58:23 BJT on October 26**. This is a dated observation.

### Placement, motion and unchanged gameplay

The forest retains 1,524 trees and the original random sequence, size/yaw and
understory colors across 110 chunks. Broad root footprints now fit the bank;
edge anchors outside rendered land are moved inward, and understory positions
follow their trees. This intentionally changes selected scenery positions.
A fresh downward ray test hits actual rendered ground under all 1,524 tree
centres; the base gap ranges from -2.733 to +0.170 m. The small positive value
is terrain tessellation difference, contained by visible buttresses. No tree
is lowered into the deep channel to make its footprint pass. Terrain, island
caps, gates and all 2,162 pre-existing contact objects remain byte-for-byte
identical to the prior construction result.

The 13 surface logs reuse the accepted HF driftwood. Their small bounded drift,
bob and roll update the same transformed capsules used by the existing dynamic
barrier query. They stay clear of the main channel and three gate corridors.
Their contacts do not mutate the cached static navigation array. Actual mesh
vertices remain inside moving capsules throughout sampled six-minute motion,
and the ordinary fish depth bands remain below this new surface envelope.

Six sparse spider monkeys hang from lianas whose ends raycast into actual tree
surfaces over continuous land. The 21-bone skin is fitted to the final exported
shoulders, elbows, wrists, pelvis, knees and tail. Two-bone arm solving keeps
stance grips stationary while the other hand releases and reaches. Bodies
traverse the vine and slow before reversing; small leg, torso and tail motions
accompany this travel. UV-duplicate skin seams stay coincident and source
geometry stays immutable through complete cycles. Monkeys are atmospheric
wildlife, with no new food, reward, population or combat rule.

### Cost, loading and lifecycle

Kapok chunks select one of two mesh levels with 160/190 m hysteresis. Both
levels share placement, and only one is drawn; foliage moves in the shader,
without per-frame tree matrix uploads. Existing 560/220 m forest depth-distance
culling remains. The whole-map all-far forest inventory is 7,582,992 triangles,
versus 11,338,560 before; this is neither a frame-time measurement nor a
physical-phone performance claim. Near views trade extra local detail for
reduced distant detail. Six monkey skeletons and lianas are additional work;
depth and distance gates skip hidden poses. Four color files total 824,502 bytes.

Shared tree geometry/textures have separate scene-local wind clocks and
subscriber updates, so retrying a failed color also updates every clone.
Native Chrome checks cover automatic loading, all four blocked colors followed
by online recovery, and three Amazon/Hawaii cycles: all 54 observed resource
owners release once. Recovery reaches all 321 observed tree/monkey meshes.
Pause freezes both actual bone matrices and floating-log matrices. Focused
checks also cover reduced motion, independent instances, LOD exclusivity,
cancelled construction and retained shared owners. All **1,779/1,779 tests** pass.

The first observer captures inherited underwater atmosphere, and one camera
sat inside the bank. They are retained as rejected diagnostics. Final captures
use the normal game atmosphere with an above-water observer camera, without
extra presentation lights. Matched forest comparisons change only the forest.
Motion recordings run the game's ordinary elapsed-time update with a staged,
invulnerable player and observer camera; they do not pin monkey positions or
claim input-driven traversal. Actual encoded footage and native public flows
are reviewed separately below. This new appearance awaits user acceptance.

### Final scene and delivery checks

Matched populated island, west-bank and wide views respectively change submitted
triangles from 3,804,914 / 2,417,440 / 3,502,019 to
2,926,892 / 2,353,494 / 3,018,949, with draws from 227 / 142 / 214 to
218 / 140 / 211. These counters include the actual scene and render passes;
they do not measure mobile FPS. The staged normal-follow check also reaches
the surface with the ordinary camera, HUD and atmosphere intact.

The final monkey recording fixes the observing player near the bank, while
wildlife remains driven by normal game elapsed time. This prevents the
unsteered player swimming too far/deep and correctly culling the distant actor
partway through a review clip. Earlier culling/occluded-camera clips remain
rejected diagnostics. The final 17-second clip stays visible throughout,
travels over four metres along its route and includes a gradual reversal.
All delivered H.264 clips fully decode; sampled encoded frames are inspected.

Formatting, all 1,779 tests and build pass. Source preservation keeps 1,567 of
1,573 previous inputs byte-identical; only the two scenery factories and four
project notes change, plus 18 new files. New mesh JSON formatting changes
whitespace only. HEAD and the working branch remain unchanged.

Restricted preview entry is `index-dV8i6XRt.js`. All **593 build files /
149,927,093 bytes** match dist, loopback and public preview. Eleven source or
private paths are refused at each served origin. The same service identities
35213/23118/23120/35419 remain; the previous runtime is archived at
`runtime_before_20261025_185046`. Native public English 1440 px and Chinese
390 px flows pass region/Guide/start/boost/sonar/pause/Home and same-address
refresh, with all four new colors returning 200 and no production debug hook.
There are no page/console or HTTP asset errors. One unrelated Sloop image
request abort during page disposal is retained in the request log. Narrow
Chrome touch emulation is not a physical-phone test.

The actual forest comparison was sent in
`om_x100b62ea4f9c44acdfc0fb9c1435665`; its attachment caption was corrected
after an initial CLI argument error. The environment video is
`om_x100b62ea434f90a4dfb591db3f1bc14`. The monkey still and explanatory text
are `om_x100b62ea59e2aca8dde62f37e748f1d`, with its video delivered separately
as `om_x100b62ea59a488a0dc0df3467aa39c7`. The game clips, encoded samples,
raw/failed receipts, source/build hashes and final delivery message IDs are
retained in the batch evidence directory. This batch awaits user visual review;
no commit/push or personal-Skill edit has been performed.

## Waterside-monkey follow-up — 2026-10-25

The user finds the batch-9 monkeys too slow and explains that wildlife should
be noticed in riverbank trees when the aquatic player surfaces. The former
close observer recording does not establish that experience. Its candidate
and evidence remain recorded above; this feedback supersedes that placement
and pace, without accepting the replacement in advance.

All six monkeys now traverse low river-facing branches instead of interior
canopy routes. Candidate pairs use the actual zero-height shoreline and
same-bank trees; branch roots raycast into the existing HF tree surface.
Small tapered limbs reach toward the water, supporting the hanging liana.
The complete route leaves room above the bank for the animated skin. This
keeps the established tree placements, HF meshes, floating logs, fish and
all gameplay unchanged. It does not add a land exploration activity.

The route and alternating hand clock both run **2.6 times faster**. One
end-to-end traverse changes from about **37.9 to 14.6 game seconds**, with
smooth reversal and stationary stance grips. The actual routes cover roughly
8.8–13.2 m between reversal points. Accelerating both clocks preserves the
same reachable hand/body relationship instead of stretching the arms.

Six route heights are 12.8–22.1 m above sea level, with the hanging body below
them. Sixty sampled poses per actor keep sampled actual skin vertices at
least 1.35 m above the same-source terrain. No creature model or tree asset
changes. Each branch/liana is one merged mesh: +112 triangles per route,
**+672 triangles total, no additional draw or texture owner**. Different
placements make a previously hidden monkey visible, so populated-camera
counters can also increase by that visible animal; this is not a performance
improvement claim. Static contacts remain 2,162 and floating contacts 13.

Nine focused tests pass, including quicker full traversal/reversal, fixed
hands, actual skin continuity, shared ownership, reduced motion and pause.
A separate 300-pose audit records zero UV-seam separation, grip error below
3e-15, unchanged source vertices and independent skeletons. Largest sampled
edge stretch is 2.669, comparable to 2.666 in the prior fitted shoulder skin.
This is a measured check, not proof of final artistic acceptance.

Native Chrome visits all six routes with the ordinary surface follow camera.
Matched before/after renders use the same camera, world time, forest and
lighting, swapping only the old/new monkey routes. Video stages an
invulnerable observer at the riverbank and holds that player position; camera
logic, atmosphere and wildlife elapsed-time updates remain unchanged.
Screenshots include the normal HUD. Desktop inspection does not represent
physical-phone validation. Evidence and source snapshots are retained under
`.local/amazon_shore_monkeys_20261025/`. No HF generation or extra quota is
needed; there is no commit, push, service replacement or personal-Skill edit.

Final verification passes formatting, **1,780/1,780 tests** and build. Final
native clips are recorded after the test workload finishes: 956/946 rendered
frames cover about 16 seconds each, with the monkeys continuously in view,
actual travel and reversal, and pause freezing the skin. Earlier captures made
during CPU-heavy tests are retained as diagnostics, not the delivered clips.
Both final H.264 videos fully decode and sampled encoded frames are inspected.
The ordinary HUD screenshots and same-camera comparison remain alongside them.

Preview entry is `index-CbZ68Yim.js`; **593 files /149,928,065 bytes** match
dist, loopback and public preview. A few interrupted public downloads succeed
on bounded retry; every final hash matches. Eleven private/source paths are
refused on both origins. Native public English 1440 px and Chinese 390 px
start/pause/Home and same-address refresh pass, with monkey color loaded,
no page/console/HTTP errors and no production hook. Original services
35213/23118/23120/35419 are retained, with runtime archive
`runtime_before_20261025_195109`.

Of the 1,591 preceding inputs, 1,583 are byte-identical. Only arboreal placement,
its travel clock, two focused tests and four project notes change; there are
no new tracked asset files. Final video text is delivered in
`om_x100b62eaad457ca4c1d8859cac36702`, with the actual video attachment in
`om_x100b62eaad64e0a8c0b6333fc63debf`. This follow-up remains uncommitted
and awaits user visual review.

## Monkey motion reference follow-up — 2026-10-25

The user asks whether real monkey locomotion should be consulted. The preceding
shoreline/pace delivery is not treated as acceptance of its motion. It left the
animal facing the observer while translating sideways, with almost constant
body height and unrelated leg/tail oscillations.

### Sources and observations

- [Wisconsin National Primate Research Center: Ateles paniscus](https://primate.wisc.edu/primate-info-net/pin-factsheets/black-spider-monkey/)
  describes hook-shaped hands, suspensory hand-over-hand travel, quadrupedal
  travel and clambering. Its prehensile tail contributes support and stability.
- [Schmitt et al. (2005), primary tail-locomotion research](https://scholars.duke.edu/publication/736496)
  studies other ateline species, including A. fusciceps. It supports an active
  stabilizing tail, without establishing one universal step cadence for all Ateles.
- [Nesnad's 2010 Ueno Zoo Ateles geoffroyi footage](https://commons.wikimedia.org/wiki/File:Ateles_geoffroyi_-_ueno2010.ogv)
  is actually downloaded and inspected as frame sequences, including 4.6–9.2 s
  at 0.2 s intervals. The monkey reorients its torso, changes supports, bends its
  legs and adjusts the tail while moving through different levels of the cage.
  The fence obscures some exact contacts; it is not used to infer joint forces.
- Eric Kilby's short captive A. paniscus clip and Hectonichus's A. hybridus clip
  are also inspected, but chiefly show fence departure and ground/social behavior;
  they are not evidence for a complete wild canopy-crossing gait.

Public Auckland Zoo/YouTube and a National Geographic cinematographer's Vimeo
page are located, but downloads are unavailable. No access restriction is
bypassed and those videos are not represented as watched. All local reference
frames are for analysis, not game assets or redistributed user deliverables.
The riverside placement is the user's visibility-oriented adaptation; this
is not a claim that the species normally inhabits low rainforest edges.

### Runtime revision

The existing exposed-liana crossing now turns toward its travel direction and
slows into reversal. A hand stays on a fixed support through loading, then
releases, lowers and reaches forward. The body moves under those supports,
with coordinated pitch/rise, gathering/extending knees and a balancing curled
tail. On these crossings the hands bear weight; the tail is not falsely shown
grasping empty space. This is one suspended movement sequence, not every form
of Ateles locomotion or a replacement for a future multi-branch climbing system.

Hand timing adapts to longer spans to keep the fitted arms reachable. The
existing approximately 14.6-second end-to-end route pace remains. Six routes
keep their selected bank positions; only the two lowest supports rise to
15.5 m, preserving actual trunk intersections and room for the turning skin.
No HF mesh, texture, tree, fish, player, encounter or gameplay input changes.
Mesh/draw counts and shared asset ownership do not increase. No HF quota is used.

### Evidence and checks

Evidence is in `.local/amazon_monkey_natural_20261025/`, including immutable
preceding sources, dated reference files and frame sheets, matched native
renders, actual-skin/contact checks and final encoded recordings. Full tests
pass **1,780/1,780** before the final long-span hand-timing safeguard; the final
seven focused tests then pass, now sampling 240 actual-skin poses over three
spans. Separate 300-pose checks include the widest supported span: no seam
separation, fixed grip error below 6e-15, unchanged source geometry and distinct
skeletons. Maximum sampled edge stretch is about 2.81 versus 2.67 previously;
this numerical bound is not artistic acceptance.

All six actual scene routes clear the same-source terrain; sampled skin
clearance is at least 1.35 m. There remain 2,162 static contacts and 13 floating
contacts. Native Chrome visits all six routes from the ordinary surface follow
view and checks pause. The normal-view recording holds only an invulnerable
observing player, preserving the follow camera and real wildlife time: 960
rendered frames cover 16 seconds. The two labeled detail recordings use a
closer fixed inspection camera and the same scene/animation/lighting; each has
721 rendered frames over 12 seconds. H.264 outputs fully decode and encoded
frame sheets are inspected. This is desktop evidence, not a physical-phone test.

No commit/push, service replacement, personal-Skill edit or Documents write.
The new visual remains subject to the user's review.

The final preview entry is `index-BxdlaDdW.js`. All **593 local build/runtime
files (149,928,697 bytes)** match. The five changed runtime files and five key
CSS/tree/monkey resources match by hash on both loopback and public origins;
this is a focused public asset check, not a new full 593-file remote sweep.
Eleven private/source paths remain denied on each origin, and all four process
identities remain intact. English desktop and Chinese 390 px native public
start/pause/Home, same-address refresh and absence of production debug hooks pass.
An earlier fixture incorrectly required a monkey-texture network response before
launch and failed that check; the failure is retained, not called a game error.
Subsequent local and public production factory checks each construct six actual
skinned monkeys and confirm all six shared-color readiness states, with the
monkey texture returning HTTP 200. No source hook is
added to production for inspection.

Source preservation compares 1,591 preceding inputs: **1,582 are byte-identical**;
only three monkey runtime modules, two focused tests and four project notes
change. There are no added asset files. Close-up video attachment:
`om_x100b62eb0d4f4138dc1ca8b6a1cb442`; surface follow-camera attachment:
`om_x100b62eb07f934a4c1f5e08166ed601`. Both are game recordings, not reference
footage. User review remains pending.

## Batch 10: Victoria waterlilies — 2026-10-25

The user says “好吧，继续下一批” after the real-reference monkey follow-up.
That authorizes moving to this scenery group, not committing/pushing all pending
Amazon work. The prior motion evidence remains recorded; it is not overwritten.
The 20 ordinary animal kinds, three lords and Jade Arowana already have HF
replacements, so this group addresses the old flat green floating discs.

### Reference, provenance and fitting

[Kew's giant-waterlily account](https://www.kew.org/plants/giant-waterlily) and
[Victoria amazonica in Plants of the World Online](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:605776-1/general-information)
inform broad floating leaves, low upright rims, supporting underside ribs and
pale/pink flowers. Original generated concept images are submitted to actual
`microsoft/TRELLIS.2` inference, not a procedural substitute described as HF.
Leaf seed 745101 and flower seed 745102 both complete with downloaded raw GLBs;
receipts, original exports, concepts, conversion and bake reports are retained in
`.local/amazon_batch10_20261025/`. No third-party reference imagery is installed
as a game asset. A slow flower download completes without another generation.

Both assets receive material-aware simplification, fresh UV/color projection and
512-pixel WebP atlases. The raw GLBs and converted color/clay renders are inspected
from multiple directions. An early inspection fixture used the wrong texture
flip; that fixture is corrected and retained separately, without changing the
working shared runtime loader. An overly expensive 10,536-triangle flower is
rejected in favor of the final 4,152-triangle version.

This is decorative, exaggerated game scenery, not a botanical growth simulation:
leaf diameters retain the existing 1.8–3.8 m range; flowers occupy open water next
to leaves, not their centers. The short modeled petioles do not reach the deep
game riverbed. Cream/pink blossoms are not a time-of-day flowering mechanic.

### Runtime and visual corrections

All 230 leaf placements retain their original deterministic seed and scale.
Where original discs overlapped or touched banks, bounded offsets up to 5 m
separate the modeled rims and keep their full footprints in water. Nineteen
small flowers occupy gaps. No new food, damage, obstacles or routes are added.
The original 900 underwater grass placements remain unchanged. All 2,162 static
contacts and 13 floating contacts compare exactly with the preceding snapshot.

The two immutable kits share geometry and retryable color loading. Each map owns
its float material/time, with 96 m spatial instancing and depth/distance culling;
there is no new animation loop or per-frame instance-matrix upload. Tiny bob/tilt
motion uses the existing map clock and stops with pause/reduced motion. Final
waterline fitting references the lowest upper lamina instead of the center:
this fixes a jagged water-plane wedge seen across a foreground leaf in the first
narrow capture. The rejected capture remains in the evidence directory.

The leaf has 2,802 triangles and the flower 4,152. These exceed the initial
1,000/1,800 artistic targets to retain rim and petal shape. All placed copies total
723,348 triangles across at most 34 spatial chunks, with two shared geometries,
two per-map materials and two color textures. The four asset files total 461,648
bytes. This is a detail increase, not a claimed frame-rate optimization. Matched
populated inspection views report scene draw/triangle deltas in `native/report.json`;
spatial culling limits the active subset. Physical-phone performance is unmeasured.

### Checks and review status

Full tests pass **1,783/1,783** before the final waterline correction; the three
focused tests then pass again with an actual transformed-surface check over the
maximum bob/tilt envelope. They also verify bank/flower separation, deterministic
layout, shared geometry, independent per-map time/materials and disposal.
Construction cancellation after river plants releases both kits/materials and
leaves no root behind. Three browser create/render/dispose cycles return the
isolated renderer's geometry and texture counts to zero.

Native Chrome enters Amazon through the ordinary menu and loads both colors.
Matched old/new views use the same scene and inspection camera. The 10-second
follow-view clip holds an invulnerable observing player at the waterline while
retaining the ordinary follow camera; the separate 8-second close clip is labeled
as a fixed inspection view. Both use real scene animation. Waterline, underwater,
390 px desktop viewport, pause and Home/map return are checked, without claiming
physical-phone testing. Intentional texture failures show colored fallback;
unblocking and explicit retry recover both textures without persistent errors.
Final recordings are H.264 encoded and fully decoded before delivery.

Only Amazon waterlily integration and this batch's files/documentation change.
Prior HF creatures, player art, trees/monkeys, roots, driftwood, rules and services
are retained. No personal-Skill changes, Documents work files, commit or push.
This new appearance awaits the user's review.

Final delivery checks: `npm run check` and the production build pass. The preview
entry is `index-Cc5UukOd.js`; all **599 local build/runtime files /150,548,316
bytes** match. Twelve changed/key resources per origin (including both new
colors and CSS) match by SHA-256 on loopback and Cloudflare. This is a focused
remote check, not a new 599-file public sweep. Eleven private/source paths are
denied on both origins. The same four service identities remain live and the
previous runtime is archived as `runtime_before_20261025_211435`.

Public native English 1440 px and Chinese 390 px start/pause/Home and same-address
refresh pass without page/console/HTTP errors or production debug hooks. The
short three-second post-start checks end before the new textures complete;
a separate actual native run confirms automatic leaf/flower HTTP 200 at 33.109
and 33.221 seconds after navigation, about five seconds after play begins.
A separate production-factory inspection confirms both maps ready and correct
texture orientation across 249 instances. No public debug hook is introduced.
This cold-network observation does not establish a loading-time improvement.

Final local footage contains 600 rendered frames over ten seconds in the follow
view and 480 over eight seconds in the close view. Decoded H.264 frame sheets are
inspected. The actual placement correction moves 41 leaves, at most 2.50 m.
Matched populated views add 5–7 draws and 129,232–158,602 triangles; all other
scene content is identical within each comparison.

Source preservation checks **1,586/1,591 preceding inputs byte-identical**:
only `amazon_ocean.js` and four project notes change, with eight new batch files.
The final dated included-quota check is 2026-10-25 21:12:30 BJT: **1,836.433835 of
2,400 GPU seconds remain**, overquota usage is zero, reset returned as
2026-10-26 17:58:22 BJT. No additional paid usage, commit or push occurs.

## Bank and water integration — 2026-10-25

The user asks what remains worth improving, then authorizes the proposed work.
This pass addresses the first two audit priorities: riverbank/bed/island finishes
and the contact between water and the accepted floating scenery. Grass/stone
kits and a measured performance/loading closeout remain separate follow-ups.
The current agent works alone; previous batches and their review history remain.

### Material and water changes

Amazon terrain now uses a region-local, world-space clay/silt finish instead of
the generic local-space stone shader. Coarse sediment variation, fine grain,
upper-bank humus and a damp waterline share a continuous scale across chunks
and transformed island supports. Fine grain fades with pixel footprint; restrained
normal relief avoids the over-strong stripe pattern rejected during this pass.
Terrain positions, normals, indices, transforms and all navigation are preserved.

The water keeps a single plane at the physical `y = 4` waterline. The previous
vertex wave could move it by 0.15 m through leaves fitted to millimetre-scale
clearance. Waves now affect only world-space normals. Transparency depends on
view angle, sampled bed depth and distance. The near range stays more transparent than the distant surface; the new tint
reduces the glass-like appearance. A trial that separately faded terrain was
rejected because unchanged rocks then looked suspended. The final version uses
the water material consistently. This is an artistic surface approximation, not
volumetric absorption or screen-space refraction/reflection. It does not change
the underwater camera's fog, lights or visibility distances.

All 230 existing leaves receive very subtle contact/ripple rings in one instanced
draw. There are no new textures, lights, render targets, food or collisions. The
rings add 460 triangles and, together with the water-depth attribute, 21,328 bytes
of geometry/instance arrays. Materials and the existing game clock remain local
to each map; deep-water culling, pause, reduced motion and construction/disposal
ownership are retained. This is a visual improvement, not a measured FPS gain.
No Hugging Face generation or quota consumption is required for these shaders;
all previously generated models and textures remain unchanged.

### Evidence and status

Evidence is under `.local/amazon_surface_finish_20261025/`: the dated brief,
source baseline, old factories, matched before/after views, contract report,
native recordings and final build/public verification. The old and new factories
produce byte-identical geometry for all 63 terrain/cap/support meshes, with
identical 2,162 static and 13 floating contacts. Private clocks, reduced motion,
exact-once owned-resource disposal and cancellation after river plants are checked.
Matched cameras inspect waterline, shore, riverbed and island underside; fish and
other animated objects can differ because the captures are separate game runs.

This candidate awaits the user's visual review. No commit, push, personal-Skill
edit or Documents work artifact is part of this pass. Formal Pages is unchanged.

Final checks: all **1,786 tests** pass before the last visual constant/veil
adjustment; the final **16 focused tests**, unchanged-geometry/contact comparison,
format check and production build then pass again. Native Chrome compiles both
quality paths without page/console errors, preserves pause/reduced-motion clocks,
releases the four owned water resources and instanced object on a map switch,
and returns through Hawaii to Amazon. A separate eight-second ascent/descent
crosses the waterline using normal movement, with sampled frames reviewed.
The 390 px view is desktop emulation, not a physical-phone performance test.

The final 21-second game-only video contains an eight-second ordinary follow
segment (96.20 m displacement), six seconds of fixed lily inspection, and seven
seconds of underwater follow (84.21 m). Raw renders, H.264 files, full decode
checks and inspected frame sheets are retained. No third-party footage is sent.
The island geometry is unchanged; the finish does not repair coarse silhouettes
or make the river optically opaque. These remain potential later art choices.

The preview is rebuilt at the same restricted origin with entry
`index-2ZxiEK4X.js`. All **599 local build/runtime files /150,557,102 bytes** match;
eight changed/key files per origin match remotely by SHA-256. Eleven source/private
paths are denied. Public native English 1440 px and Chinese 390 px start, pause,
Home and same-address refresh pass with no production debug hook or browser/HTTP
errors. This is a focused remote check, not a new full 599-file remote sweep.
No new texture-loading path is introduced; earlier lily loading remains intact.

Preservation checks find **1,593/1,599 preceding inputs byte-identical**; changes
are limited to `amazon_ocean.js`, `amazon_island.js` and four project notes, plus
the two new finish modules and focused test. HEAD remains `591f357c`; all four
service identities remain unchanged. The previous runtime is archived as
`runtime_before_20261025_230105`. No commit or push occurs.

## Acceptance and local commit — 2026-10-26

The user requests a commit of the completed Amazon work, then a separate fix
for large ordinary predators overshooting during charge attacks. All 1,602
delivered inputs match the final bank/water snapshot before status-only edits.
The existing final checks remain applicable; no new physical-phone claim is
made. All ten redraw batches and the final surface pass are included in the
local commit. No push or publication is authorized.
