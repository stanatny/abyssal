# Bermuda distribution revision

The subsequent [lord-landmark revision](bermuda_lord_landmarks_revision.md)
supersedes the historical lord/guard coordinates below.

## Straight-current follow-up — 2026-11-22

The player accepts multiple currents but requests longitudinal straight lanes,
with the short homeward current retained. The four Bermuda lanes now keep a
constant X and water depth and run parallel to the map Z axis. This replaces
the diagonal layout described in the historical verification below.

| Lane                 |    X |    Y | Flow from Z → Z | Length |
| -------------------- | ---: | ---: | --------------- | -----: |
| Western outbound     | -345 |  -24 | -65 → -1670     | 1605 m |
| Eastern homeward     |  325 |  -24 | -1670 → -65     | 1605 m |
| Western midwater     | -300 | -240 | -680 → -1230    |  550 m |
| Southern deep return |  245 | -520 | -1660 → -1110   |  550 m |

The current shader, particles and minimap consume these same route points.
Thirteen focused current/distribution checks pass, including the axis-aligned
flow and short-return regression. Serialized Hawaii, Atlantis and Odyssey
routes and the shared force/timing constants exactly match the saved baseline.
The local production build passes. A separate radius-14 m check of the actual
triangle terrain at centres no more than two metres apart measures at least
43.73/44.16/191.19/154.95 m clearance respectively. The four arches, platform
and moving ship bounds do not obstruct the new lanes. This checks those major
props; it does not assert an absence of wildlife or combat encounters.
The actual development game also passes four native slow-swim rides from
staged, protected 10 m starts, using the ordinary follow camera. The natural
current phase is allowed to open. Over each 2.5-active-second sample, travel
is 178.71/200.08/197.44/194.95 m downstream respectively, with zero X or Y
drift; the short return has positive Z velocity. Depth-specific radar emphasis
and pause freezing pass, with no page or console errors. This isolates the
current layout, not unassisted survival or the unresolved adult cave route.
The first harness's missing development-module export is preserved separately;
it was a test-setup failure, not an application failure.
Evidence is in the ignored project directory
`.local/bermuda_straight_currents_20261122/`. No commit, main push or public
preview replacement is authorized by this route-layout request. The separate
[adult cave-access gate](bermuda_sleeping_paw_revision.md) remains unresolved.

The subsequent [deep-cave follow-up](bermuda_deep_caves.md) extends this local
candidate. The verification below remains scoped to this earlier distribution
revision; its screenshots and receipts are not cave acceptance evidence.

## Production brief — 2026-11-21

The first expansion increased bounds but left the original currents and surface
fleet in their old northern footprint, while the southern seabed hit a flat depth
clamp. The player asks for a populated whole map, richer geographic elements and
more balanced destinations. This extends the existing uncommitted candidate on
`feat/bermuda-outer-routes`; main remains v0.11.31 / `2271eaf`.

Keep 1,000 × 1,900 world metres, the 740 m maximum-depth convention and four-times
HUD depth. Preserve nursery food, starter rewards, the 600 m liner's supported
interiors, feeding/rewards, lord combat and other maps. The previous requirement
to retain every non-nursery core habitat or fleet coordinate is superseded.

## Whole-map route and encounter layout

- Surface transport: separate western offshore and eastern homeward lanes run
  from z -65 to -1670, reaching both lateral flanks. Add horizontal western
  midwater and eastern deep return branches at y -240 and -520. Currents keep
  the accepted timing, force, side/dive exit, collision and hunger rules; no
  forced depth, turn or teleport. Radar emphasizes lanes near the player's depth only when multiple current
  layers exist; other maps retain their previous lane opacity.
- Surface identity: move the freighter to (-245,-550), tanker to (265,-1110),
  ghost ship to (-235,-1470), and supported platform to (-45,-1100). Keep models,
  finite movement, collision, broadside warnings/damage and nursery protection.
- Four existing lords form a west/east zigzag: Hydra (-310,-20,-580), Kraken
  (300,-290,-900), Mayan (-290,-515,-1260), Leviathan (230,-610,-1570).
  Their four ordinary giant guards and accessible reserves move with them.
- Geography: eroded side benches, ribs and bypass valleys lead to southern
  ridges and basins. Preserve the nursery and liner bed; no terrain rise may
  obstruct lord arenas or the full-width deep-current lanes. Use adaptive welded
  terrain with triangle-interior error below 0.3 m and at most 260,000 triangles.
- Art: twelve separated reef/garden/wreck pockets, four fitted large apertures,
  and cold-water fan/sponge fields connect the full footprint. Reuse accepted HF
  geology, reefs and salvage assets with varied grouping, depth, scale and
  orientation. Fit final triangles, retain broad adult bypasses, use instancing,
  near/far detail and shared leases, and add no lights or private animation loop.
- Food: 788 ordinary animals, retaining nursery and the three liner food
  groups exactly. Redistribute the other stock and added food across lateral,
  middle and southern routes; enforce depth bands, accessible moving habitats,
  finite local replenishment and meal/travel budgets. Four giant guards remain.
  A stock total alone is not evidence of coverage or actual nutrition. Twelve
  8-fish tuna schools follow the twelve garden water layers, with another six
  schools on their approaches. The two deepest gardens also retain nearby
  existing adult megalodons; tuna still obey their 600 m depth limit.

## Ownership and verification

The current agent owns integration, fleet/platform, currents/radar/Guide,
localization, boss/guard placement, preview services and final evidence.
Same-model agents have disjoint source ownership for terrain/mesh, final ecology,
and outer art/reef fields. No agent stages, commits, pushes or changes services.

Review actual normal-camera populated scenes in both graphics settings, including
middle/south terrain, surface fleets, current entry and exit, 32 m traversal and
retreat, moving-food feeding/replenishment and lord habitat geometry. Distinguish
observer views from native travel. Check bilingual narrow/desktop controls,
pause/Home/restart/switching and resource ownership. Measure actual render and
construction costs; do not promise zero overhead or physical-phone smoothness.
Preserve the existing audio graph and its exploration/chase/lord roles.

Keep the existing public preview and archives; rebuild only the candidate,
verify exact public artifacts and native flows, and deliver current images/video.
No new commit, main publication or version bump is authorized.

## Verification record

Current revision evidence is stored under `bermuda_distribution_20261121`, with
terrain and population audits under the similarly dated redistribution/expansion
directories. Prior Nov 20 receipts remain historical.

### Distribution, terrain and resources

- Four currents now span both flanks and two deep layers. The nine current checks
  pass, including complete simulated rides, direction, shared force/timing and
  terrain clearance. Four live entries used the natural current phase and native
  slow-swim input, advancing over 90 m in 2.5 active seconds without forced depth.
- Fleet, all four lord arenas, their four giant guards and rare search anchors
  span the enlarged footprint. The 600 m liner and its 594 contact volumes remain.
- The southern relief spans 122.03 m instead of the old flat clamp. Adaptive
  terrain uses 256,588 triangles; 969,648 sampled triangle interiors have at most
  0.289897 m error and welded seams. The 31,339 protected-core height samples are
  unchanged. Seven terrain checks pass.
- Twelve pockets contain 288 reef colonies and 72 rock/spire instances. Four
  arches reserve broad adult passages; eight named outer landmarks and 589 outer
  contacts are present. Seven focused art checks cover full-foot support, both
  LODs, adult route clearance and shared resource cleanup. Existing HF kits and
  atlases are reused; no new lights, private animation loop or generated assets.
- The final roster has 788 ordinary animals plus one separate regional rare.
  Protected 270 fish include the exact three liner groups/22 fish. Fifty-eight
  route groups contain 344 fish. All legal spawns, fifteen horizontal sectors,
  medium/adult meals and twelve garden-view distances pass the six ecology
  checks. Existing nursery safety, rewards and hunger remain shared.
- A final visual audit caught vertically separated food despite horizontal
  coverage. Eighteen existing tuna schools were moved: twelve garden schools and
  six approaches, retaining the same total. Garden-view food distances are
  10.3–82.5 m, inside both quality presets' visibility bounds. Tuna at the deepest
  two gardens remain above the floor because their legal depth ends at 600 m;
  existing 20 m megalodons provide adult food/danger within 56.1/80.7 m.
- Reapplying the shared lord-habitat fitter initially moved final habitats back
  north. The final Bermuda configuration now survives repeated fitting; shared
  regional regression checks pass. Twelve population assertions were updated
  while retaining exact protected groups and other-map contracts.

### Actual gameplay and visual review

- Sixteen native 120 m passages pass: 32 m Orca and Giant Squid, four arches,
  both directions, actual floor/colliders and original follow camera. No terminal
  obstruction or camera-floor intersection was recorded. Starts and invulnerability
  were staged to isolate navigation; this is not an unassisted expedition.
- In the final Low-quality populated game, native sprint catches a moving garden
  tuna and a southern Livyatan. Both were visible in the normal follow view.
  Hunger/prey rewards increase, pause freezes their timers, and natural 18/28
  active-second replenishment returns each target to a visible legal home after
  retreat. No time acceleration or frozen prey was used. Chinese 390 px
  launch/pause/Home and Hawaii–Bermuda–Amazon–Bermuda switching complete without
  page/console errors. Production touch input is checked separately below.
- An earlier adult replenishment fixture timed out on wall time while the
  renderer advanced the capped simulation slowly. A later run logged the real
  countdown to successful replenishment. Another fixture left keyboard focus on
  the quality button; focusing the game canvas restored the intended native
  sprint. Neither was treated as a gameplay defect.
- Four corrected live observer overviews show side slopes and southern groves.
  The first east-view camera had been 25.8 m under the final terrain; direct
  raycasts and 23 colonies' actual instance-base vertices prove their support.
  Corrected captures use each camera's own XZ terrain clearance. The eastern
  image has excessive foreground rock occlusion and is omitted from delivery.
  Normal-follow feeding and southern labelled overviews are the review images.

### Final integration

- A final integration audit found two relocated platform pads up to 3.57 m
  above the sloping terrain. Foundations now sample their complete 10 × 10 m
  footprint, extend below its minimum and cover its maximum by 4 m. Columns
  follow the new base; the existing ten contacts, horizontal footprint and upper
  structure remain. The actual Bermuda surface caller uses the final contact
  terrain. The real-triangle regression reproduces the gap before the fix and
  passes afterward; the original exact flat-floor contract still passes.
- The actual runtime audit then found that ship-impact reset discarded the
  platform and ghost hull from the public collision array. Bermuda now restores
  those contacts after each reset, without changing shared ship destruction.
  The regression fails before the fix and checks real blocking, registration and
  duplicate-free repeated rounds afterward. Runtime support checks read this
  actual surface array rather than the separate rig model's private array.
- A serialized visible Chrome diagnostic on this Mac (Apple M6/ANGLE Metal,
  1280 × 800, seeded live AI, 1.8 s warmup then 7 s samples) covers nursery,
  liner, west garden and south grove in both presets. Median draw calls are
  408/86/131/39 High and 276/65/123/30 Low; median rendered triangles range from
  0.56 to 2.73 million High and 0.55 to 2.49 million Low. The host produces
  approximately 200 ms frame intervals in this setup, as in the previous
  diagnostic. This short current-only profile is not evidence of acceptable
  real-device FPS or a matched before/after speedup. Raw frame, memory, GPU and
  geometry counts are retained in `performance.json`. The later footing-only
  correction retains the same geometry/contact counts.

- The final live surface audit finds all fourteen fleet contacts registered,
  including two ghost hull contacts and the platform's ten. All four actual
  foundation bottoms have no gap over the sampled footprint; all tops retain
  at least 4 m cover. Native follow-camera approaches show the freighter and
  southern ghost ship, including its charging warning. Two Hawaii–Bermuda cycles
  return to identical per-region renderer counts: Hawaii 235 geometries/465
  textures; Bermuda 234/475. This bounded sample does not establish long-session
  memory behavior.
- The final core selection passes 44 checks; the subsequent fleet/rig/ship-impact
  selection passes all 44, including the added reset and real-triangle foundation
  regressions. These selections overlap; they are not an 88-test unique total.
  The seven terrain checks and twelve stock assertions are separate evidence.
  Global Prettier, final changed-file formatting, `git diff --check` and the
  production build pass. The full historical suite was not rerun for this follow-up.
- The existing restricted public origin serves the rebuilt candidate. Nine
  public HTML/bootstrap/main/CSS/worker/Bermuda/reef assets match local SHA-256;
  five source/private paths remain unavailable. Native public English desktop
  and Chinese 390 px touch flows complete menu selection, launch, ability,
  sprint input, pause/resume and Home without page/console errors. The production
  build has no development hook. A separate compiled factory probe confirms
  eight outer landmarks, 589 contacts, unchanged 594 liner contacts and 256,588
  terrain triangles. Both actual HUDs contain four correctly layered current
  groups. The previous preview runtimes and public services are retained.
- The Chinese layout diagram, actual Low-quality follow-camera feeding view
  and labelled southern observer overview were delivered together; all three
  downloaded attachment hashes match the originals. The diagram is explicitly
  distinguished from gameplay evidence.

All changes remain uncommitted on `feat/bermuda-outer-routes`; main stays at
v0.11.31 / `2271eaf`. No push or version bump was made. The current batch covers
Bermuda; Amazon and Odyssey remain later work. Physical-device frame rates,
unassisted whole-round pacing and access from the player's external network
remain unverified.

## Northeastern Flying Dutchman relocation — 2026-11-22

The player approved moving the existing Flying Dutchman from the southwestern
surface to the otherwise sparse northeastern surface. Its anchor is now
`(210, 4, -460)`, replacing `(-235, 4, -1470)` for this local candidate. The older
southwestern placement and its receipts above remain historical. The original
32 m circular patrol, real HF model, hull/cabin contacts, captain, sails,
five-shot volley, warning, cooldown, damage and 70 m escape depth are unchanged.
No other fleet, weather, current, lord or ecology anchor moves. The bilingual
Guide now describes the northeastern offshore surface; the radar has no separate
fixed ghost-ship marker to migrate.

Evidence is in `.local/bermuda_dutchman_ne_20261122/`:

- `placement_audit.json` measures 129 actual posed headings over one spatial
  patrol cycle, including 131,931 visible vertices. The conservative visible
  envelope stays at least 184 m inside the map. Original hull/cabin contacts
  retain at least 10.04 m horizontal clearance from the radius-14 eastern return
  tube, and the sampled actual casts have no hits. The drifting northeastern
  waterspout and visible ship remain separate. Their danger areas intentionally
  overlap; this creates a combined storm/cannon encounter, with ordinary diving
  still available. Neither ship geometry nor its 150 m detection reaches the
  protected nursery.
- `relevant_tests.log`: 12/12 focused distribution, cannon, cover, model,
  lifecycle and lord-Guide checks pass. `guide_check.json` independently checks
  the actual ghost record in both languages. `build.log`: production build
  passes in 24.89 s.
- `live_report.json`, `overview.png` and `approach.png`: the complete current
  development game loads at the new anchor with no page/console errors. Staged
  protected 10 m starts then use native K slow swimming and the ordinary follow
  camera. The actual warning and five visible cannonballs occur; ship movement
  freezes at pause. A second native surface view (`surface_overview.png`,
  `surface_live_report.json`) shows the actual mast/sails and sea-level silhouette
  at camera Y=8.90 m, without an altered camera or scene lighting.
  These are location/trigger checks, not an unassisted round
  or performance measurement.
- The wider first selection is 22/24. Its two failures are the existing Hydra
  Y=-20 expectation (current authoritative site is -18) and the historical
  seabed triangle cap. `baseline_existing_failures.log` reproduces both with
  the exact pre-move fleet source through a read-only module hook. They are not
  changed or hidden by this relocation. The separate adult cave gate also
  remains unresolved.

This is uncommitted local work. The existing public preview, main branch and
runtime archives are preserved; this check does not publish the whole candidate.
