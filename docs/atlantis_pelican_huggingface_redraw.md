# Atlantis Brown Pelican redraw — 2026-10-21

## Scope and corrected coverage

The user requests the next batch and points to the Brown Pelican in the Guide.
The screenshot is correct: `pelican` still used `creature_wildlife.js`, whereas
Seagull already used the accepted Hawaii HF factory. The preceding count of
20 ordinary Atlantis species covered underwater ecology only; it was not a
complete creature inventory. That distinction should have been explicit.

This bounded fourth batch replaces the missed Brown Pelican through the shared
Guide/world factory. Atlantis and Bermuda both consume it. Preserve the prior
three uncommitted night boats, accepted assets and all gameplay. This new bird
awaits user visual acceptance; no commit, push or formal publication is made.

The expanded Guide inventory checks 20 underwater kinds, two surface birds,
one regional rare, the shared Kraken lord kind (three placements), four player
characters, both adult human kinds and their shared vehicle/hazard entries.
The other living appearances already use accepted HF assets or prior Atlantis
checkpoints. A null `artRevision` alone is not proof of a legacy asset: players
and Kraken expose their generated surfaces through different adapters. Boats,
keys, thermal vents, conch mechanisms and city architecture remain a distinct
scenery/effect inventory; this work does not declare the whole map HF-redrawn.

## References and intended motion

- [Cornell Lab identification and behavior](https://www.allaboutbirds.org/guide/Brown_Pelican/id): broad dark wings, gray-brown plumage, a pale head and powerful strokes interspersed with gliding.
- [Smithsonian Brown Pelican](https://www.nationalzoo.si.edu/animals/brown-pelican): long bill and pouch, head drawn back over folded neck in level flight.

The candidate uses an adult Atlantic-type gray/olive pouch and folded neck,
layered gray-brown feathers, separate primary tips, compact tail and tucked feet.
The flight envelope alternates quiet broad-wing gliding with paired strong
strokes and delayed distal feather trim. It does not introduce diving AI or
change the existing night/storm habitat adaptation.

## Generation and integration

An original built-in-generated concept was used as the HF input. No external
reference photograph was uploaded. Actual inference used `microsoft/TRELLIS.2`,
Space revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`, model
`microsoft/TRELLIS.2-4B` revision `af44b45f2e35a493886929c6d786e563ec68364d`;
both cards reported MIT. Seed 742401, 1024 generation and source color export.
The verified raw GLB is 4,131,952 bytes, SHA256
`20d7ae595a412d5457e65b71d6cf043b43cb0e43c6d7cc6b0f2bec7b036434c7`.

At 12:46 UTC the included Pro balance was 1,981.417359/2,400 GPU seconds.
The completed export recorded 1,955.928438 remaining and zero overage. These
are dated receipts, not a promise about subsequent quota; no paid overage.

`prepare_pelican_hf_asset.mjs` preserves source normals/UV error during
reduction, rotates the actual forward axis to -Z, and uniformly normalizes
bill-to-tail length to one. Existing atlas tooling reprojects source colors into
padded independent charts; two quantization-degenerate triangles were removed.
The final mesh has 14,646 vertices / 10,134 triangles, with one 1024-square
color map. Mesh JSON and WebP are 433,613 and 347,134 bytes respectively.

`creature_pelican_hf.js` fits two three-support wing chains and two tail supports
around a rigid head/neck/trunk: nine bones per instance. Continuous coordinate
weights retain identical UV seams. The original upward-wing source pose relaxes
into a gently bowed glide; feather stroke support does not twist the head or
lower torso. The existing accumulated phase drives motion without a second
speed multiplier. No new clock or root translation is introduced.

Geometry, feather material and the recoverable texture loader are shared;
skeletons remain independent and idempotently disposable. Ordinary Guide/world
construction starts color loading. Failed color requests keep original sampled
vertex colors, and the native retry action restores the texture.

Preserved contracts: 1.4 m catalogue length, 5.8 m/s configured speed, 32 nutrition,
0.28 growth, ten Pelicans among each region's 28 birds, flight paths/heading,
consumption/cooldown, pause/reset, and all other models/regions. No new copy or
language-specific gameplay value is introduced.

## Verification and costs

Evidence: `.local/atlantis_batch4_20261021/`.

- `inventory.json` records the expanded actual Guide consumers; source hashes preserve the preceding uncommitted boats.
- `pelican_raw_views_01/` and `review/pelican/`: raw textured/clay views and six matched baseline/candidate angles, including underside.
- `targeted.log`: nine checks, including actual wing-tip travel, quiet glide, stable head, UV-seam binding, culling, independent skeletons and repeated disposal; accepted seabird siblings also pass.
- `regression.json`: 28 retained creature/player/lord consumers have exact geometry and 180 unchanged poses each.
- `native/report.json`: three cycles through Atlantis/Bermuda/Hawaii, ordinary Guide/world preparation, shared geometry/texture identities and 60 retired Pelican skeletons released. Real birds travel 39.87 m and 36.44 m over the observed Atlantis/Bermuda clips and turn naturally; pause freezes both root and bones.
- `material_recovery.json`: a blocked Pelican texture retains colored mesh and recovers through the actual Guide retry button.

The isolated surface changes from 12 meshes / 10,280 triangles to one mesh /
10,134 triangles. A new decoded 1024 RGBA mip chain costs about 5.3 MiB per WebGL
context; Guide and game can each upload it. These counts do not prove phone
power, temperature or FPS improvements. Native footage uses an initially staged
invulnerable player and observer camera, without per-frame bird/player pinning.
The inspection clip isolates the same runtime model; neither is natural
progression or a physical-phone test.

- `tests.log`: 1,533/1,533 full tests passed; `check.log` and `git diff --check` passed.
- `populated_cost.json`: a paused native Atlantis scene with 561 underwater entities and 28 birds, ten replaced Pelicans, was compared at three matched views. Draw calls changed 108→97, 273→251 and 583→539; triangles changed 496,656→496,510, 1,560,722→1,560,430 and 2,737,867→2,737,283. This is a draw-cost comparison, not a measured frame-rate or heat improvement.
- `public/report.json`: native English 1440px and Chinese 390px Guide/start/ability/pause/Home and same-address reload passed, with automatic Pelican color requests returning 200, no browser errors and no production debug hook. The narrow case is desktop touch emulation.
- `delivery/pelican_flight.mp4`: encoded and decoded H.264/30fps inspection plus actual Atlantis and Bermuda flight footage; final-frame contact sheets were inspected. Matched before/after and Guide screenshots are retained alongside it.

The restricted preview keeps the existing URL and entry `index-HZTaqgaX.js`.
The manager rebuilt/archived the runtime without replacing DEV 35213, preview
23118, awake 23120 or tunnel 35419. The previous uncommitted fleet remains intact.
User aesthetic acceptance remains distinct from all checks; no commit or push.

Final resource audit: `artifacts.json` verifies all 239 current build files
(including gzip companions) byte-for-byte across dist, the restricted localhost
origin and the public tunnel. Eleven source/private paths are refused; tunnel
readiness and all four original process identities pass. An initial Cloudflare
500 on an existing sloop gzip file is retained in `public_hashes.log`; bounded
retry resumed verified same-run downloads and completed, with no service reset.
`source_preservation.json` confirms 1,122 of 1,127 baseline inputs unchanged;
the five changed existing files are documentation entries and the creature
dispatch. All previous fleet inputs remain byte-identical. `final_fingerprints.json`
records the complete delivered source and build state.

## User acceptance and local checkpoint — 2026-10-21

The user subsequently says “提交，下一批”, accepting the delivered surface
work and authorizing its local checkpoint. All 1,134 delivered inputs matched
before these documentation-only acceptance notes. Earlier pending wording
records the delivery stage; no push or formal release is requested.
