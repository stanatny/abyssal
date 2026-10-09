# Medium and late-game meal progression

The current uncommitted recovery follow-up on `art/mariana-irregular-terrain` supersedes historical immediate-meal healing: baseline0.5 health/second, or up to three independently expiring2-health/second meal layers (2/4/6 total). Nutrition/growth allocation remains separate from rate and lifetime; hunger, adult bonuses and special rewards retain their rules. Read [the current recovery candidate](health_recovery_revision.md) for the2.5–10-second layer boundaries, HUD and verification limits. The original measurements below remain evidence for their recorded versions.

Only Mechanical Shark torpedo kills of oversized ordinary prey use the growth-only assimilation described in [the all-region pacing candidate](progression_pacing_revision.md). Other characters and normal contact/companion feeding remain unaffected. The original adult curve below remains intact; its original test and publication status are historical.

Uncommitted follow-up on `feature/mechanical-shark`, local checkpoint `8d55481`. The player accepted greater five-region food density but still found progression after 10 m too slow. This task explicitly changes effective meal returns; it preserves the preceding density, distribution, control, marker and torpedo work. No commit, push, main integration or formal release is authorized. Published Pages remains v0.8.3.

## Cause and shared rule

Length remains `6 * cbrt(mass)`, with mass capped at 125 and length at 30 m. A fixed mass reward therefore changes length progressively less as the character grows. Relative-size penalties and healing-first allocation can make repeated undersized or injured feeding particularly slow. Population increases alone do not correct that meal economy.

`preyMealReward()` and `PREY_REWARD_RULES` in `src/simulation.js` now compute a bounded adult bonus from the **pre-meal** length:

```text
stage = clamp((length - 10) / 15, 0, 1)
preyScale = clamp((preyLength - 2) / 4, 0, 1)
bonus = stage * preyScale
ordinaryGrowth = baseGrowth * existingRelativeEfficiency * (1 + 3 * bonus)
ordinaryNutrition = baseNutrition * existingRelativeEfficiency * (1 + 0.5 * bonus)
```

Prey at least 6 m receive 2× / 3× / 4× growth at character lengths 15 / 20 / 25 m, and approximately 1.17× / 1.33× / 1.5× nutrition. The bonus is continuous at 10 and 25 m, capped thereafter. Food at most 2 m receives no adult bonus; 2–6 m prey receive a partial bonus. The existing square relative-size penalty and tiny-school juvenile supplement remain, so undersized meals do not become equivalent to large prey. Catalog base values stay unchanged; the bilingual Guide explains effective returns separately.

Shared nutrition settlement still scales juvenile growth below 6 m, heals first, keeps at least 30% growth after maximum healing allocation and clamps actual vitals/mass. Full hunger never discards valid growth. No passive food, size milestone payout, larger capture radius, weaker hunger, changed populations or reduced threats are introduced.

Normal contact, confirmed torpedo kills and Zombie Shark companion feeding use the same meal calculation. Companion stamina recovery uses effective nutrition computed before the owner grows, including the adult bonus, regardless of hunger already being full. It is credited once rather than multiplying the bonus again. Lord defeat loot continues through the separate generic nutrition path; lord per-hit hunger, eligibility, three-hit battles, pickups, sacrificial costs, quests and all five regional completion conditions are unchanged. Local records are retained; times across balance revisions are not strictly comparable.

## Meal-economy comparison

The frozen baseline is the immediately preceding uncommitted candidate, including denser populations and homing/control work. These calculations use actual shared settlement and synthetic ordinary prey with the same fixed size/base reward on both sides. No travel, AI, respawn waiting, hunger clock or boss encounter is modeled; these are **meal counts, not observed full-round times**.

| Character growth | Repeated prey | Healthy, before → now | 30 health missing before each meal, before → now |
| ---------------- | ------------: | --------------------: | -----------------------------------------------: |
| 10 → 15 m        |           7 m |               21 → 14 |                                          54 → 32 |
| 15 → 20 m        |           7 m |               64 → 25 |                                         213 → 80 |
| 20 → 25 m        |          12 m |                30 → 9 |                                          59 → 14 |
| 25 → 30 m        |          18 m |                22 → 6 |                                           36 → 8 |

A greedy, healthy catalog ladder from 10 m to 30 m changes from 49 to 21 meals in Hawaii/Atlantis, 49 to 20 in Bermuda and 74 to 30 in Europa. Mariana's 15 m regional start changes from 37 to 12 meals. This optimistic model assumes the most rewarding eligible registered prey are always accessible; it does not prove route/depth availability or bypass the real gatekeepers.

The existing hunger-aware event route, with explicitly assumed capture intervals, travel, damage and a lord battle, changes from 777.6 / 972 / 1215 seconds to 438.4 / 548 / 690 seconds in fast / standard / slow timing. Those are controlled event assumptions, not natural player sessions. The maximum 30-minute active-round limit remains. Early feeding and hunger-pressure tests retain their original juvenile behavior.

## Verification and review limits

Fresh checks pass **779 units**, formatting/build and all **29 shared browser checks**. Six focused reward cases cover unchanged juvenile/tiny-food behavior, continuous adult boundaries, relative-size scaling, healing/caps, contact/ranged/companion parity and unchanged lord/pickup/gate behavior. Actual native-start development cases on all five maps feed an existing medium creature through real mouth contact and observe higher growth, healing and hunger without an accidental win; pause freezes the result. Fixtures isolate the contract with controlled position/size and suppress unrelated encounters, so these are not natural density or pacing measurements.

Native J-key casts also confirm one actual Mechanical Shark kill and one actual companion meal on an existing 11 m Pliosaur. Owner rewards settle once, companion stamina uses the increased effective nutrition, and home clears the projectile/companion state. The bilingual player and ordinary-prey Guide notes pass desktop and small-touch inspection. The first runtime setup waited for an exact 20 m model scale while uncontrolled spawn contact could already grow the player; the corrected fixture isolates unrelated prey before waiting. An initial ability oracle also incorrectly expected the full adult bonus from a 3 m Tuna; the final 11 m fixture exercises the full bonus without changing any fish configuration. Preserve both failed test receipts.

Final compiled local/public verification passes all six native cases: English desktop, Chinese small portrait and English touch landscape on each host. Both-language player Guide notes, selection, Start, real repeat torpedo fire, held touch Slow swim and pause/home cleanup work without page/console errors or horizontal overflow. All 212 runtime source fingerprints and eight artifacts per host match the refreshed candidate. The source delta from the frozen preceding candidate is limited to shared meal settlement, companion stamina and bilingual Guide explanations; population, world and combat modules are untouched. Receipts and the frozen preceding source snapshot stay in ignored `.local/progression_review/`. Physical-device feel and a natural whole expedition remain player-review work; the controlled economy models should guide tuning rather than promise a completion time.

## Rollback

The ignored `baseline_src` snapshot preserves all earlier uncommitted work. Remove only the adult meal helper/config and its ordinary feeding call sites, restore the companion's previous effective-nutrition calculation, and revert the corresponding Guide text, current rule/docs and intentional reward expectations together. Do not reset to `8d55481`: that would also discard accepted marker/control/homing/density work. No saved-record deletion or data migration is required.
