# Bermuda natural seabed art

Accepted appearance — 2026-10-24: the user requests the next batch, accepting this delivered appearance. The candidate remains uncommitted; historical technical evidence below retains its original scope. The separately reviewed [geology batch](bermuda_geology_huggingface_redraw.md) follows.

## Scope and status — 2026-10-24

The user accepts the small cargo wreck and asks for the next batch and an audit
of remaining visual work. This candidate replaces the old branching coral,
sea fans, tube sponges and mineral chimneys. The current agent works alone;
there is no new commit, push, release or personal-Skill edit. Main/Pages remains
v0.11.16. The previous pending candidates remain intact, and this new appearance
still needs the user's review.

The three colony types reuse the already accepted Hawaii HF meshes and colors;
they are not regenerated. Both independent placement paths are covered: 64
shallow-reef corals plus 74 deep colonies (24 coral, 24 fan, 26 sponge). Twelve
old cylinder vents receive one newly generated mineral-chimney prototype.
Original population points, heights and yaw patterns remain. Ecology, creatures,
rewards, combat, audio, ships, terrain and landmarks are unchanged.

The remaining old natural shapes include the reef arches, 28 spires, 60 shelf
rocks, and the small tube-worm decorations beside the vents. This batch does
not complete every environmental asset or claim that those elements were
generated with HF. Previously accepted models should continue to be reused.

## Reference and actual generation

[NOAA's vent explanation](https://oceanservice.noaa.gov/facts/vents.html) and
[WHOI's hydrothermal-vent overview](https://www.whoi.edu/ocean-learning-hub/ocean-topics/how-the-ocean-works/seafloor-below/hydrothermal-vents/)
inform the mineral chimney, accumulated deposits and hollow opening. This is
a fictional Bermuda scene, not a claim about surveyed local vent geology.

An original built-in image-generation concept was uploaded to the authorized
[Microsoft TRELLIS.2 Space](https://huggingface.co/spaces/microsoft/TRELLIS.2),
revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`. The
[TRELLIS.2-4B model](https://huggingface.co/microsoft/TRELLIS.2-4B) revision was
`af44b45f2e35a493886929c6d786e563ec68364d`. Both metadata cards reported MIT;
this describes software/model licensing, not exclusive rights to each output.

Attempt 01, seed 744221, resolution 1024 completed generation, extraction and
download: 3,870,468-byte GLB, SHA-256
`95420b3ee4e470f930fe7a4f797682f1f983bd087ce1445659f6201362274e74`.
The live Gradio session remained open until the download was verified. Material
and clay views confirm actual surface relief and an opening in the geometry.
No extra paid usage or provider switch occurred.

Included quota was read at approximately 09:34 BJT: 574.054649 seconds before
the job, 540.134408 after export, and zero over-quota usage. The returned reset
was October 24 at 17:55 BJT. These are dated readings, not a future balance.
The current official app declared 120 GPU seconds for generation and 120 for
export; the preflight retained additional margin instead of using a stale
reservation from another Space version.

The offline conversion welds UV duplicates before simplification, restores
oriented source normals and projects source color into a new 1024-square atlas.
The first 9,160-triangle version was reduced to 4,452 triangles / 4,945 UV
vertices. Its source JSON is 175,160 bytes and WebP 284,148 bytes; the audit
report adds 403 bytes. This is a static mesh, with no skeleton or new animation
loop. Vertex colors remain available while the atlas is unavailable.

## Placement, contacts and lifecycle

Colonies keep their centers and uniform proportions. The lower surface is
sampled against the existing slope, then seated 0.15 m into it. An audit against
the actual rendered floor mesh covers all 138 roots: the lowest root points
range from -0.250 to -0.008 m for the deep set and -0.157 to -0.146 m for the
nursery. Colony decorations remain non-collidable.

Chimneys retain their original twelve horizontal sites and 9/14/19/24 m height
cycle. They are slope-aligned and seated by the whole surface, with a 0.22 m
sediment allowance. Ray casts against the rendered terrain place the lowest
points between -0.266 and -0.164 m, with no missing floor hits. Their old twelve ellipsoids are replaced by four fitted
height-band boxes per chimney. This corrects solid surfaces outside the old
envelopes; it is conservative contact geometry, not per-triangle physics or
an enterable chimney interior. All non-vent collider records and landmarks
match the prior candidate exactly. Biome contacts change 212 to 248; whole
ocean contacts change 674 to 710. The four existing warm lights follow the new
chimney tops, retaining their original color, intensity and distance. These
local changes supersede the initial brief's blanket collider/light-preservation
wording; no new hazard or damage rule is introduced.

Near/far instanced colony meshes share the accepted asset leases. Detailed
geometry is selected within 28 m and retained until 34 m; decisions run every
0.4 simulation seconds within the existing ocean update. Full-placement bounds
are established before visible-instance compaction. Near/far triangles are
7,992/984 for coral, 7,998/850 for fans and 5,000/600 for sponges. The 64 nursery
instances share the coral asset with the deep set without sharing LOD state.
One instanced draw represents all twelve chimneys. Last-owner release disposes
the shared geometry/materials/textures, and each instance buffer is disposed
separately. Repeated disposal is safe.

## Verification and cost

Evidence is under `.local/bermuda_batch12_20261024/`:

- `audit.json`, `ground_audit.json`: exact preserved contracts, transformed
  surfaces, fitted contact coverage and actual rendered-floor root support.
- `targeted2.log`: 25 focused checks; `test.log`: 1,638 full tests, all passing.
- `native/report.json`: forced failure of all four atlases retains vertex
  colors; the online event restores textures. Three Bermuda → Atlantis →
  Hawaii → Bermuda cycles release each of 18 unique shared resources once.
  A naturally advancing 3 m player reaches the chimney and is blocked; 38
  contact samples name its fitted box. Pause freezes simulation. Chinese
  narrow-screen start/pause/Home also completes.
- `review/report.json`: matched five-view before/after captures using real
  ocean roots, scene lighting and depth. `rejected_camera_review/` preserves
  an earlier observer-camera placement inside terrain; it is not delivery.
- `film_report.json`, `delivery/`: a paused-scene observer orbit, clearly
  labelled as such. It is not a recorded full player traversal.

The entire ocean's static visible inventory, before frustum culling and
postprocessing, changes from 51 draws / 856,177 triangles to 53 / 867,313 at
the all-far initialization. The five close-review inventories use 54 draws
and 871,713–881,329 triangles. Actual renderer-frame comparisons include
postprocessing: three more calls and 32,160–58,988 extra triangles in the five
matched views. These are measured complexity costs, not FPS, thermal or phone
performance improvements. 390 px desktop emulation is not a physical phone
test; the earlier original-device follow-up remains open.

Source fingerprints, restricted/public artifact verification and the production
native-flow report are saved with this batch. The restricted preview exposes
only `index.html` and `assets/`, with no production debug hook. Existing process
identities and logs are preserved. The candidate is delivered for visual review;
technical checks do not establish user acceptance.

## Preview delivery

The existing preview was rebuilt in place at
https://saver-recorded-digit-could.trycloudflare.com/ with entry
`index-BUgUclFd.js`. All 416 artifacts (107,378,135 bytes) were independently
fetched from both the restricted local origin and the public origin and match
the same build byte for byte. Twenty-three source/private/directory paths are
rejected at each origin. The production browser completed English 1440 px and
Chinese 390 px Guide/start/ability/pause/Home flows, loaded all four relevant
atlases, exposed no development hook and reloaded the same URL into this entry.
No browser errors or failed runtime resources were recorded. This verifies the
local host's public round trip, not a second device or the user's network.

Processes remain DEV 35213, restricted preview 23118, awake 23120 and tunnel 35419. Their identity strings match the existing process record, and the tunnel
metrics endpoint is ready. `.local/mini_preview_20261007/processes.json` records
ports, complete commands and log paths; the manager's `status`, `rebuild` and
`stop` methods remain the lifecycle entrypoints. Rebuild preserves prior runtime
archives; stop is only for a later authorized teardown, not part of delivery.
Source fingerprints preserve all 268 pre-existing asset files exactly; only the
two Bermuda runtime entrypoints and five review/entry documents change among
1,343 baseline inputs. New art files and checks are listed in the final batch
fingerprint. No earlier candidate was committed, removed or overwritten.
