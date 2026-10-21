# Contact Mine Hugging Face redraw — 2026-10-20

## Acceptance and local checkpoint — 2026-10-21

All current preview changes accepted — 2026-10-21: the user confirms that all
current effects have passed review and authorizes committing them together.
This includes Contact Mine, the four reef decorations, Sunfish/turtle refinements,
selected combat/lord audio and versioned loading cache. This supersedes earlier
pending and cache-only checkpoint labels for these delivered changes. Preserve
gameplay and existing services. No push or main/Pages publication is requested.
The current AI agent next audits runtime CPU/GPU costs independently.

Earlier candidate-only status below is historical. Technical receipts retain
their actual dates and scope; user acceptance is separate from device testing.

The user's “提交，下一批” authorizes local checkpoint `891e494` for the accepted submarine, attack torpedo and ochre palette, then the Contact Mine candidate. The current AI agent develops this new asset alone. It remains uncommitted/unpushed and awaits individual visual review; main/Pages remains v0.11.13 / `110494c`. The three surface boats are next in the remaining-element queue.

## Appearance and provenance

The stationary spherical mine now has a weathered dark blue-green metal shell, bronze equatorial belt and horn collars, blunt contact horns, top service handle, lower hanging loop and small ruby warning lenses. Shape comes from the actual generated mesh; fine scratches and some panel seams are texture detail. Its deliberately worn finish is distinct from the cleaner submarine without introducing a new gameplay category.

An original concept was generated and then submitted to the authenticated Microsoft TRELLIS.2 Space. Attempt 1 completed actual image-to-3D inference and GLB export. Raw source SHA-256 is `29c0d24789e968062bf8155b8b4bf1da6904aee8c1bd53ac2bcb427013bf0f62`. Raw GLB, prompt/concept, private receipts, clay/material views and rejected conversions remain under ignored `.local/contact_mine_hf_20261020/`; no credentials or private generation URLs enter the build.

The dated quota receipt started at 2026-10-20 07:40 BJT with 2,172.487262 of 2,400 included seconds; after export it recorded 2,099.384332 seconds, a measured decrease of 73.102930 seconds. Over-quota usage remained zero. This is a recorded run balance, not a future live balance.

## Geometry and runtime

Directly simplifying the old UV islands damaged horns and seams; that candidate was rejected. The final offline converter welds duplicate positions before topology reduction, preserves boundary edges, transfers source normals by closest-triangle barycentric interpolation, generates a new padded 1024px atlas, and projects the original HF colors. Reduced geometry uses 10,754 triangles versus the old procedural 10,792. The shell, fittings and lamps render as one mesh versus five. The color WebP adds 299,376 bytes; the quantized source JSON is 494,045 bytes before bundling/compression.

The complete mesh, including horns and hardware, is uniformly normalized to radius 0.5. Runtime correction accounts for quantization so a 3.6 m mine retains its exact 1.8 m outer contact radius. There is no nonuniform stretching or invisible enlarged hazard. The same factory serves the Guide and active regional mines.

Geometry and color map are shared across instances. Each mine owns one material so its warning intensity can follow the existing independent phase. The shader illuminates only red source-map lens pixels, retaining the established slow intensity cycle. Offline sampled vertex colors preserve the metal/lens distinction before loading or on failure. Loading uses the existing bounded shared queue, retry and online recovery; no new requestAnimationFrame loop, timer or light is introduced. The last owner releases geometry, texture and bitmap; every owner releases its private material exactly once.

## Preserved behavior

The legacy internal kind stays `torpedo` (the separate submarine projectile is `attack_torpedo`). Population, regional availability, placement, diameter, static movement, warning ring, warning copy, collision sweep, wall occlusion, 28 damage, hit invulnerability, one-shot detonation, disappearance and restart behavior are unchanged. There is no tracking, new attack or food reward. Existing bilingual Guide descriptions remain accurate. Submarine/torpedo, humans, creatures and player assets remain untouched.

## Verification

Local evidence records matched before/after views, both sides, front/back/top/underside and neutral-material inspection. Tests cover finite nondegenerate geometry, spherical bounds, unchanged exact contact radius, independent warning phases, shared lifetime, swept collision and one-shot damage. A native isolated renderer forced texture failure, verified vertex-color fallback, retried successfully and returned geometry/texture counts to zero after final release.

Final native, populated-scene, build and production receipts follow. Technical checks do not replace the user's aesthetic acceptance. Desktop touch emulation is not a physical-phone test; render counters do not establish frame-time or thermal improvements.

### Final candidate receipts

- Formatting/check, **1,437/1,437 full tests** and build passed. Existing contact/human tests verify geometry, radius, swept contact, occlusion and one-shot damage; only the brittle exact-five-mesh expectation was changed to a maximum-five bound. Gameplay assertions were retained.
- Native Chrome completed two rounds of Hawaii/Atlantis/Bermuda/Penglai transitions, Guide reopen, material readiness and pause checks. Existing 12-object pool, activation flags and radius stayed intact. An isolated native failure/retry test confirmed one shared geometry/map, private lamp materials, no premature shared disposal, and zero remaining geometry/texture allocations after the last owner.
- A staged start near the first real Hawaii mine and fixed observer camera recorded actual player movement into the hazard. At 3.136 seconds the mine and warning ring disappeared and health changed 100→72. Ecology remained active; later predator damage in the longer raw recording is separate from the mine hit. The delivery clip includes the Guide turntable and a short actual contact sequence; it is not a natural-progress or physical-phone recording.
- In matched paused views of the full 517-entity Hawaii scene, render calls changed 87→83, 109→101 and 162→150; triangles changed 419,432→419,394, 551,924→551,848 and 718,012→717,898. No FPS, physical-phone or heat claim is made.
- Restricted preview entry is `index-kcutaraO.js`. All **59 artifacts / 33,838,721 bytes** match dist, loopback and public responses byte for byte. Eleven prohibited paths per origin were denied. Tunnel readiness and original service identities were verified; no service was replaced or restarted.
- Production Chrome passed English 1440px and Chinese 390px desktop-touch cases: loaded Guide, start, ability, pause, Home and same-URL refresh. No console/page errors or failed runtime resources were recorded; the production debug hook is absent. The narrow viewport is desktop emulation only.
- All986 baseline source inputs were audited. Exactly five pre-existing files changed: AGENTS, README, HANDOFF, the mine factory and its mesh-count test. The other981 inputs—including submarine/torpedo, people, creatures, player models, map/population and combat-rule files—remain byte-identical. New files are the mine asset module, mesh/map, offline converter and this review.
- Evidence: `.local/contact_mine_hf_20261020/` contains commit receipt, source preservation, final fingerprints, HF provenance, raw/clay and matched views, lifecycle/scene/native/public reports, full test output and fully decoded H.264 media. Earlier rejected conversion files are retained and excluded from runtime.

Services remain DEV35213/preview74197/awake74200/tunnel35419 on loopback5188/7188/20248. Use `.local/mini_preview_20261007/manage.py status` and `rebuild`; the latter retains old runtime archives. Stop only an explicitly selected owned service with `stop <name>`. The temporary preview URL is in ignored delivery records. This new water-mine candidate is uncommitted and awaits user review; checkpoint891e494 is local only.
