# Atlantis waterwheel gate — first playable slice, 2026-10-31

Status: a review candidate, not a release. The two-valve implementation below
is historical and superseded by the six-valve revision later in this document. The user authorized production after
reviewing the replacement concepts. This pass implements the waterwheel gate
first, as proposed, before expanding to the other four puzzle families and a
randomized multi-building host pool. The rejected first implementation remains
withdrawn and archived; none of its technical passes establishes acceptance of
this candidate. No commit or push is authorized for this pass.

## Original two-valve playable contract (superseded)

The waterworks occupy the north lower gallery of the existing Agora Colonnade,
between the shallows and Poseidon Temple. The central approach remains open.
The present slice always uses this location; it does not claim five randomized
puzzles are installed.

Follow the visible spring, two valves, leaking branches and sealed accumulator.
Turn the valves to route the water into the accumulator. Both connections fill
its gauge over 3.5 active seconds. Changing a valve is free; a disconnected feed
drains pressure. Explicitly test the gate after filling the gauge. An unsuccessful
test costs 15 health once, with a three-second retry delay. Normal death remains
possible. Success drives the wheel and hoist, raises the gate over two seconds,
and grants the mechanism seal once. The seal does not require entering a narrow
enclosure.

Nearby players can explicitly hold position to operate. Steering or sprinting
returns to swimming; moving away or pausing clears the engagement. The inspection
view smoothly frames the controls while engaged, with separate portrait framing.
Normal hunger, enemies and damage continue; this is not a paused minigame.
Actions recheck active mode, proximity, occlusion and eligibility. Pausing freezes
pressure, retry delay and gate travel.

The expedition now needs the key, mechanism seal and true guardian seal before
the chest opens, retaining the existing 30 m collection condition. Hint plaques
identify the key building and waterworks entrance separately. Solving the
mechanism also reveals the true guardian's territory. Both languages, Guide,
objective copy, radar markers and records are synchronized. Earlier records stay
under their original rulesets; this candidate uses `waterwheel-2026-10-31`.

The conspicuous `sanctuary_lower_west` and `colonnade_east` key sites are removed.
Ten site definitions remain, but this fixed-host slice selects only seven:
all sites in the Agora Colonnade/archive canonical complex are excluded, so the
key and mechanism cannot be co-located. Retry and pause do not redraw the key.

## Art and ownership

Original isolated concept images were converted with the official
[Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2),
using its [MIT-licensed model](https://huggingface.co/microsoft/TRELLIS.2-4B).
Only included ZeroGPU time was used; every GPU stage had a fresh quota guard and
paid overage remained zero. The two raw GLBs were downloaded and verified before
ending their sessions.

| Asset                | Seed   | Raw GLB SHA-256                                                    | Runtime triangles |
| -------------------- | ------ | ------------------------------------------------------------------ | ----------------: |
| Bronze valve body    | 831001 | `573134787e72d59546ba0d8a3ecc9be39febb5e7ae0c39f8637fd4bab9f6a290` |             9,091 |
| Dolphin/trident gate | 831002 | `1d9019541f3e157b6aade38ce0ee671afdce2ccd7e54a60edf7c4ada2d75b857` |             7,370 |

The converter preserves the source appearance through simplified geometry and
rebaked color atlases, with source-derived vertex colors for loading fallback.
Two valve instances share one immutable asset. The generated gate is separate
from its stone posts, moving hoist and collision slab. Reused city masonry,
mechanical wheels, pressure gauge and directional flow complete the scene; no
new lights are introduced. Static obstacles enter the existing collision grid;
the moving gate uses the dynamic barrier path. Instance-owned resources and
reference-counted art are released without disposing shared city materials.

Evidence and private generation receipts remain in
`.local/atlantis_waterwheel_20261031/`. Private service URLs and credentials are
excluded from this document and deliverables.

## Verification and limits

The complete suite passes 2,123 tests. The subsequent mechanical-hoist visual
refinement passes the five focused waterwheel tests. These cover explicit
failure charging, cooldown, pressure connectivity, one-time success, paused
state, moving collision, reset/disposal, separated key draws and all six orders
of key/mechanism/guardian completion, including death eligibility.

Selected key routes and unchanged city geometry remain covered by the existing
focused tests. Fifteen swept body-route checks pass across the waterworks
approach, controls and return path at 3, 16 and 30 m. These are geometry checks,
not a claim of complete physical-device playthrough coverage.

Native and preview delivery details are recorded below after their final checks.
The remaining four families, multi-building random selection and first-time
player readability acceptance are still pending.

### Native and restricted-preview results

- Native desktop interaction completes a failed test, free valve changes, filling
  and opening through actual buttons. The pause fixture freezes state; 3, 16 and
  30 m players can reach both valves, stop, and leave by steering. The final
  portrait check uses a fresh 390 × 844 viewport and real touch input. Buttons
  remain on screen and the panel clears the main joystick/skill controls. This
  is desktop emulation, not a physical-phone measurement.
- Three H.264 clips show failure (6.1 s), routing/filling (9.47 s), and successful
  opening (7.93 s). Segment starts use prepositioned review fixtures; puzzle
  state, buttons, damage and recovery remain real. Captions and state readouts
  are explanatory recording overlays, not additional game UI. Health is not
  restored between these three recorded segments. No full natural expedition
  or guardian victory is claimed.
- Final localization and waterwheel checks pass 15 tests. Prettier and the
  production build pass. Fifteen swept route segments were checked again after
  the hoist refinement, all clear.
- The existing restricted origin is rebuilt in place as `index-j4BbkAlR.js`.
  Native public Chrome passes Chinese and English start/pause/resume/home,
  exposes no development hook, retains no rejected puzzle panel, and reports
  no captured script errors or failed resource responses. The existing service
  identities and previous runtime archive are preserved. Public HTTP comparison
  matches five changed delivery files (HTML, entry, CSS and both new textures)
  byte for byte; eleven source/private paths remain denied. The broader preload
  comparison was stopped as unnecessary; no all-public-resource comparison is
  claimed.

Preview: <https://saver-recorded-digit-could.trycloudflare.com/>. Refresh an
already-open page, select Atlantis, and use a hint plaque to locate the north
lower Agora gallery. The source remains uncommitted; main/Pages remains v0.11.23.

## Six-valve water-level revision

The user rejects the first task as merely opening every valve, specifies unequal
contributions and an exact target, and then requires at least five valves with no
automatic answer confirmation. The revised candidate uses **six** independently
metered valves. Each expedition has six different positive integer amounts and
one target with exactly one valid subset of three or four valves. A bounded draw
and a validated fallback guarantee a nontrivial solution; the layout and numbers
remain stable during retries and pauses.

Physical inscriptions identify I–VI and their contributions. A separate plaque
and fixed mark on the sealed chamber give the target. Opening adds the marked
amount once; closing returns it. Water-level motion is feedback, not a timer.
The visible chamber can pass through the target without permitting a premature
win: submission waits for the selected amount to settle. The game shows neither
an automatically calculated sum nor a green/checkmark/readiness cue for the
correct selection. All settled combinations enable the same test action when
the player can reach the lever; only explicit submission reveals the result.

Too-low and too-high tests each cost 15 health once and show the corresponding
failure explanation, with three seconds before retry. Adjustment and observation
remain free. Failure preserves selections, clues and the target. Correct testing
raises the gate and grants the existing seal once. Normal danger, hunger, death,
armor-normalized fixed puzzle payment, pause and restart behavior remain.

Six scaled instances reuse the existing HF valve geometry/texture; no new
inference or additional lights are needed. Supported two-tier masonry holds the
valves, independent pipes feed the chamber, and the existing hoist lifts the gate.
Larger players can use the wider forward passage: operating reach includes a
bounded body-length allowance while retaining actual occlusion and proximity.
The original close diagonal body route intersects the new upper support beam;
that collision is retained rather than deleting the visible beam's solid surface.

Chinese/English instructions and Guide are updated. Earlier completion records,
including `waterwheel-2026-10-31`, remain stored but do not compete with the new
`waterlevel-2026-10-31` ruleset. The same fixed mid-city room, key/host separation
and chest requirements remain. This is still one family, not the full proposed
five-family randomized system. User playtest acceptance and physical-device
performance remain open.

Evidence is saved in `.local/atlantis_waterlevel_20261031/`; the previous candidate
files and diff are archived there before editing. Verification receipts are
recorded after final runtime checks below.

### Six-valve verification and delivery

- 37 focused tests pass, including 203 generated/edge-case challenges with all
  64 valve combinations enumerated per challenge, invalid actions, exact sums,
  under/overflow, transient target crossing, fixed contributions, free reversal,
  pause, single settlement, reset/disposal, all objective orders and old-record
  retention. This pass does not claim a new full-suite run.
- Fifteen swept route segments pass at 3, 16 and 30 m using the wider forward
  approach. Fresh native controls/retry/pause checks cover all six controls and
  the lever at those sizes. The earlier close diagonal that touches the support
  beam is recorded above; no decorative collision was removed to hide it.
- Native low/high submissions each apply the 15-point payment; normal health
  recovery between samples remains active. A solved selection does not auto-open.
  The captured pre-submission status, test label, enabled state and color are
  identical for a wrong and a correct settled combination. Explicit correct
  submission raises the slab and grants the seal.
- Chinese and English portrait checks at 390 × 844 keep all eight buttons on
  screen and clear the main joystick and skill controls. Actual touch toggles a
  valve in both locales. This is desktop emulation, not physical-phone validation.
- Three H.264 clips show below-target failure (5.35 s), all-open overflow failure
  (14.22 s), and calculated exact selection plus opening (16.28 s). They use
  prepositioned review stations and actual buttons/state/damage, with clearly
  labeled recording captions; they are not a complete natural expedition.
  A shared-browser tab change interrupted an earlier recording attempt; final
  captures bind all operations to the existing game target on the same daemon.
- Formatting, production build and diff whitespace checks pass. The existing
  restricted preview serves `index-CtohRHRI.js`. Public HTML, JS, CSS and both HF
  textures match local artifacts; eleven source/private paths are denied.
  Native public Chinese/English start, pause, resume and home checks pass with
  eight new controls, no development hook and no captured resource/script errors.
  Original service identities and the preceding runtime archive remain intact.

Refresh the existing preview, select Atlantis, and follow an inscription to the
north lower Agora gallery. Source remains uncommitted on `fix/all-region-ecology`
after `ba1eb8d`; main/Pages and personal Skills are unchanged. User review of
arithmetic difficulty and readability remains pending.

## Interaction readability revision

The user accepts the arithmetic design, but reports that a newcomer cannot tell
how to operate, reset or submit. The previous station-based verification did not
establish discoverability: its broad near prompt exposed controls before the seven
separate interaction points were reachable, and the canvas-only videos omitted the
real HTML buttons. Those receipts remain valid for their narrow scope, not for
new-player usability.

The revised control contract supersedes the seven-point approach:

- A nearby prompt explains how to swim into the clear front operation area. Start
  controls becomes available only with clear sight to the mechanism. The rear,
  outside range and solid cover remain ineligible.
- Start controls stops swimming immediately and exposes all six controls from the
  same area. Each button names the valve, its amount and the next action (Open or
  Close); pressed styling identifies the current open state only. An elevated
  inspection view keeps the adult body clear of the machine.
- Close all is an explicit, free reset of selections, including during the retry
  delay. It drains the selected water normally, preserves the six numbers and the
  target, does not restore health and cannot clear the retry delay or undo a win.
- Pull test lever is visually distinct and states the 15-health failure payment.
  The three-step instruction explains toggling, clearing and submitting. Water
  motion, retry delay and damage protection each explain why submission is
  temporarily unavailable; free adjustment and leaving remain available.
- Correct and incorrect settled selections have identical pre-submission status,
  button text, color and enabled state. No total or automatic correctness hint is
  added. Leaving or steering resumes swimming and preserves progress. Pause
  freezes the puzzle. Ordinary enemies and damage remain active while operating.

The arithmetic, target generator, fixed mid-city location, separated key,
mechanism seal, objective requirements and current record ruleset are unchanged.
Only the first family exists; four additional families and randomized hosts remain
pending. Evidence is in `.local/atlantis_waterwheel_interaction_20261031/`, including
an archived source baseline and the previous diff. Current verification and preview
receipts are appended below after completion.

### Interaction verification and delivery

- 39 focused tests pass, adding free-clear challenge/cooldown/terminal invariants
  and shared front-area accessibility/solid-cover checks to the arithmetic and
  objective suite. Fifteen swept approach segments remain clear at 3, 16 and 30 m.
  Formatting, production build and diff whitespace checks pass.
- Native desktop review starts at an explicitly prepositioned exterior approach,
  then swims normally into the prompt and operation area. It exercises opening,
  individual closing, free clearing, an all-open failed submission, clearing during
  cooldown, a calculated selection and explicit success without further teleports
  or answer injection. A 3 m run keeps ordinary pursuer damage active; the delivered
  30 m run avoids that interference. This is not a full expedition from spawn.
- The recording captures the actual rendered page and HTML controls, not only the
  WebGL canvas. Wrong and correct settled submissions have identical status text,
  test label, enabled state and color. The failed test applies 15 health before
  normal recovery; clearing cannot waive it or re-randomize the puzzle.
- Both locales pass 390 × 844 native touch checks with 30 m characters: all nine
  controls have unobstructed hit centers and at least 44 px height; single-valve
  adjustment, leave/re-enter persistence, clear, wrong/correct submission and
  pause pass. An initial 3 m touch attempt was interrupted by normal enemy damage
  protection; it did not constitute a successful test submission. No invulnerability
  or ecology override was added. Physical-phone ergonomics remain unverified.
- The existing restricted preview now serves `index-CwCkDsBY.js`. Five public
  artifacts match local bytes, eleven private/source paths remain denied, and
  public native Chinese/English start, pause, resume and home checks pass with
  nine controls, no development hook and no captured script/resource errors.
  Service identities are unchanged; the previous runtime is archived at
  `.local/mini_preview_20261007/runtime_before_20261031_112748/`.

Refresh <https://saver-recorded-digit-could.trycloudflare.com/>, choose Atlantis,
and follow the inscription to the north lower Agora gallery. This interaction
revision awaits user playtest; the six-valve arithmetic design is accepted.
No commit, push, main/Pages publication or personal Skill modification occurred.

## Direct environment contact

The user accepts the six-valve calculation but replaces the button overlay with
in-world interaction. They additionally require a wrong final submission to
reset every selection and punish the player. This supersedes the preceding
panel controls, inspection camera and manual free-clear action.

- The six existing bronze wheels have visible extended shafts and actual solid
  contact discs. The independently labeled master valve reuses the accepted HF
  bronze kit. Values and open/closed indicators remain visible on scene plaques.
- Swim head-first into a wheel to toggle its branch; leave the outer contact
  margin before approaching again. Contact is swept, front-facing, wall-checked
  and latched. Continuous contact, jitter, pause/resume, cooldown expiry and
  teleport-sized movement cannot repeat an interaction or queue a submission.
- The same nose/body definition serves all character sizes, including squid
  whose feeding point is not its swimming front. Trigger size does not grow into
  neighbouring controls when the character grows.
- Touch the master valve to test. An incorrect high/low selection charges 15
  health once, closes all six branches and drains the tank. Numbers and target
  remain unchanged. Three seconds of retry delay and ordinary damage protection
  remain; adjusting branches is free. An unavailable touch is discarded with an
  explanation and requires a new approach, never a delayed surprise penalty.
- The bilingual overlay contains only instructions and branch states. It has no
  buttons or focus targets and does not intercept pointer/touch input. There is
  no held position, alternate camera, automatic sum or correct-answer cue.
- Contact attempts use resolved player movement, normal geometry, ordinary
  enemies and the shared damage function. Death/terminal states disable actions;
  pause freezes state. Correct submission still awards the existing mechanism
  seal once, and the gate collider follows its opening.
- New records use `waterlevel-contact-2026-10-31`; older arithmetic/panel records
  are preserved without mixing rankings. Only this first family exists; four
  remaining families and randomized hosts are still pending.

Evidence and archived pre-edit files live in
`.local/atlantis_waterwheel_contact_20261031/`. Verification receipts follow after
completion; no commit, push, main/Pages publication or personal Skill edit.

### Direct-contact verification and delivery

- 41 focused tests pass: 203 generated puzzles exhaust all 64 combinations;
  incorrect high/low tests clear every selection without rerolling; swept
  front approaches to all seven solid wheels are clear for 3, 16 and 30 m bodies.
  Entry/exit hysteresis, blocked/rear/teleport rejection, no repeated charge,
  death, pause, seal ordering, resource disposal, old-city preservation and older
  record retention are covered. This is a focused run, not a repeated full suite.
- Native Chrome at 16 and 30 m confirms swimming into a wheel, turning away and
  returning to close it using real keyboard steering. Long continuous attempts
  subsequently died to ordinary enemies; these unsuccessful attempts remain
  recorded and are not described as complete solves. No ecology, health or
  invulnerability override was introduced to make the demonstration pass.
- Short, bounded 30 m station reviews verify a wrong submission and a complete
  correct combination. Each station starts at a declared exterior review position;
  actual swimming triggers each action. No branch/answer/reward state is injected.
  A failed test closes all six branches and drains to zero while retaining clues;
  staying at the master beyond retry does not charge again. Native regeneration
  continues after the 15-health payment. Correct contact raises the gate and
  awards its seal; no automatic success occurs before that contact.
- Both languages pass 390 × 844 real touch-event review in desktop Chrome:
  slow-swimming contact, joystick steering, wrong master contact/reset and frozen
  pause. The passive panel has zero buttons, no pointer interception and clears
  all three movement controls. A first layout check exposed overlap with Slow Swim;
  the panel was raised and both final language checks pass. Physical-phone
  ergonomics and a full unassisted expedition remain unverified.
- Three H.264 clips show continuous open/leave/re-contact (20 s), wrong-test reset
  (7.83 s) and correct submission/opening (12.71 s). The latter two omit paused
  transfers between review stations and are explicitly segmented demonstrations.
- Formatting, build and whitespace checks pass. The restricted preview serves
  `index-LFv8EF-O.js`; five public artifacts match local bytes, eleven private
  paths are denied, and native public Chinese/English start/pause/resume/home
  checks pass without a development hook or captured script/resource errors.
  Original services are retained. All 1,228 runtime-input hashes match the final
  verified source snapshot. No commit, push, main/Pages or personal Skill changes.

Review at <https://saver-recorded-digit-could.trycloudflare.com/>; choose Atlantis
and follow the inscription to the north lower Agora gallery.

### Accepted local checkpoint — 2026-10-31

The user accepted this direct-contact revision and requested a local commit,
then reusable repository puzzle rules. All 1,228 runtime-input hashes match the
delivered snapshot before acceptance-only documentation changes. The 41 focused
tests and native/public checks above apply to that unchanged implementation;
this checkpoint does not claim another full suite or unassisted expedition.
Physical-phone ergonomics and a full unassisted expedition remain unverified.
The other four families and randomized host placement remain pending, and the
user explicitly pauses the next batch. No push, release or personal Skill
change is authorized. Earlier pending-review labels describe prior stages.
