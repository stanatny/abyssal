# Atlantis residential interiors

Status: owner-verified and accepted by the user on September 30, 2026, with publication on `main` authorized as part of v0.7.1. The final 120-home inventory below supersedes the initial placement survey; actual-game and combined performance evidence is in [exploration verification](atlantis_exploration_verification.md).

Ordinary courtyards and villas now reuse the reviewed Harbor/Agora carved furniture kit. Every eligible house receives a stone bench and a carved storage chest. One of four deterministic layouts adds a round dining table; another adds three matte clay amphorae, attached radial handles and a shard. Mirrored arrangements keep the homes from repeating the same composition. These are scenery, not containers, pickups or a new loot system.

## Placement and access

`src/atlantis_residential_layout.js` consumes actual city building records, including `scale` and `rotation`. Furniture positions, complete prototypes and colliders all use that same transform. Courtyard floors are `record.y + 1.4 * record.scale`; villa floors are `record.y + 1.7 * record.scale`. The seabed is an obstruction check, never a substitute for the raised house floor.

| Item                   | Initial house-local placement          | Distribution         |
| ---------------------- | -------------------------------------- | -------------------- |
| Carved bench           | Mirrored `x = ±5.4`, `z = -7.9`        | Every eligible house |
| Storage chest          | Opposite bench, `x = ∓4.7`, `z = -7.5` | Every eligible house |
| Round table            | Bench side, `x = -5.1`, `z = -2.3`     | Layout 0             |
| Amphora tray and shard | `x = 4.6`, `z = 2.0`                   | Layout 2             |

The rear furniture avoids courtyard columns, while the villa entrance steps and front colonnade stay clear. A chest may move to a bounded alternative along either side wall when a projecting existing structure blocks its initial support. Alternatives must retain floor support and avoid the other planned furniture footprints.

These are **3 m juvenile interiors**. Their narrow entrances and small rooms do not promise 16–30 m adult entry or turning. Adult routes remain the streets, public halls and their existing dedicated clearances. Each eligible house records an actual juvenile entrance/return route and a turning center in `stats.layouts[].access`. The centered route is preferred; two bounded side routes handle an existing structure that intrudes into a room. Both directions and a complete turn must pass the existing host colliders before the house is considered eligible.

Some pre-existing house records overlap large temple foundations or towers. They are reported in `stats.excludedHomes`, receive no interior discovery landmark, and are not counted as furnished houses. This prevents a buried object from being presented as an enterable room. Final counts must be recomputed after the owner's landmark reservations change.

The full visible footprint includes chest lids, bench rails and the shard outside the amphora tray. The factory samples a transformed 7 × 7 grid per item. Every point must lie above the shared seabed and hit a real supporting collider at the specified floor. The shared furniture batch separately checks the complete transformed visible bounds against host solids and prior furniture. No special lighting hides unsupported or intersecting placements.

## Interface and resource ownership

```js
createAtlantisResidentialInteriors(parent, {
  records,
  heightAt,
  hostColliders,
  seed: 5173,
});
// → root, colliders, landmarks, lightSources, stats, update, dispose
```

The city passes the complete collider snapshot after existing architecture, excavated halls and their scenery, then appends residential colliders. These new colliders use `kind: "residential_furniture"` with the unchanged shared box collision format. `stats.layouts` contains only actual eligible homes and actually placed groups. `eligibleHomes`, `furnishedHomes`, `fullyFurnishedHomes`, `excludedHomes`, `placed`, `dropped`, district costs and item identifiers make partial outcomes inspectable.

Detailed complete furniture prototypes and materials remain shared through `createAtlantisFurnitureBatch`. A district merges its visible pieces by material instead of creating meshes or materials per house. The maximum five-district inventory is 35 merged meshes, including the reviewed bronze, shell, lapis and matte clay materials. District roots cull by distance from their actual horizontal bounds: 235 m in high quality and 190 m in smooth. No geometry is created during `update`, and there is no independent animation loop. Existing architectural pearl illumination is reused; `lightSources` stays empty.

Disposal is idempotent and releases each district's owned merged geometry. It removes roots and clears returned collider/landmark arrays without disposing shared prototype geometry or materials. A second live instance remains usable, and recreation is deterministic for the same records and seed.

## Verification

The focused regression in `tests/atlantis_residential_interiors.test.js` passed nine tests. It checks all eligible homes, the <300,000-triangle / ≤35-mesh budget, 9 × 9 independent full-footprint floor samples, actual seabed heights, final combined collision routes in both directions at one-step and low-speed movement, 64-step complete juvenile turns, unsupported edge and terrain-ridge rejection, buried-house reporting, bounded chest fallback, both quality culling distances, record-order independence and two simultaneous instances with repeated disposal/recreation.

The transform matrix covers 144 courtyard/villa, scale, yaw and layout combinations. Raycasts through actual bench/chest triangles agree with the transformed collision surfaces, including a non-cardinal yaw. This is geometry and route evidence; it does not replace actual ocean-lighting screenshots or input-driven game traversal.

The source-evidence snapshot, before the final landmark reservation pass, contained 126 ordinary house records: 120 eligible and fully furnished homes, 120 benches, 120 chests, 30 tables and 29 amphora groups. That snapshot cost 254,868 triangles, 35 potential material draws and 6,299 collision primitives across five district batches. Its independent 24,219-point support survey found a maximum floor error of 1.14 × 10⁻¹³ m and at least 2.438 m of seabed clearance. These are source inventory counts, not a measured frame rate or final post-reservation city total. Raw per-house routes, source hashes and support/cost evidence are kept in `.local/residential/`.

The integration owner captured ordinary villa and courtyard interiors in the actual game and reported visible, coherent furnishings. Final normal doorway approaches, follow-camera input traversal, narrow-view coverage, post-reservation counts and combined scene measurements remain part of the owner's integration review; consult [exploration verification](atlantis_exploration_verification.md) for its current status. Physical-device performance and natural encounter frequency remain unverified by these focused tests.

## Final owner integration inventory

After reserving overlapping landmark footprints, the production layout has 120 eligible homes; all 120 contain both a bench and chest, with 30 tables and 30 amphora groups. The total is 257,160 triangles, 35 merged meshes and 6,300 colliders across five spatial batches, with no dropped groups. The final 24,300-point support survey measured maximum floor error 1.14 × 10⁻¹³ m. This supersedes the earlier pre-reservation inventory above.

A final all-suite check exposed one stone bench intersecting a host at a floor edge. Bench and chest plans now share bounded side-wall fallback slots, checking full floor support, host clearance and already selected neighboring furnishings. `fullyFurnishedHomes` means both a bench and chest are actually present; an optional table or jar cannot mask a missing baseline item. Nine focused tests passed after the fix. Actual input, screenshots and performance evidence are recorded separately by the owner.
