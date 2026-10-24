# Bermuda liner furnishings — HF candidate, 2026-10-23

## Scope and status

The user asks to continue the next batch. The current agent works alone on
`art/bermuda-hf-redraw`, after local checkpoint `0ffd683`. No new commit or push
is authorized in this turn. The preceding uncommitted funnels, window panels
and boilers are preserved, with their original evidence and acceptance history.
This new furnishing batch is pending visual review.

Four original generated assets replace existing salon sofas, passenger beds,
wardrobes and steamer trunks. The fictional liner's layout, openings, collision
contracts, routes, fixture metadata, lights, population and gameplay are retained.
The hull, decks, remaining small furnishings, ghost ship and waterspouts are not
claimed complete by this batch.

## References and provenance

- [Maritime Museum of the Atlantic: Titanic–Halifax connection](https://maritimemuseum.novascotia.ca/titanic-halifax-connection)
  documents recovered carved wood and a deckchair.
- [Nova Scotia: Maritime Museum Adds Titanic Artifact, 28 April 2000](https://news.novascotia.ca/en/2000/04/28/maritime-museum-adds-titanic-artifact)
  identifies a recovered mahogany cabinet from first-class B-deck bathrooms.

These sources inform period woodwork and the maritime setting, not an exact
reconstruction of Titanic interiors. Original concept images, rather than museum
photographs, were generated with the built-in image tool and submitted to HF.
The concepts are inputs, not evidence of finished runtime models.

Actual provider: `microsoft/TRELLIS.2`, Space revision
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; model `microsoft/TRELLIS.2-4B`, revision
`af44b45f2e35a493886929c6d786e563ec68364d` (MIT). Generation uses 1024 resolution,
12 sampling steps and 100,000-triangle / 1024-texture exports. Only included Pro
quota is authorized; no paid overage. Raw GLBs, concepts, private receipts and
failed experiments remain under ignored `.local/bermuda_batch6_20261023/`.

The post-download quota request for the bed encountered a TLS handshake error.
Its already completed GLB was retained, parsed and hashed; a separate recovery
record verifies the current balance. No duplicate bed inference was issued.
The original failed receipt remains available.

## Integration and review

All four source faces are inspected before rotation and fitting. Each placed
mesh stays in its old furniture envelope: sofas and wardrobes face into rooms;
bed headboards remain at the original end; trunks retain their shelf/stack
positions. The existing asset adapter owns shared immutable geometry, material
and source-color maps; the wreck owns merged per-material geometry. Normal region
construction begins texture preparation. There are no new lights or animations.

The optional `visible` argument of the Bermuda builder's `box` method removes
replaced primitive surfaces while retaining exact collider IDs and sequencing.
Default callers retain the previous vertices, normals, indices and collision
behavior. This is a visual substitution, not a new whole-room collision proxy.

`scripts/prepare_bermuda_wreck_hf_asset.mjs` preserves raw source hashes, projects
source normals and colors onto fresh UVs, and packs source vertex colors for
loading fallback. A first 3,834-triangle sofa reduction lost too much frame detail
and was rejected in favor of a finer 8,880-triangle version. The wardrobe
was similarly refined from 3,469 to 7,807 triangles to preserve its frame. The shared source
projection guard is unchanged. Raw and converted geometry are checked with both
material and neutral views, followed by the actual world wrapper.

The first standalone review fixture omitted a required fallback callback and
then used TextureLoader's default flipped UV convention; the fixture was repaired
to match the existing runtime loader's `flipY=false`. Failed fixture logs/images
remain in evidence. Game textures and shared loader behavior were not modified to
compensate for that fixture error.

## Cost and provenance measurements

| Asset          |   Seed | Raw GLB bytes | Final triangles | Runtime mesh JSON bytes | WebP bytes |
| -------------- | -----: | ------------: | --------------: | ----------------------: | ---------: |
| liner_sofa     | 743331 |     3,753,048 |           8,880 |                 309,119 |    207,198 |
| liner_bed      | 743332 |     3,941,016 |           4,591 |                 201,481 |    296,434 |
| liner_wardrobe | 743333 |     4,078,936 |           7,807 |                 324,077 |    240,472 |
| liner_trunk    | 743334 |     3,853,748 |           2,871 |                 115,864 |    237,880 |

Source SHA-256 values are retained in each packed asset and the raw export receipts.

The whole wreck changes from **13 to 17 mesh draws**, **196,268 to 306,346
triangles**, and **8,409,864 to 11,954,048 merged geometry attribute/index bytes**.
Seven shared source geometries total 1,548,403 bytes, including 817,319 new bytes.
The four new 1024² color maps total 981,984 WebP bytes; four packed JSON files
add 950,541 bytes before production compression. There are 4 sofas, 4 beds,
4 wardrobes and 10 trunks. Repeated placements are merged by their shared
material. This increases detail and resource cost; it is not an FPS improvement.
No new animation loop, light, gameplay behavior or per-frame allocation is added.

The included quota was 1,679.946325 / 2,400 seconds at 2026-10-23 21:20:44 BJT
and 1,434.715425 after the final trunk export; over-quota use stayed zero.
The service reported reset at 2026-10-24 17:55:02 BJT. These are dated readings,
not a promise of later balance. The net 245.230900 seconds covers this batch;
overlapping intermediate job snapshots are not summed.

## Verification

Evidence root: `.local/bermuda_batch6_20261023/`.

- `contract_and_cost.json`: exact equality of all 410 ordered colliders, all
  routes, 11 rooms, 204 fixtures, lights and landmarks against the immediate
  previous delivered build. World bounds and terrain support are unchanged.
- `builder_regression.json`: 50 legacy builder calls preserve exact position,
  normal and index arrays; omitted replacement visuals retain the same solids.
- `focused.log`: 21 focused tests pass, including the original 32 m full-body
  bidirectional routes, 1,304 sweep samples and 136 turn samples, finite geometry,
  independent ownership and final-owner resource disposal.
- `review/`: matched before/after color and clay scenes for the salon, cabin,
  wardrobe, luggage, whole wreck and atrium. Initial obscured inspection angles
  are retained separately; final cabin/wardrobe views use the real door openings.
- Raw front/back/side/top/underneath renders and selected converted views remain
  alongside the original concepts and GLBs. Final colors follow the HF sources;
  generated weathering remains intentionally irregular, not precision CAD.

- `tests_final.log`: 1,617/1,617 full tests pass; formatting and production build
  pass. The wreck budget is now 17 material buckets and fewer than 310,000
  triangles; all collision, ecology and gameplay assertions remain intact.
- `native/report.json`: all seven maps deliberately fail and retain source vertex
  colors, then recover online. Three Hawaii/Bermuda cycles each release seven
  shared geometries, materials and textures. Native Space input crosses the
  starboard breach both ways at 32 m; only each journey's initial position is
  staged, with normal movement/collision afterward. Pause/Home and Chinese
  390 px launch also pass, with no browser errors.
- `native/wreck_world.webm`: actual populated game with unchanged scene lighting
  and fog, showing salon, cabin, wardrobe and luggage. An invulnerable positioned
  player and observer camera are disclosed; this is appearance inspection, not
  encounter-frequency measurement or a recorded player exploration route.
- `populated_cost.json`: in the same paused view with 468 entities, calls increase
  from 63 to 67 and triangles from 836,786 to 946,864. No benchmark implies better
  physical-phone frame time or heat output.

- `public/report.json`: the production preview passes English 1440 px and Chinese
  390 px Guide/start/ability/pause/Home flows and same-address refresh. All seven
  wreck textures return 200 in each language; there are no browser errors or
  failed resources, and the production development hook is absent.
- `artifacts.json`: all **396 build artifacts**, including compression variants,
  total **100,636,956 bytes** and match dist/local/public byte-for-byte. This is
  the entire published artifact inventory, not one user's initial download.
  Fifteen private/source paths return 404 on both origins. Cloudflare readiness
  returns 200, with the existing DEV 35213, preview 23118, awake 23120 and tunnel
  35419 processes retained. Current entry: `index-DOhLcMOP.js` at
  <https://saver-recorded-digit-could.trycloudflare.com/>.
- `source_preservation.json`: 1,277 of the previous 1,289 inputs are unchanged;
  the twelve changed existing files are the declared integration, verification
  and documentation files. No input is missing; previous asset bytes and shared
  gameplay files are preserved. Ten added inputs bring the final inventory to
  1,299 files.
- `delivery/encode.json`: the final 23.83-second H.264/yuv420p game video decodes
  successfully, contains 715 unique frames, and is 4,515,543 bytes. The encoded
  salon/cabin/wardrobe/luggage frames were visually reviewed.

No commit, push or formal release was performed. This new batch remains pending
user visual acceptance; the prior batch's evidence is retained separately.
Desktop 390 px emulation is not a physical-phone test. The existing physical-phone
follow-up remains open, with no claim that added furniture improves its performance.
