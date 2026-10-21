# v0.11.14 — Hawaii Redraws, Sound and Loading Improvements

The user accepts the accumulated preview and authorizes commit and publication
to main on 2026-10-21. This integrates `art/hawaii-lords-hf-redraw`, including
accepted checkpoint `87095f5` and its CPU follow-up, after v0.11.13 / `110494c`.
All 1,078 delivered input hashes match before release-only metadata changes.
Earlier candidate-only or local-only labels describe historical stages and are
superseded for this accepted scope. The current AI agent integrates alone.
No tag or GitHub Release is requested.

## Included changes

- Hawaii's four lords and ordinary creatures use the accepted generated meshes,
  fitted animation rigs and material recovery. Include seabirds, both adult
  Swimmer/Diver appearances, the revised Kraken intake/bite, volumetric Octopus
  swimming, narrower Sunfish and coordinated turtle strokes.
- Submarine/torpedo, Contact Mine, surface ships, four seabed landmarks and four
  reef forms receive the accepted redraws with retained gameplay placement and
  collision contracts. Human shoulder/pose and generated-texture loading fixes
  are included; previously rejected iterations are historical only.
- The selected ordinary feeding cue uses Stable B; yellow prey, player hurt and
  lord bites use MOSS B. Fourteen further lord-attack cues cover all 18 kinds and
  22 ability combinations, preserving warnings, bounded playback and gameplay.
- Content-hashed model chunks and HTTP reuse avoid fetching unchanged assets
  unnecessarily. Fresh HTML points to new hashes after updates. The restricted
  preview supports precompressed responses; GitHub Pages has its own HTTP cache
  and compression policy, so preview-header measurements are not Pages claims.
- Amazon/Odyssey reuse deterministic rest-pose normalization; mutable Armored
  Cory retains its original path. Static collision cell ranges avoid temporary
  entries/map arrays while preserving exact candidate order, duplicates and
  collision rules. No art, population, simulation frequency or quality reduction.

See the [Hawaii creature review](hawaii_creatures_huggingface_redraw.md),
[landmarks](hawaii_landmarks_huggingface_redraw.md),
[reef](hawaii_reef_life_huggingface_redraw.md),
[appearance recovery](appearance_loading_human_revision.md),
[combat audio](combat_audio_huggingface_audition.md),
[lord audio](lord_attack_audio_revision.md),
[loading cache](runtime_loading_cache_revision.md) and
[CPU measurements](runtime_cpu_optimization_revision.md).

## Verification and scope

The accepted candidate passed 1,498 unit checks, formatting and production
build. Serial baseline/candidate tests show warm region-switch medians on this
M6 mini falling from 887.5 to 779.5ms for Amazon and 789 to 489ms for Odyssey.
This is not a material steady-frame/FPS improvement or a phone/M4 thermal claim.
Prior native checks cover exact collision equivalence, posed geometry and
independent instances, eight maps, bilingual Guide, pause/resume/Home and reload.
Those candidate receipts are separate from fresh release verification.

Release-only edits update package/footer/localization to v0.11.14. Fresh format
and production build checks, exact-main Node22 CI and the resulting Pages
artifact/native-flow checks are recorded under `.local/release_v0_11_14/`.
Do not infer deployment completion from a local build or a successful push.
Publication requires the exact workflow SHA and deployed bytes to agree.
Generated assets add download and memory cost compared with old procedural
forms; this release does not claim to remove all GPU or first-use shader cost.
No physical-phone or M4 power/temperature measurement was performed.

## Operations and rollback

Preserve the established development/preview/tunnel process identities, logs,
runtime archives and historical worktrees. The published payload contains only
`index.html` and `assets/`, without source maps or production debug hooks.
The preceding published checkpoint is v0.11.13 / `110494c`. A rollback should
revert the integrated changes with matching version/footer metadata under the
user's publication authorization, without destroying services or accepted work.
