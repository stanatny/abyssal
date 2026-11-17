# Runtime cache, airborne aim and swallowing — 2026-11-17

Publication accepted — 2026-11-18: the user authorizes committing and pushing
this delivered scope to main as v0.11.30, including the final Orca-only amplitude
refinement. Earlier candidate-only/no-push statements below retain their dated
scope. See [the release record](release_v0_11_30.md) for current verification and
deployment status.

This is an uncommitted candidate on `fix/cache-air-aim-feeding`, based on main
`6fbbb9e` / v0.11.29. The user requested these three repairs; no commit, push or
version bump is authorized. The previous publication authorization is historical.

## Resource reuse

The existing browser HTTP cache does work. On untouched v0.11.29, after one
completed visit, a real browser restart reused all 224 scripts with zero script
transfer bytes. The following same-process visit also reused all 224 scripts.
The startup counter counts completed resource reads, including cache hits; it
was never a byte-download counter. A first throttled cold probe timed out and is
not evidence that ordinary revisits download everything.

The candidate adds an optional, scope-specific Service Worker cache for original
hashed runtime assets. It caches only actual requests, never prefetches the
249 MB runtime catalog, and retains original import/texture/audio URLs. Capacity
is bounded to 384 MiB / 1,024 entries with LRU eviction, preferring obsolete hashes.
The mandatory startup closure alone is about 104 MiB raw, so a smaller blanket
budget would evict startup dependencies between visits. HTML, the small bootstrap
and navigation stay outside persistent storage. A hashed root worker allows both
GitHub Pages subpaths and the restricted preview to control their own directory.

Registration, first-page control and status share a 3.5-second deadline. Unsupported,
blocked, full or failed storage falls back to ordinary loading without another
resource download. No storage permission is requested. Explicit reload/no-store
requests remain respected. Hash changes select new bytes; shared hashes remain
reusable. Old opened clients can still read their cached hashes. MIME, path,
query/range and response-status guards prevent storing error documents as scripts.

The bilingual startup note now explicitly includes cached reads. A separate line
reports verified persistent-cache reads; a worker fetch-path notification does
not claim that the browser went to the internet. Browser storage can be cleared
or evicted. Parsing, GPU preparation and scene construction still run on each
new page, and the first download still depends on the connection.

## Airborne aiming

Mechanical Shark's airborne weapon direction now follows existing yaw/pitch
input independently of the physical glide/breach direction. The reticle,
permitted shot and aim preview share that direction. The follow camera frames
the actual muzzle + 80 m point after terrain shortening and interpolation, using
the current field of view. The high-contrast mechanical sight now also applies to touchscreens, where the
old faint circle was difficult to read against the bright sky. Mouse remains
menu-only; keyboard and joystick are
unchanged. Ordinary-ocean airborne firing remains unavailable, with no misleading
valid-target lock; Penglai retains its existing airborne firing permission.

## Visible swallowing

Orca, Mechanical Shark, Zombie Shark and its companion opt into a moving-owner
intake profile. Borrowed prey keeps its form and continuous initial orientation,
travels with the real moving mouth, then compresses at intake. Restrained water
arcs and bubbles use ten reusable objects, no extra lights, and support pause,
reduced motion, reset and disposal. New cover clips the visual path rather than
shrinking a distant prey through a wall. Capture, nutrition, growth, rewards and
remote explosive victims are unchanged. Giant Squid's dedicated intake paths,
timing, poses and compression remain unchanged.

## Verification

- 260 focused Node checks pass, covering cache registration/worker/build,
  ordinary/Squid feeding, companion, aim/torpedoes, flight and steering.
  Six actual HTTP server checks pass. Build, formatting and diff checks pass.
- A fresh compiled-game profile was tested cold, warm and after browser restart.
  Only ordinary HTTP cache was cleared before each visit, retaining normal
  request semantics. Both revisits served all 224 startup items from persistent
  storage, with zero startup-item native fetches. The small uncached bootstrap
  and occasional newly requested random-scene textures are recorded separately.
  A cached script also remained readable while offline; offline navigation is
  intentionally unsupported. A real follow-up build update reused 222 unchanged
  startup assets and fetched exactly its two changed hashes (CSS and the entry
  that references it); the next visits reused all 224 again.
- Controlled native live-loop fixtures captured two meals each for the three
  ordinary characters and one completed companion intake. The earlier small-prey
  pass also exercised Giant Squid's unchanged leading carry path. These are
  controlled initial placements, not an unassisted full expedition.
- Native Penglai keyboard and portrait joystick tests verified independent
  upward/downward aiming, the real projected muzzle ray, and an actual upward
  shot while physical non-sprint glide continued downward. A real ordinary-ocean
  breach retained the visible moving sight, rejected airborne fire without a
  projectile, and returned to water.
- The compiled public preview was opened in a fresh browser and started through
  the real character picker. A separate browser blocking Service Workers also
  reached gameplay. Neither production build exported development hooks.
- The two review videos contain actual game-loop frames at normal playback speed.
  No physical-phone, all-browser or complete eight-world expedition claim is made.

Evidence and recording sources are retained under the ignored project directory
`.local/cache_air_feeding_20261117/`. The restricted preview was rebuilt in place;
its old runtime archive was retained. The expired tunnel was replaced after its
recorded process was confirmed exited. Preview process identities and fingerprints
remain in `.local/mini_preview_20261007/`; development-only service is stopped after
verification. Main and the published Pages site remain unchanged.
