# Gran Maja appearance revision

Release status: included in the user-authorized **v0.7.2** commit and push to `main`. See [release verification](verification.md) for current checks and deployment acceptance. Local-only authorization statements and earlier candidate measurements below are historical; they do not override the current release instruction.

## Historical review context

Status: revision 2 local candidate, independently reviewed by the integration owner and included in the user-authorized local commit of the reviewed preview. No push or release is requested. This changes the appearance of the existing lord with stable internal kind `mayan`. It does not change its configured length, abilities, contact region, or release status. The earlier blue fish interpretation was rejected by the owner and is historical work, not an accepted visual baseline.

## Current reference and adaptation

The two replacement images supplied on 2026-09-30 show a silver/charcoal creature with a low, broad triangular head, a single shallow arc of six cobalt eyes, a relatively narrow red-gum smile, and a long thick serpent body with repeated annular skin folds and a pointed tail. Their attachment filenames are `img_v3_02161_77bb0527-331a-467d-a6ad-6ceb08d02ddg.jpg` and `img_v3_02161_32097e04-ba98-404e-a7ff-c4dd680aa55g.jpg`. These images supersede the original collage for the shape and color decisions in revision 2.

The primary creator context supplied for the creature is Borisao Blois's [Colosos — The Bloop vs El Gran Majá — La Batalla](https://www.youtube.com/watch?v=hedUAqopPBg). The attachment images and their reuse rights have not been independently authenticated. No external image, video, texture, or model is bundled. This is an original procedural interpretation, with authored geometry and materials rather than downloaded or traced meshes. It is a fantasy creature, not a biological reconstruction.

The comparable minimum remains the polished v0.6.10 Abyss Lord family. The asset shares the game's factory, Ocean Guide asset, Three.js rendering style, static resource caches and unit-length convention. Local `-Z` is the head and travel direction; `+Y` is up. Heavy lateral undulation and small breathing movement in the lower jaw are chosen fantasy adaptations.

## Current structure and resource budget

- The head is a continuous low triangular disc with wide outer corners, thick rounded lower cheeks and a narrow curved mouth. The mouth's authored width is approximately 37% of the head's widest section. Upper and lower red gums carry 60 short ivory teeth in total. Six inset blue lenses form one frontal arc, with slightly larger outer eyes and shallow skin eyelids.
- A continuous cylindrical body follows a resting S curve, with about 20 coarse, varying annular folds. The body tapers gradually to a single pointed tail. There are no fish pectoral, dorsal or forked tail fins, temple ornaments or jade plates.
- Gray vertex colors, low-contrast mottling and a model-local warped-contour normal treatment supply curved surface grooves. The material remains nonmetallic. Its shader reuses the shared skin material factory without altering that factory or another creature's material.
- The body has six independent bones per instance. Two appearance callbacks drive the traveling body wave and breathing of the central lower lip, gum and teeth. The outer lower head disc stays static and shares matched seam normals with the upper disc, keeping the cheeks closed. They use the existing factory phase and effort, do not move the gameplay root, and do not mutate cached geometry or material emission.
- The actual visible factory asset renders **32,376 triangles in 11 draw calls**, below the unchanged lord-family limits of 35,000 triangles and 22 expected material batches. A rendered instance owns one skeleton texture. The hidden compatibility proxy contributes no rendered draws.
- Geometries and materials are cached; skeletons, bones, groups and motion closures belong to each instance. The modules create no lights, image textures, timers or animation loops. A caller releasing an instance must dispose its private skeleton, while retaining the shared geometry and materials for active instances.

The authored source is `src/creature_gran_maja.js` and `src/creature_gran_maja_geometry.js`. The existing `src/creature_lords.js` appearance dispatch remains in place. No integration, combat or shared UI source was changed during revision 2.

## Exact contact compatibility

The existing `buildMayan` function remains byte-for-byte identical to the published pre-redraw implementation. `buildLegacyMayanContact(root, motions)` calls it in an independent group and applies the old normalization procedure. Its scale is `0.9216589831372263` and its local Z offset is `0.011520742233379398`; the original three animation callbacks are retained.

The factory creates this group after visible static merging and before the root's world-length scale. It applies the existing static merge function to the compatibility group alone, then hides the group and routes contact queries to it. Mesh boundaries and traversal order must remain identical to the old factory, because inside/outside parity is evaluated per mesh. The visible and compatibility hierarchies receive the same phase and effort. Revision 2 does not modify this path, its thresholds, or its frozen published-source oracle.

Exact old contact and the requested new outline are separate constraints. The new head wings, narrow mouth, thicker ringed body and pointed tail differ from the former stone creature's surface. Some visible outer areas therefore do not define new contact regions. Preserving the published contact region is the explicit gameplay requirement; visual replacement does not expand it.

## Revision 2 checks and evidence

`node --test tests/creature_gran_maja.test.js tests/creature_lords.test.js` passes **9 tests** for the current revision. These check normalized length, finite geometry, the unchanged family budgets, six-eye/smile proportions, mouth normals, closed head borders and motion-isolated cheeks, continuous body seam normals, actual skinned tail-vertex travel over a complete cycle, private skeletons and poses, unchanged cached buffers and fixed emission. They also retain the old proxy normalization/motion check. These focused visual tests do not substitute for the independent published-contact oracle below.

Current evidence is under ignored `.local/gran_maja_redraw_v2/`. The harness loads the actual `createCreature('mayan', 40, 1)` result, including regular static batching and its hidden proxy. It is not a separate display model. Desktop captures cover front, three-quarter, side, back, top, close and usual distance. The isolated deep-view stress captures use the published Hawaii atmosphere values at depth 375 or below, before this candidate’s restrained ambient brightening: fog/background `#030e1c`, density `0.011`, hemisphere intensity `0.57`, key `0.25`, rim `0.5`, ACES mapping and exposure `1.03`. These conservative art-harness values differ from the current candidate’s deep hemisphere intensity of `0.87`; the owner’s actual-game captures use the candidate’s regular lighting, fog and player lamp.

The final frozen head-closure source was re-rendered through the complete **29-image matrix**. Nine keyframes span a full 7.012-second primary lateral body cycle at factory effort 1, followed by five low-to-high effort transition frames. Additional 390 × 667 captures check front, three-quarter, side, close and ordinary-distance deep viewing. `final_capture.mjs` is the reproducible entry point; it verifies the two frozen appearance-source SHA-256 hashes before rendering. `render_report.json` records those hashes together with factory/material source hashes, **11 draws / 32,376 triangles** in every capture, zero browser errors and a stable 24-cycle spawn/render/remove/private-skeleton-disposal check. The final static outer lower disc and matching border normals are present throughout this new matrix, so the full-cycle and phone evidence no longer inherits the earlier cheek split.

The previous 29 screenshots and their original report are retained under `pre_head_closure/` and are historical evidence only. The three focused `head_final_*.png` captures and `head_closure_report.json` remain as the intermediate confirmation of that same final source. Desktop CPU animation/render-submission timing is recorded only as a diagnostic, not a synchronized GPU or physical-phone performance result.

The isolated views deliberately show an art harness. They omit terrain, the player lamp, postprocessing and gameplay UI. The integration owner separately completed the real Ocean Guide/game checks in two languages and two viewport sizes, the full 624-test suite, formatting and production build, including the unchanged published-contact fingerprints. Source freezing or reviewer agreement about direction is not owner acceptance. Physical-phone performance, touch feel and complete natural combat remain unverified by this art harness.

## Historical published-source compatibility audit

The independent oracle is the frozen published v0.7.1 source at commit `21cf9a4e50afd11c3d8634d92c461b43f85fe791`, including the actual `creatures.js` factory and `encounters.js` contact routine. Expected values were generated by executing those published files, not by calling the new legacy helper. `tests/gran_maja_contact_compatibility.test.js` embeds source hashes and published outputs so CI does not depend on ignored files.

The original direct comparison found a real discrepancy: the old factory combined 132 raw parts into 10 batches, while the first hidden proxy retained the raw parts. Because parity is evaluated separately per mesh, this produced 58 hit/miss mismatches and 70 differing contact points among 7,812 samples, with maximum point error 0.3266378269624184 game meters. The integration owner corrected it by merging the proxy with the original batching algorithm before hiding it. Repeating the direct comparison gave **zero hit/miss mismatches, zero point mismatches and exactly zero maximum error**, without tolerance.

The resulting 10-test compatibility suite verifies all published merged position/normal/color/index buffers and mesh order, plus world-space vertices and matrices across four seeds/transforms and ten time updates each. It includes encounter length 48 / seed 92, guide seed 24, a rotated and nonuniformly scaled ancestor, another seed, repeated/backward timestamps and clamped large time jumps. A further 2,780 samples preserve null water results and exact returned hit coordinates. The revision 2 integration owner reran this oracle with only the visible asset budget updated; the contact golden data is unchanged.

Historical reproducibility records are `freeze_contact_golden.mjs`, `contact_published_golden.json`, `contact_audit.mjs`, `contact_initial_summary.json` and `contact_final_audit.json` under `.local/gran_maja_art/`. The initial summary documents the mismatch before the fix; the final audit documents the corrected old/new comparison.

## Rejected first interpretation

Revision 1 used a blue body, 18 cyan eyes in multiple rows, a large funnel mouth with 120 teeth, fish fins, four body bones and six appearance callbacks. It rendered 32,648 triangles in 17 draws. Its earlier desktop/phone Guide and staged game captures, motion frames and contact checks remain under `.local/gran_maja_art/` for provenance. The owner rejected that appearance. Those images and historical technical passes do not demonstrate revision 2's visual quality or current game acceptance.
