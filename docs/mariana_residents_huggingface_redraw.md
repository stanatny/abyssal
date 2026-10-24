# Mariana refuge residents — 2026-10-25

## User acceptance and remaining-scope review

On October 25, the user says “可以，看看还有什么需要优化的”, accepting the
delivered residents and requesting a remaining-work review. The candidate
description below is the original delivery history. The residents are now
accepted, without a new commit/push instruction. See the
[current remaining-scope review](mariana_remaining_scope_review.md) for the
depth-aware preparation opportunity and optional minor scenery finishing.

## Original candidate delivery

The user authorizes the three remaining decorative residents after the final
Mariana scope review: the yellow sponge, pink starfish and pet snail. The current
agent implements this batch independently on `art/mariana-hf-redraw`. This is a
visual candidate awaiting the user's review, without commit or push. The existing
fleet and other uncommitted Mariana batches remain preserved.

## Production and local finishing

All three bodies are actual [Microsoft TRELLIS.2](https://huggingface.co/microsoft/TRELLIS.2-4B)
exports. The snail uses a generated reference image. The sponge and starfish use
screenshots of locally revised repository geometry after the concept-image
service returned no image. The initial sponge export was rejected for missing
pores and poor hand detail; a corrected reference and a new export replace it.
Cancelled server jobs and rejected candidates remain archived, not counted as
successful assets. Selected originals are `sponge_attempt_04`,
`starfish_attempt_02` and `snail_attempt_02` in
`.local/mariana_residents_hf_20261024/`.

The sponge now has actual recessed pores, modeled eyes, teeth and waving hand.
The generated export omitted its white waist shirt, so a closed, rounded cloth
piece and small red tie restore the connection between torso and shorts. The
starfish has a continuous pointed head/torso and soft arms; source color mismatch
is corrected locally, with a smile sampled onto the actual facial surface. The
snail has a solid spiral shell, fleshy foot and connected eye stalks. These local
repairs are disclosed rather than presented as perfect raw generation.

`prepare_mariana_resident_hf_asset.mjs` welds source UV seams before reduction,
normalizes orientation, creates a new atlas and rebakes original colors.
`finish_mariana_resident_hf_asset.mjs` reconstructs continuous normals across UV
islands; the source-normal nearest-point transfer produced visible triangular
lighting artifacts and was rejected. Three 1024-square runtime textures retain
source-derived vertex-color fallback during download/failure.

Only included [ZeroGPU allowance](https://huggingface.co/docs/hub/spaces-zerogpu)
was used. A fresh API query at **00:38:38 Beijing time, October 25** reported
**1,389.528455 / 2,400 seconds**, zero overquota usage, with reset at
**17:58:06 Beijing time, October 25**. These are dated observations, not a live
balance guarantee. Raw exports, reference hashes and generation receipts remain
local; credentials and private export URLs are not published.

## Runtime behavior and costs

`mariana_resident_asset.js` owns refcounted geometry, materials, texture preparation
and small face/clothing detail meshes. `mariana_residents.js` creates independent
three-bone skeletons per resident and scene. Idle motion is deliberately gentle:
a greeting wave, small starfish arm movement and slightly offset eye-stalk sway.
Root, torso support and feet do not bob off the plaza. Equal animation time
freezes the pose; hidden refuge updates return early.

All three positions, static contact definitions, refuge landmarks, lighting,
completion sphere and approach routes remain unchanged. All **1,373 refuge
contacts**, three light sources, landmarks and **11 non-resident render meshes**
match the archived implementation. No ecology, food, progression, combat, Guide
entries, controls or bilingual text changes are introduced.

Measured whole-refuge cost changes:

| Measure                        |    Before | Candidate |
| ------------------------------ | --------: | --------: |
| Mesh objects                   |        31 |        17 |
| Materials                      |        24 |        17 |
| Triangles                      |    68,278 |    85,184 |
| Geometry attribute/index bytes | 2,453,826 | 3,978,866 |

Three new RGBA8 1024 textures require approximately **16 MiB including mipmaps**
per rendering context; three uploaded bone textures total **768 bytes**. Mesh
counts decrease, but triangle and texture costs increase. This is an art update,
not evidence of a physical-phone performance improvement. The existing 4 MiB
refuge geometry limit still holds; the explicit triangle budget becomes 90,000.

## Verification and evidence

- Full suite: **1,685 / 1,685**. Focused coverage samples actual skinned vertices,
  planted feet through complete idle cycles, UV seam continuity, independent
  instance motion, pause, last-owner disposal, and 32 m route/turn clearance.
- Native desktop Chrome: ordinary material loading, deliberately failed texture
  requests and normal online-event recovery pass. Three Mariana/Europa cycles
  release all 15 tracked resident texture/geometry/material resources exactly once.
- A staged 30 m player then follows ordinary native controls and follow camera
  from Z=-335 to Z=-441.62, without per-frame teleporting. After actual rendering,
  all three uploaded bone textures are released exactly once on region change.
- Matched before/after cameras and three idle clips use the real populated refuge;
  inspection cameras and controlled visual clocks are explicitly staged. Final
  MP4s are fully decoded and their contact sheet inspected. Desktop 390 px touch
  emulation is not a physical-phone test.

Evidence is in `.local/mariana_residents_hf_20261024/`: selected attempt receipts,
`raw_review/`, `asset_review/`, `contracts.json`, `full_test.log`, `native/`,
`world/`, `review/` and `delivery/`. Public artifact and normal-flow results are
recorded in `artifacts.json` and `public/report.json`: all **498 artifacts /
127,555,327 bytes** match the build, local restricted server and public preview.
All **55** tested source/private paths are denied. Four normal English-desktop /
Chinese-390px Guide/start/ability/pause/Home flows and same-address reload pass,
with zero browser/resource errors and no production debug hook. All three new
textures return 200. Entry: `index-CcoCYL_k.js`. Existing process identities remain
DEV 35213, preview 23118, awake 23120 and tunnel 35419.
