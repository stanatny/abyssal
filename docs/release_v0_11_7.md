# v0.11.7 — Mobile Input and Zombie Companion

The user accepts the delivered mobile-input and Zombie Shark companion changes and requests commit and push to main on 2026-10-11. This release follows `3605bc9` / v0.11.6. All 717 delivered source fingerprints match before release-only package/footer/localization and documentation edits. The current AI agent integrates alone. No tag or GitHub Release is requested; established services, runtime archives and canceled external-model work remain intact. Earlier candidate-only labels in linked reviews are historical for this accepted scope.

## Resulting behavior

Mobile menus/dialogs use manipulation touch behavior to prevent accidental double-tap page enlargement while retaining native scrolling and intentional pinch zoom. Coarse-pointer Guide search is hidden and disabled; players browse by region, category and entry. Desktop search remains at any width. Result names are deliberately editable, and a successful save blurs the input. Read [the mobile correction](mobile_touch_revision.md).

Zombie Shark no longer requires 5 m to summon. Health, stamina and hunger still each pay 50; exactly 50 health is lethal. One companion may live for 60 active seconds. Its ordinary-prey ceiling is `max(3 m, owner length − 5 m)`, inclusive. Correct shared meal settlement lets a starting 3 m owner benefit from an exactly 3 m companion meal. Rares still must be smaller than the owner; ordinary owner mouth and blast-meal eligibility remain unchanged.

For 2 active seconds after summon, detonation presses are ignored rather than queued. The HUD shows the protection and pause freezes it. A later deliberate command prioritizes an unobstructed, unlocked, size-eligible lord within 32 m, otherwise the nearest ordinary target. The companion locks one target and explodes on approach or actual posed-body collision. Lord damage still requires 25 m, an available opening and the existing ward/guard/cooldown rules. Normal hunting never attacks lords. No target preserves hunting; expiry still detonates locally; the next summon is immediately available if resources permit. Read [the companion review](zombie_companion_revision.md).

Existing art, fission/blast audio and effects, ecology, regional endings and v0.11.6 resource-budget improvements remain. No new loop, mesh pool, light or timer is introduced.

## Evidence and limits

Accepted implementation checks pass 1,183 unit tests, including real minion mouth settlement, rare eligibility, exact costs, protection/pause/lifetime, no-target retries, moving posed lords, cover and shared one-hit openings. Native Chrome DEV fixtures isolate a real 3 m meal, lord charge and immediate resummon using normal movement/contact/reward code. Compiled Chrome/WebKit cases cover native controls, bilingual Guide and short screens; public mobile regression adds 12 checks across 390×844, 320×568 and 844×390. All 11 candidate runtime files match local/public bytes and 18 private-path probes per origin are denied. A transient Cloudflare 502 pilot remains recorded separately from the successful retry. These are accepted candidate results, not new CI results.

Fresh release formatting, seven footer-localization tests and build pass. The final compiled build passes three headed Chrome companion cases and 12 WebKit mobile-input checks across three layouts, without observed browser errors or production hooks. These fresh receipts are separate from the accepted candidate checks. After push, verify the exact successful main workflow, Node 22 job, authenticated downloaded Pages artifact, all public runtime bytes/version/base path, native companion/mobile flows, reload and production-hook/source-path exclusion. Store those receipts in ignored `.local/release_v0_11_7/` rather than relabeling prior results.

Desktop browser emulation does not display a physical phone's system keyboard or establish that device's gesture behavior, frame rate, temperature or battery usage. Controlled lord/prey fixtures do not establish natural full-round balance. The user has authorized publication with those verification boundaries.

## Rollback

The preceding formal checkpoint is `3605bc9` / v0.11.6. Mobile touch/focus changes and companion rule/input changes can be reverted as separate areas, with their matching copy and tests. No save migration is required. Preserve established runtime archives and services during any authorized rollback.
