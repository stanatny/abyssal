# Penglai supplies and monastery entrance

## Local checkpoint

The user approved a local commit on 2026-10-04, including the complete preceding Penglai implementation and this follow-up. Runtime fingerprints still match the verified preview and the receipts below. This checkpoint remains on `feature/penglai`; push, merge and formal release were not requested. The review record below describes the uncommitted state at measurement time.

## Scope and baseline

Uncommitted `feature/penglai`, based on v0.9.0 / `da0adbe`. This bounded follow-up preserves the preceding accepted control, creature, ward and landscape changes. No commit, push, merge or formal release is authorized. Formal Pages remains the six-destination v0.9.0. Baseline snapshots and raw evidence live in ignored `.local/penglai_supply_revision/`; the previous served candidate is identified by the control-review manifest.

## Diagnosis and changes

Five fresh native starts each had 21 rewards, with 8–12 within 180 world units of the starting point. Penglai chose only three landmark anchors for all eighteen random supplies. Mountain anchors were passed through a water-only habitat and could fall back to the same shallow point; nursery anchors also concentrated extra rewards at the start.

The shared seeding path now accepts optional environment `rewardHabitat` and passes the random-reward index to `rewardAnchor`. Penglai uses separate route slots with per-round positional jitter, admitting both water and mountain air. All eighteen non-introductory supplies resolve away from the nursery and outside the sealed monastery. Other environments keep their original underwater defaults and anchors. The total remains 21: one introductory reward of each kind plus eighteen distributed supplies. Benefits, durations and 45-second same-position replenishment are unchanged. The bilingual Guide's existing descriptions still match these values; no new player-facing rule or translation is introduced.

The northern pool previously contained 27 medium Auspicious Carps and 24 Hujiao. Smaller carp profiles and one fewer additional Hujiao home reduce this to eighteen of each, 36 total, across multiple homes. Registry density rounding also moves two Hujiao into the existing southern pond home, so whole-map stock falls by thirteen, from 454 to 441, rather than fifteen. Other species, other regions, creature sizes, meal returns and guardian rules are unchanged. Ordinary consumption still heals and normally respawns food at its assigned water-layer home. The other three guardians' established supplementary food is retained.

The old eight steps descended below the flat mountain shoulder; the leading step also overlapped the platform at the same height. The replacement starts at the platform's front boundary, uses distinct descending treads, and clears the rendered terrain by at least 0.7 m in sampled coverage. Each visible stone step has a matching solid box. This fixes geometric intersection rather than masking it with a material-depth offset.

## Current evidence and limits

- Twenty-one focused unit checks pass, including legal resolved supply positions, distribution, locked-ward exclusion, retained northern food and actual terrain-grid raycasts across stair treads. Rendered stone instances match the step colliders.
- Five new native starts each show exactly three nearby introductory rewards, 21 total supplies, 441 ordinary animals and 36 northern medium/large animals. Both water and air supplies are present; random supplies no longer collapse onto duplicate fallback points.
- Real contact picks up all three introductory reward types with the unchanged benefits and durations. Controlled shortened cooldowns verify same-position replenishment; they are not natural 45-second waiting tests.
- Real native carp and Hujiao meals restore health; their controlled shortened respawn clocks return them to northern water. Position, body length, invulnerability and brief prey disorientation are fixtures, not a natural fight or full expedition.
- Actual populated desktop and 390 × 667 touch-view screenshots cover nursery, northern food and close/moving monastery steps. The staircase remains solid and the movement sample reports no stuck state. No observed page/console errors.

- `npm test` passes 816 tests; `npm run test:browser` passes 29 shared checks. Final platform-boundary assertions also pass in the focused stair suite after the full unit run. `npm run check`, document formatting and the production build pass. The existing large-bundle warning remains.
- The rebuilt restricted candidate passes six compiled native cases per local/public host: English desktop and Chinese 390 × 667 touch, Penglai Orca/Mechanical Shark launches, skills, pause/home and ordinary-water Hawaii/Amazon starts. The Guide retains eighteen ordinary mythic kinds, five guardians and all three correctly localized rewards. Production exposes no development state hook or private source/evidence paths.
- All nine served artifacts match the local build on both hosts; 252 runtime fingerprints match the candidate source. Relative to the preceding accepted control preview, only `main.js`, `penglai_ocean.js`, `penglai_species.js` and the new `penglai_rewards.js` differ; 248 existing runtime files remain byte-identical. The same preview URL serves the changed HTML and asset references. Runtime process identities and the manifest pointer are retained locally.
- The first compiled-local attempt used the wrong `#time` selector in the new test harness. It timed out; the actual HUD uses `#round-clock`. Corrected local and public runs pass. Failed receipts are retained and are not counted as successful checks.

Historical 454-stock reports are retained as previous measurements, not current results. Desktop and emulated touch evidence do not prove physical-phone performance or subjective full-round balance; player acceptance remains necessary. Population reduction is not a measured FPS or thermal improvement. Runtime contracts use controlled scene placement; these are not natural completion-time or survival benchmarks. No game code is committed or formally released by this preview update.
