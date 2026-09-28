# ABYSSAL Development Rules

Read [README.md](README.md) and [HANDOFF.md](HANDOFF.md) first, then the documents relevant to the task. Historical states in the handoff do not override current rules.

## Quality bar for new content

Before adding or redrawing fish, playable characters, people, ships, environments, rewards, abilities, or their audio and effects, read and follow the [asset quality standard](docs/asset_quality_standard.md). Comparable polished assets in released **v0.6.10 / `5a3248e`** are the minimum reference; later accepted improvements in the same category become the new reference. Do not regress to placeholder models, recolored primitive shapes, poor synthetic voices, or crude particle piles.

Deliver models, animation, gameplay contact points, audio, and effects as a coherent whole. Inspect actual rendering and real triggers; passing automated tests does not establish visual or listening quality. Content below the standard may exist only in an explicitly labeled development prototype and must not be merged or released as a finished new category. Lowering the standard requires the user's explicit agreement. Continue normal implementation and verification within the authorized task without requesting approval for each production step.

## Implementation and delivery

- Write project documentation, README files, development rules, and project Skill instructions in English. Player-facing game content must support both `en` and `zh-CN`; put new copy in the localization dictionaries, and check English text length and narrow-screen layouts. Keep code comments in Chinese, and logs and error messages in English. Use lowercase names with underscores for new files. Follow the project's Prettier formatting for JavaScript and documentation.
- Keep repository-facing presentation in English: GitHub About, README screenshots and captions, page titles, search descriptions, and social-preview metadata. Capture screenshots from the actual English interface. Preserve both languages inside the game; Chinese localization strings and source comments are intentional.
- Avoid changing existing balance, ecology, or combat rules solely for visual improvements. Explain any necessary change and verify its actual impact. Models, sounds, and effects must share resources while keeping instance state independent, with no leftovers after pause, restart, or disposal.
- Verify according to impact and record the checks actually run, evidence, and unverified boundaries. Small fixes do not require a full regression. Complete the necessary formatting, relevant tests, and build checks before delivery; documentation-only changes require only the corresponding documentation checks.
- By default, leave completed changes uncommitted for user review and authorization. If the user has explicitly requested a commit, push, or release in the current task, complete the required verification and act within that authorization without adding another confirmation. Do not extend historical release authorization to future releases.
- Keep public documentation self-contained, without dependencies on private Skills, private repositories, or a developer's absolute local paths. Raw screenshots, recordings, and logs may stay in ignored `.local/`; record evidence names, conclusions, and limits in the documents.
