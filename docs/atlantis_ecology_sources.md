# Atlantis Ecology References and Art Brief

Research checked on 2026-09-29 for the seven proposed Atlantis-exclusive ordinary creatures. These are production references and recommended scales, not evidence that the models, population, or balance have passed acceptance. Runtime values belong in `src/ecosystem_config.js` and the selected region profile. Follow the [asset quality standard](asset_quality_standard.md) and the [Atlantis plan](atlantis_plan.md).

Atlantis combines modern Atlantic-associated animals, revived extinct animals, shared fauna, and a fantasy guardian. This is an invented ecosystem. Region exclusivity describes the game roster, not an animal's real distribution. Displayed depth is world-coordinate depth multiplied by four; assigned water layers, abundance, nutrition, growth, movement speed, pursuit, damage, and respawn are game design. No cited source establishes those values.

## Scale and progression recommendations

| Creature               | Scientific reference          | Recommended game scale | Role and measurement limit                                                                                                |
| ---------------------- | ----------------------------- | ---------------------: | ------------------------------------------------------------------------------------------------------------------------- |
| Short-snouted seahorse | _Hippocampus hippocampus_     |                 0.15 m | Small loose nursery resident; upright, curled posture makes the scalar different from ordinary nose-to-tail model length. |
| Common cuttlefish      | _Sepia officinalis_           |                 0.50 m | Small loose nursery resident; compact overall model span, not a claim of a 0.50 m mantle.                                 |
| Atlantic spadefish     | _Chaetodipterus faber_        |                 0.75 m | Nursery/outer-shallows schooling prey; total length.                                                                      |
| Blue shark             | _Prionace glauca_             |                 3.80 m | Offshore modern hunter; near the cited maximum, not an average adult.                                                     |
| Swordfish              | _Xiphias gladius_             |                 4.20 m | Offshore modern hunter; total length includes the bill.                                                                   |
| Large ichthyosaur      | _Temnodontosaurus trigonodon_ |                10.00 m | Ancient progression; a specific reconstructed marine reptile, not the smaller genus _Ichthyosaurus_.                      |
| Helicoprion            | _Helicoprion_ sp.             |                 6.00 m | Ancient progression; inferred whole-body scale, not a complete measured fossil.                                           |

Use real schooling prey as the nursery's dependable food supply. Seahorses and cuttlefish should be slow, dispersed residents; do not turn them into synchronized sardine schools merely to obtain the small-school nutrition bonus. At the existing 3 m start, all three small additions are edible. Blue shark and swordfish are initially too long; both extinct additions are later stages. A 3 m tuna or sunfish is also ineligible at exactly 3 m because ordinary feeding requires strictly shorter prey.

Small solitary prey cannot replace a food-rich nursery under the shared rules. With `schoolSize: 1` and the current default nutrition of 8, a 0.15 m seahorse yields 0.08 hunger and a 0.50 m cuttlefish about 0.89 hunger to a 3 m player before the hunger cap. These are calculations from `consumePrey()`/`applyNutrition()`, not real nutritional measurements. Actual overrides must be evaluated separately. Retain dense edible fish schools, useful intermediate meals, legal spawn locations, reachable seabed clearance, safe retreat, and prey in successive depth bands. Listed species and headcounts do not prove encounter rates or full-round pacing.

## Species evidence and concise art notes

### Short-snouted seahorse

[Marine Biological Association / MarLIN: _Hippocampus hippocampus_](https://www.marlin.ac.uk/species/detail/1788) supports a body length up to 15 cm, a short upturned snout, an angled head, bony body rings, and a prehensile tail. It describes sheltered vegetation and other substrates, weak mobility, small home ranges, and tail anchoring. This supports dispersed residents; it does not support a fast synchronized shoal. Do not generalize its habitat to all seahorses or present one source's depth limit as universal.

[Seattle Aquarium: Seahorses](https://www.seattleaquarium.org/animal/seahorses/) supports the broader seahorse movement reference: upright posture, rapid dorsal-fin propulsion, and small pectoral fins for steering. This is a group-level reference, not a species-specific measured animation cycle.

**Art brief:** Upright horse-like neck/head, short tube snout, continuous ridged trunk, tapering curled tail, small fluttering fins. Use subtle amber/brown mottling. Keep the tail curled during hovering; no fish-like tail-fin propulsion. Mouth/contact position stays at the snout. Preserve the silhouette in side and three-quarter guide views; in-world readability must not depend on making it biologically giant.

### Common cuttlefish

[MarLIN: _Sepia officinalis_](https://www.marlin.ac.uk/species/detail/1098) describes a broad flattened mantle, paired fins along its sides, eight arms and two feeding tentacles, and coastal/shelf demersal habitat at 0–200 real meters. Its size discussion explicitly uses dorsal mantle length, with breeding males up to 45 cm. The proposed 0.50 m compact game span includes the head and resting arms, so it is a separate modeling choice.

[Monterey Bay Aquarium: Common cuttlefish](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/common-cuttlefish) supports rippling lateral fins, movement in different directions, fast tentacle extension, camouflage, and sandy-seafloor association. Bidirectional capability does not establish a universal default travel direction. Do not inherit the playable Giant Squid's mantle-first convention without checking this model's head, travel axis, and mouth separately.

**Art brief:** Broad oval mantle, narrow rippling fin ribbons, large lateral eyes, compact forward arm crown, two normally retracted feeding tentacles. Restrained mottling or transverse bands. Choose slow head/arms-first cruising for the game and label it as an animation choice. Fin waves should move through the ribbon; rigid flapping of the entire fin is insufficient. Mouth sits centrally inside the arm crown, not at the mantle tip.

### Atlantic spadefish

[Florida Museum: Atlantic spadefish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/atlantic-spadefish/) supports a compressed, deep disk-shaped body, blunt snout, small mouth, extended soft dorsal/anal rays, concave tail, and silver coloration with four to six dark vertical bands. Adults can reach 0.91 m total length. The museum describes schools in shallow marine/brackish habitats including wrecks, typically 3–35 real meters; juveniles can resemble drifting leaves. Adult-like 0.75 m fish should not be animated as permanently leaf-mimicking juveniles.

**Art brief:** Tall thin silver body with readable dark bars, tapered dorsal and anal extensions, short face and small mouth; visible body thickness from the front. Use coordinated tail-driven cruising with small fin corrections as the game animation. Keep the first dorsal distinct from the elongated soft dorsal section. Avoid substituting an angelfish or batfish silhouette. This species can carry genuine nursery schooling behavior.

### Blue shark

[Florida Museum: Blue shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/blue-shark/) supports a slender body, elongated snout, very long pointed pectoral fins, large eyes, and a first dorsal fin set farther back than on many familiar shark silhouettes. Color transitions from blue above to pale/white below. It gives about 3.8 m as the maximum and describes pelagic surface-to-350 m habitat in temperate/tropical oceans. Slow surface cruising is observed; the animal is not usually aggressive. Persistent player pursuit is therefore a game behavior.

**Art brief:** Long narrow cobalt body, long swept pectorals, narrow tailstock and asymmetric tail, restrained dorsal height, clear white belly. Model five gill slits rather than a bony-fish gill cover. Animate lateral tail/body propulsion with measured cruise and stronger pursuit cycles. Do not recolor the stocky great-white model. Inspect pectoral clearance through full turns.

### Swordfish

[NOAA Fisheries: North Atlantic swordfish](https://www.fisheries.noaa.gov/species/north-atlantic-swordfish) supports the flattened bill, large eyes, prominent curved first dorsal, smaller second dorsal, crescent tail, dark upper surface, pelagic migration, and feeding across the water column. NOAA describes bill slashing during prey capture; a continuous spear-like charge against the player is an adaptation, not a claim of normal behavior.

[Florida Museum: Swordfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/swordfish/) gives a maximum total length of 4.55 m and distinguishes swordfish from other billfishes: adults lack pelvic fins, jaw teeth, and scales. The game’s 4.20 m includes the bill; do not add a second 4.20 m trunk behind it or treat bill length as equivalent biomass.

**Art brief:** Flat tapering sword extending from the upper jaw, rounded strong torso, large eye, tall curved first dorsal and lunate tail. Smaller second dorsal/anal fins remain visible. No sailfish sail, paired pelvic streamers, or toothy shark mouth. Tail-driven lateral swimming; keep the mouth at the bill base and audit any damaging bill contact separately from swallowing.

### Large ichthyosaur

[Natural History Museum: Rutland ichthyosaur](https://www.nhm.ac.uk/discover/news/2022/january/britains-largest-ever-ichthyosaur-is-discovered-rutland-water.html) reports a roughly 10 m Early Jurassic specimen, initially tentatively identified as _Temnodontosaurus trigonodon_. This supports a 10 m representative while preserving identification/measurement uncertainty. [NHM: What is an ichthyosaur?](https://www.nhm.ac.uk/discover/what-is-an-ichthyosaur.html) supplies the marine-reptile context, long jaws/large eyes, smooth skin, fin-bearing silhouette, and distinction from dinosaurs and dolphins. The exact color pattern and soft-tissue proportions of this particular animal remain reconstructed.

[Royal Albert Memorial Museum: Ichthyosaurs](https://rammuseum.org.uk/wp-content/uploads/2022/05/GCUC-Down-to-Earth-208-to-65-mya.pdf) describes side-to-side tail swimming with paddle-like flippers for stabilization. This is a general ichthyosaur reference, not direct observation of _T. trigonodon_. An air-breathing reptile permanently dwelling in Atlantis's abyssal revival layer is a fantasy placement.

**Art brief:** Streamlined but substantial torso, long toothed jaws, conspicuous eyes, four attached flippers, dorsal fin, vertical crescent-like tail. Lateral propulsion with restrained flipper corrections; no whale-style horizontal flukes or vertical tail beats. Use subtle dark-over-light countershading as a reconstruction choice. Keep its long head/four-flipper silhouette distinct from blue shark and mosasaur. Do not add gill slits or dinosaur armor.

### Helicoprion

[Tapanila et al. (2013), _Biology Letters_](https://doi.org/10.1098/rsbl.2013.0057) uses CT evidence to place the tooth whorl along the lower jaw's midline and identifies the animal as a stem holocephalan cartilaginous fish. The [research team's Idaho State University account](https://www.isu.edu/news/2013-spring/idaho-state-university-researchers-solve-mysteries-of-ancient-shark-w-spiral-toothed-jaw-results-published-in-royal-societys-journal-biology-letters.html) explains the limited fossil record and describes a roughly 4 m museum reconstruction with larger estimated individuals around 7.6 m. Six meters is an intermediate game reconstruction, not a directly measured complete specimen.

[Australian Museum: Helicoprion](https://australian.museum/learn/animals/fishes/helicoprion/) supports the lower-jaw location, Permian age, and broad fossil distribution. Whole-body contour, fins, skin, color, swimming cycle, and exact ancient depth are less securely constrained than the tooth whorl. “Ancient shark” is convenient common wording; avoid calling it a member of modern true sharks.

**Art brief:** Reconstructed streamlined body with a deep jaw profile. Seat one fixed spiral tooth whorl within the lower jaw's central arch, partly enclosed by jaw tissue; expose functional crowns inside the opening mouth. No external hanging wheel, twin cheek saws, dorsal spiral, or powered rotation. Use a restrained lateral swimming cycle and a normal jaw hinge. Its opening jaw must reveal the whorl without clipping through the upper skull. Deep patrol/hostility are game inventions.

## Asset provenance, reuse, and acceptance

The links above are biological and visual references. Their photographs, illustrations, and museum reconstructions have individual rights; none are imported, traced as a texture, or licensed for redistribution by this document. New procedural artwork must have its own production record. A reference image or concept rendering is not evidence of the actual game model.

Reuse the accepted shared fish-feeding Foley, effects, and audio graph described in [audio_sources.md](audio_sources.md). This addition requires no new synthetic animal calls, invented ancient roars, or replacement human voices. Reuse suitable geometry/material resources while keeping each creature's silhouette and instance animation distinct.

Compare the three small additions with the accepted refined shallow creatures, blue shark/swordfish with the refined modern hunters, and the extinct pair with the refined Ancient Giants. Inspect side, front, rear, and full movement cycles in the Ocean Guide and live ocean at usual distances, including night lighting and deep fog. Check actual visible mouth/capture locations, fin and jaw intersections, pause/restart behavior, and resource reuse. Record desktop and small-screen evidence, actual feeding/progression checks, and any remaining acceptance limits in the feature verification record. This reference document alone establishes no visual, performance, audio, or gameplay acceptance.
