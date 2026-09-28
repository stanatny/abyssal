# v0.3 Tides and Instinct: audio, visuals, and movement feedback

Source: the user's next round of feedback on 2026-09-27. The previous published version was `96d57ff` (v0.2). This round's features and subsequent visual redraw were initially to remain uncommitted.

## User requests

- Rework music and sound effects, improving attacks, damage, and feeding. Eating fish should produce visible blood clouds with a more convincing underwater feel.
- Breaching should be smooth and require building momentum underwater first. Accelerating while already at the surface or in the air must not add upward thrust.
- Add surface environmental features such as cruise ships.
- Give intermediate hunters infrequent abilities, such as white-shark rushes and Giant Squid ink clouds. Make the orca's sprint faster and more sustainable.
- After the functional phase, hand the project to Kimi to redesign the interface, fish and monster models, and effects for more expressive, recognizable silhouettes.
- Add a home-screen Ocean Guide explaining creatures and their abilities.

## Decisions effective in this round

- Orca cruise speed is 12 and sprint speed 32 game meters/second. Sprint drains 14 stamina/second; recovery is 19/second. Full stamina lasts about 7.14 seconds. Exhaustion restricts sprinting but does not directly damage health.
- Breaching uses independent momentum rules: recharge sufficiently below the body waterline, sprint underwater continuously for 1.2 seconds, and cover 26 units. Takeoff occurs only when crossing upward through the waterline. Airborne motion integrates inertia and gravity only; Space adds no upward thrust. Reentry retains brief downward momentum before smoothly returning to swimming.
- White sharks warn for 0.8 seconds, burst at 34 meters/second for 1.1 seconds, then slow to recover. Squid warn before releasing a 6-second ink cloud with radius 22. Anglerfish briefly lure with light; Dunkleosteus charges a heavy bite. Initial abilities are staggered; subsequent cooldowns are 16–30 seconds of pursuit time. See `src/hunter_rules.js` for exact configuration.
- To preserve the tier where a lord cannot simply be escaped with an ordinary straight-line sprint, the four pursuit speeds become 35, 36, 37, and 38. Leviathan's charge remains 46. This replaces v0.2's player speed of 24 and lord speeds of 26–30.
- Blood disperses as dark-red underwater clouds, accompanied by bite-flow arcs, bubbles, and peripheral damage feedback. The same spatial volume controls visible ink, reduced visibility, and muffled audio; leaving the cloud or its dissipation restores them. Restart clears transient effects; pause freezes them.
- Music and effects remain original procedural synthesis, with new arrangements and layered mixing. No claim is made that they use real ocean recordings or professionally recorded assets. Listening and mixing on real devices still need evaluation.
- Surface ships are environmental models. They cannot be eaten and, in this round, do not simulate hull collisions or people.
- The Ocean Guide contains 13 existing playable characters, prey, hunters, and lords. It provides categories, name/ability search, draggable 3D displays, abilities, and escape tips. It reuses game assets, so Kimi's model changes also appear in the guide.
- Guide content explicitly describes this game's ecology and fantasy setting. Sizes and depths are game-scale values, not a biological reference guide.

## Modules and handoff boundaries

- `src/surface_rules.js`: rendering-independent momentum buildup, waterline crossing, ballistics, and reentry state.
- `src/surface.js` / `src/ships.js`: surface creatures, ships, wakes, and breach presentation.
- `src/hunter_rules.js`: hunter ability state machines and guide metadata.
- `src/combat_effects.js`: blood clouds, bites, damage, and ink; bounded particle pools and restart cleanup.
- `src/ocean_guide.js` / `src/ocean_guide.css`: home-screen Ocean Guide.
- `src/audio.js`: three music layers, event audio, pause/restart/mute, and ink-cloud filtering.
- Codex completes functionality, integration, and verification before the user-requested visual handoff to Kimi. Functional-phase screenshots are not evidence that the full visual redraw is complete.

## Verification and remaining work

The functional phase passed 46 rules tests, 21 main-flow browser regressions, targeted guide/hunter/effect checks, and offline audio checks. The temporary public production preview also received actual interaction checks. Evidence is recorded in `docs/verification.md`; local screenshots, listening files, and preview receipts are in the Git-ignored `.local/` directory.

Still pending: ability encounter frequency and fairness during a natural round; clarity of momentum instructions; real-device volume and underwater sound quality; phone multitouch controls; and model recognition, effect occlusion, and performance after the redraw.
