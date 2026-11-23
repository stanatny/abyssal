# Bermuda lava spray area expansion — 2026-11-23

The player accepts the current creature/cave presentation and requests a larger magma spray area. This candidate enlarges the existing continuous molten sheet and its inherited ground residual, without changing the accepted HF materials, mouth, creature pose, treasure, populations, damage, warning/calm/escape clocks or transport/cooling behavior. No commit, push or version change is authorized.

## Fitting and counterplay

Simply increasing the old sleeping/awake limits from 48/64 to 72/96 makes 11 of 20 fixed cases narrower because the old half-width/minimum fallback discards an already usable width. That candidate is rejected.

The production selector retains the previous complete, validated fit. At the same site, lift, seed and actual mouth it then tries factors 1.5, 1.25 and 1.1. Each expansion must pass all real-volume cells; otherwise the original complete sheet remains. The existing 48-attempt ceiling still applies, so exhaustion retains the accepted baseline instead of spending more attempts or disabling the event. The narrower mouth origin, seeded target selection and warning lock remain. No clipped stream or backward beam through the body is introduced.

The sheet, warnings, damage and residual pool inherit the same accepted field. Wider ground coverage therefore cools under the existing 3.5-second rule. Each sheet still uses 330 vertices, 140 cells and 840 tetrahedra; renderer pools, texture/light/RAF ownership and maximum live object counts are unchanged. This is not a claim of unchanged GPU fill cost or measured FPS/temperature.

## Fresh checks

- Two new regression groups fail before the change: clear-space 72/96 m width and newly covered real contact; constrained partial enlargement. All three new cases pass afterwards, including preserving the old legal fit when every expansion is blocked and a lateral bypass outside the larger fan.
- The focused sheet/flow/residual/render/site batch passes 41/41. The old obstructed-fan test now checks every actual constrained landing cell against its unchanged 15 m obstruction, rather than the superseded arbitrary 24 m selected-width ceiling.
- Three full-world checks pass: complete locked sleeping/waking paths, real legal 30 m damage and warning/calm separation, and real roof/terminal rocks. The separately diagnosed old paw-behind-mouth coverage gap remains open; this forward-fan expansion does not claim to repair it or establish full difficulty acceptance.
- Twenty fixed complete-cave seed/state cases select the same sites and emit complete travelling sheets. Sixteen landing footprints grow and four remain unchanged; none shrink. Their summed landing footprint increases 29.1695%. Largest tested clear-space widths are 72 m asleep and 96 m awake, 50% above their previous full-width fits. These are bounded samples, not a whole-map area guarantee.
- Matched populated paused-cave observer views show warning, full flow and cooling residual before/after at the same seed, camera, exposure, source and landing. The visible live count is 1,083; the selected 48 m sheet becomes 72 m. The observer is not native gameplay or a frame-rate sample. No page/console errors occur and task browsers close.
- Scoped source/test formatting passes. Comparison to the preceding preview source manifest identifies only `src/bermuda_titan_hazards.js` as a runtime source delta; all other runtime sources and accepted HF bytes match.

Ignored evidence lives in `.local/bermuda_lava_area_20261123/`: original source/test copies, red/green logs, full-world tests, production case comparison, matched scene screenshots/report, build and public delivery receipts. Independent rejected/ladder/fitting audits remain in `.local/lava_width_audit_20261123/`. The restricted preview is rebuilt as candidate `081a18e6cbc1accd`, retaining rollback and existing service/tunnel identities. Formal Pages remains unchanged.

## Public candidate

Ten served runtime resources match their current fingerprints, including the Bermuda application, HF model/texture and derived whole-body binding/contacts. Private source/configuration paths return 404. A fresh compiled public-origin browser passes home, Bermuda selection, native start/dive, pause/resume, return home and refresh without page/console/request errors. The current cache worker controls reload. Cold home readiness is 47.231 s and reload 7.494 s on this host run; no loading-performance improvement is claimed. A harmless same-URL public file changes A→B under no-store and is removed. User external-network/device play remains unverified.

The old candidate runtime is retained at `.local/mini_preview_20261007/runtime_before_20261123_180616`. Only the task development listener and test browsers are stopped; the preview, tunnel and awake identities remain. Current link, provenance, checks and receipts are in the ignored task `current_preview_delivery.json`.
