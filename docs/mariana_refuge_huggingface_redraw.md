# Mariana warm refuge buildings — 2026-10-24

The user authorizes the proposed bottom-refuge batch with “可以，优化吧”.
Four buildings and their plaza receive a visual pass. The three residents,
accepted guardian bays, pit walls, ecology, rewards and victory rules stay intact.
The current agent works independently. This candidate awaits the user's visual
review; no commit, push or personal Skill changes are part of this task.

## Actual production and review

Four image-conditioned TRELLIS.2 exports replace the procedural pineapple house,
stone-face house, rock house and barrel-roof restaurant. Generated concept images
are inputs, not evidence of finished game models. Original GLBs, generation and
quota receipts, conversion outputs and native screenshots are retained under
`.local/mariana_refuge_hf_20261024/`.

The [TRELLIS.2 model](https://huggingface.co/microsoft/TRELLIS.2-4B) is published
under MIT. Included [ZeroGPU allowance](https://huggingface.co/docs/hub/spaces-zerogpu)
is checked before generation and export. The first stone-face export is rejected
because it has two opposing face facades. A new single-facade concept and second
actual export correct that error; the rejected original remains archived.
Front, back, both sides and clay renders of the selected GLBs are inspected.

`scripts/prepare_mariana_refuge_hf_asset.mjs` welds temporary source seams before
simplification, transfers source normals and rebakes source albedo into fresh
UVs with the existing offline ship baker. Runtime meshes use uniform scaling,
opaque rough materials and same-source vertex colors while textures load.
No random recoloring or moving transparent overlays are used.

| Building   | Selected attempt | Final triangles | Appearance                                                                 |
| ---------- | ---------------- | --------------: | -------------------------------------------------------------------------- |
| Pineapple  | 01               |          11,830 | Golden rind relief, layered leaf crown, recessed door and circular windows |
| Stone-face | 02               |           9,939 | Single carved face, mineral stone, framed eye windows and plain solid rear |
| Rock house | 01               |           7,944 | Low weathered dome, mineral bands and attached recessed entrance           |
| Restaurant | 01               |          11,889 | Timber barrel roof, metal ribs, portholes and shell ornament               |

`src/mariana_refuge_asset.js` owns cached geometry/material/texture resources with
reference-counted release. `src/mariana_refuge_buildings.js` fits each asset to
its existing plot. `src/mariana_refuge_paving.js` supplies opaque limestone paving,
restrained stone variation and the central teal ring. Foundations and arch stone
receive static surface detail. Five low stone terraces replace the abrupt plaza
edge; their rendered boxes and contacts use the same dimensions.

## Geometry, contacts and preservation

The old pineapple foundation expands from 28 to 34 m square to support the new
steps. Other foundation positions remain unchanged. Each building's contacts
are baked from its actual simplified surface at 0.075 normalized-length cells,
then transformed by the same uniform scale and pose. These are conservative box
approximations, not exact triangle collision or newly enterable interiors.
Twenty low edge contacts follow the stone terraces. Other old map contacts,
landmarks, gates, hazards and gameplay data remain unchanged.

The existing 160 × 170 m central plaza is retained. The outer terraces extend it
12 m on each side; their top descends from 5 to 1 m above the local origin, with
the lower portion embedded in the seabed. The final arrival sphere, full 32 m
central route, all-heading turning loop and residents' foot support are checked
against the actual final rendered geometry and collision system.

The sponge, starfish and snail retain exact geometry, material values and poses
across 60 sampled animation times. The three warm light sources and all refuge
landmark records are also exact. This batch does not claim a resident redraw.

## Measured cost and lifecycle

| Whole refuge                   |    Before | Candidate |
| ------------------------------ | --------: | --------: |
| Meshes                         |        32 |        31 |
| Triangles                      |    56,940 |    68,278 |
| Geometry attribute/index bytes | 2,412,168 | 2,453,826 |
| Materials                      |        20 |        24 |
| Local contact solids           |        48 |     1,373 |

Four 1024-square color textures add 1,258,382 compressed input bytes, approximately
16 MiB of decoded RGBA bitmap storage and 21.33 MiB of mipmapped GPU storage per
context. The model JSONs total 1,724,636 bytes; contact data adds 144,528 bytes.
The contact increase is deliberate for actual irregular surfaces and uses the
existing static grid. This is an art upgrade with added texture/contact cost,
not evidence of improved phone speed or thermal behavior.

## Current verification and limits

- Nine focused refuge/preparation checks pass, including full footprint support,
  actual sampled surface contact, 32 m transit and turn clearance, unchanged map
  contracts and shared last-owner disposal. Obsolete procedural-shape fixtures
  are replaced by tests of the new actual meshes.
- Full suite: 1,679 passed, zero failures. This count does not imply aesthetic
  acceptance and differs from the previous batch after replacing old fixtures.
- Native desktop Chrome: normal automatic texture loading, three Mariana → Europa
  lifecycle cycles, start/pause/Home, 12 new resources disposed exactly once each
  cycle, all-four texture failure fallback and recovery through the ordinary
  online event pass without page errors.
- A 30 m player traverses the central approach using actual sprint input and the
  ordinary follow camera after a staged initial placement; no per-frame motion
  override. Separate observation cameras show matched before/after views and
  a six-view game video. The observation video is not free gameplay footage.
- The desktop narrow viewport is not an actual phone test. Existing physical-phone
  follow-up remains open. Building interiors and the next resident batch are
  outside this delivery.

At 22:50 Beijing time on 2026-10-24, a fresh receipt reports **1,909.126053 of
2,400 included seconds**, zero over-quota usage, and a returned reset near
2026-10-25 **17:58 Beijing time**. This is a dated observation, not a permanent
balance. No paid excess was used.

## Restricted preview delivery

The preview is rebuilt at the same origin:
[temporary playable build](https://saver-recorded-digit-could.trycloudflare.com/).
Entry: `index-Bk1l40Y3.js`. All **483 artifacts / 121,752,270 decoded bytes**
match local dist, restricted localhost and public responses byte for byte.
This counts the complete build, including precompressed sidecars, not initial
page-transfer bytes. Forty-nine source/config/debug paths per origin are denied.

English 1440 px and Chinese 390 px native Guide/start/ability/pause/Home flows
pass, all four new textures load, no production debug hook exists, and same-URL
refresh loads the new entry. The narrow desktop case is not a physical phone.
All four service process identities remain unchanged and the tunnel is ready.

Of 1,436 baseline inputs, 1,430 remain byte-identical. Only the three project
entry documents, refuge builder and its two relevant tests change; new files are
explicitly inventoried. Original HF sources and rejected attempts remain private.
Final source/build hashes, resource receipts, observation video, actual adult
traversal and source-preservation evidence are saved in the batch directory.
Format check and build pass. The final videos decode completely and their frames
are visually inspected. No commit or push; main/Pages remain v0.11.17.

## User acceptance and next batch

The user accepts this appearance with “可以了，下一批吧，感觉海面上的船是不是可以优化”. The original pending labels above describe the earlier delivery stage. Surface research ships are the authorized next batch; residents remain deferred. No commit or push is requested.
