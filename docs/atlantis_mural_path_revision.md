# Atlantis mural path — implementation review, 2026-10-31

**Status: accepted for local checkpoint, 2026-10-31.** The user authorizes a
local commit of the mural route, membranes and current-gate retry. No push,
release or personal Skill change is requested. Earlier candidate statuses and
full-reset video receipts below are historical. The light-seal checkpoint is
`3c0905e`.

## Production brief and behavior

Preserve Atlantis's carved stone, bronze fittings and marine iconography. Reuse
the accepted local HF obelisk and waterwheel-frame assets; this batch does not
claim a new HF generation. Eight distinct beveled reliefs are original geometry:
dolphin, conch, starfish, turtle, trident, amphora, anchor and scallop. The mural
and all gates share the same glyph geometry, so matching does not depend on
color, sound or different depictions of the same symbol. Disc bearings physically
join the overhead beams. World-space gate numbers and symbol names sit on the
beam where normal follow-camera approaches can see them.

The existing Moon Harbor sanctuary upper hall contains five numbered symbols.
Players memorize them, then use normal swimming to cross five numbered gates in
order. The current gate has four equally timed symbols, each held for four active
seconds; the outer rim turns while the actual relief stays readable. Each new
expedition picks distinct mural symbols, candidate orders and initial phases.
No UI, Guide or minimap reveals the required sequence outside the mural.

Only the active gate judges an entrance-to-exit crossing through its aperture.
The swimming front, not the trailing body, sets the crossing time. Swept timing
samples the displayed slot at that crossing fraction, including symbol changes.
A correct crossing activates the next gate and advances its minimap marker.
Wrong passage costs 15 **base** damage through normal character resistance and
retains completed stages and retries only the current gate; clues and cycle
orders remain and the symbol clock continues. Three active
seconds of recovery and a fresh approach prevent repeated damage. Damage
protection cannot be used as a free answer probe. Reverse passage, side bypass,
dormant gates, static overlap, pause and large setup jumps do not submit.

The fifth correct crossing grants the mechanism requirement and plays the
accepted shared puzzle-success cue once. There is no final button. The key,
guardian and chest requirements remain. Water, light and mural are exclusive
random choices with equal initial weights; inactive roots and colliders are
removed, though factories are constructed together. Mural keys exclude the
sanctuary and connected harbor interior; later gates are exterior locations.

## Placement and revisions from actual play

The first three gates follow the central route. The last two use the eastern
ruins, with side bypasses and waiting space. Base x/z coordinates are
`(0,-245), (0,-375), (0,-545), (220,-710), (260,-820)`; three checked variants use
x shifts `0,-6,+6` and z shifts `0,+8,-8`. Heights come from the high point of
the actual supporting terrain plus fitted passage clearance. Columns extend
to that terrain; the complete frames remain inside the world bounds.

Initial built-site checks rejected entrances obstructed by stairs/pediments.
The first live test then reached stage III but died near the stage-IV trial:
the original central deep route entered the court Kraken's territory. The final
two locations were moved east, without changing lord AI, wildlife or damage.
Geometry tests now cover all three placement variants, 3/16/30 m bodies,
terrain clearance, frame bounds and waiting/passage margins outside all three
Kraken territories. This is safer siting, not a puzzle-wide combat exemption.

Visual inspection also moved gate numbers/symbol names from high above the disc
to the crossbeam. The shallow mural remains fixed and can be revisited. Nearby
read-only guidance explains the order, entrance direction, penalty and reset;
it never adds a click target or displays the correct next answer. Close to a
gate the hint repeats its currently displayed candidate name, so the overhead
disc leaving the camera frame cannot obscure the submission state. This does
not reveal whether the candidate matches the memorized mural.

## Initial verification (before the current-gate retry revision)

- The regression suite passed **2,146 tests** after updating two old assumptions:
  Guide count and key-building exclusion now depend on the selected family.
  The later east-side placement and candidate-symbol caption changes passed
  28 focused tests, including all eight mural tests.
- Generated problems are checked across 300 seeds. All 1,024 candidate sequences
  of a sample problem produce exactly one successful sequence. Tests also cover
  failure at every stage, full reset with unchanged clues, pause/protection,
  cycle-boundary timing, reverse/blocked passages and completion once.
- Actual native-browser passage receipts and demo frames are in
  `.local/atlantis_mural_20261031/`. Approaches/body sizes are staged while paused;
  symbol waiting and all crossing judgments use ordinary running gameplay.
  There is no puzzle-state, clock, health or completion injection. Between-gate
  travel is omitted from these focused recordings.

Final browser/layout, preview and delivery receipts are appended below after
validation. A state-machine test or staged passage demo does not establish the
pacing of a full unguided expedition. Long-distance retry cost and actual phone
control feel remain for player review; desktop touch emulation is not device
performance or multitouch acceptance.

## Initial native and layout receipts (historical full-reset version)

The final desktop run read the mural, passed I, intentionally failed II, then
retried I–V successfully with staged 3/16/30 m body lengths. All five progression
judgments and the failure/reset came from normal swimming. The objective became
solved and exactly one `mechanism` audio call was observed. No key or guardian
flags were staged. Videos are silent screen captures, not a fresh audio audition.

Chinese and English narrow desktop viewports (390×667 and 320×568) keep the hint
inside the viewport with `pointer-events: none`. Pause freezes the symbol clock
and hides the overlay; this check found and fixed a stale hint on the pause
screen, also covering the shared light hint. The final 36-test integration set
passed after this fix (mural, light, preparation, bilingual Guide and run records). World glyphs and the current-name
caption were visually reviewed. Actual mobile-browser/physical-device comfort
and a new performance benchmark are not claimed.

Two H.264 MP4 demonstrations are retained with inspected covers:
`01_壁画观察与失败重置.mp4` (21.13 s) and
`02_五道符印顺序通过.mp4` (33.43 s). Both are 1280×720; they omit
cross-map journeys and stage the approach positions while paused. Final code
formatting, the build and `git diff --check` pass.

The existing restricted preview is rebuilt in place; its entry is
`index-gvYfQSlY.js`, with `index-BbU7JgJX.css`. The public JS and CSS hashes match
the local build; repository/private paths return 404. Public browser launch
verification is recorded in the task evidence directory. No Pages deployment,
main merge, commit or push is performed.

## Membrane follow-up — 2026-10-31

The following first delivery used the former full-reset rule; the current-gate
retry follow-up below supersedes its failure behavior and second video.

The user requests a visible barrier inside every gate, with state feedback and
symbol-specific effects. `atlantis_mural_membrane.js` now adds a double-sided,
semitransparent sheet exactly spanning the existing 40 × 30 crossing aperture.
It is permeable and adds no collider. Five sheets share one plane geometry;
existing glyph geometry is reused, with no new texture downloads, point lights,
particle allocation or animation loop. The factory-owned materials and geometry
follow the existing disposal path. Distance culling is unchanged.

Dormant gates have a quiet slate-blue film and no candidate projection. The
current gate projects the same relief as its overhead disc, with flowing light
and one of eight patterns: wave bands, spiral, five-fold contours, shell lattice,
vertical rays, concentric ripples, chevrons or a fan. Each candidate uses the same
opacity/contrast budget. Switching candidate creates a brief outward water ripple;
the new glyph and pattern take effect together, with no old-symbol crossfade
that could misrepresent the actual judgment. The membrane does not receive the
hidden answer. Changing that answer without changing the candidate leaves its
active shader state and glyph visibility unchanged in the regression check.

A successful crossing dissolves the film outward from the actual swimming-front
contact point, leaving a softly lit rim; the next gate energizes. Failure produces
one short red reaction and restores all previous films, including a non-active
recovery state at gate I. Protected contact gets an amber response without judging
the answer. Existing damage, ordering, candidate timing, resets, minimap markers
and random-family exclusivity are unchanged. Pause freezes the effect clock.
Reduced-motion mode freezes pattern motion and removes moving ripples while keeping
current glyph, state, color and result feedback.

The 44-test focused set passes (mural, water, light, Guide and run records), as do
formatting and the production build. Real-browser shader compilation caught and
fixed a GLSL reserved-name issue before delivery. Four live candidate patterns,
dormant film, actual pass dissolution and the incorrect-contact reset were
visually inspected. Evidence is in `.local/atlantis_mural_membrane_20261031/`.
The first native run completed I, failed II, and then passed I–III, before ordinary
predators killed the character while waiting in the deep region; its receipt is
preserved as `native_predator_interruption.json`. Follow-up waits use the shallow
staging area; approaches remain staged while paused, and crossings still use
ordinary controls. This effects review does not claim a new unguided whole-map
balance pass or physical-phone performance measurement.

A final focused run passes all five gates with a 30 m character, using short
staged approaches and shallow waiting between gates. The fifth opening sets the
mechanism objective and invokes its accepted cue once. Normal wildlife still
damages the character in deep water; no health, protection, puzzle state, clock
or completion flag is injected. The second interrupted run is also preserved as
`native_contact_interruption.json`; the successful final receipt is
`native_proof.json`. These are controlled effect/crossing checks, not an
uninterrupted journey between gates.

A 390 × 667 desktop viewport and desktop reduced-motion mode were inspected.
The central candidate remains readable; reduced motion holds the flow time at
zero, and pausing freezes both symbol and effect clocks. The published entry is
now `index-L7onYc0v.js`. Public entry JS, engine and CSS match their local hashes;
all 1,240 runtime source inputs still match the build fingerprint, and private
paths return 404. Two silent H.264 clips (19.27 s and 11.53 s) show dormant/current
films, four candidate appearances, successful dissolution and failure/reset.

## Current-gate retry follow-up — 2026-10-31

The user's latest rule replaces full-route failure reset. A wrong crossing still
charges 15 base damage through shared resistance/protection and starts three
active seconds of recovery. It retains completed gates, the current minimap
target, mural clues, cycle order and advancing symbol phase. Only the failed
gate flashes red; previously passed membranes remain dissolved with their lit
rims. A fresh entrance-side crossing is required after recovery. Water-level
reset behavior and the light-seal exception remain unchanged. Chinese and English
world hints, notifications, Guide and repository puzzle rules agree.

All 44 focused tests pass, including failure/retry at each of the five stages,
retained passed-film state, active-only failure feedback, marker preservation,
recovery without automatic advancement, and original crossing/penalty guards.
Formatting, production build and diff whitespace checks also pass.

The new native run passes I, deliberately fails II and retries II successfully.
The observed completed counts are 1 → 1 → 2; the minimap stays on II after the
failure and advances to III after retry. Health falls from 100 to about 85.6
with ordinary recovery already running. It produces no premature completion cue
and leaves the expedition mechanism objective incomplete at 2/5. Approach
positions and the 10 m body size are staged while paused; waits and forward
crossings run normally, without clock, health, protection or puzzle-state edits.
This is a focused regression, not a full-map journey. Evidence:
`.local/atlantis_mural_membrane_20261031/current_gate_retry.json`.

The silent 1280 × 720 H.264 clip `03_新版_失败只重试当前门.mp4` (5.17 s)
shows the three crossings with travel/waiting omitted. It replaces the prior
second video `02_穿越消散与错误重置.mp4`; the first pattern-cycle video remains
valid. Updated preview entry: `index-CkSboYEq.js`. All 1,240 runtime inputs match
the build fingerprint, and public entry/engine/CSS bytes match local output.
Private source/repository paths remain inaccessible. No commit or push.

Public-browser validation after a normal cached refresh starts an Atlantis
expedition, accepts steering and pauses successfully with the new entry, no
page errors, no failed resource responses and no exposed development API.
An earlier cold concurrent preload hit the temporary tunnel's request limit;
that receipt is preserved separately and does not constitute a clean cold-load
benchmark. The recovered normal-load receipt is `public_browser.json`.

## Accepted local checkpoint — 2026-10-31

The user accepts the delivered mural path and requests a local commit. The
checkpoint includes five sequential cycling-symbol passages, the shared mural
and gate glyphs, eight-pattern membranes, native crossing feedback, three
placement variants, exclusive puzzle selection, bilingual guidance, compatible
run records and the final current-gate-only retry rule. Failure retains previous
gates and the active minimap destination while preserving the 15-base-damage
penalty and three-second recovery.

Before acceptance-only documentation edits, all 1,836 recorded source/test/build
inputs and 965 runtime artifacts match the delivered preview fingerprint. No
additional gameplay change is introduced. The 44-test focused set, successful
I → failed II → successful II native receipt and recovered public-launch check
remain unchanged-input evidence; they are not claimed as newly repeated tests.
The reviewed five-gate completion and documented native/phone/cold-load limits
retain their original scope. Formatting and staged diff checks accompany the
local commit; no push, main release, version change or personal Skill edit.
