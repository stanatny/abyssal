# Atlantis puzzle and living-ocean revision

**Submission update (October 1):** The user authorized a commit and push of the reviewed candidate to `feature/mariana`. This supersedes earlier uncommitted/no-push statuses below; main and formal Pages are unchanged. Subsequent engine/platform/performance work is read-only comparison, not implementation or personal-Skill publication.

Uncommitted follow-up to the four-region review on `feature/mariana`. Preserve that review and the accepted Mariana gate sequence. No commit, push, delegation or main integration is authorized.

## Implementation contract

- Atlantis keeps its secret randomly assigned Kraken guardian and 30 m completion threshold. A conch key is independently hidden in one of three existing public buildings each round. Use the accepted wide lower-gallery routes, rather than juvenile-only villas that could make adult players unable to finish. Nearby inscribed tablets offer an optional location clue; discovering the key directly remains valid. The key and guardian are separate requirements, completable in either order. Only their conjunction opens the decorated chest beneath Poseidon's temple; real contact with its sacred pearl at 30 m completes the expedition. No quest object grants nutrition or growth. Returning home resets all puzzle state. Guide, HUD and radar must not reveal the guardian identity in advance.
- Replace slow sideways gull orbiting with continuous forward flight and coherent banking/flapping. Preserve legitimate underwater momentum, airborne feeding, normal bird respawn, pause and map lifecycle. Add independently modeled Brown Pelican and White-tailed Tropicbird with distinct beak, neck, wings and tail. Game habitats and scale are qualified separately from actual distribution.
- Add Moon Jelly and Spiny Lobster as non-fish wildlife with their own Guide group and real regional spawning. Moon jellies pulse their scalloped bell and oral arms; lobsters have segmented armor, ten articulated walking legs, a tail fan and antennae, without invented large claws. Benthic movement is a generic habitat trait, not a species-name branch. Keep ordinary food and the existing hunger/growth formulas.
- Living submarines retaliate against nearby adult intruders with a visible launch warning, a small finite projectile pool and straight-running torpedoes. Aim during the warning; commit direction at launch so lateral evasion and solid cover work. Keep mines distinct. Swept contact must not tunnel, pass through terrain or repeatedly damage from one projectile. Nursery protection, pause, destruction/reset/disposal and existing three-hit submarine destruction remain intact.

## Sources and adaptation

- [Cornell Lab: Brown Pelican](https://www.allaboutbirds.org/guide/Brown_Pelican/overview): large bill/pouch, curved neck, broad wings and low coastal gliding.
- [Hawaii state birding: White-tailed Tropicbird](https://hawaiibirdingtrails.hawaii.gov/bird/white-tailed-tropicbird/): tropical seabird and long central tail streamers.
- [Monterey Bay Aquarium: Jellies](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/jellies): bell, trailing structures and drifting propulsion; anatomical soft tissues are artistic reconstruction.
- [NOAA: Caribbean Spiny Lobster](https://www.fisheries.noaa.gov/species/caribbean-spiny-lobster): textured shell, long antennae and legs. The game's shared regional reef stock is a qualified adaptation rather than an exact distribution survey.

New assets use original procedural geometry and accepted shared skin/material/animation utilities. No external mesh or new sound recording is bundled. Reuse existing pickup, water-Foley and impact sounds through real event paths. Final visual, trigger, resource and browser evidence will be appended after implementation; prototype renders alone are not acceptance.

## Current behavior and ecology

The key is drawn from three adult-accessible lower galleries: Moonbay Sanctuary, Agora Colonnade and Memorial Hall. A conch inscription can reveal the gallery and enable a modest depth-aware radar direction. Reading a clue is optional. The guardian remains an independent hidden draw; discovering the key does not identify it. The chest opens when both requirements are fulfilled, and the 30 m pearl contact remains the final win event. Decorative residential chests are still scenery. New galleries, food rewards, timers or special control buttons are not added.

Each map adds twelve drifting jellies and eight bottom-walking lobsters. Surface birds retain the existing total of 28, now split into eighteen gulls and ten regional alternatives: pelicans for Atlantis/Bermuda, tropicbirds for Hawaii/Mariana. The Guide separates marine invertebrates from fish and records all three birds, the quest and submarine missiles. Current totals are **71 Guide entries plus the separate reward catalog**, with **49 ordinary underwater kinds** across the regional union.

| Region   | Ordinary kinds | Ordinary underwater population |
| -------- | -------------: | -----------------------------: |
| Hawaii   |             28 |                            313 |
| Atlantis |             20 |                            412 |
| Bermuda  |             24 |                            341 |
| Mariana  |             22 |                            333 |

Submarines begin retaliation at 8 m, outside nursery protection, within 95 m and with clear sight. A 2.2 s warning precedes a 32 m/s straight-running torpedo; it costs 20 health on one actual contact, expires after 5 s and has a 14 s per-submarine launch cooldown. The finite six-projectile pool and instanced bubble trail use the main game clock. Solid cover blocks the projectile. Existing 18 m/three-ram hull destruction and separately configured 28-damage contact mines remain unchanged.

## Verification

- **684/684 unit tests**, formatting, shared browser regression (29 checks), and four-region objective verification (six groups / nine actual three-hit fights) passed. The regional objective checks cover key/guardian ordering, wrong-guardian and sub-30 rejection, real pearl contact by both characters, other regional endings, no lord respawn and new-round reset.
- All six actual 30 m gallery approaches (three sites × Orca/Squid) collected the key through normal movement and feeding contact. The Agora key was moved under the nearer gallery roof after the first adult Squid route exposed insufficient clearance at the initial location. Native route evidence is in `native_quest.json`; the original script's subsequent camera-stage error was corrected separately in `chest_view.mjs`, which rendered the final locked/open coffer successfully. No source collision or character size was changed to make the route pass.
- All four native rosters instantiate their configured kinds at legal initial depth/solid positions, including the new wildlife. Lobsters track the actual floor in each map. Both new underwater species were captured through the normal loop and returned at their own habitats after the unmodified 28 s simulation timer; unrelated meals were excluded only in the staged harness. The initial headless timeout reflected slower simulation advancement under host load, not a missing replenishment event; the successful headed serial run used the actual timer.
- The real submarine launch path produced the mobile warning, fired, froze projectile positions on pause and caused one 20-health hit. A fresh round cleared warning/projectile state. Unit cases additionally cover lateral evasion, solid cover, nursery/juvenile protection, disabled/destroyed boats, blocked launches and fast relative contact without tunneling.
- English/Chinese Guide and quest HUD checks covered 1440×900, 390×667 and 320×568: eighteen new-card views and six state-specific HUD views passed, with no horizontal overflow or page errors. Guide filtering isolates the quest to Atlantis and selects the separate invertebrate group. Models, genuine gallery views and final engraved chest geometry were visually inspected; mobile layouts are browser emulation.
- Sixteen destination switches completed four cycles. After lazy asset warm-up, cycles 1–3 plateaued at identical per-region renderer counts: Hawaii 518 geometries/461 textures, Atlantis 512/458, Bermuda 511/459 and Mariana 481/457. This checks repeated-switch resource growth, not all possible JavaScript heap leaks.
- Short serial headed Chrome samples on the Apple M2 Pro at 1440×900 CSS px, DPR 1, High quality and the same four fixed positions measured about 60.1 / 37.5 / 56.9 / 58.7 FPS. Atlantis frame p95 was initially 92.3 ms; three additional 4 s warm-up / 120-frame samples measured 59.9, 59.7 and 33.3 FPS with p95 20.8, 20.8 and 83.2 ms at essentially unchanged draw counts. The host had an unrelated long-running Node gateway consuming approximately four CPU cores. These variable samples do not prove either an optimization gain or a stable new regression. Retain the low samples rather than presenting only the near-60 results. No accepted scenery or ecology was removed to improve the numbers.

Raw evidence and scripts are ignored under `.local/living_ocean_revision/`, including `final_units.log`, `browser.log`, `objectives/`, `native_quest.json`, `native_defense.json`, `wildlife_runtime.json`, `ui_review.json`, `switch_resources.json`, `performance.json`, `performance_atlantis_warm.json`, model/galleries/coffer screenshots and floor views. Production delivery and remaining regional checks are appended below after completion.

Physical-phone controls/performance, the user's external network and natural whole-round puzzle pacing are not established by these staged checks. Existing accepted audio is reused; this revision does not claim a new recording or music rewrite. The candidate remains uncommitted and separate from formal Pages.

## Final delivery checks

- The Mariana browser regression passed all eleven groups on the current candidate: four real three-hit guardian fights, closed/open adult passages, bottom-only victory, 15 m reset, native resident replenishment, isolated rosters/music and narrow English UI. Its accepted gate sequence is unchanged.
- Final formatting and production build passed. The existing bundle-size warning remains; the production JavaScript is approximately 1.52 MB uncompressed / 505 KB gzip. No engine migration or new recording is included.
- The existing restricted preview was refreshed with all eight final production artifacts. Their local and public SHA-256 values matched the build, including code, styles and the five accepted audio files. Eight public English/Chinese region cases exercised destination goals, regional Guide models/quest/missile copy, normal starts and return-home, with no page/console errors and no development API exposed.
- A same-address two-value refresh probe returned the changed content and was removed afterwards. Private repository paths were rejected. The service remains limited to runtime `index.html` and `assets`; exact URL, process receipts, source/artifact hashes and stop instructions remain local in `.local/mariana_preview/manifest.json`. The current candidate has 169 hashed runtime-source files. Preview validation from this host does not establish the user's external-device connection.

Public results are in `public_regions.json` and `refresh_probe.json`. The candidate is ready for user review, **without commit, push or main/Pages publication**. Head remains the previously authorized `4cb70f7` baseline. Preserve the completed four-region review when preparing a later user-authorized submission.
