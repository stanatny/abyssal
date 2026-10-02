# Mechanical Shark — production contract

Development candidate based on `e042fbb` on `feature/mechanical-shark`. Independent implementation; no commit, push, main integration or formal release is authorized.

## Character and presentation

A fourth playable character with shared 3–30 m growth (Mariana starts at 15 m), ordinary 32-unit sprint and the existing steering/capture body. An original hydrodynamic machine: layered ceramic/titanium armor, seam recesses, fierce optical brow, segmented jaw, mechanical fins and articulated tail, twin shrouded thrusters and a visible ventral launch port. The visual follow-up uses navy/cobalt armor, warm copper bands, broad shoulder shields and range sensors, and longer plumes without altering the physical body or movement. Shared model in home, Guide and gameplay. Sprint flames represent stylized underwater propulsion; no physical-combustion claim or extra speed bonus. Geometry/materials are cached; animation and emission state remain independent.

## Ability and balance

Steel Body multiplies effective resistance by 1.5: incoming attack/contact/hazard damage is divided by 1.5. Hunger and voluntary resource payments bypass armor and invulnerability.

Forward torpedo: 5 s active-time cooldown, fixed 10 health + 10 stamina per successful cast (10% of maximum, not of current values). Health must exceed 10; stamina must be at least 10. Failed casts pay nothing. Underwater only; finite 140-unit range, 70-unit speed and 14-unit blast radius. Follow-up authorization adds weak correction toward one visible unobstructed target inside a 7-degree acquisition cone: at most 3 degrees at launch, 22 degrees/second thereafter, never outside the original 9-degree corridor. Lose assistance on occlusion, retirement or leaving the corridor; never reacquire. Preview and firing share the same selector. Keep solid occlusion, swept target contact, range detonation and bounded resources. No unrestricted homing or vehicle destruction.

Ordinary prey smaller than the current player are killed by one explosion; ordinary creatures at least the current player’s size need three distinct explosions. Check relative size on each hit; equality is not normally edible. The user revised settlement: killed ordinary creatures immediately count as feeding with shared size-scaled nutrition/healing/growth and one meal count. Torpedo kills bypass contact-size eligibility; nonlethal hits grant nothing. Retirement uses normal habitat respawn. No corpse collection state is kept. A valid lord explosion at 25 m or longer counts as one of the existing three hits; it retains boss cooldown, permanent defeat, regional objectives and existing lord-hit/defeat settlement, and does not require a melee disengagement or flank angle. One explosion can settle each target at most once. Terrain blocks damage. Self-damage is the fixed cast sacrifice only.

## Verification

Atomic costs, armor, unavailable states, cooldown, finite range, moving-target sweeps, solid occlusion, immediate exactly-once meal rewards and habitat respawn, large-enemy durability, 25 m lord eligibility and three-hit objective accounting. Native keyboard/touch activation, all five region starts, four-character Guide/records, bilingual descriptions, pause/reset/terminal cleanup. Multi-angle close and game-distance model views; complete cruise/sprint/turn/feed/launch/burst transitions. Game-path audio metrics/clips and honest listening status. Bounded headed desktop cost/resource sample; physical-device and whole-round balance remain user-review boundaries. Rebuild and byte-match restricted candidate before delivery.
