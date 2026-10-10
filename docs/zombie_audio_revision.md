# Accepted skill audio — 2026-10-10

The user accepts the delivered blast-led sound and authorizes a local checkpoint of companion gameplay and audio before a separate underwater ambience refinement. Fission and corpse-blast assets, event graph and delivered verification remain unchanged. Earlier pending/listening/uncommitted labels below describe historical review states. No push or main publication is authorized; formal v0.11.4 remains. User acceptance covers this listening review, without establishing physical-device speaker measurements. Exact accepted baseline and commit identity are retained in ignored `.local/zombie_audio_accepted_checkpoint_20261010/`.

---

# Blast-led corpse-explosion refinement — 2026-10-10

The user reports that the wet-impact corpse cue sounds odd and asks for a clearer blast. The current AI agent alone replaces its primary material with a short explosive impact and decaying rumble, retaining only quiet wet-scatter detail. The1.28-second fission asset is byte-for-byte unchanged. Gameplay, summon payment/expiry, damage and event routing remain. The same uncommitted `feat/lord-contact-rare-blessing` branch stays at UI HEAD5f17190; main/Pages remains4060d86 / v0.11.4. No commit/push/publication or delegation is authorized.

## Current sound and production

The0.72-second corpse asset now uses Joth's CC0 [Chunky Explosion](https://opengameart.org/content/chunky-explosion), with Independent.nu's earlier Foley as low-level scatter. This is a designed game effect, not an authentic underwater blast recording. It has a3 ms onset fade, fast exponential decay and120 ms controlled tail. The separate descending98 Hz oscillator is removed from recorded playback: the explosion sample itself supplies its body and rumble. Existing immediate procedural fallback, gain0.78, rate1, effects/depth/reverb/master routing, ducking, two-voice bound and two-buffer cache remain. See [the exact source/recipe ledger](audio_sources.md#zombie-shark-candidate-recorded-fission-and-corpse-blast).

The reproducible processor takes the earlier Foley directory, output directory and the new original MP3. It validates all original hashes, writes the processing receipt beside the new blast source and reproduces the existing fission asset unchanged. Packed cost remains128,088 bytes for both assets and observed48 kHz decoded cost384,000 bytes. Previous runtime, sources, processing records, clips and delivered manifest are retained as the comparison baseline under ignored `.local/zombie_blast_audio_revision_20261010/baseline/`; original earlier source material remains in its existing ignored folder.

## Current evidence and listening limits

Current evidence is `.local/zombie_blast_audio_revision_20261010/`. Twenty relevant audio unit tests and five actual offline game-graph cases pass, covering isolated events, deep pair, repeated music/feeding overlap and mute. Maximum peak is0.4611, with no clipped/nonfinite samples, zero isolated tails/mute and no remaining recorded sources. Native keyboard/touch and restricted compiled local/public routes verify actual sample starts, pause/resume, mute/no-replay and same-context/cache restart; their exact completed counts and artifact/refresh/privacy/process hashes are bound in the final receipt and [verification](verification.md).

`graph/corpse_burst.wav` is the new actual game-mix audition; `deep_pair.wav` and `music_overlap.wav` retain the deep/mixed comparison. New listening review remains pending: objective metrics and viewport emulation do not establish subjective or physical-phone speaker quality. The earlier wet-impact cue below is superseded after the user's listening rejection; its73-test/previous-preview record remains historical.

The existing restricted origin and Cloudflare address are retained. Trial: `https://saver-recorded-digit-could.trycloudflare.com/?review=zombie-blast-audio-20261010`. Operations/identity/log/rebuild/stop instructions are in this candidate's ignored `OPS.md` and existing `.local/mini_preview_20261007/`. Preserve all previous services and canceled worktrees.

---

# Initial wet-Foley corpse cue — superseded by blast-led refinement

The user accepts the visuals and requests sounds for fission and corpse explosion. The current AI agent alone adds two distinct locally bundled wet-Foley recordings, with restrained procedural pressure underneath. Development remains on `feat/lord-contact-rare-blessing`, accepted UI HEAD `5f17190`; this follow-up is uncommitted and unpushed. Formal main/Pages stays v0.11.4. The preceding damaging blast, no-target preservation, strict60-second lifetime, attribute payment and all other gameplay rules remain.

## Event and mix

- Fission begins with the actual successful paid summon, following the1.2-second body-emergence animation with1.28 seconds of progressively layered wet tearing and a small final release.
- Corpse explosion plays once at the actual local blast, whether commanded or caused by lifetime/target/cover/leash expiry. Its0.72-second wet impact and scattered tail differ from the sustained fission cue. No acquisition failure, denied cast, Home/reset or canceled round creates a blast sound.
- Both route through the existing effects, underwater-depth filter, reverb, limiter, master and pause gate. Fission/burst sample gains are0.63/0.78 at fixed playback rate1. Quiet110→38 Hz /98→30 Hz pressure beds add low-end support, rather than replacing recorded detail with a synthetic boom.
- Music briefly ducks to0.60 for1.05 seconds at fission and0.48 for0.38 seconds at blast. An overlapping weaker event cannot prematurely release a stronger duck; music restores after the latest active hold.

## Resources and lifecycle

See [sources and exact processing](audio_sources.md#zombie-shark-candidate-recorded-fission-and-corpse-blast). The two mono32 kHz PCM16 assets total128,088 bytes. Menu prefetch creates no audio context; the existing gesture-created context decodes each once. The two buffers are reused across rounds. At most two recorded skill voices are live; a third replaces the oldest, and ended/reset sources release their nodes. No new audio loop, light, mesh or per-frame worker is introduced.

Mute prevents new event playback and fades the existing master. Pause freezes the same audio context and active game clock; resume continues the existing cue rather than replaying it. Home/reset clears voices and duck state while keeping decoded buffers. Missing/late/invalid assets use the preceding procedural cue immediately, never queue an expired event, and can retry on a later start. Human/fish banks remain separate.

## Verification and listening boundary

Evidence is retained under ignored `.local/zombie_audio_revision_20261010/`, including the preceding candidate manifest/patch, original sources and source-page snapshot, processing receipt, focused tests and native/browser reports. The focused73 tests cover audio preparation/failure/retry, bounded voices, mute/pause/reset, stronger overlapping ducking and unchanged companion/blast contracts.

`scripts/verify_zombie_audio.mjs` exports five actual `OceanAudio` graph cases: isolated fission, isolated burst, deep-water pair, repeated cues with music/feeding, and mute. Isolation keeps actual effects/depth/reverb/master filtering while disabling continuous music/water buses after updates. All cases have zero clipped/nonfinite samples; isolated final tails and mute output are zero. Maximum recorded concurrency is two and all recorded voices end. The first measurement pilot inadvertently re-enabled the ambient water bed during `update`; it remains preserved as diagnostic evidence, not a sound defect or accepted measurement.

`graph/fission.wav`, `corpse_burst.wav`, `deep_pair.wav` and `music_overlap.wav` are game-mix listening artifacts, not additional runtime resources. They are delivered for user listening review. No subjective sound-quality or physical-phone speaker acceptance is claimed from signal metrics or emulated viewport checks. Two headed native DEV English1440px / Chinese390px cases and two no-DEV-hook compiled cases per local/public host pass event playback, pause/resume, mute/no-late-replay, Home and same-context/cache restart. Native fixtures explicitly isolate real fish and set safe attributes; compiled cases use actual starting15 m Mariana play and observe Web Audio calls only. All11 artifact hashes,37 denied paths per host, same-address refresh/removal and live service identities are retained in the final ignored receipt and [verification](verification.md).

## Preview operations

Use the established restricted built-output origin at127.0.0.1:7188 and existing Cloudflare tunnel; do not expose Vite or repository paths. Manager/identity/log/rebuild/stop details remain in `.local/mini_preview_20261007/` and this candidate's `OPS.md`. The same-address trial is `https://saver-recorded-digit-could.trycloudflare.com/?review=zombie-audio-20261010`. Keep all earlier processes, runtime archives and canceled worktrees. No commit, push or main publication is authorized by this audio request.
