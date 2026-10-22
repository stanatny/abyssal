# Occluded player silhouette — 2026-10-22

Accepted visual checkpoint — 2026-10-22: the user accepts the player outline
and general large-pursuer interior fill and requests a local commit. All 1,183
delivered input hashes match before acceptance-only notes. The recorded 1,563
tests and native/public evidence retain their original scope. Earlier pending
labels below are historical for this checkpoint. A new report of creature bodies
passing through one another is a separate collision investigation, not proof
that the render-only fill provides physical solidity. Preserve the stable follow
camera; no push or main publication is requested.

Follow-up: the user accepts this outline on 2026-10-22, then requests a generic
hollow-body correction for large pursuers. See [the interior review](creature_interior_revision.md).
The following pending label is historical for the outline; the new fill is not
yet accepted. Neither candidate has a new commit/push authorization.

The user requests committing the existing version, then trying a player outline.
The preceding Kraken motion/pressure and original follow-camera restoration are
saved in local commit `04d16a2`. There is no push or formal release. The current
agent independently implements this separate, uncommitted review candidate.

## Visual contract

Keep the exact existing follow camera, movement, combat, source colors, creature
visibility and assets. Show a thin warm-ivory contour and a faint 4.5% interior
only where a large creature actually lies in front of the player. Preserve the
actual swimming fins, tail, tentacles, growth and armor. The overlay contains no
flashing, breathing, arrow, extra sound or automatic camera movement. The original
occlusion/clipping may still hide terrain; the effect only helps locate the player.

## Implementation and limits

`player_silhouette.js` conservatively filters nearby visible creature instances,
then uses their real current skin depth to establish pixel-level occlusion. At
most four nearby candidates are rendered. Two bounded render targets, capped at
960 pixels wide and 640 high, contain the player silhouette/depth and occlusion
mask. A final screen quad draws the contour after the ordinary render pipeline,
without changing bloom, lighting, creature materials or the camera.

The proxy meshes borrow existing geometry, skeletons and morph weights. They
copy current world transforms; they do not own or dispose source assets. Hidden
attachments and transparent effects are excluded. Source material groups remain
separate unless an identical mask material covers the complete geometry. Proxy
references are weak and the temporary scenes are cleared after each frame.
No-nearby-candidate frames perform no added GPU draws. When first needed, the
bounded targets persist for reuse; resize updates them, graphics loss invalidates
them, and pipeline disposal releases only owned resources. Pause renders only
when the existing pipeline requests a dirty frame; Home disables the overlay.
Both High and Smooth use the same screen overlay, independent of bloom.

This is a bounded creature-occlusion aid, not a new scene-wide x-ray view. It does
not scan terrain for visibility, does not show an enemy through a wall, and does
not alter the existing world-only camera collision. More than four simultaneous
potential occluders are capped for cost; complete visibility in arbitrary crowded
geometry is not promised. No physical-phone performance or comfort claim is made.

## Evidence

Evidence is stored in `.local/player_silhouette_20261022/`. Tests compare actual
animated proxy/source vertices for all four players across 24 poses, verify
hidden/transparent exclusion and bounded candidate selection. Native Chrome
checks compare the exact same frozen scene with the effect disabled/enabled,
including unchanged camera matrices/material state, real pursuit and turn,
portrait touch emulation, normal clear views and context restoration. The
390-pixel layout is a desktop emulation, not a physical phone.

The current version is subject to the user's visual review. Checkpoints and
technical tests do not substitute for that acceptance. No personal Skill is
modified and no other agent is delegated.

## Recorded checks for this candidate

- `npm run check`, a fresh full run of 1,559 tests and the restricted build pass.
- All four player skins have matching proxy/source animated vertices across 24
  poses each. In native Chrome, frozen on/off frames have exactly identical
  camera matrices and source material state. Clear views have zero changed pixels
  for all four players; a partial-occlusion scene changes only the hidden contour
  region (3,888 pixels in that captured image).
- The same-scene draw-call increments against one ordinary giant fish are +3 for
  Orca, +4 for Squid, +3 for Zombie Shark and +19 for Mechanical Shark. The last
  character retains 17 articulated opaque mesh parts; they are not silently
  merged or removed. These are bounded-scene counts, not a general FPS claim.
  Repeated off/on renders leave texture/geometry counters unchanged after warmup.
- Real pursuit fixtures in Hawaii and Atlantis retain the original camera,
  opaque giant fish, real movement, boost/turn and stable pause. A real Kraken
  encounter also renders its current animated body as the occluder. Fixtures
  stage initial positions and grant inspection invulnerability; they do not
  move the camera each frame or replace ordinary movement/combat.
- Native High/Smooth and 1280→390→1280 resize checks preserve active silhouettes;
  texture counts return to the starting Smooth value (287→300→287), and geometry
  counts remain 215 in this fixture. Mechanical Shark survives forced graphics
  loss/restore with the outline active. These are desktop checks.
- Source preservation checks cover 1,172 checkpoint inputs. Only `main.js`,
  `visual_pipeline.js` and the three entry documents differ among existing files.
  `startGame`, `followCameraPose`, `shortenCamera` and `updateCamera` are byte-exact
  to checkpoint `04d16a2`; creature assets and Kraken gameplay are unchanged.

Evidence: `review/report.json`, `partial/report.json`, `pixels.json`,
`npc_candidate_390/report.json`, `atlantis_candidate_1280/report.json`,
`kraken_candidate_1280/report.json` and `source_preservation.json` under the evidence
folder. The comparison is the same frozen frame; `delivery/pursuit.mp4` is an
encoded and visually checked game-canvas recording, not a simulated animation.

## Restricted preview delivery

The same preview origin is rebuilt with `index--IRy6U7r.js`. All 258 runtime
files (75,775,427 bytes) match the fresh build, restricted localhost and public
Cloudflare downloads byte-for-byte. Eleven source/private paths remain denied;
the existing four service identities and ready endpoint are intact. Native
production checks pass six cases across English desktop and Chinese 390-pixel
emulation, including Guide, start/ability, graphics loss/restore, pause/Home and
same-address refresh. No production development hook or browser error is present.
See `artifacts.json` and `public/report.json`. This is a preview update only;
formal main/Pages are unchanged and the new silhouette is not committed.
