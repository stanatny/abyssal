# Odyssean Sea — Four Winds implementation review

Status: playable review candidate installed, with natural whole-expedition acceptance still open, 2026-11-24. The player confirmed the [production plan](odyssey_four_winds_trial_plan_20261124.md) and requested development after restoring the default model. The topic is using GPT-6.1-Sol / Ultra / ordinary speed. The local expansion checkpoint is `a141558`; this new gameplay candidate remains uncommitted and is not a main release.

## Implemented contract

Four distributed wind gates each remember a valid whole-body forward crossing and the corresponding guardian's defeat independently. Either order works; completed conditions persist for the round. Three existing guardian encounters retain their attacks. Ladon is a new 70 m single-headed sea dragon with a visible, physically swept tail attack; it approaches close enough to present its tail during the warned stance rather than attacking harmlessly at long range. Ordinary 25 m combat eligibility and three separate valid counters remain.

The trial uses ordinary swimming, turn, rise/dive, slow swim and optional sprint. Real animated visible body bounds conservatively determine passage, including the backward-swimming Squid. Reverse/rim crossings, discontinuous movement, late entry and incomplete tails do not earn progress. Local favorable/adverse current force and visible flow use the same gate state. An admitted actor has a finite tail-clearance allowance. Observation does not freeze hunger or combat. Gate timing follows existing attack states without pausing lord clocks.

All four gate records and 30 m growth unlock the homeward current. The old three-lord victory no longer settles the run. A real continuous arrival at the underwater court triggers victory once. Homeward water is a persistent return route, with steering, exits and a minimap path; it has no escape countdown. Old completion records remain stored under their historical rulesets and do not rank as Four Winds clears.

| Site   | Gate center X / Y / Z, world metres | Guardian                      |
| ------ | ----------------------------------- | ----------------------------- |
| Pillar | -455 / -386.019 / -1035             | Ladon, western middle shelf   |
| Reef   | 275 / -327.582 / -720               | Karkinos, eastern shelf       |
| Echo   | -220 / -742.621 / -1610             | Scylla, southwestern strait   |
| Vortex | 326 / -966.824 / -1890              | Charybdis, southeastern basin |

Actual coordinates derive from the shared final terrain and are consumed by solids, rules, visual effects and guidance. The main four travel currents retain their straight routes. The new guardian's territory is separate from the other three. East/inner sheltered approaches are viable; alternative western approaches at the pillar/echo cliffs are not advertised as level clear water.

Ordinary stock rises 662→665 through three independently anchored passive adult meals near Ladon. Existing fish, three Ceto and original lord supplies remain. The nursery and its 144 residents retain their original configuration. The monument backing was narrowed and offset to preserve a turtle habitat; gate positions were fitted around real recovery-meal routes instead of deleting or moving food to make room.

## Production assets and lifecycle

Ladon candidate 02 is an actual HF TRELLIS generated mesh with original texture, 23,988 triangles and 19,914 vertices. Its complete horizontal anatomy uses uniform rigid normalization; the rejected upright-neck candidate and references are retained. Independent axial skeletons, bounded motion and posed tail anchors share immutable geometry/materials. Fourteen real axial sections supply moving body contact. A new offline interior-topology entry is appended without regenerating prior entries.

The actual HF Aeolus monument has 25,951 triangles and 30,292 vertices, source texture, wind sack and a continuous robed form. It is a stationary architectural landmark above a grounded foundation, not a combat boss. Four local channels and the underwater court respond to real trial state. Bronze frames, vanes and accepted HF columns provide real open apertures, with grounded feet and no solid slab across the waterway.

The map owns finite geometry/material/instance resources and its texture preparations. Disposal releases InstancedMesh buffers before removing the environment group, and constructor rollback owns the child environment. Late asset completion cannot attach to a disposed map. Existing exploration/chase/lord music is retained; the tail uses the existing water-sweep cue and gate events reuse accepted quest responses. New composition/listening acceptance is not claimed.

## Verification record

Evidence is retained in ignored `.local/four_winds/`. Tests, staged native checks, model inspections, natural attempts, performance and public-byte delivery are recorded separately; their overlapping counts are not summed.

The initial broad run had 2,820 checks: 2,803 passed, sixteen failed and one existing Bermuda TODO. Failures exposed stale old-roster/objective/expanded-scenery expectations, missing Ladon story/interior coverage, and real new-structure interference with old adult routes. Frozen historical source/registry fixtures were preserved; only the intentionally changed Odyssey scope was excluded from unrelated-region equality and independently verified. The new geometry and feature contracts were not weakened.

Focused replacements cover four-gate progress and arrival, legacy records, every visible animated player vertex inside its conservative passage envelope, actual Ladon skin/seams/sweep, body contact, audio, lore, whole-scene ecological placement/replenishment, old adult paths, gate construction and resource cleanup. The broad run completed with 2,822 passing checks, zero active failures and one previously documented Bermuda lava-pocket TODO (2,823 total, 235.14 seconds). The final 60-check encounter/attack batch covers the later regressions, including seven actual-rig and sweep checks. The final Guide copy correction passes its twenty affected checks. These overlapping counts are not added together. Formatting and the production build pass.

The first native gate batch was interrupted by source hot reload and retained as failed evidence. A subsequent protected/staged 25/30 m native batch completed all 32 four-character/four-gate crossings and pause freezing. A fresh final Echo batch then passes all eight character/size combinations with the textured monument loaded, eight actual posed envelope supports, complete tail clearance and native pause/resume. The final arrival is reached with native swimming in an isolated prerequisite-staged check. These crossings do not prove natural growth, four-lord combat or entire-round survival.

Native Chrome revealed that a dynamic JSON import with a JSON assertion received Vite's JavaScript wrapper and silently omitted the statue. It was replaced by the same static import pattern as existing assets, and errors are now retained in `state.lastError`. Three real HTTP textured load/dispose cycles pass without page, console or request errors. The missing-statue performance run is explicitly rejected and preserved. Final measurements include the loaded textured monument. A later sample that overlapped host Node checks/build is retained but excluded from the CPU comparison; the last candidate batch ran without another task browser, tests, build or encoder.

## Final adult frontal-admission correction

A fixed equal-height audit of the real 70 m posed rig, fourteen body ellipsoids and the production 25/30 m player body solver found a narrow real mismatch: fully aligned frontal contact first occurs at 45.22/47.33 m, while the initial warning admission was 42 m. Side approaches remained legal. A live straight approach could still trigger from a turning side, so this was not evidence that all approaches were impossible.

The final admission is 60 m, outside the actual frontal hunt and warning-pose contacts. A new regression derives the value from production species data and verifies complete 25/30 m bodies remain unaltered by resolution at admission. Damage, three-hit eligibility,170° warned turn, actual swept-tail geometry and recovery timings are unchanged. A fresh native 30 m approach from 130 m in the populated world reaches hunt, warning, attack and recovery without NPC, phase, clock or quest edits. Only its initial body/location and damage protection are staged. A separate 20-second recording shows this final admission behavior.

## Native actions, scene review and survival evidence

The first unprotected dynamic Ladon check reaches a real tail hit: health drops from about 84.78 to 56.91 while the attack sets its one-hit flag, consistent with 28 base damage and ongoing recovery. The later W+Space ascent reaches the next recovery with no tail-hit flag or attack-time health decrease. Approach contact had already reduced health before that second warning. The raw outer script incorrectly demanded 99 final health and therefore reports `complete=false`; it is retained, and only the specific hit/dodge observations are accepted. A second varied starting pose naturally misses its attack and also retains its unsuccessful outer receipt. Neither has been relabeled a natural combat clear.

An actual moving 18 m bronze turtle at the new western supply slot is consumed by native steering: the controlled 30 m actor receives one real meal and hunger 40→99.96, while the untouched turtle enters its ordinary 27.98-second replenishment state. No prey/reward is moved or granted. Controlled initial location, body size, hunger and damage protection are disclosed. Whole-world tests separately exercise ordinary habitat-aware replenishment.

Actual English Ladon Guide rendering and its 390 px Chinese layout pass, with no document overflow. This caught a remaining three-guardian habitat sentence; the final candidate uses the existing four-guardian localized key. The compiled public Guide is checked separately from development hooks. World overview cameras, actual near-action cameras and a monument overview show the production HF assets, rather than a concept image or replacement geometry.

The first ordinary 3 m Mechanical Shark pilot consumes 114 real meals, reaches 8.47 m and dies after 271.05 active seconds, with hunger 88.69. It did not reach any lord or establish a natural trial clear. A second instrumented pilot was stopped alive after read-only telemetry demonstrated a controller defect: slowing to 5 m/s within 12 m could not close on 5–5.5 m/s visible prey. Its 799 m no-meal interval had no stuck/blocked samples and visible eligible food. That interval does not prove a food shortage. A fresh driver correction removed that unsupported approach slowdown. That uninterrupted instrumented attempt reached 25 m at 362.30 seconds and 30 m at 555.08 seconds, with one genuine native-torpedo Ladon hit. The owned controller’s approach strategy was adjusted live, without changing game/browser state or restarting the expedition; this is disclosed instrumentation, not blind human play. The run ended in starvation at 1166.23 seconds with 114 meals, zero guardian defeats and zero gates. It had loaded the earlier 42 m admission, so it does not validate the later 60 m fight.

Its last real meal was at 1115.87 seconds. Late food-search goals were over 1.1 km away; thirteen later projected-visible-food samples were empty. Manta and whale food had appeared earlier at roughly 94 m but were rejected for reasons the controller did not record. Thus the food-return/search failure is observed, while solid occlusion versus conservative filtering versus accessibility remains unresolved. Neither a global shortage nor adequate whole-round survival is claimed. No fourth natural pilot was started. All pilots use native inputs and read-only world observations, with no growth, vitals, protection, quest flags or teleport grants; they are instrumented route pilots, not blind human discovery tests.

## Measured desktop budget

Matched Chrome 158 / Apple M 6,1280×800, DPR 1, High and Smooth samples use the same six-second populated scenes and native slow swimming as checkpoint `a141558`. Every final scene has frame median 16.7 ms (about 60 FPS), p95 at most 18.1 ms and no sampled frame above 33.4 ms. Main-thread task cost increases:

| Scene                   |   High | Smooth |
| ----------------------- | -----: | -----: |
| Pillar approach         | +52.3% | +61.2% |
| Echo approach           | +20.1% | +18.8% |
| Monument court approach | +16.8% |  +9.6% |

The final measured task cost is about 4.50–6.21 ms/frame. The new assets, posed passage envelopes and ecology add work even though the observed desktop frame budget remains stable. This is not a claim of lower heat, phone FPS, sustained power or all-camera performance. After the final admission tuning, both Pillar quality samples were remeasured without concurrent task browsers, tests, build or encoding. The four Echo/court samples are retained from the preceding isolated snapshot; those locations are outside Ladon’s territory, so its admission value does not enter their encounter branch. The Guide habitat correction changes text only. These scopes are retained in the delivery comparison.

## Candidate delivery

[Play the Four Winds review candidate](https://abstract-socks-accomplish-buf.trycloudflare.com/?candidate=3ded7a4f1fc7b893), then choose **Odyssean Sea**. Refresh an already-open page. This supersedes the expansion-only preview for current review; the previous runtime is archived and its immutable hashed files remain available for old open pages.

Candidate fingerprint: `3ded7a4f1fc7b8933a3dcde88d59d6053fe7cd72b655c8ce24fdc9989673da1c`. All 1,608 production/script inputs and 1,009 built candidate files match the installed manifest. Eleven public HTML/module/model/texture/worker responses match expected bytes; source, configuration and Git paths are denied. Same-address refresh reflects changed runtime content. Public native entry, bilingual Guide, dive, pause/resume, home and reload pass without page/console/request errors or a development interface. Final cold home readiness was 72.85 seconds and refreshed readiness 9.00 seconds on the host through the public origin; these observations do not guarantee loading time on another device/network.

The 35-second H.264/1280×800 initial review video is a silent actual-scene montage with overview/detail, true tail hit and dodge, native passage, Aeolus and arrival. It explicitly labels controlled observer cameras, initial body/location staging and staged finale prerequisites. It predates only the final warning-admission correction; the separate 20-second current-candidate approach clip covers that correction. It is delivered separately from the natural-run evidence and does not establish a complete natural expedition. Raw recordings, failed/partial driver receipts, public checks, preservation audit and hashes remain in the ignored task directory.

## Scope and remaining acceptance

The formal Bermuda release, separate uncommitted Amazon candidate, both established previews and all prior archives are preserved. No main merge, push, version bump or formal publication is part of this task. A new candidate link must identify the exact built artifacts; the earlier map-expansion link alone does not establish trial delivery.

Desktop geometric, native or frame samples do not establish physical-phone heat, sustained power, natural discovery, blind human puzzle understanding or a natural whole-round clear. Any staged prerequisite flags, damage protection or observation cameras in video must remain labeled. The expansion's earlier weak deep-juvenile budget and whole-round pacing limits remain relevant; new gate waits and combat reserves require fresh play feedback.
