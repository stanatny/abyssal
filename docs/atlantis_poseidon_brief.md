# Poseidon Temple and Residential Interior Revision

Status: accepted by the user on September 30, 2026, with a commit and push to `main` authorized as part of v0.7.1. Final verification and remaining device limits are recorded in [exploration verification](atlantis_exploration_verification.md).

## Problem and intended result

The previous Harbor/Agora furnishings did not cover ordinary residential houses. Furnish enterable villas and courtyard houses along the normal exploration streets with carved stone seating/tables, decorated storage chests and matte clay pottery. Keep the visible entry and swimming aisle clear; small houses remain juvenile-scale spaces rather than claiming that every 30 m character fits every doorway.

Redraw Poseidon as a monumental classical-inspired, original fantasy sculpture with a readable muscular silhouette, coherent facial features/beard/crown, articulated hands, trident and fabric. Preserve the accepted city scale and actual material/fog readability. Enrich the rear main temple with believable layered architecture and marine ritual interiors. Add an actual connected dungeon beneath the temple, with both descent and return routes, shared floor/terrain, matching solid collision, adult turning clearance and shell-pearl illumination. No modern electric lamps. The current shared five-light pool remains the limit.

## Ownership and existing references

Codex owns city assembly, excavation registry/terrain, ecology, localization, documentation, services and final runtime verification. Explicitly scoped internal delegates handle the Poseidon sculpture source, a new residential-interior module, and the temple/dungeon survey before bounded architecture implementation. They do not change services, dist, shared entry points, commits or releases.

- Sculpture: `src/atlantis_art_poseidon.js`, new `atlantis_poseidon_sculpture_*.js` only; keep `buildPoseidon(bucket, origin)` and metadata contracts. Existing foundation is 42 by 36 m, statue caller scale is 1.55 at `(0, -865)` facing +Z; trident is about 82 local m tall.
- Residential interiors: new `src/atlantis_residential_interiors.js` and scoped helpers/tests. Reuse the accepted detailed furniture through the owner's generic `createAtlantisFurnitureBatch`; records now include yaw and scale.
- Temple/dungeon: survey completed, followed by bounded `atlantis_poseidon_site.js` / `atlantis_poseidon_temple.js` implementation; the owner integrates it. Main temple is at `(0, -911)`; do not alter every generic side temple or cover intended roof/floor openings.
- Retain all owner-reviewed Harbor/Agora, coral attachments, clay pottery, ecological isolation and resource-lifecycle fixes. Never restore art-worktree originals over them.

## Runtime and quality acceptance

Read `AGENTS.md`, `docs/asset_quality_standard.md` and `.agents/skills/abyssal-map-production/SKILL.md`. Prefer accepted reusable kits and immutable shared resources. Triangle counts alone do not establish quality. Inspect close, approach, interior and moving views in the actual game with regular lighting/fog, including desktop and narrow viewports.

Dungeon foundations/floors must be split around openings in both render and collision. Register its real excavation through the shared lowest-floor sampler; world bottom is -740 m. Check final rendered triangle interiors, support footprints, both playable characters at juvenile and adult scales, continuous turns, fast entry and return, camera and retained two-site routes. Keep survival/combat thresholds shared; do not retune balance to conceal sparse interiors.

Measure populated headed-browser performance under matched scene conditions, retain resource identity/disposal evidence, and verify repeated region switching/return-home. Synchronize bilingual guide and relevant descriptions. Update this brief with measured dimensions/site contract after the survey and record actual checks, screenshots and remaining device limits in the current verification record. Preserve earlier evidence and label controlled positioning as inspection, not natural whole-round play.

## Surveyed structural contract

The original main temple had a 130 by 92.3 m full solid foundation with houses and avenue columns overlapping its footprint. Reserve the replacement temple before generic lots, columns and rubble. The new platform is x[-65,65], z[-961,-861], top -608.861 m. Its excavation is x[-48,48], z[-961,-875], floor -710 m with a 4 m inside blend. A 48 by 62 m central well remains open through the main platform and the -662 m crypt-gallery deck. The lower hall has a -710 m floor; side-gallery ceilings are -664.5 m. A rear portal and trench form the second exit. Keep the retained statue foundation outside the dungeon's north water volume. Exact routes and clearances are carried by the pure immutable site metadata.

Both characters have a shared 85-degree underwater pitch limit. Test real continuous descent, turning and return rather than assuming vertical metadata is sufficient. The lower turning volume reserves 24 m radius. Existing deep-school stock may be redistributed to declared lower-room habitats; preserve species sizes, nutritional rules and the overall population.

Coalesce an entire terrain cell only when it lies wholly within a registered planar pit core and its actual height samples equal the declared floor. Keep existing fine edge/trench sampling. This reduces the reviewed two-site seabed from 212,280 to 163,176 triangles before adding the third excavation; triangle-interior error remains checked by the existing terrain regression. This is geometry evidence, not frame-rate acceptance.

## Final asset inventory

The final source contains 120 eligible and furnished ordinary homes, each with a carved bench and decorated chest, plus 30 tables and 30 pottery groups. The shared kit is merged into five district batches: 35 meshes, 257,160 triangles and 6,300 small matching colliders. Bounded placement alternatives keep foundational furniture supported without blocking entry aisles; unsupported optional items may be rejected for a different diagnostic seed. The production seed drops no furnishings.

The monument has 147,946 triangles in three material batches and 25 segmented capsule colliders. Its local height is 81.5 m at the trident tip, rendered at the existing 1.55 scale. Asymmetric cloth, continuous torso/legs, attached grip fingers, beard, crown and facial carving replace the former coarse form. The owner adjusted the side key and trident light to preserve relief under real underwater lighting.

The main temple/crypt has 10 merged meshes, 177,032 triangles and 982 matching colliders. Fourteen supported furnishing groups occupy the temple and both crypt levels: six chests, four pottery groups and four benches. Six pearl metadata positions reuse the shared five-light pool; the module creates no PointLights. The registered reservation also includes the complete rear trench so legacy street steps cannot block its entrance.

Ordinary residential interiors and public underground halls are separate scopes. Decorating a selected hall does not establish furnishing coverage for enterable street houses. Record actual eligible homes, placements, drops, supported footprints and usable access routes before making a complete-interior claim. Tests and source counts remain distinct from visual and performance acceptance; see the current verification record for that evidence.
