# Bermuda outer routes

The November 20 candidate below is historical. The [November 21 distribution
revision](bermuda_distribution_revision.md) supersedes its population, fleet,
outer terrain and layout-preservation promises following player feedback.

## Production brief — 2026-11-20

This is the first implementation batch of the approved three-map expansion.
Bermuda expands first; Amazon and Odyssey remain subsequent batches. Base:
`2271eaf` / v0.11.31. The candidate remains uncommitted for player review.

### Place and scale

Keep the stormbound western-Atlantic fantasy identity: reef passages, missing
aircraft, corroded shipping remains and abyssal salvage. The playable horizontal
bounds become x = -500…500 and z = -1760…140 (1,000 × 1,900 game metres).
Maximum physical depth remains 740 m; the HUD's depth scale remains four.
The nursery, spawn, starter pickup and 600 m liner stay in place. The original
liner geometry, interiors and 594 contacts remain unchanged.

The western reef-gate route and eastern lost-flight route bypass the liner and
join its approaches. Southern cargo and cable-machinery fields extend the deep
journey into a return loop. Sites have separate silhouettes and traversable
overhead/side bypasses for a 32 m character; rectangular map area alone is not
claimed as usable exploration space. No invisible arena walls are added.

Four existing lords are spread between the eastern surface approach, western
mid-depth route, southeastern deep route and southern abyss. Keep their kinds,
combat windows, radii, rewards and four-defeat objective. Move their four
existing retaliating giants with them; add finite food supplies rather than
multiply giant predators with area.

### Art, terrain and ecology

Compare against the accepted Bermuda HF geology, aircraft, cargo and liner
machinery kits. Reuse those detailed meshes/materials for distinctive assembled
sites; no new provider call is necessary if the integrated result meets that
bar. Hugging Face is authorized if a genuinely missing asset requires it.
Generated source assets and original core placements remain intact.
Provenance and original processing are retained in the [geology](bermuda_geology_huggingface_redraw.md),
[aircraft](bermuda_aircraft_huggingface_redraw.md), [cargo](bermuda_cargo_huggingface_redraw.md)
and [liner furnishings](bermuda_liner_furnishings_huggingface_redraw.md) asset records.

Fit full transformed footprints to the final triangle terrain. Reef apertures
retain matching shell contacts; machinery uses fitted contacts and broad water
bypasses. Extend the terrain adaptively, retaining the refined liner bed rather
than extending its expensive resolution across low-curvature outer water.

Preserve the final core school/home data as a prefix; append explicit outer
schools and residents after shared fitting. Nursery nutrition and shared hunger,
capture, growth, healing and respawn rules remain unchanged. Supply both lateral
routes and the southern district at their intended depth, including food usable
by medium/adult players. Stock counts and meal budgets are separate from actual
native feeding and replenishment evidence.

### Audio and integration contracts

Retain the accepted regional exploration, ordinary chase and engaged-lord score,
existing voices, feeding and storm effects. New sites are passive scenery; no new
audio composition or invented warning is added. Existing pause, region loading,
terminal and reset ownership apply. Keep finite storm/mine pools and nursery
exclusions; distribute existing waterspouts across the new surface routes.

The current agent integrates shared registration, boss homes, localization,
ecology fitting and the ocean factory. Same-model parallel work has explicit
non-overlapping ownership: bounds/config and terrain/water extents; final ecology
fitter; standalone outer-biome factory. No agent stages, commits or replaces
services. Runtime resources use the existing update loop, ref-counted asset
kits and idempotent disposal. Preview/build/browser services belong to the
integration owner.

### Acceptance and rollback

Check actual new bounds, mesh interior error, terrain fit, visible/collision
agreement, 32 m routes both ways and turns, old liner/funnel preservation,
distributed moving food and normal respawn, valid lord homes and surrounding
resupply. Inspect populated surface/descent/west/east/south views in native
Chrome, both graphics presets and bilingual narrow layouts. Check pause, Home,
restart, switching regions, resource cleanup and other-map bounds. Record
measured cost without promising physical-phone FPS or whole-round balance.

Rebuild the existing public preview only after integration checks. Match served
artifacts to source, deliver actual scene images/video and the preview URL.
Preserve previous runtime archives and published main. Rollback is the isolated
candidate diff; there is no release, version bump or push in this task.

## Verification

The integrated candidate is on `feat/bermuda-outer-routes`, based on v0.11.31.
Raw evidence is in the ignored `bermuda_expansion_20261120` task directory.

- Bounds/terrain: five focused checks pass. All 209,704 original core floor
  triangles retain exact position, normal, UV and index hashes. Final total:
  237,398 triangles versus 216,520 previously. The largest of 900,190 sampled
  triangle-interior errors is 0.289433 m. All three old/new seams have matching
  edges; added playable floor has no unexpected open edges or degenerate faces.
- Art: four checks pass against the final rendered terrain sampler. New assets
  reuse existing HF leases, with 269 appended contacts, geological near/far detail,
  distant wreck culling and no added lights or texture downloads. Full aircraft,
  cargo and machinery footprints fit the seabed; new cargo holds are juvenile
  interiors, with broad adult bypasses. The original liner's 594 contacts remain.
- Ecology: three checks preserve the old non-guard core fingerprint and verify
  all 120 added animals at legal final homes. The configured population is 595
  versus 475; the separate regional rare remains separate. There are 21 added
  school profiles and 14 adult residents; the four retaliating giant guards move
  with the four lords. Per-meal rules are unchanged. Static travel/meal budgets
  cover 3/6/10/16/25/30 m examples; they do not prove natural whole-round pacing.
- Native navigation: 32 m Orca and Giant Squid pass each new reef gate in both
  directions, eight complete 120 m traversals, driven by native Sprint after a
  staged start. Original follow camera and collision remain active; invulnerability
  isolates navigation. Final endpoints, not just a collision-free initial pose,
  are checked.
- Actual feeding: approach a moving added tuna school, register two meals through
  normal intake, freeze its timer during pause, then observe its normal 18-second
  replenishment at the same habitat and visible re-entry. No prey relocation,
  timer acceleration or hidden reward is used. Player starts/body length are staged.
- Presentation/lifecycle: actual populated English views cover all four new sites;
  a 390 px Chinese view, Home/restart and Hawaii/Bermuda/Amazon/Bermuda switching
  complete without page or console errors. Model ownership/disposal also has
  focused lease checks. These are desktop browser checks, not physical-phone
  or unassisted full-expedition acceptance.

Five paired serial terrain constructors had median 416 ms before / 691 ms after
on this host; typed terrain buffers grow about 0.55 MiB before vertex colours.
Standalone outer art construction takes 494–614 ms with the rendered floor sampler.
These are construction costs, not FPS or VRAM. Seeded populated headed Chrome158
on Apple M6/ANGLE Metal at 1280×800 was sampled serially in High and Smooth at the
nursery and liner: p95 before 215–221 ms / after 218–220 ms; draw counts before
50–403 / after 65–412. Both versions have roughly 200 ms frame medians in this
host setup, so these runs cannot establish device smoothness. The added render
work is real; no “no performance impact” claim is made. Raw paired results retain
that limitation. Existing regional audio is reused without new composition or a
new listening-acceptance claim.

The 16.44-second H.264 scene excerpt and two English screenshots were delivered
through the current conversation. Downloaded receipts match all three source
SHA-256 values. The video labels its observer camera; it is not presented as an
unassisted route or a concept render.

The complete regression ran 2,392 checks: 2,381 passed and 11 failed on obsolete
Bermuda stock, fixed-school or default-world expectations. Those assertions were
updated to the approved additive stock and independent bounds, retaining strict
old-core/other-map/size checks; all 11 then passed in the focused rerun. Complete
affected-file reruns also passed (9 feeding, 43 asset, 17 Mariana and 9 Bermuda
predator checks). This is full-run coverage plus focused correction, not a claim
that the first complete command was green. No functional source changed after
that full run. Formatting checks and the production build pass.

The existing restricted public preview was rebuilt in place, retaining the old
runtime archive. Public HTML/bootstrap, entry JavaScript/CSS, cache worker,
Bermuda chunk and the reused aircraft/cargo atlases match the reviewed build by
SHA-256. Native compiled desktop English and 390 px Chinese touch flows pass
launch, ability, Sprint, pause/resume and Home without page/console errors. A
separate compiled-factory probe confirms four new landmarks, 269 new contacts,
594 liner contacts and 237,398 terrain triangles. That fixture is distinguished
from input-driven development traversal; it does not claim the public player
naturally reached every destination. One test harness initially omitted the
narrow context's touch flag; the corrected narrow public flow passed separately.

Final runtime/source fingerprints, media receipts and service state are retained
with the task evidence. Task-only development and baseline servers were stopped;
the existing restricted preview, tunnel and scoped keep-awake remain available.
README landing copy remains accurate (stormy water, wrecks, four lords); it keeps
the stable published play URL. Main is still v0.11.31. Amazon/Odyssey expansion,
physical-phone smoothness, new audio listening and natural whole-round pacing
are not claimed complete by this Bermuda-first candidate.
