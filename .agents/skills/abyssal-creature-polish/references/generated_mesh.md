# Generated Mesh and Fitted Hardware

Read this reference for reconstruction, export/conversion, rigging a new mesh or adding fitted mechanical structure. Existing examples are [Zombie Shark production](../../../../docs/zombie_huggingface_redraw.md) and [Mechanical Shark production](../../../../docs/mechanical_huggingface_redraw.md). Their dated outcomes, palettes, provider settings and budgets are evidence, not requirements for the next asset.

## Obtain an inspectable asset

Use the requested provider within the user's existing scope. Record the authorized input/reference, provider/model revision, applicable license and processing provenance. A tool's license does not establish rights to every input or generated output. Send only the intended reference asset; source, credentials and private receipts do not belong in generation inputs or public documentation.

Treat generation, extraction and download as separate stages. A completed preview or available displayed quota does not prove that export can run. On failure, inspect the actual stage/error and current service limits. Reuse recoverable generated state when available, validate the downloaded file's completeness/hash and parse it before integration. Stop blind retries when the same quota/export condition persists; explain the blocker. Do not change account, purchase capacity or enable paid overage without authorization. Recheck provider APIs when needed rather than preserving a dated quota threshold in this skill.

Inspect the downloaded mesh with both neutral material and its generated textures. Attractive texture can hide a bent body, shallow painted detail, missing underside or disconnected fins. Establish anatomical head/travel axes, neutral centerline, dimensions and attachment roots before rigging. Preserve raw input/output and conversion parameters for reproduction; runtime files must not depend on a temporary hosted asset URL.

## Convert and bind without hiding defects

Measure post-conversion triangle and vertex counts separately: UV splits can keep many vertices after simplification. Normalize uniformly to the existing model contract, then inspect silhouette and important surfaces. Apply any justified neutral-shape correction to geometry and transform normals correctly; do not borrow another animal's centerline correction blindly. Validate the rest shape before adding motion.

Locate pivots on the actual fin/limb roots. Blend skin weights continuously around torso attachments and axial supports; keep duplicate seam vertices consistent. Verify the mouth/muzzle and other gameplay anchors at full size and animation extremes. Added armor must follow the correct support rather than a separately animated approximation. Share immutable asset data while keeping skeletons and moving hardware independent per instance; identify which resources disposal owns.

An existing conversion entry point is `scripts/prepare_zombie_hf_asset.mjs`. Inspect its inputs, dependencies and outputs before reuse; its transforms and simplification settings are asset-specific. Keep conversion-only tooling out of the browser runtime.

## Build mechanical depth deliberately

Assign distinct material roles to body, plates, joints and energy details. Review the result in neutral light and real ocean light; the same hue on every surface can erase structure. A color revision should preserve accepted geometry and animation unless the user requests more. Update appearance copy to the final design in both languages.

Fit raised panels to the actual body, with visible thickness, sensible bevels and supported edges. Sampling a noisy reconstruction directly can produce wrinkled foil; use a smooth fitted surface with measured clearance where appropriate. Check close, oblique and distant moving views for gaps, intersections and coplanar flicker. Examine torso bends and fin extremes: a panel that fits the neutral pose may cut through a moving body.

For static fitting, prefer an offline bake when repeated runtime raycasts or dense construction are unnecessary. Preserve the bake's reproducible entry point with the asset. Store the source-mesh hash with baked output and check it when verifying the asset, so a changed body cannot silently retain stale fitted parts. Measure generated bounds and attachment quality after rebaking; a matching hash alone does not prove good fit.

Keep finite hardware groups/materials and reuse appropriate support bones. Measure the added meshes/draws against removed texture/download/GPU costs separately. Deleting a runtime texture import is different from deleting its retained provenance file. Confirm the production dependency graph and request list before claiming that a resource no longer loads. Continue with the native motion and delivery checks in [SKILL.md](../SKILL.md).
