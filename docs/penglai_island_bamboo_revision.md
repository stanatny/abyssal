# Penglai floating-island surfaces and HF bamboo — 2026-10-30

Status: uncommitted preview candidate, pending user visual review. The preceding
Azure Dragon steep-target aiming correction is accepted by the user. Existing
attitude, Taotie and aiming edits remain intact; no commit, push or release is
part of this task.

## Diagnosis and implementation

The user screenshot shows the far interior of a floating peach island through
its apparent top. The surface material was already opaque (`opacity: 1`,
`FrontSide`). Its triangle winding was inward: a representative upper normal
had Y = -0.991 and signed volume was negative. Reversing both triangles of each
quad fixes all six islands without changing vertices, shape, color, trees,
waterfalls, mist or the existing 24 island collision proxies. External downward
and upward rays now hit their respective outer top and underside. Double-sided
rendering is not used to conceal the defect.

The old bamboo was five cylinders with flattened sphere leaves per clump.
An original botanical reference was generated with imagegen, inspected and
submitted to [Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2).
The [model release](https://huggingface.co/microsoft/TRELLIS.2-4B) is MIT-licensed.
No third-party artwork or project source was uploaded. The exported asset has
visible culm nodes, branched lanceolate leaf sprays and open canopy space;
textured and neutral views were inspected from three directions.

Raw GLB: 4,708,316 bytes, SHA-256
`980522b60521fe8cb68cf55ca39c6f8a38d79147cba3df4e4c48d8a13fb43e64`,
seed 763001. Offline simplification/rebaking retains 6,900 triangles and 13,384
UV-split vertices. The runtime mesh is 431,049 bytes and the 1024-square color
atlas is 227,704 bytes. Original source, concept, provider receipt and conversion
reports are retained in `.local/penglai_island_bamboo_20261030/`.

Ten existing bamboo clump anchors, including the White Tiger hillside, now use
this shared 20 m asset with small scale and yaw variation. No additional grove,
food, lord, obstacle or population is added. Preparation runs through normal
scene loading. Slow/failed textures retain source-derived vertex colors, and
geometry/material/texture preparation is owned and released by the map.

Fresh included GPU quota was 2,300.774 seconds before generation and 2,272.414
after download; over-quota use remained zero. These are dated measurements,
not a current account balance.

## Evidence and limits

- Matched native Chrome top, underside, side and White Tiger habitat captures
  reproduce the original defect and compare the candidate. These are staged,
  paused camera views in the actual scene.
- A 22-second native game clip moves the inspection camera around the island
  and bamboo while the normal simulation runs. The player is positioned once
  for each segment and temporarily invulnerable. It is an inspection tour,
  not a natural traversal or combat-success test.
- Desktop high/smooth settings and a 390 × 667 desktop viewport were inspected;
  physical phone performance is untested. Final H.264 encoding is inspected.
- Focused tests cover outward occlusion on every island, opaque material,
  bounded decoded bamboo geometry, color fallback and disposal, plus existing
  gardens, landmarks and region contracts: 22 passed.
- A complete scene comparison retains all 4,910 collider records exactly.
  Static submitted geometry increases by 21,600 triangles across all ten clumps;
  scene mesh objects decrease from 580 to 570. These are scene inventory costs,
  not measured mobile frame-rate improvements. Bamboo geometry and material
  each dispose once even after repeated map disposal.

Public-preview and final verification results are appended below after checking
the rebuilt runtime. Historical validation in other reviews is not counted as
new validation for this task.

## Final candidate verification

The full suite passes **2,104 / 2,104**; affected formatting and `git diff --check`
pass. The same restricted preview was rebuilt with entry
`assets/index-CljZajnc.js`; all 954 local runtime files match the build. Eight
selected public artifacts (HTML, entry, Penglai scene, bamboo mesh/atlas and
compressed variants) match byte-for-byte; eleven source/private/directory paths
are rejected. Existing process identities and logs remain intact.

Native Chrome opens the public production build through the normal destination
selector, launches Penglai, pauses and resumes. Both new bamboo resources return
200; there are no captured script errors or failed resource requests and the
production developer hook remains absent. The old task DEV tab is closed; the
public review tab remains available.

Source audit preserves every pre-existing asset and all earlier attitude/aiming
runtime changes byte-for-byte. Delivery consists of matched island and White
Tiger habitat comparisons plus a 21.73-second H.264 inspection clip. Evidence,
including native/public reports, final fingerprints and actual delivery receipts,
is under `.local/penglai_island_bamboo_20261030/`.
