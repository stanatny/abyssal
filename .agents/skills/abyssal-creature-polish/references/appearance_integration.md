# ABYSSAL appearance integration

Use this reference for a redraw batch, appearance loss across creatures, or a motion fix that crosses shared factories. For a single isolated palette adjustment, use only the relevant material and consumer checks. This reference is scoped to the current repository; confirm paths and caller behavior before editing.

The shared-loader and consumer checks are reusable across regions that use those modules. Tuna UV rebaking, HF human joints and Octopus arm bundling below are case-specific repairs, not universal creature requirements. A creature reused in another map follows its actual shared factory; an unrelated creature does not inherit the repair merely because it resembles the example. Determine applicability from imports and callers rather than adding Hawaii-only branches to shared logic.

## Find the affected consumers

Trace `src/creatures.js`, the affected asset adapter, `src/main.js` and `src/ocean_guide.js`. Include player/companion paths where used; `src/human_models.js` and surface birds are not fully represented by a fish-only inventory. Distinguish a species, its appearance variants, and its instances. Use the current [Hawaii batch review](../../../../docs/hawaii_creatures_huggingface_redraw.md) as historical evidence, not a frozen complete roster.

Preserve an immediate source/asset baseline. A shared file can contain unrelated species: for example, `src/creature_hawaii_batch7_hf.js` serves Ray, Sunfish, Tuna and Octopus. Choose sibling regressions from the actual changed helper. Do not regenerate or alter siblings just to make a shared test pass.

## Diagnose color through the whole path

When unrelated creatures lose color, inspect `src/material_loading.js` and each adapter before changing their albedo. Compare the original surface, converted mesh in unlit mode, actual request result, material binding and rendered Guide/world state. Unchanged texture hashes only prove the source did not change; they do not prove it loaded.

Reuse the shared loader's queue, priority, per-map completion and retry ownership. Keep successful maps if another map fails; do not permanently cache a rejected combined result. Request timeout and queue wait are different intervals. A bounded startup wait must not accidentally abort valid background preparation. Follow existing limits in the module rather than copying fixed concurrency or timeout numbers into each adapter.

For a loader change, use `tests/material_loading.test.js` plus a normal-entry browser check with delayed/failed requests: success, partial success, recovery, repeated Guide opening, and disposal during load. Verify that late images are released and retry cannot mutate a disposed owner. Inspect loading/error feedback in both languages against `src/ocean_guide.css`; fallback color and a status box are not the finished asset.

For local smeared colors, compare lit/unlit source and reduced mesh before changing lighting. Tuna's conversion crossed UV islands; `scripts/rebake_tuna_hf_asset.mjs` demonstrates fresh UVs and source-color reprojection while retaining triangle surfaces. Recount seam vertices and buffers, not just triangles. Read the [Tuna diagnosis](../../../../docs/hawaii_creatures_huggingface_redraw.md#tuna-uv-atlas-follow-up--2026-10-19) before reusing the approach; not every color defect needs an atlas rebuild.

## Diagnose shape before tuning the clock

- For HF humans, inspect `src/human_hf_asset.js` and `src/human_models.js`: continuous chest/shoulder/arm surface, fitted joint axes, tank/flipper attachment and actual posed silhouette. Do not cover a severed joint with a sphere or apply the old rig's angles without fitting the new surface. See [human repair](../../../../docs/appearance_loading_human_revision.md).
- For the Octopus, inspect `src/octopus_jet_pose.js`, `src/octopus_swim.js` and their caller's actual travel input. A flat radial fan requires a volumetric target for fast swimming; narrowing it in one plane cannot create an arm bundle. Preserve resting spread and intermediate gather, with continuous arm/sucker sections. See [swimming review](../../../../docs/octopus_swimming_revision.md).
- For a shared animation clock, verify whether effort already advances phase before applying another speed multiplier. Check actual deformed surfaces during effort changes, not only settled poses. See [Sunfish/turtle review](../../../../docs/hawaii_sunfish_turtle_revision.md).

Use `tests/human_models.test.js`, `tests/octopus_swim.test.js` or the affected species test as appropriate, followed by matched Guide views and actual world travel. A pose accepted by numeric bounds can still look wrong; record that visual failure instead of broadening bounds to excuse it.

## Ordinary entry and ownership

Open the real entry and construct the asset through the ordinary owner before using a fixture that manually prepares materials. A fixture must not supply initialization omitted by the application. Cover both Guide and world where they consume the change; shared JavaScript resources can upload once per WebGL context.

Keep shared immutable geometry/textures separate from instance bones, morph weights and animation state. Inspect reopen/switch/dispose by resource identity and ownership. A retained reference-counted cache is not automatically a leak; a late completion or one instance disposing another's resource is a defect. The [Hawaii retrospective](../../../../docs/hawaii_redraw_retrospective.md) links the supporting failures and fixes.
