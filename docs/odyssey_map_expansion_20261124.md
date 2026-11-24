# Odyssean Sea expansion — 2026-11-24

Local-checkpoint update — 2026-11-24: the player now authorizes a local commit of this delivered candidate, followed by a separate four-wind/four-lord design proposal. This supersedes the historical no-commit status below for the expansion only. No source behavior, preview runtime, main publication or version changes are added by this checkpoint. All 1,595 production/script hashes and 1,003 build hashes match the delivered fingerprint before committing; prior native/build evidence therefore retains its recorded unchanged-input scope. The proposed trial is not implemented.

Status: implemented local review candidate, based on v0.11.32 / `48355ee`, branch `feat/odyssey-map-expansion`. This isolated worktree excludes the uncommitted Amazon candidate; its source, artifacts and live preview stay intact. No commit, push or release is authorized.

## Production contract

Expand the existing Greek myth sea road, retaining Troy and the nursery, accepted HF creatures, coast, gates, galley, crags and memorials. Amber shallows lead through the Nereid garden, a broken-galley shelf, Scylla's western cliffs and Charybdis's deep eastern basin. Preserve the existing exploration/chase/lord music, shared food, growth, combat, respawn and three-lord/30m victory rules.

Target bounds: X ±680, Z −2320…180, depth bound1230 world metres (displayed depth remains ×4). Bounding footprint becomes1.86× the current960×1900. Real wet area and achieved depth must be measured separately. Keep the old northern footprint and nursery terrain exact. Expand offshore routes smoothly, with large separated lord basins and recognizable fitted landmarks throughout both sides. Do not scale creature models or architecture to fake larger space. Use the same authoritative terrain for rendered floor, physical movement, ecology and decoration support.

Retain the entire current ordinary roster (including the later Black Sea Nettle), existing nursery animals and small-food access. Target no reduction in ordinary stock per measured wet area. Append genuine schools and independent medium/large meals throughout expanded routes and at the three battle outskirts. Preserve one adult-retaliating Ceto per lord and legal escape/feeding space. Verify spawn, normal moving capture and normal respawn, not just inventory totals. Shared nutrition and survival formulas remain untouched; budget estimates for3/6/10/16/25/30m do not substitute for natural whole-round pacing.

Use parallel straight ocean-current lanes with different depths and directions, including short returns, outside physical coast/ruins and clear of nursery/lord centres. Visual ribbon, minimap and real current force must consume the same paths. No changes to shared acceleration, timing or movement. Check full current width/body clearance and actual input-driven rides and exits.

Reuse accepted locally shipped HF environment assets with their source textures, proper full-footprint ground fit, bounded batching/LOD and existing disposal. Retain continuous shoulders, retreats and at least65m adult turning water; verify whole-body motion with full final solids. Do not create promised accessible interiors unless actual collider/floor traversal succeeds.

## Ownership and verification

The session model GPT6AstraUltra is the integration owner. Same-model audit agents are read-only until assigned exact file ownership. Owner controls config, integration, builds, native browser evidence, previews and delivery. All changes are unstaged. Task evidence is ignored `.local/odyssey_redesign_20261124/` in the parent project; task scripts may live in this worktree's ignored `.local/`.

Initial slice: expanded garden/galley transition with actual food, fitted accepted HF gate and a traversable adult route. Then populate side roads and deep basins. Relevant tests cover terrain/render agreement, current clearance, stock/food, lord space, actual collisions and lifecycle. Compare serial headed populated High/Smooth baseline/candidate views on this host, with resolution, seed, frame distribution, CPU, draws/triangles and resources recorded. Do not claim physical-phone heat, power or natural whole-round completion from desktop samples.

Deliver a restricted source-matched independent preview, verified local/public runtime artifacts and native en/zh-CN startup, pause, restart/map switching and affected gameplay. Preserve the Amazon preview. Include actual gameplay near/wide evidence with staged placements explicitly identified. Update current project records with measured results and honest limits.

## Implemented result

The real seabed is transformed once from the preceding accepted terrain. The northern nursery at Z ≥ −200 and its 144 ordinary residents retain exact coordinates and terrain. Offshore width increases smoothly by up to 40%, the southern route length by 40%, and the deep floor receives up to 230 m additional depth. Shared physics, model sizes, architecture dimensions, food returns, growth, combat and victory rules are unchanged.

| Measurement                                   | Previous candidate | This candidate |
| --------------------------------------------- | -----------------: | -------------: |
| Bounding footprint                            |       1,824,000 m² |   3,400,000 m² |
| Wet footprint, 10 m grid at floor below −15 m |       1,524,700 m² |   2,770,000 m² |
| Deepest sampled floor                         |           939.41 m |     1,168.30 m |
| Ordinary animals / species                    |           329 / 22 |       662 / 22 |
| Rare animals                                  |                  1 |              1 |
| Ordinary stock per sampled wet area           |              1.00× |         1.108× |
| Amphora patches                               |                  6 |             10 |
| Deep crag / memorial props                    |                  8 |             12 |

The preceding stock includes the six later-added Black Sea Nettles; older documentation that counted 323 animals and 21 species is not the implementation baseline. The complete pre-change ecological configuration is retained as an independent test fixture. New stock includes 260 schooling animals and 73 independent residents, predators and larger meals. Both sides and deep routes receive food. Each lord retains one Ceto, medium hunters and three adult meals on its outskirts. Model geometry, source textures and individual biological sizes are preserved.

The Nereid garden and gate lead into the galley shelf, the western Scylla cliffs and the eastern Charybdis basin. Original HF gates and the 90 m galley are relocated with full-footprint floor fitting. Accepted HF reefs, sponges, amphorae and deep props populate the expansion. The deep floor is split into cullable tiles while retaining its authoritative terrain and collision support. A stale shallow-only HF retry condition was corrected: a failed first load can now recover while already in deep water, using the existing retry delay and disposal rules.

| Lord      | Home X / Z     | Physical home Y | Territory radius |
| --------- | -------------- | --------------: | ---------------: |
| Karkinos  | 261.383 / −795 |        −360.427 |            150 m |
| Scylla    | −280 / −1558   |        −800.750 |            170 m |
| Charybdis | 266 / −1922    |       −1023.825 |            180 m |

Territories, home positions and depth limits derive from one habitat definition. Existing attack states and idle patrol caps are retained; territory radius does not imply a matching idle orbit.

| Straight current          |    X |    Y | Start Z → end Z |
| ------------------------- | ---: | ---: | --------------- |
| Southern outward route    |  180 |  −24 | −65 → −2220     |
| Northern return           | −260 | −130 | −2180 → −550    |
| Western deep route        |  −80 | −430 | −1100 → −1770   |
| Short eastern deep return |  440 | −760 | −2170 → −1720   |

All four currents use the same 129-sample route contract for visible ribbons, radar and real force. Shared 72 m/s travel speed, 14 m current radius and 2 s re-entry cooldown are unchanged. The other seven regions' route outputs match the baseline. The outbound X position was moved from the initial 140 m proposal to 180 m after checking real nursery-cover clearance.

## Verification and practical limits

Relevant terrain, ecology, ruins, loading, current, lord and shared-system checks pass. The integrated run contains 59 passing checks; the separately added deep-load retry is covered by a six-check expansion run. The shared suite initially had one obsolete 329-stock assertion (42/43); after synchronizing it to the independently verified 662 stock, all eight checks in that affected file pass. Other initial failures asserted old prop counts or lord coordinates and are retained in the raw evidence. These overlapping runs must not be summed as unique tests. Production build and changed-file formatting are checked separately.

Actual populated game checks, with only initial actor position/size and damage protection staged:

- Four native current rides each exceed 80 m and release through normal directional input. The initial driver forgot the shared two-second re-entry cooldown; the corrected run waits for actual current entry.
- Four supported 30 m characters traverse the garden gate out and back with normal input: eight successful legs, each exceeding 75 m.
- A moving new deep Hippocampus is eaten, ordinary nutrition is received, normal replenishment restores stock, and pause freezes active time.
- Each of the three lords reaches native windup/attack states. Two Hawaii–Odyssey switches restore the full 663 ordinary-plus-rare stock.

The combined driver completed currents, traversal and food checks before a fixture field-name error in lord lookup. The corrected separate lord/lifecycle run passes. Both raw logs are preserved; no failed run is represented as a complete pass. These controlled checks are not an unassisted whole-round growth, survival or three-lord victory demonstration.

Matched visible Chrome 158 / Apple M6 Metal samples used 1280×800, device DPR 1, High renderer DPR 1 and Smooth 0.8, three seconds of warm-up and six seconds per scene. All six baseline/candidate comparisons have a 16.7 ms median and roughly 18.0–18.3 ms p95, with no frame above 33.4 ms. Candidate main-thread task time is about 5–15% higher in corresponding samples. Nursery/garden draw calls rise substantially with the denser scene. Resources were still allocating during both sample sets, so steady-state memory, sustained thermals, power and physical-phone performance are not established. No performance improvement is claimed. Existing exploration/chase/lord audio is reused; this task does not constitute a new listening acceptance of all arrangements.

The map comparison image is derived from actual terrain, sites, populations and current routes, not a gameplay frame. Near/deep screenshots are actual running game captures with staged initial observation positions. They retain normal AI and geometry.

## Evidence and delivery

The candidate is isolated on `feat/odyssey-map-expansion`, based on formal v0.11.32 / `48355ee`. It excludes the delivered uncommitted Amazon redesign. No commit, push, main merge, version bump or formal Pages deployment is part of this task.

Candidate artifact fingerprint: `66a3fb303f4debc108d1e8133d7baa42b99e129a7e46ef632091e65ebbae7a52`, covering 1,003 built files. Source hashes and runtime identity are stored in the worktree's ignored `.local/review/candidate_fingerprints.json`. Actual native records are under `.local/review/native/`, `.local/review/native_lords/` and `.local/review/slice.json`; raw test/build logs and the generated map image share that directory. Parent-project `.local/odyssey_redesign_20261124/` retains the baseline/candidate performance comparison, model-switch receipt, isolated preview service records and final delivery receipt.

The independent preview is verified and remains live. Exact link, process identities, source/artifact hashes, validation times and delivery receipt are in parent-project `.local/odyssey_redesign_20261124/current_preview_delivery.json`. All 1,003 installed files equal the built artifacts. Twelve public HTTPS samples (HTML, startup, CSS, engine, Odyssey world/config, three lords, a deep texture and cache worker) match their hashes. Five private/source paths are denied. A harmless runtime probe changed at the same public URL and was then removed. The original Amazon public index remains byte-identical.

Actual compiled local and public-origin checks pass: ordinary en/zh-CN home, native Odyssey selection and new regional copy, start and diving, pause/resume, Return Home, a 390 px Chinese layout and same-URL refresh. The public run has no page/console/request errors and no development interface; cold home readiness was 40.0 s, repeat refresh 2.9 s on this host. This does not promise those timings on another device/network. The first local driver used the wrong English destination text (`Odyssey` instead of `Odyssean Sea`); the screenshot/DOM prove the page was ready and its corrected run passes. That fixture failure is retained.

Two Quick Tunnel API registrations timed out. A proposed additive nested runtime was installed without changing the Amazon index, but the existing flat-path restricted server rejected it. That rejected runtime is archived and was never delivered as playable. A task-owned loopback provisioning relay then forwarded only the fixed Cloudflare API request through the existing proxy, with TLS verification and credentials kept in memory. The successful independent tunnel uses its own restricted compiled-runtime origin. The temporary relay and dev server were stopped; the successful candidate server, tunnel and sleep inhibitor stay live. Existing Amazon services, source and archives are preserved.

The final audit finds all 1,595 frozen production/script source hashes and all 1,003 build files unchanged, and all 676 tracked source/public asset files equal to formal `48355ee`. Amazon production/script/test files and its 1,003 build artifacts match its delivered candidate; its five later documentation changes are retained. Formatting of modified files and `git diff --check` pass.

## Food reserve budget

The read-only food audit uses the real shared hunger/meal helpers and 12 m/s ordinary cruise for all four characters. It credits no sprint or current bonus. With an assumed ten-second initial search and three seconds per additional capture, all 39 stage-appropriate representative cases (3/6/10/16/25/30 m) can replace their modeled food cost. Normal gameplay movement and capture can cost more than centre-to-centre cruise; this is not whole-round balance acceptance.

The weakest adult passive-food reserve is the western route at Z −1900: a 30 m character spends about 85.12 hunger reaching and finding a turtle 220.47 m away, leaving only 14.88 from a full bar. A nearer sea hound is an alternative under the existing predator-size rules. The same stress model at all 72 size/deep-route combinations fails four 6 m cases: eastern Z −1200/−1550/−1900 and western Z −2200. Food exists there, but one nearby passive group does not replace the assumed travel/search cost for this undersized deep-water visitor. Deep pressure is capped at 500 world metres in unchanged shared rules. The candidate is not claimed to make every size self-sufficient everywhere. Raw assumptions, actual helper outputs, growth/hunger-cap predictions and source hashes are in `.local/review/food_budget.json` and `.md`.
