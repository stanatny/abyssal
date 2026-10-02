# Hunger pressure, local completion records and the bottom refuge

Status: reviewed gameplay checkpoint based on **v0.8.3 / `29d73d3`**. The published game remains v0.8.3. The user authorized a local commit after review; push, main integration and formal release remain unauthorized.

## Survival changes

The later [mid/late progression follow-up](meal_progression_revision.md) keeps this hunger curve but increases ordinary medium/large meal rewards after 10 m. The food examples and event-route timings below describe the preceding checkpoint, not its newer rewards or completion pacing.

The player reported that a juvenile could spend too long sprinting through deep water. Two causes matter: the released depth surcharge was only 30%, and resource consumption used the movement step capped at 0.04 seconds. At low rendering rates, hunger and stamina therefore depleted more slowly per real second even though the expedition clock continued. The candidate advances vitals and resource cooldowns using the actual active-round interval, clipped at the existing 30-minute deadline. Movement retains its collision-safe integration cap. Pause, loading, hidden-page suspension and results do not advance these systems.

The shared `hungerDrainRate()` now uses:

```text
base = 0.22 + 0.02 * clamp(length - 3, 0, 3) + 0.03 * max(length - 6, 0)
depthPressure = clamp((worldDepth - 45) / (500 - 45), 0, 1)
juvenile = max(0, 1 - (max(3, length) - 3) / 15)
hungerDrain = 2 * base * (1 + depthPressure * (0.5 + 4.5 * juvenile))
```

Depth uses world coordinates; displayed meters are four times those values. Pressure starts at 180 displayed meters and saturates at 2000. Returning shallower reduces it. The juvenile component falls continuously as the character grows, reaching zero at 18 m. Growth can therefore lower a juvenile's absolute deep-water cost even though larger bodies always cost more in shallow water. Neither character has an extra hunger modifier.

| Length | Shallow hunger/s | Full-depth hunger/s | Shallow full-bar budget | Full-depth full-bar budget |
| ------ | ---------------- | ------------------- | ----------------------- | -------------------------- |
| 3 m    | 0.44             | 2.640               | 227.3 s                 | 37.9 s                     |
| 6 m    | 0.56             | 2.856               | 178.6 s                 | 35.0 s                     |
| 10 m   | 0.80             | 3.120               | 125.0 s                 | 32.1 s                     |
| 16 m   | 1.16             | 2.436               | 86.2 s                  | 41.1 s                     |
| 25 m   | 1.70             | 2.550               | 58.8 s                  | 39.2 s                     |
| 30 m   | 2.00             | 3.000               | 50.0 s                  | 33.3 s                     |

These are **no-food hunger budgets**, not observed natural survival times. Empty hunger continues to cost 7 health/s, with only the starving fraction of a frame charged. A full-health, full-hunger 3 m character already in the deepest pressure band dies after about 52.2 seconds without food or other damage; a 25 m character takes about 53.5 seconds. Adults instead have access to much larger meals: a 25 m character receives 70 hunger from a Megalodon, about 27.5 seconds at the full-depth rate, while twelve tiny coral fish together provide less than 0.4 hunger. Each successful lord bite still supplies 8 hunger, but it cannot replace feeding through a prolonged battle. Retreat and feed if an approach takes too long.

Stamina drain/recovery, nutrition, healing-first growth allocation, capture reach, pickups, active abilities, lord thresholds/hit counts and regional victory rules are unchanged. The timer correction makes existing resource rates consistent with real active time at low frame rates; it does not improve rendering performance or promise equal movement speed on overloaded devices.

The HUD shows the current depth multiplier beneath Hunger without displacing the three meter rows. Home survival help and both-language Ocean Guide explain the acclimation rule. The formulas in AGENTS are synchronized for future map production. Historical balance documents retain their original measurements with explicit supersession notes.

## Actual food supply audit

The browser audit reads the actual instantiated populations from all four maps, rather than only counting catalog entries. Ordinary populations remain **313 / 412 / 341 / 333** (Hawaii / Atlantis / Bermuda / Mariana). One fresh runtime sample found **69 / 81 / 98 / 54** immediately edible animals within 65 world units of spawn. These are sampled positions, not guaranteed encounter rates. Mariana still starts at 15 m, even though the audit also evaluates the shared rule at 3/6/10 m.

For lengths 3/6/10/16/25/30 m, the audit evaluates actual resident prey in the corresponding shallow/intermediate/deep feeding band using unchanged nutrition. Every sampled map/stage has at least three prey whose single meal supplies 15 seconds of its local hunger drain. At 25 m the maps have **25 / 34 / 31 / 76** such prey across their deep feeding bands; at 30 m, **15 / 19 / 22 / 42**. These totals do not mean all those animals are nearby or visible from one position. No additional animals, free nutrition, teleporting food or relaxed prey-size eligibility are added.

The existing detailed Atlantis legal-spawn test still uses the complete city colliders and checks real nursery separation, layered respawns and accessible food bands. Unit reserve thresholds now explicitly distinguish a juvenile school meal from an adult large-prey meal. The numerical reference route includes food during long travel and two large meals during its hypothetical three-approach lord battle. Its fast/standard/slow timings are approximately 778/972/1215 seconds. Those values are **event-model feasibility checks**, not natural navigation, actual battle duration, measured respawn availability or promises about a player's completion time. Physical-device natural full-round balance remains an acceptance limit.

## Local fastest expeditions

`run_records.js` stores up to ten successful runs **per region**, ordered by actual active-play milliseconds. Each record contains a stable round ID, region ID, **playable character ID**, optional normalized name, time, creation timestamp and ruleset. The UI always displays the character with the record. The roster comes from the actual character registration, supporting future playable characters without a second fixed list.

A successful round is automatically recorded anonymously; the result form can replace its name without creating another result. Results and the home screen open the same region-selectable leaderboard. Each region's best time appears on home. Pauses, initialization/loading and post-victory touring do not count. Death/timeout cannot create a record. Times display to hundredths while sorting by milliseconds; ties retain a deterministic order.

Records use local storage (`abyssal-runs-v1`) and the `survival-2026-10` ruleset. This is a browser-local convenience, not an online or tamper-resistant competition. It does not sync devices, profiles or origins; preview and published URLs have separate storage. Private browsing or clearing site data can remove records. Unavailable storage falls back to the current page's memory with a visible notice. Invalid values and incompatible rulesets are rejected. Names are rendered as text, stripped of control characters and limited to 24 Unicode codepoints. No names are transmitted.

The native dialog keeps its close control outside the scrollable contents. Narrow landscape uses four compact region buttons, while portrait uses two columns. Keyboard and touch can reach name editing, region switching, results and home without gameplay shortcuts consuming input. The dialog stops unnecessary ocean drawing, preserving the previous pause/results optimization.

## Mariana Easter egg and post-win tour

The Easter egg **already exists** in `mariana_refuge.js`: an original procedural pineapple house and a yellow sponge wearing square shorts, with animated waving. It is at the deepest refuge and has actual scene geometry and supported props. The prior victory overlay could hide it before a player looked closely.

After the normal four-guardian, 30 m, real-arrival victory, **Visit the Bottom Refuge** hides the result overlay and lets the same character swim around a bounded local area. Keyboard steering and the touch joystick retain real terrain/prop collisions. Hunger, health, feeding, skills, enemies, completion time and the saved record remain frozen. Pause/Escape or losing focus returns to the same results; no duplicate record or victory reward is produced. Returning home begins normal reset behavior. The tour adds no new scoring objective or collectible.

## Verification and limits

Evidence is in ignored `.local/gameplay_review/`; source verification is reproducible through `scripts/verify_gameplay_records.mjs` and the focused unit files.

- Focused rules cover continuous hunger boundaries, juvenile shallow grace/deep starvation, food-size efficiency, actual-active-time consumption under slow frames, starvation during invulnerability, deadline behavior, top-ten ordering, round idempotence, both character IDs, future character registration, malformed data, safe names and storage failure.
- Runtime population/nutrition audit covers all four actual maps at six sizes. It preserves the accepted regional populations.
- Native browser flows cover English 1440×900 Orca, Chinese 390×667 Squid and English 568×320 Squid: name/save, correct character, reload persistence, dialog scroll/close, reachable result actions, keyboard/CDP-touch refuge movement, frozen result state, and stopped rendering after returning to results. Victory prerequisites are explicitly staged; these are state and interaction tests, not natural full runs.
- A controlled six-second 3 m deep-water runtime sample consumes **2.64 hunger/s**. Its three portrait meters share the same y coordinate; pause freezes the sampled vitals and does not create a record. Prey and lords are isolated for this rate check, so it is not a natural combat sample.
- Screenshots show the existing rendered refuge and the new result/leaderboard states. Phone sizes are browser emulations, not physical-device keyboard, touch comfort or thermal acceptance.

Formatting, all **704 unit tests**, production compilation and the **29 shared browser checks** pass. Eight compiled local cases cover four regions in English desktop and Chinese touch viewports, including character/region selection, Guide, skill, pause/resume/home and both recorded character labels. Their leaderboard rows are explicitly synthetic presentation fixtures; actual victory registration is tested separately in the development runtime. All eight served artifacts match the production output. The same **eight compiled public cases** pass through the actual preview URL with zero page/console errors. All eight public artifact hashes match the local build, and eight local/public private-path probes are denied. The 175 runtime source fingerprints match the served candidate. A separate actual-scene inspection verifies the waving arm continues moving during the frozen-score tour; its diagnostic close-up is not presented as the normal follow-camera composition. The formal Pages build must remain unchanged until an explicit later release request. Revertability is limited to this unreleased rule/UI follow-up; the accepted v0.8.3 assets and regional endings are retained.
