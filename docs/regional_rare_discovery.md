> Historical initial candidate: the user's subsequent feedback requests earlier and more persistent guidance. The [early-search revision](regional_rare_search_revision.md) supersedes the 140/200-only notice and clearing-on-departure behavior below. These original measurements and evidence remain preserved.

# Regional rare discovery — 2026-10-09

## User request and candidate scope

Players should receive a restrained clue when approaching a regional rare and see an approximate activity range on the minimap. Rares still belong in secluded areas outside the starting nursery. This refinement stays on `art/mariana-irregular-terrain` with the accepted Mariana pit checkpoint `bd6850b`. The current AI agent is the sole developer; the new refinement remains uncommitted for user review and subsequent unified main integration. Published v0.11.3 and Pages are unchanged.

## Shared discovery contract

`regional_rare_discovery.js` checks the current region's actual living rare using three-dimensional world distance. At 140 world units or less, a short notice appears above the existing minimap. Once revealed, the clue remains until separation exceeds 200 units; this hysteresis prevents flickering at the entry boundary. The starting nursery suppresses it. Vertical separation matters, including Mariana layers and Penglai's airborne creature. A render-culled mesh is still a living resident and can trigger discovery; retirement (`hiddenFor > 0`) cannot.

The pale gold dashed ring marks the 90-unit resident habitat around the single randomly selected, locally jittered home for this expedition. It does not follow the creature or add an exact target dot. The other two possible search areas remain undisclosed. Existing Orca sonar retains its own precise-contact ability, cooldown and presentation. The cue is available to all four playable characters without activating sonar.

The notice shares the minimap layout and has no sound, flash, timer, animation loop, scene light or GPU resource. Combat and zone notifications remain independent. The bilingual Guide explains the notice and gold range. Proximity state freezes during pause; the visual cue hides under the pause overlay and is recomputed on resume. Capture clears it on the next ordinary HUD update. Terminal modes, new rounds and population replacement reset the controller; inactive menus never reveal a distant clue.

## Gameplay preserved

All eight maps retain exactly one registered rare per expedition, existing legal secluded search areas, movement and collision, evasive pursuit, ordinary-cruise disadvantage and sprint interception. Capture still settles once, fills health/stamina/hunger, raises their caps to 150 for that round, adds no growth and permanently retires the individual. New rounds restore 100 caps and choose a fresh habitat. No population, food, reward, combat, survival or region-specific rules were changed.

## Verification and limits

`npm run check`, targeted rare/navigation tests, all **1,041 unit tests** and the production build pass. Five new controller regressions cover 3D proximity, hysteresis, render culling, nursery suppression, invalid/dead/mismatched entities, reset and all 24 configured search areas.

The populated headed-Chrome development run passes **11 cases**: one actual encounter/lifecycle case in each of eight maps, with all four characters represented, plus Chinese 390 px, English 320 px and English 780×360 layouts. Each region has exactly one live rare; measured positions are outside the nursery, within the selected resident radius and depth range, above the actual seabed and clear of solids. Nearby feedback appears without sonar, stays centered while the resident moves, hides under pause and clears on home/map replacement. Final narrow captions fit their bounds and avoid pause/notification overlap.

Three additional encounter cases pass: an actual native sprint approach from 165 units triggers near 140, native turning/sprinting away hides the clue above 200, a controlled native mouth intercept clears the cue and settles the existing 150-cap/no-growth reward, and a new round restores one living rare and 100 caps. The capture case primes the nearby clue, pauses and places the player mouth at the unmodified rare before native resume/contact. It proves settlement and cleanup, not a naturally completed pursuit.

Restricted compiled local and Cloudflare hosts each pass **33 native UI cases**: all eight rare Guide entries in English 1440 px, Chinese 390 px and English 320 px (24 cases); all four characters' Hawaii start/pause/resume/home plus Penglai/Mariana narrow flows (six); and one same-address reload per profile (three). The new Guide copy is localized, all previews fit, initial nursery clues remain hidden and production `window.__ABYSSAL__` is absent. No observed page, console or HTTP errors occur.

All nine active artifacts are bound to final candidate/build-input fingerprints and checked byte-for-byte against `dist`, the restricted runtime and public responses. Sixteen private paths are denied, including the new controller source; same-address asset replacement/removal works. Existing dev/preview/awake/tunnel process identities are preserved. Evidence, snapshots, screenshots, the full candidate patch and operation records remain under ignored `.local/rare_discovery_20261009/`. Development evidence stages the player for focused encounter tests; it does not relocate rares or suppress ordinary ecology. Browser viewport/touch emulation does not prove physical-phone behavior or natural full-expedition completion. A proximity clue is an exploration aid and does not guarantee line of sight or a navigable straight route through rock.
