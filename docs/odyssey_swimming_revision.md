# Odyssean swimming follow-up

Release status: the user approves integration into main as v0.11.10 on2026-10-15. Earlier candidate/branch-only publication restrictions below describe their historical stages. Existing candidate evidence is not newly repeated release/CI evidence. See [the release record](release_v0_11_10.md) and [verification](verification.md).

Accepted on2026-10-15 for a local commit and push of `feat/europa-atlantis-objectives`, together with the other delivered swimming refinement and accepted expedition checkpoint `f360f55`. Earlier uncommitted/no-push statements below describe the original candidate stages. All741 delivered source hashes match before acceptance-only documentation updates. Runtime code and the previously verified build are unchanged; existing test/browser receipts are not newly rerun release evidence. Formal main/Pages remains v0.11.9. This authorization covers branch delivery only, without a version bump, tag or new gameplay change.

## Scope and candidate

The user asks to examine other swimming creatures, especially the Odyssean Mermaid. The current AI agent works alone on `feat/europa-atlantis-objectives`, after accepted local checkpoint `f360f55`. The preceding uncommitted five-kind crocodilian correction stays intact. This new follow-up is uncommitted and unpushed; formal main/Pages remains v0.11.9. Existing services, runtime archives and canceled worktrees remain.

This is a focused review of Nereid, Triton Guard, Tide-crowned Naga, Siren Finweaver and Hippocampus, not a completed visual audit of all159 living factory kinds. Preserve their distinct vertical, lateral and curled propulsion rather than applying crocodilian locomotion.

## Findings and corrections

Native Guide side and cycle frames show Mermaid arms remaining almost rigid behind the shoulder. Triton's separately modeled torso and circular tail root leave a conspicuous waist lip. Their surface detail and fixed head/mouth remain the accepted reference; the Mermaid's existing continuous vertical tail does not need replacement.

Nereid, Triton and Naga now have bounded gentle arm strokes at low effort, a small elbow bend and counter-folded wrist, then blend to a more streamlined trailing pose at speed. Actual palms and fingers remain on their existing skinned arms and outside the torso flanks. Hair on the three human torsos retains a stable head attachment and restrained downstream motion. All five swimmers use one instance-local effort state before their existing callbacks: acceleration and braking do not snap tails, hair or limbs, and an unchanged animation phase freezes the pose even if requested speed changes. No extra animation loop or per-frame geometry is added.

Triton reuses the Mermaid's continuous thorax/waist/tail construction with its own chest profile, armor, colors, thirteen body bones and lower vertical-wave amplitude. One skin spans the upper torso and tail, replacing the stepped overlap; obsolete separate-tail construction is removed. Nereid keeps its exact rest dimensions and mouth position. Triton keeps unit length, width and longitudinal mouth offset; removal of its bulky circular waist lip reduces normalized height from0.226108 to0.218484 and shifts the vertical centering/mouth by0.003812 model units. Feeding still references the visible posed mouth, with unchanged eligibility and tolerances.

World heading review identifies a separate source defect: generic shortest-arc rotation from local -Z can invert a swimmer when it reverses while ascending or descending. The five kinds now register the existing `aquaticUpright` contract, using the shared dorsal-up yaw and bounded pitch in the actual entity loop. No navigation path, travel speed, habitat, ecology, size class, food, attack, reward or objective rule changes. Guide and world continue using `createCreature` → `buildOdysseyCreature` → `buildOdysseyPeople`.

These are original fantasy swimming choices, not measured human or animal locomotion. Existing identity/provenance stays in [Odyssean refinement](odyssey_refinement.md) and the [prior model review](mythic_model_revision.md). No external assets are added.

## Measured model costs

Rest-pose counts are measured through the actual factory with the same seed before and after. Shared geometry/materials and private skeleton ownership remain.

| Kind              | Meshes before → candidate | Triangles before → candidate | Total bones before → candidate |
| ----------------- | ------------------------: | ---------------------------: | -----------------------------: |
| Nereid            |                    27 →27 |               37,736 →37,736 |                         84 →84 |
| Triton Guard      |                    26 →26 |               38,364 →38,340 |                         80 →80 |
| Tide-crowned Naga |                    25 →25 |               37,124 →37,124 |                         84 →84 |
| Siren Finweaver   |                    22 →22 |               33,028 →33,028 |                         68 →68 |
| Hippocampus       |                    11 →11 |               18,284 →18,284 |                         34 →34 |

No new lights, materials, downloads or permanent effects. These counts show no added geometry/skeleton burden; they do not establish a device FPS, power or temperature improvement.

## Verification and delivery

Fresh evidence belongs to ignored `.local/odyssey_swim_20261014/`: the before source snapshot, native before/candidate views, before/candidate rest metrics, focused tests and final integration receipts. Fifty-two focused tests pass across Mermaid motion, all25 Odyssean factory kinds, regional contracts and serpentine regressions. Added checks cover finite continuous actual skin across five-kind acceleration/braking, frozen-phase effort changes, independent cached instances, actual hand motion outside the flanks, stable Triton head/mouth and continuous torso-tail skin, and upright headings through reversal/ascent. Existing Mermaid dimension, waist-wave, shell-fit and disposal assertions pass unchanged.

The first new Triton test compared a local head matrix before world transforms updated; it was corrected to update matrices before taking the invariant snapshot. A first adapted world driver sampled only a lateral bone component for a vertically swimming Mermaid; the corrected probe samples both axes. These are harness corrections, not loosened gameplay assertions. Initial overhead photos were cropped by an inherited inspection camera; matched final framing includes the complete bodies. A metrics driver initially used an incorrect relative import path, then was corrected.

Native headed Chrome confirms real entity movement and frozen paused bones for all five kinds, with sampled dorsal-up dot products0.956–0.998 and unchanged270-member Odyssean inventory. Paused close-ups change only the observation camera and hide the player/HUD; original terrain, wildlife, lights, fog and active NPC interactions remain. Guide cases cover all five in English1440×900 and Chinese390×667 through cruise/fast/braking, retaining the same five model UUIDs across language switches. Three repeated Guide cycles remain117 geometries/44 textures; three Hawaii/Odyssey round trips repeat Hawaii837/829 and Odyssey830/825 geometries/textures. These are finite sampled plateaus, not a long-session leak or physical-device performance guarantee.

Formatting and production build pass. Native public English desktop/Chinese390 Guide/start/pause/Home flows and same-address reload pass without browser errors or production debug hooks. Each restricted local/public host matches all11 build resources byte-for-byte; eleven private paths per origin are denied, all four original process identities remain and tunnel readiness is200. The current bundle is `index-DvA6GLWK.js`. A first compiled driver clicked the prior Amazon selector while waiting for Odyssey; it was corrected to the actual target choice and retained separately. Runtime code was not altered for that harness correction. Native receipts are `native_final/report.json`, public receipts `public_final/report.json`, and exact artifact/privacy/process checks `artifacts.json`. The video captures the real Guide loop with controlled effort and camera, rather than a separately mocked model. Controlled Guide effort/cameras and initial world observation placements are separate from natural encounters. Desktop390px views do not prove physical-phone feel, multitouch, FPS or thermals.

## Operating and rollback boundaries

Reuse the existing restricted index.html/assets host and established tunnel. The ignored delivery manifest records exact source/build hashes, process identities, logs, same-address refresh, and rebuild/stop commands. No development interface or source may be published. Keep the preceding served runtime for rollback.

For source rollback, restore only this follow-up's `creature_odyssey_people.js`, the five-kind upright registration in `creature_odyssey.js`, and its scoped test/documentation additions. Preserve the preceding uncommitted crocodilian changes and the accepted expedition checkpoint. Preview rollback uses the retained runtime, without replacing the established services.
