# Desktop camera and Hawaii seabed review

Status: owner-reviewed source in the `feature/global-ocean-polish` candidate, based on v0.7.1 / `21cf9a4`. The user subsequently authorized a local commit of the reviewed preview. This visual refinement preserves the previously reviewed Gran Maja, combat, ecology and survival changes. Fresh pre-commit verification passed 629 unit tests; no push or formal Pages release is requested.

## Implemented behavior

- In both regions, the desktop follow-camera offset is multiplied by **0.9** before rotation. The existing primary-coarse-pointer condition preserves the touch rig at **1.0**. The juvenile scaling, look target, FOV, damping, terrain clearance and obstacle shortening remain intact. This follows the existing touch-control detection, not a new operating-system test.
- Hawaii's terrain uses matte stone detail: mineral grain, strata, pits and derivative normal relief. No displacement or terrain-height change is involved. The old broad ground emission is removed; actual volcano/lava geometry and the two existing environmental lights remain. The deep hemisphere fill stays at the preceding candidate's 0.87.
- The 240 luminous mushroom-shaped decorations are removed. Their **1,440 seeded random draws** are still advanced during construction so subsequent ruins, vents, particles and solid obstacles keep their exact previous layout.
- Rooted, feather-shaped sea pens and low matte basalt/nodule rubble replace those decorations. Only small polyps emit weak light. Persistent light and simplified colony scale are explicitly game adaptations; minerals do not glow. See [art/source notes](hawaii_seabed_art.md) for biological references and the scoped factory contract.
- Final integrated scenery has **18 colonies / 54 sea pens / 144 rubble pieces / 23,652 triangles**. Two private geometries and two materials share 25 globally allocated instance batches; at most 16 nearby batches are enabled before frustum culling. There are no new textures, point lights, colliders, RAF loops or timers. Shared shader time supplies root-fixed sway, with no per-instance matrix updates or per-frame sorting-object allocation.

The owner supplies landmark and existing-solid clearing envelopes after the extra and beach factories have built their colliders. Each instance samples its actual terrain support. Private scenery is detached and disposed before the parent ocean traverses remaining instances, preventing double disposal. Atlantis does not instantiate Hawaii scenery.

## Focused verification

Ignored evidence belongs to `.local/hawaii_seabed_review/`. The before-edit baseline is a frozen source snapshot of the immediately preceding Gran Maja candidate, rather than published v0.7.1. Reproducible scripts, source manifests and raw initial failures remain there.

- **19 focused unit checks passed**, covering scenery determinism, support on steep slopes, clearings, geometry/batch budgets, finite/outward mineral geometry, nonemissive minerals, unchanged static instance matrices, idempotent disposal, volcanic light reuse, deep-hunter rules and the frozen Gran Maja contact oracle.
- Independent before/after construction compares all **646 colliders and the complete obstacle list exactly equal**. A separate read-only review confirms the six historical random draws per removed decoration, shader-callback chaining/cache keys, conservative clearings, region isolation and private ownership.
- **24 actual native camera samples / 12 matched comparisons** cover Orca and Giant Squid at 3, 16 and 30 m in 1440×900 and coarse-pointer 390×667 contexts. Actual menus, K slow swimming, pause and home are exercised. Both real source rig functions, evaluated at identical states, give exactly 0.9 on desktop and 1.0 on touch; all sampled desktop trailing distances are shorter. FOV remains 60 in these slow-swim samples and pause freezes the camera.
- The initial moving-camera harness incorrectly treated timed samples as identical damping states. Frame-rate-dependent lag changes the measured moving offset, so it is not the rig's static distance. Raw failures are retained. Touch offsets varied by up to 0.43 m across timed samples while the exact source rig, target and FOV are unchanged. No game code was altered to satisfy the harness.
- **Eight complete native Hawaii/Atlantis cycles** cover both viewport types. All 25 private instance buffers, two geometries and two materials dispose exactly once on each retired Hawaii factory, with the old root detached/cleared. Atlantis has no Hawaii scenery; every rebuilt Hawaii retains 18 colonies and 646 colliders. Global cached model/texture upload totals continued to warm during these samples, so they are not presented as a stable whole-engine memory ceiling. The initial overly strict global-count assertion and raw report are retained separately; private-resource disposal is directly observed.
- **32 running adult passage checks** cover both characters at 16 and 30 m across four deep colony locations in both viewports, using native slow-swim input and normal follow cameras. Initial positions, lengths and temporary immunity are staged. All pass without blocked/stuck contacts, invalid camera coordinates or batch-cap violations. Native pause/home and restored language controls also pass.
- The art review includes eight regular-ocean close/normal views and five sway frames. These are paused inspection cameras under actual game lighting/fog, with HUD/avatar hidden, separately labeled from native follow screenshots. Terrain support is sampled at the camera's own coordinates so rising slopes do not bury the inspection camera. Matched final before/after views use the same coordinates and normal lighting.

## Serial performance comparison

Sixteen **browser-exclusive headed Chrome** samples on this Mac's Apple M2 Pro use actual populated Hawaii, native quality/start controls and the normal follow camera. Each sample warms for two seconds and records 240 frames. Developer length/position/immunity staging is disclosed. The 390 px context emulates coarse touch input; it is not a physical phone.

| View / quality       | Before FPS / p95 | Candidate FPS / p95 |
| -------------------- | ---------------- | ------------------- |
| Desktop nursery/high | 59.95 / 21.3 ms  | 59.96 / 19.9 ms     |
| Desktop seabed/high  | 60.10 / 19.0 ms  | 60.11 / 19.0 ms     |
| Desktop nursery/low  | 59.97 / 18.7 ms  | 60.08 / 18.9 ms     |
| Desktop seabed/low   | 60.15 / 19.2 ms  | 59.55 / 18.9 ms     |
| 390 nursery/high     | 60.10 / 19.1 ms  | 60.08 / 19.3 ms     |
| 390 seabed/high      | 59.82 / 19.0 ms  | 60.05 / 18.8 ms     |
| 390 nursery/low      | 60.07 / 19.0 ms  | 60.06 / 19.3 ms     |
| 390 seabed/low       | 60.13 / 18.7 ms  | 60.08 / 18.6 ms     |

No sustained candidate regression or browser errors appeared in this controlled sample. Total draw counts can differ because the camera and live population visibility differ; the module's 16-enabled-batch cap is not a claim that total frame draw calls increase by exactly 16. Physical devices, natural full rounds and the user's external network are not verified by these measurements.

## Synchronization and delivery

This adds environmental scenery, not a selectable or edible fish. No species-card, feeding rule, localized control label or bilingual gameplay value changes are necessary. README, the active handoff and the preceding cross-region record now distinguish the final matte floor from its superseded ground-glow pass. Existing English/Chinese menus and Ocean Guide remain supported.

Full project formatting and the production build passed. All eight HTML/JS/CSS/audio artifacts match both the local served root and the public snapshot, with a removed round-trip marker and five rejected private paths. The source manifest changes only `src/main.js`, `src/ocean.js` and the new `src/hawaii_seabed_life.js` from the immediately preceding public candidate. The build retains the existing 500 KB chunk-size warning (approximately 1.313 MB JS / 422 KB gzip). **Four fresh native public-production scenarios passed**, with 16 screenshots and zero page/console errors. They cover both languages, maps, characters and viewport types, Guide descriptions/search, start/skill/pause/home, gameplay language locks, restored home controls, no layout overflow and no production developer API. The initial urllib SSL EOF and browser timeout are retained. This Mac's configured local system proxy reproduced an SSL timeout while direct curl returned the matching page and JS; fresh inspection Chrome uses `--no-proxy-server` for this process only and retains TLS verification. No OS proxy settings or tunnel were changed. Exact temporary URL, hashes, PID identities and public receipts stay in ignored local records. The existing restricted public snapshot remains available for user review; both private baseline/development services have been stopped by verified PID, argv, working directory and listening port. The reviewed candidate is included in the requested local commit; no push or release is authorized.
