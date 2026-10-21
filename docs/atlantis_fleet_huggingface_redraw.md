# Atlantis night-fleet HF redraw — 2026-10-21

The user accepts the second creature batch, including the Spadefish swimming
repair, and requests a local commit followed by the next batch. That checkpoint
is `1b58a90`; it is not pushed. This third batch replaces Atlantis's three
region-owned procedural boats. It does not redraw accepted shared creatures,
players, Kraken, Hawaii ships, city buildings or terrain.

## Candidate and production

| Boat                                 | Appearance                                                                               | Length × beam / draft | Runtime surface triangles |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------- | ------------------------- |
| Moon-tide fishing boat (`fisher`)    | Weathered green planks, oxblood gunwale, cream gaff sail, low cabin, net coils and winch | 12 × 3.9 m / 1 m      | 9,738                     |
| Far-star exploration ketch (`ketch`) | Dark navy wooden hull, brass details, two masts, cream sails, porthole cabin and rigging | 15.5 × 4.3 m / 1.1 m  | 11,936                    |
| Lantern steam launch (`launch`)      | Charcoal hull, ivory gunwale/canopy, copper boiler, wooden seats and small oil lamp      | 9.5 × 2.9 m / 0.75 m  | 7,754                     |

Three original image-tool concepts were sent to actual
[Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2) inference;
these are textured exported meshes, not concept-image billboards. The Space
revision is `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; the
[MIT-licensed model](https://huggingface.co/microsoft/TRELLIS.2-4B) revision is
`af44b45f2e35a493886929c6d786e563ec68364d`. Seeds are 742301, 742302 and 742303.
The original fisher concept clipped the mast; a reframed complete concept was
selected before inference. Raw GLBs and dated private receipts are retained in
ignored `atlantis_batch3_20261021` evidence. No private download URLs or tokens
are included in the project.

At 11:39 UTC the account was Pro with 2,114.878520 included GPU seconds remaining.
After this batch the dated receipt reports 1,981.417359 seconds, zero over-quota
usage. The 133.461161-second difference covers these three generations/exports;
it is not a permanent per-model cost or a promise about later quota.

`prepare_atlantis_fleet_hf_asset.mjs` welds old UV duplicates, reduces geometry,
projects the original HF colors to a padded new atlas and samples matching
fallback vertex colors. It reuses the existing generic ship atlas baker.
Nearest-surface normal projection produced dark triangular patches on thin
sails; matching topology normals now own the upper cloth/rigging, while the hull
retains restored source normals. Lit/unlit comparisons isolated the defect.
`fit_atlantis_fleet_hf_asset.mjs` records beam, shallow-draft and deck fitting,
with inverse-transpose normals. The launch's initially diagonal source is
rigidly aligned; its funnel is fitted to the existing solid collider. The ketch's
bowsprit is kept compact inside its original overall length.

These are modest sailboats/launches appropriate to the existing night ocean,
not larger new vehicles. Sails are static wind-filled surfaces; existing route
motion and gentle pitch/roll remain the only ship motion. No simulated cloth,
new controls or new weather mechanic is introduced.

## Runtime contract

`atlantis_fleet_asset.js` owns reference-counted geometry, materials and textures.
Normal fleet construction starts bounded texture preparation automatically.
Failure leaves same-source vertex colors and can recover through the shared
retry path. One live fleet cannot dispose another fleet's art.

`atlantis_surface.js` retains routes, speed, scale metadata, shallow underpass,
collision/ram/destruction behavior, reset, pause and wakes. `initializeShipHull`
extracts the original hull metadata without changing values. The retained 28
colliders and ship transforms match the saved original factory exactly at
0, 37, 180 and 600 seconds. New light cores are fitted to actual lamp surfaces;
the three existing point lights move to those lamps, retaining their count,
range, intensity and established flicker. No new animation loop is added.

The three surface meshes total 29,428 triangles versus 9,650 triangles across
the preceding complete procedural fleet, before small retained effects. This
is an art-quality cost, not a performance optimization. The six shipped mesh
and color files total about 2.39 MB. Texture/buffer ownership is measured, and
no phone FPS, power or thermal improvement is claimed.

## Evidence and boundaries

- Fresh 1,530 tests pass, including five new fleet checks and existing fast
  crossing, underpass, ram, reset and resource tests. The focused pre-final
  geometry pass had 42 checks; the final added funnel alignment is included in
  the full run.
- Four-time collider/transform comparison is exact. An initial evidence-script
  shallow-copy mistake retained the last quaternion in all rows; the rejected
  capture is preserved, and the corrected baseline uses the saved original
  factory plus deep snapshots. This was not a runtime collision change.
- Six failed texture loads across two simultaneous fleets retain fallback
  colors; retry restores all three textures. Shared geometry/material/texture
  disposal occurs once on the last owner. Empty renderer memory returns to the
  calibrated one internal Three.js Sprite geometry and zero textures; that
  reused Sprite plane is not a leaked ship mesh.
- Serial native Chrome views cover both sides, front, above, below and clay;
  the populated actual night sea includes normal sailing/turning, waves, warm
  lamps and pause. The camera is a staged observer and the player is initially
  placed/invulnerable; ships and player are not pinned each frame. The launch
  has a final capture after its funnel alignment adjustment.
- Two rounds of Atlantis/Hawaii/Bermuda switching preserve accepted regional
  fleets. No Guide entry is added: these boats belong to the actual regional
  surface factory, not the ordinary-creature catalog.

Raw files remain in ignored `.local/atlantis_batch3_20261021/`: source and commit
receipts, HF attempts, conversion logs, matched views, `contract.json`,
`lifecycle.json`, native reports and delivery media. New boats remain
uncommitted candidates for individual user review. Formal main/Pages remains
v0.11.15. No physical-phone or external-device test is implied.

## Restricted-preview delivery

The existing restricted origin was rebuilt without replacing its development,
preview, tunnel or awake processes. Production entry is `index-By1QLRC1.js`.
All 236 build files (69,291,594 bytes, including encoded variants) match fresh
local and public downloads byte for byte. Eleven source/private paths are
rejected on each origin; the tunnel readiness endpoint is healthy.

Production Chrome checks pass in English at 1440 px and Chinese at 390 px:
normal Atlantis selection, all three automatic boat-color downloads, the
retained Spadefish Guide, start/control/pause/Home and same-address reload.
There are no browser/resource errors and no production debug hook. The first
probe closed its pages before optional fleet downloads finished; its preserved
report is superseded by an explicit resource-completion wait, not a manual
material-loading call or a runtime workaround. A 390 px desktop touch profile
is not a physical-phone result.

Of 1,116 checkpoint inputs, only the four entry/review documents and two
Atlantis fleet source files change; all 1,110 others remain byte-identical.
New files are limited to the fleet asset owner, six generated asset files,
two offline converters, focused tests and this review. The delivered film uses
actual game captures (nine seconds for each sailing boat and a six-second
excerpt for the faster launch), with no third-party footage. User visual review
is still pending; no new commit, push or formal release occurs.

## User acceptance and local checkpoint — 2026-10-21

The user subsequently says “提交，下一批”, accepting the delivered surface
work and authorizing its local checkpoint. All 1,134 delivered inputs matched
before these documentation-only acceptance notes. Earlier pending wording
records the delivery stage; no push or formal release is requested.
