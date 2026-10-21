# Mechanical Shark belly rack — 2026-10-21

Status: user-accepted for commit, push and main publication on 2026-10-21.
The accepted belly-rack direction supersedes the earlier lower-jaw bay. All
1,086 delivered inputs match before release-only metadata edits. The recorded
candidate checks below remain unchanged-input evidence, not fresh release
checks. See [v0.11.15](release_v0_11_15.md) for publication scope and evidence.

## Current implementation

The mounted round and flying projectile use the same accepted HF torpedo mesh,
material, dimensions and nose-relative transforms. The belly anchor moves with
the posed torso. On a successful cast, the hanging round disappears exactly when
the world projectile becomes active at its nose; failed casts leave it loaded.
The jaw bay and its nose-mounted energy bar are removed.

The existing two-second cooldown contains the entire visual reload: the empty
rack opens, a replacement emerges downward from behind the belly armor between
0.42 and 1.42 seconds, then the clamps and panels close by 1.82 seconds. The round
is translated continuously at full size, without scaling up or fading into view.
There is only one mounted round per character and no per-shot allocation.
Pause freezes the motion and restart restores a loaded rack. Both body and
mounted-round textures participate in Guide loading/retry readiness.

The physical launch origin intentionally moves from the lower jaw to the belly
rack as requested. Input still fires immediately. Cost (20 health/20 stamina),
two-second cooldown, targeting/homing, speed, range, sweep radius, collision,
blast and boss damage rules remain unchanged. The previous proportional juvenile
appearance and progressively emitted tail bubbles remain. The other characters,
body/fin motion, mouth anchors, side boosters and submarine factory are preserved.
The Guide description is updated in Chinese and English.

## Current evidence

- 35 focused mechanical tests pass, including actual mounted/flying nose and
  size continuity at 3/12/30 m, continuous replenishment, independent instances,
  pause/reset, failed casts, unchanged projectile trajectory and submarine
  transforms. Shared torpedo resources release only after their final owner.
- 1,503 full tests pass for the runtime change. Subsequent bilingual description
  edits receive focused checks; these do not alter gameplay.
- Native Chrome checks 3/12/30 m from side/front/underside, two actual J-key
  launches at each size, frozen reload on pause and restored reload on restart.
  A separate four-shot run includes sprint/turn and approximately 149 m of real
  world travel. No browser or shader errors occur. Size, position and resources
  are staged; the side camera is an inspection view, followed by normal camera.
- The ready model is 17 meshes /53,672 triangles, with 14 unique geometries,
  13 materials and 3,510,578 geometry/index bytes, compared with 15 meshes /
  50,198 triangles in the preceding jaw-bay candidate. The additional torpedo
  geometry/material are shared with flying rounds, not copied. Repeated 1,200
  reload events create no new mesh, geometry or material identities. These
  counts do not establish FPS or physical-phone thermal performance.

Evidence is retained under `.local/mechanical_belly_launcher_20261021/`.
Production resource parity and bilingual ordinary flows are recorded after
rebuilding the same restricted preview. Existing service identities, archived
builds and formal main/Pages v0.11.14 are preserved. The demonstration video
contains gameplay rendering without an audio track.

Final belly-rack delivery checks: entry `index-XAKgFlPY.js`; all 203 build
files (59,960,725 bytes, including compressed representations) match dist,
the restricted local origin and the public address. Eleven private/source paths
are rejected at each origin. Native English 1440 px and Chinese 390 px desktop
touch-emulation flows pass Guide/start/skill/pause/Home and same-address refresh;
both body and torpedo colors load successfully. Production has no development
hook. These are desktop tests, not a physical-phone result. All four existing
service identities and tunnel readiness remain intact. Source comparison against
858 pre-task inputs shows only the five intended runtime files and two existing
mechanical tests changed, plus the new launcher and its test; other inputs match.

## Superseded lower-jaw candidate

The following record describes the preceding design and its own historical
checks. The user's subsequent belly-rack direction supersedes its appearance
and launch-anchor claims; its evidence is preserved separately.

### Lower-jaw launch presentation — 2026-10-21

Status: local candidate on `fix/mechanical-launch-presentation`, based on
`80839ba`. The user requests a more coherent missile launch before the next
region's visual work. This is not acceptance, commit, push or main publication.

## Observed problem

Native Chrome footage reproduced the abrupt appearance below the jaw. The
small collar did not read as a launcher. The complete 2.2 m projectile was
centered at the exit, so its nose appeared 1.1 m ahead immediately. All twelve
trail bubbles also appeared on the first update, including behind the exit
under the shark.

## Change and boundaries

- A short, faceted launch bay fits into the lower jaw. Its rear fairing slopes
  upward into the armor. A recessed ready nose and two sliding shutters show
  the weapon's origin and reload cycle. The ready chamber is open before firing;
  there is no added input delay. Shutters close after clearance and reopen
  during the existing two-second cooldown.
- Only the projectile instance's visual children shift rearward. The nose now
  starts at the existing physical origin; the physical root and movement stay
  unchanged. The submarine's shared asset, geometry and instance transforms
  are not modified.
- Juvenile projectile appearance scales from 0.55 m at a 3 m player to the
  original 2.2 m at 12 m and above. The bay keeps the shark's proportions rather
  than expanding into a shield. This changes appearance only: the existing
  0.28 m sweep radius is deliberately retained, as are all combat calculations.
- Bubbles start behind the rendered tail, limited by distance already traveled.
  No trail is backfilled under the player at launch. The existing bounded pool
  remains 120 bubbles, with at most twelve per active projectile.

The launch anchor, 20 health/20 stamina payment, two-second cooldown, seven-degree
selection, retained homing target, 70 m/s speed, 140 m range, obstacles, blast,
boss rules and immediate firing response remain unchanged. Accepted body colors,
fins, side propulsion effects, audio, UI and other species remain unchanged.
All new presentation uses the existing character clock; pause freezes it and
restart clears it. There is no new timer, light, texture download or inference.

## Validation

- 34 focused mechanical model, launch, homing and combat tests pass, including
  real nose/origin transforms, juvenile/adult aperture clearance, independent
  shutter state, pause/reset, bounded trails and unchanged submarine instances.
- 1,502 full tests pass. Formatting and production build are checked separately.
- Native desktop Chrome: 3/12/30 m side/front/underside inspection, actual J-key
  launches, two consecutive shots at each size, pause/resume and Home/restart.
  The recorded 12 m run fires four times, including sprint/turn input, and
  travels approximately 149 m. No page or shader compilation errors occur.
  Sizes, position and resources are staged; this is not natural progression.
- The first box-like fairing and an oversized juvenile bay were rejected during
  local inspection. The final bay uses a tapered fairing with outward-facing
  surfaces and a proportional juvenile projectile. Earlier captures are not
  the delivered candidate.
- Source fingerprints protect other models, materials, gameplay and services.
  Shared model counts change from 11 to 15 visible meshes and 49,946 to 50,198
  triangles in the sampled ready pose. Geometry attributes add 11,040 bytes,
  with three additional unique geometries and two additional shared materials.
  Repeated 1,200 presentation triggers introduce no new geometry/material objects.
  These are model costs, not a measured FPS or thermal improvement.

Raw before/after images, native input recordings, test logs, resource hashes
and served-production checks are under `.local/mechanical_launch_20261021/`.
The delivered video contains normal-speed side and ordinary follow views;
it is a visual demonstration without a captured audio track. Narrow-screen
checks use desktop Chrome touch emulation, not a physical phone.

The existing restricted Cloudflare preview is rebuilt at the same address;
formal main/Pages remains v0.11.14. Production resource parity, native bilingual
flows, refresh and source/debug restrictions are recorded in `artifacts.json`
and `public/report.json` after verification. Preserve the existing preview,
development, awake and tunnel processes and their archived builds.

Final delivery checks: entry `index-CtQKrERG.js`; all 203 build files
(59,960,694 bytes, including compressed representations) match the restricted
local origin and public downloads. Eleven private/source paths are rejected at
each origin. Native English desktop and Chinese 390 px touch-emulation flows
pass Guide/start/skill/pause/Home and same-address refresh; production has no
development hook. Existing-proxy CLI/Chrome bulk requests encountered transient
connection failures. The completed byte audit uses a direct, certificate-verified
session without changing system proxy settings. The earlier failure logs are
retained. All four existing process identities and tunnel readiness are intact.
