# Odyssey deep-strait scenery — 2026-10-28

The user accepts the previous submerged gates and galley for continuation and
requests the next batch. This candidate adds six fitted crags around the outer
Scylla strait / Charybdis basin and two sea-worn seafarers' memorials along a
side route. It remains uncommitted/unpushed and awaits visual review.

## Identity and sources

[Odyssey XII, A. T. Murray translation](https://www.theoi.com/Text/HomerOdyssey12.html)
describes contrasting cliffs around Scylla and Charybdis and the dangerous
water between them. Those contrasting silhouettes inform this scenery. The
submerged dolphin/trident/anchor memorials, expanded separation and freely
moving bosses are original game adaptations, not a reconstruction of a
historical site. No external illustration is bundled.

Original generated concept images were converted through Microsoft TRELLIS.2
using included Pro allowance. Both actual exported GLBs, receipts, original
images and raw/converted multi-angle inspections are retained in
`.local/odyssey_abyss_20261028/`. Seeds are 755101 (crag) and 755102 (memorial).
The last generation receipt reports 2,208.584394 of 2,400 included seconds
remaining, zero overage; it is a dated receipt, not a live balance.

The first crag simplification revealed thin torn edges. That candidate is
rejected and preserved. A closed voxel-surface reconstruction, light Taubin
smoothing and same-source colour projection remove those tears. The original
HF surface remains the colour source. The two final meshes contain 10,000 and
9,976 triangles; source-derived far versions contain 2,444 and 1,958 triangles.
Each uses a 1024² colour map and source vertex-colour fallback.

Reproduction uses `scripts/repair_odyssey_crag_hf_asset.py` (raw GLB, output
folder; trimesh/numpy/scipy/scikit-image/pillow), followed by
`prepare_odyssey_abyss_hf_asset.mjs` (kind, original GLB, glTF tools, yaw,
output, bake tools, optional repaired geometry JSON),
`build_odyssey_abyss_lod.mjs` and `build_odyssey_abyss_collision.mjs`.
These are offline operations; generated files ship locally.

## Integration and scope

`odyssey_abyss.js` fits each static mesh and its normals to the actual seabed.
Crag horizontal scale is 0.65 of its height scale, giving narrower rock
shoulders. Solid voxel boxes use the same transformed terrain envelope;
closed interiors are filled while outward-facing crevices remain. This is
scenery, with no advertised explorable cave. No new animation loop, particles,
UI wording, audio or combat rule is added.

The pre-existing coast, gates, galley, terrain heights, creature meshes,
animations, populations, boss homes and food routes are preserved. The only
previous runtime source changed by this batch is the Odyssey Ocean integration.
Geometry and prepared materials are owned by each map instance; near/far
switching uses hysteresis. Static ground fitting creates per-placement
geometry, while materials/textures are shared within the map.

## Validation

Final source verification, native runtime reports and delivery receipts are
recorded in the evidence directory. Initial rejected geometry and a fixture
redeclaration error remain separately identified. Validation figures below
refer to the repaired candidate, not the previous batch.

- 19 targeted checks: rendered surface collision, full footprint terrain fit,
  valid normals, adult routes both ways, existing food/guardian access,
  habitat respawn, construction cancellation and local ownership.
- 2,072 full tests pass after the geometry repair and final placement width.
- Native staged encounters: both deep Ceto hunters damage a 30 m player;
  Scylla and Charybdis complete normal windup/attack/recovery. The fixture
  isolates damage sources; it does not establish whole-round balance.
- Native 30 m travel goes both ways along the memorial side route without
  stuck motion. Pause is stable. Two Hawaii/Odyssey cycles each dispose all
  26 audited new resources once and reload eight placements / 324 animals.
  Overall renderer counts include asynchronously prepared unrelated creatures;
  the exact disposal assertion is for these owned resources only.
- Blocking the two new colour URLs leaves source-colour geometry visible;
  the memorial explicitly reports vertex colours / no map during failure,
  then recovers its map after reconnect. No white placeholder is introduced.
- Native desktop Chrome 155 / Apple M6, populated game, 1280 × 800:
  High at DPR 1 and Smooth at DPR 0.8. Five complete six-second samples
  across the three locations have median frame times of 16.6–16.7 ms and
  p95 of 18.6–19.7 ms. The initial Smooth memorial sample contains only
  153 frames and is retained as incomplete; its cause was not established.
  A focused repeat records playing mode throughout, 368 frames in 6.13 s,
  median 16.7 ms / p95 19.4 ms / maximum 21.4 ms, and no gap above 50 ms.
  These short desktop samples are not phone, power or long-session evidence.
- Public native English 1280 px and Chinese 390 px flows pass start,
  movement/boost, quality switch, pause/resume and return to menu. Both new
  colour maps load; no runtime errors or production debug hook appear.
  The narrow layout is desktop emulation, not physical-phone testing.

## Preview and delivery

The restricted preview is updated at
[Odyssey deep scenery](https://saver-recorded-digit-could.trycloudflare.com/?preview=odyssey-abyss-20261028),
entry `index-Dzp_bE1y.js`. All 929 dist/runtime files (291,997,610 bytes)
match locally. Fifteen changed artifacts are freshly fetched and hash-checked
from both local and public origins; the other 914 public artifacts rely on
the preceding dated verification, not a new full-public sweep. Eleven private
or source paths are denied on both origins. Service identities are preserved.

The inspected H.264 delivery is 38.87 seconds, 1280 × 800 / 30 fps, with
labelled observer views followed by normal follow-camera travel. Screenshots,
encoded review sheet and actual send receipts are retained under the local
evidence directory. Technical completion does not imply player visual approval.
All Odyssey changes remain uncommitted/unpushed; official main is unchanged.

The Node-only constructor comparison reconstructs the previous Ocean module
and verifies its hash against the previous delivered fingerprint. Measured
static geometry attribute/index bytes increase from 23,742,932 to 30,477,744
(including new far geometry); collider count increases from 1,191 to 4,531.
These counts exclude renderer allocations and asynchronously loaded scenery.
Two 1k RGBA textures with mipmaps imply about 10.7 MiB of texture storage,
not a measured VRAM value. Desktop measurements cannot establish mobile heat
or frame-rate improvement.
