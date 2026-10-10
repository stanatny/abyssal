# Accepted for v0.11.5 — 2026-10-10

The user authorizes committing the delivered ambience and pushing the combined branch to main as v0.11.5. All703 candidate fingerprints match its delivery receipt before release metadata changes. Earlier uncommitted/listening-pending labels below describe its review stage; user acceptance now supersedes them. Exact release, CI and formal-page receipts are retained in ignored `.local/release_v0_11_5/` and summarized in [the release review](release_v0_11_5.md). Source, game-graph comparison and lifecycle evidence remain unchanged. No physical-device listening/thermal measurement is inferred.

---

# Softer underwater ambience — 2026-10-10

The user accepts the Zombie Shark gameplay/effects/audio and requests a local checkpoint before reducing intrusive continuous underwater noise. That accepted checkpoint is `3d36d452b698a249d44ce6ec0fe1339fd7aa530b` on `feat/lord-contact-rare-blessing`, without a push. The current AI agent alone develops this separate uncommitted ambient refinement. Formal main/Pages remains4060d86 / v0.11.4. Preserve all established services and canceled worktrees.

## Design and runtime scope

The preceding ambience reused the three-second white-noise effect buffer for a low-pass water bus and a broad720 Hz current bus. Its water level increased with depth and its current level with danger. The candidate instead uses a separately generated six-second mono loop:600 Hz one-pole colored noise, a warmed filter, half-second cosine overlap at its seam and mean removal. No oscillator, bubble event, fetched recording or new audio context/source loop is added. This is original procedural game ambience, not a hydrophone recording or a physical sound-pressure model. See [the source/design ledger](audio_sources.md#underwater-ambience-refinement).

Underwater water cutoff now ranges240→150 Hz, gain0.038→0.032 with depth and only0.002 additional ink gain. The current bus ranges310→230 Hz and0.006→0.008 gain. Small slow variations share the existing audio clock and update path. This reduces the persistent middle/high-frequency wash; deep water no longer increases background noise. Existing surface cutoff/gain targets and regional multipliers remain, with the new colored source underneath. Regional music, event/depth filters, warning/feeding/weapon/skill sounds, damage and gameplay values remain. The original effect-noise PCM and random sequence are untouched.

The source stays in the existing two ambient branches, limiter/master/pause routing and is reused across Home/new round/map changes. The new six-second buffer adds1,152,000 decoded bytes at48 kHz (768,000 at the32 kHz verification rate), allocated once; there is no new per-frame allocation, network asset or additional permanent source. Temporary generation scratch is released after graph creation. The existing effects buffer remains separate.

## Evidence and listening status

Ignored evidence is `.local/underwater_ambience_revision_20261010/`, with accepted baseline hashes, actual before/after game-graph clips, focused tests, native compiled lifecycle and delivery receipts. Current focused36 tests pass across feeding audio, regional music and ambience generation. The actual32 kHz `OceanAudio` offline graph renders18 matched cases: shallow/deep/chase, Europa/Amazon, surface, depth/surface transitions, mute and music/feeding/fission/blast overlap. All outputs are finite and unclipped; muted output is zero. Shallow ambience RMS is0.451 of the preceding mix (-6.91 dB), deep0.298 (-10.51 dB), chase0.247 (-12.14 dB), Europa0.402 and Amazon0.465. These are digital isolated-bus comparisons, not calibrated underwater or device-speaker levels. The mixed case peak is0.4304 or below.

The five existing Zombie Shark graph cases also pass. Isolated fission, corpse blast, deep pair and mute WAVs are byte-for-byte identical to their accepted renders; the music-overlap clip includes the quieter ambience. Native compiled desktop/narrow checks cover real initial gesture, ambient-source creation, pause/frozen clock, resume, mute, Home/restart and Earth→Europa→Earth changes. Exact completed host/case counts and artifact/source/privacy/refresh/process receipts belong to the final ignored delivery record and [verification](verification.md).

`graph/after_shallow.wav`, `after_deep.wav` and `after_mixed.wav` are listening artifacts from the actual game graph. They use the same output gain as the comparison and are not separately normalized. New ambient listening review remains pending; signal measures and mobile emulation do not establish subjective realism, warning recognition or physical-phone speaker quality. No performance/thermal improvement is claimed from this audio change.

## Preview operations

Reuse the existing restricted build origin at127.0.0.1:7188 and Cloudflare connection. It allows only `index.html`/`assets`; Vite/source/credentials stay private. Trial: `https://saver-recorded-digit-could.trycloudflare.com/?review=water-ambience-20261010`. Rebuild/stop/process identity/log instructions remain in `.local/mini_preview_20261007/` and this candidate's ignored `OPS.md`. Rebuild archives the previous runtime and replaces HTML last without changing the source service or URL. The new ambient work remains uncommitted/unpushed for user review.
