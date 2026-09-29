# Atlantis Regional Soundtrack

**Status: exploration accepted by the user; revised combat music pending user listening.** The user reported that pursuit did not sound tense. The combat revision below addresses its trigger latency and arrangement contrast while preserving the accepted exploration output. Objective audio checks do not establish musical acceptance. This work stays on the Atlantis development branch and does not change the published Hawaii game.

## Composition and production

Atlantis uses an original score authored for this project in [music_atlantis.js](../src/music_atlantis.js). There are no external melodies, samples, recordings, performers, or uploaders in the new music. It is procedural instrumental music, not an underwater field recording. The editable score and synthesis code are the source assets; no generated WAV is a runtime dependency or a newly licensed third-party asset.

The intended character is mysterious exploration through a large submerged city. At 52 BPM, eight 16-beat sections produce a 147.69-second harmonic cycle. Open minor ninths, suspended harmonies, and a brighter raised fourth briefly open the space before returning to the unresolved home harmony. Internal chord inversions move halfway through each section. The stone-bell motif has two or three widely spaced notes per section; octave variations and occasional distant answers extend development over later cycles.

Soft detuned harmonic waves form the sustained veil. A resonant stone instrument combines a fundamental with 2.005, 2.756, and 5.404 frequency ratios and separate decay envelopes. Filtered water-noise swells and a low pressure layer grow with world depth. Pursuit now starts an independent 104-BPM clock with bowed middle-register motion, low strings, and frame drums. Guardians add a separate five-beat drum pattern, low reeds, and a transformed version of the motif. These are composed synthesis choices; the revised combat mix still requires listening.

The real path is `main.js → OceanAudio.setRegion/start/update → AtlantisMusic → shared music duck/filter → dry + room return → compressor/safety/master/pause gate`. Music receives the existing underwater and ink filtering and the same warning/feeding ducking. Hawaii retains its accepted 80-BPM exploration harmony and motif; its combat layer now has an immediate entry accent, a stronger minimum level, and middle-register rhythmic notes. The existing `playFeeding`, `eatFish`, `eatHuman`, `hunter`, `bossAttack`, and `sonar` methods are unchanged; their recorded resources and attribution remain in [audio_sources.md](audio_sources.md).

The room impulse remains the existing 2.6-second stereo response and music send gain remains 0.26. Music now has a separately resettable convolver so switching maps can remove its room tail without clearing a playing human voice. Master, limiter, ambience, decoded Foley/voice buffers, and the Atlantis layer buses are reused. Native context sample rate is selected by the browser; review WAVs are stereo PCM16 at 24 kHz, plus one 48 kHz render. There is no offline normalization or post-render gain change.

## Selection and lifecycle

`audio.setRegion(regionId)` is safe before the first gesture and does not create an AudioContext. Atlantis selects its score; Hawaii and unknown region IDs select the accepted Hawaii score. Repeating the same region is a no-op, and `reset()` retains the selected region.

Active music sources fade over 75 ms on a map change or mute; future sources that have not started are cancelled immediately. Cancelling these future sources needed a focused regression: cancelling their zero-onset envelope and then fading a default gain could otherwise create a brief loud first note. Old music room returns crossfade out and disconnect. Dropped frames skip expired beats. Mute/unmute and repeated start do not add a second master graph.

Pause fades the output over 25 ms before suspending the native clock. Rapid resume cancels deferred suspension, including a suspension promise already in flight. Return Home pauses and resets the round, clears sources and musical state, and keeps the selected map. If the native clock is already suspended, reset stops music immediately instead of leaving a short scheduled fade to wake up during re-entry. Starting another expedition reuses the graph and applies its region before scheduling the new score.

## Combat revision

The original real-game probe observed active ordinary hunters in both maps: `chase` was 4, the threat HUD was visible, and danger was approximately 0.48. Their `hunter.phase` was `idle`, which describes the attack ability cooldown rather than the absence of pursuit. Atlantis still had only the exploration voices after 1.3 seconds. Its old chase notes shared the sparse 52-BPM exploration clock, could wait about 1.7 seconds for an audible entry, and remained mostly in the low register beneath the exploration layer. The initial chase render was quieter than exploration (0.0335 versus 0.0387 RMS).

The main loop now passes `pursuing: !!threat`. This boolean gives even a distant real chase an audible minimum arrangement; distance still controls intensity. Boss music uses only `hunt`, `windup`, `attack`, `recover`, and `disoriented`. Merely entering a dormant boss territory or watching its return home does not activate combat music. No attack-ability `idle` filter is applied to ordinary predators.

On Atlantis combat entry, the first notes are scheduled 12 ms ahead of the current audio time instead of waiting for an exploration note. The pursuit bus approaches its target with an 85 ms time constant while the exploration layer lowers over 180 ms. Departure fades pursuit with a 900 ms time constant and restores exploration over 1.3 seconds. The separate combat clock skips expired beats and does not accumulate queued notes during mute or paused frames. Hawaii has a matching immediate entry accent and 80 ms rise, with an 850 ms exit fade. These are smooth automation times, not hard on/off cuts.

`node --test tests/region_music.test.js tests/feeding_audio.test.js tests/fish_bite_assets.test.js tests/human_voice_assets.test.js` passes 35 tests, including 12 regional, combat, and lifecycle tests. The new cases cover distant pursuit between exploration beats, independent boss activation, explicit false pursuit despite residual danger, faster attack than release, repeated updates, skipped frames, and mute. Prettier passes on the edited audio files, tests, and verifier.

The isolated native render command is `ABYSSAL_AUDIO_OUT=.local/atlantis_music/chase_revision ABYSSAL_AUDIO_OFFLINE_ONLY=1 node scripts/verify_region_music.mjs`. It does not start the game scene. All nine captures have zero non-finite or clipped samples, with a maximum peak of 0.4731 and at most 49 tracked sources including dense Foley/warnings. Matched 6–38 second sections measure Atlantis distant pursuit at +5.25 dB RMS and normal pursuit at +6.22 dB relative to exploration; Hawaii distant pursuit measures +1.98 dB. This checks arrangement contrast, not perceived loudness or musical quality.

The accepted Atlantis and Hawaii exploration renders were compared with the initial saved WAVs. The maximum difference was one PCM16 least-significant bit, consistent with native floating-point rounding; over 99.97% of samples were identical. Exploration harmony, notes, envelopes, and mix targets were preserved.

| Revised native review clip      | Duration |    RMS |   Peak | Maximum tracked sources |
| ------------------------------- | -------: | -----: | -----: | ----------------------: |
| `atlantis_exploration.wav`      |    154 s | 0.0387 | 0.2010 |                      31 |
| `atlantis_chase.wav`            |     40 s | 0.0759 | 0.4439 |                      35 |
| `atlantis_distant_chase.wav`    |     40 s | 0.0679 | 0.4087 |                      33 |
| `hawaii_distant_chase.wav`      |     40 s | 0.0711 | 0.4298 |                      33 |
| `atlantis_guardian.wav`         |     40 s | 0.0807 | 0.4731 |                      47 |
| `hawaii_reference.wav`          |     40 s | 0.0573 | 0.2652 |                      19 |
| `atlantis_feeding_warnings.wav` |     28 s | 0.0852 | 0.4401 |                      49 |
| `region_switch_lifecycle.wav`   |     22 s | 0.0381 | 0.2550 |                      15 |
| `atlantis_native_48000.wav`     |     12 s | 0.0773 | 0.4488 |                      45 |

Revised evidence is retained under ignored `.local/atlantis_music/chase_revision/`; the initial review files below are preserved separately. All four real-game combat captures passed. The verifier stages legal encounter positions, lets the actual AI and main loop choose chase/boss state, records that state, and taps the game's actual output with an `AudioWorklet`. It does not write combat states or call `audio.update` in those live cases. Other animals are temporarily hidden to isolate each encounter; these are actual gameplay state transitions at staged positions, not unassisted full-round play.

| Live game capture            | Duration | First scheduled combat note after trigger | Battle RMS | Overall peak |
| ---------------------------- | -------: | ----------------------------------------: | ---------: | -----------: |
| `atlantis_live_chase.wav`    |  13.18 s |                                   12.0 ms |     0.0726 |       0.4161 |
| `atlantis_live_guardian.wav` |  13.34 s |                                    6.7 ms |     0.0814 |       0.4116 |
| `hawaii_live_chase.wav`      |  13.34 s |                                    9.3 ms |     0.0783 |       0.4554 |
| `hawaii_live_guardian.wav`   |  13.25 s |                                    6.7 ms |     0.0800 |       0.4387 |

The native captures are stereo PCM16 at 48 kHz, contain exploration, encounter, and escape, and have no non-finite or clipped samples. Ordinary predators began with `chase = 0`; actual AI supplied 72 and 85 pursuit frames, with danger ranges 0.487–0.703 and 0.498–0.881. Both guardians began dormant, naturally entered `hunt` and `windup` (Atlantis also reached `attack`), and entered `return` after escape with boss music disabled. The entry timing is measured between the update trace and scheduled first note, not a measured human perceptual or device-output latency.

The verifier also captures the pursuit and guardian bus outputs to check actual decay. After 3.5–4 seconds outside combat, their peaks were zero except the Atlantis guardian's final stone tail at 0.00000956. Reading `GainNode.gain.value` alone initially produced a false failure: Chrome can retain the last parameter value when a node has no live input. Recording the rendered bus output resolves that ambiguity without changing the audio implementation or relaxing its entry threshold.

The recording run completed all nine renders and four live encounters, then stopped at an obsolete lifecycle assertion that expected map selection to finish synchronously. The loading flow now builds the region asynchronously. The verifier waits for the actual region transaction to finish before checking audio selection. The separate lifecycle-only rerun passed with `ABYSSAL_AUDIO_LIFECYCLE_ONLY=1`; its evidence is `lifecycle_report.json`, preserving the completed recordings and their original `report.json` (which retains the resolved assertion failure rather than rewriting history).

The rerun passed Atlantis selection/start/mute/unmute/pause/resume/Return Home with zero remaining voices, rapid pause/resume around deferred native suspension, Hawaii re-entry and repeated start with the same context/master/water/Atlantis score, and Return Home followed by Atlantis re-entry. No page errors were recorded. The final navigation boundary and partial-population rollback fixes landed between the encounter recordings and this lifecycle rerun; audio and encounter trigger code stayed frozen. A fresh full run remains available from the same verifier, but the completed recordings were not needlessly regenerated.

## Initial implementation verification

Tested in headless Chrome 154.0.8037.58 on darwin/arm64. The script imports the game's real audio implementation into native `OfflineAudioContext` and drives the same update/event APIs with controlled inputs. These are recordings of the game audio graph, not source-WAV playback and not recordings of a natural full gameplay session.

- `node --test tests/region_music.test.js tests/feeding_audio.test.js tests/fish_bite_assets.test.js tests/human_voice_assets.test.js`: 31 tests passed, including eight new regional/lifecycle tests.
- Prettier checks passed for the new score, audio changes, tests, verifier, and this document.
- `node scripts/verify_region_music.mjs`: all seven native graph renders passed finite-sample, non-silence, peak, clipping, voice-count, and applicable onset/mute/pause checks. No page errors.
- Actual UI: select Atlantis before audio activation; start; mute/unmute; pause with a stopped musical clock; resume; Return Home with zero tracked sources; select Hawaii and start; repeated start; Return Home and switch back to Atlantis. The same context, master, water source, and Atlantis layer instance were retained.
- Additional native-context rapid pause/resume checks covered 0, 20, 36, and 50 ms around deferred suspension. All returned to the running state. A final real-game Atlantis check observed 11 music sources stop at exactly the suspended context time during Return Home; both tracked source sets were empty afterward (`native_reset_report.json`).
- The full project build and broader game/UI checks belong to the integration owner's current verification record.

Evidence files are retained under ignored `.local/atlantis_music/`; `report.json` includes sections, onset measurements, all hashes, and browser lifecycle results. Full artifacts are deliberately not bundled as runtime downloads.

| Review clip                     | Duration |    RMS |   Peak | Maximum tracked sources |
| ------------------------------- | -------: | -----: | -----: | ----------------------: |
| `atlantis_exploration.wav`      |    154 s | 0.0387 | 0.2010 |                      31 |
| `atlantis_chase.wav`            |     40 s | 0.0335 | 0.2174 |                      31 |
| `atlantis_guardian.wav`         |     40 s | 0.0364 | 0.2409 |                      36 |
| `hawaii_reference.wav`          |     40 s | 0.0573 | 0.2652 |                      19 |
| `atlantis_feeding_warnings.wav` |     28 s | 0.0522 | 0.4123 |                      38 |
| `region_switch_lifecycle.wav`   |     22 s | 0.0381 | 0.2550 |                      15 |
| `atlantis_native_48000.wav`     |     12 s | 0.0327 | 0.2332 |                      32 |

All clips have zero non-finite and clipped samples. Tracked source counts exclude the persistent water source and very short retiring fade sources. Sustained normal, chase, and guardian captures stayed at 31, 31, and 36 tracked sources; the mixed feeding/warning case reached 38. Music-only review onsets remained below 0.025 peak over the first 100 ms. Mute, pause, and Return Home windows in the lifecycle render stayed below 0.0001 peak. These checks detect discontinuity risks and runaway accumulation; they do not prove that the mix sounds balanced or free of audible fatigue.

### Recorded review-file hashes

| File                            | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `atlantis_exploration.wav`      | `7ec71129b5652bd4e92d357e6f77a641fb007d54f1321e8822eb0b2b1f057bc9` |
| `atlantis_chase.wav`            | `33977d8d9ec084e6486842fe4266af95192d35b69e56ba727e5778b4aa67d587` |
| `atlantis_guardian.wav`         | `6a87417ffcfdde6198718b75290d22b4f3c9b4dd0e196c9224b1f2acb7e09a4b` |
| `hawaii_reference.wav`          | `b5538b80de22e064cbd7e2d5dcd74cb9aa105de21fd9bbeb37dad1ad36156b84` |
| `atlantis_feeding_warnings.wav` | `cccffe682d95774ab08b155a714f9b7768231cf07b71f49ce72ec331da343f47` |
| `region_switch_lifecycle.wav`   | `fb78c0593c71f79f81fc3cb7aeb6ff8ac6631c0bdcc03f3ce1d1bb8f6d158e81` |
| `atlantis_native_48000.wav`     | `a5414a223a106840d798336da6c17ce5dffb49d8db88f24690099eb2bc48201b` |

The hashes identify these saved review renders. Tiny native floating-point differences may change PCM rounding on a later browser run; the score and thresholds are reproducible, while identical WAV bytes across browser versions are not promised.

## Listening still required

No audio-listening/perception tool was available in this session. The agent did not listen to these recordings and does not claim that instrument quality, warning clarity, or long-session comfort passed subjective review. The user accepted the earlier exploration music. Review the new chase and guardian captures, then the mixed feeding/warning clip. The 22-second lifecycle clip exposes mute, pause, map change, Return Home, and re-entry transitions.

User listening is still needed before treating the revised combat music as an accepted finished asset. Real headphones, phone speakers, and full-round repetition fatigue have not been tested. Browser stereo output and objective peaks do not substitute for those checks.
