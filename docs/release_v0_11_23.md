# v0.11.23 — Regional exploration, pursuit and lord music

## Authorization and provenance

On 2026-10-29 the user accepts all eight regional music groups, receives the
integrated playable preview, then explicitly requests committing and pushing to
main. This release follows v0.11.22 / `77b6a8f`. All 2,078 delivered source hashes
match before release-only metadata, documentation, formatting and comment edits.
Accepted recording bytes and gameplay behavior remain unchanged. No tag or
separate GitHub Release is requested.

## Integrated scope

- Hawaii retains its existing theme, extended to a 192-second arrangement with
  gentler ordinary pursuit and a distinct lord encounter.
- Atlantis, Bermuda, Mariana, Amazon, Europa, Penglai and Odyssey receive 22
  selected AAC recordings for exploration, pursuit and lord combat, including
  a separate Sword Sage cue. Penglai uses the accepted Chinese-style revision.
  Atlantis skips its slow lord introduction using the accepted source offset.
- Actual pursuit and engaged-lord events drive transitions. Ordinary pursuit
  eases in; lord combat enters immediately. Pause, mute, restart, map changes,
  loop overlaps and existing sound-effect ducking share the game audio graph.
- Only the selected region's three recordings, or four for Penglai, are decoded.
  Obsolete loads are canceled or rejected, resources are bounded and failed
  loading retains procedural fallback. Content-hashed URLs permit browser cache
  reuse and replacement when a recording changes. Playback needs no HF service.
- Repository audio rules preserve listening acceptance, regional identity,
  frequent-pursuit comfort, sudden lord attacks, source provenance and honest
  distinction between audition, runtime and physical-device evidence.

See the [production review](regional_music_huggingface_revision.md),
[audio rules](audio_production_rules.md), [source ledger](regional_music_assets.json)
and [audio provenance](audio_sources.md). The 22 shipped recordings total
25,978,870 bytes. Raw provider outputs, credentials and private receipts remain
outside the production artifact. Model terms do not imply that generated audio
is CC0. Existing menu/outcome cues, combat effects and all gameplay remain.

## Verification and delivery

The accepted candidate passed 2,084 tests. Native Chrome rendered 126 seconds of
the actual game audio graph per recorded region, including loop boundaries,
depth/ink treatment, damage sounds and transitions. All renders were finite,
non-silent and below 0.50 peak; recorded sources remained bounded and cleared on
reset. Native gameplay verified all eight map entries and pause/home flows, plus
actual ordinary pursuit, Kraken and Sword Sage routing. Restricted production
checks verified all 22 audio files byte-for-byte and actual playback, cache reuse
and pause/resume without exposing a production debug hook.

These are dated candidate results, not a new claim of release testing. Fresh
formatting/build checks, exact-main Node 22 Actions tests, deployed Pages assets
and native formal-page checks are recorded under `.local/release_v0_11_23/`.
Verify the deployment SHA, `/abyssal/` resource paths, v0.11.23 footer and
same-address refresh before reporting publication complete. Push success alone
does not establish that the playable site has updated.

The excerpt loops use crossfades; they are not claimed to be beat-aligned musical
splices or newly composed long arrangements. User listening establishes musical
acceptance; automated signal checks do not. Physical-phone memory, listening and
long-session comfort remain outside the desktop evidence. Existing preview
services, archived runtimes and historical worktrees are preserved.
