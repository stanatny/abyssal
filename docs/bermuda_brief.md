# Bermuda Triangle production contract

## Scope and ownership

Build the third playable region `bermuda` from released v0.7.2 / `35960a0` on `feature/bermuda`. The user explicitly requested independent production: Codex owns the environment, models, music, gameplay integration and review. All delegate assignments were canceled; no delegated assets were accepted. The user authorized committing and pushing the reviewed candidate to `origin/feature/bermuda` on October 1. This does not request merging to main or replacing the published game.

Follow AGENTS.md, the asset quality standard, and the repository map-production Skill. Documents are English; player content supports English and Simplified Chinese. Shared growth, hunger, nutrition, rewards, character abilities and lord combat retain their accepted rules.

## Regional identity and coordinates

A dangerous advanced-player ocean with slate storm clouds, rain streaks, lightning, twisting waterspouts, industrial ships, a phantom galleon and an enterable ocean-liner wreck. Readable underwater silhouettes and entrances take priority over making the water uniformly black.

World X is [-300, 300], Z is [-1150, 140], water surface Y is 4. Displayed depth is world depth multiplied by four. Spawn remains [0, -18, 75]. The shared safe nursery is Z >= -120 and world depth <=72. Weather is visible there, but predators, lord territories, ghost attacks and waterspout damage exclude the nursery. No regional hunger surcharge is added.

## Landmarks, terrain and collision

The original four-funnel wreck is inspired by early twentieth-century ocean liners; it is not a historically exact Titanic reconstruction. Keel center is [-65, -486, -650], main hull length 396 m and width 89.1 m. Funnels, stern machinery and broken framing extend its overall bounds. The authoritative terrain flattens a support bed at Y=-486 across X [-130,10], Z [-890,-410], with a 45 m smooth transition. The keel rests on this bed.

The ship has thin sloped hull plates, a starboard breach, an open central atrium, connected upper/lower passages, funnels, portholes, propellers, framing, railing, staircases, cargo and furnished side bays. It uses corresponding thin-wall colliders, never a solid whole-hull proxy. Side bays are smaller than the adult main passages.

`WRECK_ROUTES` in `bermuda_wreck.js`, transformed through the shared `bermuda_sites.js` contract, is the authoritative traversal metadata:

| Route                   | Waypoints                                                             |
| ----------------------- | --------------------------------------------------------------------- |
| Stern to atrium         | [-65,-431.55,-420.65] → [-65,-431.55,-549.35] → [-65,-431.55,-625.25] |
| Starboard breach        | [17.5,-459.6,-567.5] → [-65,-459.6,-567.5] → [-65,-459.6,-625.25]     |
| Atrium descent          | [-65,-393.6,-625.25] → [-65,-429.9,-625.25] → [-65,-459.6,-625.25]    |
| Lower hold and bow exit | [-65,-459.6,-625.25] → [-65,-459.6,-753.95] → [-65,-459.6,-857.9]     |

The offshore rig at [210,4,-450] has seabed-supported legs, a truss deck, derrick, pipes, crane, helipad, access ladder and bounded work lights. A 120 m freighter and 145 m tanker move slowly outside the nursery and retain the shared 18 m / three independent high-speed rams rule.

The original 96 m, three-masted **Flying Dutchman** loops slowly around [-172,4,-265]. A curved planked hull, two cannon decks, three stern galleries, ragged cloth, rigging, marine growth and a tentacle-bearded Davy Jones captain establish its identity. It cannot be sunk or used as food. Within 150 m and above world depth 70, it tracks the player's position during a two-second warning, fixes its aim for the final 0.6 seconds, then fires five non-homing spectral projectiles. A valid impact deals 40 health; volleys begin no more often than every 7.5 seconds. Shared damage immunity prevents all five balls stacking simultaneous damage. Twelve-meter blast effects include smoke, spectral rings, water crowns and debris. Change course, leave range, dive below 280 displayed meters, or use solid cover. Projectile and blast casts honor obstructions.

Seven waterspouts move outside the nursery. Shallow swept contact deals 16 damage with a nine-second contact cooldown, spirals/lifts the character, launches it visibly and returns it through the existing airborne/landing system. Diving below 100 displayed meters avoids the narrow surface hazard. Lightning is restrained and suppressed with reduced motion. Neither hazard advances during pause or menu. Three analytic GPU wave components drive surface shape, normals and foam; ships bob on the same wave field. Underwater cameras hide the sky dome, rain and lightning.

Two large reef arches, fractured basalt spires, an aircraft wreck, a smaller cargo-ship graveyard, vent chimneys, tube worms, branching coral, reticulated sea fans and marine snow enrich the seabed. Solid landmark contacts are indexed; small decorative colonies do not obstruct feeding routes. A coarse terrain skirt lies outside the playable rectangle so the shallow horizon has no exposed rectangular mesh edge. Playable floor height is unchanged by that skirt.

## Ecology and encounters

Bermuda has 313 ordinary animals across 20 kinds. Seven region-exclusive models are Queen Angelfish, Gray Triggerfish, Atlantic Needlefish, Great Barracuda, Tiger Shark, Cameroceras and Livyatan. Biological descriptions distinguish measured modern anatomy from game adaptations; extinct full-body proportions and game sizes are explicitly reconstructed. Shared sardine/herring schools, turtles, sunfish, tuna, rays, octopuses, sperm whales and Ancient Giants complete the feeding ladder.

Species profiles in `bermuda_ecology.js` use shared school, layered-school, independent-resident, hunter and normal-respawn behavior. Queen Angelfish have separate resident anchors; schools keep their assigned feeding layers. Roughly 170 ordinary animals are in the starting safe zone. Medium tuna/ray schools also inhabit the wreck passages; large meals inhabit deeper open water. Counts are supplementary evidence: verify legal placement, real discovery, consumption, respawn and habitat isolation in the running game.

There are no swimmers, divers, released divers or submarines here. Existing deep contact mines remain. Four fixed independent lords guard separate depth bands:

| Lord               | Home             | Territory radius |
| ------------------ | ---------------- | ---------------- |
| Three-Headed Hydra | [165,-20,-300]   | 75 m             |
| Kraken             | [-170,-240,-540] | 90 m             |
| Gran Maja          | [170,-420,-800]  | 85 m             |
| Leviathan          | [-70,-590,-1030] | 75 m             |

Hydra's center is capped at Y=-12 through optional generic encounter metadata, keeping its surface territory underwater. Existing maps retain an infinite upper cap. Shared eligibility remains 25 m, three valid flank hits, eight hunger per damaging hit, and victory at 30 m plus at least one defeated lord.

## Music, rendering and lifecycle

The original score uses a 46 BPM, eight-section exploration cycle with long detuned low strings, pressure/friction noise and sparse inharmonic metal echoes. A separate 118 BPM pursuit clock enters without waiting for a slow exploration beat; an additional guardian layer accompanies active lord encounters. Shared encounter return/fade behavior is preserved. Thunder and ghost warnings/shots route through the existing bounded Web Audio graph. No independent audio context or animation loop is added.

Initial preparation and region switching display an opaque loading screen with explicit preparation stages before synchronous construction. Shader preparation completes before handover. Preparation failure retains the previous region.

The ocean owns GPU water/rain/cloud motion, instanced rock/coral fields, the wreck and three nearest local pearl lights. Static wreck/fleet geometry is merged by material. Creature geometry/materials are cached; bones and moving fins remain instance-local. Weather and fleet state reset on a new round. Idempotent disposal releases only map-owned resources; reusable creature/population caches remain.

Collider contracts match the shared solver: world-space boxes use `{type:'box',x,y,z,halfSize,rotation:{x,y,z,w},id}`; ellipsoids use `{type:'ellipsoid',x,y,z,axes,rotation}`. Geometry and contacts share transforms. Factories join the existing update loop and expose owned `dispose()` operations; they must not spawn private loops or dispose shared caches.

## Acceptance and rollback

Inspect actual surface, nursery, descent, wreck exterior/interior, ghost ship, platform and deep-lord views. Check all seven exclusive models at close and ordinary camera distances; English/Chinese menus and Guide; 1440×900, 390×667 and 320×568 layouts; both characters and mature traversal; feeding/normal respawn; hazard warning/contact/escape/pause/reset; real AI-triggered music; loading failure rollback and repeated-switch resource plateau.

Use the existing performance sampler serially in headed Chrome, at both quality presets, with recorded region, position, viewport, DPR and GPU. Compare matched conditions rather than treating draw calls or triangles as frame-rate evidence. Record actual checks, raw evidence names and limitations in `bermuda_verification.md`; natural full-round pacing, physical phones and subjective listening must not be inferred from scripted checks.

Rollback before acceptance is reverting this bounded feature diff; published v0.7.2/main remains unchanged. A failed destination preparation must preserve the prior region's terrain, collider/entity identity, menu selection and audio, and allow retry.
