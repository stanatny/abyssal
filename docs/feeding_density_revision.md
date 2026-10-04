# Denser feeding across five destinations

Uncommitted follow-up on `feature/mechanical-shark`, local checkpoint `8d55481`. The user tried the stock-preserving lateral redistribution and still found too much empty search time. They explicitly request greater actual fish density on **every** map. This supersedes the earlier no-global-stock-increase boundary for this candidate. Preserve prior target homing, yellow retaliation markers, 2-second torpedoes and held touch Slow swim. No commit, push, main integration or formal release is authorized; Pages remains v0.8.3.

## Implementation

This density snapshot precedes the separately authorized [mid/late meal-reward adjustment](meal_progression_revision.md). Its capacity and protected-habitat rules remain current; its inventory figures are historical and precede the [large-prey dispersion candidate](serpentine_density_revision.md). Its unchanged per-meal returns describe the density pass before that follow-up.

`densifyFeedingSchools()` consumes the already distributed regional configuration. It raises population **inside the existing groups**, preserving centers, depth bands and habitat metadata. Running a population multiplier before splitting would have produced more sparse groups rather than the requested dense schools.

- Ordinary nonpredatory roaming medium schools: twice the existing members.
- Explicit nursery schools: 1.25 times; small roaming and city/wreck schools: 1.5 times. Counts round upward to whole animals.
- Independent nonpredatory meals at least 1 m and ordinary predators from 10 m to below 25 m: 1.5 times. Keep original independent anchors; select additional homes across the full original depth sequence, then place neighbors beside them at the same depth, with normal legal-water/collision resolution. This supplies adult feeding layers as well as the opening.
- Early hunters, 25 m+ threats, lords, vehicles and small independently resident/decorative wildlife are not multiplied. Ordinary threat/retaliation behaviors stay intact.
- A profile's `densityLimit` caps accepted narrow habitats. Poseidon's secondary medium-fish sanctuary remains three Tuna: the initial five-member trial exceeded its declared 15 m patrol radius. Keep its movement/collision assertions strict rather than expanding the capacity on paper. Other city habitats pass denser slot, movement and respawn checks.

Coral Fish and Hawaii Sardine now carry explicit `nurseryResident` data, preserving their previous stationary-school behavior when density creates profiles. The generic migration path no longer needs the legacy species-name shortcut. City Sardine profiles override nursery residency as before. No individual fish nutrition/growth, hunger/health/stamina costs, capture range, respawn delay, species exclusivity, lord timing or regional ending changes. The Guide consumes the same regional configs; body lengths, habitats and nutrition copy remain accurate in both languages. No new models, effects or quality reductions are used.

| Destination | Previous ordinary animals | Current ordinary animals | Increase |
| ----------- | ------------------------: | -----------------------: | -------: |
| Hawaii      |                       351 |                      522 |    48.7% |
| Atlantis    |                       412 |                      568 |    37.9% |
| Bermuda     |                       341 |                      474 |    39.0% |
| Mariana     |                       333 |                      473 |    42.0% |
| Europa      |                       247 |                      369 |    49.4% |

These are complete active regional registries, not on-screen counts. The common multiplier is applied once at registration and does not stack on restarts or region changes. Atlantis has 170 city food animals and 206 juvenile meals excluding invertebrates; Bermuda's three fixed wreck groups have 22 animals at the same interior anchors. Ordinary prey still return through their existing habitat-aware respawn.

## Verification and limits

Fresh validation passes **773 units**, formatting/build and all **29 shared browser checks**. The actual five-map audit finds every registered kind, the exact current inventories, legal initial feeding layers and zero initial solid contacts at the actor radius. Actual ordinary mouth feeding triggers habitat-aware retirement and respawn on all five maps; the harness shortens the already-started hidden clock only after the feeding animation releases the prey. It is not a natural respawn-delay timing measurement. Dense Harbor/Agora and Poseidon shoal slots retain the strict movement, usable-water and terrain/solid checks, including the capped Tuna habitat.

A matched headed-Chrome route uses M2 Pro, Chrome 154, High quality, 1440×900, DPR 1, seed 71523, native Start, real moving ecology and 180 measured frames per station after a one-second settle. The 10 m character (Mariana's 15 m regional start) and 25 m deep station retain the same requested coordinates, yaw and inputs across baseline/current runs. Invulnerability prevents interruptions; no prey is immobilized or substituted. Within 150 world units, the measured mean edible population changes as follows:

| Destination | Opening / medium station | 25 m deeper station |
| ----------- | -----------------------: | ------------------: |
| Hawaii      |              33.7 → 61.5 |           1.7 → 4.7 |
| Atlantis    |              13.2 → 22.5 |           7.2 → 9.2 |
| Bermuda     |               7.0 → 12.3 |         14.2 → 29.2 |
| Mariana     |              21.7 → 39.5 |           4.8 → 5.5 |
| Europa      |              13.0 → 24.0 |           3.5 → 7.5 |

These are short local observation stations, not a global uniform-density or natural encounter-time claim. Changing inventory consumes additional random draws and changes individual headings; fixed seed/coordinates do not make the exact swimming trajectories identical. Frustum counts are recorded separately and do not uniformly rise at every fixed viewing direction. No camera assistance, reduced fog or larger biological fish is used to inflate apparent availability.

Current desktop samples remain **59.65–60.15 FPS**, p95 **18.2–19.0 ms**; the baseline was about 58.5–60.2 FPS. This demonstrates an acceptable short desktop sample, not a speed improvement. More animals increase render/simulation and retained-cache resource cost. JS heap snapshots depend on GC and renderer counts are not VRAM bytes; neither establishes power or thermal behavior.

Thirty native region changes across six cycles preserve exact stock and one unique mesh per actor, with no accidental multiplier stacking. The final two complete cycles have identical per-region scene geometry/texture counts and uploaded renderer geometry/texture counts. The initial three-cycle strict warm comparison failed on five newly uploaded geometries and two textures in Hawaii/Atlantis; extending the controlled warmup established the later plateau. Keep that failed receipt, rather than calling the first sample stable. This short menu-switch check does not prove long active-round or physical-device memory behavior.

Compiled local/public verification passes all six native cases: English desktop, Chinese small portrait and English touch landscape on each host. The actual selector, Guide, Start, repeated 2-second torpedo fire, held Slow swim and pause/home cleanup pass without page/console errors, horizontal overflow or control overlap. Eight served artifacts match on each host, and all 212 runtime source fingerprints match the final candidate. The refreshed restricted preview contains the denser ecology; formal Pages is unchanged.

Baseline/current runtime fingerprints, exact registry data, raw samples, screenshots, failed intermediate checks and public-build receipts stay in ignored `.local/feeding_density_review/`. Phone viewport emulation does not establish physical-phone performance, thermal behavior or natural whole-round encounter pacing; those remain player-review limits.

## Rollback

The ignored baseline source snapshot preserves the preceding uncommitted candidate, including all homing/control work. Removing the density registry step restores the prior stock distribution; revert its associated nursery metadata/migration change, capacity metadata, docs and count expectations together. Do not reset to `8d55481`, which would discard the accepted intervening marker/control/homing work. No database migration, asset replacement or release rollback is involved.
