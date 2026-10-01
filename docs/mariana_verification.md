# Mariana candidate verification

## October 1 branch checkpoint

The user authorized committing the reviewed candidate to `feature/mariana`, pushing it to the corresponding remote branch and checking the public game links. This supersedes earlier no-commit/no-push statements below. The reviewed 159-file runtime snapshot is unchanged from the final Hydra preview. The existing GitHub Pages source remains `main`; this branch push is not a Pages deployment. Exact commit/push and fresh public checks are retained in ignored `mariana_commit/`. Fresh checkpoint validation passed **667/667 unit tests**, full formatting and the production build (existing bundle-size warning only). The preview still matches all eight runtime artifacts and all 159 source hashes; English desktop and Chinese touch-viewport start/Guide/return flows pass with no browser errors. The published v0.7.2 Pages entry, JS/CSS and native start/pause/return flow also pass. Preview accessibility and Pages accessibility are verified separately; this does not deploy the new region to Pages.

## October 1 follow-up: Hydra unlocks the first seal

The user's latest request supersedes the optional surface encounter. Four ordered persistent records now come from `MARIANA_GATES`: **Hydra → Kraken → Gran Maja → Leviathan**. Hydra keeps its offshore surface territory and opens the original 650-world-unit / 2,600 m seal. Kraken moves to `[0,-900,-420]` and opens a new 1,000-unit / 4,000 m eastern passage. The 1,375 / 2,150-unit seals remain Gran Maja's and Leviathan's. Current shared 25 m eligibility, three separate flank hits, 15 m start and the 305-animal food distribution stay intact. Both characters still have the modeled 15-to-25 m food chain above the first barrier; that stock calculation does not model travel or healing losses.

The radar's first marker now targets the surface Hydra and reports ascent/descent, rather than sending players to a locked deep seal. After its defeat, the marker returns to the opened passage and later descent goals. HUD fractions use the gate count. Both-language menu, departure, lord cards, progression Guide, current README, production brief and repository rules now state four required gates. No other region's completion condition changes.

Fresh checks (Chrome on this Mac, development server; controlled encounter placement):

- **40/40 focused unit checks**: four unique boss instances, nursery exclusion, no first-gate bypass by defeating the other lords, persistent per-gate opening, correct membrane/collider removal, duplicate-event suppression, restart, bottom-only victory, legal regional habitats, normal food values and bilingual Guide. Closed/open gate traversal covers 3/16/30 m bodies in both directions.
- **11/11 regional browser checks**: a closed first seal blocks native sprint; four separate three-hit fights open the correct gates and permit adult native descent; the round remains active at 30 m until the final refuge. Restart restores four guardians/seals and 15 m. Four-map roster/music isolation and actual capture-to-28-second-respawn remain correct; no browser errors.
- **4 supplemental browser checks** cover actual English 1440×900 / 320×568 and Chinese 390×667 Guide/HUD presentation, the 1/4 objective and the upward radar marker. A 25 m Squid earns the first seal only on its third real flank contact; a 30 m Squid traverses that opened entrance down and back up with native sprint input. No page/console errors or horizontal overflow occurred.
- Formatting and production build pass. The existing large-bundle warning remains. No new model, combat effect, material program, music or per-frame mesh allocation was introduced; the new terrace reuses the existing construction/culling/light-pool contract.

Evidence is in ignored `mariana_review/hydra_gate/`: unit/check/build logs, `browser/browser_report.json`, `ui_report.json`, native passage screenshots and bilingual UI captures. The initial supplemental harness mistakenly used the ordinary prey capture anchor for a lord hit, then read the HUD before its existing 70 ms refresh; both fixture mistakes were corrected without changing combat behavior. Their failed logs remain alongside the successful report. Combat fixtures use invulnerability and a fixed recovery window to test actual flank contact and progression; they do not establish natural combat difficulty or a complete 30-minute expedition. Phone viewport emulation is not physical-phone validation. No commit, push or formal release is authorized.

The existing restricted production preview was refreshed after the checks. All eight public artifacts byte-match the new build, and all 159 runtime-source hashes match this workspace. English desktop and Chinese touch-viewport public Guide/home/start/return flows pass; same-address refresh works, private paths are rejected and the development interface is absent. Exact URL/process/hash receipts stay in ignored `mariana_preview/`. Formal Pages remains unchanged.

The earlier optional-Hydra and three-seal records below describe their historical source only; they are not the current progression contract.

## October 1: regional surface, readable boundaries and attached wall life

This visual follow-up remains an uncommitted candidate on `feature/mariana`; formal Pages is unchanged. The [visual contract](mariana_visual_polish.md) and [art notes](mariana_art.md) describe the original survey vessels, regional horizon and 3,264 attached decorative organisms. The same preview address is updated in place; its exact manifest and artifact receipts remain ignored local records.

- **667/667 unit checks**, full formatting and production build passed. The existing large-bundle warning remains. Added checks cover all four maps' edge alignment, final-triangle attachment of every new organism, vertical culling, resource disposal and Mariana fleet integration with the existing 18 m / three-hit-or-one-hit ramming contract. The shared fleet suite caught a genuine restart omission: buoy colliders now return along with the hulls.
- Controlled native Chrome tests cover **all 16 map/direction combinations**: the radar shows a turn-back warning and sustained sprint stays within the existing bounds. The final warning threshold is 45 world units, so normal spawn does not immediately warn about the southern edge. Current ribbons begin fading in earlier; solid Mariana cliff faces remain visible without a luminous curtain painted over them.
- English and Chinese survey Guide copy and boundary HUD fit **1440×900, 390×667 and 320×568** without horizontal overflow. Normal-follow screenshots cover the upper wall, descent slope and deep wall. Controlled surface inspection uses the real scene and materials with a deliberately positioned camera; it is not an unassisted breach screenshot. Desktop viewport emulation is not physical-phone validation.
- Four successive Hawaii/Mariana switches keep **498 geometries / 466 textures**, one application boundary root, one survey-fleet root and **305 ordinary creatures** in the sampled warmed menu view. These counts describe this view/cache state, not total possible GPU uploads. Tests independently verify map-owned disposal. An initial harness assertion looked only at direct scene children and missed the fleet inside the region container; recursive inspection corrected the fixture without changing production scene ownership.
- Early inspection removed a distracting diamond-like sediment pattern and stopped current curtains from covering solid trench cliffs. Attachment sampling uses final triangles, including the descent slope. Soft marine decoration introduces no collision, nutrition or combat behavior. Existing pressure openings, light-pool size, ecology, 15 m starts and guardian rules remain unchanged.

Evidence: ignored `visual_polish/` contains `full_unit.log`, `visual_unit.log`, `browser_report.json`, `inspect_report.json`, actual screenshots, build/check logs and the paired performance reports. Console error lists are empty in both the interaction and art-inspection runs.

The final actual-game regional regression also passed all **11 checks**: isolated rosters and music, the optional Hydra without a seal credit, all three guardians through three real flank hits each, native adult gate passage, bottom-only victory, restart and normal resident respawn. These controlled checks use the previously documented invulnerability/recovery fixtures and are not natural combat runs. Native charged sprint also breaches into the regional sky and lands again; ordinary spawn has no boundary warning.

The refreshed restricted production preview byte-matches **all eight artifacts**. English 1440×900 and Chinese touch-emulated 390×667 sessions load the new survey Guide, launch at 15 m, and return home without errors. The same-URL refresh probe succeeds, private repository paths remain blocked, and the production page has no development state export. Runtime source hashes match the final build. No commit, push or formal release was made.

### Matched performance sample

Serial headed Chrome on Apple M2 Pro / ANGLE Metal; 1440×900, DPR 1, seed 71523, 25 m player at `[125,-390,-430]`, live AI/audio, 1.5-second warm-up and 120 frames per preset. The existing performance script is reused unchanged. These short measurements demonstrate this desktop view only.

| View/preset        | Before FPS / p95 | After FPS / p95 | Before → after draws | Before → after triangles |
| ------------------ | ---------------- | --------------- | -------------------- | ------------------------ |
| Upper wall, High   | 60.27 / 18.9 ms  | 60.22 / 19.2 ms | 68 → 78              | 139,198 → 763,288        |
| Upper wall, Smooth | 60.05 / 18.7 ms  | 60.18 / 19.5 ms | 53 → 77              | 146,028 → 743,914        |

Visual density has a measurable geometry cost even though this desktop sample remains near 60 FPS. Shared prototypes, vertical chunks and GPU animation avoid per-instance CPU animation. The three-light pool is unchanged. Destination selection, including the script's fixed 0.8-second settle, measured 2,045 ms before and 2,382 ms after; this is not pure constructor time. The existing loading view covers preparation. Physical-phone GPU cost and sustained full-round performance remain unverified; do not claim unchanged performance on every device.

Source: uncommitted `feature/mariana`, based on reviewed Bermuda candidate `2104223`. The formal Pages release remains v0.7.2. This record covers the integrated fourth region; it is not release approval. Raw logs, screenshots, audio and profiles are retained under ignored `.local/mariana_review/`.

## Historical follow-up: faster opening and optional surface Hydra (superseded gate role)

This revision supersedes the initial 3 m start and 289-animal stock recorded in the baseline below. Mariana now starts both playable characters at **15 m**, with mass `(15/6)^3 = 15.625` and a fresh growth baseline. Hawaii, Atlantis and Bermuda still start at 3 m. Regional data drives the override; changing character, restarting or switching destinations cannot retain the previous size.

The upper trench gains **16 animals**: four plesiosaurs, two pliosaurs, two mosasaurs, two sperm whales, two basilosauruses and four megalodons. Total ordinary population is now **305 across the same 19 species**. The first 12 m prey begins near world depth 90; progressively larger prey remains outside the nursery. One candidate whale anchor intersected a cliff; legal-placement checks caught it and it was moved into clear water. Shared biological lengths, meal values, healing, hunger and respawn timers are unchanged.

A full-health food-stock model can reach **25.237 m from 15 m in 32 existing-value meals**, without respawns or bonus growth, using the upper layer's initial 11–20 m stock. This assumes available prey eaten from smaller to larger, no travel and no damage; it is not a promised completion time. Injury diverts growth into healing. Normal respawns remain available. At 15 m, full hunger represents about 182 seconds without food in the shallows or 140 seconds near the first guardian; players should follow the larger prey rather than remain among decorative small fish.

A fourth lord, Hydra, occupies the offshore surface at `[90,-20,-380]`, with radius 65 and a -12 upper center limit. Its territory remains away from the nursery. It requires the same 25 m eligibility and three flank hits, remains defeated for the expedition, and cannot open or substitute for any of the three mandatory deep seals. Original gate/refuge victory remains intact.

Fresh evidence lives under `.local/mariana_review/start_followup/`:

- Full units: **654/654**. Following the small home-intro translation correction, **18 focused checks** pass. Formatting and production build pass; the existing bundle warning remains (1,449.58 kB minified / 476.98 kB gzip JavaScript).
- Ten native starts across both characters and four maps verify initial length, cubic mass, avatar scale, four Mariana lords, reset and map isolation. A newly placed 12 m plesiosaur is caught through the real Squid contact path, increasing length from 15 m to 15.375 m. Surface Hydra engages, inflicts real contact damage and activates guardian music. These are controlled placements, not a natural playthrough.
- The regional browser suite passes **11 checks**, including three actual Hydra flank hits granting defeat credit but no open seal/early victory, all three deep fights/open passages, refuge completion, restart at 15 m, 305-animal isolation and normal 28-second resident respawn. The three deep fights remain tested with controlled invulnerability/recovery windows, as in the original fixture.
- Seven separate UI scenarios cover the actual language selector, English/Chinese home and Guide at 1440/390/320 px, both character size entries, optional Hydra advice, and a normal animated launch ending at 15 m. Two untranslated home-intro text nodes were found by visual inspection and corrected. No unexpected browser errors or horizontal overflow occurred.
- Test-fixture corrections are preserved in raw logs: sampling after a frame could include immediate small-fish feeding, so start-state assertions now capture synchronously from the Start button; Squid feeding uses its actual rear capture point, not the Orca mouth offset; language tests use the real selector instead of importing a second Vite module instance. No production capture geometry or language restrictions were relaxed.
- A serialized visible Chrome sample at `[0,-215,-240]`, 1440×900/DPR 1 on Apple M2 Pro/ANGLE Metal, uses the existing performance script, live 305-animal AI, 25 m player, 1.5-second warmup and 120 frames per preset. High: **60.4 FPS / 18.8 ms p95**, 390 draws / 760,518 triangles. Smooth: **60.5 FPS / 19.5 ms p95**, 233 draws / 431,872 triangles. This is a short current-scene sample, not a baseline comparison or physical-phone guarantee.

The same restricted external preview was refreshed and rechecked: all eight fetched artifacts match the current build, the 156-source manifest matches the workspace, English desktop and Chinese touch-emulated mobile launch at 15 m, and private source paths remain blocked. The desktop production check uses the normal launch animation.

Natural first-layer timing, full-round completion and physical-phone play remain user-review items. No commit, push or formal release is authorized.

## Initial-map baseline (before this follow-up)

## Runtime checks

`scripts/verify_mariana.mjs` runs the actual game in Chrome, selects all four regions, checks their isolated populations and music routing, opens all six new English Guide models, and exercises native movement and collision. At 30 m a closed seal stops a sprint descent. Each of the three guardians is then defeated by exactly three actual flank contacts at its original home. The test fixes the recovery phase and makes the player invulnerable to isolate contact and gate behavior; it does not claim natural combat completion. All three openings are traversed by native movement, the round remains active until the bottom refuge, and restarting restores all guardians/seals and the 3 m player.

A tiny barreleye is eaten by real contact and respawns through the normal 28 simulation-second resident timer at its assigned anchor. Headless rendering can take longer than 28 wall-clock seconds because the existing physics timestep is capped. The fixture waits for the actual transition without changing its timer. English home and Guide captures fit 320 and 390 px viewports.

The additional controlled runtime checks record a real goblin-shark pursuit and actual engaged guardian, both triggering the new music. A 30 m Giant Squid crosses all three opened passages down and back up using native sprint input. Those passage checks explicitly pre-open guardians as a geometry fixture; earned opening is covered separately by the real-contact test. Chinese narrow Guide captures cover the gate instructions. `extra_report.json` retains the successful route/audio checks and an initial resource assertion that sampled before caches were warm; the separate lifecycle run diagnoses that observation rather than hiding it.

## Ecology and survival model

The region has 289 ordinary creatures across 19 species. Six are exclusive; 100 small fish occupy the protected nursery. Progressively larger tuna/rays, goblin sharks, white sharks, sperm whales and Ancient Giants feed the upper growth route. Distinct anchors continue large prey below each threshold. World bounds and habitat depths are data passed through shared navigation and respawn, not species-name exceptions.

The controlled full-health meal budget uses the shared nutrition and hunger functions. It is not a natural round prediction. At lengths 3/6/10/16/25/30 m and representative depths, the hunger formula is unchanged; drain is approximately 0.22/0.305/0.467/0.735/1.105/1.30 points per second. Representative useful meals return 15/38/43/56/70/86 points respectively, before the 100-point cap. The deepest representative meal is a region-wide example; actual local anchors and travel still matter. At 25 m a sardine supplies only about 0.019 hunger, compared with 70 from a megalodon. Healing can divert growth. Lord bites retain their shared 8 hunger return and all round clocks retain the 30-minute cap.

## Rendering and performance

Measurements use serialized visible Chrome, 1440×900, DPR 1, a fixed seed and 25 m player, live regional population/AI, active audio and actual collision geometry. Existing `verify_atlantis_performance.mjs` is reused with region and position parameters. Each quality preset warms for 1.5 seconds and samples 120 frames, including a CPU profile. These short controlled scene samples do not prove physical-phone or full-round performance.

Measured samples and final checks are recorded below. The source uses vertical chunks, shared creature/environment resources, merged/instanced decoration, three nearest lights and GPU seal/water animation. No quality reduction, engine migration, separate ecology formula or new per-frame mesh allocation was introduced.

## Audio evidence and limits

Offline rendering records 105 seconds of exploration (a full harmonic cycle), 32-second chase, guardian and lifecycle clips at stereo 24 kHz. No non-finite samples or clipping occurred; peaks remain below 0.9. Mute, pause and reset windows are silent; normal map-switch/start paths retain bounded voice counts. `audio_report.json` and four WAV clips hold the objective results. Native pursuit and guardian activation are independently checked. These signal checks do not establish subjective musical quality; device listening remains user review.

Natural 30-minute pacing, unassisted completion and physical-phone controls/performance remain unverified. Narrow captures are desktop viewport emulation. No commit, push, main merge or formal release is part of this candidate delivery.

## Final checks and measured costs

- Full unit regression: **650/650**; shared integrated browser suite: **29/29**. The final appearance-only fin attachment correction then passed **14/14 focused checks**, including shared skeleton identity, finite model bounds, guide copy, all spawn slots and gate contacts. Formatting and production build pass. The existing bundle-size warning remains (approximately 1.45 MB minified JavaScript before transfer compression).
- Regional browser checks: ten completed assertions covering isolation, native opening/contact, arrival victory, restart, real resident respawn and narrow English UI. Additional actual chase/lord audio and six adult Squid passages pass. A second set of six-species front/rear captures and four real ocean viewpoints covers the final rig correction; screenshots use controlled positions, not a natural completion.
- Loading rollback: two deliberate one-shot failures, during partial population creation and effects reset, restore the original Hawaii environment/population. Dismissing the error and retrying loads all 289 Mariana animals, with no unexpected console errors. The fixture's inherited Atlantis population literals were corrected to the actual Mariana roster before the successful rerun.
- Cleanup: six full switch cycles dispatch exactly one disposal for each of the **131 map-owned geometry/material resources**, every cycle. Explicitly rendering cached scene objects once per map warms lazy GPU uploads; the last five Mariana samples then stay at **824 geometries / 638 textures / 8 music buses**. These are whole-renderer/cache counts, not just map assets or VRAM byte estimates. Initial natural-view samples grew as previously unseen cached animals uploaded; that is recorded in the earlier failed pre-warm assertions. No production pooling or disposal behavior was loosened to make the test pass.

Performance device: Apple M2 Pro, Chrome through ANGLE Metal, 1440×900, DPR 1. Mean and p95 reflect 120 sampled frames per preset; the slight values above 60 FPS include frame scheduling boundary noise.

| View                    | High mean FPS / p95 | Smooth mean FPS / p95 | High draws / triangles |
| ----------------------- | ------------------- | --------------------- | ---------------------- |
| Nursery (final fin rig) | 60.8 / 19.1 ms      | 60.3 / 18.7 ms        | 862 / 810,010          |
| First guardian approach | 60.0 / 18.8 ms      | 60.6 / 19.3 ms        | 170 / 181,526          |
| Bottom refuge           | 60.6 / 18.4 ms      | 60.5 / 18.5 ms        | 55 / 95,222            |

Initial destination-switch measurements were about 1.9–2.1 seconds including UI selection and a fixed 0.8-second settle. They are not pure constructor timings. The staged loading view remains visible across preparation/compile; controls are locked and recover on success or failure.

The original score's measured peaks are 0.121 (exploration), 0.304 (pursuit), 0.290 (guardian), and 0.180 (lifecycle), with maximum simultaneous voice counts of 12/16/18/14. All mute/pause/reset sample windows have zero RMS. This verifies signal health and arrangement entry, not taste or real-speaker listening.

## Preview delivery

A dedicated restricted static server exposes only the production `index.html` and hashed runtime assets. Eight publicly fetched artifacts are SHA-256 matched to the local build. English desktop and Chinese 390×667 touch-emulated scenarios verify selecting Mariana, the resident Guide, beginning play and returning home; no development state export or unexpected browser error is present. A temporary harmless runtime probe verifies update/refresh through the same external URL and is removed afterward. Repository source, Git metadata and local verification paths are blocked.

The final artifact fetch initially hit one network timeout; the local server and tunnel readiness remained healthy. A retry through the same URL byte-matched all eight updated artifacts and passed both native UI scenarios with zero unexpected errors. No tunnel restart was needed.

The final runtime manifest, process ownership and temporary address are in ignored `.local/mariana_preview/manifest.json`; public interaction results are alongside it. This is host-side access through the public URL, not proof of the user's external network or phone. The preview remains separate from formal Pages, and no source commit or push was made.
