# Lord attack-window feedback — 2026-11-11

## Scope and checkpoint

The accepted marine-wildlife, terrain-contact and naval-threat work is locally
committed as `eed09c6` (`feat: refine marine wildlife, terrain contact and naval
threats`). It is not pushed. This separate boss-feedback candidate remains
uncommitted for player review; main/Pages stays v0.11.27.

The player reports apparently invulnerable lords before attacks and damage only
afterward. Preserve the existing combat timing, hit requirements and real body
contact; make each lord's actual current opportunity and failed attacks readable.

## Actual combat rules

Most ordinary lords permit an initial inward side, rear, dorsal or ventral bite
before their first skill. Their frontal armor remains protected outside recovery.
White Tiger and Sword Sage permit damage only during recovery. Black Tortoise
additionally closes its shell during windup and attack. Ranged weapons do not
require a flank but respect the same protection and one-hit opening.

A successful bite, torpedo or corpse blast consumes the shared opening. Only the
next completed attack entering recovery refreshes it. Cooldown, disengagement,
ink, return and re-entry do not. The actual 25 m gate remains, with three valid
hits normally, four for Black Tortoise and five for Sword Sage. Recovery is an
attack opportunity rather than safety: lords still reposition and can deliver
the existing warned frontal counter.

## Changes

- One presentation helper derives status from the real size gate, guardian lock,
  configured guarded phases, counter phases, opening latch and valid-hit count.
  Its availability describes window permission, not range, contact angle,
  occlusion, weapon resource or cooldown.
- The existing boss panel now shows a compact status badge and an action/reason
  line: flank available, counter now, opening used, defended, too small or locked.
  Recovery shows the real remaining phase time and one-hit limit. Every badge
  carries actual X/N progress.
- White Tiger no longer receives the Sword Sage's sword-ward explanation.
  Mechanical Shark's reticle now checks Black Tortoise's guarded phases too,
  preventing an apparently ready shot during shell protection.
- Real failed body contacts and ranged impacts can show their specific reason
  inline. Valid hits briefly show progress and disengagement guidance. Repeated
  identical failures do not extend the notice or overwrite a successful hit.
  Notices expire on the active game clock, freeze on pause and are discarded
  when the applicable window changes. Reset, pooled reuse and defeat clear them.
- Existing mobile layouts hide ordinary notifications during boss fights; inline
  advice keeps the combat result visible there. Compact wrapping supports both
  languages without an additional control or modal panel.
- Gold marks an attack opportunity. Existing red/orange danger cues remain.
  Recovery has one short badge pulse; reduced motion disables it. No new model,
  geometry, material, light, audio asset or production update loop is added.

## Verification record

Focused helper tests compare all 18 lord kinds across seven phases and the real
melee, torpedo and corpse-blast settlement methods: 378 cases. They also cover
full opening refresh cycles, size/angle/contact/cooldown failures, final hit
counts and actual bilingual rendering. Encounter integration checks exercise
real successful bites and protected torpedo settlement, feedback priority,
duplicate suppression and inactive-pool reset.

The full unit suite passes: 2,253 tests, zero failures (129.2 seconds). A later
presentation-only adjustment clears cooldown/contact-reset advice as soon as the
corresponding live condition recovers; the native cooldown check below verifies
that correction. No combat-rule implementation changed.

Native rendering covers 56 touch-emulated cases across 1440×900, 390×667,
320×568 and 844×390 in both languages, plus 14 true desktop-pointer cases.
After an eight-pixel narrow-panel clearance adjustment, all 14 cases pass again
at 320×568. There is no horizontal overflow or overlap with the joystick/skill
controls; reduced motion disables the arrival pulse. The original desktop/tablet
combat stack can still cover part of a lord at a fixed forward camera angle.

A separate native mobile interaction check uses actual automatic body contact:
front contact is blocked without credited damage and explains the armor; a
cooldown failure clears when the real cooldown expires in the same phase; a
valid body bite changes Kraken health from 180 to 120 and shows valid hit 1/3
with the opening spent. Native Pause freezes the notice clock, Resume works,
and pooled reset clears inactive feedback before returning Home. These fixtures
use fixed positions and frozen phases to isolate feedback. They do not establish
natural fight timing or physical-phone performance. No FPS benefit is claimed.

A final focused suite passes 125/125. The native Mechanical Shark fixture
checks the actual aim selector: Black Tortoise is unavailable during windup and
attack, available during unused recovery and unavailable after the opening is
spent. A real ranged settlement rejected with the generic `ineligible` result
because of cooldown also clears its inline cooldown notice immediately when the
actual player cooldown expires, before the 2.6-second notice lifetime. This is a
presentation-only follow-up to the full-suite run.

The compiled restricted preview retains the same origin and old hashed assets.
Its first public smoke passes fresh English touch entry, movement, Pause/Resume,
Home and the all-region Kraken/White Tiger Guide in both languages. Cold
initialization is 49.0 seconds in that run, with no page errors or failed/bad
requests. Production exposes no development hook. That receipt precedes the
last generic-ranged-cooldown presentation correction; the refreshed artifact is
checked separately in the final preview receipt.

Evidence: `full_tests.log`, `focused_final.log`, `browser.json`, `desktop.json`,
`narrow_final.json`, `interaction.json`, `reticle_final.json`,
`public_pre_final_cooldown.json` and their screenshots under the ignored
`boss_feedback_20261111` task folder. Compiled final preview checks are recorded
below after verification.

### Final compiled delivery check

The refreshed final build passes public English touch and Chinese native-entry,
movement, Pause/Resume, Home, locale and Kraken Guide checks. Cold initialization
is 48.6 seconds, with zero page errors, failed requests or bad responses; no
public development hook exists. Nine representative public shell, bootstrap,
engine, encounter and feedback artifacts match their build hashes. All 976
served runtime artifacts and all 2,197 recorded source inputs match before this
final verification-only review paragraph. No FPS or other-device network claim
is made. See `public_final.json`, `public_assets.json` and
`fingerprints_final_build.json`.

Only the task-owned development server on 5190 is stopped after exact process,
cwd and listener checks. The restricted loopback preview on 7188, its existing
tunnel, old immutable assets and archived runtime snapshots remain available.
The feedback source remains uncommitted/unpushed for player review.

## Overlay consolidation follow-up

The player accepts the information but finds the simultaneous cards obstructive.
This supersedes the previous multi-card presentation, while preserving every
combat rule and the accepted local checkpoint. No commit or push is requested.

### Changes

- Display one identity/health card with one inline action area. Remove the
  separate phase/tip row, framed status badge, diamond and badge pulse.
- Fold the duplicate locked-on card while a boss card is visible. Retain the
  character lock cue, real multi-pursuer count and release feedback afterward.
- Choose one action message: actual skill/grapple/recovery-counter danger first,
  then a still-valid actual hit/block result, a current encounter notice, or
  short default attack advice. Keep recovery time and X/N progress. A successful
  hit no longer repeats its progress in both title and advice.
- Ordinary notifications use this same area during battle instead of another
  card. Pre-encounter notices do not occupy it, and notices expire normally
  without a delayed queue. Actual independent threats and ink remain separate
  compact warnings; urgent external attacks retain their real dodge instruction
  and do not duplicate that warning inside boss advice.
- Shrink the wide touch-tablet combat strip to a left-side card. Preserve small
  portrait/landscape controls, native Pause/Resume and the original gameplay.
  No model, light, sound, production loop or new control is introduced.

### Fresh verification

The relevant rule, encounter, lock, recovery, opening and localization suite
passes 98/98. This is this follow-up's run; the prior 2,253 full-suite record
above retains its earlier source scope. The compact-helper tests cover message
priority, live cooldown/rearm expiry, real recovery time and both locales.

Matched original-source fixtures contain six before cases. The candidate passes
70 rendered cases across desktop, 390×667 and 320×568 portrait touch, 844×390
landscape touch and 1440×900 tablet touch, in both languages. Each no-other-hazard
case contains only the boss card, with the original skill direction preserved,
no horizontal overflow and no overlap with joystick or slow/skill controls.
Reduced motion has no badge animation. Native contact, multiple-pursuer count,
release and pause checks pass; the final external-warning check is recorded in
its own receipt.

In the matched 390-pixel Chinese counter fixture, the visible battle stack falls
from 200.5 to 54.6 CSS pixels high. Desktop falls from 232.1 to 66.3 pixels; the
wide tablet card narrows from 1,216 to 420 pixels. These are controlled layout
measurements rather than FPS or physical-device usability measurements. The
English Tiger danger sentence remains complete at 320 pixels, with about 69
pixels before the slow-swim button in that fixture.

Evidence in the ignored `boss_hud_compact_20261111` task folder:
`baseline.json`, `browser.json`, `matched_layout.json`, `focused.log`,
`compact_tests.log`, `interaction.json` and matched
screenshots. Positions and combat phases are controlled to compare actual HUD
rendering. No natural fight timing, physical-phone comfort or other-device
network result is claimed. Compiled delivery is checked below.

### Consolidated preview delivery

The final native interaction receipt additionally primes the actual submarine
windup through its defense update and creates a real ink cloud. Both the urgent
lateral-dodge instruction and ink warning remain visible, while the same warning
is not repeated as an ordinary boss notice. Real hit progress appears once;
multiple pursuing encounter entries retain their compact count, and retirement
restores release feedback.

The refreshed compiled preview passes native English touch and Chinese entry,
movement, Pause/Resume, Home, locale and Kraken Guide checks. Cold initialization
is 52.6 seconds in this run; page errors, failed requests and bad responses are
all zero, and no development hook is exposed. Nine representative public
artifacts match their build hashes. All 976 runtime artifacts and all 2,197
recorded source inputs match before this verification-only review update.
See `public_final.json`, `public_assets.json` and `fingerprints_final_build.json`.

Only the identified task development servers on 5190/5191 are stopped after
process/cwd/listener checks. The restricted preview on 7188, existing tunnel,
original immutable assets and archived runtimes remain. This candidate stays
uncommitted/unpushed for player review.
