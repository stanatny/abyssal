# Surface, motion and effect validation

Use the relevant sections when a generated creature deforms incorrectly or its motion/effects fail to read in play. These checks apply across ABYSSAL maps by implementation and anatomy. The linked Penglai repairs are evidence, not mandatory rigs, numerical settings or a requirement to regenerate another region.

## Choose a correction from the diagnosed defect

Inspect the rest surface, unlit color and posed surface separately using the same camera. Compare the original export with the current decoded runtime mesh before changing animation. If anatomy or silhouette cannot support the intended motion, select or generate a better source. If the source is usable and the defect is localized to conversion, rest alignment, binding or effect scale, repair that stage and retain the accepted source. Repeated failure after amplitude adjustments is a reason to revisit this diagnosis.

For example, [Fox and Zheng](../../../../docs/penglai_huggingface_redraw.md#fox-and-zheng-surface-and-motion-repair--2026-10-27) required different choices: Fox received a new source and surface cleanup; Zheng retained its source coat with a fitted tail-axis correction and new weights. Do not automatically copy their remeshing or smoothing recipe: thin membranes, fur silhouette, mouth openings and small appendages may be intentional.

## Fit anatomical ownership before blending weights

In an affected builder, inspect the actual `skinIndex`/`skinWeight` assignments around the abdomen, limb roots and adjacent appendages. A nearest-bone rule or a rear-coordinate threshold can assign belly vertices to a foot or hind-leg vertices to a tail. Smooth distance weights alone can still blend the wrong body parts.

Identify the legitimate torso, limb and appendage regions first, using the fitted surface, attachment roots and connectivity where useful. Then blend across their real joints. Keep the abdomen on its supporting body unless the intended deformation requires otherwise; separate close but anatomically unrelated tails, legs and wings. Consistency across duplicated UV-seam vertices must not weld deliberately separate surfaces.

Inspect final weights after influence truncation and normalization. Each expected chain needs weighted visible skin, not merely an allocated bone. For actual posed-vertex checks, update world and skeleton matrices and sample the rendered deformation, as in `tests/penglai_beast_hf.test.js`. Sample complete gait/ability cycles and transitions; check roots and belly as well as tips. Use asset-relative stretch, seam separation, attachment clearance and bounds to locate defects, then inspect the corresponding frame. Do not generalize one animal's passing stretch threshold into an anatomical standard.

`src/creature_penglai_beast_hf.js` is a fitted example, not a universal binder. It shares a file with other creatures; derive sibling regression coverage from the helper actually changed. If replacement geometry changes ground navigation, inspect `src/ground_navigation.js` and the builder's rigid-body probe contract. Preserve torso/head clearance and the existing treatment of flexible paws/tails instead of relaxing terrain checks or sampling every flexible vertex as rigid.

## Verify conversion boundaries and the final runtime surface

At each changed geometry-destructive stage, compare its input and output: repair/remesh, reduction, UV expansion and final packing can introduce different defects. Validate the decoded runtime indices, finite positions/normals, winding, expected surfaces and seam behavior. Record unexpected triangle loss, including tiny atlas-rejected faces, rather than assuming a successful export preserved the surface. Inspect neutral, lit and unlit views to separate geometry, normals and color errors.

A closed skin's boundary-edge check can reveal a gap. Zero boundary edges alone does not establish absence of self-intersection, coincident faces, inverted winding or poor deformation. Account for intentional open surfaces and quantization when interpreting topology; do not indiscriminately fill them. Reprojection and smoothing need a new inspection of the silhouette, protected attachments and source colors.

Existing offline examples are `scripts/repair_penglai_beast_surface.py` and `scripts/reduce_penglai_beast_surface.mjs`; their parameters remain asset-specific. Keep conversion tooling offline. When geometry changes, inspect any derived normals, bounds, anchors, probes and geometry-keyed entries in `src/assets/models/creature_interior_topology.json`. An internal seal supports the existing inside-body rendering path; it does not repair a tear in the visible skin. Preserve unrelated seal records and validate ownership/culling after a replacement.

## Review world motion, skin and effects together

Trace the actual inputs from `src/main.js` or `src/encounters.js` to the creature animator. Separate resolved travel/orientation, whole-body deformation and local appendage motion. A travelling skin wave cannot by itself fix a rigid-looking trajectory; adding path weave is a movement change and must be recorded and checked against collision, territory and locked attacks. See the [Azure repair](../../../../docs/penglai_huggingface_redraw.md#azure-dragon-undulation-and-flight-path-repair--2026-10-27).

Choose orientation behavior for the lifeform. The [upright guardian repair](../../../../docs/penglai_huggingface_redraw.md#guardian-shape-tail-and-flight-repair--2026-10-27) bounds pitch/bank for its flying guardians; it is not a prohibition on rolling for every swimmer or flyer. Stopped, blocked and paused travel must not be mistaken for full-speed motion. Guide preview effort and real travel are distinct evidence.

For a model accompanied by glow/trails, compare their final world dimensions after every parent scale. Trigger the real ability, inspect its launch/impact anchors and confirm that the intended object remains visible at the normal camera distance. The [Sword Sage repair](../../../../docs/penglai_huggingface_redraw.md#straight-riding-blade-and-readable-sword-volleys--2026-10-27) corrected an oversized glow masking a valid sword projectile; regenerating the sword was unnecessary. Keep damage, range and timing separate from visual legibility.

## Validate the observer and test fixture

Before changing runtime motion to match a recording, compare the ordinary caller with the capture setup. Record the simulation player position separately from an observer camera: distance-based visibility and animation eligibility may follow the player, not the recording camera. Check both quality modes where those bands differ. Forcing a culled mesh visible without its normal animation update can manufacture a sliding creature; adding an extra animation call can conceal a real caller omission.

Use a naturally eligible near case and an unmodified far control to locate this mismatch. Controlled pose/position tests remain useful for isolated skin checks, but label their intervention and do not present them as natural travel or battle. Inspect actual resolved displacement and deformed skin over a full cycle, including fractional times; integer-second samples can alias a repeating gait. Reset encounter prerequisites between subjects and confirm genuine active states instead of assuming a staged lord can attack.

The [Taotie recording correction](../../../../docs/penglai_huggingface_redraw.md#taotie-walking-footage-correction--2026-10-27) required a corrected capture setup rather than another runtime gait change. If the ordinary near case also fails, continue tracing runtime inputs instead of dismissing the user's report as a fixture issue. Navigation/access defects belong to the [map integration checks](../../abyssal-map-production/references/navigation_and_encounters.md).

## Review defects early and report the right evidence

Before expanding a new rig family, inspect one usable model through neutral views, full motion and ordinary scene entry. Include underside/root/rear views when those regions can fail. Review matched before/after frames and the final encoded clip; retain a visible environment reference for claims about world movement. An observer recording blocked by scenery does not demonstrate the hidden animation. Re-record a useful view or explicitly narrow the delivered evidence.

A newly reported defect reopens the relevant visual finding even if earlier tests passed. Keep prior evidence dated, add a regression for the diagnosed failure where useful, and distinguish technical checks, user visual feedback and permission to commit/release. Numerical tuning, quota receipts and counts remain in the case review. Documentation-only updates need link, scope and formatting checks, not another runtime build.
