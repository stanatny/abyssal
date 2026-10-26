# Europa expanded-map ecology finish — candidate, 2026-10-26

Publication scope — 2026-10-26: the user requests a final audit and main
publication if no blocking work remains. The audit clears this delivered scope
for v0.11.20. Earlier pending, rejected and no-push statements below retain their
dated revision context; superseded appearances are not restored. See the
[release record](release_v0_11_20.md) for final scope, verification and limitations.

The user asks whether the enlarged basin can support progression and lord fights,
with a dangerous adult predator and a limited food reserve around each lord.
This follow-up is independent work on `art/europa-hf-redraw`. It preserves the
uncommitted creature, terrain and six-compartment ship work. No commit or push
is requested.

## Findings and change

The previous 352 ordinary animals were sufficient as an inventory, but their
placement did not meet the requested battle layout. Terrain-valid initial
positions within 180 world metres of each lord gave:

| Arena         |                                        Before: harmless prey of at least 10 m | Nearest predator able to threaten 30 m | After: local reserve / threat                          |
| ------------- | ----------------------------------------------------------------------------: | -------------------------------------: | ------------------------------------------------------ |
| Brine Regent  |                                                             8 Crown Filterers |                                  750 m | 3 Crown Filterers / 1 Rift Reaver                      |
| Lumen Stalker | 4 Crown Filterers and 4 Bell Carriers; all four Crown routes crossed the ship |                                  317 m | 1 Crown Filterer and 2 Bell Carriers / 1 Rift Reaver   |
| Abyss Weaver  |                                                                             0 |                                  229 m | 1 Siphon Colossus and 2 Spiral Grazers / 1 Void Siphon |

The same absence of nearby adult threats and bottom-layer food was observed in
native Chrome with the normal moving population. The new three feeding homes
per arena lie 66–124 m from its center, with separate resident ranges. All nine
have clear, full-body direct approaches at both 25 and 30 m. They are ordinary
animals: they move, evade, can be consumed, and replenish through the existing
28-second solitary lifecycle. Counts are initial local reserves, not a promise
that three animals remain uneaten beside a player. Other roaming food may cross
the measurement boundary temporarily.

The total and every species count remain unchanged: 352 ordinary animals plus
the separate regional rare. `fitEuropaEcology` fits existing independent homes
after the shared stock pipeline, so no second food multiplier is introduced.
The other maps retain the original pipeline. Early schools, all models/textures,
meal values, recovery, hunger, speeds, combat and three-lord victory rules remain.

Two of the existing three 29 m Rift Reavers move to the upper lord outskirts;
the third keeps a basin patrol. Their minimum habitat depth is expanded to the
brine layer, coherently in catalog and runtime data. One of the two 32 m Void
Siphons moves nearer Weaver's Hollow. The shared retaliation rule already makes
the former yellow edible threats at 30 m and the latter dangerous non-edible
hunters. Neither enters the protected nursery. They can be evaded or defeated;
this does not make a permanently invulnerable guard.

A second finishing defect appeared during the placement audit: the expanded
ship enclosed five existing Prism Hunter homes. Those homes are relocated to
the eastern rim and basin approach. Audited ordinary births are outside the hull, and
existing creature collision/navigation continues to prevent wall penetration.
This does not forbid an animal following a player through an actual open door.

## Food budgets and progression limits

The shared 30 m hunger drain at the first arena is about 2.80/s, and 3/s at the
two deeper arenas. One Crown Filterer yields 44.08 effective nutrition at 30 m;
a Bell Carrier, Siphon Colossus or Spiral Grazer yields 111/123/132 before the
player's current bar cap. The first reserve therefore offers smaller, separate
meals; later reserves offer a few substantial meals. A clear one-way 12 m/s
approach takes roughly 5.5–10.4 seconds, before steering, evasion, combat or
searching. Existing valid lord bites still provide 8 hunger. There is no extra
reward, automatic supply or hunger reduction.

A first-stock calculation using `consumePrey`, actual legal spawn positions and
the existing mass curve reaches 25 m in 59–60 ordinary meals for all four
characters, starting at 100 or 70 health. It excludes elapsed hunger, actual
travel, repeated injuries, failed captures and respawn. This establishes that
the retained inventory supports the growth ladder, not a measured completion
time or guaranteed full-round success. The natural experience and physical-phone
performance still require player review.

## Fresh verification

Evidence: `.local/europa_ecology_finish_20261026/`.

- `baseline.json`, `candidate.json`: all 352 legal births; arena distances,
  actual adult-body obstacle checks, limited reserves and threat coverage.
- `native_baseline.json`, `native_final.json`: serial native Chrome,
  normally moving populations over twelve samples per arena. Revised food is
  3–4 / 3 / 3 nearby; the fourth upper animal briefly enters from a side route.
  The middle guard is actually eaten during observation, rather than disappearing
  from its habitat. Player placement and invulnerability isolate observation.
- `combat/report.json`: normal AI and actual damage against staged 30 m players
  at all three new guard sites. Health falls to 52 / 0 / 0; other predators and
  lords are isolated for attribution. This proves real damage, not fair difficulty
  or that a deliberately slow, non-dodging victim should survive.
- `feeding/report.json`: actual keyboard-steered captures of moving Crown,
  Bell and Spiral prey; recovery effects and capped nutrition settle normally.
  All three replenish at their original fitted homes after the ordinary delay;
  pause freezes their timers. Predators/lords are isolated for this contract test.
- `feeding_final/report.json`: the final upper Crown site is rechecked after
  preserving the original intermediate feeding layers. The earlier two other
  feeding sites are unchanged.
- `rule_preservation.json`: all seven other maps are deeply equal to the
  preceding configuration; all sixteen Europa kinds retain stock, size, rewards,
  movement and combat fields.
- `economy.json`: explicitly limited growth and battle budget calculations.
- Unit, production build, source preservation and restricted-preview results
  are recorded with this candidate's final delivery, separately from historical
  ship/terrain receipts.

The first full regression exposed two original feeding-layer contracts lost by
the draft relocation. The final fit retains an independent animal at every
original depth/longitudinal feeding station as well as the new battle reserves.
The tests were retained; no shared coverage requirement was weakened. The first
failed placement check also exposed the five old Prism homes enclosed by the
ship, and prompted their relocation before delivery. Historical failed logs
remain beside the final results.

A final birth-envelope check also separates the upper Crown feeding home from
the Rift Reaver's body. The relocated food remains on the original feeding
layer and is re-tested through actual capture and home replenishment.

## Final candidate validation

The final full run passes 1,873 / 1,873 checks (`full_tests_delivery.log`);
formatting and production build pass. The restricted preview keeps the same
URL and processes, now serving `./assets/index-fW4LeW5x.js`: 674 artifacts /
180,663,376 bytes. `artifacts_previous.json` verifies the full preceding build against
both origins. After the final food-home adjustment, `artifacts.json` freshly
checks all three changed files per origin and reuses the matching hashes for
671 unchanged content-addressed resources. All final dist/runtime files are
hashed again; twelve forbidden paths per origin remain refused.

Source preservation compares all 1,712 preceding inputs: seven existing
files change and three project files are added; 1,705 other inputs, including
every model/texture and shared gameplay/renderer module, remain identical.
No new HF generation, geometry, texture or per-frame subsystem is added.
This is not a measured phone-FPS or heat improvement. No commit or push.

`public/report.json` passes native Chrome English 1440 px and Chinese 390 px
production entry, both relevant Guide entries, start/controls/pause/Home and
same-address reload against the final entry. No page errors, failed requests or
production debug hooks are observed. The narrow view is desktop touch emulation,
not a physical phone. Reload the preview and start a new Europa round to use the
new distribution.
