# Zombie Shark and companion: Hugging Face redraw

Current motion follow-up: [the2026-10-19 shark swimming review](shark_swimming_revision.md) supersedes earlier pectoral timing/turn direction and sprint-cadence descriptions below. Asset geometry and accepted appearance remain; earlier measurements retain their original scope.

## Accepted fin checkpoint — 2026-10-18

The user accepts the pectoral-motion correction and authorizes a local commit. All791 delivered source fingerprints and13 compiled files match before acceptance-only notes. Existing38 focused checks, motion footage and native/public receipts remain unchanged-input evidence; no push or release is requested. Further Mechanical Shark work must preserve this accepted asset and fully validate swimming before delivery.

## Pectoral fin motion follow-up — 2026-10-18

The user reports that the fins appear motionless while swimming. The accepted tail-aligned asset remains the visual reference. Actual outer-fin vertices already have full fin weights, but the old cruise rotation is only ±0.05 radians (2.86°), producing about0.0176 body lengths of vertical tip travel. Sprint previously sweeps the tips toward the head, and vertical steering has no fin response. Earlier tail-only motion acceptance did not establish readable pectoral movement.

The shared owner/companion/Guide rig now uses slow paired chest-fin lift and feathering, asymmetric turning, pitch response and a smooth rearward sprint tuck. The tail remains the main propulsion gesture. This is an expressive motion choice for the fictional Zombie Shark, not a claim of species-specific biological reconstruction. The seven-bone rig, geometry, textures, wounds, caudal fan and all gameplay remain unchanged. Fin pivots move from inside the trunk to the measured ventrolateral fin roots (X±0.10,Y−0.105,Z−0.105 in normalized body space). Moving them avoids pulling the attachment from the middle of the torso when increasing the visible excursion.

Over96 equally spaced fin phases in the supporting torso frame, left/right cruise tip travel is0.0608/0.0611 body lengths; sprint is0.0446/0.0448. Sprint sweeps rearward rather than toward the mouth. In the six isolated cruise/sprint/left/right/up/down samples, total width remains below0.58 body lengths; existing3/15/30m posed-vertex tests retain their size limits. Extreme combined turn/pitch/sprint inputs keep both distal surfaces outside the body. Existing continuous skin weights and UV duplicates remain unchanged. There are still29,346 triangles, one mesh/material, seven bones per instance and two shared textures; no additional draw, texture or vertex cost is introduced. Frame-rate or phone-heat gains are not claimed.

Fresh38 focused checks cover actual fin-tip displacement and rearward sweep, steering in the supporting torso frame, smooth input transitions, pause/reset/independent skeletons, tail symmetry and rigid fan, jaw/mouth/flank anchors,3–30m bounds, feeding and companion emergence/lifecycle. Previous full-suite results below retain their historical scope. Private evidence lives under `.local/zombie_fins_20261018/`: preserved before modules, `baseline.json`, `geometry_motion.json`, matched front/side/top Guide poses and `focused.log`. Native desktop Chrome checks pass front/side/top matched poses, a21-second continuous close-up recording, owner/companion movement through native controls, and pause/Home at1440px and390px. The close-up uses the actual Guide model/lighting with its normal render loop stopped before a single controlled camera/animation loop, preventing competing renders. Native game fixtures set length12m, a test position and invulnerability;390px is desktop emulation, not physical-phone evidence. `native.json`, `comparison.json`, `views/` and `fin_swim.mp4` retain these limits. Fresh formatting and production build pass. All13 runtime files match both the loopback and public restricted origin,11 private paths per origin are denied, and all four original process identities remain. Entry: `index-CA9sIxfM.js`; evidence: `artifacts.json` and `build.log`. Public native English1440px and Chinese390px Guide/start/summon/pause/Home plus same-address refresh pass with no observed browser errors or production hooks (`public/report.json`).

The new motion remains uncommitted/unpushed for review on `art/mechanical-hf-redraw`. Mechanical Shark reconstruction/export remains a separate blocked task; this correction uses the already delivered local Zombie Shark mesh and spends no HF quota.

## Accepted local checkpoint — 2026-10-18

The user authorizes a local commit of this reviewed redraw and tail correction. All790 final delivered source fingerprints match before these acceptance-only documentation edits. Prior candidate/no-commit labels retain their historical meaning. Verification below is existing unchanged-input evidence, not a new test run. No push, release or version bump is authorized. Subsequent Mechanical Shark work is separate and must preserve gameplay.

## Tail alignment correction — 2026-10-18

The user identifies an unnatural crooked tail while swimming. The initial reconstruction contains a large lateral bend: its neutral tail tip is at+0.144 body lengths, and the original animation leaves it on the same side throughout both cruise and sprint. The previous four axial stations also extend into the caudal fan, bending the two lobes differently. Earlier appearance/completeness checks did not detect this bind-pose problem.

The offline converter now straightens the measured posterior centerline using a continuous Hermite shear from Z0.05 onward, with the corresponding inverse-transpose normals. The head/mouth coordinates, wound detailing, texture bytes, indices and triangle count are preserved. Four axial joints now end at the peduncle (Z−0.04/0.10/0.23/0.315); the caudal fan follows one terminal bone. Existing effort smoothing and traveling lateral propulsion remain, with no changes to movement speeds, costs, combat or fission anchors.

Measured neutral tip X is now−0.000607 body lengths. Over128 equally spaced phases, cruise sweeps−0.0560 to+0.0549 and sprint−0.1024 to+0.1013, centered within0.00061 body lengths. Tail-fan pairwise distances remain constant through motion; the old maximum error was0.00429 body lengths. The body still uses29,346 triangles, one mesh, seven instance bones and the same two shared textures.

Fresh35 affected tests, formatting and production build pass. Added regressions check actual posterior cross sections, full-cycle signed movement and rigid caudal-fan distances, alongside existing jaw, seam, feeding, emergence and instance checks. Native Chrome examines matched rear/top/side views at four phases, records cruise/sprint with the real motion smoother, and confirms actual owner/companion use at1440/390px. These are desktop checks, not physical-phone results. Evidence: `.local/zombie_tail_20261018/`; the initial redraw measurements below retain their earlier input scope. The existing preview is rebuilt as `index-DT4PTjEr.js`; all13 runtime files match the loopback and public origins and11 private paths per origin remain denied. Fresh native public English desktop and Chinese390px start/summon/pause/Home flows and same-address refresh pass with no observed browser errors or production hooks; receipts are recorded in that folder. No commit or push is authorized.

## Scope and acceptance targets

Candidate dated 2026-10-18, based on main `8676fe95353565f212407186c2b4fbdd8415e2a4` / v0.11.12, on `art/zombie-hf-redraw`. The user explicitly requests the updated visual workflow and Hugging Face reconstruction. The current AI agent implements this alone. Leave the result uncommitted and unpushed for review; keep the published game and existing services unchanged.

Replace the actual shared player, companion and Ocean Guide model. Retain recognizable shark anatomy, a threatening skull, opaque torn muscle under exposed ribs, irregular skin wounds and damaged fins. Inspect physical geometry separately from color. Preserve the existing 3–30 m scale, mouth position, costs, minimum prey ceiling, formation, one-companion limit, two-second command protection, 60-second lifetime, lord eligibility, corpse-blast damage and sounds. Animation must keep the jaw, fins and tail attached through cruise, sprint, feeding and fission.

The accepted v0.11.12 Zombie Shark, the other playable characters and the current full-scene lighting are the comparison baseline. The new rendering must remain legible in the Guide, the populated ocean and narrow screens; neutral or isolated renders alone do not establish this.

## Provenance and reproducible conversion

An original transparent reference was generated with the built-in image-generation tool: horizontal undead shark, broad wedge-shaped skull, slate/teal skin, inset amber eyes, ivory teeth, ragged dark-maroon muscle beneath exposed ribs, irregular cheek/gill/flank/tail wounds, attached frayed fins and a vertical asymmetric tail. Neutral soft lighting, no effects, typography, environment or third-party character likeness. The image was identified to the user as a reference, not a game capture.

Only this generated image was uploaded to the explicitly requested [Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2). Standard local Hugging Face authentication stayed outside the repository and logs. Generation and GLB extraction completed in the same session. Existing free GPU quota decreased from218.299895 to184.871587 seconds; paid overage remained zero. No purchase or subscription was made. The Space and model identify MIT licensing; the upstream [license](https://github.com/microsoft/TRELLIS.2/blob/main/LICENSE) is retained with the provenance evidence. This is attribution to the production tool, not a guarantee about all generated outputs.

| Item                | Recorded value                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Space revision      | `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`                                                                       |
| Model               | `microsoft/TRELLIS.2-4B`                                                                                         |
| Model revision      | `af44b45f2e35a493886929c6d786e563ec68364d`                                                                       |
| Reference SHA256    | `44c7454bd1dd5965685f640b21cf352ee46b345a3a17d14c57d694de7bcef0d5`                                               |
| Original GLB SHA256 | `40867e59d0d6a8a643eea306c57a986a4856956453be6089e1e27aed10f655a2`                                               |
| Generation          | Seed284733,1024 resolution; sparse guidance7.5/rescale0.7/12steps/rescale-t5; shape7.5/0.5/12/3; texture1/0/12/3 |
| Export              | 100,000 target faces;1024 texture size; actual97,833 triangles                                                   |
| Reduction           | glTF-Transform4.5.1 + meshoptimizer1.3.0, weld then ratio0.3/error0.002                                          |

The portable `scripts/prepare_zombie_hf_asset.mjs` consumes the retained original GLB and a separate tools directory. Install `@gltf-transform/core@4.5.1`, `@gltf-transform/extensions@4.5.1`, `@gltf-transform/functions@4.5.1` and `meshoptimizer@1.3.0` only in that scratch directory. Run:

```sh
node scripts/prepare_zombie_hf_asset.mjs path/to/raw.glb path/to/tools
npx prettier --write src/assets/models/zombie_shark_mesh.json
```

The converter rotates the original +Z head to the game's −Z, preserves Y-up, normalizes length to0.99 and applies0.84 transverse scaling to retain the playable footprint. It packs position/UV into Uint16, normals into normalized Int16, and indices into Uint16; texture bytes are unchanged. A fresh conversion reproduces every geometry array and both texture files exactly. The runtime never contacts Hugging Face. Production contains only derived runtime assets; source references, service receipts and raw exports remain private evidence.

## Runtime implementation and tradeoffs

`zombie_shark_asset.js` reconstructs one shared indexed geometry and one opaque front-face material. Seven independent bones per instance drive four axial stations, the lower jaw and both pectoral fins. UV duplicates receive identical position-dependent weights, avoiding seam separation. Each owner/companion/Guide instance owns its skeleton and motion state. The mouth retains its nominal −0.45 position; flank fission anchors retain their previous positions and nearest-side selection. Tail motion travels rearward with existing effort smoothing; feeding opens actual jaw vertices rather than moving a disconnected prop.

The base-color texture uses sRGB; the roughness texture stays linear. Organic tissue remains nonmetallic. Two1024² WebP images are fetched once with five-second timeouts before initial shader preparation. Failed textures fall back to the same opaque relief geometry with a neutral material; the game still starts and plays. Shared textures/material/geometry live in the bounded existing avatar/Guide cache, and instance skeleton disposal never disposes shared assets.

| Per visible model                |                     Accepted baseline | Candidate |
| -------------------------------- | ------------------------------------: | --------: |
| Meshes / ordinary geometry draws |                                    11 |         1 |
| Triangles                        |                                33,242 |    29,346 |
| Materials                        |                                     6 |         1 |
| Shared geometry buffer bytes     | about4.87MB before final static merge | 1,761,466 |
| Texture images                   |                                     0 |  2 ×1024² |

This improves silhouette/material detail while reducing mesh and draw overhead. It is **not a universal memory or download reduction**: the two texture files total390,032 bytes and their uncompressed GPU mip chains cost about10.67MiB, plus decoded images. The packed geometry adds about559KB gzipped to the initial JS bundle. These costs are shared, not multiplied by summons. No bloom, lighting, ecology, collision rule, damage value or global quality setting changes.

## Verification and evidence

Private evidence is grouped under `.local/zombie_hf_20261018/`:

- `generation_receipt.json`, metadata, original reference/GLB, conversion script and reproduced arrays establish the actual service/export path. Earlier failed setup/license fetches did not run GPU inference.
- `raw_views/` and `reduced_views/` compare textured and neutral geometry from six directions. Reduced geometry retains the muzzle, teeth, gill relief, recessed muscles, ribs and fin silhouette. Their initial camera labels precede the axis correction: `front`/`rear` are the raw mesh's two sides; use the recorded camera vectors.
- `baseline_*` and `candidate_*` are matched native Guide captures. `baseline_model.mjs` preserves the exact prior model for comparison.
- Fresh58 focused checks cover finite posed vertices at3/15/30 m, independent instance motion, opaque wound ray hits, real recess depth, jaw/mouth displacement, UV seam weights, shared-asset disposal, companion emergence, feeding and corpse-blast behavior. Fresh full suite:1,302/1,302 pass.
- `companion/report.json`: native Chrome desktop Chinese1440px, English320px and Chinese390px pass real controls, early-command protection, pause, ordinary feeding, lord contact, repeat summoning and localized Guide. DEV contact fixtures are documented in the script; they do not prove unaided gameplay balance.
- `live/` contains actual Guide/ocean frames and recordings, shared-rig identity, repeated activation/expiry and deliberate texture-failure checks. Camera/scale/deadline fixtures are explicitly recorded. These are desktop rendering and touch-emulation checks, not physical-phone or heat measurements.

The first repeated-session check compared all world resource counters before every fish and effect had warmed up; it failed as previously unseen world resources loaded. That original failure is retained. The corrected check records the owner/companion geometry, material, both texture and skeleton identities across four summon/expiry/restart cycles. Those identities remain unchanged in all three sizes. Whole-world counts largely plateau but may still change as ordinary creatures enter view; this is not a claim that every world resource count is fixed.

`performance.json` uses native Chrome155.0.8059.80 on Apple M6/32GiB,1440×900 at DPR1/High,517 ordinary entities, a paused populated Hawaii scene and fixed side camera with owner plus companion. Each alternating baseline/candidate run warms15 frames then measures50 direct3D passes with WebGL GPU timers. Original body geometry, shader materials and actual per-instance shadow flags are matched. Both baseline runs use924 draws and1,232,420 triangles per pass; candidate uses894 draws and1,220,732 triangles. GPU medians are5.18/5.25ms versus4.59/4.57ms. CPU samples are noisy (baseline9.3/10.8ms, candidate8.0/10.6ms), so no CPU improvement claim is made. Within each run, geometry/texture counts stay356/251. This excludes simulation, composer and HUD and does **not** demonstrate full-game FPS, physical-phone performance or reduced heat. Initial cumulative-counter and shadow-flag instrumentation mismatches are archived and excluded from these results.

Fresh formatting and production build pass. The existing restricted preview serves entry `index-I9rrsT1H.js`. All13 runtime files, including both new WebP textures, match dist and both the loopback and Cloudflare origin byte-for-byte. Eleven private paths per origin are denied; original four process identities and tunnel readiness remain. Public native English desktop and Chinese390px controls pass start/summon/pause/Home in Hawaii, Penglai and Atlantis (six flows); both same-address reloads receive the candidate entry and both textures, with no observed console/page errors or production hooks. These checks are recorded separately in `public/report.json`. The supplied videos show actual Guide rendering and gameplay, with the disclosed camera/expiry fixtures; the shorter expiry exists only in the local recording script.

The result remains a review candidate. No release authorization is implied.
