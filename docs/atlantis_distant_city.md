# Atlantis distant city — 2026-11-01

Status: accepted for the authorized v0.11.25 main publication, following
v0.11.24 (`4cd7b18`). See [the integration record](release_v0_11_25.md).
The verification below records the original candidate review.

## Behavior

At a high underwater viewpoint, the royal district previously disappeared:
32 architectural chunks were hidden outside 350 m (High) / 275 m (Smooth)
horizontal range, and the main temple outside 430 / 350 m. Shallow-water fog
also concealed the city even when geometry was present.

The original meshes, transforms and cutoffs remain. Each hidden chunk now has
one indexed, untextured silhouette made by clustering its real geometry;
roofs, towers, colonnades and gateways retain their actual placement. A 33rd
batch represents the main temple above the surface-level foundation. Furniture,
crypt contents, collisions, encounters, puzzle rules and moving statue bindings
continue to use their existing systems. The animated Poseidon statue is not
duplicated as a static proxy.

Both architectural layers share a distant haze treatment: the original fog is
unchanged within 150 m view depth, blending toward a 0.00145 skyline density by
300 m. Additional ink density is retained, using the same depth/city-light
calculation as the environment. Terrain and water still depth-occlude buildings;
creatures and global fog are not made clearer. This is an underwater overview,
not transparent water from above the sea or a through-wall view.

Far buffers occupy approximately 4.9 MB, with fewer than 290,000 triangles
across the whole city, under 6% of their source geometry. There are no new
textures, lights or shadows. Preparation yields between source meshes, releases
intermediate caches, and restores reference-counted material hooks on disposal.
LOD replacement retains the original district boundaries; it is not a new
continuous geometry-morph system.

## Verification

- 309 Atlantis and scene-preparation tests pass. The frozen baseline still
  matches original collision/obstacle data and retained near geometry byte for
  byte. Only the new distant root is excluded from the near-geometry digest.
- Added coverage/buffer-budget checks for all chunks and the temple, both
  quality settings, high and near viewpoints, and cancellation during partially
  built far geometry. Existing repeated-disposal/shared-resource tests pass.
- Native desktop rendering compared in the same Chrome tab at 1280×720, DPR 1,
  with 562 entities and normal game simulation. Each row uses baseline →
  candidate → baseline, 60 warm-up frames and 150 sampled frames per leg. A
  controlled camera follows the same viewpoint; player motion and AI continue.
  Baseline is the same scene with the added layer disposed and its shader hooks
  restored, preserving the original near visibility rules.

| Quality / view         | Frame ms: baseline → candidate | CPU render ms | GPU ms      |
| ---------------------- | ------------------------------ | ------------- | ----------- |
| high / high_overview   | 16.67 → 16.67                  | 3.86 → 4.16   | 7.11 → 6.53 |
| high / near_avenue     | 16.66 → 16.67                  | 2.59 → 2.45   | 8.50 → 8.42 |
| smooth / high_overview | 16.66 → 16.67                  | 2.24 → 2.20   | 6.34 → 6.28 |
| smooth / near_avenue   | 16.66 → 16.66                  | 2.30 → 2.40   | 4.73 → 4.83 |

Both versions remain around 60 FPS in these desktop samples. GPU/CPU changes
are small relative to run-to-run variance; this does not establish zero cost or
mobile thermal/battery performance. This adds visible city detail to formerly
empty distance, not an FPS speedup claim.

Screenshots and the overview-to-temple clip use the actual renderer with a
controlled, paused observation camera. They are visual review footage, not a
claim of manual gameplay. Near details, silhouette occlusion and ink obstruction
are reviewed separately. Local evidence, exact benchmark samples, captures and
preview verification live under `.local/atlantis_distant_city_20261101/`.

Production preview is rebuilt at the existing restricted origin. Local and
external asset/native checks are recorded in the local evidence directory;
public preview access is distinct from main/GitHub Pages publication. The same
309 tests were rerun after composing the skyline fog around existing stone fog
callbacks, preserving their near appearance rather than replacing it.

A retained weak-keyed uniform object also survives scene reentry: Three can
reuse a compiled material program after layer disposal, so reacquiring the
material must update the exact uniform referenced by that program. A dedicated
regression covers changing shallow/deep positions after disposal and reentry.
