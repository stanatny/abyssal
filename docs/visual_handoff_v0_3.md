# v0.3 Visual Redesign Handoff to Kimi

## Goal and authorization

On 2026-09-27, the user explicitly requested that Codex finish the functional iteration, then hand the project to Kimi to redesign all UI elements, fish and giant-creature models, and effects. The result must be a playable visual upgrade, not just a plan or concept art. **This round had no new commit authorization: do not commit, push, or change GitHub Pages; first provide an uncommitted playable preview.**

Workspace: the root of the public `stanatny/abyssal` repository. The released baseline, `96d57ff`, is v0.2. The v0.3 functional code is already in the same workspace; do not reset it, overwrite it, or replace it with an older remote version. Read `HANDOFF.md`, `docs/feedback_v0_3.md`, and `docs/verification.md` before inspecting the running scenes.

## Existing functionality

- Orca sprint at 32 meters/second with about 7 seconds of stamina; infrequent telegraphed abilities for mid-tier hunters; distinct lord abilities, territories, 3-second vulnerability, and repeated bites.
- Real continuous underwater charge-up, takeoff across the waterline, airborne inertia, and water-entry transitions; no takeoff from idle at the surface or second jump in the air.
- One cruise ship, two sailboats, seagulls, wakes, and splashes. Ships are environmental and do not deal damage or serve as prey.
- Blood mist, water bite arcs, hit feedback, spatial ink-cloud occlusion, and lure light, including pause/restart handling.
- Reworked original synthesized music and effects, with dedicated audio checks passed. Preserve the audio interfaces as a priority; this part does not need another overhaul.
- Home-screen Ocean Guide: 13 creatures, categories and search, draggable 3D displays, and size/depth/ability/evasion information. Models reuse game assets.

## Required visual work

1. **Home screen and HUD:** unify visual language, type hierarchy, and information density. Organize survival bars, objectives, depth, speed, rewards, ability warnings, lord panels, pause/death/victory screens, and touch controls. Preserve clear gameplay hints and accessible keyboard focus.
2. **Creature models:** orca; small fish, tuna, and manta ray; great white shark, anglerfish, giant squid, and Dunkleosteus; seagull. Improve natural poses and silhouettes, avoiding the appearance of assembled spheres and triangular sheets.
3. **Four lords:** Kraken, an original Maya-inspired creature, three-headed Hydra, and Leviathan must have distinct silhouettes, body shapes, and motion. Keep giant squid clearly distinct from Kraken. The Maya-inspired creature is fantasy, not a claim to reconstruct historical mythology.
4. **Environment and effects:** improve water, seabed landmarks, and ship materials and structure. Strengthen bites, blood mist, ink, breaches, and lord abilities without hiding enemy warnings or routes.
5. **Ocean Guide:** refine the functionally complete guide into a presentation for appreciating creatures. Redrawn game assets must appear there as well.

## Files and interface contracts

- Appearance: `src/style.css`, `src/ocean_guide.css`, `index.html`.
- Models: `src/creatures.js`, `src/creature_extra.js`. `createCreature(kind,length,seed)` returns a Group, with **-Z forward, Y up, and root scale set from length**. Preserve `root.userData.animate(time,speed)` and every `kind` identifier.
- World: `src/ocean.js`, `src/ocean_extra.js`, `src/ships.js`, `src/surface.js`.
- Effects: `src/combat_effects.js`, `src/encounters.js`, `src/rewards.js`.
- Gameplay data: `simulation.js`, `boss_rules.js`, `hunter_rules.js`, `surface_rules.js`. Do not arbitrarily change values or state machines. Explain genuinely necessary visual-integration changes and run their relevant regressions.
- `main.js` binds interactions through fixed DOM IDs. Preserve the IDs when restructuring pages, or update all wiring consistently.
- Preserve particle pools, ink-cloud limits and cleanup, shared geometry caching, and the Ocean Guide rendering lifecycle. Do not improve effects by accumulating unlimited particles.
- Preserve `OceanAudio` interfaces including `start`, `update`, `setPaused`, `toggle`, `reset`, `eat`, `hit`, `breach`, `splash`, and `hunter`.

## Running and acceptance

Development: `npm run dev` (usually port 5178; reuse an existing working service first). Rules: `npm test`; formatting: `npm run check`; regression: `npm run test:browser`; v0.3 checks: `node scripts/verify_feedback_v0_3.mjs`; audio: `node scripts/verify_audio.mjs`; build: `npm run build`.

The temporary public preview URL and processes are recorded in ignored `.local/preview_state.json`. It serves `dist`, so rebuild after changes. Official GitHub Pages remains v0.2 at this historical point; do not present that URL as this round's uncommitted preview. Do not stop or recreate an existing tunnel unless inspection confirms it has failed.

Delivery requirements:

- Actual browser screenshots of the home screen, chase-camera HUD, Ocean Guide, four lords, feeding blood mist, ink, breach, and deep-sea landmarks, plus a 390px narrow-screen view.
- Demonstrate at least one complete underwater charge-up → takeoff → landing cycle and one mid-tier hunter warning → ability → recovery cycle. Distinguish natural play from scenes produced through development interfaces.
- Passing formatting, rule checks, browser regression, and production build; no console errors. Do not add inaccessible external assets, and record sources and licenses for new material.
- Deliver an accessible uncommitted preview, explain changes, verification, and remaining limits, and report back by mentioning @Codex in the original thread for final review.
