# Atlantis Art Production Notes

## October 1 lighting refinement — v0.8.1

The [current material review](atlantis_light_review.md) supersedes the earlier luminous-wall-inlay presentation below. Rectangular lapis decoration is non-emissive, with shared weathered marble texture. Decorative pearl and inscription emission fades with real camera distance; local shell-pearl lighting and the fixed point-light pool remain. The user accepted this refinement and authorized the v0.8.1 main-branch patch; release evidence is recorded separately. The older source-status, lamp and first-pass statements below are historical production records, not the current release contract.

Status: revised development candidate, not a main-branch release. Kimi authored the first city, night surface, fleet, and seven creature modules in an isolated worktree. Codex integrated and refined them, but the user rejected the prior city's scale/detail and creature/UI presentation. Those internal art-review conclusions are superseded. The current city replacement and seven-creature revision remain subject to integrated verification and user art review. The [verification record](atlantis_verification.md) retains historical measurements separately.

## Current marine-light and vertical-city revision

Street-lamp and torch-shaped kits are removed. The replacement is a fantasy luminous shell habitat: ribbed double valves, a scalloped nacre rim, an iridescent interior, and a softly glowing pearl. Route specimens rest on slope-fitted natural reef bases; smaller versions inhabit architectural niches. They are environmental decoration, not a claim that real pearl oysters provide street-scale light or a new edible species. Shared geometry/materials are retained between map instances; private instance buffers and multilevel meshes are disposed once.

A true in-game close render exposed two defects: excessive near-source light clipped the shell to white, and the sloping seabed cut through the lower valve. The revised source lowers pearl point-light intensity and places the entire shell above its sampled footprint with a natural reef support. No screenshot-only illumination is used. The existing city-local ambient/fog blend supplies distant readability.

Three new [multilevel complexes](atlantis_underways.md) provide traversable under-deck galleries, upper halls, and a central open well. Their source and collision geometry share dimensions; existing kits are excluded from reserved footprints.

## Original assets and references

The models, vertex colors, procedural textures, sky shaders, and architecture are original code-generated assets. No museum photographs, third-party models, or reference illustrations are bundled. Biological references and reconstruction uncertainty are documented in [ecology sources](atlantis_ecology_sources.md) and the [creature revision record](atlantis_creature_revision.md). They inform anatomy and do not grant redistribution rights to their illustrations.

Atlantis and its Poseidon monument are fantasy architecture, not an archaeological reconstruction. The replacement draws on Greek courtyards, stoas, column orders, pediments, domed rotundas, gateways, towers, and temples. Eroded marble, bronze, mineral inlays, amphorae, lamps, damaged walls, and fallen columns provide surface and structural detail. Luminous mineral bands and amber lamps support underwater reading; their effect still requires inspection in the revised runtime scene.

The minimum comparison remains the accepted refined assets named in the [quality standard](asset_quality_standard.md). New fish share the live-world and Ocean Guide models. Ordinary fish-feeding Foley, music, voices, blood/intake effects, sonar, and Kraken ability effects reuse existing event paths; this feature introduces no new animal recordings or synthetic voices.

## Revised city scale and construction

The previous compact city and enclosing internal cliff shells are replaced by five continuous districts: Moon Harbor, Drowned Agora, Sacred Avenue, Poseidon Acropolis, and Starless Necropolis. Seabed paving spans x=-275..275 and z=-1080..-100. The 539,000-square-unit district occupies 69.64% of the horizontal sea's 774,000 square units. Roads, plazas, and open building plots are included; this is not a claim that solid buildings cover 70% of the sea.

The source snapshot has 100 lots and 222 building records: 87 courtyards, 61 villas, 33 ruins, 19 stoas, 8 towers, 4 gateways, 7 rotundas, and 3 temples. Columns, obelisks, amphorae, and 64 caged lanterns are additional decoration rather than part of that building count. Buildings stand on terrain-following foundations with buttresses and cornices. Fluted shafts, capitals, arch stones, pediments, stairs, colonnades, and roof details add depth; openings have separate solid parts rather than a box sealing the entire entrance. The central avenue and royal arena remain open for travel and large-character combat.

Poseidon retains its sculpted trunk, limbs, face, layered hair/beard, drapery, and trident grip, now at 1.55 times the previous model scale. The earlier statue geometry measured about 87,000 triangles in three material draws; scaling does not add geometry. That count describes the monument, not the whole replacement city. Its collision and lighting anchors are transformed with the visible statue.

Architecture is instanced by 32 spatial chunks; source snapshot counts include 9,689 city collision volumes. A static collider grid narrows nearby queries. The light pool reuses five point lights, with fewer visible in smooth mode. These are implementation/resource facts, not proof of good frame rate, collision correctness, or visual acceptance; the current integrated measurements and limits are in the verification record.

## Creature geometry and motion

All seven regional assets received further anatomy/material work. Seahorse now has a compressed plated trunk, smaller plate junctions, a low coronet, exposed eyes, cheek-level pectorals, and a rougher mottled surface. Its earlier accordion-like corrugations are removed. Swordfish has a shallower, slimmer torso and a more coherent bill/head profile. Spadefish, cuttlefish, blue shark, ichthyosaur, and Helicoprion also have focused refinements documented with new rendered evidence in the [creature revision record](atlantis_creature_revision.md).

Cached geometry/materials remain shared while animation state is independent. Ordinary model scale uses total Z span, including the appropriate tail, bill, or arms. The upright short-snouted seahorse is normalized by Y height and documented as such in both languages. This is a model-length convention, not a biomass claim. The earlier seahorse tail test sampled 2,883 frames at three effort levels and measured root separation below 1.3e-9 model units; it remains historical seam evidence, not acceptance of the revised anatomy.

## Night and resource ownership

The moon, star field, Milky Way shader, and island silhouettes distinguish the surface from Hawaii. The same moon direction drives the real directional light and cached night reflection environment. Normal regional fog and localized illumination apply during play; diagnostic screenshots do not justify capture-only lighting. The fleet retains three distinct small craft with layered hulls/decks, rails or rigging, cabin details, lamps, and moving wakes. Hull colliders follow actual bobbing/heading transforms.

The city, reef, sky, and fleet update through the existing game loop without independent RAF loops. Cached source geometry and materials are retained; per-world merged buffers, instances, particle geometry, and cloned materials are disposed by their owning map. Inactive populations are detached and reused on returning to the region. Repeated map switching and current resource-ownership checks passed for the replacement city. They do not establish long-duration or physical-device performance.

## Inspection evidence

Ignored `.local/` retains the previous multi-angle creature, city, Poseidon, night-breach, mobile, geometry/contact, and resource captures. They document the rejected candidate and its earlier fixes. New creature evidence is under `.local/creature_revision/`; new bilingual menu/guide evidence is under `.local/atlantis_guide_revision/`. New city evidence is under `.local/atlantis_city_revision/`: five districts, a wide overview, Poseidon, and desktop/narrow follow-camera views. Codex reviewed these renders; exact collision/resource tests and the source-matched preview receipt are recorded in the verification document. User art review remains pending.

Free-camera and staged-position views are controlled inspection. They use runtime assets, but do not prove natural discovery, a complete 30-minute round, physical-phone performance, or user acceptance.

## City-light and outskirts follow-up

The main avenue, cross streets, and arena perimeter carry 64 warm bronze-and-marble lanterns with caged emissive cores. Their pedestals avoid buildings and the grown-player travel route. Real gameplay uses a stronger, warmer city-local ambient/ground fill and slightly thinner city fog; night sea and outskirts retain their separate dark field. The fixed light pool stays at five point lights (three visible in smooth quality), rather than assigning a GPU light to every lantern. Main-city and outer-street follow-camera views were checked at 1440×900 and 390×667.

The integrated map places 23 low-profile relic/garden clusters outside occupied city/reef footprints: 14 broken-stone groups, 9 amphora caches, 92 sea fans, and 138 small cold-glowing sponges. These add 55 merged meshes, 154,012 triangles, and 85 fitted small solid volumes, divided across 13 distance-culled sectors. There are no additional point lights, animal species, audio assets, or independent animation loops. The forms are original procedural work, reusing the existing detailed amphora and sea-fan geometry. Ownership tests preserve shared source kits while releasing per-map merged geometry and materials exactly once.
