# Atlantis key entrance guidance

Candidate dated 2026-11-02, based on published v0.11.25 (`3ce7215`).
The user accepts deep, concealed keys and asks for recognizable location hints.
This is a navigation change, not a new key layout or puzzle family.
The user subsequently authorizes committing and pushing this accepted candidate
to main as v0.11.26. See [the release record](release_v0_11_26.md).
The candidate and temporary-preview receipts below retain their original scope.

## Player behavior

- Conch inscriptions describe the selected building's city sector, visible
  architecture and entrance level. Leaving and returning to an inscription
  repeats the clue without opening a dialog or requiring another control.
- After reading a clue, a gold key-shaped minimap marker points to the public
  building entrance. An independent caption retains its name, entrance type,
  compass direction, horizontal distance and vertical offset even when a
  mechanism is closer. Both distances use the existing display scale.
- Memorial Hall distinguishes the deep-side upper entrance from the shallow-side
  lower entrance. Other descriptions cover Moonbay Sanctuary, the harbor sunken
  hall, Agora Colonnade, the underground archive channel and Poseidon's descent.
- Near the correct entrance, a once-per-expedition notification confirms its name
  and entry level. Confirmation requires horizontal proximity, an eight-world-unit
  vertical tolerance and unobstructed sight; it waits for existing notices to
  finish. No room coordinate or correct-side hiding spot is disclosed.
- Collecting the real key clears its marker and caption. A new expedition starts
  without revealed guidance; pause and terminal states do not discover entrances.

The ten hiding points, six named locations, exclusive puzzle/key selection,
physical routes, key capture, encounters, nutrition, timers, audio and rewards
are unchanged. No extra 3D asset, light, timer or rendering loop is introduced.
The Ocean Guide and all added player copy support Chinese and English.

## Verification

Evidence is retained under `.local/atlantis_key_guidance_20261102/`.
The preceding location audit and six delivered screenshots remain under
`.local/atlantis_key_guidance_audit_20261102/`; those screenshots are baseline
geometry evidence, not pictures of this candidate's interface.

The final focused suite passes 75 tests covering all ten clue descriptions,
real resolved entrances, occlusion/floor checks, once-only arrival, bilingual
copy, objective progression, hiding routes and the three existing puzzle families.
Formatting and the production build pass; there is no new full-suite claim.

Actual isolated Chrome checks pass in both locales: native menu/start, real
inscription contact and reread, wrong-floor navigation, same-level arrival,
pause/resume, real key contact, and Home/new-expedition cleanup. Test-only position
and site selection isolate those events; this is not an unassisted full run.

Fresh touch-emulated contexts at 390×667 (Chinese), 320×568 (English), and
844×390 (English) pass native controls and screenshots. Inspection caught and
corrected overlap with Slow Swim. At heights up to 700 px the compact key caption
retains name/direction/vertical offset; the full entrance description remains in
the inscription. The generic minimap caption and redundant sonar summary yield
space, while the return path, radar echoes, world labels and skill timer remain.
Screenshots and bounds confirm that the key caption stays above Slow Swim. Real
phone comfort, multitouch, GPU and thermal behavior remain unverified.

Initial resize-based mobile screenshots had an incorrect layout viewport and are
not accepted mobile evidence. `touch.json` and the `touch_390x667_*`,
`touch_320x568_*`, and `touch_844x390_*` images supersede them.

## Preview delivery

Temporary compiled preview: <https://store-fun-moon-own.trycloudflare.com/>.
Only `index.html` and fingerprinted runtime assets are served from the existing
loopback preview service (7188); source, package and Git paths are rejected.
The previous stopped service records were verified before renewal. The build
snapshot is retained by `.local/mini_preview_20261007/manage.py`; source and
artifact fingerprints remain there. At preview delivery, Main/Pages remained on
v0.11.25; the subsequent authorized publication is recorded above.

Public HTML and four changed/entry asset hashes match the final build. A native
public Atlantis select/start/control/pause/resume/Home run succeeds without a dev
hook or JavaScript exception (`preview_retry.json`). However, cold loading also
produced Cloudflare HTTP 429 responses; an earlier attempt stalled during startup.
The successful run does not establish reliable first-load delivery. This is a
known temporary tunnel limitation, not a claim of an error-free public network.
Local gameplay checks and public network receipts are recorded separately.
