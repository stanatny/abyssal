# Odyssean Sea Hugging Face redraw

## Production brief — 2026-10-28

Status: the user accepts the first lord appearances; revised Scylla motion awaits review. The user authorized starting the final map and requested authoritative illustrated mythology references. The existing Odyssey descriptions, species lengths, combat rules and region layout remain the contract. Development is on `art/odyssey-hf-redraw`, starting from local documentation commit `54877d1`; this is not a release or push authorization.

### Scope and identity

The first review batch is the three existing lords: Scylla, Charybdis and Karkinos. Ordinary inhabitants, the rare Argonaut and regional architecture follow in separate reviewable batches. Reuse the accepted player characters and shared assets. Do not regenerate already accepted cross-region assets merely to complete a regional checklist.

Keep the Mediterranean mythic identity: pale limestone straits, warm amber light, red coral, amphorae, bronze details and an ancient galley. Follow the current `odyssey_config.js`, `odyssey_lords.js` and final region ecology, not historical coordinates copied from another map. The current broad world bounds are X −300…300 and Z −1150…140; the surface is Y 4 and the deep limit is approximately 740 world metres. Display depth is a separate convention. No layout, stock or feeding change is part of this first appearance batch.

Existing model factories serve both Guide and world. Scylla needs six independent mouth anchors and coherent neck/fin-foot motion; Charybdis needs a genuinely recessed mouth, pumping anatomy and its existing undertow/surge interaction; Karkinos needs eight articulated walking legs, two claw contacts and the existing terrain-grounding contract. A textured static mesh is not a completed replacement.

### Sources and adaptation decisions

There is no single illustrated edition that determines every creature's appearance. Distinguish the literary description, ancient iconography and later illustrations:

| Source                                                                                                                 | What was checked                                                                   | Use and limits                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Homer, _Odyssey_, Book XII, Samuel Butler translation](https://www.gutenberg.org/files/1727/1727-h/1727-h.htm#chap12) | Literary source for Scylla and Charybdis                                           | Establish the six-necked threat and swallowing/expelling sea motif; it is not a model sheet.                                                                                                                                                                                                            |
| [National Archaeological Museum, _Aquatic dreads…_](https://www.namuseum.gr/en/monthly_artefact/aquatic-dreads/)       | Museum text and actual photograph of bronze Scylla X21084, late fourth century BCE | The photograph has a human upper body, canine forms and a fish tail. The museum explicitly distinguishes this later humanized iconography from Homer's six necks/twelve feet. Retain ABYSSAL's existing nonhuman six-headed description rather than silently changing its anatomy to match this bronze. |
| [Metropolitan Museum, gilt silver kylix 2015.260.1](https://www.metmuseum.org/art/collection/search/646262)            | Actual collection image and catalogue; late fifth century BCE                      | Canine heads, scaly marine extremities, wave framing and ancient visual vocabulary. Public-domain image, but not imported as a game texture.                                                                                                                                                            |
| [Getty, Caeretan Hydria 83.AE.346](https://www.getty.edu/education/k-12-learning/explore-caeretan-hydria/)             | Actual close-up of the crab and museum explanation of the Herakles/Hydra scene     | Articulated crustacean silhouette and strong pincers. Karkinos belongs to the Herakles tradition, not to the encounters of Homer's Odyssey; the map already combines Greek traditions.                                                                                                                  |
| [The Mariners' Museum, _Scylla et Charybdis_, 1724](https://catalogs.marinersmuseum.org/object/CL16311)                | Actual engraved plate, after Joachim von Sandrart                                  | Reference for the threatening strait, reef and whirlpool landscape. The plate depicts geography rather than a definitive creature anatomy.                                                                                                                                                              |

A further inspected teaching illustration from [Classic Tales, _Scylla_](https://classictales.co.uk/sites/default/files/scylla.pdf) identifies its basis as Réveil after John Flaxman, _L’Odyssée d’Homère_ (Paris, 1835). Its heads have human faces and tentacle-like lower forms; this is useful evidence of later interpretation, not anatomical authority for replacing the game's established six canine heads. The Royal Academy original catalogue and British Museum Fuseli print were found, but their full pages were unavailable to the research tool; do not claim to have inspected their originals.

The original creature concepts are generated from textual traits, not copied museum images. The first Scylla concept preserves six canine marine heads and a low scaled trunk; Karkinos preserves a broad bronze-red shell, unequal pincers and eight walking legs. Charybdis's annular armored body and toothed tidal-pump anatomy are the game's fantasy adaptation of the whirlpool motif, not a claim about an ancient canonical illustration. Museum/reference downloads remain private inspection evidence under ignored `.local/`.

### Production and acceptance

Original raster concepts feed Microsoft TRELLIS.2 through the authorized Hugging Face service. Keep seeds, source hashes, stage receipts and rejected attempts under `.local/odyssey_hf_20261028/`. Check live included ZeroGPU quota before generation and export; do not use paid overage. A saved GLB only establishes generation success, not anatomical or game acceptance.

Inspect raw, reduced and packed meshes in neutral material and textured views. Fit actual anatomical pivots and continuous skin weights, retain UV seams and source-color provenance, and measure separate-instance state and disposal. Avoid replacing continuous joints with conspicuous patch spheres or masking malformed surfaces with effects.

Review matched Guide views, real-world travel, turns, each affected ability, pause/resume and repeated entry. Preserve gameplay files and unrelated species; verify shared-material preparation, failure/retry and served preview resources. Record scene cost as well as isolated asset cost. Desktop narrow-screen checks do not constitute physical-phone testing.

## First lord candidates — 2026-10-28

Status: implemented, awaiting user appearance/motion review. No commit, push,
version change or formal publication. The current official release remains
v0.11.21. New authoritative sources above guide interpretation; the existing
bilingual lore is unchanged.

### Source and fitted anatomy

- **Scylla:** selected TRELLIS attempt 04 has six connected houndlike heads and
  eight fin-feet. Four additional feet reuse a complete pair from that same HF
  mesh, preserving source UV/color. This completion is disclosed rather than
  claiming the generator produced twelve feet. Separate surface ownership and
  continuous lower-neck blending prevent nearby necks from tearing one another.
  Twelve foot chains, tail motion and six posed mouth anchors replace the old
  procedural appearance. Attempts 01 (disconnected rear head), 02 (body loop)
  and 03 (seven heads) remain rejected in private evidence.
- **Charybdis:** selected attempt 01 has a physically recessed, toothed intake,
  armored outer body and fin skirt. The mouth expands during undertow and
  compresses during surge. Front collision sections follow the actual rim in
  sectors, leaving mouth water open; the rear body is solid. This is a game
  interpretation of the tidal motif, not an ancient canonical anatomical claim.
- **Karkinos:** selected attempt 03 has eight walking legs and two pincers.
  Loose generated scraps were removed; connected branch ownership keeps each
  pincer intact across the centerline. Fitted knee poles preserve the source
  limb plane during the existing seabed IK. Normal claws, fault attack, sole
  fitting and instance-local disposal keep the existing interfaces.

All meshes and color images come from the authorized HF pipeline, with original
text-generated concepts. Runtime geometry/material/color caches are shared;
private skeletons and motion clocks are independent. Three geometry-keyed
interior seals were appended; all 675 previous records remain exact. The new
seals fill camera-intersected body sections, not visible-model holes. No gameplay
configuration, description, region stock, sound or terrain file was changed.

| Candidate | Vertices | Triangles | Packed geometry JSON |    Color WebP |
| --------- | -------: | --------: | -------------------: | ------------: |
| Scylla    |   43,568 |    33,550 |      2,117,167 bytes | 274,704 bytes |
| Charybdis |   36,946 |    25,968 |      1,095,489 bytes | 429,266 bytes |
| Karkinos  |   37,139 |    27,576 |      1,164,266 bytes | 446,852 bytes |

Each visible body is one skinned draw with a 1024 px color texture. These are
asset costs, not whole-scene performance or phone-temperature measurements.

### Verification and evidence

Evidence lives in ignored `.local/odyssey_hf_20261028/`: original generation
receipts, rejected sources, raw/packed/clay views, matching before/after cameras,
surface audits, native recordings and validation logs. No third-party reference
film or museum texture is included in the game or delivery media.

- The first full suite ran 1,996 cases: 1,993 passed, and three exposed stale
  appearance assumptions / missing interior preparation. The missing seals,
  mouth-opening collision fit and changed-model fixture scope were corrected.
  A fresh 66-case integration suite passes, including all affected failed suites.
  The final complete rerun also passes all 1,996 tests with no failures.
  Unchanged Odyssey and Amazon species retain exact sampled posed surfaces,
  anchors and bounds against their prior factories.
- All three actual skinned surfaces were sampled through hunt, windup, attack
  and recovery. UV duplicates retain identical weights; maximum sampled edge
  extension ratios are 1.567 / 1.431 / 1.457 respectively. These mechanical
  checks accompany, and do not replace, actual multi-angle inspection.
- Native Chrome Guide flows cover all three in English and Chinese. Real-world
  captures use an initially staged 30 m invulnerable player, normal Slow input
  and a labelled observer camera; no per-frame NPC repositioning or separate
  animator override. Scylla completes volleys from its posed mouths; Charybdis
  completes undertow/surge; Karkinos completes claw/fault. Pause freezes motion.
  The invulnerable fixture is unsuitable for difficulty claims.

### Preview and lifecycle closure

The restricted preview was rebuilt in place, preserving service identities and
archiving the prior runtime. Its entry is `index-rWOed4i0.js`. All 818 local
build/runtime files match (240,149,058 bytes). Fresh HTTP verification checks all
14 changed files against both local and public origins; the 804 unchanged files
retain their earlier full-public evidence, not a newly claimed full HTTP pass.
Eleven source/private routes remain unavailable on both origins. Production
exposes no development inspection hook.

Twelve fresh public Guide cases cover three lords, English/Chinese and
1280 × 800 / 390 × 844 desktop viewports; textures load and no page errors occur.
Normal public menu entry into Odyssey and pause also pass without page errors.
This narrow viewport is not an actual phone test. Three Odyssey/Hawaii cycles
reuse exactly the same three pooled lord skeletons and shared geometry/color
resources. Final encounter disposal emits one bone-texture release per skeleton;
a repeated dispose emits none. An early audit mistakenly recreated bone textures
itself; the corrected probe only creates an absent texture and its fresh run is
saved separately from that rejected diagnostic result.

The delivery comprises three matching before/after images and a 59-second game
video with labelled observer-camera footage. The final encoded frames were
inspected. `native/lifecycle.json`, `native/public_report.json`, `artifacts.json`,
`source_preservation.json`, `final_fingerprints.json` and `delivery.json` preserve
scope and receipts. All 1,885 unrelated baseline files remain byte-identical;
the ten allowed edits are documented source/test/entry updates. The 675 prior
interior records remain exact. No accepted model, lore, ability configuration,
stock or terrain was replaced outside this batch. Formal main remains v0.11.21;
these three candidates await user review and remain uncommitted/unpushed.

## Scylla movement follow-up — 2026-10-28

The user accepts the lord appearances but rejects Scylla's movement as uncanny.
This reopens motion review; the first delivery's passing tests did not establish
acceptable world attitude. No HF regeneration or color/geometry change is needed.

A fresh native replay reproduces the whole-body inversion. The generic
`setFromUnitVectors` heading uses a shortest arc that can turn a rear/upward
pursuit into a belly-up roll. Its captured minimum back-up Y is −0.191. The
fin-foot animation also used the factory's effort-scaled time directly, making
stationary attacks accelerate the paddling.

`scylla_swim.js` now supplies a species-scoped yaw/pitch steering policy and
actual-speed stroke clock. The body remains dorsal-side-up; yaw is bounded to
1 rad/s, pitch to ±0.38 rad with a 0.4 rad/s transition. Resolved translation
uses the same direction, producing an upright arc and shallow ascent/descent.
This deliberately changes Scylla's trajectory style, rather than claiming a
render-only fix. Existing full-body terrain sweeps still accept or reject the
move. Other lords retain their prior branches. Length, speed values, territory,
health, attack timing, locked targets and projectile damage are unchanged.

Twelve fin-feet execute staggered rearward power strokes and folded recovery.
The clock recovers active seconds from the shared factory phase, smooths actual
travel effort, and diminishes strokes when stopped. The six necks remain
independent, with restrained recoil during their existing volley. No new meshes,
textures, render passes or per-frame geometry uploads are introduced.

Evidence is in `.local/scylla_motion_20261028/`. Ninety focused cases pass,
including rear/vertical targets at 30/60/120 Hz, body/travel agreement, pause,
independent attack effort, reset, skinned boundaries and affected boss contracts.
A further full-surface audit covers actual 0/26/33 m/s inputs; the largest sampled
edge-extension ratio is 1.788, within the existing 1.8 regression bound. This
mechanical measurement accompanies the rendered inspection rather than proving
anatomical quality by itself.

The revised 26-second native encounter covers pursuit, windup, volley and
recovery; position spans 40.3 / 5.5 / 45.0 m along X/Y/Z. Back-up Y stays at or
above 0.929, and pause freezes the actual skin and root. Ten projectiles are
observed within at most 1.12 m of a posed mouth on their first recorded frame
(one physics step after emission). The fixture stages a 30 m invulnerable player
and observer camera, then runs ordinary AI and Slow input without per-frame NPC
placement. It does not establish difficulty or natural progression. A separate
unengaged patrol capture checks motion without close combat interference.

The new preview entry is `index-fBplz8fw.js`. All 818 local build/runtime hashes
match; the three changed public artifacts were freshly fetched and matched,
while 815 unchanged files retain dated prior evidence. Eleven source/private
paths remain denied. Four fresh public Scylla Guide cases cover both languages
and desktop/narrow layouts, without errors or production debug hooks. The final
37-second encoded video combines unengaged patrol and the normal combat loop;
its output frames were reviewed. Six existing files change in this follow-up,
with all accepted geometry, textures and other source inputs preserved. Actual
delivery receipts and final fingerprints are stored alongside the evidence. This is desktop Chrome verification, not a physical phone test.
The accepted source meshes, textures and other two lord animators remain exact.
The correction remains uncommitted/unpushed pending player review.

## Scylla visible propulsion repair — 2026-10-28

The user rejects the preceding motion delivery: “你看它的脚完全没在动，头也没在动，尾巴也没在动，就只是身体在平移，非常的不自然”. The previous upright-steering repair does not establish local animation quality. Its video and numerical checks remain historical evidence, not acceptance of this motion.

### Finding and change

The ordinary world caller did supply actual travel and animate the rig. At a
4 m/s patrol speed, however, the old foot-tip excursion was only about
1.4–1.6% of body length and the tail-tip excursion 0.85%. Head movement was
similarly slight. These are body-relative surface measurements; moving bones
and a turning root alone had hidden the readability problem.

The revised stroke retains a readable paddle cycle at low travel speed and
uses speed mainly to change cadence. Twelve fin-feet push back and fold during
recovery, the six necks move with offset phases, and the tail carries a visible
wave. During stationary phases these settle into restrained movement instead
of a completely frozen mesh. Windup and sequential recoil still accompany the
existing six-mouth attack. The earlier upright turn/climb correction remains.

Larger poses exposed a separate binding defect: original foot-root ownership
jumped between spatial Z slices, and the added feet mixed their palms with a
stationary torso. The repair keeps each added foot continuous, blends original
root ownership across the actual surface, and fades the rear neck boundary.
A reproducible offline solve writes a sparse override for 6,191 vertices;
runtime decodes it once per shared geometry. It does not solve adjacency or
iterate weights during loading or play. Rest positions, normals, UVs, triangles,
color texture, scale, population and ability values are unchanged. Other lords
keep their existing assets and motion.

### Fresh verification and limits

- 94 focused tests pass, including every head/foot/tail's actual slow-patrol
  surface, UV duplicates, independent instances, disposal, pauses, attack
  phases, upright steering, body contact and adjacent lord regressions.
- The expanded surface audit covers stationary, 4, 26 and 33 m/s travel over
  sixteen seconds each. Worst sampled triangle-edge expansion is 1.769;
  the existing 1.8 limit was retained. The bake reproduces byte-for-byte.
- Fresh native world captures include 17 seconds of ordinary dormant patrol,
  27 seconds of combat with two completed attack/recovery cycles, and 12 seconds
  using the original follow camera. These retain ordinary NPC update,
  visibility and animation; no forced-visible NPC or extra animation loop.
  The player is staged, stationary and invulnerable. Observer-camera clips
  are identified separately from the original follow-camera clip.
- During the native patrol, all twelve sampled foot surfaces move roughly
  5.3–6.8% of body length, all six heads 4.9–6.6%, and the tail 10.1%.
  These support, but do not replace, review of the encoded game footage.
- Pause freezes root and local pose. The back remains upright through observed
  turns (minimum world up-Y 0.929). New water projectiles first appear within
  1.42 m of a posed mouth after their first physics step.
- The weight override adds 111,438 decoded bytes and no additional GPU
  attributes, bones, draw calls or per-frame surface traversal. Download/build
  deltas are recorded with the served artifact check. No physical-phone or
  heat/performance improvement is claimed.

Evidence is under `.local/scylla_propulsion_20261028/`: immediate source and
asset baselines, rejected binding experiments, `final_surface.json`,
`targeted.log`, `native_summary.json`, actual patrol/combat/follow clips,
matched local-animation comparison, source/asset preservation and preview
checks. The new candidate remains uncommitted and unpushed, pending user
motion review. No HF generation or personal Skill change was needed.

The restricted preview now serves `index-BC4Hl8Fx.js`. All 818 local build and
runtime artifacts match (240,363,205 bytes including raw and gzip copies).
The five changed resources were freshly fetched and hash-checked through both
local HTTP and the public preview; the other 813 retain their dated earlier
public verification. The Scylla model gzip grows by 61,747 bytes; this is a
specific download cost, not a measured frame-time improvement. Four native
English/Chinese Guide cases at 1280/390 px pass with no captured errors, and
production debug globals remain absent. The 390 px view is desktop emulation.
Source/private routes remain denied and all four service identities remain.
The delivered silent 42-second clip contains matched local animation, real
world patrol/combat and the original follow camera.

## Scylla travel-coupled turning — 2026-10-28

The user finds the appendage repair better, but points out that this foot-driven
silhouette should not rotate through a full circle in place. This reopens the
whole-body turning finding; the preceding receipts remain dated evidence for
local skin animation, not acceptance of all travel behavior.

Two mechanisms caused the mismatch. At 3.4 m/s the prior 1 rad/s yaw bound allowed
a 54 m creature to turn around a radius of only 3.4 m. Separately, attack locking
replaced the movement heading and rotated the stopped body. A fresh native rear
approach reproduced 129.48 degrees of rotation during a windup with zero travel.

The Scylla-only steering now limits curvature to a minimum half-body-length turn
radius, in addition to the existing angular/pitch bounds. Torso orientation reads
resolved world displacement after movement checks; a blocked or stationary body
holds its attitude. The six-head volley uses its existing lock target and mouth
origins. During hunt, a rear target first requires a moving turn into the front
120-degree sector before the usual windup countdown can complete. This can delay
an attack approached from behind; it prevents the former stationary turn and
backward firing without changing projectile speed, damage, six-shot cadence,
windup/attack/recovery durations, world speed or territory. It does not turn the
aquatic encounter into a new terrain-snapped walking encounter.

Accepted meshes, color, binding, head/foot/tail animation, resource ownership and
other species remain exact. No new generated assets, render passes, bones or
per-frame allocations are introduced. Source edits are limited to
`scylla_swim.js`, the species branches in `encounters.js`, two affected test files
and this review/entry documentation.

Fresh checks in ignored `.local/scylla_turning_20261028/`:

- 98 targeted tests pass, including 30/60/120 Hz turn arcs, blocked/stopped body
  attitude, actual local skin motion and real encounter updates for rear, close
  and elevated targets. All three target cases spawn at least two full six-head
  volleys. Projectile creation is observed at scene insertion because near-target
  impacts can remove a projectile within its first update; frame snapshots alone
  undercount these shots. An initial test also compared an Object3D quaternion's
  callback property; the assertion now compares its actual components.
- Matched native rear approaches preserve initial placement, lighting and camera.
  The final capture has zero torso rotation through stationary windup and attack,
  six actual mouth-launched projectiles, a moving turn, recovery and return.
  Pause freezes the body and skin. A separate fixed observer view retains the
  scenery reference; the regular follow camera is checked separately.
- Capture fixtures use an invulnerable 30 m player and staged initial positions;
  ordinary encounter, animation and movement updates then run. They do not pin
  or separately animate the lord. These are desktop Chrome observations, not
  physical-phone testing or natural progression/balance acceptance.

The restricted preview and final delivery receipts below are refreshed for this
candidate. Formal main/Pages remains v0.11.21; no commit or push is performed.

Restricted preview receipt: all 818 local build/runtime artifacts match their
hashes (240,363,924 bytes including gzip copies). Three changed artifacts pass
fresh local and public HTTP hash checks; the other 815 public artifact checks
remain the preceding dated evidence. Source/private routes stay denied and all
four service identities are retained. The current entry is `index-BG_v13ks.js`.
The silent 29-second delivery compares the rear approach, a fixed-camera turn,
stationary volley and original follow camera. The first follow-camera take faced
away from the lord and was excluded; the corrected take faces the encounter.

Fresh compiled public Guide checks pass in English/Chinese at 1280 and 390 px,
with loaded colors, no captured page errors and no production debug globals.
The script's first retry waited for a `hidden` attribute on a native dialog; the
corrected observer waits for `dialog.open` and layout. This was a fixture issue,
not a runtime change. Final H.264 decode and sampled encoded frames are checked.

## Shallow-creature batch — 2026-10-28

Status: following the user's request to move on after Scylla's turning revision,
this batch replaces **Ambrosia Sprat, Moon Scallop, Lyre Ray and Pearl-crowned
Seahorse**. These four new appearances await individual player review. No commit,
push or formal release is made. The existing three lord candidates are preserved.

### References and production choices

These are original fantasy species derived from the existing bilingual text;
none is presented as a zoological identification or a canonical ancient monster.
The [Thessaloniki Archaeological Museum's shell-borne Aphrodite](https://www.amth.gr/en/exhibitions/exhibit-of-the-month/birth-goddess-figurine-aphrodite-anadyomene-shell)
provided classical shell-motif context, not copied geometry or texture. The exact
inspected source URL is retained in the private brief; no museum image was sent
to the generator. An Acropolis lyre catalogue was searched, but its full page was
unavailable and is not claimed as inspected visual evidence.

Motion references include [NOAA's scallop-clapping explanation](https://www.fisheries.noaa.gov/national/outreach-and-education/fun-facts-about-intriguing-invertebrates),
the [Florida Museum's skate/ray anatomy account](https://www.floridamuseum.ufl.edu/discover-fish/skates-rays/biology/),
and the [Institut océanographique Paul Ricard's seahorse account and photograph](https://www.institut-paul-ricard.org/?especes_aquarium=seahorse&lang=en).
The resulting game adaptations use tail propulsion, hinged shell claps,
sequential fin-edge undulation and upright fin propulsion respectively.
The seahorse's curled tail drifts gently; it is not treated as its propeller.

Original text-generated concepts were processed by Microsoft TRELLIS.2 using
included HF Pro quota. Sprat, ray and seahorse use attempt 01; scallop uses
attempt 02. Scallop 01 exposed too much soft tissue and is rejected. Original
GLBs, concepts, hashes, receipts and all rejected conversions remain under
`.local/odyssey_batch2_20261028/`. No extra quota purchase was made.
At 09:03:40 BJT the live API reported **1394.077169 / 2400 seconds remaining**,
zero overage and reset at **18:03:59 BJT on 2026-10-28**. This is a dated balance,
not a promise about later availability.

### Anatomy, material and integration

The shared Guide/world factory dispatches only these four kinds to the new
builder. Every instance owns its skeleton and motion state; immutable geometry,
color texture and material are cached per species. The existing bounded material
queue provides retry and an opaque species-colored fallback. No particle system,
extra transparent glow, new light or extra normal map is introduced.

- Sprat: an amber back, pale belly, sail-shaped dorsal fin and forked tail; fitted
  posterior bending and separate pectoral-fin motion keep the head stable.
- Scallop: complete ribbed valves, a narrow living mantle and fitted hinge motion.
  The first aggressive reduction opened visible cracks despite passing numeric
  checks. The delivered conversion locks shell seam borders and uses a tighter
  error threshold. It retains **31,644 triangles** instead of forcing the desired
  16,000 target; this is the largest cost in this batch. Additional position-only
  experiments were not selected. The existing five-per-group ecology is unchanged.
- Ray: the broad lyre-shaped disc has sequential wing sections and two complete
  trailing ribbons; deformation follows the final generated surface.
- Seahorse: the generated eye irises receive small, fitted vertex-color pupils;
  non-eye atlas colors remain unmodulated. Uniform crown-to-tail normalization
  bounds its upright height at one unit without squashing the source proportions.
  The previous longitudinal normalization made it twice as tall. Its gameplay
  length, movement speed and feeding identity remain unchanged.

A single skinned draw is used per creature. The old Scallop test sampled the
stationary hinge; the general test now samples the actual upper valve, with a
separate assertion that the hinge stays fixed. Seahorse length validation uses
its upright measurement axis rather than weakening its height bound.

### Fresh verification and limits

- **41 targeted tests** and **2011 full-suite tests** pass. Checks cover finite
  normalized weights, joined UV-seam vertices, actual surface movement, culling
  bounds, independent instances, frozen poses, and idempotent skeleton disposal.
- **21 unchanged Odyssey kinds / 630 poses** match the pre-batch factory exactly,
  including the accepted lord meshes and movement. Lore, population, combat,
  map layout and all other-map asset inputs remain unchanged in the source audit.
- Native desktop Chrome: **eight bilingual Guide cases** and four real shallow
  world recordings. Initial player placement and an observation camera were used;
  NPCs were not pinned or manually animated. All four moved, remained visible and
  froze on pause. Nine-second axis ranges were approximately 3.2 m (sprat), 2.8 m
  (scallop), 8.5 m (ray), and 16.8 m (seahorse); these are scene observations, not
  configured speed changes or deterministic balance guarantees.
- Four injected texture failures show the opaque fallback and recover through
  explicit retry. Four rebuilds per species retain the same texture/geometry,
  stable renderer resource counts and no repeat download.
- Matched studio views and a native-world video are saved for user review; final
  encoded frames and decoding are inspected. Desktop/narrow-window checks do not
  constitute physical-phone performance or thermal testing.

Evidence: `native/report.json`, `final_views/report.json`,
`unchanged_species.json`, `targeted_final_fit.log`, `all_tests_final.log`,
`delivery/encoded.json` and `delivery/encoded_review.jpg` in the batch directory.
Final preview publication evidence is recorded below.
The next unredrawn groups include mythic people/mounts, larger hunters and the
remaining ordinary/rare inhabitants, followed by map-specific scenery.

### Batch resource accounting

Final packed counts (one skinned draw each): sprat 6,000 triangles / 8 bones;
scallop 31,644 / 4; ray 7,985 / 17; seahorse 9,996 / 13. Every color atlas is
1024×1024. The four packed meshes total 1,941,846 bytes and their WebP colors
1,105,328 bytes. Decoded shared geometry is 3,942,742 bytes. Four uncompressed
RGBA color textures with mipmaps are estimated at 22,369,624 GPU bytes per
renderer context; this estimate is not a physical-device memory measurement.
There are no additional draw layers or per-frame geometry uploads. Details and
rebuild observations are in `asset_cost.json` and `final_views/report.json`.
Native checks used this Mac mini M6 / 32 GB, macOS 27.0.1, desktop Chrome,
1280×800 with DPR 1; narrow production checks use 390×844 on the same desktop.
No claim of physical-phone frame rate or heat reduction is made.

The first narrow production review exposed a cropped seahorse despite the
raw builder's bounded height. The public factory had not synchronized the
SkinnedMesh binding inverse after internal uniform scaling, so the Guide cached
a half-sized initial bounding box. The four new kinds now use the existing
factory synchronization path before the first bounds query. A regression checks
both unit-size and 2.4 m seahorses without a prior test-only matrix update.
Earlier passing numerical checks did not establish correct Guide framing; final
narrow screenshots are inspected after this fix.

### Final candidate publication

The final restricted preview serves `index-UjXqZ7P1.js`. All 830 build/runtime
artifacts (244,493,600 bytes, including compressed copies) match locally.
The 15 new or changed artifacts have fresh local and public HTTP hash checks;
815 unchanged public artifacts retain the preceding dated verification rather
than being described as newly fetched. Eleven private/source routes remain
unavailable. Existing development, preview, awake and tunnel processes are kept.

The compiled public site passes 16 Guide cases across English/Chinese and
1280/390 px desktop viewports, with loaded colors, no captured errors and no
production debug globals. The corrected narrow seahorse image is manually
inspected: the crown, snout and full curled tail fit within its specimen panel.
The earlier cropped screenshots are retained under `public_before_fit/` as
rejected evidence. Initial automation attempts clicked while the region-loading
overlay was still active; the corrected observer waits for interactive startup.
Those fixture retries are not represented as product repairs.

The input audit preserves 1,907 of 1,915 pre-batch files byte-for-byte; the eight
changed existing paths are this review, the three project entry documents,
two creature factory files and two existing tests. Prior lord and other-map
work remains intact. Reports are `artifacts.json`, `public/public_report.json`,
`source_preservation.json` and `final_fingerprints.json`. The four matched
comparison images and 30-second native-world clip are delivery candidates;
actual messages and individual player acceptance remain in `delivery.json`.
No commit or push is made.

## Garden-creature batch — 2026-10-28

The user's “好的，做下一批吧” accepts the preceding four shallow candidates and
authorizes this next group. It does not authorize a commit or main release.
The new group is **Iris Cuttlefish, Amphora Hermit, Aegean Lamp Jelly and
Silverleaf Pipefish**. Original lore, measurements, stock, feeding, combat,
abilities and regional layout remain. Other maps and all earlier candidates
are preserved. This group awaits player appearance/motion review.

### References, generation and fitting

These are original fantasy designs informed by real anatomy. The
[Institut Paul Ricard cuttlefish account](https://www.institut-paul-ricard.org/?especes_aquarium=common-cuttlefish&lang=en)
informs the broad fin margin and separate short arms/feeding tentacles;
[Singapore NParks' hermit-crab entry](https://biodiversitysg.nparks.gov.sg/our-biodiversity/marine-invertebrates/marine-arthropods/hermit-crab/)
informs stalked eyes and walking limbs. The shelter is a fictional reused
ceramic vessel, with [the Met's Attic amphora record](https://www.metmuseum.org/art/collection/search/253628)
as historical form context. [Georgia Aquarium's Moon Jelly account](https://www.georgiaaquarium.org/animal/moon-jelly/)
informs the bell, four oral arms and marginal tentacles;
[Monterey Bay Aquarium's Leafy Sea Dragon account](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/leafy-sea-dragon)
informs camouflage lobes and tubular snout. None establishes these mythic
species or their existing game movement as a real-world biological claim.
No museum artwork was uploaded; original generated concepts were supplied to HF.

All four TRELLIS.2 exports were downloaded fully, verified and inspected in
color and clay before conversion. Raw GLBs, source hashes, stage receipts,
concepts, rejected conversions and captures remain under ignored
`.local/odyssey_batch3_20261028/`. The live included quota was 1394.077169 seconds
at 09:25 BJT, then 1199.508013 seconds at 09:45 BJT; over-quota usage stayed zero.
The returned reset was 18:03:59 BJT on October 28. These are dated observations.

- Cuttlefish: two continuous fin margins receive travelling waves; the mantle
  stays firm and the forward arms flex gently. An aggressive first conversion
  collapsed thin surfaces into speckles. Lower geometric error preserves the
  final silhouette and removes that artifact; it was not hidden with a texture.
- Hermit: fitted asymmetric walking legs, claws and feelers move independently.
  The chipped ceramic shelter remains rigid. Existing aquatic locomotion and
  habitat are retained rather than adding a new ground-crawling gameplay system.
- Jelly: the bell contracts, with delayed motion in four fitted oral branches
  and the marginal fringe. Ordinary alpha layering produced visible triangular
  overlaps and was rejected. The final soft pearl/lavender surface is opaque,
  with restrained emission and no extra render pass. Finer conversion keeps the
  frilled oral-arm edges. An over-dense intermediate exceeded the packed Uint16
  limit and was not installed; conversion now rejects such an output explicitly.
- Pipefish: its raw longitudinal axis was X, unlike the others. The final export
  is rotated rigidly to -Z; no proportion squashing. A restrained axial sway and
  separately fitted dorsal/paired pectoral fins replace a generic tail wave.
  Inspection found a zero-blend influence overwriting the dorsal slot; the
  corrected helper preserves distinct fin ownership, covered by actual-vertex
  regression and a fresh world recording.

All four use the existing shared Guide/world factory, first-query bounds
synchronization, retryable color loader and private instance skeletons. Their
visual orientation stays upright; velocities and movement rules are unchanged.
No per-frame vertex-array upload, layered glow geometry or new runtime package
is introduced.

### Verification and limits

The final targeted suite passes **43 checks** covering real posed skin, joined
UV duplicates, finite normalized weights, culling, first bounds at two sizes,
independent instances, frozen repeated phase, rigid ceramic/mantle regions,
three independently moving pipefish fin regions and skeleton disposal.
**21 unchanged Odyssey kinds / 630 poses** match the pre-batch source exactly.

Native desktop Chrome checks eight bilingual Guide cases and ordinary world
travel for all four, followed by a fresh two-language pipefish check/recording
after the fin correction. The observer changes initial player position,
invulnerability and camera only; no target pinning, forced visibility or manual
NPC animation. Posed surfaces and scenery displacement are recorded, and all
four freeze on pause. These nine-second samples are not a balance simulation.
Four injected color failures recover through explicit retry; four rebuilds per
species preserve shared geometry/texture identity, resource counts and download
counts. The raw exports, packed neutral surface and moving surface were inspected
separately. A diagnostic capture initially held time constant; its static images
were replaced by increasing-time captures before motion review.

This Mac's desktop Chrome evidence does not establish physical-phone frame
rate or thermal behavior. Existing unrelated generated JSON formatting warnings
are kept separate from checks of this batch's edited code and assets.

### Final garden delivery checks

The complete final suite passes **2,020/2,020 tests**. The final preview entry is
`index-DThNev5j.js`. All **842 dist/runtime files (253,147,689 bytes)** match
locally. Fresh local/public HTTP reads verify the 15 new or changed files;
the 827 unchanged public files retain the preceding batch's dated full-public
verification. This is not a new full public download audit. Eleven source/private
paths remain unavailable and all four original service PIDs are preserved.

The compiled preview passes **16 bilingual Guide cases** across 1280 px and
390 px desktop viewports, with loaded color, no captured errors and no production
debug globals. All four narrow specimen screenshots were manually reviewed;
complete silhouettes fit within the panels. This is desktop viewport testing,
not physical-phone acceptance.

Each new creature uses one skinned draw and one shared 1024-square color atlas.
The four atlases estimate 22,369,624 bytes of RGBA storage including mipmaps per
WebGL context; this is a storage estimate, not measured physical GPU allocation.
The actual packed asset and shared geometry costs are:

| Creature        | Triangles | Bones | Geometry bytes | JSON bytes | Color bytes |
| --------------- | --------: | ----: | -------------: | ---------: | ----------: |
| iris_cuttlefish |    48,584 |    45 |      3,783,858 |  1,834,835 |     358,300 |
| amphora_hermit  |    24,918 |    23 |      2,359,192 |  1,114,745 |     325,966 |
| aegean_jelly    |    35,110 |    30 |      2,621,430 |  1,279,482 |     192,666 |
| silver_pipefish |    12,810 |     9 |      1,276,590 |    599,968 |     256,904 |

Evidence is retained in `asset_cost.json`, `artifacts.json`,
`public/public_report.json`, `source_preservation.json` and
`final_fingerprints.json` under the batch evidence directory. No hardware
performance improvement is claimed from these appearance changes.

The delivery includes four full-specimen comparison cards using matching view
direction and lighting, with each specimen fitted independently to the frame,
and a 30-second actual-world observer video. The initial old jelly comparison
was cropped; it is retained as intermediate evidence and replaced in delivery.
The video uses the final pipefish recording after its fin correction; its final
encoded frames and full decode were inspected. Actual Feishu receipts and the
four pending individual review states are recorded in `delivery.json`.
No commit, push or formal release is performed.

## Large-creature batch — 2026-10-28

The user's “好的，做下一批吧” accepts the preceding four garden creatures and
authorizes this next group: **Aegis Sturgeon, Thalassa Manta, Cerulean Sea Hound
and Bronze Giant Turtle**. These new candidates await individual player review.
No commit, push, version change or main release is part of this request. Existing
species descriptions, body lengths, speeds, habitats, stock, feeding and combat
rules remain. All earlier Odyssey candidates and other maps are preserved.

### References and production

These are original fantasy interpretations of existing written lore. The NOAA
[Atlantic Sturgeon account](https://www.fisheries.noaa.gov/species/atlantic-sturgeon)
informs five scute rows, four barbels and the asymmetric caudal silhouette. The
[Giant Manta Ray account](https://www.fisheries.noaa.gov/species/giant-manta-ray)
informs broad pectoral wings, lateral eyes and paired cephalic lobes. The
[Harbor Seal account](https://www.fisheries.noaa.gov/species/harbor-seal)
informs the hound's whiskered muzzle, thick torso and marine flippers, while its
existing lore supplies rear-body/hind-pair propulsion rather than land walking.
The [Green Turtle account](https://www.fisheries.noaa.gov/species/green-turtle)
informs a hard scuted shell and marine silhouette. The bronze shell and wave
markings are fictional design choices; none of these four is claimed to have
one canonical ancient illustration. No reference photographs were uploaded.

Four original generated concept images were uploaded to Microsoft TRELLIS.2.
Each first attempt exported and downloaded a complete GLB with its color image;
raw meshes were actually inspected from both sides and below in color and clay.
All four face +Z in the selected exports, so conversion uses a rigid pi rotation
and uniform longitudinal normalization to the game's -Z axis. Weighted reduction,
new UV charts, source-color rebaking and island padding preserve surface details.
No source image is passed off as a generated runtime mesh. Raw GLBs, receipts,
source hashes, concepts and conversion reports remain in ignored
`.local/odyssey_batch4_20261028/`.

The live included quota was **1199.508013 seconds at 10:22 BJT**, then
**1050.533344 seconds at 10:43 BJT** on October 28; over-quota usage stayed zero.
The returned reset was **18:03:59 BJT** that day. These are dated observations,
not a perpetual quota promise.

### Anatomy and runtime integration

- **Sturgeon:** the shielded front and snout remain stable. A fitted posterior
  chain drives the asymmetric caudal fan, with separate pectoral trim. The last
  fan is not split into competing lobe chains. Four barbels remain part of the
  generated head rather than newly attached decorative rods.
- **Manta:** bilateral span chains produce a delayed base-to-tip wing stroke;
  the feeding disc remains steady. Paired cephalic lobes and the curved whip
  tail receive restrained motion. A single continuous mesh keeps the wing
  roots joined; no stacked translucent fin passes are added.
- **Sea hound:** the heavy chest and muzzle remain stable while the rear trunk
  and two broad hind paddles supply visible lateral propulsion. Foreflippers
  trim and steer with lower amplitude. This follows the existing fantasy
  anatomy; it does not claim an exact reconstruction of a real seal species.
- **Turtle:** the carapace and central plastron remain rigid. Two fitted front
  paddle chains have a delayed wrist stroke; smaller rear paddles trim, and
  neck/tail motion is restrained. Front-root skin blends continuously into soft
  tissue, without rotating the hard shell or hiding gaps with patch spheres.

The existing Guide/world factory is the sole integration path. Shared immutable
geometry, material and 1024-square color textures use the existing retryable
loader. Private bones, effort state and skeleton disposal remain per instance.
First-query bounds synchronize before normalization. Visual upright attitude
uses the existing factory contract; no AI steering or game rule is changed.
No new runtime dependency, per-frame vertex-buffer upload or glow pass is added.

### Verification and limits

The targeted suite passes **47 checks**, including actual deformed surface,
normalized finite skin weights, joined UV duplicates, culling containment,
independent instances, frozen repeated phase, first bounds at two sizes and
idempotent skeleton disposal. Anatomical checks measure both wings, both hind
paddles, both turtle front paddles, rigid shell/plastron and rigid armored head.
**21 unchanged Odyssey kinds / 630 poses** match the pre-batch factory exactly.

Native desktop Chrome checks eight bilingual Guide cases and four real-world
travel samples with turns and pause. Observer recordings change initial player
position/invulnerability and camera only, with no target pinning, forced target
visibility or manual NPC animation. A second recording moves the observer player
farther away to keep the normal occluded-player outline off the specimen; it does
not disable that production effect. These short captures are appearance evidence,
not a balance or frame-rate benchmark.

Four injected color-load failures recover through explicit retry. Four repeated
rebuilds per species preserve geometry/texture identity, resource counts and
network request counts. Raw, packed and posed surfaces were reviewed separately;
encoded game footage and matched-angle comparisons are reviewed before delivery.
The comparison camera fits each old/new whole specimen independently, retaining
the same angle and lighting. Desktop narrow-layout checks are not physical-phone
performance or thermal measurements.

| Kind             | Vertices | Triangles | Bones | Shared geometry bytes | Packed JSON + WebP bytes |
| ---------------- | -------: | --------: | ----: | --------------------: | -----------------------: |
| `aegis_sturgeon` |    33572 |     20807 |     7 |               2072018 |                  1308419 |
| `thalassa_manta` |    16099 |     16000 |    15 |               1029742 |                   759837 |
| `cerulean_hound` |    18807 |     13994 |     9 |               1174770 |                   848772 |
| `bronze_turtle`  |    15564 |     12000 |    11 |                974712 |                   807724 |

Each instance is one draw before ordinary scene passes. Each 1024-square color
texture has an estimated 5,592,406 RGBA bytes including mipmaps per renderer
context; Guide and game contexts can each hold their own upload. Shared geometry
CPU bytes exclude renderer allocation overhead. These measured asset counts
are not claims of a whole-scene performance improvement.

The first full run found a missing geometry-keyed interior seal for the new
large meshes (2,028/2,029 passed). Four offline closed core helpers were then
added, preserving all **678 previous registry records** exactly. The helpers
follow existing skin weights and only support the established near-camera fill;
visible skin and collision are unchanged. The expanded focused suite passes
47/47. Native on/off pairs confirm all four interior views receive a fill while
all four exterior images remain pixel-identical. Each helper has 292–1,056
triangles, within the existing budget. This failure and repair are retained in
the evidence rather than claiming the first complete run passed.

The same restricted preview origin now serves **`index-1YUQuRTf.js`**. All
**854 dist/runtime files / 258,291,240 bytes** match locally. **17 changed
artifacts** were freshly fetched and hash-checked from both restricted local
serving and the public TLS origin; the 837 unchanged public artifacts rely on
the preceding dated verification rather than a new full-public download claim.
Eleven source/metadata routes remain refused. Production has no development
hook. Sixteen public Guide cases (four kinds, both languages, 1280/390-pixel
desktop viewports) finish color preparation without page errors. Existing
preview, development, keep-awake and tunnel processes retain their identities;
old runtime archives and asset caches are preserved.

Evidence includes `raw_review/`, `posed/`, `final_views/report.json`,
`native/report.json`, `native_final/report.json`, `interiors/`,
`interior_review/report.json`, `unchanged_species.json`, `asset_cost.json`,
`artifacts.json`, `public/public_report.json`, encoded delivery media and the
source-preservation audit under `.local/odyssey_batch4_20261028/`.

The final complete rerun passes **2,029/2,029 tests** after the interior update.
All edited runtime/test/converter files and the five affected packed JSON files
pass the focused formatting check. The 1,939-input baseline audit preserves
1,929 inputs exactly, with changes only to the documented factory, registry,
test and documentation paths. No input was removed.

After receiving the motion video, the user says “好的，继续录下一批吧”. This
accepts these four candidates and authorizes the next review batch; no commit
or push is authorized. Earlier pending labels above retain their dated context.

## Deep-creature batch — 2026-10-28

The user accepts the previous large-creature video and says “好的，继续录下一批吧”.
This authorizes the next HF redraw and movement recording, not a commit or push.
Four existing deep-water kinds now have candidate meshes: Ketos (`ketos`),
Styx Ringmaw (`abyss_lamprey`), Oracle Whale (`oracle_whale`) and Ceto Serpent
(`ceto_serpent`). Previous Odyssey candidates remain intact. Lore, species
lengths, stock, AI speeds, feeding rules and combat values are unchanged.

### References and actual generation

The [Met's Greek Ketos vase, accession 2009.529](https://www.metmuseum.org/art/collection/search/258449)
provides a leonine head, long teeth, scales and flipperlike limbs. Its museum
photograph was inspected; the preserved tail is incomplete. The complete living
animal and tail are original game interpretation, not an archaeological
reconstruction. The [US Fish and Wildlife Service sea-lamprey account](https://www.fws.gov/species/sea-lamprey-petromyzon-marinus)
informs a jawless oral disc and cylindrical body. Ringmaw's giant scale,
coloration and lateral folds remain fictional. The [Alaska Department of Fish
and Game Bowhead Whale notebook](https://www.adfg.alaska.gov/static/education/wns/bowhead_whale.pdf)
informs Oracle Whale's arched jaw, broad chest and horizontal flukes; its crown
and pale markings are fictional. Ceto Serpent follows the existing long-bodied
predator description, not a claim to reconstruct a particular divine figure.

Four newly generated original concepts were submitted to Microsoft TRELLIS.2;
no third-party reference image was uploaded or redistributed. All first attempts
returned complete GLBs with their source color images. Raw views were inspected
from both sides and below in color and clay before conversion. Rigid orientation
and uniform longitudinal normalization establish the game's -Z heading. Border-
preserving reduction, new UV charts, source-color rebaking and island padding
produce the actual runtime assets. Source GLBs, receipts, hashes, concepts and
conversion reports remain in `.local/odyssey_batch5_20261028/`.

Included quota was **1050.533344 seconds at 10:56 BJT** and **907.005872 seconds
at 11:14 BJT** on October 28; over-quota usage remained zero. The provider
returned **18:03:59 BJT** that day as the reset time. These are dated checks,
not a statement of the reader's current balance.

### Motion, integration and the regression found before delivery

- Ketos keeps its toothed head steady while a five-support posterior chain
  supplies lateral propulsion and two fitted three-support flippers trim.
- Ringmaw has a rigid oral disc and a ten-support axial chain. Continuous body
  waves advance behind small head motion, without adding paired fish fins.
- Oracle Whale keeps its crown, chest and jaw stable. Its horizontal flukes
  move vertically through a four-support posterior chain; two pectorals trim
  independently at their actual attachment locations.
- Ceto Serpent uses a fitted ten-support centerline and a separate head support.
  Delayed lateral waves propagate through the trunk; the head does not remain
  frozen while the whole creature translates.

The shared Guide/world factory uses cached immutable geometry/materials and
retryable 1024-square color textures, with independent bones, effort state and
skeleton disposal. Opaque front surfaces use restrained roughness and no added
glow. Initial scaled skin bounds synchronize before the factory's first query.
No runtime dependency or per-frame vertex-buffer upload is added.

The first full suite passed 2,037/2,038 checks and correctly caught missing
ordinary-body colliders on Ringmaw. The new chains supplied `name` but omitted
anatomical `type`; the existing limb filter tested the string `undefined`,
which accidentally contains `fin`, and excluded the axial chain. All four new
rigs now explicitly label axial/head/tail versus pectoral chains. This repairs
the new models' integration without changing the shared collision algorithm or
other rigs. A focused regression checks both anterior and posterior solid
sections, excludes paddle-owned vertices and verifies contact follows the
moving skin. Existing all-species sweep and reachable-mouth tests pass. Visible
geometry, weights and poses are unchanged by this metadata correction.

Four offline closed interior cores support the existing near-camera fill.
The first generic coarse attempt was rejected; the initial fine Ringmaw helper
still enclosed its oral/gill recesses as a hollow shape. Only that helper's
input is replaced by a convex tubular envelope before the standard voxel inset,
retaining original nearest-vertex skin ownership. Visible skin and body contact
do not use this helper. The final four cores have 1,200–2,876 triangles, with
all 682 prior registry records preserved exactly. Native on/off comparisons
show four effective interior fills and four pixel-identical exterior views.

### Verification, costs and review boundary

Actual-vertex checks cover finite normalized skin weights, joined duplicated
UV seams, culling containment, independent instances, repeated-phase freeze,
normalized first bounds, attached feeding anchors, idempotent disposal and
anatomical propulsion. Twenty-one unaffected Odyssey kinds match the immediate
pre-batch factory over 630 poses. Four injected color-loading failures recover
through retry; repeated reconstruction preserves shared geometry/material and
texture identities, network request counts and renderer resources.

Native desktop Chrome checks eight bilingual Guide cases and actual world
travel with pause. The recording fixture stages an invulnerable 3 m observer
player and adjusts the camera; it does not pin NPC positions, force visibility
or manually advance their skeletons. A closer recording was chosen because
the first wide/dark views obscured the appendages. Matching-angle before/after
cards fit each complete old/new model independently under the same lighting.
These checks and recordings are appearance/integration evidence, not natural
progression, physical-phone performance or thermal measurements.

| Kind            | Vertices | Triangles | Bones | Shared geometry bytes | Packed JSON + WebP bytes |
| --------------- | -------: | --------: | ----: | --------------------: | -----------------------: |
| `ketos`         |    23174 |     17994 |    12 |               1452056 |                   926517 |
| `abyss_lamprey` |    26325 |     17988 |    12 |               1634778 |                  1085533 |
| `oracle_whale`  |    19635 |     13995 |     7 |               1222800 |                   840584 |
| `ceto_serpent`  |    21482 |     17981 |    12 |               1353842 |                   912455 |

Each model adds one visible draw before ordinary scene passes. Each texture
has an estimated 5,592,406 RGBA bytes with mipmaps per renderer context; Guide
and game may each upload it. Shared geometry figures exclude renderer overhead.
These are asset costs, not a claim of improved scene frame rate.

The final full rerun passes **2,039/2,039 tests**; the focused body/contact and
new-anatomy suite passes **15/15**. Runtime, converter and affected test files
pass focused formatting checks. The immediate 1,951-input audit preserves
1,942 inputs exactly, changing only nine documented factory, registry, test and
documentation inputs; none is removed. The new group remains pending visual
acceptance despite these technical results.

The restricted preview rebuild serves **`index-hdjlPx_M.js`**. All **866 local
dist/runtime files / 263,726,153 bytes** match. Seventeen changed artifacts were
freshly hash-checked from both the restricted local server and public TLS
origin; the remaining 849 public artifacts rely on the dated previous batch's
verification. Eleven private source/metadata routes remain refused. Existing
service identities, logs and earlier runtime archives are retained. The formal
main/Pages release remains v0.11.21; this is an uncommitted preview candidate.

Evidence: `.local/odyssey_batch5_20261028/` contains source preservation,
reference notes, actual HF receipts, raw/packed views, `final_views/report.json`,
`native/report.json`, interior on/off evidence, matching-angle comparison cards,
`contact_tests.log`, the initial failing and final passing full-suite logs,
`asset_cost.json`, artifact checks and encoded game media. The final native
recording is repeated after the contact integration repair; earlier footage
is retained separately.

Final production checks pass sixteen Guide cases (four species, two languages,
1280/390-pixel desktop viewports), with completed color preparation, no page
errors and no development hook. `native_contact_final/report.json` records
four post-repair world clips, each with actual displacement, visible targets
and a frozen pause; no page errors occurred. The delivery edit selects clear
26-second excerpts from these recordings, avoiding late Ceto overlap with
passing fauna. The unedited nine-second samples remain available as evidence.
The H.264/30 fps/yuv420p delivery file is fully decoded and its extracted frames
reviewed. `delivery.json` records actual Feishu receipts and the delivered
media hashes; technical checks do not imply user acceptance of these four designs.

The user subsequently says “可以，做下一批吧”, accepting these four deep-water
candidates and authorizing the next group. No commit or push is requested.

## Sea-people batch — 2026-10-28

The user accepts the deep-creature batch and requests the next group. Actual
Hugging Face TRELLIS.2 candidates now replace Coral Mermaid (`nereid`),
Hippocampus (`hippocampus`), Triton Guard (`triton_guard`) and Sirenfin Eel
(`siren_eel`). They remain candidates for player review, with no commit/push.
Existing species dimensions, population, lore, movement physics and combat
values are preserved. Naga Huntress and the regional Golden Argonaut remain
for a later group; accepted earlier redraws are not regenerated.

### Reference and production choices

The [Met's Roman marble lunette](https://www.metmuseum.org/art/collection/search/256164)
shows a Nereid riding a fish-tailed Triton, while [LACMA's Greek Hippocamp](https://collections.lacma.org/object/62714)
provides the horse head, two forelegs and marine tail vocabulary. Both actual
museum photographs were inspected. The traditional Nereid is not thereby
established as a fish-tailed mermaid: the game's existing mermaid description
remains its adaptation. The folded-fin eel is the existing original fantasy
species, not a claim that ancient Sirens had this anatomy. No museum photo is
uploaded to the generation service or distributed with the game.

Original concept images feed actual TRELLIS.2 generation and complete GLB
exports. The first Mermaid has a twisted upper body inconsistent with travel;
it is rejected. A local continuous-twist experiment also distorts the waist
and fin, so it is retained only as rejected evidence. A second independently
generated, aligned mermaid is used. Every original and attempt receipt is
retained under the ignored batch evidence directory. Five actual exports use
included quota; no paid overage is used.

Conversion fits measured head/travel axes, preserves unit Z length and rebakes
source color into padded 1024-square UV atlases. Mermaid and Sirenfin use
error-limited permissive seam simplification where locking every generated UV
border otherwise exceeds the Uint16 vertex limit; decoded sides, underside,
face and thin fins are inspected rather than assuming the target count was
achieved. No generated shoulders are covered with added joint spheres.

### Fitted animation and integration

All four actual caudal fans are vertical, so their primary propulsion is
lateral. Mermaid and Triton keep the anterior torso restrained, articulate their
arms and pass increasing motion into the posterior tail. Hippocampus combines
a fish-tail wave with small neck and alternating foreleg strokes. Sirenfin
uses a continuous axial wave and four independently phased fin-membrane chains.
Each instance owns its skeleton and smoothed visual effort; geometry/materials
are shared, and the existing active phase freezes poses on pause.

Coordinate-only Mermaid arm masks initially pulled nearby waist fins and
compressed forearm triangles. The final ownership is solved offline on welded
surface topology from arm versus torso/hair/tail seeds. Duplicate UV vertices
receive identical ownership. The shoulder transition and actual tail/arm
excursions are tested on deformed vertices. The integrated shell bodice shares
the same skin, without a separate floating cover. Thin pre-existing sliver
triangles are excluded only from area-ratio measurements; all vertices still
participate in finite, seam and culling checks.

New chains explicitly identify head/tail versus arm/leg/fin ownership. Shared
ordinary body fitting and reachable-mouth checks pass without changing their
algorithms. Two closed, inset interior helpers support the existing near-camera
fill for the 8 m Triton and 10 m Sirenfin; all 686 earlier records remain exact.
Their helpers have 840 and 348 triangles, respectively, and do not change
visible geometry or gameplay colliders. Native exterior on/off images remain
pixel-identical. Smaller Mermaid/Hippocampus need no new interior helper.

### Verification and costs

The full suite passes **2,042/2,042** tests. The new anatomy, retained aquatic
heading/clock and ordinary contact suites pass **22/22**. Obsolete exact
procedural-mermaid dimensions, separate-bodice and vertical-tail assertions
are replaced by the current HF surface/attachment checks; upright heading and
five-species transition coverage remain. Twenty-one unaffected Odyssey kinds
match the immediate pre-batch implementation over **630 poses**.

Four injected color failures recover on retry. Four repeated reconstructions
per kind retain shared geometry/texture identities, request counts and renderer
resource counts. This is a bounded local cache/lifecycle check, not a claim
about phone performance. Each model uses one visible mesh before ordinary
scene passes, with independent skeleton disposal.

| Kind           | Vertices | Triangles | Bones | Shared geometry bytes | Packed JSON + WebP bytes |
| -------------- | -------: | --------: | ----: | --------------------: | -----------------------: |
| `nereid`       |    32426 |     23906 |    13 |               2024144 |                  1415224 |
| `hippocampus`  |    35905 |     23982 |    14 |               2226382 |                  1422001 |
| `triton_guard` |    58703 |     36920 |    13 |               3626294 |                  2081526 |
| `siren_eel`    |    32975 |     20895 |    23 |               2037920 |                  1277037 |

Each texture is approximately 5,592,406 RGBA bytes with mipmaps per renderer
context; Guide and game can each upload it. These inventory figures exclude
renderer overhead and are not frame-rate or thermal measurements.

Evidence is retained in `.local/odyssey_batch6_20261028/`: original concepts,
museum reference notes, actual private HF receipts, rejected first Mermaid and
warp experiment, converted/source views, welded arm ownership, anatomy/contact
and full-suite logs, shared-resource failure/retry checks, unchanged-species
samples, interior fills, native world recordings, comparison cards and delivery
receipts. Technical checks do not substitute for user visual acceptance.

### Native and public delivery checks

Four native-world recordings follow existing NPCs without changing their
positions, bones or visibility per frame. The observer uses a distant initial
player position and a follow camera; invulnerability avoids interruptions.
The first Hippocampus recording leaves the observer's render range, so that
fixture is retained as `native_initial/` and the four complete clips are
recorded again from a nearer initial observer position. All four remain visible,
move naturally and freeze both position and pose on pause, with no script errors.
The final 30-second encoded video is fully decoded and its frames inspected.
This is native desktop Chrome evidence, not a physical-phone test.

Sixteen production Guide cases cover four kinds, English/Chinese and desktop
1280/390-pixel viewports. Textures complete, English has no Chinese leakage,
and production exposes no development hook or script errors. The same restricted
preview now serves `index-BEShuAZC.js`. All 878 dist/runtime artifacts match
(272,505,706 bytes); 17 changed artifacts are freshly hash-checked over local
and public HTTP. The other 861 retain the prior dated public evidence and are
not represented as freshly downloaded. Eleven source/private routes remain
denied on both origins. Existing process identities and tunnel readiness remain.
The build succeeds with the existing large-chunk advisory.

The 12:26:28 BJT quota check reports 719.718518 of 2,400 included GPU seconds
remaining, no paid overage, and a returned reset time of 18:03:59 BJT on
2026-10-28. This is a dated quota result, not a continuing live balance.
Comparison cards, the final video, native/public reports and Feishu delivery
receipts are retained in the batch evidence directory. This new batch remains
pending player review; no commit or push is performed.

The user next requests “海螺卫士加一把武器，然后下一批”. The preceding sea-people
appearance work is retained; the weapon addition and next two designs receive
separate review below.

## Final-creature and weapon batch — 2026-10-28

The Triton Guard receives a fitted bronze trident. Naga Huntress
(`naga_huntress`, 潮冠娜迦) and Golden Argonaut (`golden_argonaut`, 金帆船蛸)
receive actual Hugging Face TRELLIS.2 replacements. This completes candidate
coverage of the Odyssey factory's 25 kinds: 21 ordinary creatures, three lords
and one regional rare. It does not mean the remaining scenery has been redrawn,
or that the user has accepted these new designs. No commit/push is performed.

### References and production

The [Met's thirteenth-century Nepalese handle](https://www.metmuseum.org/art/collection/search/39389)
describes crowned human torsos, serpent hoods and long snake tails. Those
features inform this original Naga concept, without treating Naga as an ancient
Greek creature or changing the game's existing foreign-visitor lore. The
[Oxford University Museum's argonaut account](https://oumnh.ox.ac.uk/argonauts-astronauts-of-the-sea)
distinguishes the female's paper eggcase from a conventional attached shell and
describes the webbed arms. The existing fantasy golden palette remains an art
adaptation. Original concept images, rather than third-party reference images,
are sent to TRELLIS.2. No reference media is distributed.

Both source exports complete and remain with their receipts in ignored evidence:
Naga seed 754501, 3,776,340-byte GLB; Argonaut seed 754502, 4,129,992-byte GLB.
Measured axes are uniformly fitted to unit longitudinal length, and source color
is rebaked into padded 1024-square atlases. The export receipt reports
649.839329 of 2,400 included GPU seconds remaining after the second model,
zero paid overage and a returned 2026-10-28 18:03:59 BJT reset. This is dated
production evidence, not a live balance.

### Attachment, anatomy and motion

The trident is a small authored metal mesh with a bronze fork, three faceted
prongs, a dark shaft and grip bands. It attaches to the existing palm bone,
uses one additional draw and has no texture download. It follows the hand
through the existing stroke instead of floating in root space. The accepted
body skin, tail, shoulders and mouth anchor remain exact. `visualOnly` and
existing HF body fitting keep it out of collision and bite anatomy. This is
an appearance addition, without a new attack, range or damage rule.

Naga keeps an upright head and hood, restrained shoulders and two articulated
arms. A nine-joint posterior wave bends the continuous snake body laterally.
The Golden Argonaut holds its eggcase rigid while six free-arm chains flex;
the broad webbed arms remain supported beside the case. Each instance owns
its skeleton and effort state, with shared geometry/materials and idempotent
skeleton disposal. Existing phase handling freezes both models on pause.

The first Argonaut nearest-chain binding compressed a small central arm region.
The final binding uses continuous angular ownership and longitudinal joint
interpolation with a shared fixed root. Neighboring arm phase differences are
bounded, preserving visible flexion without making neighboring skin pull in
opposing directions. This corrects actual vertex deformation; the failed
candidates and measurements remain in evidence. At settled high effort,
non-sliver triangle area ratios remain between 0.5 and 1.7 in the tested cycle.
All vertices still participate in finite-value, UV-seam and culling checks.
A 516-triangle closed inset helper supports Naga's existing near-camera fill;
all 688 previous interior records remain byte-equivalent, for 689 total.

### Verification and resource inventory

The final full suite passes **2,051/2,051**. Nine focused checks cover independent
skins, seams, bounds, pause, disposal, actual appendage excursion, triangle
preservation, palm attachment and exclusion of the weapon from body collision.
The rare-model test's revision expectation is updated to the new HF identity;
its posed geometry, independent instances and distinct-silhouette checks remain.
Twenty-three retained Odyssey skins, including the Triton body, are exactly
unchanged over **690 sampled poses** compared with the immediate batch baseline.

Both new color loads recover from injected failures. Four reconstructions per
kind retain shared geometry/texture identities, request counts and renderer
resource counts. These are bounded desktop cache/lifecycle checks, not phone
performance claims.

| Asset                   | Vertices | Triangles |                     Bones | Geometry bytes |  Packed JSON + WebP bytes |
| ----------------------- | -------: | --------: | ------------------------: | -------------: | ------------------------: |
| Naga Huntress           |    28734 |     23874 |                        17 |        1809816 |                   1151049 |
| Golden Argonaut         |    34165 |     26136 |                        20 |        2138386 |                   1328030 |
| Triton trident addition |     3840 |      1280 | attached to existing hand |         138240 | no additional image asset |

Each new model has one visible mesh and one 1024-square color texture; the
texture uses approximately 5.59 MB RGBA with mipmaps per renderer context,
excluding driver overhead. Guide/game can each upload it. The weapon adds one
ordinary visible draw per guard; its geometry/material are shared. These
inventories are not measured frame-rate or heat improvements.

Three native-world clips follow existing NPCs with actual displacement and
turning, then verify position/pose freeze on pause. The observer fixture changes
camera and initial player position, uses invulnerability and holds slow player
movement; it never pins NPC positions, bones or visibility per frame. The final
23.97-second encoded video is fully decoded and its sampled frames inspected.
Matched-angle/light comparison cards fit each complete silhouette to its own
frame; their framing is labeled, rather than implying a size change. This is
native desktop Chrome evidence, not an actual phone trial.

Evidence is retained in `.local/odyssey_batch7_20261028/`, including concepts,
actual HF receipts/exports, conversion reports, rejected bindings, skin/weapon
checks, unchanged-species samples, native recordings, cache/retry reports,
comparison cards and encoded media. All gameplay registries, lore and prior
source assets remain unchanged. These new appearances await user review.

### Public preview and delivery

Twelve production Guide cases cover the three changed appearances, English /
Chinese and 1280 / 390-pixel desktop viewports. Textures complete, English has
no Chinese leakage, and no script errors or development hook are exposed.
Naga's interior helper activates when the camera is inside; the outside
on/off render pair remains pixel-identical.

The same restricted preview serves `index-D9D49XII.js`. All **884** dist/runtime
artifacts match (**276,066,978 bytes**). The **11 changed artifacts** are freshly
hash-checked over local and public HTTP; **873 unchanged artifacts** retain the
prior dated public evidence, not a new full-public download claim. Eleven
source/private routes remain denied on both origins, existing process identities
are preserved, and the tunnel reports ready. Build succeeds with the existing
large-chunk advisory. Final cards/video and actual Feishu delivery receipts are
recorded in the evidence directory; user visual acceptance is still pending.

## Ocean weapon refinement — 2026-10-28

The user finds the first Triton weapon too simple, requests marine features
and richer materials, and asks for a spear for Naga. This supersedes the prior
procedural weapon candidate, not the body/motion acceptance history. New weapons
remain pending user visual review; no commit or push is authorized this turn.

### Actual assets and integration

Two original built-in image concepts are reconstructed with Microsoft TRELLIS.2:

- **Triton Guard:** a broad scallop-shell collar, three separated barbed blades,
  pale shell insets, weathered bronze and dark wrapped grip.
- **Naga Huntress:** one pearl-toned leaf blade, spiral conch ferrule, scale-like
  bronze petals and straight shaft with a shell buttcap.

Complete source GLBs, seeds, hashes and stage receipts are retained. The included
quota measured 649.839329 seconds before generation and 529.669005 after both
exports (2026-10-28); over-quota usage remained zero. The service returned a reset
at approximately 18:03:59 BJT that day. This is dated evidence, not a live balance.
No reference creature or accepted body texture was regenerated.

The first 26,272-triangle trident conversion was retained locally but replaced
by the inspected 6,492-triangle runtime conversion. Both use one rigid mesh,
one 1024-square sRGB texture, opaque fallback colors and the shared bounded
material queue. Geometry and texture are shared across instances; only each
mesh's hand transform is independent. Broad blade faces point outward for
readability. The hands keep their existing skinning and movement. Body/weapon
readiness is combined, including priority, error state and explicit retry.
Weapons add no collider, damage, strike distance or feeding eligibility.

| Weapon               | Vertices | Triangles | Geometry bytes | Packed JSON + WebP bytes |
| -------------------- | -------: | --------: | -------------: | -----------------------: |
| Shell-bronze trident |    10458 |      6492 |         394524 |                   567531 |
| Naga sea-tooth spear |     5696 |      4500 |         220664 |                   374561 |

Each uses one visible draw per equipped creature and approximately 5.59 MB
RGBA texture storage with mipmaps per renderer context. Relative to the prior
candidate, Triton still has one weapon draw; Naga gains one. These are resource
inventories, not claims of physical-phone performance or power improvements.

### Verification and review evidence

- 52 targeted checks and **2053/2053** full tests pass, including two actual
  skinned-palm attachments, independent transforms and unchanged body/bite
  collision sections with or without weapons.
- Every body vertex is exactly equal before/after over 30 poses for each of the
  six kinds using the two affected factories: Mermaid, Hippocampus, Triton Guard,
  Sirenfin Eel, Naga and Golden Argonaut (180 complete surface poses).
- Both weapon textures fail deliberately, show opaque colored fallback, retry
  successfully, and share stable geometry/material/texture identities and
  renderer resource counts over four reconstructions per kind.
- Native desktop Chrome clips follow existing NPCs through world displacement
  and turns, then verify pause freezes. The observer changes camera and initial
  player placement/invulnerability, never pins NPC movement or visibility.
- The delivered 16-second game video fully decodes; sampled final encoded frames
  are inspected. Comparison cards use matched angle/light and individually fit
  the complete silhouette, explicitly labeled. Color, rear, side and neutral
  geometry views are retained separately.

Evidence: `.local/odyssey_weapons_20261028/` (raw sources, conversion candidates,
`targeted.log`, `full_tests.log`, `unchanged_species.json`, `asset_cost.json`,
`final_views/report.json`, `native_final/report.json`, `delivery/encoded.json`).
Desktop narrow view is not physical-phone validation. Existing services and
all earlier uncommitted work are preserved.

### Refined weapon preview

Eight production Guide cases cover both equipped creatures, English/Chinese and
1280/390-pixel desktop viewports. Both body and weapon textures finish; English
has no Chinese leakage, there are no script errors, and no development hook is
available. The restricted preview entry is `index-Baorzvps.js`.

All **890** dist/runtime artifacts match (**277,254,801 bytes**). The **9 changed
artifacts** are freshly hash-checked over local/public HTTP; **881 unchanged
artifacts** rely on the prior dated public evidence. Eleven private/source paths
are denied on both origins. Existing process identities and tunnel readiness
are verified; the build succeeds with the existing large-chunk advisory.

## Triton Guard centred swimming — 2026-10-28

The user rejects the guard's swim because its tail stays on one side instead
of moving evenly left and right. This follow-up changes Triton only and remains
pending user visual review. Earlier weapon and creature review history is
retained; no commit or push is authorized.

### Cause and correction

The neutral HF mesh and fitted tail chain both bend to local negative X. A
symmetric sine pose applied on top of that shape does not produce symmetric
surface movement. At effort 1.5, the distal skin centroid stayed between
-0.4104 and -0.2531 in unit-length local coordinates for an entire lateral cycle.
The body's centreline is approximately X=0.03.

`straighten_triton_hf_tail.mjs` preserves the original packed upper body, UVs,
triangle topology and longitudinal dimensions while removing the measured
lateral centreline bend offline. The continuous shear has determinant one;
normal directions use the inverse transpose. Tail bones are fitted to the
corrected centreline. The script also transforms the existing closed interior
helper and registers its new geometry hash, preserving the old record and every
other creature's helper. No per-frame geometry rewrite or additional mesh is
introduced, and no HF generation quota is consumed.

A subsequent surface audit caught a second issue: the shared torso-height mask
left some upper caudal-fin vertices partially attached to the torso. Triton's
rear-tail binding now fades to complete tail ownership before the fluke.
The first intermediate correction and its recordings are retained separately;
they are not the final delivered state. Other species keep their original mask.

Final distal centroid X spans approximately **-0.0531 to +0.1193**, with mean
**0.0328**, around the X=0.03 body centre. Both sides are visited at slow, cruise
and fast effort; settled full-cycle excursions differ by less than 20%.
The original vertical caudal-fin height and continuous root are retained.

### Scope and evidence

- 56,380 upper-body neutral vertices remain exact. UVs, indices and texture are
  unchanged. Across 120 poses, head/upper-torso skin and weapon world transforms
  have zero before/after displacement.
- Actual tail surface areas are checked over 120 poses. For 1,371 triangles
  with non-negligible area and aspect ratio, deformed/rest area stays between
  0.805 and 1.207. Near-collinear source slivers are excluded from this ratio
  statistic; finite vertices, UV seams and culling are checked separately.
- The other five kinds from the related factories retain every surface vertex
  over 30 poses each. There is no lore, AI, movement speed, population, damage,
  feeding rule or weapon behavior edit.
- Matched-angle, matched-scale top views and a ten-second two-cycle comparison
  show the actual skin before and after. A separate native-Chrome world clip
  follows an existing NPC through travel and turns, then checks pause freezing.
  The fixture changes observation camera and initial player setup, not NPC
  trajectories. This is desktop evidence, not physical-phone testing.

Evidence is retained in `.local/triton_swim_20261028/`: the exact prior mesh
and factory, conversion log, surface audit, unchanged-species comparison,
regressions, native world report and encoded delivery video. Runtime geometry,
texture and draw counts are unchanged; the correction is baked into the asset
and existing rig. The shared interior table gains the matching small record.

### Final validation

The final corrected rig passes **22 targeted checks** and **2056/2056 full
tests**. The offline conversion reproduces the exact runtime mesh bytes from
the retained pre-fix source. Removing the new interior record reproduces the
prior table hash, proving all 689 earlier records remain unchanged. Of 1,992
prior source inputs, only the scoped Triton asset, shared factory branch,
interior table and four project documents change; the offline converter and
regression file are the only new source files.

The final video is 24 seconds (ten-second before/after comparison plus fourteen
seconds of real-world motion), 1280x800 H.264, fully decoded and visually reviewed.
The world NPC travels across approximately 60.72 / 6.64 / 31.73 metres in X/Y/Z,
turns naturally, remains visible and freezes on pause. Initial setup uses an
invulnerable three-metre player and an observation camera; no NPC position is
pinned. This is not a combat-balance or physical-phone performance measurement.

The same restricted preview now serves `index-Dmy-Naw-.js`. Four native production
Guide cases cover English/Chinese at 1280 and 390 desktop widths, with completed
body/weapon textures, no English text leakage, no script errors and no production
debug hook. All **890** dist/runtime artifacts match (**277,267,686 bytes**).
Seven changed files are freshly hash-checked over local and public HTTP; the
883 unchanged files retain the earlier dated public evidence. Eleven source or
private routes are denied on both origins. Existing service identities and
tunnel readiness remain verified. Build succeeds with the existing large-chunk
advisory. Actual delivery receipts and final fingerprints are stored locally.
