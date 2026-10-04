# Continuous tentacles and guardian combat review

## Scope and publication state

Work continues independently on `fix/penglai-ground-navigation`. The accepted ground-navigation, nine-body-wave and large-prey-distribution candidate was locally committed as `4372534` at the user's request. This subsequent tentacle/combat revision remains uncommitted. No push, merge or formal publication is authorized; published Pages stays v0.10.1.

## Anatomy and motion

The shared world/Guide factories now continuously deform eight Kraken arms, eight octopus arms, cuttlefish's eight arms and two feeding tentacles, eight Crown Filterer arms, six branched Abyss Weaver arms and eight Lumen Stalker coils. Skin, suckers and attached relief share the same weights. Fixed roots, independent instance skeletons, restrained phase differences and traveling distal bends replace rigid appendage rotation. The playable Giant Squid already has continuous eight-arm/two-tentacle animation: retain its accepted mantle-first swimming, jet response and capture rules. The inspection covers it explicitly rather than flipping its direction again.

Kraken retains its configured 48 m longitudinal scale and eight muscular arms. Returning arms extend much farther relative to the mantle; thin tips, paired suckers and a recessed central mouth with 44 inward-facing teeth distinguish the silhouette. The mantle front is open behind the mouth rather than sealing its throat. Attack curl eases inward; the anatomical mantle anchor governs flank direction despite the longer arm envelope. Actual moving skin, not an encompassing invisible sphere, remains the contact surface. Changes to visible Kraken geometry intentionally change that surface; the shared 25 m eligibility and three valid attacks remain.

The new shared helper owns instance bone textures and reuses cached surfaces/materials. The existing population/Guide caches remain bounded by their current lifecycle. Own skeleton disposal is idempotent and does not release another instance or shared geometry. Padded bone-chain bounds provide broad rejection. Cached 64-triangle blocks retain all relevant surface-distance and bidirectional interior-ray tests; weighted bone-local boxes conservatively cover their posed vertices. Exact skin triangles still establish contact, and empty water between arms remains empty. A microscopic 0.000001 m allowance handles matrix rounding.

## Kraken: Abyss Vortex · Coiling Maw

- A 2.3-second warning predicts a route and shows the vortex core. The attack lasts 6 seconds; recovery lasts 4 seconds.
- Kraken approaches the fixed core through the existing terrain-aware movement. The vortex pulls toward its center; 0.55 seconds inside the 14 m core, within 22 m of the actual mouth and without solid cover, starts a grip.
- A grip leaves 1.5 seconds before one 60-point base bite. Sprinting more than 27 m from the mouth or breaking sight with solid cover interrupts it. Input remains available. Grip pull is 12 m/s rather than stacking with the vortex's 17 m/s pull, so even the 32 m/s ordinary character sprint has a viable outward escape. A completed or escaped grip cannot repeat within that attack.
- No overlapping generic touch bite is added during the vortex phase. Damage still follows shared defense/invulnerability rules. Recovery exposes the same flank counterplay; ordinary hunting contact retains its existing behavior.

This is an original gameplay sequence, not a claim that historical folklore specifies a toothed mouth or these mechanics.

## Azure Dragon: Dragon Breath of the Azure Sea

The dragon's former charge is replaced by a water technique, named **沧溟龙息** in Chinese. A 2.2-second warning locks its heading. A 1.6-second release streams from the animated anatomical snout for at most 145 m, with a 7 m corridor radius and existing body padding. The direction does not home after locking. The same breath deals at most one 35-point base hit; solids clip the visible path and block damage. Sideways or vertical evasion and mountain cover provide counterplay, followed by 3.8 seconds of recovery. Balanced speed, east-mountain territory, traveling body waves and ward objective remain.

The pooled effect uses restrained cyan ripples, flow strips and spray without extra lights or animation loops. Width stays radial when scaling range; near-camera surfaces fade instead of obscuring retreat routes. A separate unrelated circular warning is omitted for this linear technique.

## Sources and interpretation

- [Natural History Museum: sea-monster imagery](https://www.nhm.ac.uk/discover/sea-monsters-inspiration-serpents-mermaids-the-kraken.html) documents Scandinavian Kraken imagery and Montfort's ship-grasping arms. This supports the long-arm silhouette, not a unique canonical anatomy.
- [Royal Collection Trust: Pontoppidan's Natural History of Norway](https://www.rct.uk/collection/stories/the-libraries-of-george-iii/the-natural-history-of-norway-in-two-parts-bound-together/translated-from-the-danish-original-of-the) identifies the historical natural-history volume containing Kraken accounts.
- [The Met: Daoism and Daoist Art](https://www.metmuseum.org/ko/essays/daoism-and-daoist-art) and [Beneficent Rain](https://www.metmuseum.org/art/collection/search/40454) connect Chinese dragons with rain/cloud imagery. The water-breath adaptation does not equate the eastern Four Symbol's traditional wood association with the water phase.
- [Marine Institute: Learning about Squid](https://www.marine.ie/Home/sites/default/files/MIFiles/Docs/EducationSupport/EXPLORERS_CSI%20Learning%20about%20Squid%20101.pdf?language=ga) supports the eight arms/two tentacles and jet-propulsion distinction. Alien creatures remain fictional.

No external image or model is copied. Player-facing biographies avoid film references and authorship declarations; internal provenance remains here.

## Verification and cost

Raw evidence is ignored under `.local/tentacle_combat_review/`. Shared-factory phase atlases cover eight relevant kinds across five phases/views, including grip; synthetic gallery light is explicitly distinct from native gameplay. The factories retain existing octopus, cuttlefish and alien triangle totals. Kraken rises from 27,828 to 34,396 triangles, within the existing 35,000 triangle guard, while mesh count drops from 20 to 15. Skinning adds instance textures: the eight-model gallery has 62 uploaded textures versus 14 before, with 236 versus 246 geometry resources. This is an animation-quality cost, not a claimed memory reduction.

Controlled native battles use the real game loop, input, terrain and damage. Holding inside the grip produces exactly 60 base damage; actual Space sprint escapes before the delayed bite without damage, including all four playable characters in the sampled full-stamina setup. Pause freezes phase, skeleton pose and round time. Azure's real snout releases water and a stationary exposed player receives one 35-point hit. Rule/integration tests cover sideways evasion, solid cover, recovery, real moving-arm contact, gaps, instance ownership and contact equivalence to unfiltered triangles under nontrivial transforms. Bilingual separate Guide cards, current biographies and narrow touch warnings are checked against implemented values.

Serial Europa samples use the same seeded 25 m Orca, position `[-90,-470,-580]`, Chrome 1440×900/DPR1 on Apple M2 Pro, High/Smooth, 120 measured frames, baseline → candidate → baseline. An initial candidate exposed a real near-lord skin-contact CPU regression (about 9.92 ms encounter update); local triangle filtering reduced this to about 0.61 ms in the follow-up. Final sample details and lifecycle/compiled receipts are recorded in [verification](verification.md). Display-capped desktop FPS is not proof of equal GPU cost, low memory or phone heat acceptance.

Twenty serial Atlantis/Amazon/Europa/Penglai switches show stable late shader counts for these routes, while first-visible cached geometry/texture uploads continue to vary slightly (e.g. final Europa 950 geometries / 585 textures; Penglai 939 / 586). This is not a demonstrated zero-growth plateau or a low-memory claim. The helper creates no meshes, geometry or skeletons per update; instance disposal and shared-buffer isolation are separately verified. Extend fixed-visibility long-session sampling if memory growth is reported.

Physical-phone thermal/control behavior, subjective animation and natural full-round guardian difficulty remain user-review limits. No full-round or actual device acceptance is claimed. Rollback retains the exact `4372534` baseline snapshot and the previous served build; the new helper and guardian changes can be removed without discarding that checkpoint.
