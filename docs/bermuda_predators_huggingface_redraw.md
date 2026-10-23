# Bermuda predator redraw — 2026-10-23

Accepted Bermuda predator checkpoint — 2026-10-23: the user accepts Tiger
Shark, Cameroceras and Livyatan, including the researched Cameroceras motion
follow-up, and requests a local commit followed by the next HF batch. All 1,256
delivered input hashes match before these acceptance-only notes. The recorded
1,606 tests and native/public evidence retain their original scope. Earlier
pending labels below are historical for this accepted batch only. No push or
main publication is requested; remaining regional content follows in separately
reviewed batches.

## Cameroceras motion follow-up — 2026-10-23

The user asks for research on Cameroceras locomotion, then authorizes applying
the findings. The arms-first description and motion evidence below describe the
previous candidate and are superseded **only for Cameroceras motion**. Tiger
Shark, Livyatan, all six source mesh/color files and the preceding batch remain
intact. This follow-up is uncommitted and awaits visual review.

### Evidence versus adaptation

- [Peterman, Barton and Yacobucci (2019)](https://palaeo-electronica.org/content/2019/2521-cephalopod-hydrostatics) model stable head-down orientations for long orthocones, including an Endoceras-like endocerid. This is a hydrostatic reconstruction, not a filmed Cameroceras.
- [Peterman and Ritterbush (2021)](https://peerj.com/articles/11797/) support efficient apex-leading vertical escape in experimental orthocone models. Their thrust and speed estimates are not applied as Cameroceras gameplay measurements.
- [Peterman, Landman and Ciampaglio (2026)](https://doi.org/10.1017/pab.2025.10085) show how body proportions and cameral deposits change stability and maneuverability. Their main modeled group is not Cameroceras; the work cautions against claiming every orthocone must always remain vertical.

The game therefore uses a tilted apex-up low-travel pose, apex-leading transit,
and an arm-crown-first hunting pose. Arms gently gather while the exposed soft
region makes a short contraction followed by a longer quiet interval. Arm count,
soft-tissue movement, exact angles, cadence and hunting turn are artistic
reconstruction. The existing mostly horizontal AI routes and numerical speeds
remain gameplay adaptations; this change does not add real hydrodynamics, new
vertical migration or a physically simulated jet/glide velocity cycle. No modern
octopus arm stroke is claimed as fossil evidence.

### Integration

`cameroceras_motion.js` drives one private attitude group around the existing
rig. The shell remains rigid, dorsal orientation is preserved, and the source
mesh, atlas, scale, bone count, shared resource ownership and gameplay root
position are unchanged. Main supplies actual resolved displacement and the
existing chase state. Guide uses its normal display-speed input. Phase is
converted back to seconds for smoothing, avoiding faster pose flips merely
because the existing animation clock accelerates. Repeated phase freezes pose.

The bite forward vector follows the posed arm crown rather than the leading
shell apex. The existing length-based mouth offset, swept tests, size eligibility,
damage, cooldown, cover and nursery rules remain unchanged. A turning animal
cannot bite from its shell tip; this intentionally aligns contact with the new
appearance rather than keeping a visually misplaced attack.

Evidence and matched before/after captures are kept in ignored
`.local/cameroceras_motion_20261023/`. Final checks are recorded below after
completion; earlier 1,603-test and public-resource receipts retain their old scope.

### Follow-up verification

- The final candidate passes 27 focused motion/contact/skin tests, all
  **1,606** project tests, formatting and the production build. Tests include
  apex-up rest, apex-first transit without inverted dorsal orientation, hunting
  transition, actual arm-side bite versus shell-tip rejection, pause, unchanged
  root transform and independent instances.
- Tiger Shark and Livyatan each match the immediate pre-fix candidate through
  360 posed bone matrices, sharing the same geometry/materials. All existing
  model/texture inputs are byte-identical. No extra mesh, triangle, texture or
  skeleton is added; Cameroceras gains one small private transform/state group.
- Native Chrome records 384 cruise and 600 pursuit samples under ordinary AI.
  Cruise spans about 57.56 / 3.98 / 18.02 m on XYZ; pursuit spans about
  75.40 / 0.72 / 12.09 m. The arm-facing pose is established when the original
  bite path starts its 2.2-second cooldown. Player size, starting placement and
  invulnerability are staged once; neither creature nor player is pinned each
  frame. The camera is an explicitly labeled observer view.
- Matching studio images isolate rest, transit and hunting. The combined final
  30 fps clip decodes into 1,029 distinct frames without decoding errors; its
  sampled rest/transition/world frames are visually reviewed. This is a game
  reconstruction, not footage of the extinct animal or a physical-phone test.
- Public native English 1440 px and Chinese 390 px touch-emulated cases pass
  Guide/start/skill/pause/Home and same-address refresh, without browser errors,
  missing textures or a production debug hook. The candidate entry is
  `index-a4NIZart.js` on the existing restricted preview.
- All **361 runtime artifacts / 89,654,466 bytes** match the reviewed build
  through both loopback and the public tunnel. Thirteen private/source paths
  are denied on each origin. DEV 35213, restricted 23118, awake 23120 and
  tunnel 35419 retain their original identities; the tunnel is ready.
  The old runtime is archived as `runtime_before_20261023_192510`.

No new HF inference or allowance is consumed. The current agent preserves the
previous candidate and services; this follow-up awaits user acceptance and is
not committed or pushed. Physical-phone PP-Q055 remains open.

## Scope

Following the user's acceptance of batch 1, commit `95713f5` preserves Queen
Angelfish, Gray Triggerfish, Atlantic Needlefish and Great Barracuda locally.
The current agent independently prepares Tiger Shark, Cameroceras and Livyatan
with actual Hugging Face TRELLIS.2 geometry on `art/bermuda-hf-redraw`.
This new batch is a candidate, not accepted or authorized for commit/push.
Formal main/Pages remains v0.11.16. Existing accepted species, player/lord
models, gameplay, sounds, services and archives are retained.

The three ordinary kinds retain their original lengths/populations:
5.2 m / 7 Tiger Sharks, 6 m / 8 Cameroceras, 17.5 m / 8 Livyatan.
The asset and rig modules are separate from accepted batch 1.

## Reference and reconstruction limits

- [Florida Museum: Tiger Shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/tiger-shark/) supports the blunt broad snout, gray flank markings, pale underside and asymmetric tail. Existing game size and pursuit are retained; this is not a claim that real sharks routinely chase people.
- [New York Tech: Livyatan](https://www.nyit.edu/medicine/college-of-osteopathic-medicine/anatomy/evolution-of-dolphins-and-whales/cetacean-family-tree/evolution-of-dolphins-and-whaleslivyatan-melvillei/) supports massive jaws with large teeth above and below. Most of its skeleton is unknown; body, flippers, flukes and color are plausible whale-based reconstruction. The game's existing 17.5 m scale is unchanged, not a new fossil measurement.
- [Atlas of Ordovician Life: Cameroceras](https://www.ordovicianatlas.org/atlas/mollusca/cephalopoda/endocerida/endoceratidae/cameroceras/) supports the long straight conical shell and its internal structure. Soft anatomy, color, arm count and movement remain speculative. The existing arms-forward game direction is preserved rather than presented as a measured habitual gait.

Original built-in image-tool concepts are reference inputs to HF, not game
screenshots. Provider receipts and complete GLBs are retained under ignored
`.local/bermuda_batch2_20261023/`. The live preflight records the selected Space
and model SHAs and MIT model-card license; only included Pro quota is used.
No third-party reference image is distributed as a game asset.

Cameroceras attempt 1 is rejected after raw-mesh review: the reconstruction
mirrored the visible funnel into two lateral pipes. The original remains in
evidence. A derived concept removes the ambiguous lateral tube and places the
ventral funnel out of view; attempt 2 was separately inspected in textured and clay views and selected.
Both attempts and their complete exports remain in private evidence.

## Later regional scenery queue

After creatures, the user explicitly requires the following distinct Bermuda
elements. These are queued, not claimed as finished by shared Hawaii assets:

| Element                             | Reference lead                                                                                           | Preserve during later redraw                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Offshore oil rig                    | [US Coast Guard platform types](https://www.dco.uscg.mil/OCSNCOE/Fixed/Types-of-Platforms/)              | Existing placement, supported decks, collision and hazard behavior         |
| Explorable sunken liner             | [NOAA Titanic expedition results](https://sanctuaries.noaa.gov/maritime/titanic/expedition_results.html) | Accessible passages, grown-body clearances and original exploration layout |
| Waterspout                          | [NWS Florida Keys waterspouts](https://www.weather.gov/key/waterspouts)                                  | Moving event, warning/damage timing and player readability                 |
| Flying Dutchman-inspired ghost ship | [Smithsonian's Ryder painting](https://americanart.si.edu/artwork/flying-dutchman-21446)                 | Regional identity, existing movement/attacks and ship silhouette           |

These are reference leads; review actual imagery and rights during production.
The game's placement does not assert that Titanic or the Flying Dutchman belongs
historically to the Bermuda Triangle. Crimson Sailfin and regional fleet remain
separate later work. Do not alter any of these scene factories in this creature batch.

## Runtime implementation and cost

Each kind uses one shared immutable skinned surface and its own skeleton. Tiger
Shark has a lateral posterior wave and restrained pectoral trim; Livyatan uses a
vertical tail wave and rounded flippers. Cameroceras keeps the shell rigid and
blends adjacent angular/axial arm supports continuously. Existing world phase,
speed, position, food and combat rules are unchanged. Geometry and texture
ownership follow the established shared material queue and independent disposal.

| Kind        | Triangles | Vertices | Bones | Geometry attributes + indices | Mesh JSON / color WebP bytes |
| ----------- | --------: | -------: | ----: | ----------------------------: | ---------------------------: |
| Tiger Shark |     5,426 |    6,987 |     8 |                       437,802 |            212,109 / 175,948 |
| Cameroceras |     8,456 |   10,486 |    25 |                       658,924 |            320,357 / 266,530 |
| Livyatan    |     6,483 |    8,870 |     8 |                       553,358 |            265,758 / 226,600 |

The three 1024-square color maps add approximately 16 MiB of RGBA8 mip storage
per WebGL context, plus instance bone textures and other renderer overhead.
Guide and game are separate contexts. No general phone-performance claim follows.
Matched populated-scene fixture views, with the same 468 ordinary entities,
change total draw calls from 62 to 48 (Tiger Shark view), 294 to 276
(Cameroceras view), and 50 to 35 (Livyatan view); corresponding rendered triangles
are 717,110 to 701,776, 1,792,246 to 1,779,374, and 701,170 to 676,293.
These are view-specific rendering counters, not FPS or thermal measurements.

The camera-interior manifest retains all 621 previous entries exactly and adds
three fitted 4,000-face proxies. Directed-edge closure and real near-camera
activation are checked; these are display proxies, not physical-anatomical solids.

## Verification

Evidence lives under ignored `.local/bermuda_batch2_20261023/`.

- `npm run check` passes; the final full suite passes **1,603/1,603**.
  The first run exposed an obsolete Cameroceras assertion requiring eight old
  procedural meshes. It now tests the integrated HF skin's actual movement,
  shared buffers, bounds, pause and independent disposal; its 11-test file and
  the subsequent full suite pass. No motion bound was widened to hide a defect.
- Eighteen focused model/contact/interior checks pass, including normalized
  scale, weights, continuous posed vertices/UV seams, rigid shell/snouts, bounding
  coverage, independent instances and unchanged regional stock/lengths.
- Thirty-two unaffected factory consumers match the accepted baseline through
  180 poses each, including batch 1, shared fish, player characters and lords.
- Native Chrome covers nine Guide openings, nine Bermuda/Hawaii/Atlantis
  transitions and 69 retired instances. Geometry/texture identities remain
  shared, skeletons independent and retired bone resources released.
- Three forced color failures retain a complete vertex-colored silhouette and
  explicit retry restores each original atlas. An initial fixture used the
  obsolete `giant` category selector; it was corrected to `ancient` and rerun.
- Three real near-camera cases activate the interior fill, keep the camera
  matrix unchanged and deactivate at a 100 m offset. This does not eliminate
  ordinary terrain occlusion or change the accepted stable follow view.
- Matched material/clay before/after images and cruise/fast/release footage are
  reviewed. Actual world movement and pause are recorded with staged player
  positioning/invulnerability and an observer camera; entities are not pinned.
  The first observer clip retained a stale camera matrix and is not delivered;
  the corrected recording explicitly updates that fixture's camera matrix.

## Preview delivery

The restricted preview is rebuilt on the original origin. Entry is
`index-easmJB5r.js`; all **361 artifacts / 89,652,291 bytes** match the reviewed
local build byte for byte through loopback and the public tunnel. Thirteen
source/private/directory paths are rejected on both origins. Six native public
cases (three models, English desktop and Chinese 390 px touch emulation) pass
Guide/start/ability/pause/Home, final texture readiness and same-address refresh.
No browser errors, failed runtime resources or production debug hook are observed.

The original DEV 35213, restricted server 23118, awake 23120 and tunnel 35419
identities remain unchanged and the tunnel readiness endpoint is healthy.
Rebuild with `.local/mini_preview_20261007/manage.py rebuild`; its status/stop
commands retain process identity checks. Logs, snapshots and archived previous
runtime stay in that ignored directory. Only `index.html` and `assets` are public.

Final encoded Guide/transition and actual-world observer clips decode completely
at 30 fps: 811 and 536 frames respectively, all frame hashes distinct. Sampled
frames are visually inspected for fins, shell/arm continuity and final framing.
The host is a desktop Mac; these recordings and emulated narrow screens do not
establish physical-phone performance.

The 18:54 BJT read-only HF balance is 2,148.711848 / 2,400 seconds, over-quota
usage zero, resetting 2026-10-24 17:55:02 BJT. This is a dated receipt, not a
promise about future allowance. No paid overage or new subscription is used.
The initial quota query hit proxy TLS EOF; a process-only direct request succeeds
without modifying the system proxy.

The accepted four-fish checkpoint remains `95713f5`. This three-model candidate
is delivered for user visual acceptance, with **no new commit or push**.
Physical-phone PP-Q055 remains open; desktop narrow viewports do not validate it.
