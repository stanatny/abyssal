# Atlantis monument redraw — 2026-10-21

## Production brief

The user accepts the surface batch with “提交，下一批”. Night boats and Brown
Pelican are locally committed as `fc19861`; 1,134 delivered input hashes matched
before acceptance-only documentation updates. No push or main publication.

The current agent independently replaces two still-procedural monument types:
the sea-god statue behind the arena and six street obelisks. Preserve the accepted
creatures, birds, fleet, map layout, ground/foundations, buildings, ecology,
lighting/fog/audio, routes, contacts, objectives and bilingual UI. New candidates
await user visual acceptance and are not covered by the preceding commit.

Identity: weathered ivory maritime stone, restrained bronze patina, carved
anatomy/cloth and recessed maritime glyph relief. Existing accepted HF temples
and artifacts set the surface-detail floor. This is an original fantasy Atlantis
design; Greek sculpture is a material/anatomy reference, not an archaeological
claim about a real submerged city. The Artemision figure is variously identified
as Zeus or Poseidon, so its historical identity is not asserted as settled:
[National Archaeological Museum](https://www.namuseum.gr/en/permanent_exhibition/syllogi-glypton/).

Scale/route contract: statue stays at x0/z-865, scale1.55, on the existing
42×36 terrain-supported foundation. Its local feet baseline is0, crown approximately66,
trident tip81.5, head center(0,59.4,.6), shaft x-9.8/z4.2. Preserve head/trident
landmarks and lights, pose-specific contacts and leg/arm negative spaces.
Obelisks remain at x±78/z-270, x±103/z-555 and x±109/z-852 (last pair scale1.35),
with local9×9 base and38 height. Original city contracts are snapshotted before
editing; generated meshes must fit the preserved solids and clear passages.

Ownership: current agent; source entry `src/atlantis_city.js`, new dedicated
monument asset/fitting module and assets, and focused tests/docs. Do not change
shared architecture templates or global texture/material state just to replace
these render consumers. Reuse the existing city owner and instancing/chunk path;
load colors during normal construction, keep source-color fallback and finite
retry, release refcounted resources at final owner. No new update loop or lights.

Verification: inspect exported textured and clay meshes from multiple angles;
compare matched original/candidate views, actual night-city approach and near
views, desktop and narrow layout, grown-body passages and support contacts.
Compare full collision/order/placement/landmark snapshots, population and key
routes. Exercise ordinary load, texture failure/retry, owner disposal/re-entry
and region switching. Record actual repeated-instance/scene costs; no physical
phone or thermal claim. Preview uses existing restricted origin and process
identities; production exposes only build output, never local source/evidence.

Evidence for this batch: `.local/atlantis_batch5_20261021/`. Current live quota
receipt is dated2026-10-21T13:18:53Z: 1,955.928438/2,400 seconds, overage0.
Completed production receipts and validation follow below.

## Generated candidate and integration

Both candidates are actual TRELLIS.2 exports from original generated reference
images, not procedural placeholders. Poseidon uses our own original statue as a
pose reference; the obelisk reference is newly generated. No third-party image
was uploaded. The Space `microsoft/TRELLIS.2` and model `TRELLIS.2-4B` cards were
checked at generation time (MIT); exact revisions, prompts, receipts, original
GLBs, textured/clay views and rejected framing attempts remain in ignored local
evidence. Private service URLs/session data are not published.

| Asset    |   Seed | Actual raw GLB bytes | Runtime vertices / triangles | Color                      |
| -------- | -----: | -------------------: | ---------------------------: | -------------------------- |
| Poseidon | 742501 |            3,925,864 |              40,524 / 31,908 | 1024px WebP, 267,394 bytes |
| Obelisk  | 742502 |            3,070,092 |                5,632 / 6,497 | 1024px WebP, 202,986 bytes |

Raw SHA-256: Poseidon
`9c6d2b4cd99374b89f145119430bcba9c29a40a335c9a716854715c1a7604dfb`;
obelisk `e7b2fe4e05a822c17a3a0c5d3db3b227ef4097ca524f211bb35462b5783a24c5`.
Generation started at 2026-10-21T13:21:40Z and 13:23:15Z. The dated receipt after
the second export reports 1,897.11872/2,400 included seconds and zero overage;
this is a receipt, not a claim about the reader's current balance. No paid
capacity or retry inference was used.

Reduction retains source normals, creates an explicit atlas and projects the
original HF color onto it. The offline fit adjusts positions and inverse-
transpose normals into the existing statue/obelisk contracts. Feet/base y=0,
statue height81.5 and obelisk9×38×9 are measured from runtime geometry. The old
collision-generating builders remain unchanged. The existing six obelisk light
glyph meshes also remain unchanged; carved markings add surface detail around
them. This replaces two visual types at seven locations, not every city building.

`atlantis_city.js` owns one reference per asset kind; ordinary construction
starts color loading. Obelisks keep the existing UV-preserving instanced/chunk
path. Poseidon uses one textured mesh at the old transform. Two cities can share
these resources; final-owner disposal closes textures, geometry and materials.
Source-color vertex fallback is retained during errors, with the existing
bounded loader and online retry. No new per-frame loop, light or gameplay event.

## Verification and scope

- `npm run check`, all **1,538 tests**, focused geometry/ownership and frozen
  city-oracle checks. The initial suite exposed two old test assumptions that
  every shared geometry lived in the procedural registry. Those checks now
  identify geometry genuinely held by the second live city; last-reference
  release is tested separately. No disposal assertion was removed.
- All city colliders/order, obstacles, landmarks, building records, stats and
  lights exactly match the pre-change factory. The frozen v0.8.0 oracle was not
  edited: only Poseidon and non-emissive obelisk render meshes are excluded from
  the unchanged-geometry digest. Old obelisk light glyphs and all other geometry
  remain exact, with six original matrices explicitly asserted.
- Native Chrome normal load requires both new textures without fixture-only
  preparation. Three Atlantis/Hawaii-or-Bermuda cycles release every tracked new
  geometry/material/texture exactly once. Injected failures preserve original
  vertex colors; the existing online recovery loads both maps. No page errors.
- A 30m player actually travels 28.69m along the main avenue and28.8m past the
  statue flank, with staged starting positions and ordinary game updates.
  Pause freezes movement and Home works. This does not assert that a30m body
  fits between the statue's legs; that was not an existing promised route.
- Textured and clay inspection, matched front/side/three-quarter views and
  actual city observer-camera movies. Original lighting/fog and live ecology
  are retained. Reframed the obelisk film to avoid foreground building occlusion;
  inspected the final encoded H.264 clip, not just the raw browser capture.
- Public native English1440px and Chinese390px checks include normal entry,
  accepted Pelican Guide regression, start/ability/pause/Home and same-address
  reload with the new entry. Both new color resources return200; no production
  debug hook.390px is desktop touch emulation, not physical-phone evidence.

Measured full assembled city render cost changes from1,020 to1,006 meshes,
5,145,094 to5,067,750 triangles including repeated instances, and130,713,864 to
112,978,390 unique attached geometry/index attribute bytes. These are static
scene costs, not FPS/thermal measurements. The retained collision helper still
constructs its old cached sculpting geometry; no claim is made that all global
helper memory disappeared. Runtime adds two1024px colors.

Local evidence: `contracts.json`, `asset_cost.json`, `targeted.log`,
`lifecycle_targeted.log`, `test_final.log`, `native/report.json`,
`native/film_reframe_report.json`, `public/report.json`, `delivery/`, and final
source/build fingerprints. The local commit remains `fc19861`; this new batch is
uncommitted and awaits the user's visual review. No remote/main publication.

Final preview delivery: entry `index-CIXP29OQ.js`; **245 files / 73,003,344 bytes**
match the local dist, restricted origin and public URL byte-for-byte. Eleven
source/private/directory probes per origin are denied. The tunnel readiness
endpoint succeeds; DEV35213, preview23118, awake23120 and tunnel35419 retain their
recorded process identities. No service replacement. Full fingerprints and
receipts stay under the local evidence directory; share the established preview,
not a Vite or repository-root address. Formal main/Pages remains v0.11.15.

## User acceptance and local checkpoint

Accepted Atlantis monuments checkpoint — 2026-10-21: the user says
“提交吧，亚特兰蒂斯古城，其他海底建筑也想办法重绘一下吧”, accepting
Poseidon and the six inscribed obelisks and authorizing a local commit. All
1,143 delivered inputs match before these acceptance-only notes; prior 1,538-test
and native/public receipts retain their original scope. The current agent
continues independently with other unredrawn city architecture through HF,
preserving openings, interiors, grown-body routes and accepted assets. No push
or main publication is requested; the next candidates require visual review.
