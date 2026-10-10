# Zombie Shark torn muscle and sacrificial fission

The later [continuous real-body emergence and portrait framing](zombie_emergence_revision.md) supersedes the immediate companion arrival and its camera/timing evidence below; torn-muscle geometry, corpse explosion and20/20 torpedo payment remain.

Current refinement, 2026-10-10, on `feat/lord-contact-rare-blessing` at local checkpoint45ebf24. The preceding candidate's20/20 torpedo payment remains; new work stays uncommitted and unpushed for user review. Main/Pages remains4060d86 / v0.11.4. The current AI agent alone implements the work and preserves existing services and canceled worktrees.

## Visual behavior

The reference is the preceding reviewed shared Zombie Shark model and the accepted rare/lord event lifecycle. This original undead fantasy design uses existing procedural geometry, materials and game sounds; no external art or audio is introduced. The previous muscle lining solved the see-through shell but looked intact inside large wounds. Seven irregular deep gouges now remove surface muscle volume across both flanks and the exposed spine. Their dark floors retain opaque tissue. Short broken fibers stay attached to the ragged edges rather than filling the gaps. They share the existing axial skinning; unit length, jaw tissue, mouth anchor, growth, collision and independent cached owner/companion/Guide instances remain.

Fission starts at the actual nearer flank wound of the current owner. Two curved, tapered tissue strands pull toward the companion's actual collision-resolved position; detached flesh travels along that route while blood gathers and broken rib bands assemble around the companion. The owner and destination anchors follow their real moving poses during the1.65-second event. The ordinary companion body is present immediately, preserving its existing gameplay contact/feeding timing; the visual expresses tissue extraction rather than delaying skill activation. The success notice explicitly reports the50-point health/stamina/hunger sacrifice. Exactly50 health remains a legal lethal sacrifice without a visible companion arrival.

After60 active-play seconds, the companion's last actual pose is sampled before hiding it. Its ribs, jaw fragments and spine separate outward with torn flesh and an expanding red blood plume over1.65 seconds. This corpse explosion has no area damage, extra food or collision. Existing summon/expiry audio routes are retained, with no new listening-quality claim. Both events reuse two fixed slots, depth-test against real terrain, add no lights or extra animation loop, pause with the game and clear on Home/terminal/region reset. Reduced motion keeps static source/destination tissue and corpse traces with gentle fading, suppressing travel, spinning and shock expansion.

All actual rules remain: one65%-size companion,5 m minimum,50 from each resource,60-second lifetime/cooldown, ordinary owner-minus-5-m capture and the existing regional-rare exception. The previous fixed20/20 torpedo change, rare150-vital blessing and moving lord recovery remain intact.

## Cost and validation

Evidence is ignored `.local/zombie_fission_revision_20261010/`. Its baseline manifest/diff preserve the preceding uncommitted candidate; isolated baseline model/factory imports use a distinct rig cache key. Screenshots compare the same Guide camera and actual ocean lighting, with controlled staging explicitly distinguished from natural play. Native keyboard/touch activation verifies the production wiring rather than an isolated effect call.

| Resource                        | Preceding candidate |                   Refined candidate |
| ------------------------------- | ------------------: | ----------------------------------: |
| Model meshes / materials        |              11 / 6 |                              11 / 6 |
| Model triangles                 |              32,234 |                              33,242 |
| One transition meshes / sprites |              20 / 4 |                              20 / 4 |
| One transition triangles        |               2,392 |                               2,488 |
| Allocated transition triangles  |               4,784 |                               4,976 |
| Allocated transition geometries |            5 shared | 5 shared + 4 reusable tissue meshes |

Four small mutable tissue geometries are allocated once. Events update their preallocated vertices, normals and bounds, with no growing particle list or geometry creation per cast/frame. The two-slot pool retains48 private opacity materials and one shared mist texture. Repeated casts, overlap, moving anchors, transformed parents, non-finite/zero time, reduced motion, last-pose burst and idempotent disposal are covered by focused tests. Model checks sample complete3/15/30 m posed cycles, shared resources/independent motions, visible gouge depth and opaque backing under both flank wounds. Final full unit checks pass1,138 tests; formatting/build and29 headed shared browser checks pass. Three native dev cases cover Chinese1440×900, English390×667 and reduced-motion English320×568. Native J/touch calls confirm exactly50 points charged from each resource and a real owner-flank origin. Desktop expiry occurs once at active time60.0140s; narrow expiry uses a declared shortened deadline. Pause, Home, reload, actual torpedo20/20 payment and bilingual Guide are checked without page errors. Four Guide directions, same-camera before/after muscle views, onset/peak/fade, narrow effects and deep fog screenshots are visually inspected with the game's existing lighting. Staged ages/cameras and controlled length12/position/invulnerability are labeled and do not establish blind natural pacing.

The populated High1440×900 raw-render before/candidate/before comparison keeps the same1,544 calls; triangles are1,644,660 /1,646,676 /1,644,660, including shadow passes. CPU-submit medians are4.9/4.8/4.6ms and GPU medians5.292/5.131/5.273ms over60 samples each. These short differences do not establish a performance improvement. The comparison matches baseline/candidate shadow flags; an earlier unmatched-shadow pilot is retained but excluded. A separate fixed-camera, fixed-age0.5s none/one/two-slot sample records918/942/966 calls and1,272,260 /1,274,756 /1,277,252 triangles. GPU medians5.092/5.157/5.186ms over40 samples show the bounded event cost on this desktop. Raw rendering excludes event-update CPU, gameplay CPU and compositor; two slots are an artificial overlap ceiling, not a phone benchmark.

Six native Home/start/Guide rounds preserve identical new-effect and cached-minion resource identities, with stable Guide caches; unrelated world lazy caches are recorded separately and are not whole-game leak proof. Geometry/texture/material disposal is idempotent, including all four mutable tissue meshes. A notification smoke pilot read before the next active input frame; the corrected driver waits for the actual rejection text. Initial straight-strand visual pilots and logs remain alongside final evidence.

## Preview and operation

The existing restricted preview is rebuilt through `python3 .local/mini_preview_20261007/manage.py rebuild`, preserving the four owned processes and previous hashed assets. `status` reports their identities; use identity-checked `stop` only when the user ends the preview. Only index.html/assets are public; source, credentials and development hooks remain private. Raw process paths, commands, logs and receipts stay in ignored evidence.

Candidate: <https://saver-recorded-digit-could.trycloudflare.com/?review=zombie-fission-20261010>. Formal Pages remains <https://stanatny.github.io/abyssal/?v=0.11.4>. Browser emulation and controlled raw-render measurements do not establish physical-phone heat/FPS or blind full-round balance.
