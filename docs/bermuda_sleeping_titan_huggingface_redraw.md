# Bermuda sleeping titan and bone-remains redraw — 2026-11-21

This uncommitted candidate replaces the rejected tubular cave skeletons with
actual generated bone remains and adds an original sleeping titan to the
[Bermuda cave revision](bermuda_deep_caves.md). The titan is an environmental
encounter, not a fifth lord. The four existing lords remain separate.

## Inputs and actual generated meshes

Original **imagegen** concept images supplied the sleeping reptilian titan and
the collapsed sea-beast skeleton. Those raster images are reconstruction
inputs; they are not the runtime models. The actual textured 3D meshes were
generated and exported through the official
[Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2).
No external photograph or third-party artwork was uploaded as a reference.

The verified [TRELLIS.2-4B model](https://huggingface.co/microsoft/TRELLIS.2-4B)
revision is `af44b45f2e35a493886929c6d786e563ec68364d`; the Space revision is
`ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`. The model/code release uses MIT
terms; that does not establish rights to arbitrary input artwork. The upstream
[code repository](https://github.com/microsoft/TRELLIS.2) is retained as the
implementation reference.

All three actual generation/export rounds used 1024 resolution:

| Round            |   Seed |  Downloaded GLB | Decision                                                                   |
| ---------------- | -----: | --------------: | -------------------------------------------------------------------------- |
| Sleeping titan 1 | 761121 | 3,758,116 bytes | Rejected: the inferred rear produced a forked/doubled tail.                |
| Sleeping titan 2 | 761122 | 3,872,044 bytes | Selected: one tail, four limbs and a coherent resting body.                |
| Bone remains 1   | 761122 | 4,039,876 bytes | Selected: a skull, vertebrae, irregular broken ribs and genuine open gaps. |

The selected titan GLB SHA-256 is
`768a14520f4ac9f99231fb235d960da13ae140e92ab0b195dd2a679bf6eb03ff`;
the bone GLB SHA-256 is
`45b672bcbf7ac31b25418121b5086abb7a6f4b4990881f55f8c37715f412432c`.
The rejected titan is preserved with SHA-256
`2b5ce086f4cccdd546e46702458e9101b371d97f0b4d0a4c1fc77af4dab64bd5`.
The selected concept-image hashes are
`59603167a43f18a5841777dbf68ea9b43b371361cad68ce10accc38299f0c07a`
and `7babd8fef6bb4091026d91c6c8ec23fa4a2bad5146ce39a927fb77ce9e7c466d`.
Fresh quota checks surrounded GPU stages; recorded over-quota use stayed zero.
No paid usage or account change was used. Original inputs, complete GLBs and
private service/session evidence remain under ignored `.local/` storage.

## Conversion, placement and materials

| Runtime asset  | Near triangles | Far triangles | Placement                                                           |
| -------------- | -------------: | ------------: | ------------------------------------------------------------------- |
| Sleeping titan |         29,998 |         4,952 | One 170 m figure, rigidly tilted onto its resting slope.            |
| Bone remains   |         18,000 |         2,976 | Shared 60 m and 44 m instances in the main lair and fossil passage. |

The reproducible converters are
[`prepare_bermuda_sleeping_titan_hf_asset.mjs`](../scripts/prepare_bermuda_sleeping_titan_hf_asset.mjs)
and
[`prepare_bermuda_titan_bones_hf_asset.mjs`](../scripts/prepare_bermuda_titan_bones_hf_asset.mjs).
They use rigid rotation and uniform longest-axis normalization, preserving
the source UVs and surface normals. Both original 1024 px WebP channels—base
color and metallic/roughness—remain byte-identical to their respective GLBs.
There was no source normal-map channel to preserve. Distant meshes use sampled
source vertex colors and a simpler rough material.

The titan's original head pointed along +Z. A rigid yaw of pi sets its runtime
head to -Z; the whole figure then receives the same X=0.28 slope rotation.
The local mouth anchor `[0,-0.069,-0.482]` follows that complete pose. Its real
world direction, approximately `[0,0.27636,-0.96106]`, is passed to the breath
component instead of using an unrelated fixed emitter. Its world position is approximately `[-150,-593.361,-1636.991]`. The
anchor is 0.236 m from the actual front lip and lies between the measured
upper- and lower-jaw surfaces. Moving it back along local Z preserves the
existing breath centreline while removing the detached mouth-end glow.

Every near vertex clears the actual rendered triangle seabed; the smallest
clearance is 0.080 m. The resting rock was widened and raised after real
follow-camera review exposed unsupported paws. All 621 sampled low-sole points
now have visible rock beneath them; the lowest parts lightly embed rather than
hovering. The bone instances likewise follow the real slope rigidly, with a
few fitted HF rock supports under low fragments. They retain open rib spaces
and do not use one whole-skeleton blocking box.

## Ownership, checks and limits

The titan contributes 2,048 fitted body contacts and 1,875 resting-rock contacts;
each bone instance has 806 fitted bone contacts. Independent real-mesh tests
check surface coverage and the unchanged 2 m exterior-contact tolerance.
Shared immutable assets use reference-counted leases and bounded near/far
display. Scene-owned material clones retain independent sleep/charge uniforms;
preparation shares source requests, and final release closes textures and
bitmaps. These assets add no private frame loop or new point light.

Fifteen focused hero/cave-art checks pass, including actual-floor seating,
four-paw support, mouth alignment, both grown-body cave directions, turning,
material preparation and repeated disposal. Separate native checks exercise
real keyboard seal/relic contacts, wrong-order and breath damage, pause and
restart. Their controlled starts and invulnerability during success footage
are inspection fixtures. Staged lord-defeat flags test final objective wiring
only; they do not demonstrate winning four boss fights and are excluded from
the demonstration video.

Raw and reduced meshes were inspected from multiple sides in original PBR and
neutral clay. Single-image reconstruction infers hidden surfaces; these are
fictional assets, not anatomical scans. Reduction makes some forehead and dorsal
details more angular, and the distant meshes are intentionally coarser. Texture
detail is not claimed as geometric relief. Full-scene/device performance and
player visual acceptance remain separate from these source and contact checks.

## Crossed-forearm front revision (2026-11-21)

The preceding whole-body section records the earlier candidate. Its original
assets and rejected attempts are preserved; the selected whole body may provide
rear continuity behind the rock. The current foreground is a separately
generated, closed-eye head, shoulders and crossed forearms. This section covers
that asset and its local rig. Final cave placement, supported resting bed,
actual character intake, escape state and native recordings are separate world
integration checks.

The new reference is an original imagegen concept with visibly crossed arms and
an empty treasure area. Imagegen supplied the reference image; the actual
indexed, textured 3D mesh was generated and exported through the official
[Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2).
The checked [TRELLIS.2-4B model](https://huggingface.co/microsoft/TRELLIS.2-4B)
revision remains `af44b45f2e35a493886929c6d786e563ec68364d` and the Space
revision is `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`. The model/code release
is MIT; this does not establish rights to arbitrary input images.

| Front attempt                              | Result                                            | Raw GLB SHA-256                                                    |
| ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------ |
| Open U-shaped arms                         | Preserved, not used as the crossed-arm foreground | `d0385fe02d992ca8393393fe098630be2fc59bcf99dcebc970fabd1db6f494fe` |
| Crossed arms, seed 761124, 1024 resolution | Selected foreground source, 4,045,816 bytes       | `a510c4ea2fccfff6bc9ec5d0e7bc7921e25c475bab3610c5eccab03b13280e7b` |

The crossed reference SHA-256 is
`ed40ac41df475f0b8738c1303571fe65638a971147646a901c4d731f336e9570`.
Both attempts, full downloaded GLBs and private service receipts remain in
ignored project storage. Fresh included-quota checks preceded each GPU stage;
no paid over-quota use or account change was used. The first front attempt was
preserved rather than relabelled as the subsequently approved crossed pose.

### Geometry, PBR and measured anchors

[`prepare_bermuda_titan_head_hf_asset.mjs`](../scripts/prepare_bermuda_titan_head_hf_asset.mjs)
rigidly rotates the actual +Z-facing source by pi and uniformly normalizes its
outer X width to 1. It does not force the longest dimension to Z or reshape the
head. Source geometry contains 95,294 triangles and 78,999 UV-split vertices.
The packed source has 36,602 near triangles and 2,952 far triangles. Seven
additional midpoint vertices and shared-edge refinement prevent a few long,
thin reduced triangles from reversing during motion, giving **36,614 near and
2,954 far triangles** at runtime. Midpoints lie on the original triangle
surfaces, preserve UV interpolation and share identical skin weights across
coincident seams; the resting shape and original maps are retained.

The 355,840-byte 1024 px base-color WebP and 16,568-byte metallic/roughness WebP
are byte-identical to their GLB channels. Their SHA-256 values are respectively
`5fb5d2067074411dce10678fc58ae32513b9953fd02a2943cd72128ad97aeb42` and
`92083f2be42751b7d31354aee121e95c1e877e73855bd5631d88b21e03ab079b`.
There is no source normal or occlusion map. The near material uses the original
UV and PBR; the far material uses sampled source vertex colors.

In the canonical front frame, forward is -Z and the measured mouth anchor is
`[0,-0.027,-0.380]`. It is 0.438 m from the actual lower lip at a 120 m outer
width, within the real tooth gap. Its position and direction follow the posed
head. The two eyelids are asymmetric in this inferred source: narrow emission
curves were projected onto the actual closed-eye skin instead of placing
symmetric floating eye objects. These surface curves move with the same head
weights. No PointLight is added.

The apparent central space behind the arms is solid chest, not a traversable
cavity. The independent 4.24 × 4.50 × 2.17 m crystal therefore uses an external
wrist-front cradle at `[0.06,-0.20,-0.47]`. Real crystal triangles do not intersect
the actual near skin in either guard endpoint. Its centre-to-skin distances are
3.042 m closed and 2.692 m slack; a spherical substitute is unnecessary for the
flattened crystal. The local 32 m body fixture waits outside the tight brace,
advances 8 m when it slackens and retains true skin line of sight to the crystal.
Actual species mouth anchors and seabed clearance require world integration
verification; the asset fixture does not enlarge the 8 m pickup range.

### Local rig, contact ownership and limits

The reconstructed arms are fused where they cross. They use one shared
forearm brace with smooth shoulder weights; independent wrist twists would
tear that contact region. At 120 m width, the tight brace reaches 3 m forward.
The slack brace retracts and lifts 2.16 m, a total endpoint displacement of
3.697 m. The root remains fixed. Partial awareness adds a small genuine head
lift/tilt with skin-bound eyelid and dorsal emission; it does not itself add
tracking, chase or boss attacks. The separate gameplay state owns waking and
escape consequences.

Only the collision copy receives 0.008-normalized-cell (0.96 m at width 120)
six-neighbour single-cell crack closing, followed by enclosed-volume filling.
Visible geometry and maps are untouched. This reduces the unfixed 17,103
surface boxes to 5,657 source boxes while preserving large external water.
Boxes crossing skin-weight transitions are subdivided for posed fitting:
2,203 immutable static boxes and 8,279 dynamic rest boxes. Dynamic rest boxes
remain in a private immutable local grid expanded by the bounded motion;
queries transform only nearby candidates. The world static grid never stores
moving boxes. One representative 32 m local query selected 206 candidates.

Eight focused front-asset checks pass: source/PBR and LOD identity, shared
seams, independent skeletons, bounded real arm displacement, every posed skin
vertex covered by a corresponding contact, unchanged static indices, actual
mouth/eyelid support, six-pose triangle winding, preparation/disposal and an
explicit grown-body wait/advance/intake fixture. Separate exterior-water ray
checks against actual posed triangles retained the unchanged 2 m budget:
closed 1.753 m, slack 1.674 m and slack with awareness 1.971 m maximum sampled
contact error. These are bounded geometry tests, not a proof over every
possible ray or a physical-device performance claim.

Shared geometry, original maps and source contacts use reference-counted
leases. Each front owns one skeleton and two material clones, displays one
near/far mesh at a time and uses the caller's existing animation loop.
Construction and query timings are CPU-only diagnostics; populated-scene
frame time, sustained device heat and final player acceptance must be evaluated
separately. Single-image reconstruction also infers hidden anatomy, and the
crossed front is deliberately not a fully articulated character rig.

### Rear continuation contact refinement

The 280 m rear continuation still uses the preserved single-tail GLB source
`768a14520f4ac9f99231fb235d960da13ae140e92ab0b195dd2a679bf6eb03ff`
and the existing whole-body packed geometry and original PBR maps. The extra
[`bermuda_titan_rear_contacts.json`](../src/assets/models/bermuda_titan_rear_contacts.json)
contains collision data only: **4,210 static boxes, 649,488 uncompressed JSON
bytes**, with no new visible mesh, texture or light. The existing sleeping-titan
converter now accepts an optional contact-cell size and collision-repair mode;
this data uses 0.0032 normalized cells, equivalent to 0.896 m at 280 m length,
and six-neighbour one-cell closing before volume filling. The source surface
occupancy grows from 114,167 to 118,125 cells and the filled solid occupies
411,385 cells. Contacts are cropped to local Z ≥ -0.15 at the front overlap.
The visible whole-body/PBR assets are not regenerated for this refinement.

Four dedicated rear checks pass. Every used vertex of both actual clipped LODs
has a corresponding solid contact. Two independent exterior ray grids begin
outside the actual indexed rear bounds and measure distance to the real clipped
triangles, rather than multiplying voxel size to infer a guarantee. Against the
13,237-triangle near continuation, **819 valid exterior-water rays** give a
maximum sampled contact-to-skin distance of **1.7353 m**, below the unchanged
2 m budget. Another 121 rays hit the hidden open front crop itself and are
explicitly excluded; the other side, roof, underside, tail and crop-edge rays
remain in the check.

The 2,100-triangle far continuation is measured separately: 810 exterior rays
and 122 crop exclusions give a maximum sampled difference of **2.7994 m**.
This is a distant visual approximation, not evidence of 2 m near-contact
precision. LOD selection must use the rear's own position/extent if close
physical contact is to guarantee the near surface. These bounded samples do
not prove every possible ray or physical-device performance.
