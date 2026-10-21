# Combat audio Hugging Face audition — 2026-10-20

## Acceptance and local checkpoint — 2026-10-21

All current preview changes accepted — 2026-10-21: the user confirms that all
current effects have passed review and authorizes committing them together.
This includes Contact Mine, the four reef decorations, Sunfish/turtle refinements,
selected combat/lord audio and versioned loading cache. This supersedes earlier
pending and cache-only checkpoint labels for these delivered changes. Preserve
gameplay and existing services. No push or main/Pages publication is requested.
The current AI agent next audits runtime CPU/GPU costs independently.

Earlier candidate-only status below is historical. Technical receipts retain
their actual dates and scope; user acceptance is separate from device testing.

The user authorizes the proposed bounded audition: two MOSS candidates for each
of ordinary feeding, eating yellow-marked retaliating prey, player bite damage
and a successful bite on a lord; compare ordinary feeding and lord contact with
two Stable Audio candidates each. This is an offline listening package, not an
accepted runtime replacement. No commit, push or deployment is requested.

## Baseline and event semantics

Branch `art/hawaii-lords-hf-redraw`, HEAD `46778a7`. The 1,040 existing source
inputs were checked byte-for-byte unchanged before writing this review and its
handoff entry. Pending Sunfish/Turtle, reef and Contact Mine work stays intact.
Services, preview runtime and formal main/Pages are unchanged.

Current fish feeding uses three recorded CC0 water-Foley variants through
`eatFish(length)`. Ordinary and retaliating prey share this path. A successful
lord bite calls generic `audio.eat()` after `result.hit`. Player damage uses
`audio.hit()`, which also handles other impacts and environmental damage.

The yellow target classification is **edible and able to retaliate**, using
`canPredatorRetaliate` and its threat ceiling. Its 5 m condition is a difference
between player and prey lengths, not simply absolute prey length. Future
integration must capture that classification before meal growth and preserve
the same rule as the marker. Do not alter predation rules for sound routing.
Only confirmed feeding/damage/hits produce their semantic sounds. Do not replace
unrelated terrain, electric or explosion effects with a bitten cue.

## Generated candidates and provenance

- MOSS: `OpenMOSS-Team/MOSS-SoundEffect-v2.0`, 8 actual generations, Chinese
  prompts, 3 s, 50 steps, CFG 4, sigma shift 5, seeds recorded in `plan.json`.
- Stable: `stabilityai/stable-audio-3-small-sfx`, 4 actual generations, equivalent
  English ordinary/lord prompts, 3 s, 8 steps, CFG 1, pingpong sampler.
- Both calls use their official Hugging Face ZeroGPU Spaces and existing
  authenticated Pro access. Each original WAV was downloaded before releasing
  its client. Raw files, seeds, parameters, original hashes and quota receipts
  are retained under `.local/audio_feedback_samples_20261020/`.
- The checked model cards label MOSS Apache-2.0 and Stable Audio
  `stable-audio-community` (the API metadata reports `other` for Stable).
  These are model license labels; the generated files are **not claimed CC0**
  and are designed effects, not authentic underwater predation recordings.
- Model repository SHAs checked during this round are retained in
  `model_provenance.json`; these identify current upstream metadata, not an
  independently inspected model loaded inside the hosted GPU.

Sources: [MOSS model](https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0),
[MOSS Space](https://huggingface.co/spaces/OpenMOSS-Team/MOSS-SoundEffect-v2.0),
[Stable model](https://huggingface.co/stabilityai/stable-audio-3-small-sfx),
[Stable Space](https://huggingface.co/spaces/stabilityai/stable-audio-3),
[ZeroGPU quota](https://huggingface.co/docs/hub/spaces-zerogpu).

Fresh quota before generation: 1,289.607153 of 2,400 included seconds remaining,
zero over-quota use. After all 12 generations: 1,195.25116 seconds remaining,
zero over-quota use. Consumption: approximately 94.36 included GPU seconds.
The reported reset remains around 22:41:50 Asia/Shanghai on 2026-10-20. These
are dated receipts, not a promise of the next session's remaining balance.

## Audition edits and delivery

`process.py` reproducibly downmixes to mono, resamples to 48 kHz, removes DC,
applies second-order 55 Hz high-pass / 8,500 Hz low-pass filtering, selects the
strongest rising event and applies 6 ms onset / 70 ms cosine release fades.
Edited durations are 0.34 / 0.44 / 0.52 / 0.64 seconds respectively. Every edited
file has active-sample RMS near -23 dBFS with a 0.68 peak ceiling. This common
measurement is an audition aid, not a claim of identical perceived loudness.

`delivery/abyssal_bite_audition.mp4` is 52.6 seconds. Each labeled candidate plays
twice, followed by six-hit, 0.22-second-spacing examples for the MOSS ordinary
pair. The video is an **offline audition**, not footage of integrated game
events. `delivery/abyssal_bite_candidates.zip` contains the 12 edited WAVs, their
12 original generations, the prompt plan and processing measurements.

All edited samples are finite, non-silent and unclipped. The unencoded audition
mix peaks at about -6.84 dBFS; final codec/decode checks are recorded separately
in `encoded_verification.json`. Existing game tests are not rerun or represented
as validation of this new sound package.

The current tool/model surface does not accept audio input. Consequently there
is **no claimed subjective listening comparison or MOSS quality win**. File,
envelope and signal checks cannot establish realistic bite texture, absence of
unwanted semantic content or repetition comfort. User listening and selection
remain pending.

## Before runtime acceptance

Select or revise the candidates after listening. Then verify each actual event
route, shared prey classification, repeated meals, the combined music/ambience
mix, voice prioritization, mute/pause/reset, delayed/failed loading and cache
lifetime. Physical phone speaker and headphone listening need their own
evidence. Preserve unrelated accepted voices, weapons and ambience. Runtime
integration and release remain separate from this audition.

## User selection and runtime integration — 2026-10-20

The user explicitly selects ordinary **Stable B**, yellow prey **MOSS B**,
player bitten **MOSS B**, and lord bite **MOSS B**. This approves these four
audition timbres, not all twelve candidates, unrelated art or a release.
The current AI agent integrates independently; no new HF inference, commit
or push. The four original edited files are copied exactly, totaling186,416
bytes; provenance and hashes are in [audio sources](audio_sources.md).

### Actual event contract

- Direct feeding snapshots ordinary/yellow classification after contact and
  cover checks but before nutrition/growth. It shares `canEat`,
  `canPredatorRetaliate` and the threat ceiling with target markers. The5 m
  rule is a length difference, not an absolute prey-size threshold. Rare
  rainbow targets remain ordinary feeding audio. Companion meals carry the
  pre-settlement classification into the existing meal callback.
- Successful predator bite damage and settled lord attack damage use the
  chosen hurt cue. Terrain, vehicle impacts, ordinary electric hazards and
  explosion/skill sounds retain their previous routes.
- Lord bite audio runs only after `hitBoss().hit`; contact rejected for
  cooldown, immunity, size or opening state is silent. No combat rules change.

### Mixing and lifecycle

A single bank prefetches four short assets without opening an audio context;
user activation decodes them once per existing context. Missing/failed assets
produce immediate previous fallback feedback and never queue late playback.
A decoder failure now evicts only the failed bytes, so a later preparation can
redownload that file while retaining healthy assets. Human/zombie banks stay
independent.

Ordinary/yellow feeding shares the existing90 ms limit and three-source pool
with human feeding; human priority remains. Hurt/lord each have at most one
active sample, separate from feeding saturation. Their160/120 ms limits are
audio-only. All selected playback is at original rate. Feeding gain is
0.85 × sqrt(clamp(length,0.5,2)); hurt1.05 and lord0.95 before the shared master
processing. Lower-priority feeding cannot cancel stronger music ducking.

The new short-cue bus retains the same depth/ink low-pass as other effects,
without adding the legacy2.6 s reverb. Actual graph testing caught a stale
reverb tail in the first implementation; the isolated short bus fixes it.
Pause/mute fade and stop selected voices, reset clears voices, and buffers
and the audio graph remain reusable. No new timers, animation loop, external
audio service or audio context is added.

### Verification and limits

Evidence is in `.local/combat_audio_integration_20261020/`:

-66 targeted checks and1,467 full tests pass; tests cover classification
boundaries, growth across the five-meter boundary, exact selected files,
retry/deduplication, voice bounds, priorities and lifecycle. Existing test
doubles were updated to the new semantic method names; cache tests now
require redownloading the corrupt item. -`scripts/verify_combat_audio.mjs` renders10 cases through real Chrome Web
Audio: four individual cues, dense feeding, music overlaps, deep water,
pause, mute and reset. No nonfinite/clipped samples, all sources retire,
and resumed isolated cases retain no stale audible tail. Highest measured
peak across these cases is0.38335, about−8.33 dBFS. -`scripts/verify_audio.mjs` also passes the broader existing music, human
voice, ambience, stress, ink and lifecycle checks at22,050 Hz. Resampled
durations allow one output sample of rounding rather than an exact bound.

- Native Chrome contact staging uses the real running game for ordinary
  feeding, yellow feeding and predator damage: eaten increments once or
  health100→72, and the matching selected buffer plays. A browser contact
  fixture uses the real Kraken skinned surface, encounter state and live
  audio graph: one valid bite,60 damage; repeated contact gives no second
  cue. The native pause button suspends the context; Home clears voices.
  The initial hurt fixture was outside the first white shark's territory;
  it was corrected to a valid outer-sea individual, without changing rules.

The authoring surface cannot accept audio input, so this is event/signal
verification, not a claimed subjective listening verdict. The user selected
the audition sounds; final game-mix comfort and physical phone speaker/
headphone listening remain user review. Pending Sunfish/Turtle, reef and
Contact Mine candidates remain untouched and uncommitted.

### Restricted-preview verification

The existing preview was rebuilt in place without restarting its services.
Entry `index-DWQeimhV.js`; all71 current runtime artifacts match dist, local
preview and public HTTPS byte-for-byte. Eleven forbidden paths per origin
remain denied, the tunnel readiness check passes, and original process
identities remain intact. Native production flows pass in English1440 px and
Chinese390 px desktop emulation: start, mute/unmute, pause/resume, Home, a
second round and same-address reload. Each page keeps one AudioContext and
eight decoded buffers (four combat, two human, two zombie); no production
`__ABYSSAL__` hook is present. This is host public-network verification, not
an external physical phone test.

A17.2-second labeled listening clip contains actual game-audio-graph renders,
not live gameplay footage. Its final AAC decode is finite/unclipped, peak
0.38281 and source correlation0.99986. User game-mix listening remains pending.
