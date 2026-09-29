# Atlantis lighthouse and island support fit

Development candidate; not published. This focused correction addresses the visible gap between the southern island and its lighthouse. The lighthouse remains present with the same seven-meter tower, warm beacon and pulse. The four island ridge vertex positions, deterministic shape sequence, world anchors and playable boundaries are preserved.

## Cause and correction

The original tower used the height and position of a nominal Gaussian peak. The rendered ridge subsequently applied an envelope, jagged height variation and horizontal crest offsets, so that nominal point did not describe the actual island surface. Independent raycasting measured the original tower bottom at **Y=22.212606**, while the island directly beneath it was **Y=17.854849**: a **4.357757-meter air gap**.

The tower now uses the final island triangle mesh to sample its complete supporting footprint. A small masonry pedestal extends 0.65 meters below the lowest sampled terrain point and rises 0.25 meters above the highest one. The seven-meter tower intersects that pedestal by 0.2 meters. The beacon sphere and glow share the resulting tower coordinate reference. This repairs physical geometry; it does not conceal the gap with brightness, a sprite or a camera adjustment.

The island triangles were also wound inward, causing the default front-face material to render the opposite slope. Their winding now faces outward/upward, without moving ridge vertices. Ground attachment is therefore visible from either side of the island.

The six village light points had a similar unsupported fixed-height placement. They are now small window lights on actual dark shore buildings whose foundations are sampled and embedded into the same slope. Village sampling uses a separate deterministic random stream, so it does not change the remaining island silhouettes. The distant islands and structures still share one merged mesh/material; village lights retain their single Points draw.

Moon/star placement is intentionally celestial. The island group remains fixed in world coordinates while the celestial group follows the player. Existing boats already move around the shared water surface and were not changed by this correction.

## Verification

- `node --test tests/atlantis_surface_fit.test.js`: **3/3 passed**. Independent raycasts against the actual merged terrain/structure geometry establish support overlap throughout the lighthouse footprint and every village building. Tests also check tower/pedestal and beacon/tower overlap, finite geometry, outward terrain normals, and fixed island/beacon coordinates across player movement and both quality settings.
- `node scripts/verify_atlantis_surface_fit.mjs`: **2 check groups passed, 336 independent support samples passed, and no browser errors**. Eight running-game images were captured and reviewed at 1440 × 900 and 390 × 667, including front, left/right, close and reduced surface-quality views. The worst sampled foundation gap was **−0.6603 meters** (embedded, not floating). Evidence is in `.local/atlantis_surface_fit/`, including `1440_close.png` and `report.json`.
- The real charged breach was triggered and captured with the normal follow camera. That first image was taken during the upward sky transition and did not clearly show the lighthouse. The script now waits for the airborne camera to level before this capture; that improved framing has not yet been rerun. The seven controlled views do show the entire tower resting on the slope-supported pedestal, without burial or an air gap. Four-island geometry normals passed both the unit and running-scene checks.
- The reduced-quality close view changes the surface/sky quality input only; it is not a full renderer-quality benchmark.

Free-camera close inspection is explicitly separate from normal play: the island is outside the swim boundary, so close inspection cameras are not reachable player locations. No altered lighting or disabled fog is used. Desktop phone-size emulation does not establish physical-phone handling or performance.
