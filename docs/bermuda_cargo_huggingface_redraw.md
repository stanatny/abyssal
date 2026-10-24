# Bermuda small cargo-wreck redraw

Acceptance follow-up — 2026-10-24: the user says “可以，下一批。看看还有没有其他需要优化的”, accepting this cargo appearance. Its candidate remains intact and uncommitted; the new natural-seabed batch is reviewed separately. This does not authorize a push or extend visual acceptance to the next batch.

## Scope and status — 2026-10-24

The user accepts the lost-aircraft candidate and asks for the next batch. The
current agent independently replaces the small cargo graveyard's procedural
floor/ribs with an actual HF wreck mesh. This is separate from the already
accepted large explorable liner. The new appearance awaits user review; no
commit, push, formal release, personal-Skill edit or delegation is authorized.
All preceding candidates remain intact. Main/Pages remains v0.11.16.

The new low wreck has a corroded bow, torn side plates, actual holes, an open
hold, exposed ribs and a ruined stern wheelhouse. Six scattered cargo trunks
reuse the accepted liner asset at a uniform scale; no extra HF generation was
spent on them. The existing eighteen chain links are seated on the adjacent
seabed. Ecology, rewards, hazards, music, creatures and the large liner are not
changed.

## Source and conversion

An original built-in image-generation concept depicts a fictional small steel
coastal freighter wreck, not a named historical ship reconstruction. That image
alone was uploaded to the authorized [Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2).
The current Space revision is `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`;
[TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B) is
`af44b45f2e35a493886929c6d786e563ec68364d`. Both checked metadata cards report MIT,
which describes software/model licensing, not exclusive rights to every output.

Attempt 01, seed 744201, resolution 1024, completed generation, extraction and
validated GLB download: 4,449,240 bytes, SHA-256
`9105710131f871b52f8aef54e700c964429e5d357c7fca414bc69c26ae0846fb`.
Seven actual material/clay angles were retained; the open hold and torn sides
exist in geometry. The downloaded file remained attached to its live Gradio
session until complete. No provider switch or paid overage occurred.

Included quota was read live before this job: 615.241483 seconds, then
574.054649 seconds after export, with zero over-quota usage. The returned reset
was October 24 at 17:55 BJT. These are dated readings, not future balances.

`prepare_bermuda_cargo_hf_asset.mjs` welds UV-only duplicates, simplifies the
mesh, restores oriented source normals, rotates the bow to local -Z, and
normalizes length. Original HF color is projected onto a new 1024-square atlas;
linear vertex colors provide a textured-color fallback while loading fails.
The final hull has 15,764 triangles and 20,141 UV vertices; uniform scale gives
57 m length, matching the former graveyard's length.

## Placement, contact and traversal

The original horizontal floor was partly buried by the slope. Initial new
placements also collided with existing spires or shelf boulders; their review
images are preserved as rejected trials. The final center is approximately
`(165, -626.525, -952)`, 29.73 m horizontally from the old center. The original
landmark anchor/name/radius remain exact. Terrain and all non-cargo colliders
are unchanged; the wreck and contact shapes share a rigid slope alignment.

Every hull vertex and triangle center was checked against the rendered floor:
minimum clearance is -0.388 m and -0.409 m respectively (shallow sediment seating),
with no vertex buried by one meter. All hull and six trunk vertices clear the
existing rock/spire/vent collision envelopes. Cargo uses iterative whole-mesh
seating rather than a center-height guess.

The old 29 graveyard solids are replaced by 109 offline merged surface-cell
boxes plus six trunk boxes. The biome changes from 126 to 212 colliders. These
2.5 m surface cells are a conservative collision approximation, not exact
triangle physics or a promise that every small rust hole is passable. They
preserve the open hold and the verified larger side breach rather than using a
single closed hull box. Contact baking is offline; there is no per-frame mesh
sampling or new update loop.

Focused full-body checks cover juvenile descent into and exit from the hold,
a clear large side breach, solid bow contact and 3/30 m overhead travel. A
separate native run places the player once above the hold, then uses ordinary
live movement downward and upward: local height reaches 0.879 m and rises to
27.697 m without per-frame position writes. This is staged local traversal,
not a natural whole-expedition playthrough.

## Runtime cost and ownership

The hull is one opaque double-sided draw. Six reused trunks use one instanced
draw, share the liner's geometry/material/atlas, and release their own instance
buffer. The full biome changes from nine mesh draws / 88,526 triangles to eight
draws / 120,464 triangles (including all six instances): 31,938 more triangles.
This adds visual detail and local contact shapes; it is not a performance
optimization or evidence of improved physical-phone frame rate.

New hull attribute/index buffers total 598,109 bytes. Its 1024 RGBA8 atlas with
mipmaps is about 5.33 MiB; packed geometry is 691,189 bytes, WebP 334,998 bytes and
contact data 8,789 bytes. Existing trunk data is reused unchanged.
Normal scene entry prepares materials. Failed texture downloads retain sampled
vertex colors, and reconnect retries the atlas. Reference-counted ownership
prevents one wreck instance from disposing another's shared resources. Disposal
is idempotent and respects the liner's separate trunk lease.

## Verification and evidence

Evidence: `.local/bermuda_batch11_20261024/`.

- Original concept, actual GLB, safe provider/quota receipts, private export
  receipts, fourteen raw renders and conversion reports.
- `review/`: matching-camera old/new views under normal ocean lighting;
  `rejected_site165/` and `rejected_site177/` retain failed placement reviews.
- `audit.json`: whole rendered-floor checks, exact landmark and non-cargo
  contact preservation, and instancing-aware construction costs.
- Four new focused tests; cargo/aircraft/Bermuda suite 21/21 passed.
- Full `npm test`: 1,634/1,634 passed.
- `native/report.json`: normal-entry atlas failure/fallback/online recovery,
  three Bermuda/Hawaii release cycles, 43 actual bow-contact samples,
  pause/Home and Chinese 390px checks, with no browser errors.
- `traverse.json`: actual live entry/exit of the hold after one initial placement.
- The first live observer movie was partially obscured by a nearby lord and is
  retained separately. The delivery movie uses a paused real scene and moving
  observer camera, labeled in-frame; it does not claim natural traversal or a
  new gameplay camera.

Desktop native Chrome is used serially on the M6 mini. Narrow desktop emulation
is not a physical-phone test. Phone heat/FPS and the earlier phone follow-up
remain unverified. This candidate still requires the user's visual acceptance.
The remaining natural reef/rock/vent decoration is separate future work.

## Preview delivery audit — 2026-10-24

`npm run check` and the restricted-preview rebuild passed. Entry is
`index-BSnHU8-E.js`. All 415 build artifacts (106,820,928 bytes, including
compressed companions) matched dist, loopback and the public origin byte for
byte. Twenty forbidden paths returned 404 at both origins; no production debug
hook was present. Native public English 1440px and Chinese 390px Guide/start/
ability/pause/Home flows passed, including the cargo atlas and same-URL refresh,
with no browser errors or failed resources. Existing process identities were
preserved; the former runtime was archived before rebuild.

`source_preservation.json` compares 1,333 previous input hashes: only the biome
integration and five current-review documents changed; all 264 prior assets
remain byte-identical. The final delivery video is a 24-second paused-scene
inspection, 718 distinct frames with no decode errors. The separate live
traversal evidence is not replaced by this observer video. Delivery uses the
existing restricted [preview](https://saver-recorded-digit-could.trycloudflare.com/).
The user has not yet accepted this cargo-wreck candidate.
