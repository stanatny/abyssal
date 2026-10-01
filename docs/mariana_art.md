# Mariana art, ecology and audio notes

This is an independently authored, unreleased region on `feature/mariana`. All new models, terrain, environmental decoration and music are procedural source assets. No external model pack, recorded music, generated image or downloaded concept image is embedded. The biological sources and fantasy qualifications are in the [production brief](mariana_brief.md).

## Place and readable descent

The Pacific nursery opens onto a compact vertical canyon. Sixteen height chunks use continuous folded cliff meshes, with vertex-colored sediment bands and the existing shared stone detail material. Contact cells follow the same grid conservatively. The lowest floor sampler handles only the shelf and bottom; four separate intermediate terraces and visible pressure membranes implement the progression barriers. Each membrane is a GPU-animated transparent surface with an explicit dynamic collider. Opening a gate removes that collider, rather than merely hiding its artwork.

Five side ledges, three natural arch passages, attached pale sea fans, scattered living photophores and a bounded three-light pool distinguish descent layers. The marine outcrops use the same wall-fold sampler as the cliff, and organism roots are raycast onto the actual outcrop surface. Earlier detached placements were corrected during review. Deep decorative colonies and giant prehistoric animals are fantasy worldbuilding, not a claim that shallow reef ecology survives at Challenger Deep. Color grades progress from teal to blue/violet; nearby rocks remain readable. The bottom refuge provides a deliberately warm contrast.

The Easter egg is an original programmatic interpretation of SpongeBob: a small waving yellow character beside a ridged pineapple house with a blue door, portholes, crown leaves and stone arches. The character reference is user-requested; the geometry and materials are newly authored, not extracted from another game or production asset. House/arches/platform have contact shapes. It grants no nutrition, growth or bonus reward. Arrival detection is confined to the house approach so the expedition does not end while the scene is still distant.

## Six regional creatures

All six use the existing shared creature factory, Guide previews, normalization and animation interfaces. Immutable geometry/materials are cached; each instance keeps its own skeleton and moving parts. Bodies use closed lofted surfaces, dorsal/ventral pigment, attached eyes and appendages, axial swimming and animated pectoral fins. Long dorsal/anal fins share the body skeleton, preventing separation during tail bends. In-water scale remains biological; tiny residents are intentionally easier to locate with sonar than by treating them as giant food.

| Species             | Distinguishing construction                                                                                              | Gameplay role                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Moorish idol        | Deep compressed body, black/cream bands, narrow mouth and long dorsal streamer membrane                                  | Small safe-shelf groups                                         |
| Lanternfish         | Silver-dark body, prominent eyes and lateral/ventral photophore rows                                                     | Small upper-canyon schools                                      |
| Barreleye           | Transparent head dome, upward green tubular eyes, olfactory spots and broad pectorals                                    | Small independent observation residents                         |
| Deep-sea dragonfish | Narrow dark body, needle teeth, articulated jaw, luminous chin barbel and photophores                                    | Small independent deeper residents                              |
| Mariana snailfish   | Pale gelatinous head, tapering body, continuous fins and wide pectorals                                                  | Small hadal residents at 6,200–8,100 displayed meters           |
| Goblin shark        | Long flattened rostrum, pink-gray body, five gill slits, small dorsal fins, protruding jaw and elongated upper tail lobe | A 4.2 m upper-trench hunter; pursuit speed is a game adaptation |

Barreleye is explicitly relocated into this fictional Mariana roster. Lanternfish and dragonfish are family-level visual interpretations, not claims of an exact local species record. Ancient Giants below their real historical habitats are marked as fantasy feeding populations. The guide category is now “Small Fish & Shoals,” since small animals are not confined to shallow water.

## Original regional score

`music_mariana.js` uses the existing `OceanAudio` graph, transport, voice cleanup, mute and pause paths. It adds no AudioContext or private animation loop. Exploration uses a 58 BPM half-beat sequence, six suspended four-note harmonies, low cello-like partials, sparse glass harmonics and filtered water-pressure noise. The complete harmonic cycle is approximately 99 seconds. Deeper water increases a separate low arrangement bus.

Pursuit has its own 108 BPM half-beat clock with rapid entry, a repeated mid-register figure and restrained percussion. Engaged guardians add lower pulses and glass accents. Combat does not wait for the next long exploration phrase. Leaving danger fades these buses; inactive or returning guardians use the existing encounter engagement rules. Accepted fish Foley, impacts, ink, sonar and warnings remain shared. Signal measurements and native trigger checks are separate from subjective listening approval; see [verification](mariana_verification.md).

## Pacific survey and attached-habitat follow-up

The Mariana-specific surface replaces Hawaii's leisure ships with original 68 m research and 22 m survey vessels: navy hulls, stepped bridge glazing, rails, working decks, instrument cages, a winch, an A-frame and a lifeboat. Instrument buoys are solid obstacles. Moving hulls reuse the existing ramming/sinking controller; restart restores buoy colliders as well as ship colliders. Cool layered stratus, distant volcanic silhouettes and low long swells distinguish the horizon. Islands outside navigable bounds are background scenery, not inaccessible promised destinations.

Five shared organism geometries and materials generate 3,264 decorative instances across 16 vertical blocks. Every root is sampled from a final cliff triangle or interpolated within a raycast final-floor triangle; no unverified analytic height offset floats the colony above a folded wall. Cream cup sponges, rust-colored anemone crowns, layered blue-gray crusts, brittle stars and small blue glimmers have distinct silhouettes. Anemone motion is GPU-only. Deeper blocks have fewer wall patches. Large soft forms and luminous adaptation are explicitly artistic: none is edible, damaging or a new collision obstacle. The marine-decoration pass preserved existing outcrop collisions, food locations and the three-light pool. The subsequent mandatory-Hydra revision adds a fourth guardian terrace using the same reviewed geometry, contact and pressure-membrane template; its existing three-light pool remains bounded.

Shared boundary graphics are four reused world-aligned current planes at the existing movement inset, with particles and surface foam. They fade with proximity and are not new damaging hazards. Mariana's existing solid cliff faces take over below the shelf rather than having an artificial glowing curtain painted over them. Radar highlights the nearest edge and replaces its existing caption with a localized turn-back instruction; it adds no overlapping HUD panel. Resources are scoped to the map or the single application-owned boundary instance.
