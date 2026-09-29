# Atlantis architecture geometry budget

Development candidate; not published. This focused optimization preserves the accepted city placement, visible distance, lighting, materials, collision, temple ornament, and the full-size pearl route landmarks. It changes only repeated small pearl niches and column shaft sampling.

## Geometry changes

Architectural niches use a separate cached pearl template. Shell angular sampling remains 72 segments, retaining the existing radial ribs and scalloped rim. Shell radial rows decrease from 24 to 12; the rim keeps the same source curve and six-sided tube cross-section with 48 rather than 96 longitudinal samples. The small inner pearl uses 16 × 12 sphere segments rather than 28 × 20. The full-size route pearl keeps its original geometry, material references, dimensions, and collider definitions. Default `pearlHabitat()` and `cityArchitecture("pearl")` both return that full template.

Column shafts previously used three axial segments per meter despite having only two smooth taper sections. They now have at least eight axial segments, with approximately one segment per 2.5 meters for longer shafts. Their 24 angular segments, fluting profile, control radii, base, capital, volutes, and collision remain unchanged. No static objects disappear earlier, and no new frame updates or geometry allocations are introduced.

## Triangle counts

Counts are per complete reusable template, including all material parts.

| Template          |  Before |  After | Reduction |
| ----------------- | ------: | -----: | --------: |
| Courtyard         |  41,920 | 22,064 |     47.4% |
| Villa             |  10,496 |  5,888 |     43.9% |
| Stoa              |  54,616 | 25,832 |     52.7% |
| Rotunda           |  41,768 | 15,848 |     62.1% |
| Tower             |  24,116 | 13,612 |     43.6% |
| Gateway           |  53,964 | 22,012 |     59.2% |
| Temple            | 196,308 | 62,996 |     67.9% |
| Column            |   2,664 |    984 |     63.1% |
| Small niche pearl |  16,904 |  8,128 |     51.9% |
| Full route pearl  |  16,904 | 16,904 |        0% |

Ruins (1,232), obelisk (168), and amphora (588) remain unchanged.

A Node scene/frustum estimate at player `[75, -420, -730]`, camera `[75, -414, -709]` looking at `[75, -419, -745]`, 60° vertical FOV and 1440 × 900 aspect counted **1,412,596 → 750,324** submitted city-batch triangles with the existing 350-meter high-quality chunk reach. The existing 275-meter smooth reach counted **1,081,928 → 523,496**. These counts include the same surviving mesh instances on both sides, but exclude other scene systems and are not actual renderer totals or frame-rate measurements. The optimization does not modify either reach. Browser integration and performance measurements are recorded separately by the integration owner.

## Verification

`node --test tests/atlantis_architecture_budget.test.js tests/atlantis_city_fit.test.js tests/atlantis_environment.test.js`: **19/19 passed**.

The four new focused checks enforce template triangle budgets, unchanged collision signatures, separate cached full/niche resources, unchanged full-size pearl count, finite geometry/normals, and matching shell samples at every retained angular/radial intersection. The removed shell rows differ from interpolated compact rows by less than 6 millimeters at the actual 0.38 niche scale. Raycasts through the rendered merged column establish less than one centimeter of deviation from the original analytic taper and unchanged capital extents.

Independent before/after comparison also found identical overall bounds and collider data for all twelve architecture templates. Existing city checks cover gate and avenue clearance for a 30-meter player, foundations, annular colonnade/roof collision, pooled lights, both quality modes, and shared-resource disposal.

These geometric checks do not establish visual acceptance or physical-device performance. Close niche/column and normal-city render review, and integrated renderer measurements, remain the integration owner's final check before delivery. No build or browser session was started by this optimization task while the integration owner had exclusive access.

## Integrated render review

The integration owner captured both the preserved pre-change renderer and the current renderer from matching close courtyard and temple viewpoints, using their actual city lighting/materials. The temple shafts retain smooth silhouettes, fluting and detailed capitals. The visible niche shell ribs match the earlier appearance; the niche is partly occluded by the existing wall placement in both versions, so this view does not validate its hidden surfaces. No new placement change was introduced. Images are retained under `.local/geometry_before/` and `.local/geometry_after/`. Normal running city views and actual renderer triangle/frame measurements are in [the performance follow-up](atlantis_performance.md).
