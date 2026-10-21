# Hawaii reef decoration redraw

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

## Production brief — 2026-10-20

The user accepted the four seabed landmarks and requested a local commit followed by the next batch. The accepted checkpoint is `5cea32f`. This batch replaces four decorative reef forms using actual Hugging Face TRELLIS.2 meshes: branching coral, sea fan, brain coral and tube sponge. It remains a candidate for individual visual review. Contact Mine remains a separate unaccepted candidate. No push or release is authorized by this request.

The current AI agent owns generation, integration and review. There is no delegated work or personal Skill change.

- **Identity:** retain the existing warm coral/ochre reef against Hawaii's blue-green water. Use irregular branching silhouettes, open sea-fan gaps, winding brain-coral ridges and hollow sponge mouths. These are artistic reef forms, not a claim that all references are native Hawaiian species. The built-in image tool supplies original isolated input concepts; Hugging Face supplies the actual 3D surfaces.
- **Placement and scale:** reuse the original seeded shallow-reef layout in `ocean.js`: branching colonies within x ±85 m / z −117..126 m, fans within x ±87.5 m / z −75..125 m, and mounds within x ±90 m / z −122..128 m. Keep the original random sequence, colony anchors and later terrain placements. Replace the 880 branch segments with one complete prototype per existing colony; retain 100 fans and split the 150 existing mound locations between 75 brain corals and 75 tube sponges. Fit feet to the same seabed, retain small decorative scales and avoid floating support.
- **Gameplay:** no new food, reward, population, collision, hazard, landmark route, light, sound or update loop. Existing nursery and adult routes, region ecology and bilingual UI stay unchanged.
- **Rendering:** four shared static geometries and 512 px color atlases, spatially clustered instancing, source-derived vertex colors until bounded texture preparation succeeds, reference-counted release. Target roughly 1,000–1,600 triangles per complete prototype; review both silhouette and populated cost before selecting the final budgets. No additional per-instance material or texture.
- **Evidence:** raw HF material/clay views, reduced runtime close/reverse views, matched populated before/after reef views, support and exact collision/RNG comparisons, failed-color recovery and multi-owner release, native Chrome scene changes/pause/Home, check/tests/build and restricted public resource hashes. Desktop touch emulation is not physical-phone testing. Preserve historical captures and label staged observer cameras.

## References and provenance

- [NOAA coral growth forms](https://oceanservice.noaa.gov/education/tutorial_corals/coral03_growth.html): branching, foliose and massive form distinctions.
- [NOAA AOML coral morphology](https://www.aoml.noaa.gov/digital-coral-morphology/): varied branching and mounding silhouettes.
- [NOAA Florida Keys sea fan](https://sanctuaries.noaa.gov/pgallery/pgflorida/living/living_11.html): open branching soft-coral structure and hard-substrate attachment. This Florida reference is structural, not evidence of Hawaiian occurrence.

Original concepts, model receipts, source GLBs, conversion reports, quota checks and validation evidence are retained in `.local/hawaii_reef_life_20261020/`. Initial quota at 2026-10-20 10:30 BJT: 1,810.399814 / 2,400 included seconds, zero overquota usage; returned reset 22:41:49 BJT. Later generation must use its own fresh quota receipts.

## Integrated candidate and review — 2026-10-20

All four actual HF candidates are integrated. The original low triangle targets above were rejected after viewing broken fine branches and collapsed ridges. The selected runtime assets use detailed geometry only close to the observer, with a separate reduced mesh at distance. They remain uncommitted for user review; the separate Contact Mine candidate is preserved.

| Form            | Successful HF attempt / seed | Near / far triangles | Color atlas           |
| --------------- | ---------------------------- | -------------------- | --------------------- |
| Branching coral | 02 / 743041                  | 7,992 / 984          | 512 px; 106,434 bytes |
| Sea fan         | 01 / 743042                  | 7,998 / 850          | 512 px; 114,412 bytes |
| Brain coral     | 01 / 743043                  | 7,976 / 498          | 512 px; 104,482 bytes |
| Tube sponge     | 02 / 743145                  | 5,000 / 600          | 512 px; 84,372 bytes  |

Generation uses `microsoft/TRELLIS.2`, model revision `af44b45f2e35a493886929c6d786e563ec68364d`, Space revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; both inspected metadata records identify MIT licensing. Source GLBs, receipts and SHA-256 hashes are retained privately alongside the conversion evidence. The first branch attempt completed inference but lost its export session after a quota-request TLS failure; a fresh authorized attempt succeeded. The first sponge had unwanted rear holes and was rejected. Both original attempts remain archived.

The conversion welds matching positions before simplification, rebuilds normals, creates a padded 512 px UV atlas and transfers the original HF albedo. It keeps source-derived vertex colors for loading failure and distant rendering. Uniform normalization preserves each prototype's proportions before applying existing placement scales. No painted approximation is substituted for the actual HF surfaces. At 2026-10-20 11:06:57 BJT, the final quota receipt reported **1,439.343319 / 2,400 included seconds**, zero overquota usage, and reset at 22:41:50 BJT. This is a dated receipt, not a permanent live balance; no extra paid generation was used.

### Placement, rendering and lifecycle

- The old random sequence is consumed exactly. GPU-float32 anchor checks retain 107 branching colonies, 100 fans and all 150 mound locations, now split evenly between brain coral and tube sponge. The 646 colliders, 401 obstacle markers and 194 non-reef meshes remain identical in the captured world contract. Colony feet sample their actual transformed lower surface and sit 0.04–0.25 m into the seabed. This proves support, not that every old anchor is unobscured by nearby rocks.
- Four 90 m spatially clustered instance groups use 26/30 m LOD hysteresis. Each colony occurs in exactly one LOD; distances update every 0.4 seconds through the existing ocean update, with a backward-clock/restart guard and reused matrix buffers. There are no new lights, physics bodies, ecology actors or animation loops.
- Four shared 512 px color textures cost approximately 5.33 MiB as RGBA8 plus mipmaps. Two geometry/material variants per form are reference counted. Deliberate HTTP 503 failures retain source vertex colors; explicit retries recover all four atlases. Two simultaneous owners share resources. Releasing the first disposes nothing; the last disposes eight geometries, eight materials and four textures once, returning the isolated renderer to zero geometries/textures.
- A captured distant-branch defect produced black bloom tiles because opposing thin faces could cancel the simplified normal to zero. The offline LOD builder now substitutes a valid original normal for those vertices. A regression checks every referenced near/far normal. Final verified captures and the encoded video show no repeated black-frame intervals; the full video also decodes successfully. Earlier faulty captures remain separate and are not delivery evidence.

### Fresh verification and measured cost

`npm run check`, **1,450 / 1,450 tests**, and the production build pass. Five new tests cover normal construction initiating all four textures without a debug prepare call, original anchors/collisions, single-instance LOD and clock restart, valid attributes/normals and budgets, and shared-resource release. The actual populated Chrome scene passes four staged observer shots, real-time footage, Atlantis → Hawaii → Bermuda → Hawaii transitions, pause and Home, with no observed page errors. These are observer-camera art captures of the running game, not a player-controlled route recording.

On the verified M6 mini / 32 GiB, Chrome 155, 1440×900 and DPR 1, High and Smooth each used four alternating before/after blocks, a 1.5-second warmup and 3.5-second sample per block. Both stayed near the 60 Hz display cap. High median frame intervals were 16.6–16.7 ms, with p95 18.1–18.4 ms; Smooth median 16.7 ms, p95 18.1–18.5 ms. Median CPU render submission was 2.0 ms on High and 1.8–1.9 ms on Smooth. Live ecology continued, so these are short populated observations rather than identical deterministic GPU benchmarks.

The added detail has a real cost: High median draws increase from approximately 383–384 to 396–400, and triangles across passes from 1.95–1.97 M to 2.21–2.24 M. Smooth draws rise from 298–301 to 322–326, triangles from 1.62–1.63 M to 1.94–1.96 M. All-far reef geometry is 272,638 triangles versus the old 187,560; the tested near mixture is 382,740. These data do not establish physical-phone performance, GPU execution time or sustained thermal behavior. Distant thin branches intentionally have a coarser silhouette.

The first production-only audit caught a missing automatic preparation call: all four colors loaded in the staged visual fixture but were never requested by ordinary entry. Construction now starts all four through the existing bounded queue. The added regression observes normal construction without calling prepare itself; the rejected production audit is retained as `public_missing_autoload.json`. The visual assets and final recorded appearance are unchanged.

The restricted preview is rebuilt without replacing its services. HTTP verification finds **70 / 70 runtime files, 42,597,010 bytes**, byte-identical across `dist`, local preview and Cloudflare; eleven private/source paths per origin remain denied. One transient TLS connection timeout recovered through the bounded retry. The new entry is `index-C_u_SKiL.js`. Fresh production native flows pass in English at 1440 px and Chinese at 390 px: Guide, start, skill input, pause, Home and same-address reload. All four reef colors return HTTP 200 through ordinary entry, without any debug material preparation; no page errors, failed runtime requests or production hooks are observed. Narrow desktop Chrome is touch emulation, not a physical phone. Results are recorded under `public/report.json`.

### Evidence and status

All evidence is in ignored `.local/hawaii_reef_life_20261020/`: `contract.json`, `asset_cost.json`, `quota_final.json`, `lifecycle.json`, `native_verified/report.json`, matched `*_before.png` / `*_after.png`, `delivery/reef_decorations.mp4`, `artifacts.json`, check/test/build logs and source-preservation fingerprints. The final visual directory is **`native_verified`**; `native`, `native_final` and `native_delivery` retain rejected footage and camera iterations.

Prior accepted landmarks are committed as `5cea32f`. These four reef candidates await individual user review and are not committed or pushed. Formal main/Pages remains v0.11.13. Preserve the separate Contact Mine candidate, accepted assets, services and historical worktrees.
