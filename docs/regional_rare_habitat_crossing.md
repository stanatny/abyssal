> Color update: the [glowing rainbow identifier revision](regional_rare_iridescent.md) supersedes the earlier gold/blue palettes described in this earlier evidence. First-crossing discovery behavior remains unchanged.

# First-crossing regional rare discovery

## Scope and authorization

The user requests discovery by first swimming through a rare habitat circle, regardless of depth, instead of an immediately visible or early 3D proximity beacon. The current AI agent alone refines the same `art/mariana-irregular-terrain` branch at accepted local terrain HEAD `bd6850b`. Existing rare-discovery work is preserved; this combined candidate remains uncommitted and unpushed for user review before unified main integration. Main/Pages stays v0.11.3.

## Behavior

- Each expedition still creates one ordinary living 1.8 m regional rare in one selected secluded habitat. No 30 m, guardian, sonar or elapsed-time eligibility gate is introduced.
- Before discovery, its activity circle and route clues are hidden. The first horizontal entry into that selected circle (XZ distance <= resident radius, currently 90 world units) reveals the fixed gold range, at any player depth. The old 500-unit 3D search boundary is removed. Creature proximity alone cannot reveal it outside the circle, and the nursery's depth check cannot veto a valid crossing.
- The independent minimap caption says **Rare area found / 发现珍兽海域** for six seconds of active play, once per discovery. Shared player elapsed time drives it; no extra timer, frame loop, audio or scene resource is created. Pause hides UI and freezes notice time.
- Thereafter the existing heading-relative arrow and approximate deeper/higher/level clue refer to the known area. Nearby emphasis still uses actual 3D creature distance (enter 240, leave 300), after discovery. The range does not follow the creature, reveal its exact position, or show other possible homes.
- The known circle persists after leaving or returning to the nursery. Capture permanently retires the resident and clears feedback; new round/resident, region/population reset and terminal overlays clear knowledge. Existing pursuit, collision, feeding, population, 150-cap once-only reward and no-growth rules are preserved.
- The bilingual Guide, shared repository rules and narrow-layout caption describe the same first-crossing contract. Existing combat notifications and sonar contacts remain independent.

## Verification

The final source passes project formatting, production build and **1,048/1,048 unit tests**, including horizontal inside/outside boundaries at widely different depths, nearby-without-discovery suppression, once-only notice/paused time, persistence and all 24 possible selected homes.

**Twelve populated development cases** pass: native input crosses a legal route after one initial player-position/facing fixture, across all eight actual maps and four characters; one separate shallow crossing reaches a deeper habitat's horizontal circle; discovery and retained captions fit Chinese 390 px, English 320 px and 780×360. Every regional case retains one legally placed living rare with no stock/NPC writes. The first detected crossing distances are 88.68–89.99 world units for the 90-unit boundary. The shallow fixture is 168 units above the home. Pause freezes player elapsed time and hides UI, resuming restores the remaining notice; actual departure retains the same fixed circle. Screenshots are visually inspected. Two harness failures (an optional sonar property and pre-frame resume sampling) are preserved and corrected before the final run.

**Two encounter cases** pass: a controlled paused player-mouth intercept, followed by native resume/contact, permanently retires the unmodified rare, clears its ring and settles the existing 150-cap/no-growth reward; a new round restores one undiscovered rare and ordinary 100 caps. This does not establish naturally completed pursuit.

Each restricted local and public compiled host passes **two ordinary-spawn native routes** in English 1440 px and Chinese 390 px, using only keyboard inputs and visible minimap position/heading. With no game hooks or state writes, initial rings are hidden and first passage reveals the discovery notice; pause/resume, fixed retained circle and Home pass. Natural prey consumption on the routes may grow the initial 3 m body slightly; there is no 30 m gate. These are shallow horizontal passes, without needing to reach the rare's depth.

Each host additionally passes **33 native compiled cases**: all eight rare Guide entries in both languages at 1440/390/320 px, configured character/map startup, hidden initial ring, pause/resume/Home and same-address reload. No console/page/resource errors or production development API are observed. Final nine runtime assets match local build bytes; complete candidate and 306 actual build-input fingerprints, sixteen denied private paths and replacement/removal of a harmless allowed asset prove source/build binding and refresh on the same public origin. Verification-only final documentation edits preserve every build input. Existing process identities and prior runtime are retained.

Evidence and reproducibility are under ignored `.local/rare_habitat_crossing_20261009/`, including complete baseline, scripts, reports, screenshots, manifests, operations and final delivery receipt. Public task Chrome uses a process-only direct connection because the earlier system-proxy path failed; no system proxy/VPN/DNS/TLS settings are changed. Earlier 500/3D results stay under `.local/rare_search_20261009/` as historical evidence.

Preview: https://saver-recorded-digit-could.trycloudflare.com/?preview=rare-crossing-20261009. This is a temporary candidate, awaiting user review on the same branch. Physical devices, independent remote-device acceptance, natural full expeditions and thermal/performance gains are not claimed.
