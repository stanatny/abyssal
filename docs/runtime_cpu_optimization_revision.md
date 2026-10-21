# Runtime CPU optimization — 2026-10-21

The user authorized implementation after accepting local checkpoint `87095f5`.
The current agent worked independently on `art/hawaii-lords-hf-redraw`.
The user subsequently authorized committing and publishing the accepted work
to main on 2026-10-21; see [v0.11.14](release_v0_11_14.md). Candidate receipts
below retain their original dates and scope.

## Changes and boundaries

- Amazon and Odyssey factories reuse deterministic rest-pose normalization by
  kind within their module lifetime. Cache entries contain numbers and geometry
  identifiers, not live creatures, bones, materials or GPU resources. Each
  instance still updates its matrices and receives independent object bounds.
  Transformed factory roots retain the uncached calculation. New bundles create
  fresh caches, so a model redraw cannot inherit a prior release's dimensions.
- Armored Cory is deliberately excluded: its existing builder reshapes shared
  armor vertices on repeated construction. This optimization must not silently
  treat that mutable input as a fixed template or change the accepted builder.
  Its existing appearance behavior is a separate follow-up, not repaired here.
- Static grid cell ranges use six direct scalar computations instead of
  Object.entries/map/fromEntries and their intermediate arrays. Radius expansion,
  height handling, sorting, duplicate entries, independent returned arrays and
  the exact collision solver are unchanged.

No model/texture/audio assets, quality presets, bloom, ecology counts, update
cadence, movement, combat, rewards or bilingual player-facing content change.
The expensive corpse-blast raycast path was inspected but is not changed in
this bounded first pass: its final visible-surface/occlusion semantics require a
separate matched contact-query experiment. The previously observed isolated
shader-link stall is likewise not claimed fixed.

## Measurement method

M6 Mac mini, 32 GiB, Chrome 155.0.8059.85, Node 24.21.0, Three.js 0.180.0.
Headed Chrome runs are serial, without concurrent builds or tests. They use the
loopback development build, desktop 1440×900/DPR2, High quality. The baseline
routes only the three changed factory/grid modules back to their accepted
87095f5 computations, leaving the rest of the source identical. Original files
and route code are preserved with the evidence; unused helper imports in the
routed baseline perform no normalization work.

Four alternating browser sessions perform 12 native region switches each:
Amazon, Odyssey, Penglai and Hawaii, repeated three times. Each region starts,
pauses and returns Home. Across two baseline/two candidate sessions, the median
of the four warm observations per variant is:

| Region  | Warm switch before → candidate | Creature builder CPU before → candidate |
| ------- | ------------------------------ | --------------------------------------- |
| Amazon  | 887.5 → 779.5 ms (12% shorter) | 313.2 → 224.0 ms                        |
| Odyssey | 789.0 → 489.0 ms (38% shorter) | 352.0 → 63.1 ms                         |

First-entry observations also remain separate: Amazon 1292/1260 → 1226/1194ms;
Odyssey 1402/1417 → 1184/1185ms. These are controlled loopback switches, not
network-cold public loading or physical-phone timing. CPU profiles attribute
the main reduction to repeated Box3/skinned-vertex normalization.

A separate browser query experiment uses 6,000 nearby short-sweep queries per
batch, seven repetitions, in two sessions per variant. After two warmups, the
median batches are Atlantis 11.45 → 10.00ms and Mariana 5.35 → 3.80ms. Atlantis
returns 107,607 candidates per batch; this Mariana open-water fixture returns
zero, so its gain describes empty-region lookup, not contact resolution. The
independent mixed-shape comparison uses 6,000 queries around real Mariana
colliders and retains exact candidate arrays, including nonempty results.
A wide-sweep Node microbenchmark shows no meaningful grid throughput gain;
workloads dominated by candidate traversal/sorting are not improved uniformly.

Eight active-play samples (two maps × two variants × two sessions, 300 frames
each, seeded ecology and one initial player placement, no per-frame pinning)
retain matching draw/triangle counts: Atlantis 131/871,862 and Mariana
71/859,390. Profiled frame CPU varies: Atlantis 2.92/3.00 → 3.12/2.28ms;
Mariana 2.40/2.11 → 2.83/3.00ms. This does not establish an overall FPS or
steady-frame CPU improvement. GPU stays approximately 9–10ms, and ordinary
frame intervals stay near 60Hz. A further reversed-order direct-frame timing
check, without the sampling profiler, is recorded separately below.

## Verification and caveats

Fresh 1,498 unit checks pass, including the existing exact collision tests and
four new normalization checks. Frozen accepted Amazon/Odyssey factories retain
their original dispatch/normalization code, importing the unchanged underlying
anatomy modules. Tests compare cold/warm/rebuilt factories for all 46 immutable
kinds: every node matrix/anchor, object-level bounds, sampled actual posed
vertices, independent animation and repeated frozen poses. Armored Cory has a
separate repeated-construction fallback check; transformed roots cannot poison
the identity cache. Model and gameplay input hashes are checked separately.

Early tests are preserved as failed receipts: recomputing skin bounds after
normalization was not the same operation as the accepted factory; returning a
stateful animation clock to zero was not a new instance. The accepted-factory
comparison corrected those oracles and then exposed the real mutable Cory
exception, which is excluded rather than hidden by a looser tolerance.

Neither desktop emulation nor these refresh-capped measurements establish
physical-phone FPS, M4 temperature, power draw, battery life or thermal stability.
The two local changes can be reverted independently; they require no save or
cache-storage migration. Keep accepted assets and the existing loading cache.

Evidence: `.local/runtime_cpu_opt_20261021/`, including frozen baseline sources,
`normalization_final.log`, `full_test.log`, `check.log`, `micro.json`,
`switch_before1/2`, `switch_after1/2`, `active_before1/2`, `active_after1/2`,
`grid_browser.json`, and `frame_direct.json`. Browser screenshots and CPU
profiles retain the staged conditions; old failed receipts are not passes.

## Direct frame timing and delivery

Without the sampling profiler, the reversed candidate/baseline/candidate/baseline
Mariana checks time 600 real game callbacks each. Candidate means are 3.79/3.91ms
and baseline means are 3.94/3.91ms, with corresponding p95 4.6/4.7ms for both.
This does not reproduce the large difference in the coarse sampled CPU stacks,
but neither establishes a material steady-frame gain. Retain the bounded
query/allocation improvement without claiming an FPS or thermal improvement.

The production build and format checks pass. The first public functional run
completed 38 native cases with no JavaScript errors, including all eight maps,
English/Chinese Guide entries and same-address refresh. Its strict aggregate
receipt remains failed: one texture request had a transient connection close,
and pending background textures were aborted when the test closed a page.
A separate urllib artifact pass also hit a TLS EOF; neither failure caused a
service restart or was relabeled as a pass. Follow-up native checks wait for
network idle before closing, and artifact checks use certificate-verified
HTTP/1.1 with bounded retries. Direct `.gz` files retain the existing no-store
policy; immutable caching applies to the logical fingerprinted URLs.

Final follow-up: 32 native public cases pass with zero JavaScript errors or
failed requests, including the two optimized regions, both languages, desktop
and 390px touch emulation, Guide, start/pause/resume/Home and refresh. The first
run already exercised all eight maps; its network failures remain recorded.

All 203 build artifacts exactly match the restricted runtime. Of these, 200
are byte-identical to the archived accepted preview; the three changed artifacts
(index HTML, application JS and its gzip copy) are freshly verified through
public HTTPS. The partial full sweep additionally verified 102 public files,
but did not finish because an unchanged Mechanical Shark data download timed
out and TLS retries failed. Do not describe this as a fresh 203-file public
pass. The fresh native retry and changed-artifact hashes establish this
candidate's delivery; compression negotiation also decodes to the exact new
application bytes. Existing dev/origin/awake/tunnel identities are preserved,
and the old runtime is archived. Formal Pages remains untouched.

Trial: https://saver-recorded-digit-could.trycloudflare.com/ . Refresh normally
to obtain the new HTML and `index-k2c-QeU4.js`; unchanged fingerprinted assets
continue to use the accepted loading cache. User device review remains pending.
