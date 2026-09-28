# Vacation shoreline, contact mines, and suction-only Frenzy

Date: 2026-09-28. Baseline: published `4a3aa8a` / v0.6.10. This record describes the candidate at verification time. It was later committed as `d6ad183` and included in the v0.6.12 release. The [reward follow-up](feedback_v0_6_12.md) supersedes its 30-second duration and initial suction range.

## Final decisions

The user requested a livelier Hawaii shoreline, spherical horned deep-water hazards, and a revised Frenzy reward. They subsequently canceled temporary feeding size and deferred growth, explicitly requesting simpler code. The final reward has **only a 30-second close-range suction effect**. The abandoned temporary-size and digestion implementation, state fields, helper APIs, constants, and copy have been removed rather than left disabled.

Ordinary prey must always be strictly shorter than the real player. Collecting Frenzy changes neither mass nor length, and feeding continues through the original healing, hunger, and permanent growth calculation. Expiry removes the range bonus and suction without touching earned growth. Repeated pickup refreshes the duration. There is no secondary growth ledger or conversion step.

Frenzy modestly expands ordinary fish contact tolerance by 30%, capped at an additional 1.6 game meters. An outer suction band adds 2–5 meters according to real player size. Eligible nearby underwater creatures move toward the existing character-specific capture point, then use the same continuous contact and mouth-directed feeding transition as other meals. Line-of-sight checks prevent feeding through reefs or hulls. Larger creatures, lords, mines, and submarines are not pulled in. Above-water prey and airborne players do not receive the underwater bonus. Orca and Giant Squid retain their established anatomical contact points.

Abyss Lords require **25 real meters**, matching the user's stated late-game threshold. Frenzy no longer reduces it to 21 meters. Sonar, encounter attempts, damage rules, HUD objectives, and the guide use the same threshold. Multiple flank attacks, disengagement, and recovery windows remain necessary.

## Presentation

- The northern nursery shore now has continuous sand and wet shoreline, umbrellas, loungers, palms, adult holidaymakers, and an original Diamond Head-inspired ridge. This is scenery beyond the swimming boundary, with no new land controls or edible beach NPCs. See [beach visual notes](beach_visual_notes.md) for official references, adaptation, cost, and actual images.
- Spherical horned **Contact Mines** replace the old torpedo shape. The ocean and guide share a detailed shell, seams, bolts, fittings, horns, and restrained warning lights. The 3.6-meter visible envelope uses a matching 1.8-meter contact radius. Twelve hazards and 28 contact damage remain; each mine explodes only once. The internal `torpedo` identifier is retained to avoid an unrelated data migration.
- Frenzy uses soft curved intake trails converging toward the capture point, with onset and expiry fades. Fourteen streams in high quality, eight in smooth mode, share one fixed vertex buffer, one material, and one small generated texture. No extra animation loop is created. Pause freezes the scene; restart hides the effect.
- Reward descriptions, guide tips, HUD names, mine warnings, English translations, and the README describe the final suction-only behavior. Historical feedback documents retain their original rules as history.

## Verification

Final checks and evidence are recorded in [verification](verification.md). Controlled captures isolate models or feeding cases; they are not natural full-session balance tests. Browser viewports do not establish physical-phone performance or touch feel. Existing recorded feeding sounds and explosion feedback are reused, with no new audio assets or listening claims in this update.
