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

## Mechanical Shark candidate: original procedural weapon effects

The authoring agent generated these original science-fiction effects in `OceanAudio.mechanicalLaunch()` and `mechanicalExplosion()` in `src/audio.js`. There is no external recording, source page or separately licensed sample. Runtime synthesis uses the existing bounded voice graph; exported listening WAVs are verification artifacts, not bundled runtime files. Do not describe these as authentic underwater explosion recordings.

Launch layers: 180→510 Hz / 0.16 s charging transient, 88→45 Hz / 0.30 s pressure tone, and 820→290 Hz band-pass noise / 0.22 s. Their gains are 0.065 / 0.13 / 0.07, with short onset fades and 1,600 / 600 Hz tone cutoffs. Explosion layers: 112→32 Hz / 0.62 s pressure tone, 700→150 Hz low-pass noise / 0.32 s, 48→26 Hz / 0.70 s low tail and five quieter bubbles. Gains are 0.19 / 0.13 / 0.085, plus bubble gain 0.018; music ducks to 0.55 over 0.25 s. Launch/explosion rate limits are 0.30 / 0.15 s; skill cooldown is independently five active-play seconds. Mute and pause use the same master/context lifecycle as existing events.

The ignored `audio.mjs` probe in the mechanical-character evidence directory renders both events and their overlap through the actual `OceanAudio` effects/master/reverb graph, with music and ambient buses disabled for isolation. Outputs are 2 s, stereo, 22,050 Hz, 16-bit PCM. Peak values are 0.1085 / 0.1172 / 0.1317, with zero clipped or nonfinite samples and zero remaining event voices. Export hashes identify this verification render, not runtime assets:

```text
mechanicalLaunch.wav
  bd23cee2ab020a9d82a6a42d424f6324547122628a0746b701d64510f4e53024
mechanicalExplosion.wav
  30f127b3913ff2ec5ab35f937959dc44361c92dd1d395996a859657efb32d5b0
combined.wav
  d208d3d4921a936d1c8177289a568fc96c3f55d245a3f37ce81ecbdaffdad043
```

Actual native firing routes both events. The development candidate and game-path clips are provided for listening review; signal metrics do not establish subjective sound quality. See [the character verification](mechanical_shark_revision.md) for runtime and device limits.

## Zombie Shark candidate: recorded fission and corpse blast

**Independent.nu**, uploaded by **qubodup**, provides [8 wet squish, slurp impacts](https://opengameart.org/content/8-wet-squish-slurp-impacts) under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). This candidate layers four recordings from `independent_nu_ljudbank-wet_squish_slurp_impacts.7z`. These are wet Foley, not authentic underwater/body recordings; no human scream is used. Local originals, the source-page snapshot and exact processing receipt are retained under `.local/zombie_audio_revision_20261010/sources/` and are not runtime dependencies. Runtime playback fetches only the bundled files from the application origin.

Original archive SHA-256: `81fba6009d1b3e48c258b122eef735ed27e86a2dcace9b6a2c93d05b80c83515`.

| Original file            | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `impactsplat02.mp3.flac` | `164aea403082be4179208644dcd2f77d115c26f4e666c5911ba1e6fd89b0c925` |
| `impactsplat05.mp3.flac` | `adf9fbbe3d32c61dfd2c66de9aa42e8c8d2b5bbadceb0d4ee6e9298113e3f3f9` |
| `impactsplat07.mp3.flac` | `adae57b90523d754a7b0221876d1c3e4c7b90d5ded732af4895c5b8d0489b640` |
| `impactsplat08.mp3.flac` | `08620cd7dbeaa27cff28a5295846ee9079be7ec6c83725a4af568b9dcc0d045d` |

### Processing and final assets

The hash-checking `scripts/process_zombie_audio.mjs` uses installed Chrome/Playwright for offline FLAC decoding and Web Audio processing; no new runtime codec or authoring dependency is required. Run from the repository root:

```bash
node scripts/process_zombie_audio.mjs .local/zombie_audio_revision_20261010/sources/impsplat src/assets/audio
```

Each original is converted to mono32 kHz, high-pass filtered at65 Hz (Q0.5) and low-pass filtered at3,900 Hz (Q0.55). The following finite layers specify original offset, output onset, fixed authoring playback rate, output length and gain. Per-layer fades are5 ms in /35 ms out. Overall fades are16 ms in /140 ms out for fission and5 ms in /150 ms out for burst. DC reduction and peak0.72 normalization precede PCM16 export. Authoring rate changes below are baked into the assets; runtime playback stays at1.

| Output  | Source | Offset s | Onset s | Rate | Length s | Gain |
| ------- | ------ | -------- | ------- | ---- | -------- | ---- |
| Fission | 05     | 0.055    | 0       | 0.9  | 1.15     | 0.76 |
| Fission | 02     | 0.14     | 0.38    | 1.06 | 0.65     | 0.32 |
| Fission | 07     | 0.035    | 0.97    | 1    | 0.28     | 0.28 |
| Burst   | 08     | 0.048    | 0       | 0.9  | 0.53     | 0.85 |
| Burst   | 07     | 0.035    | 0.015   | 0.85 | 0.44     | 0.65 |
| Burst   | 02     | 0.17     | 0.105   | 1.25 | 0.4      | 0.28 |

| Runtime file under `src/assets/audio/` | Duration | Bytes  | Normalization gain | SHA-256                                                            |
| -------------------------------------- | -------- | ------ | ------------------ | ------------------------------------------------------------------ |
| `zombie_fission.wav`                   | 1.28 s   | 81,964 | 1.1035110200866742 | `4b1f5c476788a7f9426b7aee99ff0d48cca1e50b6292046afdcd8c3c510569bd` |
| `zombie_corpse_burst.wav`              | 0.72 s   | 46,124 | 0.844559169748164  | `5dc428a6b6301f6bbea68ff2d1b8cfbb100a363a5d21b6f1bb9b788bc923d07f` |

The two final assets total128,088 bytes. `ZombieAudioBank` uses the existing `RecordedAudioBank` byte/promise and per-context decode cache. The real paid summon/blast events play fixed-rate samples through the existing effects graph with bounded two-source concurrency, brief music ducking and quiet procedural pressure beds. Missing/late samples immediately use the preceding synthesis fallback; they do not replay after loading. Mute, pause, reset and retry behavior, game-mix listening clips and pending subjective review are documented in [the current review](zombie_audio_revision.md) and [verification](verification.md).

### Current blast-led corpse cue — supersedes the wet-impact mix above

After listening feedback, the corpse cue now uses **Joth**'s [Chunky Explosion](https://opengameart.org/content/chunky-explosion) under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Original `Chunky Explosion.mp3` SHA-256: `4de53bffac187e59d3f5b43096df2f8fcb4160076b65b71a67074947950e025f`. The page snapshot and original are retained under `.local/zombie_blast_audio_revision_20261010/sources/`. It is a designed explosion effect, not an authentic underwater/body recording.

The earlier fission file/recipe/hash remains exact. The old corpse hash `5dc428a6…23d07f`, primary wet-impact layers,5 ms attack/150 ms tail and separate98→30 Hz recorded-path tone above are superseded. The processor's current invocation is:

```bash
node scripts/process_zombie_audio.mjs .local/zombie_audio_revision_20261010/sources/impsplat src/assets/audio .local/zombie_blast_audio_revision_20261010/sources/chunky_explosion.mp3
```

The blast source passes45 Hz high-pass (Q0.5) and5,200 Hz low-pass (Q0.55); Foley processing remains65 /3,900 Hz. All layers are converted to mono32 kHz. Global burst envelope is3 ms attack, `exp(-3.8*t)` decay and squared120 ms end fade. Existing5 /35 ms local fades, DC reduction and peak0.72 normalization remain. Current burst layers:

| Source     | Offset s | Onset s | Authoring rate | Length s | Gain  |
| ---------- | -------- | ------- | -------------- | -------- | ----- |
| Joth blast | 0        | 0       | 1              | 0.72     | 1     |
| Foley07    | 0.035    | 0.095   | 0.95           | 0.35     | 0.075 |
| Foley02    | 0.17     | 0.23    | 1.2            | 0.34     | 0.035 |

Final `src/assets/audio/zombie_corpse_burst.wav`:0.72 seconds, mono32 kHz PCM16,46,124 bytes, normalization gain1.147336799647581, SHA-256 `285284586818b76f39cf0906c240a5231d19ac5589c2ee392f2e3fadae6b06fd`. The two runtime assets still total128,088 bytes. The current processing receipt is `sources/zombie_processing.json` in the new ignored evidence folder; earlier source/processing receipts are retained. Runtime fixed-rate playback, gain0.78, actual blast trigger, loading fallback, mute/pause/reset and bounded caching remain. Game-mix clips and pending listening acceptance are documented in [the current review](zombie_audio_revision.md).

## Underwater ambience refinement

The current AI agent authors original procedural ambience in `src/water_ambience.js` and the existing `OceanAudio` mix, after user feedback about intrusive constant noise. No external audio is copied or downloaded for this sound. A six-second mono loop uses an independent seeded sequence,600 Hz one-pole coloring,0.1-second filter warm-up,0.5-second cosine end/start overlap and DC removal. Runtime water/current branches use240→150 Hz low-pass and310→230 Hz band-pass targets underwater, lower gains and gentle slow variation. Exact code/hash and generated output are bound in `.local/underwater_ambience_revision_20261010/` receipts; `scripts/verify_water_ambience.mjs` reproduces actual game-path comparison clips. The original transient effect-noise sequence and accepted sound files are unchanged.

The reference study by Rogers et al., [Utility of ocean wave parameters in ambient noise prediction](https://arxiv.org/abs/2403.18728v3), uses hydrophones at six locations and wind/wave data to study ocean ambient noise. It supports treating ambience as a variable broadband environment rather than one fixed tonal effect. The candidate is a quieter stylized interpretation for gameplay; its selected frequency/depth/gain values are design choices, not that study’s measured ocean spectrum, nor an authentic hydrophone recording. No scientific claim that real deep water is always quieter is made. Actual graph clips are supplied for listening review rather than declaring realism from PCM metrics.

## Selected combat audio — 2026-10-20

The user selected Stable B for ordinary feeding and MOSS B for yellow-marked
prey, player bite damage and successful lord bites. These four exact edited
audition WAVs replace the three older fish variants in the current runtime;
the older files and CC0 provenance above remain historical. Human voices,
zombie skills, weapons, general impacts and ambience retain their existing
assets and implementations. No new inference was needed for integration.

| Runtime asset         | Selected candidate  | Duration | Bytes | SHA-256                                                            |
| --------------------- | ------------------- | -------- | ----- | ------------------------------------------------------------------ |
| `combat_ordinary.wav` | `stable_ordinary_2` | 0.34 s   | 32684 | `bd96a3017b4967a5e2ea40ccc723b86a5ed7aad758f88b0bfaed1d328c6beafc` |
| `combat_yellow.wav`   | `moss_yellow_2`     | 0.44 s   | 42284 | `968a415706293bce5fa26da682f5ee4f5c2d669f6da3b17b1ae478b060c342da` |
| `combat_hurt.wav`     | `moss_hurt_2`       | 0.52 s   | 49964 | `ef6043909e94f8ba8b0ae82e38444989ca2bb0acec1476c9f06fc3b7e27384de` |
| `combat_lord.wav`     | `moss_lord_2`       | 0.64 s   | 61484 | `97eeeece14a7e52ee2b6bd7b04f750991f0c56ae62de0ee53d4f1119e623607d` |

All are mono 48 kHz PCM16, copied byte-for-byte from the audition edits. Raw
generations, seeds and processing receipts remain in the ignored audition
evidence. Model sources, license labels, generation settings and the exact
editing recipe are recorded in [the audition review](combat_audio_huggingface_audition.md).
The generated outputs are not CC0 field recordings. Playback rate is fixed
at 1; per-event gain, the existing depth filter and master compressor remain
part of the game mix. The four short cues bypass the legacy 2.6-second effects
reverb to preserve distinct attacks and avoid stale tails after pause.

## Lord attack releases — 2026-10-20

Fourteen user-approved MOSS SoundEffect v2.0 cues cover all18 lord kinds /22
ability combinations. These are generated Foley, not wildlife recordings.
[Generation, license links, timing and evidence](lord_attack_audio_revision.md).
All files below are mono48 kHz PCM16; the delivered variantA is retained under
the user’s 2026-10-20 approval to apply this version,
with B alternatives for breath, roar and sword retained in the audition archive.
The earlier four user-selected combat files remain byte-identical.

| File                 | Seconds | Bytes  | SHA-256                                                            |
| -------------------- | ------- | ------ | ------------------------------------------------------------------ |
| `lord_breath.wav`    | 0.58    | 55724  | `34991aa102f941df2c5fbf3eb18fb2dea4e81ee77c47291655ccced98b38b4fb` |
| `lord_charge.wav`    | 1.2     | 115244 | `977d0707fa3542fce3dde038cae8fab8a9d0cbbd826245bc7ab731f54dec4ee2` |
| `lord_claw.wav`      | 0.7     | 67244  | `db2f728c73e67eee5ecf51553a38d128138e25922a08cf6d5c8d43248136487a` |
| `lord_crystal.wav`   | 0.9     | 86444  | `d4f3ada8bd8b20b7e4a96034e678d53d493621b21b60667b7bb481a9f91129bd` |
| `lord_fault.wav`     | 0.8     | 76844  | `82fd57430fa0875a85c70776d7e8635cf6ba64ef140d60b1ade212f0b5f9e3ea` |
| `lord_fire.wav`      | 0.55    | 52844  | `3cff98b7be8fdbbbf7fd0e72ebd8fac41e4814a5c4a4965879de773c68b5848b` |
| `lord_lash.wav`      | 0.48    | 46124  | `6f393789ec1299f01cd90330ab064c11d7bf3ec7046f58e7b74d643c7caae30b` |
| `lord_lightning.wav` | 0.48    | 46124  | `2d1bd4ada2dfb1e82c2dd0e519209d2adef29927fca32450dc1d8b9296a444af` |
| `lord_loom.wav`      | 2.3     | 220844 | `84df30a66ea82051f905f836a379228f417c019893d51db8321085325785e99b` |
| `lord_pulse.wav`     | 0.95    | 91244  | `9c78926f4d5570acdab8af280c306556202b1cdbde1b772eca9dbbc84cff3a92` |
| `lord_roar.wav`      | 1.8     | 172844 | `dc16590b319b687dd46c918cae8fac24c2137654e03094bc7d7a7643897d4f38` |
| `lord_sword.wav`     | 0.65    | 62444  | `2e4a08dd547ab358d4781309855cbbb59fcd7a75353a9ca65d08e18a7b270cd5` |
| `lord_vortex.wav`    | 2.3     | 220844 | `52b4f634416e296886f27bec9c3b8cb564de9ba822ed43ab032f8349ade93ca5` |
| `lord_water.wav`     | 1.5     | 144044 | `74ea9cc9a96577696101bd1d5608b507fdf4b3ed0ba729cdeeb3bc07550f6208` |

## 2026-10-29 selected regional music

Seven regions now use 22 user-selected HF recordings, including a separate Sword
Sage cue; Hawaii keeps the accepted expanded procedural theme. The exact prepared
sources, source hashes, AAC assets, gains and entry offsets are recorded in
[the regional asset ledger](regional_music_assets.json), with generation receipts,
source/model terms, acceptance history and runtime limitations in
[the regional production review](regional_music_huggingface_revision.md).
These generated recordings are not labeled CC0. The source workflow used Stable
Audio 3 Medium and its recorded provider/model terms; no new generation or license
reclassification occurs during this integration. Runtime files are bundled locally,
content-hashed and fetched only for the selected map, not streamed from HF.
