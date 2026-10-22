# Atlantis remaining-content audit — 2026-10-22

This is a read-only source/factory inventory following the user's acceptance of
the quest-prop and furnishing batches. Unchanged delivered inputs were checked
against the 1,213-file fingerprint. No additional art or gameplay work is started,
no new HF quota is consumed, and no push/main publication is authorized.

## Completed scope

The recorded native inventory in `.local/atlantis_gap_audit_20261022/` found all
20 ordinary underwater kinds on HF replacements, with the regional Pearl
Nautilus and surface wildlife/people/vehicles separately checked. Those factories
are unchanged in the accepted two batches. This prior native evidence is not a
newly repeated full-map playthrough. Existing shared creature assets should not
be regenerated simply because this is a different map.

Poseidon and six obelisks, selected civic columns/pediments/arch components,
city-wide limestone/marble surfaces, quest conch/key/inscriptions/chest and the
four interior furnishing types have been upgraded. Building material upgrades
are distinct from replacing every building's geometry.

## Actual remaining visual families

| Family                               | Actual source/factory evidence                                                                                                                                                               | Suggested scope                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Residential and commercial buildings | `cityArchitecture()` still uses procedural courtyard, villa, stoa and ruined-building templates. Fresh city construction reports 70 courtyards, 50 villas, 16 stoas and 28 ruined buildings. | Replace a small set of reusable facade/roof components, preserving interior openings and grown-player routes.                                                          |
| Towers and street columns            | 5 placed towers and 40 standalone columns still use the original template. Civic HF replacement is explicitly limited to temple/rotunda/gateway components.                                  | Distinct tower crown, wall relief and standalone column kit; preserve skyline and collision envelopes.                                                                 |
| Street and outskirts pottery         | 29 street amphora records still use `cityArchitecture("amphora")`; `atlantis_outskirts.js` separately uses that old geometry for cargo-cache pots.                                           | Reuse the accepted new amphora where shape/scale fits; no need to generate another identical asset. The new furniture skin does not automatically replace these paths. |
| Pearl-shell lamps                    | 73 city pearl records use `pearlHabitat()`; wall niches also use its reduced-detail variant. This is scenery, not the Pearl Nautilus creature.                                               | Optional shell refinement with existing lighting and collider behavior preserved.                                                                                      |
| Marine colonization                  | `atlantis_city_marine.js` still constructs branching coral, plate sponge, sea fan, anemone and kelp. Outskirts have separate fan/sponge builders.                                            | Reuse suitable accepted reef assets first; generate only Atlantis-specific forms, with bounded instancing and culling.                                                 |
| Outskirts and distant skyline        | Broken columns, inscribed steles, fragments/cargo caches and the island lighthouse/village remain procedural.                                                                                | Lower-priority background polish after nearby architecture; not a gameplay blocker.                                                                                    |

The fresh construction reports 20,964 colliders, unchanged from the accepted
baseline. Counts are placed city records, not unique meshes, every regional prop,
or a performance guarantee. Evidence is retained in
`.local/atlantis_acceptance_20261022/inventory.json`. The 73 pearl count does not
include every separately built wall niche.

## Outstanding validation and publication

The original physical-phone gate-entry stutter/black-surface report remains
PP-Q055: previous forced-loss recovery tests pass, but the user's exact device
and route have not been reproduced on this desktop. Geometry detail increased
in the furniture batch; native M6 short samples do not close that phone issue.
No new functional blocker is established by this source audit, and visual
families being procedural is not itself a defect.

The accepted Atlantis work remains on `art/atlantis-hf-redraw`; this request is a
local checkpoint, not authorization to push or merge main. The live restricted
preview continues to show the accepted build. Formal main/Pages remain v0.11.15.

Recommended next bounded art batch: courtyard/villa facades, market colonnade
and tower crown, while reusing the accepted pottery. Keep the already upgraded
creatures, civic monuments, materials and interior furniture. This recommendation
does not represent completed new art or an automatic new generation job.
