# v0.11.11 — Living Depths and Penglai Skies

Current main publication — 2026-10-17: the user explicitly authorizes merging the accepted `feat/deep-ruin-hazards` branch into main. Release v0.11.11 includes regional-hazard/weather checkpoint `538e032`, guardian/terrain checkpoint `7b67fd3` and player-directed flight checkpoint `a0ae196`, following v0.11.10 / `cabe2a5`. All773 accepted source fingerprints match before release-only version/footer/documentation changes. Earlier branch-only/candidate restrictions below are historical and superseded for this accepted release. The current AI agent integrates alone, preserving established services, archives and canceled worktrees. No tag or GitHub Release is requested; future changes return to the default authorization rule.

## Resulting behavior

Atlantis gains four conch waterlocks inside existing public ruins. Other destinations gain two locally themed deep-hazard sites each. Their proximity-triggered three-second warnings, two-second releases and ten-second cooling periods offer visible escape routes, actual solid cover and at most one18-health event per activation. Reaching30m does not remove environmental danger. The corrected waterlock geometry avoids the previously observed rotating-edge flicker. See [the mechanism review](deep_hazard_revision.md).

Penglai retains two underwater resonance stones and adds broad, moving thunderstorms and squalls with random sky locations, heights and courses. A bounded two-event pool reuses warning, active and fade states; clearer wind trails make its movement readable. See [the weather review](penglai_sky_hazard_revision.md).

Full-body clearance and blocked-walker handling keep lords and ordinary ground creatures out of mountains. A29m Northern Hujiao patrols Black Tortoise's pool and remains dangerous to a30m player. Tortoise gains two warned pulses and four separated counters; White Tiger alternates its leap with a finite warned roar in its expanded territory. The Four Symbols have more imposing shared Guide/world models, corrected Dragon/Tiger head proportions and Vermilion Bird scale. Tortoise's stable heading and coordinated power/recovery strokes follow real movement. See [terrain and combat](penglai_ground_combat_revision.md), [guardian models](penglai_guardian_redraw.md) and [swimming](xuanwu_swimming_revision.md).

Only the player in Penglai adopts sprint ascent, gentle cruise gliding and faster Slow descent. Upward steering plus stamina-paid sprint climbs; sprint alone continues the actual current heading and never restores a hidden earlier upward pitch. Releasing sprint recovers stamina, permitting repeated directed climbs. Water movement, other regions, NPC/lord flight, body/roof collisions, speeds and stamina costs remain. Bilingual HUD, Guide, region hints and pause help explain the rhythm. See [the flight review](penglai_flight_revision.md).

## Verification and publication

Fresh local release checks pass1,289 unit tests, formatting and the production build. The restricted compiled build passes four native character start/skill/pause/Home flows, fourteen affected bilingual Guide cases, all eight regional start/pause/Home routes, localized version footers and same-address reload. Three English/Chinese desktop/narrow flight cases verify sprint-alone non-ascent after glide, upward-input ascent, Slow descent and localized Guide/pause help. No browser errors or production hooks are observed. All11 runtime files match local/Cloudflare origins and original four process identities remain. These desktop/narrow observations are not physical-phone or thermal evidence. Exact-main CI/Pages verification follows separately.

Accepted candidate evidence covers terrain clearance, natural attacks and counters, guardian models and motion, weather/mechanism timing and damage, and91 affected flight checks with native keyboard/CDP-touch direction cases and bilingual compiled public flows. These are recorded prior-scope results, not newly rerun release checks. All773 source fingerprints match the accepted branch before release-only edits.

Fresh release formatting, full unit tests, production build, compiled native flows and exact-commit publication receipts belong to ignored `.local/release_v0_11_11/`. Follow the existing Node22 main workflow through deployment, download its authenticated Pages artifact, compare all active public resources and check the actual `/abyssal/` page, localized version, native interaction and same-address refresh. Keep source/private/debug URLs unavailable and production development hooks absent.

Desktop Chrome and narrow viewports do not establish physical-phone ergonomics, sustained M4 heat, whole-round difficulty or long-session leak freedom. No new performance gain is claimed. Preserve established preview processes and historical worktrees.

## Rollback

The preceding main checkpoint is `cabe2a5` / v0.11.10. A rollback publication must revert this integrated scope with matching version/footer/documentation, preserve services and archives, and follow the user's publication authorization.
