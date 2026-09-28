# v0.6.6 Male/female humans, distinct voices, and shallow-water refinement

This follows uncommitted v0.6.5. The user used a Chinese term literally meaning “diving fish”; in the context of simplified shallow-water models, this was interpreted as shallow-water schools and stated at the outset. Divers were also included in the male/female model work. No new commit or push.

## Male and female swimmers and divers

Swimmers and divers each have adult male and female body, hair, and clothing variants. Male swimmers wear trunks; female swimmers wear one-piece swimsuits. Both diver variants retain wetsuits, masks, tanks, regulators, and fins. They share the existing 15-bone swimming motion and use 3 skinned meshes per model. Same-type, same-sex resources are shared while animation instances remain independent.

A human's `sex` is assigned at creation. Swimmers, resident divers, and the three submarine escapees alternate variants. Respawn and restart preserve appearance; models, entities, and feeding events share identity. Population, length, nutrition, and contact rules do not change.

The guide remains at 35 entries. Swimmer/diver details gain a male/female preview switch, with separately cached models and no extra canvas or render loop on repeated switching. Both appearances occur in the ocean without manual NPC-sex selection.

## Matching screams

Adult male and female voices are synthesized with independent pitch envelopes, vowel resonances, breath, and rasp, rather than pitch-shifting one clip. Both last 1.30 seconds, preserving the rising cry, sustained section, underwater muffling, and bubble ending. Feeding selects the actual target's sex.

Samples cache separately but share the limits of one human voice, three total feeding sounds, and human-voice throttling. Mute, pause, and restart remain; fish-feeding PCM is byte-for-byte unchanged. These are original procedural effects, not real human recordings. Waveforms and playback routing can be checked automatically; subjective quality remains a playtest judgment.

## Shallow-water schools and Ocean Predators

`creature_shoal.js` rebuilds 13 shallow-water animals: coral fish, anchovy, sardine, herring, mackerel, flying fish, green sea turtle, ocean sunfish, longhorn cowfish, bumphead parrotfish, humphead wrasse, bluefin tuna, and manta ray. Body proportions, fins, mouths, gill covers, scales, and dorsal/ventral colors distinguish them. Flying fish still spread pectorals in actual glide state; turtles paddle and rays undulate broad wings.

`creature_hunters.js` rebuilds 5 modern Ocean Predators: deep-sea anglerfish, hammerhead, great white shark, Giant Pacific Octopus, and sperm whale. Respective focal features are broad toothed mouths and lure, lateral head shape, jaws and gill slits, eight sucker-lined arms, and a square forehead with narrow lower jaw.

Guide and ocean route through the same model entry point, preserving head toward -Z, normalized longitudinal length, shared geometry/materials, and independent animation. Spawn depths, population, growth, feeding eligibility, hunter abilities, 20-second orca sonar, and squid abilities remain unchanged.

Acceptance relies on actual browser rendering, real feeding paths, resource lifecycles, and production preview. See [verification](verification.md). Procedural models remain stylized simplifications, not scan-quality biological assets.
