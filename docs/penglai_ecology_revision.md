# Penglai habitat and guardian supplies — 2026-10-27

Penglai accepted for main release — 2026-10-27: the user explicitly accepts
all current map changes and requests committing and pushing them to main.
All 1,893 delivered input hashes match before release-only edits. This approval
supersedes earlier pending/uncommitted labels for these delivered Penglai
changes, including the repository Skill, ecology, landmark navigation and Kun
visibility fixes. Earlier entries retain their dated evidence and rejected
iterations. The release is v0.11.21; see [the release record](release_v0_11_21.md).
Fresh release CI and deployed-page checks are recorded separately from candidate
validation. Preserve existing services and historical worktrees.

The user requests plausible habitats for every creature, one ordinary hunter
capable of retaliating against a 30 m player near each lord, and a limited food
reserve. This candidate is uncommitted and unpushed; player balance review is
still pending.

## Findings and adjustment

The final runtime roster, after shared density processing, had 402 ordinary
individuals. The northern giants did not cover the southern and summit arenas.
Native initial placement found no 30 m threat within 130 m of Azure Dragon,
Vermilion Bird or Sword Sage. The Tiger had Taotie but no nearby harmless medium
meal. The Tortoise's six-metre Spirit Carp were roughly 165–270 m away.

A Penglai-only fit now runs after shared population processing. It relocates
three of the existing six Bashe and three of the existing sixteen Lushu, and
moves/reduces selected food groups. It creates no new species or hunter. The
ordinary population is **393**, plus the existing single rare. Transformations
remain alternative forms of existing individuals.

| Lord           | Ordinary 30 m threat                            | Deliberate nearby food reserve                                 |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| Azure Dragon   | one 29 m Bashe on the eastern cloud flank       | three 11 m Bifang beyond the side of the dragon columns        |
| White Tiger    | existing 32 m Taotie on the mountain shoulder   | three 7.8 m Lushu, separated around walkable court margins     |
| Vermilion Bird | one 29 m Bashe in the southern cloud passage    | three 8.5 m Cloud Cranes                                       |
| Black Tortoise | existing 29 m Northern Hujiao in the deep basin | three pairs of 6 m Spirit Carp, at depths 185–230 m            |
| Sword Sage     | one 29 m Bashe beside the upper summit airspace | three 11 m Bifang above the temple, clear of its roof/monument |

These are resident reserves, not an exclusive census of everything that can
pass through a lord's territory. Other existing animals remain on nearby routes.
Small Winged Fish can pass the southern arena, but are negligible adult meals;
existing sub-25 m predators become edible as the player grows. A Bashe is
edible at 30 m **and can retaliate** under the existing yellow-target rule;
Taotie remains a larger dangerous hunter. No damage or retaliation thresholds
were raised. The Sage still pursues across the map after unlock: his starting
territory has supplies, but food does not teleport after him.

The three revised aerial groups have a 28 m centre orbit, preserving actual
wing/formation spacing. Other flocks retain their old orbit. Their complete
circuits and the three underwater reserves have clear 25/30 m body routes from
the corresponding arena centres. The initial Azure placement hit a dragon
column; it was moved to the east. Two trial Lushu homes stalled along a steep
edge; the final homes lie on the court shoulders and move normally in the live
sample. Terrain, collision geometry and accepted appearance/motion stay intact.

## Complete habitat coverage

| Creature         | Current stock | Habitat / role                                                   |
| ---------------- | ------------: | ---------------------------------------------------------------- |
| Jade Minnow      |            40 | protected shallow nursery                                        |
| Lotus Sprite     |            32 | protected shallow lotus waters                                   |
| Wenyao           |            44 | lower southern cloud routes, small progression prey              |
| Luoyu            |            48 | lower/middle mountain airways                                    |
| Chiru            |            27 | pools and upper northern water                                   |
| Xuangui          |            24 | pools and northern underwater shelves                            |
| Spirit Carp      |            30 | lower cloud routes; six individuals in the deep basin            |
| Lushu            |            16 | walkable mountain paths, including the three Tiger-side homes    |
| Cloud Crane      |            28 | peach-grove airspace; small southern reserve                     |
| Dragon-Gate Carp |            30 | cloud routes; two existing individuals can transform at the gate |
| Bifang           |            16 | middle/upper airspace; Azure and Sage reserves                   |
| Nine-Tailed Fox  |             9 | peach-covered mountain ridges                                    |
| Hujiao           |             5 | pools and the deeper northern basin                              |
| Gudiao           |            18 | mountain airspace, intermediate predator                         |
| Zheng            |             9 | eastern/western mountain ground                                  |
| Bashe            |             6 | three guardian airways plus three existing northern homes        |
| Kui              |             4 | remote northern mountain ground                                  |
| Kun              |             4 | high northern clouds; existing Peng transformations              |
| Northern Hujiao  |             1 | underwater Tortoise basin                                        |
| Taotie           |             2 | Tiger shoulder and existing remote mountain approach             |

The Dragon-Gate Cloud Dragon's existing 25 m threat ceiling is deliberately
not counted as a 30 m threat. Peng, rare selection, starter food, growth, meal
values, skill rules, world size and all other maps remain unchanged.

## Verification and limits

Evidence: `.local/penglai_ecology_20261027/`.

- `before_config.json` and `before/report.json`: final processed configuration
  and actual initial scene, not just raw species rows.
- `live_final/report.json`: ordinary simulation sampled over roughly 24 seconds;
  all sampled water/air individuals stay on the correct side of terrain/water.
  Three relocated Lushu move on the ground. Five isolated native encounters
  with a staged 30 m player produce pursuit and real health loss from the
  designated predators. Bosses are disabled only for those attribution checks;
  NPC movement and ordinary bite code run normally. Slow input is held, so this
  demonstrates attack capability rather than a claim about full-speed difficulty.
- `lifecycle/report.json`: staged approaches consume the five reserve types
  through normal capture; hunger increases. The original 18-second food timer
  is observed, pause stops it, residents return to their homes, and restart
  restores the exact population without duplicates.
- `tests/penglai_ecology.test.js`: finite stock, immutable configuration,
  nursery exclusion, legal predator homes/respawns, adult meal access, complete
  food flight circuits and unchanged default flock motion. Existing stock
  expectations were updated to the new requested regional population.
- Fresh full suite: **1,987 / 1,987** passed. The other seven final regional
  configurations match the pre-fit pipeline exactly (`other_regions.json`).
- Restricted build: **809 artifacts / 232,468,792 bytes**, entry
  `index-B9SmvvEx.js`. Every local/runtime hash matches; the three changed
  public artifacts are freshly fetched and hashed. The other 806 assets retain
  their dated prior full-public evidence. Existing service identities are preserved.
  `artifacts.json` records the exact scope; it does not claim 809 fresh downloads.

The one-meal hunger returns at 30 m remain 36.3 for Bifang, 18.0625 for Cloud
Crane, 14.35824 for Lushu and 7.2 for Spirit Carp. The northern reserve is split
into small pairs rather than a large refill ball. These values plus existing
respawns support recovery opportunities; they do not prove whole-fight balance.
Native desktop checks are not physical-phone tests. No performance or heat
improvement is claimed from removing nine individuals. No new meshes, textures,
per-frame scene scans or shaders are introduced.
