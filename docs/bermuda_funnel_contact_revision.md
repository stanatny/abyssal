# Bermuda liner funnel contact — 2026-11-20

Publication accepted — 2026-11-20: the user authorizes committing and pushing
this delivered repair to main as v0.11.31. Earlier uncommitted/no-push statements
below describe the prior candidate stage. See [the release record](release_v0_11_31.md)
for publication checks and deployment evidence.

## Diagnosis and scope

The player reports passing through the deep liner's funnels. The accepted HF
replacement added visible shells through the geometry-only builder, while only
the old deck bases had blocking geometry. A ray hits the real upper wall of an
upright funnel while the original collision query returns no hit. The tilted
funnel can incidentally overlap an old wall; this is not funnel contact.

The candidate adds contact to all four existing funnels. Their positions, tilt,
source mesh, textures, visible geometry and the rest of the wreck remain intact.
This is an uncommitted repair on `fix/bermuda-funnel-contact`, based on published
v0.11.30 / `9d6fd60`. No new commit, push or version bump is authorized.

## Correction

Fit the existing mesh exactly as before, then clip its real triangles across
twelve angular sectors and four height bands. Each nonempty piece contributes
to a small oriented box, transformed with the same funnel pose and final 2.5×
wreck scale. Clipping triangles avoids gaps caused by assigning vertices alone.
The lowest band is 4% of the mesh height and contains the real bottom plate;
the upper shaft remains hollow rather than becoming a solid cylinder.

The four funnels add 192 static boxes after the original 402 ship colliders,
preserving every prior collider's fields, order and ID. Existing indexed world
queries consume these contacts for movement and occlusion. No per-frame mesh
query, draw, light, material or animation is added. Templates are reused across
the four placements, while each wreck owns its collider state.

## Verification

- The new regression reproduces missing upper-wall contact before the fix.
  The final 109 focused Bermuda, continuous-collision and spatial-index checks
  pass. These cover all four upright/tilted funnels, both directions, full-body
  sweeps at 3/15/32 m, clean retreat, the true triangle surface, an open upper
  shaft and a blocked bottom.
- Side probes check the collision point's nearest real triangle, rather than
  comparing the distance of a zero-radius center ray with an inflated sphere
  sweep. A projecting band can correctly contact the side of a sphere first.
  The sampled conservative contact gap is bounded to 1.4 world metres.
- The independent original/current comparison preserves the original 402
  colliders, all 17 visible merged meshes and buffers, four routes, eleven rooms,
  204 fixtures, eight lights and landmarks exactly. The historical geology
  fingerprint still checks all old non-geology solids; the explicitly new
  funnel contacts are excluded from that old snapshot and covered separately.
- Native live-loop checks complete all eight front/back approaches to the four
  funnels with an 8 m Orca and actual Space input. Each reaches a funnel-specific
  contact, remains outside while continuing to sprint, and reports no stuck
  state. Native browser errors are empty. Initial placement is controlled;
  movement thereafter uses the original world solver and ordinary follow view.
- Repository formatting, diff checks and the production build pass. The same
  restricted public preview loads the rebuilt worker, selects Bermuda through
  the real menu and enters gameplay without page errors. Production exposes no
  development hooks. The previous runtime is archived and main/Pages is unchanged.
- Eight alternating warm construction samples on this host give about 449 ms
  for the original wreck and 496 ms for the candidate; paired median added CPU
  construction time is about 51 ms. This is a one-time construction measurement,
  not an FPS or physical-phone performance claim.

Raw probes, original/candidate preservation, construction timing, native scene
checks and preview build receipts remain in the ignored
`bermuda_funnel_contact_20261120` task folder. Native approaches stage only their
initial position and heading, then use the original game loop, Space input,
follow camera and world collision. They do not establish a natural full voyage.
The public main release remains v0.11.30 until separately authorized publication.
