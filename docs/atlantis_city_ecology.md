# Atlantis city ecology

The v0.7.1 revision keeps 17 ordinary species and **390 individuals**. The preceding city revision had 374, following the original 278-animal candidate. Hawaii remains 24 species and 285 individuals. The shared hunger, nutrition, growth, healing, capture, lord-bite food, and 30-minute round rules are unchanged.

## Population and spatial rules

| Supply              | Original 278 | Current 390 | Placement                                                               |
| ------------------- | -----------: | ----------: | ----------------------------------------------------------------------- |
| Atlantic spadefish  |           72 |         104 | Six original nursery schools; four city schools of eight                |
| Sardines            |           80 |         128 | Five original nursery schools; six city schools of eight                |
| Sunfish             |           10 |          14 | Three shallow pairs; two city groups of four                            |
| Tuna                |           30 |          42 | Four shallow/transition schools of six; three city groups of 9, 6 and 3 |
| Rays                |           12 |          20 | Original six pairs; four city pairs                                     |
| Plesiosaurs         |            5 |           6 | City approach and avenue routes within original species depths          |
| Pliosaurs           |            5 |           6 | City approach and avenue routes within original species depths          |
| Mosasaurs           |            5 |           7 | Middle and deep city feeding routes                                     |
| Basilosaurus        |            4 |           6 | Deep city feeding routes                                                |
| Megalodon           |            5 |           7 | Deep city feeding routes                                                |
| Other seven species |           50 |          50 | Existing supply and predator restrictions                               |

The original 168 juvenile-edible nursery residents remain. Ordinary predators cannot spawn, migrate, pursue, or deal hunting contact damage in the nursery. The single outer-reef blue shark remains the early challenge.

The 80 city small fish are atmospheric schools, not a late-game nutrition substitute. They reuse existing polished spadefish and sardine assets. The Harbor school now occupies the excavated lower hall at (-227, -177, -249), below the original seabed, using the site turning-circle metadata. Agora's eight-member group now occupies the lower cistern at (224,-349,-464), following its fish-sanctuary metadata; Memorial Terrace retains its raised lower-gallery school. Each has a six-world-meter band on either side of its center. The other city schools use twelve-meter bands. City residents stay around their local school centers and swim normally; their centers do not migrate back into the nursery. Their deeper placement is an explicit fantasy-region adaptation, not a claim about these animals' natural habitat.

The 34 city medium prey connect districts; the preceding revision’s eight additional ancient animals and independent large-prey anchors continue to supply the city route. Per-species length, swim speed, base nutrition, growth and predator classification are unchanged. Large animals retain their original depth ranges. A 25–30 m player should seek these large prey; chasing tiny shoals is still inefficient.

The latest density follow-up adds only 16 animals (4.3% of the previous total): two sardine schools of eight, near `[18, -402, -650]` on the Sacred Avenue route and `[32, -608, -968]` on the central necropolis route. Both initial centers are legal without collision relocation. Their anchor separation exceeds the small-fish visibility diameter plus the normal school-orbit margin, which usually limits a city view to one added group. This is not a hard visibility cap for individual fish displaced by player pursuit.

The remainder of the density gain comes from regrouping existing medium prey. Four sunfish move from the 53/70-world-depth offshore pairs into the two city groups, making groups of four. The six tuna formerly around world depth 70 move into the two city schools, making groups of nine. The first nursery tuna school and the 53/83/96-depth schools remain; the 96-depth tuna and 92/102/116-depth ray groups preserve at least twelve prey in the 90–165-world-depth progression band. World sunfish/tuna/ray totals remain 14/42/20 (76 together). Large-prey counts, nutrition and lengths are unchanged.

City school residents increase **88 → 114** (29.5%): **64 → 80 small fish** and **24 → 34 medium prey**. Small fish at world depth 300 or deeper increase **40 → 56**. The nursery retains all 168 juvenile-edible residents. Total school centers decrease **43 → 42**, because consolidation retires three offshore centers while two deep-city centers are added. This improves local grouping without proportionally increasing world simulation work.

The additional sardines reuse the existing full-detail model baseline (five meshes and 2,312 triangles per animal before rendering passes and the separate LOD work). Sixteen instances add at most 80 mesh instances / 36,992 triangles to the world; a single newly visible group adds at most 40 ordinary mesh submissions / 18,496 triangles before shadows and other rendering passes. These are model counts, not measured frame-time improvements. Regrouped medium prey can also raise local visible load even though their world count is unchanged. The performance follow-up must be assessed separately from this population budget.

`schoolPopulationGroups()` assigns stable variable-size groups without changing the original nursery group sizes. `schoolHabitat()` supplies each group's immutable depth, residency and anchor profile. Every spawn and respawn passes actual terrain and collision checks. Atlantis spawn clearance reserves 0.55 body lengths around the center so randomly oriented head/tail geometry is not placed in masonry; ordinary movement still uses the shared precise creature collision path. Hawaii spawn clearance is unchanged.

## Consumption and obtained meals

These examples call the real `hungerDrainRate()` and `consumePrey()` functions for both characters. Each modeled meal starts at zero hunger and 60 health, so the table shows uncapped food yield and includes healing before growth. Depth is world depth; the interface displays four times this value. The reserve deducts 15 seconds of travel and 15 seconds of battle at the stated depth. This is a budget for a successfully acquired meal, not a prediction that a player will find and catch one every 30 seconds.

| Player length | World / displayed depth | Example prey  | Hunger/s | Meal food | Food seconds | Food after 30-second reserve |
| ------------- | ----------------------- | ------------- | -------: | --------: | -----------: | ---------------------------: |
| 3 m           | 18 / 72 m               | Spadefish     |    0.220 |         8 |         36.4 |                         1.40 |
| 6 m           | 80 / 320 m              | Giant octopus |    0.286 |        40 |        139.6 |                        31.41 |
| 10 m          | 180 / 720 m             | Helicoprion   |    0.436 |        42 |         96.4 |                        28.93 |
| 16 m          | 300 / 1200 m            | Mosasaur      |    0.678 |        56 |         82.7 |                        35.67 |
| 25 m          | 440 / 1760 m            | Megalodon     |    1.071 |        70 |         65.3 |                        37.86 |
| 30 m          | 540 / 2160 m            | Megalodon     |    1.300 |        70 |         53.8 |                        31.00 |

The first four meals heal 6.4, 32, 33.6 and 40 health respectively; the last two heal 40. Their mass growth after healing is 0.0027, 0.11208, 0.135, 0.51510, 1.48889 and 0. The 30 m growth cap is retained. A 13 m mosasaur yields 56 hunger at 25 m but only 42.062 at 30 m; at the maximum hunger rate that latter meal buys 32.4 seconds. This diminishing return makes 18–20 m prey materially more useful at the end of the round.

A 15-second cruise covers at most 180 world meters before turns and collisions. Prey move, city walls interrupt straight paths, sprint consumes stamina, lord attacks cause damage, hunger caps at 100, and wounded players divert growth to healing. Safe retreat and reward supplies remain valid options. None of these calculations proves a natural full-round completion or makes food guarantee claims.

## Verification

The focused ecology tests use `createAtlantisCity()` and its actual final colliders, not representative boxes. They check 390 legal initial placements, unchanged nursery availability, five-district resident distribution, immutable individual school bands, migration rejection in the wrong water layer, predator exclusion and unchanged species nutrition. The existing Hawaii ecology tests remain part of the focused run.

Browser evidence is generated by `scripts/verify_atlantis_city_ecology.mjs` into the ignored `.local/atlantis_city_ecology/` directory. It audits native spawning for both characters, school motion and solid exclusion, actual 25 m / 30 m food acquisition, normal 28-second large-prey respawn, and actual gallery-school feeding followed by its normal 18-second respawn. The development interface stages player size, vitals, inspection viewpoints and an encounter approach start. It does not move or freeze the target prey, force a feeding event, bypass walls, modify capture radii, or change lights/fog. Keyboard sprint then drives normal contact and swallowing. Evidence remains a controlled encounter, not a natural progression run.

### Previous 374-animal candidate: integrated evidence on 2026-09-29

The results below describe the preceding population and renderer. They are retained as historical feeding evidence and are not new performance claims for the current 390-animal follow-up.

- `node --test tests/region_ecology.test.js tests/ecosystem_population.test.js`: **17/17 passed**, including final underways, pearl colliders and the unchanged Hawaii population.
- Native initial state: **374 animals, 17 species, zero blocked spawn centers and zero nursery predators**, for both characters. All three lower-gallery school centers have ten-world-meter clearance from the actual city solids.
- Four controlled, normal gameplay captures: Orca and Giant Squid at both **25 m and 30 m** each ate a naturally moving **20 m megalodon**, gaining **70 hunger and 40 health**. Starts were 38 world meters from the target, outside the real capture radius. The live prey were neither repositioned nor frozen. Evidence: `orca_25m_feed.png`, `orca_30m_feed.png`, `squid_25m_feed.png`, and `squid_30m_feed.png`.
- **All 88 additional city school members moved more than one meter** in the six-second observation; the maximum displacement was 6.24 m. The subsequent live audit found no blocked centers or school-layer violations. The consumed large target returned through its normal **28-second** respawn path.
- The final small-school assertion initially waited for one predetermined fish, although the player had eaten other members of that school. The report preserves this test timeout. The corrected focused check tracks the member actually eaten; `ABYSSAL_ECOLOGY_SCOPE=school node scripts/verify_atlantis_city_ecology.mjs` passed with no browser errors and matching before/after game-source hashes. Its nearest initial capture gap was **3.594 m**, versus a **1.079 m** capture radius. A separate replay of that starting point against the actual final city colliders confirmed the 3 m player body and approach ray were clear.
- Actual gallery feeding and swallowing were visible. The consumed spadefish returned via the normal **18-second** path, within its 75.696–87.696 world-depth band, 1.61 m from its original group center, with no solid overlap. Evidence: `gallery_school_feed.png` and `school_report.json`. The preceding `report.json` retains the four large captures, movement, large respawn and the superseded single-target timeout; it is not presented as an entirely passing run. The small-school follow-up includes the later Home/language lifecycle fixes; the earlier captures predate that unrelated UI-only patch.

Performance was sampled at 1440×900, high quality, Chrome headless, in normal follow-camera city play after feeding. Each sample used 90 animation frames and discarded the first 15. Orca and squid median frame intervals were **83.4 / 83.3 ms** (about 12 fps), with p95 **150 / 133.4 ms**. The recorded frames contained **471 / 425 draw calls**, **2.27 / 2.03 million triangles**, and **36 / 33 visible ordinary animals**. Positions and camera composition differed; there is no matched pre-change baseline. These observations do not establish acceptable physical-device performance or demonstrate the absence of a performance regression.

The normal-logic captures and respawn checks support local food access. They do not establish naturally completed rounds, typical hunt intervals, mobile control feel, or real-phone frame rate. No commit, push or release is included in this ecology revision.

### Current 390-animal density follow-up

`node --test tests/region_ecology.test.js tests/ecosystem_population.test.js` passes **18/18 tests** against the actual city solids. It confirms all 390 placements, three intact gallery schools, ten small city schools with 80 animals, 34 city medium prey, unchanged 76-animal world medium stock, unchanged large stock and nutrition, all 168 juvenile-edible nursery residents, and the preserved 90–165-depth progression band. All ten small/medium centers inspected for the latest regrouping are valid at their requested anchors.

The shared feeding rules are unchanged, so the per-meal food/healing/growth table above still applies. In the test’s 30–180-world-depth, 3–6 m prey filter, the available stock decreases from 72 to 62 as ten existing animals move into the deeper city. This is deliberate relocation of offshore supply; it does not remove nursery food or the twelve-animal transition band. Counts are stock observations, not capture-rate estimates.

The final density browser run on 2026-09-29 used `ABYSSAL_ECOLOGY_SCOPE=density ABYSSAL_ECOLOGY_DIRECTORY=.local/atlantis_city_density node scripts/verify_atlantis_city_ecology.mjs`. The 18 focused tests were rerun successfully after the final loading, visibility and collision changes. The browser run passed with no console/page errors and matching before/after hashes for twelve game source files, including the collision grid and creature renderer.

- Native squid expedition: **390 animals, 17 species, 114 city residents**, five occupied districts, zero blocked centers, zero school-layer violations and zero nursery predators. The nursery contained 176 animals in total, including the unchanged 168 juvenile-edible residents.
- **114/114 city school members moved more than one meter** during the six-second observation; maximum displacement was 8.08 m. The subsequent audit still found no blocked centers or school-layer violations.
- The new school at `[18, -402, -650]` supplied normal sardine feeding. The staged 3 m squid started with its body and approach ray clear of the actual city colliders; the nearest school capture gap was **4.58 m**, versus a **0.923 m** capture radius. Keyboard sprint drove normal contact, swallowing was active, and the prey counter rose from two to four. The last ordinary meal supplied eight hunger and 6.4 health.
- The tracked consumed sardine returned through the ordinary **18-second simulation timer**, at world depth 401.634 inside its original 390–414 band, **1.58 m from the school center**, with no solid overlap. Neither the prey nor its timer was manually moved or reset.
- `density_report.json` records the audit, movement, capture, natural respawn, source hashes and both-character nutrition model. `deep_city_small_school.png` and `deep_city_tuna_school.png` are controlled inspection views with normal light and fog; `deep_city_school_feed.png` records the actual feeding HUD and swallowing effects. The nine-member tuna school is visibly grouped in front of city architecture. The 0.3 m sardines are small at the 36 m inspection distance, so their count and behavior are supported by the live audit rather than a claim that every fish is individually legible in that image.

This density run exercises one character's newly added school; the nutrition model covers both characters. It does not repeat the historical four large-prey captures or establish natural encounter rates, complete rounds, mobile control feel, or device frame rate. Performance comparisons belong to the separate matched-view performance report; the preceding 374-animal frame times are not a current benchmark.

## Harbor excavation follow-up — September 30

The existing eight-member Harbor school now uses the excavation metadata at `(-227,-177,-249)`, in the 171–183 world-depth band. Total and regional food stock, biology and nutrition are unchanged. This historical Harbor-only check preceded the Agora relocation below. Fourteen focused ecology tests passed using the final city/furniture/marine colliders, including initial placement, one minute of shared navigation/collision and school respawn placement. Actual Squid feeding and the ordinary 18-second respawn also passed: the consumed fish returned 0.55m from its original center without overlap, with matching source hashes and no browser errors. See [exploration verification](atlantis_exploration_verification.md). The earlier raised Harbor band and its screenshots above are historical evidence.

## Agora excavation follow-up — September 30

The existing eight Agora spadefish now use `fishSanctuary` metadata at `(224,-349,-464)`, in the 343–355 world-depth band. Memorial's anchor, nursery supply, regional totals and nutrition are unchanged. Five focused tests cover the full clear-water cylinder, all eight spawn slots, one minute of ordinary navigation, legal respawn placement and existing rules. The shared browser script selects this school using `ABYSSAL_ECOLOGY_CITY_SITE=agora_bridges`; actual ordinary movement, keyboard-driven feeding and normal 18-second respawn passed with no errors. Evidence is `.local/agora_ecology/school_agora_bridges_report.json`. School access remains a controlled encounter rather than a whole-round survival measurement.

## Poseidon crypt follow-up — September 30

The temple's lower water volume reuses eight city sardines at `(18,-691,-924)` and three of the previous nine deep-city tuna at `(-18,-691,-936)`. The other six tuna retain the original neighborhood anchor. The regional total remains 390, city-school stock 114, and juvenile-edible nursery stock 168. Splitting the tuna group raises school groups from 42 to 43 without adding animals. Both lower schools use the 684–698 world-depth band; site metadata owns their center-patrol radii and the shared habitat helpers own movement and respawn.

This is an exploration habitat, not a replacement for large-prey feeding. At lengths 25/30 m the eleven small-to-medium fish provide only about 4.30/2.95 hunger in total under the unchanged undersized-prey rule. Grown characters must still seek larger animals in the surrounding city. The setting is fantasy ecology; sardines at this depth are not a claim about natural biological habitat. Final source checks and actual-game feeding evidence belong in the [exploration verification record](atlantis_exploration_verification.md).
