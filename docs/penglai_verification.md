# Penglai Sanctuary — historical first-pass implementation and review

This record describes an earlier candidate. The current 15 m start, physical Four-Symbol ward, riding-sword anatomy, differentiated guardians and verified preview are documented in [the flight and guardian follow-up](penglai_flight_revision.md). Preserve the results below as historical evidence.

The player rejected this first pass's art. Its functional evidence is preserved, but it is not visual acceptance or the latest preview. Read [the current all-creature and landscape redraw](penglai_redraw.md) for the new implementation and evidence.

## Candidate identity

Uncommitted `feature/penglai`, based on released v0.9.0 / `da0adbe`. The published GitHub Pages edition remains the six-destination v0.9.0. This task has no commit, push or formal release authorization. Raw scripts, reports and native renders live in ignored `.local/penglai_review/`.

## Implemented contract

The seventh destination follows Europa and uses the independent `mythic` registry: eighteen ordinary kinds instantiate 418 animals after the shared density policy, plus five persistent guardians. No terrestrial/alien ecology or human fleet is imported. Existing protagonists keep shared growth, costs, abilities and meal settlement. Only the regional `aether` surface permits continuous flight; the other six retain their existing water/ice/river/storm behavior.

Terrain rendering, legal habitat samples, ground walking, player collision and roof proxies consume the same height source. Rounded mountain shoulders, irregular crags, lotus beds, peach groves, pine/bamboo, pavilions, a Dragon Gate and a detailed double-roofed monastery establish the regional silhouette. Roofs have shaped solid proxies instead of a single entire-building exclusion sphere. Construction yields through the existing loading transaction, owns its resources and disposes partial preparation on failure. Detail kits are cached and spatially instanced; animation uses the existing render loop. Near horizontal world limits, the shared boundary effect now extends through the fantasy air volume without changing movement bounds.

Ground residents start on real land, use planar home ranges and remain independent of old fixed-altitude bands. They warn before a bounded leap and retain solid-world navigation. Four Symbols patrol locally; real 25 m eligibility, flank contact, separate-hit cooldown and three-hit settlement apply. All four defeat records are required to remove the Sword Sage's ward. The sage then fires three separated, terrain-blocked sword projectiles. All five local defeats complete the expedition without an additional 30 m requirement. Returning home/restarting resets the ward and all five guardians; ordinary prey still replenish in assigned habitats.

Guide and selection share regional registration. Both languages include the Mythic Life category, anatomy/adaptation notes, air/water character explanations, guardian lock state and ending. In air the HUD uses altitude; radar distinguishes ascent/descent and points to eligible remaining guardians. The original pentatonic score separates quiet plucked/breath-like exploration, immediate faster pursuit and guardian accents. It reuses the existing bounded Web Audio graph and pause lifecycle.

## Evidence and corrections

Focused tests validate all ordinary initial/replacement habitat samples against real terrain and solids, finite collider rotations, food/threat coverage at seven body sizes, partial-build cleanup, whole-body sky ceiling, solid roof contact, warned ground motion, actual eligibility/lock/three-hit objectives, independent finite model animation and bilingual catalog/radar fields. Ground-motion regression specifically checks that a nearby solid query cannot lift an animal into an obsolete altitude band.

The native runtime script checks all seven actual regional inventories, all four protagonists crossing water/air, normal feeding/respawn, Squid/Mechanical air casts, the locked sage, fifteen real separated mesh flank contacts through the complete ending, reset, and the actual English Guide. Positions, lengths, durability and recovery windows are controlled fixtures; contacts and settlement run through the real game loop, not direct defeat writes.

The separate offensive-AI script stages legal encounters: dormant patrol, ordinary ground warning/leap, sage windup/projectile creation/actual damage and guardian music, and positive-altitude companion feeding. Only this isolated offensive-sage fixture pre-sets four guardian defeats; it is not the ending evidence. Multiview renders cover every one of the 23 regional kinds through the actual shared factory, plus whole animation-cycle bounds. Native populated views cover nursery, gate, peaks and monastery.

Review found and corrected a non-quaternion decorative collider, a sage start too close to the upper roof, a native contact fixture aimed beside the narrow upright robe, ground animals lifted by old altitude bounds, overly squared monastery shoulders and conspicuous mist/ward meshes. Final review also caught a missing mythic exclusion in the default encounter constructor: the initial Hawaii menu could randomly select a Penglai guardian even though later regional resets were correct. The constructor now uses the same Earth-only eligibility, a deliberately reversed initial draw regression covers it, and every native regional inventory asserts its enabled lord kinds against the actual regional roster. Historical failed logs remain raw comparison evidence; current checks use the corrected sources.

## Audio, cost and delivery

Native 18-second offline renders with 125 ms updates distinguish calm, pursuit and guardian graphs; finite output and peak/voice measurements do not establish subjective musical quality. The real sage encounter independently confirms the guardian bus and projectile attack.

Desktop cost samples use headed Chrome, 1440×900, DPR 1, High, staged 25 m player, 150 frames per populated view, and serial browser runs. Three complete cycles through seven destinations compare warm resource plateaus. Pause checks frozen active-round time and no repeated world drawing. Raw draw/triangle/resource measurements must be reported alongside display-capped FPS; they are not a physical-phone thermal test.

Final build, bilingual narrow/desktop compiled flows, exact artifact/source hashes, denied private-path probes and same-address refresh are recorded in the ignored candidate delivery manifest. The candidate uses the existing restricted preview only; no release metadata, remote branches or shared Skills are published here.

Natural full-expedition pacing, physical-device heat/touch behavior and speaker/headphone listening remain player-review limits. Controlled whole-flow tests do not substitute for those observations.

## Final verification checkpoint — October 3, 2026

| Check                     | Result and evidence                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests                | 800 passed, zero failures; includes nine Penglai contract tests and the initial Earth-lord isolation regression.                                                                                           |
| Shared browser regression | 29 passed; existing contact combat, keyboard controls, ending and time-limit behavior remain covered.                                                                                                      |
| Native Penglai expedition | All seven real inventories remain isolated; four characters cross water/air and feed; fifteen real separated guardian contacts complete the five-defeat ending and restart restores the ward.              |
| Offensive AI              | Actual dormant patrol, warned ground leap, three-sword attack and real 35-point damage; guardian audio bus activates. Airborne companion feeding and visible airborne Frenzy also pass.                    |
| Creature presentation     | All 23 kinds rendered through the shared factory at four angles/times; finite full-cycle transforms and independent instances. Per-model draw count ranges from 9 to 55.                                   |
| Audio graph               | Three native 18-second renders, updated every 125 ms; calm/pursuit/guardian peaks 0.064/0.178/0.187, maximum concurrent voices 3/8/9, no non-finite samples or clipping.                                   |
| Lifecycle                 | 21 serial regional switches; the second and third warm cycles have identical geometry/texture/scene-child counts for each destination. Pause produces zero repeated world renders and freezes active time. |
| Build                     | Pass; existing large-chunk warning remains. Main JavaScript is approximately 1.81 MB minified / 615 KB gzip. No engine or default frame-rate change.                                                       |

The short desktop sample uses an Apple M2 Pro with 16 GB RAM, macOS 26.6.2, headed Chrome, 1440×900, DPR 1, High, a controlled 25 m player, 150 frames per view and serial browser runs. It is a candidate cost observation, not a before/after optimization claim:

| Populated view   |  FPS | Frame p95 | Render CPU mean | Draw calls | Triangles |
| ---------------- | ---: | --------: | --------------: | ---------: | --------: |
| Lotus nursery    | 60.3 |   18.1 ms |         3.85 ms |      1,040 |   890,896 |
| Monastery        | 60.3 |   17.7 ms |         2.78 ms |        348 |   635,592 |
| High cloud route | 60.3 |   18.0 ms |         2.67 ms |        335 |   642,100 |

The underwater nursery has the highest sampled draw count; display-capped desktop FPS does not establish phone performance or thermal headroom. Warm Penglai resource counts stabilize at 679 geometries, 637 textures and 583 scene children after the other maps and their shared caches have been visited. These counts are not byte-level memory measurements.

Raw evidence is ignored local review material: `all_unit.log`, `shared_browser.log`, `browser_report.json`, `combat_report.json`, `models.json`, `audio_report.json`, `cost_report.json`, native scene screenshots and compiled delivery reports. Subjective music, complete natural progression and real phone operation remain acceptance work for the player.

Final rebuilt delivery passes fourteen native compiled cases on the restricted local host and fourteen more on its public tunnel: all seven destinations in English desktop (1440×900) and Chinese touch viewport (390×667). Each case uses actual selection/loading, starting length, Mechanical Shark cooldown, pause/help/resume and return-home controls. Both versions also inspect all eighteen ordinary and five guardian Guide entries for language consistency and verify aerial HUD switching. Four player entries remain available; mobile Slow swim remains reachable. Page/console error lists are empty.

All eight served artifacts match the final build byte for byte on both hosts; 242 runtime source fingerprints match the candidate worktree. Private Git/local/source paths return 404, and the production build exposes no development controller. A temporary nonsensitive asset is written twice and read through the same local/public URL after each update; all four reads match and the marker is removed. The ignored delivery manifest identifies this uncommitted candidate, the owned preview processes and rollback build separately from the unchanged published v0.9.0. It must not inherit the older Amazon candidate's assets or claim a Penglai release commit.
