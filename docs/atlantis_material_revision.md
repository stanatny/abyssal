# Atlantis city material and wall-stability revision

Accepted by the user on 2026-10-22 for a local checkpoint. Earlier candidate
labels below retain their historical meaning; follow-up performance work is separate.

Candidate, 2026-10-21–22; current agent only. The user reports low-quality floors
and walls throughout the royal city/underground ruins and flickering at Poseidon's
temple. This extends the unaccepted civic-component batch. HEAD stays `3072 def`;
no commit, push or main/Pages publication is authorized for this follow-up.

## Diagnosis and implementation

The previous architecture reused 512 px canvas bricks, straight cracks and bright
veins even on long columns. Instanced foundations stretched unit-box UVs, while
curved pieces switched projection axes at individual vertices. This made material
scale inconsistent and exposed repeated artificial linework.

Two original generated albedo textures replace that treatment: weathered limestone
ashlar and softly veined ivory marble. They are 1024 px WebP files, 618,950 bytes
combined. Walls, foundations, paving, columns, trim, crypts and the harbor/agora
interiors consume the existing shared Atlantis material table. Bronze has restrained
copper/patina variation; ritual lapis has stone grain instead of a flat blue fill.
World-space triplanar sampling keeps scale consistent on instanced/scaled solids.
Filtered surface luminance supplies small relief and roughness variation; these
are authored game materials, **not scanned PBR maps or newly generated HF meshes**.
The preceding three actual HF civic components, monuments and all creature/player
assets are preserved. No new HF quota was consumed by this material follow-up.

Poseidon's supporting masonry and vault lining contain coplanar overlapping faces.
For example, platform/foundation tops share the temple-floor plane, and back-wall
supports share z=-961 with the vault lining. The baseline box audit found 196
coplanar pairs (including hidden/internal contacts, not 196 separate visible bugs).
The builder now clips axis-aligned masonry skins to the union's exposed rectangles;
later facing layers own coincident exterior patches. It retains original collider
boxes exactly. It does not conceal the problem with transparent covers, global
depth offsets or extra lighting. Rotated roofs, carvings and the open shaft remain.

The existing five-light pool also moved lit lamps immediately when nearest-source
rank changed. Source identity now has 10 m selection hysteresis, a 0.24 s fade-out and
0.36 s fade-in; source changes occur at zero intensity. The five/three High/Smooth
caps and actual lamp anchors remain. Initial loading or a player teleport over 80 m
resets placement; ordinary movement fades. Pause does not advance fades.

## Evidence

Raw evidence: `.local/atlantis_materials_20261021/`. The directory date denotes the
start of work; completion crossed midnight into 2026-10-22.

- `baseline_fingerprints.json`:1,153 source inputs before this follow-up, preserving
  the separate civic candidate. Original source/images are retained alongside it.
- `before/`, `candidate/`, `final/`: matched 1440×900 views at the same positions and
  paused atmosphere state. Diagnostic no-texture/no-light/no-shadow views are private
  inspection fixtures. They do not substitute for live lighting.
- `native/film_final_report.json`: four 10-second live observer-camera shots of temple,
  crypt, avenue and harbor. Normal game lighting, ecology and attacks continue;
  original player positions are staged, invulnerability enabled. Encoded H 264 frames
  were inspected; no previous coplanar striping/blank-wall flashes were observed in
  those views. The Kraken's purple attack effects remain intentionally visible.
- A 30 m character actually descends 53.97 m and returns 53.98 m through the central well,
  with normal follow camera/motion. No per-frame position correction. Pause/Home pass.
- Three Hawaii↔Atlantis cycles reuse the same two surface textures and four sampled
  material identities. They are bounded module caches, matching existing shared city
  kit lifetime, rather than resources promised to unload on every switch.
- `fallback_report.json`: both downloads deliberately fail; materials keep map=null
  and vertex-color fallback. Normal online recovery loads both textures. No white
  uninitialized texture is assigned. Native rendering reports no browser errors.
- New union-surface rays verify one exposed platform/back-wall skin and an open well;
  lighting regression verifies stable equal-distance selection, zero-intensity moves,
  fixed pool size and frozen pause.25 focused tests and all 1,544 tests pass.
- Full scene colliders, obstacles, building records and landmarks match the immediate
  baseline exactly. Frozen published-layout oracle remains intact. Its geometry
  exemption adds only the Poseidon merged skin; two known shared material roughness
  values are normalized for the old visual comparison. The old outer-lining reverse
  ray began inside a support solid: it now checks both water-facing sides of the
  combined foundation/lining, not an intentionally removed internal face.

## Cost and limits

No additional light, per-frame geometry or draw batch is introduced by the surface
materials. Two 1024 px RGBA mip chains are approximately 10.67 MiB GPU storage, replacing
approximately 2.67 MiB of old 512 px stone maps; actual driver allocation may differ.
Each surface fragment samples three projections, derives relief from those samples
and shares the same texture for all consumers. The preceding HF batch's cost remains
separate. Compared with that batch's recorded 5,410,314 city triangles, this skin
revision has 5,411,890 (+1,576; about 0.029%) and still 1,030 mesh batches. The synthetic
old-factory contract fixture mixes current shared caches and is used for contracts,
not the authoritative old render-cost count.

`material_cost.json` is a serial A/B/A **material-only** comparison on current geometry,
a paused populated 1440×900 scene at pixel ratio 1, native Chrome on this mini.45 GPU
samples per pass: temple medians 9.60/8.97/9.20 ms; crypt 9.47/7.98/9.09 ms. Draw counts
remain 242/178 respectively. This short probe shows no observed material-cost regression
in those views; it does not establish a general performance gain, physical-phone
FPS or thermal improvement. Live-camera media, texture fallback and browser checks
are complementary evidence. Visual acceptance remains with the user.

## Provenance and delivery

Original albedos were generated with the built-in ImageGen tool for this task;
source PNGs remain in the evidence directory and the tool's generated-image folder.
`cwebp -q 88 -resize 1024 1024` creates the two bundled assets; no third-party texture
or undocumented HF output is claimed. Prompt requirements were flat diffuse neutral
lighting, seamless pale weathered stone, restrained mineral patina, no symbols,
black outlines or dramatic baked lighting. Final asset hashes are in the preview
fingerprint receipt. This extends the existing UI Visual Polish/Map Production
workflow; no personal Skill was modified.

Restricted same-origin preview, final asset hashes, production checks and actual
message IDs are recorded in this evidence directory's `artifacts.json`,
`public/report.json`, `final_fingerprints.json` and `delivery.json` after delivery.
The existing dev, restricted server, awake and tunnel processes are preserved.
Only index/assets are public; formal main/Pages remainsv 0.11.15/`3 aef 21 e`.

Production verification completed on 2026-10-22: the same restricted preview now
serves `index-I8birVp4.js`. All 256 fresh dist/local/public artifacts match byte for
byte (75,078,980 bytes, including compressed companion files). Eleven source/private
paths are denied on each origin. Native English desktop and Chinese 390px touch
emulation pass Guide/start/ability/pause/Home and same-address reload; both new maps
load and production debug hooks are absent. This is not physical-phone validation.
Only documentation metadata changed after those runtime checks.
