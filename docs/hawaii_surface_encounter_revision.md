# Hawaii surface encounters — 2026-11-11

The player reports that the new jellyfish are still scarce and flying fish cannot
be found. This candidate extends the uncommitted scenery, jelly, flying-fish and
terrain-contact work. Published main remains v0.11.27; no commit, push or new
release is authorized.

## Diagnosis and bounded tuning

The earlier redraw removed 36 oversized, non-edible background jelly decorations,
leaving only 12 registered moon jellies with an actual 0.4 m bell. This explains
both the reduced apparent size and reduced visual population. Keep the accepted
HF mesh and true bell size; increase Hawaii to **36 real moon jellies**, arranged
as nine loose groups of four between the departure layer and outer reef. Their
6 m resident radius keeps the groups near their homes instead of drifting away
from the normal route. This supersedes the previous Hawaii-only count of 12 and
10 m resident radius; other seas retain their existing jellies.

Flying fish were present: 15 individuals in two groups of 12 and three. The nearest
legal initial fish was 87.38 m from the player start, approximately 13 m above the
starting swimming layer. Move to **30 individuals in four fixed surface schools**,
with final counts 9/9/6/6 at `[7,-8,57]`, `[-9,-6,10]`, `[12,-5,-60]` and
`[-16,-5,-138]`. The source counts are 6/6/4/4; the existing density pipeline applies
its 1.5 multiplier exactly once. Fixed habitat profiles prevent distant migration;
ordinary schooling, normal replenishment, 0.4 m body length, nutrition, growth,
22 m approaching-threat trigger, flight physics and 18-second cooldown remain.

The nearest fish is now 20.43 m from the start, with nine inside 40 m. Four jellies
are inside 15 m, nearest 6.625 m. Hawaii's ordinary inventory changes from 516 to
555; its separate regional rare makes 556 live native entities. All other Hawaii
species and all seven other regions retain exact registry data.

A normal level swim still cannot show the entire aerial glide: the surface is
above the juvenile follow-camera frame. Do not force a camera pan or change the
controls. When a surface school is first nearby in the nursery, show one bilingual
observation tip in the existing objective line for eight active seconds. It tells
the player to swim upward. Feeding notifications cannot overwrite it. It expires
normally, freezes during pause and resets for a new expedition.

## Larger Pacific jellyfish

The player's size question is separate from the density correction. The
[black sea nettle, Chrysaora achlyos](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/black-sea-nettle)
is a large eastern-Pacific jelly: a bell around 0.9–1 m and oral arms around 6 m
make a much larger silhouette than the moon jelly. Its reported range is along
the North American Pacific coast; adding it to Hawaii would be an explicit game
ecology adaptation, not a claim of native Hawaiian distribution. See also the
[Aquarium of the Pacific account](https://www.aquariumofpacific.org/onlinelearningcenter/species/black_sea_nettle).

This is a proposed separate species, not an implemented new creature in this
candidate. Do not stretch the moon-jelly mesh and label it as a different animal,
confuse bell diameter with tentacle length, or silently change food/capture size.
A new species needs its own HF asset, anatomy, Guide entry, placement and review.

## Validation and scope

Raw evidence is in the ignored `hawaii_encounter_followup_20261111` directory:

- `fly_audit.json`, `fly_proposal.json` and `fly_clearance_probe.json` distinguish
  old legal stock, route coverage and isolated actual-terrain launch/reentry.
- `final_ecology_audit.json` compares all final regional species with the immediate
  baseline. Only the two intended Hawaii entries change. All 66 final residents
  have legal homes; three complete jelly skin poses clear actual solids/floor,
  with minimum terrain clearance 2.936 m and minimum center spacing 3.552 m.
  Respawn remains at home, and skeleton disposal preserves shared assets.
- `tests/hawaii_surface_encounters.test.js` protects actual nine-group jelly
  coverage/replenishment and all four legal flying-fish surface groups. Existing
  stock assertions are updated to the explicitly requested counts; other-map,
  reward, size, food-layer and lord checks remain.
- `native_flat_before_hint.json` reproduces the observer problem: nine actual
  gliders, none in the level follow-camera frame. The later native capture follows
  the visible tip using the ordinary W ascent, with no moved/frozen prey or camera
  override. It sees up to nine gliders and three nearby jellies, including normal
  contact feeding. This does not claim that a player who stays deep sees flight.

The work preserves previously delivered geometry/contact corrections. Counts and
clearance are not whole-round balance, fun, physical-phone FPS or temperature
acceptance. A staged, same-machine High/Smooth performance comparison and compiled
preview checks are recorded separately from natural encounter evidence.

The matched headed Chrome nursery sample uses the same seed, 1280×800 viewport,
live AI, ordinary ecology and 120 measured frames per preset after warm-up. High
changes from 16.49 to 16.50 ms mean / 18.2 to 18.5 ms p95, with sampled draws
423→446 and triangles 2.240→2.366 million. Smooth changes from 16.48 to 16.53 ms
mean / 18.4 to 18.6 ms p95, draws 341→360 and triangles 1.977→2.090 million.
Both runs remain near the display's 60 FPS limit on this Mac; this is a measured
resource increase with similar sampled frame time, not a claimed speedup or a
physical-phone guarantee. See `perf_before/report.json` and `perf_after/report.json`.

Final checks pass all 2,222 tests, formatting and production build. The first full
run found one obsolete 485-individual subtotal in a historical giant-stock test;
its Hawaii fish-only subtotal is now 500, reflecting precisely the 15 additional
flying fish. The focused correction and final full rerun pass. No failure is
hidden by weakening lord, food-size or habitat assertions.

`hint_lifecycle.json` passes Chinese and English at 390 px: no horizontal overflow,
556 live entities, a frozen pause clock, tip expiry and a fresh tip after restarting.
The first timing fixture incorrectly treated world elapsed as if the tip started
at exactly zero; the final fixture waits eight seconds from actual display.
`native.json` records the final ordinary ascent capture. The tip uses the existing
objective line and adds no button, forced camera movement or modal panel.

The compiled preview uses `index-Cf6VhpXW.js`, retaining the existing bounded
cold-start loader and previous runtime archive. All 17 sampled public HTML,
engine, main, relevant fish/jelly assets and loader artifacts match SHA-256.
Chinese desktop (1280 px) and English touch-emulated (390 px) cold-cache runs pass
native Hawaii start, localized surface hint, input, pause/resume/home and the
shared jelly Guide, with no browser/resource errors, debug hook or duplicate
static-module requests. Cold initialization took approximately 50.3 and 48.7 s
on this network. This validates the candidate preview, not a new formal release.

The attached 10-second H.264 clip additionally uses normal W/D steering and a
brief Space sprint to approach the real first school. No prey, pose or camera
is staged; `fly_showcase.json` records a closest visible glider at 7.799 m.
The separate jelly screenshot shows ordinary close contact feeding. The footage
is a short demonstration of following the tip, not an automatic camera feature
or a claim that tiny fish remain readable from arbitrary depths and distances.

A second nine-second clip is explicitly a **close observation camera**, following
one real first-school fish to make the small fins legible. `fly_observer.json`
records swim, run-up, glide and reentry with ordinary world simulation. The sole
existing render entry applies the observer camera immediately before its normal
render; there is no competing render loop, held prey or manual physics stepping.
The HUD is hidden only in that recording. This diagnostic view is not the player's
normal follow camera and is not used as discoverability or FPS evidence.
