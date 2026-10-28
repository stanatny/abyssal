# Odyssey: expanded sea roads and distributed encounters

Date: 2026-10-28. Status: candidate awaiting player review. Uncommitted and unpushed.

## Scope and design

The user accepts the coastal refinement, requests the next scenery group, then
asks for a larger Odyssey map, mythology-led underwater layout and more even
habitats. Every existing kind must remain present. Each lord needs an ordinary
hunter capable of retaliating against a 30 m player and a small number of
obtainable supplies.

The world grows from 600 × 1,290 to 960 × 1,900 world units: about 2.36 times
the horizontal area. The bottom bound changes from 740 to 980; actual terrain
is bounded above -942. Displayed depth still uses the shared ×4 convention.
The accepted Troy coast and nursery terrain inside the previous northern
footprint retain their exact samples. The beach remains unavailable for land
exploration. There is no new land gameplay, lord or creature description.

The onward route now has five readable stages:

1. Ithacan nursery and Troy's western shoreline, with separate small feeding groups.
2. Nereid Gardens, an open colonnaded passage, textured sand, seagrass and coral patches.
3. A broader broken-mast shelf: the 90 m galley moves west while Karkinos has an open eastern battle terrace.
4. A deeper cross-sea route into Scylla's cliff-sided strait, with a separate retreat and feeding side.
5. Charybdis's lower subsidence basin, with its food and ordinary hunter outside the central maw.

The garden and second gateway openings are 112 and 126 m; the main route and
side supply approaches retain grown-body clearance. These are navigable openings,
not a promise that every decorative ruin can be entered. The new coast-to-depth
mapping preserves original species' approximate height above local ground; the
final ecology fitter then places groups and large residents deliberately.

Homer's [Odyssey, Book XII](https://classics.mit.edu/Homer/odyssey.12.xii.html)
and the [Perseus text, XII.73 onward](https://beta.perseus.tufts.edu/urn%3Acts%3AgreekLit%3Atlg0012.tlg002.bryant1873-eng2%3A12.73/)
inform the opposed cliff/whirlpool idea. The submerged gardens, crab shelf and
playable sea ecology are this game's fantasy adaptation, not a literal geographic
reconstruction of Homer's itinerary. Existing lore remains unchanged.

## Scenery production and costs

A new terracotta transport amphora was actually generated with Microsoft
TRELLIS.2, seed 754801, from an original concept. The raw GLB is retained with its
receipt; its export is 3,421,716 bytes. Conversion preserves the hollow neck and
handles, rebakes UV color, and supplies source-derived vertex colors during
texture loading. The runtime mesh is 5,339 vertices / 4,402 triangles; the welded
far index uses 694 triangles with recomputed normals. Both use the same source.

Forty-five shallow pottery placements replace the old procedural pots, including
resting and toppled examples. The first cluster moves from dry land back into
water after the earlier coast alteration. Accepted HF branch coral, sea fans
and tube sponges are reused through their shared reference-counted cache;
no previously accepted creature or coast model is regenerated. Seagrass has
varied curved blades. Filtered sand ripples and gravel patches alter shading,
not physical terrain. Deep pottery and other deep ruin silhouettes remain later
art batches rather than being labelled completely redrawn.

Near/far instances are packed into bounded batches, checked every 0.35 active
seconds with hysteresis and High/Smooth distance limits. Source vertex color is
the fallback, not a white plane. The existing update/disposal loop owns the
controller. A late module result after leaving the map cannot attach assets.
New local pot geometry/materials are separate from shared reef resources.

HF included quota was checked before generation at 215.425371 / 2,400 seconds
and after export at 168.296896, overage zero. These are dated receipts before the
2026-10-28 18:03:59 BJT reset, not a claim about current balance. No extra paid
inference was authorized or used.

## Final ecology contract

All 21 ordinary kinds remain, with the three existing lords and Golden Argonaut
bringing the regional creature roster to 25 kinds. Ordinary stock changes from
269 to 323. The additional 54 animals are small groups on separated feeding
routes; adult-hunter and large-food counts are not multiplied with map area.

Each lord has one of the existing three Ceto Serpents in nearby water, about
92–123 m from the lord's nominal home, and two or three 16–24 m non-predatory
meals within 185 m, outside the central 100 m. Remaining large meals move onto
side routes instead of overlapping the new encounter supplies. All habitat
locations are consumed by the normal runtime movement and respawn systems.

The safe nursery intentionally retains more small food than the deep end;
“evenly distributed” means continuous suitable feeding stages and accessible
habitats across the route, not identical density at every depth. All eight-map
hunger, food values, growth, damage, attack cadence and once-only victory rules
remain shared and unchanged. Odyssey still requires 30 m and all three lords.

## Verification

Fresh evidence is in `.local/odyssey_shallows_20261028/`; previous coast and
creature acceptance evidence is not counted as a new test of this expansion.
Fresh results:

- All 2,067 automated tests pass. Expansion-specific checks cover final population,
  full-body spawn/respawn legality, limited encounter food, adult access in both
  directions, coastline preservation and late-loading disposal. Rendered floor
  samples agree with the authoritative terrain within the existing 0.2 m limit.
  A sharp clipped shelf initially exceeded it; a scoped smooth cap corrected
  that seam without changing the accepted coast.
- Native populated gameplay has all 21 ordinary kinds plus the rare creature.
  Each of the three Ceto Serpents genuinely bites a 30 m player (100 health to
  approximately 52). Each lord enters windup, attack and recovery; Scylla also
  deals damage in that run. The other two runs verify attack cycles, not a
  claim that every staged attack connected.
- A 3 m player eats nursery prey, and a 30 m player eats a side supply in each
  lord area. The last consumed animal respawns through its normal countdown
  at the assigned habitat. No per-frame NPC repositioning is used. Initial
  encounter positions, invulnerability and isolated attackers are test setup.
- Pause holds active simulation still. Leaving Odyssey releases all five
  observed new amphora resources once; returning reconstructs 200 shallow
  placements and the ordinary/rare population. No runtime errors are captured.
- Full prepared environment geometry CPU buffers rise from 20,305,708 to
  29,579,676 bytes, and floor triangles from 248,880 to 488,680. Existing coast
  triangles/draws stay 411,497 / 9. There are 459 colliders, including the same
  27 shoreline boundaries. These are expansion costs, not a performance gain.
- Native Chrome 155 on this M6 mini, 1280 × 800 / DPR 1, gives median 16.7 ms
  and p95 17.8–18.3 ms across six short live samples (bay/garden/basin,
  High/Smooth; 3 s warm-up plus 6 s capture each, no encoder). These capped
  desktop observations neither compare the old map nor establish phone or
  thermal performance. A desktop 390 px layout check is not physical-phone testing.
- The labelled gameplay film includes observer views and an ordinary follow-camera
  passage. It and the actual-terrain/population layout diagram are delivery aids,
  not evidence of user acceptance.

The source GLB SHA-256 is
`35b67feb8660ff9478f16306b9fa62a9a97745794fc0f10f6317803f414d813a`.
Reproduce asset conversion with `scripts/prepare_odyssey_amphora_hf_asset.mjs`,
then `scripts/build_odyssey_amphora_lod.mjs`; keep the original GLB/receipt.
Production entry `index-Da24icqs.js` passes normal English desktop and Chinese
390 px menu/start/quality/pause/resume/re-entry flows; new amphora and reused reef
textures load without debug hooks. A separate native failure injection verifies
source-color fallback when the amphora WebP is blocked and successful restoration
through the shared online retry path. This does not claim perpetual HTTP retry.

All 911 current dist/runtime artifacts (286,855,757 bytes) match locally. The 26
changed artifacts also match fresh local/public HTTP downloads. The other 885
public files rely on the preceding dated artifact audit; they are not presented
as newly fetched. Eleven private/source paths are denied on both origins, and
all four service identities remain unchanged. The preview is
[the expanded Odyssey candidate](https://saver-recorded-digit-could.trycloudflare.com/?preview=odyssey-expanded-20261028).

All previously accepted creature/coast assets and creature factories match the
pre-task fingerprints. The extra-species file changes only its legacy-height
import so anchors are transformed once, with its earlier shoreline correction
preserved. No commit, push or production Pages release is made in this batch.

The user subsequently accepts this batch for continuation and requests the next
scenery group. See [the submerged-gate and galley review](odyssey_ruins_revision.md).
This does not authorize a commit or push.
