# Mechanical Shark complete redesign — 2026-10-19

Superseded after user feedback: the rounded V2 silhouette still reads as a painted biological shark. Preserve this record as history; the current candidate is the [hard-surface redesign](mechanical_hardsurface_revision.md).

## Scope and baseline

The user requests a local checkpoint, then a complete redesign because the current Mechanical Shark still looks artificial. Checkpoint `6b7cb70c9499327accd3d8a2feb4c3478106886f` preserves the previous four player candidates, shark motion and organic shading. It is a rollback checkpoint, not final acceptance of the Mechanical Shark. No push or main release is authorized. The current AI agent works alone on `art/mechanical-hf-redraw` and keeps the new redesign uncommitted for individual review.

Preserve other creatures, the original preview processes, all archives and canceled worktrees. Preserve lengths, movement, armor resistance,20-health/20-stamina torpedo payment,2-second cooldown, targeting, damage, feeding and existing muzzle/intake contracts. No personal Skill update.

## Design target

Use a completely new original reference and actual Hugging Face exported mesh. Keep the user's blue-led palette: a deep cobalt/navy structural shell, clearly lighter sky-blue armor, satin titanium edges and graphite recesses. The silhouette must read as a powerful engineered shark/submersible, with clean broad surfaces, visible plate thickness, protected tail-drive joints, rooted articulated hydrofoils and compact integrated waterjets. Keep cyan accents limited to sensors and energy apertures; they must not conceal structure.

Inspect the real exported mesh in neutral clay as well as generated materials. The previous surface was too soft and uneven, while added caps/conduits made it busy. More painted seams or inflated glow cannot substitute for coherent machined geometry. Reject or correct baked highlight noise, thin/doubled shells, drifting fin roots and a crooked neutral tail before integration. Do not claim the reference image proves the final model.

Use the shared Guide/world factory and one existing animation clock. Keep a stable forward hull, continuous posterior lateral propulsion, a whole supported caudal fan, properly rooted pectoral cruise/turn trim and rearward sprint sweep. Firing and feed anchors must remain on the posed model. Match old/new cameras and actual water lighting; also inspect normal follow-camera travel, repeated Guide/start/pause/Home and failure fallbacks.

## Production and quota

Evidence is retained under ignored `.local/mechanical_redesign_20261019/`. Current preflight confirms Pro,2254.607715 included seconds remaining, zero overage and a running `microsoft/TRELLIS.2` Space at revision `ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d` (MIT metadata). The original generated reference is the only uploaded input. Generation and GLB export are separate quota-consuming stages. Stop before included allowance exhaustion and recheck actual reset before another attempt; do not top up or use another identity. See [official quota behavior](https://huggingface.co/docs/hub/spaces-zerogpu#usage-tiers). Keep private session/output URLs and credentials out of shared documents.

Status: the new exported mesh is integrated and technically verified. User design acceptance is pending; the implementation and evidence follow below.

## Completed candidate

One new reference/inference/export produced the actual mesh (raw SHA256 `d85fee18cc24f8e76cb14b268de98b5177e9aa805eaa1ad94a739f2ae3a5f6e0`). The export initially had a third hanging front fin and a laterally bent tail. The offline converter straightens the measured tail centerline with normal correction, clips and mirrors the complete side across that corrected centerline, and slightly narrows the outer pectorals to preserve the existing full-motion envelope. This removes the extra appendage without opening a hole or hiding it with light. Source GLB, material/clay views, intermediate files and the converter remain auditable.

The new shared hull contains real armor seams, gill guards and tail couplers. Runtime no longer overlays the previous armor-cap/conduit kit. Two small waterjet housings with independent rotors, fin-root bearings and recessed sensors complete it. The previous assets remain in the repository for rollback but are absent from this build's runtime imports. The seven-bone rig is fitted to this mesh's actual chest-fin roots and raised posterior centerline, with narrow blending at tail couplers and one terminal support for the whole caudal fin. Existing shark phase/trim/sprint behavior and gameplay anchors remain intact.

Two shared1024² textures supply restrained navy/sky-blue metal and satin surface response. A roughness floor avoids hard mirror highlights. Failed/aborted color or surface loading releases partial textures and leaves an opaque complete blue model. The sprint jets now fade at their sides and along their length instead of showing hard striped edges; sensors and launch flash stay small. No new lights, postprocessing pass, independent animation loop or ability behavior is added. English/Chinese Guide appearance text matches the new model.

The final provider receipt records2229.800882 included seconds remaining and zero overage:24.806833 seconds consumed by this new generation/export. This is a receipt at the recorded request time, not a promise about future quota. Recheck before another request.

## Fresh verification and cost

Evidence is `.local/mechanical_redesign_20261019/`:

- `tests_full.log`:1,323/1,323 pass after the model, rig, hardware, material and bilingual copy integration. After the final jet-edge shader adjustment, `tests_final_focused.log`:37/37 mechanical, aiming and player-motion checks pass. Formatting and production build pass; the existing large-JS-chunk warning remains.
- `review.json` and `views/`: matched checkpoint/new Guide cameras and lights, both sides/front/underside, cruise/sprint/turn/pitch/release; native gameplay in shallow/deep water, real firing payment/flash, pause and Home, English desktop/Chinese390px. The geometric regressions cover actual skinned vertices at3/15/30m, centered tail cross-sections, whole-fan preservation, moving fins, UV-seam weights, unchanged muzzle/intake behavior and independent instances.
- `film.json`, `mechanical_redesign.mp4`:31-second native-model comparison. The ordinary Guide loop is stopped before a single controlled inspection loop. The video labels its fixed-position inspection scope; it is not a claim of world travel. Native follow-camera travel and world screenshots are recorded separately in the review. Final H264 frames were decoded and inspected.
- `lifecycle.json`:four Guide/start/sprint/fire/pause/Home cycles retain candidate geometry/texture/model identities and independent Guide/world skeletons. Guide memory remains13 geometries/7 textures; the populated world's ecological cache warms342→386→397→397 geometries and201→214→216→216 textures. Both color-failure and surface-failure cases remain usable without partial material state.
- `populated_resources.json`:in the same frozen Hawaii scene with517 entities, composed render calls83→79 and triangles323,240→322,524. This is a render-count comparison, not an FPS, thermal or power measurement.

| Per-character resource              | Checkpoint | New design |
| ----------------------------------- | ---------: | ---------: |
| Meshes including dormant effects    |         16 |         14 |
| Triangles including dormant effects |     45,966 |     45,608 |
| Shared geometry objects             |         13 |          9 |
| Materials                           |          9 |          8 |
| Main skin vertices                  |     52,616 |     49,081 |
| Mechanical surface textures         |          0 |   2 ×1024² |

The two new WebP files total482,608 bytes. JS shrinks from6,243,616 to6,110,209 bytes; locally recompressed gzip9 is2,721,303→2,632,207 bytes. Therefore this is a visual redesign with approximately393.5kB extra compressed transfer, not an overall resource reduction. Two RGBA8 mipmapped textures can add about10.67MiB per WebGL context when uploaded (Guide and world have separate contexts), despite sharing JavaScript texture objects. Existing accepted rendering/quality settings are preserved. No physical-phone or M4 heat claim is made.

## Delivery and recovery

The existing restricted preview is updated at `https://saver-recorded-digit-could.trycloudflare.com/`, entry `index-BvyGOIWI.js`. `public/report.json` records actual public English desktop/Chinese390px touch-emulated Guide, start, sprint/skill, pause/Home and same-address refresh, with zero browser errors and no production debug hook. `artifacts.json` verifies all17 current runtime files byte-for-byte against local build and both served origins;11 private/source paths per origin remain denied.

Original process identities remain DEV35213, restricted server35216, awake35218 and tunnel35419. Rebuild with `python3 .local/mini_preview_20261007/manage.py rebuild`; inspect with `status`; stop only with separately needed authorization using the existing manager's scoped `stop` command. The rebuild retains prior runtime files for open clients and archives the previous served directory. No service is restarted or replaced.

Checkpoint `6b7cb70` is local only. This complete redesign remains uncommitted on `art/mechanical-hf-redraw`, awaiting the user's design review; no push, main release, version bump or personal Skill update. Final source/build fingerprints and scope audit accompany the local evidence. Other creatures, gameplay and all historical worktrees remain unchanged.
