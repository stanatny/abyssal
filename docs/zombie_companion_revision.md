# Zombie companion accessibility and deliberate detonation

Publication update — 2026-10-11: the user authorizes this accepted revision for commit and main publication in [v0.11.7](release_v0_11_7.md). Candidate-only/uncommitted statements and measurements below retain their historical meaning; they do not block this release or authorize future releases.

Status: local candidate on `fix/mobile-touch-keyboard`, based on published v 0.11.6 / `3605bc 9`. The accepted preceding mobile touch/keyboard candidate is retained. No commit or publication is authorized for this revision.

The user reported a useless companion at the old 5 m summon threshold, wanted earlier access with a 3 m ordinary-prey allowance, intentional lord charges and protection against an accidental immediate second press.

## Rules and implementation

- Remove the length gate. The starting 3 m Zombie Shark may summon if health/stamina/hunger each reach 50. All three pay 50 atomically; exactly 50 health still causes death. One living companion, 60 active seconds, no cooldown after its explosion.
- Ordinary hunting ceiling is `max(3, owner.length - 5)` meters, inclusive. This is a ceiling floor, not a minimum prey size: tiny prey remain edible. Registered rares must still be smaller than the owner. Normal hunting excludes lords/vehicles. Real contact and occlusion precede shared confirmed-prey settlement, so exactly 3 m prey credits a 3 m owner; ordinary owner mouth and blast-meal eligibility are unchanged.
- `getCharacter("zombie_shark").active.detonationDelay = 2` supplies a short active-time protection. Both input and minion command entry reject presses while forming or before the delay ends. No command is queued. HUD shows Splitting, then Ready in 1s, then the usual remaining life; protection freezes at pause. Recast starts a fresh protection. It does not lengthen lifetime or add a post-explosion cooldown.
- A deliberate command prioritizes an unlocked, enabled, size-eligible lord whose visible body is within 32 m and unobstructed, otherwise the nearest ordinary target. Nearest distance breaks ties within each class. Lock once and pursue at the existing 48 m/s; do not retarget. Original 25 m/ward/guard/opening/cooldown damage rules remain, including recovery-only damage to the Sword Sage.
- Existing center-to-surface approach triggering is retained. Actual movement contacts with the locked lord's posed body also trigger a local explosion, after verifying its visible surface is within the existing 14 m blast and not occluded. Do not require the companion center to penetrate the rigid body, count terrain contacts as lord hits or explode remotely.
- No target leaves normal hunting/lifetime intact. Retirement/cover/leash loss causes local explosion. Expiry wins before further pursuit. Home/reset/death/region cleanup does not attack. Accepted art, effects, sound and resource reuse remain unchanged.

## Diagnosis and evidence

Evidence directory: `.local/zombie_companion_revision_20261011/`. `mobile_baseline_manifest.json` preserves 715 preceding source hashes; all matched before editing. Established 5188/7188/20248 services and their process identities are retained.

The prior 5 m rule gives an ordinary-prey limit of 0; this explains the empty new-player hunting behavior. The prior code could already damage lords, but nearest-only acquisition lets nearby small fish take the command. Controlled before probes against Kraken, Leviathan and Sword Sage already damaged an available opening, so this revision does not claim lord damage was wholly absent. The new acquisition and body-contact handling make deliberate charges more reliable without widening lord eligibility.

### Completed checks

- `npm test`: 1, 183/1, 183 pass. Includes actual 3 m companion contact/settlement, exact resource and size boundaries, independent rare capture rules, protection without queued commands, pause, expiry, no-target retries, real posed-body collisions, lord priority/exclusions and shared one-hit openings. `npm run check`, production build and `git diff --check` pass.
- `scripts/verify_zombie_companion.mjs`: headed Chrome DEV desktop Chinese, 320 px English and 390 px Chinese pass with no page errors. Native clicks/keyboard/taps operate summon, repeated input, pause/resume, no-target retry, actual ordinary meal, one lord charge and immediate recast; real minion meal count reaches one. DEV fixtures isolate a real 3 m fish and a live lord recovery; normal movement, body collision and settlement remain active. These are not natural encounter-rate measurements.
- The same native controls and bilingual Guide pass on the local compiled Chrome build (three cases) and public compiled WebKit build (three cases, plus the 320×568 /390×667 short-screen pass). All compiled cases have no development hooks. Actual Guide and HUD screenshots inspected; no horizontal overflow or scale change observed.
- Preceding mobile behavior rechecked on the current public build with `scripts/verify_mobile_touch.mjs`: three WebKit touch layouts (390×844 Chinese,320×568 English,844×390 English),12 checks, zero page errors. Repeated taps, hidden/disabled Guide search, play/pause/help/Home/records, focus and same-address refresh pass. The initial gateway502 retry passes without any service change.
- Public/local runtime: all 11 resources match the built artifact hashes; 18 source/private traversal paths per origin are denied. Tunnel readiness passes and established process identities remain unchanged. Runtime before this candidate is retained at `.local/mini_preview_20261007/runtime_before_20261011_122418`; older assets remain for existing clients.

The browser probe's initial lord fixture placed the owner close enough to land a melee hit, or left the companion outside acquisition range. The final fixture stages the lord nearby and faces the owner away; only then is a native detonation command accepted as evidence. Raw pilot reports/screenshots remain labeled in the evidence directory. A public mobile regression attempt encountered a transient Cloudflare502 page (preserved under `mobile_regression_gateway_502`); bounded retry uses the same service without restarting it. A previously unsafe optional species access in the minion's debug snapshot was corrected when testing state-based lord targets. Earlier unit assertions for the superseded 5 m rule were synchronized; the final full-suite result above is fresh.

Desktop Chrome/WebKit touch emulation cannot establish physical-phone multitouch, keyboard appearance, frame rate or temperature. Natural full-round difficulty and whether the 2-second protection feels right remain user acceptance items. The candidate keeps the accepted mobile input correction; no game code is published yet.

### Replay and delivery

Use `ABYSSAL_DEV_URL=http://127.0.0.1: 5188/ ABYSSAL_REVIEW_OUT=<ignored evidence directory> node scripts/verify_zombie_companion.mjs` for controlled DEV cases. Set `ABYSSAL_PREVIEW_URL=http://127.0.0.1: 7188/` for compiled cases, or the public origin and `ABYSSAL_BROWSER_ENGINE=webkit` for WebKit. Run native browsers serially.

Preview: https://saver-recorded-digit-could.trycloudflare.com/?review=zombie-companion-20261011 . Rebuild with `python 3 .local/mini_preview_20261007/manage.py rebuild`; it preserves service identities and archives the prior runtime. Status: `python 3 .local/mini_preview_20261007/manage.py status`. Stop only if requested using that manager's identity-checked `stop tunnel awake preview dev`. Logs and source/artifact fingerprints stay under `.local/mini_preview_20261007/`; this revision's completion receipt binds the final evidence and hashes.
