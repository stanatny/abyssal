# Poseidon sculpture candidate

The September 30 candidate replaces the earlier robed, narrow-shouldered model with a standing sea god: a broad carved chest, separated supporting legs, one raised gripping arm, a relaxed hand resting against the drapery, a compact waved beard, a sea crown, and a bronze trident. This is an original stylized sculpture, not a reconstruction of a particular historical statue.

## Source and integration

The editable source is `src/atlantis_art_poseidon.js`, with the local loft, swept surface, blade, and cloth helpers in `src/atlantis_poseidon_sculpture_geometry.js`. All geometry and surface coloring were authored for this project. No external model, downloaded texture, generated image, or third-party artwork was added. The sculpture uses the existing city marble, bronze, and lapis materials and the existing Three.js dependency.

The public `buildPoseidon(bucket, origin)` interface is preserved. Geometry stays in a module-level immutable cache; the city merge bucket clones it for each instance. The sculpture is still oriented toward +Z, the city still applies its existing 1.55 scale, and the trident tip is exactly 81.5 local units above the feet. The original source is preserved in ignored local evidence for comparison.

Local bounds are approximately x=-13.556..11.715, y=0..81.5, z=-5.154..6.759. At the existing scale, the whole silhouette spans approximately 39.17 by 18.47 horizontal world units. The leftmost trident blade overhangs the existing foundation by about 0.013 world units; the feet and shaft stand well inside the existing 42 by 36 foundation. No foundation expansion is required.

The geometry totals **147,946 triangles**, merged into three material meshes: 133,458 marble, 14,456 bronze, and 32 lapis. The tiny lapis jewel is on the trident; the eyes use carved stone rather than emitted light. The model supplies 25 anatomy-specific capsules, including separate arms, legs, cloth areas, and individual trident branches. It no longer fills the open fork with one large box collider.

## Inspection and corrections

A scoped Three.js inspection harness loaded the production sculpture module, the actual city materials, and the actual merge bucket. Eight 1000 by 1200 images were inspected: front, three-quarter, side, back, head, torso, trident grip, and resting hand. This is a controlled model inspection with studio lighting and a temporary display base, **not an actual ocean screenshot or a performance measurement**. The harness opens its own ephemeral port and closes its browser and server when done.

The inspection found and corrected detached arm segments, inconsistent swept-surface frames at bends, a waist-cloth intersection, the straight beard-bundle appearance, an unsupported resting hand, and round separate foot/ankle shapes. The final arms use continuous surfaces, the feet are part of the lower-leg mesh, and the waist folds sag and gather toward one side. Both hands were inspected close up against their actual contact objects. The final minor pass placed the foot and staff bottoms at local ground level and embedded the resting fingertips more deeply in the palm.

Evidence lives under ignored `.local/poseidon_sculpture/`: the original source, inspection harness, eight PNG views, and `geometry_report.json`. The report records geometry counts, bounds, source hashes, and cache checks. Final-image capture must be matched to the final hashes by the integration owner if later sculptural edits are made.

## Verification and limits

- Both source modules pass `node --check` and the scoped Prettier check; the scoped diff has no whitespace errors.
- All six existing `atlantis_environment.test.js` checks pass, including actual city finite buffers in both quality modes and shared-resource disposal behavior.
- The geometry check found no non-finite position, normal, color, or UV values and no degenerate triangles at the recorded tolerance.
- Repeated construction reuses identical source geometry objects while preserving each caller's independent origin transform.
- The measured trident tip matches its returned anchor; the 1.55-scale bounds were checked against the existing foundation.
- The independent inspection used headless installed Chrome and eight single-frame views. No frame-rate, physical-device, full-map lifecycle, or natural-play claim follows from these images.

The integration owner must still judge the final sculpture at ordinary gameplay distance in actual ocean lighting/fog and verify the integrated collision behavior. This document records the source and controlled-model checks; it does not itself mark final visual acceptance or authorize a commit or release.
