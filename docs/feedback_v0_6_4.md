# v0.6.4 Surface posture, fixed Frenzy, and inverted pitch

After more playtesting, the user requested a lower pitch at the surface during ordinary swimming, a fixed respawning Frenzy pickup in the shallows, and an invert-pitch setting on the home screen. This builds on uncommitted v0.6.3, still without commit or push.

## Ordinary surface swimming

When ordinary swimming reaches the body waterline, upward pitch is limited to about **20°**. A near-vertical arrival eases down smoothly: 85° falls to 20.5° in roughly one second rather than snapping. Holding upward input does not fight that easing; dive input responds immediately, and yaw works normally.

This is a waterline constraint, not underwater auto-leveling. Deep water still allows ±85°, retaining heading on release. Genuine sprint buildup unlocked by diving, breaching, airborne ballistics, and reentry retain their rules; the comfort angle does not weaken legitimate takeoff. `surface_steering.js` is pure rules code inserted at the original control point without advancing surface/collision systems twice.

This replaces v0.6.2's decision to retain 85° at the surface. Free underwater orientation remains effective.

## Fixed nursery Frenzy pickup

Add one orange Abyssal Frenzy pickup roughly 41 game meters ahead and slightly right of Hawaii spawn, at the same depth. Its fixed center is `(6, -18, 34)` and independent ID `nursery_frenzy`. The original 34 rewards remain, giving 35 total.

For **30 seconds** after collection, ordinary prey up to 1.6× player length is edible. The pickup **respawns in the same place after 45 seconds**; pause freezes the timer. Restart immediately restores it and its complete base coordinates. Bobbing changes display height only and does not append duplicate meshes. It is spaced apart from nearby Stamina Spring/Ocean Current pickups, retains orange fangs, and gains a fixed-location explanation in the guide.

Placement rules live in `pickup_placement.js`. Tests cover actual seabed, reef collision, bobbing envelope, and approach routes from both character spawns. Lords retain separate length thresholds and repeated-flank rules; Frenzy does not grant invulnerability.

## Home-screen invert pitch

Add **Invert vertical controls**, off by default, under Expedition Settings & Instructions. When enabled, W / joystick up dives and S / joystick down rises. It changes pitch only, not yaw, and is shared by both characters.

Save the choice in browser local storage across refreshes. If private-mode storage writes fail, it still works for the current page. No in-game button is added; guide/menu selection and ability shortcuts are unaffected.

This round also corrects the home-screen creature count to 31: 35 character/creature/human entries minus 4 human entries. Guide categories and data do not change.

See [verification](verification.md) for actual acceptance. Browser touch emulation is not real-device handling, and a temporary public preview is not an official Pages release.
