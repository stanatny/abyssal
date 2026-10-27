# Navigation, discovery and usable encounters

Use this reference when a landmark changes clearance, an actor becomes stuck or hard to find, a transformation loses its habitat, or a lord's surrounding ecology is revised. It applies to affected ABYSSAL consumers across maps. A color-only change does not require this whole review. Penglai provides the worked evidence; its placements, probe counts and recovery timings are not defaults for other regions.

## Separate visible anatomy, navigation and combat

Inspect the final scaled, posed actor and its attachments against the actual obstacle. A clear head/torso test can miss robes, carried objects or a riding blade. Identify which sufficiently rigid parts must clear terrain and add fitted navigation sections where the current representation is incomplete. Do not treat every flexible skin vertex as rigid.

Trace navigation and damage/contact consumers independently. Adding terrain clearance must not silently enlarge a hurtbox, bite reach or damage volume. Preserve the intended contact anatomy and test the genuine attack after the clearance correction. Record each changed envelope and why it belongs to that subsystem. See the [Sword Sage monument repair](../../../../docs/penglai_huggingface_redraw.md#sword-sage-monument-clearance--2026-10-27): missing lower-body and riding-blade coverage was a navigation defect, not authorization to change combat anatomy.

## Verify progress from valid poses

A collision-free initial pose proves only that pose. Reproduce the approach, pursuit, bounded turn, obstacle contact and target departure with the current `src/encounters.js` movement path. Check the full supported body along the swept movement and the attitude that can actually be reached this update; testing a distant desired heading can reject a legal incremental turn. Also inspect the final pose rollback path: an earlier steering fallback does not help if later validation restores the previous pose forever.

When local steering cannot advance, evaluate a bounded recovery such as retreat, lift or a retained alternative direction, where the actor's movement medium permits it. Keep the choice long enough to avoid frame-to-frame direction oscillation. Retain terrain collision, height/territory restrictions and committed attack rules. Clear transient recovery state on reset and freeze it during pause. This is not a substitute for a route planner where the design actually requires one.

Exercise the diagnosed obstruction from multiple approaches and target destinations at representative update intervals. Report progress, penetrations, unexpected jumps and attack availability, including a genuinely blocked case. A finite successful run supports those tested paths, not universal escape from all geometry. The [navigation revision](../../../../docs/penglai_navigation_revision.md) includes both the initial steering repair and a later final-pose recovery correction exposed at a different update interval.

## Audit final habitat and discoverability

Inspect the configuration after regional fitting/postprocessing and the live instance, not only raw species rows. Compare final homes, altitude/depth bands and travel orbits with ordinary player routes, view/animation eligibility, occlusion and both High/Smooth settings. Distinguish an absent spawn from a present actor that players seldom encounter. A Guide entry or population count is insufficient.

Prefer a local habitat or species-view correction when the evidence supports it; globally increasing render distance adds unrelated cost. Check full drifting orbits rather than a single visible spawn. In a transformation, explicitly classify what comes from the new form, what remains the same identity, and what must carry over from the fitted regional instance. Do not rebuild region-specific homes from raw type defaults. Preserve intended timers, rewards and combat rules separately. The [Kun/Peng correction](../../../../docs/penglai_navigation_revision.md) demonstrates this final-state audit without establishing a universal altitude or sight distance.

## Verify an encounter's reachable resources

The current ABYSSAL design asks for an ordinary hunter capable of retaliating against a 30 m player near each lord, with limited food for the fight. Apply the current request and shared rules; do not introduce a fixed food count or copy Penglai's species into another map.

- Confirm the hunter's actual retaliation eligibility and genuine damage path, not just its marker color or size. A staged slow/held target establishes capability, not balance against a skilled full-speed player.
- Check food quantity, nutrition, legal moving homes and complete roaming orbits. Traverse the acquisition route with the relevant grown player, including turning and retreat space. Food behind an impassable structure is not available supply.
- Follow real consumption through the shared settlement helpers, normal replenishment, pause and restart. Do not compensate for sparse placement by changing regional hunger formulas or granting hidden healing.
- Compare species coverage and total stock before/after, plus affected shared consumers. Relocating existing groups can solve an access gap without adding density everywhere.

Use [shared survival rules](../../../../docs/survival_balance.md) and the current implementation as the numerical authority. Keep a budget estimate, staged ability test and natural encounter separate in the report. The [Penglai ecology revision](../../../../docs/penglai_ecology_revision.md) records rejected obstructed placements as well as the accepted accessible habitats; its results do not establish whole-round pacing or physical-phone performance.

## Evidence and handoff

Record the source/configuration revision, ordinary versus controlled setup, final habitat/body envelopes, reproduced failure, changed layer, checks actually run and remaining limits. Read the [fixture validation guidance](../../abyssal-creature-polish/references/surface_motion_validation.md#validate-the-observer-and-test-fixture) before using a showcase clip as movement evidence. Reset encounter prerequisites between subjects: a lord left locked or a victory condition carried over from another test cannot demonstrate normal pursuit or combat.

Keep raw evidence in the project's ignored directory and concise findings in the relevant review. Existing evidence is historical; a documentation-only update requires document checks, not a new claim of runtime validation.
