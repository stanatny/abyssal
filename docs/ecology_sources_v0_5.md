# v0.5 Ecological Scale and Sources

Checked on 2026-09-27, including the v0.5.1 replacement of the wild squid with an octopus. Sources include museums, marine research institutions, NOAA, and original research papers. “In-game length” below is a game parameter for models and feeding comparisons; it does not represent actual biomass or danger. Growing a character from 6 m to 30 m, placing modern and ancient creatures together in fantasy Hawaii, abilities, and rewards are game design choices.

## Scale and depth layers

- `src/ecosystem_config.js` is the single configuration table for ordinary creatures. `depthMin/depthMax` use world-coordinate meters; the interface displays 4 times that depth, explicitly labeled “in-game depth layer” in the Ocean Guide.
- Actual maximum length is not typical length. Giant squid total length includes very long feeding tentacles, manta rays are usually measured by wingspan, and green turtles often by carapace length. These measurements cannot directly compare body size.
- “Ocean Predators” is the game's category for modern hunters, ordered internally from shortest to longest. Deep-sea anglerfish remain small ambush predators. The sperm whale is the largest modern opponent in this table; its attacks on the player are a gameplay choice.
- This release combines every species in one fantasy region. It does not claim that sardines, northern anchovies, Pacific herring, and all other included species occur naturally in Hawaii.
- Fossils of ancient creatures can be incomplete, and size estimates uncertain. Their deep-water appearance here is a fantasy “revival layer,” not a fossil-supported ancient habitat depth.

| Species               | In-game length | Displayed in-game depth | Real-world reference and design choice                                                                                                       |
| --------------------- | -------------: | ----------------------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Coral fish            |          0.8 m |                20–136 m | An artistic combination of several reef fish, not a single species                                                                           |
| Anchovy               |         0.18 m |                20–100 m | Northern anchovy: small, slender, and schooling near the surface                                                                             |
| Sardine               |         0.30 m |                20–120 m | Pacific sardines can exceed 12 inches and often form dense schools near the surface                                                          |
| Herring               |         0.26 m |                28–160 m | Pacific herring are roughly 24–34 cm, varying by region                                                                                      |
| Mackerel              |         0.55 m |                32–180 m | Pacific mackerel can reach about 25 inches; wavy back markings, finlets near the tailstock, and schooling                                    |
| Flying fish           |         0.40 m |                  8–40 m | Size varies by species; enlarged pectoral fins support gliding above water                                                                   |
| Green turtle          |         1.20 m |                12–128 m | NOAA gives adults as about 3–4 feet, commonly measured by carapace length; feeds in shallow water and must surface to breathe                |
| Ocean sunfish         |         3.00 m |                20–300 m | Large Mola mola are about 3 m; laterally flattened, truncated tail, tall dorsal and anal fins                                                |
| Bluefin tuna          |         3.00 m |                48–400 m | Pacific bluefin tuna have a maximum reported length of about 3 m                                                                             |
| Manta ray             |         4.00 m |                40–480 m | This parameter is the model's longitudinal game scale; real giant manta rays are commonly described by a maximum wingspan of about 8 m       |
| Deep-sea anglerfish   |         1.20 m |              500–2600 m | MBARI gives deep-sea anglerfish a maximum of about 1.2 m and depths of 300–4000 m; many species are much smaller                             |
| Hammerhead shark      |         4.00 m |                48–560 m | Based on a large scalloped hammerhead; warm coastal and offshore waters, with deep dives possible                                            |
| Great white shark     |         6.40 m |                72–660 m | NOAA gives a maximum adult length of about 21 feet; typical adults are smaller                                                               |
| Giant Pacific octopus |         5.00 m |               100–800 m | Based on an arm span of about 16 feet, not trunk length; the game's longitudinal/collision scale is standardized to 5 m                      |
| Sperm whale           |        16.00 m |              280–2080 m | NOAA gives large males as about 52 feet; deep dives to hunt squid; females are usually smaller                                               |
| Dunkleosteus          |         6.00 m |              660–1360 m | Size reconstructions are disputed; a museum overview gives historical estimates of about 3–10 m; the game's old 21 m value is no longer used |
| Pliosaur              |        11.00 m |              920–1840 m | Large Pliosaurus are estimated at about 10–12 m; short neck, large head, four flippers                                                       |
| Plesiosaur            |        12.00 m |              720–1560 m | Uses a large elasmosaurid representative; does not incorrectly assign 12 m to the genus Plesiosaurus, which is only about 3.5 m              |
| Mosasaur              |        13.00 m |             1040–2080 m | Mosasaurus hoffmannii is estimated at about 11–18 m, with continuing disagreement among studies                                              |
| Basilosaurus          |        18.00 m |             1200–2320 m | Estimated at about 15–18 m; extremely long body and small hind limbs; a whale                                                                |
| Megalodon             |        20.00 m |             1320–2560 m | Size is inferred from fossils; recent maximum estimates approach about 24 m; the game uses 20 m                                              |

## Checkable sources

### Small schooling fish

- [NOAA: Pacific Sardine](https://www.fisheries.noaa.gov/species/pacific-sardine): Length, blue-green back/black flank spots, and dense near-surface schools.
- [NOAA: Northern Anchovy](https://www.fisheries.noaa.gov/species/northern-anchovy): Scale and behavior of small coastal schooling fish.
- [NOAA: Pacific Herring](https://www.fisheries.noaa.gov/species/pacific-herring): Coastal schooling, regional length differences, and silvery countershading.
- [NOAA: Pacific Mackerel](https://www.fisheries.noaa.gov/species/pacific-mackerel): Maximum of about 25 inches, wavy back markings, finlets, and schooling behavior.
- [Australian Museum: Flyingfish, Cheilopogon sp.](https://australian.museum/learn/animals/fishes/a-flyingfish-cheilopogon-sp/): Size and elongated pectoral fins as recognition features. The game's fright trigger, glide duration, and water-reentry path are design parameters.

### Large modern creatures

- [NOAA: Green Turtle](https://www.fisheries.noaa.gov/species/green-turtle): Adult scale, scutes, shallow-water feeding, and surface breathing.
- [Australian Museum: Ocean Sunfish](https://australian.museum/learn/animals/fishes/ocean-sunfish-mola-mola/) and [Museums Victoria / Fishes of Australia: Mola mola](https://fishesofaustralia.net.au/home/species/785): Disc shape, truncated tail, and the scale of large individuals.
- [NOAA: Pacific Bluefin Tuna](https://www.fisheries.noaa.gov/species/pacific-bluefin-tuna): Maximum reported length of about 3 m.
- [NOAA: Giant Manta Ray](https://www.fisheries.noaa.gov/species/giant-manta-ray): Wingspan measurement, filter feeding, and distribution.
- [MBARI: Deep-sea Anglerfish](https://www.mbari.org/animal/deep-sea-anglerfish/): Depths of 300–4000 m, a 1.2 m maximum, and lure-based ambush hunting. Shallow-water frogfish behavior must not be used to explain this model.
- [Florida Museum: Scalloped Hammerhead](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/scalloped-hammerhead/): Hammer-shaped head, size, distribution, and feeding behavior. Maximum values vary with samples and regions; the game uses a large 4 m representative, not an average.
- [NOAA: White Shark](https://www.fisheries.noaa.gov/species/white-shark): Maximum of about 21 feet, countershading, and temperate/subtropical distribution.
- Giant squid is now a selectable character only and no longer spawns in the wild. Growth from 6–30 m is a gameplay choice. The biological reference, [Smithsonian: The Giant Squid](https://naturalhistory.si.edu/explore/giant-squid), describes recorded individuals of about 13 m total length and deep-sea life.
- [NOAA: Sperm Whale](https://www.fisheries.noaa.gov/species/sperm-whale): Males around 52 feet, sexual differences, deep diving, and a squid diet.

### Ancient creatures

- [Cleveland Museum of Natural History: Meet Dunk](https://www.cmnh.org/learn/science-blog/2025/02/07/meet-dunk-ohios-ancient-apex-predator): Head armor, blade-like jaws, Devonian age, and size disputes.
- [MNHN: Plésiosaures et pliosaures](https://www.mnhn.fr/fr/plesiosaures-et-pliosaures): Large elasmosaurids can reach about 12 m; pliosaurs have short necks and large heads. They are not dinosaurs.
- [PLOS ONE: A Giant Pliosaurid Skull](https://doi.org/10.1371/journal.pone.0065989): Fossil-based estimates of about 10–12 m for large adult pliosaurids.
- [Natural History Museum: What is a mosasaur?](https://www.nhm.ac.uk/discover/what-is-a-mosasaur.html): Mosasaurs' lizard relationships and differing length estimates of 11–18 m.
- [University of Michigan Museum of Paleontology: Basilosaurus isis](https://lsa.umich.edu/paleontology/resources/beyond-exhibits/basilosaurus-isis.html): Long-bodied ancient whales of 15–18 m and their body features.
- [Natural History Museum: Megalodon](https://www.nhm.ac.uk/discover/megalodon--the-truth-about-the-largest-shark-that-ever-lived.html/) and [update](https://www.nhm.ac.uk/discover/news/2022/march/megalodon-sharks-grew-biggest-colder-waters.html): Megalodon is extinct; maximum size depends on incomplete fossils and reconstruction methods, with estimates increasing in recent years.

## Model and gameplay limits

The 14 added procedural models have distinct structures: sardine spots; anchovy silver stripe/long jaw; herring belly keel; mackerel back markings/finlets; flying-fish broad pectoral fins; turtle scutes/four flippers; sunfish tall upright fins/truncated tail; hammerhead's transverse head; sperm whale's blocky head/slender jaw/horizontal flukes; mosasaur's long snout/four paddle flippers/tail fin; long-necked plesiosaur; thick-headed, short-necked pliosaur; megalodon's broad body/large jaws; and Basilosaurus's elongated segmented body/tiny hind limbs.

These are artistic models for gameplay recognition, not scientific reconstructions calibrated by paleontological morphometrics. Total model length is normalized, facing -Z. Materials/geometry are reused by species, while instances retain only their animation hierarchies. Flying fish use `userData.setGliding(true/false)` to switch their spread-fin pose. Shoal density, movement speed, nutrition, and survival danger are balanced separately.

## v0.5.1 additional octopus source

[Alaska Department of Fish and Game: Giant Pacific Octopus](https://www.adfg.alaska.gov/index.cfm?adfg=giantpacificoctopus.main) describes its bulbous mantle, eight arms, roughly 16-foot arm span, defensive ink release when threatened, solitary life in rock crevices, and temperate North Pacific distribution. The game's color, eight arms, and ink cloud use this reference. The 5 m longitudinal model scale, displayed 100–800 m depth layer, chase speed, and cooldown are game adaptations; they do not represent actual trunk length or imply that the animal occurs only at those depths.
