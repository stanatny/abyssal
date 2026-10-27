# Penglai Sanctuary — Hugging Face redraw

Penglai accepted for main release — 2026-10-27: the user explicitly accepts
all current map changes and requests committing and pushing them to main.
All 1,893 delivered input hashes match before release-only edits. This approval
supersedes earlier pending/uncommitted labels for these delivered Penglai
changes, including the repository Skill, ecology, landmark navigation and Kun
visibility fixes. Earlier entries retain their dated evidence and rejected
iterations. The release is v0.11.21; see [the release record](release_v0_11_21.md).
Fresh release CI and deployed-page checks are recorded separately from candidate
validation. Preserve existing services and historical worktrees.

## Scope and status — 2026-10-27

The Penglai redraw is on `art/penglai-hf-redraw`, based on main
`6220ce80990b2504d91aca7bdca5adb511d2c38d`. The subsequent user replies accept
the creature batches and their motion repairs, the guardian monuments, temple
refinements and, most recently, the sword-sect scenery. The latest “可以，下一批吧”
authorizes the garden batch below, not a commit or release. Peach groves, lotus
beds and small pavilions are now candidates awaiting visual review.
The current AI agent works independently. Earlier sections preserve dated
candidate/rejection/repair history; their original “awaiting” wording is not
the current acceptance ledger. Gameplay and the accepted asset sources remain.

## Reference findings

There is no single canonical modern “official character sheet” for the
_Shan Hai Jing_. Library collections do hold historical illustrated editions.
The National Central Library describes its Qing hand-painted volume **08481**,
148 illustrated pages, and its 2019 facsimile with accompanying original text:
[official collection publication](https://www.ncl.edu.tw/cultrual-products/0Q083392025625479956).
This is a dated artistic interpretation, not proof that every modern creature
attribute occurs in the ancient text. The National Diet Library also catalogs
[Jiang Yinghao's illustrated edition](https://ndlsearch.ndl.go.jp/books/R100000136-I1971149384822697533).

The Four Symbols have a related but distinct historical tradition. The Palace
Museum's [Four Gods entry](https://www.dpm.org.cn/lemmas/244012.html) supports
the directional and elemental identities: east/wood Azure Dragon, west/metal
White Tiger, south/fire Vermilion Bird and north/water Black Tortoise. Its
[tortoise-and-serpent brick](https://www.dpm.org.cn/collection/sculpture/233922.html)
and the National Palace Museum's [Han four-animal stove](https://digitalarchive.npm.gov.tw/opendata/Pub/Detail/47078?dep=U&mode=full)
provide further artifact records. The latter pages' text/catalog information was
read; this batch does not claim to have inspected every linked high-resolution
artifact image. Do not attribute all Four Symbols directly to one _Shan Hai Jing_
passage.

These sources guide anatomy, direction and visual hierarchy. No museum image,
commercial game character, film still or third-party model is shipped or uploaded
for generation. The concept images are original generated interpretations. The Sword Sage reference study is recorded in its later batch section below.

## Regional inventory and order

| Group                      | Current scope                                                                                                          | Status                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Guardians, batch 1         | `white_tiger`, `vermilion_bird`                                                                                        | Repair accepted; preserved in batch 2                                                               |
| Guardians, batch 2         | `azure_dragon`, `black_tortoise`                                                                                       | Accepted after Azure motion repair; uncommitted                                                     |
| Remaining lords            | `sword_sage`                                                                                                           | Straight-blade / volley repair accepted; uncommitted                                                |
| Fish batch 1               | `jade_minnow`, `chiru`, `spirit_carp`, `dragon_carp`                                                                   | Accepted; preserved and uncommitted                                                                 |
| Other small/flying ecology | `lotus_sprite`, `wenyao`, `luoyu`, `cloud_crane`                                                                       | Accepted; preserved and uncommitted                                                                 |
| Waterbird batch            | `xuangui`, `bifang`, `hujiao`, `pool_hujiao`                                                                           | Accepted in subsequent user reply; preserved                                                        |
| Other regional ecology     | `lushu`, `nine_tail_fox`, `gudiao`, `zheng`, `bashe`, `kui`, `kun`                                                     | HF forms and repairs accepted; preserved                                                            |
| Transformations and rare   | `gate_dragon`, `peng`, `gilded_cloud_carp`                                                                             | Accepted after head/stride repairs; mechanics retained                                              |
| Major scenery              | Summit temple, guardian landmarks, Bixi stele, gates/bridges/roads, mountains, deep tortoise pond and floating islands | Temple / Bixi / guardians / sword gate accepted; gardens under review; terrain remains future scope |
| Reused assets              | Four players and assets already approved in earlier maps                                                               | Reuse rather than redraw automatically                                                              |

The ordinary-species catalog has 20 kinds, plus two transformed forms, one
exclusive rare and five lords. This inventory is not a claim that the entire
map has already been redrawn.

## First batch implementation — superseded shape/motion candidate

White Tiger uses a broad feline head, substantial chest/shoulders, pale fur,
dark stripes and a restrained warm mane. The 48 m body has continuous skin with
four independently articulated legs, head/jaw and tail. Actual resolved ground
travel drives its walk/trot; obstruction freezes the stride. Pouncing reaches
with the forepaws, while roaring plants the feet and opens the jaw instead of
reusing an airborne pose. The encounter supplies its existing ability identifier
to an optional visual callback; attack rules and timings are unchanged.

Vermilion Bird uses a red/gold layered-feather silhouette, crest, hooked beak,
broad articulated wings and trailing tail feathers. The generated wing span was
initially too small relative to the accepted lord. An offline X-only fit widens
the wings/body by 1.35 with inverse-transpose normal correction; length remains
52 m. Wing roots, outer feathers and tail have delayed continuous movement.
Dark feather undersides are retained rather than covered with global emission.

Both actual TRELLIS.2 exports are inspected in color and neutral clay, oriented
to the game's forward axis, simplified, re-atlased and rebaked from the generated
color. `prepare_penglai_guardian_hf_asset.mjs` and
`fit_penglai_guardian_hf_asset.mjs` record the repeatable conversion. Materials
use the existing global texture preparation/retry queue. Geometry/materials are
shared; skeletons and motion state are private and disposed idempotently. Two
closed internal seals preserve the existing close-camera solid-body effect;
they do not change visible skin or collision shape.

### Provenance and cost

Actual source: [Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2),
with the [official model card](https://huggingface.co/microsoft/TRELLIS.2-4B).
Seeds are 748001 and 748002. Included Pro quota was freshly checked before each
GPU stage; no paid overage was used. Private receipts and raw exports stay in
`.local/penglai_guardians_hf_20261026/`, not in shipped assets or Documents.

| Measurement                     | White Tiger | Vermilion Bird |
| ------------------------------- | ----------: | -------------: |
| Raw GLB bytes                   |   4,504,728 |      5,436,848 |
| Runtime triangles               |      29,969 |         28,942 |
| Runtime vertices after UV seams |      40,165 |         44,450 |
| Skin meshes / materials / bones |  1 / 1 / 21 |     1 / 1 / 16 |
| Geometry attribute/index bytes  |   2,509,384 |      2,751,752 |
| Packed source mesh bytes        |   1,204,758 |      1,299,522 |
| 1024-pixel color WebP bytes     |     412,440 |        394,514 |
| Invisible closed-seal triangles |       4,000 |          1,780 |

The former assets had 31/27 meshes and 51,700/36,264 triangles. The new visible
meshes reduce draw submissions and triangle counts but add two color textures
and a bird skeleton. Each 1024² RGBA mip chain costs about 5.33 MiB per WebGL
context; Guide and game can upload independently. This is not evidence of a
physical-phone FPS or temperature improvement.

## Verification and evidence

Evidence is isolated under `.local/penglai_guardians_hf_20261026/`. Earlier pilot
captures and failed tests remain as history, not acceptance of the final result.
The full regression first exposed missing internal-seal records and a test that
still searched for the former Tiger's separate paw objects. The seals are
appended without replacing old records. The procedural builder retains its own
regression, and the new rig is checked using actual skinned paw vertices.

Final checks, delivery identifiers and preview hashes are appended after the
reviewed build is served. Native controlled scenes use staged player positions
and, for movies, invulnerability and an observation camera. These are distinct
from natural full-game progression and physical-phone tests, neither of which
is claimed here. Appearance acceptance belongs to the user.

### Final local checks — 2026-10-27

All **1,880** unit checks pass. Seven focused HF tests cover actual skinned
surfaces, UV-seam weights, conservative culling, independent instances, private
bone-texture cleanup, pause, roaring versus pouncing, wingtip excursion and
44 m/s ground-travel support. The earlier procedural Tiger tests continue to
exercise the retained legacy builder; they are not claimed as HF-skin evidence.
All 652 earlier interior records are unchanged, with only two new seals appended.
Thirty-two unaffected creatures/characters retain exactly identical sampled
surfaces over 128 poses against the preserved main factory.

Native Chrome checks both languages, Guide reopening and three Penglai/Hawaii
round trips. Candidate geometry/color identities are stable; parked lord pools
remain deliberately cached while private disposable instances have separate
bone textures. Final world clips show normal hunt, wind-up, charge/roar or
volley, recovery and motion against terrain. Pause freezes world and bones.
Actual 30 m counters increment `validatedHits` for each lord without changing
phase, hit count or cooldown. The initial bird fixture incorrectly assumed a
horizontal mouth while pressing Slow in the air; tracing showed the existing
40-degree downward flight trim. Matching that real approach direction passes,
without changing flight controls or contact rules. The bird also deals its
existing attack damage in this controlled encounter.

Artifacts: `native_delivery/report.json`, `contact_trim/report.json`,
`skin_final.log`, `full_tests_final.log`, `sibling_regression.json`,
`interiors/hulls_report.json` and matched `before_matched/` versus `final/`.
Latest quota read at 2026-10-27 00:14 BJT reports 2,131.14 included GPU seconds
remaining, zero overage, and reset at 18:03 BJT. This is a dated reading rather
than a promise of later balance. No additional generation is needed for this
batch.

### Restricted preview delivery — 2026-10-27

Formatting and production build pass. The existing restricted preview now
serves `assets/index-ByoPMTOQ.js`; all **680 build files / 185,552,155 bytes**
match dist, local restricted HTTP and public HTTP byte for byte. Eleven source,
metadata, Vite and directory paths are denied at each origin. Existing service
identities and tunnel readiness are retained. Production has no debug hook.

Four native public flows cover both new lords in English desktop and Chinese
390-pixel touch emulation: Guide, normal start, controls, pause, return and
same-URL reload. Both texture URLs return 200; there are no resource/page errors.
The narrow viewport is desktop emulation, not a physical phone.

Delivery consists of two matched camera/lighting/scale comparison sheets and a
32-second normal-speed native-world movie. The MP4 was decoded end to end and
12 frames inspected for missing content and recording flicker. The observation
camera and staged invulnerable player are explicitly separate from normal
player-view gameplay. `artifacts.json`, `public/report.json`,
`final_fingerprints.json`, `source_preservation.json` and `delivery.json` record
the final candidate. Formal Pages/main remains Europa v0.11.20; the Penglai
candidate remains uncommitted and awaits appearance review.

## Guardian shape, tail and flight repair — 2026-10-27

The user rejects a lion-like mane and unnatural moving tail on White Tiger.
Vermilion Bird's appearance is accepted, but its inverted/360-degree flight is
rejected; future Azure Dragon work must also preserve readable flight. These
are visual defects not disproved by the initial batch's passing unit checks.
The first-batch records above remain historical evidence, not current approval.

### Replacement anatomy and skin

The current Tiger uses a new actual TRELLIS.2 export, seed **748003**, from an
original short-furred white-tiger concept. The source GLB is **3,611,784 bytes**,
SHA-256 `092f80e918a2631930ee52e5dcffc0a51c3eedde892db7bca9c766e75489056a`.
Attempts 748002 and 748004 are retained but rejected for exaggerated cheek or
whisker sheets; they are not silently substituted into the delivered asset.
`fit_white_tiger_muzzle_hf.mjs` narrows the selected model's projecting whisker
pads locally, retaining indices/UVs and correcting normals by the inverse
transpose. The measured minimum deformation Jacobian is **0.57**, not a fold.
The final color/clay views were inspected after conversion and local fitting.
The real-white-tiger reference and its limits are recorded in
[penglai_sources.md](penglai_sources.md#tiger-anatomy-and-guardian-flight-repair--2026-10-27).

The old rear-Z threshold assigned hind-leg skin to tail bones. Binding now uses
distance to the fitted tail centerline, with six independent tail bones and
actual rear-foot vertices excluded. The resting tail hangs naturally and moves
slightly with gait and turning; it does not propel the Tiger like a fish tail.
Four separately fitted limb chains use a normalized three-dimensional knee bend
plane, a small running crouch and continuous initial travel phase. Actual skin
support, tail excursion and pause are checked, rather than only bone angles.
Roaring still plants the feet; pouncing still reaches with the forepaws.

The final Tiger has **29,966 visible triangles, 28,641 vertices, 22 bones, one
mesh/material**, and **1,840,974 geometry bytes**. Its packed mesh is 928,320 bytes
and color WebP 355,628 bytes. The closed internal seal has 4,000 faces; all 652
main-branch interior records are retained and only the final Tiger/Bird records
are added. Superseded generated seals remain in ignored evidence only. Bird
mesh and color are byte-identical to the user's accepted first-batch appearance.

### Continuous upright flight

Shortest-arc forward-vector quaternions could turn the Bird upside down when a
target crossed behind it; the earlier native movie reached world-up Y **-0.8393**.
`penglai_flight_attitude.js` instead uses wrapped horizontal yaw, pitch limited
to ±45 degrees, and bank limited to ±18 degrees. Yaw/pitch/bank changes are rate
bounded and straight flight settles level. Movement and visible forward share
this steering, rather than only correcting the rendered model after a sideways
slide. Only Vermilion Bird and Azure Dragon opt into this path. Other lord
species, player controls, habitat positions, length, attack clocks and damage
constants remain unchanged. Turning paths intentionally change.

High/low/opposite target placements in actual native encounters keep both flying
guardians upright (minimum world-up Y about **0.6846**), with real displacement
and no per-frame NPC position override. Fixed-rate checks cover 30/60/120 Hz,
pause, rear targets and vertical targets. These are control/readability choices,
not a statement that every real bird is physically incapable of rolling.

### Loading, scope and evidence

A fresh native world-entry test also exposed missing automatic texture
preparation: opening Guide first had masked this. The shared builder now starts
its existing preparation/retry queue when instantiated. World entry without
Guide, both Guide languages, reopenings, region switches and private skeleton
cleanup are covered. Geometry and color remain shared while motion is private.

All repair evidence is in `.local/penglai_guardian_motion_repair_20261027/`:
`before/`, `final_fitted/`, raw exports/receipts and rejected attempts, native
movies, `flight_world/report.json`, actual counter contacts, focused/full test
logs, source preservation and restricted-preview verification. Earlier pilots
remain separately named. Observer movies stage an invulnerable adult and a
camera, while normal encounter states and movement continue. They do not prove
natural complete-round pacing or physical-phone performance. New repair review
is still pending; no commit, push or formal Pages release is performed.

### Repair verification — 2026-10-27

The final closed-seal build passes **1,883/1,883** unit checks and formatting.
Ten focused checks cover the two HF skins plus bounded flight. Thirty-two
unaffected creatures/characters retain exact sampled surfaces over 128 poses;
source comparison against all 1,726 prior candidate inputs confirms only the
listed repair files changed. Bird geometry/color hashes are unchanged.

Fresh native world entry loads both new colors without Guide. English/Chinese
Guide, three region round trips, sharing/private cleanup and pause pass. Final
Tiger footage includes both charge and roar; Bird footage includes its volley.
Both move through normal hunt/windup/attack/recovery. Actual clear 30 m player
counter approaches increment each lord's validated hits without forcing boss
phase, hit counts or cooldowns. Three high/low/rear target placements also check
Azure Dragon and Bird orientation with real world displacement.

The delivered 36-second world MP4 is decoded end to end, with twelve encoded
frames inspected. Its Tiger appearance matches `final_fitted/`; rejected mane
views are retained in `before/` for matching frontal/side comparison. The
invisible seal was subsequently made watertight before the final contact checks
and production build; it does not alter the visible movie skin.

A fresh quota read at **2026-10-27 01:05 BJT** reports **2,029.76 / 2,400 included
GPU seconds**, zero overage, next returned reset **18:03 BJT**. This is a dated
reading; subsequent generation must obtain a new quota response. Generation
receipts and raw/candidate exports are local evidence, not public artifacts.

### Repaired restricted-preview delivery — 2026-10-27

The same restricted URL now serves `assets/index-CWh_t_IH.js`. All **680 files /
185,065,939 bytes** match dist and local runtime. All **eight changed artifact
files** freshly match local and public HTTP; the other 672 hashes are unchanged
from the prior full public audit. A redundant full redownload was stopped after
partial receipts were retained; it is not reported as a new full-public pass.
Eleven source/config/Vite/directory paths are denied at each origin. The original
service process identities and tunnel readiness are unchanged.

Four fresh native public flows pass (both lords, English desktop and Chinese
390-pixel touch emulation), including normal start, controls, pause, return and
same-URL reload. Texture requests return 200, there are no page/resource errors,
and the production debug hook is absent. Desktop touch emulation is not a
physical-phone test. Comparison image and native-world video delivery identifiers
are recorded in `delivery.json`. Main/Pages is still **v0.11.20**; this repair
remains an uncommitted candidate awaiting the user's review.

## Guardian batch 2: Azure Dragon and Black Tortoise — 2026-10-27

The user accepts the corrected White Tiger and Vermilion Bird and requests the
next batch. This authorizes two new guardian appearances, not a commit or push.
The accepted first-batch skin, colors, rig and bounded flight controls remain.
Existing written descriptions, dimensions (56 m / 50 m), habitats, combat values,
attack clocks, food and progression are preserved. The Sword Sage and ordinary
Penglai ecology remain later work.

### Historical references and generated sources

The Palace Museum's [Sui Azure Dragon relief](https://www.dpm.org.cn/collection/sculpture/233700.html)
was read and its actual photograph inspected: a long, curling body, horned head,
whiskers and extended claws inform an original interpretation. The museum's
[Tang Black Tortoise brick](https://www.dpm.org.cn/collection/sculpture/233922.html)
was also viewed, showing the domed turtle and entwined serpent. These dated
artworks are historical references, not a single official modern model sheet.
Original generated concepts, rather than collection photographs, were uploaded
to Microsoft TRELLIS.2. Reference downloads remain private research evidence.

Actual GLBs use seeds **748101 / 748102**, with 4,291,244 / 3,691,224 downloaded
bytes. Raw color/clay and front/back/side/top/bottom views were inspected before
conversion. The Tortoise source contained a disconnected duplicate head and a
detached tongue-tip fragment. `clean_penglai_tortoise_hf_asset.mjs` removes those
measured isolated components; it preserves the original export, legitimate
four paddles, turtle head, snake neck, UVs and remaining colors. This is an
explicit offline correction, not a claim that generation returned perfect anatomy.

The converter keeps the original source identity, normalizes forward to -Z,
simplifies with normal/UV constraints, unwraps a new atlas, rebakes generated
color and pads texture islands. Runtime assets have finite unit normals. Raw
exports, private generation receipts and rejected/pilot evidence stay in
`.local/penglai_guardians_batch2_20261027/`; no credentials or provider-private
URLs are shipped. Included quota was checked before every GPU stage; overage
usage remains zero. The fresh **2026-10-27 03:09 BJT** reading is **1,950.21 /
2,400 GPU seconds**, returned reset **18:03 BJT**, not a promise of later balance.

### Fitted anatomy and movement

Azure Dragon has a twelve-joint continuous curved body/tail, a separately fitted
neck/head and four claws attached to their actual supporting body bones. A small
travelling bend reaches the tail, while claws and head retain coherent support.
Its breath origin follows the actual snout. The existing pitch/bank limits and
horizontal turn rates remain; the new model does not add roll or invert flight.

Black Tortoise keeps its central shell rigid. Four independently fitted paddle
chains use paired front power strokes and smaller delayed hind steering strokes,
with a faster feathered recovery. The original generated limbs are asymmetric,
so their roots and distal points are fitted separately. Actual world displacement
controls activity and cadence; stopping and ward phases blend the strokes down.
Only the free snake neck/head moves above the fixed rim coil. Upright orientation,
shallow pitch bound and real attack phases remain.

Both factories prepare colors on normal world entry through the existing shared
queue, without requiring Guide first. Shared geometry/materials are immutable;
every model has private bones and state with idempotent skeleton cleanup. Two
watertight internal seals retain the existing close-camera solid-body rendering;
all 654 previous records are preserved. These seals do not alter visible skins
or gameplay contact geometry.

| Measurement                     | Azure Dragon | Black Tortoise |
| ------------------------------- | -----------: | -------------: |
| Visible triangles               |       29,826 |         28,172 |
| Vertices including UV seams     |       42,284 |         30,168 |
| Skin meshes / materials / bones |   1 / 1 / 29 |     1 / 1 / 21 |
| Geometry/index bytes            |    2,631,428 |      1,918,776 |
| Packed mesh bytes               |    1,254,472 |        956,858 |
| 1024² color WebP bytes          |      235,308 |        241,958 |
| Body contact sections           |           12 |              5 |
| Invisible closed-seal faces     |        1,886 |          4,000 |

Former assets measured 62 / 32 meshes and 33,352 / 65,906 triangles. The new
versions reduce visible draw submissions/triangles but add two color textures;
each 1024² RGBA mip chain is about 5.33 MiB in each WebGL context. This is a
resource inventory, not a physical-phone FPS, power or temperature measurement.

### Verification scope

Actual skinned surfaces are checked for normalized weights, equal UV-seam
weights, finite bounded poses, shell rigidity, moving paddles/free serpent,
snout attachment, body continuity, frame transitions and pause. Guide/world
instances share assets but keep independent poses and private bone textures.
The previous procedural-ring assertion is replaced for Azure Dragon by actual
HF-skin continuity and mouth/tail tests; other serpentine models keep their old
checks. The Tortoise tests now sample real paddle skin rather than removed
procedural paw objects. Thirty-two unaffected models, including the accepted
Tiger/Bird and four players, match 128 sampled poses exactly.

Native checks use ordinary loading, bilingual Guide, region round trips,
normal lord states and displacement. Recorded combat uses a staged adult,
invulnerability and an observation camera; it does not claim natural full-round
pacing or physical-mobile performance. The first Azure movie placed the player
behind a real dragon-gate column, correctly preventing engagement. A static-world
ray audit identifies that obstruction; recording from the unobstructed side
shows normal hunt, wind-up, breath and recovery without bypassing terrain or
forcing boss phases. Earlier failed fixture reports remain as dated evidence.

### Final checks and restricted delivery

All **1,890** unit tests pass, as do formatting, diff whitespace and the production
build. The consolidated native evidence records four bilingual Guide entries,
three region round trips, normal world texture preparation, paused poses, real
attack/recovery states and a successful adult counter-bite on each new skin.
High/low/rear flight checks retain positive world-up throughout for both Azure
Dragon and the accepted Bird. The final 36-second encoded game clip was decoded
end-to-end and twelve frames visually reviewed. Matched before/after views use
the same camera, light and scale.

The restricted preview now serves `assets/index-C_ky9POl.js`. All **686** current
build/runtime files (**189,154,280 bytes**) match locally. All **11** changed
artifacts match fresh local and public HTTP downloads; the other **675** public
artifacts rely on the preceding dated checks, not a new full-public download.
Eleven source/private paths remain denied on both origins. Native public Chrome
passes four EN/Chinese Guide/start/controls/pause/Home cases at 1440 and 390 px,
then same-address reload. New color requests succeed and production has no debug
hook. The 390 px run is desktop touch emulation, not a physical-phone claim.
Existing service identities and tunnel readiness are preserved.

Evidence is in `.local/penglai_guardians_batch2_20261027/`: `tests_final.log`,
`verification_summary.json`, `contact_trim/report.json`, `flight_world/report.json`,
`sibling_regression.json`, `interior_preservation.json`, `public/report.json`,
`artifacts.json`, `source_preservation.json`, `final_fingerprints.json` and the
final `delivery/` media. Message receipts are retained in `delivery.json` after
sending. This is an uncommitted candidate for the user's appearance review;
formal main/Pages remains v0.11.20.

## Azure Dragon undulation and flight-path repair — 2026-10-27

The user rejects the batch-2 Dragon's stiffness, then clarifies that the entire
moving animal appears translated forward, not merely that its skin has too
little motion. The correction therefore addresses both the fitted skin and the
actual flying trajectory. It preserves the generated mesh, colors, normalization,
56 m length, other guardians and written descriptions. No HF generation or
included GPU time is consumed. No commit or push is authorized.

The accessible abstracts of [Munk's garter-snake swimming study](https://pubmed.ncbi.nlm.nih.gov/17950016/)
and [Graham et al.'s sea-snake study](https://journals.biologists.com/jeb/article-abstract/127/1/27/5040/Surface-and-Subsurface-Swimming-of-the-Sea-Snake)
support rearward travelling bends with changing amplitude and speed-related
cadence. The sea-snake paper also distinguishes surface and submerged behavior.
These are biological inspiration, not evidence that a mythical flying dragon
has a scientifically established gait; full paywalled articles/video were not
claimed to have been reviewed.

The previous small local rotations made little visible trunk curvature. Twelve
axial supports now follow a travelling sequence of absolute tangents, converted
back into local joint rotations so the chain does not accumulate into one rigid
C bend. Rear amplitude increases; a smaller vertical wave and chest shift keep
the result readable from an oblique camera. Neck compensation keeps the snout
stable, and attached claws follow the body with restrained trailing trim. Actual
resolved world displacement drives cadence/activity; the Guide has its own
preview effort. Stopping settles the pose and paused time stays frozen.

For Azure alone, normal patrol/hunt/return requests receive a small continuous
heading/height weave synchronized with its body cycle. Acceleration starts from
the last resolved travel speed and approaches the existing requested speed.
This is an explicit change to the flight path and acceleration, not an assertion
that all movement physics remain byte-identical. Speed caps, territory, complete
body/terrain clearance, pitch/bank limits, breath damage/range, attack clocks and
locked direction remain unchanged. Recovery strike requests bypass the weave.
No root teleport, camera motion or shader trick substitutes for forward travel.

Actual skin tests cover middle/rear excursion, opposite-sided trunk/tail phases,
seam continuity, anchored snout, finite bounds, pause and independent states.
World-request checks at 30/60/120 Hz verify curved displacement, acceleration,
speed cap and unchanged locked requests. Native Chrome records natural pursuit,
wind-up, breath, recovery and return with a staged 30 m invulnerable player. A
fixed observation camera preserves mountain-gate scenery as a displacement
reference. A separate real contact check registers one counter-bite; high/low/rear
targets retain upright flight. These fixtures do not prove natural whole-round
balance or physical-phone performance.

Final verification passes **1,893/1,893** tests and formatting. The Tortoise's
120 sampled skeleton poses match the preceding builder exactly. All source
meshes/colors and other guardian motion implementations remain unchanged. The
fixed-camera native run records 1,257 frames through hunt, wind-up, attack,
recovery and return; position spans 99.46 × 37.29 × 54.08 m. Pause freezes pose
and position. The separate contact run confirms a valid counter-bite, and the
high/low/rear-target flight run keeps world-up dot at least 0.982. These checks
establish the exercised behavior, not an absence of every possible collision.

The restricted preview now serves `assets/index-IJlUvwcI.js`. All **686** local
build/runtime files (**189,156,413 bytes**) match. The three changed artifacts
match fresh local and public HTTP downloads; the other 683 public artifacts rely
on dated preceding checks. Eleven private/source paths stay denied on each
origin. Native public EN 1440 px and Chinese 390 px Guide/start/controls/pause/Home
flows and same-address reload pass with no console/resource failures; the color
texture returns 200 and no production debug hook is exposed. The narrow run is
desktop touch emulation, not physical-phone validation. All four service process
identities remain unchanged and tunnel readiness is confirmed.

The delivered roughly 33-second clip contains oblique and top-view matched
before/after skin demonstrations, followed by actual game pursuit from a fixed
camera. Only the last segment is world movement; the comparisons are isolated
motion fixtures. The encoded MP4 was decoded end-to-end and twelve frames were
visually reviewed. No new textures, meshes or draw calls are introduced by the
motion repair; no FPS or thermal improvement is claimed.

Evidence is under `.local/azure_undulation_20261027/`: `tests_final.log`,
`check_final.log`, `tortoise_regression.json`, `world/report.json`,
`contact/report.json`, `flight_world/report.json`, `public/report.json`,
`artifacts.json`, `source_preservation.json`, `final_fingerprints.json` and
`delivery/`. Message receipts are recorded after sending in `delivery.json`.
Earlier batch-2 delivery remains historical evidence and is not acceptance of
this correction. The candidate awaits user review; no commit/push, and formal
main/Pages remains v0.11.20.

## Sword Sage batch — 2026-10-27

The user's “next batch” accepts the corrected Azure Dragon and authorizes the
remaining lord. The new Sage is a stern silver-haired elder with a compact
jade/bronze crown, deep green cloud-patterned outer robe, ivory layers, broad
continuous sleeves and visible boots. The face, shoulders and draped clothes
come from the actual generated mesh. No joint balls or disconnected arms are
added. The existing flying-blade array and Four-Symbol ward are reused; the
riding blade is widened to support both feet. The original named identity,
written description, 38 m length, combat values, unlock and attack clocks remain.

### Reference and generation

The [Shushan character reproduction on 9game](https://www.9game.cn/xjqxcxdks/9744050.html)
was actually viewed for the general vocabulary of an elderly sword immortal,
layered robes and flying blades. It is a third-party reproduction, not an official
licensed model sheet. No commercial image was uploaded or included in runtime.
A separate original generated concept without a sword/halo was submitted to
[microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2); the model project's
license and generated-output guidance must be distinguished from source-image
rights. The reference is documented for provenance rather than added to player
biography text.

The authenticated included quota was checked at **2026-10-27 04:47 BJT**:
1,950.208999 / 2,400 GPU seconds remained, overage zero. Each generation/export
stage checked its 120-second reservation before proceeding. The completed export
receipt records **1,905.291505 seconds** remaining and the reported reset at
**2026-10-27 18:03:25 BJT**; these are dated observations, not live balance claims.
No paid overage was used. Seed `748201`, 1024 generation, attempt 01 exported a
4,267,308-byte GLB, SHA-256
`8795271fda0912c7f8fc6f23758f8a4bf6e2abb9ba44ad4e34c9e8008c67552c`.

The repeatable conversion is `prepare_penglai_sage_hf_asset.mjs`, with the shared
original-color projection/re-atlas tool, followed by
`fit_penglai_sage_sleeves.py`. Seven raw orientations/color/clay views were
inspected. The runtime skin has **27,682 triangles / 36,107 UV vertices**, a
1,024² color map and **17 private bones**. Full unlocked/ward-inclusive model
cost is 34 meshes, 42,210 triangles and six materials (old: 54 meshes, 80,340
triangles, 13 materials). This is a structural count, not an FPS/phone-heat claim.

### Binding and integration

Axis-only sleeve weights pulled the lower inner sleeve back toward the torso.
That intermediate candidate was rejected internally. Ownership is now solved
on welded surface adjacency with fixed hand and torso seeds; duplicated UV seam
vertices receive the same field. Continuous mixing retains the shoulder root
and wide sleeve bottom. A gradual lower-robe falloff keeps boot soles on the
bevelled riding blade. Neither clothing geometry nor texture is cut to hide
binding errors. Casting lifts both forearms with an asymmetric leading hand;
charging leans the torso and lets sleeves, hair and hem trail, followed by eased
recovery. Real travel drives airflow; the Guide uses a separate preview effort.

The head command anchor preserves the previous rest location and follows the
new head. Only head and central torso are contact sections; wide sleeves are not
extra weak targets. A closed 4,000-face internal seal preserves the existing
inside-body camera behavior. Shared geometry/materials/texture preparation and
per-instance skeleton disposal use the existing lifecycle. Ordinary world entry
requests color without opening the Guide first. No shared combat or camera code
was changed in this batch.

### Verification and delivery

The new skin tests exercise normalized/seam-consistent weights, private poses,
independent disposal, actual boot-to-blade ray contacts, sleeve/robe displacement,
edge stretch, finite culling bounds, stopped time, ward visibility and the retained
head anchor. Full automated suite: **1,896/1,896**. Native and production results
are recorded below after completion; test counts do not substitute for visual
review. Evidence is in `.local/penglai_sword_sage_20261027/`. The candidate remains
uncommitted and pending user review; formal main/Pages stays v0.11.20.

Native desktop Chrome runs both language Guide views, normal region entry and
three Penglai/Hawaii return cycles. The world retains the intended single pooled
Sage skeleton and the same shared texture/geometry; this retained cache is not
reported as a destroyed scene. During a staged 30 m invulnerable-player filming
run, natural hunt/windup/attack/recovery clocks traverse both `swords` and `charge`
abilities in 1,543 frames, spanning 40.64 × 49.67 × 68.41 m. Pause freezes pose and
position. The observation camera and staged unlock are disclosed in the clip;
this is not a natural complete expedition or physical-phone test.

The exact built preview entry is `assets/index-BavuQe6i.js`. All **689** build and
restricted-runtime files (**191,390,289 bytes**) match locally. The eight changed
artifacts match fresh HTTP downloads on local/public origins. The unchanged 681
public files rely on the dated previous verification rather than a new full
network sweep. Eleven private/source paths remain denied on both origins; all
four service process identities are preserved. Comparing 1,740 preceding source
inputs finds only seven expected existing-file changes: the three entry docs,
this review, the creature factory, internal seal registry and its test. Previous
four guardian assets/poses, encounter rules and all other prior inputs match.

A separate native adult-orca contact fixture confirms five real recovery
counter-hits across five attack cycles (350 → 280 → 210 → 140 → 70 → 0), then
regional victory and a restarted locked/healthy Sage. The fixture stages the
other four guardians as defeated and places the player for approach; it does
not force Sage phases, damage or validated hits. Two obsolete fixture
expectations were corrected and retained in evidence: the final hit immediately
changes phase to `defeated`, and regional victory presents the outcome menu
instead of the gameplay Pause button. These were fixture failures, not hidden
runtime fixes. The final contact run passes with no page errors.

The delivery film is roughly 36 seconds: a matched old/new isolated pose preview
followed by actual world pursuit, sword volley and charge from an observer camera.
The H.264 MP4 was decoded end-to-end; sampled frames were reviewed for sleeve
continuity, supported feet, color and the world transition. It has no audio track.
The generated body and continuing cloth motion are the redraw; existing blade
geometry and combat effects are deliberately reused rather than claimed as HF
outputs.

Native public EN 1440 px and Chinese 390 px Guide/start/controls/pause/Home
flows pass, including same-address reload of the exact new entry. The Sage color
returns HTTP 200 in both sessions; console/resource error lists are empty and no
production debug hook is exposed. The 390 px run is desktop touch emulation,
not a physical phone. Public evidence is `public/report.json`; the final
contact evidence is `contact/native_counters.json`. Delivery receipts and the
final input/build snapshot are kept alongside the reviewed images and video.

## Sword Sage white hair and cloud jian — 2026-10-27

The user accepts the human silhouette, requests a white-haired elderly Daoist,
and finds the riding and orbiting swords too rough. This pass preserves the
accepted human positions, atlas, sleeve ownership, skeleton and motion. A local
hair/scalp/beard material mask changes only reflectance, with no emissive hair.
The face, crown and clothing retain their original materials.

An original sword concept is exported through Microsoft TRELLIS.2-4B
(seed 748301). Its physical central ridge, cloud-scroll guard, jade setting,
wrapped grip and pommel replace the former simple parts. The raw 99,986-triangle
export is reduced and rebaked to 4,468 triangles / 5,759 atlas vertices with one
1024-pixel color image. The raw GLB is 3,894,568 bytes; SHA-256
`b16c1a9eed4ac1fc767ca0193b2ba4e84fb8a1752b867dfa6dac34bfc5bf2c1d`.
The original source/receipt and all review evidence remain in ignored
`.local/sage_hair_swords_20261027/`.

The riding variant broadens the physical blade and fits a flat central ridge
under both boots. Seven orbiting blades and real fired projectiles share the
same base geometry/material; the riding variant has one shared fitted geometry.
No gameplay size, damage, timing, direction, projectile speed, unlock rule or
head launch anchor changes. The neutral unit-length envelope remains unchanged.
Human source JSON and color texture are preserved byte for byte.

The combined figure changes from 34 meshes / 42,210 triangles / six materials
to 10 meshes / 65,730 triangles / three materials. This trades additional
silhouette detail for fewer separate draws, not a measured frame-rate gain.
The extra sword color is shared across all usages but uploads independently in
Guide and game WebGL contexts. Hair adds one scalar attribute to the shared
human geometry. Physical-phone performance remains unmeasured.

A first native capture exposed black HDR output after the riding geometry's
normals were recomputed into a normalized Int16 buffer. That discarded small
face-area accumulations. The fit now accumulates Float32 normals and retains
valid original normals for unused/degenerate vertices; a regression checks
finite unit normals on every indexed vertex. The failed capture is retained as
`rejected_normal_quantization_native`, not counted as visual acceptance.
Material preparation also returns a combined boolean and forwards priority/
retry options to both shared assets, so Guide retry cannot report partial
success as complete.

Fresh verification for this refinement:

- 45 targeted Sage/contact/encounter checks pass; the five Sage geometry,
  normal, hair-mask, anchor, shared-kit and boot-support checks pass again after
  the normal repair. The earlier full-suite count belongs to the previous batch.
- Native Chrome checks both Guide languages, three Penglai/Hawaii return cycles,
  actual sword/charge phases and frozen paused pose. The new 26-second game
  capture contains 1,559 rendered samples, real world travel and actual sword
  projectile objects. Its adult invulnerable player and observer camera are
  inspection fixtures, not a natural-progression run.
- An intentionally blocked sword color leaves the Guide retry visible and the
  combined preparation false. Releasing the fault and clicking Retry loads both
  the human and sword colors, with no page error.
- The matching before/after clip and actual-game footage are encoded and decoded
  as H.264; sampled final frames show the new materials and no black-frame defect.
- 1,739 of 1,747 baseline inputs remain byte-identical. The eight changed existing
  inputs belong to this refinement; all earlier guardian assets/motion and the
  human mesh/atlas/binding are unchanged. Five new inputs contain the sword kit,
  hair material and offline converter.
- Build output contains 692 files / 191,867,438 bytes. Every local dist/runtime
  hash matches; six changed artifacts have fresh byte-matched local/public HTTP
  reads. The other 686 retain dated prior public verification, not a new claim
  of full-network measurement. Eleven source/private paths remain denied and the
  original four service process identities are preserved.

Production-native checks also pass on the same public URL: English 1440-pixel
and Chinese 390-pixel desktop touch emulation, Guide/start/control/pause/Home,
all requested colors HTTP 200, same-URL reload and no production debug hook.
The narrow viewport is not a physical phone test. Formatting checks and the
production build pass.

The preview entry is `index-BAbsaU4K.js`. Included HF quota after this export was
1,862.850943 / 2,400 seconds, with zero overage; this is a dated receipt, not a
current balance. This is a candidate for visual review, with no commit or push.

## Straight riding blade and readable sword volleys — 2026-10-27

The user reports that the riding sword looks bent and asks to verify that the
skill launches swords. The preceding hair/sword delivery is not accepted as
proof of these two details; its evidence remains dated history.

The old riding fit raised only the middle upper face to support the boots.
Its transition back down near the point made the sword look bowed from the
side. The revised fit holds the whole blade face on a straight plane, keeps a
small point bevel, and stops widening the guard. Actual boot-to-triangle rays
still verify both feet remain supported through casting and dash poses. The
source HF mesh/atlas, human mesh/binding and white-hair material are unchanged.

Actual `fireVolley` already instantiated the HF jian, but its 9-unit glow was
inside the 2.6-scale projectile: a 23.4 m glow masked the approximately 10.7 m
sword. The revised projectile has a 1.56 m hilt glow and a narrow trailing light.
A 45-degree roll around the blade's own long axis exposes the blade face in
side views while its tip stays aligned with flight. No extra meshes, textures,
light objects or per-frame geometry rebuilds are introduced. Other projectile
abilities retain their existing glow and trail values.

Damage, collision radius, launch anchor, 85 m/s speed, 0/0.45/0.9 s shot timing,
three-shot count, life, ward and unlock rules remain unchanged. No HF request
or new quota consumption was needed. Evidence is under
`.local/sage_jian_repair_20261027/`.

Fresh targeted validation passes 47 Sage/encounter tests, including actual
three-shot objects, shared geometry/material, tip-to-trajectory alignment,
limited glow size, speed, cleanup, straight triangle-surface rays, finite normals
and supported boots. These checks supplement the visual review, not replace it.

Native Chrome verification checks both Guide languages, three Penglai/Hawaii
return cycles, shared resources, actual sword/charge phases and frozen pause.
The new 26-second world recording contains 1,558 rendered samples and actual
sword projectiles. It uses a staged adult invulnerable player, defeated other
guardians and a fixed observer camera; it is not natural-progression or phone
performance evidence. A separate labeled close-up uses models instantiated by
the real before/after `fireVolley`, frozen and enlarged to inspect their blade,
guard and glow. Its first capture was interrupted by Vite navigation; that
failed log is retained and the completed retry has no page errors.

The delivered H.264 clip combines seven seconds of enlarged before/after
projectiles and nine seconds of actual-speed gameplay. Complete decode and
sampled-frame inspection pass, with no frame over 50% black pixels. Matched
side-view riding-sword images document the removed bend.

Production preview `index-DcIGpwAN.js` contains 692 files / 191,867,857 bytes.
All dist/runtime hashes match. Three changed artifacts have fresh byte-matched
local/public HTTP reads; the 689 unchanged files retain previous dated public
verification. Eleven private/source paths remain denied on both origins. Fresh
English 1440 px and Chinese 390 px desktop-touch-emulated Guide/start/control/
pause/Home and same-URL reload flows pass with both textures loaded and no
production debug hook. The original four service process identities remain.
This is not physical-phone validation.

Of 1,752 prior source inputs, 1,744 remain byte-identical; only the two sword/
projectile runtime files, two targeted test files and four project documents
change. Prior guardians, human/hair, assets, combat specifications and other
maps are preserved. Formatting, whitespace and production build checks pass.
The corrected preview awaits the user's visual review; no commit or push.

## Fish batch 1 — 2026-10-27

The user accepts the Sword Sage repair and authorizes the next batch. Four
ordinary fish now use actual Hugging Face TRELLIS.2 exports from original concept
images: Jade Minnow has a slender jade/silver body, Chiru a copper-red human-like
facial mask, Spirit Carp white/red veiled fins, and Dragon Carp a substantial
bronze/gold carp body. This is a candidate for the user's visual review. No
commit, push or change to the formal v0.11.20 release is included.

### References and provenance

The National Museum of Natural Science's [human-faced fish pottery article](https://www.nmns.edu.tw/ch/research/specimen/featured/Collection-000106/)
quotes the Chiru fish-body/human-face description. The displayed Tang object is
not a canonical Chiru design sheet; its four limbs are not copied into this fish.
Copper-red coloring and facial-mask detail are original game interpretations.
Other fish follow the existing written identities. No reference photograph or
third-party model is uploaded or shipped.

All four source GLBs were actually generated in `microsoft/TRELLIS.2`, at 1024
resolution with seeds 748401–748404. They were downloaded and checked while the
Gradio client remained open. Raw source hashes, receipts, concepts, six-view
color/clay inspections and fitted outputs are retained in
`.local/penglai_fish_batch1_20261027/`. Before generation, included quota was
1,862.850943 seconds; after the final export at approximately 06:09 BJT it was
1,731.982930/2,400 seconds, with zero overage and a returned reset time of
2026-10-27 18:03:24.640 BJT. These are dated observations, not a live balance.

### Surface, motion and integration

- Offline reduction, new UV charts and source-color rebaking retain separate
  fins, gills, barbels and scale texture. Chiru and Spirit Carp generated in a
  bent pose receive a measured centerline fit with inverse-transpose normals;
  UVs, longitudinal size and local volume remain. A detached 64-triangle Spirit
  Carp fragment visible during review is removed; attached fins and barbels
  remain. Repeatable conversion, fitting and component-cleaning scripts ship.
- Each instance has an independent continuous tail/pectoral rig over a shared
  immutable skin. The forked fish retain terminal fin support. Spirit Carp uses
  six delayed tail sections to bend its longer veil. Existing simulation time
  drives both world and Guide; visual effort eases between cruising and faster
  swimming. Pausing stops the pose.
- All four use the existing bounded color-loading/retry queue and prepare colors
  on ordinary world entry. A deliberate texture failure keeps opaque vertex-color
  skin; retry restores the map on the same geometry. There are no new global
  lights, shaders, gameplay clocks, floating white placeholders or per-frame
  geometry/material allocations in the animation callback.
- Existing lengths (0.6/3.3/6/10 m), counts (40/27/33/30), head contacts and ground
  support remain. Dragon Carp keeps the original two-individual Dragon Gate
  transformation, alternate Gate Dragon and progression/attack rules. Its new
  closed internal seal is appended without replacing any earlier seal record.

### Measured costs

| Kind        | Vertices | Visible triangles | Skin draws/materials | Bones | Color WebP bytes |
| ----------- | -------: | ----------------: | -------------------- | ----: | ---------------: |
| Jade Minnow |    3,973 |             3,172 | 1 / 1                |     7 |          174,728 |
| Chiru       |    6,988 |             5,464 | 1 / 1                |     7 |          244,854 |
| Spirit Carp |    8,388 |             6,412 | 1 / 1                |     9 |          292,844 |
| Dragon Carp |    7,891 |             6,468 | 1 / 1                |     7 |          252,156 |

The former models used 12/11/13/13 meshes and
22,808/23,300/25,108/24,392 triangles respectively. Four maps add 964,582 download
bytes and about 21.33 MiB for 1024² RGBA mip chains per WebGL context. Guide and
world can upload independently; lower geometry cost is not proof of improved
physical-phone FPS or temperature. Dragon Carp also has one 2,488-triangle closed
interior proxy for the existing close-camera system.

### Verification

- **1,911/1,911** full unit checks and **21** focused fish/silhouette/transformation
  checks pass. The first run exposed an old procedural silhouette comparison;
  after inspecting the new forms, its assertions were changed to compare their
  actual distinct veils and core bodies. The original failing log remains.
- Actual deformed fin/tail tips, head stability, UV-seam weights, finite normals,
  conservative bounds, instance independence, pause and idempotent disposal are
  checked. Existing transformation tests use the actual new factory, including
  the full rise/reveal/return and both real gate openings.
- Thirty other kinds across 120 sampled poses match the preceding delivered
  factory exactly, including all five earlier lords. This is a sampled regression,
  not an all-vertex proof for the whole catalog.
- Native desktop Chrome checks normal entry before opening Guide, 12 Guide visits
  and three Penglai/Hawaii/Atlantis cycles. Shared geometry/maps remain stable;
  all 390 tracked removed-scene skeletons release their bone texture.
- Four forced color failures and explicit retries succeed on the same geometry.
  Final close-up videos show cruise, higher effort and return; independent real
  scene clips record unpinned movement, turning and frozen pause poses. The camera
  is an observation fixture and the staged player is invulnerable. These are not
  natural whole-round progression or physical-phone measurements.
- Evidence: `native/report.json`, `retry.json`, `motion/report.json`,
  `world_final/report.json`, `sibling_regression.json`, `targeted_final.log`,
  `all_tests_final.log`, matched `before/` and `after/`, and `delivery/` under the
  batch evidence directory. Final encoded footage is decoded and frame-reviewed
  before delivery. Public delivery checks are appended below after rebuilding.

Fifteen ordinary kinds, two transformed forms, one exclusive rare and the
regional scenery remain subsequent redraw work. Already accepted lords and
reused players are not regenerated by this batch.

### Fish batch preview and preservation

The existing restricted preview now serves `index-B_dEEy5Q.js` at the same URL.
All **704** current build files (**194,151,070 bytes**) match the local runtime
byte-for-byte. All **17** changed/new files were freshly retrieved over both local
and public HTTP with matching hashes; the other **687** public files rely on the
dated previous full-public verification. Eleven source/config/debug paths are
denied on both origins. Existing DEV 35213, preview 23118, awake 23120 and tunnel
35419 identities remain; the previous runtime is archived, not replaced in place.

Eight native production flows (four fish × English 1440px / Chinese 390px touch
emulation) pass Guide → start → ability → pause → Home, with all four texture
requests returning 200, no page errors or failed resources, no production debug
hook and a same-URL reload retaining the new entry. The 390px check is desktop
emulation, not a physical-phone result. `npm run check` and the build pass.

The 1,752-input preceding-delivery baseline is compared against 1,766 current
inputs. Only this batch's nine expected existing files differ and fourteen new
files are added; previous guardian and Sage source/assets are unchanged. The
scope is recorded in `source_preservation.json`; exact inputs/build hashes are
in `final_fingerprints.json`. The four-model gallery, matched before/after sheet
and approximately 56-second near-view/real-scene movie are in `delivery/`.
Final message identifiers are retained in `delivery.json`. All four appearances
remain pending user review, without commit/push.

## Winged and shell batch — 2026-10-27

The user accepts proceeding after the four-fish batch and asks that historical
illustrations, especially Shan Hai Jing and Eastern mythology, guide the next
creatures. This batch redraws **Lotus Sprite, Wenyao, Luo Skyfish and Cloud Crane**
through actual TRELLIS.2 exports. Prior five lords and four fish remain accepted,
uncommitted and unchanged. These four new appearances await user visual review;
there is no commit/push or formal release.

### Reference and production

The Qing illustrated Shan Hai Jing entries for Wenyao/Luo, the Sancai Tuhui
Wenyao woodcut and a museum reproduction of Auspicious Cranes were actually
viewed. The [source ledger](penglai_sources.md#wingfish-lotus-sprite-and-cloud-crane--2026-10-27)
records links, observations and adaptation boundaries. Original concepts retain
Wenyao's white head/red mouth/broad wings, Luo's bronze slender body/swept wings/
two long tail lobes, the original lotus-valved shell/pearl, and Cloud Crane's
extended neck/trailing legs. Historical scans were neither uploaded nor shipped.

Four actual GLB exports use seeds 748501–748504. Raw receipts, hashes, concepts,
color/clay views and conversion experiments are retained in
`.local/penglai_winged_batch_20261027/`. Included quota was 1,731.982930 seconds
at 07:22 BJT and 1,551.033011/2,400 seconds at 07:38:57 BJT after the four
exports, with zero overage. The returned reset was 2026-10-27 18:03:25.505 BJT;
these figures are dated observations, not a live balance.

### Surface and motion

- One shared skinned surface/color map per kind replaces the earlier procedural
  pieces. Existing color preparation/retry behavior remains. Normal world entry
  prepares colors without opening Guide. No new global light, shader, gameplay
  timer or per-frame surface allocation is introduced.
- Wenyao and Luo have separately measured shoulder/elbow/wrist pivots and
  continuous wing-root binding. Broad flaps and gliding differ from the narrower
  swept-wing movement; the two tail shapes retain restrained delayed bends.
  Cloud Crane keeps its head/neck steady, spreads and folds feathered wings,
  and leaves the legs trailing, using the existing upright aerial orientation.
- Lotus Sprite's early reduced surface exposed thin-shell cracks and opposite-
  surface color transfer. Position welding alone did not fully repair it. The
  final offline resampling/smoothing/reduction and directional color rebake
  remove the visible tears without covering them with extra meshes. Original
  source and rejected attempts remain. The pearl/core stays steady, paired
  valves hinge around their measured base, and four feelers bend independently.
  Its nominal 1.1 m size uses the shell's maximum diameter; the new rest front-
  back depth is narrower than the old circular procedural shell.
- Logical sizes, regional population, feeding contacts, ground-support metadata,
  descriptions, habitat/formation rules and rewards remain. Base roster counts
  differ from the existing region's expanded stocks: actual Penglai populations
  are 32 / 44 / 48 / 30, totaling 154 affected individuals. Crane receives a
  1,028-triangle closed internal seal for the existing large-body camera system;
  previous seal records remain intact.

### Verification and delivery

Fresh measured results and preview fingerprints are recorded below from the
final native/public checks. Tests establish technical contracts, not aesthetic
acceptance. World capture uses a staged invulnerable player and observer camera;
NPC movement is not pinned. Desktop touch emulation is not physical-phone
performance or full-round balancing evidence.

Eleven ordinary kinds, two transformed forms, one exclusive rare and the
regional scenery remain subsequent redraw work. Existing players are reused.

### Measured cost and final checks

| Kind         | Vertices | Visible triangles | Skin draws/materials | Bones | WebP bytes |
| ------------ | -------: | ----------------: | -------------------- | ----: | ---------: |
| Lotus Sprite |   17,161 |            18,000 | 1 / 1                |    19 |    269,210 |
| Wenyao       |   11,545 |             7,876 | 1 / 1                |    11 |    291,508 |
| Luo Skyfish  |   12,444 |             8,902 | 1 / 1                |    11 |    294,930 |
| Cloud Crane  |   12,912 |             8,938 | 1 / 1                |    10 |    302,870 |

The preceding appearances used 25/13/19/17 meshes and
37,968/27,512/20,384/41,076 triangles respectively. Four 1024² color maps add
1,158,518 download bytes and approximately 21.33 MiB of RGBA mip chains per
WebGL context; Guide/game can upload independently. A staged populated scene
with 401 individuals records before/after draws and triangles in
`native/report.json`; all four sampled views reduce both, but these are not
physical-phone FPS, thermal or power measurements.

- **1,922/1,922** full unit checks and **30** focused geometry, motion, roster,
  normal and interior checks pass. Early failures and rejected captures remain.
  The final surface repair also replaces 84 invalid Lotus normals with nearby
  valid directions. Lotus opts into the existing upright aquatic display so
  the pearl does not roll upside-down during ordinary turns; travel is unchanged.
- Every wing/valve/feeler/tail chain is checked using actual skinned vertices,
  including finite unit weights/normals, continuity, UV-seam agreement, bound
  containment, independent instances, stable core/head and paused phases.
  The broad Wenyao wing-tip threshold is based on its measured radius/speed,
  rather than the former tiny pectoral fin threshold.
- Thirty unaffected kinds match exactly across 120 sampled poses, including
  all previous lords, the accepted fish and playable characters. This is a
  sampled regression, not an exhaustive all-vertex proof of the whole catalog.
- Normal world entry before Guide, 12 Guide visits and three Penglai/Hawaii/
  Atlantis cycles pass. Shared geometry/colors remain stable and all **462**
  tracked evicted skeletons release their bone textures. Four injected color
  failures recover on the same opaque geometry after retry.
- Close-up clips exercise cruise / faster effort / return. Independent real
  scene clips record unpinned movement/turns and frozen pause poses. The three
  flyers' minimum recorded world-up dots are 0.99975 / 0.99973 / 0.99990;
  the upright Lotus follow-up reaches 0.96432 without a roll inversion.
  A video is frame-reviewed after final encoding, not just before capture.
  The final Crane observer clip stages a smaller player farther away and keeps
  the living subject visible to the observer camera. This avoids accidental
  feeding and player-camera visibility filtering; its AI and world movement
  remain active. All recorded Crane samples remain alive and visible. This
  fixture does not establish normal follow-camera framing or encounter pacing.

Evidence includes `targeted_final.log`, `all_tests_final.log`,
`sibling_regression.json`, `native/report.json`, `retry.json`,
`world_final/report.json`, `motion/report.json`, `asset_cost.json`, matched
`before/` and `after/`, and `delivery/` under this batch directory.
The repeatable Lotus repair runs `repair_penglai_lotus_surface.py` after the
initial orientation/normalization export, then rebakes from the original GLB
with a 0.015 projection limit. Intermediate simplified exports are not the
final Lotus asset.

### Winged/shell preview and preservation

The restricted preview serves **index-BhcOp-La.js** at the same URL. All **716**
build files (**197,889,371 bytes**) match the local runtime byte-for-byte. The
**17** changed/new files were freshly retrieved from both local and public HTTP
with matching hashes; **699** unchanged public files rely on the dated preceding
verification. Eleven source/config/debug paths remain denied on both origins.
DEV 35213, preview 23118, awake 23120 and tunnel 35419 identities are preserved;
the prior runtime is archived.

Eight native production flows (four kinds × English 1440px / Chinese 390px touch
emulation) pass Guide → start → ability → pause → Home. All four color maps load
successfully, with no failed resources/page errors, no production debug hook,
and successful same-URL reload. This is not physical-phone validation. Build,
formatting and diff checks pass. Actual game renders, matched before/after and
an approximately 56-second close-view/world film are delivered for user review.

Source preservation and final exact input/build hashes are retained in
`source_preservation.json` and `final_fingerprints.json`. The source review
separates earlier uncommitted work from this batch; no preceding appearance is
regenerated. The preceding 1,766-input baseline becomes 1,779 inputs: nine
expected existing files change, thirteen new files are added, and none are
removed. Earlier guardian/fish meshes, textures and motion files remain
byte-identical. Delivery message identifiers are recorded in `delivery.json`.

## Waterbird batch — 2026-10-27

The user's “好的，下一批” accepts the preceding Lotus/Wenyao/Luo/Crane delivery.
This batch contains **Xuangui, Bifang, Hujiao and Northern Hujiao**, not the
remaining terrestrial ecology or scenery. Twelve of nineteen ordinary catalog
kinds now have HF redraws; seven ordinary kinds, two transformations, the rare
and regional scenery remain. New appearances await review; no commit/push.

### Sources and shape

- Xuangui: the Qing anonymous illustrated **Shan Hai Jing Tu, Lin Jie V**
  [plate and caption](https://www.shidianguji.com/book/7316439153875353650/chapter/1kibjypkmkf8y)
  were actually viewed: turtle shell, bird head and serpent tail.
- Bifang: the one-legged long-necked bird in Hu Wenhuan's Ming
  [Xin Ke Shan Hai Jing Tu, lower volume](https://www.shidianguji.com/book/NGJ892411999026703157530/chapter/1lp5q8dyhwylf)
  was actually viewed. Blue feathering, red markings and white beak also follow
  the existing species description.
- Hujiao: the Shan Hai Jing fish-body / serpent-tail description quoted in
  [Yu Ding Zi Shi Jing Hua, Lin](https://www.shidianguji.com/book/SK2004/chapter/1l9ewdpw8og83)
  was read. No Hujiao historical illustration is claimed as viewed. The Northern
  variant's heavier body and crown fin follow its existing game description.

These are distinct historical and textual references, not one definitive
“official design.” Original concepts alone were uploaded to HF; no museum scan
or third-party character asset is shipped. Four actual TRELLIS.2-4B exports use
seeds 748601–748604. Original GLBs, hashes, concept prompts and source images
remain in ignored `.local/penglai_waterbird_batch_20261027/`. Generation and
export receipts show included quota only, zero over-quota usage; the last
returned balance was 1,439.787574 seconds with reset at 2026-10-27 18:03:24 BJT.
This is a dated service reading, not a continuously current balance.

### Integration and motion

The new conversion script simplifies with surface-normal/UV constraints,
re-atlases, projects original HF color, pads texture islands and repairs invalid
normals. The fitted waterbird adapter shares immutable geometry/materials and
the existing texture queue. Each instance owns only its skeleton/pose.

Xuangui keeps its carapace rigid while front paddles alternate power/recovery,
hind paddles assist and the serpent tail gently bends. Bifang has one trailing
leg, delayed wing-root/elbow/wrist motion and a glide interval; existing upright
aerial heading remains. Hujiao and its adult variant have a stable head, a
travelling continuous tail wave, and separate steering fins attached to axial
supports. The small right pelvic fin of ordinary Hujiao is fitted to its actual
tucked location, rather than assigned the opposite fin's pivot.

Offline volume-preserving centerline shears remove the generated Hujiao tails'
lateral rest bend; inverse-transpose normal correction preserves shading and
UVs. Contact-height translations align the turtle/bird surfaces with their
original head anchors. Actual nearest mouth-skin distances are 0.00161, 0.00692,
0.00717 and 0.00974 of normalized length respectively. Original head anchors,
lengths, ground support contracts, homes, 24/20/5/1 populations, movement speeds,
food values, retaliations and lord rules are unchanged. All source geometry is
shared without per-frame vertex uploads. Three new large-body interior seals
remain closed and only service the existing inside-body rendering path.

### Verification and cost

- Full suite: 1,933/1,933 before the final extra carapace/contact regression;
  the final focused run includes that added check and the three new interior
  seals. The final focused suite passes 27/27 (`final_targeted.log`).
- Thirty unrelated kinds / 120 sampled poses compare exactly with the immediate
  pre-batch factory. Earlier accepted mesh and color files remain unchanged.
- Apple M6 / 32 GiB, Chrome 156.0.8078.48, Node 24.21.0. Native Chrome: 12 Guide visits and nine region entries across three cycles;
  normal world texture preparation succeeds before Guide. Fifty new instances
  per Penglai round retain independent bones, and all 150 tracked departing
  skeleton textures dispose. Four intentional HTTP503 color failures retain
  opaque fallback surfaces and recover on retry without replacing geometry.
- Four real NPCs move in the populated world, including turns; pause freezes
  their pose. Observation camera, invulnerable 3 m player and one-time player
  placement are inspection fixtures, not natural progression evidence. The
  separate bite fixture isolates other threats and uses ordinary health with
  native slow input: Hujiao damages a 3 m player and Northern Hujiao damages a
  30 m player through the real game path, retaining rear-follow behavior.
- One visible mesh/material each; triangles **11,995 / 11,727 / 11,790 / 13,990**,
  bones **17 / 10 / 20 / 20**. Previous models used 18/19/66/73 meshes and
  19,554/47,508/176,052/176,276 triangles. Four shared 1024 color textures add
  approximately 21.3 MiB with mipmaps per renderer context; Guide and game have
  separate uploads. These are costs, not physical-phone performance claims.
- Matched populated views (401 entities) change calls/triangles respectively:
  Xuangui 94/204,868 → 77/197,309; Bifang 170/479,226 → 155/472,359;
  Hujiao 166/426,122 → 104/290,837; Northern 416/1,493,280 → 265/1,190,350.
  These fixed paused views do not establish general FPS, energy or heat gains.

Evidence: `before/`, `after/`, `raw_review/`, `native/report.json`,
`world_final/report.json`, `combat/report.json`, `retry.json`,
`sibling_regression.json`, `asset_cost.json`, and encoded `delivery/`.

### Production preview and delivery

The same restricted preview now serves `./assets/index-rQhEr5vj.js`. All **728**
build/runtime artifacts match locally (202,173,298 bytes including compressed
duplicates, not the initial download size). The **17** changed artifacts were
freshly fetched from both local and public HTTP and match exactly; the 711
unchanged public artifacts rely on the dated preceding verification. Eleven
source/config/debug paths remain denied. DEV 35213, preview 23118, awake 23120
and tunnel 35419 retain their original process identities and logs.

Eight native production flows pass (four kinds × English 1440px / Chinese 390px
desktop touch emulation): Guide → start → ability → pause → Home. All four color
maps return HTTP 200 in both contexts, with no failed resources or page errors,
no production debug hook, and successful same-URL reload. These checks are not
physical-phone validation. Build, formatting and diff checks pass.

The approximately 56-second game video includes each creature's close-view
motion followed by actual NPC travel and turning in the populated world.
Matched before/after renders and the four-model gallery accompany it. Final
encoded frames have been inspected; the separate damage fixture is documented
in `combat/report.json`, not presented as attack footage in this video.

The final input/build hashes and source-preservation audit are retained in
`final_fingerprints.json` and `source_preservation.json`: 1,779 prior inputs become
1,792, with ten expected existing-file changes, thirteen additions and no
removals. Earlier accepted meshes, textures and motion files remain unchanged.
Actual delivery message identifiers are recorded in `delivery.json` after
sending. Physical-phone performance and user visual acceptance remain open;
this batch has not been committed or pushed.

## Terrestrial beasts and Gudiao — 2026-10-27

The user's “好的，做下一批吧” accepts the preceding Xuangui/Bifang/Hujiao/
Northern Hujiao delivery. This batch redraws **Lushu, Gudiao, Nine-tailed Fox
and Zheng**. Sixteen of nineteen ordinary Penglai kinds now have HF models;
Bashe, Kui and Kun, the two transformations, regional rare and scenery remain.
These four new appearances await user review. No commit or push is authorized
by this continuation.

### References and production

The four corresponding plates in the Qing anonymous **Shan Hai Jing Tu,
Beast Family III** were actually viewed through
[Shidian's digitized edition](https://www.shidianguji.com/book/7316439153875353650/chapter/1kibjypkmjpyq).
Lushu retains the white-headed horse, tiger stripes and red tail; the fox has
nine distinct tails; Zheng has a reddish leopard body, five tails and one horn.
The Gudiao plate shows a quadruped variant, while the text describes a
horned eagle-like animal. This game's existing aerial, horned-eagle description
is retained; the plate is not misrepresented as a definitive bird design.
These historical references inform original concepts, not copied character
assets. Game descriptions and combat values are unchanged.

Actual Microsoft TRELLIS.2-4B exports follow the user's existing HF selection.
Final seeds are Lushu 748701, Gudiao 748703, Fox attempt 02 748703, and Zheng 748704. The first fox export had seven visible tails and fragmented fur and
was rejected. Its source, the concept correction and the successful nine-tail
export remain separate in `.local/penglai_beast_batch_20261027/`. Complete GLBs
were downloaded and checked before closing each Gradio session. Every GPU
stage checked included quota; no paid overage was used. The last export receipt
returned 1,235.936094 seconds remaining, resetting at 2026-10-27 18:03:24 BJT;
this is a dated reading, not a claim about the current balance.

### Anatomy, movement and integration

The conversion constrains surface normals/UVs during reduction, builds fresh
atlases, projects original HF color and pads texture islands. Fox fur receives
an offline volume cleanup; its turned muzzle is aligned with a continuous
collar deformation before runtime. A rejected runtime rest twist pulled the
shoulder skin and was removed. Inverse-transpose normals accompany the offline
fit. Original lengths, muzzle anchors and ground-support heights remain.

Lushu, Fox and Zheng have separate fitted hip/knee/foot chains, phased stance
and recovery, and crouch/leap poses driven by the existing ground state. Fox
and Zheng retain nine/five independently bound tails. Gudiao has delayed
wing-root/elbow/wrist beats, a glide interval and a steering tail. Its existing
upright flight orientation remains. Each instance has independent bones;
geometry, color maps and the existing retry queue are shared. No extra animation
loop or per-frame vertex uploads are introduced.

Ordinary region entry exposed a real integration issue: treating every vertex
of a continuous skinned animal as a rigid terrain probe made Zheng's habitat
unsatisfiable. The new models now supply explicit rigid-body vertex indices
from their fitted weights. Ground navigation samples that torso/head set while
retaining the existing flexible paw/tail exclusion used by multipart animals.
Other geometry follows the original path. This retains the original mountain,
colliders, homes, population and navigation limits rather than loosening terrain
checks. All 38 ground residents pass actual rigid-body placement on the rendered
mountains. Three closed, bounded interior seals cover the existing inside-body
rendering path; they do not change visible skin or collision.

### Checks and measured cost

The final full suite passes **1,947/1,947**; the focused anatomy, interior,
terrain-placement and Penglai run passes **35/35**. Thirty unrelated kinds and
120 sampled poses remain exactly equal to the pre-batch factory. Earlier
accepted model/color files are retained. New baseline lengths/speeds and runtime
populations remain Lushu 7.8 m / 4.8 / 16, Gudiao 19 m / 24 / 18, Fox 13 m /
6.6 / 9 and Zheng 23 m / 8.3 / 9: 52 replaced instances within 401 Penglai
residents. Base catalog counts differ from the runtime density-expanded counts.

Native Chrome checks ordinary texture preparation before opening Guide,
12 Guide visits and nine region entries across three cycles. Shared geometry
and texture identities remain stable; all 156 tracked departing skeleton
textures dispose. This is native desktop Chrome, not an actual mobile-device
or thermal measurement.

Each new kind has one visible mesh/material. Triangle counts are **13,582 /
11,938 / 18,000 / 15,927**, with **21 / 15 / 52 / 36** bones. Old meshes used
22/18/41/29 draws and 31,360/42,612/59,876/53,216 triangles per individual.
Four shared 1024 color maps add about 21.3 MiB with mipmaps per renderer context;
Guide and game upload separately. Fixed populated views change calls/triangles:
Lushu 114/268,552 → 93/250,774; Gudiao 111/292,644 → 94/261,970; Fox
138/415,392 → 101/408,703; Zheng 139/438,219 → 112/418,930. These paused
views include existing effects/interior rendering and do not establish FPS,
CPU, battery or heat improvement.

Raw exports, actual plates, rejected attempts, before/after captures, mesh/skin
checks, populated-scene costs and runtime receipts are retained under the
ignored batch directory. Final preview and delivery verification is recorded
below for the reviewed restricted build.

### Final preview and delivery

The existing restricted preview now serves `index-C2j7kaJe.js`. All 740 local
build/runtime artifacts match byte-for-byte (206,966,513 bytes including
compressed duplicates, not initial page transfer). The 17 changed artifacts
were freshly checked over both local and public HTTP; the 723 unchanged public
artifacts retain their preceding dated verification. Eleven source/config/debug
paths remain denied on each origin. DEV 35213, preview 23118, awake 23120 and
tunnel 35419 remain running with the same identities and retained logs.

Eight native production flows pass: four kinds in English at 1440px and Chinese
at 390px desktop touch emulation, through Guide, start, ability, pause and Home.
All four maps load with HTTP 200, no page/resource errors occur, the production
debug hook is absent, and same-address reload resolves the new entry. An
intentional texture failure test also recovers the four opaque fallback models
through the existing retry queue. This is not physical-phone validation.

The 56-second delivery video contains close-view movement and real NPC travel
in the populated world for each kind. Its world fixture uses a one-time nearby
player placement, an invulnerable player and an observer camera; entities move
under their normal ecology without per-frame pinning. Pause freezes movement.
Final encoded frames, matched before/after views and the gallery were inspected.
Separate attack fixtures isolate attribution without invulnerability: Fox and
Gudiao reduce player health to 72; Zheng reduces it to 52 when the player is
exposed at its leap height. The initial lower-target Zheng miss is retained in
`combat/report.json`, with the successful follow-up in `combat_zheng/report.json`.
These fixtures check existing attack integration, not a new balance claim.

`source_preservation.json` audits all 1,792 preceding inputs: only the nine
expected existing files change, twelve new files are added, and none are removed.
All earlier accepted model/color assets remain unchanged; all 662 prior interior
proxy entries are exactly preserved and three new closed proxies are added.
`asset_cost.json`, `final_fingerprints.json` and `delivery/manifest.json` retain
costs and source/build/media hashes. Actual Feishu message identifiers are saved
in `delivery.json` after sending. This batch remains uncommitted and unpushed,
with user appearance/motion review pending.

## Fox and Zheng surface and motion repair — 2026-10-27

The user rejected the delivered Fox's unnatural finish, inactive-looking tails
and moving leg holes, and Zheng's crooked tail bundle and torn belly
(`om_x100b613462e368a4dfb50d104bfa56a`). The earlier technical pass did not
establish acceptable animated skin. These two replacements remain candidates;
Lushu and Gudiao are preserved, not silently redesigned or marked accepted.

The old lower-body binder selected one nearest limb across the belly, with
abrupt ownership changes. In the initial 16-phase visible-skin audit, the worst
edge stretches were 5.79x for Fox and 23.30x for Zheng. The repair blends
anatomically nearby limb weights, keeps the chest/abdomen out of foot motion,
and separates the Fox's rear hocks from its lower tail fan. Foot placement and
bounded step/lift retain the existing gait inputs. Tail roots blend continuously;
five and nine distinct chains now produce a more readable delayed sway.

Fox uses a new actual TRELLIS.2 export, seed **749705**, **5,359,740 bytes**,
SHA-256 `8a72e76e4082c5ae8d54d83221a9f56be8a2d35980a24027c4ff7c0708553340`.
The new profile removes the oversized sculpted collar. Generated paper-thin fur
is reconstructed into a continuous outward surface, source colors are rebaked,
and shared smooth normals plus a matte finish remove hard lighting patches.
A restrained weld-aware surface polish is capped at 0.006 normalized units;
muzzle, soles and length extrema are protected. Zheng retains its actual HF
source and spotted coat, with a closed-surface repair and an offline tail-axis
shear matched by its fitted bones. This is a source adaptation, not a claim that
raw generation was production-ready. Outward winding was explicitly corrected
before acceptance of the remesh; intermediate inward/cupped renders were rejected.

All attempts remain under `.local/penglai_fox_zheng_repair_20261027/`.
Attempts 01/02 failed before the GPU generation call; attempt 03 exported but
was rejected for an extra head/poor fur. Attempt 04 was inspected from six sides
before conversion. Its receipt, after export at the recorded time, reports
**1087.216/2400 included seconds**, **0 overage**, reset **18:03:24 BJT**.
This is a dated receipt, not a current quota claim. No paid overage was enabled.
The nine-tail concept is original; no third-party reference artwork was uploaded.

Final visible costs: Fox **15,972 triangles / 13,222 vertices**, down from
18,000 triangles; Zheng **15,982 triangles / 12,447 vertices**, compared with
15,927 triangles / 20,784 vertices. Each still uses one visible draw and one
color texture with an independent skeleton. The colors total 466,970 bytes.
Two geometry-keyed interior seals were refreshed (the final microscopic atlas
sliver restoration retains the same Zheng seal under its new geometry key); every prior seal record is
preserved. No population, dimensions, combat damage, timing or reward was changed.

Current repair checks:

- 64 actual visible-skin poses per animal cover walking, windup, leap and
  recovery. Maximum sampled edge stretches are **1.906x Fox / 2.298x Zheng**;
  regression tests reject stretches above 2.5x. This complements visual review,
  rather than proving artistic quality from a number.
- **24 focused tests**, **1949/1949 full tests** pass. Shared geometry, separate
  skeletons, UV seams, weighted tail surfaces, pause stability, contact anchors,
  terrain navigation and interior behavior are covered.
- Lushu/Gudiao are exactly unchanged across **120 poses each**; 30 other
  creatures/players/lords match the preceding factory over four poses each.
- Native Chrome close-up motion and underside/rear views were inspected. A single
  atlas-rejected Zheng sliver (area 1.137e-7 normalized units) was restored with
  outward boundary winding; the final packed skins have no open boundary edges.
  Quantization/coincident-face non-manifold edges remain in the generated topology;
  this is not a claim of CAD-manifold geometry.
  Ordinary Penglai NPC movement and pause were recorded with a staged observer
  camera and invulnerable 3m player; entities were not pinned or manually moved.
  Fox observer takes were obscured by trees, including the raised-camera take;
  those clips are retained as test evidence and omitted from the delivery video.
  The delivered 20-second video shows both animals in close-up motion, including
  underside/rear angles. These are desktop observations, not physical-phone tests.
- The same restricted preview now serves `index-C_L4zKY3.js`. All **740**
  dist/runtime artifacts match locally; the **11 changed artifacts** were freshly
  fetched and hashed through localhost and the public tunnel. The other 729
  retain dated prior public evidence, not a new full-public claim. Source/debug
  paths remain rejected; the four existing service identities are unchanged.
- Four production native flows (two animals, English/Chinese, 1440px and 390px
  desktop touch emulation) pass Guide, ordinary start, ability, pause, Home and
  same-address refresh, with loaded colors and no production debug hook.

Evidence: `strain.json`, `focused.log`, `tests_final.log`, `same_batch_regression.json`,
`sibling_regression.json`, `surface_topology.json`, `final/`, `motion/`, `world/`,
`world_zheng_review/`, `public/report.json`, `artifacts.json` and `delivery/` in
that repair directory. Raw attempts, rejected intermediate views and the previous
batch are retained. No commit, push, main deployment or personal Skill change.

## Reusable lessons and user follow-up — 2026-10-27

After the repair delivery, the user says it looks much better and asks for lessons
that apply across ABYSSAL maps and, separately, across personal projects. The
following request authorizes recording that analysis. Earlier rejected versions
remain historical evidence; this feedback does not authorize a commit or release.

The existing Creature Polish Skill already required actual-surface review. This
round makes that requirement actionable through its conditional
[surface/motion reference](../.agents/skills/abyssal-creature-polish/references/surface_motion_validation.md):
anatomical ownership before distance blending, checks after changed conversion
stages and on the final packed surface, separate world/body/appendage motion,
world-scaled effect visibility, and defect-focused recording. These are shared
methods selected by the affected implementation, not Penglai-only branches.

The Fox/Zheng skin failure, Tiger tail/flight repair, Azure travel correction
and obscured Sage sword provide the concrete cases above. Their coefficients,
face counts, thresholds and provider receipts remain case evidence. No permanent
rule requires another animal to use the same binder, remeshing, flight limits or
regeneration choice. Older loading, ownership and ordinary-entry guidance remains
in the existing references rather than being duplicated here.

This capture changes documentation and a repository Skill only. Existing runtime,
assets, tests and build inputs are preserved; no new runtime, phone or performance
validation is claimed. Documentation checks and source-preservation evidence are
kept under `.local/creature_lessons_20261027/`. Cross-project knowledge is maintained
separately, without making this public repository depend on private knowledge or
personal Skills. The next production batch has not started.

## Lushu repair and mythic giants — 2026-10-27

The user reports that Lushu also has a problem and requests its repair alongside
the next batch. This round repairs Lushu and replaces the procedural Bashe, Kui
and Kun with actual Microsoft TRELLIS.2 exports. It does not redraw Gudiao,
Fox, Zheng, previously accepted creatures, transformed Peng or Gate Dragon, or
the rare Gilded Cloud Carp. All nineteen ordinary regional kinds now have HF
candidates; this is not a claim that every candidate or the whole map is accepted.

### Anatomy, generation and repair

- **Lushu:** the existing HF source and white head / striped coat / red tail
  remain. The old nearest-leg ownership transferred belly and thigh skin abruptly
  between legs, stretching some edges by about eight times during a stride.
  Anatomical upper-leg falloff and smooth leg ownership replace that discontinuity;
  the neck mask no longer reaches the lower legs. Offline closed-surface repair
  and localized tail-tuft regularization remove fragmented thin ribbons. Source
  colors are reprojected; roughness rises from 0.65 to 0.82. The final surface has
  13,993 triangles versus the immediately preceding 13,582, one mesh/material
  and 21 private bones. Mouth, support, length and gameplay anchors remain.
- **Bashe:** a broad-headed, dark scaled serpent with a long tapering body.
  Twenty measured axial joints produce a travelling continuous wave; longitudinal
  skin ownership avoids nearest-chain flips around the generated curved body.
  It uses the existing flying ecology and phase clock, without adding path weave,
  changing speed or forcing new rolls.
- **Kui:** a hornless bovine with one central weight-bearing leg and a short
  articulated tail. The first HF export incorrectly produced two legs and was
  rejected. A new three-quarter concept produced the installed single-leg export.
  Its initially broad, low hindbody could not spawn legally on two existing
  mountains. Offline transverse fitting and smooth body lift retain a complete
  visible torso, muzzle and sole while fitting the existing terrain. Four actual
  homes now pass ordinary terrain/collider placement without moving homes, changing
  population or relaxing ground rules. Its broader continuous body uses 152
  rigid-body probe corners (bounded at 160 in the regression), instead of dropping
  belly probes to satisfy the old procedural model's 100-probe test budget.
  The existing resolved ground gait and windup/leap state drive the independent
  single-leg compression, neck response and small body hop.
- **Kun:** a monumental cloud-whale interpretation with paired broad fins,
  a ridged back and horizontal tail flukes. Fitted paddles and a continuous tail
  chain move in coordinated vertical waves. Its original Kun-to-Peng transformation
  rules and the current Peng appearance are unchanged.

The Bashe and Kui passages in the Shan Hai Jing and the Kun passage in Zhuangzi
are recorded in [the source ledger](penglai_sources.md). They support identity,
not a canonical modern model or measured flight biomechanics. Concepts are
original generated interpretations; no third-party artwork or film model is
bundled or uploaded. Actual HF exports, rejected attempts, receipts and original
concepts remain in `.local/penglai_giants_lushu_20261027/`. The final export quota
receipt recorded 944.726990 included GPU seconds remaining and zero overage;
this is a dated receipt, not a live balance or a guarantee of future availability.

Conversion/fitting entry points are `prepare_penglai_giant_hf_asset.mjs`,
`fit_penglai_giant_hf_asset.mjs`, the existing beast repair/reduction scripts and
`prepare_penglai_giant_interior.py`. Shared geometry/color caches use the existing
retry queue; every instance has its own skeleton. Three geometry-keyed internal
seals retain the existing camera-inside-body path. Bashe/Kui use conservative
closed trunk cores and Kun an inset voxel core; these do not hide or replace
visible skin. Earlier seal records are retained.

### Measured cost and verification

| Kind  | Previous meshes / triangles | Candidate meshes / triangles | Bones | Color bytes |
| ----- | --------------------------- | ---------------------------- | ----- | ----------- |
| Lushu | 1 / 13,582                  | 1 / 13,993                   | 21    | 259,166     |
| Bashe | 64 / 174,324                | 1 / 15,986                   | 21    | 274,458     |
| Kui   | 15 / 29,936                 | 1 / 14,970                   | 10    | 273,106     |
| Kun   | 12 / 26,732                 | 1 / 15,990                   | 14    | 249,778     |

Matched populated Penglai views compare old/candidate/repeated-old at identical
positions with the scene paused. Calls/triangles were: Lushu view **93 / 250,774 →
93 / 251,185**, Bashe **198 / 551,984 → 135 / 393,646**, Kui **119 / 309,716 →
105 / 294,750**, Kun **256 / 675,852 → 182 / 507,183**. Repeated old counts match.
These are complete views containing other ecology, not isolated-asset draw costs
or measured physical-phone frame/heat improvements.

Current native evidence covers twelve Guide visits, nine region transitions,
ordinary world entry before opening Guide, shared geometry/color identities,
independent skeletons and all ninety audited world skeletons disposing after
leaving Penglai. Four forced texture failures recover on retry without replacing
geometry. Four six-second ordinary NPC travel clips preserve the normal ecology
clock, plus pause stability; recorded path lengths are 30.40, 52.58, 52.15 and
73.44 m for Lushu/Bashe/Kui/Kun. Paths can curve and include existing ground
leaps; they are not straight-line speed measurements. The observer camera and
invulnerable 3 m player are inspection fixtures; no NPC is pinned. Separate
close-up clips show ordinary/fast effort transitions. Final encoded frames are
inspected, including belly, rear, neutral clay and unlit views.

The focused tests check actual deformed skin, limb/tail continuity, UV seams,
finite unit normals, contact anchors, culling, private state and all 38 real
mountain residents. The existing serpent regression now samples the continuous
Bashe skin rather than searching for removed procedural segments. Thirty sampled creatures/players/lords, including the prior
Fox/Zheng/Gudiao, remain exact across 120 sibling poses. Source preservation also checks all pre-existing
inputs against the start-of-turn fingerprints.

Final verification: **1958/1958 full tests** pass, as do formatting and the Vite
production build. The changed anatomy/terrain suite passes 29 focused tests;
the migrated serpent checks pass separately. Eight native production flows
(four kinds × English 1440px / Chinese 390px desktop touch emulation) pass Guide,
ordinary start, ability, pause, Home and same-address reload with all four colors
loaded and no production debug hook or resource failure.

The existing restricted origin serves **index-C7974dg2.js**. All **749** current
build/runtime artifacts match locally (209,507,766 bytes including compression
siblings). All **17 changed artifacts** were freshly fetched and hashed through
localhost and the public tunnel. The other 732 retain prior dated public evidence,
not a new full-public claim. Eleven source/debug/directory paths are denied on
both origins. Existing DEV 35213, restricted preview 23118, awake 23120 and tunnel
35419 retain their identities and logs; the previous runtime is archived.

Evidence: `baseline.json`, `source_preservation.json`, `targeted.log`,
`full_tests_final.log`, `sibling_regression.json`, `before/`, `current/`,
`native/report.json`, `motion/report.json`, `world/report.json`, `retry.json`,
`cost/report.json`, `asset_cost.json`, `public/report.json`, `artifacts.json`,
`final_fingerprints.json` and `delivery/` in the ignored batch directory.
All 1,807 pre-existing inputs are accounted for: 17 scoped changes and 1,790
unchanged files, including ecology/combat rules and the prior other models.

This remains a review candidate, without staging, commit, push or main release.
Physical-phone performance and natural full-round pacing are not claimed.

## Final creature forms and Taotie — 2026-10-27

The user accepts the Lushu/Bashe/Kui/Kun batch and requests the next group,
explicitly adding Taotie. Dragon-Gate Cloud Dragon, Peng and Gilded Cloud Carp
receive actual HF exports. Taotie is a new ordinary mythic ground hunter, not
an additional lord or completion requirement. All four appearances remain
candidates for individual review. No staging, commit, push or formal release.

The Taotie design is an original horned, broad-jawed quadruped with dark jade
hide and mask-like bony ridges. The Shenzhen Museum's
[Ran Fangyi entry](https://www.shenzhenmuseum.com/webCollection/collectionDetail?exId=ce6f48356bce4520b21428b28e2eebb7&resId=6bc3bacaffd9453aae764d557d459c25)
qualifies the later association of bronze animal-face ornament with Taotie.
This is visual/story inspiration, not a claim that an excavated ornament is a
unique authoritative full-animal reconstruction. The other three retain their
existing descriptions and transformation/rare rules. Original concept images
were generated for this batch; no external copyrighted illustration was used
as an image input.

Four successful Microsoft TRELLIS.2-4B jobs use seeds 749901–749904. Raw GLBs,
receipts, original concepts and rejected six-legged dragon concept are retained
under `.local/penglai_final_taotie_20261027/`. The corrected dragon source has four
legs. Mesh reduction is followed by a new padded atlas baked from the original
HF surface; actual source geometry, normals and color are inspected before
runtime binding. The model card is [MIT licensed](https://huggingface.co/microsoft/TRELLIS.2-4B).
The final quota read at 12:54 BJT is **771.012477 / 2400 seconds**, over-quota use
zero, reset returned as 18:03:24 BJT on October 27. This is a dated receipt,
not a future balance guarantee.

| Model                    | Triangles | Runtime bones | Mesh JSON / color bytes | Isolated draw calls before → after |
| ------------------------ | --------: | ------------: | ----------------------: | ---------------------------------: |
| Dragon-Gate Cloud Dragon |    17,958 |            33 |       724,377 / 332,658 |                             43 → 1 |
| Peng                     |    17,890 |            10 |       833,951 / 371,878 |                             16 → 1 |
| Gilded Cloud Carp        |    12,959 |            12 |       446,546 / 254,578 |                             11 → 1 |
| Taotie                   |    17,992 |            20 |       647,308 / 266,012 |                             new: 1 |

The dragon has a travelling trunk wave with fore/hind legs supported by the
corresponding axial section. Peng has independent shoulder, elbow and wing-tip
motion, with a light tail trim. The rare carp has a continuous tail and delayed
pectoral motion. Taotie keeps a supported belly and separately owned four legs,
neck, lower jaw and tail; stride follows actual ground travel. An early binding
edge between jaw and forefoot was found by the skin-edge audit and removed by
continuous anatomical weight composition, rather than covering it with another
mesh. Private skeletons and shared geometry/material ownership remain explicit.
Closed inset cores are regenerated for the four geometry keys, preserving the
existing stable-camera interior fill without changing visible skins.

Taotie contributes **two 32 m residents**, raising ordinary Penglai stock from
400 to 402 and kinds from 19 to 20. The 2 transformation forms, rare blessing,
5-lord objective and all pre-existing creature statistics remain unchanged.
Its bilingual Guide, lore and background describe a warned mountain pounce;
the existing ground attack and damage rules apply, including retaliation at
30 m. A source-scoped 42 m home radius and two western shoulder/foothill anchors
(-350,-700) and (-160,-500) keep it out of the starting pools. The first northern
cliff proposal passed spawn checks but lacked turning room in a live chase; it
was rejected after actual playback and replaced without relaxing terrain
collision or changing the mountain. All forty ground residents retain complete
rigid-body clearance against the rendered terrain. Taotie's broad torso uses
172 existing probe cells (budget 180 for only two residents), retaining all
rigid belly samples rather than discarding them for an older budget.

Fresh verification includes 1,968 passing full tests, followed by 28 anatomy,
Taotie ecology and real-terrain checks after the final home adjustment. A prior
full run found six stale roster/procedural expectations; these were migrated to
the authorized new count, art revision and actual skinned dragon surface. The
independent sibling audit confirms 31 existing kinds across 124 poses are exact.
Twelve native Guide visits and nine region transitions confirm shared cache
identity and 27/27 audited private world skeletons released. Four forced color
failures recover without replacing geometry. Native world clips exercise the
real Dragon Gate and Kun transformations, rare marker and existing flight,
actual NPC travel/turning and stable pause. Observer cameras and staged players
are inspection fixtures, not changes to NPC movement. The isolated Taotie combat
fixture disables other enemies to attribute its warning, leap and damage to the
new hunter. No physical-phone performance or natural full-round balance claim.

The cost comparison uses identical isolated camera/material scenes with a
repeat-before control, not whole-game FPS. The three replacements reduce drawn
triangles and calls; Taotie adds two ordinary actors. No new frame loop, light,
render target or shader variant is introduced by these four models. Evidence
also includes eight-angle clay/unlit/color views, full motion cycles, surface
edge/UV seam checks, independent instances, culling and decoded final video.

Evidence root: `.local/penglai_final_taotie_20261027/`: `baseline.json`,
`asset_cost.json`, `cost.json`, `targeted_final.log`, `full_tests_final.log`,
`sibling_regression.json`, `native/report.json`, `retry.json`, `current/`,
`motion/`, `world/`, `attack_isolated/`, `quota_after.json`, `public/report.json`,
`artifacts.json`, `source_preservation.json`, `final_fingerprints.json`, `delivery/`.
Earlier Penglai appearances and pending repository Skill changes remain intact;
no personal Skill or Documents working files are changed.

Final preview delivery: **index-CVYet7Bg.js**, eight native production flows
(four kinds × English 1440 px / Chinese 390 px desktop touch emulation) passed
Guide, normal game entry, ability, pause/Home and same-address reload. All four
colors loaded, with no resource errors or production debug hook. The existing
restricted origin is updated; formal main/Pages remains v0.11.20.
All **761** local build/runtime artifacts match (214,905,361 bytes including
compression siblings). The **31 changed artifacts** were freshly fetched and
hashed through both local and public origins; unchanged files retain dated
prior public evidence. Eleven source/debug/directory paths are denied on each
origin. All four existing processes retain identity and logs; earlier runtime
bundles are archived. Formatting and the production build pass.

The final isolated Taotie encounter shows an actual warned leap reducing a
30 m player's health from 100 to 52, with the normal 2.2-second bite cooldown.
The final foothill travel sample has 16.83 m X and 11.91 m Z range, with only
1.92 m vertical range; the rejected northern-cliff trial had a 28.73 m vertical
range. This is a controlled short trace, not a general guarantee for every
possible chase. No combat parameters or ground solver were changed.

The preserved-input audit accounts for all 1,819 starting files: **1,802 exact**,
17 scoped updates, no missing input. Fourteen new asset/runtime/conversion/test
files are added. The prior repository Skill edits, all accepted player models
and other map work remain untouched. The coverage inventory now contains
20 ordinary mythic kinds, 5 lords, 2 transformed forms and 1 rare, all with their
HF appearance revision. Environmental buildings and terrain remain a separate
future batch. Review media are original game renders, including the final
encoded 4-model motion/world sequence and staged Taotie attack; user acceptance
of this new batch is still pending.

## Dragon head and Taotie stride repair — 2026-10-27

The user reports that the moving dragon's head and Taotie's legs appear fixed.
This reopens those two motion findings; the prior passing checks are not visual
acceptance. The affected dragon is the last batch's Dragon-Gate Cloud Dragon.
The current revision awaits review and is not committed or pushed.

The dragon's old first axial joint had a tiny rotation envelope and a fixed
position. Its sampled visible muzzle moved only 0.00073 normalized length
laterally. The revised bounded travelling centerline includes the head and
neck, with orientation following its tangent. The raised face has continuous
anatomical ownership; the reported mouth anchor follows that face. Muzzle
lateral/vertical ranges are now 0.0772/0.0304 normalized length, with no change
to the gameplay root, flight path, transformation timing or speed.

Taotie's HF source has asymmetric fore/hind leg positions. The previous
approximately symmetric rig left the actual left front paw almost on the
rigid trunk and the left hind paw influenced by the rear/tail support. Rotating
those bones was therefore insufficient. All four chains are fitted to their
actual source limbs and the distal paws own their leg weights. A two-joint
planar solve gives each paw a planted backward stroke followed by a lifted
recovery, with four staggered footfalls. Cadence still derives from resolved
horizontal ground travel; blocked travel holds the last stance. The imported
geometry, normals, UVs, color and all other packed fields are exact against the
prior served model; only the fitted leg points change in its JSON. Offline
fitting tooling records the same points.

A matched actual-vertex audit finds forward/backward paw ranges of about
0.150 normalized length and recovery lift about 0.050 on each leg. Previously
the same left-front sample moved only 0.00032 longitudinally and the left-rear
sample 0.0144, with no vertical lift on the latter. These are asset-relative
measurements of this expressive fantasy gait, not a zoological standard.
The shared-file Peng and Gilded Cloud Carp surfaces remain exact across 240
matched poses each. No new render pass, mesh, texture, skeleton joint or light
is added; this is not a measured physical-phone performance claim.

Fresh targeted validation passes 31 tests covering actual skin movement,
complete cycle edges and UV seams, mouth agreement, bounds, independent
instances, stopped/pause behavior, interior fill and all 40 ground residents'
terrain clearance. Native Chrome covers twelve Guide openings and nine region
transitions, with shared assets and 27/27 audited private world skeletons
released. Ordinary transformation and NPC movement are recorded without
per-frame entity pinning. The isolated 30 m player test preserves windup/leap/
walk and health 100 to 52. These fixtures use observer cameras and staged
players; they are not a natural full-round balance or physical-phone test.
The distant-player walking recording initially retained player-distance culling
and hid Taotie; that failed visual evidence is retained and replaced with an
explicit observer-visible recording, without changing NPC motion or ecology.

Evidence: `.local/penglai_head_stride_20261027/`, including the baseline,
before builder/assets, actual-surface comparison, before/current angle views,
matched motion clips, world/walking/attack captures, native lifecycle report,
source preservation and final encoded delivery. All earlier candidates and
pending repository Skill edits remain intact. No personal Skill is modified
and no new HF generation or quota use is needed for this repair.

The reviewed production entry is **index-2lHdvNAU.js**. Four native public
flows (two affected kinds × English desktop / Chinese 390 px desktop touch
emulation) pass Guide, ordinary start, ability, pause/Home and same-address
reload. All 761 local build/runtime files match; five changed artifacts were
freshly fetched and hashed on both origins. The other 756 retain dated prior
public evidence. Eleven source/debug paths remain denied on both origins and
all four service identities are preserved. Build and scoped formatting pass.
The observer-visible walk records 43.93 m of actual travel; the initial culled
capture is explicitly excluded from delivered motion evidence.

## Taotie walking-footage correction — 2026-10-27

The user accepts the isolated motion but reports that Taotie still slides with
four fixed feet in the delivered ground-travel video and only moves them while
jumping. This observation is correct. The previous section's observer-visible
walking claim is withdrawn: that capture proves root displacement, not walking
animation. Its files remain preserved as rejected evidence.

The previous `walking.mjs` staged the player 200 m away in both horizontal
axes. Ordinary runtime culls both visibility and animation beyond the species'
190 m High / 150 m Smooth range. The observer render callback then forced the
mesh visible after the update, without making its animation eligible. The
saved clip therefore showed a moving, unanimated distant model. Attack footage
used a nearby player and did not have this recording error. Increasing rig
amplitude or disabling gameplay distance culling would not address its cause.

Fresh native Chrome instrumentation wraps the ordinary animator solely to
record its inputs and actual skinned paw positions; it does not invoke extra
animation calls. A far control at 260–282 m records zero animator calls and
an invisible target. At 90–122 m, 390 ordinary calls accompany 86.14 m of ground
travel, all in `walk`, with all four paws moving about 0.150 normalized length
fore/aft and 0.050 vertically. Pause freezes the animation. Both resident
Taotie instances are then inspected in High and Smooth: all sampled target
frames remain naturally visible, gait advances and no leap occurs.

The corrected delivery contains left/right side views of the plateau resident
at 103–131 m from the staged player. Each source clip covers about 49.5 m of
ordinary travel in 6.4 seconds; the complete source frames remain `walk` and
the normal caller runs 384 times per clip. Other creatures are disabled only
in this clearly labelled inspection recording so their bodies do not obscure
the feet. Earlier populated-scene recordings are retained separately and
corroborate the same animation. The target's position, visibility, phase,
gait and animation are never forced. The player is invulnerable and staged
above leap reach; an observer camera follows the target. This checks ordinary
walking integration, not a natural progression or physical-phone performance
run. Final encoded quarter-second samples were inspected as well as the
actual-surface traces; integer-second samples can alias this gait's cadence.

No game source, model, texture, gameplay rule, pending Skill edit or production
artifact changes in this follow-up. No new build or repeated full test suite
is warranted. Existing preview entry `index-2lHdvNAU.js` remains byte-identical
on local and public origins; current service identities are retained. The
previous attack, rig, regression and broader lifecycle results remain dated
prior results, not new tests. The corrected footage awaits user review. No
commit, push, HF request or personal Skill modification occurs.

Evidence: `.local/taotie_world_gait_20261027/`: `audit.json` and raw far/near
samples, populated foothill/plateau recordings, `clear/record.json` and
per-frame actual paw samples, `delivery/taotie_ground_walk.mp4`, encoded-review
frames, preview entry check, preservation hashes and delivery receipt.

## Guardian landmark carvings — 2026-10-27

The user confirms the corrected Taotie walking and authorizes the next batch.
The creature roster is covered; this batch starts scenery with three guardian
landmarks. It does not expand the creature batch or modify approved rigs.

- **Azure Cloud Gate:** two shared HF coiling-dragon carvings replace the
  procedural dragon columns. Scales, cloud relief and capitals are actual
  surfaces. Both carvings retain the same 72 m height; the existing uneven
  terrain is bridged by different support heights, avoiding a stretched dragon.
  Existing roofs, lintel, sites, ground-sampled foundations and passage remain.
- **White Tiger Watchtowers:** two shared HF tiger-face Que towers replace the
  previous boxes and mask. Layered tiled eaves, stone relief and tiered feet
  retain the paired 70 m center spacing and original 66 m height. The visible
  roof envelope is fitted to 28 × 26 m. This is original fantasy architecture,
  not a reconstruction of a particular historic monument.
- **Vermilion Sun Altar:** an HF bronze bird has layered, substantial wing
  feathers, crest, tail and a carved drum. The original ground-fitted altar,
  steps and sun-ring concept remain. The ring moves behind the sculptural
  depth instead of intersecting the old thin body plane.

Three original concept images feed Microsoft TRELLIS.2-4B; raw GLBs and
receipts are retained. Seeds are 750101/750102/750103 at 1024 resolution, with
100k-face exports and 1024 color textures. All three succeed. Included quota
falls from 771.012477 to 643.891138 seconds; overquota remains zero. These are
dated task readings, not a promise of future live balance. No extra payment
or substitute provider is used.

The conversion welds/simplifies while retaining normal and boundary constraints,
rebakes source colors to a new padded atlas, and packs actual texture-derived
linear vertex colors as the opaque loading/failure fallback. No white planes,
transparent placeholders or shader-light tricks conceal missing surfaces.
Offline triangle clipping produces height-band contact boxes; the bird also
splits horizontally so one huge box cannot block empty sky beside its wings.
Each region owns its resources; paired instances share only inside that region.
Normal construction starts bounded texture preparation; disposal cancels work,
closes bitmaps and releases textures/geometry/material exactly once.

Fresh verification:

- Five focused checks pass: rendered-ground support, 30 m gate clearance,
  guardian-home exclusion, finite actual surfaces, contact coverage of every
  final vertex, same-region sharing, separate-region ownership and bilingual
  names. The full **1972/1972** test run passes.
- Native desktop Chrome normally enters Penglai and automatically loads all
  three color images. A staged 30 m player crosses both gates in both
  directions using ordinary movement, with no per-frame position correction.
  Pause freezes movement. Three Penglai/Hawaii cycles release all nine unique
  new geometry/material/texture resources exactly once per cycle.
- A separate Chinese 390 px desktop-touch context blocks all three color
  requests. All five instances retain opaque varied source colors, then recover
  their textures after requests are allowed and explicitly retried. This is
  desktop emulation, not physical-phone testing.
- Matched before/after screenshots replace only the landmark factory in one
  scene. The 22.5-second video uses the actual game lighting, terrain and
  postprocessing with an observer camera and staged invulnerable player;
  other creatures are hidden only for this sculpture inspection. Actual
  encoded frames are inspected. A first immediate post-teleport screenshot
  retained the previous underwater visual state; it is excluded and the final
  comparison waits for the normal scene update before capture.

A controlled geometry inventory rises from 57,140 to 69,640 rendered triangles
and 14 to 15 meshes. Shared geometry/index/attribute bytes fall from 7,542,480
to 3,421,717 through indexed packed data and paired sharing; contacts rise from
265 to 365. Three 1024 color images add texture cost. These are structural
measurements, not a claim of improved frame rate, phone heat or battery life.
The existing <80k landmark triangle budget remains satisfied.

Evidence: `.local/penglai_landmarks_hf_20261027/`, including original concepts,
private receipts, raw GLBs, conversion logs, exact source baseline, raw model
views, before/after scene captures, `review/report.json`, `lifecycle.json`,
`cost.json`, tests and final encoded delivery. The first 5-second route fixture
crossed the gate but did not reach its requested far endpoint; its result is
retained, and the final run permits sufficient normal travel time. No gameplay
speed, camera rule, ecology, accepted creature asset, personal Skill, branch or
release changes are part of this batch. Pending repository Skill edits remain
preserved. These three landmark candidates await the user's visual review.

The reviewed preview entry is **index-BxwJGXo2.js**. All 770 local build/runtime
files match; the 54 new/changed artifacts are freshly fetched and hashed on
both origins. The other 716 retain dated prior public verification. Eleven
source/debug paths are denied on both origins and the four service identities
are unchanged. English 1440 px and Chinese 390 px native production flows pass
normal region selection, all three automatic texture downloads, launch,
pause/Home and same-address reload, with no production debug hook. In the final
run all three optional images finish 6.55 / 5.29 seconds after the region-ready
check. The first short fixed-delay probe exited before two downloads finished;
its report is retained, and the final check waits for actual HTTP completion.
The bounded game entry and source-color fallback remain unchanged. Build,
scoped formatting and `git diff --check` pass. Of 1,833 baseline inputs, 1,827
remain byte-identical; the six changed existing files are the landmark factory
and five project documents. Nine new asset/script/test files are added. All
pre-existing creature sources, pending Skill edits and HEAD remain unchanged.

## Summit temple and Bixi carvings — 2026-10-27

The user says “可以，继续吧”, accepting the preceding three guardian landmarks
and authorizing this next batch. Earlier awaiting-review labels remain dated
history. This batch concerns the main temple roof, Bixi turtle bearer and
stele crown, not the already accepted creatures or three guardian landmarks.
No commit, push, personal Skill modification or delegated work was performed.

### Actual assets and structural integration

Three original concepts become actual Microsoft TRELLIS.2 GLBs, not merely
reference images. The runtime uses fitted, simplified meshes with rebaked
1024-square color maps and source-derived opaque vertex-color fallback.

| Part               |   Seed | Raw GLB bytes | Runtime triangles | Instances |
| ------------------ | -----: | ------------: | ----------------: | --------: |
| Temple tiled roof  | 751101 |     4,921,216 |            15,791 |         2 |
| Bixi turtle bearer | 751102 |     3,509,216 |            15,974 |         1 |
| Bixi carved crown  | 751103 |     4,221,864 |             9,949 |         1 |

Raw receipts and final source hashes are in
`.local/penglai_temple_hf_20261027/`. Included quota was 643.891138 seconds before
production and 510.536578 after export, with zero overquota use; the dated API
reset was October 27 at 18:03:24.767 BJT. These are historical measurements,
not a promise of current account balance.

`penglai_temple_asset.js` owns resources per region and shares the roof geometry,
material and preparation across its two tiers. Both Bixi carvings face the
original monastery-facing direction. Existing pedestal, site, stairs, stele
frame and bilingual recessed opaque inscription remain. No extra map region,
new gameplay, altered guardian home or changed creature animation is introduced.

The main temple retains its original closed hall and exterior approach rather
than claiming a new enterable interior. Generated roof extents fit the old
102×106 m / 61.6×59.8 m plan envelopes. Actual X/Z-clipped surface cells supply
roof contacts. Review found protruding old flat soffits and a mismatch between
new eave underside and old capitals; the soffits were recessed, roof levels
fitted, and fourteen small timber supports sampled against the final underside.
Initial misfits remain in `after/` and `fitted/`; `review/` is the corrected
candidate. No arbitrary giant blocking box or duplicated coplanar roof remains.

### Fresh verification

- Seven focused checks cover finite surfaces, source-derived contacts, localized
  roof cells, source provenance, opaque fallback, shared resources, actual
  roof-support intersections, Bixi terrain/orientation, unchanged radar/home,
  language reuse and the single visible inscription plane.
- Final full suite: 1,975/1,975 passed. Formatting and production build are
  recorded alongside the preview verification.
- Native desktop Chrome: four normal-propulsion, 30 m routes across temple-front
  and stele-front approaches in both directions, without per-frame correction;
  pause freezes position. Three Penglai/Hawaii cycles dispose each of nine
  unique new geometry/material/texture resources exactly once per cycle.
- A separate 390 px desktop-touch context aborts all three image requests:
  all four instances retain varied opaque colors, and retry restores maps.
  This is not physical-phone performance evidence.
- Matched old/new observer views and three moving game-scene shots use original
  lighting/postprocessing. The staged player is invulnerable; other creatures
  are hidden for architecture inspection. No claim of natural progression.
  The final 22.5 s H.264 clip was decoded and sampled for visual review.

Static whole-region inventory changes from 708 to 702 mesh objects; summed
instance triangles 7,643,166 → 7,648,483, unique geometry bytes 15,436,981 →
11,781,917, materials 44 → 45, collision cells 2,772 → 3,039. These are structural
counts, not visible per-frame draws or FPS measurements. Three new 1024 textures
add decode/GPU cost; they are released with the map. No phone heat claim.

Current evidence: `review/report.json`, `lifecycle.json`, `cost.json`,
`targeted_final.log`, `tests_final.log`, `delivery/`, and final preview/public
records under `.local/penglai_temple_hf_20261027/`. New architecture awaits the
user's visual review. The formal main release remains v0.11.20.

### Verified preview and preservation

The restricted same-origin preview now serves `index-Cz1N6lE_.js`. All 779
local build/runtime files (222,769,456 bytes including compressed siblings)
match. The 14 new/changed files were fetched and hashed from both local and
public origins; 765 unchanged files retain the prior dated public verification,
not a fresh full-public-download claim. Eleven source/debug paths are rejected
on both origins. Original dev/tunnel/preview/awake process identities remain.

Native production flows pass in English 1440 px and Chinese 390 px: normal
Penglai selection automatically obtains all three maps, Start/Pause/Home works,
and same-address reload uses the new entry without production debug hooks.
New temple and Bixi close views also passed a separate 390×844 desktop-touch
inspection. Environment freshly checked: Apple M6, 32 GiB, Chrome 156.0.8078.48,
Node 24.21.0. Physical-device feel/performance is unmeasured.

The prior 1,842-input fingerprint has 1,834 exact preserved inputs; eight scoped
files change and nine are added. All accepted creature, guardian landmark,
source model and pending Skill inputs are byte-identical to the prior batch.
These checks are recorded in `source_preservation.json`, `artifacts.json`,
`public/report.json`, `environment.json` and `final_fingerprints.json`.

## Temple wall detail and brush inscriptions — 2026-10-27

The user requests brush/cursive lettering and reports that the temple walls
remain too simple after the roof/Bixi delivery. This follow-up retains those
three source models and the site/layout, and refines the enclosing architecture.
It awaits visual review; no commit, push or personal Skill change is authorized
by this refinement request.

### Implementation and provenance

- A new actual Microsoft TRELLIS.2 carved timber lattice panel replaces the
  straight metallic bars and flat upper ornaments. It is placed as 38 shared
  instances across side windows, the upper chamber and closed front doors.
  The woodwork is an original concept with geometric lattice, cloud/lotus relief
  and worn timber, not a scan or reproduction of a specific temple.
- Raw export: seed 752101, 4,439,104 bytes, SHA-256
  `ea3e5edc755fa07c0080a5123270600fb6147528316378e1f38b72315cb19bd4`.
  Normal/edge-constrained simplification retains 5,348 triangles and 8,371
  atlas vertices; stopping above the 4,800 target preserves aperture edges.
  A 5,500-triangle budget is checked. The rebaked map is 1024 square, with
  source-derived opaque vertex colors during loading and a scoped wood exposure
  adjustment. The 38 instances share one geometry/material/map and one draw.
- Recessed window backing, staggered grey-brick courses, stone water tables,
  timber framing, bracket layers, door rings and stepped column bases give
  the wall shell depth. Construction uses the existing static batching and
  resource owners. Disconnected old side-cap blocks are removed.
- `penglai_calligraphy.js` renders the stele and temple plaque with a locally
  bundled Zhi Mang Xing handwriting subset. Only eleven unique Chinese glyphs
  are included. The 8,124-byte WOFF2 embeds the full SIL OFL 1.1; the upstream
  copyright and license also remain in `src/assets/fonts/`. English inscriptions
  use readable serif text. General HUD typography is unchanged.
- Font loading does not block regional entry. A fallback remains readable;
  existing scene updates repaint only when language or font readiness changes.
  The shared font promise holds no scene textures or disposed callbacks. The
  small loaded font stays document-scoped; scene canvas textures are released.

Fresh included HF quota was 510.536578 seconds; after export 469.077216 remain,
with zero overquota use. The dated reset is October 27 at 18:03:25.370 BJT.
These are batch receipts, not a current balance promise. No paid quota used.

### Evidence and scope

Evidence root: `.local/penglai_temple_detail_20261027/`. It preserves the prior
source fingerprints, matching camera snapshots, raw GLB, conversion receipt,
retry/lifecycle report and final encoded game video. The main hall remains
closed; this change does not promise a new enterable interior. Existing routes,
colliders, guardian homes, combat and accepted creature/landmark sources remain.

Seven focused tests pass. Native desktop Chrome checks include four normal
30 m traversal routes at temple/stele approaches, pause freeze, three complete
region cycles with each of 18 monitored geometry/material/texture resources
released once, all four HF texture kinds failing/recovering, and font failure
followed by recovery. Matched full-temple, facade-close and stele views use the
actual game lighting with a controlled observation camera and staged invulnerable
player; other creatures are hidden for architecture review. A 390 px touch
context checks fit and English labeling; this is not an actual phone test.

Static whole-region inventory: 702 → 718 mesh objects, summed instance triangles
7,648,483 → 7,891,547, unique geometry bytes 11,781,917 → 12,038,608,
materials 45 → 51, colliders unchanged at 3,039. These are whole-scene structural
counts, not visible-frame draw calls, GPU timings or phone performance. The
woodwork adds one 1024 texture; the plaque changes from a static image to a
scene-owned canvas. Existing service identities and preview restrictions remain.

### Final preview verification

The final source passes 1,975/1,975 tests, scoped formatting and `git diff --check`.
`layout_preservation.json` compares all 3,039 collider values, radar paths and
lord waypoints with the immediately preceding candidate, not just their counts.
The font's eleven glyphs and embedded complete OFL are checked separately.

The restricted preview serves `index-3Yr5EWK_.js`. All 782 build/runtime files
match (223,045,717 bytes including compressed siblings); all 49 changed artifacts
are freshly fetched and hashed from local/public origins. The 733 unchanged
files retain dated prior public evidence. Eleven source/debug paths are denied
on both origins, and all four service process identities are preserved.
Native production English 1440 px and Chinese 390 px flows verify four automatic
HF texture loads, actual `document.fonts` brush-font readiness, Start/Pause/Home,
same-address reload and absence of production debug hooks. An initial
network-observation assertion was inconclusive; separate font-load instrumentation
confirmed readiness, and the final normal flow checks both HTTP and font state.
No runtime workaround or external font service was introduced.

Final visual evidence is `review/` plus the decoded/sampled 22.5 s H.264 clip
`delivery/penglai_temple_walls_calligraphy.mp4`; the narrow desktop-touch views
are recorded separately. Existing creature, roof, Bixi source meshes, guardian
landmark and pending repository Skill inputs remain byte-identical to baseline.
Current candidate awaits user review; formal main/Pages and version remain
unchanged, with no commit or push.

## Temple courtyard refinement — 2026-10-27

The user accepts the brush inscriptions, while asking for a more complete
architectural finish on walls, columns and stairs, plus trees beside the hall.
The accepted font, roof and Bixi assets remain unchanged. This is an exterior
refinement of the existing summit footprint; the hall remains closed.

### Construction and source provenance

Three original concepts were processed through Microsoft TRELLIS.2. The new
vermilion column has carved cloud ornament, a stone lotus base and a fitted
capital; the grey-stone balustrade has continuous cloud relief and lotus finials.
Four gnarled pines flank the side and rear approaches, leaving the plaque and
central entrance visible. The existing wall lattice is retained with recessed
plaster weathering and masonry; separate dressed-stone courses, paving and
segmented stair caps replace smooth slab surfaces.

- Pillar: seed 753101, raw 3,573,844 bytes, SHA-256
  `172039caafd5f42ba4fa7938048c718f54fa7cb5884e163b3918a2189317278e`;
  runtime 5,998 triangles / 8,081 atlas vertices, 201,446-byte 1024 color map.
  A failed download was recovered from the same exported file without another
  GPU generation. Fourteen instances share one geometry/material/map.
- Balustrade: seed 753103, raw 3,890,608 bytes, SHA-256
  `2ae7ee505b1128c66c1617d488216b65b1f3417967363634caad168242a8a33d`;
  runtime 5,433 triangles / 7,842 atlas vertices, 290,874-byte 1024 color map.
  Twenty-two rail sections share one geometry/material/map.
- The initial actual HF pine has a good continuous trunk but sparse needles.
  Its original GLB, raw views and rejected sparse-crown scene capture remain
  in the evidence directory. Two subsequent dense-crown requests returned
  provider `RuntimeError` during generation, despite positive included quota.
  Those failures are recorded separately from the later insufficient balance.

The initial dated quota was 469.077216 seconds. At 17:40:50 BJT, 55.204982
seconds remained, below the provider's 120-second stage reservation. The user
explicitly permitted waiting; the next bounded attempt was scheduled after the
reported October 27 18:03:25 BJT reset, with a fresh balance check before each
GPU stage. No paid overage is authorized or used. These are dated receipts,
not a standing claim about the user's current balance.

### Placement and validation scope

All 3,039 prior collider values, existing radar paths and lord waypoints match
the preceding candidate exactly. Only fitted low woody trunk sections add
contact. An initial side-route test exposed broad lower-branch collision boxes
and an incorrectly selected root band. The corrected fit explicitly selects
the lowest geometric band and follows the actual continuous brown trunk,
excluding wide roots and green branches. Both 30 m side routes then complete
about 143 m of normal movement in twelve seconds without per-frame position
correction. Front-temple and Bixi routes remain checked separately.

The prior stair test assumed one visible box per step, so it was updated to
raycast actual final tread surfaces while retaining the original stair envelope,
ordering, terrain clearance and collision assertions. Relevant tests and the
full suite are recorded with their exact source stage; earlier successful tests
do not substitute for reviewing the final scene. No ecology, damage, movement
speed or guardian behavior is changed by this architectural task.

Evidence root: `.local/penglai_temple_courtyard_20261027/`, including original
concepts, all successful/failed provider receipts, before-source snapshots,
matched camera views, actual movement routes and production-delivery checks.
Native desktop Chrome and 390 px touch emulation are inspection tools, not
physical-phone performance or natural whole-round play evidence. The controlled
architecture clips use actual game lighting/postprocessing, a staged invulnerable
player and hidden creatures so the construction can be inspected.

### Final pine choice and fresh checks

The post-reset request succeeded: included quota freshly read 2,400 seconds,
then 2,342.506955 after generation/export, with zero overquota use. Attempt 04
used seed 753105 and 512 spatial resolution; raw GLB 5,581,972 bytes, SHA-256
`1530da5d0f10fc886631cca146ba5932d911390be2ffe2111a09ba6a44dcae07`.
Its actual multi-angle render showed smooth lumpy crown masses. It was rejected
on visual quality and is retained only as evidence; a successful provider call
does not by itself justify replacing the better candidate. The earlier service
errors are not proven to have been caused by resolution or account quota.

The delivered pine uses attempt 01, seed 753102, raw 7,276,876 bytes, SHA-256
`6100c1c806e85fb25f303c40c82f4fdb364171b8cdcc9ee8ef409b353972258e`.
The fitted derivative has 15,210 triangles, 32,209 atlas vertices and a
395,386-byte 1024 color map. An original generated transparent needle-cluster
bitmap supplements the real HF branches with fixed, three-direction leaf cards
fitted to actual green branch tips. This is an authored foliage layer, not a
claim that the untouched HF export supplied perfect needles. Four trees share
the woody mesh/map; all leaf clusters share one instanced geometry/material/map.
The 512×341 needle map uses alpha testing and opaque depth writing. Cards stay
hidden until their map is ready; failure leaves the colored HF tree visible,
and the normal retry path restores needles without opaque rectangular artifacts.

The corrected candidate passes five focused temple/supply tests, layout-value
preservation and the two normal-motion side routes. The full 1,975-test suite
passed before the final trunk-only placement correction; the relevant focused
checks and side routes were rerun after that correction. No later change to
runtime source follows these checks. Three native region cycles dispose each
of 30 monitored resources once; four additional 30 m front/stele routes, pause
freeze, all seven HF map-kind failures/retries, needle failure/retry and brush
font recovery pass. Those resource checks precede the trunk-only correction;
resource construction and ownership are unchanged by it.

Whole-region structural inventory: 718 → 721 mesh objects; summed instance
triangles 7,891,547 → 8,175,709; unique geometry bytes 12,038,608 → 13,467,562;
materials 51 → 59; colliders 3,039 → 3,063. These counts do not represent
visible-frame calls or physical-phone FPS. No per-frame tree simulation, new
light or external font service is introduced. Matched wide/facade/stair views,
390 px English inspection and the final decoded 22.5 s game-scene video were
reviewed after the root-placement correction. Visual acceptance remains pending.

### Verified restricted preview

The same restricted preview now serves `index-VX6_D4Mp.js`. All 792 local
build/runtime files match (226,379,748 bytes including compressed siblings).
All 15 changed/new artifacts were fetched and hashed from both local and public
origins; 777 unchanged files retain the preceding dated public verification.
Eleven source/debug paths remain denied on both origins, and original
DEV/preview/awake/tunnel process identities are preserved.

Native production English 1440 px and Chinese 390 px flows pass: ordinary
Penglai entry automatically loads all eight temple image types and the local
brush font, Start/Pause/Home works, same-address reload uses the new entry,
and production debug hooks are absent. The eight types include the seven HF
maps and needle mask. No console/page errors or failed resource responses were
recorded. The narrow context remains desktop emulation, not a phone test.

Source preservation compares the immediately preceding 1,859-input candidate:
1,848 remain byte-identical, eleven scoped source/document/test inputs change
and nine files are added. The accepted creatures, pending repository Skill,
calligraphy/font, roof and Bixi inputs remain exact. Scoped formatting,
`git diff --check` and production build pass. The final 22.5 s H.264 video is
13,746,530 bytes, SHA-256
`211a298f176499cdacf637a3bb8eafc8da68ecb0e38a923c7e072e59edbfc72a`;
its decoded samples were visually inspected. Detailed records are
`source_preservation.json`, `layout_preservation.json`, `artifacts.json`,
`public/report.json`, `pine_selection.json` and `delivery/` under the batch root.
No commit, push or formal main/Pages update was performed; user review is pending.

## Sword-sect landmark refinement — 2026-10-27

The user requests a giant sword on the temple and further distinctive scenery.
The established lore name remains Skybearer Sword Sect / 承霄剑宗. The rooftop
monument uses the already accepted, straight HF jian rather than regenerating
its design or changing the Sage's weapon. It stands 85 world metres tall above
a new bronze-lotus stone pedestal. The foundation follows sampled final roof
triangles, with a closed, stone-colored faceted support. Two carved bronze
censers stand on the front terrace, leaving the central approach clear.

The existing Dragon Gate receives shared carved vermilion columns and a fitted
HF tiled roof. Original column/lintel colliders, placement, carp transformation,
radar paths and guardian waypoints remain. The added sculpture and roof surfaces
have fitted contacts; this is scenery, not a new ability, reward or obstacle
course. Existing calligraphy, temple trees, creatures and their motion remain.

### Actual generated sources

Original concepts were inspected, then processed through Microsoft TRELLIS.2.
Both actual exported GLBs were downloaded completely and inspected from four
angles before conversion. Normal-constrained simplification, new UVs and color
projection produce 1024 color maps with opaque colored geometry fallback.

- Lotus pedestal: seed 754101; raw GLB 4,430,380 bytes; SHA-256
  `fb4bbead2eefd781720d258bfd4f0d62b7ac276879c6783e5e46a53b2c6ac4e3`;
  8,917 runtime triangles and 13,128 atlas vertices.
- Bronze censer: seed 754102; raw GLB 4,499,832 bytes; SHA-256
  `b19f8f89580f7d334b73133b0fdde724b9e93f9dd884fbfc492b6a7fea320522`;
  8,879 runtime triangles and 12,659 atlas vertices. Two instances share one kit.

A fresh October 27 18:22 BJT receipt recorded 2,342.506955 included GPU seconds
before this batch. Each GPU stage rechecked its reservation; no paid overage was
used. These are dated production records, not a current balance promise.

### Scope and evidence

Evidence root: `.local/penglai_sword_sect_20261027/`. It contains the previous
source snapshot, provider receipts, raw multi-angle views, conversion reports,
matched in-game views, native traversal and loading/lifecycle checks. The first
scene inspection found an overly green rounded support; it was replaced with
a stone-colored faceted support before the final capture.

The sword retains the existing global Sage resource kit; it must not be disposed
by a region. The pedestal, censers and support are region-owned; Dragon Gate
columns and roof reuse the corresponding temple resources. No new light,
per-frame animation, external font or separate render loop is introduced.
Native desktop and narrow touch emulation are not physical-phone performance
evidence. Controlled architecture footage uses an inspection camera and staged
invulnerable player with creatures hidden, not a natural completion playthrough.

### Fresh final validation

All 1,977 tests pass, including five focused checks of final surface contacts,
roof/terrace support and shared-versus-owned resource lifetime. All 3,063 prior
collider values remain exact, with 330 new sculpture/roof contacts. Existing
radar paths and guardian waypoints remain deep-equal. Eight normal-propulsion
30 m routes pass: temple front and both sides, Bixi frontage and both directions
through Dragon Gate. No per-frame position correction is used after staging.

Three native region cycles release all 38 monitored map resources once while
leaving the shared Sage sword kit alive. Pause freezes motion. All nine HF
architecture map types tolerate failure with opaque color fallback and recover
through the standard retry path; needle-mask and brush-font recovery also pass.
Wide, facade and gate views, 390 px English inspection and ordinary follow-camera
views were inspected. The final 22.5 s H.264 inspection movie decodes cleanly,
and six samples across its three shots were reviewed.

Whole-region structural inventory changes from 721 to 724 mesh objects,
8,175,709 to 8,232,371 summed instance triangles, 13,467,562 to 14,443,565
unique geometry bytes, 59 to 63 materials and 3,063 to 3,393 colliders. These
are structural totals, not visible-frame draw calls or phone FPS. An October 27
18:42 BJT quota receipt records 2,188.235087 included seconds and zero overquota.
The provider reports the next reset at October 28 18:03:59 BJT.

### Restricted preview delivery

The preview serves `index-CnhdVqLm.js`. All 798 local build/runtime files match
(228,267,854 bytes including compressed siblings). All thirteen changed/new
artifacts were fetched and hashed from both origins; 785 unchanged files retain
the preceding dated public checks. Eleven source/debug paths remain denied on
both origins, with all original service identities preserved.

Native production English 1440 px and Chinese 390 px flows pass: ordinary region
entry loads eleven architecture/sword/needle image types and the bundled brush
font; Start/Pause/Home and same-address reload work, with no page/console errors,
failed responses or production debug hook. This narrow context is desktop touch
emulation, not a physical-phone test.

All 1,868 previous source inputs were compared: 1,859 remain byte-identical,
nine scoped source/document/test inputs change and six files are added. Existing
creature, combat, font, roof, Bixi and pending Skill sources remain exact.
Scoped formatting, `git diff --check` and the production build pass. The final
movie is 11,049,827 bytes, SHA-256
`667a34db2dc47a7b6038eeb33dbf18d5ba2058b5ec0576a651b03af73024905c`.
Detailed results are in `source_preservation.json`, `layout_preservation.json`,
`lifecycle.json`, `side_routes.json`, `artifacts.json`, `public/report.json` and
`delivery/` under the evidence root. User review of this new appearance is pending.
No commit, push or main/Pages update is authorized by this task.

## Garden scenery refinement — 2026-10-27

The user accepts the sword-sect batch and requests the next group. This batch
replaces the old clustered peach trees and ellipsoid lotus flowers with actual
Microsoft TRELLIS.2 exports, adds cupped radial-veined lotus leaves and reuses
the accepted carved columns / tiled roof for ten small pavilions. Original
botanical concepts inform the two new exports; the game's fantasy scale stays.
See [the botanical sources](penglai_sources.md#garden-scenery--2026-10-27).

| Source      | Seed   | Original GLB                                                                                | Runtime triangles       |
| ----------- | ------ | ------------------------------------------------------------------------------------------- | ----------------------- |
| Peach tree  | 755101 | 7,279,644 bytes; SHA-256 `52a0fdb5603158e857d7fdb6b46a1836db6f62a2e4a0a15fdef92e8a0d7a35b2` | 15,850 near / 2,914 far |
| Lotus bloom | 755102 | 4,404,588 bytes; SHA-256 `ac24d17f7530a8bf8a26dc82a485c4a6036f2554698f618f241b8894e37e50ff` | 3,928                   |

Both HF sessions stayed alive until complete exports were downloaded and GLB
lengths validated. The dated reading after the second export was 2,038.137970
of 2,400 included GPU seconds remaining, overage zero, reset returned for
2026-10-28 18:03:58.846 BJT. This is a historical receipt, not live quota.
Raw exports, concepts and receipts remain in `.local/penglai_gardens_20261027/`.

An initial 7,374-triangle tree lost too many flowers; that intermediate candidate
was rejected during native scene inspection. The final near mesh retains more
flower clusters. Near/far derivations use the same original coordinate frame,
with a fitted trunk origin, rather than separately recentering their bounds.
There are still 395 land trees and 30 sky trees; no ecological stock is removed.
Shared spatial batches use the existing High visibility range; Smooth switches
to the same-source far trees at 120 m rather than High's 170 m. Both levels
share placement and switch boundaries, so neither double renders nor vanishes.
Textures are 1024 square for near trees and 512 square for far trees / lotus.
They retain colored opaque fallback surfaces and explicit preparation/retry.

The first scene pass also exposed roots floating above sloped triangles and
old pavilion roofs intersecting the hillside. Tree XZ/yaw/scale and pavilion XZ
sites remain. Grounded roots now fit the rendered terrain footprint; their
trunk contact Y follows that placement. Small pavilion platforms sit above the
complete sampled footprint, with coursed stone foundations descending into
the slope. Matching foundation/roof contact boxes replace the old simplified
roofs; columns and beams meet the final HF roof underside. The main temple,
Bixi, greatsword and prior carving sources are byte-identical. Radar paths,
guardian waypoints and contacts outside this bounded scenery scope remain.
The existing submerged pavilion stays at its original site.

Verification:

- **1,981 / 1,981** full tests pass. Nine affected garden/temple tests cover
  final mesh budgets and fallback color, matching two-level instance placement,
  both quality cutoffs, root/terrace ground fit, roof supports, solid contacts
  and preserved greatsword/Bixi behavior. Two earlier tests were updated for
  the merged one-draw tree and actual HF roof contacts, preserving their
  tree-count and solid-roof assertions.
- Native desktop Chrome checked three region-switch cycles: all **15 unique
  affected geometry/material/texture resources** release exactly once per
  cycle. Five intentionally failed textures leave colored opaque geometry;
  explicit retries recover all. Two ordinary 30 m traversals across the lotus
  approach and pause/resume checks pass, without per-frame position overrides.
- Matched game-lighting before/after views and three camera sweeps were captured
  and encoded into a **22.5-second** review clip. The encoded file was fully
  decoded and sampled frames inspected. These are controlled scene cameras
  with invulnerability and other creatures hidden, not natural progression.
- A separate populated running-scene draw-cost sample retained live AI/audio.
  At 1280×800, High median calls changed **213 → 202**, triangles **2.190 M →
  2.570 M**; Smooth calls **157 → 136**, triangles **2.085 M → 1.798 M**.
  High keeps more close flower detail; Smooth uses the earlier far-tree switch.
  Both map versions were resident during this comparison, so it is not a memory,
  matched CPU/FPS or physical-phone heat measurement.
- Structural all-instance totals: meshes **724 → 544**, triangles **8,232,371 →
  9,690,241**, unique geometry bytes **14,443,565 → 14,202,390**; collider count
  **3,393 → 4,910** after fitted pavilion roofs/foundations. Added three color
  maps require an estimated **6 MiB base RGBA / 8 MiB including mipmaps** per
  WebGL context. These totals are not a claim that all instances render at once.
- Normal production entry, automatic material loading, Start/Pause/Home and
  same-address reload pass in English at 1440 px and Chinese at 390 px. Narrow
  desktop touch emulation is not a physical phone. No production debug hooks.
  All **807 dist/runtime files / 231,384,154 bytes** match; fresh local/public
  HTTP checks cover **14 changed artifacts**, with unchanged artifacts traced
  to prior verification. Eleven source/debug/private paths are denied on both
  origins. Existing service identities remain unchanged.
- Changed-file formatting passes. The repository-wide formatting check still
  reports twelve byte-identical pre-existing generated monument JSON files;
  they were not reformatted as part of this garden change.
- Source comparison preserves **1,866 of 1,874** prior inputs byte-for-byte,
  with eight scoped documentation/integration/test changes and nine new files.
  Existing creature, combat, font, temple roof, Bixi, sword and Skill sources
  remain exact. No commit/push or production release.

Evidence: `.local/penglai_gardens_20261027/` holds receipts, rejected intermediate
conversion, final packed checks, `tests.log`, `lifecycle.json`,
`layout_preservation.json`, `render_cost.json`, `review/report.json`,
`delivery/manifest.json`, `public/report.json`, `artifacts.json` and
`source_preservation.json`. Final entry is `index-BEtrE2fE.js`; public preview
uses the existing restricted origin. The three garden appearances await user
review. Prior sword-sect scenery is accepted by the latest user reply.

## Terrain, grass and pavilion finish — 2026-10-27

The user requests the next refinement for mountain surfaces, grass, pavilions
and stairs. The previous garden assets remain in place. This candidate is
uncommitted and awaits the user's visual review.

### Delivered scope

- Mountain shading now distinguishes exposed grey rock on steep slopes from
  short meadow/groundcover on gentler slopes, with a damp shoreline transition.
  World-space triplanar rock sampling avoids steep-slope stretching; grass and
  broad color variation use world coordinates. The terrain vertices and normals
  remain exact. Existing rock outcrops receive the same material family.
- Summit paths remain part of the terrain surface, with filtered staggered
  paving joints and stone grain. There are no new overlapping path planes.
- Ten small pavilions retain their actual HF roofs, carved pillars and sites.
  Their stone foundation blocks have bevels and stone texture; paired side
  beams and column-head pads complete the timber frame without narrowing the
  original column openings.
- Existing summit courtyard paving and stair tops use shared stone grain.
  Stair risers now have inset dressed faces, contained within their original
  collision volumes. No new gameplay obstacles, population or balance changes.

The two original material images were generated with the built-in imagegen
service, then resized/encoded to 1024-square WebP. They are surface textures,
not new HF meshes. Approved HF architecture is reused without alteration; this
batch consumes no additional HF GPU quota. Runtime textures total 1,075,010
bytes and approximately 10.67 MiB of RGBA GPU storage with mipmaps, excluding
driver overhead. Generation prompts, originals and hashes are recorded in
`.local/penglai_terrain_finish_20261027/prompts.md` and `assets.json`.

### Verification and cost

- All **1981/1981** existing tests pass, including the focused garden/temple
  checks; changed source formatting and the production build pass.
- The before/after audit confirms exact equality for all **4910 colliders**,
  terrain positions/normals/indices, radar paths, guardian waypoints and garden
  instance placements. Existing accepted creature/architectural source assets
  are outside this change.
- Native Chrome captures match three before/after views: mountain grass/rock,
  small pavilion and temple stairs. Moving inspection-camera clips use the real
  game renderer, lighting and postprocessing with staged invulnerability and
  other creatures hidden. They are scenery review, not natural progression.
- Three Penglai-to-Hawaii cycles load the two shared textures and dispose each
  once. Deliberately failed texture downloads retain opaque colored fallback;
  retry restores both full textures. Pause is stable. Console/page errors are
  checked in these normal flows. Narrow 390 px testing is desktop emulation,
  not an actual phone result.
- A separate ordinary-follow-camera approach uses one staged starting position
  and normal movement thereafter. The first start was too low and met the
  uphill face; that failed traversal setup is retained and is not used as
  route-success evidence. The higher approach advances over 20 m toward the
  temple, with no per-frame position or camera correction; it ends near the
  existing temple shell, not through a promised interior.
- Whole-map static mesh count is 544 → 580, all-instance triangles
  9,690,241 → 10,003,921, unique geometry storage 14,202,390 → 14,212,758 bytes,
  and used materials 66 → 68. The increase includes real bevels and timber.
- Populated 1280×800 native Chrome, live AI/audio, fixed matched view and
  two-second warm-up / three-second samples: High mean calls 189.1 → 216.2,
  triangles 2.449M → 2.631M; Smooth calls 146.4 → 150.3, triangles 1.811M →
  1.848M. Median frame intervals are 16.6–16.7 ms, p95 18.1–18.4 ms across
  these samples. Both map versions were resident for comparison, so this is
  not a memory benchmark. These short desktop observations do not establish
  physical-phone performance, thermals or sustained GPU cost.

Evidence: `.local/penglai_terrain_finish_20261027/` contains baseline/source
fingerprints, layout preservation, asset provenance, static and populated cost,
texture lifecycle/failure results, full test/build logs, actual before/after
screenshots, raw motion, and final encoded-video inspection. Preview/public
verification and final delivery receipt are recorded there as completed.

Restricted preview verification for this candidate is complete: entry
`index-Dq7mRRy9.js`, **809** dist/runtime files totaling **232,465,576 bytes**.
All local/runtime hashes match; seven changed artifacts were freshly checked
byte-for-byte over local HTTP and the public tunnel, with eleven private/source
paths denied at both origins. The other 802 assets retain the prior dated
public-verification provenance. Native public English 1440 px and Chinese
390 px flows selected Penglai, loaded the two new textures automatically,
started, paused, returned Home and reloaded the same address without page /
console errors or production debug hooks. Services retain their prior PIDs.
The three-part delivered H.264 video is 22.5 seconds; complete decode plus
six sampled encoded frames were checked. The separate ordinary-camera approach
remains local verification, not part of this visual-review montage.

## Sword Sage monument clearance — 2026-10-27

While requesting closeout, the user supplied an actual-phone screenshot and
asked whether a sword was piercing the Sword Sage. Native scene reproduction
confirmed a collision-fit defect: the temple monument reaches world Y357.54,
while the previous spawn correction stopped at Y357. Head/chest probes were
clear, but the lower robe and horizontal riding sword intersected the monument.
This was a real scenery overlap, not a broken riding-sword mesh.

The fitted Sage now supplies four lower-robe and eight riding-blade terrain
sections. Navigation builds bounded spheres from every triangle crossing each
section, with allowance for the existing robe animation. These are terrain-only
checks; the original two damaging/contact sections remain unchanged. The
existing spawn search now finds Y385, leaving the riding blade about 14 m above
the monument tip. The original patrol, pursuit, turning, charge and final-pose
checks use the same additional sections. No home constant, art asset, wardrobe,
ward, damage, timing, unlock condition or giant monument has been altered.

### Fresh verification

- All **1982/1982** tests pass, including **246** focused Penglai/encounter/body/
  Sage checks. A new 70-second simulated scene uses the actual map contacts and
  checks posed lower-robe / riding-sword vertices against the validated envelope
  during locked patrol, unlock, obstructed pursuit, both attacks and reset. The
  previously defective Y357 location is explicitly rejected; the boss must still
  travel and perform both skills.
- The other **17** lord kinds have exactly unchanged navigation probes against
  the recorded pre-fix implementation. Existing source assets and the monument
  geometry are preserved. Only 12 bounded navigation sections are added for the
  Sage; no new meshes, textures, lights, render passes or persistent GPU objects.
- Native Chrome runs the ordinary state machine with a staged invulnerable 30 m
  player and test-unlocked guardians. Over 24.5 seconds the Sage travels about
  206 m in sampled positions, fires six real sword projectiles and performs the
  charge. Pause freezes position/state/timer; a new round restores the locked,
  collision-clear spawn. No console/page errors occur.
- Comparison stills use the same camera, pose and game lighting: the first
  reproduces the recorded old Y357 spawn, the second shows the corrected spawn.
  The delivered motion clip uses actual world travel and an observation camera,
  not a pinned boss. A first fixture counted projectiles under the wrong scene
  parent; that fixture is retained as failed, and the corrected capture verifies
  the actual projectile scene. H.264 output is decoded and sampled visually.
- These are desktop Chrome checks, not a new physical-phone test. The user's
  screenshot establishes the phone symptom; the fresh preview allows retesting.

Evidence: `.local/sage_monument_clearance_20261027/` contains the baseline,
reproduction, shared-lord audit, tests, native recording and delivery artifacts.
The earlier terrain video was successfully resent as a smaller same-content
clip after the first Feishu upload failed; its receipt is recorded separately
under `.local/penglai_terrain_finish_20261027/delivery.json`.

Closeout: the requested Penglai creature, temple, landmark, garden and surface
work is complete enough for final user review after this correction. Small
legacy distant pine/bamboo decorations can receive optional later polish;
they are not claimed as newly generated HF assets. No commit or main push is
performed on a closeout question alone.

The refreshed restricted candidate is `index-CQ3De8Nm.js`. All 809 current
build/runtime files (232,466,999 bytes) match locally. Fresh HTTP checks verify
the three changed artifacts on local and public origins; the other 806 retain
prior verification provenance. Eleven source/private paths are denied on both
origins. Native production EN1440 and ZH390 flows verify normal loading, start,
pause/Home and same-address reload without a public debug hook or console/page
error. The 390 px case is desktop touch emulation. Existing service identities
and logs remain intact. Source audit preserves 1880 of 1886 previous inputs
exactly, with six scoped edits and one new regression test; all art assets are
byte-exact. No Git commit or push occurred.

## Guardian ecology follow-up — 2026-10-27

Following the Sage clearance repair, the user requests complete habitat coverage
and finite adult-fight support around all five lords. See the
[ecology review](penglai_ecology_revision.md) for the actual runtime inventory,
relocated residents, reduced stock, native adult attacks and feeding lifecycle.
All accepted creature/scenery assets and the Sage clearance correction remain.
This ecology candidate is not yet committed, pushed or accepted as final balance.

## Landmark navigation and Kun follow-up — 2026-10-27

The player's eastern-column deadlock report supersedes the prior limited
finishing assessment. Actual-pose movement recovery and short collision-safe
retreats address both Azure Dragon and Sword Sage; the same bounded fallback
covers Vermilion Bird. Kun is present (four residents); two now use the north
monastery cloud route, and Peng preserves the regional fit. Existing art,
terrain, combat values and other species remain. See the
[navigation review](penglai_navigation_revision.md) for reproduction, rejected
intermediate fixtures and final checks. No commit/push.
