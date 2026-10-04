# Serpentine motion and large-prey distribution

Accepted local checkpoint on `fix/penglai-ground-navigation`, based on released v0.10.1 / `171be5f`. It includes and preserves the preceding [ground-navigation fix](penglai_ground_navigation.md). The user authorized a local commit on 2026-10-04; no push, merge or formal deployment is authorized. All timings and counts here refer to controlled checks, not a natural complete expedition.

## Problem and implementation

The accepted detailed models had limited long-body movement: some articulated tails moved almost as a rigid unit, while some scaled bodies retained a mostly fixed curve. Azure Dragon, Cloud Dragon, Bashe and Hujiao now use traveling centerline waves with tangent-following overlapping sections. Scales, manes, legs and the Cloud Dragon's terminal fin follow their own section. Head/mouth anchors stay steady. Amazon's green anaconda, Titanoboa and Yacumama use continuous shared geometry with independent lateral-wave skeletons. Electric eel's torso and anal fin follow matching waves; Rift Reaver's batched tail armor and spines now deform with the continuous tail. There is no per-frame vertex-buffer rewrite or additional animation loop. All visible ordinary models animate, closing the prior 180–190 m gap for visible large creatures.

Large Europa filterers formed dense shoals. Their generous existing individual rewards made sweeping a cluster disproportionately effective. Frenzy already respects real body size and has no temporary growth or larger-prey bypass; this revision does not change that skill, pickups, hunger, torpedoes, companion settlement or the meal curve.

`disperseLargePrey()` follows the existing shared distribution/densification passes. It reduces ordinary aquatic 10–<25 m inventory to 75% for nonpredators and 80% for predators, rounded upward. Former large roaming shoals become independent residents with individual 18–30 m patrol homes. Every existing feeding-layer center is retained before adding displaced homes. Independent predator homes use farthest-point selection from the preceding inventory to remove close copies before distant coverage. Do not run these registry passes again on an already tuned roster.

Protected habitats include nursery and fixed/interior stock, ground/flying ecology, invertebrates, vehicles, elusive rares, lords and 25 m+ ordinary threats. No per-creature food or growth is reduced; the shared adult meal bonus is unchanged. Hawaii's existing basilosaur/megalodon residents and Bermuda's existing sperm whales receive bounded regional patrol homes on combat outskirts. Bermuda's adult surface-route homes remain south of the normal outer-sea predator limit; these are not additional animals or nursery threats.

| Region   | Before | Candidate |
| -------- | -----: | --------: |
| Hawaii   |    522 |       516 |
| Atlantis |    568 |       560 |
| Bermuda  |    474 |       467 |
| Mariana  |    473 |       453 |
| Amazon   |    411 |       409 |
| Europa   |    369 |       352 |
| Penglai  |    441 |       437 |

These ordinary inventories exclude rares, lords and separate surface/human activity. Europa's four large nonpredatory kinds change from 20/16/12/12 to 15/12/9/9 independent residents; its 10–<25 m ordinary inventory changes from 72 to 55. Small/mid-sized shoals remain available rather than making every stage sparse. Penglai's ground and flying stock remains intact; sixteen large Hujiao still supply its northern pond.

## Evidence and acceptance

The baseline snapshot includes the previously accepted, still-uncommitted ground-navigation work. It lives in ignored `.local/locomotion_density_review/baseline/`, with source fingerprints and preceding ecology data. Compare against this snapshot rather than attributing the prior fix to the new candidate.

Focused motion checks cover complete traveling waves, overlapping body sections, fixed head anchors, independent skeletons, eel fin synchrony, Rift Reaver armor motion and immutable shared vertex data. Ecology checks cover immutable input, protected categories, actual count/profile coverage, original Europa feeding layers and unchanged rewards at 10/15/20/25/30 m. Actual factory renders cover all nine models at four equally framed phase samples; preserved detail is inspected in the resulting before/after atlases.

`scripts/verify_serpentine_ecology.mjs` checks actual populations in native Chrome, accessible substantial prey on active guardian outskirts, adult contact healing/growth, normal habitat-aware replacement after controlled timer expiry, and pause-frozen motion/time. Player positioning and invulnerability are controlled observation fixtures; the script does not replace NPC movement, feeding or AI. The contact/replacement case is not a natural full-round pacing measurement. Numeric stock assertions in older tests are updated to the current tuning; anatomy, safe spawning, food-chain and contact contracts remain enforced.

Serial Europa checks use M2 Pro, Chrome, 1440×900 DPR 1, 25 m Orca near `[-90,-470,-580]`, equal seed, warm gameplay, and the existing performance sampler. Baseline → candidate → baseline High samples remain about 60.6/60.6/60.8 FPS with p95 18.8/18.8/18.4 ms. Sampled main-loop CPU is 3.33/4.16/3.74 ms; updateEntities is 1.37/1.06/0.96 ms. Smooth is about 60 FPS too. Visible draw counts and triangles vary slightly with actual NPC positions; lower total inventory is not proof of a render-cost or temperature improvement. No material frame-time regression is observed in this short desktop case, but it does not establish physical-phone or long-session thermal performance.

The final source passes 859/859 units, all 29 shared native browser checks, project formatting and the production build. Native seven-region checks (including ground food in Penglai) find 2–34 substantial ordinary prey within the sampled guardian-outskirts radius of max(190 m, territory radius + 70 m). This is a controlled active snapshot, not a guarantee of that exact stock throughout every battle. A real 25 m contact meal restores 40 health to 100 and grows to about 25.49 m; controlled expiry returns that individual within 13.6 m of its 27.3 m home radius. Native pause checks freeze sampled long-body poses and elapsed time. The same-seed initial Europa snapshot changes the largest 25 m neighborhood from six large animals to three; the baseline included near-coincident individuals.

Nine serial native Amazon/Europa/Penglai switches show warm geometry counts repeating at 722/723/712. Texture counts settle around 313–314 and shader programs have small scene/state variation. These bounded renderer counters do not establish total process memory or long-session stability. Raw native reports, before/after atlases, serial frame-cost measurements and source/build manifests remain ignored under `.local/locomotion_density_review/`. The compiled local and public builds each pass fourteen seven-region English-desktop/Chinese-touch flows, normal Guide open/close focus, Penglai categories and all four new Europa habitat notes. All nine served artifacts and 269 runtime source fingerprints match; development hooks are absent and private/development-path probes return 404. There are zero observed browser errors. These are viewport/touch emulations, not a physical phone test. Keep English/Chinese Guide habitat notes synchronized. Verify all seven compiled native menu/start/pause/home flows and the Europa Guide notes on desktop/touch before preview delivery. The restricted runtime-only candidate must be rebuilt and byte-matched; official Pages stays v0.10.1.

## Rollback and review limits

Keep the source snapshot and the previous restricted build. Reverting only the new registry pass, regional recovery-home overrides and serpentine model/helper changes restores the immediately preceding ground-fix candidate; do not discard that earlier fix. No migration, global render-quality reduction or ecology isolation change is included.

Natural early growth with repeated Frenzy pickups, full lord battles and 15–30 minute physical-device sessions remain player-review work. Controlled counts/contact checks establish wiring and food access, not guaranteed identical completion times or a particular difficulty. Further density tuning should follow observed local encounters and meal economy rather than blindly multiplying whole-map populations.
