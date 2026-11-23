# Bermuda lord landmarks — 2026-11-22

The player asks for Hydra closer to the surface, Kraken beside the Titanic,
and the other two lords in separate, recognizable locations. The local candidate
now uses one authoritative `BERMUDA_LORD_SITES` catalogue for encounters, Guide
habitats and the three moved ordinary guards.

| Lord      | World home           | Radius | Landmark and rationale                                                                                                          |
| --------- | -------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------- |
| Hydra     | `[-290, -18, -450]`  |   86 m | Above the western twin reef gates. Its actual heads approach the waterline; the body remains submerged and outside the nursery. |
| Kraken    | `[-245, -390, -730]` |  103 m | Open water west of the 600 m Titanic. It guards the wreck without occupying the ship's enterable hull.                          |
| Gran Maja | `[300, -505, -1080]` |   98 m | Deep water west of the eastern lost-flight wreck belt, forming an eastern mid-map arena.                                        |
| Leviathan | `[230, -610, -1570]` |   86 m | Retains the open southeastern deep basin south of the cable salvage field, with room for its charge.                            |

The horizontal layout also spreads the arenas across the map instead of stacking
them above the same destination. The nearest three-dimensional arena-sphere gap
is 278.77 m. The Guide's previous hardcoded, partly outdated habitat strings
now read the same configuration as the actual bosses, including English labels.

## Physical placement checks

The final real Hydra mesh reaches Y 3.571 at the highest sampled normal patrol
pose, about 0.429 m below the flat water level Y 4; real storm waves still vary.
The body-centre cap is -17. Moving the entire home to Y -10 was rejected because
it exposed the heads roughly eight metres above the water and overlapped the
western current. The final X -290 clears that current tube in the tested patrol.
Kraken's real normal-patrol mesh stays at least 62.27 m west of the rendered
Titanic hull. Its lowest tested terrain margin is 33.79 m. Gran Maja's eastern
patrol terrain margin is 145.60 m; Leviathan's is 84.62 m. The tested eastern
Mayan patrol also stays at least 11.92 m outside the deep return-current tube
and 84.51 m from the nearby major-prop bounding boxes.

The full-ocean initial-placement test checks the real posed meshes against the
rendered terrain and nearby solid contact shapes for all four bosses. It also
checks the corresponding landmarks, actual wreck bounds and separated arena
volumes. Two geometry/oracle cases pass. The lightweight independent patrol
measurements do not certify every possible combat pursuit trajectory. The prior western Gran Maja
placement is superseded by the eastern balance follow-up; its earlier map and
geometry evidence remain archived, rather than being reused as an eastern pass.

## Ecology and scope

The global population selection baseline remains fixed. Only three guard slots
and ten existing adult supply slots follow the moved territories; Leviathan's
three supplies, the other residents, nursery, liner interior food and cave
supplies retain their previous coordinates. Supplies still use their original
species depth and hunting limits. No stock, hunger, skill, combat or victory
rule changes are part of this revision.

The actual source and verification are retained under the ignored project
`.local/bermuda_lord_landmarks_20261122/` and the independent layout audit under
`.local/bermuda_lord_layout_20261122/`. The PNG/SVG map is explicitly a coordinate
layout diagram, not a game screenshot. No new landmark art or generated asset
was required. This is an uncommitted local revision; the existing public preview
is preserved. The separate adult cave-access issue remains open and is not
validated by these lord-placement checks.

## Final local verification

The bounded ecology batch passes six cases, including one complete-ocean
construction: the four actual guard homes and four-direction short body sweeps
are clear. The original thirty-metre body can reach 3/2/4/3 adult supplies near
Hydra/Kraken/Gran Maja/Leviathan respectively. One relocated Livyatan initially
exceeded its original northern hunting limit; only that slot was moved to
`[-190, -98, -420]`, then the gate passed without relaxing any habitat rule.
Original failed logs are retained. Explicit thirteen-slot normalization restores
the previous roster digests, rather than refreshing historical hashes.

The related Guide/translation batch passes sixteen cases, the focused
configuration/Guide batch passes five, and the actual posed initial-world
geometry/oracle batch passes two. These batches overlap in their Guide cases;
they are not a claim that the entire project suite passes. The final local
build and focused formatting pass.

The actual development game loads and seeds the complete revised Bermuda
population without errors. All four loaded home arrays match the authoritative
configuration. Four protected, staged thirty-metre approaches use the normal
follow camera and native slow-swim input; each captures the actual boss and
location, and the camera remains above real floor. Pause freezes the active
clock. These are location checks, not an unassisted four-lord victory or every
combat pursuit trajectory. The first browser loaded the earlier invalid food
slot while the correction was being made; its region-preparation error remains
in the pre-fix log. The fresh final source has no page or console errors.

## Eastern balance follow-up — 2026-11-22

The player finds the right-hand side of the delivered layout too empty. Only
Gran Maja moves again, to `[300, -505, -1080]`, radius98, in deep water west of
the lost-flight wreck belt. Hydra, Kraken and Leviathan keep their accepted
homes. This creates two western and two eastern destinations, with the eastern
Mayan arena separated from the southeastern Leviathan basin. The Guide reads
`失踪航线残骸带西侧深水`, translated as `Deep water west of the lost-flight wrecks`.

Only five ecological home slots move relative to the immediately preceding
west-Mayan candidate: guard2 `[215,-470,-1125]`, sperm-whale3 `[190,-480,-1150]`,
pliosaur1 `[200,-435,-1160]`, megalodon0 `[180,-525,-1080]`, and Livyatan2
`[180,-470,-1200]`. All four meals are actually reachable with the original
thirty-metre body and real contact surface. The guard's exact spawn and short
body sweeps pass. All other homes, schools, population and rules are unchanged.
The final-fit marker becomes `east_mayan_20261122`, so an already-fitted western
roster migrates without reseeding the global distribution. Old and new inputs
and repeated fitting pass; the original thirteen-slot baseline digest remains.

The eastern ecology batch passes seven cases, and the current actual full-world
posed-home/oracle batch passes two. Guide/localization, configuration and build
logs are retained in `.local/bermuda_lord_east_balance_20261122/`; the original
ecology log is also retained in the preceding lord-task directory. Independent
normal-patrol/major-prop checks are in the layout audit directory. These checks
do not promise that the entire combat pursuit sphere stays outside the return
current; ordinary pursuit may approach it. The updated map is a coordinate
layout diagram, not a screenshot of the game.

The final fresh development game seeds the entire revised population without
page or console errors. The four actual loaded lord homes match the new
authoritative array, and one protected thirty-metre native slow-swim approach
captures Gran Maja in its actual eastern setting using the unchanged follow
camera. Pause and camera-floor checks pass. The build passes in26.51s; focused
formatting and diff-whitespace checks pass. This follows the current eastern
source; the preceding four-view western recording is preserved as history.
No commit, push, version bump or public-preview replacement was made.
