# Hawaii surface-fleet Hugging Face redraw

Date: 2026-10-20. Status: three new visual candidates for individual review; uncommitted and unpushed. The current AI agent works alone on `art/hawaii-lords-hf-redraw`, after local checkpoint `891e494`. The preceding Contact Mine work is preserved. Formal main/Pages remains v0.11.13.

The user says “可以了，请继续吧” after the remaining-assets inventory. This continues the three surface ships; it does not authorize a new commit or publication. Landmarks and environmental decoration remain a separate queue.

## Visible result and preserved contract

| Ship                              | Design                                                                                                                     | Existing size |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 白潮号游轮 / coastal cruise liner | Navy hull, ivory stepped decks, two ochre funnels, separate-looking lifeboats, recessed windows, timber decks and railings | 64 × 11 m     |
| 双桅远航帆船 / two-mast schooner  | Dark wooden hull, two spars, ivory gaff canvas, aft cabin and fitted continuous rigging                                    | 29 × 6.4 m    |
| 蓝帆探索号 / blue-sail sloop      | Navy hull, ivory cabin/cockpit, cobalt main sail and lighter forward jib, silver mast and continuous stays                 | 21 × 5.1 m    |

These are actual HF-exported meshes, not concept-image billboards. Each is inspected in raw textured/clay views and in matched old/new runtime views. The existing ships have no individual Ocean Guide entries; review uses their real factory plus the actual Hawaii scene, without inventing a new Guide category.

Keep local forward `-Z`, original route/heading/bobbing, visibility range, shared wake shader, dimensions, shallow 1.8 m draft, collider definitions, impact thresholds, 3/3/1 separated-hit durability, drowning/rescue feedback and reset/disposal rules. Atlantis, Bermuda and Mariana use different fleet factories and retain their own ships. No character, creature, human, mine, reward, UI, ecology or combat change belongs to this batch.

## Production and corrections

Original concepts were made with the built-in image-generation tool, one per ship, then uploaded only as those images to [Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2). All three actual GLBs were exported and retained. The model card reports MIT for [TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B); this is model provenance, not a separate ownership guarantee for every possible input. These concepts contain no supplied third-party ship art or brand logos.

Model revision `af44b45f2e35a493886929c6d786e563ec68364d`; Space revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`, checked this session. Seeds 742031/742032/742033, 1024 inference, 100,000-triangle export target and 1024 color texture. The first schooner attempt failed during preprocessing-image download before inference; the second completed. The failed attempt remains archived. No account switching or paid overage was used. Actual quota receipts, rather than elapsed queue/download time, are authoritative; [ZeroGPU's current documentation](https://huggingface.co/docs/hub/spaces-zerogpu#usage-tiers) distinguishes included quota from credit overage.

Offline conversion welds source UV duplicates before reduction, transfers source normals, unwraps a new padded atlas and reprojects source surface color. A degenerate thin triangle in the cruise export was rejected by atlas generation; the ship-specific baker removes only unassigned degenerate triangles, with a strict maximum removal guard. This does not alter earlier vehicle conversion scripts or accepted assets.

The initial generated hulls were deeper than the game's existing boats. A documented offline beam/waterline/deck-height fit preserves the full envelope and applies inverse-transpose normal correction. The schooner's long decorative bowsprit is compressed into the previous overall length while its hull extends toward the original bow. No collision envelope is enlarged to accommodate generation mistakes.

Some generated detached rigging became broken dark fragments. The fit removes isolated high rigging components (338 schooner / 856 sloop triangles), retaining connected hull, mast and sail surfaces. A bounded merged set of continuous ropes joins sampled actual mast/deck vertices. The boat retains the existing rigid bobbing motion; this pass does not claim a cloth simulation.

`hawaii_ship_asset.js` owns shared immutable geometry/material/color per kind, existing recoverable texture preparation, source-derived fallback vertex colors and last-owner cleanup. There is one hull draw per ship and one additional merged rigging draw for each sailboat. No extra render loop or full-screen effect is added.

## Verification and cost

Evidence lives under ignored `hawaii_surface_ships_20261020/`:

- Raw GLB hashes and generation stages: each `*_attempt_*/receipt.json`; private URLs/session receipts stay local. A cruise receipt annotation corrects inherited runner authorization wording without rewriting the original receipt.
- Raw textured/clay views; six matched runtime angles with a neutral material; actual Hawaii sailing recordings. Concepts are not used as proof of runtime geometry.
- `asset_cost.json`: identical routes, transforms and full collider records against the immediate baseline at 100 times over 600 seconds, plus identical separated-impact outcomes. Existing impact tests cover eligibility, real swept blocking, held contact, destruction and reset.
- `lifecycle.json`: forced texture failures preserve colors; explicit retry restores all three maps; two fleet owners share assets; disposing one does not invalidate the other; final candidate renderer geometry/texture counts return to zero.
- `native/report.json`: two Hawaii/Atlantis/Bermuda/Hawaii cycles, all three loaded colors, native sailing, pause and Home. The staged 18 m surface approach follows the existing water transition below the shallow hull without damage/blocking; it is not presented as an input-driven ram hit. Actual hit equivalence is covered separately above.

| Isolated visible ship, wake/impact hidden | Before triangles / calls | Candidate triangles / calls |
| ----------------------------------------- | ------------------------ | --------------------------- |
| Cruise                                    | 18,862 / 12              | 17,841 / 1                  |
| Schooner                                  | 6,154 / 9                | 11,795 / 2                  |
| Sloop                                     | 5,682 / 11               | 9,097 / 2                   |

Total visible body triangles rise from 30,698 to 38,733 while draws fall from 32 to 5. Three 1024 color textures total 1,002,602 compressed bytes and add roughly 16 MiB of mipmapped RGBA GPU allocation per renderer. This is an explicit detail/memory tradeoff, not a blanket FPS or heat improvement. Complete scene counters, current full tests, build and production-resource results are recorded below when finished.

Native Chrome uses desktop hardware; narrow touch layout is emulation, not physical-phone testing. Close-up inferred fine hardware remains subject to the user's visual review. Existing services and logs stay in place; only reviewed `index.html`/`assets` build output may be served publicly. Source, fixtures and debugging hooks stay private.

## Completed technical receipts

- Formatting, 1,441/1,441 full tests and production build pass. Vite retains its existing large-chunk advisory; this pass does not claim to solve startup bundle size.
- The populated 517-entity Hawaii scene, fixed at the same state/camera, changes calls 178→167, 413→395 and 503→476. Corresponding rendered triangles are 941,161→940,140; 2,108,409→2,113,029; 2,308,356→2,316,391. These counts include existing passes and scene objects, not isolated-model counts or measured FPS.
- Fresh final included quota: 1,990.696143/2,400 seconds at 08:36 BJT, versus 2,099.384332 at the start; net use 108.688189 seconds, overquota remains zero. Transient per-job snapshots can include reservations, so the final settled account reading is used.
- All 62 build resources match local restricted origin and the public tunnel byte for byte; 11 source/debug/private-path probes are rejected on each. Existing four process identities and tunnel readiness remain intact. Source audit preserves 987 of991 pre-existing inputs exactly; only three entry documents and `ships.js` differ, with12 new files. The complete prior Contact Mine candidate is unchanged.
- `delivery/surface_ships.mp4` is a 19.5-second H.264 actual-scene observer recording. All three clips are fully decoded and representative encoded frames inspected; still comparisons use identical old/new cameras and lighting. The player is staged/invulnerable for recording; the ships follow their real normal routes.

The current runtime entry is `index-B7VF_XKi.js`. Native production English desktop and Chinese390px touch-emulation menu/Guide/start/ability/pause/Home checks pass, all three new textures load with200 responses, no browser/resource errors occur, the production debug hook is absent, and same-address refresh retains the new entry. Results are in `public/report.json`; individual ship visual acceptance remains pending.

## User acceptance and local checkpoint — 2026-10-20

The user accepts the three delivered ships and requests a local commit before the next batch. All1,003 source fingerprints match the delivery. The earlier candidate labels document their historical state; this checkpoint includes only the ships and their production evidence. The separately uncommitted Contact Mine is preserved. No push or formal release is requested.
