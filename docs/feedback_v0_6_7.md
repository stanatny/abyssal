# v0.6.7 Recorded human screams and forward freestyle correction

This round preserves uncommitted v0.6.1–v0.6.6 changes after `94c2a95`. The user reported that voices still lacked a human quality, swimmers appeared to paddle backward, and guide poses looked unnatural. This candidate corrects audio assets and stroke direction without changing population, sex distribution, length, nutrition, or feeding rules. No commit or push; the official release remains v0.5.1.

## Recorded male and female voices

The adult male source is `3yell1.wav` from HaelDB's `Male Grunt/Yelling sounds`; the female source is AuraVoice's `Female Scream 1`. Both use the CC0 license supplied on their source pages. They are trimmed to 1.65 and 1.00 seconds respectively and bundled with the app. See [audio sources](audio_sources.md) for provenance, trimming, formats, and final hashes.

These performed human recordings replace v0.6.6's synthesized voices. Playback retains original pitch and rate `1`; only the latter half lowers the low-pass cutoff from 7,800 Hz to 950 Hz to suggest submersion. Existing procedural effects such as fish feeding retain their path. Human voices still route by the target's `sex`, sharing concurrency and lifecycle management.

## Stroke direction and joint poses

Human local coordinates put the head toward `-Z`, feet toward `+Z`, and back toward `+Y`. Bind-pose upper arms extend along `+Z`. The old animation increased shoulder X rotation over time, moving the wrist from feet toward head during the underwater half-cycle and visually reversing the stroke. Elbow flexion had an independent phase curve, so simply reversing shoulders would not ensure correct recovery.

The new shoulder rotation `π − phase` establishes forward entry, underwater propulsion toward the feet, exit beside the torso, and recovery toward the head. Elbows bend consistently on one flexion axis: moderate flexion during the catch and stronger flexion during early recovery create a high elbow, with a maximum near 127°. Hands are half a cycle apart. Periodically closed analytical curves add no animation loop.

Male/female appearances, 15-bone topology, shared geometry/materials, and independent instance motion remain. Divers retain forward trim and alternating kicks, with fins extending toward the feet. This round adds checks of actual skinned fin direction and knee limits; it does not turn divers into surface freestyle swimmers.

## Stable pose sampling

`human_models.js` retains `userData.animate(time)` and adds `userData.samplePose(phase)`, where `phase` is normalized and `0` and `1` are the same pose. `userData.motionPeriod` gives full-cycle seconds: approximately 2.674 for swimmers and 3.808 for divers. Guide stills and complete-cycle recordings use the same sampling entry point without advancing world state.

Motion regression covers actual wrist positions across full male/female cycles, underwater propulsion and above-water recovery directions, high elbows, left/right phase, joint ranges, cycle continuity, and actual diver-fin vertex directions. These do not replace front/side recordings and visual judgment in the real game.

This record does not claim subjective listening, complete acceptance, or preview deployment is finished. Tests, browser checks, recordings, and previews are recorded in [verification](verification.md). Formal publication still requires subsequent explicit user authorization.
