# Odyssey submerged gates and galley — 2026-10-28

The user accepts the expanded sea for continuation and asks for the next batch.
This candidate replaces the four columns of the two existing gateways and the
90 m broken galley with actual Hugging Face meshes. It awaits visual review;
there is no commit, push or formal release.

## Art and preserved scope

The gates use eroded fluted shafts, visible stone-drum seams, a cushion capital,
marine accretion, staggered lintel blocks and projecting triglyph/cornice details.
The broken galley has splintered planks, exposed ribs, surviving end decks, short
oar remnants, a broken mast and an open central hull. Its previous decorative
steering wheels are removed. The actual generated geometry, not its concept
image, appears in the game.

The Met's [Greek architecture essay](https://www.metmuseum.org/essays/architecture-in-ancient-greece)
informs the Doric construction vocabulary. The Hellenic Maritime Museum's
[early ship collection](https://www.hmmuseum.gr/en-us/Collections/Permanent-Exhibition/Prehistoric-Era-and-Classical-Antiquity)
informs the slender rowing hull and ram. This remains a mythic adaptation mixing
archaic seafaring and classical architecture, not a period-perfect reconstruction.
The input concepts are original generated images; museum images were not uploaded.

Gate centres, nominal spans (112/126 m), terrain, the expanded 960 × 1,900 world,
all creature assets/rigs, population, lord homes, guardian food, accepted coast,
audio and combat rules remain. The first existing pressure hazard is moved from
(-155,-620) to (-250,-650), outside the new hull: the full regression caught the
old anchor inside the ship. Its profile, damage and count are unchanged; no other
region's hazard placement changes.

## Production and runtime contract

Actual Microsoft TRELLIS.2 sources, generated using included Pro quota:

| Asset  | Seed   | Source SHA-256                                                     | Near / far triangles |
| ------ | ------ | ------------------------------------------------------------------ | -------------------- |
| Column | 754901 | `1dcde43f30c24bb69ea1df123ecc1e52854277606679630e70d190707e81a0e8` | 5,984 / 1,592        |
| Galley | 754902 | `6e4b1f7609f1bb4b447dd5f7c1bb26489375c78596a61331624df48494f8918d` | 17,883 / 4,379       |

The fresh pre-generation balance was 2,400 seconds at 18:53 BJT. Export receipts
reported 2,337.808565 seconds remaining and zero overage, with reset on October 29
at about 18:56:27 BJT. These are dated receipts, not a perpetual live balance.
Raw GLBs, original inputs, receipts, raw clay/colour views, re-UV projection,
packed-asset views and rejected/diagnostic evidence are preserved under
`.local/odyssey_ruins_20261028/`.

Four columns share one immutable pair of near/far geometries and materials per
map. The ship uses its own pair. Each has one 1,024² colour texture. Before download
or after failure, source-derived vertex colours remain on the same solid mesh.
The existing bounded material queue handles retries; map exit cancels pending
requests and releases decoded images/textures. There is no new animation loop,
particle pool, light or audio source. Distance hysteresis changes visual detail;
physics does not change with distance or quality.

The ship follows the local seabed normal and samples its entire final surface for
placement, permitting only 0.35 m of sediment overlap at the lowest point. Its
902 merged surface-voxel boxes follow real triangles with a 1.2 m cell size;
there is no invisible whole-hull box. Four column profiles use 20 fitted slices
each. The region now has 1,191 colliders versus 459 before, so collision precision
has an explicit CPU-side cost. Environment geometry buffers including the new
far levels rise from 29,579,676 to 30,403,492 bytes in the Node inventory; this is
not a GPU memory measurement. Terrain and coast triangle totals are unchanged.
Two 1k RGBA textures with mipmaps imply roughly 10.7 MiB additional GPU storage
before driver-specific allocation; this is an estimate, not measured VRAM.

The central hull is open rather than a closed explorable cabin. Juveniles can
approach the lower ribs; adult bodies enter and leave above the broken gunwale.
Do not describe water above a complete deck as an interior route.

## Verification and delivery evidence

- Raw and simplified colour/clay inspected from both sides, top and underside.
  Matched before/after game views are in `before/` and `after/`; normal-distance
  and closer final views are in `movie/`.
- 11 focused map/ruin tests pass. A first full run found the pressure-hazard
  overlap; after the scoped relocation, 17 hazard/ruin checks and all **2,069**
  full tests pass. Original failed results remain alongside the corrected run.
- Swept collision tests move 3/16/30 m bodies in both directions through the
  broken-gunwale route, sample visible hull centroids against physical solids,
  and check full-surface terrain fit. The existing grown-body gateway routes,
  ecology, supplies and region checks still pass.
- `live/report.json`: a real 30 m player enters and returns using ordinary game
  movement from an initial staged location, with no stuck frame. Pause freezes
  the world. Region exit releases all ten audited geometry/material/texture
  objects exactly once; reentry restores both materials and 324 current animals
  (323 ordinary plus the rare spawn), without browser errors.
- `texture_failure/report.json`: explicitly blocked ship texture retains coloured
  geometry, then an online retry replaces it with the correct texture. Both new
  textures are blocked during the scenario; the recorded recovery assertions
  specifically inspect the ship.
- The first short performance sample overlapped the automated suite and is kept
  as a contended observation, not a clean performance baseline. Final isolated
  measurements and production delivery receipts are appended below.
- Repository-wide formatting reports 20 pre-existing warnings in previous
  uncommitted Odyssey assets/documentation. This batch's code, generated JSON
  and new review are formatted; previous accepted files are not rewritten just
  to erase unrelated warnings.

All browser checks are native desktop Chrome. A 390 px production layout check
is desktop emulation, not a physical-phone performance claim. Formal main/Pages
remain v0.11.21; this batch only updates the existing restricted candidate preview.

### Final candidate receipts

The isolated native run (no build, suite or encoder running) covers three sites
in both High and Smooth. Frame-interval medians are 16.6–16.7 ms, p95 18.1–18.6 ms,
at a 60 Hz cap; median submitted calls are 124–167. High uses DPR 1 and Smooth
DPR 0.8 at a 1280 × 800 desktop viewport. This short observation is not a paired
speedup claim or evidence of mobile thermals.

Production build and scoped formatting pass. All 919 dist/runtime artifact hashes
match (289,777,324 bytes). Thirteen changed artifacts are freshly fetched and
hashed from both the local restricted server and the public tunnel; 906 unchanged
public files retain the previous batch's dated verification. Eleven private paths
per origin remain denied. Existing dev/preview/awake/tunnel processes retain their
identities. The public entry is `index-BFRebRp_.js`.

Native public English 1280 px and Chinese 390 px flows exercise start, steering,
boost, both quality settings, pause/resume and return/reentry. Both new textures
load through normal regional entry, with no production debug hooks or page errors.
The first public-check attempt had a Python harness syntax error before any page
interaction; its corrected successful run is retained separately.

Source preservation: 2,010 of 2,018 previous inputs remain byte-identical. Eight
existing files change (three entry documents, expansion review, Odyssey landmark
and ocean modules, the one regional hazard anchor, and the stage-name assertion).
Twelve files are added. Prior creature models, ecology, terrain, coast and personal
Skills are unchanged. See `source_preservation.json` and `final_fingerprints.json`.

The delivered H.264 video is 31.57 seconds, 1280 × 800 at 30 fps, with labelled
observer shots and an ordinary follow-camera entry segment. The encoded output
was inspected. Screenshots and delivery message IDs are recorded in the local
`movie/` and `delivery.json`. Candidate preview:
<https://saver-recorded-digit-could.trycloudflare.com/?preview=odyssey-ruins-20261028>.

The user subsequently accepts this group for continuation and requests the deep-strait batch. All Odyssey changes remain uncommitted/unpushed.
