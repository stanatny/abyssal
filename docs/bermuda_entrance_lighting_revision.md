# Bermuda entrance and lair light revision — 2026-11-23

The player corrected the entrance request from insufficient height to insufficient brightness, while accepting the height change already implemented. This local candidate retains the raised entrance, adds readable rock-colour fill at its mouth and places softly breathing luminous mineral colonies on the real walls behind the sleeping titan. No publication, commit or version change is included.

## Entrance

The two existing approach arches become unequal fault arches with displaced crowns, broad exterior fins and visible strata. Their central clear water increases from approximately 101.3/102.0 m to 170.5/180.4 m; the actual northern main-shell aperture increases from 125 to 174 m. The roof adjustment blends only north of z=-1465.4. The real floor, descending routes, other caves, southern closure and rear annex retain their existing geometry.

The entry remains one 648-triangle mesh. Its private wet-stone material retains the original detail shader, vertex strata, lighting and fog, adding a bounded 0.12–0.24 multiple of the existing rock colour as indirect fill. It introduces one owned material/program and no extra light, texture or draw. Geometry and contacts change together; the entrance-specific contract audits actual surface coverage and 25/30 m shared complete-body motion in both directions and two water layers.

## Lair

Three finite raycasts attach mineral fields to actual joined cave/overhang faces, rather than floating cards or a background image. Their production anchors are approximately (-243.74,-512.37,-1642.43), (-210,-537.81,-1547.89), and (-357.74,-533.46,-1595). The minerals reuse the rock shader's coarse and fine noise, preserving its relief and avoiding repeated neon stripes. Private material bindings restore their original shared materials on disposal.

The background uses the existing three-point-light pool alongside the head and active mouth source. No point lights, triangles, drawing passes or animation loops are added. Existing foreground HF sponge batches remain. A twelve-second sinusoid varies the background emission and its selected pool source from 0.82 to 1.18 of the base; it never turns black. Reduced motion holds the base brightness, repeated paused times remain unchanged, and LOD uploads retain their existing throttle. Global exposure and fog are unchanged.

## Fresh checks

- `node --test --test-concurrency=1 tests/bermuda_titan_entrance.test.js tests/bermuda_titan_lair_lighting.test.js tests/ocean_lighting.test.js`: 16/16 pass.
- The wider entrance/descent batch passes 6/7. Its legacy rear-shadow case dereferences a null old-front geometry at `bermuda_single_entrance.test.js:457`; a Node load hook using all four pre-task module copies reproduces the same failure. This candidate does not repair or conceal that pre-existing model-contract mismatch.
- Production build into the ignored task build directory passes in 3.50 s. The accepted public runtime is not replaced.
- Matched populated development scenes use 1,083 entities, the Smooth renderer, identical cameras and exposure 1.03. Desktop and 390×667 observer views compile without page/console errors. Near/far lair views retain 35/34 draws and their exact visible triangle counts. This is a bounded resource comparison, not native FPS, temperature or physical-phone acceptance.
- An actual 30 m Orca uses ordinary keyboard inputs through the northern entrance and back. Both legs pass, ending with health 100 and hunger 63.25, without healing or protection during the journey. The once-staged start is outside the cave; no teleport is used between ingress and return. This verifies the doorway, not an adult treasure pickup or complete expedition.

## Evidence and remaining scope

Ignored evidence lives under `.local/bermuda_entry_light_20261123/`: pre-task source copies and manifests, entry metrics and coverage, focused logs, `legacy_audit/baseline.log`, `runtime_review.json`, build log, matched observer reports, actual input traces, and delivery receipts. `before_final`/`after_final` provide matched scene stills and the native doorway run. The final correct lair pulse and phone captures are in `after_lighting_final`; earlier pulse captures accidentally used an entrance camera and are rejected. Final complete-arch observer views use a labelled 110-degree field of view, while lair comparisons retain 58 degrees. The pulse movie samples the actual lighting update at half-second phases in a paused world; it is an effect review, not a normal gameplay recording.

The earlier regular-stripe backdrop is rejected and preserved separately. The old public preview, all HF source bytes, survival/hazard rules and previous archives remain intact. Full-world adult treasure access and the earlier small-character escape-HUD issue remain open; this entrance/light pass does not claim either solved.

## Preview delivery follow-up — 2026-11-23

The player now explicitly requires a verifiable playable link after every completed change. This supersedes the preceding local-only delivery status for this review candidate. The existing restricted preview received the current compiled workspace as build `3b669801c0dce27d`, while the prior runtime is archived at `.local/mini_preview_20261007/runtime_before_20261123_165045` and the running service/tunnel remain unchanged. Eight public runtime resources match their recorded SHA-256 fingerprints; private source/configuration paths return 404. A temporary public file changes at the same URL with `no-store` and is removed afterwards.

An actual compiled public-origin browser run passes home loading, native Bermuda selection, start, keyboard dive (visible depth 72 to 152), pause, resume, return home and reload, with no page/console/request errors. Cold ready is 43.689 seconds and reload ready 6.649 seconds on this host run; the current runtime cache worker controls the refreshed page. An earlier attempt through the system network path encountered TLS closes; the completed check uses a direct browser route with normal certificate validation and does not change system proxy settings. These are host-side public-origin checks, not user-device or full cave-clear acceptance.

The actual URL, build/source manifests, service identities, failed and successful network records, browser screenshots/report and final receipt live under ignored `.local/preview_delivery_20261123/`. Full-world adult treasure access and the small-character escape-HUD limitation remain open. Formal main and GitHub Pages are not updated by this candidate-preview delivery.
