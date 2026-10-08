# Mythic Creature Anatomy and Motion Revision

Status: uncommitted development candidate on `fix/mythic-model-motion`, based on local checkpoint `60a48ee` (the separately authorized Ocean Guide select-spacing correction). This record describes the current model changes on 2026-10-08. No push or formal publication is part of this revision; released v0.11.1 and its Pages deployment remain the published edition. The integration owner has completed final geometry, Guide/world rendering, motion, lifecycle, unit and desktop frame checks; compiled local/public delivery receipts are recorded in verification.md.

## Defects and implementation

### Sword Sage

The apparently transparent head was an opaque mesh with a geometric crack, rather than an opacity setting. An abrupt jaw-width deformation separated coincident sphere seam vertices: the baseline skull had 30 boundary edges and a maximum seam displacement of 0.01 model units. The replacement uses a continuous jaw transition, welds the closed surface and recomputes normals. Its 1,472 triangles remain unchanged; the resulting skull has no boundary edges, non-manifold edges or degenerate triangles in the focused integrity probe.

The robe surfaces also faced inward because `pgDrape` wound descending rings in the wrong order. Reversing that helper's triangle winding restores the exterior without adding triangles or changing the intentionally open cloth ends. The helper is currently used only by the Sage. Close profile inspection then exposed projecting spherical eye parts. The final eye sockets, flattened eyeballs and brows are recessed and fitted to ray-sampled points on the actual corrected skull; shallow orbital recesses retain the accepted face rather than hiding the defect with a material change.

The old rounded ankle/toe pieces made the feet look unsupported. Two closed, sculpted cloth boots now have continuous insteps, heels and flat sole patches, with modestly staggered legs, soft knee bends and slight toe-out. Both soles rest on the existing riding sword: the geometry probe finds all 145 sampled sole vertices per foot supported by the actual blade, with no overhang and a maximum gap below `1.2e-9` model units. The sword transform, head anchor, normalized bounds, root identity, five independent motions and ward/combat contracts are retained. Shared cached geometry remains immutable between instances.

### White Tiger

The previous limbs assembled separate rounded pieces and rotated them through a time-only gait. The new legs use continuous skinned fur surfaces, connected shoulder/hip attachments, opposite fore-elbow and hind-knee bends, raised hind hocks and fitted four-toe paws. Surface stripes follow the continuous limbs instead of floating as separate joint decorations. The accepted feline head, jaw, whiskers, body markings and tail remain the comparable baseline; the 48 m guardian scale is unchanged.

The encounter now supplies accepted ground displacement and elapsed movement time after terrain and collision resolution. Stance paws counter the actual travel, while swing paws lift and advance; blocked travel freezes gait advance instead of walking in place. Travel speed selects a longer trot, and attack/recovery blends return airborne paws to the support plane. The Guide retains a controlled animation fallback when no world-travel input exists. Reset clears travel state, and final encounter retirement or non-persisted Guide page retirement disposes only each instance's private skeleton textures. Shared geometry/materials and active neighbouring instances remain valid; persisted browser history pages retain their models.

### Coral Mermaid

The previous separate upper torso and tail left the waist rigid while the tail moved. Nereid now uses one continuous thorax-to-peduncle profile and a shared vertical swimming rig. The anterior torso, head and visible mouth remain stable; the traveling wave starts through the waist and grows toward the fluke. Tail ornament and fluke follow the same support positions, rather than being independently animated attachments. The motion bends vertically, preserving the Mermaid's chosen fantasy propulsion instead of introducing lateral snake motion.

The shell bodice is fitted to the actual chest profile and bound to the same skeleton, so its rims remain embedded through bends and turns. Connected neck, arms, wrists, fingers and restrained hair motion share the swimming phase. Effort changes blend smoothly, and a frozen phase does not snap skin when speed input changes. Independent skeletons reuse immutable geometry, and repeated disposal releases private bone textures idempotently. The existing unit dimensions, gameplay root, anatomical head and mouth anchor remain fixed. Naga and Triton retain their existing torso/tail paths.

### Kraken

Curled returning arm tips lie close to earlier arm segments. Assigning skin weights by nearest spatial segment could therefore bind neighbouring surface vertices to distant wrist joints, stretching triangles across the curl during swimming or gripping. Each generated arm ring now records its parametric station along the same axial support curve used by the rig. Suckers carry their own station, and arm skin weights interpolate only adjacent joints along that station.

The optional station path is enabled for Kraken arms; other models retain the existing nearest-segment fallback. The temporary station attribute is removed from the finished skin geometry, and posed contact bounds continue to use the assigned skeleton support. Arm geometry, eight-arm rig size, grip motion, mouth anchor and gameplay root are retained. This corrects the visible deformation without changing grapple duration, damage, reach or encounter rules.

## Construction cost

The following matched read-only probes instantiate `createCreature(kind, 1, 71)` from the immutable `60a48ee` baseline and the current shared candidate. Meshes are post-batching factory mesh objects; triangles are summed from their geometry, materials/geometries are unique resource objects, and bones are unique skeleton joints per instance. These are construction counts, not populated-scene draw calls, GPU timing or phone performance.

| Model         | Meshes, before → candidate | Triangles, before → candidate | Unique geometries, before → candidate | Materials, before → candidate | Bones, before → candidate |
| ------------- | -------------------------- | ----------------------------- | ------------------------------------- | ----------------------------- | ------------------------- |
| Sword Sage    | 54 → 54                    | 80,900 → 80,340               | 24 → 24                               | 13 → 13                       | 0 → 0                     |
| White Tiger   | 43 → 30                    | 52,252 → 48,788               | 36 → 20                               | 8 → 9                         | 0 → 18                    |
| Coral Mermaid | 27 → 27                    | 37,760 → 37,736               | 27 → 27                               | 13 → 13                       | 80 → 84                   |
| Kraken        | 15 → 15                    | 34,396 → 34,396               | 15 → 15                               | 5 → 5                         | 136 → 136                 |

Tiger has four private limb skeletons. Mermaid retains ten skeletons, with four additional joints in the continuous body rig; Kraken retains eight skeletons. The Sage repair reduces 560 triangles, Tiger reduces 3,464, and Mermaid reduces 24. These savings do not by themselves establish a frame-time improvement: the new Tiger skinning and added Mermaid joints still require matched runtime measurements. No new scene lights, external textures, population changes or independent animation loops are introduced.

## Provenance and adaptation

All changed runtime geometry, markings and material arrangements are original procedural Three.js work. No external model, image, texture, audio or generated bitmap is added to the runtime. User screenshots and local before/after captures are feedback or verification evidence, not imported game assets.

The existing [Penglai source ledger](penglai_sources.md) distinguishes feline anatomical references from the original White Tiger's giant guardian scale and identifies Sword Sage as an original fantasy encounter. The [Odyssey brief](odyssey_brief.md) and [humanoid refinement](odyssey_refinement.md) distinguish mythic references from the original Coral Mermaid interpretation. Kraken remains the existing original fantasy lord; this revision repairs rig correspondence rather than making a new zoological reconstruction claim. These reference records do not grant redistribution rights to source imagery, and no such imagery is redistributed here.

No food, ecology, population, survival, objective, damage, reward, ability or combat-eligibility values change. Tiger's displacement input changes visual gait presentation and cleanup, not authoritative navigation or travel speed. Existing biological/game lengths and the shared Guide/world factory remain in use. Changes must meet the [asset quality standard](asset_quality_standard.md) in actual integration before this candidate is accepted.

## Verification and limits

Confirmed during this scoped revision: the five Sage regression tests and four existing Penglai ward tests pass (`9/9`), and the Sage source, the changed `pgDrape` helper file and its new test file pass formatting. The matched factory counts above were freshly measured from baseline and candidate. Early native Sage views identified and prompted the additional recessed-eye correction; those earlier images are not final acceptance of the corrected face.

Focused regression coverage in the current candidate is as follows. This describes the assertions present in the files, without claiming that every integration check below has completed:

- `tests/sage_model_revision.test.js`: closed opaque skull integrity and rays from multiple directions, outward drape winding, fitted eye surfaces, both soles on the actual blade across 65 sampled poses, fixed anchors and shared immutable geometry with independent motion.
- `tests/tiger_model_revision.test.js`: level stance paws and coordinated lifts, opposing limb articulation, finite continuous skin, independent instances/caches, 48 m normalization, conservative posed bounds, private-texture disposal, measured travel/trot, blocked gait, reset and recovery support.
- `tests/mermaid_motion_revision.test.js`: fixed dimensions/head/mouth, actual waist-to-fluke vertex motion, conservative chunk bounds, frozen phase and effort transitions, independent skeletons, idempotent disposal and shell fit through turns/cycles.
- `tests/kraken_skin_revision.test.js`: all eight arms keep neighbouring surface triangles on neighbouring joints, and actual swimming/grip vertex edges remain finite and bounded through the sampled cycle.

Final source passes **985 unit tests**. Rendered Guide evidence covers all four shared models from front, side, back, three-quarter and underside views, eight sampled motion phases, five Sage head angles and Tiger windup/attack/recovery transitions. The final Tiger capture follows the last recovery-support correction. Actual world scenes show all four factory assets in their native maps. Controlled world fixtures find one Sage, one Tiger, sixteen Mermaids and three Atlantis Krakens. These count ordinary entities separately from the region's rare and do not alter stock.

The real encounter update accepts 17.6 m of Tiger travel over 24 × 1/60-second steps, with the callback's accumulated distance matching the measured horizontal movement and terminal speed 44 m/s. Twelve fully blocked steps leave gait phase unchanged. Pause freezes the active clock and posed skeletons; returning home clears travel state. Unit fixtures additionally verify straight supported paws at 44 m/s, no IK stretching, finite conservative posed bounds and smooth four-paw recovery support. Guide resource probes warm to 111 geometries / 25 textures and repeat those counts on the following cycle. Two regional round cycles retain normal populations and finite renderer inventories; they do not establish a long-session GPU leak guarantee. The initial world oracle incorrectly compared a measured interval with lifetime gait distance; the corrected interval subtracts its pre-existing start distance, and the failed diagnostic is preserved.

Serial headed Chrome154 / Apple M6 / Metal samples use local Vite, seed71523, 25 m Orca, 1440×900/DPR1, High and Smooth quality, 120 frames each and the same map positions. There is no simultaneous art browser or test process during the retained samples:

| Fixture and quality | Before FPS / p95 ms | Candidate FPS / p95 ms | Main-loop CPU ms, before → candidate | Draws, before → candidate | Triangles, before → candidate |
| ------------------- | ------------------- | ---------------------- | ------------------------------------ | ------------------------- | ----------------------------- |
| Penglai High        | 60.63 / 18.4        | 60.60 / 18.0           | 2.83 → 3.05                          | 456 → 442                 | 1,667,520 → 1,661,026         |
| Penglai Smooth      | 60.50 / 18.7        | 60.75 / 18.4           | 2.79 → 2.98                          | 280 → 268                 | 1,400,072 → 1,385,288         |
| Odyssey High        | 60.55 / 18.5        | 60.70 / 18.5           | 3.05 → 3.30                          | 710 → 625                 | 982,478 → 930,022             |
| Odyssey Smooth      | 60.55 / 18.8        | 60.65 / 18.3           | 2.84 → 2.94                          | 542 → 516                 | 786,920 → 748,508             |

Penglai uses `[-320,115,-540]`; Odyssey uses `[35,-60,-120]`. Respective actual populations remain 438 and 270, including the rare. Moving/culling wildlife and elapsed initialization differ even with the fixed seed, so populated draw/triangle changes cannot be attributed solely to model construction. CPU changes are mixed and slightly higher here. These short observations establish no severe desktop frame regression in these fixtures; they do not claim general FPS, CPU, GPU, power or physical-phone heat savings. The earlier headless scheduling trial and an overlapping preliminary Odyssey trial are retained as excluded diagnostics.

Production build and native affected local/public delivery checks are completed through the restricted index.html/assets preview; the existing process identities, preceding runtime and Cloudflare URL are preserved. Exact source/build hashes, bilingual Guide, small-screen, pause/home, reload and private-path receipts are summarized in [verification.md](verification.md). Ignored raw evidence lives in `.local/model_polish_20261008/`. Physical-phone performance, heat, touch feel, natural full-round encounters and long-session resource behavior remain unmeasured. Controlled Guide frames and a reachable preview are evidence of this scoped repair, not authorization to commit or push the model candidate.

## Rollback boundary

If this candidate needs rollback, restore only this revision's model, rig, travel-presentation and retirement deltas against `60a48ee`, with its focused tests and this record reviewed together. Preserve the prior Guide select-spacing checkpoint and unrelated work. Restore the retained prior compiled preview through the existing restricted-preview workflow if necessary; do not replace or stop established development/tunnel services as part of an art rollback.
