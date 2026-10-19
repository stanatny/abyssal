# Mechanical Shark hard-surface redesign — 2026-10-19

Superseded for design/palette acceptance by [the cinematic redesign](mechanical_cinematic_revision.md). The user explicitly allows abandoning this shape and blue palette, retaining missile launch and rocket boost presentation. This candidate and its evidence remain preserved.

The user rejects the rounded V2 hull as a biological shark with painted decoration and explicitly allows abandoning the previous design. Preserve that candidate and its receipts for comparison; the new target is a purpose-built angular machine. Work remains uncommitted on `art/mechanical-hf-redraw`, after local checkpoint `6b7cb70`. The current AI agent works alone. No gameplay changes, push or personal Skill changes.

The new design must read mechanically without textures: a chisel-shaped sensor nose, broad flat/chamfered fuselage planes, thick straight-edged hydrofoils, visible root bearings, compact separated posterior drive segments and a rigid angular caudal assembly. Avoid a smiling organic jaw, rounded cheeks or cosmetic lines on a curved animal body. Preserve the accepted navy/sky-blue palette as separate material roles, with restrained sensors and soft waterjet effects. Use a completely new original reference and included-quota HF reconstruction, then inspect the actual exported clay mesh before integration. Generation does not establish geometric quality or valid swimming.

Preserve all movement/feeding/torpedo contracts, including length, payment, cooldown, damage and mouth/muzzle anchors. Refit pivots/weights to this actual geometry, keep whole rigid fins/blades supported, verify pose continuity and do not use a bent rest tail. Use the shared Guide/world factory and existing clock, with finite shared immutable resources and independent instance state. Retain original services, archived worktrees, other characters and the formal main release.

Production evidence: `.local/mechanical_hardsurface_20261019/`. The implemented candidate and its measured limits are recorded below; user design acceptance remains pending.

## Implemented geometry and motion

A fresh original reference and one HF generation/export produced raw mesh SHA256 `99714bc7c15c32011a9ce2d148b0cc6e83badfcb3183f87683cc858d73605f12`. Its actual gray-material views show a wedge nose, straight-edged stabilizers, planar main hull, deep separation at the posterior drive and physical bearing assemblies. These features remain when both color and surface maps are removed. The previous rounded V2 model, source assets and receipts remain preserved; it is superseded for design acceptance.

`scripts/prepare_mechanical_hardsurface_asset.mjs` reduces/quantizes the export, straightens its measured lateral tail drift and restores bilateral symmetry. The generated wings originally spanned nearly the whole body length; their outer portion is compressed in the transverse/vertical plane while retaining the complete bearings and the existing full-motion passage envelope. Normals follow the inverse-transpose deformation, not the previous candidate's correction curve. Runtime skin:64,714 vertices,50,442 triangles; all quantized normals remain unit length within normal encoding tolerance.

The seven-support rig is refitted to the new mechanical joints. The main hull stays rigid; the whole posterior drive compartment is supported as one segment, followed by couplers and one support for the complete caudal blade. Each outer pectoral board stays rigid and rotates about its real root. Narrow root/coupler blends preserve continuous sealed surfaces. The two waterjets, their rotors and their soft plumes now attach to the moving rear compartment; they do not remain on the stationary front hull. Small hexagonal bearing caps and fitted thin sensor strips replace the previous protruding round accents. Sensors follow measured hull intersections. The existing feed hinge, mouth point, ventral muzzle, payments, cooldown and damage remain unchanged.

Navy/sky-blue satin material roles and finite effects are preserved. No new lights, postprocessing passes, texture count or independent runtime loop. Both languages describe the wedge head, faceted armor and mechanical drive. The locally retained V2 assets are no longer part of the production import graph.

## Verification and resource tradeoff

All evidence is under `.local/mechanical_hardsurface_20261019/`.

- `tests_full.log`:1,324/1,324 pass on the final runtime implementation; formatting and build pass. The existing large-bundle warning remains. The new regression measures rigid distances across the actual posed tail compartment and both wing boards, and verifies both plumes remain coincident with their moving engine exits. Existing tests retain3/15/30m bounds, complete caudal preservation, neutral centering, fin excursion/sprint sweep/turn trim, jaw/muzzle, UV seams, pause/reset, disposal and ability rules.
- `review.json` / `views/`:matched V2/new cameras and lights, material and neutral-clay comparison, both sides/front/underside, cruise/sprint/turn/pitch/release; native gameplay at shallow/deep positions, actual skill payment/flash, pause/Home and Chinese390px Guide. Zero browser/shader errors. Staged positions and invulnerability are inspection fixtures, not natural progression.
- `film.json` / `mechanical_hardsurface.mp4`:31-second fixed-observer actual-model comparison, single controlled render loop after suspending the normal Guide loop. H264 output frames were decoded and checked. Separate world screenshots retain the ordinary follow-camera travel scope.
- `lifecycle.json`:four Guide/start/sprint/fire/pause/Home cycles retain shared candidate geometry/textures and distinct Guide/world skeletons. Guide stays13 geometries/7 textures. The ecological world cache warms339→369→385→385 geometries and202→208→211→211 textures; this is not a claim that every world allocation is constant from the first frame. Either color or surface failure leaves the full opaque blue model and no half-loaded texture state.
- `populated_resources.json`:same frozen Hawaii scene,517 entities, composed calls72→72 and triangles321,582→335,874 compared with V2. The extra geometry is an explicit quality cost, not a performance improvement.

| Resource                         | Rounded V2 | Angular candidate |
| -------------------------------- | ---------: | ----------------: |
| Meshes including dormant effects |         14 |                14 |
| All triangles including effects  |     45,608 |            52,754 |
| Geometry/material objects        |       9 /8 |              9 /8 |
| Main skin vertices               |     49,081 |            64,714 |
| Surface textures                 |   2 ×1024² |          2 ×1024² |
| WebP transfer bytes              |    482,608 |           422,516 |
| JS bytes                         |  6,110,209 |         6,507,580 |
| Local gzip9 JS bytes             |  2,632,207 |         2,815,900 |

Combined gzip-JS plus WebP transfer increases123,601 bytes. The two texture uploads retain approximately10.67MiB per context; geometry buffers increase with the new vertex count. Shared JavaScript textures can still upload separately to Guide/world contexts. No physical-phone, M4 thermal or FPS claim is made.

The provider receipts record2229.800882→2189.660437 included seconds,40.140445 seconds consumed, zero overage. Recheck before another request; no top-up, alternate identity or paid overflow was used.

## Candidate delivery

The original restricted preview is updated at `https://saver-recorded-digit-could.trycloudflare.com/`, entry `index-C4eED48s.js`. All17 current files match build/local/public hashes;11 private/source paths per origin remain denied. Native public bilingual Guide/start/sprint/skill/pause/Home and same-address refresh are checked separately in `public/report.json`; production debug access stays absent. The narrow run is desktop touch emulation, not physical-phone testing.

Original DEV35213, restricted server35216, awake35218 and cloudflared35419 identities are preserved. Use the existing `.local/mini_preview_20261007/manage.py status` or `rebuild`; archived runtime remains available and there is no reason to stop the existing services. No commit/push, version change, personal Skill update or edits to other creatures. HEAD remains local checkpoint `6b7cb70`; this replacement awaits the user's design review on the same branch. Final source/build fingerprints and delivery receipts are retained beside the evidence.
