# Atlantis furnishings and key glow — 2026-10-22

## Acceptance checkpoint — 2026-10-22

The user accepts the delivered appearance and requests a local commit. All 1,213
delivered inputs match before acceptance-only documentation changes; no new
full test run is implied. The preceding candidate/pending labels below describe
the historical development state. No push or formal publication is requested.

## Scope and acceptance

The user accepts the preceding conch waterlocks, inscriptions and quest chest,
requests key glow, and authorizes the next HF batch. The current agent works
independently on a carved bench, round stone table, decorative storage chest
and amphora. These four candidates and the new glow await user visual review.
No commit, push, personal Skill change, new game rule or formal release.

Weathered ivory stone, restrained bronze marine relief and warm pottery follow
the existing Atlantis civic art. They are original fantasy designs, not historical
reconstructions. The household chest remains distinct from the sacred reward
chest. No accepted creatures, city masonry, camera, ecology or combat are edited.

## Sources and adaptation

Four generated concepts were submitted to the live Microsoft TRELLIS.2 Space
using the included HF Pro allocation. All four jobs completed on attempt 01;
raw GLBs, concepts, receipts and front/back/side/top/underside material and clay
views remain in `.local/atlantis_furniture_hf_20261022/`. The preflight recorded
MIT model/Space metadata. The dated post-generation allowance was 893.015726
seconds with zero overage; this is not a current/future balance guarantee.

| Asset   | Seed   | Raw source SHA-256                                                 | Runtime triangles |
| ------- | ------ | ------------------------------------------------------------------ | ----------------- |
| bench   | 743001 | `95ef8a1ef7c35faeb5f176da25c88e19957a139be83d66747830a74a8c209de1` | 1484              |
| table   | 743002 | `162d74556693d5eeddd70501d28ab798a3f43574cd1e8afdd68ba50c3f63ca1b` | 508               |
| chest   | 743003 | `5fd99ed3177298942639fd6a0497e41f08cf5521a0cac9b5238130a6c1bd368c` | 1108              |
| amphora | 743004 | `023600a6cc0b631f67779f735f7dca7381db3e7bc41bd551522eeec6f6ad492c` | 900               |

The converter retains immutable original exports, simplifies with normal-aware
error constraints, unwraps padded 1024-pixel atlases and stores same-source
linear fallback colors. Closest-surface projection initially sampled interior
walls of hollow pottery and produced dark patches. Furniture now projects from
outside along the interpolated source normal before falling back to closest
surface; this option is limited to `furniture_` inputs. Other asset converters
retain their original default. Unlit/native before-and-after captures record the
correction. The first overly coarse bench lost its narrow rail and was rejected;
the final 1,484-triangle version retains it. Rejected exports remain local.

Offline fit and normal transformation align bench feet/seat and the chest lid
with the existing physical envelopes. Original collision construction remains
the placement oracle; suppressing its visible primitives does not change its
colliders or random sequence. The HF meshes occupy the same instances and
building transforms. Pottery retains its original scattered platform/shard and
placement sequence. Four shared meshes/materials/textures are instanced within
the existing eight furniture batches. There is no per-frame mesh construction.

## Key aura

The existing bronze key retains its contact center and all twelve hiding sites.
Its existing emissive texture is stronger, with one small procedural radial sprite
and no extra light. The additive sprite draws before opaque geometry without
writing depth, so it cannot bleach the key or shine through walls. Alpha reaches
zero on every texture border. The existing update clock supplies a restrained
pulse; reduced-motion mode holds it steady. Collection/reset/distance visibility
and scene ownership include the aura and dispose its texture/material once.

## Cost and verification

Native Chrome runs use the actual Atlantis wrapper, lighting, fog and textured
assets; observer-camera screenshots/films are labeled controlled demonstrations.
Texture-failure/retry was exercised in Chinese 390px desktop touch emulation;
this is not a physical-phone performance result. The original mobile gate-entry
stall/black-surface follow-up remains open.

29 targeted tests pass for the new four assets, shared ownership, key aura,
unchanged quest gates, transformed support, collision contact and all residential
doorway routes. The full city's 20,964 collision records and preexisting route
oracle remain unchanged. The local source audit identifies only the intended
furniture, key and offline/test files as modified since this turn's baseline;
previous pending quest-prop work is preserved.

The 120 residential interiors contain 409,800 furniture triangles and 30 meshes
(previous test ceiling 300,000/35); the geometry ceiling is explicitly revised to
420,000 to preserve the accepted near-view rail and handles, not silently weakened
to hide a failure. District culling and the draw ceiling are unchanged. All eight
batches total 474000 furniture triangles. The four textures total 1200784 bytes,
with four geometry/material owners shared across the city. A larger geometry
budget is a cost trade-off, not a mobile optimization or a proven FPS improvement.

Native checks confirm normal-entry automatic texture readiness, real key
collection, chest unlock prerequisites, pause freeze and three Atlantis/Hawaii
cycles. All four meshes/materials/textures and 31 instance buffers release once
per cycle (43 resources), then recreate at the same count. Aborted downloads
retain varied same-source color and recover on the normal online retry event.

Further run-specific results (full suite, matched cost sample, production hashes,
public interactions, encoded delivery) are appended after execution below.

The full-suite lifecycle check caught a second consumer: Poseidon's old
material-name remerging path discarded HF instance transforms/materials. The
adapter now retains the three HF instance batches and their owners, merging
only the remaining procedural pieces. Temple triangle accounting includes every
instance (185,648 triangles/12 draws); its ceiling is explicitly 190,000 rather
than 180,000, and its original 13-draw ceiling remains. Regression checks inspect
indexed triangles, original world placements and material ownership. Native
captures cover the actual temple furnishings in addition to the harbor.

## Final verification and delivery

The corrected candidate passes all 1,579 tests and the production build. The
first full-suite temple failure and its correction are retained in the evidence,
not omitted from the record. No gameplay or previously accepted creature asset
changed. This remains an uncommitted visual candidate.

On native Chrome 155 / Apple M6, the same-session old/candidate/old furniture
comparison used a fixed observer camera with live AI, audio and collision, a
freely moving invulnerable player, two seconds of warm-up and five seconds per
sample. High-quality p95 frame intervals were 18.10 / 18.40 / 18.40 ms; Smooth
was 18.20 / 18.30 / 18.40 ms. High rendered about 68–76k more triangles in this
view; Smooth about 76k more. Render CPU medians stayed approximately 2.1–2.3 ms.
These short, frame-capped desktop measurements do not establish physical-phone
FPS, thermal behavior, GPU time or long-session stability. The comparison swaps
the old furniture factory, not the entire earlier application build.

The existing restricted preview was rebuilt without replacing its processes.
Entry `index-BV7KJFZ5.js` is served at
`https://saver-recorded-digit-could.trycloudflare.com/`. All 284 current build
files (82,663,746 bytes, including compressed companions) were freshly downloaded
from both the loopback server and the public origin and matched the build hashes.
Eleven source/private/directory paths returned 404, production debug hooks were
absent, and the tunnel readiness endpoint passed. English 1440px and Chinese
390px desktop-touch flows covered Guide, start, ability, pause, Home and same-URL
reload without browser errors. The four new texture requests succeeded.

`delivery/` contains five matched before/after views, five six-second actual-scene
observer-camera clips and their 30-second H.264 compilation. Final encoded clips
were decoded and sampled for visual inspection. Evidence, failed candidates,
raw HF files, performance reports and receipts remain under
`.local/atlantis_furniture_hf_20261022/`. The key aura and four furnishings await
the user's visual review; the accepted preceding quest props stay accepted.
