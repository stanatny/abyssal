# Public README refresh — 2026-11-12

## Scope

Replace the 2,445-line public README with a concise player-facing landing page.
The original opening is dominated by development checkpoints; its primary play
link still targets a v0.11.12 query and its sole screenshot is a v0.11.3 menu.
The complete previous document remains available through its
[immutable Git reference](https://github.com/stanatny/abyssal/blob/ef6a6a2345329370d553a87d97389b869ac22cfe/README.md).

The new page puts the stable GitHub Pages URL immediately below the title and
links its screenshots to the same playable entry. Short sections explain
starting a round, eight destinations, four characters, actual keyboard/touch
controls and local development. Detailed tuning values and stale edition
summaries are removed from the landing page. Current rules and sources remain
in their existing documents and the in-game Ocean Guide.

The development rules now keep checkpoints and acceptance receipts in HANDOFF
or topic documents, preventing the same accumulation in README. Gameplay,
runtime assets, package version and the existing preview services are unchanged.
After delivery of the full preview, README and screenshot bundle, the user
explicitly authorizes committing and pushing this documentation update to main
on 2026-11-12. This supersedes the candidate's earlier pending-authorization
status. No game version bump, tag or separate release is included.

## Screenshots and verification

New screenshots come from the deployed v0.11.28 English interface at
<https://stanatny.github.io/abyssal/>. They retain the live HUD and ordinary
follow camera. Native destination selection, automatic swimming and brief
keyboard steering/sprinting provide the views; no development hook, position
override, AI image or composite scene is used.

An initial screenshot harness incorrectly required a body dataset value when
reselecting the already-active default destination. Its timeout is retained as
`capture_initial_default_region_wait.json`. The corrected harness waits for the
real selector value and region-loading state. Native capture receipts and
selected source images are retained in the ignored `readme_refresh_20261112`
task folder.

Documentation checks cover current source facts, local file/image links, image
dimensions, the stable play entry and GitHub Markdown rendering at desktop and
narrow widths. This is a documentation-only change; no new gameplay regression
run or physical-device performance result is claimed.

The final README has 83 lines. Its three 1440 × 810 JPEGs total 505,601 bytes:
Hawaii's new coral-and-jelly scene, an Atlantis gateway approach and Penglai's
above-cloud flight. The latter two views use brief native steering and sprint
travel, rather than default spawn framing. Original older screenshots remain
available to historical documents.

All nine local document/image links resolve. The stable Pages URL responds with
the v0.11.28 shell, and both the selected-map capture and travel capture finish
without page errors, failed requests or bad HTTP responses. GitHub's Markdown
API renders the candidate successfully. A local GitHub-style preview at 1120
and 390 px has no horizontal page overflow, loads all three images and keeps
the first playable link near the top. Its preview CSS is an approximation of
GitHub layout, not evidence of an already-published README. Corresponding
receipts are `links.json`, `selected_images.json`, `capture.json`,
`capture_travel.json`, `capture_flight.json`, `readme_layout.json` and `check.log`.

## Bilingual follow-up

The user extends the same README publication task with separate Chinese and
English versions. Keep `README.md` as the English default and add
`readme_zh_cn.md` with reciprocal language links directly below both titles.
Translate the concise content using the game's current Chinese names and
control labels; reuse the same three screenshots and identify their English
interface. The English quality-setting label is synchronized with the actual
`Quality · Low` UI, corresponding to Chinese `流畅`.

The development rules explicitly allow this user-requested Chinese README and
require both variants to stay aligned. Gameplay, images and v0.11.28 are
unchanged. Existing format/check commands now include the Chinese README.
Continue the previously authorized main publication after focused
formatting, link, translation and rendered-document checks. Bilingual publication
receipts remain in the ignored `readme_bilingual_20261112` task folder.
