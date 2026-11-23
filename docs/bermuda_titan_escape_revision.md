# Bermuda slumber-lair candidate — 2026-11-21

This uncommitted candidate extends the previously expanded Bermuda map. It does
not expand the current boundary again or move the lair back toward the nursery.
The published version remains v0.11.31; no commit, push or version bump is
included. Older straight-beam media and tests remain historical evidence.

## Place and encounter

The Titanic is centred at (-65,-650), with its seaward end near z=-950. Continue
south, down the existing seabed slope, to the north entrance at (-85,-1415).
The main chamber is centred at (-85,-1555); the private rear den continues west.
Seven sparse biological films reuse one existing merged draw and material,
adding 1,232 triangles. Their actual triangle surfaces stay 0.0793–0.0818 m above
the rendered floor and outside the liner, rig and other solids. Every original
cave contact and shell vertex/index remains unchanged by these hints.

The original HF front half lies prone with forearms crossed over the amber
heart. Its real posterior continues into the darker western annex. The three
seals retain the visible wave, bone, flame order. Cooldown relaxes the arms;
collection still requires the actual character intake within eight metres of
the heart centre and an unobstructed path. There is no enlarged invisible
pickup region. Orca, Mechanical Shark and Zombie Shark use their actual mouths;
Giant Squid retains both original intakes and approaches from above.

Taking the heart slackens the protective arms and starts partial awareness and
sixty active real-time seconds to escape. Pause freezes the timer. The whole
body must cross a real north or south opening and remain safely outside while
both physical rock doors close over three seconds. Fatal expiry seals the cave
without securing the heart. Four existing lord defeats plus a safely recovered
heart complete Bermuda; the titan is not an additional killable lord.

## Diagonal, irregular breath

The actual head leans by at most 0.035 radians; the mouth follows the same posed
skin. Water flame then curves diagonally forward and down through up to seven
overlapping lanes. Three profiles vary width, sweep, cooldown, charge and
release, including a genuine 0.65-second gap between two surges. The first three
profiles are learnable; subsequent cycles use a stable integer hash, never
per-frame randomness or homing toward the player.

Charging first brings the head into position over 0.35 seconds, then previews
the forthcoming sweep from that actual mouth. The head returns smoothly over
0.8 seconds after release. The visible flame, terrain/wall clipping and swept
whole-body damage share the same capsule cells, with a maximum of 56 cells in
two reused mesh buffers. Only the first five metres receive mouth-shell grace;
later cells also stop at the titan's real body and current protective arms.
There are no new lights or independent animation/timer loops.

Damage remains 40 with a one-second hit interval. Cooldown, charging and the
surge gap do not damage. The compact objective line prioritizes the current
breath warning over arm/pickup advice. Warning/release audio reuses the existing
ability graph, with release samples triggered by actual emission edges.

## Food, geometry and resource scope

There are 816 ordinary residents: the preceding 790 plus twenty-four tuna and
two ordinary adult megalodons. The nursery and liner food are preserved. The
small schools supplement exploration; adult players need the larger meals
rather than relying on decorative fish. Shared nutrition, hunger, growth,
respawn, damage eligibility and the other maps are unchanged.

A final four-direction patrol exposed one redistributed megalodon's path into
southern salvage. Only its home changes from (-366.2671,-586.9912,-1429.0384)
to (-366.2671,-560,-1395); radius, speed, nutrition and the other 815 homes stay
exact. Final spawn/respawn checks cover all 816 residents, four body poses and
six headings. This megalodon also passes four 80-second actual-motion patrols
with no contact, stuck state or body overlap. The original failing logs remain.

The near front has 36,618 triangles, the far front 2,956. Actual extreme head
motion is at most 1.856 m. Skin/contact checks preserve the two-metre exterior
error limit, verify posed vertices and triangles, and retain the resting support.
Dynamic contacts use a local index rather than scanning all posed cells per fish.
The rear keeps its original source/PBR with a real fitted contact shell.

The original 60.2-second cave cue uses the existing recorded-music graph;
escape selects the chase arrangement. Four Bermuda cues decode to approximately
92.2 MB at 48 kHz, including about 23 MB for this addition. Signal, transition,
mute, pause and region cleanup are checked separately from subjective listening.
The current tooling could not play the recorded audition back to the reviewer;
listening acceptance remains open.

## Verification and limits

Evidence is retained under the ignored
`.local/bermuda_titan_approved_20261121/` directory. Focused checks include real
roof/wall coverage, adult turns and formal exits, physical sealing/reset,
registered character intake access, dynamic skin, ecological placement/patrol,
bilingual Guide/objective text and shared audio/resource ownership.

The `breath_revision` fixtures separately exercise the new attack: all three
profiles reach a legitimate low-ground adult body in dangerous phases, the
double-surge gap is harmless, and real obstacles clip the same visible cells.
The complete-game native hazard fixture records a real 100-to-60 health change
and a safe side-water case. Controlled placement and phase fixtures are clearly
labelled; these are not an unassisted four-lord expedition.

A first new native escape run overlapped briefly with another test browser and
reached an artificial 20-second driver timeout before the south opening. No
wall contact or game error was reported at that point. It remains as
`native_escape_overlapping_browser_run.json`; a later serial run is recorded
separately. Do not treat the failed driver run as completed escape evidence.

Headed performance observations describe this Mac/browser and actual populated
scenes. They do not establish physical-phone performance or a general FPS gain.
Physical-device comfort, subjective music acceptance and a complete unassisted
survival expedition remain review limits. The current preview is a candidate,
not a new main release.

The serial native batch passes all eight gameplay cases with no page or console
errors, securing the heart with 26.85 seconds left. A separate native survival
run removes invulnerability at the actual pickup: ordinary damage and hunger
remain active, no healing is injected, and the character escapes alive with
69.33 health and 29.77 seconds left. Hunger reaches zero near the end on this
slow host; this is not evidence of a generous food reserve or an unassisted
complete expedition. The original shared starvation rules remain unchanged.

The final serial headed Chrome measurement (1280×800, seed11729, 1.8-second
warm-up plus seven seconds per case) compares the same live hero view during
cooldown and a sustained-release sampling fixture. All Node tests and other
benchmark browsers had ended before this final run. An earlier run overlapped
with a Node test and remains labelled `performance_cpu_overlap`.

| Quality | Phase fixture | Median frame interval |      P95 | Draw calls | Triangles |
| ------- | ------------- | --------------------: | -------: | ---------: | --------: |
| High    | cooldown      |              210.6 ms | 219.8 ms |         49 |   636,464 |
| High    | breath        |              204.7 ms | 220.8 ms |         59 |   681,387 |
| Low     | cooldown      |              203.7 ms | 217.3 ms |         43 |   665,111 |
| Low     | breath        |              201.8 ms | 218.4 ms |         43 |   653,438 |

The roughly 200 ms host frame intervals remain a substantial limitation, also
present in the earlier nursery/lair baseline. These observations do not prove
an FPS gain, smooth phone play or low total game cost. The new effect is bounded
to two mesh draws plus its existing charge/sparks; scene totals also include
live fish and effects. The candidate still requires physical-device and natural
whole-expedition review.
