# Mariana survey fleet redraw — 2026-10-24

The user accepts the refuge batch and asks for the next batch, specifically the
surface boats. The regional inventory identifies two unredrawn procedural ships:
a 68 × 14 m research vessel and a 22 × 5.8 m survey tender. Existing accepted
Hawaii, Atlantis and Bermuda ships remain unchanged. The current agent produces
this candidate independently; it awaits visual review, without commit or push.

## References and actual production

The working-deck, survey and ROV roles of [NOAA's Okeanos Explorer](https://oceanexplorer.noaa.gov/okeanos/about/)
inform an original research-fleet design, without copying insignia or ship names.
Original generated concept images condition two actual Hugging Face
[TRELLIS.2](https://huggingface.co/microsoft/TRELLIS.2-4B) exports. Concepts are not
presented as finished game screenshots. Both first attempts export valid GLBs;
original files, quota receipts, source hashes and six-view/clay inspections remain
in `.local/mariana_fleet_hf_20261024/`.

The research ship combines a navy hull, ivory bridge, muted red keel, aft yellow
A-frame, winches, rescue boats and radar mast. The tender has a deep teal hull,
ivory wheelhouse, rubber rubbing strake, compact aft hoist and cable drum. Each
has a modeled underside. Small rails and equipment are surface detail, not new
individually interactive objects or enterable interiors.

Only included [ZeroGPU allowance](https://huggingface.co/docs/hub/spaces-zerogpu)
is used. At 23:27:57 Beijing time on October 24, the API reports 1,835.796412 of
2,400 seconds remaining, zero overquota usage and reset at October 25 17:58:07.
This dated observation is not a promise of a future live balance.

## Runtime integration and preserved behavior

`prepare_mariana_fleet_hf_asset.mjs` welds temporary seams, simplifies geometry,
transfers oriented source normals and rebakes source color to new UVs. Both
runtime textures are 1024 square. `fit_mariana_fleet_hf_asset.mjs` fits the beam,
original two-meter draft and inspected working-deck/bridge heights offline, with
inverse-transpose normal correction. Forward is local negative Z; runtime scale
is uniform. Opaque rough materials retain source-derived vertex colors during
loading or failure. The shared lease cache releases geometry, material and
texture only after the last fleet owner leaves.

Only the vessel renderer inside `mariana_surface.js` changes. The original two
ships' lengths, widths, positions, bob/roll, headings, wakes, hull/deck contacts,
impact thresholds, sinking, reset, bird anchors and gameplay remain unchanged.
All 25 contacts and 120 sampled poses match the archived implementation exactly.
The three observatory buoys retain exact geometry and material values. The sky,
other regions, refuge residents, progression, population and rewards are intact.
Collision remains the original conservative hull/deck proxy, not triangle-perfect
collision for every railing or antenna.

## Cost and verification

| Vessel renderer                         | Before | Candidate |
| --------------------------------------- | -----: | --------: |
| Meshes, excluding common impact effects |     14 |         2 |
| Triangles                               | 16,360 |    29,351 |
| Research triangles                      |      — |    17,474 |
| Tender triangles                        |      — |    11,877 |

New model JSONs total 1,410,932 bytes and compressed color textures total 718,024
bytes. Two decoded RGBA images require about 8 MiB; their mipmapped GPU storage
is about 10.67 MiB per context. Draw submissions decrease but geometry and texture
cost increase. This is an appearance improvement, not a measured phone-performance
or thermal improvement.

- Four fleet tests cover finite/unit normals, the fitted hull/deck and underwater
  surface, fallback colors, independent instances and last-owner disposal.
- 36 relevant fleet/impact tests and all 1,683 project tests pass; formatting and
  production build pass before preview delivery.
- Native Chrome exercises normal menu entry and automatic textures, three complete
  region-change cycles with all six tracked resources disposed once, pause, Home,
  deliberate texture failure and normal online-event recovery.
- Matched before/after views use the real populated Mariana scene. Short clips use
  a staged observation camera while real game time drives ships and birds. A
  separate 18 m player traverses near the hull with ordinary follow camera and
  sprint input. Desktop narrow-screen checks are not physical-phone testing.
- `contract.json`, `asset_cost.json`, `native/report.json`, `world/report.json`,
  `world/photos_report.json`, `delivery/` and the generation/conversion receipts
  retain the actual evidence. The initial paused screenshot capture cleared its
  drawing buffer; the capture script was corrected and new images inspected.

Public artifact hashes, bilingual native production flow, same-address reload and
source-path denial are recorded in `artifacts.json` and `public/report.json` after
the restricted preview rebuild. Services retain their existing identities. The
formal release remains v0.11.17 until separately authorized.

## Completed restricted-preview delivery

The same preview origin serves `index-D-okBK7K.js`. All 489 artifacts, totaling
124,689,824 decoded file bytes, match dist/local/public SHA-256 values. Both
origins reject 52 tested source/private paths. Four English-desktop/Chinese-390px
native Guide/start/ability/pause/Home flows, both ship textures and same-address
reload pass with no browser errors or production debug hook. Existing preview,
DEV, awake and tunnel process identities remain intact.

The source audit retains 1,446 of the prior 1,451 input files byte-for-byte. Only
three current entry documents, the refuge acceptance note and the Mariana vessel
renderer differ; nine new fleet-specific files complete this batch. Final evidence
includes `source_preservation.json`, `final_fingerprints.json` and `delivery.json`.
The user still needs to review this fleet's appearance; the previous refuge is
accepted. No commit or push was performed.
