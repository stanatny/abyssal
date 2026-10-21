# Repeated loading and versioned assets — 2026-10-20

## Acceptance and local checkpoint — 2026-10-21

All current preview changes accepted — 2026-10-21: the user confirms that all
current effects have passed review and authorizes committing them together.
This includes Contact Mine, the four reef decorations, Sunfish/turtle refinements,
selected combat/lord audio and versioned loading cache. This supersedes earlier
pending and cache-only checkpoint labels for these delivered changes. Preserve
gameplay and existing services. No push or main/Pages publication is requested.
The current AI agent next audits runtime CPU/GPU costs independently.

Earlier candidate-only status below is historical. Technical receipts retain
their actual dates and scope; user acceptance is separate from device testing.

The user reports slow repeated loading while models are continually updated.
The candidate preserves gameplay, every source model/texture/audio
file and existing appearance quality. It changes build packaging and the
restricted preview's HTTP delivery only. No main/Pages release is authorized.

## Local checkpoint authorization — 2026-10-21

The user accepts the delivered cache and asks for a local commit, then a CPU
performance review. Only the cache build/server/checks and their documentation
are included. Other pending art/audio work remains separate. The following
2026-10-20 preview results retain their combined-working-tree scope. Independent
staged-tree checks are recorded below; no push or formal release.

## Diagnosis and implementation

The preceding restricted server returned `Cache-Control: no-store` for every
response. The main JS bundle was 28,217,188 bytes, including all imported model
data. A fresh navigation and a reload both downloaded about 42 MB in the
controlled start/pause/Home measurement. Existing in-memory texture/audio pools
did not survive a full page reload.

- Vite now emits independent content-hashed chunks for model JSON and the
  Three.js engine. The current build contains 57 model chunks, an engine chunk
  and the application entry. This is packaging, not lazy scene loading: all
  statically required data is still loaded before the application starts.
- The project-owned `scripts/preview_server.py` serves only `index.html` and
  direct files in `assets`. It rejects hidden paths, traversal, directory
  listings and symbolic links. Source files and configuration remain private.
- HTML and failures remain `no-store`; each new navigation obtains the current
  entry. Fingerprinted assets use `public, max-age=31536000, immutable`.
  Updating any asset changes its filename. Unchanged assets keep their URLs
  and can reuse the browser's disk cache.
- Build-time gzip copies reduce network transfer without changing decompressed
  bytes. The server negotiates gzip, honors explicit refusal, varies on
  `Accept-Encoding` and uses representation-specific ETags for conditional
  requests. Images and audio are not recompressed.
- New assets are installed before HTML is atomically replaced. The local
  preview manager retains prior assets for already-open pages and archives the
  previous runtime. A current game is not forcibly reloaded midway.

There is no service worker, IndexedDB asset copy or custom unbounded cache.
The browser manages eviction of old HTTP entries; one year is freshness, not
a promise of one year of disk retention. Private browsing, storage pressure,
clearing site data, force refresh and a different preview hostname can require
downloads again. Caching disabled still follows the normal network path.
See [HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
and [Vite production chunking](https://vite.dev/guide/build.html#chunking-strategy).

The restricted preview's response headers belong to this server. GitHub Pages
has its own delivery policy and is not changed or deployed in this task; a
future Pages release must verify its actual response headers and refresh flow.

## Measurements

Native desktop Chrome, 1440×900, CDP-controlled 20 Mbps and 40 ms latency,
one cold start followed by a normal reload in the same browser context:

| Measurement              |   Before | Candidate |
| ------------------------ | -------: | --------: |
| First menu ready         |  14.38 s |    8.78 s |
| First game entered       |  16.26 s |   10.63 s |
| Reload menu ready        |  14.46 s |    1.36 s |
| Reload game entered      |  16.20 s |    3.08 s |
| First observed transfer  | 41.66 MB |  28.05 MB |
| Reload observed transfer | 41.86 MB |   2.99 MB |

This is one paired controlled sample, not a population benchmark or a physical
phone result. The observation includes two seconds after entry; some optional
assets complete later, so the reload still includes first-time downloads.
Across all JS chunks, the build holds 28,222,138 raw bytes and 14,660,836 gzip
bytes. Models still need parsing, GPU upload and scene preparation each page
load; no FPS, heat or battery improvement is claimed.

Separate host-to-public-tunnel measurements with the same emulated link reach
the game in 28.61 s cold and 4.82 s on reload. These have no paired public
baseline and include external transport variation; they are not the user's
actual network.

## Update and regression evidence

Evidence is retained in ignored `.local/loading_cache_20261020/`.

- 1,494 unit tests pass, including two build-focused checks. Four actual HTTP
  server tests cover cache headers, new HTML, gzip/refusal, HEAD/304, different
  representation ETags, failures, traversal and symbolic-link denial.
- A native Chrome persistent-profile test actually closes and restarts the
  browser and observes 138 disk-cache responses. It also verifies a same-address
  model update, a still-playable old tab, rollback refresh and disabled caching.
- An isolated second build changes one Tuna bound by 0.0001 solely in a Vite
  fixture transform. The repository model is untouched. Only its model chunk
  and the referring application entry change; 140 other logical assets retain
  exact filenames and bytes. The new page downloads the new Tuna chunk while
  reusing all 56 other model chunks from cache.
- Every gzip sidecar decompresses byte-identically to its corresponding build
  file. Source-preservation and final native/public-resource receipts record
  the delivered build separately.

Final delivery verification: all203 build files (143 logical runtime files and
60 gzip sidecars) match the local runtime and public origin byte-for-byte;
11 source/configuration paths return404, and public gzip decodes to the exact
JS bytes. Three transport retries during the exhaustive file audit are retained.
The separate30-case native public flow has no page errors or failed requests:
eight maps,18 bilingual Guide entries and two same-address refreshes. All529
pre-existing `src/` inputs remain byte-identical. The source diff changes only
build configuration and documentation plus new build/server/check scripts.

## Operation and rollback

Run `python3 scripts/preview_server.py --root dist --port 7188` for a fresh
restricted server after building; reuse the project's existing process manager
for the established preview. Do not point the server at the repository root.
Do not overwrite a fingerprinted URL with different content.

Enabling HTTP caching required replacing only the existing restricted-server
process and its dependent awake process. The developer server and Cloudflare
tunnel retain their identities and address; prior logs and runtime archives
remain. Process receipts and the previous server wrapper are saved locally.

To undo this candidate, restore the preceding build configuration and server
wrapper from the recorded baseline, rebuild into a staged runtime and switch
HTML only after its dependencies exist. Do not revert other uncommitted art
or audio work. Returning to `no-store` removes repeat-load savings; the
content-hashed URLs and fresh HTML still prevent mixing model versions.

## Fresh combined-checkpoint validation — 2026-10-21

After the user explicitly accepts all current effects, the final checkpoint
includes the previously separate art/audio candidates as well. Fresh full
verification passes 1,494 tests, four actual HTTP cases, formatting and build.
All 529 runtime source inputs match the delivered cache-preview fingerprints;
all 203 rebuilt files match its active runtime exactly. The earlier 1,457-test
isolated cache-only tree was a scope check, not the final commit. No push.
Evidence: `.local/runtime_cpu_20261021/`.
