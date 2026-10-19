# Hawaii Abyss Lords — Hugging Face redraw

Accepted for a local checkpoint on2026-10-19: the user requests committing this delivered four-lord/Kraken-intake state and moving on to Hawaii's other creatures. Earlier pending-acceptance/no-commit language below records its historical review stages. No push or formal release is requested.

## Scope and status

On 2026-10-19 the user requests the next redraw batch: all four Hawaii Abyss Lords, with online reference research and Hugging Face reconstruction. The current AI agent works independently on `art/hawaii-lords-hf-redraw`, from published v0.11.13 / `110494c`. This batch is **implemented and technically verified, awaiting individual user acceptance**. No commit, push or formal publication is authorized for this new work.

The actual Hawaii registry selects `kraken`, `mayan` (Gran Maja), `hydra` and `leviathan`. Their shared factory also serves Bermuda and Mariana; Kraken additionally appears in Atlantis. Preserve gameplay, ecology, body lengths, encounter timing, damage, rewards, existing player models, services and historical worktrees. Verify model-dependent contact and ability anchors in every affected shape.

## References and adaptation

- **Gran Maja:** [Borisao Blois, _Colosos — The Bloop vs El Gran Majá — La Batalla_](https://www.youtube.com/watch?v=hedUAqopPBg). YouTube's oEmbed response confirms the creator and title; the original thumbnail was inspected locally. [This illustrated fictional-creature reference](https://hetappi.info/fantasy/gran_maja.html) identifies the six eyes, broad head and elongated eel body and links the same original. This is a contemporary fictional creature, not Maya mythology. Preserve the six-eye, broad grinning jaw and gray serpentine identity; replace the repeated ring-like surface with irregular organic folds. Do not import another creator's model or texture.
- **Kraken:** [American Museum of Natural History](https://www.amnh.org/explore/ology/ology-cards/285-kraken?view=modal) describes the Scandinavian sea monster's flexible arms and beak, with giant squid as a possible inspiration. The game adaptation uses a heavy cephalopod mantle, eight muscular sucker-bearing arms and a recessed beak, distinguishable from the playable slender squid. Its existing grip mechanic remains authoritative.
- **Hydra:** [Acropolis Museum, the Hydra Pediment](https://www.theacropolismuseum.gr/en/hydra-pediment) documents a many-headed serpent in an archaic depiction of Herakles' fight. Keep the game's existing three independently animated heads and attack origins; three heads are a game adaptation, not a claim that all ancient depictions have three. Use connected muscular necks, layered throat scutes and clearly separated silhouettes.
- **Leviathan:** [British Museum, William Blake's 1826 engraving](https://www.britishmuseum.org/collection/image/991545001) documents Leviathan as the sea monster alongside Behemoth. The game's original interpretation uses a powerful armored sea-serpent silhouette, a substantial predatory skull, flippers and a tapering tail. Exact anatomy, palette and armor are artistic choices, not a reconstruction of one canonical historical design.

Original neutral studio reference renders are prepared with the built-in image tool, then submitted to **Microsoft TRELLIS.2 on Hugging Face** for actual 3D reconstruction and GLB export. Concept images are inputs, not evidence of the integrated model. Raw source material, generation receipts, meshes and render evidence stay in ignored `.local/hawaii_lords_20261019/`; runtime assets retain provenance in the repository.

## Baseline and quota

The source tree is clean at the starting revision. Matched native Chrome Guide views were saved for all four kinds with no page errors. Baseline model inventory (including the existing hidden Gran Maja contact proxy): Kraken 15 meshes / 34,396 triangles; Gran Maja 21 / 55,160; Hydra 20 / 34,944; Leviathan 9 / 29,344. These are asset costs, not frame-rate or device heat measurements.

Fresh HF preflight reports 2,153.610829 included GPU seconds remaining out of a 2,400-second allowance, with zero paid over-quota usage. Space revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d` and model revision `af44b45f2e35a493886929c6d786e563ec68364d` declare MIT. This license does not grant rights to third-party reference images. Use original input renders; keep generation and export reservations separate, recheck actual quota for each request, and stop for replenishment instead of using paid overage.

## Required delivery evidence

Inspect the exported meshes in neutral material and their actual texture, all sides and underneath. Correct disconnected layers, topology, rest-axis alignment and anatomy before rigging. Preserve continuous skin and identical weights across UV duplicates. Verify Kraken arm closure, Hydra's three independent heads, Gran Maja's connected tail wave and Leviathan's rear-body propulsion/fin trim. Measure deformed vertices, abrupt speed changes, pause and reset; independently owned skeletons must be released without disposing shared assets.

Review all four in the real Guide and populated game, including recovery, lock-on, actual strikes and ability origins. Check shared regional instances, bilingual Guide copy and narrow-screen readability. Record populated rendering/resource counts and repeated region/Guide lifecycle behavior; desktop emulation does not establish physical-phone performance or thermals. Only then rebuild the existing restricted preview and verify every served artifact against the reviewed build, denied source paths and absent production debug hooks. Keep user acceptance explicitly pending.

## Integrated candidate and mesh corrections

All four actual HF GLBs have been exported and integrated. Kraken's first reconstruction had short arms and was rejected; attempt02 is the runtime candidate. Other kinds use attempt01. Raw GLBs, original inputs, source hashes, Space/model revisions and generation/export receipts are retained under the ignored evidence directory. Runtime mesh JSON includes the raw GLB SHA-256. Final included quota is1,981.379982 of2,400 GPU seconds, paid overage0: this batch used172.230847 seconds, including the rejected Kraken. The returned replenishment time is2026-10-19T14:41:48.502Z; recheck before another batch rather than assuming a calendar-day reset.

| Kind      | Runtime skin triangles / vertices | Bones | Actual anatomy and motion                                                                                             |
| --------- | --------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| Kraken    | 28,000 /27,337                    | 41    | Eight continuous muscular arms, sucker surfaces, recessed beak; independently weighted arm waves and restrained grip  |
| Gran Maja | 27,998 /27,009                    | 9     | Six fitted eyes, broad jaw, irregular organic folds and connected eel-body tail wave                                  |
| Hydra     | 27,996 /30,914                    | 26    | Three separately articulated connected necks, registered mouth anchors, rear tail wave and asymmetric fitted flippers |
| Leviathan | 28,000 /28,752                    | 19    | Armored spine, substantial skull, six fitted fin branches and continuous tail propulsion                              |

The raw Maja's fixed sideways bend is straightened before binding, and Hydra's bind axis is aligned before animation. Leviathan's forward flippers are swept back and tucked to clear the existing Bermuda spires; terrain, navigation, nominal body lengths and encounter configuration are unchanged. Actual vertex/triangle tests cover UV-duplicate weights, branch-tip excursion, peak edge stretch, abrupt effort changes, pause/reset, independent skeleton ownership and idempotent disposal.

HF reconstruction includes thin inner skin walls. Exact surface intersection remains authoritative; registered solid sections fitted inside the visible torso/head fill the hollow interior for existing bite contact. Arm/neck/fin gaps remain open. The old Gran Maja compatibility proxy remains for legacy default contact. Bone-local triangle-block bounds accelerate the existing exact contact filter; filtered and brute-force contact agree. Recovery phases, damage, rewards, ecology and accepted player assets are unchanged.

### Normal repair found in the final recording review

The first native recordings exposed intermittent black HDR/bloom rectangles on Hydra and Leviathan. Recomputed normals after offline shape correction contained24 zero normals for Maja,38 for Hydra and50 for Leviathan. UV-coincident degenerate vertices now inherit the nearest valid surface normal offline. Positions, UVs, indices, appearance shader and world lighting remain unchanged. A regression requires every actual decoded normal to have squared length above0.99.

Matched Hydra attack/HDR probe: before repair183 of195 sampled scene renders contain non-finite half-float values; after repair0 of254. The failing recordings are retained under `hdr_before/`; final recordings are recreated after this correction. This is a geometry-normal repair, not a bloom reduction or masking of the effect.

## Fresh technical evidence and resource tradeoffs

Evidence is rooted at `.local/hawaii_lords_20261019/`:

- `full_test_final.log`:1,333/1,333 tests pass after final rig/body/contact/Leviathan-clearance changes. The subsequent normals-only repair has12/12 focused tests in `normals_test.log`; do not relabel the earlier full run as a later rerun.
- `review/<kind>/`: matched original/candidate views, neutral clay, side/front/reverse/top/underneath and follow perspective. `quality/<kind>_model.webm` shows actual integrated mesh animation, not the reference image.
- `native/report.json`: real populated-scene hunt/windup/attack/recovery, world displacement, frozen bones/state while paused, no page/console errors. These observer recordings stage an invulnerable30m player and move the encounter to open water for visibility; they are not natural progression, new mechanics or a physical-phone measurement.
- `quality/report.json`: three Guide/map cycles across Hawaii/Bermuda/Mariana/Atlantis. Each species reuses one geometry and texture, with independent Guide/world skeletons; disabled regional models detach. Warm Guide allocations remain11 geometries/10 textures in the last two cycles. All four texture-request failure cases retain opaque vertex-color geometry and no page errors.

All four skins add one1024×1024 WebP each, decoded/loaded once per kind. Geometry/texture/material assets are deliberately retained in bounded caches; instance skeletons are independently released. This is reuse, not a claim that every cached asset is freed at every menu transition. Four RGBA textures with mipmaps have a nominal21.33MiB combined upload footprint, excluding driver overhead and skeleton textures.

In the same paused populated Hawaii scene with517 entities, complete composer-frame rendering before→after is: Kraken1,465→1,451 calls and1,704,554→1,698,158 triangles; Maja1,461→1,458 and1,702,534→1,699,764; Hydra1,470→1,451 and1,705,102→1,698,154; Leviathan1,459→1,451 and1,699,502→1,698,158. These are paired model substitutions with the rest of the scene fixed, not FPS/phone heat claims. Guide-only mesh counts must not be substituted for these populated totals. The new textures, packed mesh download and skinning are real costs despite lower visible draw counts. Total build output rises from8,638,089 to13,414,048 bytes (+4,775,959); a whole-artifact local zlib estimate rises from4,823,911 to8,258,037 bytes (+3,434,126). This compression estimate is not a measured network transfer or loading time. All four mesh payloads are currently in the main bundle, so the download cost is not restricted to Hawaii.

## Delivery gate

The restricted preview is updated only after the final checks. Delivery must record the actual current entry bundle, every artifact's local/public SHA-256 match, source/private-path denial, absent production hooks, native English desktop and Chinese390px Guide/start/pause/Home plus same-address refresh. Narrow-screen touch emulation does not prove real-phone performance. The original four service identities remain authoritative in `.local/mini_preview_20261007/processes.json`; rebuild with `python3 .local/mini_preview_20261007/manage.py rebuild`, inspect with `status`, and stop only owned services with the recorded manager when explicitly needed. No new server, public Vite origin, credential exposure or main publication is involved.

Final formatting and build pass. The standard native Chrome browser suite passes29 checks with zero page/console errors (`browser_report.json`). Restricted runtime is rebuilt at the original address with21 artifacts and entry `index-fOM7B6z2.js`; `artifacts.json` confirms all21 files match locally and publicly,11 denied paths per origin and the original four process identities. Public interactive verification is recorded separately in `public/report.json`.

Public interactive review passes all eight cases (four lords × English1440px / Chinese390px), with all four texture responses200, no page/console errors, no production debug hook and successful same-address refresh. Existing formal main/Pages remains v0.11.13; no commit or push is performed. The local long-term redraw inventory is updated to pending user acceptance for these four kinds, separate from the already accepted player batch.

## Kraken intake and bite follow-up — 2026-10-19

The user requests a visible pull into the mouth and crushing bite. The prior HF mesh had a small static beak; its restrained arm motion did not clearly communicate the existing grapple. The earlier observer attack film also pinned the player's position each render, masking real suction. Those films demonstrate lord motion/ability graphics only, not player displacement.

Keep the accepted HF mantle, eight skinned arms and texture. Replace only the fixed oral patch with a compact recessed cavity and two independent hooked beaks. The cavity opens during the vortex, inward water ribbons connect the real mouth direction to the captured player, and the distal arms curl inward/upward. The actual grapple bite event triggers a fast close/hold/release. Escape immediately stops the intake stream without a false bite. Native gameplay owns player movement; the visual helper never writes position, health, stamina, timers or attack state. Existing1.5-second escape window,60 base damage and all contact/escape rules remain unchanged.

The transparent water is explicitly excluded from melee body contact; morphing solid mouth contact uses the rendered morphed vertices. New mouth geometry/materials are shared, while morph influences, jaws, flow buffers and clocks belong to each instance. Water uses128 bounded triangles and in-place buffer writes, with no light, texture, autonomous loop or new HF request. Reset, disorientation and defeat clear visual state; instance disposal releases transient flow resources exactly once. Guide appearance copy is synchronized in both languages.

Fresh follow-up evidence is in `.local/kraken_intake_20261019/`. Final verification and restricted-preview receipts are appended below after completion. No commit/push or formal publication is authorized. This follow-up remains pending user visual acceptance.

Final source checks:1,337/1,337 full-suite tests pass; focused integration verifies that the real grapple event starts the bite and that escape/cover do not synthesize one. All mouth closed/open normals are finite and unit length, actual beak tips separate and meet, water targets remain read-only, transparent streams cannot become melee targets, and transient resources dispose once. A stronger exploratory arm pose exceeded the existing1.5 edge-stretch bound (1.504); its amplitude was reduced, preserving the bound instead of weakening the test.

Native desktop Chrome captures exercise12m intake,30m body-constrained intake and a real Space-key escape. The player position is staged once and then owned by the normal movement/collision loop; only the observer camera is replaced for recording. Captured cases retain the1.5-second window and one60-point bite. The30m body stays about7m from the anchor instead of bypassing collision. Sprint escape retains100 health and produces no bite. Pause freezes mouth/flow state. These controlled tests do not establish natural progression or physical-phone performance.

Three repeated Guide/region cycles across Hawaii/Bermuda/Mariana/Atlantis reuse the skin/mouth caches with independent instance state; warm Guide memory stays8 geometries/5 textures. Texture failure still renders opaque vertex-color anatomy. The final Kraken is32,086 solid triangles plus128 active-stream triangles: +4,214 at maximum relative to the previous28,000-triangle HF candidate. There are three additional solid draws and one bounded active effect draw, no additional texture/light. In a paired517-entity composer scene, published Kraken→current candidate is1,469→1,458 calls and1,707,246→1,704,936 triangles; these counts are not FPS or thermal measurements.

Restricted preview is rebuilt as `index-vy-4IIjo.js` with21 artifacts, totaling13,419,647 bytes (+5,599 versus the previous four-lord candidate). Local/public SHA-256 matches all21;11 source/private paths per origin are denied. English1440px and Chinese390px public Guide/start/controls/pause/Home and same-address refresh pass, with no page/console errors or production debug hook. The original four process identities remain35213/35216/35218/35419. See `artifacts.json`, `public/report.json`, `build.log` and `verified_sources.json`; later changes are delivery notes only. The final encoded19.5-second review contains12m intake/bite,30m intake/bite and a successful12m sprint escape. Final gameplay recordings use no invulnerability and retain real movement; the shorter12m take avoids confusing the demonstration with later unrelated encounter damage. The observer view and staged start are explicitly inspection fixtures.

Shared formal Pages remains v0.11.13. New effects and the four-lord batch are uncommitted/unpushed, awaiting the user's review.
