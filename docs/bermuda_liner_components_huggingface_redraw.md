# Bermuda explorable liner — HF component pass, 2026-10-23

## Status and scope

The user accepts the offshore rig and asks to commit and continue. The accepted
rig is locally committed as `0ffd683`, after matching all 1,278 delivered input
hashes. No push/main publication was requested. The current agent worked alone.
This new liner batch is **uncommitted and pending the user's visual review**.

Three actual generated assets replace four funnels, twenty upper promenade
window panels and four marine steam boilers. Corroded seams, projecting bands,
window arches and boiler fire doors are mesh detail, with source-color textures.
The fictional 600 m × 135 m hull, site, 410 ordered colliders, all four routes,
11 rooms, 204 fixtures and eight existing light sources remain unchanged.
The pre-existing boiler plumbing has a short visual connector seated into the
new shell. Original hatch collision and boiler footprint are retained. Window
panels sit outside existing opaque upper walls; they are not new passageways.

The hull, decks and remaining furnishings have not all been redrawn in this
pass. The Flying Dutchman-inspired ghost ship, waterspouts and remaining scenery
are still separate future batches. Shared creatures, players, lords, the accepted
rig, moving fleet, ecology, rewards and combat rules are unchanged.

## References and generation

Sources read and pictured references privately inspected on 2026-10-23:

- [WHOI: Titanic in a New Light](https://www.whoi.edu/ocean-learning-hub/multimedia/titanic-in-a-new-light/)
  provides wreck corrosion, bow structure and exposed boiler references.
- [NOAA Ocean Today: Titanic Wreck Site](https://oceantoday.noaa.gov/titanicwrecksite/)
  describes the wreck and its detached funnels.

The enlarged explorable ship and four surviving funnels are a fictional game
adaptation, **not a reconstruction of the present Titanic wreck**. Reference
photographs were used only for private analysis, not uploaded or redistributed.
Original concept images were generated with the built-in image tool and passed
to actual HF image-to-mesh generation. Concepts are not runtime evidence.

Service: `microsoft/TRELLIS.2`, Space revision
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`, model `microsoft/TRELLIS.2-4B`, revision
`af44b45f2e35a493886929c6d786e563ec68364d` (MIT). Each export used 1024 generation,
100,000-triangle target and 1024 texture. Raw GLBs and successful/failed receipts
remain under ignored `.local/bermuda_batch5_20261023/`.

| Asset  |   Seed | Successful attempt | GLB bytes | SHA-256                                                            |
| ------ | -----: | -----------------: | --------: | ------------------------------------------------------------------ |
| Funnel | 743325 |                 01 | 4,211,800 | `14c64c2f6e53d3cf84de61fb8574f40d681906d2227efd91da5b8b0f33ee15e5` |
| Window | 743326 |                 02 | 4,084,272 | `df16d3d19668503bffc9ebb3170ce3c03610f71cd671ceb5010cd74646c81db2` |
| Boiler | 743327 |                 01 | 4,717,428 | `26af6c978ffcaf126ae9e2a5ccbe3143fa3a1e27191196311fe8dbbb1e0da03c` |

The first window inference was canceled; its receipt remains intact and the
second request succeeded. Included-quota readings were 1,885.983216 seconds
before the batch and 1,679.946325 at **2026-10-23 20:58:45 BJT**, out of 2,400;
over-quota usage remained zero. The service reported reset at **2026-10-24
17:55:02 BJT**. The 206.036891-second difference includes the failed attempt;
overlapping job snapshots are not summed. These are dated measurements.

`scripts/prepare_bermuda_wreck_hf_asset.mjs` welds source UV seams, simplifies
with a bounded error, projects source normals and colors to new UVs, and packs
source vertex colors for network-failure fallback. Boiler orientation was
inspected in the actual raw mesh: its +X fire doors rotate to the game's +Z
boiler face. The window's +Z face points outward on both ship sides.

Raw front/back/side/top/underneath material and neutral views were inspected.
A stronger 1,399-triangle window reduction failed the existing source-projection
guard and was rejected; no shared baker guard was weakened. Final triangles per
unique asset are 4,510 / 4,501 / 10,028. Generated imperfections remain visible
in the weathered shapes; this is stylized ruined machinery, not precision CAD.

## Ownership and cost

`bermuda_wreck_asset.js` reference-counts three shared source geometries,
materials and texture loaders. `bermuda_wreck_skins.js` fits those sources into
existing component envelopes and merges repeats by material. Construction
starts loading in the ordinary region path. Failed texture requests leave
source vertex colors; online retry restores maps. Each wreck owns its merged
geometry; the last owner releases shared source geometry, material, texture
and bitmap. No new animation, render loop, light or per-frame allocation is added.

| Whole liner                           |    Before | Candidate |
| ------------------------------------- | --------: | --------: |
| Mesh draws                            |        10 |        13 |
| Triangles                             |    54,464 |   196,268 |
| Merged geometry attribute/index bytes | 2,566,464 | 8,409,864 |

The three unique source geometries add 731,084 CPU attribute/index bytes.
There are three 1024² color maps, totaling 821,148 compressed bytes. Packed mesh
JSON totals 846,414 bytes. The measured paused populated view (468 entities)
changes from 60 to 63 draws and from 694,982 to 836,786 triangles. This is an
explicit geometry/detail increase, not proof of better FPS or physical-phone
performance. Desktop 390 px emulation does not resolve the original phone issue.

## Verification and evidence

Evidence root: `.local/bermuda_batch5_20261023/`.

- `contract_and_cost.json`: exact original/current equality of ordered colliders,
  routes, rooms, fixtures, light sources and landmarks, plus measured geometry.
- `review/`: matched old/current whole ship, funnels, promenade, engine gallery,
  breach and atrium, each with color and neutral rendering.
- `native/report.json`: three failed texture loads retain source color, then
  online recovery succeeds; three Hawaii/Bermuda cycles each dispose exactly
  three shared geometries/materials/textures. No browser errors.
- All four routes pass original full-body 32 m bidirectional sweeps, fast
  segments and 136 corner-turn samples. The live browser additionally uses
  ordinary movement and native Space input to cross the starboard breach both
  ways at 32 m. Position/facing are staged once at each journey start, not
  overwritten while traversing. Terrain and collision rules stay active.
- `native/wreck_world.webm`: actual populated scene with original lighting/fog,
  four observer-camera views and an invulnerable positioned player. It is a
  visual inspection, not a natural encounter frequency measurement. Pause/Home
  and a Chinese 390 px desktop view also pass.
- `tests_final.log`: 1,616/1,616 tests pass in the final complete run; earlier budget failures are retained
  in `tests.log`. Wreck-only budgets now reflect the three new material buckets
  and a 200,000-triangle ceiling; collision and gameplay assertions are retained.
- `delivery/`: encoded game video, sampled encoded frames and full frame-decode
  verification. Only game footage is delivered, not third-party reference clips.

## Restricted preview and final status

Formatting and build pass. The existing preview manager rebuilt the same origin
in place, preserving DEV 35213, preview 23118, awake 23120 and tunnel 35419.
Previous runtimes remain archived; current entry is `index-BtnMdVOB.js`.
`artifacts.json` checks all **384 files / 98,188,401 bytes**, including compressed
variants, byte-for-byte against dist, the restricted local server and the public
Cloudflare address. All 15 private/source/directory probes per origin are denied;
the tunnel ready endpoint succeeds.

`public/report.json` verifies English 1440 px and Chinese 390 px native region,
Guide, launch/ability, pause/Home and same-address refresh. Each language session
receives all three new textures with HTTP 200; browser/resource errors are empty
and `window.__ABYSSAL__` is absent. These public native flows are separate from
the local observer-camera landmark inspection. Neither is a physical-phone test.

The encoded H.264/yuv420p video fully decodes to 700 unique frames / 23.33 seconds.
`source_preservation.json` confirms 1,270 of 1,278 baseline inputs are unchanged;
the eight existing modifications are four status documents, two wreck factories
and two wreck budget/ownership tests. Eleven new files hold isolated assets,
runtime helpers, conversion, a targeted regression and this review. Final
fingerprints cover 1,289 inputs. No other creature, fleet or gameplay file changes.

Preview: <https://saver-recorded-digit-could.trycloudflare.com/>.
Formal main/Pages remains v0.11.16; the accepted rig checkpoint is `0ffd683`.
This liner candidate remains **uncommitted/unpushed and pending visual acceptance**.
