# Penglai Sanctuary — production brief

## Scope and authority

Build an independent seventh destination immediately after Europa on `feature/penglai`, based on reviewed v0.9.0 / `da0adbe`. Implement independently. Do not commit, push, integrate main or publish a formal release without subsequent authorization. Existing regions, four player characters, survival, normal meal settlement, abilities and records remain intact.

## Fantasy and art direction

An original interpretation of Chinese mythology, not a historical reconstruction. The Kun/Peng transformation comes from Zhuangzi, not the Shan Hai Jing. All playable animals may fly and swim in this region alone; this is a deliberate adaptation. No Avatar imagery or copied commercial assets. Document classic references and original additions separately.

A readable jade-and-ink landscape: layered limestone mountains, low mist, winding shallow lotus waters, hanging cliffs, peach groves, pine and bamboo, red-column pavilions and a monumental Taoist monastery with curved dark tile roofs. Underwater habitat remains shallow. Travel between water, shore and sky uses one continuous camera and movement system. The mountain silhouette and monastery stay recognizable at normal camera scale; sparse gold light must not erase material detail. The player crosses actual solid terrain instead of penetrating mountains. Decorative scenery must not block promised adult routes.

## World and travel contract

Regional bounds: x ±600, z -1400..160, water surface 4, lowest floor about -140, maximum sky altitude 620 world units. World/land samplers, rendered terrain and solid structures must agree. Flight uses a regional surface capability; it has neither automatic water-surface pitch correction nor ballistic breach behavior. The existing real-floor recovery still applies. Regional abilities, companions and torpedoes work in the fantasy air medium, with actual terrain occlusion and unchanged resource costs.

All four playable characters start this expedition at 15 m; mass, growth baseline and both-language start explanations must agree. The southern lotus cove is the food-rich protected nursery. The central monastery stands above the water. East: Azure Dragon; west: White Tiger; south: Vermilion Bird; north: Black Tortoise entwined with a serpent. All four patrol locally, defend territory and remain defeated for the round. The monastery is surrounded by a transparent hollow solid ward, with four visible sectors and a bilingual remaining-guardian label. It blocks full-body entry and projectiles until all four distinct guardians are defeated; partial victories change the presentation but do not create a shortcut. The sword sage remains visible inside, then becomes the final challenge. Shared 25 m eligibility and three separated valid hits apply. Victory requires all five local guardians defeated; no extra 30 m gate. An optional Dragon Gate ascent illustrates the carp legend and guides exploration without bypassing guardians or awarding free boss damage.

## Ecology and anatomy

At least eighteen independent ordinary mythic kinds, with protected small prey, substantial medium prey, land/air/water hunters and late threats. They must not leak into any other destination. Explicit flight, ground and habitat traits drive shared runtime behavior; no name/region exceptions in generic spawning. Ground animals walk on actual land, with bounded warned leaps. Every kind needs anatomy beyond a recolored primitive: visible head/eyes/mouth, distinct silhouette, purposeful fins/feathers/limbs, surface patterns and articulated motion. Chinese dragons are long serpentine four-legged beings with antlers, whiskers and mane, not Western winged dragons. Black Tortoise includes its serpent. White Tiger must read as a striped feline, Vermilion Bird as a long-tailed feathered bird. The sword sage has a face, robes, a continuous pelvis/legs, both feet on one horizontal giant sword pointing forward, and orbiting attack swords. He alternates three remote blades and a short straight sword dash, each with a 2.2-second warning; recovery is 3.5/4 seconds respectively. White Tiger is muscular and fastest; Black Tortoise is massive and armored, rejecting attacks during windup/pulse then exposing a 4.5-second window; Vermilion Bird has a thick flame mane and highest damage; Azure Dragon has a curved flying body, commanding face and balanced attributes. Three valid separated hits and the shared 25 m gate remain unchanged.

Use immutable cached geometry/materials with independent joint transforms. Inspect every kind from multiple angles and whole motion cycles. Compare guardian scale to the player in the actual world; a catalog harness alone is insufficient.

## Music and interface

A restrained original pentatonic exploration score with plucked and breath-like timbres. Entering pursuit must produce a clear rhythmic/low-register contrast immediately; guardian fights add bounded metallic sword/bell accents. Avoid continuous noise and inflated reverb. Keep voices and update scheduling bounded.

Synchronize English and Chinese selection, regional introduction, Mythic Life guide group, habitat/altitude explanations, guardian lock state, HUD and records. In air show altitude rather than misleading zero depth. Radar identifies routes and remaining guardian directions without exposing unrelated map objectives. Preserve touch layout, native keyboard controls and visible focus.

## Implementation and checkpoints

1. Representative finished slice: protected lotus cove, mountain/pavilion, free air/water travel, a complete winged fish and dragon at runtime. Inspect actual rendered views before replicating kits.
2. Expand terrain/temple/groves, full ordinary roster, ground leaping behavior and four independent guardians. Integrate real populations and normal assigned-habitat respawn.
3. Integrate sword-sage shield, swords, ending, unique music, Dragon Gate and bilingual Guide/HUD.
4. Verify all playable roles, real creature contact, surface/ground transitions, torpedo and companion air occlusion, actual guardian lock/unlock and separated hits. Verify other regions retain registration and flight restrictions.
5. Run fresh formatting/unit/build and relevant native browser checks. Measure populated desktop scenes and repeat region switches; distinguish display-capped FPS from CPU/GPU/draw cost. Physical-phone heat and a natural full round remain player-review limits.
6. Rebuild a restricted compiled candidate, verify source/artifact hashes and native local/public flows, then provide the actual playable link. Formal Pages remains v0.9.0.

## Evidence ownership

Raw renders, scripts, measurements and manifests belong in ignored `.local/penglai_review/`. English review documents record what was actually tested and remaining limits. No shared Skill publication is part of this new map task.

## Current follow-up

Six collidable floating islands with thirty peach trees surround the monastery. An original brush-style plaque reads 以气御剑. Wenyao and Luo have separate anatomy/animation factories. The current supply follow-up has 441 ordinary residents, including 36 northern medium/large recovery animals, following the preceding living-scene inventory of 454. Eighteen other rewards are sampled separately along water/air routes, apart from the three introductory supplies. Entrance stairs clear the mountain and have matching solids. Continuous aerial formations, an independent feline White Tiger and persistent slow Sage pursuit after unlocked entry remain. Six stone paths reach actual summit pavilions; their clearance relocates the visual layout from the preceding 522 ground trees to 489 ground trees, with the thirty floating-island trees unchanged. The monastery exterior and roof volumes are closed. See [the current supply/stair review](penglai_supply_revision.md) and [preceding living-scene review](penglai_life_revision.md); preceding [flight/guardian receipts](penglai_flight_revision.md) and initial/redraw receipts remain historical.
