# Hawaii moon jelly and flying-fish revision

Candidate — 2026-11-11. The user requests a fresh Hugging Face jellyfish and
more coherent flying-fish escape behavior. Work is on `art/hawaii-jelly-flight`,
based on published main `3d5ca6d` / v0.11.27. It remains uncommitted and
unpublished; no release or version change is authorized.

## Moon jelly

Hawaii previously combined 36 decorative, non-edible procedural jellies with
12 registered `moon_jelly` residents. The background shapes were much larger
than the real 0.4 m specimens and did not share their Guide, feeding or respawn.
The decorative system is removed. Its 252 seeded random draws are retained so
later terrain effects and collision placement do not shift.

The 12 real residents use a new generated, shallow saucer bell, short marginal
tentacles, four frilled oral arms and four source-textured pink gonads. Bell
contraction and independent trailing-arm bones retain continuous motion and an
upright posture. The shared factory serves the actual world and Ocean Guide;
there is no second decorative or synonym species. The existing marine
invertebrate entry remains bilingual and includes all four regional habitats.

Only Hawaii's 12 anchors move into clear nursery/outer-reef water. Each passes
actual habitat, terrain, solid-object and occupied-placement checks without a
fallback. Ordinary Hawaii population remains 516, plus one regional rare for
517 native entities. Bermuda, Atlantis and Mariana retain their existing 12
jellies each and unchanged placement. Bell diameter, nutrition 6, growth 0.012,
swim speed 0.45 / sprint 0.6 and the 28 movement-second respawn are unchanged.
The new shared appearance also reaches those other three maps.

### Generation and conversion

An original project-generated moon-jelly reference was the only image uploaded
to [Microsoft TRELLIS.2](https://huggingface.co/spaces/microsoft/TRELLIS.2).
The Space revision was `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d`; the
[MIT-licensed model](https://huggingface.co/microsoft/TRELLIS.2-4B) revision was
`af44b45f2e35a493886929c6d786e563ec68364d`. Seed: 761111, generation: 1024.
Generation and actual GLB export both completed. Included ZeroGPU quota use was
54.34 seconds; the recorded over-quota use stayed zero. No paid overage was used.

The downloaded GLB is 3,653,472 bytes / 93,920 triangles, SHA-256
`05ccb5f570e27777fa6ef554003411ae4e6883194fd03c495b57eea9e8d9afbc`.
The existing converter produces 9,878 triangles / 14,140 UV vertices with a
fresh atlas, source-surface projection and padded rebake. Mean projection error
is 0.001566 and p99 is 0.007770 in normalized source units. Runtime uses one
1024-square WebP (154,772 bytes), one mesh and 14 bones. Geometry attributes and
indices occupy 879,388 bytes, shared between instances; skeletons remain private.
The previous extra procedural gonad mesh is removed to avoid duplicate anatomy.

Raw GLB color and clay views were inspected from front, side, back and above,
followed by the converted, skinned Guide and actual seawater views. This verifies
the mesh rather than relying on the concept image. Four source-painted organs
are visible above the bell; fallback color preserves shape but cannot reproduce
that texture detail. The retained 0.4-opacity material is an inexpensive artistic
translucency, not volumetric tissue simulation. Biological references:
[Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/moon-jelly)
and [Georgia Aquarium](https://www.georgiaaquarium.org/animal/moon-jelly/).

## Flying-fish escape

A sufficiently large, visible approaching player can provoke a surface escape;
very close encounters also trigger it without a closing-speed test. The fish
accelerates underwater, crosses the actual surface with its fins folded, then
unfolds the existing paired fins for a finite ballistic glide. It folds again on
water contact and descends continuously into its legal swimming layer before
ordinary AI resumes. Airborne fins do not flap like bird wings. Existing food,
size and contact rules still apply throughout the escape.

The current tuning is a 22 m threat radius, 8 m emergency radius, maximum
16 m/s horizontal speed, 7.2 m/s launch speed, 5.5 m/s² gravity and an
18-second active-play cooldown. These are game adaptations, not measured
species kinematics; see the [Australian Museum flying-fish account](https://australian.museum/learn/animals/fishes/a-flyingfish-cheilopogon-sp/).
Open ocean only: river, ice and aether surfaces do not enable this escape.

Each movement segment checks the same solid-world query used by the game,
including ships, plus actual seabed and map bounds. Obstructed run-up or flight
returns to water without teleporting. A regression found a mismatch between
ordinary AI's 8-unit boundary margin and flight's 12-unit margin: launch is now
rejected in that narrow strip, preserving ordinary swimming until the fish
returns to clear water. Collision, hidden/disoriented state and cooldown cannot
be bypassed by repeatedly attempting launch.

Exit and reentry each emit one small existing ripple/sheet/droplet effect. The
whole group scales by body length, including its expansion and particle travel;
player splashes are unchanged. Creature calls accept at most 12 live effects,
expire through the existing surface lifetime, and clear on reset/disposal.
There is no new render loop or timer. Capture, blast, companion retirement,
respawn and round reset all clear flight events and the open-fin flag.

## Verification and evidence

Private evidence is under `.local/hawaii_jelly_revision_20261111/`:

- `receipt.json` in `moon_jelly_attempt_01`, `raw_inspection.json`, raw color/clay
  PNGs, conversion report and `independent_asset_audit.json`: source, quota,
  hash identity, geometry budget, skin continuity, UV/normal/weight checks,
  shared resources and idempotent private-skeleton disposal.
- `ecology_audit.json`: all 12 legal Hawaii anchors, unchanged four-map species
  values/counts, and exact seeded collision-data equality with the baseline.
- `native.json` and two WebM recordings: actual Hawaii resident drift and
  pulsing; a complete run-up, above-water glide, reentry and return to ordinary
  swimming; pause freezes position and bones; restart clears flight. Initial
  encounter placement and close observer camera are staged; movement, collision
  and rendering use the ordinary game loop. The tested fish traveled about
  65 m horizontally before rejoining its normal layer. Movement uses the game's
  capped simulation delta, so this overloaded recording's wall-clock duration
  must not be interpreted as physical flight duration.
- Native effect saturation accepts exactly 12 of 15 requests, with the 0.4 m
  fish's whole-group scale at 1/15; reset detaches every recorded effect.
- `shared_native.json`: repeated four-map loading and shared Guide/world model
  identity, bilingual details, a 390 px Guide check and browser errors.
- `capture_native.json`: normal in-world mouth contact retires the new jelly
  through the shared feeding path.

Final verification passes 83/83 focused tests across 12 files, covering the
new flight controller, both HF batches, feeding, regional ecology, landmark
collision identity, surface rules/steering and blast retirement. `npm run check`
and the production/preview build pass. A formatting-only pass changes the mesh
JSON bytes afterward; decoded JSON equals the converter output exactly and the
12 asset tests pass again. `final_identity.json` records both hashes.

The rebuilt preview uses `index-Bob8k9OC.js`,
`model_moon_jelly_hf_mesh-CURLQSp5.js` and
`moon_jelly_hf_color-DuAr8Oq_.webp`. Ten shell/main/engine/model/texture resources
match the reviewed runtime by SHA-256 through the public address. Two public
cold-cache flows pass: Chinese desktop 1280 px and English touch-emulated
390 px. They check Hawaii start, native keyboard/touch input, pause/resume/home,
the shared jelly Guide, no development hook, and no browser/resource errors or
duplicate static modules. Cold initialization took 49.3 / 34.3 seconds on this
host/network; warm-cache startup and the user's own external network may differ.
The preview-only bounded loader is retained; formal Pages stays v0.11.27.

The delivered `hawaii_jelly_and_flight.mp4` is a 19.87-second 1280×800 H.264,
yuv420p MP4 with a verified PNG cover. It shows actual in-game jelly movement,
then the complete flying-fish sequence with the inspection staging disclosed.
Native desktop and emulated narrow-screen checks do not establish physical-phone
FPS, heat or memory use.
