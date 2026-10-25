# Ordinary predator charge contact — 2026-10-26

Accepted for main publication — 2026-10-26: the user approves this delivered
repair and the Amazon work. The candidate labels below retain their historical
verification scope; release verification is separate.

## Scope and baseline

The user authorizes committing the accepted Amazon redraw, then fixing large
ordinary hunters whose charge passes the player without biting. The Amazon work
is saved separately as `b1dc929`; this combat candidate is uncommitted and is not
a main release. Camera behavior, all accepted models, species stock, attack
speeds, warning/recovery/cooldown durations, damage multipliers and eating
eligibility are preserved.

## Diagnosis

A native Chrome Atlantis fixture starts a real Ichthyotitan 40 m behind a
normally cruising 30 m player, then allows the actual AI and movement to run.
Both a straight and a 6 m offset approach miss throughout the active charge;
the first 48-health bite arrives only during recovery. The same 25 m case
lands the original 67.2-health active attack. These are controlled encounters,
not encounter-frequency measurements during natural exploration.

The near-sized edible branch aims 0.24 player lengths sideways (7.2 m for a
30 m player), outside the original combined mouth/body radius (5.86 m), while
also aiming behind the player. The post-hit rear-follow branch explicitly
excludes edible hunters, including the yellow-marked Ichthyotitan that still
retaliates at 30 m. Separately, the mouth sweep rejects an entire frame using
its final facing relationship; a fast crossing can already have passed the
player by then. It also constructs both mouth endpoints from the final heading.

## Repair

- Keep the side/rear approach, but aim at the existing rear-body sample and
  bound the lateral offset by 35% of the unchanged contact width. This fixes an
  unreachable aim point rather than enlarging the hit volume.
- Extend the existing post-hit following to still-dangerous, yellow-marked
  large swimming hunters. A successful damage event starts braking and rear
  pursuit. Real mouth contact and the existing 2.2-second bite cooldown remain
  necessary; no glued attachment, teleport or automatic repeated hit is added.
  Losing pursuit/threat eligibility still clears it; land, air and benthic
  movement remain on their own paths.
- Sweep the old and new posed mouth/torso endpoints. Evaluate facing at the
  relative contact time, so a valid frame-internal strike is not discarded just
  because its final position is beyond the player. Player eating still settles
  first; edible hunters retain the frontal-capture exclusion.
- Retain existing bounded burst steering, nursery/territory checks, obstacle
  cancellation, body separation, pause and lifecycle handling.

The shared burst/heavy-bite roster contains 17 ordinary kinds: Hammerhead,
Great White, Sperm Whale, Dunkleosteus, Pliosaur, Plesiosaur, Mosasaur,
Basilosaurus, Megalodon, Ichthyotitan, Forkjaw Stalker, Prism Hunter, Rift Reaver,
Void Siphon, Black Caiman, Saltwater Crocodile and Rootback Colossus. They share
the corrected contact/aim path; not all use the same dimensions, region or
ability profile. Ordinary predators without these skills also use the same
bite-contact helper. Lords have a separate encounter solver; do not replace
those attacks with ordinary bite logic.

## Verification and limits

Evidence: `.local/predator_charge_20261026/`.

- `before/` and `before.log`: original 30 m misses and 25 m hit. This first
  fixture subsequently lets the 25 m player die, so its last whale case and
  pause attempt are invalid; they are not evidence of a whale bug.
- `tests/predator_charge.test.js`: shared 17-kind swept contacts and negative
  facing/frontal/lateral cases, both flank choices for long-range profiles,
  original-size 30 m contact, bounded post-hit following, turning pose endpoints
  and a retained lateral sprint escape.
- `native_final/`: real-loop 25/30 m Ichthyotitan and near-sized Sperm Whale
  active hits, post-hit rear positions, actual keyboard turn/sprint escape and
  frozen pause. The initial Megalodon is incorrectly staged away from its
  regional resident anchor and turns home; keep that observation separate
  from an attack defect. A follow-up uses its actual resident anchor.
- `full.log`: all 1,790 tests pass, including original body-contact, hunter
  cancellation/nursery, feeding and lord/Rootjaw charge checks. `check.log`
  passes. This is functional coverage, not a physical-phone performance claim.

The resident-anchor Megalodon follow-up lands its original active charge and
keeps the post-hit rear goal. All five valid non-dodging native cases hit in the
active phase; the keyboard turn/sprint case escapes without damage. Final
assertions retain the intentionally invalid first Megalodon placement separately.

The rebuilt preview serves `index-C2P8NAHv.js`. All 599 dist/runtime files match;
seven changed/key files per origin (entry, compression, CSS and three predator
colors) match loopback and public HTTPS. Eleven source/directory paths are
rejected; all four service identities are preserved. One public curl request
receives an empty reply before its bounded retry succeeds. Native production
English desktop and Chinese 390 px emulation both pass start/pause/Home and
same-address refresh without page/HTTP errors or production hooks. Navigation
cancels four in-flight scenery requests during Home/reload; those cancellations
are retained in the log. This is not a physical-phone or other-network test.

The delivered short clip shows a staged straight chase/contact followed by a
separately staged native keyboard turn/sprint escape, using the normal camera.
The NPC is initialized once per case, not pinned every frame; video is cropped
from the recorded real-time sessions and fully decoded after H.264 encoding. This changes successful
contact frequency, so practical difficulty still awaits user playtesting;
no new attack strength, hitbox growth or perfect homing is introduced.
