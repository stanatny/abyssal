# Mechanical Shark cinematic design — 2026-10-19

## Scope and references

The user asks for film/television references and explicitly releases the previous form and palette constraints, retaining missile launch and rocket boost presentation. The current AI agent develops alone on `art/mechanical-hf-redraw`, preserving local checkpoint `6b7cb70`, all earlier candidates/evidence, services and gameplay. No commit/push or personal Skill change is requested.

This supersedes the navy/sky-blue constraint and angular-hull design direction in [the prior candidate](mechanical_hardsurface_revision.md); that candidate remains archived for comparison. The new original design targets an armored mechanical predator: overlapping titanium plates, a graphite frame visible at joints, substantial hydraulic connections, an articulated cutting jaw, rigid fin blades and compact rear boosters. Warm copper and restrained amber energy details distinguish working parts. Missile cost, cooldown, damage, movement and feeding contracts remain unchanged.

References inspected on2026-10-19:

- [Legacy Effects: Godzilla vs. Kong](https://www.legacyefx.com/godzillavskong): official design team/gallery for Mechagodzilla. The visible segmented construction, exposed frame and heavy plate separation inform the mechanical structure; they are not a license or a runtime asset.
- [ILM: Transformers: Age of Extinction](https://www.ilm.com/vfx/transformers-age-of-extinction/): official production page and making-of. Grimlock's predatory armored silhouette informs the head/jaw hierarchy. Applying these cues to a shark is our design interpretation, not a claim about the films' engineering.

Only the newly generated original shark reference is uploaded to the previously authorized Microsoft TRELLIS.2 Space. Film stills, project code, credentials and private service receipts are not uploaded. A concept image does not prove the exported geometry or in-game motion. Inspect actual material/clay surfaces, refit pivots and validate the real effects before delivery.

Evidence is preserved under `.local/mechanical_cinematic_20261019/`. Production and verification results follow when complete; the earlier1,324 tests belong to the prior candidate and are not this round's result.

## Actual production

A new original reference was generated, then extended to retain the complete dorsal tip and full silhouette. One HF generation/export used the previously authorized included Pro quota. Space/model revisions remain `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d` / `af44b45f2e35a493886929c6d786e563ec68364d`, with MIT tool licensing; that does not license the referenced film characters or guarantee output rights. Only the new original shark image was uploaded. Raw GLB SHA256: `d67ab23a55aa52029878124c6173b0607edb29c323e6f48b01193e51c4626fc9`. The complete4,888,388-byte export has98,479 vertices/95,610 triangles and was parsed and inspected from six directions with generated and neutral materials.

The exported mesh actually retains separated overlapping plates, exposed flank ribs/pistons, mechanical jaw/teeth, root bearings and two stacked rear booster housings. Small hydraulic/plate detail is softer than the reference; this is a reconstructed game asset, not the original concept rendered in the browser. The raw neutral centerline is already nearly symmetric and head points+Z. The new offline converter uses those measured axes; it does not borrow the previous asset's lateral tail correction. It narrows only the outboard wing span to the existing movement envelope, applies inverse-transpose normals, mirrors one complete half with interpolated seams and quantizes the result. Final main skin:62,492 vertices/48,438 triangles, zero degenerate normals; previous assets and conversion scripts remain intact.

`src/mechanical_shark_asset.js` refits the independent seven-support rig to the actual model. Rigid shoulder/head, narrow tail joint blends, complete caudal blade and full rigid pectoral boards use the existing animation clock. Both rear exhausts follow the second rear support; short canted nozzles and their plumes have coincident origins/orientations throughout motion. The short beveled rectangular launch collar fits the ventral jaw armor while preserving the original missile anchor. Missile trigger, homing, costs, cooldown, damage, normal swimming and growth are unchanged. Copper/amber emissive accents and warm rocket plumes replace the old blue constraint. No new lights, postprocessing passes or animation loops.

## Fresh verification

Evidence: `.local/mechanical_cinematic_20261019/`.

- `tests_full.log`:1,324/1,324 tests pass on the final runtime logic;30 related checks also pass. A subsequent JSON formatting-only change preserves the same decoded mesh. Final `check.log` and `build.log` pass; the existing large-bundle warning remains. Tests cover actual posed rigid boards and tail sections, symmetric seam weights,3/15/30m extremes, independent rigs, muzzle/feeding contracts, continuous sprint/turn/release and cleanup. The new geometry requires different physical joint coordinates; prior deformation bounds are preserved.
- `review.json` / `views/`:native Guide material/clay, both sides/front/underside, cruise/sprint/turn/pitch/release and shallow/deep-region inspection, plus real skill payment/flash, pause/Home and Chinese390px Guide. The requested15m staged position is constrained by the world to60m at that location; the screenshot's actual HUD is authoritative. No physical-phone or natural-progression claim.
- `film.json`:31-second actual-model before/after comparison with matched light/camera and one controlled loop after the normal Guide loop stops. `world_film.json`:16-second actual native movement and two real missile inputs, staged12m at100m depth, moving roughly317m; external observation view for10s, then ordinary follow camera. Invulnerability and staged position are labeled inspection fixtures. The combined H264 review contains these two scopes in that order; decoded output was inspected for missing frames/flicker.
- `lifecycle.json`:four Guide/game/sprint/fire/pause/Home cycles preserve candidate geometry/maps and separate skeletons. Guide stays13 geometries/7 textures; ecological world warm-up is326→384→385→385 geometries and195→211→211→211 textures. Failure of either texture leaves a complete opaque silver fallback with no partial material. No browser errors.
- `populated_resources.json`:same frozen517-entity Hawaii scene, same camera and composed renderer, calls72→72 and triangles335,874→331,410. This does not measure FPS, phone heat or power.

| Resource                          | Prior angular candidate | New cinematic candidate |
| --------------------------------- | ----------------------: | ----------------------: |
| Meshes including dormant effects  |                      14 |                      14 |
| Total triangles including effects |                  52,754 |                  50,522 |
| Geometry/material objects         |                    9 /8 |                    9 /8 |
| Main vertices                     |                  64,714 |                  62,492 |
| Texture uploads                   |                2 ×1024² |                2 ×1024² |
| WebP bytes                        |                 422,516 |                 587,900 |
| JS bytes                          |               6,507,580 |               6,444,438 |
| Local gzip9 JS bytes              |               2,815,900 |               2,808,245 |

Combined gzip-JS+WebP transfer increases157,729 bytes despite the lower geometry count. Both candidates retain approximately10.67MiB for their two texture uploads in each WebGL context that uses them. This quality tradeoff is not presented as a performance improvement.

## Delivery and remaining acceptance

The existing restricted preview is rebuilt at `https://saver-recorded-digit-could.trycloudflare.com/`, entry `index-OnHAmx0f.js`. `artifacts.json` verifies17 build/local/public runtime files byte-for-byte and11 denied source/private paths per origin. `public/report.json` verifies English desktop and Chinese390px touch-emulated Guide/start/sprint/ability/pause/Home, same-URL refresh, both new maps200 and absent production debug hooks; errors are empty. The old hard-surface textures no longer load in the runtime import graph. These are desktop Chrome results, not physical-phone tests.

Original DEV35213, restricted server35216, awake35218 and tunnel35419 identities remain unchanged. Existing manager `status`/`rebuild`/`stop` and original logs remain authoritative; previous runtime archive is retained. Quota receipts:2189.660437→2153.610829 included seconds,36.049608 consumed, zero overage; recheck before another request. No new HF generation retry, top-up, recurring job, other agent, gameplay change, version bump, commit or push. HEAD remains6b7cb70; formal main/Pages stays v0.11.12. User design acceptance is pending.

## Body-side booster follow-up — 2026-10-19

The user requests the boosters on the two body sides. This replaces the stacked-tail mounting described above; the silver/graphite cinematic design, original texture maps, missile anchor, swimming clock and all gameplay remain. No new HF inference, commit or push. The current AI agent works alone.

The offline converter smoothly contracts only the old upper/lower rear housings into the continuous tail coupling over normalized Z0.205–0.355. It preserves topology/UVs and transforms normals with the deformation's inverse transpose, leaving the head, body, fins and tail blade unchanged. This avoids cutting holes or leaving two inactive engine silhouettes. The actual raw export remains archived. Two new faceted housings with dark bands, copper fasteners, exhaust sleeves and load-bearing brackets mount to the rigid torso, behind the pectoral range. Exhausts lie at X±0.112/Y0.022/Z0.095 and cant slightly outward. Their matching plumes widen to the new outlets; both share the same support and orientation. The bilingual Guide now describes body-side boosters.

Fresh evidence is under `.local/mechanical_side_jets_20261019/`:

- `focused.log`:30/30 related tests pass; formatting and build pass. These replace the affected motion/geometry evidence, not the previous full-suite result. An initial indexed/non-indexed hardware merge error was corrected before final validation.
- `attachments.json`:four bracket attachment rays reach the actual body; embed depth0.024–0.032 normalized units. Across120 boost/turn/pitch frames the nearest sampled pectoral surface remains0.0177 units outside a conservative pod capsule. Rear brackets were raised to meet solid armor instead of the reconstructed flank gap. Existing extreme-pose and 3/15/30m bounds pass.
- `review.json`, `views/`, `film.json`:native material/clay, opposite sides/front/underside and motion views, pause/Home and narrow Guide; final16-second orbit/action recording uses the actual model with the native Guide loop stopped. `world_film.json` records actual sprint and two missile inputs, roughly317m displacement, staged12m/invulnerable start, then normal follow camera. The32-second combined video is H264, decoded and inspected. Desktop390px emulation is not a physical-phone measurement.
- `resources.json`:meshes14→14, total triangles50,522→50,874, geometry/material objects9/8→10/9. Main skin62,492 vertices/48,438 triangles and two shared1024² texture maps are retained; zero degenerate normals. `populated_resources.json`:same frozen517-entity scene, composed draws72→72 and triangles331,410→332,114. No frame-time, power or phone-performance claim.

The existing restricted preview serves `index-BZHDaXyd.js` at the same address. Final `artifacts.json` and `public/report.json` are the authority for runtime hashes, source restrictions, bilingual native flow and same-address reload; previous public receipts above retain their historical scope. Original service identities remain35213/35216/35218/35419. Source snapshots, prior assets and runtime archives are preserved. User appearance acceptance remains pending; formal main/Pages staysv0.11.12.

Final follow-up delivery checks pass:17 runtime files match dist/local/public byte-for-byte;11 private paths per origin are denied. English desktop and Chinese390px touch-emulated Guide/start/skill/pause/Home and same-URL reload pass on `index-BZHDaXyd.js`, with both maps200, no production hook and no observed browser errors. These results are current; the preceding cinematic full-suite/lifecycle evidence remains historical.

## Pale-blue plume follow-up — 2026-10-19

The user finds the side boosters' flames faint at level viewing angles and requests longer pale-blue fire. The current AI agent changes only the exhaust presentation, matching nozzle rings and bilingual appearance copy. Body mesh/maps, hardware positions, motion/ability rules and missile effects remain unchanged. No HF request, commit or push.

The previous surface-normal/view-angle opacity term almost erased the cone when seen from behind. The replacement uses view-space ray-to-axis distance for soft radial edges, including the near-parallel case. A pale-blue outer plume and shorter blue-white core share one merged geometry and one draw per jet. The full-boost outer span changes0.288→0.72 normalized lengths (2.5×); the shorter core, smooth tip fade, small flow variation and existing smoothed boost prevent a solid-edged bar and abrupt on/off. A first overly bright hard-edge trial was softened before delivery. Only the nozzle ring changes to cool blue; eyes/copper details and missile flash retain their accepted colors.

Fresh evidence `.local/mechanical_blue_plumes_20261019/`:30 affected tests, format/build, matched baseline/candidate level side and level rear, oblique cruise/boost/turn/release, native world sprint and two actual missile inputs, pause/Home, bilingual Guide and390px desktop emulation. The32-second review combines16 seconds of level-angle actual-model inspection (one controlled Guide loop) and16 seconds of actual world input/travel with a staged12m/invulnerable start. Main mesh and other characters are fingerprint-preserved. Narrow desktop checks do not prove physical-phone performance.

Isolated counts:14 meshes and10 geometries unchanged; total triangles50,874→51,074, materials9→10 for the shared blue nozzle material. The two original1024² maps remain unchanged; no new texture, light, render pass or animation loop. Longer plumes cover more transparent pixels, so unchanged draw count is not a claim of equal GPU cost or lower phone heat. Final same-scene boost and public receipts are retained alongside the videos.

The original restricted preview now serves `index-BYq5y7Zh.js` at the same URL. Runtime hashes, denied private paths, production-hook absence and same-URL reload are verified against this build in `artifacts.json` / `public/report.json`; previous sections retain historical scope. Original four services, source/worktree archives and formal main v0.11.12 remain unchanged. Candidate acceptance is pending.

Final active-boost scene comparison:517 entities, composed calls74→74 and triangles332,874→333,074; both candidates actually emit two plumes. World travel is approximately317m with two successful paid missile inputs. Decoded H264 samples include side-level and ordinary follow-camera views.

## Black-frame follow-up — 2026-10-19

The user accepts the pale-blue exhaust appearance but reports black rectangles/flashes on sprint. The preceding plume shader allowed interpolated `vT` to slightly exceed1, so `pow(1.-vT,.85)` could produce NaN. A few invalid channels in the actual HalfFloat/MSAA scene target then contaminated bloom and could black out the final frame. Clamp the fragment coordinate to0–1 and guard the fractional-power base. This is the only runtime change in this follow-up: plume shape/color/length, mesh/maps, hardware, motion, missile effects, postprocessing and gameplay are unchanged.

Fresh evidence is `.local/mechanical_boost_blackframe_20261019/`. The isolated160-angle float-target probe did not reproduce the fault; the actual full-game target did. `world_before.json` records40 frames with invalid HDR values among430 sampled frames (up to12 invalid channels), with complete black outputs captured. The same3/15/30m staged sprint/turn/pitch route after the fix (`world_after.json`) records497 frames with no invalid HDR values or full black outputs. Dark close-up armor pixels remain normal. These synchronous GPU readbacks diagnose rendering validity, not performance.

The permanent `scripts/verify_mechanical_boost_render.mjs` reproduces the route through native Chrome and real Space/A/W input, using dev-only position/size fixtures and preserving the actual renderer. High-quality regression passes495 frames with no nonfinite HDR values; Smooth390px regression passes606 final-output frames without full black flashes (Smooth bypasses the HDR target). Both have zero browser errors. The30 affected asset/motion/ability tests pass; format/build checks pass. Earlier full-suite/lifecycle results above remain historical.

Public `index-DApdMMsf.js` is served at the same restricted address. `public/report.json` records110 final-canvas samples each for English desktop and Chinese390px touch emulation during actual sprint input, no black frames or browser errors, both maps200, native Guide/start/skill/pause/Home, same-URL reload and no production debug hook. `artifacts.json` confirms17 runtime files byte-for-byte against build/local/public and11 denied private paths per origin. These are desktop Chrome checks, not physical-phone measurements. Original services35213/35216/35218/35419 remain. No HF request, commit, push or formal release; user replay of this correction is pending, and plume appearance approval does not automatically accept the complete redesign.

## Local checkpoint — 2026-10-19

The user requests a local commit of this reviewed Mechanical Shark work, then a separate Orca reflection investigation. All834 delivered source fingerprints and17 runtime artifacts match the last verified candidate before documentation-only acceptance notes. Retain the existing checks with their recorded scope. This supersedes earlier no-commit wording for the checkpoint; no push, main publication or version bump is requested. The next Orca fix remains uncommitted for review.
