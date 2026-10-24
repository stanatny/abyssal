# Bermuda reef arches and rock formations

## Scope and status — 2026-10-24

The user accepts the preceding natural-seabed batch and requests the next batch.
Three actual Hugging Face prototypes now replace two reef arches, 28 stone spires
and 60 shelf rocks. This candidate awaits the user's visual review. The current
agent works independently; there is no commit, push or personal-Skill change.
Formal main/Pages remains v0.11.16. Earlier accepted, uncommitted work is retained.

The dark mineral palette, broad fracture planes and weathered layers follow the
existing fictional Bermuda setting. [NPS's rocky-coast landform explanation](https://www.nps.gov/articles/rocky-coast-landforms.htm)
informs the arch/stack silhouettes, not a claim about surveyed Bermuda geology.
Original generated concepts supply the input images; no third-party photograph
is incorporated into the shipped textures.

## Actual generation and conversion

The [Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2)
was checked at revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`, with
[TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B) at
`af44b45f2e35a493886929c6d786e563ec68364d`. Both metadata cards reported MIT;
this concerns software/model licensing, not exclusive rights to every output.
All three use resolution 1024, export target 100,000 triangles and a 1024 texture.
The live session remains open until a complete GLB is downloaded and validated.

| Asset      | Seed / successful attempt | Raw GLB bytes | Game triangles near / far | UV vertices | JSON / WebP bytes |
| ---------- | ------------------------- | ------------: | ------------------------: | ----------: | ----------------: |
| Reef arch  | 744241 / 01               |     3,899,880 |             7,928 / 2,174 |       8,965 | 404,724 / 351,192 |
| Rock spire | 744242 / 01               |     3,847,340 |               3,970 / 648 |       3,826 | 175,851 / 324,588 |
| Shelf rock | 744243 / 02               |     3,146,596 |               2,996 / 350 |       2,376 | 113,463 / 268,604 |

Raw SHA-256 values:

- Arch: `ee32eff0b86a9735edf9c7c7556cc8021d6df60b0749b1ad40af50b08288c6e6`.
- Spire: `2759095520fcfed138db93b9c29a538e79c3acf1e6215178881c64fd8d630eee`.
- Rock: `50212fcc1b412578ad9c02b35d3e7a5645a42184b066d22a4d6e1e8490d1d9a1`.

Rock attempt 01 failed while downloading the preprocessed image (TLS exit 35),
before 3D generation. Its receipt is preserved. Attempt 02 completed. Included
quota was 540.134408 seconds at the initial read around 10:04 BJT and 406.193907
at the last export around 10:22 BJT, with zero over-quota usage throughout. The
returned reset was October 24 at 17:55 BJT. These are dated readings, not a future
balance. No extra payment, provider switch or quota bypass occurred.

Offline conversion welds source UV duplicates before reducing geometry, restores
oriented source normals, and rebakes the original colors into new atlases. Near
materials use those atlases; distant meshes use sampled vertex colors and rebuilt
normals. No skeletal animation or additional frame loop is introduced.

## Grounding, local relocation and traversal

The first integration exposed an old placement defect: the shallow reef arch at
`(-180, -365)` crossed the liner's excavation edge. Across its 80 m footprint,
the terrain differed by more than 250 m. Following that surface stretched the
arch into an unusable cliff. This rejected placement remains in the evidence.

The shallow arch now sits at `(-245, -365)`, 65 m west on the adjacent intact
shelf. Its existing named landmark follows its new position; its 75 m discovery
radius remains. The deep arch stays at `(170, -775)`. All other landmarks are
exactly preserved. Neither terrain nor the liner changes. This necessary local
relocation supersedes the initial brief's blanket landmark-preservation wording.

Both 80 m wide arches conform to the actual terrain sampler at construction,
with inverse-transpose normal correction. Their two feet sit into the seabed.
Forty offline silhouette blocks per arch preserve the opening and follow local
slope bounds. The initial overly broad merged blocks were rejected because they
blocked usable water; final blocks limit horizontal merging to 5 m.

Spire/rock horizontal centers and counts remain. Spires keep the 12–52 m size
cycle while radial fitting limits their base to the previous 14 m footprint;
all 28 align with the slope. Rocks fit the former size envelopes. Entire base
bands are seated, rather than making only one point touch a steep slope. Four
surface bands per spire and one fitted ellipsoid per rock back visible solids.
These are conservative contacts, not per-triangle physics. Total ocean contacts
change from 710 to 826; every non-geology collider record is byte-equivalent to
the baseline. Previously accepted cargo and aircraft clearance tests still pass.

The full final collision set permits an 18 m diameter swept sphere through a
48 m corridor at each arch. The native game separately moves a 30 m character
both ways through both openings, using real movement and contact resolution.
Nearby rocks still require ordinary steering outside those corridors; this is
not a claim of an unlimited straight route through the whole map.

A separate BVH ray audit uses the rendered seabed, not just its analytic sampler:
4,266 surface/base samples, no missing ground hits. Rock base-band gaps range
from -6.263 to -0.486 m and spires from -5.323 to -0.158 m on the steepest slopes.
The arches' sampled lower surface band spans about -0.496 to +0.294 m; it includes
surface vertices just above their buried feet. The real-scene views show seated
bases without the initial stretched arch or exposed floating bottom.

## Runtime cost and lifecycle

Near/far rock and spire meshes use instancing and shared leases. Arch terrain
fitting creates four owned geometries (two levels for each of two placements).
Decisions run every 0.4 active-play seconds in the existing ocean update, with
hysteresis: 145/165 m for arches; `max(45, height × 2.2)` plus a 12 m exit margin
for repeated formations. Full-placement bounds precede instance compaction.
No population, combat, weather, food, audio or character rule changes.

Whole-ocean all-far inventory changes from 53 draws / 867,313 triangles to
55 / 895,741. Four matched paused native render views add 2–4 calls and
28,900–45,698 triangles. These are inventories and frame rendering counts,
not measured frame-rate, heat or battery gains. The new appearance has a cost.
The original physical-phone follow-up remains open.

Atlas failure retains sampled source colors; online retry loads all three maps.
Three native Bermuda → Atlantis → Hawaii → Bermuda cycles release all 23 audited
owned/shared resources exactly once per cycle, including the four warped arch
geometries and instance meshes. Pause freezes the active clock. Shared leases and
instance-local detail state have a separate regression.

## Verification and delivery

Evidence: `.local/bermuda_batch13_20261024/`:

- `brief.json`, original concepts, Space/model preflights and four generation
  attempt receipts; seven material/clay views for each successful raw mesh.
- `audit.json`, `terrain_audit.json`, targeted tests and old source snapshots.
- `native/report.json`: texture fallback/retry, three release cycles, four real
  30 m traversals, pause, and Chinese 390 px desktop layout. This is not phone testing.
- `review/report.json`: matched real-scene views and rendering counts. The shallow
  arch comparison includes its deliberate relocation, so the old view can show
  empty shelf; deep arch, spire and rock pairs are direct same-location comparisons.
- `film_report.json` and `delivery/`: native Chrome paused-scene orbit review,
  20-second H.264 clip, 599 distinct frames, no decode errors, final frames inspected.
- `test.log`: 1,642/1,642 full tests; 16 targeted tests; `check_final.log` and build.
- `artifacts.json`: all 427 build/local/public artifacts match SHA-256, totaling
  109,415,345 bytes; private/source paths denied and service identities retained.
- `public/report.json`: production English 1440 px and Chinese 390 px native
  Guide/start/ability/pause/Home, textures, same-address refresh and no development
  hook or browser errors. Desktop emulation does not establish physical-phone behavior.

The restricted preview is [the existing Cloudflare address](https://saver-recorded-digit-could.trycloudflare.com/),
entry `index-CEaeY_Fi.js`. Services and archived runtimes are preserved. The current
candidate remains uncommitted for visual review. Small tube-worm decorations and
broader seabed surface treatment remain possible later polish; accepted creatures,
ships, aircraft, cargo, colonies and chimneys are not regenerated.
