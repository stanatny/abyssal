# Mariana fossil relief candidate — 2026-10-24

The user resumes after the included HF quota resets. The current agent independently
continues the [earlier interrupted trial](mariana_fossil_trial.md) on
`art/mariana-hf-redraw`, based on `1ae99d5` / v0.11.17. This is a new visual
candidate for review, with no commit, push, release or billing change.

## Actual source and conversion

Fresh allowance at 17:57 BJT was 2400/2400 seconds with zero overage. The old
session could not export (TypeError). A fresh generation was cancelled; the next
ordinary retry succeeded with the retained original concept and seed 744281.
The actual TRELLIS.2 GLB is 3,317,656 bytes, SHA-256
`5640e6a48273428d74adc2546ec4dd3b897d0647fa30bd74fce1015927fccfdd`.
Generation/export receipts and rejected conversions remain in
`.local/mariana_fossil_finish_20261024/`. The original concept came from built-in
image generation; the actual mesh comes from HF, not from a procedural substitute.
Current Space/model revision and MIT license checks are recorded with the receipt.

The raw 98,418-triangle export has overlapping thin layers. Direct simplification
made narrow black slits visible in neutral clay, so changing normals alone was
insufficient. The final offline conversion samples the source slab's top and
bottom surfaces into a closed height-field mesh, then reduces it to 3,500 triangles.
This is specific to a low solid fossil slab and is unsuitable for animals or
enterable buildings. Original-source color is projected into new UVs; the common
rebaker now accepts an optional projection limit while retaining its existing
0.05 default for every earlier caller. The repaired interior/sidewall uses a 0.12
limit (measured mean 0.00104, 99th percentile 0.00327, maximum 0.08035 normalized
units). It is a solid retopology repair, not exact preservation of the raw topology.

The final texture is 512×512, 54,390 compressed bytes. One decoded RGBA texture
costs 1 MiB before mipmaps per WebGL context. Original HF color also supplies
vertex-color fallback during a network failure. Final neutral clay, textured,
front/side/back views are archived; rejected variants are not delivery evidence.

## Integration boundary

- Replace 35 small sediment ornaments, seven at each of five existing aprons.
  Preserve X/Z anchors and yaw; use uniform 4.2–5.5 m scales and sample actual
  rendered support triangles to embed each complete lowest base by at least 0.43 m.
- Remove only the old ornaments' 35 short luminous midribs: these protruded like
  pale handles through the replacement slabs. All large sculpture inlays remain.
- Keep large guardian sculptures, terrain, floors, routes, colliders, obstacles,
  lights, populations, rules and preceding coral/fan candidate unchanged. This is
  a fantasy fossil detail, not a scientific locality claim or a whole-map redraw.
- Share one geometry/material/texture in five InstancedMeshes, under existing
  depth/frustum culling. No new frame loop, collider, light or gameplay behavior.
  Scene teardown owns instance buffers; last asset reference owns shared disposal.

## Verification and cost

This round's 13 focused tests pass: real support, solid edge orientation, finite
normals/UVs, shared ownership, cancelled construction, frozen surrounding geometry
and colliders, and 32 m routes/turns. The baseline oracle itself is unchanged;
only exactly identified old small ornament and midrib tails are excluded.
Earlier batches' full-suite totals are not presented as a new run.

Native Chrome normal entry loads the texture. Forced network failure keeps a
shaped colored fallback; the normal online event restores the texture. Pause and
return to menu work; each of six tested map exits disposes the fossil's geometry, material,
texture and five instance objects exactly once. Whole-game cache counters are
recorded separately and are not claimed to become empty.

| Matched populated view | Draw calls before → after | Triangles before → after |
| ---------------------- | ------------------------: | -----------------------: |
| Upper close            |                   72 → 84 |        860,156 → 910,470 |
| Middle close           |                   78 → 81 |        950,110 → 976,856 |
| Deep close             |                   68 → 69 |        791,458 → 813,116 |
| Middle wide            |                   80 → 83 |        962,870 → 989,616 |

These include the render pipeline under matched camera/lighting with both old and
new oceans resident for comparison. Their memory numbers are not an independent
baseline. Detail adds rendering work; no physical-phone speed or heat improvement
is claimed. The video uses a labeled observation camera in the populated game,
with a separate normal follow-camera movement check.

The production build and formatting check pass. All 454 built artifacts
(114,065,247 bytes) are compared byte-for-byte at local and public restricted
origins; denied source/private routes remain inaccessible. Native production
English 1440 px and Chinese 390 px runs cover Guide/start/ability/pause/Home,
request the fossil texture successfully and refresh the same URL. Production has
no development hook. The 390 px case is desktop touch emulation, not a physical
phone. Services retain their recorded process identities.

The candidate preview is `https://saver-recorded-digit-could.trycloudflare.com/`,
entry `index-CjiVUVNM.js`; formal main/Pages remains v0.11.17. Candidate delivery
screenshots/video and message receipts are retained in the ignored evidence folder.

## Included quota after completion

A fresh check at **2026-10-24 18:24:53 BJT** returned **2339.595102 / 2400
included seconds**, zero paid overage, resetting at **2026-10-25 17:58:07 BJT**.
This turn consumed about 60.40 seconds including failed attempts. Waiting time
and the export reservation are not actual GPU execution usage.

The final six-cycle ownership run warms from 243 geometries / 217 textures to
254 geometries / 219–220 textures on Europa, with the final two samples equal.
All eight fossil-owned objects are released exactly once on each exit; shared
game caches remain. This scopes the result to the new asset and observed cycles.
