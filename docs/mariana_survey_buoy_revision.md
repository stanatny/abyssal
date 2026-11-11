# Mariana survey buoy redraw — 2026-11-11

## Scope and accepted checkpoint

The accepted lord attack feedback and compact combat HUD are locally committed
as `501f8bc`. No push, version bump or main/Pages release is requested. This new
survey-buoy candidate stays uncommitted for player review.

The player's screenshot identifies the three primitive instrument buoys in
`createMarianaFleet`, rather than the separate Atlantis island beacon. Replace
those buoy appearances with one generated oceanographic instrument asset while
preserving the existing world and contact contracts. It is an original fictional
research device, not a replica of a particular deployed instrument.

## Source and generation

An original image-generation reference reinterprets the screenshot's orange
float and supported mast as an orange/rubber float, fitted white instrument
housing, connected steel tower, mounted photovoltaic panels, a caged amber
lantern and antenna. The screenshot remains a local functional reference; the
new original reference alone is uploaded for reconstruction. Hidden-side details
are inferred by the single-image model; the coherent radial rear equipment is
retained rather than described as a measured reconstruction.

One [Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2)
generation and GLB export uses seed 761113 and resolution 1024. The actual source
is a 4,266,100-byte GLB with 99,400 triangles. Its SHA-256 is
`ac7a4d323262d078225d7c7a0f6adad62943de1dc3291e58e707d76577e367a7`.
The [model card](https://huggingface.co/microsoft/TRELLIS.2-4B) records the MIT
model license; the verified model revision is
`af44b45f2e35a493886929c6d786e563ec68364d` and Space revision is
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`.

Fresh quota checks surround generation and export. Included ZeroGPU usage is
43.966146 seconds; over-quota usage remains zero. No paid credits, subscription
change, additional identity or repeated generation is used. Safe receipts,
original reference, raw GLB and intermediate models remain in the ignored
`mariana_beacon_20261111` task folder; private session/cache URLs are not part of
repository documentation or delivery.

## Fitting and retained behavior

Uniform offline fitting places the float/rubber band around local waterline
Y=0, with a maximum horizontal diameter of 4 m and the antenna top at Y=5.8 m.
The underwater keel is additional. Fitting preserves topology, UVs and normals
and composes the raw-to-world normalization for reproducibility. The mooring
continues from the original local `[0,-0.6,0]` to `[0,-7,0]` and passes inside the
keel before emerging below it.

All three original homes remain: `[-130,-65]`, `[132,-245]` and `[-105,-430]`.
Each original root owns the same bob and roll, and each sphere collider retains
its original ID, order and radius 2. Collider height still follows the actual
root. Ships, terrain, ecology, objectives, rewards and feeding remain unchanged.
The Guide's existing survey-environment description and obstacle rules remain
accurate; no new creature, reward, destructible target or interaction is added.

One fleet owns a reference to the shared buoy geometry, material and source-color
texture. Its three meshes retain independent root poses. Existing material
preparation deduplicates loading and retains sampled source vertex colors after
texture failure; existing reference-counted disposal releases only the last
owner. There is no new light, flashing effect or animation loop.

## Production review and evidence

Original source color and neutral geometry are inspected from front, side, rear
and top before runtime fitting. An 8k candidate is rejected for large instrument
folds and transferred-normal artifacts. A direct-original-UV experiment is also
rejected because simplification across the source's small islands produces color
bleed. Their local outputs are retained as rejected intermediates. The final
geometry/texture strategy and fresh delivery checks are recorded below after
same-angle review.

The temporary contract compares the original and candidate factories at 125
sampled clocks. All 25 colliders retain exact identities, order, geometry and
poses; ship geometry/poses, buoy roots and original cable geometry match. Native
Mariana selection and live follow-camera fixtures observe all three existing
buoys and actual material readiness, with Pause/Resume and a Chinese narrow
round. These use controlled player jumps, not natural discovery or whole-round
completion. Intermediate receipts are explicitly superseded when final art is
rechecked. No physical-phone FPS, thermals or other-device network reliability
is claimed.

Evidence names: `preflight.json`, `concept_provenance.json`,
`mariana_buoy_attempt_01/receipt.json`, `raw_inspection.json`,
`fitted_inspection.json`, `contract.json`, `focused_final.log`,
`before_world.json` and `after_world.json`. Raw images/logs/intermediates remain
local. The final cost and compiled-preview checks follow below.

## Final asset review and cost

The selected converter welds only matching positions and normals, preserves
normal attributes in simplification, and avoids permissive hard-edge crossing.
It then reprojects source colors into a padded atlas. No nearest-point normal
replacement or normal flipping is used. The earlier UV-constrained rebake with
a black instrument patch is superseded by this final normal-bound candidate.
Matched final front/side/back/top color and neutral views show a continuous
instrument body and attached supports, panels, lantern and antenna. Small
source-derived wear and some fine facets remain; no large torn black triangle
or visibly floating component remains.

The final shared asset has 15,976 triangles and 18,490 UV-split vertices, one
647,457-byte packed mesh and one 310,876-byte 1024-square WebP. Its world bounds
are approximately `[-2,-1.363625,-1.992925]` to `[2,5.8,1.992925]`, including the
keel but not the old mooring. Uniform fitting retains a 4 m maximum float
width and the original 5.8 m top; no anisotropic stretch is applied.

| Three-buoy inventory                 | Before |  After |
| ------------------------------------ | -----: | -----: |
| Visible meshes, including old cables |     18 |      6 |
| Triangles, including old cables      |  2,244 | 48,024 |
| Shared generated color textures      |      0 |      1 |

The additional geometry is intentional detail, not a claimed speedup. Shared
resources and fewer draw calls do not establish physical-phone FPS or thermal
parity. Native populated-scene render counters are retained with the world
receipts but are not matched frame-time benchmarks; live food and camera
positions differ slightly between captures.

All 55 relevant tests pass against this final source, including five dedicated
buoy tests, existing ship/collision/reset checks, neighboring Mariana visuals
and bilingual Guide rules. The final 125-clock original/candidate contract also
passes. Texture-failure rendering deliberately aborts color requests and
still shows recognizable source-colored fallback geometry; it does not claim
full texture detail while offline. Final actual-world and compiled checks are
recorded below after completion. No full-suite rerun is claimed for this bounded
art-only change.

## Final world and compiled delivery

The final normal-bound asset passes the repeated three-home actual-world run:
all three bodies report the correct art revision, 15,976 triangles and prepared
textures; their original sphere colliders follow the same bob. Native Pause
freezes all buoy poses, Resume works, and a new Chinese narrow-layout round
renders the same asset without horizontal overflow or page errors. These
captures retain live ecology and a normal follow camera after the documented
player jumps. Close-ups use the actual runtime factory under diagnostic lighting,
not the generated concept image.

The compiled restricted preview passes native Mariana selection, actual buoy
texture HTTP200, start/input, Pause/Resume/Home, English 390 touch and Chinese 1280
layouts, and the survey Guide in both languages. Cold initialization is 57.0
seconds in that run, followed by selected-map preparation; no page errors,
failed requests or bad responses occur, and no development hook exists. The
initial smoke did not wait for the background material queue and therefore
failed its texture-response assertion; that harness receipt is retained as
`public_initial_no_texture_wait.json`. The corrected retry explicitly awaits
the real texture response before continuing and is `public_final.json`.

Twelve representative public shell, engine, model, color and bootstrap files
match their build hashes. All 979 served runtime artifacts and all 2,203 recorded
source inputs match before this final verification-only review paragraph. See
`public_assets.json`, `fingerprints_final_build.json`, `world_final.log`,
`after_world.json`, `contract.json` and `focused_final.log`.

Only identified task development servers 5190/5191 are stopped after exact
process/cwd/listener checks. The restricted loopback preview 7188, its existing
tunnel, old immutable assets and runtime archives remain. This new buoy art is
uncommitted/unpushed; the prior accepted BOSS checkpoint remains `501f8bc`.
