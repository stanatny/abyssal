# Hawaii seabed landmark Hugging Face redraw

Date: 2026-10-20. Candidate completed, awaiting user visual acceptance. The user requests a local commit of the delivered surface ships and the next batch. Ship checkpoint96bcac6 is complete; the separate Contact Mine candidate is preserved. The current AI agent alone redraws Wreck Remains, Whale Fall, Sunken Step Temple and Abyss Rift Gate using actual TRELLIS.2 exports. No new gameplay, push or main release is requested.

## Scope and reference

Use the accepted submarine and surface-fleet material/detail standard, and the immediate four-landmark baseline for position, route, collision and visibility. Retain the temple approach columns and buried support foundations, gate opening and glow, environment wildlife and smoke. Do not move the landmarks or obstruct the existing large gate passage. Input concepts are original generated images; no third-party images are uploaded.

The whale-fall concept uses a resting baleen-whale skeleton with elongated mandibles, open rib cage and articulated spine. [MBARI whale-fall observations](https://www.mbari.org/news/whale-falls-islands-of-abundance-and-diversity-in-the-deep-sea/) support the seabed skeleton and colonized-bone context; exact pose, completeness and giant scale remain a game adaptation, not a scientific scan. Architecture is fictional, without a claim to reproduce a real historical site.

## Production and evidence

Concept generation uses the built-in image tool, followed by [Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2) actual mesh generation and GLB export. Only the intended four images are uploaded. Model revisionaf44b45f2e35a493886929c6d786e563ec68364d, Space revisionebf60b20fc5a4607f90a1c11c0aab0ceeda5429d; model metadata reports MIT. [Current ZeroGPU rules](https://huggingface.co/docs/hub/en/spaces-zerogpu) and a fresh account reading govern included quota. Start1,990.696143/2,400 seconds, overquota0; no paid overage authorized. Private receipts and source files remain under ignored hawaii_landmarks_20261020.

The first wreck request lost the connection during generation. Recovery attempted export from the existing session but found no usable generated state; the original failed receipts remain. The second request uses the same authorized input with connection retries, without changing identity or buying capacity.

The dated checks below establish the delivered candidate; concept images and successful export alone were not treated as completion.

## Candidate completed, awaiting user review

All four actual GLBs were downloaded, parsed, inspected with neutral and original materials, reduced and rebaked. The whale ribs and mandibles are real geometry, not painted silhouettes. Original source hashes and the exact orientation/fit parameters are stored in each runtime JSON. Conversion uses `prepare_hawaii_landmark_hf_asset.mjs`, `rebake_hawaii_landmark_hf_asset.mjs` and `fit_hawaii_landmark_hf_asset.mjs`. The architecture fit expands the generated gate opening to the existing passage and maps temple steps to the old envelope; inverse-transpose normals are recomputed for each piecewise scale.

| Asset              | HF triangles | UV vertices | Final landmark triangles / draws | Color WebP bytes |
| ------------------ | -----------: | ----------: | -------------------------------: | ---------------: |
| Wreck Remains      |       17,608 |      23,788 |                       18,008 / 3 |          317,352 |
| Whale Fall         |       17,776 |      21,827 |                       17,776 / 1 |          354,176 |
| Sunken Step Temple |       15,676 |      19,705 |                       16,088 / 3 |          371,278 |
| Abyss Rift Gate    |       15,983 |      18,095 |                       16,395 / 3 |          277,438 |

The final count includes retained collision-bearing wreck beams/wheel, terrain-fitted approach columns, buried foundations and the existing gate ring. Total landmark geometry rises from 12,720 to 68,267 triangles; draws change from 11 to 10. Four 1024-square textures add about 21.3 MiB of uncompressed RGBA GPU storage with full mip chains, an estimate rather than a device-memory measurement. The complete compiled runtime grows from 36,644,567 to 40,843,053 bytes (62 to 66 resources). This is an art-detail cost, not a claimed performance improvement. No new animation loop, physical light, gameplay hazard or reward is added.

HF meshes are attached after the old static batching because that batching removes UVs. Shared geometry/materials and the existing bounded material queue retain source vertex colors on failed downloads; the last owner releases textures, bitmaps, geometry and materials. The original construction still establishes collision data, then unused private render resources are released immediately. A later optimization could replace that construction with frozen collision recipes, but is not part of this redraw.

## Fresh verification

- `npm run check`, 1,445/1,445 tests and production build pass. The first new UV test incorrectly read raw normalized Uint16 storage as floats; it was corrected to use attribute accessors. Formatting was then applied to the four packed JSON files. These were test/format issues, not hidden rendering passes.
- Full numeric comparison against the immediately preceding factory gives identical 135 colliders, 59 obstacle markers and all four landmark positions on both flat and real seabed fixtures. Tests cover the same boundary snapshot and UV survival after batching.
- Mesh rays and continuous collision tests pass through the gate in both directions for 3/10/25/30/32m bodies. Native Chrome additionally crosses the gate plane in both directions with a 30m player and real Space-key movement, without a stuck state. This does not claim every decorative crevice is an enterable room.
- Eight native region selections over two Hawaii/Atlantis/Bermuda/Hawaii cycles load the four textures only into Hawaii landmarks. Pausing freezes simulation time; return to Home works. Original source inputs outside `ocean_extra.js` remain unchanged before documentation updates, including all creatures, players, ships, submarine, mine and gameplay files.
- Four forced-503 textures retain colored geometry; explicit retries recover all four. Two owners share each asset, first release disposes nothing, final release disposes each geometry/material/texture once and returns the isolated renderer to zero geometries/textures.
- Native public English desktop and Chinese 390px touch-emulation cases pass Guide/start/ability/pause/Home and same-address reload, with no browser errors, failed resources or production debug hook. The Guide check is a regression check on the existing Contact Mine entry: these four landmarks do not have individual Guide entries.
- All 66 resources match dist, restricted loopback service and Cloudflare byte for byte; 11 private/source paths per origin are denied. Existing process identities and tunnel readiness are unchanged. The old runtime is archived by the preview manager.

Evidence is under ignored `.local/hawaii_landmarks_20261020/`: raw source/receipts, converted/fitted assets, six-angle matched `review/`, `contract.json`, `native/report.json`, `native_temple/report.json`, `lifecycle.json`, public report, artifact hashes and final fingerprints. The first temple observer camera was below the sloping terrain and is retained as rejected capture evidence. A corrected camera and then close observer footage use the real ocean; final close views allow the game's depth lighting to settle, without overriding lights, fog or colors. Studio comparisons separately show geometry and albedo clearly. Footage uses a staged observer and invulnerability, not an ordinary uninterrupted player run.

Fresh HF quota at 2026-10-20 09:20:30 BJT: 1,810.399814/2,400 seconds remaining, overquota 0; returned reset 22:41:50 BJT. This is a dated reading, not a live balance. No paid overage was enabled. Public preview is a host-side Cloudflare revisit; physical-phone performance, external user-network access and subjective acceptance remain unverified. The four new candidates and preserved Contact Mine remain uncommitted/unpushed; formal main/Pages stays v0.11.13 / 110494c.

## User acceptance and local checkpoint — 2026-10-20

The user says “提交吧，下一批”, accepting these four delivered landmarks and requesting a local commit before the next batch. All1,017 source fingerprints still match the delivery; the recorded checks above retain their original scope rather than being reported as new runs. The separate Contact Mine candidate remains preserved and unstaged. No push or main publication is authorized. Earlier candidate/pending statements describe the pre-acceptance stage.
