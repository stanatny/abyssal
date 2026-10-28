# Odyssey coast: Troy, shore of embers

Date: 2026-10-28. Status: inshore placement and coastal landscape refinement accepted for continuation. No commit or push.

The subsequent [map expansion and shallow-habitat batch](odyssey_expansion_revision.md) preserves this coast and is tracked separately.

## Coastal landscape refinement

The user accepts the in-map placement and asks for further coastal topography
and surface refinement. The western bay location, 0.7 scale, horse/city assets,
main sea route and inaccessible-land contract remain. This pass is scoped to
the coast, not the later underwater-ruin redraw.

The authoritative terrain now has gently wandering terrace edges, two eroded
side coves, varying headlands and an uneven sand/water transition. Building
platforms remain level. An initial stronger bend failed a gate-foot support
sample and was reduced before delivery; the final full transformed foundation
checks pass. Limestone bands, mineral variation and a damp shoreline blend are
restricted to the coast. Outside that footprint, the old floor shading remains.

Retaining walls use chamfered stone courses, small alignment/color variation,
missing coping stones and weathering instead of pristine repeated boxes. Their
merged geometry is indexed after removing unused UVs. Twenty-six fractured-rock
outcrops reuse the previously accepted TRELLIS.2 Bermuda rock source and texture;
the map owns its own geometry/material/disposal. Source SHA-256:
`50212fcc1b412578ad9c02b35d3e7a5645a42184b066d22a4d6e1e8490d1d9a1`.
No new HF generation or quota is consumed. Reuse adds one instanced draw rather
than 26 separate submissions. Rocks follow the local slope normal and partially
embed; a rejected flat placement and an over-buried trial are retained locally.

The existing four Troy HF sources, creatures, populations, lore, combat and
surface effects are unchanged. A comparison against the previous terrain checks
the complete collider set and 79,239 height samples outside the coastal footprint.
Total colliders remain 447. 419 of 420 non-shore colliders remain identical; one nearby reef-cover
collider follows its rendered ground upward by 2.18 m. 11
of the 27 shoreline boxes resize along their far western ends to follow the
revised dry-land contour. The eastern approach boundary stays in place.

Fresh validation:

- 120 regional tests pass, including foundation support, rendered terrain
  agreement, wet habitats, adult main/gateway clearance, coast approach/breach,
  asynchronous loading/disposal, and the existing Odyssey creature/weapon rules.
- Native Chrome checks normal input-driven breaching, 3 m/30 m approaches and
  retreat, pause and region switching. The original follow camera is retained;
  scenery observer shots are explicitly labelled. All 29 observed coast
  resources release exactly once, and no window runtime errors are captured.
- Full prepared environment geometry CPU buffers increase from 17,306,688 to
  20,305,708 bytes. Coast geometry submits 301,777 → 411,497 triangles before
  culling; coast mesh draws are 8 → 9. Floor triangles stay 248,880. These are
  explicit visual-quality costs, not GPU-memory or performance improvements.
- Matched before/after stills and an encoded game clip are inspected. A short 1280×800/DPR1 M6 native Chrome sample (2 s warm-up, 5 s capture
  per variant) gives median 16.7 ms and p95 18.5 ms for both old/new terrain.
  This 60 Hz-capped controlled observation is not a low-end-device benchmark;
  live wildlife continues moving, and both environment variants are retained
  in this comparison context, so memory counters do not represent one build.
- Production entry `index-Djz7KSAu.js` passes English desktop / Chinese 390px
  entry, both quality controls, pause/resume and actual five-asset texture loading.
  This is desktop layout emulation, not a physical phone. No runtime errors or
  production debug hooks are observed. All 906 dist/runtime files match
  (286,190,478 bytes); 23 changed files are freshly hash-checked on local/public
  origins, with 883 unchanged files relying on the preceding dated verification.
  Eleven source/private paths are denied on each origin. Existing service
  identities are preserved, and the same public address serves the new build.

Evidence: `.local/odyssey_coastal_landscape_20261028/`. Earlier rejected trials
and the dated placement verification below remain separate from this pass.
No commit or push.

## Inshore placement correction

The user found the first tableau too detached from the playable sea and requested
an in-map beach comparable in presentation to Hawaii, while keeping the city
unreachable. The coast root is now `[-153, 0, -50]`, yaw 90 degrees, uniform
scale 0.7. The horse retains its proportions at 41.3 m high. The four accepted HF
assets are reused byte-for-byte; no new generation or quota was used.

The terrain footprint is inside the original world bounds, approximately
X `[-296.5, -72.5]`, Z `[-193.5, 93.5]`. The city no longer has a second floating
terrain mesh: the ocean's authoritative height sampler creates the terraced land
and the rendered floor. Only the nearby grid is refined. The redundant coplanar
plaza top is removed to avoid depth fighting. Four old western reef escarpments
and dry reef-decoration placements are omitted where the new land replaces them.

The coast is background land, not a new land level. A bounded set of merged
shoreline exclusion volumes follows cells touching dry ground, extending above
the water to stop breaches as Hawaii's play-area edge does. This is deliberately
a navigation boundary, not a claim that buildings have detailed physical bodies.
An initial low physical-land barrier allowed jumping into the scenery; the first
raised boundary stopped horizontal travel but left the swimmer over a dry slope.
The final coverage extends to the wet side, allowing gravity to return the player
to water. Both rejected checks remain in the local evidence folder.

One Silverleaf Pipefish home changes from `[-85, -175]` to `[-60, -175]` in X/Z:
the old anchor would have become dry. All populations, food values, descriptions,
lord placements and the main route are retained. This is a necessary habitat
relocation, not a claim that every original coordinate remains identical.

Fresh verification for the final correction:

- 36 focused tests pass, covering rendered floor agreement, juvenile/adult coast
  sweeps, airborne exclusion, open main and gateway routes, wet spawn anchors,
  ecology/attack rules, asynchronous construction and disposal. Formatting,
  build and whitespace checks pass.
- Native Chrome: 3 m and 30 m swimmers stop at X -78.715 and -67.375 respectively
  at the sampled coast, then turn and travel back about 50 m under real input.
  A charged breach is stopped horizontally and returns to the water; the
  unmodified follow camera peaks near 42.9 m. Observer shots are labelled.
  Pause freezes time; a region change releases all 25 observed coast resources
  exactly once. No runtime errors are reported.
- The terrain refinement increases floor triangles from 96,900 to 248,880 and
  environment geometry CPU buffers from 9,388,872 to 13,256,776 bytes before
  lazy coast assets. Merged shore boundaries total 27; total world colliders
  are 447, compared with the previous 430. These are costs, not performance
  improvements or GPU-memory measurements.
- A fresh M6 native desktop sample at 1280×800/DPR1, populated sea-level observer,
  2 s warm-up plus 5 s each with buildings hidden/shown, measures median 16.7 ms
  in both cases and p95 18.6/18.9 ms. This is a short 60 Hz-capped scene check,
  not a physical-phone or thermal validation; it does not isolate the terrain
  increase from the previous build.
- Public production entry `index-CJlDx9VS.js` passes English 1280px and Chinese
  390px UI entry, quality change, pause/resume and coastal-resource loading.
  The narrow case is desktop layout emulation. No production debug hook or JS
  errors are present. All 906 dist/runtime files match (286,184,977 bytes).
  The 21 changed artifacts are freshly hash-checked over both origins; the other
  885 retain dated prior public evidence. Eleven private/source paths are denied
  per origin. A transient curl TLS failure is retained, followed by a successful
  retry without changing services.
- The delivered 17.47 s game clip combines ordinary input-driven breaching with
  labelled sea-level/overhead observation. The encoded frames and full decode
  were checked. Actual phone acceptance remains with the user.

Fresh verification and delivery evidence: `.local/odyssey_inshore_20261028/`.
The previous offshore batch below is retained as history; its counts, positions
and validation are not evidence for this correction.

## Earlier offshore coastal batch

The approved design now has four actual TRELLIS.2 assets: timber horse, breached
gatehouse, ruined houses and quay. The 59 m horse stands on a supported plaza;
two gatehouses, fourteen house clusters and three quays share map-owned assets.
Repeated models use three instanced draws. Six localized fire patches and
24 smoke puffs (12 in Smooth) use the existing ocean clock and bounded shader
geometry. A soft static horse contact shadow supplies grounding without enabling
scene-wide real-time shadows. There is no new damage, land exploration or fleet.

The initial west-coast position was obscured by existing reefs in actual surface
views. The tableau now occupies the northwest offshore coast, with root
`[-440, 0, 430]`, facing the sea. Its complete solid bounds remain west of
`x=-315`, beyond the existing playable boundary `x=-300`. The Ithacan Nursery
Lagoon, water bounds, 430 colliders, radar routes, landmark positions and 924
sampled terrain/ground values match the pre-task implementation. The old simple
western offshore island is replaced; other islands remain.

The scenery module loads asynchronously on entering the upper approach. Its
textures use the established retry/disposal path and source-derived vertex
colors until ready. Leaving during import creates no late objects. Below the
water surface the coast/effects are hidden, and they create no independent RAF.

### Asset and conversion evidence

Original concept inputs and actual GLBs are retained under
`.local/odyssey_coast_hf_20261028/`. Horse, gate and houses succeeded on attempt 01.
Quay attempts 01/02 failed before generation on a quota-request TLS error;
attempt 03 returned CancelledError; attempt 04 produced the retained GLB.
No over-quota usage was enabled. The dated post-export receipt reports
215.425371 seconds remaining of 2400, overquota 0; this is historical evidence,
not a live balance.

The initial conversion distorted thin boards and wall edges. Raw-versus-converted
color/clay inspection rejected it. Smaller geometric error with less normal
attribute weighting preserves the actual silhouette. The repeated houses use
an individually reviewed 11,212-triangle version rather than the earlier
24,538-triangle candidate. Final per-family triangles: horse 31,444, gate 37,696,
houses 11,212, quay 9,925. Four 1024px color maps and packed geometry total about
6.33 MB of source files. These costs are for actual assets, not concept images.

### Validation and practical limits

- The full suite passed 2060 tests before the final support/contact-shadow detail;
  the final focused nine tests cover assets, off-map clearances, full footprint
  support, import failure/retry, departure during import, pause time, disposal,
  original terrain and adult navigation. Build and source formatting pass.
- A native Chrome input sequence charges sprint, pitches up and breaches the
  surface with the unmodified follow camera: 265 of 474 captured frames have
  the coast visible, with peak camera height 42 m. Initial player position and
  invulnerability are staged; the movement and camera then use the real game.
  Camera inspection shots are separately labelled. Ordinary submerged swimming
  hides the shore; the gallery is not a claim of always-visible underwater scenery.
- Three region-switch cycles released each of 25 observed coast resources exactly
  once before the final contact shadow. A further native cycle released all 27
  current observed resources exactly once; ownership regression also covers the
  complete map resource set. Pause freezes the
  coast clock. The native candidate reports no JS errors.
- M6 / 32 GiB / Chrome 155, 1280×800 DPR1: sequential populated-scene coast
  shown/hidden samples (2 s warm-up + 5 s each) had median 16.6–16.8 ms and
  p95 18.8–19.4 ms. Roughly 317k–333k additional triangles are visible in this
  view; ecology changes make the whole-scene draw delta approximate. The display
  is capped near 60 Hz. This does not establish physical-phone or thermal results.
- Delivery checks include the actual encoded game clip, ordinary public entry,
  both languages, desktop/narrow layout and quality toggle, pause/resume,
  source/debug denial and served artifact hashes. Final entry is
  `index-BrGTAhpP.js`: 906 local/runtime files (286,184,082 bytes) match, with
  21 changed files freshly hash-checked over both local/public HTTP and 11 denied
  paths per origin. The other 885 files retain prior dated public evidence.
  See local reports for exact
  fresh verification scope; unchanged public assets can rely on dated prior
  evidence rather than being described as re-downloaded.

The first public automation attempt selected the wrong region during the picker
transition. Its screenshots/results are retained as rejected verification; the
corrected check waits for the selected region and actual coastal module resources
before starting. This is a fixture correction, not a runtime gameplay change.

Remaining scenery work is the actual underwater terrain, reefs/plants, ancient
galley and other ruins. This first coastal batch does not claim those are redrawn.

## Original design and research

The user accepts the Triton swimming correction and requests the next scenery
direction: a burning city after the Trojan War and a monumental wooden horse
visible from the sea. Existing uncommitted Odyssey work is preserved. No commit
or push is authorized by this request.

## Coverage and current scene

A fresh factory audit constructed every `ODYSSEY_CREATURE_KINDS` entry through
`buildOdysseyCreature`: all 25 have an HF art revision and motion channel. The
roster is 21 ordinary species, three lords and Golden Argonaut. This establishes
Odyssey-specific coverage; it is not a new whole-game visual acceptance claim.
Shared player appearances retain their previously reviewed versions.

Scenery remains a separate workstream. `odyssey_ocean.js` still builds the
procedural seabed, limestone flanks, offshore islands, reef cover and instanced
coral/sea-fan/sponge/grass groups. Existing gates, amphorae and the broken ancient
galley need a coherent material and silhouette review. Reuse accepted shared
assets where suitable instead of regenerating every object indiscriminately.

The current western coast was inspected in native desktop Chrome at sea level
using an observer camera at `[0, 9, 75]` toward `[-440, 30, 45]`. It currently
reads as a pale offshore landform with simple rounded forms. This is a visual
survey, not a performance or physical-phone test.

## Source facts and deliberate adaptation

- [Odyssey Book 1, lines 1–21](https://www.theoi.com/Text/HomerOdyssey1.html)
  frames Odysseus' wanderings and return after the sack of Troy. The poem opens
  later in the journey, rather than following a continuous departure-from-Troy
  chronology. Our coast is a visual prologue within the game's mythic geography.
- [Odyssey Book 8, around lines 492–520](https://www.theoi.com/Text/HomerOdyssey8.html)
  recounts the wooden horse and its entry into the citadel. Place our horse at
  the inner edge of a breached gate, clearly visible from the water.
- The [Mykonos Archaeological Museum's relief pithos](https://www.hh.gr/en/destinations/myconos-museum/)
  supplies an ancient visual reference for the horse's constructed silhouette,
  wheeled support and enclosed body. The museum photograph was actually viewed;
  it remains a private reference and is not redistributed or used as a texture.
- [UNESCO's archaeological site of Troy](https://whc.unesco.org/en/list/849/)
  distinguishes the archaeological site and its long history from the epic.
  The proposed coastal arrangement, horse size, color, fire and buildings are
  original art direction, not an excavated reconstruction or claimed ancient scale.

The current spawn is explicitly named **Ithacan Nursery Lagoon** in
`expedition_config.js`. Keep that name and habitat lore. Make **Troy, Shore of
Embers** a separate coastal tableau in the condensed mythic map; do not imply
that Ithaca is burning, or that real Troy stood beside Ithaca.

## Composition and experience

The player surfaces and first reads three large shapes: a wooden horse above a
broken gate, a layered citadel behind it, and smoke moving inland. The quieter
open sea remains the onward route. Cool turquoise water and warm stone/embers
connect the existing amber sky with the new shore.

1. **Horse and gate:** a proud, legible head/neck and a heavy hollow timber body.
   Broad planks, load-bearing ribs, pegs, ropes, aged bronze clamps, four wooden
   wheels and a belly hatch make its construction readable. Some scorched edges
   show the sack; most of the horse stays intact. It is the primary landmark.
2. **City after the sack:** massive weathered stone foundations, earthen upper
   walls, broken timber gates, low square towers and stepped house clusters.
   Several fallen roofs still burn. Most buildings remain dark and solid so the
   scene feels like a city after battle, not an endless explosion. Avoid generic
   medieval spires or turning the entire skyline into a marble temple complex.
3. **Shore-to-water transition:** broken quay masonry, snapped pilings, an ancient
   oared boat, amphorae and spars lead the eye back underwater. Later underwater
   placements can provide visual exploration landmarks along the existing route.
4. **Onward horizon:** keep one side of the composition open. Distant departing
   ships are an optional later asset; there is no existing Odyssey surface fleet
   to claim as completed. No new combat mechanic is part of this first design.

The original concept image uses a closer illustrative waterline viewpoint to
show materials and composition. It is not a same-camera runtime comparison.

## Candidate placement and scale

Use the western offshore island currently centered at `[-440, 45]` in X/Z
(radii 110/150, height parameter 64) as the first candidate site. Current playable
bounds are X `[-300, 300]`, Z `[-1150, 140]`, surface Y `4`; spawn is `[0, -18, 75]`.
Keep the main water route and existing ecology clear.

Initial blockout targets, to adjust after normal-camera checks:

| Element             | Candidate placement / scale                                                            | Reason                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Horse plaza         | X about -355, Z about 40; on a redesigned sea-facing terrace                           | Readable from shallow-water surfacing, outside the central swimming lane                        |
| Wooden horse        | 45–60 m high; aim for roughly twice the adjacent wall height                           | Large enough to remain a landmark as the player grows                                           |
| Gate and outer wall | 18–25 m high, with a broad opening around the horse silhouette                         | Avoid burying the horse behind masonry                                                          |
| City                | Step inland toward X -440 and farther west; extend land away from the playable channel | Give depth without enclosing or narrowing the water                                             |
| Underwater debris   | A later sparse group inside the playable western margin, after seabed/collision checks | Make the narrative accessible from the water rather than placing all detail beyond the boundary |

The land city is initially a vista, not a newly navigable land level. A later
explorable quay must have explicit reachable placement and 30 m player clearance;
it must not create a misleading inaccessible entrance or a new invisible wall.

## Production order

| Batch                    | Deliverables                                                                                     | Review focus                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Coast identity           | HF wooden horse, broken gate/wall kit, layered ruin cluster, quay kit; scoped fire/smoke effects | Water-level recognition, scale, timber versus stone materials, calm readable motion |
| Shallows and habitat     | Limestone ledges, sand/gravel transitions, garden materials and sparse harbor debris             | Underwater continuity, readable food and movement routes, reuse of accepted assets  |
| Deep route and landmarks | Amphora passage, wreck/reef, Scylla strait and Charybdis basin                                   | Distinct silhouettes at each depth and unobstructed lord combat                     |

Use the existing Hugging Face workflow for actual 3D assets, with a fresh quota
check at generation time. No HF request or quota claim was made for this design.
The concept bitmap was made with the built-in imagegen tool.

## Implementation guardrails and acceptance

- Start with 4–6 bounded fire areas and 2–3 smoke plumes as an art budget, then
  profile. These are proposed limits, not measured performance results.
- Prefer shared materials, instanced repeated architecture, distance detail and
  a bounded effect pool. Stream coast assets separately so underwater entry does
  not wait for every distant building. Suspend hidden effect work underwater.
- Preserve alpha edges and texture-ready fallbacks; check black/white rectangles,
  depth-write, overlapping wall faces and shoreline seams during camera rotation.
  Smoke must not cover the controls or flash the entire view.
- Surface, dive and resurface with small and 30 m characters in the normal chase
  camera. Check both languages and narrow layouts without calling them phone tests.
- Compare frame timing, draw calls, texture memory and scene-switch disposal with
  the same existing scene. Budget violations require revising implementation,
  not silently removing previously accepted lighting or gameplay.
- Deliver actual game screenshots/video separately from this concept. A generated
  image cannot establish mesh quality, reachable spaces, collision or frame cost.

## Evidence

Local task folder: `.local/odyssey_coast_design_20261028/`.

- `creature_inventory.json`: fresh 25-kind factory routing audit.
- `current_west_coast.png`: current native Chrome sea-level survey.
- `mykonos_reference.jpg`: private museum reference, not a production asset.
- `troy_coast_concept.png`: original imagegen design illustration.
- `prompt.txt`: exact generation prompt.

The original design-only turn left runtime unchanged. The user subsequently
approved implementation; the implemented-batch section above supersedes that
status while preserving the source research and concept history.
