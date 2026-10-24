# Mariana guardian-layer geology — 2026-10-24

The user accepts the preceding small-fossil batch, asks for the next HF batch,
and clarifies that the descending, multilayer pit needs distinct landforms tied
to its guardians. The current agent works independently on
`art/mariana-hf-redraw`. No commit, push or formal publication is requested.
This document records a separate candidate; it does not replace earlier reviews.

## Direction and evidence

The first target is the four existing side bays, rather than rebuilding accepted
creatures or filling the mandatory descent with obstacles. Hydra's branching
mineral chimneys, Kraken's broad curled grotto, Gran Maja's fossil rib ridge and
Leviathan's pressure-folded buttresses establish different silhouettes and
surface identities. The lowest warm approach and refuge keep their separate
appearance. Broader pit walls, suspended platforms and refuge architecture remain
possible later batches, not claims of completion here.

[NOAA's monument account](https://www.fisheries.noaa.gov/pacific-islands/habitat-conservation/mariana-trench-marine-national-monument)
describes the region's mud volcanoes and thermal vents.
[ODP Site 1200](https://www.iodp.tamu.edu/publications/195_IR/chap_01/c1_2.htm)
describes the faulted forearc, serpentinite mud and rock carried through faults.
These are dated geological references, not a claim that every feature occurs at
every trench depth. The four guardian habitats are deliberately fictional
adaptations; the coiled grotto and giant ribs are visual associations with the
existing fantasy guardians.

Original image-tool concepts are inputs to Microsoft TRELLIS.2-4B, not photographs
or game screenshots. The actual Space and model were checked live: Space revision
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d` was running; model revision
`af44b45f2e35a493886929c6d786e563ec68364d` declares MIT. Generation uses 512 resolution,
12-step stages and 100k-face GLB export. Generation and export have separate
included-quota checks; no paid excess or provider change is authorized.

At **18:53 BJT**, included allowance was **2339.595102 / 2400 seconds**, zero excess,
with reset returned for **2026-10-25 17:58:07 BJT**. This is a dated receipt, not a
permanent balance. The first Leviathan generation was canceled by the service;
its failed receipt is preserved before an ordinary same-input retry.

## Implementation scope

Four real generated meshes replace the old tubular guardian sculptures. Each is
simplified, receives a fresh UV atlas projected from its own source, and retains
sampled vertex colors when color loading fails. Uniform placement scaling keeps
its proportions. Large rear rock bays extend the previous apron rear sectors;
mandatory approaches and the adult turning circle remain explicit constraints.
The fifth apron, gate rules, populations, accepted creatures, warm refuge and
other regions are outside this change.

Runtime objects stay under the existing regional depth-culling groups. Shared
prototype/material ownership uses reference counts and the existing material
queue with ordinary online recovery. Source-surface contact boxes are baked
offline; entry does not scan every triangle. There are no additional point
lights or independent animation loops. Final geometry, routes, costs and native
verification are recorded below after inspection.

Evidence is retained under `.local/mariana_layer_geology_20261024/`, including the
unchanged 1,412-input starting fingerprint set, concepts, actual GLBs, failed and
successful receipts, conversion reports and before-scene snapshots.

## Final geometry and verification

The four final prototypes use 9,368 / 9,987 / 9,933 / 9,298 triangles
(Hydra / Kraken / Gran Maja / Leviathan). All five landmark bays together now use
16 meshes and 169,258 triangles, compared with 18 and 159,544 before this batch.
The existing 170k total and 105k simultaneously depth-visible landmark budgets
still pass. New runtime asset files total 2,636,555 bytes before bundle compression.
Four 1024² color textures add approximately 21.3 MiB of RGBA8 mipmapped GPU storage;
this is a cost estimate, not a measured device-memory reading.

Surface cells are baked at normalized size 0.1 and merged only through occupied
cells. The four rocks have 137 / 187 / 120 / 169 fitted boxes (613 total), and the
whole five-bay set has 810 contacts versus 289 before. This deliberately replaces
a small capsule budget with irregular surface coverage. Cells are at most 5.5 m
wide before merging; cavern gaps and the adult route are checked against the
actual resulting boxes. No per-frame triangle fitting runs in the game.

All **82 Mariana tests** pass, including the 13 focused geology/preparation tests.
They inspect actual transformed base vertices against final floor triangles,
check every core surface against solids, reserve guardians/prey and gates, and
sweep 32 m bodies forward/back along the descent, side-bay approaches and turning
rings. Kraken remains below the actual preceding terrace underside. The frozen
baseline comparison excludes only the four intentionally replaced bays; all
remaining cliff/maze/refuge/fifth-bay geometry and collision checks stay active.

Native headed Chrome verifies normal loading, three Mariana → Europa cycles,
pause/Home and texture failure/ordinary online recovery. Each cycle releases all
16 new owned objects exactly once (four source geometries, four world geometries,
four materials and four textures). Four matched before/after game views and a
20-second encoded observation-camera tour inspect the actual populated scene;
separate ordinary follow-camera movement travels 40 m. These controlled scenery
shots do not claim the frozen NPCs in the tour are live combat footage.

A six-round alternating Node microbenchmark records median region construction
at 783 → 866 ms and static-grid construction at 50.3 → 50.8 ms. Identical unobstructed
32 m turning-ring collision steps remain about 0.0046 ms each; this does not
measure contact-heavy combat or mobile frames. Matched populated observation
renders show 0–12 additional full-render calls and about 2k–31k additional
triangles depending on the layer and render passes. These are added scenery
costs, not a claim of a performance improvement or a physical-phone test.

Evidence: `mariana_tests.log`, `setup.json`, `native/report.json`,
`asset_review/report.json`, `review/report.json`, `movie/report.json`, `cost.json`
and the original GLB/conversion receipts in the local evidence directory.

At **19:22 BJT**, the final read-only included-quota query returns
**2218.860434 / 2400 seconds**, zero overage, with reset at
**2026-10-25 17:58:06 BJT**. No additional generation is pending.

## Preview delivery

The existing restricted preview is rebuilt at the same address. Entry
`index-Ca6jB27v.js` and all **468 artifacts / 117,585,167 bytes** match the local
build byte for byte at both loopback and public origins. The production page
passes four English-desktop / Chinese-390px native Guide, start, ability,
pause and Home flows, plus same-address refresh; all four new color textures
return 200 and the production debug hook is absent. Private/source paths remain
rejected. A 390px desktop touch session is not a physical-phone test.

Existing service identities remain unchanged, and the manager archives the prior
runtime before replacing the HTML. Logs, raw and final assets, failed attempts,
old comparison scene and all pre-existing candidates remain preserved. Across
1,412 previous inputs, only six allowed documentation/landmark/test files change;
the other 1,406 retain their exact hashes. The four new appearances await the
user's review. Formal main/Pages remains v0.11.17; no commit or push was performed.

## User acceptance — 2026-10-24

The user says “可以，下一批吧”, accepting these four guardian rock bays and
authorizing the next batch. Prior pending labels above are historical for this
appearance. No commit/push is requested. Connecting wall and suspended-rock
surfaces are recorded separately in [the next review](mariana_rock_surfaces_huggingface_redraw.md).
