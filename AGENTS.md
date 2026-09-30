# ABYSSAL Development Rules

Read [README.md](README.md) and [HANDOFF.md](HANDOFF.md) first, then the documents relevant to the task. Historical states in the handoff do not override current rules.

## Quality bar for new content

Before adding or redrawing fish, playable characters, people, ships, environments, rewards, abilities, or their audio and effects, read and follow the [asset quality standard](docs/asset_quality_standard.md). Comparable polished assets in released **v0.6.10 / `5a3248e`** are the minimum reference; later accepted improvements in the same category become the new reference. Do not regress to placeholder models, recolored primitive shapes, poor synthetic voices, or crude particle piles.

Deliver models, animation, gameplay contact points, audio, and effects as a coherent whole. Inspect actual rendering and real triggers; passing automated tests does not establish visual or listening quality. Content below the standard may exist only in an explicitly labeled development prototype and must not be merged or released as a finished new category. Lowering the standard requires the user's explicit agreement. Continue normal implementation and verification within the authorized task without requesting approval for each production step.

## Regional map production

For a new region, a substantial map redraw, or a map-art assignment, read the repository-local [ABYSSAL Map Production Skill](.agents/skills/abyssal-map-production/SKILL.md) and prepare its [map brief](.agents/skills/abyssal-map-production/references/map_brief.md). Include those paths explicitly in Kimi's assignment so this works even without automatic Skill discovery. Kimi normally supplies the first art pass in scoped files; Codex owns the technical plan, shared gameplay integration, and independent final review.

Define regional identity, playable scale/routes, model references, distributed food, exploration/chase/lord audio, interfaces, and runtime evidence before expanding an art kit across the map. Review a populated playable slice early. Judge the finished map in the actual game, including terrain fit, adult traversal, survival, bilingual guide, loading/lifecycle, and measured performance. Atlantis-specific coverage, guardian counts, and population totals are examples, not requirements for every region. The Skill does not grant commit or release permission.

## Rule and content synchronization

Whenever a gameplay rule changes or an element is added, renamed, or removed, check the affected surfaces below before delivery. Update only relevant surfaces and use focused verification; this checklist does not require every historical test for every change.

- Keep gameplay values in their existing shared configuration or rule helpers. Make durations, limits, eligibility, and displayed values agree; remove abandoned branches, state, and duplicate constants when a design is simplified.
- Update both `en` and `zh-CN`, including static text, dynamic messages, canvas/world labels, and localized search terms. Check language switching and interpolation; an English fallback is not a completed translation.
- Synchronize the Ocean Guide: categories, cards, descriptions, statistics, abilities, reward effects, survival tips, search, and model previews must describe the implemented behavior.
- Check affected menus, control hints, settings, HUD labels, buff timers, cooldowns, notifications, radar, and results. A changed rule must remain consistent wherever the player encounters it.
- Verify content wiring where relevant: selection, region/depth distribution, spawn frequency, size, behavior, collision/contact points, rewards, sound, and visual triggers. An entry in the guide alone does not make a new element playable or discoverable.
- Update README, the current HANDOFF section, and relevant decision or reference documents. Distinguish current rules from published behavior; label superseded historical decisions instead of silently rewriting their evidence.
- Adjust affected unit tests and browser scripts, including their expected copy and values. Check both languages and narrow layouts when presentation changes; check pause, expiry, restart, and resource cleanup when state or effects change. Record actual checks and remaining limits under the existing verification policy.
- Search source, locales, current documentation, and verification scripts for obsolete names, numbers, and behavior claims. When delivering a preview, rebuild affected artifacts and verify that the served build contains the change; identify the candidate and published versions accurately.

## Survival calculations and future maps

Body size is the primary hunger cost: larger characters consume food faster. Keep this behavior shared by all maps in `src/simulation.js` through `hungerDrainRate()` and `HUNGER_RULES`, rather than adding independent per-map formulas. Current calculation, in hunger points per second:

```text
base = 0.22 + 0.02 * clamp(length - 3, 0, 3) + 0.03 * max(length - 6, 0)
depthFactor = 1 + 0.30 * clamp((worldDepth - 45) / (500 - 45), 0, 1)
hungerDrain = base * depthFactor
```

`length` is actual character length. World depth is positive below the surface; displayed depth is `worldDepth * WORLD.displayDepthScale` (currently 4). The mild depth surcharge starts below 180 displayed meters and reaches its +30% cap at 2000 meters. Returning shallower lowers it. Do not accidentally pass displayed depth into the simulation or stack another regional penalty on top. If these values intentionally change, update this rule and the linked [balance notes](docs/survival_balance.md) with the shared implementation.

For every new map or ecology change:

- Provide a safe, food-rich juvenile area and a continuous progression from small prey to medium prey to large deep-water prey. Verify actual legal spawn positions, school density, discoverability, respawn, and migration; a species listed in the guide is not proof of food availability.
- Evaluate consumption and obtainable nutrition together at representative body lengths (3, 6, 10, 16, 25, and 30 m), including travel and battle reserves. Use the real nutrition, healing, and growth rules; returns from undersized prey already diminish. Reward supplies and safe retreat remain intentional, so do not claim that staying shallow necessarily causes death.
- Treat regional ecology as data consumed by shared runtime rules: region membership, size/depth, school profiles, territories, and independent resident anchors/radii. Do not fix a missing regional creature with a `regionId`/species-name branch in generic movement or respawn. A small resident with `residentRadius` and `spawnAnchors` must patrol its own habitat and return there after consumption; it must not inherit roaming hunters' distant player-relative relocation. New regions may reuse these traits with their own coordinates and populations.
- Verify discoverability in the actual game, not only catalogue/config counts: all regional kinds must instantiate the correct models, representative exclusive creatures must be findable along intended routes at ordinary camera scale, activity must remain within the intended habitat, consumption must lead to a normal respawn there, and repeated region switching must preserve isolation and counts. Keep biological size intact; distinguish tiny decorative residents from food schools and explain observation/sonar help where relevant. Add a generic-trait regression when introducing a new habitat behavior so future regions inherit coverage.
- Preserve assigned feeding layers during movement and respawn. Deeper schools must not all migrate into the nursery. Avoid filling a food gap by spawning dangerous predators on top of juvenile players.
- Successful damaging lord bites restore `BOSS_BITE_HUNGER` (currently 8) hunger, capped at 100. Only validated hits count; cooldown, missed/blocked contact, and staying in contact cannot farm food. Per-hit food grants no health or growth, and defeat loot settles separately once. Keep this rule shared across lord species and maps.
- Keep the 30-minute active-play limit and real 25 m lord threshold. Check both playable characters, juvenile search grace, late-game feeding intervals, and a lord fight with damage. Distinguish quantified event models from natural full-round playtests.
- Synchronize bilingual player explanations, Ocean Guide, relevant HUD/menu copy, README, and tests under the checklist above. State simulation assumptions and real-device/performance limits honestly.

## Implementation and delivery

- Write project documentation, README files, development rules, and project Skill instructions in English. Player-facing game content must support both `en` and `zh-CN`; put new copy in the localization dictionaries, and check English text length and narrow-screen layouts. Keep code comments in Chinese, and logs and error messages in English. Use lowercase names with underscores for new files. Follow the project's Prettier formatting for JavaScript and documentation.
- Keep repository-facing presentation in English: GitHub About, README screenshots and captions, page titles, search descriptions, and social-preview metadata. Capture screenshots from the actual English interface. Preserve both languages inside the game; Chinese localization strings and source comments are intentional.
- Avoid changing existing balance, ecology, or combat rules solely for visual improvements. Explain any necessary change and verify its actual impact. Models, sounds, and effects must share resources while keeping instance state independent, with no leftovers after pause, restart, or disposal.
- Verify according to impact and record the checks actually run, evidence, and unverified boundaries. Small fixes do not require a full regression. Complete the necessary formatting, relevant tests, and build checks before delivery; documentation-only changes require only the corresponding documentation checks.
- By default, leave completed changes uncommitted for user review and authorization. If the user has explicitly requested a commit, push, or release in the current task, complete the required verification and act within that authorization without adding another confirmation. Do not extend historical release authorization to future releases.
- Keep one integration owner for a shared checkout. Parallel agents must use separate worktrees or explicitly assigned, non-overlapping files; they must not independently stage, commit, or push the shared checkout. If unexpected edits or commits appear, pause integration, preserve the diff, identify its source, and report the overlap before continuing. Do not bundle another agent's unreviewed work into a release or revert a mixed commit without separating accepted changes.
- Keep public documentation self-contained, without dependencies on private Skills, private repositories, or a developer's absolute local paths. Raw screenshots, recordings, and logs may stay in ignored `.local/`; record evidence names, conclusions, and limits in the documents.
