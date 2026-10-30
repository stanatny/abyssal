# Eight-region ecology review — 2026-10-30

Status: accepted for a local checkpoint on `fix/all-region-ecology`, based on
published v0.11.23 / `ac8e954`. The user requested an audit and correction of all
eight maps against the established nursery, progression, catalogue and
lord-outskirts rules, then approved the delivered result and requested a local
commit on 2026-10-30. All 2,082 delivered input hashes match before acceptance
notes; runtime inputs and recorded verification remain unchanged. No push,
version bump or publication is requested. The subsequent creature-attitude
review is a separate change.

## Findings and changes

| Region   | Ordinary animals, before → candidate | Result                                                                                                                                                                                                                                        |
| -------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hawaii   | 516 → 516                            | Allocate the two existing Ichthyotitans and two existing adult meals per lord to the actual random lord pair on each round. Refresh those homes when restarting or restoring the map cache.                                                   |
| Atlantis | 560 → 561                            | Give all three Kraken sites their own ordinary adult threat. Separate nearby Basilosaurus/Megalodon supplies and move crowded adults to outer city routes.                                                                                    |
| Bermuda  | 467 → 469                            | Give all four lord sites an adult threat, including the offshore surface Hydra. Reuse Sperm Whales as its supply. Separate crowded deep reserves and make the existing Livyatan/Plesiosaur homes persistent through flight and replenishment. |
| Mariana  | 458 → 458                            | Retain two giants in each gated layer and the high-pressure food stock. Adjust two giant homes and redistribute adults crowded around the first two arenas to the same layer's outer routes.                                                  |
| Amazon   | 409 → 409                            | Reuse three Rootback Colossi, one outside each lord. Redistribute existing Titanoboas/Purussaurus as three substantial supplies per territory, including the previously thin Thunderbarbel approach and the two deep pits.                    |
| Europa   | 352 → 352                            | Retain all giant guards and the three nonpredatory meals per lord. Move two existing Prism Hunters so each of the three territories also has one medium hunter reserve. Fit its regional depth range to the deep home.                        |
| Penglai  | 393 → 393                            | Existing water, ground and cloud habitats pass the current coverage/guard checks. Preserve them rather than forcing aquatic depth bands or treating animals on different mountain surfaces as a single reserve.                               |
| Odyssey  | 323 → 323                            | Retain the three giant guards and existing adult supplies. Move one existing Abyss Lamprey from a repeated western deep route to Charybdis's eastern outskirts, adding a predatory meal without increasing stock.                             |

Total ordinary stock changes from 3,478 to 3,481. Regional rares, surface birds,
humans and lords are separate from these totals. No new species, model, audio,
body size, speed, attack damage, individual nutrition/growth, hunger rule,
respawn timer or completion objective is introduced.

The new `regional_lord_habitats.js` fits the final distributed registry for the
first five regions. Europa and Odyssey retain their existing regional fitting
modules. Shared AI, feeding and respawn consume these data; there are no new
species/map exceptions in generic movement or replenishment. The only runtime
round hook pairs Hawaii's homes with its already-selected lord sites.

## What the rules mean in this candidate

- The actual starting nursery contains no ordinary predators. Its largest
  animals are 3 m in Hawaii/Atlantis/Bermuda/Mariana, 1.65 m in Amazon, 2.2 m in
  Europa, 8.5 m in Penglai and 1.5 m in Odyssey. Penglai starts at 15 m; its safe
  starting food is judged relative to that established starting size.
- Smaller feeding schools retain their current protected and intermediate
  layers. Outer routes and deep territories carry the larger hunters. Bermuda's
  offshore Hydra is an intentional surface danger, distinct from the nursery;
  Penglai's progression also runs through land and cloud altitudes.
- Ordinary regional catalogue entries, regional rares, registered birds and
  enabled human types must exist in the actual game. Transformed Penglai forms
  are represented by their source creature, rather than an additional duplicate
  spawn. Playable characters, equipment and scenery are not ordinary food stock.
- Hawaii intentionally retains its established **two of four possible lords per
  round**. The ordinary catalogue is complete each round; this audit does not
  change the lord lottery to four simultaneous encounters. The other maps retain
  their full declared lord instances and existing gates.
- Each of the 27 active lord sites across the eight test rounds has an ordinary
  hunter capable of retaliating against a 30 m character. The shared less-than-5 m
  size-advantage rule already allows a 28 m Ichthyotitan to do this, so inflating
  its biological size is unnecessary. This is attack capability, not a promise
  that every fleeing player must be caught.
- Supplies are residents on the outskirts, not a stack under the boss. Dedicated
  reserves reuse existing animals. Other route wildlife can pass nearby; do not
  interpret a spherical count across a mountain, wall or separate height as
  immediately reachable food. The city/Bermuda/Mariana/Amazon placement checks
  cap substantial meals in the immediate 140-unit test radius at four. This
  diagnostic radius is not a universal new gameplay boundary.
- Keep replenishment normal: solitary food returns after its existing 28 active
  movement seconds, and pause freezes this clock. No rewards are increased to
  conceal a placement problem. Mariana's deepest adult no-food budget is shorter
  than waiting at a single depleted resident; alternate supply sites remain
  intentional.

## Verification and evidence

Local evidence is under `.local/ecology_audit_20261030/`. It is ignored work
material, not production content.

- `native_before/`, `native_after/`, `native_final_patch/`, `native_surface/`
  and `native_predatory/` record actual map launches, populations, Guide kinds,
  regional rares, birds/humans, enabled lords, nursery separation and movement.
  The final two directories supersede older snapshots for their scoped changes.
- `tests/regional_lord_habitats.test.js` uses the real terrain/collider factories:
  legal adult placement, adult-body routes to food, attack territory and depth,
  bounded arena supply, immutability, all 12 ordered Hawaii lord pairs at three
  placement extremes, and Bermuda reserve return/respawn. Existing Europa,
  Odyssey, Penglai, nursery, feeding, regional and progression regressions remain.
- `combat_slow/` contains 27 native cases: one-time 30 m player placement near
  each site's ordinary guard, native slow input, real AI/contact/health/cooldown.
  Other actors are temporarily hidden only to attribute damage. All 27 produce
  a genuine ordinary predator hit. The earlier `combat/` fixture applied slow
  input before resuming, which clears keys; its misses at normal cruising speed
  are retained and are not represented as failed production attacks.
- `feeding/` and `feeding_final/` record one representative successful adult
  capture per map, actual health/hunger settlement, pause stability and normal
  replenishment. The first Bermuda case escaped its missing resident boundary;
  the corrected case supersedes that failure. `feeding_predatory/` additionally
  checks the newly positioned deep Europa/Odyssey hunters.
- `terrain_final.json` is a lightweight whole-roster placement diagnostic. Its
  five Penglai ground-animal failures lack the actual model's grounding profile;
  the populated native game instantiates all 393 ordinary animals plus its rare.
  Do not misreport this reduced fixture as five missing live animals.
- `economy.json` calls the real meal settlement for all four characters at initial
  health 100 and 70, across eight maps: 64 first-stock cases reach 25 m. Distance
  only ranks choices. It excludes elapsed hunger, terrain detours, missed
  captures and later combat damage, so it establishes stock feasibility, **not**
  natural completion time or full-round balance.

Native checks use desktop Chrome with controlled setup where stated. They do
not establish physical-phone FPS, temperature or natural full-session pacing.
Player review of the candidate remains the final check on encounter difficulty.

## Delivery validation

The final source passes **2,091/2,091** tests (`test_delivery.log`) and the
changed-file formatting check. All 638 tracked files under `src/assets/` are
byte-identical to the release baseline. The source-preservation manifest also
confirms that shared movement, feeding, retaliation and lord-combat modules are
unchanged; only regional placement, Hawaii's round seeding, corresponding tests
and project documentation differ.

The restricted preview rebuild preserves the existing service identities and
archives the prior runtime. All **951** local runtime artifacts match `dist`;
932 also retain the published build hashes. Public checks cover the changed
HTML/JavaScript and representative unchanged assets, followed by native launches,
pause/resume and return-to-menu on all eight maps. No production application
debug hook is present.

The first full public inventory check ran concurrently with a cold browser load
and encountered HTTP 429. That incomplete inventory is retained, not reported as
passed. Subsequent checks run sequentially at lower request frequency. A separate
browser-fixture wait returned a DOM object instead of a Boolean; correcting that
condition allowed the already-ready page to proceed. Neither diagnostic required
a game-code change. See `public_native_initial.json`,
`public_native_wait_fixture.json`, `public_native.json` and
`public_selected.json` for the respective failures and final scoped results.

The candidate is ready for user playtesting, not yet accepted or published.
The existing temporary preview uses the rebuilt production bundle. Official
main/Pages remains v0.11.23. No commit, push, tag or personal Skill change is made.
