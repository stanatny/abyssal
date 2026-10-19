# Hawaii submarine and attack-torpedo redraw — 2026-10-20

The user continues the remaining-Hawaii-element queue after local checkpoint `962da2a`. This candidate replaces the deep-sea submarine and its straight-running attack torpedo with actual Hugging Face meshes. The current AI agent works alone. The two candidates await individual visual acceptance and remain uncommitted/unpushed; formal main/Pages remains v0.11.13 / `110494c`.

## Scope and appearance

The submarine has an ivory upper pressure hull, navy lower shell, ochre conning tower, separate planes, antennae and a ducted stern. The torpedo shares this industrial palette with a narrower body and cruciform fins. The hull, tower, planes and ducts come from the generated mesh; some fine panel markings remain baked surface detail. Original source weathering is retained, rather than claiming every seam is separate geometry.

Each model has an independently rotating propeller fitted to the measured duct axis. The submarine's fitted indicator lamps respond to its existing lock-on state; a bounded 18-instance, 0.72-second ejection-water effect follows the actual launch direction from the hull surface toward the existing projectile spawn. The anchored submarine does not gain patrol movement. Transient bubbles are excluded from model framing bounds, avoiding an oversized invisible unit sphere shrinking the Guide preview.

`vehicle_models.js` and `submarine_defense.js` call the same shared factory used by the Guide. Hawaii and Atlantis instances receive the replacement; other regions retain their existing vehicle availability. Adult humans, contact mines, surface ships, all creatures, player models and previously accepted animations are outside this batch.

## Provenance and conversion

Two original concepts were generated locally, then submitted to the authenticated [Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2). Both actual inference/export jobs completed on attempt 1. Raw GLBs, concepts, stage receipts, source hashes, material/clay views and rejected test-fixture reports remain under ignored `.local/hawaii_submarine_20261020/`.

The run began at 2026-10-20 06:43 BJT. The quota receipt before generation was 2,261.391324 of 2,400 included seconds; the receipt after the second export was 2,172.487262 seconds, a measured decrease of 88.904062 seconds. Over-quota usage stayed zero; the returned reset was approximately 22:41:50 BJT. These are dated receipts, not a claim about the balance at a later time. Included quota and credit fallback are distinct in the [official ZeroGPU usage-tier documentation](https://huggingface.co/docs/hub/spaces-zerogpu#usage-tiers).

The repository conversion scripts simplify with normal/UV attributes, apply a rigid orientation and uniform length normalization, build a new 1024px UV atlas, transfer source HF colors, and pad texture islands. There is no runtime texture painting or nonuniform body stretching. Final yaw is 2.3573331812072444 radians for the submarine and 3.143822659679598 for the torpedo; measured duct offsets are retained in each asset's fittings metadata.

## Preserved interaction rules

The minimum player length, range, 2.2-second warning, 14-second cooldown, speed, lifetime, damage, six-projectile pool, nursery protection, terrain occlusion, straight trajectory and hit settlement are unchanged. The projectile still originates 11 metres along the original aim. Submarine capsule collision, three separate qualifying rams, diver release, population, scale and bilingual descriptions remain unchanged. Added defense calls only drive visual state and resets.

## Cost and lifetime

| Asset          | Old triangles / drawing objects | Candidate triangles / drawing objects |     Color map |
| -------------- | ------------------------------: | ------------------------------------: | ------------: |
| Submarine      |                     15,116 / 21 |                    16,610 / 4 maximum | 306,030 bytes |
| Attack torpedo |                        628 / 11 |                             3,670 / 2 | 142,304 bytes |

The submarine maximum includes the normally hidden 18-instance water burst; its idle geometry is 15,170 triangles across three drawing objects. The new body alone is 13,274 triangles; the torpedo body is 2,382. A family shares rigid geometry, material, texture and rotor geometry, with per-instance rotor/effect state. All three submarines and the six-slot torpedo pool reuse their respective assets. The Guide is a separate WebGL context and can still upload a shared JavaScript texture separately.

In three matched, paused, populated Hawaii views (517 ecological entities), total rendered calls changed 122→104, 168→147 and 119→101. Triangles changed 495,524→495,578, 582,358→593,782 and 423,636→423,690. These are scene render counters, not frame-time, physical-phone or thermal measurements. The torpedo's larger mesh and two new texture downloads are explicit costs.

A native isolated renderer test forced both maps to fail, confirmed vertex-color fallback, retried successfully, and released owners in sequence. The first owner's disposal kept shared assets alive; final disposal emitted each expected release once and returned geometry/texture counts to zero. Three Guide reopen cycles and nine regional transitions retained stable model/shared-resource identities. Pause froze rotor and projectile state. No new animation loop, timer or dynamic light is introduced by these models.

## Verification and delivery

Evidence includes:

- Same-camera before/after views, reverse/under/front views and gray material inspection for both assets.
- 24 targeted tests covering shared ownership, rigid bodies, correct bounds, world-space launch alignment, actual defense events and unchanged human/torpedo behavior.
- Native Guide reopen and Hawaii/Atlantis/Bermuda checks, actual Hawaii lock-on/launch recording, pause stability and texture failure/recovery.
- A staged stationary invulnerable adult and observer camera were used for the attack recording; the actual game clock and defense simulation ran unchanged. This is not a recording of natural progression.

Final build, production-resource and bilingual browser receipts are appended after completion. Technical checks do not replace the user's visual acceptance. The existing restricted preview is rebuilt in place, keeping service identities/logs and allowing only index.html/assets; no source, private generation inputs or development hooks are published.

### Final candidate receipts

- Formatting/check and all **1,437 tests passed** in this run. The four new regression tests are included in the 24 focused checks.
- Build succeeded; restricted preview entry is `index-B6ohX077.js`. All **58 artifacts / 33,046,936 bytes** match dist, local preview and the public URL byte for byte. Eleven forbidden paths per origin were denied; tunnel readiness and all four original service identities were verified.
- Four production-native cases passed: submarine/torpedo in English 1440px and Chinese 390px desktop touch emulation, including loaded-color Guide views, start/ability/pause/Home and same-URL refresh. No browser errors or failed resources; production debug hook is absent. The narrow viewport is not an actual phone test.
- All 976 baseline source inputs were audited: 971 remain byte-identical. The five existing-file changes are this batch's three entry documents and the vehicle/defense integration files. Other creatures, player colors, human repairs, ecology and gameplay-rule files are unchanged.
- Native/raw evidence and `final_fingerprints.json`, `source_preservation.json`, `native/report.json`, `lifecycle.json`, `scene_cost.json`, `public/report.json`, `artifacts.json` and encoded delivery media are retained in `.local/hawaii_submarine_20261020/`. H.264 delivery was fully decoded and inspected at front/rear/launch/flight frames.
- Services remain DEV35213/preview74197/awake74200/tunnel35419 on loopback5188/7188/20248. Logs and old runtime archive remain in `.local/mini_preview_20261007/`. Use its `manage.py status` and `manage.py rebuild`; stop only an explicitly selected owned service through `manage.py stop <name>`. No service was replaced or restarted.

The same temporary preview URL is recorded in the ignored delivery receipt. After user review, the next remaining vehicle batch is the three surface-ship models, followed by the contact mine; landmarks and decorative scene elements remain separately queued.

## Submarine palette follow-up — 2026-10-20

The user requests a more recognizable submarine color that still fits the water background, and asks whether the deep-water explosive will also be redrawn. The submarine now uses a restrained ochre material tint (`#d9b45f`), retaining dark lower plating and the original source-map wear, highlights and panel contrast. This is a material-only adjustment; there is no new HF request, texture rebake, mesh change or gameplay change. The attack torpedo retains its original palette.

Matched previous/current views were rendered with one model, camera and lighting, and checked in the actual Hawaii sea as well as the Guide. All three submarines use the tint and the same loaded texture; all six torpedo slots remain untinted. Four existing asset/resource regression tests pass in this follow-up; the previous 1,437-test suite remains historical rather than being rerun for a color field. Evidence is under `.local/submarine_palette_20261020/`.

The likely item meant by “depth charge” is the stationary spherical **Contact Mine**, with horns and a red warning light. Its internal legacy kind is `torpedo`, whereas the submarine projectile is `attack_torpedo`; there is no separate named depth-charge object in the current source/catalog. The mine is explicitly retained in the remaining redraw queue and prioritized next, ahead of the three surface ships. It has not been regenerated in this palette follow-up; retain its current contact behavior, 28 damage and warning semantics when producing that candidate.

The new palette remains uncommitted/unpushed and awaits visual review; preserve the previous candidate, services, gameplay, accepted animals and all generation receipts.

Palette build receipt: entry `index-6T6HuoRx.js`; all 58 runtime artifacts again match dist, loopback and public responses, and 11 forbidden paths per origin remain denied. Existing service identities are unchanged. Of 986 immediately preceding source inputs, 981 remain byte-identical; only the material module and four project documents differ. The mesh and color-map files, attack torpedo, creatures and human animation are untouched. Native production-language/refresh results are recorded in this follow-up's `public/report.json`; no extra whole-suite run is claimed.

## Local checkpoint authorization — 2026-10-20

The user requests “提交，下一批”. The submarine, attack torpedo and final ochre material pass are authorized for local commit; all986 source and58 build fingerprints match the delivered inputs before these acceptance notes. No push or formal release is requested. The next Contact Mine candidate remains subject to individual review and separate commit authorization.
