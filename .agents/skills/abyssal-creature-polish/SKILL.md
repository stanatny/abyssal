---
name: abyssal-creature-polish
description: Refine ABYSSAL creature models, materials, swimming animation and associated effects in the shared Guide/world pipeline. Use for character redraws, generated-mesh integration, anatomy or motion defects, and palette revisions; use map production for regional layout and the asset quality standard for unrelated HUD work.
---

# ABYSSAL Creature Polish

Read [AGENTS.md](../../../AGENTS.md), [README.md](../../../README.md), the current [HANDOFF.md](../../../HANDOFF.md) entry and the [asset quality standard](../../../docs/asset_quality_standard.md). This skill adds the creature-specific workflow; it does not replace that standard. The current AI agent develops and reviews the work unless the user explicitly assigns another model. It grants no generation upload, paid usage, delegation, commit or release authorization beyond the user's task.

Keep appearance-only changes within appearance: preserve body length, movement physics, food/contact eligibility, ability costs, damage, rewards and source anchors. Retain existing services and unrelated work. Use English project documents and bilingual player copy. No personal Skill installation is required.

This skill serves all ABYSSAL regions. Shared factory, Guide/world, loading and lifecycle contracts apply wherever the current code uses them. Regional reviews are scoped examples: their species, rigs, tuning and conversion recipes are not requirements for another region. Before applying a case-specific repair, verify that the affected creature uses the same implementation; before changing a shared implementation, trace consumers across regions.

## Diagnose the layer before editing

Preserve the immediate baseline and record the requested visible difference, usual camera distance and affected consumers: player, companion, ordinary species, lord and Guide as applicable. Trace factories and animation inputs; sharing a builder does not mean every caller supplies the same steering or sprint state.

| Observation                            | Check first                                                                            | Useful correction boundary                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Tail is crooked even when motion stops | Neutral mesh centerline, head/travel axes, rig rest pose                               | Repair the rest shape or binding; do not hide a permanent bend with an opposite animation offset.           |
| Fins barely move, stretch or separate  | Pivots at the real attachment surface, weights and deformed tips relative to the torso | Correct attachment before increasing amplitude; verify readability in the follow camera.                    |
| Mechanical body looks painted          | Neutral material, relief, plate thickness and changing-angle silhouette                | Use fitted physical structure where needed; more painted contrast or emission cannot supply depth.          |
| Palette feels wrong                    | Main body/secondary armor/joint contrast in actual water lighting                      | Adjust material roles and affected bilingual copy first; a palette request does not require regeneration.   |
| Motion or hardware flickers            | Coplanar surfaces, attachment transforms, normals, capture/render-loop ownership       | Diagnose the running scene and the recording separately before adding light or changing unrelated geometry. |

For a new generated mesh or fitted mechanical parts, read [references/generated_mesh.md](references/generated_mesh.md). For a material-only or motion-only fix, use the existing asset and continue below.

For a redraw batch, shared color-loading failure, or human/Octopus pose integration, also read [references/appearance_integration.md](references/appearance_integration.md). It maps these failures to ABYSSAL's actual loaders, factories and ordinary entry paths; use only the checks affected by the current change.

For torn or dented animated skin, crowded limb/tail attachments, conversion damage, stiff travel or effects that hide their own models, read [references/surface_motion_validation.md](references/surface_motion_validation.md). It covers anatomical ownership, final packed surfaces and coordinated world/skin/effect review across maps; a simple color edit does not require that entire workflow.

## Make motion anatomically coherent and readable

Use species-specific observations when anatomy is uncertain; record the source and distinguish observation from expressive game adaptation. A measured turn in one shark species is not a universal fin pose. Tail-driven propulsion, steering fins and decorative motion have different jobs; stronger motion does not mean making every fin flap. Keep the sources and their limits in the task's review rather than baking one species' motion into this workflow.

Inspect neutral and posed geometry separately. For the current shark rigs, verify the lateral tail wave, the peduncle-to-fan connection, chest-fin roots and jaw. Keeping the complete caudal fan on one terminal support prevents the two lobes folding apart; this is a correction for these rigs, not a skeleton template for every creature. Preserve continuous weights and identical deformation across duplicated UV-seam vertices.

Measure actual skinned tips and seams in the relevant supporting-bone frame. A moving root or valid bone angles can conceal a still fin, torso penetration or sliding attachment. Check both sides, forward/backward excursion, vertical excursion and per-frame continuity; derive useful limits from the asset's scale and accepted baseline rather than copying another model's numbers.

Read input-to-world-turn and local-axis signs before choosing asymmetric poses. Compare cruise, settled sprint, turn in both directions, ascent/descent, sprint release and simultaneous abrupt input reversal. Accumulate phase continuously and smooth visual effort transitions without changing steering physics. A shark's faster sprint can use faster tail cadence with restrained amplitude and fin trim; select values from rendering, not a universal multiplier. Preserve meaningful zero inputs instead of replacing them with a truthy fallback.

Audit related consumers through the shared factory, including companions and the Guide. Verify each caller's actual inputs before claiming coverage. Keep unrelated species' motion unchanged when editing a shared clock. Pause must freeze phase/pose and restart must restore the expected state. Reuse the existing update loop and keep skeletons/state independent even when geometry and materials are shared.

## Verify the visible result, not only the rig

Use matched before/after camera, lighting, scale and motion inputs. A stationary Guide comparison isolates form and deformation; also inspect ordinary follow-camera travel, where fins, tails and effects may be hidden by the body or too small to read. Claims of forward propulsion need actual world displacement against visible scenery or a fixed external view. Do not claim travel from a spinning model.

Exercise the relevant real ability and inspect its anchors throughout animation: mouth intake, fission/emergence or muzzle and impact as applicable. The apparent effect must remain consistent with its real trigger, direction and gameplay range. Review the affected Guide description in both languages when the visible design changes.

When recording through a controlled render loop, suspend the competing normal loop for that fixture and restore it afterward. Inspect the final encoded clip for cadence, flicker and missing transitions. Label inspection fixtures, invulnerability, staged positions and desktop touch emulation; none proves natural progression or physical-phone behavior.

Choose regression checks by impact. Palette work needs material/copy/render checks; rig or clock work needs actual-vertex continuity, transitions and relevant contact/ability checks. If an existing geometric bound fails, examine the deformation before changing the bound. Documentation-only work needs documentation checks, not another game build. Report historical results as historical.

For resource changes, measure the populated scene as well as the isolated asset. Shared JavaScript textures can still upload separately in the Guide and game WebGL contexts. Track candidate-owned identities across reopen/restart/dispose; unrelated ecology warm-up can change total renderer counts. An offline bake reduces construction work, not necessarily frame time; more armor can increase draws while removing textures reduces download/memory. Keep these claims separate and leave device heat unverified without device measurements.

## Code entry points and delivery

Paths are starting points, not an exhaustive future roster. Confirm current callers before editing:

- Factory and consumers: `src/creatures.js`, `src/main.js`, `src/ocean_guide.js`, `src/zombie_minion.js`.
- Clock and shark poses: `src/player_motion.js`, `src/creature_zombie_shark.js`, `src/creature_mechanical_shark.js`; follow their imports for shared pose helpers and fitted hardware on the task branch.
- Runtime rig/assets: `src/zombie_shark_asset.js` provides an existing rig example; inspect each creature builder's actual asset imports rather than assuming equivalent rigs.
- Focused examples: `tests/player_motion.test.js`, `tests/zombie_hf_asset.test.js`; add the affected model and ability/contact tests according to the changed paths.

Keep raw captures, source snapshots and private service receipts under ignored `.local/`. Put the concise before/after findings, source/adaptation choices, actual checks, cost changes and limitations in the task's repository review. Keep numerical tuning, current colors, provider quotas, process IDs and temporary URLs in that review rather than turning them into Skill rules. When delivering a changed runtime preview, verify its served resources against the reviewed build and retain production source/debug restrictions. Follow the user's current commit/publish scope separately.
