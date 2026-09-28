# ABYSSAL Development Rules

Read [README.md](README.md) and [HANDOFF.md](HANDOFF.md) first, then the documents relevant to the task. Historical states in the handoff do not override current rules.

## Quality bar for new content

Before adding or redrawing fish, playable characters, people, ships, environments, rewards, abilities, or their audio and effects, read and follow the [asset quality standard](docs/asset_quality_standard.md). Comparable polished assets in released **v0.6.10 / `5a3248e`** are the minimum reference; later accepted improvements in the same category become the new reference. Do not regress to placeholder models, recolored primitive shapes, poor synthetic voices, or crude particle piles.

Deliver models, animation, gameplay contact points, audio, and effects as a coherent whole. Inspect actual rendering and real triggers; passing automated tests does not establish visual or listening quality. Content below the standard may exist only in an explicitly labeled development prototype and must not be merged or released as a finished new category. Lowering the standard requires the user's explicit agreement. Continue normal implementation and verification within the authorized task without requesting approval for each production step.

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

## Implementation and delivery

- Write project documentation, README files, development rules, and project Skill instructions in English. Player-facing game content must support both `en` and `zh-CN`; put new copy in the localization dictionaries, and check English text length and narrow-screen layouts. Keep code comments in Chinese, and logs and error messages in English. Use lowercase names with underscores for new files. Follow the project's Prettier formatting for JavaScript and documentation.
- Keep repository-facing presentation in English: GitHub About, README screenshots and captions, page titles, search descriptions, and social-preview metadata. Capture screenshots from the actual English interface. Preserve both languages inside the game; Chinese localization strings and source comments are intentional.
- Avoid changing existing balance, ecology, or combat rules solely for visual improvements. Explain any necessary change and verify its actual impact. Models, sounds, and effects must share resources while keeping instance state independent, with no leftovers after pause, restart, or disposal.
- Verify according to impact and record the checks actually run, evidence, and unverified boundaries. Small fixes do not require a full regression. Complete the necessary formatting, relevant tests, and build checks before delivery; documentation-only changes require only the corresponding documentation checks.
- By default, leave completed changes uncommitted for user review and authorization. If the user has explicitly requested a commit, push, or release in the current task, complete the required verification and act within that authorization without adding another confirmation. Do not extend historical release authorization to future releases.
- Keep public documentation self-contained, without dependencies on private Skills, private repositories, or a developer's absolute local paths. Raw screenshots, recordings, and logs may stay in ignored `.local/`; record evidence names, conclusions, and limits in the documents.
