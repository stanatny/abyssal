# Cold-start preview loading — 2026-11-10

Superseding startup candidate — 2026-11-12: the shared loader now also runs in
normal compiled browser builds and paints before the game stylesheet. Its
resource-item progress, initial-bootstrap recovery, 180-second request timeout
and current verification are documented in
[the startup review](startup_loading_progress.md). The preview-only production
boundary and 45-second timeout below describe the earlier historical repair.

Status: uncommitted preview-delivery repair. The existing Giant Squid candidate
and published main v0.11.26 are preserved. The user reports that the trial link
does not open; this pass repairs its reproducible cold-load failure without
publishing or changing gameplay.

## Evidence and boundary

The local runtime and existing tunnel are alive, and public HTML returns 200.
A fresh browser nevertheless receives HTTP 429 for model modules, leaving the
initial loading screen blocked. The original compiled HTML requests 217
modulepreloads at once. Its static entry closure has 218 modules, with about
55 MiB of compressed module data. This exceeds the temporary tunnel's supported
200 in-flight request limit. See the current
[Cloudflare Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/#limitations).
The server, tunnel and successful warm reload are not evidence that a cold user
visit works; the earlier refresh workaround is superseded by this repair.

## Repair

`scripts/prepare_preview_loader.mjs` parses the actual compiled static dependency
closure and creates dependency-first layers. A small content-hashed preview
bootstrap replaces the copied HTML's eager preload links and original entry tag.
It prepares at most eight modules concurrently, waiting for every dependency
layer before its parents, then imports the original entry unchanged.

Actual `modulepreload` fills the browser module map. This avoids relying only on
HTTP-cache warming, which can fail when caching is disabled or evicted. The
bootstrap has no imported dependency of its own. CSS keeps its original normal
link, and the game retains its own scene-loading and graphics-recovery screens.
The temporary bootstrap shows bilingual progress and a retry action on failure.
Failed batches drain before showing retry; retry reloads the document rather
than starting overlapping queues.

All 966 original non-HTML runtime artifacts remain byte-for-byte identical,
including code, models, textures and audio. Only the preview HTML and two new
bootstrap files differ. The preview server still exposes only compiled HTML and
assets; source, repository metadata and local evidence remain inaccessible.
Module URLs are restricted to same-origin hashed runtime JavaScript; dependency
cycles or missing modules stop preparation before replacing the served HTML.
Replacement uses a new directory entry to preserve hard-linked prior archives.

The local preview manager now runs this preparation after a normal build and
before snapshot publication, so a later rebuild retains the repair. The normal
production build and Pages workflow do not apply the preview-only wrapper.
No main push, release, tunnel restart, hostname change or new public scope is
part of this task.

## Verification

Raw receipts are in ignored `.local/preview_loading_repair_20261110/`.

- Seven queue/build tests pass: bounded concurrency, dependency order, monotonic
  progress, failure draining, no premature entry, URL restrictions, and cycle/
  missing-module rejection, plus existing final-byte compression checks.
- Two fresh local browser contexts, Chinese desktop and English touch emulation,
  pass with HTTP caching explicitly disabled. Both initialize, select Giant Squid
  and Mariana, enter play, use input, pause/resume, return home and read the new
  feeding description. No request, console or page errors occur; there are no
  duplicate static-module requests. Observed full-flow peak is 18 in flight,
  including ordinary game resources after initialization.
- A deliberate module failure shows a readable retry and prevents the entry
  executing; the real reload action succeeds after the resource recovers.

Public cold-load checks and source/artifact identities are separate receipts.
A host-side public visit does not establish accessibility on every user network
or physical-phone performance. The user's earlier failure remains recorded;
reopening the repaired link on that device is the remaining external check.

Two independent fresh public contexts also pass with HTTP caching disabled:
Chinese desktop initializes in 47.5 seconds and English touch emulation in
45.3 seconds on this host/network. Both complete the native gameplay/Guide
flows without request or console errors or duplicate static-module requests.
Observed whole-flow concurrency peaks at 23, with the bootstrap itself limited
to eight. These are measured cold visits, without a warming visit or reload.
The manager rebuild produces the same prepared HTML and bootstrap identity.

## Accepted local checkpoint — 2026-11-10

The user accepts the delivered correction and authorizes a local commit before
a separate sprint-tentacle refinement. Runtime inputs and served artifacts match
the verified candidate; only acceptance documentation is added for this checkpoint.
Earlier candidate/uncommitted status statements retain their historical meaning.
No push, version bump or main publication is authorized.

## Accepted main integration — 2026-11-10

The user accepts the delivered changes and authorizes their commit and push to
main as v0.11.27. Recorded source inputs match before publication-only metadata
and documentation updates. Earlier uncommitted/unpublished statements retain
their historical scope. See the [integration record](release_v0_11_27.md) for
included checkpoints, validation and formal delivery. No tag, separate GitHub
Release or personal Skill update is included.
