# Giant Squid dual-end capture — 2026-11-10

Status: uncommitted candidate for player review. Published main remains v0.11.26
at `4746021`. The user requests a front capture option while retaining the
existing trailing-mouth advantage. No commit, push or release is authorized.

## Diagnosis and behavior

The squid swims mantle first. Its original ordinary-prey intake is local
`+0.36 × player length`, behind travel, while its actual anatomical mouth stays
at local `[0, -0.004, +0.09]`. A squid cannot overtake prey into a wall to bring
that trailing intake into range.

The ordinary-prey path now checks the original intake first, followed by a
squid-only leading intake at `-0.36 × player length`. Both follow the visible
avatar rotation and retain their own previous-frame positions. Each checks the
existing radius, relative swept contact and world obstruction independently.
There is no continuous body-wide intake. A blocked first intake cannot veto a
clear second contact; two eligible contacts still settle exactly one meal.

Length eligibility, rare blessing/retirement, food values, damage order,
retaliation, motion/collision, abilities, and growth remain shared. In particular,
the existing trailing intake can still eat a near-sized edible hunter before its
bite. Frenzy pulls once through its original intake. Lords, treasure interaction,
rewards and other playable characters do not gain the second intake.

## Feeding presentation

Front-caught prey follows a cubic path around one flank toward the existing
mouth, with a bounded 0.55–0.95 second duration. The matching long tentacle bends
toward it; the mantle, short-arm crown, root orientation and locomotion retain
their existing motion. The catch is a gameplay adaptation, not a claim about the
usual hunting orientation of real giant squid.

The prey keeps its visible size during transit and compresses near the actual
mouth. Mist and disappearance occur at the final mouth stage. A blocked carry
segment is clipped on the accessible side of solid scenery, so continued player
movement cannot drag the visible prey into its adjacent wall. Carry displacement
also has a continuous speed bound plus actual player displacement, preventing
a delayed catch-up snap when a clipped path becomes clear in a narrow corridor. The transition
uses the existing active clock, model pool and instance-owned bones; pause freezes
it and reset restores the borrowed mesh and tentacle pose. No new mesh, material,
texture, sound, loop or external generation is added. Both Guide languages explain
the two capture ends and the final mouth destination.

## Verification

Raw evidence lives in ignored `.local/squid_dual_capture_20261110/`.

- 68 focused unit tests pass across capture, feeding transitions, actual skinned
  player motion, predator retaliation, Frenzy, rare settlement, progression,
  character rules and localization. The new cases include opposite headings,
  independent obstruction, shared-contact priority, relative sprint sweeps,
  outside-mantle transit, an adjacent wall, moving/turning/growing targets,
  pause/reset, a narrow legal corridor without catch-up snaps, and independent
  skeleton ownership.
- The browser fixture uses native selection, resume, pause, keyboard steering,
  sprint and return-home controls. Staged wall contacts run through the actual
  Mariana movement/collision/feeding loop, with prey and starting poses set only
  to isolate the encounter. Two opposite headings capture the wall-side rare;
  an intervening wall and an oversized predator prevent capture. The original
  arm intake catches a 4.2 m goblin shark with a 4.9 m squid before damage.
- An additional native sprint/steering approach catches the normally moving
  Mariana rare in its newly drawn original habitat. Only the player's starting
  approach is staged; the target keeps normal escape and terrain behavior.
- An isolated side-camera inspection uses the real game renderer, assets,
  skeleton and feeding transition. The normal simulation is paused while the
  fixture advances the active animation explicitly. Frames at 0.08, 0.22, 0.38,
  0.52 and 0.70 seconds show flank transport and mouth completion. These are
  labeled animation fixtures, not screenshots of unassisted pursuit.

Initial test failures are retained. The new rig fixture needed both root world
matrices refreshed before comparing skinned vertices; the first pursuit fixture
pressed sprint before resume cleared held inputs, and then needed actual steering
rather than a straight-line chase. These fixture corrections do not weaken
capture eligibility or obstruction. The historical `verify_player_v0_6_10.mjs`
stopped at its ordinary-fish velocity assertion before reaching the squid section
and is not counted as passed.

Native controlled checks do not establish natural full-expedition pacing,
physical-phone feel or sustained performance. No such claim is made.

Final checks also pass source/document formatting and the production build.
The existing restricted preview serves the rebuilt candidate; its HTML, primary
JS/CSS, engine and locale resources match the local artifacts byte-for-byte.
Compiled native selection, movement, pause/resume and Guide checks are recorded
separately from the development contact fixtures. The preview keeps the published
version footer because this candidate has no authorized version bump.

The public Quick Tunnel can return HTTP 429 for some resources on a cold load.
The initial compiled browser flow reached Mariana, exercised controls and read
the updated Guide, but its resource-error assertion failed; this is retained
separately. Primary public artifact matches do not erase that cold-load limit.
The final compiled public check records the cold-load limit explicitly: 31
resources returned 429 during initialization. Reloading once in the same browser
then passed native Mariana squid selection/start/steering/pause/resume/home and
the new Guide description, with zero request or console errors. Primary artifact
hashes and restricted-path negatives also pass. User-network testing remains open.

## Accepted local checkpoint — 2026-11-10

The user accepts the delivered correction and authorizes a local commit before
a separate sprint-tentacle refinement. Runtime inputs and served artifacts match
the verified candidate; only acceptance documentation is added for this checkpoint.
Earlier candidate/uncommitted status statements retain their historical meaning.
No push, version bump or main publication is authorized.
