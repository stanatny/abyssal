# Odyssean Sea refinement

This follow-up addresses the user's surface rendering, humanoid anatomy/motion, crowded ecology and guardian originality feedback. It remains an uncommitted eighth-region candidate on `feature/odyssey`, based on main `25d463e` / v0.10.2. The formal seven-region edition is unchanged.

## Surface boundary

The earlier sky toggle used `surfaceY - 1.5`, while the water shader used the actual swell height. A camera still underwater could therefore draw the sky and remote island silhouettes. The region now uses `odysseyWaterHeight(camera.x, camera.z, activeTime)` for the sky, islands, water, atmospheric state and postprocessing/audio surface state. Above water the surface is genuinely opaque and writes depth; below it the existing subdued transmission remains. This is a rendering correction, not new flight or surface physics.

The controlled camera scan and native follow-camera views are separate evidence. A submerged character is intentionally occluded by the opaque water when the camera is above it; an exposed dorsal fin remains visible. A paused camera scan alone does not establish natural breach/re-entry behavior.

## Humanoid structure and propulsion

Nereid, Triton, Naga and Siren share a continuous sculpted adult face with fitted eyes, brows, nose, lips, ears and scalp. Heads and shoulders remain stable. Mermaid propulsion bends the whole tail vertically with a phase lag toward the fluke; arms, palms and fingers share a low-amplitude articulated skin instead of separate swinging pieces. The Nereid's shell clothing is fitted to the actual ventral chest. Naga and Siren retain their own silhouettes and lateral tail motion.

Shared geometry and materials are immutable; skeletons are instance-owned. No separate animation loop or gameplay-root displacement is introduced. Final static model costs: Nereid 36,896, Triton 37,500, Naga 35,400 and Siren 29,956 triangles. These model figures are not whole-game thermal measurements.

## Ecology and guardian spacing

Fourteen ordinary kinds now instantiate **266 individuals**, down from the earlier 319 (about 17%). Smaller schools use bounded regional capacity; independent food uses the generic optional `densityMultiplier` data field with the previous default retained for other regions. Nereids patrol independently and repeated residents have distinct legal homes. No species is removed, individual nutrition/growth is unchanged, and 18–24 m recovery meals remain available on all three guardian outskirts.

The new guardian is **Karkinos**, a bronze-red giant crab with eight jointed legs, unequal pincers, fitted eyestalks and layered armor. Its shelf sits ahead of Scylla's strait and Charybdis's basin: homes `[120,-229.8,-405]`, `[-110,-380,-690]`, `[115,-575,-1010]`, territory radii 110/125/135. The crab stays near the floor using the regional sampler and 16 m root clearance; its visual leg stride is not a general foot-placement physics solver. All three retain 25 m attack eligibility, three separate valid hits and once-only retirement. Completion now requires 30 m and all three guardians.

## Distinct, warned combat

- **Scylla — Sixfold Tidefang:** six real animated mouths show their own aim paths, then emit six staggered straight water lances. Reefs block projectiles; directions do not home after release. Warning 2.5 s, attack 3 s, recovery 4 s; base projectile damage 28.
- **Charybdis — Maw of the Tide:** an 84 m frontal intake cone, bounded pull up to 20 m/s and one 32-point base hit if the player remains within 18 m of the maw late in intake. Sides and rear remain safe; solid cover breaks the flow. No Kraken vortex/grip. Warning 2.4 s, attack 3.5 s, recovery 4.5 s.
- **Charybdis — Reversing Tidewall:** a locked horizontal lane carries an 82×26 m wall up to 105 m. Swept-frame damage is once per cycle, 32 base points. Sideways/vertical escape and solid cover remain available. Warning 2.4 s, attack 2.4 s, recovery 4.5 s.
- **Karkinos — Reef-sundering Claws:** two 65 m frontal sectors precede a twin pinch. Gaps, back and upper water are safe. One 30-point base hit; warning 2.4 s, attack 1.6 s, recovery 4.5 s.
- **Karkinos — Threefold Reefbreak:** three staggered, bottom-hugging pressure lanes travel at 48 m/s up to 105 m. Gaps and upper water remain safe. One 30-point base hit; warning 2.6 s, attack 3 s, recovery 4.5 s.

Pure spatial rules and effects share the same dimensions. Existing simulation time, cover queries, armor, ink interruptions and reset/retirement own the attacks. Effects have bounded preallocated geometry and reuse the main loop. Western guardians bypass the generic circular floor warning, and use their own restrained water/armor warning sounds. Bilingual Guide cards describe each technique separately; objectives, menu and habitat copy include the third guardian.

## References and adaptation boundaries

[Apollodorus, Library 2.5.2](https://www.theoi.com/Text/Apollodorus2.html) describes the crab in Heracles's Hydra encounter. The giant shelf guardian and its two underwater attacks are adaptations, not ancient textual claims. [The Metropolitan Museum's Nereid riding a Triton](https://www.metmuseum.org/art/collection/search/256164) and [Riccio's Triton and Nereid](https://www.metmuseum.org/art/collection/search/200554) inform independent mythic anatomy. Primary crab joint research is [Vidal-Gadea et al., skeletal walking adaptations](https://pubmed.ncbi.nlm.nih.gov/18089130/). See the original [brief](odyssey_brief.md) for Homer and the cross-mythology Naga distinction. Provenance remains in development notes rather than repeated player-facing attribution.

## Verification and rollback

Ignored before files and per-scope source manifests live in `.local/odyssey_revision/`; the previous restricted compiled candidate is retained by the normal delivery manifest. Verification covers full-cycle anatomy, actual region/Guide wiring, legal stock, all-three completion, directional hit/evasion, waterline rendering, pause/reset, eight-region switching and serial populated costs. Current results and limits are recorded in [the candidate verification](odyssey_verification.md).

Rollback any failed candidate at its own scope: surface state, western combat/effects, humanoid factory or regional density. Preserve the rest of the accepted eighth-map work. Do not revert shared accepted Kraken attacks or reduce existing-map food to compensate for a new model. Physical-phone heat, subjective listening and a natural complete round require separate review.
