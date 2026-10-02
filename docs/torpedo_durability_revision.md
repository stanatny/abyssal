# Two-hit ordinary torpedo targets

Reviewed follow-up on `feature/mechanical-shark`, based on local checkpoint `8d55481`. The user requests reducing Mechanical Shark's torpedo hits against larger ordinary hunters from three to two. This continues the accepted equal/larger ordinary-target rule; it does not change Abyss Lord durability. Preserve the preceding uncommitted meal progression, denser five-region ecology, homing, markers, 2-second cooldown and touch Slow swim. On October 3 the user accepted the candidate and authorized committing and pushing the current development branch, including the preceding accepted refinements. Main integration and formal release are not requested. Published Pages remains v0.8.3.

## Implemented contract

| Target at the time of impact                         | Required valid torpedo hits |
| ---------------------------------------------------- | --------------------------: |
| Ordinary creature smaller than the player            |                           1 |
| Ordinary creature equal to or larger than the player |                           2 |
| Abyss Lord, player below 25 m                        |                  Ineligible |
| Abyss Lord, player at least 25 m                     |        3 shared battle hits |

`MECHANICAL_RULES.giantHits` owns the ordinary threshold. Actual explosions, reticle estimates and ordinary target fractions use that same value. Lord estimates retain the separate `BOSS_REQUIRED_HITS` constant; bites and torpedoes still share lord battle progress. Damage eligibility is evaluated at impact using the player's current size, so growing beyond an ordinary creature can reduce the next hit's requirement.

Nonlethal hits grant no food or growth. A confirmed kill retires the ordinary creature and credits the existing shared meal exactly once, including the current adult reward bonus. Retirement and respawn clear its hit counter. Costs, homing, range, blast radius, occlusion, boss cooldowns, normal respawn and all regional objectives retain their existing rules. No ecosystem, population, survival or art changes belong to this follow-up.

Selection, the Ocean Guide, dynamic target text and English/Chinese descriptions distinguish two ordinary hits from three lord hits. Current README, production brief and repository rules agree; earlier three-hit ordinary measurements are explicitly historical.

## Verification

Fresh verification passes **780 units**, **28 focused rule/aim/reward checks**, formatting and build. Equal-sized and larger ordinary targets survive one impact and die on the second; the actual projectile test credits the shared adult meal exactly once. Existing lord tests still require 25 m and three separate valid hits, and preserve mixed bite/torpedo progress, occlusion, costs, cooldown, reset and bounded resource behavior.

Native English desktop and Chinese small-touch gameplay each use a real 20 m Megalodon against a 15 m Mechanical Shark. The reticle shows two required hits, then one after the first real cast. The first explosion retires nothing and grants no mass or meal credit; the second retires the creature and grants one shared healing/growth meal. Home clears projectiles. Fixtures isolate encounters without changing species, so they establish accounting and presentation rather than natural round balance. An initial browser oracle incorrectly expected the retired target to retain two hits; the runtime correctly clears that counter on retirement. The corrected assertion and failed first receipt are preserved.

The refreshed restricted build passes six compiled native cases across local/public hosts: English desktop, Chinese small portrait and English touch landscape per host. Selection, both-language ordinary/lord Guide descriptions, retained adult-meal note, actual repeated 2-second fire, touch Slow swim and pause/home work with no errors or overflow. All **212 runtime fingerprints** and **eight artifacts per host** match. Actual desktop and small-touch screenshots were inspected. Only the ordinary rule, reticle/target expressions and bilingual character/Guide modules differ from the frozen preceding runtime; the other 207 runtime files remain byte-identical.

Evidence and the preceding runtime hashes/uncommitted diff stay in ignored `.local/torpedo_two_hits/`. Physical-device feel and natural whole-round balance remain player-review limits. The current public preview serves the reviewed development candidate; formal Pages is unchanged.

## Rollback

Restore only this follow-up's ordinary threshold, reticle/target expressions, translations, current documentation and intentional test expectations together. The ignored baseline preserves all earlier uncommitted work. Do not reset to `8d55481`, which would discard the accepted intervening improvements. No saved-record migration or deletion is required.
