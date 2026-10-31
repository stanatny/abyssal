# Environmental puzzle design rules

**Status: active repository rules, 2026-10-31.** Applies to environmental puzzles
across ABYSSAL. The [Atlantis withdrawal review](atlantis_environment_puzzles_review.md),
[replacement proposal](atlantis_environment_puzzles_design.md) and
[accepted water-level revision](atlantis_waterwheel_revision.md#accepted-local-checkpoint--2026-10-31)
record the feedback behind these rules. General design requirements are separated
below from the current water-level lock's particular numbers and placement.

**Explicit light-seal exception, 2026-10-31:** the user requests distributed
outdoor reflectors and automatic completion when a continuous reflected beam
illuminates Poseidon's statue. There is no separate final test, puzzle damage or
failure reset; detent adjustment is reversible and earlier settings persist.
This overrides those defaults below for this family, including the indoor-host
restriction. See the [design proposal](atlantis_light_seal_design.md) and
[implementation candidate](atlantis_light_seal_revision.md). Only one puzzle family
is active in each expedition. The accepted water-level rules remain unchanged.

## 1. Make the objective and controls understandable

Before implementation, describe what blocks progress, what the player can change,
what evidence they can observe, how they submit an attempt, what counts as success,
and what failure resets or costs. A newcomer should be able to explain those rules
from the scene and its hints without watching a developer solve it.

Give the final gate, seal or reward a visible relationship to the mechanism.
Make each control's effect observable: wheel position, water movement, connected
channels or another appropriate physical response. Distinguish ordinary controls
from the final test control. Decoration, a generic confirmation ring and a vague
instruction to “activate the mechanism” cannot substitute for this explanation.

## 2. Require reasoning without hiding essential information

The challenge must involve a meaningful choice, deduction or combination. Opening
every switch, following an already highlighted answer, or finding an unexplained
tiny trigger is not sufficient difficulty. More controls alone do not make a
better puzzle; avoid unnecessary travel, repetitive toggles and arbitrary waiting.

Provide all facts needed to infer a solution, including units, target, control
effects and whether order matters. Clearly show the player's current selections.
Do not reveal a correct combination before submission through automatic success,
a “ready” message, special colors, sounds or disabled/enabled confirmation.
Operational availability (for example, a settling animation or retry delay) must
remain explainable independently of whether the answer is correct.

For the accepted arithmetic family, use at least five meaningful contributions;
the current implementation uses six. Show each contribution and the target, but
do not calculate the selected sum for the player. Both high and low totals fail;
the exact settled total is required. Other puzzle families need their own clear
reasoning task, not a forced reuse of numeric valves.

## 3. Operate the mechanism in the environment

Use normal character movement and physical contact with visible controls. Hint
panels may explain rules and states; they do not replace the scene with clickable
switches, trap input, pause swimming or impose an extra interaction mode.

One deliberate approach toggles a reversible switch once. Leaving its contact
margin and approaching again reverses it. Holding contact, jitter, pause/resume
or a cooldown ending must not repeat the action. The separate final control
submits the attempt; reaching the target during adjustment does not auto-complete.

Fit triggers and collision to the visible interactive part. Check real routes,
camera framing and all supported character sizes/anatomies: the swimming front
may differ from a feeding anchor. Avoid through-wall interactions, overlapping
controls, unreachable switches, body-scaled trigger radii that select neighbours,
and large movement jumps that activate a whole route. Inactive or blocked attempts
must explain why they did nothing and must never queue a later surprise action.

## 4. Make failed attempts costly, fair and recoverable

State the penalty before the first final test. Observation and ordinary adjustment
are free; a deliberate incorrect submission applies the configured health penalty
once and restores all puzzle selections to their initial state. Reset physical
feedback too, such as draining the tank and closing branches. Keep the same clues,
values and target so the player can reason about and correct the failed attempt.

Provide a bounded retry delay and require a fresh approach to the final control.
Staying against it must never cause repeated damage, even after protection expires.
If damage protection, settling or another eligibility condition prevents a valid
test, reject that attempt visibly rather than granting a free answer probe or
charging later. Use the shared damage/death rules; no separate hidden health logic.

Choose the penalty together with expected solving time, health recovery and local
threats. It should discourage blind attempts while leaving a practical recovery
route. Record any intended departure from this default before implementing it;
do not quietly make a new family costless or repeatedly punish a stuck player.

## 5. Randomize valid problems and suitable places

Validate that every generated problem has a solution. Use bounded generation and
a known solvable fallback. Where deduction relies on one answer, verify uniqueness
and exclude trivial all-on/all-off or single-control solutions. Where multiple
solutions are intentional, accept all combinations satisfying the stated rule.
Retries must not reroll clues, targets, controls or host buildings.

Choose from verified compatible interiors, not arbitrary coordinates. Keep routes,
adult access, control spacing, sightlines and exits usable. Location hints must
match the actual building and entrance without disclosing the answer. Separate
the key and mechanism by canonical building complex, not merely by floors or a
small positional offset. Hidden key spots should reward searching without being
exposed beside their own hint plaque.

For Atlantis specifically, use existing mid-city buildings between the shallows
and Poseidon Temple, outside the starter shallows and temple vault. The accepted
slice has one fixed Agora host; the proposed multi-building random pool is still
unimplemented. Do not imply that a proposed host is already reachable or playable.
Other regions need an equally explicit placement rationale for their progression.

## 6. Preserve the surrounding game

Keep ordinary movement, enemies, hunger, health recovery and collision active
unless a separate gameplay change is authorized. Evaluate the time needed to read,
calculate, operate, recover and retreat under that actual pressure. A mathematically
solvable puzzle may still be impractical to finish in its habitat. Report that
finding and tune only within the authorized scope; do not remove threats to make
a demonstration look successful.

Award completion once and connect it to the real expedition objective. Update
Guide, hints, radar, objective text and both languages together. Changed victory
conditions require compatible run-record handling, without mixing old and new
rulesets. Pause freezes progress; death/terminal states disable interaction;
restart, region change and disposal clear stale contacts, timers and effects.

## 7. Validate one complete slice before expanding

Review a readable scene/interaction concept first, then implement one family end
to end before making a batch. User acceptance of art or arithmetic does not imply
acceptance of controls, location or the entire expedition.

- Test generation, success, wrong attempts, full reset, unchanged retry clues,
  repeated-contact prevention and once-only rewards. Exhaust combinations when
  small enough; check failure below and above an exact numeric target.
- Use native movement to approach, toggle, leave, reverse, submit incorrectly,
  retry and finish. Check representative body sizes and actual collision routes.
- Inspect Chinese and English at normal follow-camera scale and narrow touch
  layouts. Labels must be readable, states must not rely only on color, and hint
  overlays must leave movement controls both visible and operable.
- Separate automated state tests, staged station checks and an unassisted natural
  run. Record setup shortcuts and failed runs. A video using prepositioned stations
  proves only those interactions; it does not prove discovery or full survival.
- Deliver evidence of the controls and a wrong-attempt/reset/retry as well as the
  successful result. State remaining limitations and seek review of the slice
  before starting the next family. Preserve superseded decisions as history.

## 8. Current water-level example and future design record

The accepted slice uses six distinct contributions, a unique three- or four-valve
solution, one master test, a 15-health failure cost, all valves closing, a tank
draining to zero, unchanged clues and a three-second retry delay. These are
water-level parameters, not mandatory numbers for every puzzle. Keep their source
of truth in [the shared rules](../src/atlantis_waterwheel_rules.js) and describe
future intentional changes in the relevant review.

Before a new family, record: **visible objective; player reasoning; clues and
state feedback; world controls and final submission; success/reward; failure
cost/reset/retry; randomization and solvability; host/route/key separation;
survival budget; bilingual/mobile checks; review evidence and acceptance scope.**
Do not start implementation while any essential rule is left to hidden developer
knowledge or inconsistent with the player's instructions.
