# Regional resident habitats

The v0.7.1 exploration revision fixes discoverability of independent residents without changing creature sizes, nutrition, region membership, or population totals. The user authorized its publication on `main` on September 30; see [exploration verification](atlantis_exploration_verification.md) for runtime evidence and limits.

## Cause and shared behavior

Atlantis had the correct 17 species and 390 ordinary creatures, including eight Short-Snouted Seahorses and eight Common Cuttlefish. Runtime inspection found that the shared non-schooling respawn path treated them like roaming hunters: consumed residents returned roughly 140 meters from the player. Unconstrained cruising also moved them away from their intended shallow habitat. Hawaii/Atlantis switching itself preserved the correct species and models.

The correction uses region data and shared helpers, with no Atlantis or species-name branch in generic patrol or respawn:

- `region_ecology.js` supplies independent `spawnAnchors` and a positive `residentRadius` for habitat-bound individuals. Seahorses use 6 meters and cuttlefish 12 meters, along the shallow route ahead of spawn.
- `steerResidentHabitat()` in `ecosystem_population.js` gently steers residents home near the edge of their activity area. Close movement and local escape remain possible; they do not become a synchronized school.
- `habitatPosition()` returns consumed residents to their original legal habitat. The live distant-relocation path skips resident profiles; existing schools and roaming/territorial hunters retain their behavior.
- Bodies stay at 0.15 meters for upright seahorses and 0.5 meters for Common Cuttlefish. These small silhouettes require close observation; Orca sonar can help identify them. Playable Giant Squid remains intentionally absent from NPC rosters.

Future maps can use the same traits with different anchors, radii and species. Configure schools, independent residents and hunters according to their intended behavior; do not copy this map's population or radius by default. A catalogue entry does not establish discoverability.

## Acceptance and evidence

The regression in `tests/resident_habitat.test.js` includes an unregistered `future_reef_resident` with its own anchors. It checks generic patrol, consumed-resident placement, blocked habitat searches and independence from player depth. The regional guide, Chinese and English creature descriptions, README, AGENTS and map-production Skill are synchronized.

`scripts/verify_regional_residents.mjs` checks actual region selection, model identity/scale, normal patrol, sonar and feeding/respawn. Source snapshots isolate verification from concurrent development hot reloads. Runtime evidence is kept under `.local/regional_residents/` and `.local/region_species_probe/`; final event results must be read from the report, not inferred from unit checks. Browser patrol duration and respawn countdown are distinct from wall time when low frame rate limits the simulation timestep. Controlled viewpoints and feeding approaches do not establish natural full-round encounter frequency or physical-phone performance.

Final focused results: 32 relevant unit tests passed; affected files passed Prettier and the production build passed. The frozen-source browser report at `.local/regional_residents_final/report.json` passed two full region-switch cycles, all model kind/scale checks, forward sonar detection, restart, actual feeding, and normal respawn for both residents, with no browser errors. Final positions were within 0.047m and 0m of their respective home anchors and did not overlap solids. The existing 28-second NPC simulation countdown took about 59 seconds of wall/player time in the loaded headless run; no game clock was changed. The prior full-scope patrol report covers 60 wall seconds separately from this final event-focused run. Final screenshot: `.local/regional_residents_final/nursery_sonar.png`.
