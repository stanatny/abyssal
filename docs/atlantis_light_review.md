# Atlantis decorative light refinement

Accepted lighting review against v0.8.0 / `4d3da88`. The user reported distant white-blue rectangles on buildings that resembled electric windows, then authorized committing and pushing the accepted refinement to `main` as v0.8.1. See [release verification](verification.md) for fresh checks and deployment acceptance; the observations below describe the reviewed candidate.

## Cause and change

The rectangles are shared `lapisGlow` wall inlays, not the light sources that illuminate rooms. Their 2.4 emissive intensity and 0.52 fog multiplier kept them conspicuous at distance. The actual local illumination already comes from fantasy shell-pearl sources through the five-light pool and the existing city-local ambient fill.

Only `src/atlantis_art_geometry.js` changes. The lapis inlays retain their kit key and exact geometry, but emit no light. They reuse the existing marble texture and painted weathering and receive ordinary structural fog. Pearl and nearby inscription emission is unchanged within 18 world units, fades smoothly between 18 and 65, and is zero beyond 65. A fragment-shader calculation uses actual camera distance for every merged/instanced surface, including off-axis views. It affects emission only: shell shape, reflective surfaces, ordinary received light and real point-light volumes remain visible.

No extra lights, meshes, textures, update loops or per-frame material traversal are added. The fixed five-point-light pool (three visible in Smooth), ambient/fog blend, near interiors, city visibility, quest pearl, food, collision and progression are unchanged. The shared texture is already cached. This visual fix does not establish a frame-rate or temperature improvement.

## Verification

Evidence stays in ignored `.local/atlantis_light_review/`:

- 17 focused architecture/budget, city-fit/light-pool and preparation-oracle tests pass. Exact accepted collider/obstacle/geometry data remains intact; construction failure cleanup and shared/private ownership pass.
- Sixteen accepted before/after scene pairs cover avenue approach, distant stoa, stoa interior and close shell-pearl at 1440×900 and 390×667, in High and Smooth. Draw/triangle counts match. Native Chrome page/shader errors are zero. Camera and time are deliberately staged in the actual game to isolate material appearance; these are not natural-play or physical-phone samples.
- Twelve native emission-only GPU diagnostics use two real instanced surfaces in an isolated black scene. Pearl/inscription emission remains at 12/40 units and matches emission-disabled pixels at 90 units, including an off-axis camera; lapis emission matches disabled pixels at all sampled distances. This is a shader check, not an aesthetic acceptance image.
- The initial inspection script used the wrong entity field and was corrected. A later browser session closed before readiness; its empty report is not a pass. Final scene capture succeeded in a serial run. Four exploratory overview images had an unsuitable camera below terrain and are excluded from visual acceptance. Raw reports and failed logs remain retained.
- Formatting and production build pass. The existing >500 KB bundle warning remains. Regional bilingual Guide/HUD descriptions still accurately refer to shell-pearl routes; no gameplay value or player-facing text changes.

Live warm-up resource counts vary slightly with transient actors/effects; they are not exact scene-equivalence or memory measurements. The user accepted the candidate; physical-device appearance remains unverified. The refreshed restricted production preview passed 16 local/public artifact byte matches, 172 runtime source fingerprints and two native-input Atlantis paths: English desktop Orca and Chinese touch-viewport Squid, including Guide, skill, pause/help, resume and return home. No development API is exposed; five private-path probes remain denied. Page/console errors are zero. Public access is verified from this host, not the user’s network.

## Review and rollback

Inspect the rectangular inlays from the avenue and inside a stoa, then approach a shell-pearl to check local warmth. Review both quality settings. Revert this material-factory diff to restore the prior presentation; no save or gameplay migration is involved. The user has authorized the v0.8.1 main-branch release. No gameplay or save migration is involved; rollback can revert this material-factory change independently of the release metadata.
