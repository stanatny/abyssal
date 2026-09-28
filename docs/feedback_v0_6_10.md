# v0.6.10 Giant Squid default swimming and arm-region capture

On 2026-09-28, the user asked about real Giant Squid swimming direction and authorized restoring the earlier mantle-leading, arms-trailing appearance after verification. This round restores that default over v0.6.9 while retaining player animation, continuous contact, and all earlier uncommitted feedback. It is still a candidate: no commit or push, local committed baseline `94c2a95`, official Pages v0.5.1.

## Biological sources and decision boundaries

The [Iziko Giant Squid page](https://www.iziko.org.za/exhibitions/the-giant-squid-architeuthis/), written by researcher Martina A. C. Roeleveld, explains how a flexible funnel changes jet direction and distinguishes forward/backward movement, hovering, feeding, and cruising. It supports bidirectional movement, not an interpretation that Giant Squid can only lead with arms or only with mantle.

Section 3.3 and Figure 4 of [Robinson et al. (2021)](https://repository.library.noaa.gov/view/noaa/59467/noaa_59467_DS1.pdf) record a Giant Squid approaching bait, contacting it with tentacles and arms, then releasing it and jetting away. Jetting retreat is an observed event; the paper does not establish the frequency of everyday cruising directions. [NOAA's field report and video of the same observation](https://oceanexplorer.noaa.gov/expedition-feature/19biolum-logs-jun20/) provide a comparison of attack and retreat phases.

This review found no frequency evidence sufficient to claim that Giant Squid invariably or usually cruise with one particular end leading. Studies of other squid or colossal squid are not substituted for Giant Squid evidence. “Leading” describes travel direction and does not make the mantle tip the anatomical head.

**Game decision: restore mantle-tip / fin-end-leading, arms-trailing default swimming.** This follows the user's preferred earlier presentation and is a game default, not a claim about all real Giant Squid movement. No bidirectional swimming state machine is added. The v0.6.9 decision to fix the arm crown toward travel for feeding alignment is superseded; its history remains in the [previous feedback record](feedback_v0_6_9.md).

## Capture point and swallowing endpoint

After restoring orientation, the common forward-travel point cannot stand for the squid's arm region. Squid capture moves to model-local `+Z × 0.36 × length`, matching visible arms; orca remains at local `-Z × 0.36 × length`. Both transform through visible `avatar.quaternion`, keeping capture aligned during rapid turns.

The feeding transition still uses the real mouth anchor returned by `getFeedingMouth()`. Squid's mouth is local `+Z × 0.09 × length`; intake direction reverses with anatomical orientation. Capture range and mouth endpoint remain separate, gathering prey into the center of the arm crown rather than the mantle tip.

Both characters retain shared length eligibility, nursery bonus, contact radius, and occlusion. v0.6.9's per-frame relative-motion sweep remains without a larger radius. Orca stalk/fluke/pectoral motion, squid fin waves/segmented arms/mantle contraction/feeding closure, and existing speeds, abilities, and stamina all remain.

## Verification and delivery boundaries

This round passed 239 `npm test` cases and 11 `verify_player_v0_6_10` checks, and completed the production build. Public preview verified both characters at 1440×900, 390×667, and 320×568: 6 groups passed. JS/CSS and five audio hashes matched the local build, with no console errors. See [verification](verification.md).

Checks covered default posture, arm-region capture after turning, mouth coordinates, and continuous contact during sprint/jet. The next step is user natural playtesting of fish-catching feel and follow-camera motion. Changes remain uncommitted and unpushed; controlled scenes and browser-emulated phone sizes are not natural full-round or real-device acceptance.
