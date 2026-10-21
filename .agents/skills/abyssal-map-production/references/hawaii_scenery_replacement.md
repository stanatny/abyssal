# Replacing existing Hawaii scenery

Use this reference for replacing Hawaii landmarks, reef clusters or surface ships while retaining the accepted map and gameplay. A new region still follows the map brief. Current object counts and coordinates belong in the task's baseline, not in this workflow.

The factory diagnosis and concrete repairs here are limited to Hawaii's existing implementation. Another region may use UV-preserving batching or different resource ownership; do not bypass its batching, call Hawaii constructors or copy Hawaii collision snapshots by analogy. Return to the parent Skill and establish that region's contracts. Shared helpers discovered during that audit may legitimately need cross-region regression checks.

## Keep the old map contract explicit

Trace the caller from `src/ocean.js` or `src/surface.js` into the relevant asset/decorations factory. Snapshot anchors, collision shapes/order, obstacle markers, route/draft and required grown-body passages. Determine whether another region uses the same factory before claiming the scope is Hawaii-only.

The old static batching path used for Hawaii landmarks discards attributes required by the new textured assets. Verify UVs, normals, colors and material groups after every merge, reduction and batching step. Place new rendering in a compatible path, while keeping old collision construction independently testable. Dispose obsolete private visuals without disposing shared geometry or textures. See [landmarks](../../../../docs/hawaii_landmarks_huggingface_redraw.md) and [surface ships](../../../../docs/hawaii_surface_ships_huggingface_redraw.md).

Fit the transformed support footprint, not only the object's center. Match actual land/water placement and ship draft. Inspect visible openings together with colliders, then traverse the promised route both ways with the grown character. A normalized model length or open ray does not prove a usable entrance or turning space.

## Repeated scenery needs its own validation

Inspect `src/hawaii_reef_asset.js`, `src/hawaii_reef_decorations.js` and `tests/hawaii_reef_hf.test.js` when working on reef batches:

- Normal construction must initiate the same preparation needed by ordinary play. Test the ordinary constructor without calling an extra fixture-only `prepare()` first.
- Inspect every used LOD, including valid referenced normals on thin opposing surfaces. Preserve meaningful source normals where reduction would create zero normals; do not suppress accepted lighting/bloom to hide invalid geometry.
- Choose reduction from retained silhouette and repeated-scene cost. A low triangle target that erases branches or ridges is not a successful optimization. Check that only the intended LOD is visible per colony.
- Keep shared assets reference-counted and per-instance placement/state independent. Test one owner releasing while another remains, final-owner disposal and delayed texture completion. Distinguish Guide/game uploads and unrelated retained caches from candidate leaks.

Read the [reef review](../../../../docs/hawaii_reef_life_huggingface_redraw.md) for the normal-entry and invalid-normal failures. Its historical instance counts and budgets are not requirements for future scenery.

## Compare the right invariant

For unchanged collision layout, compare count, order, shape/type and geometric values. Cross-platform floating-point results may require a narrowly justified tolerance and a deliberate-movement negative check; raw JSON hashes can fail on insignificant numeric differences. Preserve exact identity checks for attributes that should be exact. See the collider test correction in [v0.11.14](../../../../docs/release_v0_11_14.md).

For published assets, compare the served bytes with the reviewed CI artifact. That is a different contract from geometric equivalence or decompressed-payload equivalence. Keep a rejected candidate, a local preview and a formal release distinct. No service replacement, generation, gameplay change or publication is authorized by this reference itself.
