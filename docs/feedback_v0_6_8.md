# v0.6.8 Reworking fish-feeding water audio

The user accepted v0.6.7's recorded screams and forward freestyle correction with a confirmation meaning “that's fine”, then reported that fish-feeding sound still felt out of place and requested a remake. This round changes only fish-feeding audio, retaining male/female recordings, sex routing, swimming, and all existing models, blood clouds, feeding transitions, ecology, and capture rules. Changes after `94c2a95` remain uncommitted and unpushed; official Pages remains v0.5.1.

## Sound direction and assets

Remove the old clearly pitched sine-wave bubbles. Replace them with a short water intake, subdued reentry impact, and a small bubble tail. Sources are `water.wav`, `waterReentry.wav`, and `bubbles.wav` from jcpmcdonald's CC0 [Skippy Fish Water Sound Collection](https://opengameart.org/content/skippy-fish-water-sound-collection).

The author describes creating these with a glass of water, straw, wooden stick, and their voice. The project therefore calls them water Foley, not actual underwater predation recordings. See [audio sources](audio_sources.md) for provenance, licensing, processing, and final hashes.

`scripts/process_fish_audio.mjs` reproduces offline processing: remove low-frequency drift and harsh highs, vary excerpt locations and water/impact/bubble balance, and add short fades and compact tails. The three outputs last 0.34, 0.36, and 0.38 seconds, all 32 kHz mono 16-bit PCM with peak normalization to 0.60. They are bundled locally, not streamed from asset sites at runtime.

## Playback and loading

Successful feeding still calls `audio.eatFish(length)`. Three variants avoid consecutive repetition, with slight playback-rate variation in `0.97–1.03`. Base gain is `0.32`, followed by existing size-based volume scaling. This reduces mechanical repetition when eating schools without changing event timing or count.

Fish and human audio use separate bank instances sharing `RecordedAudioBank` prefetch, decode cache, and retry logic. Menu prefetch creates no audio context; decoding follows first interaction. If download/decode is not ready, the current feeding event immediately plays a gentle filtered-noise fallback lasting 0.30 seconds with peak 0.30. It is neither queued nor replayed after assets arrive. Male/female selection, original-rate playback, and late submersion filtering remain.

## Verification boundaries

This round completed 226 unit tests, 9 real-feeding checks, browser offline audio rendering, and live lifecycle checks. Temporary public preview checks passed at 1440 / 390 / 320 px, with five WAV files and JS/CSS matching the local build. Measurements, receipts, and limits are in [verification](verification.md). These checks do not establish subjective listening acceptance; the user should confirm the final sound on actual speakers or headphones.
