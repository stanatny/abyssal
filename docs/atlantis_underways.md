# Atlantis raised sanctuaries and underways

Development candidate, not published. These three complexes add genuine vertical exploration to the accepted monumental masonry city. The existing carved columns, layered cornices, bronze inlays, weathered stone and pediment language are the visual reference. No separate lighting, fog exemption, new animation loop or gameplay balance change is introduced.

## Spatial design

| Complex          | Center X / Z  | Lower gallery center Y | Upper deck Y | Distinct structure                                                     |
| ---------------- | ------------- | ---------------------- | ------------ | ---------------------------------------------------------------------- |
| Harbor sanctuary | -215 / -240.5 | -81.696                | -52.696      | Broad pitched sanctuary above a great double arch                      |
| Agora bridges    | 215 / -447.5  | -226.355               | -197.355     | Two elevated halls, end bridges and an open central ascent well        |
| Memorial terrace | -215 / -999.5 | -628.575               | -599.575     | Rear shrine and two smaller front pavilions surrounding an upper court |

Each complex replaces four original side lots. Its reservation is 112 × 124 meters, while the principal deck is 100 × 112 meters. Original buildings must be omitted before generating their geometry or full foundations if their projected footprint overlaps a reservation. The exported reservation helper accepts the original building's full projected width and depth; checking only its center is insufficient for neighboring towers and rotundas.

All five districts and the approximately 69.64% city footprint remain unchanged. The central avenue, arena and three Kraken territories stay outside the reservations. The shared seabed is unchanged. Every support has an individually sampled foundation sunk beneath the local slope. There is no solid foundation spanning the lower passage.

The lower deck is placed 52 meters above the highest sampled seabed point in the footprint. The two monumental arch openings and side columns preserve broad lower circulation; a center route has at least 44 meters of overhead space. Upper halls contain actual columns, entablature, triangular masonry pediments and solid pitched roof slabs. The Agora center remains open through the deck, creating a vertical connection between the two levels.

## Integration and runtime

`createAtlantisUnderways(parent, { heightAt })` returns `root`, `colliders`, `obstacles`, `landmarks`, `records`, `stats`, `update` and `dispose`. `records` includes lower and upper route endpoints and the Agora vertical route. The integration owner attaches these records and exposes `city.underways` for focused development verification.

Visible masonry and colliders share their dimensions. Arch wedges and pitched roof slabs use rotated box colliders; columns use capsule colliders and separate square plinth/capital boxes. Triangular pediments use twenty narrow collision strips instead of a full rectangular blocker. Tiny cornice teeth, bronze inlays and scrolls are visual details on structural surfaces rather than independent navigation obstacles.

Each complex merges geometry into three meshes using the existing shared stone, marble and bronze materials. The current isolated module contains 9 meshes, 97,352 triangles and 672 static colliders. It owns only the nine merged geometries; shared materials remain alive. Distance visibility uses the city's update lifecycle, and disposal is idempotent. These counts describe geometry cost, not real-device frame-rate acceptance.

## Focused verification

- `node --test tests/atlantis_underways.test.js`: **4/4 passed**. Tests reserve exactly twelve original lots, preserve coverage and districts, move a 30-meter body through both directions on both levels and through the Agora vertical well, verify both one-step high-speed traversal and 120-step motion, compare deck collision with the visible mesh, sample every independent foundation against the seabed, and check finite geometry and exactly-once disposal while another instance remains alive.
- `node scripts/verify_atlantis_underways.mjs`: **passed**, with 14 forward/reverse integrated routes, 21 screenshots and no browser console errors. The actual ocean collider set leaves all three lower galleries and upper routes open to 30-meter characters, including the Agora vertical well. Captures include three free-camera views plus desktop and 390-pixel active follow-camera views on both levels for each complex. Evidence is in `.local/atlantis_underways/report.json` and adjacent PNGs.

Controlled positioning and viewport emulation do not establish natural encounter rates, full-round progression, real-phone performance or final user acceptance. Actual overview, close and follow-camera review confirmed the distinct silhouettes, open undercrofts and visible upper floors in the existing lighting and fog. A first render exposed overhanging square column collars; these were replaced by tapered circular bronze collars and the 21-view capture was repeated. The new architecture remains a development candidate awaiting user acceptance.
