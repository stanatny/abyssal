# Amazon crocodilian anatomy and swimming review

## Candidate status

Uncommitted follow-up on `fix/penglai-ground-navigation`, based on local checkpoint `55f999f`. The preceding Europa attacks, regional-rare eyes, touch controls and Kraken distance-pressure work are preserved. Formal v0.10.1 is unchanged. This task authorizes a working preview, not commit, push, merge or formal release.

The reported crocodiles looked thin and stylized, with weak head/limb attachment and stiff swimming. All five shared crocodilian factories are rebuilt: Black Caiman, introduced Saltwater Crocodile, Purussaurus, Rootback Colossus and Rootjaw Sovereign. Existing species lengths, populations, habitats, nutrition, speed, attack rules, thresholds and objectives stay unchanged. The Guide and world use the same model.

## Current swimming-posture correction

The user found the first rebuilt model's swim awkward. Inspection identified two concrete causes: folding both limb joints in the same direction swept the distal feet into the torso, and the rigid posterior body made the tail look detached from propulsion. The follow-up reverses the wrist-fold direction, raises the tucked legs along their own flanks, and moves the beginning of the axial wave to the rear body. Hindlimb roots now travel with the pelvic support bone; the head, shoulders and forelimb roots stay stable. No motion is added to the world root, so the established upright river heading still owns translation and turning.

Seven existing axial bones and eight limb bones are reused. A shared weight writer keeps the new nonuniform spine positions consistent with the geometry. The wave increases gradually toward the tail tip, with the existing continuous animation clock and smoothed effort; slow swimming retains restrained alternate foot paddling, while faster swimming trails the feet beside the body. This is a stylized interpretation, not measured species-specific kinematics or a new locomotion simulation. Anatomy, art materials, triangles, draw count, river populations, biological/game lengths, speeds, attack rules and contact settlement stay intact.

[Observations on the aquatic locomotion of young salt-water crocodiles (Davenport & Sayer, 1989)](https://www.thebhs.org/publications/the-herpetological-journal/volume-1-number-8-december-1989/1206-06-observations-on-the-aquatic-locomotion-of-young-salt-water-crocodiles-crocodylus-porosus-schneider/file), pp. 357–358, supplies video-derived observations and drawings of slow paddling, rearward traveling waves, and limbs held close to the body in fast swimming. It concerns captive young saltwater crocodiles; it does not establish adult Black Caiman or extinct/fantasy animal kinematics. No paper images or externally authored models are bundled.

Focused verification belongs to `.local/croc_swim_review/`, whose `before/` and `baseline/` preserve the immediately preceding uncommitted anatomy candidate. Eighteen focused tests cover all five species, conservative pose bounds, stable shoulders, actual trailing foot positions outside their flanks, moving posterior body and tail, frozen-clock behavior, independent skeleton ownership and real posed lord contacts. Native river checks cover the four ordinary species, paused bones, three separated Rootjaw flank hits and all five Guide models in both languages. This follow-up supersedes the earlier claim of an entirely rigid trunk below; its old measurements remain historical evidence. No new performance or phone-temperature claim is made from an animation-only change.

For rollback, restore only this follow-up's three runtime files from `.local/croc_swim_review/before/src/`, with its scoped tests/current documentation. Do not restore the older first-pass snapshot or reset HEAD: the preceding accepted uncommitted model and combat changes must survive.

## Anatomy and movement

Modern forms have a muscular neck and torso, fitted high eye sockets and nostrils, separate oral surfaces, curved interlocking teeth, keeled scutes and a laterally compressed tail. Black Caiman keeps a broad rounded muzzle and dark armor; Saltwater Crocodile has a longer tapering snout, ochre armor and enlarged fourth lower tooth. Purussaurus uses a broader, shorter skull and heavier body. The two fictional giants retain distinct rootlike crowns and thicker armor; they are not presented as anatomical reconstructions.

Forefeet have five digits, hindfeet four with solid webbing; only the first three toes carry claws. Upper/lower limb joints remain connected to the stable trunk. Slow swimming includes restrained rear-foot sculling. Faster movement smoothly folds the limbs backward and strengthens a continuous lateral tail wave. The head and trunk do not roll with the wave. Existing upright heading and actual river navigation remain in charge of translation and turning. The jaw eases into and out of the existing hunter/lord attack phases; it is a pose response, not a new attack.

A single instance-owned skeleton joins the body, tail crests and articulated limbs. Head and eye parts are statically batched. Geometry/material caches remain shared and immutable, while bones, phase, effort smoothing and jaw state belong to each animal. No extra RAF, texture downloads, lights, bloom or sound are introduced. Retiring the encounter system also disposes Rootjaw's private bone texture; ordinary population and Guide models remain in their existing caches.

## References and limits

- [San Diego Zoo: Crocodilian](https://animals.sandiegozoo.org/animals/crocodilian): elevated eyes/nostrils, jaw differences, fourth lower tooth, webbed hindfeet and tail propulsion.
- [University of Michigan Animal Diversity Web: Melanosuchus niger](https://animaldiversity.org/accounts/Melanosuchus_niger/): Black Caiman identity and natural-history context.
- [Australian Museum Magazine, volume 13 issue 6](https://museum-publications.australian.museum/media/dd/Uploads/Documents/30379/AMS368_V13-6_lowres.1b49d5b.pdf), pages 200–201: digit/webbing details, folded limbs and muscular-tail swimming. This is a historical general description, not a modern measured species-specific gait dataset.
- Existing [Amazon source record](amazon_sources.md) retains the extinct-reconstruction and fictional-introduction caveats.

Reference imagery is inspected locally only. Distributed geometry and surfaces are procedural; no reference photo, external texture or model is bundled. This is a stylized realtime reconstruction, not a zoological simulation. Purussaurus soft tissue and all fantasy details remain artistic choices.

## Earlier anatomy-pass checks and costs (historical)

Ignored evidence: `.local/amazon_croc_review/`. The complete pre-change runtime and individual affected-file snapshots preserve the preceding uncommitted work independently of HEAD.

- **892 unit tests** pass, including twelve-second slow/fast/attack poses, stable trunk and hip anchors, connected folded joints, finite conservative bounds, frozen-clock poses, independent bones/shared buffers, private-texture retirement and real posed tail/foot contact. The pre-existing rigid-trunk test now excludes deliberately articulated limb vertices.
- Native Amazon checks retain **409 ordinary residents plus one rare**, with Black Caiman 5, Saltwater Crocodile 4, Purussaurus 8 and Rootback Colossus 3. Both local lords remain present. Four ordinary crocodilians move and turn through the actual loop with no sampled upside-down pose; pause freezes their skeletons. Rootjaw still takes three separated native flank contacts and its defeat alone does not win the two-lord expedition.
- Five real Guide specimens are inspected in English desktop and Chinese 390-pixel layouts. Side, overhead and front atlases use matching cameras. The isolated river close-up uses a controlled specimen-following camera, not a new player camera. The first native harness's unresolved bare-module import is retained as a harness failure, then corrected; no game rule was changed to pass it.

| Model               | Previous triangles / meshes | Candidate triangles / meshes |
| ------------------- | --------------------------: | ---------------------------: |
| Black Caiman        |                 58,512 / 12 |                   28,008 / 4 |
| Saltwater Crocodile |                 58,512 / 12 |                   28,008 / 4 |
| Purussaurus         |                 58,512 / 12 |                   28,008 / 4 |
| Rootback Colossus   |                 61,536 / 12 |                   28,728 / 4 |
| Rootjaw Sovereign   |                 62,784 / 12 |                   29,304 / 4 |

These are asset totals, not whole-frame GPU time. Skeleton size increases from seven tail bones to fifteen including limb joints.

Serial before → candidate → repeated-before samples reuse `scripts/verify_atlantis_performance.mjs` with the Amazon region, deterministic seed, 25 m Orca, position `(278.8453,-65,-620)`, 1440×900/DPR1, headed Chrome 154 on Apple M2 Pro/macOS 26.6.2, 120 frames per quality setting. No concurrent unit jobs ran in this final series; earlier diagnostic samples are kept separately.

High samples remain approximately **60.49 → 60.34 → 59.70 FPS**, with p95 **18.8 → 19.1 → 19.2 ms**. Profiled main-loop CPU is **5.10 → 4.91 → 4.82 ms/frame**; candidate is inside the two baseline observations, so no material CPU/FPS gain is claimed. End-frame triangles are **1.652M → 1.567M → 1.652M**. Smooth is also approximately 60 FPS; changing live visibility prevents attributing all draw-count differences to the model alone. This is a desktop smoke comparison, not an isolated GPU benchmark or a phone thermal result. Physical-device play and natural long-round behavior remain review limits.

## Delivery and rollback

Formatting, build and compiled local/public checks are recorded in [verification](verification.md). The restricted candidate must be rebuilt and byte-matched before delivery; development hooks and private files must remain inaccessible. Its ignored manifest records source/artifact fingerprints and the previous served build.

For a source rollback, restore the three original creature/motion files from `.local/amazon_croc_review/` and revert only this task's descriptive text, scoped retirement hook and new test/module. Do not reset to HEAD: preceding accepted uncommitted revisions must survive. For preview rollback, restore the retained runtime directory and previous manifest; no formal release is involved.
