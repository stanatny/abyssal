# Lord attack sound revision — 2026-10-20

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

## Scope and review status

The user requested distinct sounds for non-bite lord attacks, explicitly naming
Hydra breath, charges, White Tiger's roar and the Sword Sage's flying swords.
The current agent audits all 18 lord kinds and 22 declared ability combinations,
including reused guardians in other regions. The user subsequently approved
applying the delivered first version on 2026-10-20. The accepted audio remains
uncommitted and active in the restricted preview. Gameplay, attack clocks,
damage, ecology, models and
the four previously selected feeding/hurt/lord-bite files remain unchanged.

## Runtime mapping

| Lord(s)                   | Ability          | Release sound and trigger                                                                        |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| Hydra, Scylla             | Volley           | Wet high-pressure breath, once per actual projectile (3 / 6 shots)                               |
| Vermilion Bird            | Volley           | Short flame burst, once per projectile                                                           |
| Thunderbarbel             | Volley           | Electric discharge, once per projectile                                                          |
| Sword Sage                | Swords / charge  | Metallic flying-blade pass; lower, longer playback for the sword rush                            |
| White Tiger               | Roar / charge    | Dedicated tiger roar / heavy rush                                                                |
| Leviathan, Rootjaw        | Charge           | Heavy rushing-water/body pass at charge onset                                                    |
| Azure Dragon              | Water            | Sustained water-jet release                                                                      |
| Kraken, Yacumama          | Vortex           | Rotating suction onset, a finite release cue rather than an endless loop                         |
| Charybdis                 | Undertow / surge | Suction / rushing tidal water                                                                    |
| Gran Maja, Black Tortoise | Pulse            | Pressure-wave release; Tortoise follows both configured wave starts                              |
| Brine Regent              | Pulse            | Crystal-pressure fracture                                                                        |
| Abyss Weaver              | Loom             | Tensioned alien web resonance                                                                    |
| Lumen Stalker             | Lash             | Three short wet lashes at the shared arm intervals                                               |
| Karkinos                  | Claw / fault     | Shell snap at the existing 0.8-second closure / three rock fractures at shared fissure intervals |

The existing warning/lock cues remain. New sounds accompany actual release,
not the windup notification. Projectile cues are emitted by `fireVolley`;
non-projectile beats read the existing attack timer and shared intervals.
The light recovery guard has one shorter/quieter rush when its strike begins.
These cues do not decide damage or change random gameplay sequences.

`LordAttackAudio` owns a separate pool with three retained voices per lord and
six globally, with a 20 ms fade when replacing a voice. It never steals the
selected player damage/lord-hit voices. Distance attenuates beyond 80 world
units to silence at 300. Small deterministic shot pitch variations and the
Sword Sage rush distinguish repeated actions without altering the selected
combat samples. The existing depth-filtered short-effect bus, compressor and
music ducking remain; no long reverb send or new persistent loop is introduced.

New attack downloads are limited to two complete bodies at a time, with a
30-second transfer timeout beginning after queue admission. They do not launch
14 simultaneous downloads alongside textures and selected combat audio.
Bytes and decoded buffers are shared within the bank/context. Failed loading
uses a brief immediate procedural action fallback; completion never replays old
events. Restart can retry a failed/corrupt asset. Phase exit, ink interruption,
defeat, encounter reset/disposal, scene changes, pause and mute stop affected
voices. Resume does not restart an attack that happened while muted. Late
non-projectile beats are discarded rather than burst-replayed after a stall.

## Generation and reproducibility

MOSS SoundEffect v2.0 is used through its official Hugging Face Space. The
Space API and GPU decorator were inspected on 2026-10-20 before submission:
`/run_inference(prompt, seconds, steps, cfg_scale, sigma_shift, seed)`, 3 seconds,
50 steps, guidance 4, sigma shift 5; reservation 180 seconds, default large GPU
at 1× quota cost. Included allowance is checked before each serialized request.
No paid hardware or overage is authorized. Sources:
[official model](https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0),
[official demo](https://huggingface.co/spaces/OpenMOSS-Team/MOSS-SoundEffect-v2.0),
[ZeroGPU quota and sizing](https://huggingface.co/docs/hub/spaces-zerogpu).
The model card reports Apache-2.0; generated clips are designed Foley, not CC0
wildlife recordings. Hub revision receipts do not prove opaque worker weights.

There are two candidates each for breath, roar and sword and one for each of
the other eleven families. Variant A was initially wired provisionally and is
now retained under the user's approval to apply the delivered first version.
B alternatives remain in the local audition archive. Originals, prompts, seeds,
queue states, quota receipts and
processed hashes are preserved in ignored local evidence.

Reproducible preparation: mono downmix, 48 kHz resampling if needed, DC removal,
second-order 40–11000 Hz filtering, first sustained energy onset, 6 ms attack,
65 ms tail, active RMS target −23 dBFS and peak ceiling 0.65. Durations vary by
attack, from short electric/lash transients to longer roar/water/web/suction
releases. No generated clip is a real animal recording.

## Verification and limits

Run `node --test tests/lord_attack_audio.test.js` for complete ability coverage
and real encounter release counts; run `ABYSSAL_DEV_URL=http://127.0.0.1:5188
node scripts/verify_lord_attack_audio.mjs` for the actual Web Audio graph,
polyphony, depth/music mix, lifecycle and retry checks. Native staged combat
recordings use the unmodified encounter update and actual mixed output, with a
stationary invulnerable adult and observer camera clearly identified.

Current evidence is stored under `.local/lord_attack_audio_20261020/`. Keep
technical verification, native event recordings, subjective listening and
physical-device checks separate. This task does not authorize a commit, push,
version bump or formal Pages release.

## Fresh verification snapshot

- Generation:17/17 original files decoded successfully;14 runtime WAVs total
  1,458,856 bytes. Included quota1195.25116→864.585205 seconds (330.665955
  consumed), overage remains0. Each request had a fresh180-second reservation
  check; no paid fallback. Three B alternates remain local.
- Tests:25/25 focused checks cover all22 real encounter release sequences;
  1,492/1,492 full tests passed. No combat configuration files changed.
- Actual audio graph:23/23 cases passed. Representative priority/deep mixes
  peak at0.4412/0.4287; the deliberately crowded pool peaks at0.5577. No
  non-finite or clipped samples. Pause/mute resume has no stale release tail;
  retry does not replay the failed event; decoded buffers are reused.

Native recordings and production-resource checks are recorded separately in
the delivery receipt; none of these measurements constitutes user listening
approval or a physical-phone test.

Final native production check: English1440×900 and Chinese390×844 each complete
two Start/mute/pause/resume/Home cycles, decode22 buffers through one context,
and refresh the same address. The final run has no page errors or failed
requests. Two earlier attempts had Cloudflare transport failures and are
retained; the added two-body download limit was subsequently verified. This
is host public-network access and desktop touch emulation, not an external
physical-phone result. The85 runtime resources match the build/local/public
hashes;11 source/config paths are rejected. All four service identities remain.
The earlier selected-combat graph also passes all10 cases after this change.

## User approval and application — 2026-10-20

The user says “可以，Apply 吧”, accepting application of the delivered version.
All14 variant-A runtime WAVs match their processing receipts. Before updating
these notes, all1,067 delivered input hashes and85 build/runtime hashes match;
the live public index also matches dist. The four selected combat WAVs are
unchanged. This applies the reviewed version without new inference, gameplay
edits, rebuilding or service replacement. PP-Q046 is closed for this approval.

The earlier1,492-test /25-focused /23-audio-graph results retain their recorded
scope and were not rerun for this documentation-only acceptance. This user
approval is not a new physical-phone or prolonged listening measurement. Other
pending reviews remain open. No commit, push, version bump or main release.
Application evidence: `.local/lord_attack_audio_20261020/apply_approval.json`
and `apply_verification.json`; the original delivery receipts are retained.
