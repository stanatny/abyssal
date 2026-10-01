# Grounded steering recovery

## Scope and behavior

The previously reviewed hunger, local character-aware completion records and Mariana refuge work was committed locally as `1c6ffcb`. The user has now authorized a local commit of this reviewed movement fix before the separate Europa map. Neither a push nor formal publication is authorized.

The reported mobile Atlantis failure is a character pointing almost vertically downward into a stone floor. Collision corrects position but previously left the swimming heading at −85°, giving almost no lateral movement. The same failure was reproduced against actual Atlantis terrain before this change.

`ground_steering.js` recognizes a downward heading steeper than 25° after actual contact with the terrain clamp or an upward-facing solid collision normal. The next movement step smoothly eases the heading to level. From −85° with no upward input, the analytic recovery takes about 0.51 simulation seconds. Upward input accelerates recovery; sideways input remains fully responsive. Downward input is suppressed only during this short recovery, then works normally again. A recovery completes once rather than flickering on/off as the shortening vertical body footprint leaves the floor.

The aid does not run in open water, on a wall or ceiling alone, during flight, or during the squid's heading-locked Ink Jet. Returning home resets its state; pause does not advance it. The same movement path serves keyboard, touch, both characters and post-victory refuge exploration. No new HUD control is needed; the existing pitch gauge shows the resulting heading. Both-language character Guide advice describes the behavior.

The existing body radius, swept multi-sphere collision, terrain clearance and barrier geometry are unchanged. Updated orientation goes through the normal collision resolution, including large bodies near other solids. Terrain-height calculation is shared with the resolver, avoiding a separate approximate floor.

## Verification

Evidence is kept in ignored `.local/ground_steering_review/`. Browser staging uses real terrain and colliders with isolated wildlife; it is a controlled movement regression, not a natural complete playthrough. Physical-phone feel remains a user acceptance check.

- All 711 unit tests pass. The seven new steering groups include real full-body collision on flat/sloping terrain and stone floors for both characters at 3.2/15/30 m and 20/60/120 physical steps per second. They also cover held-down input, responsive upward input, time partitioning, pause and wall/ceiling/airborne/jet rejection. Existing surface-breach and accepted structural collision tests remain passing.
- All 22 targeted browser cases pass across the four regions, both characters and juvenile/adult sizes. Actual Harbor stone-deck contact recovers, native desktop keys and CDP touch steering remain usable, free-water heading persists, and returning home clears the aid. Screenshots at 1440×900 and 390×667 were inspected.
- All 29 existing shared browser checks pass, including keyboard movement, normal surface breach, camera/collision behavior, pause and regional mechanics. Formatting and production build pass; the existing large-bundle warning remains.
- The first Mariana staging attempt pointed down an actual receding trench slope and had not yet contacted it when the assertion timed out. It correctly did not auto-level. The final contact regression stages on a legal, flatter floor; the game geometry and motion rules were not weakened to satisfy the test.
- The rebuilt restricted preview matches all eight compiled artifacts locally and through the public tunnel. Native English desktop and Chinese phone-sized touch flows both depart from the normal Atlantis spawn, dive with real controls, release input and recover from actual seabed contact to 0°. Both localized Guide explanations render correctly; no development API or page errors are present. Eight private-path probes are denied. The 176 runtime source fingerprints match the candidate. No staging API is used in these compiled-preview flows.
