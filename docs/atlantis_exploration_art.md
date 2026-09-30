# Atlantis exploration revision — art production record

## Owner integration review — September 30

The delegated reports below are historical first-pass evidence, not the final acceptance of their source. Codex preserved the raw deliveries and now owns the integrated modules. Agora uses the same reviewed furniture geometry as Harbor, with its own placement plan; coarse duplicate furniture/keep-out code and the unused preview-only height sampler were removed. The factory explicitly rejects a different site instead of silently using canonical geometry with mismatched metadata. Shared `atlantis_terrain` is the only gameplay and rendering floor path.

Independent review corrected the 30m well-turn waypoint, undersized vault clearance, a decorative strip crossing the south portal, discontinuous trench entry, unsupported marine roots and furniture buried by the pit-edge slope. Agora's 2m smooth transition now fits inside the 2.5m minimum lining thickness. Only the steeper edge cells use 0.25m rendering samples; the remaining surface stays coarse. The complete terrain mesh remains below the existing 220,000-triangle bound.

At the user's request, branching coral and most sea-fan instances now use red/orange gradients, with selected contrasting fan colors and ochre sponges. This is a stylized composition, not a claim that all deep-sea coral is red. [NOAA documents healthy white and other deep-sea coral colors](https://oceanservice.noaa.gov/education/tutorial_corals/media/supp_coral05b.html); [MBARI's Sur Ridge references include red sea fans and several other coral groups](https://www.mbari.org/know-your-ocean/revealing-the-secrets-of-sur-ridge/exploring-sur-ridges-coral-gardens/). No external artwork was imported. Actual game pearl light, fog and ordinary materials must establish readability, not an isolated showcase light.

The current owner evidence and remaining limits are in [exploration verification](atlantis_exploration_verification.md). The user accepted the integrated revision and authorized publication on `main` as v0.7.1. Harbor/Agora are complete; later residential and Poseidon furnishings reuse the corrected kit. The art-worktree statuses and pending assignments below are historical records, superseded by owner acceptance and the latest HANDOFF.

Status: local development on `work/atlantis-exploration-art`, based on the owner-corrected Harbor kit in `.local/owner_reference_20260929_2050/` (reference package, read-only). No commit, merge, push or release is authorized. This record covers the marine-furnishing slice only; earlier structural records live in `docs/atlantis_exploration_verification.md` inside the reference package.

## Historical Harbor integration checkpoint — September 30

The owner accepted the corrected Harbor slice for subsequent Agora expansion after independent source, collision, actual-game, lifecycle and rendering-cost checks. The original authored slice and its self-review below remain a historical record; they do not describe the final corrected placement, collision count or material lifetime. See [owner verification](atlantis_exploration_verification.md) for the authoritative corrections and evidence. Final integration source is owner-controlled, not the frozen art-worktree copy. Agora remains pending and must use the updated production brief.

## Slice scope

One bounded "marine furnishing" slice over the corrected Harbor sunken halls:

1. **Marine colonization** — `src/atlantis_city_marine.js` (new file). Cold-water branching coral, layered plate sponges, sea fans, anemones and restrained drifting kelp, rooted into masonry joints, broken eaves, column bases, the shaft rim, the entrance-stair side walls and one harbor-district street facade. Stylized marine scenery, not a biological reconstruction. No prey species, no combat changes.
2. **Ancient furniture** — `src/atlantis_exploration_furniture.js` (new file). Carved stone benches and round tables, amphora clusters (upright, tipped, shard), carved storage chests with aged-bronze banding, rivets, nacre medallions and lapis keyholes, plus scattered bowls/jugs/discs. Pure scenery: chests are exploration dressing, not a loot system.

Both modules are fully procedural; no external images, models, textures or audio were used. Shared toolkits reused: `atlantis_art_geometry.js` (seeded RNG, geometry cache, merge bucket, stone painting), `ocean_visuals.js` (v0.7.0 nursery sea-fan and ribbon geometry, surface-detail and leaf shaders, instance clustering), `atlantis_terrain.js` (excavation-site metadata), `atlantis_pearl.js` is not needed by this slice (see Lighting).

## Anchor sources (all data-driven, nothing sprayed)

| Zone                            | Anchor data                                                                                                                                                                                                                                      | Source                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Lower-hall floor perimeter      | `site.bounds` inset bands + keep-outs                                                                                                                                                                                                            | `ATLANTIS_EXCAVATION_SITES[0]` (default import; harness passes the reference copy explicitly) |
| Interior wall seams             | Wall bands scanned from `hostColliders` (axis-aligned `harbor_ruin_*` boxes whose inner faces look into the pit); fallback: pit bounds minus documented wall thicknesses                                                                         | `createAtlantisHarborRuins(...).colliders`                                                    |
| Column rings and mid-shaft fans | `harbor_ruin_column` capsules in `hostColliders`                                                                                                                                                                                                 | harbor colliders                                                                              |
| Shaft rim / broken deck eaves   | `site.shaft` rectangle + `site.levels[0].floorY`                                                                                                                                                                                                 | site metadata                                                                                 |
| Roof accents                    | `site.shaft.topY`, `site.secondExit`                                                                                                                                                                                                             | site metadata                                                                                 |
| Entrance stair                  | `site.entrance` (top/bottom, `clearWidth`) + side-wall inner faces at `clearWidth/2 − 0.12`                                                                                                                                                      | site metadata                                                                                 |
| Street facade                   | `options.facades` entries: `{ center, normal:{x,z}, width, baseY, topY }` derived from `city.buildings` records (nearest solid harbor-district building to `harbor_ruins_entrance` → villa at `(-251, -154)`, south street wall at `z = -164.9`) | city building records                                                                         |
| Furniture groups                | fixed placement table validated at build time against keep-outs and `hostColliders`                                                                                                                                                              | module table + harbor colliders                                                               |

Keep-out contract (both modules): shaft opening (+2 m apron), turning circle restricted to the swim plane (`turn.y ± 8 m`, full `clearRadius + 1`), both route corridors (8.5 m capsules), entrance channel (`clearWidth/2 + 0.6`), south portal box (+2.5 m). Placements failing the check are skipped and, for furniture, recorded in `stats.dropped`.

## Interfaces

Both modules follow the city-module lifecycle style:

```js
createAtlantisCityMarine(parent, {
  heightAt,             // shared seabed sampler (reference atlantisSeabedHeight)
  site,                 // optional, defaults to ATLANTIS_EXCAVATION_SITES[0]
  hostColliders = [],   // hall colliders used for wall scan + overlap checks
  facades = [],         // street-facade anchors (see table above)
  seed = 4171,
}) → { root, colliders, lightSources, landmarks, update(time, dt, position, highQuality), dispose(), stats }

createAtlantisExplorationFurniture(parent, {
  heightAt, site, hostColliders = [], facades = [], seed = 9151,
}) → same shape
```

- `colliders`: furniture uses axis-aligned boxes (`kind: "exploration_furniture"`) matched to visible extents; marine growth adds a few capsules (`kind: "marine_growth"`) only for the largest floor-standing colonies. Small vegetation and wall pieces add none, matching the city rubble/nursery convention.
- `lightSources`: both modules return empty arrays. The two accepted pearl niches in the harbor kit already cover every furnished corner of the slice (nearest-source distances: NE banquet ~12 m to the upper-east niche light volume, SW cargo ~7 m to the lower-west niche, upper NW corner ~14 m to the lower-west niche). No new point lights are requested; if integration wants a stronger accent, add one `pearlHabitat({ detail: "niche" })` at the NE lower corner `(-188, -194, -232)` and push `{ x, y: floor + habitat.lightHeight, z, color: "#ffe3ab", intensity: 800, distance: 60 }` into the existing five-light pool — metadata only, no new light objects.
- `landmarks`: `marine_lower_hall_garden`, `marine_entrance_stair`, `marine_street_facade`, `furniture_lower_hall_banquet`, `furniture_upper_gallery_corner`.
- `update`: drives the shared sway-time uniform (marine) and distance-culls the slice root at 400 m (high) / 330 m (smooth), same radii as the harbor module. No RAF, no per-frame allocations; per-cluster frustum culling comes free from `clusterInstances` bounding spheres.
- `dispose`: idempotent; disposes only per-create instance buffers and merged geometry. Module-level geometry caches and shared materials survive, matching `atlantisMaterials` semantics; re-creation after dispose reproduces identical stats.

### Suggested integration (not wired by this delivery)

```js
// inside createAtlantisCity, immediately after createAtlantisHarborRuins:
const furniture = createAtlantisExplorationFurniture(root, {
  heightAt,
  site: ATLANTIS_EXCAVATION_SITES[0],
  hostColliders: colliders, // city + underways + harbor so far
  facades: deriveHarborFacades(records), // see docs: nearest solid harbor building's street wall
});
colliders.push(...furniture.colliders);
landmarks.push(...furniture.landmarks);
const marine = createAtlantisCityMarine(root, {
  heightAt,
  site: ATLANTIS_EXCAVATION_SITES[0],
  hostColliders: colliders, // now includes furniture
  facades,
});
colliders.push(...marine.colliders);
landmarks.push(...marine.landmarks);
// in update(): furniture.update(...); marine.update(...);
// in dispose(): furniture.dispose(); marine.dispose();  (before clearing root)
```

Order matters: marine must see furniture colliders so its floor pieces avoid chests/benches. The slice adds no obstacles entries; indoor fish already avoid real walls and no whole-room spheres were added.

## Asset construction notes

- Branching coral: recursive two-generation tapered tube skeleton (3 variants) with terminal polyp knobs and a stone-colored root pad, ivory-to-rose vertex gradient, `addSurfaceDetail("coral")` pores.
- Plate sponge: 3–4 wavy-rim lofted plates with yaw/tilt offsets plus two lipped vase tubes, ochre gradient; wall variants read as bracket growth.
- Sea fan: the accepted v0.7.0 nursery open-lattice fan geometry with added root pad and plum/violet vertex gradient (real holes, no alpha planes); gentle instanced sway.
- Anemone: lofted column + 16–22 tapered curved tentacles with pale tips, foot pad.
- Kelp: nursery triple-ribbon tuft, stretched 2.6×, leaf-detail shader + stronger sway; used sparingly (shaft rim, gate lip, facade cornice).
- Furniture: benches with stepped volute supports, dentil front strip and bronze back rail; round tables with lathed pedestal, bronze rim torus and radial inlay strips; chests with recessed panels, extruded semicircular dome lid, three riveted bronze bands, nacre medallion/keyhole accents; amphorae with ring foot, neck ridge, separate handles, one tipped jar plus a half-shell shard per cluster.
- Instancing: per-archetype `InstancedMesh` batches split into ≤34 m spatial clusters via the nursery `clusterInstances`; per-instance tint jitter over shared vertex-colored materials (5 marine materials, city material set for furniture). Furniture merges into ≤5 material buckets plus 3 instanced scatter meshes.

## Verification evidence (this slice)

- Headless data harness: `.local/marine_verify.mjs` (run with `node --import .local/marine_register.mjs`, which redirects the new modules' shared imports to the reference package, same as the browser route-fulfill rewrite).
- Browser harness: `.local/marine_preview.html|js` + `.local/marine_shots.mjs` on `npx vite --port 5194 --strictPort` with `.local/marine_vite.config.js` (single `three` via `resolve.dedupe`). Atmosphere (fog density, hemisphere/sun/rim intensities, city light blend) ported from the reference `main.js` night branch; lighting comes from the city's existing five-light pool.
- Screenshots: `.local/marine_*_1440x900_*.png` and `.local/marine_*_390x700_*.png`, reports `.local/marine_report_*.json`.

Results and remaining limits are appended below after each review round.

## Round log

### Round 1 (`.local/marine_*_r1.png`)

First complete slice. Defects found on review: wall fans read as near-black "cobwebs" (palette too dark, ledge band too uniform); the four species closeups rendered empty because `clusterInstances` drops the source mesh name (fixed by re-applying names to cluster batches); the street-facade framing cropped the wall foot and its amphora cluster; tipped scatter bowls floated slightly; amphora clay read almost black in pearl light.

### Round 2 (`.local/marine_*_r2.png`)

Brightened fan gradient and tints, spread ledge heights, brighter amphora clay, tipped scatter sunk to contact, reframed street facade and route clearance. All 26 shots rendered with zero page errors. Defects found on review: branching coral read as dark brick-red instead of ivory/rose cold-water coral; root pads read as faceted boulders at close range; fan closeup framed edge-on and coral closeup was half-blocked by a roof stub.

### Round 3 (`.local/marine_*_r3.png`, final evidence set)

Lightened coral gradient and instance tints, flattened and shrank root pads, closeup framing now uses instance quaternions (fan broadside) and floor-level anchors. Accepted after review at both viewports: attached silhouettes are distinct per species, materials carry vertex-color and procedural surface detail, masonry seams/cornices/floors read colonized without blocking any swim route, and furniture groups read as ancient carved stone/bronze/shell-inlay sets.

## Measured results (final code state)

**Content counts.** Marine colonization: 161 placed instances (58 sea fans, 29 plate sponges, 25 anemones, 15 wall sponges, 12 wall anemones, 12 branching corals, 10 kelp tufts) in 70 spatial cluster meshes, from 12 scanned interior wall bands plus columns, shaft rim, roof accents, entrance stair and one street facade. Furniture: 12 substantial pieces (4 benches, 2 round tables, 4 carved chests, 2 amphora clusters, one at the street-facade foot) plus 12 instanced scatter pieces; zero planned groups were dropped by the keep-out/host validation.

**Cost.** Slice total 112,343 added triangles (marine 99,608 across shared cached archetypes; furniture 12,735 merged into five material buckets plus three scatter meshes) — 7.5% of the accepted matched Harbor-scene baseline (1,494,916 triangles / 432 draw calls, Harbor High, per the reference verification record), inside the roughly ≤15% guidance. Harness view costs at 1440×900 with the whole visible city ranged 32–255 draw calls and 143k–1.34M triangles per view (these include reference city geometry, not the slice alone). Colliders added: 12 furniture boxes plus 3 marine capsules against the city's 13,367; no obstacle spheres, no new point lights.

**Route revalidation (headless, reference `collision.js`).** Both accepted adult routes (`stair_to_lower_hall`, `south_exit_to_lower_hall`) walked with `resolveMotion` at 3/16/30 m body sizes in both directions against the combined collider set (city + furniture + marine): 12/12 walks reached their final waypoint with 0.00 m end deviation, zero stuck, zero contacts; `castSegment` between consecutive waypoints with the body radius reported zero hits for every leg and size. No new collider sits inside the shaft opening or the turning-circle swim plane (`turn.y ± 8 m`, full clear radius).

**Lifecycle and determinism.** Same-seed rebuild reproduces identical stats (161 instances / 99,608 triangles). `dispose()` is idempotent on both modules, empties colliders/lightSources/landmarks and detaches the root; re-creation after dispose works. Distance culling toggles the slice roots at the same 400/330 m radii as the harbor module. Update calls only write the shared sway-time uniform and visibility flags — no RAF, no per-frame allocation.

**Repo checks.** `npm test`: 409 passed, 0 failed (run on the workspace with `src/atlantis_architecture.js` at HEAD; the two historical architecture-budget cases pass there, and this delivery adds only new files). `npx prettier --check src/atlantis_city_marine.js src/atlantis_exploration_furniture.js docs/atlantis_exploration_art.md`: clean. Interface smoke (`.local/marine_smoke.mjs`): both `create*` factories return the full contract and pass idempotent-dispose checks — 18/18.

**Screenshot inventory.** Final set `.local/marine_<name>_<1440x900|390x700>_r3.png` (26 files) plus `.local/marine_report_r3.json` (per-view renderer stats and the merged verification block): `hall_panorama`, `hall_pearl_corner`, `stair_entrance`, `street_facade`, `furniture_banquet`, `chest_closeup`, `upper_corner`, `shaft_clearance`, `route_clearance`, `coral_closeup`, `seafan_closeup`, `sponge_closeup`, `anemone_closeup`. Collider dump: `.local/marine_colliders.json`. Full check log: `.local/marine_verify_final.log`. Round 1/2 captures are kept alongside for the defect history; `.local/marine_report_r2.json` carries the same verification block.

## Remaining limits

- The harness atmosphere (fog, hemisphere/sun/rim, city light blend, camera-attached glow) is a faithful port of the reference `main.js` night branch, but it is not the live game loop; integrated acceptance still requires Codex review in the actual game with live ecology, both characters and the follow camera.
- The route walk steps `resolveMotion` in ~2 m increments along metadata waypoints; it proves the new colliders do not pinch the two accepted routes, not full continuous-body play at speed through the real input pipeline (the reference 39+17 structural checks remain authoritative for the halls themselves).
- Harness draw-call figures include all visible reference-city chunks; the integrated per-frame delta depends on final chunking and must be re-measured against the matched baseline in the integration worktree.
- Sea fans intentionally reuse the accepted nursery open-lattice language, which thins at glancing angles; root pads are deliberately subtle encrustations and can read as smooth mounds at very close range.
- The 390×700 set is viewport emulation, not physical-device proof; real-device multitouch/performance checks stay with the owner acceptance run.
- If the NE lower-hall banquet corner reads too dim in the integrated game, apply the optional pearl-niche metadata from the Lighting paragraph rather than adding any electric light.

## Agora sunken archive slice — September 30 (`.local/agora_*_r4.png` final evidence set)

Second and final slice of the exploration revision: the lower ruin site inside the `agora_bridges` reservation, delivered as two new modules plus preview evidence. Source package for all reference contracts: `.local/owner_reference_20260930_slice_review/` (read-only). No existing file was modified; shared terrain registration, fish migration and light-pool wiring stay with the owner (see Requests below).

### Composition (deliberately not a harbor box)

The **sunken archive cistern** sits directly under the existing open shaft between the two bridge halls. Instead of a rectangular room with a roof slab, the dig is an open quarry-pit whose masonry lining, perimeter cloister walkways and partial vault shells are all below the original seabed:

- **Open descent well** — the pit opening (60×78 m at the rim, floor −362 m) aligned under the bridges' central void; entry is a straight vertical dive between the intact wings, past the broken rim markers, into the courtyard opening of the cloister ring (41×57.5 m clear).
- **Upper cloister** — a perimeter walkway ring (deck top −334 m) on corbels, with broken inner-edge curbs, reading as the cistern's gallery level; two intact bays carry five-plate horseshoe **vault shells**, two more bays keep rib fragments only.
- **Lower cistern** — the excavated floor (−362 m) with the turning-circle mosaic (octagon slab, three bronze rings, eight lapis spokes), stepped reading podiums at the north court corners, and furnished aisles under the walkways.
- **Archive wall** — the tall north lining wall (to −288 m) with nine pilaster bays and three scroll-niche registers holding jar inserts; the archive identity of the site.
- **Second exit** — a 16×16 m arched portal through the south wall at gallery level into a masonry-marked **gate channel** (terrain trench x∈[208,224], z∈[−498,−486], cheek walls, two broken mouth pylons, fallen lintel rubble) surfacing under the south bridge. Combined with the well this gives a continuous two-way loop.
- Two `pearlHabitat({detail:"niche"})` niches (south aisle, north aisle) light both levels through the existing five-light pool metadata; no new light objects, no glowing wall bars.

### Placement constraints honored (measured, `.local/agora_site_survey.json`)

- The pit (x∈[185,245], z∈[−486,−408]) keeps 8.5 m clear of every 11×11 m pier foundation (x=171/259, z=−493.5/−447.5/−401.5) and stays 5 m off both great-arch bands; the trench threads between them to the south.
- Deck elevation −197.355, floor maximum −249.355 and the decision point (265,−391.5) are untouched: rebuilding `createAtlantisUnderways` with the excavated sampler reproduces bit-identical records and colliders.
- The four existing underway pearls (189/241, −490.5/−404.5) sit 1.4–4 m outside the dig; city buildings are all outside the reservation.
- The existing `agora_bridges` spadefish school (8, anchor y=−226.36, above the seabed) gets a legal lower-level volume: metadata `fishSanctuary` anchor (224,−349,−464), clearance cylinder r=12 m / y∈[−358,−340], raycast free of every collider.

### Interfaces

```js
AGORA_EXCAVATION_SITE                 // frozen site metadata, harbor field conventions
agoraExcavationHeight(x, z, base)     // pure local dig; outside pit/trench returns base verbatim
withAgoraExcavation(baseHeightAt)     // sampler wrapper for the preview
isAgoraExcavated(x, z)                // pit-bounds query

createAtlantisAgoraRuins(parent, { heightAt, site?, hostColliders? })
  → { root, colliders, obstacles, landmarks, lightSources, records, stats, update, dispose }
```

Collider kinds are `agora_ruin_*` (389 total: walls/deck/corbels/curbs/vault ribs+plates/gate arch/channel cheeks/rim markers/podiums/fallen column/furniture + pearl shells); no enclosing obstacle sphere. Furniture is a fresh composition (6 benches, 2 tables, 5 carved chests, 2 amphora clusters, 1 treasure dais — decorative only), build-time validated against the same keep-out zones the corrected marine module uses; attached coral/fans/sponges/anemones/kelp come from `createAtlantisCityMarine` driven by this site metadata plus the ruins colliders (102 instances, 4 wall bands).

### Measured results (final code state)

- **Routes** (`.local/agora_verify_result.json`): both metadata routes (`well_descent`, `south_gate_channel`) walked with full-body `resolveMotion` at 3/16/30 m in both directions against the combined collider set (city 13,583 + ruins 389 + marine 6) — 12/12 reached with 0.00 m end deviation, zero stuck, zero contacts, zero `castSegment` hits; high-speed 30 m passes at 6 m frame steps also clean; 16-heading turning loop at r=12 m with a 30 m body: zero contacts.
- **Ground**: city pavement cell (adapter-registered refinement, the production code path) raycast down/up at 12 samples — max |mesh − heightAt+0.22| error 0.15 m, no coarse-triangle lid over pit or trench; the control mesh without the dig still spans the pit area at −302.15 (proving the before/after pair).
- **Bridge integrity**: no agora collider intersects any `agora_bridges` collider (edge-sweep both ways); underway records bit-identical before/after the dig.
- **Cost**: slice adds 96,464 triangles (ruins 30,552 + marine 65,864) = **8.0%** of the matched Agora High baseline (1,206,892 tris / 379 draws), inside the ≤15% guidance. Harness views at 1440×900: 24–273 draw calls including the whole visible reference city.
- **Determinism/lifecycle**: same-seed rebuild reproduces identical stats (30,552 tris / 389 colliders); `dispose()` idempotent, empties colliders and detaches the root; distance culling at the shared 400/330 m radii; no RAF, no per-frame allocation.
- **Repo checks**: `npm test` 409 passed / 0 failed; `npx prettier --check` clean on both new source files.

### Screenshot inventory

`.local/agora_<name>_<1440x900|390x700>_r4.png` (38 files) + `.local/agora_report_r4.json`: `approach_exterior`, `well_descent`, `cistern_panorama`, `cloister_aisle_east`, `cloister_aisle_west_vault`, `vault_bay_closeup`, `archive_wall`, `gate_portal_inside`, `second_exit_channel`, `turning_circle_clearance`, `furniture_dais_closeup`, `pearl_south_aisle`, `upper_deck_control` (bridge complex untouched), `amphora_closeup`, plus `coral/seafan/sponge/anemone` closeups and `kelp_walkway_rim`. Round 1–3 captures kept alongside for the defect history (r1: podium bronze plate covered the whole top — reframed to edge strips; gate 12 m clear height brushed a pitching 30 m body — raised to 16 m; cheek walls lowered; vault shells widened to five plates).

### Terrain adapter (preview-only, no shared-source edits)

`.local/agora_terrain_adapter.js` (node) and the same text served via route-fulfill (browser) re-export the reference `atlantis_terrain.js` verbatim but with `ATLANTIS_EXCAVATION_SITES = [...reference, AGORA_EXCAVATION_SITE]`, so the reference `createAtlantisTerrainMesh` refines Agora cells exactly as the owner's registration will. `atlantisSeabedHeight` stays the reference harbor-only dig; the Agora dig is applied once through `withAgoraExcavation`.

### Requests for owner integration

1. Register `AGORA_EXCAVATION_SITE` in the shared terrain (append to `ATLANTIS_EXCAVATION_SITES`; fields are harbor-convention) and route the active region's `heightAt` through it.
2. Create the ruins + agora marine from `createAtlantisCity` after the underways/harbor (colliders order: city → ruins → furniture/marine with accumulated `hostColliders`), and feed `ruins.lightSources` into the existing five-light pool.
3. Migrate the 8 `agora_bridges` spadefish to `fishSanctuary.anchor` (224,−349,−464) with band ±6 m; no species/count/nutrition change requested.
4. Repeat acceptance in the real game (both characters, follow camera, live ecology); harness evidence is a controlled composition, not the integrated run.

### Remaining limits

- Same harness caveats as the marine slice: ported night atmosphere, viewport emulation for 390×700, draw-call figures include reference-city chunks; real-device performance and natural discovery playtests stay with owner acceptance.
- The marine module's column-attachment planner keys on `harbor_ruin_column` colliders, so the agora build (no freestanding court columns) intentionally gets no column-base anemones; wall bands fall back to the pit-bounds convention, verified against the real lining walls.
- The archive-wall niche jars and inlay strips are visual-only by design (sub-centimeter relief), matching the harbor convention that substantial furniture carries real colliders.

## Final owner pottery correction

Actual game close-ups exposed a material mismatch: the nominal amphorae used a metallic bronze shader with pale silver-looking handles. Codex reused the existing shared, untextured rough material (roughness 0.94, metalness 0.03) and coherent weathered clay vertex colors for bodies, handles and fragments. The original tangential torus handles also had free ends; radial curved handles now enter the neck and shoulder. Independent checks found all seven vertices of each final end ring inside the actual sixteen-section bottle wall, with minimum overlap of 6.79cm and 3.00cm, and all four actual placement seeds inside their existing validation bounds. Positions, footing and collision metadata remain unchanged. Agora now has 15 merged meshes / 39,040 triangles; the extra material bucket and 336 triangles were included in final disposal and rendering review. These changes supersede the original delegate pottery appearance.
