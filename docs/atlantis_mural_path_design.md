# Atlantis mural path — rotating-symbol memory route

**Status: accepted for local checkpoint, 2026-10-31.**
Accepted light-seal work remains locally committed as `3c0905e`. The mural-path
work is authorized for local commit; see [implementation and evidence](atlantis_mural_path_revision.md).
The original proposed values below are now initial runtime settings, awaiting
player feedback on challenge and travel cost.

## Current user direction

A mural in an existing building near the shallows shows at least five marks.
Five numbered mechanisms extend from shallow to deep water. Only the current
mechanism is active, and its position is marked on the minimap. Its rotating
indicator cycles symbols. Passing at the correct symbol completes that stage
and activates the next. Passing at an incorrect symbol causes a penalty and
requires retrying only the current stage. Previously passed gates stay complete. These instructions replace the previous three-choice stations
and delayed final-test proposal.

Use **one compact passage per site**, rather than multiple alternative doors.
The challenge combines remembering the mural sequence and choosing when to cross.
Make the timing generous enough that remembering remains the main challenge.
The timing, symbol-pool size and damage numbers below are recommended starting
values, now accepted by the user; a full unguided balance study is not claimed.

## Player journey

1. A sheltered harbor building near the shallow edge holds five large numbered
   mural panels with a reading-order arrow. Example only:
   **dolphin → conch → starfish → turtle → trident**. The mural remains visible
   for unhurried observation and later revisits; it does not flash briefly.
2. A read-only hint explains: memorize the order, follow the active numbered
   minimap marker, wait for the matching symbol and swim through the marked
   entrance. A wrong crossing costs 15 base health and requires retrying the
   current gate; earlier progress is retained. Normal swimming remains the only input.
3. Initially only stage I is active. Its symbol disc turns and cycles through
   four candidates: the required symbol and three distractors. A large fixed
   number identifies the stage independently of the rotating symbol.
4. A valid crossing while the required symbol is displayed seals that stage as
   complete, gives brief confirmation and activates stage II. The minimap moves
   its active marker to II. Repeat through V.
5. Passing V correctly completes the mechanism immediately, releases the final
   seal visually and plays the accepted shared puzzle-success cue once. There
   is no extra final test stone or hidden confirmation after the fifth crossing.
6. An incorrect active-stage crossing charges once, with three active seconds
   of recovery. Completed gates remain open and the minimap keeps marking the
   failed current gate. Return to its entrance for a fresh attempt; the player
   stays in place. The mural, symbol orders and sites do not reroll, and the
   symbol clock continues. Rereading the mural is optional.

## A compact, legible mechanism

Each site has one carved passage supported by existing ruins or a small stone
frame, with a turning symbol disc above its threshold. Preserve visible supports
and connections; do not leave a decorative machine suspended off its mount.
A lit threshold and entrance-side arrow identify the exact crossing line and
intended approach direction. Provide a wide side bypass and waiting space.

Compact means one structure and limited decorative bulk, not a tiny opening.
Verify actual aperture and approach clearance for 3, 16 and 30 m characters,
including body width, fins and normal follow-camera visibility. Small bodies
must not need pixel-perfect steering and adults must not clip through the frame.
Exact dimensions depend on those geometry checks, not a guessed radius.

Recommend a symbol change about every **four active seconds**, with a clearly
readable held symbol for most of that interval. The outer disc/rim may turn
continuously while the current emblem remains readable from the waiting area.
A neutral segmented rim can indicate time until the next symbol; it must never
mark the correct symbol or change pace according to correctness. Avoid visually
ambiguous half-old/half-new symbols at the judgment line: presentation and the
current logical symbol must switch together.

Use recognizable shapes and optional localized names, not color or sound alone.
Show “Stage 3/5 — wait for the mural's third symbol” without repeating the answer.
Completed stages may visibly retain the symbol actually passed; future stages
remain dormant and neither accept input nor display an answer. Reduced motion
stops decorative spinning while preserving readable symbol changes and timing.

## Crossing and contact contract

A deliberate passage across the marked threshold is the submission. Judge the
symbol at the instant the character's **visible swimming front crosses that
plane through the opening from the indicated entrance side**. The rest of the
body crossing later cannot receive a different result because the disc changed.
Make this timing visible with one pulse at the threshold; do not wait for a long
tail to clear and then retrospectively fail the attempt.

Use the same active-time phase for the visible symbol and judgment, including
swept crossing time during fast movement. Fit the crossing point to each playable
anatomy; a feeding anchor or whole-body overlap is not automatically the correct
front. Terrain, the frame and solid walls must block illegal through-wall events.

Approaching, waiting, touching the frame, moving alongside, crossing a dormant
stage or returning through the exit side does not submit or penalize. Entrance
arrows and contextual text explain the one-way trial. No need to toggle buttons,
click a panel or acquire a new ability. Ordinary collision and threats remain.

Only the one active stage can judge. One swept crossing produces one outcome;
stationary overlap, wobble, pause/resume, teleport-like setup jumps or a large
frame step cannot complete several stages or repeat damage. Spacing and a fresh
entrance approach prevent a newly active gate from judging an existing overlap.

## Memory, navigation and state feedback

Only the original mural shows the full required sequence. Do not reproduce it
in the HUD, Guide, radar or local hints. The minimap marks **where to attempt the
current stage**, never which symbol to wait for. Keep the mural locatable for
voluntary rereading. External notes/screenshots are not policed.

The HUD shows completed progress, such as “Seals opened: 2/5,” and the current
stage. Correct crossings give immediate feedback as the user requests; the prior
proposal's neutral-selection-only rule no longer applies. Before crossing, all
candidate symbols have the same brightness, duration and sounds. No anticipatory
green light or answer-dependent “ready” hint.

Failure copy: “Wrong symbol. Damage dealt; progress kept. Retry this seal.” Show
the actual health effect separately. Do not display the correct answer on failure.
Completed stage sounds are short acknowledgments; reserve `quest_mechanism` for
actual five-stage completion.

## Placement and randomization

The placement brief uses the current districts in `src/atlantis_city_plan.js`:

| Stop  | Candidate area                                 | Role                                             |
| ----- | ---------------------------------------------- | ------------------------------------------------ |
| Mural | Existing harbor building near the shallow edge | Readable observation site, separate from the key |
| I     | Outer Moon Harbor                              | First timed passage away from the mural          |
| II    | Drowned Agora                                  | Public courtyard or open colonnade               |
| III   | Sacred Avenue                                  | Shrine threshold with a swimming bypass          |
| IV    | Poseidon Acropolis outskirts                   | Deeper ruin away from compulsory boss attacks    |
| V     | Deep approach to Poseidon Temple               | Final passage and visible seal, before the vault |

These are the design districts. Final terrain-checked coordinates are recorded
in the implementation review; natural full-route travel times are not measured.
Validate actual increasing route depth against terrain, adult access and camera
sightlines. Use a few verified east/west templates with a generally progressive
course rather than long cross-map zigzags. Preserve normal wildlife and combat;
reading/waiting sites need usable retreat and existing recovery food nearby.

Choose five distinct mural symbols from a small clearly distinguishable pool.
Each station has the matching mark exactly once in its four-symbol cycle and
three distinct distractors, preferably including marks from other mural stages.
Vary cycle order/initial phase across stations, without making a fixed first
symbol or a predictable global beat the answer. Every mark receives the same
readable dwell. Bound generation and retain a validated fallback. Retry keeps
the same mural, sites and cycle order. The symbol phase continues during
recovery; a failed attempt does not restart the cycle.

Reserve key and route together by canonical building complex, including connected
floors and excavations. Neither mural nor any of the five mechanisms may share
the key complex. Keep a legal hidden key site available and existing forbidden
plaque-adjacent sites excluded. Resolve conflicts by another checked route.

Mural now joins water-level and light as mutually exclusive expedition choices.
Only the selected family is attached to the scene and collision set; factories
are constructed together and inactive objects are detached.

## Penalty, recovery and fairness

Wrong crossings require **retrying only the current gate**. Passed stages and
the current minimap marker are retained. They do not remove a collected key,
guardian victory or other expedition achievements. Cost: 15 base health
through shared armor/protection/death rules, with three active seconds of recovery.
Normal death remains possible and is stated before the first attempt.

Do not judge an unchargeable attempt to provide a free answer probe. During
recovery or damage protection that would suppress the penalty, show that the
trial is temporarily inactive, keep the passage physically open, and require a
fresh approach after eligibility returns. Do not queue a future crossing/damage.
Pause freezes symbol cycles, trial recovery and progress. Reset/map change/death
clear pending contacts; completion is permanent for that expedition.

No global puzzle countdown is proposed. Travel, hunting, retreat and revisiting
the mural preserve completed stages until an expedition
reset. A late-stage failure retries locally. Check recovery and re-entry costs
before tightening reaction windows. No automatic teleport or trial-only
invulnerability is introduced.

## Completion and expedition integration

Passing V correctly grants the same single mechanism requirement and shared
`quest_mechanism` sound as other families. The key, true guardian and existing
30 m chest condition remain. Their distinct quest cues stay unchanged. Poseidon's
eye/trident awakening remains the light-seal family's separate visual payoff.
Update Chinese/English hints, Guide, minimap, objectives and compatible run
records together when implementation is authorized.

## Validation before playable acceptance

The implementation review records the completed checks and remaining playtest
limits against the following design requirements.

- Test gate sequencing, correct/wrong symbols, retained progress after failure at every stage,
  invariant retry clues, once-only health/reward/audio and dormant-family cleanup.
- Test display/judgment agreement at both sides of every symbol boundary,
  high-speed swept crossing, long bodies, retreat and reverse passage, overlapping
  frames, protection, pause/resume and newly active stage contact.
- Inspect supported body sizes, solid occlusion, bypass/waiting space, camera,
  normal speed and mobile control comfort. Stage timing is not accepted until
  actual approaches make the readable window usable.
- Record a complete native route, an intentional wrong stage with retained earlier progress,
  then retry. Distinguish staged station checks from natural travel/survival.
- Verify active-only minimap guidance, bilingual narrow layouts and reduced
  motion without leaking the remembered answer.
- A state-machine test does not establish readability, fun or tolerable retry
  cost. Those remain unverified until production and playtesting.

## Superseded design history

The initial concept used three symbols inside one room and kept the answer
visible. The first distributed proposal used five stations, three selectable
reliefs per station, neutral intermediate feedback and a separate final seal
check. On 2026-10-31 the user replaces both with one cycling-symbol passage per
numbered stage, immediate per-stage judgment, sequential activation and initially
a full reset after a wrong crossing. The user later replaces full reset with
current-gate retry and retained previous gates. The shallow mural and distributed memory objective
remain. A snapshot of the previous uncommitted draft is retained in local task
evidence; this section preserves the decision history independently of that file.
