# Hawaii vacation island — local candidate

The nursery now connects visually to a continuous island immediately north of the playable boundary. The island includes a wet-sand margin, dry beach and low dunes, a broken shoreline wash, seven alternating cloth-panel umbrellas, fourteen framed loungers, towels, thirteen curved-trunk palms with feathered fronds, and six adult vacationers. Adult anatomy, swimwear, skinning, materials, and geometry caching reuse the accepted male/female swimmers; beach poses include standing, conversation, and sunbathing, with restrained breathing/head/hand motion.

## Reference and adaptation

The comparable baseline is the refined v0.6.10 ocean environment and adult human models. The distant relief is an original, deliberately compressed interpretation of the broad crater and asymmetric seaward ridge of Lēʻahi / Diamond Head. Hawaiʻi DLNR describes the [broad saucer-shaped tuff crater](https://dlnr.hawaii.gov/dsp/parks/oahu/diamond-head-state-monument/); its [official brochure](https://dlnr.hawaii.gov/dsp/files/2014/09/hsp_dh_brochure_2012.pdf) describes the pronounced seaward summit and eroded ridges. These facts informed an oval crater rim with a lower interior and uneven radial erosion. The scene is a fantasy vacation island, not a reconstruction of Oʻahu, Waikīkī, its buildings, or exact coastline. No external photographs, textures, or models were imported.

## Integration and geometry

`beach_environment.js` supplies the island height extension and the environment factory. `ocean.js` calls the factory, forwards the existing visual time, and disposes it with the ocean. No additional render loop, timers, gameplay entities, targets, rewards, or audio were added.

The shore and beach remain beyond the existing northern gameplay limit (`z = 140`). The current nursery, fish ranges, swimming boundaries, colliders, and seabed height within the entire playable rectangle are unchanged. The water plane extends beyond the island so its back coast remains surrounded by water. The existing terrain ends at the same seam where the island terrain begins; both sample the same height function. The island is scenery, and adults cannot be fed upon. The player sees it when surfacing and facing toward the northern shore; the original underwater home composition is unchanged.

Furniture and vegetation share nine material batches; terrain and shoreline wash add two draws. The six independent adult skeletons reuse existing cached assets. Adult placement samples real posed skin vertices against the sand; this corrected foot/back burial from using the original swimming envelope. The last check measured minimum ground clearances of 0.015 world meters for standing figures and 0.052–0.058 for figures on the 0.04-meter-high towels. Static geometry is built once, and shader time plus small bone motions update from the ocean's existing loop.

## Verification and evidence

Local Chrome, high quality, at 1440×900 and 390×667:

- Actual follow-camera captures after controlled positioning at the playable surface: `.local/beach_surface_desktop.png` and `.local/beach_surface_small.png`. The ordinary game camera, atmosphere, lighting, gameplay loop, and English HUD remained active. These confirm visibility from play but do not demonstrate a naturally completed swim from spawn.
- Controlled inspection cameras: `.local/beach_controlled_wide.png`, `.local/beach_controlled_close.png`, `.local/beach_controlled_back.png`, `.local/beach_controlled_small.png`, `.local/beach_controlled_close_small.png`, `.local/beach_controlled_sunbathing.png`, and `.local/beach_controlled_crater.png`. These isolate the geometry; close/overhead cameras can leave the playable area. The camera inspection uses the normal above-water fog values, without additional lights.
- `.local/beach_report.json`: 29 meshes, 98,404 triangles, 17 unique geometry/material resources in the island subtree (including six shared human geometry/material pairs); no browser page errors.
- `.local/beach_lifecycle.json`: three create/update/dispose cycles release all 11 exclusively owned geometries and 11 materials each time, leave no scene children, and never dispose the active gameplay humans' shared geometry. Calling dispose twice is safe. A grid across the whole playable rectangle confirms zero change to the previous seabed height formula.
- `.local/beach_cost.json`: at the same 1440×900 high-quality surface camera, a direct scene render with the island visible/hidden measured 78/45 calls and 366,014/221,046 triangles, including shadow passes. This isolates +33 calls and +144,968 rendered triangles in that view, without a texture count change. The water extension adds 3,744 triangles separately. This is a render-cost comparison, not an actual-device frame-rate result.
- 28 relevant existing tests passed: human models/skinning/cache ownership, collisions/spawn clearance, and pickup placement. Both changed source files pass Prettier.

The geometry is intentionally stylized. Browser viewport checks do not establish actual-phone frame rate, battery impact, or whole-session pacing. The crater and vacation details are supporting scenery, not accessible land gameplay. No commit, push, or release is included in this candidate.
