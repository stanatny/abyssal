# Polyphemus: long-range sentinel and grounded turning

Date: 2026-11-25. Local review on `feat/odyssey-map-expansion`, based on expansion checkpoint `a141558`. This implements the player’s request for at least three times the stationary giant’s firing reach and turning toward a discovered player. No commit, push, version change or formal publication is authorized.

## Encounter behavior

- Clear eye-to-player sight can wake Polyphemus within 600 m, including a rear approach. This replaces his previous 200 m firing range and the shared 220 m wake limit only for this species. Other lords retain their existing wake rules. The 620 m territory provides a boundary buffer; it does not grant new attacks beyond 600 m.
- Discovery and firing are separate. The giant pivots at a fixed center with alternating actual foot steps, then starts a new throw only when facing within 15 degrees of the player. Peak turn rate is about 30 degrees per second; a complete rear turn takes about nine seconds. He does not travel or dodge.
- The final 0.6 seconds of the 1.8-second windup and the attack keep the committed heading and target. Gaze follows that same target. Losing sight or leaving the 600 m range stops new tracking; a committed throw continues against its last valid point and remains blocked by real scenery.
- The accepted 240 m/s palm-launched rock, 0.16-second close-flight floor, maximum 3-second flight, 38 m wave centerline/4 m half-width, damage, shared 25 m/three-hit rules and recovery are preserved. Forecasts outside 600 m fall back to the last eligible current player position rather than using the time clamp to accelerate a longer throw. The aligned attack cycle remains about 6.8 seconds.
- Both Guide languages explain the range, pivot steps, locking and counters. A new local record ruleset preserves all prior Odyssey records in their historical buckets.

## Actual geometry and contact

The accepted 33,418-triangle/22-bone HF model, raw mesh, texture, rest geometry and indices are preserved. Its eight lower leg/foot joints previously had zero skin influence, so rotating bones alone could not produce a visible step. An actor-owned geometry clone now assigns smooth lower-body influences to the existing hip, knee and foot joints. One sole stays in the world support frame while the other takes a short lifted arc. This is actual skin deformation, not only bone metadata or a camera effect.

The original shared geometry and its contact cache remain unchanged. The clone rebuilds its own influence bounds; the actual interior contact surface copies its live weights. Reset, independent instances, repeated disposal, paused clocks and committed-heading settlement are exercised.

Both turn directions and a composed combat cycle keep measured skin stretch below 2 (maximum 1.9462). An independent 1,440-frame/four-direction sweep checks all 4,710 lower vertices: maximum horizontal radius 39.77064 m, minimum ground clearance within numerical roundoff and at least 1.23 m sampled pad-edge margin. The existing 86 by 82 m bed-supported dais is retained; no larger pedestal or moved food is needed.

## World coverage and evidence limits

The original 677 ordinary spawn anchors, 144 nursery residents, four straight currents, other guardians, four puzzles, grounded Aeolus and physical homeward arch are retained. The nursery’s nearest anchor lies about 882 m from the giant. Expanded danger can reach some ordinary transport/homeward waters, subject to actual terrain and cover; it is deliberately not a global damage radius.

At the 600 m boundary, nine sampled legal body/terrain directions have clear eye sight; five have clear ballistics and four are intercepted by real scenery. Three far stations across 25/30 m bodies and 60/30/15 FPS produce 36 direct/depth cases: one direct base-30 hit, no hit after a 20 m depth escape, and completed hazard cleanup. These controlled source-world cases do not establish an unassisted expedition.

The ordinary underwater fog is preserved. At 500–600 m the giant’s body may be strongly obscured; visible local landing/wave warnings and the battle HUD communicate the attack. We do not claim a clear 600 m silhouette or change all-map visibility to obtain one.

Known static-proxy observations remain explicit: five hippocampus anchor overlaps predate this turn, and yaw can add one oracle-whale proxy overlap. No anchors or stock are removed. These are conservative source-placement warnings, not observed native fish destruction or an ecology-density reduction.

## Validation and delivery

Final native populated-scene checks pass separately at 25 m and 30 m. Each starts the giant untouched and verifies a shot beyond the previous range, an unprotected direct hit, native lateral/sprint and depth/sprint dodges, and three actual-skinned-surface counters. Only the initial player size and approach stations are staged; no NPC phase, timer, health, defeat or player protection is written. Ordinary health, hunger, collisions and shared counter rules remain active.

A separate final recording starts a dormant giant from an approximately 550 m player station, shows the ordinary follow-camera HUD and local warnings, then demonstrates a natural rear discovery/turn/throw with a fixed full-body observer and an actual foot close-up. Native pause and new-round reset pass. Both observer cameras are labelled; the footage is at original speed. It is not an unassisted full growth/guardian/puzzle/homecoming run. An earlier harness attempt expected English without selecting it and failed its label assertion; the corrected native language selection passes. Its raw attempt is retained. An intermediate observer wrapper was also corrected to provide a true foot close-up.

The expanded fixed firing field intentionally supersedes the old all-territories-disjoint layout assertion: other guardian centers retain more than 65 m beyond the giant’s firing range in the actual three-dimensional distance used by combat, their actual puzzle controls remain outside it, and mobile guardians still satisfy their previous map-bound/separation contract. The giant’s actual body/pad remain fitted inside the map even though its alert sphere can extend beyond an edge.

Paired desktop measurements, final test/build totals and the public candidate identity follow after verification. Raw recordings, source hashes, failed harness attempts and receipts remain in ignored `.local/polyphemus_sentinel_20261125/`.

### Final checks and measured cost

The final affected run passes 169 of 170 checks; the only failure was the replacement layout fixture incorrectly using horizontal distance for a three-dimensional firing sphere. That fixture now uses the same actual 3D distance as combat and all four route checks pass. Thus all 170 distinct affected checks pass on the final production source. Other test receipts and the failed fixture are retained. Full-project formatting and the Vite production build pass.

The serial before/after desktop samples retain 361 frames over about 6 seconds per quality, median 16.7 ms, no frame over 33.4 ms and the same 678 live entities. Main-thread task time rises 2.026873→2.244953 seconds (+10.76%) in High and 2.055086→2.666008 seconds (+29.73%) in Smooth. These are bounded samples with new real turning/discovery work, not a statistically significant optimization or a claim of unchanged CPU/heat. No physical-phone thermal/power measurement is made.

### Exact review candidate

[Play candidate `36e6a70d8dae7781`](https://abstract-socks-accomplish-buf.trycloudflare.com/?candidate=36e6a70d8dae7781) and select **Odyssean Sea**. Build identity is `36e6a70d8dae77819ce4ee7c5ba5e5e04094fc6baf8b666bf1a2dfa1fbe014df`; all 1,623 production/script inputs and 1,012 built runtime files match. The existing restricted service and tunnel are reused, old hashed files and the previous runtime are archived, and formal main/Amazon are preserved. The 24.52-second H.264 review video contains the ordinary far view, full-body turn and foot close-up at original speed. Public verification passes eleven resource hashes, private-path denial, live same-URL refresh and the unchanged Amazon index. The actual compiled public browser has no development interface; bilingual/narrow Guide, native start/dive/pause/resume/home and reload pass without page, console or request errors. Cold readiness was 38.897 s and reload 2.254 s on the host. This is not another physical device or network measurement. Attachment receipts are retained in the ignored delivery directory.
