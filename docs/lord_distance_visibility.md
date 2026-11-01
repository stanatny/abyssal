# Shared lord distance visibility — 2026-11-01

Status: accepted for the authorized v0.11.25 main publication, alongside
the Atlantis skyline change. See [the integration record](release_v0_11_25.md).
The verification below records the original candidate review.

## Cause and change

The shared encounter update explicitly hid a living lord whenever its center
was more than 230 m from the player, or 850 m for a mythic lord. These limits
were unrelated to camera projection, actual body size or water visibility.
In Europa, a large, luminous Lumen Stalker beside the research wreck could
therefore disappear while its surroundings remained visible. Moving inside the
limit restored the whole body in one frame. The same rule affected every map;
clearer water, larger creatures and elevated viewpoints made it easier to see.

Remove that body-distance switch. Selected, living lords use their existing
meshes, frustum culling, depth occlusion, camera far plane and regional fog.
The meshes and textures already belong to expedition preparation; this does
not add a second model, loading pipeline, transparency layer, light or shadow.
Defeated lords and unselected cached instances still hide/detach as before.
Labels, territory rings, AI engagement, attack ranges, population and body
geometry are unchanged. Terrain/water can still hide a lord; this is not an
outline through walls or a guarantee of visibility in dense fog.

## Verification

- 92 relevant tests pass: shared encounters, boss rules and patrols, Europa HF
  anatomy, regional additions and the new eight-region distance regression.
- The regression exercises the real encounter update at 229/231, 400,
  849/851 and 1,400 m; distant rendering does not engage combat or reveal
  territory labels/rings. Defeat, restart and unselected-pool detachment remain
  covered. Hawaii's test covers the complete lord candidate pool; normal play
  still randomly selects two.
- An isolated headless Chrome using the native destination/start/pause/resume/
  home controls loads all eight regions, observing 27 selected lord instances
  in that run. All retain render visibility while dormant; no page, console or
  shader compilation error was recorded. Ordinary populations remain present.
- Controlled, paused cameras compare the current scene with the original
  distance expression temporarily applied immediately before rendering. The
  Europa Lumen Stalker and Atlantis Kraken comparisons reproduce the disappearance
  at identical viewpoints without changing lighting, fog, materials or models.
  Other views also preserve normal water/terrain occlusion. These are scene
  inspection captures, not a manual full-round playthrough; a locked Mariana
  seal can relocate the player independently of the inspection camera.

Local evidence: `.local/lord_visibility_20261101/`, including `review.json`,
paired original-renderer PNGs, test logs and benchmark records. The regular
browser-use connection was unavailable, so verification used an isolated Chrome
profile following the repository's existing browser-test approach; existing
user windows and preview services were not replaced.

## Rendering cost

Same-machine isolated headless Chrome (Apple M6 / ANGLE Metal), 1280×720;
High DPR 1 and Smooth DPR 0.8. Each row runs old cutoff → candidate → old
cutoff with 20 warm-up and 90 sampled frames per leg. Ordinary populations
and AI continue normally. This is a controlled benchmark: camera/player
position is held fixed and health/hunger are replenished to prevent the
measurement ending in starvation. No gameplay code implements those controls.

| Region / quality  | GPU ms: old → candidate → old | Candidate extra draw calls |
| ----------------- | ----------------------------- | -------------------------- |
| europa / high     | 6.13 → 6.53 → 6.06            | 2.0                        |
| europa / smooth   | 2.41 → 2.67 → 2.32            | 2.4                        |
| atlantis / high   | 9.11 → 8.94 → 9.07            | 12.0                       |
| atlantis / smooth | 4.92 → 5.11 → 4.98            | 13.4                       |
| penglai / high    | 7.74 → 7.70 → 7.73            | 2.0                        |
| penglai / smooth  | 4.09 → 4.19 → 4.09            | 2.1                        |

The largest candidate-minus-average-baseline GPU change in these views is
about 0.44 ms. Frame times varied widely in both baseline passes; these
samples do not establish stable interactive FPS, zero cost, or phone thermal
performance. The initial benchmark attempt reached player death and stopped
rendering in later legs; it is retained separately as `perf_first_attempt.*`
and is excluded from the table. All final legs stayed in playing mode and
recorded 90 rendered GPU samples.

## Preview delivery

The existing restricted preview was rebuilt with the preceding Atlantis skyline
changes retained. Public HTML plus nine entry/style/Europa-lord assets match
local bytes; source and private paths remain rejected. Local production
controls pass Europa → Atlantis → Europa (start, movement, pause/resume and
home), with no runtime/resource errors and no development hook.

Public native controls completed the same route, but the first cold load
reported HTTP 429 for some module preloads, both with concurrent verification
and when checked alone. A later serialized critical-asset check passes. Keep
this temporary-preview delivery limitation separate from the reproducible
230/850 m visibility bug; do not claim an error-free public cold load. No tunnel,
user browser, release or loading-policy change was made to mask the limit.
Receipts and exact artifact fingerprints remain in local evidence.
