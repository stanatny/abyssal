# Mechanical Shark: Hugging Face appearance and effects revision

Current motion follow-up: [the2026-10-19 shark swimming review](shark_swimming_revision.md) supersedes earlier pectoral timing/turn direction and sprint-cadence descriptions below. Asset geometry and accepted appearance remain; earlier measurements retain their original scope.

## Blue palette follow-up — 2026-10-19

The user finds the red/gold version unnatural and asks for a blue main color with a distinct sky-blue secondary color. This pass supersedes only the previous palette. Set the hull to deep cobalt `#1c4e9a` (metalness0.66, roughness0.38), and existing raised armor/turbines to sky blue `#78c9ec` (metalness0.72, roughness0.32). Their light/dark separation defines the armor surfaces; slightly broader highlights keep both colors readable. Retain dark intakes, steel servos/fasteners, cyan conduits and blue-white exhaust. The HF geometry, armor geometry, rig, animations, effects and gameplay are unchanged. Both-language Guide appearance copy follows the new colors. No new texture, light, mesh, loop, HF request or resource allocation is introduced.

Evidence belongs to `.local/mechanical_blue_20261019/`. Paired renders share the actual Guide lighting, camera and neutral pose. Native game checks use the existing desktop/390px touch-emulation fixture; that viewport does not constitute a physical-phone test. Earlier performance and lifecycle measurements retain their original scope and are not new results for this palette. Work remains uncommitted/unpushed on the same candidate branch; formal Pages and all original services remain.

Fresh validation:42 focused checks, formatting and build pass. Native desktop and390px touch-emulated game runs check20+20 torpedo cost, cruise/turn/pitch/boost, moving fins, pause and restart; the27-second actual-model film and screenshots show the new finish in motion. Source comparison in `invariants.json` proves that the runtime change is limited to the two material configurations/names and bilingual Guide copy. No new performance measurement or full-suite run is claimed.

The preserved restricted preview now serves `index-BWyCzfW9.js`; all13 runtime resources match `dist` on localhost and the public tunnel. Eleven private paths per origin are denied. Native public English1440px and Chinese390px Guide/start/fire/pause/Home flows, translated appearance copy, same-address reload and absent debug hook pass with no browser errors. Original processes35213/35216/35218/35419 remain. Receipts: `native.json`, `public/report.json`, `artifacts.json`, `final_fingerprints.json` and `delivery.json` under this pass's evidence directory. Earlier preview hashes below are historical.

## Red/gold palette follow-up — 2026-10-19

The user requests a brighter metal palette inspired by red/gold powered armor. The existing HF mesh and structural correction remain. Replace the body finish with crimson `#c51f34` (metalness0.68, roughness0.30) and raised armor/turbine metal with warm gold `#e6b65c` (metalness0.82, roughness0.28). Dark intake cavities, steel fasteners/servos, cyan conduits and blue-white propulsion remain. These are material properties on the existing physical surfaces; no camouflage, new texture, geometry, light, loop or HF generation is added. Guide appearance copy changes in both languages.

The immediately preceding graphite/silver palette is superseded; its structural, motion and lifecycle checks remain historical evidence for the unchanged implementation. New paired before/after renders use the same native Guide lights, camera and pose, changing only the two material configurations. Fresh actual-game and preview checks are recorded under `.local/mechanical_palette_20261019/`; this desktop run does not establish physical-phone appearance or thermal performance. No commit, push, formal release or version bump is authorized. Keep the accepted Zombie Shark checkpoint and all prior services/archives.

Fresh color-pass validation:42 focused checks, repository formatting and production build pass. The native Guide film covers cruise/boost/turn/pitch/feed/launch; desktop English and390px Chinese touch-emulated game checks cover actual20+20 firing cost, moving fins, stable pause and reset. Before/after views share the same lighting, pose and camera. Source fingerprints prove that this follow-up changes only two material configurations, their descriptive names and bilingual Guide copy; geometry, skinning, animation, gameplay and effect source remain byte-identical to the preceding structural candidate. Mesh/draw/texture topology is therefore unchanged; no new performance measurement is claimed. No full-suite rerun or physical-phone test is claimed.

Existing restricted preview now serves `index-Ch_vSEjF.js`. All13 runtime artifacts match the local build on localhost and the public URL;11 private paths per origin are denied. English1440px and Chinese390px Guide copy, start/fire/pause/Home, same-address refresh and absent production debug hook pass without browser errors. Existing process identities35213/35216/35218/35419 are unchanged. Receipts: `native.json`, `invariants.json`, `public/report.json`, `artifacts.json`, `final_fingerprints.json` and `delivery.json` in the palette evidence directory. This supersedes `index-J5I5MBAy.js` for the candidate only; formal Pages remains v0.11.12.

## Current mechanical-structure correction — 2026-10-19

The user found the black/white surface too similar to painted camouflage. Retain the HF body and already-verified swimming rig, but replace that finish with clean graphite metal and real titanium hardware. This pass uses the existing exported mesh; no new HF request, reference upload, quota use or bitmap edit is performed. The earlier textured candidate and its receipts below are historical, not current acceptance claims.

- Stop loading both generated color/metallic-roughness textures in the game. Original texture bytes remain available for provenance/rollback. The underlying HF mesh, weights, tail clock, chest-fin actions, mouth/muzzle, boost/launch effects, all mechanics and the accepted Zombie Shark remain byte-identical in their respective unchanged scope.
- Add eight separate fitted armor caps with visible bevel thickness, sixteen hex fasteners, two segmented turbine housings with solid spinning intake blades, three tail servo assemblies and two pectoral servo hubs. These are geometry, not painted seams. The rigid front attaches to the original hull bone; tail/fin hardware follows its own supporting bone. Two independent rotor meshes use the existing phase clock; no additional loop or dynamic light.
- `scripts/bake_mechanical_armor.mjs` samples the actual neutral HF mesh offline and fits smooth quadratic caps outside it. A source-mesh hash prevents stale placement. The initial direct-surface caps exaggerated reconstruction noise; smooth caps supersede them. Overlarge decorative tail rings were replaced by fitted side servo assemblies before delivery. No runtime ray fitting is added.
- Shared geometry and metal finishes are cached; each instance retains independent bones/rotors. Runtime remains self-contained even when the former Mechanical Shark texture URLs are blocked. Both-language appearance copy from the preceding pass already describes silver armor, graphite joints, cyan conduits and blue-white exhaust accurately.

Fresh validation for this correction:42 focused tests, formatting/build, same-angle before/after views, a27-second continuous motion capture, native desktop/390px touch-emulated game firing/turn/pitch/boost/pause/restart, and five Guide/start/Home cycles. Added regression coverage checks source-mesh binding, texture-free materials, hardware attachment frames, independent turbines, pause and reset. Shared geometry/material identities remain stable; whole-game ecology warm-up is not presented as a flat-memory test. Existing1,313 full-suite results below belong to the previous candidate, and are not re-claimed for this follow-up. Evidence: `.local/mechanical_structure_20261018/` (work began before midnight).

Matched populated render comparison uses the same scoped protocol described below: M6 mini32GiB, Chrome155,1440×900,DPR1,High,517 entities, one visible shark;15 warm-up and50 samples per baseline/candidate/baseline/candidate pass. The prior textured HF model has6 meshes/41,234 total triangles/5 geometries/6 materials; the new model has16/45,966/13/9. Whole-scene calls increase802→822 and triangles1,158,772→1,168,236. GPU p50 is4.441/4.679ms before and4.503/4.521ms after; p95 is4.692/4.884ms before and4.727/4.704ms after. CPU submit p50 varies4.5–12.4ms before and11.7–12.6ms after, with overlapping p95 ranges. This does not establish a CPU/FPS/heat improvement. Removed textures save398,196 current-load bytes and approximately10.67MiB mipmapped GPU texture storage per context; the107,825-byte source armor JSON adds geometry data to the JS bundle. Static geometry and draw overhead increase in exchange for physical detail. No physical-phone performance claim.

Candidate remains uncommitted/unpushed on `art/mechanical-hf-redraw`, based on accepted fin checkpoint `cb76194`. Preserve existing services and formal main/Pages v0.11.12. Final preview serves `index-J5I5MBAy.js`: all13 artifacts match the local build on both origins;11 private paths per origin are denied. English desktop and Chinese390px touch-emulated Guide/start/fire/pause/Home, same-URL refresh and absence of the production debug hook pass without browser errors. No old Mechanical Shark texture request occurs. Existing PIDs35213/35216/35218/35419 are preserved. Receipts are in this pass's `delivery.json`, `public/report.json` and `artifacts.json`.

## Pro resumption — 2026-10-18

After accepting the Zombie Shark fin correction (local commit `cb76194`), the user upgraded to HF Pro and explicitly requests new Mechanical Shark generation with careful swimming validation. Fresh authenticated preflight confirms `isPro:true`,2400 included seconds and zero overage. Reuse the previously approved original reference and service; no subscription purchase or credit top-up is performed by the agent. The new model must pass actual neutral geometry, head/tail orientation, centered rest tail, fin-root/appendage clearance, continuous cruise/boost/turn/pitch, pause/reset, real mouth/muzzle and bounded-resource checks before preview replacement. Preserve all accepted Zombie Shark files. Candidate work remains uncommitted/unpushed.

Private evidence: `.local/mechanical_hf_20261018/attempt_03/` records a preprocessed-image download timeout with unchanged quota; `attempt_04/` records completed generation/extraction followed by a truncated GLB download. Recovery retries extraction from the existing generated state and uses a resumable, GLB-length-validated download. Recovery succeeded: the actual GLB is saved, inspected, reduced and integrated. See the completed candidate below. Earlier export-blocker notes describe the pre-Pro attempt only.

## Integrated Pro candidate — 2026-10-18

The actual reconstructed armor mesh replaces the procedural Mechanical Shark in the shared game/Guide factory. Silver titanium plates and graphite joints retain the generated PBR surface. Cyan optical elements and fitted energy seams, two blue-white boost plumes and a short ventral launch flash provide the technological accents. No extra dynamic lights or animation loop were added. The body is opaque; only bounded boost/launch effects use additive blending.

The original reference is more polished and uniformly silver than the reconstruction: the delivered asset has darker, weathered plate seams and partly inferred unseen surfaces. Raw neutral and textured views show actual raised plating, recessed gills, teeth, two turbine pods, chest-fin attachments and the caudal hinge. These are mesh features, not only painted detail. The small original red optical pixels are recolored cyan in the material shader. The existing gameplay mouth and central ventral launcher anchors remain unchanged; a fitted steel collar makes the functional launcher visible.

### Export, conversion and provenance

- Actual GLB: 4,762,596 bytes, SHA256 `da9b9d3bab9e8bf910db895d120b96c84acfe8ab40217b3ed0380e5efbbc6a37`; raw 99,523 vertices / 98,152 triangles.
- Account upgrade was performed by the user. Authenticated included quota fell from 2400 to 2347.488413 seconds: 52.511587 seconds total, zero paid overage. This includes extraction recovery; no second image generation was needed after the truncated download.
- Same approved original reference, seed425719,1024 reconstruction,12 sampling steps per stage;100k export simplification,1024 textures. Space/model revisions and licenses are recorded below. The MIT attribution identifies the production tool, not a guarantee about all generated outputs.
- `scripts/prepare_mechanical_hf_asset.mjs` uses isolated `@gltf-transform/*`4.5.1 and `meshoptimizer`1.3.0. It welds/simplifies at ratio0.3/error0.004, rotates +Z head to −Z and normalizes length to0.99 using uniform scale. It does not reuse Zombie Shark's corrective tail curve or squeeze the mechanical body's width.
- All geometry arrays and both unmodified WebP textures reproduce from the saved GLB. Prettier-normalized mesh JSON reproduces byte for byte. Runtime has no Hugging Face dependency or request.

```sh
node scripts/prepare_mechanical_hf_asset.mjs raw.glb isolated-tools-dir output-dir
npx prettier --stdin-filepath src/assets/models/mechanical_shark_mesh.json < output-dir/mechanical_shark_mesh.json > normalized.json
# After installing those assets in src/assets/models:
node scripts/bake_mechanical_conduits.mjs
npx prettier --write src/assets/models/mechanical_shark_conduits.json
```

| Runtime asset                 |     Bytes | SHA256                                                             |
| ----------------------------- | --------: | ------------------------------------------------------------------ |
| mechanical_shark_mesh.json    | 1,417,648 | `682de7fd9f03edc538640d99cae831a0358745238d1af9f9d90ee6b45922f557` |
| mechanical_shark_color.webp   |   317,564 | `4b7ba008ec6845901b81f3c5e8ff29ee688a7758c2e175761d218e9eb05e29ed` |
| mechanical_shark_surface.webp |    80,632 | `5fb1f91409014301da6916a7eed461d2927b3c66e0af35e3cc4e99f63f49989a` |

The fitted energy paths are baked offline by `scripts/bake_mechanical_conduits.mjs` and bound to the canonical source-mesh hash. An initial implementation performed dense ray fitting when first creating the model; this was removed before delivery. Every resulting energy position/normal/UV/index byte is identical. Single-process local Node construction measured about1,888ms before and41ms after; this is an initial-construction check, not a phone benchmark. The baked path data adds23,603 bytes of source JSON inside the bundle and avoids runtime surface raycasts. Both-language Guide appearance text now describes the actual silver/graphite/cyan model and blue-white plumes.

### Swimming and attachment checks

The rigid armored front/pods remain stable while a continuous posterior tail wave drives swimming. The complete caudal fan follows one terminal joint, avoiding a folded or permanently crooked upper/lower tail. Separate chest-fin pivots sit at the actual roots: both fins sweep during cruise, tuck rearward during boost, and respond differentially to turn/pitch input. Jaw movement uses its own bounded weight field and preserves the ventral launcher. A single existing smoothed character clock drives the seven independent bones.

`tests/mechanical_hf_asset.test.js` covers normalized weights, UV-seam agreement, straight actual tail cross-sections, both sides of the tail cycle, rigid caudal fan proportions, visible fin-tip movement under cruise/boost, rearward sprint tuck, turn/pitch response, jaw vertices, every posed vertex at3/15/30m, frame continuity, pause/reset and independent-instance disposal. Source geometry is immutable/shared; skeletons and plume/flash materials are per-instance.

Fresh focused tests:41/41. Fresh full suite:1,313/1,313. Formatting/build pass; the existing large-bundle warning remains. Native Chrome155 checks cover desktop English and390px Chinese touch emulation, actual skill activation, exact20+20 payment, full swim inputs, pause stability, cached-avatar restart and reset of launch/torpedoes. No gameplay rule files changed. These are M6 mini checks, not a physical-phone or M4 heat test.

The27-second video uses the actual Guide model/lighting with the Guide's normal loop stopped and one controlled continuous capture loop. It shows cruise, boost, turns, pitch, feeding and launch; it is a model-motion inspection, not a natural game run. Native game screenshots use the ordinary follow camera and controls with explicit development length/position/invulnerability fixtures. Final H264 frames were decoded and inspected.

### Resource and render cost

| Measure                                     | Previous procedural model | HF candidate |
| ------------------------------------------- | ------------------------: | -----------: |
| Meshes (including dormant effects)          |                        33 |            6 |
| Total triangles (including dormant effects) |                    38,444 |       41,234 |
| Geometry objects                            |                        29 |            5 |
| Materials                                   |                         8 |            6 |
| Body triangles                              |                         — |       36,858 |

The body exceeds the initial roughly30k target to retain the joint and armor relief. Total triangles increase7.3%; draw objects fall substantially. Two shared1024² textures add398,196 download bytes and about10.67MiB GPU storage including mipmaps per WebGL context, plus geometry/bone resources. Guide and game use separate WebGL contexts, so JavaScript sharing does not imply one GPU upload across both. Compiled JavaScript grows from3,373,832 to4,805,552 bytes; deterministic local gzip grows from1,399,879 to2,173,788 bytes. Together with the two textures, the approximate additional compressed first-load payload is1.17MB. The existing large-chunk warning is retained.

Matched native render comparison: Apple M6 mini /32GiB, Chrome155.0.8059.80,1440×900,DPR1,High,517 Hawaii entities, one visible shark. Paused direct3D passes with identical fixed camera and lights,15 warm-up frames then50 GPU-timed samples for baseline → candidate → baseline → candidate. This excludes the composer, simulation and HUD. Calls fall759→703; rendered triangles rise1,096,158→1,102,858. GPU p50: baseline4.523/4.526ms, candidate4.416/4.439ms; GPU p95: baseline4.799/4.772ms, candidate4.782/4.704ms. CPU submit p50 varied8.7–11ms baseline and11.4–11.5ms candidate; p95 varied14.8–15.8ms versus15.9–16.6ms. There is no demonstrated CPU, whole-game FPS or thermal improvement. Animation-only measurements are below0.005ms at p95 in these batched desktop measurements; that is not an entire frame cost.

Five native Guide/start/pause/Home cycles retain identical Mechanical Shark geometry, materials and skeleton objects. Guide renderer counts stay16 geometries/6 textures. Game-wide renderer counts increase as unrelated random ecology warms up; the first overly broad flat-count assertion is preserved in `lifecycle_initial.json`, and is not represented as a pass. Candidate-owned identities and shared/independent contracts are checked separately in `lifecycle.json`. This verifies bounded Mechanical Shark reuse, not a complete global memory audit. Forced failure of both textures still starts with an opaque complete mesh; subsequent restarts make no retry allocations. Unit disposal checks release each local effect material/skeleton once without invalidating another instance.

Final restricted-preview verification: existing URL serves `index-DUBOK2I-.js`. All15 runtime resources match the local build byte for byte on localhost and the public tunnel;11 private/source paths are denied on each origin. Native English desktop and Chinese390px touch-emulated Guide/start/fire/pause/Home flows pass, both textures load successfully after same-URL refresh, no browser error occurs and the production debug hook is absent. Original service PIDs35213/35216/35218/35419 remain unchanged. Final code passes1,313 tests, including the source-mesh binding check added for the baked paths; final formatting/build also pass. New model work remains uncommitted for user review, and formal main/Pages remains v0.11.12.

The geometry-identical offline bake supersedes runtime surface fitting. Existing model film/render measurements remain valid for unchanged geometry, materials, motion and draw cost; fresh full tests and production-browser/artifact checks cover the final loading path. Use `.local/mini_preview_20261007/manage.py status` to inspect the preserved services and `rebuild` to rebuild the same restricted origin. Stop methods remain documented there and are not invoked by this task.

Private evidence directory: `.local/mechanical_hf_20261018/`. It contains actual raw GLB, raw material/clay views, comparison stills, conversion/reproduction receipts, focused/full/check/build logs, `native.json`, `film.json`, `performance.json`, `lifecycle.json`, and delivery/public receipts. Private authentication/session/download files stay ignored and must not be attached or copied into the repository.

## Accepted preparation checkpoint — 2026-10-18

The user authorizes a local commit of this design and blocker record after the reference was presented. This commits preparation only, not a finished asset: no GLB exists and no Mechanical Shark runtime source has changed. A fresh quota read still returns169.924763 included seconds and zero paid overage. Formatting and diff checks cover this documentation-only checkpoint; no game tests or HF inference were rerun. Future implementation remains pending and uncommitted for review. No push or formal release is authorized.

## Scope — 2026-10-18

After local Zombie Shark checkpoint `eadedd4`, the current AI agent independently develops `art/mechanical-hf-redraw`. The user requests a Hugging Face redraw with a striking technological appearance, explicitly preserving mechanisms. Keep this new work uncommitted and unpushed for review; main/Pages remains v0.11.12. Preserve current services, archives and canceled worktrees.

Use an original generated reference, then Microsoft TRELLIS.2 reconstruction/export. The input is original reference art, not repository source. Inspect actual geometry in neutral and textured views before integration. Target silver ceramic/titanium armor with graphite joints, blue energy conduits, coherent jaw/fin/tail connections, twin propulsion outlets and a visible ventral launcher. Fit a straight rest pose and inspect full cruise/sprint transitions, especially the caudal fan. Preserve the preceding accepted Zombie Shark asset and tail correction.

The existing Mechanical Shark is the functional comparison; the accepted Hugging Face Zombie Shark establishes comparable surface detail. Current model measurements and original captures are under ignored `.local/mechanical_hf_20261018/`. Target roughly30,000 body triangles, shared bounded textures/materials, independent pose/effect state and no extra loop or dynamic light. Download and GPU-memory increases must be disclosed. Match baseline/populated render measurements rather than claiming phone performance from a narrow desktop window.

## Invariants

Preserve growth/physical length, 3/15m regional starts,32m/s sprint, actual mouth and ventral muzzle anchors, feeding/targeting/occlusion,20health+20stamina payment,2-second active-time cooldown,140range/70speed/14blast radius, two-hit ordinary giant rules, lord25m gate/validated hits, armor, rewards and existing sounds. Visual effects may reinforce acceleration, launch and impact but must never imply a different damage radius or change combat settlement. Retain both locales, Guide/world factory, reduced-motion behavior, pause/reset/disposal and texture-failure fallback.

## Evidence status

The Pro candidate is integrated locally, with fresh evidence below. Earlier free-quota preparation notes are historical. No new commit or push is authorized for this candidate.

## Export blocker — 2026-10-18

The original reference was generated with the built-in image tool and uploaded only to the requested Microsoft TRELLIS.2 Space. Current Space revision is `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; model revision is `af44b45f2e35a493886929c6d786e563ec68364d`, both identifying MIT licensing. Reference SHA256: `762d3787ff6c67e41b583b91a75e18ade59b5039f2b3f4ebb7f7fab0f613daa8`. Generation used seed425719,1024 resolution and12 sampling steps per stage; preprocessing and model-generation preview completed.

GLB extraction was refused by the hosted service: “120s requested vs.170s left.” The quota API reported184.871587 seconds before generation and169.924763 afterward, with zero paid overage. The exact mismatch between the displayed request and remaining quota is not resolved; do not claim that the remaining number guarantees export. The reported included-quota reset is2026-10-19 at13:48:31 Asia/Shanghai. No subscription, top-up, alternate identity or repeated generation was attempted. Official references: [Space](https://huggingface.co/spaces/microsoft/TRELLIS.2), [ZeroGPU quota rules](https://huggingface.co/docs/hub/spaces-zerogpu#usage-tiers), [quota API](https://huggingface.co/docs/huggingface_hub/main/guides/manage-spaces#track-your-zerogpu-quota).

There is no downloaded GLB and no new runtime asset or effect integration. The saved multi-angle generation preview is not a substitute for a mesh. The generation client has ended, so do not assume server-side intermediate state survives; a future attempt may require a fresh generation after checking sufficient included quota. Preserve the current original reference, receipts and failed attempt. A separate next-attempt script raises its preflight quota floor to cover the observed reservation failure and remains unexecuted.

Baseline native Guide views were captured before any production code edits:33 meshes,38,444 triangles,29 geometry objects and8 materials, with no observed browser error. These establish the old appearance only, not candidate acceptance. The existing game source, mechanisms, effects, preview artifacts and services remain unchanged. No new model, motion, performance or gameplay test result is claimed. Current delivery status and evidence are under `.local/mechanical_hf_20261018/`.
