# Kraken, Hydra and Leviathan anatomy review

Status: accepted refinement for v0.8.3, based on v0.8.2 / `0967cee`. On October 1, the user explicitly authorized committing and pushing it to `main`; this supersedes the original candidate-only status. English documentation and both player languages are synchronized. Fresh release checks are recorded in [verification](verification.md); report a playable release only after the exact main SHA deploys and its served artifacts and native flows pass.

## Reference and interpretation

These are original fantasy creatures. Historical texts and artworks inform proportions and structure, not a scientifically established appearance or color. No external mesh, texture or illustration is bundled in the game.

- **Kraken:** Pontoppidan's [1755 _Natural History of Norway_ catalogue and digitization](https://openlibrary.org/books/OL6967630M/The_natural_history_of_Norway) establishes the historical Norwegian account. The visual reference is Pierre Denys de Montfort / Étienne Claude Voysard's [1801 _Le Poulpe Colossal_ engraving](https://commons.wikimedia.org/wiki/File:Le_Poulpe_Colossal.jpg): long, tapered, looping arms envelop a ship. This later French colossal-octopus illustration is not Pontoppidan's literal drawing, nor evidence of a real octopus that size. The Commons scan is marked public domain; it was inspected locally for reference only.
- **Hydra:** [Pseudo-Apollodorus, _Bibliotheca_ 2.77–80, and classical vase references](https://www.theoi.com/Ther/DrakonHydra.html) describe/depict a many-headed water serpent. The inspected fifth-century BCE stamnos from Palermo's Regional Archaeological Museum Antonio Salinas has independently curling necks. This game deliberately retains **three** heads and the existing breath ability; the ancient sources do not establish a three-headed species. The Theoi reference photograph remains local and is not redistributed as a game asset.
- **Leviathan:** [Job 41, especially verses 14–22](https://www.biblegateway.com/passage/?search=Job+41&version=KJV) emphasizes jaws, teeth, closely joined scales and a strong neck. [Isaiah 27:1](https://www.biblegateway.com/passage/?search=Isaiah+27%3A1&version=KJV) supplies the twisting sea-serpent imagery. The armored forebody, heavy jaw and longer swimming tail are our interpretation, not a literal reconstruction or an assertion that the text identifies a specific animal. Literary fire imagery does not add a new fire ability; Leviathan keeps Devastating Charge.

## Changes and spatial contract

Kraken's eight arms extend farther relative to its mantle, with varied reach and larger sweeping terminal loops. Paired inner sucker rows follow the same curve and distal transforms. Each arm has delayed root/tip motion. Hydra now has longer S-shaped necks, tapered elongated snouts, swept horns, fitted nostrils/gums, and separate head, neck and jaw movement. Its belly plates follow the local curved surface rather than hanging from a global down offset. Leviathan gains smaller overlapping scale relief, pupil and nostril detail, a fitted jaw edge, and a thicker continuous transition into a curled, armored tail with small dorsal crests and a lateral swimming wave.

Two overlapping cached sweep sections and a buried joint cover permit modest bends without exposing a cut end. Animations transform independent nodes, not shared vertex buffers or the gameplay root. There is no per-frame geometry construction, extra animation loop, added texture or per-creature light. The ordinary static-part material merging still applies within each motion group.

All models retain a centered **unit longitudinal length** before scaling. Longer arms/tails redistribute the existing overall silhouette: the mantle/forebody occupies a smaller proportion, rather than secretly increasing the configured length. Kraken remains 48 m, Hydra 53 m and Leviathan 63 m. Territory and movement bounds, AI, guardian order, growth/feeding rules, three valid flank bites, rewards and regional endings are unchanged. Contact uses the actual moving visible mesh; new appendages are not substituted by invisible proxies. Gran Maja and its existing compatibility proxy are untouched.

Hydra's three named snout anchors survive static merging and rotate with their heads. Breath projectiles originate there in the actual encounter loop, replacing the old approximate root-relative offset. Prediction, three shots 0.45 seconds apart, projectile speed, damage and escape timing retain the shared rules. This changes the physical launch point to match the redraw, not the skill specification.

## Cost and verification

Node measurements use the same `createCreature(kind, 1)` interface and count actual merged model meshes, without environment, ability particles or shadows. The accepted v0.8.2 baseline and the candidate are:

| Model     | Baseline triangles / meshes | Candidate triangles / meshes |
| --------- | --------------------------- | ---------------------------- |
| Kraken    | 25,140 / 12                 | 27,828 / 20                  |
| Hydra     | 30,636 / 17                 | 34,944 / 20                  |
| Leviathan | 23,720 / 7                  | 29,344 / 9                   |

All stay within the existing 35,000-triangle / 22-material-batch per-lord budget. Additional independent joints cost draws; this is an art refinement, not a performance improvement. More detail is not claimed to be free. Cached geometry/materials remain shared between instances, while motions and anchors stay independent.

Development-review checks completed (before release preparation):

- 45 focused tests passed: finite normalized meshes and extreme poses, independent resource sharing, visible-surface contacts including moving distal vertices and real empty-water gaps, transformed mouth anchors, actual projectile routing, three-bite combat, skill avoidance, patrol and English translation coverage.
- Full suite: **699/699** passed. Final Prettier and production build passed; the existing large-JavaScript-chunk warning remains.
- Actual Ocean Guide: English 1440×900 and Chinese 390×667, three views of all three models, no overflow or console/page errors. The revised appearance notes use both locales.
- Controlled actual-ocean renders cover all four regions using their existing atmosphere, terrain, lights and fog. Hawaii retains its actual two-lord random roster; this harness does not enable absent lords. Bermuda captures a 13-second idle joint cycle and sprint/recovery intensity keyframes; desktop close/normal/front views and narrow-screen views cover actual runtime assets. Actors/camera are positioned and ordinary prey hidden for inspection, so these images are not natural encounter-rate or whole-round evidence. No screenshot-only illumination or exposure increase is used.
- Seven real Guide open/select/close cycles inspected all four lord kinds. WebGL allocation/deletion instrumentation showed a stable plateau in both renderer contexts: game 1,392 buffers / 277 textures / 263 programs, Guide 194 buffers / 7 textures / 11 programs. This verifies the measured repeated-view lifecycle, not long-round memory behavior.
- A short candidate-only sample on Apple M2 Pro, macOS 26.6.2, Chrome 154, 1440×900, DPR 1, High, local development server: 25 m character positioned near Bermuda's Kraken, 0.5 s warm-up and 240 live frames. Mean 16.72 ms (about 59.8 FPS), p95 19.5 ms, final render 193 calls / 730,458 triangles. Normal AI/effects ran; invulnerability kept the staged character alive. There is no matched old-model timing comparison, CPU/GPU separation or thermal measurement, so this is a bounded smoke sample, not proof of a speedup or phone acceptance.
- Refreshed the existing restricted production preview and independently checked local and public compiled pages: all eight artifact bytes/hashes matched this build, eight four-region English-desktop/Chinese-touch-viewport flows passed, updated lord appearance copy was present, both characters entered play, pause/resume/home worked, and no development API or console/page error was present. The local preview manifest records 172 runtime-source fingerprints. At that review checkpoint, the public preview was a candidate and formal Pages still served v0.8.2.

Evidence is in ignored `.local/lord_redraw_review/`: reference images, unchanged baseline source, baseline/candidate Guide captures, `world/report.json`, full-cycle/transition keyframes, model costs, focused/full test logs, and subsequent lifecycle/build/preview receipts. These local paths are evidence locations, not public asset URLs.

The user accepted the appearance review and authorized the v0.8.3 release. Remaining verification boundaries: 390-pixel capture is browser viewport emulation, not a physical phone test. No 30-minute thermal claim, natural full-round combat acceptance or new FPS improvement is established.
