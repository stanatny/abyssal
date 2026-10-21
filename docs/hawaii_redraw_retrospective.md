# Hawaii redraw retrospective — 2026-10-21

This review covers the accepted Hawaii art, animation, audio, loading and CPU work released as v0.11.14 at `ebdd86e627cbb0a58246fe157b121fcdba7abc95`. It summarizes existing receipts; it is not a new runtime or device test. Earlier rejected candidates remain in their chronological reviews. The useful outcome is a shorter route from a visible defect to the right correction, not a requirement to regenerate every procedural asset.

## What reduced rework

- Inventory the rendered experience, not just the fish registry. The initial queue missed human appearances; vehicles, projectiles, surface ships, landmarks and repeated scenery needed separate inventories. Count species, appearances and runtime consumers separately. The [batch review](hawaii_creatures_huggingface_redraw.md) retains the changing scope.
- Preserve the original export, conversion recipe and an immediate before-state. This made it possible to repair Tuna colors without another generation, preserve unrelated batch members, and distinguish new defects from old limitations.
- Prove one representative asset through ordinary entry, Guide, movement, failure/recovery and disposal before expanding a category. Once that path works, review several similar assets together; batch size follows integration risk and the user's review capacity, not a fixed quota.
- Compare under the same camera, lighting and inputs, then inspect normal play. A close Guide view reveals seams; world displacement reveals whether propulsion reads correctly. Capture the final encoded video, including transitions, rather than trusting the recording script.
- Keep appearance and mechanics separate. Retaining anchors, collisions, movement and ecology allowed focused visual changes and meaningful before/after comparisons. Visual acceptance, technical checks, save authorization and release status were recorded separately until explicit acceptance.

## Failures that changed the workflow

### 1. An animation parameter cannot repair the wrong rest structure

The added spherical shoulder joints hid a cut in the human surface instead of providing a continuous shoulder. Old joint placement and binding also produced unnatural swimmer/diver poses. The correction required the actual chest-to-arm surface, fitted joints and coordinated strokes, not just valid bone angles. See [appearance and human repair](appearance_loading_human_revision.md).

The Octopus's flat radial fan remained flat after angular compression and small vertical offsets. The final fast-swim shape needed a genuinely three-dimensional arm bundle with preserved arm/sucker sections and an intermediate gather shape. Real footage distinguished resting, crawling and jetting; actual travel drove the transition. See [Octopus review](octopus_swimming_revision.md).

**Next decision:** inspect unanimated geometry, attachments and the desired three-dimensional pose before tuning cadence. A repeated user rejection is evidence to revisit the structural hypothesis. Do not use more passing rig tests to defend a visibly wrong pose.

### 2. A color defect is not necessarily a material or generation defect

Tuna's pale dorsal smears remained under unlit rendering. Simplification had joined UV islands, making new faces sample unrelated colors; the source HF surface was continuous. Re-unwrapping and projecting source colors retained the low mesh's triangle surfaces. It increased seam vertices, so unchanged triangle count did not mean unchanged buffer cost. See the Tuna follow-up in the [batch review](hawaii_creatures_huggingface_redraw.md).

Separately, missing colors across unrelated creatures came from loading: one failed Mechanical Shark map caused a combined promise to discard a successful map, and the rejected result remained cached. More simultaneous assets exposed the weakness. Unchanged texture files did not rule out this shared failure. The [loading repair](appearance_loading_human_revision.md) introduced bounded shared loading, per-map success retention and recoverable retries.

**Next decision:** distinguish source albedo, converted UVs, normals/materials, request state and GPU upload. Widespread loss of color should first lead to the common loader and real request outcomes. A fallback-colored model is usable while loading, not proof of completed appearance. Its loading/error UI also needs review against the actual Guide theme.

### 3. A successful fixture can conceal a broken production entry

The reef inspection explicitly prepared textures, masking a missing preparation call in normal construction. Ordinary entry exposed it. Reef simplification also generated invalid zero normals on thin opposing surfaces, producing dark rendering artifacts. Both defects survived checks aimed only at the isolated export. See [reef integration](hawaii_reef_life_huggingface_redraw.md).

**Next decision:** first exercise the same constructor and preparation path as normal play; a test must not silently supply the missing initialization. Validate every used LOD's normals and visibility, then measure populated-scene cost. Do not reduce accepted bloom or hide a defective surface with extra lights.

### 4. Old optimizations may discard data required by new art

Hawaii's old static batching did not preserve the UVs needed by textured landmarks. New visual assets had to enter a compatible path while preserving the old collision and marker contract. Landmark support required the whole footprint; adult passage required a real traversable opening, not a plausible screenshot. See [landmark integration](hawaii_landmarks_huggingface_redraw.md) and [surface ships](hawaii_surface_ships_huggingface_redraw.md).

**Next decision:** audit attribute preservation, normalization, floor/draft and collision ownership before replacing a factory. Keep old gameplay data independently testable; dispose only private obsolete render resources.

### 5. Sound quality and event correctness are separate

The user selected Stable B for ordinary feeding and MOSS B for the other three audition categories. This is a task-specific selection, not evidence that one generator is universally better. Feeding classification had to use the pre-growth combat decision; lord-hit feedback required a confirmed hit. Breath, roar, charge and sword releases needed their own event semantics. A legacy reverb tail also changed the accepted clip once mixed into the game. See [combat audition/integration](combat_audio_huggingface_audition.md) and [lord attack audio](lord_attack_audio_revision.md).

**Next decision:** audition matched alternatives, retain the selected clip, then verify the real event and audio graph, including overlap, mute and pause. A decoded file, waveform or successful generation does not establish listening quality. A late load must not replay obsolete combat feedback.

### 6. Cache freshness is part of asset delivery

Content-hashed model chunks let unchanged assets survive updates while fresh HTML selects the new version. The review covered persistent-browser reuse, a changed asset, an old open page, rollback and disabled cache. No custom service worker or persistent database was needed for this release. That is an architectural choice for this application, not a general prohibition. See [loading/cache review](runtime_loading_cache_revision.md).

**Next decision:** distinguish network reuse from model construction and first render. On a server whose publication order is controlled, publish resources before their referring HTML and retain assets needed by old pages. Verify actual production headers and replacement behavior; a preview's cache policy does not establish Pages behavior.

### 7. Performance claims must follow the measured cost

Caching deterministic rest normalization and avoiding grid-range temporary arrays improved warm scene construction. Armored Cory's factory mutates shared geometry, so it retained the original bounds path. Exact collision candidate parity was preserved. The serial measurements did not establish a general FPS improvement, physical-phone smoothness or reduced M4 heat. See [CPU optimization](runtime_cpu_optimization_revision.md).

**Next decision:** separate download, decode/construction, CPU frame work, GPU work and resource lifetime. Prove immutability before caching, compare under matched serial conditions, and attribute resource growth to owners rather than treating all retained caches as leaks. Remaining corpse-blast raycast and shader costs need their own experiments.

### 8. Compare the property that must stay invariant

The first release CI failed because a raw collider JSON hash encoded insignificant cross-platform floating-point differences. The corrected test preserves count, order, types and numeric geometry with a narrow tolerance, plus deliberate-change rejection. Exact-final CI then passed; this was a test correction, not a waived failure. See [release v0.11.14](release_v0_11_14.md).

By contrast, deployed files must match the intended CI artifact byte for byte. macOS/Linux gzip files can differ in wrapper metadata while their decompressed content is identical; that comparison answers a different question. Do not replace either check with a broad "close enough" assertion or a list of platform-specific hashes.

## What belongs in Skills

The repository [Creature Polish Skill](../.agents/skills/abyssal-creature-polish/SKILL.md) now routes batch/appearance failures to project-specific loader, consumer and pose guidance. The [Map Production Skill](../.agents/skills/abyssal-map-production/SKILL.md) routes existing Hawaii scenery replacement to UV-preserving integration, normal construction, traversal and lifecycle guidance. Current populations, machine timings, generation quotas and release file counts stay in dated reviews, not permanent rules.

The user subsequently asks about the Hawaii boundary because other maps will follow. Keep three scopes distinct: shared ABYSSAL contracts remain reusable across maps; Hawaii factories and species-specific repairs remain conditional cases; provider-independent methods belong in personal knowledge. For another map, discover its actual implementation before selecting a precedent. A shared creature or loader is not made Hawaii-only simply because its defect was found here, and Hawaii's batching diagnosis is not assumed to hold for every other map.

General methods belong in personal knowledge: diagnose the layer before regenerating, validate ordinary entry before demonstrations, separate technical and perceptual evidence, and measure the actual benefit. Existing general visual, game, audio and preview Skills already cover these domains; this review does not create or modify a personal Skill.

## Next-batch working sequence

1. Select the visible problem and all affected consumers from the current inventory; retain unrelated accepted work.
2. Diagnose source form, conversion, animation, material/loading or integration using the smallest useful comparison.
3. Complete one representative slice through normal play before multiplying the asset family.
4. Review matched form/motion/audio and failure states; run only the relevant regression checks and expand when evidence warrants it.
5. Record user acceptance and remaining limits separately, then commit or release only within the current authorization.

Procedural sea grass, small ambient decorations and other remaining legacy elements are not automatically defects or a promise of another HF pass. Prioritize visible problems, play readability and repeated cost. This retrospective adds no new runtime validation or physical-device claim.

## Documentation verification

Both modified Skill entry points pass the skill-creator frontmatter validator. Targeted Markdown formatting, local links/anchors, referenced code paths and diff whitespace checks pass. Manual routing review covers shared color loss, flat Octopus swimming, isolated palette work and existing reef replacement; the references remain conditional. No runtime source or asset changes are included, so historical game tests were not rerun for this documentation task.
