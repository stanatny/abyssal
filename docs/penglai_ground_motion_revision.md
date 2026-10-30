# Penglai ground motion follow-up — 2026-10-30

The user reports another crooked head beside Taotie in the island/bamboo video,
and describes Taotie's walking as moonwalking. The neighbour is Zheng. This
candidate repairs those two visible defects and reviews the related Lushu and
Nine-tail Fox stride timing. It remains uncommitted and unpushed; user visual
acceptance of this follow-up is pending.

## Findings and implementation

Zheng's generated neutral skull points approximately 19 degrees away from its
body axis. `scripts/align_zheng_head.mjs` applies a gradual head/neck correction to
the existing mesh, transforms normals with the inverse-transpose Jacobian and
records the corrected neck joints. UVs, triangle indices, color texture, length
and the original gameplay muzzle anchor are preserved. The least sampled local
Jacobian determinant is 0.763, with no sampled inversion. Its interior hull is
regenerated for the new geometry fingerprint; other creatures' hulls are retained.

Taotie's actual nearby world instance already advances its gait. The remaining
problem is support: nominal local foot sweeps slide when the root turns, bent-knee
nearest-segment weights can switch abruptly, and navigation clearance visibly
raises the soles. The fix adds per-instance world foot contacts after the nominal
walk pose. A planted paw keeps its world position and heading; a tight turn takes
a short recovery step before the leg overextends. The two-bone solve follows the
nominal knee bend. Height-based ownership keeps skin interpolation continuous
through the fitted knees. Navigation sole padding is removed from the visual
body, and its exported head anchor follows that body transform.

Ground pose state now carries the real frame delta and an explicit contact flag.
Guide motion has no world contacts. Leap/windup releases the planted feet; a stop
holds the last pose. No root movement, speed, population, collision radius,
attack damage, cooldown or leap schedule is changed. Zheng, Lushu and Nine-tail
Fox also use stride-to-distance ratios derived from their existing foot travel
and stance duration. Their rigs do not use Taotie's world contact correction.
The four-leg contact helper is currently fitted to Taotie's existing flat-island
walk, not a general arbitrary-terrain locomotion system.

No new HF generation or paid generation is needed for these corrections. Existing
HF art and textures remain the source. Earlier Azure aiming, attitude, Taotie
head, island winding and bamboo candidates remain intact.

## Verification and limits

- Full suite: **2,108 passing**, zero failed or skipped. The new tests sample
  actual skinned paw vertices through straight travel and turns, bound edge
  stretching, check recovery steps, zero-speed freezing, leap release, independent
  instances and the body-following attack anchor. Zheng is checked in neutral
  and 120 walking poses against paired facial landmarks.
- A native desktop Chrome world recording uses normal NPC updates near the player,
  with only the observation camera and player invulnerability adjusted. Across
  966 frames / 16.106 seconds, Taotie travels 218.827 m through walking, windup
  and leap. No per-frame NPC placement, forced visibility or duplicate animation
  call is used. Nearby Zheng and other habitat residents remain in the scene.
- A separate native pause/resume and contact test places a 30 m player once and
  temporarily disables other damage sources. Normal Taotie attacks reduce health
  from 100 to zero; its AI and cooldowns are not overridden. An earlier wider
  approach misses as the player leaves the island and is retained as such, rather
  than counted as successful damage coverage.
- The 9.917-second matched before/after movie uses identical prescribed root path,
  speed and camera. It isolates foot behavior; it is not a natural NPC encounter.
  The separate 16.033-second movie is the native world recording. Both are decoded
  and visually reviewed after H.264 encoding, alongside matched Zheng views.
- All 1,793 baseline source/test/script hashes are checked. Exactly five existing
  inputs change in this follow-up; the other 1,788 are identical. The added helper,
  offline alignment script and tests are recorded separately. Existing Taotie mesh,
  bamboo assets, islands, Azure aiming and all other hull records are preserved.
- This is native desktop Chrome evidence, not physical phone validation. Unit
  checks and measured foot contacts do not replace the user's visual acceptance.

## Delivery

Evidence and original snapshots: `.local/penglai_ground_motion_20261030/`.
Important files: `source_preservation.json`, `final_review.json`,
`final_full_tests.log`, `grounded_world.json`, `native_contact_attack_pause.json`,
`public_native.json`, `public_selected.json`, `final_fingerprints.json`, and
`delivery.json`.

The same restricted preview origin is rebuilt with archive preservation:
https://saver-recorded-digit-could.trycloudflare.com/ . Entry:
`assets/index-BjXsXnrP.js`; 954 build artifacts. Only `index.html` and `assets/`
are exposed. Existing service identities, historical work and old runtime assets
are retained. Official main/Pages is unchanged.

## Local checkpoint authorization

On 2026-10-30 the user requests a local commit of the delivered corrections before
starting a separate ocean-current feature. All 2,098 delivered inputs match before
acceptance-only notes. This supersedes the pending checkpoint status above; no
push or official release is authorized.
