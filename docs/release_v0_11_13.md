# v0.11.13 — Player Creature Redraws

The user accepts the current version and authorizes publication to main on 2026-10-19. This release integrates the reviewed `art/mechanical-hf-redraw` branch through sprint checkpoint `d63ae37`, following v0.11.12 / `8676fe9`. All 836 accepted source fingerprints and 17 build artifacts match before release-only version, footer and documentation edits. Earlier candidate/local-only restrictions are historical for this accepted scope; future changes return to the default authorization rule. The current AI agent integrates alone. No tag or GitHub Release is requested.

## Included changes

- **Zombie Shark and companion:** replace the old body with the reviewed generated surface and anatomical rig, straighten the resting tail, keep the complete caudal fan coherent, and improve chest-fin pivots and motion. Each instance retains independent bones and motion state while sharing geometry/materials. Existing split, corpse-blast and feeding rules remain.
- **Mechanical Shark:** publish the final cinematic silver/graphite armored design with articulated rear drive, fitted hardware and body-side pale-blue boosters. Preserve missiles, effect anchors and gameplay. Clamp the plume shader's fractional-power input to prevent invalid HDR pixels and the sprint black-frame artifact. Earlier rounded, blue and red/gold candidates remain historical, not active runtime alternatives.
- **Orca:** integrate the reviewed body, horizontal tail/flipper rig and softer organic shading. Pad texture islands offline to prevent bright atlas-seam lines; preserve every covered pattern RGB value. No geometry or swimming change is hidden in that texture correction.
- **Giant Squid:** integrate the cleaned mantle/fin body and continuous arms/tentacles, with coordinated fin waves, mantle contraction and jet poses. Correct the thin fin-edge normals and soften baked contrast without changing ink/jet mechanics.
- **Sprint readability:** increase tail cadence and moderately strengthen tail travel on both sharks and Orca. Restore visible chest-fin trim while keeping their streamlined sprint poses. Distinguish Squid normal sprint from its stronger jet, preserving more fin motion in normal sprint. Ordinary sampled cruise motion remains identical to the accepted baseline.
- **Production workflow:** include the user-approved repository Creature Polish Skill, reproducible offline preparation tools and geometric/motion regression checks. No personal Skill repository is changed.

See the [Zombie review](zombie_huggingface_redraw.md), [final Mechanical review](mechanical_cinematic_revision.md), [Orca/Squid review](orca_squid_huggingface_redraw.md), [shark motion review](shark_swimming_revision.md) and [four-player sprint review](player_sprint_motion_revision.md) for sources, asset processing, resource measurements and original acceptance evidence.

The final generated assets add download and texture costs relative to the previous procedural players. Only active assets are included in the 17-file runtime payload. This is a visual release, not a claim of improved device frame rate or reduced heat. Movement physics, ecology, survival, combat, rewards, skill costs, regional objectives and bilingual controls remain unchanged.

## Verification and publication

Fresh local release checks pass 1,324/1,324 tests, formatting and the production build. Native Chrome on the restricted compiled release passes four character start/sprint/skill/pause/Home flows, eight bilingual player Guide cases, all eight regional start/pause/Home routes, localized v0.11.13 footers and same-address reload, with no observed browser errors or production hooks. All 17 runtime files match dist and both restricted/public origins; eleven private paths per origin remain denied. Original service identities and tunnel readiness are preserved. These desktop/narrow checks are not physical-phone or thermal evidence. Exact-main CI/Pages receipts follow separately.

Fresh release formatting, full unit tests, build, compiled native UI checks, exact-main CI and deployment receipts belong to ignored `.local/release_v0_11_13/`. Verify the actual published version/footer, all CI artifact bytes and native interactions before declaring publication complete. Preserve the restricted preview's original processes and logs; its source remains index/assets only.

Accepted candidate evidence remains separate: the latest sprint pass has 31 focused tests, actual-vertex before/after measurements, eight native character/viewport flows, eight public bilingual flows and 17 matched runtime files. The existing black-frame investigation and individual rig/resource reviews retain their recorded scope. They are not newly rerun full release results.

Native desktop and 390 px views do not establish physical-phone ergonomics, sustained heat or whole-round difficulty. Fixture motion videos are distinguished from actual world travel. No new inference request or quota use is required for this publication.

## Rollback

The preceding main checkpoint is `8676fe9` / v0.11.12. A rollback should revert this integrated release with matching version/footer documentation, preserve existing services and archives, and follow the user's publication authorization.
