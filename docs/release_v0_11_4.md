# v0.11.4 — Exploration, Recovery and Runtime

The user accepts the combined branch and authorizes committing and pushing it to main on 2026-10-10. This release follows v0.11.3 / `bab7e03`, combining accepted checkpoints `bd6850b` (terrain), `9f15f3a` (rares), `db8dad1` (recovery), and the measured performance follow-up. No tag or GitHub Release is requested. Earlier candidate-only labels in linked reviews are historical.

## Resulting behavior

Mariana becomes an irregular three-dimensional deep pit: a broken shallow lip, curved four-sided walls, depth-varying contours and eight giant staggered shelves create winding passages. Terrain, collision, floor sampling and radar outline agree. Existing gates, guardians, hunger profile, food, endings and brighter final neighborhood remain. Read [the terrain review](mariana_irregular_terrain.md).

A rare's selected habitat remains hidden until the player first crosses its horizontal 90-unit circle at any depth. A brief notice reveals a persistent glowing rainbow minimap range, followed by directional/layer clues. No 30 m prerequisite applies. The rare cruises/escapes at 14/18 m/s with bounded dodges: steering and short sprints make capture attainable through effort. Existing unobstructed Frenzy intake and a legal Zombie Shark companion provide an advantage; rare-only pursuit is 26 m/s, with the ordinary prey gap, costs and walls retained. Each once-only capture fills all three vitals and raises their cap to 150 without growth or respawn. Read [discovery](regional_rare_habitat_crossing.md), [rainbow identification](regional_rare_iridescent.md) and [capture evidence](regional_rare_capture.md).

Fed passive recovery is 0.5 health/second. Each nutritious meal contributes an independently expiring 2-health/second layer, capped at three: 2/4/6 per second. Nutrition sets separate 2.5–10-second active lifetimes; a useful capped meal replaces only the earliest-ending layer. There is no instant ordinary-food healing or shared duration extension. HUD shows current rate and three depleting indicators. Shared mouth, torpedo, companion and lord nutrition paths agree; supplies and rare blessings retain special effects. Starvation, costs, pause, reset and growth allocation remain. Read [the recovery review](health_recovery_revision.md).

Static collision broad phase now partitions finite-height queries by XYZ/height, retaining exact candidate order, duplicates, full-height fallback and unchanged precise contact/movement. Fresh coarse-pointer devices select the existing Smooth preset; saved manual High/Smooth preference survives reload and storage failure does not block switching. Desktop default and accepted High art/effects remain. Ecology counts, AI frequency and clocks are unchanged. Read [the runtime review](runtime_performance_followup.md).

## Verification and limits

The performance candidate matches all 673 accepted source fingerprints before release metadata changes. Its validation passes 1,066 units, 29 general browser checks, seven lifecycle groups, 6,000 exact-query comparisons and 500 exact-motion comparisons. Compiled restricted local/public hosts each pass five native quality cases, eight maps across four roles, and four bilingual recovery/Guide/help flows, without observed browser errors or production hooks.

Three serial paired rounds on the M6 Mac mini reduce Mariana High main-loop CPU 4.17→2.59 ms (about 38%) and query CPU 2.54→0.52 ms (about 80%). Draw/triangle counts are unchanged; GPU 9.06→9.14 ms and refresh-capped frame times do not demonstrate a GPU or normal-device FPS gain. Other maps show smaller mixed results. Artificial 4× CPU-throttle results are diagnostic, not physical-device evidence. Physical-phone/M4 sustained FPS, power, temperature and complete natural expeditions remain unmeasured. A reduced-bloom experiment was rejected and restored.

Release formatting, unit/build checks and the exact Node22 Pages run must pass. Download the run's artifact and verify all public runtime bytes, v0.11.4 footer, repository base path, native eight-region/four-role flows, bilingual narrow quality/recovery/Guide/help, hook absence and same-address reload. Publication receipts remain ignored under `.local/release_v0_11_4/`; existing preview processes and prior runtimes are preserved.

## Rollback

The preceding published checkpoint is `bab7e03` / v0.11.3. Revert integrated terrain with its solids/floor/radar changes together; never detach visible scenery from collision. Rare discovery/capture and recovery rules include their synchronized Guide/HUD/tests. Performance can be reverted independently as described in its review while retaining accepted gameplay. No save migration is required; the optional browser quality preference can be ignored. The current AI agent remains the default development owner; canceled external-model work is excluded and preserved.
