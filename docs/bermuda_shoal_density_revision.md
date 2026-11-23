# Bermuda shoal density revision

Status: local candidate, 2026-11-23. Not committed, pushed or published.

## Player feedback and bounded change

After the map expansion, the player finds the shoals too sparse. The preceding
whole-map layout spread most ordinary route schools into groups of six or eight,
with additional open-water gaps between vertically separated feeding layers.
This revision changes Bermuda ecology data only, through one final immutable
fitting stage after the accepted lord-home fit. It does not change shared
feeding, movement, respawn, culling, hunger, growth, nutrition or combat rules.

| Species       | Before | Candidate | Existing outer group size |
| ------------- | -----: | --------: | ------------------------- |
| Needlefish    |     84 |       136 | 6 → 10                    |
| Ocean Sunfish |     52 |        76 | 4 → 6                     |
| Bluefin Tuna  |    184 |       344 | 8 → 12                    |
| Ray           |    102 |       132 | 6 → 8                     |

Ordinary population rises from 816 to **1,082**, an increase of 266 (32.6%).
There are 91 schooling groups with 866 members. Fifty-one existing outer groups
receive larger stocks. Eight additional twelve-tuna groups bridge open-water
layers at depths 200–380 m in the middle and south. Two ten-needlefish groups
cover the northern surface-current entries, outside the protected nursery.
The new groups append after existing profile indices, so cave bindings retain
their group indices. Cumulative per-species entity indices change as larger
preceding groups require; none of these four species uses predator territories.

Exact nursery configurations, three fixed liner schools, cave meals, 24 escape
supply tuna, resident animals, lord guards and adult reserves are unchanged.
Turtles and predators receive no multiplier. All seven other regional registries
retain their exact pre-change data. Original species depth limits also remain.
The Guide consumes the same registry; this introduces no species, action or
translated player-facing copy.

## Verification and evidence

Raw evidence is under `.local/bermuda_shoal_density_20261123/`.

- `before_registry.json` and `bermuda_ecology_before.js` preserve the independent
  pre-density configuration. The new density normalizer removes only this
  approved delta before earlier lord/cave baseline checks; original digests are
  retained rather than refreshed. The new protected-data and other-region
  checks independently preserve the prior registries.
- `world_spawn_food_final.log`: **6/6** complete-world cases pass. All 1,082
  animals have legal real-terrain/static-contact positions without placement
  fallback and replenish within their existing bounded habitats. Sector food,
  all four current routes, shared meals and twelve garden schools also pass.
- `focused_rules_final.log`: **36/36** density, distribution, meal, lord-reserve,
  cave-guard and escape-food cases pass. This includes immutable/idempotent
  fitting, full actual group membership, original 18-second school respawn,
  posed guard/body contact checks and unchanged cave-supply navigation.
- The first 1,062-animal experiment passed all spawn checks but exposed a
  278.90 m nearest-food gap at the northern inbound surface current. The two
  added needlefish groups close that gap without moving nursery food. Preserve
  `world_spawn_food.log`; the final case uses the original distance/gap bounds.
  The first general-rules run also exposed the expected old route-group total;
  its assertion now explicitly accounts for the ten appended groups and their
  stock while retaining the exact three liner records.
- `live_report.json` compares two fresh current-game contexts, changing only the
  ecology module between the captured baseline and candidate. Both use the
  same staged protected 10 m starts, native K slow swimming and ordinary follow
  camera. Eastern reef visible/local school stock rises **8 → 12**; the southern
  midwater bridge rises **0 → 12**. The candidate loads 1,083 entities including
  its one regional rare animal. A native Space sprint consumes three moving
  newly added tuna and produces the shared meal reward. Pause freezes fish and
  elapsed time; a new round retains exactly 1,083 entities and 344 tuna.
  Both contexts have no page/console errors.
- `before_reef_east.png`, `after_reef_east.png`, `before_deep_bridge.png` and
  `after_deep_bridge.png` are matching actual-scene location views. The feeding
  screenshot and raw report retain the controlled meal check. These are staged
  location/feeding checks, not an unassisted expedition or a natural whole-round
  encounter-rate measurement.
- `build.log`: production build passes in **22.68 s**. Final scoped formatting
  and whitespace checks pass. The same species assets, visibility thresholds
  and simulation frequency remain in use.

## Limits and delivery state

This improves the named outer schools and ten selected water-layer gaps; it does
not establish that every depth throughout the map is densely populated. The
lightweight bounds audit explicitly retains empty 70 m stations in some deep
current and boss layers. Tuna remains limited to 600 m, so the deepest gardens
can have a school above rather than beside their floor-level observer. Neither
culling-distance inclusion nor a higher total alone proves underwater visibility.

The two matched views record 115 → 119 and 35 → 47 draw calls respectively;
these are scene snapshots, not an FPS, GPU-time, heat or physical-phone benchmark.
Texture/geometry counters have lazy first-use differences and are retained in
raw evidence without claiming equal warmed resource use or a performance gain.
Models and the existing update/collision contracts are preserved.

The separate large-character cave entry/return issue remains unresolved. The
existing public preview and runtime archives are preserved; this pass does not
replace that preview, publish a candidate, commit, push or bump the version.
