# Bermuda Leviathan habitat repair

This uncommitted follow-up is based on published v0.11.2 / `ae9c7a7`. The user reported that Bermuda's Leviathan appeared buried and unable to patrol, confirmed the diagnosis, and authorized a fix. It is a regional placement correction; the published Pages build remains v0.11.2.

## Cause and retained change

The enlarged liner's support bed extends to z−990. At the old fixed home `[-70, -590, -995]`, the authoritative seabed is y−491.558: the spawn center is 98.442 m underground. The floor projection demands another 15.6 m of clearance, while the unchanged home leash permits only 108 m displacement. Repeated floor lifting and home projection conflict. Nearby engagement can temporarily move the creature, so this was not permanent immobility in every state.

Move only the Bermuda instance home to `[185, -590, -995]`, in the eastern deep-water channel. Preserve depth, 63 m model, radius 86, shared navigation, attack timing/speed/damage, three-hit settlement, eligibility, food stock, rewards and objectives. No new text or Guide rule is required: the Guide does not expose fixed coordinates, and both languages retain the same lord description.

## Habitat evidence

Before selection, compare whole animated poses, real terrain triangles and static solids rather than only the center height. A 120 s controlled patrol covers 7,200 update frames and 241 sampled poses at the retained home: no sampled terrain burial or solid-surface intersection, minimum body-to-floor clearance 6.739 m, and 378.25 m continuous travel. The complete radius+22 horizontal center envelope stays inside WORLD with 7 m margin. A 32 m approach through the wreck's upper stern route and eastern descent is sweepable. These are controlled geometry/controller checks, separate from native browser play.

Southward alternatives either intersect the extended bed or static spires, or place part of the center territory beyond the playable boundary. Preserve these rejected receipts. A preliminary regression wrongly used the playable-character multi-sphere proxy for the lord. It hit `bermuda_spire_27` although the actual posed lord triangles remain separated by at least 0.744 m at the failing checkpoints. Correct the test oracle to check the real lord surfaces; retain its floor and rendered-triangle checks and the failed receipt. No collision tolerance or gameplay rule is changed to satisfy the test.

## Verification and limits

The native development check observes 15.027 s of normally integrated dormant patrol with 23.080 m net displacement. Separate fresh-round player setups use native slow/swim/sprint input to trigger hunt, windup and charge, then disengagement, return and resumed patrol. Both players survive the sampled cases without vital or clock edits. Two paused populated-scene inspections each check all 87,186 posed vertices: no burial, with minimum floor clearance 13.716 m during windup and 29.549 m after return. Pause freezes encounter position and the movement clock; returning home restores the fixed home. No browser errors are observed. These fixtures distinguish the capped movement clock from the uncapped survival clock and do not claim a full natural fight.

Current verification results are recorded in [verification](verification.md). Raw diagnosis, rejected homes, exact-update geometry, native flow, screenshots, failures and delivery fingerprints live in ignored `.local/leviathan_review_20261008/`. Restricted previews expose only built HTML/assets; the prior runtime and existing service identities are retained for rollback. This fix is not committed, pushed or formally published.

Controlled player staging and headless native input do not establish natural full-round progression, subjective battle quality, physical-phone behavior or sustained performance. The repair addresses the reported Bermuda habitat regression rather than redesigning general aquatic terrain navigation.
