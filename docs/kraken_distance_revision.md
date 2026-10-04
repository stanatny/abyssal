# Kraken distance-based restraint review

This uncommitted follow-up follows local checkpoint `55f999f` and preserves the subsequent Europa combat, rare-eye and touch-layout candidate. Formal v0.10.1 is unchanged.

## Implemented contract

Kraken's existing warned vortex, approach, grip and delayed bite remain. Pull and stamina pressure now depend on distance to the **animated central mouth**, rather than a constant force everywhere. `krakenGrappleForces()` in `src/lord_special_rules.js` supplies the shared curve; each encounter owns and reuses its output object.

```text
r = clamp(mouthDistance / 27, 0, 1)
proximity = 1 - r*r*(3 - 2*r)
force = far + (near - far) * proximity
```

| Effect                              | Near the mouth | At/beyond 27 world units |
| ----------------------------------- | -------------: | -----------------------: |
| Vortex pull toward its fixed core   |     24 units/s |               10 units/s |
| Held-arm pull toward the real mouth |     18 units/s |                6 units/s |
| Additional stamina loss             |     9 points/s |               3 points/s |

The two pulls do not stack during a grip. Additional stamina drains once per update during an active pull or grip, including the transition into capture. After the vortex moves the player, the actual mouth distance is measured again before grip force and eligibility are resolved. Terrain and cover still block displacement.

The warning lasts 2.3 seconds. Sustained exposure of 0.55 seconds inside the 14-unit core, within 22 units of the real mouth and without cover, initiates the grip. The player retains input and a 1.5-second escape window. Moving more than 27 units from the mouth or breaking solid-world line of sight cancels it. Otherwise one 60-point base crushing bite is delivered; shared armor/invulnerability still applies. An escaped or completed grip cannot capture again during the same attack; recovery remains four seconds. Eligibility, three-hit defeat, regional objectives, ecology and models are unchanged.

Counterplay is to sprint outward early at the warning, not wait until pressed against the maw. As distance grows, restraint continuously weakens. Rock cover remains an alternative. A prepared sprint can escape even the innermost rule-level fixture; this is not a promise that a late reaction from rest, depleted stamina or an unfavorable facing will always succeed. No speed, cooldown or damage bonus is granted to compensate for poor positioning.

## Presentation and evidence

Both languages' independent Kraken skill card, biography response and grip warning describe the distance gradient and early outward escape. No extra scene lights, effects, RAF loops or populations are added.

Ignored evidence is under `.local/kraken_distance_review/`: before-source snapshots, focused rule/integration logs, native four-character grip escape, controlled near/far comparison, held-state pause, bilingual Guide and 320-pixel warning captures. Compiled local/public receipts and the final manifest are recorded in [verification](verification.md).

Fresh focused verification passes 52 rule, encounter, guardian, skill-card and localization tests, formatting and the production build. The existing large-bundle warning remains. A matched native Giant Squid test starts slow swimming with full vitals, facing outward, at 10 versus 20 world units from the mouth. Actual Space input escapes in about 1.20 versus 0.55 seconds, using about 23.3 versus 9.6 stamina points respectively, with no damage. Those stamina figures include ordinary sprint consumption, not only Kraken's extra drain. All four protagonists also escape the sampled naturally initiated outer grip. A held-state pause freezes grip time, position and vitals; returning home clears the grip.

Actual English desktop and Chinese 320/390-pixel Guide views match the shared timings and distance rule. Both narrow native grip warnings are readable alongside the control triangle without page overflow. Intermediate test-harness failures are retained separately; no gameplay rule was altered to make the screenshots pass.

Controlled encounters establish the intended rule and input behavior; they do not establish natural full-round difficulty, physical-phone hand feel or thermal performance. Timing varies with native frame scheduling. Compare matched initial speed, character, facing and stamina before interpreting a near/far difference.

## Rollback

Restore only this follow-up's five source snapshots from the ignored review directory, undo its focused test and document additions, and rebuild the candidate. Do not reset to `55f999f`: that would discard the previously delivered uncommitted Europa and touch work. The restricted preview keeps its previous compiled build and manifest for runtime rollback. No commit, push, main integration or formal release is authorized.
