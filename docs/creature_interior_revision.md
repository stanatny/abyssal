# Large-creature interior display — 2026-10-22

Accepted visual checkpoint — 2026-10-22: the user accepts the player outline
and general large-pursuer interior fill and requests a local commit. All 1,183
delivered input hashes match before acceptance-only notes. The recorded 1,563
tests and native/public evidence retain their original scope. Earlier pending
labels below are historical for this checkpoint. A new report of creature bodies
passing through one another is a separate collision investigation, not proof
that the render-only fill provides physical solidity. Preserve the stable follow
camera; no push or main publication is requested.

The user accepts the occluded-player outline and asks to reduce the hollow-shell
appearance of a close pursuer. The scope explicitly includes other large
hunters, not only Ichthyotitan. This is a new, uncommitted visual candidate on
`art/atlantis-hf-redraw`, after local checkpoint `04d16a2`.

## Cause and chosen behavior

The visible defect has two causes: ordinary one-sided skin exposes its rear
surface when the lens enters it, and some generated meshes also contain an
inverted inner shell. Ichthyotitan has a 3,344-triangle exterior plus a
3,656-triangle inverted inner component. Simply enabling DoubleSide does not
remove this cavity. Using the complete original mesh for a winding-count cap
also cancels inside the nested shell.

The candidate fills only a body section intersecting the camera near plane.
It uses a subdued, opaque interior shade, followed by the accepted player
outline. The follow camera, source skin/materials, visibility, movement,
collision, attacks, drops and player abilities are unchanged. A very close body
can still occupy the whole view; the player outline stays visible, but terrain
behind the animal remains hidden. This does not eliminate physical camera
penetration or claim to restore a clear route through an opaque giant.

No enemy fade, disappearance, camera shake or camera avoidance is reintroduced.
Open spaces between separate arms, legs and fins are not replaced with a single
bounding box or convex hull.

## Coverage and preparation

The preparation census contains **79 distinct kinds in total**, including every
registered predator, other animals of at least eight metres, and all **18** lord
kinds. Selection during play depends on the actual nearby body, not a named
Ichthyotitan exception. Transparent effects and intentionally open surface
pieces are excluded. In particular, a soft appendage or open decorative shell
is not assumed to be a closed solid merely because the parent has a cap.

Closed oriented procedural components reuse their original positions, skin
weights and morphs through independent attribute handles. Inverted cavities
and open sheets are excluded. Twenty generated main-body geometries receive
an offline interior proxy: 128-cell longest-axis voxelization, one-cell crack
closing, enclosed-hole fill, one-cell erosion, gentle smoothing and at most
4,000 triangles. These are hidden rendering helpers, not replacement visible
models. Nearest source-vertex skin weights and morph deltas preserve movement;
the mesh remains an oriented closed surface after deformation. Tiny openings
below voxel resolution can be simplified; this is not an exact anatomical
solid model.

The prepared registry matches actual position/index bytes. Changed assets fail
closed instead of applying stale indices. The roster regression requires
prepared body sections for the current census. Regenerate this data when
changing eligible models:

```sh
node scripts/prepare_creature_interior.mjs --export .local/interior_build
uv run --no-project --with trimesh --with scipy --with scikit-image --with fast-simplification python scripts/prepare_creature_interior_hulls.py .local/interior_build
node scripts/prepare_creature_interior.mjs .local/interior_build/hulls.json
npx prettier --write src/assets/models/creature_interior_topology.json
```

Retain and inspect `hulls_report.json`, the roster output and native before/after
images. Manifold reports can flag touching or collapsed vertices after
simplification; the runtime requirement is a closed **oriented** boundary,
verified by directed-edge balance, rather than claiming every proxy is a
manifold anatomical reconstruction. No HF regeneration or paid service was
used for this correction.

## Rendering and ownership

The cap uses back/front stencil winding counts and a bounded 960 × 640 RGBA
plus depth/stencil target. See Three.js's [official stencil-cap example](https://threejs.org/examples/webgl_clipping_stencil.html)
for the underlying technique; the dynamic-skin and interior-shell handling
here is project-specific.

Only up to four camera-near roots participate. Per-mesh near-plane rejection
runs before helper allocation. Helpers have their own GPU attribute identities;
disposal cannot invalidate the original model's buffers or skeleton. The
cache retains up to 64 older helpers plus the current frame's working set,
expires inactive entries, and clears on return to menu/context invalidation.
It does not accumulate every previously visited regional model. There is no
per-frame topology reconstruction, voxelization or full-mesh CPU raycast.

The registry is 1,464,344 bytes (about 864 KB deflated in isolation). One extra
bounded render target is allocated only after a nearby body needs the pass.
This has a real download/GPU cost; it is not a performance optimization.

## Evidence

Evidence is under `.local/pursuer_solid_20261022/`:

- Seven focused checks and **1,563 full tests** pass. Source skin arrays and
  disposal ownership are preserved; changed assets reject stale preparation.
- Native Chrome renders the 79-kind census at an explicit 36-metre stress-test
  scale, without changing ecological sizes in the game. Same-camera on/off
  pairs cover body-centre and exterior views. This census is a render fixture,
  not 79 natural encounters or proof that every appendage has identical detail.
- All four playable characters retain the exact camera matrix and original
  pursuer material identities. Warm repeated renders retain texture/geometry
  counts. Forced graphics loss/restoration succeeds for the mechanical shark.
- Real 28-metre Ichthyotitan pursuit and a real Kraken encounter use normal AI,
  collision and follow-camera updates after staged initial placement. Kraken
  samples include hunt, windup, attack and return. Pause remains stable;
  High/Smooth and viewport resizing retain the outline.
- Desktop 390-pixel touch emulation is explicitly not a physical-phone test.
  The prior phone graphics incident remains a separate open issue.

Early component-only and whole-shell stencil experiments are retained as
rejected diagnostic evidence. Their results do not establish the final
candidate's behavior. Current native/public receipts and source fingerprints
are stored separately; deployment details are appended after verification.

The user has accepted the earlier outline, **not yet this interior-fill
candidate**. No new commit, push or main/Pages publication is authorized here.

## Delivered candidate

The unchanged preview origin now serves `index-Y7LszRYG.js`. All **260** runtime
files, **78,109,205 bytes** including compressed siblings, match dist, restricted
local serving and fresh TLS-verified public downloads byte for byte. Eleven
source/metadata paths are refused; production has no development hook. English
1440-pixel and Chinese 390-pixel native Guide/start/ability/graphics-recovery/
pause/Home checks pass, including same-address refresh. Service process
identities are preserved, and the previous runtime is archived.

The final 79-kind exterior comparison changes zero RGB pixels. In the four-player
repeated warm fixture, geometry and texture counts remain stable; these host
samples do not establish physical-phone performance. The clean offline export
and preparation reproduce the registry exactly. All pre-existing model,
texture, gameplay and camera inputs retain their baseline hashes; changes to
existing runtime code are limited to the visual pipeline and silhouette
composition from the preceding candidate.

The comparison images deliberately show the extreme lens-inside-body case.
The encoded pursuit clip was inspected after export. They should be judged as
an opaque-body/outline trade-off, not as transparent vision through the pursuer.
