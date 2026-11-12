# Startup resource progress — 2026-11-12

Publication v0.11.29 — 2026-11-12: the user subsequently authorizes publishing
this accepted loader and the Zombie Shark repair to main. See
[the release record](release_v0_11_29.md). The local-only status and old formal
HTML described below record the earlier delivery, before this authorization.

Status: accepted for a local commit on `fix/startup-load-progress`, based on
published main `75db4c9` / v0.11.28. On 2026-11-12 the user explicitly requests
committing the delivered startup loader before a separate Zombie Shark repair.
All 2,213 delivery inputs and 979 runtime artifacts match before these
acceptance-only notes. The earlier README publication authorization and this
local checkpoint do not publish the runtime change.

## Behavior

The compiled document now paints a small, non-blinking loading screen before
the large game program or stylesheet arrives. The screen follows the saved
English or Simplified Chinese preference, falling back to the browser language
when storage is unavailable. It works at the repository's `/abyssal/` URL and
at the temporary preview's root URL.

After the small bootstrap arrives, the bar shows **completed startup resource
items / total items**, with a matching percentage. This build has 223 static
JavaScript modules and one stylesheet, for 224 items. Items have different
sizes, so the percentage is neither downloaded bytes nor estimated time. It
advances only after the browser finishes an actual resource; a slow resource
can hold it still. A quiet-wait message appears after 15 seconds without
progress. Requests allow up to 180 seconds before showing a retry action.

At 100%, the program begins initialization and then hands over to the existing
world-preparation overlay. Textures, audio and scene construction retain their
original loading lifecycle. The startup bar does not claim the entire game is
ready at 100%, and this change does not reduce the first-visit payload.

A native reload action is available even while the small bootstrap is pending.
A failed bootstrap, stylesheet or module gives localized guidance and a native
reload button. Initialization errors retain the original renderer guidance,
including WebGL 2 support. Retry reloads the document once rather than starting
overlapping queues. Browsers without `modulepreload` support use the original
module import with an indeterminate state instead of an invented percentage.

## Integration and preservation

`startup_loading_build.js` runs after a successful, written browser build.
Development, SSR, library, failed and memory-only builds keep their existing
behavior. The shared preparation helper remains callable by the existing
preview manager; a second call validates the prepared HTML, manifest, resource
graph, bootstrap and gzip, then leaves them unchanged.

The helper derives dependency-first layers from the actual compiled static
imports and re-exports. CSS and the first module layer share eight workers.
Later layers follow their dependencies. Dynamic imports remain with the game.
Original content-hashed module URLs are preserved and the final import uses
the browser's native module map. No fetch-to-blob rewriting or second download
path is introduced. Invalid paths, symlinks, missing resources and cyclic
dependencies fail before replacing the HTML. HTML replacement preserves prior
hard-linked preview archives.

Against the fresh baseline build, all **976 original non-HTML artifacts are
byte-identical**. Only `index.html` and two small bootstrap files differ: 27,336
bytes of JavaScript and its 9,421-byte gzip. Original game, geometry, texture,
audio and CSS bytes and URLs remain intact. Cache policy, ecology, gameplay,
rendering quality and version number remain unchanged.

The bootstrap is intentionally self-contained, including its two small copy
dictionaries: importing the main localization graph would delay the very
screen that describes that download. Keep both languages and the initial HTML
shell synchronized when changing this copy.

## Verification

Evidence is retained in the ignored `startup_progress_20261112` task folder.

- The 33 focused checks cover native progress semantics, waiting and timer
  cleanup, failure recovery, language/storage fallback, URL validation and a
  real Vite fixture with CSS, static dependencies and a dynamic import.
  They also cover byte preservation, gzip, idempotence/corruption and excluded
  build modes. A fixture initially coalesced a dependency and was corrected
  to preserve the intended real split; the original failed receipt remains.
- Actual compiled Chrome runs exercise English at 1280 px and Chinese at
  390 px, with saved preferences overriding the opposite browser language.
  Controlled requests show the first-paint shell before CSS/large modules,
  then 49 / 224 items at 21%. A 50-second held request leaves that real count
  unchanged, without the old 45-second timeout. After release, both run the
  native start, input, pause, resume, home and Ocean Guide flows. A separate
  compiled-HTML case puts the bootstrap tag after the shell and verifies its
  captured error and keyboard Enter reload, without an initialization error.
- Cache-disabled native requests have no duplicate JavaScript URLs. Separate
  un-routed cold/warm sessions verify normal browser cache reuse. One local
  baseline sample took 1,605 / 1,298 ms to ready; the candidate took
  1,271 / 1,262 ms. These are single desktop loopback samples, **not a speedup
  claim**, mobile-device measurement or estimate of remote first-load time.
- The initial negative-case script targeted a nonexistent model filename and
  timed out after the first three successful cases. Its corrected fixture uses
  a module from the actual compiled manifest; the earlier receipt is retained.
  Failure/reload, compatibility, blocked-storage and renderer cases are
  recorded separately from the controlled slow-network runs.

The final focused run passes 33/33; full repository formatting and diff checks
pass. All nine compiled-runtime cases pass, plus the separate after-shell script
case. The existing restricted preview was rebuilt without restarting its server
or tunnel; its prior runtime was archived before the HTML swap.

Fresh public English/1280 px and Chinese/390 px contexts both show real progress,
finish startup and complete native start, input, pause, resume and home. Each
requests 224 unique JavaScript URLs, without duplicates, HTTP failures, aborted
requests or page errors. The Chinese warm revisit reuses 239 of 250 resource
entries. This confirms cache reuse in that measured visit, not guaranteed cache
retention or a speedup. The served bootstrap is gzip encoded with its existing
immutable policy; decoded bytes match the candidate hash. The formal Pages HTML
still has its original 222 preloads and entry, with no candidate bootstrap.

Current receipts: `focused_tests.log`, `final_check.log`, `native.json`,
`native_final.log`, `body_shell.json`, both `*_benchmark.json` files,
`candidate_manifest.json`, `idempotent.json`, `public.json`,
`public_bootstrap_headers.txt` and `delivery_fingerprints.json`. Controlled
slow-network screenshots are labeled separately from unmodified public visits.
The candidate bootstrap is `startup_bootstrap-046fc25d50929125.js`.

The full gameplay suite is outside this startup-only change; gameplay byte
identity and targeted native flows establish the tested scope. The candidate
was delivered without a commit or push; the subsequent local-commit request
supersedes that candidate-only status. No version bump, push or formal Pages
publication is requested.
