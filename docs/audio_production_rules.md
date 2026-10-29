# Audio production rules

**Status: active project rules, 2026-10-29.** Applies to music and generated sound
effects across all ABYSSAL regions. These rules supplement the
[asset quality standard](asset_quality_standard.md#audio-production-and-listening-quality).
The [regional music review](regional_music_huggingface_revision.md) records the
user feedback, selected recordings and superseded candidates behind this policy.
Examples from one map are not mandatory instrumentation, tempo or timing values
for every map.

## 1. Define the event before generating audio

Record the region, event, expected frequency, onset, duration, exit, musical role
and sounds that must remain audible. Preserve the actual game rules and accepted
audio. A music request does not authorize changing pursuit, damage, food or boss
eligibility.

| State               | Required musical behavior                                                                                                  | Avoid                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Exploration         | Comfortable, spacious regional identity that supports extended play and leaves room for effects                            | Constant threat, exhausting percussion or an unwanted replacement of an accepted theme                                               |
| Ordinary pursuit    | Clearly busier rhythm and moderate tension, related to the exploration sound; entry/exit must tolerate frequent encounters | Repeated shock hits, abrasive noise, a loud accent followed by a long gap, or a layer so quiet that danger becomes indistinguishable |
| Engaged lord        | Immediate attention at an ambush, then sustained rhythmic drive and greater danger/scale                                   | A long ambient introduction, several seconds of gentle fade-in during an attack, or a single impact followed by a slow composition   |
| Escape / battle end | Controlled release toward exploration with enough persistence to avoid rapid state toggling                                | Abrupt silence, overlapping leftovers or repeatedly restarting the exploration opening                                               |

Theme continuity does not require identical arrangements. Increase pursuit
activity through musical rhythm, articulation and instrumentation rather than
merely volume or playback speed. Lord tension must persist after the entry; a
shorter crossfade cannot fix an unsuitable composition. Do not substitute an
alarm, noise bed or attack sound effect for combat music.

Hawaii's accepted direction retains and extends the existing exploration theme.
Other maps keep their own identity; do not automatically regenerate accepted
material to match the newest provider or a different map's arrangement.

Sound effects remain event-specific. Distinguish ordinary feeding, retaliating
prey contact, player damage and lord contact using the existing event semantics.
Breath, charge, roar, suction and sword attacks need suitable attack sounds;
do not route every lord action through a bite. Do not infer new size thresholds
from a music or Foley brief. Review repeated feeding and overlapping battle
effects as well as isolated samples.

## 2. Generate within a verifiable provider contract

- Use the authorized provider. Inspect its current model selection, API schema,
  duration limits and terms before a new generation batch; do not assume an old
  Space name or request recipe remains valid.
- Query included GPU allowance immediately before generation. Record the dated
  balance, reset time and overquota usage. PRO status, inference credits and
  output-audio duration do not establish available GPU time. When included time
  is insufficient, retain the pending brief and reset time; no paid fallback or
  overage without authorization.
- Keep a receipt per attempt: prompt, negative requirements, seed, requested
  model/parameters, observed Space revision, job state, original file hash and
  safe quota information. Requested BPM/key/instruments are intentions, not
  proof of what the generated recording contains.
- Distinguish queueing, inference failure and transfer failure. Resume/retry an
  interrupted transfer against the same completed output when supported; do not
  consume another inference simply because downloading is slow. Keep the provider
  session alive until the full artifact is downloaded, decoded and preserved.
- Preserve originals and rejected candidates in ignored project evidence.
  Never record credentials or signed/private download URLs in project documents.
  Track source/model terms separately from the generated recording; do not label
  generated output CC0 merely because a tool or code repository is open source.

## 3. Edit for the encounter and preserve selected material

Keep a label-to-hash ledger for each region and state. Record user feedback
precisely, including partial acceptance. When only a lord cue is rejected, hold
accepted exploration and pursuit constant. Where the comparison preserves an
earlier segment, verify prepared-PCM equality; do not silently remaster it.

Inspect the real recording before choosing an entry. Remove unwanted pre-roll
or start from a suitable developed passage when an ambush needs immediate action.
Transient/energy analysis can locate candidates; it cannot identify a musical
downbeat, verify excitement or replace listening. Retain enough continuous
material after the entry to expose weak follow-through, breakdowns and fatigue.

Use short gain ramps to prevent clicks at a sudden lord entry, and a controlled
release for the outgoing cue. Ordinary pursuit can enter more gradually. The
accepted Mariana study uses a 10 ms lord gain attack and a 150 ms outgoing release;
these are editing examples, not universal runtime constants. Independent tracks
are not synchronized stems merely because their prompts share a key or seed.
Check their actual phrases and harmony before claiming musical alignment.

Record trimming, source offsets, gain, fades, EQ, dynamics or other processing
reproducibly. Preserve source dynamics where suitable, reserve headroom for
overlaps and the game's effects, and justify additional processing. A low peak,
high onset count or louder mix is not evidence of better music.

## 4. Deliver a continuous audition and record what was accepted

Deliver exploration → pursuit → lord transitions with clearly labeled times,
plus an escape/return where that behavior is under review. Include enough time
before and after each transition to judge contrast and continuity. Separate
state clips can establish a style choice but do not demonstrate a transition.
Label a newly assembled edit accurately; do not describe it as a previously sent
file. Preserve original deliveries when the user asks to hear them again.

Verify the final encoded file, not only its source WAV: expected codecs/duration,
finite non-silent samples, headroom, source correspondence, mono compatibility,
transition continuity and readable labels. Inspect loop seams and long-session
repetition before calling an excerpt a production loop. Do not prescribe one
LUFS value or duration to every state, device or map.

Separate generated, technically checked, user-selected, integrated and released
states. If direct listening is unavailable, say so in the review and obtain user
audition through real attachments; objective signal checks do not establish
timbre, unwanted vocals, comfort or tension. An offline crossfade, an offline
render of the actual game graph and a gameplay recording are different evidence.
Desktop rendering does not establish physical-phone speaker quality.

## 5. Integrate through the existing game path

`main.js` supplies actual pursuit and engaged-lord state to `OceanAudio` in
`audio.js`; regional music modules implement the score. Preserve this semantic
contract, including surface/human-defense threats. Dormant or returning lords,
mere proximity and an ability cooldown must not independently force boss music.
Use the genuine engagement transition for a sudden entrance, and suppress
repeated entry accents within one encounter. Verify release hysteresis, rapid
re-entry, pause/resume, mute, restart, death, victory and map switching.

Prepare the current map's combat cues before they are needed. Do not decode all
long tracks for all eight maps into memory at startup. Bound loading and decoded
resources, preserve version/content-hash cache replacement and sensible failure
fallbacks, and avoid replaying stale events after a late load. Review the final
mix through the real depth/ink filters and output graph alongside accepted combat
effects. A selected offline recording is not automatically integrated or released;
commit and publication still follow current user authorization.
