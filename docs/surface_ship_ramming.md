# Surface Ship Ramming

Release status: included in the user-authorized **v0.7.2** commit and push to `main`. See [release verification](verification.md) for current checks and deployment acceptance. Local-only authorization statements and earlier candidate measurements below are historical; they do not override the current release instruction.

## Historical review context

Status: reviewed candidate included in the user-authorized local commit. No push or release is requested. This rule applies to both playable regions. It shares the submarine impact threshold and contact lock rather than adding a separate combat engine.

## Rules

An Orca or Giant Squid must be at least **18 m** long and move at least **20 m/s** to damage a hull. Eligibility uses actual length and movement speed, not a sprint button or displayed depth. Each successful contact removes one durability point. Leave the entire hull by a 4 m clearance margin and approach again; continuous pressure cannot deal another hit. The shared impact cooldown is 0.8 seconds.

| Region   | Ships                 | Required independent impacts |
| -------- | --------------------- | ---------------------------- |
| Hawaii   | Sloop                 | 1                            |
| Hawaii   | Schooner, cruise ship | 3                            |
| Atlantis | Fisher, ketch, launch | 1                            |
| Both     | Submarine             | 3                            |

Surface ships use the generic `length > 24` durability classification. The existing hull shapes, route positions, headings, decks, sails and lanterns remain the visual reference. Submarines retain their existing one-time release of three divers; surface-ship destruction introduces no food, growth, loot or human population event.

## Integration contract

`createShips(scene, options)` and `createAtlantisFleet(scene, options)` retain `ships`, `colliders`, `update(time, playerPosition)`, `reset()` and `dispose()`, and now expose:

```js
fleet.onMovement(player, previous, desired, forward, { speed, now });
```

Call this method before the player collision solver. `previous` and `desired` are the current frame's center positions; `forward` is the actual body direction; `speed` is the true movement speed in world meters per second; `now` must use the same existing animation clock supplied to `fleet.update(time)` (the integrated surface uses `elapsed`, while human activity uses the round clock). Dead, victorious and timed-out players cannot damage a ship.

Both factories accept `worldColliders`, an optional `castWorld(from, to, radius)` replacement, `onImpact(event)` and `onContact(info)`. A sweep samples the same full-body span and spacing as the existing solver against the boat's actual `ship_hull` colliders. It checks world obstruction on each possible contact segment. Earlier walls block the hit. Distant ships, stationary inputs, movement away from an existing overlap, and contact with only an upper deck cannot damage the hull.

Each effective hit is returned in the result array and sent once to `onImpact`:

```js
{
  kind: "surface_ship",
  entry: ship,
  hit: true,
  destroyed: boolean,
  health: number,
  maxHealth: number,
  position: THREE.Vector3,
  normal: THREE.Vector3,
}
```

`onContact` receives a newly detected ineffective contact with `entry`, `length`, `speed`, `now`, `requiredLength` and `requiredSpeed`. The integration owner supplies bilingual copy, sound and any hint rate limit. Keeping contact cannot repeatedly invoke the callback until the body clears the hull.

`ship.state` uses `createImpactState(maxHealth)` and `stepImpact(state, input)` from `human_rules.js`. `stepSubmarineImpact` wraps the same state transition and preserves the existing `{ hit, destroyed, release }` result. Shared `bodyClearOfHull(position, forward, length, radius, collidersOrSingleCollider, margin = 4)` is a pure collision query used for rearming surface boats and submarines. It retains the real body's sample offsets while adding clearance to each sphere; enlarging the solver's radius alone would shorten the front/back sample span and incorrectly rearm a character pressing into a hull.

Destruction immediately removes that boat's colliders from the existing public array in place. Read the current array when solving movement or refresh a combined dynamic cache before the solver runs. `ship.colliders` remains the original per-boat geometry metadata; `ship.collidable` becomes false. `reset()` creates fresh states and refills the same public collider array with those original collider objects. `dispose()` clears the array, removes the fleet and its dedicated effect root, and releases each owned effect resource once. Repeated disposal and post-disposal update/reset are inert.

## Visual progression and ownership

The accepted procedural boat assets are reused intact. Intended review distances are a close hull contact, an ordinary above-water follow view, and a wider view of capsize. A hit adds a torn, dark hull patch with an exposed edge at the validated surface contact, brief recoil, a textured water curtain and an expanding foam ring. Three-hit ships retain successive damage patches and a slight damage list. A fatal hit adds seven tapered floating pieces; wooden boats use wood splinters and the cruise ship uses metal trim fragments.

The destroyed hull freezes at its actual route position and heading. Small boats capsize and sink over 4.4 seconds; large ships list and sink over 5.4 seconds. Their wake and lantern contribution stop at destruction, collision stops immediately, water effects expire after 2.3 seconds, and the visible hull hides after sinking. No timer, animation frame loop, point light or external asset is added. All animation is driven by `update(time)`; a constant paused clock yields a constant pose and effect state. Geometry, materials, foam texture and per-boat effect slots are created once per fleet, with no new resources allocated during updates.

## Verification and limits

Focused checks run during this implementation:

- `tests/surface_ship_impact.test.js`: 22 checks covering the 18 m / 20 m/s boundary, non-finite input, cooldown and held-contact locks, exact one/three-hit regional hulls, real world-wall occlusion, remote/deck/outward rejection, actual movement routes, fixed-clock pause, 15/30/60/144 FPS pressure with the physical solver, one ineffective-contact callback until full clearance, collider identity on reset, and four repeated fleet disposal cycles with one-time effect-resource release.
- Existing human activity, human contact sweeps, indexed human-world queries, Hawaii indexed-collision and Atlantis environment tests: 33 checks passed after adopting the shared 18 m rule. The existing three-impact submarine case still removes its collider and releases exactly three protected divers once.

The isolated factory render evidence is stored under ignored `.local/surface_ship_ramming/`. It uses the actual fleet factories and swept impacts with a simple water plane and the main scene's above-water day/night light colors and intensities. It supports model and event inspection and is distinct from the integrated checks below. No build, commit, push or release was performed by the scoped ship task.

## Integrated native-input evidence

The current source was exercised at `http://127.0.0.1:5203/` with the real menu, world, collisions, NPCs, follow camera, postprocessing, HUD and audio graph. Developer staging only set the player to 18 m and placed/faced the body before an approach; the test then held the actual **Space** key. It never called an impact controller directly, injected damage, changed movement rules, removed obstacles or hid enemies.

The merged `actual_game_report.json` records **22 distinct checks and 24 screenshots**:

- Native Hawaii and Atlantis selection with Orca/English and Giant Squid/Simplified Chinese.
- Both characters destroyed Hawaii's cruise ship through three independent physical approaches and the sloop in one. Both destroyed Atlantis's fisher in one approach.
- A 1.4-second held sprint into each character's damaged cruise hull preserved its remaining durability. An 18 m submarine passed the same continuous-pressure check, then broke after exactly three staged physical sprint contacts and released exactly three reserved divers.
- Surface colliders disappeared at the fatal contact. Native pause froze the sinking pose and clock. Resume reached normal hull hiding and effect expiry. Native Return to Home restored fresh boat states and the original public collider-array identity for all four character/region cases.
- Actual impact callbacks reached the existing `audio.hit` path with a running audio context; English and Chinese hull notifications were visible in the retained game screenshots. The audio wrapper only observed and delegated calls; it did not replace sound generation.

The initial Atlantis hidden-hull wait exceeded its 10-second wall-clock timeout while other checks were running. The raw failure remains in `actual_initial_report.json`. The unchanged gameplay source was rerun for Atlantis and the submarine with a longer waiting bound, and every remaining assertion passed with no page errors. The combined report records this retry rather than treating the initial timeout as a completed check.

Representative evidence files: `actual_hawaii_orca_cruise_3_hit.png`, `actual_hawaii_squid_small_sinking.png`, `actual_atlantis_orca_small_hit.png`, `actual_atlantis_squid_hidden.png`, and `actual_submarine_destroyed.png`. Images and logs remain ignored local review evidence. This does not establish subjective listening quality, real-phone behavior, FPS performance, or a natural whole-round playthrough. Build and broader integration checks remain owned by the main task.
