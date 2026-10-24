# Bermuda lost-aircraft wreck redraw

Acceptance follow-up — 2026-10-24: the user replies “下一批”, accepting the delivered aircraft appearance and authorizing the cargo-graveyard batch. The candidate wording below is retained as delivery-time history. No commit or push was requested.

## Scope and status — 2026-10-24

The user accepts the waterspout appearance and requests the next batch. The
current agent independently replaces the remaining procedural twin-engine
plane wreck with an actual Hugging Face TRELLIS.2 asset. This aircraft candidate
awaits visual review. Earlier accepted liner, ghost-ship and weather work remains
intact and uncommitted. No commit, push or formal release is requested; main/Pages
remains v0.11.16.

The candidate adds a framed cockpit, twin radial engines with bent propellers,
corroded panels, torn wing skins, visible ribs and a breached rear fuselage. It is
a fictional wreck inspired by transport-aircraft anatomy, not a reconstruction
of Flight 19, a named accident or a particular historical aircraft.

## Reference and provenance

The [National WWII Museum's C-47 article](https://www.nationalww2museum.org/war/articles/douglas-c-47-skytrain)
supports the twin-engine, low-wing, metal transport structure. An original
built-in image-generation concept supplies the image-to-3D input; the museum
photographs are not copied into the game. Corrosion, damage and placement are
artistic adaptations.

Actual service: [Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2),
revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`, and
[TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B), revision
`af44b45f2e35a493886929c6d786e563ec68364d`; both current metadata cards report MIT.
These are software/model licenses, not a claim of exclusive rights to every
possible output. Only the original concept image was uploaded.

Attempt 01, seed 744101, resolution 1024, succeeded through preprocessing,
generation, extraction and download. The validated raw GLB is 4,670,048 bytes,
SHA-256 `684fbfa5ef5b6fbcdaffe432488010299a0bdba7a58b45450175b2a501c15064`.
Seven material/clay angles were inspected before integration. Torn wing openings,
engine relief and the rear breach exist in geometry rather than only albedo.

The dated included-quota reading was 650.568187 seconds before and 615.241483
seconds after this job, with zero over-quota usage and the returned reset at
17:55 BJT on October 24. This is a historical reading, not a live balance.
There was no paid overage or provider switch.

`prepare_bermuda_aircraft_hf_asset.mjs` welds UV-only duplicate positions,
simplifies to 15,962 triangles, restores oriented source normals, rotates the
nose toward local -Z and normalizes length to one. A new UV atlas reprojects
original HF color, then is reduced to 1024 square; matching linear vertex color
provides the loading fallback. The runtime uniformly scales to 34 m, preserving
the old fuselage's length. No animation, light or private update loop is added.

## Placement and contact correction

The first real-scene review found that the original site intersected a rock
spire and the original flat wings were buried in the sloping seabed. Simply
replacing the mesh would preserve those defects. A first tilted placement also
left the spire passing through the tail and was rejected.

The final center is approximately `(199, -351.56, -555)`, 29.15 m horizontally
from the original center, within the original landmark's 60 m radius. The
landmark anchor/name/radius stay exact. The aircraft is rigidly aligned with the
local seabed, with a small additional settling angle; the same transform drives
all its contact shapes. The terrain, rock spires, liner, ecology and other
landmarks are unchanged. This supersedes the brief's initial hope of preserving
all aircraft collider coordinates.

The four original wing/tail box IDs are retained with fitted transforms. Three
fuselage ellipsoids and two engine ellipsoids replace the old single fuselage
ellipsoid: this biome has 122→126 colliders. Every non-aircraft collider matches
the immediate baseline exactly, including order. Damage holes are small visual
breaches, not promised adult-sized interior passages. The existing outer routes
remain open.

All 22,271 converted vertices and every triangle center were checked against
the rendered terrain: the lowest vertex is 0.579 m into sediment and the lowest
triangle center 0.522 m; no vertex is buried by a meter. The mesh clears the old
piercing spire. The body remains above the sediment while its lower wreckage
seats into the slope; this is a static placement, not rigid-body simulation.

## Runtime cost and ownership

The aircraft is one opaque, double-sided draw with one geometry/material and
one 1024 color atlas. The complete biome changes from 10 to 9 mesh draws because
the old aircraft-only material batches disappear; triangles change from 74,296
to 88,526, an increase of 14,230. This is added visible detail, not a performance
optimization. New attribute/index buffers total 652,547 bytes; an RGBA8 atlas
with mipmaps is about 5.33 MiB. Packed JSON is 752,414 bytes and WebP 349,872 bytes.

Normal map construction starts material preparation. Failed downloads retain
sampled vertex colors and reconnect retries the atlas. Immutable geometry and
material use reference-counted leases; only the final owner releases resources.
The biome owns the instance and calls its idempotent disposal. There are no
runtime external HF URLs or new gameplay rules.

## Verification and evidence

Evidence is under `.local/bermuda_batch10_20261024/`:

- Raw inputs, actual GLB, private receipts, model revision metadata and all raw
  material/clay views; conversion and atlas reprojection reports.
- `review/`: matched-camera original/candidate overview and detail images with
  unchanged game lighting. A first browser run reported an AudioContext device
  error; the subsequent full review and native fixture completed without errors.
- `audit.json`: rendered-floor vertex/triangle support, exact non-aircraft
  collider and landmark preservation, and construction cost.
- `native/report.json`: delayed/failing atlas fallback and reconnect recovery;
  three Bermuda/Hawaii cycles release geometry/material/texture once each;
  actual 3 m player movement records 18 aircraft contact samples; pause/Home
  and Chinese 390px layout pass.
- Four new focused tests cover fallback data, shared-owner disposal, whole
  footprint/spire clearance and hull blocking with clear 3/30 m overhead travel.
  Combined aircraft/Bermuda suite: 17 passed.
- `delivery/aircraft_world.mp4`: approximately 24 seconds, 714 distinct decoded
  frames and no decode errors. This is a live-world observer-camera inspection,
  with an invulnerable positioned player, not a natural traversal or new camera.

Checks use native desktop Chrome on the M6 mini. The 390px view is desktop
emulation, not a physical-phone result. No claim is made about phone FPS, heat,
power or closure of the earlier phone incident. Visual acceptance remains with
the user. The small cargo graveyard and remaining natural biome decorations are
separate future work, not claimed finished by this batch.

## Final local checks

`npm test` passed 1,630 / 1,630 tests. The first formatting check identified
only the generated JSON's layout; formatting was corrected and `npm run check`
then passed. The production build was refreshed afterward; formatting does not
change decoded geometry or the recorded visual tests.

All 262 prior asset files match their baseline hashes. Among 1,326 previous
inputs, only `bermuda_biomes.js` and five relevant documentation files changed;
previous candidates remain intact. `source_preservation.json` records this
comparison. The original DEV, restricted preview, awake and tunnel process
identities remain unchanged, and rebuild archives preserve old runtimes.

## Production preview delivery

The rebuilt `index-DFq5UyyN.js` candidate has 410 artifacts totaling 105,391,287
bytes, all byte-identical across dist, local and public origins. Twenty forbidden
source/configuration/hidden/directory paths are denied at each origin. English
desktop and Chinese 390px native Guide/start/ability/pause/Home flows pass with
no browser/resource errors; normal Bermuda entry requests the aircraft atlas.
Same-address reload returns the new entry, with no production debug hook.
These are host-side public-URL checks, not another physical device.

Use the existing preview manager's `status` and `rebuild`; it archives earlier
runtimes without restarting the services. Only when authorized, inspect process
identities before its named-process `stop`. Actual ports, PIDs, logs and preview
URL remain in the ignored process registry and batch delivery records.
`final_fingerprints.json` identifies the final reviewed inputs. No commit, push,
new service or personal Skill change was performed.
