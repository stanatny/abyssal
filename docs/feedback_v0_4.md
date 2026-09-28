# v0.4 Feedback decisions and implementation scope

This round adjusts controls, expedition setup, growth duration, and solid environmental interaction. The workspace remains available for user review; without a commit instruction for this round, do not commit. The full visual redraw remains a separate later review.

## 2026-09-27 Reward instructions: effective in v0.4.4

Source: the user's screenshot feedback said reward explanations need not remain on the game screen. They requested a guide section and 30-second durations for the feeding and super-sprint rewards. This section replaces the old persistent reward legend, 12-second Ocean Current, and 10-second Frenzy. Sonar remains 10 seconds.

- Remove the persistent reward explanation strip from desktop and phone HUDs. Waterborne pickups retain their shapes and names but lose their effect subtitles. Pickup notifications and active-buff countdowns remain.
- Add an Ocean Rewards section to the home-screen Ocean Guide, explaining identification, effects, duration, and use of Stamina Spring, Ocean Current, and Abyssal Frenzy.
- Ocean Current (free sprint) and Abyssal Frenzy (oversized prey) both last 30 seconds. Repeated pickups of the same type refresh to 30 seconds without stacking. Stamina Spring still instantly restores full stamina and clears exhaustion. Frenzy retains the 1.6× ordinary-prey limit and 21-meter lord threshold.
- Gameplay and the guide share `reward_config.js`, preventing displayed and actual durations from diverging. This round does not change character speeds, sonar, growth, or collision.

## 2026-09-27 Phone screenshot feedback: effective in v0.4.3

Source: the user reported misaligned phone health/stamina/hunger bars and crowded 360-degree sonar labels. They proposed showing only a limited angle ahead and revealing other targets as the player turns, on desktop too. This replaces v0.4.2's 360-degree world labels and edge indicators; full detection remains on the minimap only.

- **Forward labels:** Show targets only within camera-relative horizontal ±30° and vertical ±25°, and actually on screen. Reserve an 18px phone / 24px desktop edge margin. No arrows for targets behind the camera or offscreen. Sonar still detects creatures ahead through fog and rocks.
- **Less repetition:** Forward targets of the same species and feeding eligibility share text. Desktop and phone each allow at most 4 groups and 2 representative points per group. Include length, edible/not edible or engage/avoid, and count. Prioritize lords and dangerous targets. Resolve overlaps only near the target; leave text that cannot fit to the radar instead of moving it far away and drawing lines across the screen.
- **Turning:** Update forward targets from the actual camera orientation and remove labels that leave view. The status shows a Chinese label meaning “N groups ahead,” or “turn to scan” when none can be shown. Radar still shows 360-degree echoes within 260 units. The 10-second duration, 60-second cooldown, waves, and home-screen marker preference remain.
- **Aligned survival bars:** Phone columns share title-row height and bar position. Health/recovery subtitles no longer push down just one bar. Support landscape, small screens, and changing values.

Changes remain uncommitted. Actual checks and screenshots are in `docs/verification.md`.

## 2026-09-27 Further additions: historical v0.4.2 decisions (marker scope superseded above)

The user requested stronger sonar awareness, persistent return navigation, removal of in-game marker toggles, and support for up to two special abilities. This replaces v0.4.1's representative-target list, L/pause/touch marker toggles, and hidden phone overview. The 10-second duration / 60-second cooldown, 260-unit range, automatic contact attacks, and 30-minute limit remain.

- **Every target marked:** During activation, every living creature in scan range has an individual health point, independently of ordinary-marker preferences and aim. Markers penetrate fog/occlusion; offscreen and rear targets use edge arrows. Text includes length and feeding/combat eligibility. Dense groups of the same species and eligibility may share text without dropping individual points or mappings. When the ability ends, clear forced markers and restore ordinary visible labels according to the home setting.
- **Clear activation feedback:** Four expanding wave groups and faint spherical surfaces centered on the orca last 10 seconds, driven by the main loop and bounded pools. Pause freezes the ability clock and removes the sonar overlay from the pause screen; resume restores it. The phone button shows remaining seconds, fades and becomes natively disabled during cooldown, and cannot be refreshed by repeated touches.
- **Home setting only:** Remove L, touch, and pause marker toggles; retain the persisted home preference. J / phone sonar remains independent.
- **Persistent radar:** A north-up whole-region minimap shows player position and heading, shallow/deep directions, a faint diamond and line for spawn, and return/ascent/descent instructions. Normal radar reveals no creature positions; sonar synchronizes all detected points.
- **Adaptive layout:** Overview, growth, and timer stay visible. Warnings, lords, ink, and notifications stack in flow. Phone survival bars sit at the bottom with separate turning/sprint/ability zones. The ability container supports up to two slots, occupied only by usable abilities. The overall art redraw remains later work.

Results and limitations are recorded in `docs/verification.md`. Changes remain uncommitted.

## 2026-09-27 Added feedback: historical v0.4.1 decisions (partly superseded above)

Source: the user requested an orca-exclusive sonar ability that detects invisible creatures for roughly 10 seconds with a 1-minute cooldown, automatic contact bites instead of a bite key, and a 30-minute cap. These replace “remove active sonar,” “J to bite,” and “20-minute cap” in the initial table below. Growth, region, and visual scope otherwise remain.

- **Active sonar:** J or the phone sonar button triggers a 260-game-meter scan for 10 seconds; the 60-second cooldown starts on activation. Radar is independent of camera visibility, fog, and rock line of sight, detecting living targets behind the player or obstacles. Radar shows all echoes; text prioritizes representative lords and dangerous hunters (4 species on desktop, 3 on phone), including length, relative bearing/depth, distance, and feeding eligibility. It never claims lords can be swallowed whole. Inactive, defeated, and respawning creatures are excluded.
- **Markers separate from abilities:** L and existing settings still control ordinary visible markers, which do not pass through solids. Disabling them does not disable active sonar. Activation and cooldown use effective playtime, freeze on pause, reset on restart, and do not refresh on repeated clicks.
- **Automatic contact bites:** Ordinary fish remain automatically edible. Once the threshold is met, mouth contact with a lord's actual model surface or closed torso triggers an attack. Remove the bite button and assign J to sonar. Retain the 24-meter / Frenzy 21-meter threshold, 1.2-second global attack interval, weak-point damage, and repeated-hit defeat rules. Gaps between arms or three necks are not contact; terrain blocking the segment from mouth to contact point prevents attacks through walls.
- **30-minute limit:** `ROUND_DURATION=1800`, with an independent result at timeout; pause does not count. Growth benefits are unchanged. The prior 15–20-minute target was a reference route, not a requirement to stretch completion to 30 minutes. Slower routes formerly cut off at 20 minutes can continue.
- During sonar, the phone top area temporarily displays radar and restores the location/growth panel afterward. Chase/lord warnings, health/stamina, and action controls stay visible. The full visual redraw remains a separate later task.

See `docs/verification.md` for targeted and public-preview results. No new commit or push authorization exists at this point.

## Initial ten requests (historical; the three decisions above were superseded)

| User feedback                                                              | Decision and implementation                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Remove desktop mouse steering                                           | Use WASD on desktop. Mouse movement does not change the orca's heading. Phones retain the touch joystick.                                                                                                                                                                                         |
| 2. Copy, paste, or select-all appears on phones                            | Treat the game area as touch controls, suppressing accidental text selection and long-press menus. Inputs such as guide search remain editable.                                                                                                                                                   |
| 3. Left hand WASD, right hand J/K/L and Space                              | W/S pitches, A/D turns; Space sprints, J bites lords, K swims slowly, L toggles creature markers. Remove F and left-click biting. Return focus to the canvas after start, resume, and restart so Space cannot click the previous button.                                                          |
| 4. Sonar is unclear; information should be visible by default and optional | Remove active sonar and cooldown. Show creature length, distance, and feeding hints by default, with a saved setting or L to hide them. Hiding labels does not hide chase/lord warnings. Character-specific active abilities remain future work; no new orca active ability in this initial pass. |
| 5. Distinguish playable characters in the guide                            | Show the orca under Playable Characters, apart from prey, hunters, and lords. At this stage the orca is the only playable character.                                                                                                                                                              |
| 6. Select a region on the home screen; Hawaii first                        | Add region and character setup. Hawaii is enterable; Mariana Trench, Bermuda Triangle, and Atlantis Ruins are unavailable placeholders, not completed maps.                                                                                                                                       |
| 7. Put all current species in one region, split them by region later       | Hawaii includes all ordinary species and four candidate lords, with two randomly active per round. Keep ordinary-species and lord lists configurable by region. This is a fantasy adaptation, not a claim that all these creatures inhabit real Hawaii.                                           |
| 8. Reaching 30 meters is too fast; cap rounds at 20 minutes                | Recalibrate growth by food tier while retaining small-prey diminishing returns and healing priority. Victory still requires 30 meters and one defeated lord. At 20 minutes of active exploration, use a separate `timeup` result, not automatic victory or death; pause does not count.           |
| 9. Reefs and ships should feel solid                                       | Add lightweight collision and movement blocking for seabed, reefs, structures, and hulls. Occlusion reuses solid geometry information. Use web-game approximations rather than precise per-triangle physics.                                                                                      |
| 10. The Kimi redraw is still unsatisfactory                                | Complete necessary menu, information, and interaction integration without claiming full art acceptance. Redesign overall style, ocean materials, lighting, and creature presentation in a later round with explicit references and comparisons.                                                   |

## Growth and hunger calibration

Under the old rules, a fully healthy player always choosing the largest edible prey could theoretically grow from 6 to 30 meters in 19 ordinary meals. Under the new rules, the same ideal strategy takes roughly 91, through tuna, manta ray, white shark, anglerfish, Giant Squid, and Dunkleosteus stages. Levels are not time-gated; skillful routes, school feeding, and timed rewards can still accelerate growth.

Ordinary-species mass rewards are coral fish 0.035, tuna 0.055, manta ray 0.2, white shark 0.45, anglerfish 0.9, Giant Squid 1.8, and Dunkleosteus 4. Length derives from the cube root of mass, still capped at 30 meters. Below half the player's length, prey nutrition and growth decline with the square of the size ratio; small shallow-water fish cannot efficiently sustain a large animal.

Hunger drain per second is `0.3 + max(0, length - 6) × 0.045`. At 24 meters, a full hunger bar lasts about 90 seconds, leaving room for deep-water travel and a lord encounter; at 30 meters, about 72 seconds. Empty hunger still costs 7 health/second. Injured feeding allocates at most 70% of growth to healing; light injury consumes only the share actually used. Sprint speed, stamina drain, and recovery keep this round's previous values.

### Pacing assumptions and results

The following is a rules-level event simulation, **not a naturally played full-round measurement or a promised average completion time**:

- Start with 12 coral fish, one per second.
- Subsequent effective feeding intervals include finding and pursuing prey: tuna 7 seconds, manta ray 12, white shark 10, anglerfish 11, Giant Squid 13, and Dunkleosteus 16.
- At 10 and 18 meters, add 20 and 30 seconds of travel respectively, with 28 damage at each transition.
- At 24 meters, assume 75 seconds to exploit five vulnerable windows and defeat Kraken, lose 40 health in battle, then receive loot using actual rules.
- Do not simulate real navigation, missed bites, collision detours, lost prey, timed Frenzy rewards, or differences in player skill.

| Pacing model                       | Completion time | Result                                                                    |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------- |
| All intervals at 80% of reference  | 15 min 10 sec   | 30 meters and one defeated lord: victory                                  |
| All intervals at 90% of reference  | 17 min 03 sec   | 30 meters and one defeated lord: victory                                  |
| Reference pace                     | 18 min 57 sec   | 97 ordinary meals, 30 meters and one defeated lord: victory               |
| All intervals at 110% of reference | 20 minutes      | About 29.27 meters and one defeated lord; expedition ends without victory |

Natural full-round growth, food accessibility, and deep-water routes still need playtesting. Rules tests establish boundaries and outcomes under the stated model. Browser regression scenes arranged through development APIs establish local integration, not natural completion.

## Timing and verification boundaries

`ROUND_DURATION` is 1200 seconds in this historical initial pass. The expedition clock accumulates actual unpaused elapsed time, while resource and physics updates retain bounded steps to avoid large displacement on slow frames. The final frame settles only the portion before the deadline. Low frame rates cannot extend the 20-minute limit. Pause and end stop accumulation; restart clears `elapsed` and `timedOut`.

Unit tests cover growth, healing, hunger, sprinting, independent 20-minute results, and slow-frame timing. Browser regression retains real key input, feeding, breaching, repeated lord encounters, the guide, and effect lifecycle checks. Actual execution is recorded in this round's verification log; this document does not mark unrun checks as passed.
