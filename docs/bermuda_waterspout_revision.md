# Bermuda waterspout visual revision

Acceptance update — 2026-10-24: the user says “可以，下一批吧”, accepting this
weather appearance. The candidate evidence below retains its original scope;
this does not establish physical-phone performance. No commit/push is requested.

## Scope and status — 2026-10-24

The user accepts the ghost ship and requests the next batch (“可以，下一组”).
The current agent independently replaces Bermuda's hard transparent funnels and
torus skirts with animated condensation, irregular cloud edges, lifted spray and
broken rotating foam. This weather candidate awaits visual acceptance. The
previous liner and ghost-ship work is preserved; nothing is committed or pushed.
Formal main/Pages remains v0.11.16.

All seven original anchors, drift trajectories, radius 10, shallow-only contact,
16 damage, 9-second cooldown, lifting and nursery rules remain unchanged.
Condensation and spray outside the contact radius are atmospheric decoration.
This is not a physical fluid simulation or a new weather-event mechanic.

## Reference and actual asset provenance

[NOAA/NWS, About Waterspouts](https://www.weather.gov/mfl/waterspouts) distinguishes
storm-associated tornadic waterspouts from fair-weather waterspouts. Its photograph
was inspected for the tapered condensation column, irregular edges and spray at
the water. Bermuda keeps its existing fictional storm setting. The reference
photograph is not distributed as a game asset.

The initial plan was to generate a cloud mesh with TRELLIS.2, then render an
offline sprite atlas. That plan did **not** succeed. Three actual jobs returned
`RuntimeError` in generation: 1024/seed 744001, 512/seed 744001, and 512/seed 744002. No GLB was exported, no generated cloud geometry was inspected, and the
planned mesh baker was never run. The service returned no detailed traceback;
the failure cause is unknown. There was no provider switch or extra paid usage.

The successful HF step was image preprocessing/background removal. The final
asset is a 512-square RGB WebP packed from that output, using a built-in image
generation cloud concept as input. Its black background becomes transparent
through luminance density in the shader. It is an **HF-processed image**, not an
HF-generated 3D model or multiview atlas. The texture is 29,182 bytes; packing
only resizes and compresses the image. Original inputs, receipts and hashes remain
in `.local/bermuda_batch9_20261024/`.

The last job's dated quota read at approximately 00:15 BJT on October 24 was
650.568187 / 2400 included seconds, over-quota usage zero, with the returned reset
at 17:55 BJT on October 24. The initial read was 913.109072 seconds. These are
historical readings, not a live balance; further jobs require a fresh check.

## Runtime construction and ownership

`bermuda_waterspout_visuals.js` owns the shared geometry, three single-pass
transparent materials, fallback texture and loaded cloud image. Each spout uses
three meshes. Its bounded instanced cloud geometry draws 68 quads in High and
52 in Smooth; both retain the core, crown and spray. No per-frame geometry,
private animation loop, light, physics body or population is added.

The existing weather clock drives deformation and advection. Reduced motion
freezes shader flow. Ordinary pause freezes both the clock and moving centers.
Material preparation begins during normal region construction, falls back on a
procedural mist texture if loading fails, and retries on reconnect. The map owner
releases the loaded texture and private resources; disposal is idempotent.

## Verification and limits

Evidence is in `.local/bermuda_batch9_20261024/`:

- `review/`: matched before/after overview, waterline, base and submerged views
  in High and Smooth. `review_occluded/` is rejected camera evidence, not delivery.
- `native/report.json`: actual Chrome rendering, image failure/recovery, three
  Bermuda/Hawaii cycles with all nine observed resources released once, real
  hazard contact and launch, pause/Home and a Chinese 390px layout.
- The observed hit reduced health from 100 to about 84.05 (passive regeneration
  had already resumed); the original 16-damage rule is covered separately by
  tests. The first fixture incorrectly required health at or below 84 and is
  preserved as a rejected assertion, not a gameplay defect.
- `delivery/waterspout_world.mp4`: 26-second live-world recording with an observer
  camera, covering the moving funnel, sea surface and waterline. It is not a
  natural player-input traversal. The encoded output has 779 distinct decoded
  frames and no decode errors.
- `performance.json`: matched paused rendering with 468 entities, 1440×900
  drawing buffer, native desktop Chrome, 35 warm-up and 100 measured renders per
  variant with `gl.finish()`. High before/after/before-repeat medians were
  1.8/1.5/1.3 ms; Smooth 1.4/1.6/2.2 ms. Late p95 values were noisy (up to
  35.9 ms in the original repeat), so this does **not** establish a speedup.
  In that camera, draw calls were 36→39 and triangles 506,376→500,290 High
  (500,066 Smooth). Other views differ because old geometry is culled while the
  instanced cloud bounds deliberately remain visible. The measurements include
  submission and completion; they are not isolated GPU timing or gameplay FPS.

These are M6 mini desktop checks. Narrow emulation does not establish physical
phone performance, temperature, power or the status of the prior phone incident.
Visual acceptance remains the user's decision.

## Final local checks

- `npm run check`: passed.
- `npm test`: 1,626 / 1,626 passed; includes the two new waterspout resource and
  path regressions plus existing swept hazard/nursery tests.
- Same-origin production rebuild: passed; previous runtime archived and all
  four existing process identities preserved.
- Against the prior delivery's 1,321 inputs, only the weather implementation and
  five relevant documentation files changed. All 261 pre-existing asset files
  match their original hashes; accepted fish, ship and liner inputs are preserved.

## Production preview verification

The rebuilt `index-ClbRupey.js` candidate has 407 artifacts totaling 103,857,302
bytes. All dist/local/public files match byte-for-byte. Eighteen source, hidden,
configuration and directory paths are denied at both origins; no production
debug hook is present. English desktop and Chinese 390px native Guide/start/
ability/pause/Home flows and same-address refresh pass without browser or resource
errors. These public checks ran on the host through the public URL, not a separate
physical device. The initial artifact-audit invocation lacked `requests`; the
successful rerun used the existing cached `uv` environment without changing system
Python.

The original DEV, restricted preview, tunnel and awake processes remain intact.
The preview manager preserves the previous runtime and serves only `index.html`
and `assets`. Rebuild with `.local/mini_preview_20261007/manage.py rebuild`;
inspect `status` before using its named-process `stop` command when authorized.
Actual PIDs, process identities, logs, local ports and public URL remain in the
ignored process registry and this batch's `artifacts.json`/`delivery.json`.

`source_preservation.json` and `final_fingerprints.json` identify the reviewed
candidate. No commit, push or formal publication was performed. The three failed
HF generation receipts and the unexecuted baker remain distinguishable from
successful runtime evidence.
