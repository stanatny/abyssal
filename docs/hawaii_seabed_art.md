# Hawaii deep-seabed art

Release status: included in the user-authorized **v0.7.2** commit and push to `main`. See [release verification](verification.md) for current checks and deployment acceptance. Local-only authorization statements and earlier candidate measurements below are historical; they do not override the current release instruction.

## Historical review context

Status: scoped art source complete and frozen for owner review on `feature/global-ocean-polish`, based on v0.7.1 / `21cf9a4`. The scoped art assignment itself granted no commit, push, or release authority. The user subsequently authorized the owner to include the reviewed integration in one local commit; no push or release is requested. The integration owner retains camera, terrain shader, ecology, localization, and shared documentation ownership.

## Brief and boundaries

The deep Hawaii floor should read as a volcanic, sedimented habitat. Low, weathered mineral rubble gives the ground scale; rooted, feather-shaped sea-pen colonies provide identifiable living detail. Bright mushroom caps are removed by the integration owner. Minerals remain matte and nonemissive. Sea pens are colonial animals, not underwater plants or fungi.

The visual baseline is the accepted v0.6.10 environment standard, including coherent silhouettes, material variation, actual ocean inspection, resource sharing, and bounded updates. This is a scenery revision: no feeding stock, nutrition, terrain sampler, solid collision, creature behavior, sound, or combat rule changes belong to this module. Small scenery does not substitute for an ecological population.

| Contract       | Implementation                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owned source   | `src/hawaii_seabed_life.js`                                                                                                                                                                                |
| Focused checks | `tests/hawaii_seabed_life.test.js`                                                                                                                                                                         |
| Factory        | `createHawaiiSeabedLife(parent, { heightAt, seed, worldUniforms, clearings })`                                                                                                                             |
| Return         | `{ root, update(time, playerPosition), dispose(), stats, placements }`                                                                                                                                     |
| Region         | Independent seed `73129`; candidate colonies at four transverse positions in seven rows; legal instances within z −220 to −1120, below y −145                                                              |
| Reservations   | Caller-supplied circular `clearings`; each colony reserves a 15 m footprint before placing members. Owner supplies landmarks, volcanoes, and conservative existing-solid footprints.                       |
| Ground support | Sea-pen peduncles and rubble sample the existing height function. Rock bases align to the local slope; support vertices, edge midpoints, triangle interiors, and center are sampled before shallow burial. |
| Traversal      | No new colliders. Exposed mineral height is capped at 1.1 m; existing routes, landmarks, and adult passage remain owned by integration.                                                                    |
| Rendering      | Two shared private geometries and two materials; instanced batches in at most 16 spatial cells. At most eight nearby cells / 16 batches are enabled per update, followed by Three.js frustum culling.      |
| Motion         | Shared shader time drives root-weighted sea-pen sway. No instance-matrix animation, per-instance CPU updates, RAF, timers, or extra lights.                                                                |
| Ownership      | Factory attaches its root. Idempotent disposal detaches it and releases only its private geometry, material, and instance resources. The shared time uniform is retained.                                  |

`placements` records kind, colony, position, scale, exposed height, chunk, and every support sample with terrain height and signed gap. `stats` reports actual construction totals and current enabled batches; enabled batches are an upper bound, not measured draw calls.

## Biological and geological references

- [NOAA: Sea Pen, Puerto Rico 2022](https://oceanexplorer.noaa.gov/multimedia/explorations-22puerto-rico-deepwaters-gallery-media-seapen/) describes sea pens as colonial octocorals whose peduncles anchor into soft sediment. This informed the buried narrow root and branching colony rather than a mushroom cap.
- [NOAA: Collecting Sea Pen, 2021](https://oceanexplorer.noaa.gov/multimedia/okeanos-explorations-ex2107-gallery-media-dive03-sea-pen/) records sea pens on sandy seabed at 1,020 m. This supports a deep sediment habitat, not a claim that the particular modeled form is a verified Hawaiian species.
- [NOAA: Sea Pen, March 2021](https://oceanexplorer.noaa.gov/multimedia/daily-image-media-20210322/) identifies the eight tentacles of octocoral polyps. Small radial eight-tentacle silhouettes terminate the modeled lateral branches.
- [MBARI: Glow-in-the-dark corals light up the deep sea](https://www.mbari.org/news/glow-in-the-dark-corals-light-up-the-deep-sea/) reports light-producing deep corals and sea pens, including waves of light. Only the modeled polyps emit light; the mineral material and sea-pen stalk do not.
- [NOAA: Manganese Nodule](https://oceanexplorer.noaa.gov/multimedia/daily-image-media-20211024/) documents dark nodules on Pacific abyssal plains. The low mineral beds use muted weathered basalt/nodule forms, without crystals, transparency, or intrinsic glow.

This is an original procedural stylization, with no downloaded reference images or models bundled. The reference pages inform anatomy and habitat; they are not texture sources. Persistent weak polyp light, visually readable polyp size, colony scale, distribution, and simplified feather anatomy are game adaptations. Real bioluminescence is not evidence of constant illumination. The larger chunks represent basalt rubble; their dimensions should not be read as biological-sized manganese nodules. This habitat is not a scientific reconstruction of a sampled Hawaiian site.

## Review and evidence

The first populated slice uses the production `createOcean` and `createCreature` factories, with a 3 m Orca for scale. It is a controlled art harness with explicitly staged lighting and cameras, not a gameplay or performance acceptance test. It reuses the owner development server; no separate service was started.

Ignored evidence under `.local/hawaii_seabed_review/art/`:

- `index.html`, `capture.mjs`: reproducible controlled slice and browser capture.
- `close_1440.png`, `normal_1440.png`, `close_390.png`, `normal_390.png`, `report.json`: desktop and narrow close/normal views, with zero page or console errors.
- `numerical_audit.json`: deterministic factory audit with landmark and volcano exclusions. This case produces 25 colonies, 74 sea pens, 196 rubble pieces, 32,356 triangles, 16 cells, and 31 globally allocated batches. Collider-derived reservations may reduce or relocate these counts in the actual region. Exposed rubble height in this case is 0.141–0.567 m.

The initial slice exposed two issues that were corrected before delivery: inward rubble normals, and an inspection camera placed below the rising slope. Cameras now use the terrain height at their own x/z coordinate. The mineral bases sample complete support footprints rather than placing a flat colony across a slope.

Five focused Node tests pass: deterministic legal placement and clearing exclusion; steep-slope support and immutable instance matrices; finite geometry, outward mineral normals, nonemissive minerals and geometry/batch budgets; idempotent disposal with unrelated scene nodes preserved; and an entirely reserved empty layout. Formatting is checked only for owned files. The owner performs the integrated build and actual-game review.

The final actual-game pass reuses the owner's running Hawaii scene, lighting, fog, and final collider-derived clearings. `actual_game_capture.mjs` and `actual_game_report.json` record eight staged inspection views at 1440×900 and 390×667, with no page or console errors. `actual_shelf_close_*`, `actual_deep_close_*`, `actual_deep_normal_*`, and `actual_abyss_normal_*` show rooted colonies from shelf descent through the abyss; `actual_sway_0/2.5/5/7.5/10.png` sample ten seconds of subtle, root-fixed sway. The HUD and avatar are hidden for these paused inspection cameras. These images use normal game lighting, not the earlier art-harness illumination.

Final integrated construction has **18 colonies, 54 sea pens, 144 rubble pieces, 23,652 triangles, 13 chunks and 25 globally allocated batches**. Nearby enabled batches stay below the 16-batch cap. Sorting reuses preallocated chunk records instead of allocating per-frame instance or chunk objects. Mineral faces remain matte and correctly oriented; supported roots are visible without hovering, large luminous caps, or continuous glowing ground.

Representative final route anchors, rounded to world meters, are (−59, −289, −403), (+42, −377, −524), (−57, −482, −668), and (−216, −722, −1074). When staging a view, sample the camera's own x/z terrain height before adding clearance: the slope rises strongly toward +z.

Normal follow-camera discovery, adult traversal, pause/restart gameplay, and any populated-scene performance conclusions remain the integration owner's checks. The inspection evidence and a 390 px viewport do not establish physical-phone performance or interaction quality.
