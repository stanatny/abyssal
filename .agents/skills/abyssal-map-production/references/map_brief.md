# Map production brief and return receipt

Copy the relevant sections into the map's project brief, fill concrete values, and remove unused rows. This is a production contract for the current AI agent, not a new user approval form. Another model may be included only when explicitly specified by the user. Use repository-relative paths for modules and evidence; execution worktrees may be identified by the paths actually assigned for the task. Do not copy Atlantis's numbers by default.

## Assignment

| Field                              | Fill for this task                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Map and intended player experience | Region ID, defining promise, surface-to-depth progression, scope and exclusions.                                                |
| Source of truth                    | Current request, base revision, relevant current documents and accepted comparison assets.                                      |
| Integration owner                  | the current AI agent worktree/branch; shared files, preview/build/browser services owned here.                                  |
| Art delegate                       | the current AI agent by default; another model only when explicitly specified by the user, with exact worktree/file boundaries. |
| Return method                      | Unstaged diff, exact changed files, evidence location; no independent commit/stage/push or service replacement.                 |
| Existing authorization             | Record only what the current task permits; distinguish local work, preview, commit, merge, push and release.                    |

## Regional design

| Decision            | Concrete contract                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity            | Architecture/terrain forms, material detail, palette, real light sources, fog, atmosphere and human activity; how this differs in actual play from existing regions. |
| Scale               | World extents and depth convention; districts/biomes; landmark dimensions relative to player; coverage metric and denominator if relevant.                           |
| Routes              | Named start/end coordinates, horizontal and vertical connections, adult clearances, turning/retreat routes, feeding stops and combat volumes.                        |
| Terrain fit         | Authoritative sampler or final mesh; full support-footprint sampling; reservation dimensions; foundation and collider approach.                                      |
| Viewing evidence    | Normal follow-camera distances and close inspection angles; required surface, approach, central and side-area views.                                                 |
| Asset comparisons   | Accepted models/environment examples for each new category; references, licenses and adaptation caveats.                                                             |
| Performance targets | Target hardware/browser/quality/viewports; baseline scene; budgets for repeated assets and populated runtime; owner of headed measurements.                          |

## Ecology and audio

Use one row per species or shared group. Distinguish decorative density from obtainable nutrition and real habitat from game adaptation.

| Species / reuse         | Size convention and feeding stage | Group/count/anchors and legal depth band | Nutrition and expected acquisition route | Respawn/migration and predator restrictions |
| ----------------------- | --------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Fill per proposed group |                                   |                                          |                                          |                                             |

For every regional exclusive, identify its shared habitat behavior and discovery route. For independent residents, include separate `spawnAnchors` and `residentRadius`; for schools, give profiles and migration bands; for hunters, define territories and relocation restrictions. Record a normal-follow-camera sighting, drift check, consumption/respawn event, and map-switch isolation check. Tiny biological size is a design constraint, not a reason to silently enlarge the model or count it as a whole feeding school.

Record food budgets at the representative body lengths required by AGENTS, using the shared rules and allowing travel, injury and battle reserves. State which native spawning, moving-prey feeding and normal-respawn cases will verify these assumptions.

| Audio role     | Composition or reuse                                         | Actual trigger and exit                                          | Evidence / owner                               |
| -------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------- |
| Exploration    | Regional musical identity or intentionally retained score.   | Region entry, depth/mix inputs.                                  | Game-path listening clip and status.           |
| Chase          | Audible arrangement contrast; separate from warning effects. | Actual ordinary pursuit, including distant pursuit; escape fade. | Live state trace and encounter/escape capture. |
| Lord           | Distinct engaged-lord arrangement.                           | Engaged phases; exclude dormant/return.                          | Live state trace and encounter/escape capture. |
| Effects/voices | Suitable accepted assets or sourced new material.            | Feeding, warning, ability and contact paths.                     | Provenance, mix and lifecycle evidence.        |

## Module contracts and working checkpoints

| Assigned file / author    | Caller and exported API                                                  | Units, axes, anchors and outputs                                                           | Update/resource/disposal contract                                                |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Fill exact path and owner | Include signatures, argument/return shapes and caller example if needed. | Include normalized length, terrain/collider transforms and contact anchors where relevant. | Existing loop inputs, quality inputs, caches versus owned resources and cleanup. |

- **Playable slice:** name the representative finished assets, route, population and actual scene view that establish direction before kit replication; identify what the current AI agent will integrate/check.
- **Expansion batches:** name the next bounded group of files/assets, its evidence, and shared edits reserved for the current AI agent. Record changes to the brief when discoveries alter the plan.
- **Integrated completion:** name the actual scene, ecology/contact, music, lifecycle, bilingual and headed-performance checks. Preserve labels for staged positions, controlled encounters, headless runs and untested physical devices.

## Delegate return / owner receipt

- Base revision and returned file list; interface changes or required owner edits.
- What is finished, what remains, and known defects with exact reproduction positions/events.
- Sources/provenance and comparison assets; no concept render presented as a runtime screenshot.
- Checks actually run, commands, results and evidence paths. Separate visual inspection, listening, gameplay, numerical and performance conclusions.
- Resource costs for one asset and the representative populated view; disposal/re-entry evidence.
- Owner integration results, follow-up corrections, source-matched preview receipt and remaining acceptance limits.

The owner reviews the actual diff and integrated scene. Historical checks, a delegate's self-report, or a polished gallery alone do not establish the new combined candidate's acceptance.
