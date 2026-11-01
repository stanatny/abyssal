# White Tiger skull alignment — 2026-11-01

The player reported a permanently tilted White Tiger head in Penglai. The active
factory uses the HF guardian asset, not the older procedural tiger. Its neutral
head bones have no sideways rotation; the source surface itself carries roughly
26.8 degrees of yaw and 1.8 degrees of roll relative to the body axis.

The skull is now aligned to its bilateral plane. A constrained, locally rigid
neck solve connects it to the original torso, with the torso and lower limbs
fixed. The head/jaw pivots and posed-mouth anchor use the aligned coordinates.
The source texture, UVs, vertex ordering, triangle indices, leg/tail animation,
combat heading, attack timing, range and damage are unchanged. Only White Tiger's
closed interior core was regenerated for the new surface key; other cores are
unchanged. No additional runtime deformation or per-frame allocation was added.

## Publication validation follow-up

The full publication suite caught six zero-length vertex normals left by
surface-normal reconstruction around degenerate faces. The shared offline
`repair_packed_normals.mjs` repair supplies seam/adjacent/nearest valid normals.
Only those six normal vectors change; positions, UVs, topology, bounds, fitted
anchors and all other asset fields remain identical. The alignment CLI now
runs this repair automatically after writing its output. The first complete
run passed 2,148 of 2,149 tests; after repair all 2,149 tests pass. Formatting
and the production build also pass.
These receipts belong to `.local/main_delivery_20261101/`.

## Validation

- 28 focused tests pass across HF guardians, guardian combat, closed interiors
  and Penglai life. A new regression measures actual paired skull vertices
  through hunt, windup, leap, recovery and roar, together with the posed mouth.
  Existing paw travel, pause, shared geometry and Vermilion Bird checks pass.
- 16,620 protected torso/lower-limb vertices differ by at most 0.00000448 normalized
  units after quantization; topology and UVs are identical. The replacement
  interior core is watertight, with 1,036 faces.
- Matched front, overhead and three-quarter renders verify the static shape.
  Native Penglai observation records hunt, leap, recovery and roar with ordinary
  simulation and damage enabled. The player is placed near the guardian at 30 m
  for inspection; only the observation camera follows the tiger. This is a
  targeted scenario, not an unassisted playthrough. Health falls from 100 to
  70.84, the tiger remains rendered, and pause freezes the skeleton. Across
  1,324 observed frames, paired skull surfaces differ by at most 0.000656 in
  height and 0.000332 in depth, with zero sideways head-bone rotation.
- Changed JavaScript/JSON and documentation are formatted; the production build
  passes. The existing restricted preview serves the exact rebuilt entry and
  White Tiger module hashes; native public menu entry reaches Penglai, the new
  module returns HTTP 200, and development globals/private source paths remain
  unavailable. All 2,145 recorded inputs match the delivered build.

Evidence is retained under `.local/penglai_tiger_head_20261101/`: matched static
views, `tests.log`, `native.json`, `native_summary.json`, `white_tiger_native.mp4`
and the build log. `scripts/align_white_tiger_head.py` reproduces the surface
correction from the original, unaligned asset using NumPy and SciPy; it rejects
an already aligned input. Interior regeneration is a separate offline step.

The user authorizes committing and publishing the existing work to main on
2026-11-01. This correction is included in [v0.11.24](release_v0_11_24.md); it
does not change the accepted Atlantis mural behavior or any personal Skill.
