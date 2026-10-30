# Temporary surface currents — 2026-10-30

## Accepted local checkpoint — 2026-10-30

The user accepts the latest HF flow and upstream-resistance revision and requests
a local commit. All 2,104 delivered input hashes match before acceptance-only
documentation updates. Existing 2,118-test, native, public and media receipts
retain their verified scope. Earlier pending/rejected labels below are historical:
the first candidate remains rejected, while the HF revision is now accepted.
No push or main publication is requested. Atlantis puzzle design is separate work.

## HF water-flow and reverse-current revision — 2026-10-30

The user rejects the first candidate's artificial appearance, unclear direction
and ineffective counter-current swimming. This revision replaces that candidate;
the earlier evidence below is retained as history, not acceptance. The creature
checkpoint remains `1f65b08`; this feature is still uncommitted and unpushed.

### Movement and readable direction

The previous system awarded a speed boost only when the player faced downstream.
Turning upstream or pressing slow removed that boost, so it did not behave like
moving water. The revised field applies the same downstream velocity regardless
of player heading. Swimming upstream is opposed and, inside the fast center, the
player is carried back downstream. K / the touch slow control affects the player's
own swimming only. Steering sideways or diving out of the actual lane removes the
current; boundary ramps and a short exit cooldown avoid abrupt recapture.

Both lanes still run horizontally at Y = -24. Existing paths, schedules, normal
collision/damage, stamina costs and the separate leaderboard ruleset remain.
There is no forced facing, descent or camera movement. Chinese/English Guide and
HUD text explain upstream resistance and physical lane exits. Radar arrows,
downstream water wisps and bright-headed microbubble trails agree on direction.

### Hugging Face provenance and rendering

The original effect texture was generated through the official
[FLUX.1-schnell Space](https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell),
using [FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell)
(Apache-2.0 model license). A 2D fluid texture suits this transparent effect;
there is no solid tunnel mesh asset or copied film artwork.

- Space revision: `2569ee41266dd6d3a5e84c2a5ea3f4ad6e4ff25e`.
- Seed 930301, 4 inference steps, 1024×512. The prompt requests thin irregular
  white/cyan fluid wisps and microbubbles on black, without rings, arrows or scenery.
- Runtime file: `src/assets/textures/ocean_current_hf_flow.webp`, 28,952 bytes;
  SHA-256 `bf540e7198b16f3fdbed97c41f035142a68b296341027622885057e6b805bf77`.
  Runtime bytes equal the original downloaded image. The shader derives opacity
  from luminance and crops the sampled strip; no offline image editing is claimed.
- The service returned valid WebP bytes despite the initial PNG filename. A local
  PNG-only assertion failed after download; the receipt/extension was corrected
  without another generation. The rejected assertion receipt is retained.
- The dated post-generation quota response at 2026-10-30 12:16 UTC reports
  2,398.174387 / 2,400 included seconds remaining, zero over-quota usage, resetting
  2026-10-31 12:14:43 UTC. This is generation evidence, not a live quota assertion.

Six irregular transparent sheets per lane replace the regular spiral lines.
Wisps and microbubble heads advance downstream at the same 72 m/s reference speed;
the player receives the spatially ramped force. Lower-motion mode reduces density
and brightness, preserving directional movement. Both lanes share one texture.
The bounded material queue loads it, retries failures and recovers on reconnect.
Until successful loading, the sheets remain hidden and directional microbubbles
continue; there is no white placeholder panel.

### Verification and limits

Evidence: `.local/ocean_currents_hf_20261030/`.

- Full suite: **2,118 / 2,118**, with 28 focused tests. New checks cover reverse
  heading in all eight lanes, slow-input independence, integrated lateral/dive
  exits, collision blocking, directional trail motion and resource ownership.
- Actual native follow-camera runs cover forward, reverse, lateral exit and dive
  exit. Four maps × two lanes also carry an upstream-facing 30 m player downstream,
  with unchanged depth and no blocked frames in those samples. The controlled
  setup only sets initial size/position/facing and lane time; normal movement,
  actors, collision, health and stamina remain active. No frame-by-frame position
  override, invulnerability or camera replacement is used for gameplay clips.
- Native keyboard K and the real touch slow button leave the downstream force
  active while facing upstream. The 390×667 touch check is desktop emulation,
  not physical-phone evidence. Pause freezes the current clock/state.
- Blocking the HF texture URL yields `prepare.state = error`, hidden water sheets
  and 180 moving trails per lane. Removing the block and sending a reconnect event
  restores the 1024-pixel texture. The observed fallback screenshot has been saved.
- A normal switch to Amazon releases the four geometries, four materials and
  loaded shared texture exactly once; Amazon has no current field. The owned
  1×1 fallback texture also follows the disposal path. An inspection-script global
  variable collision and redundant touch-end cleanup were corrected; these were
  fixture errors, not silently counted as successful runs.
- Matching paused scenes measure **+4 draw calls / +5,328 triangles / +0 points**
  and 150,520 CPU geometry bytes. The 1024×512 RGBA texture with mipmaps is roughly
  2.8 MB GPU storage per current instance. The earlier effect had +7,680 triangles
  / +240 points and 203,360 geometry bytes, with no texture. This is a cost tradeoff,
  not a measured phone FPS or thermal improvement.
- An early trail shader used `pow` on potentially negative bases and produced a
  black bloom frame. Explicit squared products and clamped fractional-power bases
  fix that actual render failure. Rejected footage is retained. Final H.264 output
  is decoded and inspected, with matched before/after scene imagery.

The updated restricted build is `assets/index-ByVSSP5c.js`. All 955 current
build artifacts match the served local runtime. The 50 changed HTML/JS/gzip/image
artifacts match through the public route, including the new HF texture; 11
source/private paths are denied. Existing development/preview/tunnel/awake process
identities remain unchanged.

Native Chrome completes normal entry, pause/resume and Home in all four maps on
that compiled build, with no observed page errors or failed resource responses
and no private DEV hook. The new Chinese/English Guide rules are verified; the
English explanation fits the scrolled 390×667 desktop viewport at scale 1. Locale
selection uses the ordinary DOM change handler because background native select
option geometry was unavailable; Guide navigation uses native clicks/text input.
The first English search accidentally retained its Chinese query and was corrected
before recording the completed check. Final fingerprints and delivery receipts
accompany this evidence directory.
This candidate still needs user review; controlled lanes do not establish
whole-expedition balance or physical-phone comfort.

## Historical first candidate — superseded after user rejection

The following describes the first delivered implementation, including its former
slow-button release rule. Those controls and its spiral appearance no longer apply.

### Scope and checkpoint

The user requests a local checkpoint first, then a faster way to cross Hawaii,
Atlantis, Bermuda and Odyssey. The accepted creature attitude, aiming and Penglai
follow-ups are committed locally as `1f65b089b0cf0f1ae24ce7db333cbd772fb850b0`.
All 2,098 delivered inputs matched before the acceptance-only notes. Nothing was
pushed. The current feature below is a separate uncommitted candidate; main/Pages
remains v0.11.23.

### Gameplay

`ocean_current_rules.js` owns eligibility, timing, geometry and motion. Each of the
four ocean maps has two separate temporary lanes, one offshore and one returning
to the shallows. Their centers remain at world Y = -24; "deep sea" here means the
horizontal region above deep water, not a forced dive. Other regions are unchanged.

A new expedition starts with 12 active seconds of quiet, 6 seconds of formation,
72 seconds of full flow and 6 seconds of fading. The cycle repeats every 180
active seconds. The radar displays the two directions while the lanes are visible.
A bilingual Guide record explains availability and exit controls.

Swim into a lane along its direction to accelerate smoothly. The flow adds up to
72 world m/s to ordinary 12 m/s cruising, without extra stamina cost. There is no
teleport, camera cut, forced facing or vertical capture. A bounded horizontal
cross-flow gently compensates for the route's broad bend only while facing along
it. Steering sideways, diving, or using K / the touch slow control releases the
flow. After an intentional exit, remaining inside does not recapture the player;
leave the lane and re-enter to ride again. Entry/exit margins and current expiry
decelerate continuously. Ordinary sprint costs, hunger, damage, feeding and swept
terrain/vehicle/creature collisions remain active.

Pausing freezes the current clock and rendering state. Home, a new round and
terminal states clear it; region disposal releases the four owned geometry and
four material resources exactly once. A lower-motion setting slows decorative
flow while retaining movement. No new texture, light, RAF or audio source is added.
Ocean-current runs have a separate leaderboard ruleset. Earlier survival and
revised-expedition records remain stored and are not ranked against faster travel.

### References and adaptation

[Pixar's Finding Nemo page](https://www.pixar.com/finding-nemo) describes the East
Australian Current as an underwater highway. [NOAA's current overview](https://www.noaa.gov/education/resource-collections/ocean-coasts/ocean-currents)
provides the natural circulation context. Temporary paired tunnels, their schedule
and speed are gameplay adaptations, not claims about actual ocean-current speeds
or lifetime. No film character, shot, soundtrack or downloaded artwork is reused.

### Verification and corrections

Evidence lives in `.local/ocean_currents_20261030/`.

- Native scene collision queries check both complete lanes in all four maps for a
  30 m body, including lateral offsets of -13, 0 and +13 m. All are clear of static
  geometry. Terrain remains below the tube; Odyssey has the smallest bottom
  clearance, about 4.98 m. Initial western return placement hit Atlantis masonry
  and Troy's coast; it was rejected. Final return lanes are east of those structures,
  and Odyssey's outbound lane also moves east of its coast.
- Actual follow-camera traversal covers both directions in all four maps, with
  3 m Hawaii and 30 m adult cases elsewhere. The player keeps Y = -24 and stamina
  100 without sprint input. Maximum flow is 72 m/s. The Atlantis return initially
  had an insufficient wall-clock recording window; a separate run reaches the
  shallow endpoint in 12.81 active seconds. Actors and collisions remain live;
  only initial player size/position/facing and lane availability are controlled.
- Native keyboard braking, diving and lateral steering release the current.
  390×667 desktop Chrome touch emulation verifies the real slow button. A first
  implementation recaptured a player after releasing slow; an exit latch fixes it.
- Natural expedition time observes formation at 12.18 seconds and full flow at
  18.15 seconds. Pause is frozen; the corrected expiry observation reaches quiet
  at 96.68 seconds with zero speed and hidden geometry. The earlier expiry oracle
  incorrectly accepted the initial pre-frame quiet state and is superseded by
  `native_final_checks.json`.
- A matching paused scene measures +4 draw calls, +7,680 triangles and +240 points,
  with 203,360 CPU geometry bytes and no texture. Eight resources dispose on a
  normal switch to Amazon; no current system exists there. This is a bounded cost
  measurement, not a phone FPS or thermal claim.
- Native high-quality rendering exposed a fractional-power shader edge producing
  invalid values through bloom. Clamping its sine input fixes the actual dark
  frame; the rejected footage remains in the evidence directory. Final encoded
  H.264 footage and four-map stills have been inspected.

### Delivery verification

The final suite passes **2,116 / 2,116** tests, including the intentional-exit
recapture regression, actual collision queries and leaderboard compatibility.
The restricted preview was rebuilt to `assets/index-nR_c1JS5.js`. All 954 current
build artifacts match the local served runtime. The 17 changed HTML/JavaScript
artifacts also match byte-for-byte through the public route; 11 source/private
paths return 404. Existing preview, development, tunnel and awake processes remain.

Native Chrome on the public compiled build completes entry, pause/resume and Home
for all four maps. Hawaii's radar lanes appear on natural expedition time. The
production page has no private `__ABYSSAL__` hook, page errors or failed resource
responses in those observed flows. Chinese and English Guide text is checked;
English detail is readable at a 390×667 desktop viewport and scale 1. The background
native language selector did not expose selectable option geometry, so the locale
check used its normal DOM change handler; Guide search/selection/close used actual
clicks. An earlier mobile-emulation screenshot retained an incorrect viewport
scale and is superseded by the corrected narrow screenshots. This is not a
physical-phone test.

The delivered 42.77-second H.264 clip shows Hawaii outbound and Odyssey inbound
travel with the controlled setup stated on screen. Four-map stills accompany it.
Final media were decoded and inspected. `public_native.json`, `public_locale.json`,
`public_selected.json`, `full_tests_delivery.log`, `source_preservation.json` and
`final_fingerprints.json` retain the verification details. No other accepted
creature/art/audio assets were changed, and the current candidate is not committed
or pushed.

The candidate still needs the user's gameplay/visual review. Controlled routes do
not establish whole-expedition balance or physical-phone handling and temperature.
