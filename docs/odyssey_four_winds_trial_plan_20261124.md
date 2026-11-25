# Odyssean Sea — Four Winds trial production plan

Implementation authorized — 2026-11-24: the player confirms and asks to restore the default model, then begin development. The native session has been restored to GPT-6.1-Sol / Ultra / ordinary speed. This supersedes the proposal waiting states below; features remain unimplemented until the implementation review records their evidence. No push or formal release is authorized.

Date: 2026-11-24. Status: **design proposal awaiting the player's confirmation; not implemented**.

The existing expansion is locally committed as `a141558cd50f6fa7cd29aa22960079b356f538e1` on `feat/odyssey-map-expansion`. This document proposes its next phase. The separate Amazon candidate, Bermuda main, existing preview services and archives remain intact. There is no push, merge, version bump or new deployment in this checkpoint. Keep the current model until the player confirms this plan; then restore the default model and verify the switch before further work. A model switch is not implementation completion.

## 1. What exists, and what changes next

The [implemented expansion](odyssey_map_expansion_20261124.md) provides 1.817 times the sampled wet area, a deepest sampled floor of 1,168.30 world metres, 662 ordinary animals across 22 kinds, four straight travel currents and larger territories for three existing lords. It retains the original northern nursery and 144 residents. Current victory still requires growth to 30 m and defeating those three lords.

The next phase would make the expanded map a journey through **four guarded wind gates**, followed by a visible homeward sea route. Each gate has one distinct lord, terrain that supplies a counter to that lord, food outside the combat area and a readable passage challenge. Aeolus's cliff monument is the distant destination and the common visual connection between the four sites.

The player's latest suggestion supersedes the earlier one-unattended-tutorial-gate/three-guarded-gates proposal. There will be **four formal gates and four lords**. Teaching moves to a sheltered approach outside the first gate; it does not add a fifth formal gate.

| Status                                | Decision                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Already committed                     | Expanded terrain, ecology, current layout and three-lord spaces in `a141558`                                   |
| Direction already discussed favorably | Aeolus trial, homeward finale, monumental distant landmark, lord/terrain interaction                           |
| Proposed here for confirmation        | Fourth lord Ladon; four-gate rules; traversal-family exceptions; final victory change; implementation sequence |
| Not implemented or verified           | New models, gate interaction, Ladon combat, monument, return finale, new complete-run balance                  |

## 2. Regional story, appearance and sound

Aeolus has sealed the scattered winds. Four ancient mechanisms restore a navigable current toward home; each guardian holds one local seal. These are myth-inspired game rules, not an episode claimed to occur in Homer's text. Aeolus's wind sack and fair homeward wind are drawn from [Odyssey Book X](https://classics.mit.edu/Homer/odyssey.10.x.html).

Use pale eroded limestone, oxidized bronze, sparse gold inlays, red coral, amphorae and clear depth changes. Gates are substantial ancient rings fitted into local architecture, with moving vanes and water passing through their real apertures. Avoid free-floating science-fiction portals. The existing concept image is a compositional overview, not a terrain layout or proof of playable access.

The static Aeolus monument is integrated into a distant cliff: robed stone figure, wind sack and carved wind-blown mantle; its base continues underwater. It has no trident and does not become another combat boss. Four carved channels at its base progressively light as gates stabilize. With all conditions met, the channels connect, clouds open and a broad illuminated current leads to the underwater arrival court. The actual monument site and final route remain subject to terrain and adult-access fitting; no coordinate is asserted as already usable.

Keep the accepted regional exploration, ordinary-pursuit and lord music. Add bounded wind-vane, gate-response and return-fanfare cues only when their visual/interaction timing is established. Retain current music priority; do not stack four permanent loops. Warnings must remain readable without sound or color alone. Respect volume settings, pause and reduced motion; the finale must not seize steering or flash the whole screen.

## 3. Four territories with distinct solutions

All coordinates below are **world X/Z**, with north toward increasing Z. Depth is measured in world metres; HUD depth is four times world depth. Gate positions are not the lord home positions. Gate apertures, approach basins and food sites must be placed and tested separately.

| Gate / guardian              | Regional placement                                       | Terrain and observable threat                                                                                    | What the player does                                                                                                  |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Pillar Gate / **Ladon**, new | Western middle shelf, candidate home near `(-430, -950)` | A coiled sea dragon moves around a large stone column; a warned body/tail sweep crosses one side of the approach | Read the sweep direction, circle behind the column or change depth, then use its recovery and favorable flow to cross |
| Reef Gate / **Karkinos**     | Existing eastern shelf, home `(261.383, -795)`           | Low terraces and raised water lanes intersect the existing floor-shock lanes                                     | Leave the floor lane, rise through the real gap, then align with the gate                                             |
| Echo Gate / **Scylla**       | Existing southwestern cliffs, home `(-280, -1558)`       | Large reef pillars interrupt the existing six-shot sequence                                                      | Change cover as needed, let the volley finish, then cross during recovery                                             |
| Vortex Gate / **Charybdis**  | Existing southeastern basin, home `(266, -1922)`         | A lateral sheltered cove lies outside the intake cone; the tidewall has a visible path                           | Wait outside suction, let the wall pass, then enter the signaled upward passage                                       |

This arrangement uses west/east middle water and southwest/southeast depths rather than crowding all gates into the old shallows. “Four Winds” is the theme; it does not force a gate onto each exact compass bearing. The recommended visit order is Ladon/Karkinos before the two deeper encounters, but progression is not sequence-locked.

Read-only terrain reconnaissance favors Ladon's western candidate: a 170 m radius sampled on a 10 m grid has seabed between about -545 and -256 m; the center is approximately 255 m from the galley, 709 m from Karkinos and 626 m from Scylla. This is **terrain sampling only**: the galley footprint, final props, full dragon body, chase envelope and adult paths have not been cleared. An eastern/northeastern placement must not be assumed empty water: several candidate sites are land or overlap the crab basin. Adjust the local western shelf if required, while retaining the existing nursery and the other three habitats.

Gate placement must make the lord visibly relevant: its telegraphed attacks affect an approach or crossing opportunity, while terrain offers a genuine alternative. Do not place a remote boss whose only connection is a checklist flag. Equally, do not require entering a gate to unlock the ability to defeat its guardian. Defeating a guardian stops its interference and releases its seal; the remaining flow challenge is still readable and traversable.

## 4. Exactly how a gate works

### Approach and teaching

The first approach has a protected observation cove with food and room for a 30 m character to circle slowly. The game normally swims forward; “wait” means use ordinary slow swim and turn within the cove, not assume a stationary character. Show the wind vane, aperture and water direction from the ordinary follow camera. A short inscription explains the two requirements: **cross the gate and defeat its guardian**.

No new action button, inventory item, numerical combination or charging meter is required. Existing rise/dive, turn, slow swim and optional sprint remain the controls. Young characters can observe and learn; they are not forced to kill a lord before leaving the nursery. Normal lord eligibility remains 25 m.

### Passage cycle and feedback

1. **Adverse flow:** vane spins rapidly, bubbles move toward the approach, and a visible water ribbon shows the blocked direction. The player can retreat or feed in the cove.
2. **Transition warning:** vane slows, the ribbon straightens, and a short sound/text cue explains that the current is changing. This announces physical state, not a hidden puzzle answer.
3. **Favorable passage:** the opening and destination are visible; the player swims through from the marked entrance side to the exit side. Sprint helps recover timing but is not mandatory.
4. **Whole-body completion:** count only a continuous forward passage of the supported character's full body envelope through the legal aperture. Touching the rim, crossing backward, approaching from behind, teleporting across it or clipping around a support does not count.

Initial prototype targets are an 8–10 active-second favorable phase, a 1.5–2 second change warning and a short adverse phase. These are **tuning targets, not verified final values**. Derive the minimum opening from actual traversal distance, the slowest supported normal swim, 30 m body extent and reaction allowance. Reserve an admission cutoff before reversal; a valid entrant has a bounded tail-clearance period with forward flow maintained, so it is not caught by an instant mid-body reversal. Calculate the admission cutoff from the actual normal swim speed and full remaining body distance. Preserve steering and voluntary retreat throughout; verify that any expiry push cannot send a 25/30 m character into solids, unavoidable attack coverage or outside the safe approach. Do not hold the gate open indefinitely for a stalled actor. Resolve an expired attempt by an announced outward push into clear water, not a closing collision slab or repeated damage.

The gate and lord must have a bounded jointly usable opening. Prevent independent random clocks from producing an endless sequence of favorable currents during unavoidable volleys. Schedule the gate flow against the existing lord state to provide a readable opportunity in each configured encounter cycle; do not extend recovery or pause the lord attack clock. Existing recovery is only about 4–4.5 seconds, shorter than the proposed 8–10 second favorable flow. Gate position, cover and the next attack direction must make the remaining crossing avoidable; favorable water is not an entire ceasefire. This does not mean every opportunity is safe from a poor approach position.

### Two independently remembered accomplishments

| Crossed correctly this round | Guardian defeated this round | Result                                     |
| ---------------------------- | ---------------------------- | ------------------------------------------ |
| No                           | No                           | Both tasks remain                          |
| Yes                          | No                           | Passage marked; guardian still interferes  |
| No                           | Yes                          | Guardian gone; passage still required      |
| Yes                          | Yes                          | Gate permanently stabilized for this round |

Either order works. A partial completion is not erased by retreat, another gate or a missed later timing window. Defeated lords do not respawn and re-lock gates during the same round. Completing a gate creates one local response and lights the corresponding monument channel once. No remote tiny token pickup is required.

Missed crossings do not deduct arbitrary puzzle health or reset the other gates. The real cost is lost position/time, ordinary hunger and any actual combat hit. This is an explicit **proposed traversal-trial exception** to the repository's default combination-puzzle rules: no separate submit button, no blanket wrong-answer penalty, no full selection reset, outdoor hosts, and state-signaling light is allowed. It needs the player's approval as part of this plan; it is not silently applied to Atlantis puzzles.

Pause freezes trial clocks and effects. Home, restart and region changes clear current-run gate state; unfinished rounds are not persisted across reloads in the existing game. A stored historical victory is not a current gate completion. Damage, death and rewards use the shared systems.

## 5. Fourth lord: Ladon, the pillar guardian

Recommend a **single-headed sea-dragon adaptation of Ladon**, with a coherent long neck/trunk/tail and dark olive scales edged by restrained gold ridges. The literary guardian protects golden apples; the underwater form, pillar, wind seal and combat below are original adaptations. Ladon is not presented as a character from the Odyssey itself. See [Argonautica Book IV, around lines 1393–1407](https://www.theoi.com/Text/ApolloniusRhodius4.html).

Use one real, complete articulated body, not a large head attached to an unrelated tail or hidden anatomy. Initial scale target: roughly 65–75 m along the body centerline, with a 150–170 m territorial reservation; both await a whole-body silhouette and movement review. The model may coil naturally around a column but must uncoil and turn without intersecting it. Do not require a 30 m player to fit through the dragon's coils.

Start with **one strong attack**, not an overloaded skill list:

- Patrol: slow continuous swimming around the column, bounded within the actual basin.
- Warning: head/neck turns and the tail loads toward a clearly indicated sweep plane. The final warned path locks rather than tracking the dodging player.
- Attack: one finite body/tail sweep through the warned sector. Damage follows visible posed anatomy and is settled once per attack, with no invisible annular blast or all-height hit.
- Recovery: the tail clears the passage and the body settles into an exposed moving recovery; the player may cross the gate or take the existing valid-contact counter. Those are separate actions, neither automatically grants the other.

Keep normal 25 m attack eligibility, three distinct valid lord hits and the existing one-hit-per-opening protections. Integrate the common recovery-counter behavior and HUD; a readable recovery is not blanket invulnerability. A frontal armor rule, attack damage and exact warning/recovery timing must be derived from the shared ordinary-lord contract and calibrated in the first slice. No new compulsory ankle/head weak point or exclusive torpedo solution. No additional multi-headed volley, huge suction or magma attack is planned.

Use actual generated production assets through the established Hugging Face pipeline when making the new creature and landmark. Preserve raw outputs, prompts, provenance and accepted comparisons. A concept image or a generated export alone is not an accepted game model: rigging, posed contacts, texture loading, normal-camera proportions, Guide preview and resource ownership still require integration and review.

## 6. Food, clearances and route safety

Keep the expanded ordinary-stock baseline and all protected original food. Do not convert ordinary Ceto into the new lord or remove the existing three Ceto to populate Ladon's area. The new battle outskirts receive **at least three independently reachable adult meal slots**, plus suitable small/medium food on the approach. Choose actual eligible species and legal anchors from the existing roster during the slice; boss rewards and decorative fish do not count as continuous food.

Evaluate 3/6/10/16/25/30 m travel/search/capture costs using the shared hunger, nutrition and recovery helpers. At deep 30 m, current ordinary hunger consumption can reach 3 points per active second; one 10-second wait alone can cost 30. The trial therefore needs accessible meals, short repeat delays and retreat routes. Do not lower global hunger or freeze survival to make a showcase pass. Preserve normal movement and replenishment; verify a moving meal and its respawn.

Starting geometric reservations, to be validated against all final solids:

- Gate clear opening at least about 60 m wide and 55 m high, with a short traversable throat; these are reservation targets, not a fit proof.
- Protected approach and exit pockets with at least the accepted 65 m turning span for 30 m bodies.
- One low-risk bypass/retreat around each combat area, accessible before the gate is solved. Gates do not seal all regional exploration or food access.
- Check whole-body sweep at 25/30 m for all four characters, including backward-swimming Squid geometry, attachments, turning and retreat.
- No overlap between the other lords' full chase/attack envelopes and the new gate's waiting pocket. Avoid shared currents accidentally delivering small players into locked fights.

Retain all four straight main travel-current lanes. Trial currents are local, bounded, driven by one state source for force, visible ribbon and minimap. Resolve overlap with main lanes explicitly; do not sum two independent forced rides. The final homeward route is a separate unlocked route with normal steering and exits, not a teleport.

## 7. Homeward finale, UI and records

New objective: **four gates stabilized + all four lords defeated + body length at least 30 m → homeward route available → physically reach the underwater destination → victory**. Since stabilization already requires the guardian defeat, the explicit lord count is informative and must derive from the same four records, not another independent unlock state.

Completing three old lords or reaching 30 m alone must not trigger the old early victory. If gates are complete before reaching 30 m, retain them and explain the remaining growth requirement. If grown first, retain length and continue the missing gates. Once available, the return route stays available for the round: no surprise countdown, revived guardians or forced death for taking time to eat. This is a release-and-homecoming ending, not Bermuda's 60-second escape.

During the finale, all four monument channels illuminate, a restrained wind response plays and the water route becomes navigable. All supported characters can reach the destination while remaining underwater; no jumping, flying or walking is required. Leaving the route is recoverable. Crossing the genuine arrival boundary awards victory once and retains the existing post-victory exploration behavior.

HUD: compact objective counts plus the nearby gate's two checkmarks. Show a specific missing requirement, not “cannot activate.” Radar/landmarks guide to the site, not an invisible trigger. Preserve attack-danger priority so trial text does not hide lord warnings. Synchronize en/zh-CN, Guide search/cards/model previews, regional description, gate states, results and narrow touch controls.

Introduce a regional objective-ruleset identity for new completion records. Preserve historical three-lord achievements as legacy records, but do not claim them as Four Winds clears. Do not migrate/delete unrelated records or require save-game support for unfinished rounds.

## 8. Work sequence after confirmation

| Stage                             | Concrete work                                                                                                                        | Reviewable output and completion condition                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — current                       | Local expansion commit; this detailed proposal; preserve previews                                                                    | `a141558`, planning document, exact unchanged candidate link; wait for confirmation before model restoration or feature implementation               |
| 1 — site and representative slice | Fit Ladon basin, column, one gate, refuge and food; test adult access; implement the proposed gate state machine and one lord attack | Actual near/far scene; normal-input failed and successful crossing; crossing-first and defeat-first paths; source-matched playable preview           |
| 2 — production asset and motion   | Produce and integrate Ladon, gate kit and monument; full-body rig, physical attacks, original textures, light and sound              | Continuous whole-body patrol/warning/sweep/recovery views, Guide and world review, no concealed proportion/attachment failures                       |
| 3 — three existing lord gates     | Place the remaining gates in their actual terrain; integrate encounter opportunities and food                                        | Three distinct playable approaches, authentic hazards and retreats; no duplicated arbitrary obstacle course                                          |
| 4 — complete objective            | Connect four records, 30 m gate, monument response, physical homeward route, victory and record compatibility                        | Whole expedition flow without developer state changes; UI/localization and once-only settlement evidence                                             |
| 5 — delivery verification         | Focused tests, formatting, production build; native and serial performance/resource checks; preserve old runtime                     | Verified updated playable link after each delivered game change; final H.264 overview/detail/process video with an actual cover and delivery receipt |

The first slice may use explicitly labeled diagnostic geometry while fitting contacts, but such a prototype is not delivered or merged as finished art. Do not replicate a failed slice four times. Read the asset and audio standards before production. Keep implementation isolated from Amazon; the integration owner alone stages, commits, deploys previews and controls browser measurements. Further commits/pushes/releases require their applicable authorization; this local-code checkpoint is not blanket main-publication approval.

## 9. Acceptance and unresolved decisions

Functional checks must cover legal forward whole-body traversal, reverse/rim/teleport rejection, tail-clearance expiry, overlapping currents, both accomplishment orders, defeat cleanup, once-only effects, pause/death/restart/region switching, no premature victory, actual finish crossing and historical record compatibility. Tests of shared helpers must also show other regions unchanged.

Native evidence must include four characters at 25/30 m entering, turning, passing and retreating; an actual hit and a legitimate dodge; ordinary moving food and replenishment; bilingual desktop and narrow layouts; one uninterrupted natural run covering growth, all four encounters/gates and homecoming. Short demonstrations can use staged starting positions but must say so and cannot substitute for the natural run.

Compare the same populated scenes and camera path against `a141558`, serially, at matched browser/quality/viewport settings. Record frame median/p95, main-thread cost, draw/triangle counts, loading and repeated-entry resource behavior. Avoid per-frame detailed full-model raycasts or new permanent lights. The earlier expansion held approximately 60 FPS on the measured desktop while using 5–15% more main-thread task time; it did not prove thermal improvement. Physical-phone sustained play and heat remain unmeasured until tested on an actual phone. Establish the slice's additional budget from measurement before multiplying the gate kit.

The current expansion's limited deep juvenile food budgets, weak adult passive-food station and unverified natural whole-round pacing remain tracked. The new task must remeasure the affected routes rather than inherit a blanket acceptance from the prior expansion.

Items for the player's confirmation:

1. Four distinct guarded gates, with teaching outside the first gate, replacing the earlier three-lord structure.
2. Ladon as a single-headed, pillar-circling sea-dragon adaptation; a warned sweep rather than another breath/suction boss.
3. Independently remembered crossing and lord defeat, followed by a calm, persistent underwater homeward finale at 30 m; no arbitrary wrong-answer damage or timed escape.

Exact model dimensions, legal coordinates, opening timing, attack damage, spawn anchors and local performance budgets are implementation tuning variables subject to the contracts above. They are not claimed final or playable in this document. On confirmation, first restore and read back the default model as requested; then continue the authorized next stage. No switch has been performed for this planning handoff.

## 10. Checkpoint evidence

Before the code commit, all 1,595 production/script inputs and 1,003 build files matched the previously delivered candidate fingerprint `66a3fb303f4debc108d1e8133d7baa42b99e129a7e46ef632091e65ebbae7a52`. A fresh focused run passed 33/33 tests covering currents, map routes/ecology, expansion and progression; formatting and staged diff checks passed. Prior build/native evidence retains its unchanged-input scope and is described in the expansion record; it is not represented as a new run of the unimplemented trial.

Current expansion preview: [play the existing Odyssey candidate](https://abstract-socks-accomplish-buf.trycloudflare.com/?candidate=66a3fb303f4debc1). Select **Odyssean Sea**. This link contains the committed map expansion and the original three-lord victory; it does not yet contain four gates, Ladon or the monument. This document is an uncommitted review draft, separate from the code checkpoint.
