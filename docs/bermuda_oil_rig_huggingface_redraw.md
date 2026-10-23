# Bermuda offshore oil rig — HF redraw, 2026-10-23

## Acceptance checkpoint — 2026-10-23

The user says “提交吧，下一批”, accepting this oil-rig appearance and authorizing
a local commit. All 1,278 delivered input hashes match before these status notes.
The original evidence below remains dated; previous pending labels are historical.
This authorization does not include a push or publication.

## Status and scope

The user accepts batch 3 and asks to commit and continue. The accepted Crimson
Sailfin, Steel Cape freighter and storm tanker are locally committed as `5fb9c7f`.
All 1,270 delivered inputs matched before acceptance-only notes. This fourth
batch is a separate, **uncommitted candidate awaiting the user's visual review**.
No push or main publication is authorized. The current AI agent worked alone.

This batch replaces the offshore rig's topside: drilling derrick, processing
plant, crane, accommodation block and helideck. It is one generated integrated
model, not three independent generations. The four deep support columns and
terrain-dependent footings retain their geometry contract; old braces that
protruded through the deck now stop below it, with fitted column seam bands.
A real load-bearing bottom plate closes the generated underside's missing faces.
The placement `(210, 4, -450)`, deck footprint, all ten ordered collision solids,
ships, ghost-ship artillery, ecological stock, rewards and gameplay are preserved.
There are no new walkable interiors. The upper accommodation collision remains
the existing coarse envelope, not a new per-triangle collision model.

The liner wreck, Flying Dutchman-inspired ship, waterspouts and other unreviewed
scenery remain future batches. Accepted animals and shared models are unchanged.

## Reference and production

Structural references were read on 2026-10-23:

- [Equinor's Oseberg field centre](https://www.equinor.com/energy/oseberg): drilling,
  processing and accommodation components, including steel-jacket installations.
- [TECON's Clipper platform](https://teconsrl.it/project/clipper-platform-2/):
  quarters with a helideck above a four-legged foundation.

This is an original game adaptation, not a reconstruction of either installation.
No third-party photograph was uploaded. The built-in image generator produced an
original isolated topside reference with weathered ivory walls, a dark green
helideck, red/white lattice derrick, ochre crane and muted metal pipework. The
concept and prompt rationale are preserved in `.local/bermuda_batch4_20261023/`.

Actual image-to-mesh service: `microsoft/TRELLIS.2`, Space revision
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; model `microsoft/TRELLIS.2-4B`, revision
`af44b45f2e35a493886929c6d786e563ec68364d` (MIT). Seed `743324`, 1024 generation,
100,000-triangle / 1024-texture GLB export. Attempt 01 was canceled during
inference and retained; attempt 02 completed and the actual 5,564,192-byte GLB
was downloaded while its session remained live. Source SHA-256:
`bbaad4b16cd01c866af172abc9fdfcdf9d5c79788b70b6ca8097df68c50f8cb6`.

Dated included-quota readings: 2,026.815144 seconds before attempts and
1,885.983216 after successful export, out of 2,400; over-quota usage stayed zero.
The service reported a reset at 2026-10-24 17:55:02 BJT. Failed attempts are
included in the 140.831928-second difference. This is not a perpetual live balance.

The retained GLB has 94,888 triangles. Offline conversion welds source UV seams,
reduces to 27,054 triangles, projects source normals and color onto a new atlas,
and packs fallback vertex colors. The rig-specific fit rotates the inspected
orientation and fits deck/slab/tower heights to the existing site, with inverse
transpose normals. The final runtime has 43,620 vertices. Raw front/back/side/
top/underneath color and neutral renders are preserved. Thin rails and lattice
members retain generated irregularity; this is weathered game scenery rather
than precision CAD. A modest material multiplier improves storm-light visibility
without changing the scene's lighting or other materials.

Reproducible converters: `scripts/prepare_bermuda_rig_hf_asset.mjs` and
`scripts/fit_bermuda_rig_hf_asset.mjs`. Runtime ownership lives in
`src/bermuda_rig_asset.js` and `src/bermuda_oil_rig.js`; the fleet delegates only
its existing rig construction. Shared geometry/materials are reference-counted.
Ordinary region construction starts the bounded texture loader; missing textures
retain source vertex color, online/retry restores the color map, and the last
owner releases texture, bitmap, geometry and material.

## Evidence and measured cost

Evidence root: `.local/bermuda_batch4_20261023/`.

- `rig_review/`: matched original/current views, including neutral geometry.
- `native/report.json`: ordinary region loading, deliberately aborted color-map
  requests followed by recovery, three Hawaii/Bermuda cycles with exactly one
  geometry/material/texture disposal per departed rig, pause/Home, and 390 px
  Chinese desktop viewport. No browser errors. First-pass captures remain under
  `native_first_pass/`; final evidence includes the brace/material correction.
- `native/rig_world.webm` and `delivery/oil_rig_world.mp4`: real populated Bermuda
  scene, original lighting/weather, with an observer camera and invulnerable
  positioned player. Three views cover topside, sea-level approach and underwater
  supports. This staging does not demonstrate a natural encounter frequency.
- `contract_and_cost.json`: exact ten-collider equality against the committed
  factory for three sloping seabed fixtures; measured resources below.
- `support_routes.json`: 25 underside ray checks and six broad underwater
  corridors (6 m swept radius) pass with the unchanged collision set. These
  geometric checks are distinct from the staged world film.
- `regression.json`: 120 fleet-time samples preserve complete collision states,
  routes and ghost-ship surfaces. Existing accepted ship meshes are unchanged.
- `tests.log`: 1,614 tests pass, including three new ownership/geometry/contract
  regressions. The earlier 1,611 result remains batch 3's historical evidence.

| Whole oil rig                  |  Before | Candidate |
| ------------------------------ | ------: | --------: |
| Mesh draws                     |       8 |         3 |
| Triangles                      |  10,068 |    31,514 |
| Geometry attribute/index bytes | 565,720 | 1,522,016 |

In a matched paused populated view (468 entities), scene draws changed 124 to
119, and triangles 859,501 to 880,243. This is a geometry/detail increase despite
fewer draws, not proof of improved FPS. There is one additional shared 1024
color texture. Desktop Chrome rendering and 390 px checks do **not** establish
physical-phone performance, heat or battery acceptance; the original phone
follow-up remains open.

## Restricted preview verification

`check.log` and `build.log` pass. The existing preview manager rebuilt in place
without replacing any service. Current entry: `index-Jr77JXWh.js`.
`artifacts.json` verifies all **373 current files / 96,065,140 bytes**, including
precompressed resources, against dist, the local restricted service and the
public Cloudflare origin. All 15 private/source/directory probes per origin
are denied. The tunnel ready endpoint and original process identities pass.

`public/report.json` passes English 1440 px and Chinese 390 px native region
selection, Guide, launch, boost/ability, pause/Home and same-address refresh.
The new rig texture returns 200 in both sessions; there are no browser/resource
errors and `window.__ABYSSAL__` is absent. The landmark observer captures use
the identical source/build reviewed locally; they do not claim a remote user
or physical phone was tested. The preview remains available for user review:
<https://saver-recorded-digit-could.trycloudflare.com/>.

The final encoded video fully decodes to 628 frames / 20.93 seconds, H.264,
yuv420p, with the three view labels retained. `source_preservation.json` verifies
1,265 of 1,270 existing inputs remain byte-identical; the only existing changes
are the fleet's rig delegation and four project status documents. Eight new
files hold the isolated rig assets, converter/fitter, tests and review.

Final new-candidate status: **uncommitted, not pushed, awaiting visual review**.
The accepted previous checkpoint is `5fb9c7f`; formal main/Pages are unchanged.
