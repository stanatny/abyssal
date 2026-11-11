# Naval threat revision — 2026-11-11

## Volumetric scatter follow-up

The player rejects the near-flat arrangement and asks for three-dimensional
scatter. The current follow-up replaces the 4 × 3 sheet with twelve irregular,
noncoplanar offsets per field, mirrored between fields and fixed across resets.
The mine centers span **36 × 42 × 34 m** in X/Y/Z. Counts, field centers,
regional exclusions, damage, submarine tuning and existing warning effects remain.
The bilingual Guide now describes the differing heights.

Five placement tests and 47 activity/contact/locale/weapon tests pass. Actual
terrain/scenery checks cover all 144 points: minimum center spacing 13.30 m;
minimum center-to-floor gaps 59.77 / 58.76 / 54.00 m in Hawaii/Atlantis/Bermuda.
All previously tested 60 m local bypasses remain valid without changing their
fixtures. Atlantis's complete key and mechanism checks retain more than 60 m
clearance; the new minimum is 64.23 m. The volume test also rejects coplanar or
merely tilted sheets. Current evidence is under `.local/naval_volume_20261111/`.
Current integration receipts also pass:

- `native.json` verifies all 144 final runtime positions in the three enabled
  maps, a return to Hawaii, pool identity, pause and both Guide languages. No
  slot is moved by `safePosition`, and the additional live collider layers are
  clear. Minimum actual outer-skin floor clearances are 57.97 / 56.96 / 52.20 m.
- `focused_runtime.log` and `minefield_tests_01.log` pass 52 focused tests in total.
  The adjacent-contact fixture follows a real nearest-neighbor 3D segment rather
  than assuming a horizontal row. Formatting and diff checks pass. No new full
  historical-suite or performance result is claimed for this placement follow-up.
- `media.json` records two staged legal approach viewpoints, followed by native
  slow swimming and the ordinary follow camera with live world state. No mine,
  clock or camera is overridden. The reviewed front/side screenshots and 8 s
  H.264 clip (`volumetric_minefield.mp4`) show the current spatial arrangement;
  encoded frames and cover were inspected.
- The production build plus existing preview loader succeeds: 976 artifacts,
  main `assets/index-BKKgz8dZ.js`. `public.json` verifies a fresh no-cache
  English 390 touch context and warm Chinese 1280 flow, native input/pause/home,
  ready Guide specimens and no development hook, browser/HTTP/request failures
  or horizontal overflow. Cold initialization took 44.7 s in this sample.
  `public_assets.json` verifies 18 representative public artifact hashes.
- `identity_final.json` verifies all 2,193 recorded source inputs and 976 served
  artifacts. Only this completion review changes after build. The task-only
  development server is closed; the authorized compiled preview, tunnel and
  previous-client resources remain.

[Current volumetric trial](https://store-fun-moon-own.trycloudflare.com/?preview=naval-volume-20261111).
Physical-phone performance and whole-round encounter frequency remain unmeasured.

The initial arrangement and its placement/performance measurements in the
remainder of this document are historical for this follow-up. They do not
establish current scatter visibility or a new frame-rate result. The retained
combat and lifecycle rules continue to apply. The candidate remains uncommitted
and unpushed; formal main stays v0.11.27.

## Initial naval-density candidate

The player requests denser minefields in seas that already contain mines, and
more frequent, faster submarine torpedoes. This candidate adds concentrated
contact-mine encounters and stronger submarine pressure while retaining the
existing regional activity boundaries, damage rules and accepted vehicle art.
It extends the preceding uncommitted jellyfish, flying-fish, terrain-contact and
scenery work. Published main remains v0.11.27; no commit or push is authorized.

## Regional encounters

| Region                                    | Previous contact mines | Candidate contact mines | Submarines            |
| ----------------------------------------- | ---------------------: | ----------------------: | --------------------- |
| Hawaii                                    |                     12 |                      48 | Existing three remain |
| Atlantis                                  |                     12 |                      48 | Existing three remain |
| Bermuda                                   |                     12 |                      48 | Remain disabled       |
| Mariana, Amazon, Europa, Penglai, Odyssey |                      0 |                       0 | Remain disabled       |

Each enabled sea has **four local fields of twelve mines**, using fixed 4 × 3
slots with 12 m center spacing and a slight alternating height offset. The
fields occupy outer-reef and deeper open water, outside the safe nursery. Their
different regional centers avoid treating all three maps as interchangeable.
The inventory is four times the previous twelve-mine stock, using the existing
contact-mine model and collision radius.

`naval_minefields.js` owns the immutable field definitions and returns independent
slot records. `HUMAN_RULES.torpedoCount` uses its shared population constant.
Region refresh and round reset both pass the current region ID to human activity.
Unknown region IDs return no layout, while legacy no-argument activity fixtures
retain the Hawaii default. Explicitly disabled categories skip placement and
remain hidden. Restart restores the same fixed slots and mesh pool rather than
allocating another population or relocating mines near the player.

The existing HF contact-mine geometry and texture remain shared. Each mine keeps
its independent red-lens phase and warning ring. No new model inference,
tracking mine, chain explosion or automatic in-round mine respawn is introduced.

## Readable danger and retained damage

When at least four active mines are within 70 m, the existing notification path
gives a bilingual dense-field warning and advises passing around or above the
cluster. This is a proximity check, not a directional ray or an automatic route
planner. The warning retains the seven-second notification spacing. Existing
individual red rings are visible within 90 m; an isolated mine still gives the
nearby warning within 30 m.

Mines retain their 3.6 m outside diameter, 1.8 m contact radius and **28 base
damage**. Swept body contact and entity/world ordering remain. Each contacted
mine explodes and retires once, including adjacent contacts during the player's
existing invulnerability interval. The revision does not bypass armor or apply
repeated damage for the same mine. Hit feedback now reports the actual health
loss after resistance, rounded for display, rather than always announcing 28.

Minefields and submarines are not inserted into the ordinary edible-sonar
entity path. Their existing world art, warnings and Guide entries supply the
encounter feedback; they do not gain misleading food markers on the sonar or
minimap. Both Guide languages describe dense fields, the shared count and base
damage, and the changed projectile rules.

## Faster submarine pressure

`SUBMARINE_DEFENSE_RULES` changes cooldown **14 → 8 seconds** and straight-shot
speed **32 → 48 m/s**. The cooldown begins at launch; a new 2.2-second lock-on
follows it. Under uninterrupted eligibility, successive launches are therefore
about **10.2 seconds apart**, previously about 16.2 seconds, rather than exactly
every eight seconds. The dedicated 50 ms fixture records four launches by
43 active seconds at 8.15, 18.30, 28.45 and 38.60 seconds; frame quantization
explains its approximately 10.15-second spacing.

Eligibility remains at least 8 m body length, outside the nursery and within
95 world units of a live enabled submarine. Each shot retains the full 2.2-second
warning, 20 base damage, five-second lifetime, 0.55 radius and six-projectile
pool. It flies along the heading established at release and does not home.
The existing lamp, audio, launch, trail and HUD feedback remain on the shared
game clock. The separate 18 m, three-independent-ram destruction rule and diver
release remain unchanged. Bermuda and the five other submarine-disabled regions
do not acquire submarines merely to expose this tuning.

## Placement and contract evidence

Evidence is retained under `.local/naval_pressure_20261111/`:

- `minefield_handoff.json` records 48 layout positions in each enabled region,
  no blocked static placement and minimum mine spacing of 12 m. Against final
  rendered terrain, the lowest center-to-floor margins are 76.09 m in Hawaii,
  74.67 m in Atlantis and 54.13 m in Bermuda. These checks do not depend on a
  mine being moved away by the generic placement fallback.
- Each field has a sampled **local** bypass: a 100 m stretch with a 60 m diameter
  clearance tube through that field's neighborhood. The tests include solid
  colliders, surrounding terrain and mine separation. This establishes local
  room to detour; it does not claim a straight empty corridor through an entire
  map or prove every possible player route.
- Atlantis checks all resolved key-route segments, waterwheel controls, every
  light-layout variant and every mural-gate variant. Mines stay more than 60 m
  from the checked quest geometry; the recorded nearest clearance is 67.77 m.
  Existing nursery and quest placements are not replaced by minefields.
- `focused_final.log` passes **62 tests**, including region enablement and pool
  reuse/reset, early field warnings and clear bypasses, adjacent once-only mine
  settlement, armored damage feedback, bilingual Guide copy, faster repeated
  submarine launches, pause, solid cover, relative player/projectile sweeps and
  juvenile/nursery protection. `submarine_handoff.md` retains the dedicated
  lane's test and cadence evidence. Earlier failed fixture runs are preserved
  separately rather than represented as successful checks.

The existing submarine `castWorld` path checks static and dynamic entity
colliders. It does **not** add a final-triangle terrain-surface sweep. The
placement terrain checks above are distinct from projectile occlusion: this
revision does not claim to repair or validate submarine shots against every
seabed surface.

## Measured minefield scene cost

The matched desktop sample uses Chrome's ANGLE Metal renderer on Apple M6,
1280 × 800, seed 71523, a 25 m player held at `[-130, -165, -330]`, both quality
presets, warm-up and 120 measured frames per preset. The player position is
restored for a matched deep-water view; this is a controlled scene-cost sample,
not an ordinary discovery or whole-round balance run.

The baseline retains the **old twelve-mine layout**, but submarine speed/cooldown
tuning had already landed before that sample. The comparison therefore measures
the mine inventory/layout increment on the existing candidate, not a complete
before/after of every naval change. Receipts are
`perf_before_mines/report.json` and `perf_after_mines/report.json`.

| Preset | Mean frame time, before → after | p95, before → after | Draws, before → after | Triangles, before → after |
| ------ | ------------------------------- | ------------------- | --------------------- | ------------------------- |
| High   | 16.47 → 16.50 ms                | 18.7 → 18.3 ms      | 83 → 128              | 391,110 → 753,670         |
| Smooth | 16.47 → 16.57 ms                | 18.5 → 18.5 ms      | 63 → 107              | 362,738 → 718,298         |

Both presets remain around the display's 60 FPS limit in this short sample.
The added visible field increases rendering cost: +45 draws and +362,560
triangles in High; +44 draws and +355,560 triangles in Smooth. Small timing
differences do not demonstrate a speedup. This is not evidence of physical-phone
FPS, temperature, power consumption or a long-session resource plateau.

## Integration completion

Final integration evidence under the same ignored task directory:

- `native.json` / `native.log`: all eight native region/start/pause/home flows
  pass, followed by a return to Hawaii. Hawaii/Atlantis/Bermuda each instantiate
  all 48 mines in four fields; other five maps keep zero active mines. Submarine
  visibility remains 3/3/0 and zero elsewhere; the six-projectile pool and all 48
  mine mesh identities persist across switching. Every actual mine position
  equals its region slot after `safePosition`, has no static/barrier/surface
  collider overlap, and retains at least 12 m mine spacing. Actual skin clearance
  above the final triangle floor is at least 74.29 / 72.87 / 52.33 m respectively.
- Native English and Chinese Guide entries expose the current count, cooldown,
  windup and speed. The narrow 390 px layout has no horizontal overflow. The
  game clock, mine state/ring opacity and projectile/lock-on state freeze during
  each actual pause. These lifecycle checks do not establish a long-session
  resource plateau.
- `full_tests.log`: **2,243 tests pass**. The final proximity-message copy was
  subsequently corrected from directional “ahead” to omnidirectional “nearby”;
  `final_copy_tests.log` passes all 11 affected activity/localization checks.
  The earlier single-mine boundary fixture was explicitly isolated from its new
  neighbors; the separate dense-field test retains adjacent live mines and
  validates once-only detonation, armor and invulnerability.
- `check.log` passes the repository-wide formatting check. Newly added review
  and final text edits receive scoped formatting checks; `git diff --check`
  passes. No mechanical source change follows the regression run.
- `media.json` records a staged initial minefield approach followed by native
  slow swimming, then a **controlled fixed-position submarine observation**.
  The player is held at a legal sightline using the existing render entry; the
  real world, clock, warning, shots, damage and gradual recovery stay live.
  Launches occur at 10.0054 and 20.2054 active seconds, exactly 10.2 s apart in this
  sample. This is not evidence of natural discovery or an evasion demonstration.
  The two scenes are edited into `naval_threat_demo.mp4` (19.28 s, H.264);
  the cover and both encoded launch samples were visually inspected. The clip
  records visual feedback and does not carry a new audio track.
- `preview_build.log` records a successful production build plus the existing
  preview-only bounded cold loader. The reviewed candidate contains 976 artifacts
  and main module `assets/index-BPdwSduy.js`. The manager preserves prior hashed
  resources and the preceding runtime archive for already-open clients.

The updated trial is
[the existing preview](https://store-fun-moon-own.trycloudflare.com/?preview=naval-threat-20261111).
`public.json` verifies a fresh no-cache English 390 touch context through the
actual public address, then warm Chinese 1280 in the same touch context. Native
start, joystick input, pause/resume/home and both ready-textured Guide specimens
pass without a browser error, HTTP error or failed request. The production
preview exposes no development hook; both widths avoid horizontal overflow.
Cold initialization took 74.4 seconds on this tunnel sample, not an instant-load
claim. `public_assets.json` verifies 18 representative shell, engine, vehicle,
mine model and texture files byte-for-byte against the reviewed build.

`identity_final.json` verifies all 2,193 recorded source inputs and all 976 current
served artifacts; only the three entry documents and this completion review
change after build. Runtime code, tests and assets keep the reviewed bytes.
The task-only 5190 development server is closed after verification; the existing
compiled preview, tunnel and older-client resources remain available.

The work remains an uncommitted candidate for player review. The authorized
preview is separate from a main/Pages release; no version bump, commit, push or
personal Skill update is included. Whole-round encounter frequency/fun,
physical-phone performance and prolonged resource behavior remain unmeasured.
