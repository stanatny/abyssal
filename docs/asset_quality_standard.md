# Quality Standard for New Assets, Audio, and Effects

**Status: in effect. Date: 2026-09-28.** The user requires future fish species and other additions to meet the quality of this refinement pass immediately, avoiding rough releases followed by wholesale redraws. This standard covers playable characters, shoals, hunters, Ancient Giants, Abyss Lords, people, ships, terrain, rewards, abilities, and their associated UI displays, animation, audio, and effects.

The minimum reference is the comparable polished asset in released **v0.6.10 / `5a3248e`**. Compare a new shoal with polished shoals and a new lord with polished lords; a distant small fish need not have a lord's polygon count. Later accepted improvements in the same category become the new reference. The baseline remains stylized real-time 3D, not a photogrammetric reconstruction, and does not imply acceptance on real low-end phones or of every subjective listening quality.

Content below this bar must not be merged or released as a finished new category. Exploratory models, temporary sounds, and rough effects may be used in explicitly labeled development prototypes, but must not enter the regular character selection, Ocean Guide, spawn pool, or public game by default. Deadlines, species count, and procedural convenience are not reasons to lower quality. Exceptions require the user's explicit agreement and a recorded scope. Do not add approval gates for routine production; create, verify, and revise within the authorized request.

Reuse accepted model parts, sounds, and effects when they suit the new element. Delivering a coherent whole means verifying the final integration, not producing new audio and effects for every fish species. After reuse, check that the actual events, positions, timing, and performance remain appropriate.

## Establish the reference and the facts to portray

At the start, record the element, its comparable baseline, the player's usual viewing distances and angles, and the motion and events to portray. Use references that explain shape, posture, or sound origin; resemblance alone does not establish species identity.

- Real animals need traceable support for head and tail anatomy, mouths, fins or limbs, arms and tentacles, proportions, swimming direction, and habitat. For uncertainties affecting the portrayal, prioritize museums, research institutions, or original observations. Distinguish species: observations of common squid are not automatically findings about giant squid.
- Distinguish a possible movement, a common movement, and the game's chosen default pose. Evidence of capability does not establish frequency. Label default direction, size, or speed chosen for controls as a gameplay adaptation.
- Record reconstruction uncertainty for extinct animals. Identify fantasy lords as original creations or inspired designs. Exaggeration is allowed, but structure, motion logic, and recognizable identity must remain coherent.
- For external images, models, textures, audio, or generated material, record the source, creator, usage rights, and processing. Concept art is not a screenshot of a running model; Foley is not an authentic underwater recording.

## Models, materials, and animation

| Area                      | Requirements for finished content                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Silhouette and structure  | A continuous body with variation in volume; jaws, eyes, gill covers, fins, limbs, armor plates, or arms must follow its anatomy. Each species needs its own proportions and silhouette at actual viewing distances, not just a recolor of the same rough shape.                       |
| Surface and materials     | Species-appropriate dorsal and ventral colors, boundaries, and necessary surface detail. Avoid uniformly colored plastic surfaces, floating decorations, or strong lighting that hides structural flaws. Detail must first serve silhouette and readability, not polygon count alone. |
| Mesh integrity            | Inspect side, front, back, and important extreme poses. Remove visible self-intersections, degenerate triangles, clipping, cracks, and detached seams. Field-guide close-ups and the ocean must share assets; a polished display stand alone is insufficient.                         |
| Propulsion and turning    | Match animal or mechanical structure: orcas move their tails vertically, swimmers push water backward to move forward, and squid fin waves differ from mantle-driven jets. Inspect actual vertices and complete cycles, not just bone rotations or one frame.                         |
| State transitions         | Relevant states such as cruising, sprinting, turning, attacking or feeding, and leaving the water need distinct poses with smooth transitions. Drive them from actual speed and state, not merely button presses. Pause freezes them; restart restores them.                          |
| Environments and vehicles | Give hulls, decks, portholes, railings, and propulsion structures depth and layering. Reefs, coral, seabeds, and water surfaces must not look like scattered basic shapes. Boundaries and landmarks must remain recognizable in real fog, lighting, and player viewing distances.     |

Keep the existing model interface, unit-length convention, resource caching, and independent instance animation. Confirm model-local axes, actual travel direction, and anatomical head direction separately. For example, the current squid travels mantle-first, while its arms and mouth are on local `+Z`; do not assume the mouth is always at the leading end.

Check feeding, collision, and appearance together. Capture regions must follow the visible model transform, swallowing must end at the actual mouth anchor, and animation must not silently move the gameplay root. Ordinary capture tolerance, the mouth convergence point, enemy damage ranges, and lord flank attacks are distinct rules; do not enlarge them all because a model changed. For high-speed contact, also check movement between frames, escaping targets, and terrain occlusion. Visible hulls, reefs, and other solids must not noticeably diverge from their blocking boundaries.

### Attachment and redraw checks

A complete roster redraw must account for every ordinary kind and lord. Use species-specific silhouette and proportion references first: an elongated snake cannot be repaired by adding ornaments to a short thick body, and a lord needs coherent anatomy and threatening head/mouth detail rather than a scaled small creature. Label intentional fantasy exaggerations. Inspect each model from several directions in the actual Guide, then representative repeated populations and encounters under normal world lighting.

Fit attachments to the same body profile and deformation used by the torso. Dorsal/anal fin bases and tail fins must follow the actual skeleton; independent decorative motion can detach them during a bend. Limbs need continuous muscle/palm/webbing connections, and mouth interiors must remain visibly inside the opened jaw. Confirm the conventions of shared helpers so paired eyes or other parts are not duplicated. Inspect full cycles and extremes with changing deep vertex/transform state, rather than only a moving root or bone-count assertion.

Keep structural correction separate from surface polish: embedded eyes, smooth joint transitions, species markings, roughness and armor relief must survive ordinary camera scale without excessive emission or distracting floating detail. Preserve biological/game lengths and collision/feeding contracts during appearance-only work. Shared static caches may reduce waste; they must not couple instance poses or permit one disposal to invalidate another creature.

## Audio production and listening quality

Voices must sound like real performances. Simple oscillators, formants, or a heavily pitch-shifted copy of one recording are not acceptable finished male and female screams. The current reference uses separately licensed human performances at their original pitch, routed by the actual person's identity. For different character voices, select suitable performances first, then apply scene processing.

Underwater feeding sounds need a short intake, contact, and ending. The current fish sound uses three water-Foley variants without consecutive repeats. Do not restore abrupt fixed-pitch bubbles or rely only on volume to convey force. Synthesis is suitable for music, science-fiction abilities, or flowing water, but actual listening must determine suitability; procedural generation is not proof of quality.

Production and integration must meet these requirements:

- Record the source page, creator, selected license, original and finished filenames, trimming/filtering/mixing/format parameters, and final hash. Preserve a reproducible entry point when processing scripts exist. Bundle release assets locally rather than depending on a source site's temporary playback at runtime. The project ledger is [audio_sources.md](audio_sources.md).
- Preserve an audible onset and sensible fades. Avoid clicks, harsh high frequencies, excessive tails, and mechanical repetition during continuous feeding. Pitch, rate, variants, and rate limits must suit the character and event; do not indiscriminately generalize existing parameters.
- Listen to single events, repeated feeding, shallow and deep environments, and mixing with music. Verify output through the actual game audio graph; source-file playback or a static waveform does not represent the in-game result.
- Check first interaction, prefetch, decoded caches, failure fallback, concurrency limits, mute, pause, resume, and restart. Old events that were not ready must not play in a burst after loading. Pause and restart must not leave tails or duplicate audio graphs.
- Browser offline rendering checks non-silence, clipping, non-finite samples, envelopes, and overlapping peaks. These metrics do not establish realism, gender recognition, or subjective quality. If audio-listening capability is available, use it. Otherwise, deliver clips from the game audio path and explicitly mark them as awaiting listening review; do not mark new sounds as accepted before receiving listening feedback.

## Effects and UI readability

A complete effect needs a cause and progression: onset or contact, peak, expansion or trail, fading, and cleanup. Feeding must first draw prey toward the mouth, followed by blood mist; instantly removing the target and spawning particles is insufficient. Breaching needs a water curtain, droplets, and landing ripples; ink needs diffusion and recovery after leaving the cloud; abilities need recognizable casting, range, and ending.

Presentation must follow real state, source position, and direction. Do not enlarge damage ranges, disable enemy behavior, or add special screenshot lighting and then claim combat presentation passed. Lord abilities need distinct visual identities. Reward purpose must be recognizable through silhouettes or patterns, not color alone.

Inspect effects on small phones and in deep-sea fog. Key creature silhouettes, warnings, cooldowns, and control areas must remain legible; bloom, ink, labels, or blood mist must not fill the central view. When replacing models, abilities, or rewards, also check affected descriptions and displays in the Ocean Guide, home screen, and HUD. Do not attach unrelated UI redesigns to every asset task.

## Performance and lifecycle

Share geometry, textures, materials, and decoded resources while keeping skeletons and motion state independent per instance. Do not create geometry every frame or start extra animation loops. Resource use must stabilize after repeated Ocean Guide opening and closing, spawning of the same type, restarts, and disposal. Disposing shared resources must not break active instances.

Measure triangles, meshes/draw calls, textures, resource growth, and necessary CPU/GPU frame time according to the change. State the device, browser, resolution, quality setting, scene, warm-up, and sampling conditions. For many fish instances on phones, prioritize eliminating wasted draws, transparent overdraw, and update cost. The smooth preset may reduce shadows, post-processing, and particles, but must preserve species silhouettes and ability readability. Stable resource counts, fewer draw calls, or one headless-browser frame-rate measurement do not prove real-device performance.

Measure populated views as well as a single asset: dense nurseries may dominate cost even when a detailed lord is inexpensive. Compare matched before/candidate/repeated-before scenes when possible. A display-capped 60 FPS result can conceal materially increased geometry, draws or GPU load; report that cost honestly and leave physical-device heat unverified until measured. Do not silently reduce accepted food stock, collisions or near-view quality to conceal an art-cost increase. The [Amazon refinement](amazon_refinement.md) records this distinction and the attachment fixes above.

## Verification by impact and delivery evidence

Choose checks by task impact. Routine small fixes do not require rerunning every historical script; new categories or complete redraws require the full presentation chain. Expand verification for new failures, unresolved issues, or new risks caused by a change, rather than repeatedly running unrelated tests in place of visual judgment.

| Change                                  | Required evidence                                                                                                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New model or material                   | Comparable reference; actual Ocean Guide or scene screenshots from multiple angles; close and usual viewing distances in real ocean lighting and fog; relevant geometry, interface, and resource checks. |
| Animation, posture, or feeding position | A full-cycle and transition clip or keyframes; actual contact path and mouth/boundary checks; affected high-speed, turning, or occlusion cases.                                                          |
| Audio                                   | Source and production records; game-path listening clips and listening-review status; actual event routing, overlapping playback, and lifecycle results.                                                 |
| Effects, abilities, or rewards          | Real-state presentation from onset to disappearance; position/range consistent with gameplay; desktop and small-screen readability; cleanup and necessary performance checks.                            |
| Release artifact                        | Relevant formatting, test, and build results; checks of affected functionality on the actual production page; resources matching this build and no exposed development interfaces.                       |

The current desktop and phone layout reference sizes are 1440×900, 390×667, and 320×568. Add 844×390 when landscape is affected, and other sizes for other affected layouts. Render every new element on at least desktop and a small screen. Browser touch emulation proves behavior only in that browser and viewport. Explicitly record untested real-device multitouch feel, performance, or speaker sound; do not present emulation as real-device acceptance.

Record delivery in [verification.md](verification.md) or the current feedback report: the change and comparable baseline, sources and adaptation choices, checks actually run, screenshots/clips/listening evidence, issues found and fixed, and remaining uncertainties. Label controlled scenes, fixed prey, and development-interface positioning. These isolate problems but do not prove natural encounter rates, feeding difficulty, or whole-session pacing. Do not count a previous round's results as checks newly run this round.

Mark a candidate as a deliverable finished category only after the relevant quality and functionality checks pass. Missing key visual or listening evidence means pending acceptance; keep it in development preview. Disclosing existing device limits is not grounds to claim comprehensive acceptance. Then follow the user's current commit/release authorization; passing this standard does not authorize a push on its own.

## References from this refinement pass

- [Overall visual upgrade](visual_upgrade_v0_6.md): models, environments, ships, effects, and quality costs.
- [Giant-creature redraw](feedback_v0_6_5.md) and [shallow-water and human refinement](feedback_v0_6_6.md): comparable silhouettes, detail, and shared assets. Their old synthetic voices were subsequently replaced.
- [Human voices and swimming correction](feedback_v0_6_7.md) and [underwater feeding Foley](feedback_v0_6_8.md): real performances, complete motion cycles, audio production, and listening limitations.
- [Character animation and continuous feeding](feedback_v0_6_9.md) and [giant-squid direction review](feedback_v0_6_10.md): alignment with visible models, inter-frame contact, and the distinction between evidence and default game direction. The arms-first decision in v0.6.9 was superseded by v0.6.10.

Historical statements that changes were uncommitted or unpushed retain their original meaning. The released version named here defines the current baseline; this standard does not reinstate superseded historical approaches.
