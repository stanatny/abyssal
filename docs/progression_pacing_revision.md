# All-region progression and recovery supplies

Release status: the reviewed changes in this document are included in v0.11.0. Earlier candidate restrictions and preview labels below describe their original review state; measurements are not newly repeated publication checks. See [the release summary](release_v0_11_0.md) and [current verification](verification.md).

This is an uncommitted gameplay candidate following the locally authorized Odyssean Sea checkpoint `01da839`. Formal seven-region v0.10.2 is unchanged. The user requests a steady shallow-to-deep progression, continued adult food, and usable recovery prey during lord fights. Their later clarification removes only the guaranteed starter Frenzy: random Frenzy may still occur in the shallows.

## Smallest changes to the diagnosed shortcuts

- Guaranteed introductory rewards are now Vitality Supply and Ocean Current. The remaining eighteen random slots retain six of each kind; the pooled total falls from twenty-one to twenty. Frenzy is an occasional find, including in shallow water, with no size, nursery or spawn-distance gate. Random placement uses actual terrain/solid validation and regional river/air route contracts; an impossible slot stays disabled instead of falling back near the spawn. Durations remain 20 s Frenzy / 30 s Current, with 45 active seconds before a collected reward returns. No pickup itself grants growth or enlarges edible-size eligibility.
- Several Europa nursery schools and Bermuda sardines previously wrapped through too few habitat anchors, placing two or three same-kind schools at identical centers. Only repeated protected nursery centers move to distinct nearby safe-area homes. Counts, depth bands, first original homes, nutrition and formation semantics remain. Fixed/interior profiles are excluded. Legal native spawning still validates these proposed centers.
- Independent large airborne Penglai predators now receive an individual initial home per resident instead of wrapping a few shared points. Their population and attacks remain unchanged. Normal flock formation and ground residents are untouched.
- Atlantis Basilosaurus and Megalodon retain adult water layers and stock, with legal outer-street homes and a 65-unit resident patrol radius. Their starting lateral corridors are 125 units from the center, keeping later dispersed homes clear of the temple walls. This keeps substantial meals near their assigned lower-city routes instead of allowing long-range replacement to empty a guardian's feeding outskirts. It does not add clustered lord food.
- Only Mechanical Shark torpedo kills of ordinary prey far larger than the player grant reduced, still positive **growth**, while nutrition and healing remain unchanged. After the shared ordinary-meal helper returns, `consumeDefeatedPrey()` applies `assimilation = min(1, 1.25 * preMealLength / preyLength)^2`. The grace ratio and exponent live in `PREY_REWARD_RULES`. Other characters, normal mouth captures and permitted companion meals are unchanged; prey up to 1.25 times the player's size retain full growth. Lord loot, rare blessings, quest objects and pickups bypass this adjustment. Two-hit ordinary torpedo durability, costs, homing and direct meal settlement are preserved.

## Economy evidence, distinct from play time

Frenzy only widens near-mouth gathering; the accepted adult reward curve still rises from 10 to 25 m. Small-food returns diminish with body size and injured players heal first. No global density, hunger, damage, survival timer or objective change is included.

The separate Mechanical Shark oversized-kill shortcut was reproducible in projectile accounting: a 3 m Mechanical Shark paying two torpedo costs and eating a 32 m Void Siphon previously reached 7.082 m; two such kills reached 10.039 m. With growth assimilation the same sequence reaches 3.158 m and 3.325 m, respectively. Healing and nutrition are identical. This is a deterministic settlement calculation, excluding aim, travel, danger and failed shots; it is not an observed completion time.

| Pre-meal player | Previous size after one 32 m meal | Candidate size | Meaning                                                      |
| --------------- | --------------------------------- | -------------- | ------------------------------------------------------------ |
| 3 m             | 7.082 m                           | 3.158 m        | Preserve juvenile stage                                      |
| 6 m             | 9.555 m                           | 6.317 m        | An oversized torpedo kill is useful without skipping midgame |
| 10 m            | 11.832 m                          | 10.323 m       | Keep medium-prey progression relevant                        |
| 15 m            | 16.785 m                          | 15.659 m       | Adult rewards remain meaningful                              |
| 20 m            | 21.599 m                          | 21.005 m       | Gradual assimilation recovery                                |
| 25 m            | 26.420 m                          | 26.357 m       | Almost unchanged near-sized late meal                        |

Actual ordinary inventories are unchanged: Hawaii 516, Atlantis 560, Bermuda 467, Mariana 453, Amazon 409, Europa 352, Penglai 437 and Odyssey 269. Rare creatures, lords and surface activity are separate. Mariana and Penglai intentionally start at 15 m; other regions start at 3 m. Early accidental meals can reduce live visible stock before a runtime snapshot, so compare pool inventory and retired individuals separately.

## Regional review and boundaries

Hawaii and Bermuda already provide protected nurseries, medium outer-reef schools and dispersed large deep meals. Atlantis retains both street/interior schools and deeper predator meals. Mariana supplies each ordered canyon before its guardian seal. Amazon uses both channels and root-vault habitats; Europa supplies each ice-ocean layer. Penglai uses water, ground and flying food, while Odyssey retains twenty-one ordinary kinds with separate reef and deep reserves. No region receives another region's creatures or a new lord sequence.

Preferred-anchor checks identified thinner reserves near Bermuda Hydra, the Europa Weaver, Atlantis rear guardian and Odyssey Charybdis. The revision checks actual moving, legally placed ecology before adding anything. A territory radius is not an attack radius: edible animals need reachable retreat routes, and food can exist inside a territory but outside its currently warned skill. Population totals and catalogue entries alone do not establish accessibility.

## Verification and review limits

Evidence belongs in ignored `.local/progression_review/`: accepted baseline source, deterministic economy, native fixed-seed eight-region samples, reward/lifecycle cases, actual feeding and respawn, bilingual Guide views, and final artifact/source receipts. The baseline probe's initial invalid 30 m player-construction fixture is retained separately; it was corrected to preserve the factory's legal starting-size contract. An interrupted candidate probe was stopped before the user's shallow-Frenzy correction; it is not an acceptance receipt.

Native station checks use controlled player lengths and positions with ordinary ecology still moving. They measure accessible food and injury recovery in those samples, rather than natural search time or guaranteed expedition length. Controlled contact/projectile cases validate settlement; they must not be presented as an unassisted full round. Physical-phone ergonomics, heat and subjective full-round pacing remain user-review limits.

Rollback only this candidate's shared reward, assimilation and habitat delta. Keep checkpoint `01da839`, accepted art/motion, regional isolation, normal habitat replenishment and the published edition intact. Do not restore historical blanket density cuts or reintroduce a forbidden shallow-Frenzy gate after the user's clarification.

## Pre-correction progression validation receipts

The full **958-unit** suite passes, including the true Atlantis terrain and complete city colliders. The first resident-home experiment failed a real Megalodon spawn against the temple wall; the final outer-street homes are legal. The nursery replacement test now explicitly verifies that a resident returns to its deep home rather than near a shallow player, remains within its resident radius and cannot hunt that player. Its nonresident rejection contract remains intact.

Native before/candidate samples use fresh Chrome contexts, seed 71523, 1440×900, default **High**, and the normally moving ecology. An initial retained harness annotation incorrectly said Smooth; neither run toggled the quality control. The source contract and correction are recorded alongside the preserved raw reports. These are feeding/accessibility checks, not performance benchmarks.

| Region   | Edible nonpredator food within 150 units of start | Useful recovery meals at the 25 m station | Smallest sampled lord recovery reserve |
| -------- | ------------------------------------------------: | ----------------------------------------: | -------------------------------------: |
| Hawaii   |                                               229 |                                         9 |                                      5 |
| Atlantis |                                               168 |                                        20 |                                      6 |
| Bermuda  |                                               197 |                                         7 |                                      3 |
| Mariana  |                                               108 |                                        22 |                                      7 |
| Amazon   |                                               170 |                                         9 |                                     14 |
| Europa   |                                               140 |                                         6 |                                     11 |
| Penglai  |                                                54 |                                        17 |                                      6 |
| Odyssey  |                                                62 |                                        19 |                                     11 |

The start is 15 m in Mariana/Penglai and 3 m elsewhere. Stations use 3/6/10/16/25/30 m where applicable, choosing existing appropriate food routes. A useful recovery meal can restore at least fifteen health to an injured 25 m Orca in the shared accounting. Lord sampling uses the existing territory plus a reachable feeding-outskirts distance, with ecology still moving. Atlantis's rear reserve changes from one to six useful meals in these sequential samples; this is not a guarantee of identical stock at every future moment. All eight full ordinary pool totals remain intact. All twenty reward slots are legally placed in the candidate sample; random shallow Frenzy occurs in five regions in this seed, without a mandatory starter.

The actual Atlantis mouth-contact case restores health from 30 to 100 after a 20 m Megalodon meal, retains growth and hunger, and credits one meal. Its normal main-loop replenishment returns to the resident home, even while the player is back in the nursery. The controlled respawn timer is shortened only in the fixture; runtime respawn rules are unchanged. A native J-key Europa Mechanical Shark case uses two real torpedoes to defeat a 32 m Void Siphon, grows from 3 to 3.158 m, heals the paid health and credits the meal once. These contact/target fixtures are separate from the normally moving food-availability samples.

The native reward check passes at English 1440/320 px and Chinese 390 px: two fixed starters, eighteen balanced random slots, reusable meshes across reset, +50 supply, full-stamina/30 s Current, 20 s Frenzy and paused timers. Both-language Guide explains occasional shallow Frenzy. Oversized growth reduction appears only in the Mechanical Shark active-ability description; generic feeding and other-character cards carry no such limitation. The early invalid/interrupted probes and superseded unit failures remain diagnostic records, not passing receipts.

The shared native browser suite passes **29 checks**, including recovery, three-hit lord contact and settlement. Its reward-model check now inspects the whole pool rather than assuming the first three slots are guaranteed reward types. The warning/recovery fixture holds actual K slow-swim and restores a level heading to remain in the territory during a randomly selected lord's full attack; no lord timing or difficulty is altered. Failed old-fixture receipts remain separate.

Formatting and production build pass, retaining the existing large-bundle warning. The restricted compiled **local and public** hosts each pass **32 bilingual affected Guide cases**, **eight region/character play–pause–home flows**, and **320/390 px** reward views with no observed errors. Production debug hooks are absent. All **nine active artifacts per host** and **300 runtime/build source fingerprints** match. The preceding build and manifest are retained for rollback; old hashed assets remain available for pages already open during the index swap. Private/development paths are denied. The temporary baseline-only 5282 server is stopped; established development/preview/tunnel services remain intact. Current candidate: https://satisfactory-keyword-recently-cakes.trycloudflare.com/?preview=steady-progression-20261005.

## Mechanical-only scope correction

The user's follow-up rejects presenting oversized growth assimilation as a universal character rule. The first candidate placed this multiplier in the shared ordinary reward helper and its explanation in every feeding note. The corrected candidate keeps ordinary rewards unchanged and applies the positive growth multiplier only to Mechanical Shark projectile settlement. Normal mouth captures, the other three characters and valid companion meals remain unaffected. The two-hit rule and nutrition/healing are unchanged; zero growth is not the design. Both locales explain the exception only in the Mechanical Shark active ability.

Scope-correction evidence and immediate-before snapshots are under ignored `.local/progression_review/mechanical_scope/`. Earlier eight-region ecology, reward placement and shared browser receipts describe the preserved progression changes, not freshly repeated tests for this follow-up.

Fresh scope-correction verification passes **961 unit tests**, including 28 focused rule checks, and both native mouth/projectile cases. Native bilingual Guide passes 15 cards plus four character flows. Compiled local/public each pass 15 Guide cases at English 1440/320 px and Chinese 390 px plus four character play/pause/home flows. Other-role and ordinary-creature text excludes the special growth limitation, while the Mechanical active card describes positive reduced growth. Formatting/build pass; nine active artifacts per host and all 300 runtime/build fingerprints match. The immediate-before preview is retained. Current candidate: https://satisfactory-keyword-recently-cakes.trycloudflare.com/?preview=mechanical-growth-scope-20261005. New work remains uncommitted and formal seven-region v0.10.2 is unchanged.
