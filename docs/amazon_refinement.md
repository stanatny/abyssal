# Amazon creature and underwater-space refinement

## Scope and status

The user rejected the first pass as too simple. All **20 ordinary kinds and two lords** now use rebuilt anatomy and surface treatment. The rainforest retains its surface identity, while the island's underside opens into a navigable root vault. The refinement was developed in `feature/amazon` from `937afa728eafa69fb687158480e904fa8567b692`. On October 3, the user accepted it and authorized committing, pushing and main integration as v0.9.0, plus generalized lessons in the personal UI Skill. This supersedes the development-only restriction for this checkpoint. The exact Pages deployment and production checks are tracked in [release verification](verification.md).

Earlier evidence in [the first-pass record](amazon_verification.md) is historical and does not establish the new candidate's quality. These are original realtime assets, not scanned animals. Player visual preference, physical-device performance and unassisted whole-round balance remain review items.

## Anatomy and motion

Fish families have separate compressed disks, hatchet bellies, flattened catfish heads, long scaled gulpers and narrow eel silhouettes. Rebuilt parts include gill covers, fitted eyes, hinged jaws, barbels, fin rays and dorsal/ventral markings. Dorsal/anal fin roots sample the same body surface and reuse each fish's own skeleton; the caudal fin follows the moving tail rather than floating independently. Small catfish armor is formed in its skin instead of being a row of decorative balls.

Reptiles have elongated muscular bodies, hinged jaws, embedded orbital ridges, keeled osteoderms, articulated legs, webbed digits and curved teeth. Turtle palms join their legs and webbing; marginal scutes are recessed into the shell. Anaconda and Titanoboa use thin, truly long bodies with restrained delayed waves and staggered oval spots, rather than a thick striped worm that folds into a short silhouette. Yacumama adds a broad bony head, recurved fangs, scars and a dark oral cavity. Rootjaw has a coherent armored body, long skull, interlocking teeth, muscular tongue and weathered bone crown.

The [source record](amazon_sources.md) identifies primary museum, research and aquarium observations and distinguishes extinct reconstructions, introduced animals and original fantasy creatures. No source image, third-party texture or model is bundled. Existing biological/game lengths, nutrition, speed and lord combat remain unchanged. Guide and world use the same factories. Static geometry and materials are cached; bones, jaws, feet and animation phase remain independent per instance.

Model-only costs are higher than the rejected first pass. Representative final costs are Neon Tetra 11,212 triangles / 10 draws; Amazon Discus 13,824 / 10; Black Caiman 58,512 / 12; Yacumama 24,092 / 4; Rootjaw 62,784 / 12. These are asset counts, not whole-frame costs or a performance improvement claim.

## Under-island terrain and food

`amazonSurfaceHeight` retains the rainforest terrain. `amazonSeabedHeight` is the actual lowest floor beneath its eroded cap. `amazonIslandCeiling` drives the rendered underside and conservative roof contacts. Outer banks stay solid; the cap has its own colliders instead of an impermeable column through the water. The large sediment supports reach floor and roof; this is explicit fantasy geology rather than a reconstruction of Amazon karst.

Three crossings at z=-330/-650/-940 near y=-62 connect the arms and appear on the radar. Fallen wood, hanging roots, river stones, water plants and mussel beds enrich the bed. Stones use rotated collision envelopes; plants and shells sample their actual placement's floor. Logs/supports preserve the declared adult passages. Surface trees still use the separate land sampler.

Two of six existing schools in each of three river-fish families move into the vault: Silver Arowana, Arapaima and Redtail Catfish. All six profiles remain present, so actual ordinary stock stays **411**. Native habitat placement/retirement/respawn handles the new schools. The first four profiles retain food in the existing arms; the nursery is unchanged. This move is controlled coverage, not proof that all new cavern volume has equal food density.

All earlier regions, four protagonists, shared hunger, meal economy, rewards, character skills, lord gates/durability and endings are preserved. Bilingual Guide/world navigation explains the root vault instead of claiming that the entire island is impassable underwater. There is no new hazard or reward for the decorative riverbed objects.

## Fresh verification

Raw reports and screenshots live in ignored `.local/amazon_redraw/`.

- **789 unit tests** and formatting pass. Nine focused Amazon tests cover real spawn/replacement sampling, winding/end connections, cap solidity, all three swept crossings in both directions at 3/16/30 m, finite geometry and independent deep animation transforms, cancellation/disposal and objective rules. Raycasts compare the actual rendered floor/roof with gameplay samplers at the three crossings; differences are below 0.8/0.3 world units, with over 60 units of water clearance.
- Native gameplay checks retain six isolated populations and all 20 Amazon kinds / 411 animals. All four adult characters move through both river arms, feed, heal and return prey to a legal habitat. Separate flank contacts defeat each lord in exactly three hits; first defeat does not win, both plus 30 m do.
- **Eight uninterrupted real-loop vault traversals**: all four 30 m characters cross z=-650 in both directions, over 350 world units per crossing. Zero collision contacts/stuck frames; depth stays y=-62. Starting positions, size and invulnerability are controlled fixtures. No per-frame position correction or collision bypass is used. Three actual vault-school contact meals heal the player and respawn inside the island's underwater habitat.
- **24 actual six-region switches** reach identical geometry/texture/program counts in the third and fourth cycles. A real electric eel warns, pursues, triggers its combat score, discharges and damages once. Pause freezes active time and suspends the audio context; home clears voices and arcs. English desktop, Chinese portrait and English narrow-landscape views do not overflow horizontally.
- Actual Guide inspection covers all 22 models from side/front/belly and lord head close-ups, plus nursery, waterline, riverbed, vault entrance/interior and both lord pools. The new body/fin and turtle-foot connections are inspected in the running renderer, not inferred from polygon counts.
- Nine representative anatomy families have chronological motion captures from the native Guide render loop, with changing finite deep transforms across at least four seconds. Snake motion remains elongated, fish fins follow their own body skeleton, and reptile feet and jaws stay connected. This is controlled animation inspection, not subjective player approval.

An intermediate harness reloaded during a Vite update and lost its route fixture; it is not a gameplay collision failure. An earlier school edit accidentally retained four rather than six profiles and produced 375 animals. The stock assertion exposed it; the source now preserves six profiles and subsequent unit/native checks restore 411. These discarded results remain separate from the passing final evidence.

## Measured cost and limits

Serial visible Chrome sampling uses M2 Pro, macOS 26.6.2, Chrome 154, 1440×900, DPR 1, seeded ecology, a 25 m Orca and 120 active frames after warm-up. The rejected baseline is an isolated local source snapshot. Initial preparation is separate from these steady-frame measurements; no other browser benchmark runs concurrently.

| High-quality view                | Mean FPS | Frame p95 | Draws | Triangles |
| -------------------------------- | -------: | --------: | ----: | --------: |
| Original winding bend            |    60.65 |   18.6 ms |   120 | 1,097,036 |
| Final winding bend               |    60.68 |   18.5 ms |   181 | 1,563,134 |
| Original bend repeated afterward |    60.77 |   19.0 ms |   120 | 1,097,036 |
| Final nursery                    |    60.43 |   18.5 ms | 1,275 | 2,308,094 |
| Final root vault                 |    60.44 |   19.0 ms |   176 | 1,043,490 |

The final bend's CPU frame sample is about 4.04 ms versus 3.32 ms in the repeated original, and the final nursery is about 10.08 ms. Smooth samples remain around 60 FPS. The greater geometry/draw cost is real despite the desktop's near-60 FPS cap; this is **not** evidence of unchanged GPU power or phone temperature. The nursery is the heavier visible case and needs physical-device review. Existing spatial batching, cached resources, shared bone state within one fish and GPU plant flow remain bounded; no ecology, simulation or near quality is lowered to mask cost.

## Delivery verification

The reviewed development build and restricted preview were refreshed from the then-uncommitted candidate. Release metadata is subsequently updated to v0.9.0; its rebuilt main artifact is checked separately in the release record. **29 shared browser checks** pass. Each local/public compiled host passes **12 native cases** across all six destinations in English desktop and Chinese narrow-touch layouts: selection, launch, Mechanical Shark firing/cooldown, pause/resume/home and regional Guide navigation. Both hosts have zero page/console errors. English Guide copy has no Chinese leakage; the root-vault name and route advice agree in both languages.

All **226 runtime source fingerprints** match the current worktree, and all **eight built artifact hashes** match the local and public responses. Development state is absent from the compiled game; source, Git and ignored evidence paths return 404. A harmless temporary asset changes from A to B at the same local/public address and is then removed; both removed requests return 404. Current source/process identity, URLs and receipts are recorded only in ignored `.local/amazon_redraw/preview_manifest.json` and the active local preview manifest.

The main JavaScript artifact is 1,758.23 kB / 592.98 kB gzip. The existing build warning about a chunk above 500 kB remains; this task does not claim a startup or bundle-size improvement. Current raw receipts include `all_units_verified.log`, `shared_browser_report.json`, `runtime_verified/browser_report.json`, `traversal_report.json`, `lifecycle/lifecycle_report.json`, `motion/report.json`, `compiled_local_report.json`, `compiled_public_report.json`, `build_verified.log` and `refresh_receipt.json` under the ignored evidence directory. Earlier failed copy assertions and interrupted harness runs remain separate historical logs.

These are the pre-release development receipts; main integration and production-byte checks are recorded separately in [release verification](verification.md). The user accepted the visual/playable candidate. Physical touch/thermal behavior and natural whole-expedition pacing remain unverified beyond that feedback. The accepted methods are retained in project quality/map-production rules without making this map's counts universal targets.
