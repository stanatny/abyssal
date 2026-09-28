# v0.6 Ocean Visual Upgrade

## Request and scope

On 2026-09-27, the user confirmed completion of the early test version and requested a substantial visual upgrade to the UI, creature models, effects, seabed, and ships. The baseline was public `f20d6a5` / v0.5.1. This round first delivers a playable, comparable visual upgrade, with commits following review under the existing workflow. Previous release authorization does not authorize automatic publication of a new version.

The work used the local `ui-visual-polish` workflow, including visual review and model-assisted 3D work. [OpenAI three-webgl-game](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/three-webgl-game/SKILL.md) and [web-3d-asset-pipeline](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/web-3d-asset-pipeline/SKILL.md) were located and read for their guidance on separating presentation from simulation, lightweight HUDs, material reuse, measurable post-processing, and verification in the running game. No external repository scripts were installed or executed, and the existing physics system was not replaced for the art upgrade. The project already had editable procedural models, so real-time geometry and materials continued to be built in Three.js.

## Inspectable visual targets

- Creatures: continuous bodies, species-appropriate heads and fins, curved fins with thin edges, gill/mouth/eye detail, natural colors, and surface microdetail, reducing the appearance of assembled spheres and cones. Inspect orca, squid, great white shark, sperm whale, turtle, and others in both Ocean Guide close-ups and chase-camera views; retain distinct silhouettes for ancient creatures and lords.
- Environment: warm sandy shallows, bundles of ribbon-like seaweed, layered coral reefs, porous sea fans, and stratified rocks. Use local lighting and silhouettes to keep deep-sea terrain readable. Give ships plausible hulls, decks, portholes, railings, sails, and rigging.
- Lighting: warm shallow-water sunlight, blue-cyan water, cool deep water, and bioluminescence. Correct the plastic appearance caused by excessive brightness and cyan across the scene; add restrained environmental reflections and scalable post-processing.
- Effects: feeding and ink clouds diffuse underwater with swirling texture; sonar waves, breaches, and lord abilities have clear onsets, peaks, and fades. Effects must not alter damage ranges or obscure warnings.
- UI: use an ocean-expedition archive direction. Emphasize live creatures on the home screen and in the Ocean Guide, move the HUD toward the edges, and preserve the central gameplay view. Keep controls and survival bars usable on desktop, small and large phones, and landscape screens.

## Preserved rules and acceptance approach

Preserve active/passive character abilities, the 30-minute limit, automatic contact attacks, repeated lord flank attacks, collision, and all ecology configuration. Keep asset `kind` identifiers, -Z forward, unit length, animation, and resource-cache contracts. Environment geometry must not visibly diverge from solid boundaries. Baseline screenshots and builds are in `.local/v5_1_*`; new evidence goes in `.local/v6_*`.

Acceptance includes actual model/seabed/surface/ability screenshots, key browser flows and layouts, rule regression, geometry/resource/draw statistics, and production preview. State host and browser conditions for performance measurements; simulated phone dimensions are not real-device testing. This file initially recorded targets; completion and unmet items were to be added from evidence after integration.

## Completed work

- The home screen now uses an ocean-expedition theme: large live characters, destination/character selection, and expandable abilities and expedition settings. The Ocean Guide has a light specimen stand, rotatable models, and a separate information column. The HUD preserves the central view, three aligned survival bars, and the layout contract for up to two abilities.
- Creatures use continuous cross-section bodies, thin curved fins, skin microdetail, and environmental reflections. Close-up refinement covers the orca's black/white boundaries; great white mouth and gills; squid eyes, arm webbing, and suckers; sperm whale forehead, lower jaw, and back ridge; and the turtle's continuous shell. Orcas, sharks, tuna, ordinary fish, and sperm whales drive their tail peduncles through independent skeletons while sharing geometry and materials.
- The seabed now has warm fine sand, smooth layered rocks, rounded branching coral, sea fans with actual holes, and curved ribbon-like seaweed. Vegetation instances are culled in spatial groups. Ships gained decks, portholes, railings, rigging, and layered hulls; submarines gained hull sections, portholes, and propulsion structures.
- The surface uses layered fine-wave normals and distant pixel filtering; foam uses irregular patches. Lava has a cooled rock crust and glowing fissures. Lighting combines warm shallow sunlight, cool deep water, shared environmental reflections, suspended particles, and high-quality shallow-water shadows with restrained bloom. The smooth preset disables post-processing/shadows and reduces particles while retaining refined models.
- Blood mist, ink, bubbles, and splashes use deterministic fluid textures. Sonar has softer wavefronts; breaches add crown-shaped water curtains, scattered drops, and irregular foam. Kraken vortices use thin swirling layers, ruin pulses gain ripple trails, and Leviathan charges use tapered streamlines, preserving actual warnings and damage radii.

## Verification results

- `npm test` **128/128**, `npm run check`, and `npm run build` passed. Four tests were added for creature geometry, shared resources/independent skeletons, actual raycasts, and animation numeric bounds.
- Real Chrome regression passed **28** main-flow, **13** existing-feedback, **6** control, **8** character/ecology, and **11** sonar checks with no browser runtime errors. Coverage includes five lord flank hits, charging and breaching through actual key input, leaving ink and recovering, both character abilities, touch, pause, and restart.
- An old sonar fixture placed a shallow-water fish at 128m of game depth. Actual habitat constraints made it rise and lose occlusion. Only the test was corrected to a valid shallow-reef scene, waiting for real updates before activation and asserting solid occlusion on both desktop and phone layouts. Detection was not weakened and sonar rules were not changed.
- Home screen and Ocean Guide were checked at 1440×900, 390×667, 320×568, and 844×390. Existing 20-state survival-bar and 26-state HUD layout checks passed. The start button is fully visible at 320px. Final production preview covered character switching, Ocean Guide categories, abilities, cooldowns, survival bars, and pause at 1440/390/320px. Public JS/CSS SHA-256 hashes matched local `dist`, and production exposed no development interfaces.
- Seabed colliders and ship trajectories at three sets of timestamps matched the baseline exactly. Main-renderer and actual WebGL resource counts remained stable after 7 restart/Ocean Guide open-close cycles. Lord effects showed no object growth across 15 restarts, and each disposed resource was released once.
- Final screenshots are in `.local/v6_final_*` and `.local/v6_public_*`; model close-ups are in `.local/v6_creature_*`. Actual ocean-gameplay screenshots use valid player positions without clipping. Ship/submarine close-ups use separate framing scenes with the same source assets and lighting. See [verification](verification.md) for evidence provenance and raw reports.

## Performance and limitations

On Apple M2 Pro / Chrome / ANGLE Metal, at 1280×720 and DPR1 in a fixed shallow-reef scene, median GPU timer measurements were about 1.9–2.3ms for old high quality, 7.4–9.1ms for new high quality, and 2.9ms for the new smooth preset. Bloom added about 3.5–5.1ms of GPU cost. These measurements preceded the final surface/lava shading pass and were used to locate cost, not promise final frame rates. Normal main-loop CPU time was about 38–39ms in both versions, mainly from the existing full-table collision scan. Variable headless-browser RAF measurements cannot establish improved smoothness. Prioritize collision candidate queries next instead of indiscriminately reducing creature detail.

This delivery is more detailed procedural real-time 3D, still stylized, without scan-quality photographic assets. Real low-end phones, natural 30-minute sessions, and player judgments of overall aesthetics still need playtesting. The build still warns about a single bundle exceeding 500KB. At this historical point, v0.6 was an uncommitted preview and official GitHub Pages remained v0.5.1.
