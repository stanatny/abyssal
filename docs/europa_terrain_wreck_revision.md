# Europa expedition terrain and research wreck — candidate, 2026-10-26

Publication scope — 2026-10-26: the user requests a final audit and main
publication if no blocking work remains. The audit clears this delivered scope
for v0.11.20. Earlier pending, rejected and no-push statements below retain their
dated revision context; superseded appearances are not restored. See the
[release record](release_v0_11_20.md) for final scope, verification and limitations.

The user requests science-informed terrain, a redrawn crashed research ship, and
more horizontal and vertical exploration room. The current AI agent owns this
work independently on `art/europa-hf-redraw`; no commit or publication is authorized.
Prior creature batches and the normal/pursuit repairs are preserved.

## Production brief

- Identity: an enclosed fictional ice ocean, with pale fractured pressure ice,
  mineral-stained rocky terraces, carbonate seep towers, attached colonies and a
  damaged ceramic/titanium scientific vessel. No open sky, lava rivers, or claim
  of discovered Europan life. Existing music and attack effects remain.
- Scale: expand the old geological layout by 1.6 around the ice ceiling and the
  nursery's longitudinal coordinate. Width 600→960 world metres, longitudinal
  extent 1,140→1,824 metres, configured depth 900→1,450 metres. Display depth
  remains four times world depth. Hawaii/Atlantis/Bermuda are 600×1,290×740;
  Amazon 900×1,490×550; Mariana's specialized vertical descent reaches 2,780.
  Thus Europa was narrow/short, but was not shallower than every other map.
- Routes: retain the five linked habitats and their side loops, widen existing
  arches and deep arenas. Move species anchors, lord homes, rare sites and hazard
  positions coherently. Keep animal sizes/speeds and all attack ranges unchanged.
  Keep the 247 configured ordinary animals and shared feeding-school densification (352 spawned ordinary animals plus one rare in the actual game); check actual coverage.
- Vessel: retain the actual four-room, 184.8 m walk-through pressure gallery and
  39.38 m central clear width. Redraw exterior structure/materials and add actual
  HF command hardware without sealing entrances or adding gameplay rewards.
- Artwork: two original concept inputs, TRELLIS.2 included allowance only, with
  exported GLBs retained. Distinguish HF detail from fitted procedural structure.
- Evidence: native Chrome matched terrain views, ship adult traversal, legal
  species placements and lord approaches, nursery feeding, texture retry, pause,
  region disposal/re-entry, production artifact parity. Physical phone performance
  remains unmeasured. Detailed costs will be recorded after integration.

## Scientific basis and limits

[NASA/JPL's water–rock model](https://www.jpl.nasa.gov/news/europas-ocean-may-have-an-earthlike-chemical-balance/)
identifies serpentinization as a possible hydrogen source without requiring
volcanic activity. [The 2026 seafloor study](https://www.nature.com/articles/s41467-025-67151-3)
and [WHOI's author explanation](https://www.whoi.edu/press-room/news-release/a-new-study-finds-jupiters-moon-europas-quiet-seafloor-may-still-hold-keys-for-life/)
limit expectations of active faulting/black smokers, while leaving cooler fluid
circulation as a possibility. Our pale seep deposits and restrained fluid plumes
are an artistic extrapolation, not observed geology. Bioluminescent colonies and
large animals remain explicitly fictional. The playable basin compresses scale;
it does not represent the full thickness/depth of the real ice shell/ocean.

## Implemented candidate

The complete Europa roster is covered by the preceding HF batches: sixteen
ordinary forms, three lords, Crystal Seraph and two rooted colony assets. The
four playable characters reuse their accepted models. This is a Europa inventory,
not a claim that every creature in every region has been redrawn.

Two original concept inputs were processed by Microsoft TRELLIS.2-4B through
Hugging Face and downloaded as actual GLBs. The damaged command module has
18,056 near triangles. The mineral seep cluster has 15,836 near / 1,800 distant
triangles; sixteen instances share mesh/material resources and change detail by
observer distance. The distant index error is 0.01831 in normalized mesh units.
No paid over-quota usage was requested. The last job receipt, dated
2026-10-26 18:08 BJT, reported 2,284.416884 included GPU seconds remaining; this
is a dated receipt, not a live balance claim.

The larger basin has mineral-stained floors, eroded side terraces and fractured
pressure ice. The geological mesh and static colliders use the same 1.6 transform.
Animals, ship rooms and rooted-organism sizes remain unchanged. Species depth
bands, school/spawn anchors, predator territories, lord homes, rare areas and
hazard sites are mapped together. The regional ceiling remains at world y=4.
The configured maximum depth is 1,450; the actual floor is shallower than that
safety bound. HUD depth still uses the existing four-times display conversion.

The research vessel now has segmented ceramic armor, exposed ribs and a damaged
HF command module above the four-room pressure gallery. A gently sloping rock
bench supports its entire footprint, with a smooth transition into the surrounding
rift. Open ends, the lateral breach, internal doors and service loop remain real
passages. The large structural gallery and fittings are fitted procedural geometry;
the HF export supplies command-module detail, not the entire traversable hull.

Seep skirts are fitted across their complete low footprint, so the sloping floor
cannot leave a hanging base. Six fitted contact bands per mineral cluster replace
the previous primitive tower contacts. These landmarks do not add damage; existing
regional hazard rules remain separate. No hunger, animal speed/size, attack, victory,
reward or ability values are changed. Enlarged travel distances can affect player
pacing; a staged route/budget check does not replace a whole-round player trial.

## Verification and remaining boundaries

Evidence lives in `.local/europa_terrain_wreck_20261026/`:

- `inventory.json`: actual factories for all twenty movable Europa forms report
  HF rigs; prior asset files are preserved.
- `full_tests.log`: 1,865 / 1,865 tests passed. After the final landing-bench and
  bilingual Guide edits, `final_scoped.log` passes 92 affected checks, including
  normals, adult main descent/arch loops, four-room paths, turns, hull/feet/debris
  support, lord habitat contracts and rare/colony ownership.
- `native/report.json`: three actual Europa → Hawaii cycles retain the configured
  population after shared densification; both new asset colors load via ordinary
  entry. Their geometry, material and texture disposal events all fire on exit.
  Renderer resources settle from 177 geometries / 351 textures to 198 / 355,
  then remain 198 / 355 on the third round as the existing cross-region caches warm.
  Ninety non-predator animals are within 120 world metres of the nursery observer.
- The actual 30 m player swims 198 m through the ship with ordinary follow view,
  without per-frame pinning or collision recovery. Final bench traversal is recorded
  separately in `native_final/`. Invulnerability and one-time placement isolate
  traversal from combat; these are controlled checks, not a normal full playthrough.
- Matching before/after geological overview views, detailed native scene captures,
  original raw-HF views, conversion receipts and the continuous ship tour are retained.
  Capture cameras are disclosed separately from ordinary player movement.

A closing geometry audit also found zero normals at two pre-existing procedural
lathe pole seams: the mineral crystals and an interior attached cup. Seventeen
rendered mesh instances reuse these two underlying geometries. The final repair
borrows a valid normal from the coincident physical vertex without changing
positions, indices, dimensions or contacts. `pole_tests.log` passes all 86 scoped
checks, including a traversal of every indexed scenery normal. The final native
tour and public verification are repeated after this repair. This does not claim
that every possible cause of a black frame on every device has been eliminated.

The initial integration test exposed unmapped predator territories and obsolete
coordinate assertions; the territories were corrected before native entry passed.
A first visual pass also exposed tower bases floating over a sloped bed; the final
full-footprint fitting and contact test address that defect. Test success alone
is not user acceptance of the new appearance. Physical-phone performance, thermal
impact and natural whole-round pacing remain unmeasured. This candidate is
uncommitted and unpublished to main. Preview/build verification is recorded below.

## Preview and delivery checks

The restricted preview is updated at
[the existing address](https://saver-recorded-digit-could.trycloudflare.com/),
entry `index-D0l56gJS.js`. `artifacts.json` verifies all 671 runtime artifacts,
179,392,202 bytes, byte-for-byte against both local restricted service and public
origin. Eleven private/source paths per origin remain refused. DEV 35213,
restricted preview 23118, awake 23120 and tunnel 35419 retain their recorded
identities. Old runtime files are archived; main and formal Pages remain v0.11.19.

`native_final/report.json` confirms the final bench and a 198 m continuous adult
ship swim, followed by a frozen pause. Six final scene views measure 53–117 draw
calls and 178,712–496,810 triangles. These are scene counters, not frame-rate or
physical-phone claims. `combat/report.json` records both Rift Reaver and Void
Siphon dealing actual damage to a 30 m player in their relocated habitats, with
idle/windup/active/recovery phases; the slow-input staged victim is intentionally
not a natural difficulty benchmark.

`public/report.json` records native production entry, both terrain Guide entries,
start/ability/pause/Home and same-address reload in English at 1440 px and Chinese
at 390 px. The narrow view is desktop touch emulation. An initial check sampled
before the asynchronous color queue completed; the corrected check explicitly
waits for actual color responses. It does not interpret the early fallback as a
permanent texture failure. No production debug hook is exposed.

`source_preservation.json` compares all 1,696 previous inputs: eighteen existing
files change for this terrain/coordinate/Guide/test/document scope, none disappear.
Previous animal meshes, colors, animation and the recent pursuit/normal repairs
are byte-identical. New work remains uncommitted for player review. The 46.8 s
H.264 delivery shows scenery inspection followed by ordinary 30 m follow-camera
traversal; encoded stills were visually reviewed. No third-party reference footage
is redistributed.
