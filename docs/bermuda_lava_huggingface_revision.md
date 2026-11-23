# Bermuda HF molten-material revision — 2026-11-21

The player rejects the preceding orange tubular jets and flat pointed crowns.
The replacement uses original Hugging Face FLUX.1-schnell material images,
following the existing water-current VFX-texture route, with continuous irregular
fluid silhouettes, thick impact pools, true shading normals and a separate broad
rising failure volume. Static HF images provide surface material; runtime motion
continues to follow the actual quest clock and validated trajectories.

All current gameplay modules, actual mouth/path contacts, warning durations,
random seeds and landing choices, lava/rock damage, predator, food, sixty-second
escape, full-body exits, physical closure and victory rules remain. This is an
appearance revision, without commit/push/version authorization. The previous
functional evidence remains historical and does not establish acceptance of the
new art. Before-source hashes and generation provenance are retained under the
ignored `bermuda_lava_hf_20261121` revision evidence.

## Production target

Use opaque dark cooling basalt islands interspersed with broad glowing molten
channels. Flow should read as viscous moving liquid with irregular cross-sections,
not smooth luminous pipes or parallel neon ribbons. Pool impacts need actual
thickness and surface normals. Timeout must raise a wide continuous liquid
volume around the actual final player position, rather than stretch the ordinary
four-metre splash into tall spear-shaped sheets.

Reuse current resource preparation and ownership, at most two shared image
textures, existing scene lighting/fog and six render objects. No new lights,
private frame loop or gameplay hit volumes are introduced. All visible near
geometry stays inside the corresponding physical envelope.

## Source and adaptation

The selected [HF Space](https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell)
runs the [FLUX.1-schnell model](https://huggingface.co/black-forest-labs/FLUX.1-schnell),
whose model card identifies Apache-2.0 licensing. Current Space revision, API,
quota before/after each job, prompts, seeds, original file bytes and hashes are
recorded privately. Only original generic material prompts are sent; no user
files, project source or previous private screenshots are uploaded. Included GPU
quota is reused; paid over-quota usage is not authorized.

Height, roughness and heat channels derived offline from the generated color
image must be identified as derived channels rather than native HF PBR output.
No account credentials or temporary private service URLs belong in this document.

Three actual 1024-pixel candidates were generated. The first two read too much
like regular crack networks; the selected third emphasizes rolled liquid and
scattered cooling skin. All originals and receipts remain preserved. The selected
original SHA-256 is `7197f2f37e4fc180273f38cf11cd97b3db0042cdd921b58f1d6c5334977b91df`.
The reproducible converter is
[`prepare_bermuda_lava_hf_asset.mjs`](../scripts/prepare_bermuda_lava_hf_asset.mjs).
It blends the outer 48 pixels into shared opposite boundaries, keeps the 1024 px sRGB
color, and derives a 512 px linear surface map. Its red channel is a 7 × 7 toroidal
low-pass height estimate; green is roughness and blue is a warm-color heat mask.
These are source-derived approximations, not measured physical PBR data.

The two bundled images total 555,434 bytes. Their full-mipRGBA capacity is about
6.67 MiB before renderer/platform-specific overhead. The public
[`source ledger`](../src/assets/textures/bermuda_lava_hf_sources.json) records
the Space revision, prompt, seed, source/output hashes and adaptation steps.

## Integrated shape, motion and ownership

The continuous core keeps all original validated path points and hit radii.
Asymmetric folded sections carry smooth pressure bulges at 6 m/s instead of a
uniform circular pipe. The source texture is stretched axially by 4.17×, advects
at a nominal 8.33 m/s and warps periodically around the section. Reduced-motion
mode scales both CPU shape motion and surface flow to 18 percent; pause retains
the existing fixed quest clock.

Impact pools are closed thick geometry with actual surface normals, rather than
a flat crown. Timeout uses its own broad rising top and side walls; the side
has independent circumference×heightUVs and remains visible when the camera is
inside. Ordinary pool radius 6.5 m and height 4 m, all path and rock bounds, and the
unchanged deadline still come from the existing hazard snapshot.

The renderer retains six objects, at most six conservative draw calls, a 6,840
stream-triangle capacity and 720 pool triangles total. Dynamic typed buffers are
178,704 bytes. Two reference-counted image maps and per-instance PBR uniforms use
the existing bounded material-preparation queue. Late readiness updates existing
materials; failed loads keep an opaque fallback and retry through the existing
bounded path. Final release closes shared images, while one release cannot
invalidate another active lease. No new scene light or production frame loop is
added.

## Verification and evidence boundaries

The final material/visual batch passes 13/13 checks, including shared loading,
retry/release, original trajectory envelopes, complete on/off, closed pool
volume/normals, nondegenerate sideUVs, camera-inside visibility and reduced-motion
actual-vertex displacement. Original actual-world gameplay/rule modules remain
byte-identical to the previous delivered candidate. The earlier 101-case gameplay
run remains historical; it is not claimed as a fresh run for this art revision.

Actual populated-cave inspections confirm both 1024/512 px maps ready in the live
quest's stream/pool/charge materials, complete real warning-to-release behavior
and off transitions without page or shader errors. The first HF inspection still
looked like a mottled cable; it is preserved separately, and the final shape/UV
pass addresses that visible problem. A first isolated compile fixture had a
missing favicon 404, corrected only in the fixture. A first recording passed the
material comparison and pool views but used the wrong argument signature for
the terminal snapshot; it is retained as a failed harness, not a gameplay bug.

The new short recording includes the natural live warning/release first, then
explicitly labelled paused-world before/after, impact and terminal presentation
views. The terminal section is a short visual replay from the actual-world
terminal snapshot; it does not shorten the product's 60-second escape or claim
a new unassisted expedition. The paused product renderer is idle while one
fixture-only render loop owns those comparison frames and is disposed afterward.

A serial headed Chrome 158/Apple M6 Metal sample at 1280 × 800 and device scale 1
uses 817 live entity instances, 1.8 seconds warmup and seven seconds of native slow
swimming in each High/Smooth active-breath fixture. Both median frame intervals
are 207.5 ms;95th percentiles 224.2/220.1 ms, with 52/39 median draws. The sustained
30-second phase is for measurement only. No competing browser, CPU test or
encoder ran during sampling. This normal-phase sample follows the final fluid
and reduced-motion changes; the subsequent terminal-only shape adjustment is
outside its scope. The scene remains around five frames/second on this host,
not an overall performance improvement or physical-phone result.

The first terminal material recording made its broad volume read like a clean
circular cylinder. That capture is retained as rejected art, alongside the
accepted normal-breath/material/pool observations. The final post-fatal surface
is revised toward an irregular broader surge; this does not change any active
hazard or escape rule.

The final post-fatal surge uses a 112–128 m irregular visual footprint, a wide
high core and continuous rounded rolling shoulders. It retains the actual local
ground, final player centre and roof metadata, six roof rocks and the original
1.2-second presentation. This visual expansion occurs only after the existing
fatal deadline; it adds no damage or contact radius. Two targeted checks cover
20 m and 75 m ground-to-body heights, a conservative full 32 m body in twelve
headings, interior visibility and closed/valid UV geometry. Normal active-stream
and pool position, normal and UV arrays, draw ranges and counts are byte-identical
to the pre-terminal-adjustment snapshot. The normal-phase performance sample
therefore retains its exact sampled geometry.

Final focused verification passes 28/28 material, visual and quest checks, plus
two actual-world integration checks for whole molten paths, damage and complete
cover rejection. All affected source, test, converter and asset-ledger files pass
format checks. The final labelled short recording completes without page,
shader or console errors and preserves both the comparison and terminal stages.
It is a silent appearance review, with controlled fixed-state sections, rather
than a gameplay-speed or new full-expedition demonstration. Original recordings
and rejected intermediate appearances remain retained. This stays an uncommitted
development preview for player visual review.

The final terminal-only footprint was widened once more to 128 m maximum so the
usual 43 m follow/observer camera is surrounded by the high flooding core rather
than looking at an isolated cylindrical mound. Its irregular inner outline is
approximately 112–128 m. This is only a post-fatal presentation, clipped by the
existing opaque cave scenery; there is no expanded hit radius or new gameplay
danger. The two targeted ground/whole-body/interior checks pass again.

Final review confirms the cave-wide terminal framing covers the player with
molten material without exposing the earlier isolated cylinder. The short
delivery edit joins the accepted warning/before/after/pool sections with this
final terminal replay; both original recordings remain preserved. No physical
fluid simulation, cinematic photorealism or gameplay performance improvement is
claimed. It is the generated material integrated into the real-time effect.
