# Kraken motion and large-pursuer camera — 2026-10-22

> The pressure/forward-view follow-up below supersedes the original candidate
> implementation. Earlier tests and recordings describe their dated revision.

## Scope and checkpoint

The user requested a local commit of the preceding rendering/performance work,
then separately reported Kraken's unchanged spread-arm silhouette and the follow
camera entering very large pursuers. The accepted checkpoint is `8e974d7` on
`art/atlantis-hf-redraw`; it was not pushed. These new changes remain a candidate
for user review, with no new commit or formal release.

The same Kraken factory serves Hawaii, Atlantis and their Guide entries. The
camera applies to visible large ordinary creatures and enabled living lords in
all destinations. Gameplay, species size/speed, pursuit, damage, feeding, timing,
source assets and accepted scenery remain unchanged.

## Kraken

The original HF fan used five joints per arm and small periodic rotations. Its
rear mantle must stay outside the arm skin weights. Larger rotations alone
stretched the web where nearest-chain assignment switched abruptly, and pulled
the mantle along with nearby curled arms. Those trials were rejected.

The candidate uses thirteen joints per arm, distributed bends and a smooth
transition between neighboring anatomical chains. An explicit rear-mantle mask
keeps that surface stable. Eight connected arms remain on the same mesh, with
unchanged positions, triangles, UVs and source color texture in the bind pose.
The skin's weights and independent skeleton change, not the generated asset.

- Actual travel gathers the lateral arms backward; their ends continue a small
  traveling motion. Zero travel does not inherit a sprint pose from high effort.
- Windup opens the arms, vortex attack cups them, and actual held/bite state curls
  the front arms toward the existing beak. Recovery releases the pose smoothly.
- The outer lord factory explicitly forwards travel, boss-phase and inspection
  state. A new state test caught a missing forwarding path during development;
  earlier optional-hook snapshots are not the final integration evidence.
- The existing animation clock drives all transitions. Repeated phase freezes
  the pose, reset clears it, and instances keep separate skeletons/state.

This is an expressive adaptation for the existing fantasy Kraken, not a claim of
observed biological Kraken locomotion. The [American Museum of Natural History's
Kraken reference](https://www.amnh.org/explore/ology/ology-cards/285-kraken?view=modal)
provides myth/cephalopod context. No new HF request or asset regeneration was
needed, and no scientific octopus motion was attributed to this fictional lord.

## Camera

The previous camera only shortened its arm against world geometry. It did not
consider the visible skin of a large chasing creature.

`creature_camera.js` caches eight long-axis sections per render geometry. Each
section stores bone-local bounds of triangles crossing that interval; current
bone transforms reconstruct a conservative animated envelope. It also covers
morph envelopes and ignores invisible/visual-only/low-opacity geometry. CPU
bounds are shared through a WeakMap; active collider objects are pooled. No new
render pass, GPU resource, animation loop or per-frame vertex scan is added.

Only nearby visible creatures of at least 8 m are considered, around both the
player, with reach covering both the requested camera arm and its current
interpolating arm. Shortening and endpoint
recovery jointly consider creatures, indexed world solids and the seabed. A
minimum framing distance keeps the camera out of the playable character; an
obstructed view aims at that character immediately, then eases back to the
ordinary forward-looking framing when clear. Neither creature materials nor
combat collision are changed.

Three rejected intermediate versions matter: shortening alone moved the lens into
the player's own body, and filtering ordinary creatures by attack cooldown
excluded visible predators just after a bite. A third version kept the lens
outside both bodies but still looked through the giant's head. The final version
includes visible creatures throughout cooldown and, only when obstructed, tests
24 bounded nearby viewing directions against the same creature/world bounds.
It prefers less obstruction while penalizing large departures from the requested
view. Native pursuit fixtures check both enemy and player skin and actual views. An unobstructed follow camera keeps the existing
distance and damping. A physically crowded view can still be close to a large
opaque enemy; this fix does not promise to make an occluded player transparent.

## Validation and costs

Evidence is under `.local/kraken_camera_20261022/`.

- Targeted skin/state/camera checks cover real deformed vertices, UV copies,
  independent instances, pause/reset, morph bounds, world walls/seabed, camera
  overlap recovery and player framing. All existing skin-edge expansion limits
  remain below 1.5; they were not loosened to accept a bad pose.
- `shared_regression.json`: Maja, Hydra and Leviathan geometry/skin attributes and
  all bone transforms remain exact across 240 poses each.
- `native/{capture,adult,escape}.json`: actual staged 12 m and 30 m players are
  pulled into the unchanged mouth anchor and take the existing 60-point bite.
  Sprint escape prevents that bite; pause freezes the state. An external camera
  observes these scenes, with no per-frame player pinning or fabricated damage.
- `camera_combined_before_1280/report.json` records 21 samples inside visible
  Leviathan skin. Final 3 m and 30 m framing fixtures at 1280 and 390 px record no
  enemy or player skin intersections, with frozen camera position during pause. Ordinary 28 m Ichthyotitan fixtures include real
  pursuit, biting cooldown and sprint escape. Both use the actual follow camera.
  These are staged starting positions and live clocks, not natural full rounds.
- Intermediate `camera_*` reports predating `camera_verified_final_*`,
  `camera_npc_verified_final_*` and `camera_adult_verified_final_*` are development evidence, not final acceptance. The first
  baseline route did not match Vite's query string and is explicitly excluded.
  The valid baseline replaces Vite-transformed pre-change main and records that
  the route really intercepted it.
- `camera_cost.json` is a Node 24 CPU microbenchmark on this M6 mini: one nearby
  creature costs approximately 2.9–12.1 ms for initial cache construction and
  0.011–0.309 ms at warm p95. This includes minimum player framing and bounded
  alternative-angle search when needed, but excludes world queries, rendering
  and phone hardware; it is not a device FPS/thermal claim.
- Kraken adds 64 bones (41 to 105) without adding body draw calls or triangles.
  Existing skeleton disposal and shared geometry/material ownership remain.
  A 390 px touch viewport is desktop emulation, not a physical phone test.

Final candidate: **24/24 targeted and 1,560/1,560 full tests pass**, formatting,
`git diff --check` and the production build pass. `artifacts.json` verifies all
256 build files (75,090,164 bytes) byte-for-byte against both the restricted
local service and HTTPS preview; 11 private/source paths are rejected at each
origin. Service PIDs remain 35213 / 23118 / 23120 / 35419. The production entry is
`index-CggzwWLw.js`.

`public/report.json` verifies 12 native production cases: Kraken in both regional
Guides, plus four playable characters' Guide/start/ability/graphics-loss/recovery/
resume/pause/Home flows, each in English desktop and Chinese 390 px touch
emulation. Same-address reload selects the new entry; production debug hooks
are absent, with no console/page errors or failed runtime resources.

The two delivered H.264 videos and same-angle comparison are in `delivery/`.
They were decoded and visually inspected after encoding. The camera comparison
uses identical initial placement and input schedule with separate real-time
clocks, not frame-identical deterministic simulation. Final new work remains
uncommitted and awaits the user's visual/playing review.

## Preview and recovery

Use the existing restricted preview, not the Vite development origin:
<https://saver-recorded-digit-could.trycloudflare.com/>. It serves only the built
`index.html` and assets. Formal Pages remains v0.11.15.

`python3 .local/mini_preview_20261007/manage.py status` checks retained services;
`.../manage.py rebuild` builds, archives the preceding runtime, preserves old
hashed assets for already-open pages and replaces HTML after new assets exist.
Process identities and logs remain in that directory. Do not stop or replace the
existing services, remove historical worktrees or publish this candidate without
the user's subsequent authorization.

Adult-camera follow-up: `camera_adult_verified_final_candidate_{1280,390}/report.json`
adds the real 30 m character against Leviathan on the final source. Both runs
record zero enemy/self skin intersections and stable pause; their actual views
were inspected. This complements the 3 m pursuit and ordinary-giant fixtures.

## Pressure and forward-view follow-up — 2026-10-22

The user asks for all eight arms to reach around the player, a higher close-range
escape cost, and a forward view that remains usable when a giant pursuer arrives.
This authorizes a Kraken balance change; earlier unchanged-gameplay statements
apply only to the preceding revision. No new commit or push is requested.

### Reference and pose

The [Monterey Bay Aquarium species account](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/giant-pacific-octopus)
describes camouflage/jet approaches and prey seized by sucker-covered arms, with
a beak used for feeding. It does not establish that all eight arms always point
straight ahead together. The game's eight-arm reaching basket is an expressive
adaptation for its fantasy Kraken; the vortex is not a biological claim.

Simply adding larger joint rotations curled the rear arms into loops and strained
the mantle/web. Those trials are retained under
`.local/kraken_pressure_20261022/pose_trial*.log`, not accepted as final evidence.
An offline capture target now points all eight distal arms forward, projects
excessive edge tension/compression through the connected skin, and welds UV-seam
copies. The mantle stays fixed. Existing positions/UV/triangles/color assets are
unchanged at rest. The tracked preparation script and packed target reproduce
this pose; no new Hugging Face inference was used.

The shared position/normal morph owns 656,088 CPU attribute bytes. Instances keep
independent influences and skeletons. The ordinary swimming pose blends into the
reaching target; subtle distal motion, target correction and beak motion continue.
Paid release or completed capture relaxes the arms. Tests inspect actual skin,
not only bone tips: every distal arm points forward, seams remain continuous,
transitions and pause are bounded, and the existing maximum edge-expansion limit
of 1.5 has not been loosened. Shared Maja/Hydra/Leviathan poses remain exact across
240 frames each.

### Escape contract

An outward sprint inside the active, unobstructed vortex pays one extra release
fee based on the real mouth distance: 120 at 6 m or nearer, smoothly declining to
24 at 42 m or farther. Ordinary sprint stamina drain remains separate. A
successful payment ends that player's restraint for the current vortex; holding
sprint cannot pay again or trigger another grip in that attack.

Insufficient stamina does not charge the release fee. Vortex pressure cancels
outward swimming and retains the previous pull/drain and delayed bite; lateral
steering remains available to seek real cover. Cover, phase end, ink/disorientation,
death and restart retain their existing reset/escape behavior. Damage, capture
window, attack timings, other bosses and rewards are unchanged. Bilingual Guide,
skill-card and in-combat copy explain the price, including for sub-25 m players.

`combat_near100`, `combat_near150` and `combat_far100` use staged initial positions,
12 m bodies and one attack start, then real input, collision and combat clocks.
At 4 m, 100 stamina cannot pay 120 and the ordinary 60-point bite occurs; the
150-cap case pays 120 plus its normal frame drain, escapes and takes no bite.
At about 36 m, 100 stamina pays 33 extra and escapes. No per-frame position pinning
or fabricated damage is used. Pause freezes the state. These are isolated native
Chrome tests, not natural progression or physical-phone play.

### Forward camera

The preceding candidate's angle search could put the entire enemy in view. This
revision restores the ordinary forward follow camera and its world-obstacle
shortening. A gameplay-only material hook removes the nearby rear-body fragments
between lens and player, and softens the large head/body area obstructing the
central route. Peripheral close parts can remain visible. As a pursuer passes the player,
the mask releases smoothly over a fraction of its body length instead of popping
off when its center crosses. Creatures farther ahead, world geometry, the player
and the Guide retain their ordinary rendering.

The hook preserves original lighting/texture shader callbacks and opaque sorting;
it adds no transparency pass, textures, per-frame vertex scans or material clones.
Uniforms are scoped to the gameplay render and restored even on render failure.
This is visual occlusion relief, **not a promise that the physical camera point
never intersects the hidden skin**. Native pursuit reports retain those physical
intersection counts. Small/adult players, large ordinary predators, turning,
sprinting and pause are inspected at desktop and 390 px touch emulation; the
latter is not a real phone. The screen-door dissolve remains a visual tradeoff
for user review.

### Current validation

Evidence lives under `.local/kraken_pressure_20261022/`. The first full run caught
an outdated pooled-state expectation (the new price field); the updated reset
contract and subsequent full run pass all 1,559 tests. Focused coverage is 51
checks. Older 1,560 results describe the replaced camera suite, not this revision.
Runtime/source/public fingerprints, final encoded videos and the production
native report are recorded alongside the review after preview rebuild.

Final foreground inspection also renders the same frozen camera with the mask
on/off and with only the pursuer hidden. In the 390 px central-route sample, the
unmasked pursuer changes 99.9% of sampled pixels relative to the clear view; the
final gradual-transition mask changes 18.6%. A pursuer repositioned 40 m ahead
has zero on/off difference in that sample. This measures one framed overlap,
not a general guarantee about every creature/camera arrangement.

A final geometry audit caught a separate integration issue: the old collision
chunk envelopes included the bind pose and bone motion but omitted the new morph.
32,694 indexed skin samples lay outside their broad-phase chunk before repair.
Chunk envelopes now include the absolute/relative morph targets in each bone's
binding frame; all actual captured-pose samples pass without changing the narrow
surface-contact rule. The three native stamina scenarios were rerun after this
repair with the same outcomes. The additional regression brings the final count
to 51 focused / 1,559 total tests.

`lifecycle.json` observes one 1,048,576-byte morph upload in the Guide context,
unchanged over three reopenings. The shared CPU attributes remain 656,088 bytes.
The first instrumentation attempt watched `texImage3D`, but this renderer uses
`texSubImage3D`; its failed receipt is preserved and is not a leak conclusion.
Game and Guide contexts each require their own upload when rendered. No general
FPS or physical-phone memory/thermal improvement is claimed.

Final preview delivery: `./assets/index-YEgY__om.js`; 258 runtime files, 75,771,261 bytes.
Local restricted origin, public origin and `dist` match byte-for-byte. The
production native report passes 12 cases: Hawaii/Atlantis Kraken Guide entries
and all four players in English desktop / Chinese 390 px, including start,
ability, forced graphics loss/restoration, resume, pause/Home and same-address
reload. No browser/resource errors or production debug hook; forbidden source
paths remain rejected. The original service identities are retained. Raw records,
source-preservation checks and final fingerprints are in the same evidence folder.
Videos are inspected after encoding; combat starts/caps and the isolated pose
viewer are explicitly identified. User acceptance remains pending.

## Opaque pursuer-camera rework — 2026-10-22

The user rejects the preceding foreground mask: their Atlantis screenshot shows
a grid-like remnant, and a large creature passing toward the rear disappears.
That render-discard approach is superseded, not accepted. The pending Kraken
pose, reach envelope and distance-priced escape are unchanged.

The replacement removes every camera shader injection and render wrapper.
Creatures retain ordinary opaque materials, source colors, alpha and visibility.
There are no new lights, GPU textures, extra passes or head-only proxy meshes.
The ordinary distant-entity culling remains unchanged.

Only the physical camera moves. A weak geometry cache holds eight longitudinal
skin envelopes, including morph bounds; a bounded nearby-instance pool updates
those envelopes from current bones. Preparation happens during model creation.
When the normal view is obstructed, a bounded search first favors a shorter arm,
then a rear shoulder or height adjustment with a little stand-off. It does not
orbit around to face the player's travel direction backwards. Existing terrain,
wall and floor tests veto unsafe candidates. Entry is responsive; release eases
back slowly. Pause freezes the view and new-round reset clears only camera state.
The ordinary unblocked follow pose is unchanged. Camera damping after a player
knockback/turn remains, so this is not a promise of zero camera displacement or
an always-visible player while two actual bodies overlap.

Development trials are retained under `.local/pursuer_camera_20261022/`.
Raising the lens alone failed beneath an overhead lord; a player-sized candidate
radius also failed around much larger creatures. The final search uses actual
nearby creature scale and a bounded side alternative. No creature is moved,
made translucent or hidden to solve these cases.

Fresh evidence:

- Six camera-focused tests cover unchanged clear framing/material callbacks,
  rear-body avoidance, front-to-back crossing without visibility changes,
  gradual recovery without drift, reset, walls/ceilings and hidden/small entities.
  The combined camera/Kraken/rule selection passes 14 tests. The full suite
  passes 1,562 tests; these numbers replace no earlier visual acceptance.
- Native Chrome game fixtures stage starting positions and invulnerability,
  then use real AI, body contact, follow-camera and keyboard movement. A 3 m
  player pursued by Leviathan and by the 28 m Ichthyotitan, plus a 30 m player
  against Leviathan, record zero sampled lens/player-skin intersections, stable
  pause and no browser errors. Desktop and 390 px touch-emulated layouts are
  covered. The latter is not a physical phone.
- A counterflow fixture suppresses hunting on one inspected Ichthyotitan so
  its ordinary movement completes a pass rather than turning into a chase.
  Its material stays opaque; near crossing stays visible. It is legitimately
  distance-culled later, around 193 m, under the unchanged world rule.
- The Node-only warm camera microbenchmark (one nearby creature, excluding
  world queries/rendering) measures p95 0.084–0.418 ms across four body types.
  It does not establish phone FPS, thermal improvement or the total frame cost.
  Per-instance camera pools contain plain bounds, not GPU assets or retained NPC
  references; weak shared geometry keys retain the existing ownership lifecycle.

The review videos distinguish the staged live-game pursuit from the isolated
counterflow inspection. Close jaws can still occupy part of the view, and an
emergency correction can be noticeable during a fast collision. The acceptance
criterion is a usable forward route without vanished or perforated creatures,
not removal of the threat's visible size. This candidate remains uncommitted
and unpushed, awaiting the user's visual and physical-device feedback.

Final restricted preview: entry `index-BhruFg1e.js`, 258 runtime files totaling
75,773,220 bytes. All bytes match dist/local/public, forbidden source paths are
rejected, and all four service identities are preserved. Twelve bilingual native
production cases, context recovery and same-address refresh pass. An additional
populated Atlantis chase records zero sampled lens/body intersections, including
other nearby hunters; natural close body occlusion is retained. Exact evidence:
`public/report.json`, `artifacts.json`, `atlantis_final_1280/report.json` and
`source_preservation.json`. Formal main/Pages remains unchanged.

## Stable follow-camera restoration — 2026-10-22

The user rejects the latest opaque avoidance candidate because the camera keeps
moving and interferes with control. They explicitly prefer the original stable
follow view, even with its original clipping, while asking for comparable-game
research. The earlier no-intersection tests measure geometry, not camera comfort,
and do not override this rejection. Both earlier camera experiments are rejected.

The current agent restores `startGame`, `followCameraPose`, `shortenCamera` and
`updateCamera` exactly to HEAD `8e974d7`. The ordinary creature factory is also
byte-identical to that checkpoint. Creature avoidance preparation, runtime
search and its abandoned tests are archived under
`.local/follow_camera_restore_20261022/rejected/` and removed from active source.
No foreground shader mask is restored. Original wall/terrain collision, player
steering, damping, sprint FOV and minion-birth framing stay as before. Camera
position no longer depends on nearby NPC bounds. Close-body occlusion/clipping
may still occur; this rollback intentionally does not claim to fix it.

The pending Kraken animation, morph bounds, capture pose, distance-priced
24–120 stamina release, HUD and Guide changes are unchanged. Before documentation
updates, 1,170 other source inputs match the rejected candidate exactly, with
only `main.js`/`creatures.js` changed and the two archived experiment files removed.
`runtime_preservation.json` records exact function/source comparisons.

### Comparable-game evidence and recommendation

Checked on 2026-10-22:

- [Monster Hunter Rise: Sunbreak, Capcom official options manual](https://game.capcom.com/manual/MHRISE/en/switch/page/4/4)
  explicitly supports showing the player's silhouette when a monster obscures
  them. This is a useful large-creature combat example: it communicates the
  player's position without requiring the occluding monster to disappear.
  The indexed official text was accessible; a direct web-tool open returned 403.
  The manual does not establish the entire internal camera algorithm.
- [God of War Ragnarok, official PlayStation accessibility guide](https://www.playstation.com/en-us/games/god-of-war-ragnarok/accessibility/)
  describes a directional off-screen enemy indicator for incoming attack
  direction/type, as well as separately adjustable camera sway/shake. These
  cues help retain combat information without requiring every attacker to be
  visible. This is a combat/readability comparison, not an underwater game.
- [Unity Cinemachine Deoccluder documentation](https://docs.unity.cn/Packages/com.unity.cinemachine@6.6/manual/CinemachineDeoccluder.html)
  exposes collision filtering, minimum occlusion time, smoothing and damping.
  These are engine techniques, not proof that any particular game uses them.
  Smoothing alone does not guarantee stable framing when a huge moving creature
  repeatedly blocks both the lens and the player.

Recommendation for ABYSSAL: keep the restored follow camera. If a further
prototype is requested, evaluate a subtle player-only silhouette when genuinely
occluded, alongside the existing lock/threat cues. A silhouette locates the
player but cannot reveal the forward terrain behind a fully occluding body;
a direction cue conveys threat, not depth. Neither should be advertised as a
complete clipping fix. Do not automatically reintroduce camera sidestepping,
large-creature fading, attack-rule changes or another visual experiment.

This change remains uncommitted/unpushed; formal main/Pages is unchanged.
Native validation and public artifact receipts are recorded in the rollback
folder. Desktop touch emulation is not physical-phone validation.

Rollback validation: 48 targeted Kraken/rule/encounter tests and formatting/build
pass. Four fresh native Chrome fixtures cover a large lord chase, an ordinary
28 m pursuer in desktop/390 px layouts, sprint/turn, counterflow passing and
pause. All record stable pause and no browser errors. Original clipping is
explicitly observed (22/89 lord samples, 2/89 desktop NPC samples, 1/88 narrow
NPC samples); these are fixture counts, not general clipping rates. No new
camera correction is active, and there is no creature fade. The decoded live
pursuit recording is retained, including the unresolved body occlusion.

The public entry is now `index-Lfh84ZQG.js`. All 258 runtime files (75,766,925
bytes) match dist/local/public; 11 private/source paths remain inaccessible,
tunnel ready and all four service process identities are unchanged. Six fresh
production native cases cover both regional Kraken Guide entries and a player
round in English desktop and Chinese 390 px, with ability, graphics recovery,
pause/Home, no production debug hook, and same-address refresh. No page or
resource errors. These checks verify restoration/delivery, not user comfort or
physical-phone performance. Exact receipts: `native_summary.json`,
`public/report.json`, `artifacts.json`, `runtime_preservation.json` and
`final_fingerprints.json` in the rollback folder. No commit or push.

## Local checkpoint acceptance — 2026-10-22

The user requests committing this version before trying a player silhouette.
All delivered inputs match the final rollback fingerprint before these
acceptance-only notes. The current Kraken pose/escape-cost work and restored
original follow camera form this local checkpoint. Rejected avoidance/fading
implementations remain archived development history. No push or main release
is authorized. The next silhouette experiment is a separate review candidate.
