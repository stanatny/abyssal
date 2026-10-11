# English localization follow-up — 2026-10-11

Publication update — 2026-10-11: the user authorizes this accepted review and the Zombie Shark background for commit and main publication in [v0.11.8](release_v0_11_8.md). Candidate-only status and measurements below retain their historical meaning; they do not block this publication or authorize later changes.

## Scope and diagnosis

The user reports Chinese in an otherwise English startup screen. Work continues uncommitted on `fix/english-localization` from published v0.11.7 / `3d3eebf`. This presentation-only task does not authorize a new main publication. The current AI agent owns implementation; established services and historical worktrees remain intact.

A native compiled-build baseline reproduces the Chinese startup title. Initial loading used the independent literal `夏威夷海滩`, while subsequent region changes used the translated region configuration. Earlier localization scripts waited until loading finished and omitted this transient state. Their fixed Guide counts also predate the current eight-region roster, so this review adds a current-roster verifier instead of claiming those historical scripts passed unchanged.

The wider audit finds six affected routes:

| Surface                                  | Cause                                                                     | Correction                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Initial loading title                    | Independent, unregistered Hawaii label                                    | Read the default expedition's configured name, also used by the menu and later loads |
| Destination picker species counts        | Interpolated HTML leaves a concrete Chinese text node such as `28 种生物` | Translate the parameterized count before inserting it into markup                    |
| Active depth rail                        | Missing English entry for `深度`                                          | Add `Depth`                                                                          |
| Contact-mine warning                     | Caller uses a different Chinese noun than the existing translated warning | Use the established contact-mine source text                                         |
| Odyssean ebb-ring hit notice             | Missing English event entry                                               | Add the movement/escape instruction in English                                       |
| Europa/Penglai radar accessibility label | Nursery name concatenated with punctuation before translation             | Translate a parameterized suffix, including the nested regional name                 |

Default language selection remains browser-language based, with an explicit saved choice taking precedence. Chinese UI and the language selector's deliberately native `中文` option remain available. Gameplay, ecological counts, movement, rendering quality, audio and rewards are unchanged.

## Regression coverage

`tests/localization_routes.test.js` checks all dictionaries imported by the actual translator, including placeholder parity and English-only values, rather than just the original two dictionaries. It also checks regional names/objectives and literal `t`, notification, damage and loading-stage routes plus structured message templates. Local source helpers that register their own bilingual strings are distinguished from the UI translator. HTML translation units and composed parameters require the native checks below; the static test does not claim exhaustive data-flow analysis.

`scripts/verify_localization.mjs` observes actual loading DOM changes from before application initialization without slowing or replacing the game. It checks first load, region switches and same-address reload; native destination/character pickers, expanded home settings, Guide categories and entries, records, gameplay ability/HUD and pause; and stored language switching. Visible English text and accessibility attributes are scanned, excluding intentionally native language options. English desktop visits every available regional Guide entry, deriving counts from the live UI. Narrow English and Chinese scenarios cover representative maps. Both Chrome and WebKit can run serially against development or restricted compiled hosts.

```bash
ABYSSAL_PREVIEW_URL=http://127.0.0.1:7188/ \
ABYSSAL_REVIEW_OUT=.local/localization_review \
node scripts/verify_localization.mjs
```

Set `ABYSSAL_BROWSER_ENGINE=webkit` for WebKit. All browser evidence is desktop or touch-viewport emulation, not physical-phone testing. The native normal-play samples do not naturally trigger every rare combat warning or complete every regional ending; source-route and dictionary checks cover untranslated event copy independently.

## Evidence and delivery

Current receipts belong to ignored `.local/localization_revision_20261011/`; historical release checks are not relabeled as this review. The source inventory examines 1,941 Chinese literals/templates, including intentional internal metadata and separately registered bilingual lore. The pre-fix compiled English desktop audit visits 273 regional Guide entries and exposes the loading, picker, depth and radar leaks. A first harness attempt incorrectly read a button with `inputValue`; its failed receipt is retained and superseded by reading the button's actual value. The new source-route test fails on the unpatched event/depth/startup literals and passes after correction.

Final candidate checks pass 48 focused tests, formatting/build, 20 local Chrome cases and 10 public WebKit cases, with zero remaining English-copy issues or browser errors in the final reports. All 1,919 loaded dictionary entries pass language/placeholder validation. The complete counts, harness corrections and limits are recorded in [verification](verification.md). The existing compiled-only preview is rebuilt without replacing its processes, with the preceding runtime archived. Public source/debug/private paths must remain denied, runtime files must match the reviewed build, and production must not expose the development API. Formal Pages remains v0.11.7 until separate publication authorization.
