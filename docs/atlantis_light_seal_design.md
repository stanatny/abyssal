# Atlantis light seal — distributed reflection proposal

**Status: implemented candidate for review, 2026-10-31.** The user authorizes
this light seal, Poseidon awakening and four distinct quest sound effects.
Each Atlantis expedition chooses either the accepted water-level lock or the
light seal; inactive geometry and colliders are removed. See the
[implementation review](atlantis_light_seal_revision.md) for actual routes,
validation and bounded native-play evidence. No commit or push is performed.
The design rationale below remains the accepted direction; proposed alternatives
must not be confused with measured runtime coverage.

This replaces the two-mirror indoor crest/test/health-cost proposal in the
[five-family design](atlantis_environment_puzzles_design.md#2-pearl-light-seal--visible-direction).
It is an explicit exception to the usual separate-test and failure-reset defaults
in the [environmental puzzle rules](environment_puzzle_rules.md).

## Player objective

Guide the pearl beacon's continuous light through ancient mirror stations to
the existing outdoor Poseidon monument. Each touch turns a mirror to its next
detent. The objective inscription states this plainly; no extra test button,
final lever or touch of the distant statue is necessary.

Proposed hint:

> 引导圣光照亮海神巨像。触碰镜台改变方向；离开后再碰，转到下一档。
> 光路可随时调整，偏离目标不会扣血。

The English counterpart must convey the same controls, objective and free retry.
Adjustments visibly change the current beam, but no cue identifies the solution
angle before light actually reaches its destination.

## World layout and variation

- Start with **one source and five adjustable mirror stations**, each having
  **four discrete orientations**. These counts are implemented in the review candidate. Use distinct sculpted bases and readable symbol/number labels so players
  can recognize previously visited stations; labels do not encode solution order.
- Place the source beyond the starter shallows, on the city approach. Spread the
  stations over reachable outer-city terraces, ruined towers and edge platforms
  through the Agora, Sacred Avenue and Acropolis approach. Keep them inside the
  playable region, with adult-sized approach and turning room.
- Proposed route families: a western approach, an eastern approach, and a route
  crossing the city once before reaching a royal-side final mirror. They vary
  source host, active mirror positions and starting angles. Do not scatter points
  independently or force repeated edge-to-edge trips merely to extend playtime.
- Begin with one fully verified route; expand to at least three verified templates
  for the eventual randomized version. Choose a template once per expedition and
  keep it stable while adjusting, leaving, pausing or retrying. A new expedition
  may draw another template.
- Existing hint plaques identify the current source and the reflecting-station
  areas. Discovering a station may mark it on navigation; location guidance does
  not display the correct angles or the completed connecting route.
- Exclude all selected puzzle-host complexes from the key-site pool before drawing
  a key. A balcony and the rooms beneath it are the same complex. Preserve a
  sufficient eligible key pool instead of silently violating separation.

An illustrative route, **not a verified coordinate plan**, is:

```text
City approach beacon
  → west Agora mirror
  → western terrace mirror
  → eastern Sacred Avenue mirror
  → eastern Acropolis mirror
  → royal-side final mirror
  → Poseidon's outdoor monument
```

## Where the reasoning comes from

Players inspect the incoming beam, the physical mirror orientation and the next
visible receiving stations, then choose a direction that continues toward the
monument. Some detents point into open water or end on a visible wall; at a limited
number of junctions, more than one direction can reach another station, but one
returns toward an earlier section or leads to an unproductive branch. Seeing a
station light up is therefore evidence of connectivity, not a “correct answer”
signal. Follow the actual downstream beam to identify where the route stops.

Keep the network small enough to reason about and the alternatives visible. Do
not add color mixing, hidden activation sequences, timing races or fine manual
aiming to this first version. The designed solution should use the five stations;
any genuinely connected reflected route to the target must count, even if it is
not the intended order. Prevent unintended shortcuts through geometry and layout,
not an invisible requirement to use a secret sequence.

## Interaction and feedback

1. Swim into a clearly marked control on the mirror base. It moves one detent,
   shows its current position out of four, and animates the mirror and outgoing
   beam together. The detents are fitted orientations, not necessarily 90° apart.
2. Leave the contact margin and return for the next detent. After the fourth,
   cycle to the first. Holding contact, rubbing, pause/resume and large movement
   jumps must not cause repeated rotations. No modal panel or new action button.
3. A mirror without incoming source light can still be adjusted, but emits nothing.
   Its hint explains that it is not receiving light. Once connected, it reflects
   according to its actual current orientation.
4. Show beam direction with gentle travelling particles. Illuminate the real
   endpoint on a receiver or wall; let a missed beam fade into water. A narrow
   bright core and soft scattering should remain visible without covering the
   creature or flooding the whole city with glow. State is not color-only.
5. Misalignment has **no extra damage, reset, countdown or loss of previous
   adjustments**. Correct earlier sections remain while the player explores or
   fixes a later mirror. Ordinary enemies and survival costs still apply.
6. Once the mirrors have stopped moving and an uninterrupted source-connected
   beam reaches the statue, use a short proposed one-second confirmation to
   avoid completing during a rotating sweep. This is not a timed challenge.
7. Confirm completion once and start the statue awakening described below:
   glowing eyes followed by a deliberate trident lift. Credit the mechanism seal
   once and latch completion for the expedition. Later adjustments cannot revoke
   it or grant another reward. No need to travel to the statue to collect proof
   or wait beside it for the animation to finish.

## Accepted addition: Poseidon awakens

The user's follow-up accepts the design and asks the whole statue to read as
awakening: its eyes light up and it raises its trident. The proposed sequence is
about four to five active seconds, with exact timing subject to visual review:

1. After the source-connected beam has settled on the target, light travels from
   the receiving motif toward the head. Both eyes brighten over roughly half a
   second with a restrained blue-gold glow, without a full-screen flash.
2. The gripping arm then slowly raises the trident over roughly three seconds.
   The hand, wrist, elbow and shoulder move together; the palm retains its grip
   and the shaft stays straight. Since the existing trident already stands nearly
   vertical, lift it further upward with a small outward arc rather than swinging
   it across the torso. The feet and pedestal stay planted; do not rotate or
   translate the entire statue as a substitute for articulation.
3. At the raised pose, the trident tips briefly brighten and a low stone movement
   sound resolves into a single solemn completion resonance. This is a quest
   reward, not a new attack, damage wave, boss-music trigger or gameplay obstacle.
4. Hold the raised pose and a softer eye glow as a persistent landmark of this
   expedition's success. Turning a mirror afterward cannot replay the ceremony
   or remove the seal. A new expedition restores the dormant pose. Pause freezes
   it; terminal states stop presentation updates, and disposal clears ownership.

Keep normal player control and the follow camera. Locate the final mirror with a
view of the statue where feasible, so completion is visible from the place where
the player solves it. Do not force a cutscene while ordinary predators remain
active. Give the same once-only completion notice if the statue is off screen.
Reduced-motion mode removes extra light pulses and any optional camera effects;
the pose change must still clearly communicate completion.

### Model feasibility and required checks

Source inspection confirms the monument currently uses one ordinary static mesh
and shared stone material. The asset loader explicitly removes skin indices and
weights; it does not currently provide an articulated arm or trident:
[asset loader](../src/atlantis_monument_asset.js),
[monument assembly](../src/atlantis_city.js).
This is a code finding, not a completed visual segmentation or rigging test.

Implementation therefore needs fitted arm/hand articulation and a rigid trident
attachment, preserving the accepted sculpture and texture. Inspect the actual
rendered mesh before choosing safe separation or skinning; reconstruct hidden
surfaces if needed rather than exposing holes at the shoulder or grip. Use an
instance-owned rig/material state so animation or eye emission cannot mutate
other shared monuments. Eye glow must fit the visible sockets without leaking
through the head or turning the whole stone material emissive.

Check the arm and weapon's entire sweep against the torso, head, ground, nearby
architecture and adult swimming routes. Moving solid parts need corresponding
collision transforms; remove the old stationary weapon collider rather than
leaving an invisible barrier. Preserve stationary body/pedestal collision. Do not
push or trap the player to stage the ceremony. Review dormant, intermediate and
raised poses from normal final-mirror and near-statue cameras, plus pause/restart,
one-time reward and resource cleanup. No pose or collision verification is yet
claimed for this design addition.

## Target and physical constraints

The repository already places the outdoor `poseidon_monument` at horizontal
`x=0, z=-865`, separate from the main temple at `z=-911`:
[city assembly](../src/atlantis_city.js),
[city districts](../src/atlantis_city_plan.js),
[temple reservation](../src/atlantis_poseidon_site.js).
These source facts establish the intended landmark, not reflector visibility.

Use a generous, clearly explained target on the statue's front upper torso, with
a decorative sun/pearl motif if needed. The final preset is aligned to it; the
player never aims at a tiny eye or pixel. Fit the target to the rendered HF statue,
not just the legacy collision proxy. Record its final bounds during implementation.

Trace actual reflection from the fixed source using each detent's mirror normal.
Visible beams and success checks share the same intersections. Solid city/terrain
occlusion stops the beam; mirrors must never visually redirect light through a
wall or behind their reflecting surface. Reject unreachable or unsolvable
templates and direct source-to-statue bypasses during layout validation. Detect
and terminate loops created by wrong orientations with a finite hop limit.
Moving creatures should not make a
large, otherwise solved navigation puzzle fail through momentary occlusion.

Keep the final station outside the guardian's main combat corridor, subject to
actual habitat verification. Measure travel and reasoning time with normal hunger,
food availability and adult routes before setting a completion-time expectation.

## Expedition integration and validation plan

The existing five-family plan draws **one environmental puzzle per expedition**.
For the eventual family selector, light or water-level completion satisfies the
same mechanism-seal requirement alongside the key and guardian seal. Do not
silently require both puzzles in every run. A development-only light selection
can support review before expanding the family pool; production selection and
navigation hints must then match the actual chosen family.

Before playable delivery, verify generated templates and all relevant detent
combinations, actual wall occlusion, generous target contact, loop termination,
no transient sweep victory, no disconnected lit fragments and once-only reward.
Check native approach/leave/recontact, changing an earlier mirror and breaking
the downstream chain, correction without resets, pause, restart and disposal.
Review Chinese/English hints and desktop/touch visibility in the normal camera.

Deliver one continuous native route review plus clearly labeled close-up clips
of rotating a mirror, a wrong branch, correcting the route and illuminating the
statue. State any setup shortcuts separately. This document contains no claim
that those routes, angles, art or tests have already been implemented or passed.
