# Atlantis environmental puzzles — replacement proposal, 2026-10-30

**Current status, 2026-10-31:** the user has accepted the first waterwheel slice:
a six-valve exact-level arithmetic lock operated by physical contact, with no
pre-submission answer cue. An incorrect master-valve test resets all selections
and applies a health penalty. The original two-valve connectivity draft below
is superseded. See the [implementation](atlantis_waterwheel_revision.md).
The remaining families and multi-building randomization below are still proposed;
the next batch is paused while the accepted slice is checkpointed locally and
reusable repository rules are recorded. No push is authorized.

**Earlier concept-review checkpoint, 2026-10-31:**
The user requested five concept images before further implementation. No new
puzzle runtime is installed. The user rejected the
first playable candidate because its goals and win/loss conditions were unclear,
and required placement between the shallows and Poseidon Temple. The entire
candidate has been withdrawn. Runtime is back at accepted local checkpoint
`ba1eb8d`; see the [withdrawal review](atlantis_environment_puzzles_review.md).

Five original built-in image_gen concept plates are saved under
`.local/atlantis_puzzle_concepts_20261031/`, with prompts and checksums. They show
controls, target and a successful route/state; labels and solution arrows are
review annotations, not a proposed always-visible answer overlay in the game.
The mirror plate was revised to show two actual changes in beam direction.
The submerged waterwheel uses a sealed pressure accumulator and gauge rather
than an open dry basin: a visual/physical clarification of the hydraulic goal.
These are appearance concepts, not measured room layouts or playable screenshots.

## What the first attempt taught us

Five internally different rules used almost the same wall board, dials and
central confirmation ring. Passing state-machine tests and recording a developer
solving them did not establish that a first-time player could understand them.
The relationship between a control, its effect and the objective was too indirect.
An unexplained return to a confirmation ring added another discovery task.
Moonbay Sanctuary was too close to the starting shallows, while Memorial Hall
was beyond the main temple. Both are excluded from the new host pool.

Start with the visible result: an identifiable gate or seal enclosure, something
physically preventing it from opening, and an operation whose effect is visible.
The mechanisms should occupy the existing architecture rather than share a
generic miniature puzzle board. Art polish cannot substitute for this contract.

## Location and expedition rules

- Proposed search zone: **Drowned Agora and Sacred Avenue**, between the harbor
  and the royal/temple approach. The city plan places these districts at world
  `z=-300..-680`. Start host screening around `z=-380..-650`; this is a proposal
  envelope, not a collection of verified playable anchors.
- Exclude the shallows, both harbor complexes, the temple and its vault, Memorial
  Hall and the necropolis. Keep the central avenue, lord attack envelopes,
  existing waterlock hazards and food corridors clear.
- Inspect the Agora public hall/archive and the Sacred Avenue's existing public
  buildings for suitable interiors. The archive is under `agora_bridges`; these
  count as **one complex**, not two different buildings. Its nominal 25.5 m lower
  clearance and narrow side exit do not establish a usable 30 m route. Existing
  side rotundas also need real interior/collision/camera checks before inclusion.
- Each expedition draws **one of five families**, then one compatible, verified
  building. Require multiple distinct eligible complexes before release. Do not
  silently use shallow hosts if the mid-city pool proves too small. Adapt the
  interior of an existing mid-city building if needed; no separate dungeon/map.
- The key and mechanism must occupy different canonical complexes. A basement
  does not satisfy separation from its upper hall. Filter by this identity before
  drawing a host, and keep the draw unchanged during retries, pause and resume.
- Existing hint plaques name the key building and mechanism building separately,
  with entrance guidance. They do not reveal the puzzle answer or exact key spot.
- The current first slice removes the two sign-adjacent key sites and excludes
  its host complex from key selection. Multi-building separation remains a
  requirement for the later randomized host pool.

## A common, readable interaction contract

The following contract guides the five-family design. The waterwheel slice now
implements it as recorded in the implementation review; the other families remain
proposed.

1. On approach, show the physical exit/seal and a short objective such as
   **“Select valve amounts that exactly match the engraved target.”** Keep the objective visible throughout.
2. Give each interactive object a contextual label such as “Turn valve” or
   “Turn mirror.” Desktop and touch use the same action; proximity alone never
   spends health or advances multiple steps. The swimmer remains in the normal
   game view, with no separate modal minigame or required carrying ability.
3. For the three adjustment puzzles, allow free preview. A clearly labeled
   **“Test mechanism — failure costs 15 health”** starts a deliberate attempt.
   Do not hide submission in a ring that must be left and re-entered. The trial
   animates the chosen flow/light/load; success and failure follow that result.
4. For the two movement puzzles, an explicit **“Begin challenge — failure costs
   15 health”** starts the attempt. Show their wrong-gate/hazard condition before
   starting. Ordinary exploration outside an attempt does not count as failure.
5. Success visibly opens the enclosure, exposes the seal and displays completion.
   The seal is credited once on success; an ornamental enclosure cannot force a
   grown player through a tiny opening. Show the overall expedition checklist.
6. Failure names the cause, applies one 15-point health deduction and ends that
   attempt. Pause/suspension freeze its timers. No repeated contact damage; retry
   is explicit after a proposed three-second recovery. Normal death remains
   possible and must be stated. Leaving the room cancels an attempt without a
   surprise penalty. Keep the same clue and layout on retry.
7. Support shape/text/motion cues, not color or sound alone. No camera hijack,
   surprise precision steering, or continuous giant explanatory panel. Targets,
   controls and progress must remain readable at the normal follow-camera angle.

## Replacement five-family pool

### 1. Waterwheel gate — original connectivity draft (superseded)

**Goal:** route pressurized water into a sealed accumulator that powers a gate wheel.
Two large valves route a small, fully visible channel network. Tracer water and
arrows show every branch while the player adjusts it. The drain is visibly
different and labeled; paths never disappear into an unexplained wall.

- **Success:** a test delivers water to the accumulator, its pressure gauge reaches
  the marked line and the wheel lifts the gate. Progress is the actual gauge reading.
- **Failure:** the test empties through the marked drain or stops at a visibly
  closed branch. Highlight the exact failed segment and deduct health once.
- **Randomization:** a few checked branch layouts and initial valve directions;
  no arbitrary network or invisible answer. Proposed first prototype.

### 2. Pearl-light seal — visible direction

**Goal:** illuminate the large crest above a sealed enclosure. A fixed pearl
lamp and two discrete-angle mirrors produce a continuous visible beam. The crest
is recognizable from the entrance; adjustment previews show its real endpoint.

- **Success:** a test keeps the beam on the crest for two active seconds; its
  outline fills and the stone seal separates.
- **Failure:** the beam misses during the test; show the actual endpoint and
  “The light did not reach the crest,” with one health deduction.
- **Randomization:** tested lamp/mirror positions and initial orientations.
  Receivers are generous; no pixel aiming, camera puzzle or moving hidden target.

### 3. Pearl balance — visible load

**Goal:** level a counterweight beam to release a gate latch. Three captive pearl
weights carry clear values, initially grouped on one side. Interacting with a
weight transfers it to the other pan through a visible guided motion; the player
does not need hands, physics pushing or a new inventory.

- **Success:** both sides match, the pointer sits on its center mark and the
  deliberate test releases the latch. Example: `1 + 2` balances `3`.
- **Failure:** a test with unequal loads visibly catches the latch; show both
  totals and deduct health once. Draft movements never punish experimentation.
- **Randomization:** small readable solvable weight sets and starting sides;
  either mirrored balanced solution is valid. No hidden relational riddles.

### 4. Tidal passage — readable timing

**Goal:** pass three intermittent water barriers to reach a visible seal at the
far end of an existing hall. Pumps visibly gather pressure before each release;
safe waiting bays and an active/quiet cycle are readable from the entrance.

- **Success:** cross all three barriers and reach the end marker; show `0/3`,
  `1/3`, `2/3`, `3/3` progress. No overall race timer.
- **Failure:** contact a releasing barrier during an active attempt. One health
  deduction ends the attempt; pressure stops for recovery and an unobstructed
  exit. Do not teleport or turn the camera. Restart at the entrance deliberately.
- **Randomization:** checked phase orders and rest windows. Windows and waiting
  spaces must allow a 30 m body, slow controls and mobile steering; do not copy
  existing passive hazard timings without testing the full crossing.

### 5. Mural path — readable sequence

**Goal:** follow the three-symbol route illustrated by an illuminated mural.
Large numbered mural panels show, for example, dolphin → conch → trident. At each
stage, the player chooses an arch carrying the matching relief. The chosen path
lights up behind them. The mural sequence remains available while moving.

- **Success:** pass the three matching arches in order; `0/3` becomes `3/3` and
  the enclosure opens immediately. No additional hidden confirmation action.
- **Failure:** enter a different marked arch during the attempt. Show the chosen
  and required relief, deduct health once and reset local progress for retry.
- **Randomization:** clue order and arch labels together, from checked layouts.
  This is observation and navigation, not a flashing-memory test. Keep the whole
  activity inside one host interior without wall clips or juvenile-only gaps.

## Reward and progression proposal

Keep the previously proposed overall requirements: conch key, mechanism seal and
true-guardian seal, in any order. Solving one mechanism also reveals a territory
clue to the true guardian. Existing 30 m pearl completion rules remain. The other
four families do not need to be completed in that expedition. Failure never
removes previously earned requirements. The current restored game still uses
the original key-and-guardian chest; this section is future design only.

## Next review gate

The direction is accepted; review the five requested concept plates before
implementing the replacement pool.
Recommend one **Waterwheel gate** prototype in a mid-city public interior first.
Show entry, the readable objective, a wrong trial and its exact consequence,
correction, visible gate opening, and the awarded seal in ordinary follow view.
The first viewing should establish what to do and what success/failure means,
without developer narration teaching hidden controls.

Then test normal movement, 30 m access/exit, controller cancellation, pause,
bilingual narrow layouts, one-time damage/reward, same-seed retries and key/host
separation. Only expand to the remaining families after the player-facing
interaction is accepted. A developer's successful solution video is evidence of
functionality, not evidence that the puzzle is understandable.
