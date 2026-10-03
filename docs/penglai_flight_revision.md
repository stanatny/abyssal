# Penglai — flight, ward and guardian refinement

## Status

Uncommitted development candidate on `feature/penglai`, based on released `da0adbe` / v0.9.0. No commit, push, main integration or formal release is authorized. The preceding map and full-roster redraw remain intact. Earlier first-pass and redraw receipts are historical; fresh evidence belongs in ignored `.local/penglai_flight_revision/`.

## Implemented behavior

All four playable characters start Penglai at 15 m through the shared regional configuration. Cubic mass, growth baseline, native launch, menu and English/Chinese Guide explanations agree. Other regions retain their existing starts. The actual inventory remains eighteen ordinary mythic kinds / 418 live instances and five persistent guardians.

The transparent Four-Symbol ward is a hollow spherical shell around the monastery, not a filled exclusion sphere. Swept full-body movement and projectile occlusion respect its boundary. Each distinct guardian defeat dims its sector and updates the bilingual remaining names. Partial victories never create a bypass; the fourth removes the collider and visible ward. A new round restores all four sectors. Its desktop label uses bounded world scale above the sight line rather than filling the view. Narrow portrait screens use the existing objective/progress and blocked-passage notification, hiding the extra world billboard to avoid covering those status panels.

Wenyao retains a broad feathered-carp body; Luo has a slender bronze body, sharply swept wings and paired ribbon tails, with its own animation factory. The Sword Sage has a continuous clothed pelvis, two legs and boot ankles inside his robe. Both feet stand on one broad horizontal sword whose tip points forward. The same model is used in the Guide and encounters. Seven orbiting blades remain separate from the riding sword.

The Sage alternates three remote sword projectiles and a short straight sword-riding dash. Both have 2.2-second warnings. The volley is fixed after target prediction and leaves 3.5 seconds of recovery; the dash travels less than 60 world units and leaves four seconds. Sideways or vertical movement after the warning can evade them. The short dash handles its own continuous contact damage, avoiding an earlier generic contact hit stealing its damage through invulnerability; other lords retain their existing contact rules.

Six collidable floating mountain islands with thirty additional peach trees surround the temple. The original 522 ground trees and 418 residents are retained. The entrance carries the original brush-style raster plaque 以气御剑. Temple roofs, island bodies and tree trunks remain solid; near/far forest detail uses the existing spatial LOD and ownership paths.

## Four-Symbol roles

| Guardian       | Visual refinement                                                                                               | Combat role                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| White Tiger    | Broad chest/shoulders, heavier legs/paws, wider head and neck, proportionate tail                               | Fastest pursuit (44) and leap (110); short 1.05-second attack, visible windup and recovery                      |
| Black Tortoise | Massive dome/plastron, raised fitted scutes, bronze edge armor, thick limbs and continuously rim-coiled serpent | Lowest speed (22); bites and torpedoes are blocked during windup/pulse, followed by a 4.5-second exposed window |
| Vermilion Bird | Layered flame mane, heavier neck feathers, crown/brow, existing broad wings and streaming tail                  | Highest guardian attack damage (46), delivered by warned three-shot flame breath                                |
| Azure Dragon   | Curved undulating segmented body, overlapping joints, stronger brow, paired eyes, antlers and whiskers          | Balanced speed (32), damage (35) and charge, guarding the eastern mountain                                      |

Guarded Turtle contacts grant no hunger, growth or hit credit. Exposed attacks still require three separately validated hits; its stronger defense does not secretly add a fourth. All guardians retain the real 25 m eligibility gate. Four directional victories unlock the Sage; the fifth completes Penglai with no extra 30 m condition. This is game design informed by directional mythology, not a claim that an ancient text specifies these combat statistics.

## Verification method

Use actual shared-factory views and animation cycles, native keys/touch controls and the real collision/feeding/encounter paths. Controlled legal initial positions and isolated phase fixtures are identified as such; they are not a natural whole-expedition test. The ward presentation snapshots use staged defeat flags, while the separate completion regression performs fifteen actual separated mesh contacts and the resulting native ending/reset.

Fresh validation passes 807 unit checks, formatting, the 29-check shared browser regression and the native seven-region/four-character Penglai regression. The latter verifies actual 15 m launch before controlled size changes, aerial and underwater feeding/respawn, all fifteen separated guardian hits, ending and reset. All 23 shared-factory models have front/side/rear/cycle renders; the seven refined assets also have individual close views. Five responsive views (320×568, 390×667, 844×390, 1024×768, 1280×720) have no measured control/vital/boss-panel overlaps and no page-width overflow, with bilingual Guide checks.

Separate native Sage trials show both sword attacks causing damage and being avoidable after the warning: direct volley leaves 44 health; direct dash leaves 72; both lateral-dodge trials retain 100. The stronger Bird volley leaves 8 health when ignored and 100 when evaded. Tiger warning/leap damage and upward evasion pass. A frozen-phase real-mesh Turtle fixture confirms that its active shell grants no damage/hit/hunger credit and a newly staged exposed flank receives one real 70-damage / +8-hunger hit. Controlled positioning/phases and presentation-only ward defeat flags do not replace a natural round.

Short serial headed Chrome samples on M2 Pro / 16 GB / macOS 26.6.2, 1440×900, DPR1, High, controlled 25 m player, 150 frames per view:

| View          | Triangles | Draw calls |   FPS | Frame p95 | Render CPU mean |
| ------------- | --------: | ---------: | ----: | --------: | --------------: |
| Lotus nursery | 2,598,802 |      1,270 | 59.42 |   18.0 ms |         5.16 ms |
| Monastery     | 1,036,692 |        377 | 60.18 |   18.2 ms |         3.32 ms |
| Clouds        | 1,022,484 |        357 | 60.33 |   18.3 ms |         3.28 ms |

These are CPU render-call timings, not GPU elapsed measurements. Compared with the preceding redraw table, submitted triangles rise about 6–13% and draws rise as the floating islands, guardians and ward add work. This is a quality expansion, not a performance improvement. The final portrait billboard rule hides one sprite in that viewport and does not change these desktop conditions. Twenty-one serial map switches show equal geometry/texture counts in the second and third warm cycles; pause performs zero repeated renders and freezes active time. Stable lifecycle counts do not prove low heat or memory use.

The refreshed restricted build passes twenty native compiled cases on each local/public host: English desktop and Chinese touch-viewport starts, skills, pause/home across all seven destinations, plus all four Penglai character starts at 15 m. The Guide has eighteen mythic ordinary kinds and five guardians with synchronized role, ward and skill copy. All nine artifacts match both hosts and all 248 runtime source fingerprints still match the built source. Private source/config probes are denied, and the same public address serves the refreshed index. No debug API is exposed in the compiled candidate. Process/receipt details remain in ignored `.local/penglai_flight_revision/manifest.json`; formal six-region v0.9.0 is unchanged. Physical-phone performance/heat, full-round pacing and subjective visual acceptance remain player-review limits. Do not describe a touch-sized browser viewport or refresh-capped desktop FPS as physical-device acceptance.
