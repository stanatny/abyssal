# Audio Sources and Processing Records

v0.6.7 replaced v0.6.6's synthetic adult male/female screams with recordings of human performances. v0.6.8 changed fish-feeding sounds to three short variants made from CC0 water foley. The score and other existing procedural sounds retain their respective implementations; the current audio must not all be described as original synthesis.

## Human recording sources

| Use                | Creator and source                                                                             | Source file used                       | License                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Adult male voice   | HaelDB · [Male Grunt/Yelling sounds](https://opengameart.org/content/male-gruntyelling-sounds) | `3yell1.wav` from `yelling sounds.zip` | The source page offers OGA-BY 3.0 and CC0; this project chooses CC0 1.0 |
| Adult female voice | AuraVoice · [Female Scream 1](https://opengameart.org/content/female-scream-1)                 | `female_scream_1.ogg`                  | CC0 1.0                                                                 |

The female-voice page was uploaded by `Nocturnal_Vanguard`; the performer identifies herself as AuraVoice in the description. Both are retained here to distinguish uploader and performer. Both assets are used under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) as provided by their source pages. This project still records creators and links for traceability.

Local source-page snapshots are `.local/v6_7_audio_sources/male_source.html` and `female_source.html`. The original archive, audio, and processing intermediates are kept in the same directory and are not runtime dependencies. The runtime uses two WAV files bundled with the application, rather than playing audio directly from the asset websites.

## Trimming and final files

| Use                | Original trim interval | Final duration | Runtime file                        | Bytes   |
| ------------------ | ---------------------- | -------------- | ----------------------------------- | ------- |
| Adult male voice   | 0.37–2.02 seconds      | 1.65 seconds   | `src/assets/audio/human_male.wav`   | 105,644 |
| Adult female voice | 0.55–1.55 seconds      | 1.00 seconds   | `src/assets/audio/human_female.wav` | 64,044  |

Both final files are 32,000 Hz, mono, 16-bit PCM WAV. Offline processing includes a 65 Hz high-pass filter, 0.008-second fade-in, 0.17-second fade-out, and peak normalization to 0.68. No pitch shifting or time stretching was applied. The recorded normalization gains are `1.2458238747553816` for the male voice and `1.1128538607531715` for the female voice.

Final-file SHA-256 hashes:

```text
human_male.wav
  a10a5ea757e7ef37013be68a7905b85a417fa0bd71d79263449de1360f9434bf
human_female.wav
  66597d35c4bb7b7c44c673a5270200658e4d777924f15be348581ae272e1cebd
```

These durations, sizes, and hashes match `.local/v6_7_audio_sources/processed.json` and have been checked against the runtime files in the workspace. Update this record whenever recordings change or are reprocessed. Do not use an intermediate listening file's hash as the final asset hash.

## In-game playback

In v0.6.7, `human_voice_assets.js` prefetched both assets. In v0.6.8, shared prefetching and decoded caching by audio context moved into `RecordedAudioBank`, with human voices retaining a separate instance. `audio.eatHuman(length, sex)` selects a sample from the sex of the actual person being eaten. Playback rate is fixed at `1`, preserving the original pitch and speed.

The voice low-pass cutoff stays at 7,800 Hz in the first half, then gradually falls to 950 Hz at 94% of the sample's duration to simulate muffling after entering water. This is runtime filtering, not an offline pitch change. Mute, pause, restart, and concurrent voice management remain part of the existing audio lifecycle.

This record documents sources, licenses, and processing parameters; it does not establish completion of subjective listening or real-device audio acceptance. Browser playback, feeding routes, failure retries, and preview results are recorded in the [verification record](verification.md).

## v0.6.8 fish-feeding water sounds

**jcpmcdonald** provides the [Skippy Fish Water Sound Collection](https://opengameart.org/content/skippy-fish-water-sound-collection) under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). This round uses `water.wav`, `waterReentry.wav`, and `bubbles.wav`. The source-page snapshot is `.local/v6_8_audio_sources/source.html`; originals and processing receipts are in the same directory.

The creator says these sounds were made with a cup of water, a straw, a wooden stick, and their own voice. They are water foley and must not be labeled as actual underwater feeding recordings. This project does not use the collection's human cries; adult male/female voices still use the two v0.6.7 human performance recordings above.

| Original file      | Use                       | SHA-256                                                            |
| ------------------ | ------------------------- | ------------------------------------------------------------------ |
| `water.wav`        | Main suction flow         | `6107b595a7f1c19a1fde61200726726e31aec98af6de31aef00048ea336a973e` |
| `waterReentry.wav` | Lower-pitched bite impact | `7c07d1f0ee7d2fe140a4327f8be194b8cd72a0ea05077724f8f7d195e6b25b8e` |
| `bubbles.wav`      | Softer bubble tail        | `c4f0a47bd5eaa3c4a5a34a1889c6189661360fb874ebf120147f3cc98fc84165` |

### Reproducible processing

`scripts/process_fish_audio.mjs` takes a directory containing the three original WAV files, with an optional output directory as its second argument. This tool requires local `ffmpeg` and does not participate in the runtime build. For example:

```bash
node scripts/process_fish_audio.mjs .local/v6_8_audio_sources src/assets/audio
```

All three sources first pass through a 70 Hz high-pass filter, then second-order low-pass filters at 1,450, 700, and 900 Hz respectively. They are converted to 32,000 Hz mono, with each RMS scaled to 0.16. They are then trimmed and mixed as follows; the three layers are always listed in flow/impact/bubbles order.

| Final file        | Duration     | Three source offsets (seconds) | Three weights      | File bytes |
| ----------------- | ------------ | ------------------------------ | ------------------ | ---------- |
| `fish_bite_0.wav` | 0.34 seconds | 0.018 / 0 / 0.070              | 0.75 / 0.26 / 0.10 | 21,804     |
| `fish_bite_1.wav` | 0.36 seconds | 0.036 / 0.014 / 0.190          | 0.66 / 0.32 / 0.13 | 23,084     |
| `fish_bite_2.wav` | 0.38 seconds | 0.006 / 0.027 / 0.310          | 0.82 / 0.21 / 0.09 | 24,364     |

The impact layer is delayed by 0.022 seconds and decays with a 0.12-second time constant. The bubble layer is delayed by 0.075 seconds and decays with a 0.13-second time constant. The overall envelope has a 0.018-second fade-in and a squared fade-out over the final 0.10 seconds. Each final file is peak-normalized to 0.60 and exported as 32 kHz, mono, 16-bit PCM WAV. No sine-wave bubble oscillator is added.

Final files are in `src/assets/audio/`, with the processing receipt at `.local/v6_8_audio_sources/processed.json`. SHA-256 hashes:

```text
fish_bite_0.wav
  62ac9c6030c4c823b5217d4e13d1219dc4f840ee49db4e445e59c04e4046f929
fish_bite_1.wav
  c7b9a22b51b4a5e6c33c0c440e870c7beff456543be7130b6185ea5a55e7425b
fish_bite_2.wav
  7942fdcc34e9496d6cdd00afbc9eb04ffe171b6fdffdd668043721ac331f495d
```

### In-game fish playback

Adjacent variants never repeat. Playback rate is `0.97—1.03`, base gain is `0.32`, and existing size-based volume scaling remains. Fish and human sounds use separate recording-bank instances with the shared `RecordedAudioBank` implementation; a loading failure in either category does not force the other to wait.

If fish audio is not ready or fails to load, the event immediately uses a gentle filtered-noise fallback lasting 0.30 seconds with a 0.30 peak; it is not queued for later playback. These are implementation parameters and source records. Subjective listening quality and browser acceptance remain documented in this round's [feedback record](feedback_v0_6_8.md) and [verification record](verification.md).
