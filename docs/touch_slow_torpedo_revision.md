# Faster torpedoes and touch slow swim

The subsequent [ordinary durability follow-up](torpedo_durability_revision.md) changes equal/larger ordinary creatures to two hits; the three-hit observations below remain historical. Lords still require three valid hits.

Historical review: the later [homing and feeding follow-up](homing_feeding_revision.md) replaces the earlier limited steering corridor; its range, costs, 2-second cooldown and touch controls remain current.

Uncommitted follow-up on `feature/mechanical-shark`, after accepted local checkpoint `8d55481`. The user requests a 2-second Mechanical Shark torpedo interval and a mobile Slow swim button. Prior yellow retaliation markers remain in this candidate. No push, main integration or formal release is authorized; published Pages remains v0.8.3.

## Implemented behavior

Depth Torpedo now has a **2-second active-time cooldown**, using the existing `MECHANICAL_RULES` source for runtime eligibility, skill progress and Guide values. Selection ability details expose the configured cooldown for each character. Fixed payments remain 10 health and 10 stamina, with health strictly above 10. Aim correction, 140-unit range, 70-unit speed, 14-unit blast, relative one/three-hit rules and the real 25 m lord threshold are unchanged. The two-projectile pool remains bounded; maximum straight flight still takes about two seconds. Pause freezes both flight and cooldown.

The mobile **Slow swim** control is momentary: hold to approach the existing 5 m/s speed and release to restore normal cruising. Actual sprint retains priority when held simultaneously. It is available to every character and in Mariana's post-victory tour. Touch slow state is independent of keyboard K; releasing one cannot clear the other. Pointer capture handles releases outside the button. Cancellation, lost capture, pause, page suspension and return home clear its pressed state through existing input cleanup.

Portrait layouts place the smaller slow control between the joystick and skill/sprint group. Very narrow layouts use 48 px hit targets and the existing compact joystick/skill sizes. Landscape places slow above sprint, keeping the vital bars clear. Existing future two-skill layout remains available. The control is included in marker occlusion checks and has a localized hold hint and pressed-state styling. English/Chinese pause help and README explain the gesture.

## Verification

All 763 unit tests, 42 focused rule/aiming/steering/localization/Guide checks and 29 shared browser checks pass, with formatting and production build. Seven actual development-runtime views cover English/Chinese, all four characters, desktop, 320 px short/tall portrait, 390 px portrait, two narrow landscapes and a tablet. Native CDP touch gestures verify held 5 m/s movement, release outside, cancellation, simultaneous joystick/sprint, independent keyboard K and pause cleanup. Mechanical Shark uses a real second shot after two active seconds, with frozen paused cooldown and the same two-projectile pool. Controls have at least 44 px hit targets, stay on-screen and do not overlap each other; no page/console errors or horizontal overflow were observed. Landscape inspection also removes excess movement-label letter spacing so Slow swim does not spill into the skill control.

The rebuilt restricted candidate passes six native compiled cases across local and public hosts: English desktop, Chinese portrait and English narrow landscape on each. They verify the 2-second cooldown, repeated fire, both-language Guide and selection copy, mobile hold/release, pause help and home cleanup. Final landscape measurements confirm the movement label does not overlap the skill button. Production exposes no development debug API. All eight artifacts match exactly per host (16 byte-hash receipts), and all 210 runtime source fingerprints match the candidate manifest. No page/console errors or horizontal overflow were observed. Raw reports and actual served screenshots stay in ignored `.local/touch_slow_torpedo/`. Historical Mechanical Shark measurements used the earlier 5-second cooldown and are preserved in their original reviews.

Viewport emulation is not physical-device ergonomics or a thermal measurement. This change makes no frame-rate or phone-temperature claim. Natural repeated-fire resource balance remains subject to player review.
