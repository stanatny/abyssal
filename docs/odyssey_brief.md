# Odyssean Sea production brief

## Scope and authority

Build an eighth underwater region, `odyssey`, from main `25d463e` / v0.10.2 on `feature/odyssey`. The user requests western myth, mermaids, Naga and at least two entirely new representative lords. Development and a restricted candidate preview are authorized; no commit, push, merge or formal release is authorized. Existing services and all seven accepted regions remain intact.

## Identity, scale and routes

**Odyssean Sea / 奥德赛迷航海域** is an amber-sunlit Mediterranean myth archipelago above a blue, increasingly mysterious underwater passage. White limestone escarpments, rose-red coral, seagrass, amphora fields, bronze relief gateways and a broken ancient galley distinguish it from Atlantis's inhabited city. No modern vessels, humans, Earth fish stock or flying mythology creatures spawn. All ordinary regional life is a new fantasy design.

World: x -300..300, z -1150..140, surface 4, bottom at most 740 world units; display depth remains ×4. Juvenile starts at (0,-18,75), standard 3 m. Nursery (z > -150) is safe and rich. Progress along a broad central, gently bending descent: Nereid Gardens around z -280, Amphora Passage z -500, the broken-mast shelf near (120,-230,-405), Scylla Strait near (-110,-380,-690), Charybdis Basin near (115,-575,-1010). Side routes permit retreat, large feeding and cover. Critical passages have >=45 m clear width, grown turns >=65 m; architecture is sparse, not another city. A 90 m galley wreck has open ribs and a broken side; solids and collisions agree.

## Roster and shared rules

Twenty-one ordinary kinds, all category `mythic`, with specific distinct silhouettes:

| Kind           | Name                              | Length / role           | Morphology                                                    |
| -------------- | --------------------------------- | ----------------------- | ------------------------------------------------------------- |
| ambrosia_sprat | 琥珀灵鱼 / Ambrosia Sprat         | 0.55 m nursery school   | fork-tail, raised dorsal sail, seed-shaped amber body         |
| moon_scallop   | 月纹扇贝 / Moon Scallop           | 0.8 m nursery school    | ribbed bivalve, opening mantle and scalloped shell            |
| lyre_ray       | 琴翼鳐 / Lyre Ray                 | 1.5 m nursery school    | broad lyre-shaped wings, trailing double ribbons              |
| pearl_seahorse | 珠冠海马 / Pearl-crowned Seahorse | 2.4 m resident          | upright curled tail, long tubular snout, crown                |
| nereid         | 珊瑚美人鱼 / Coral Mermaid        | 4 m loose residents     | humanoid shoulders/arms/hair, articulated scaled tail         |
| hippocampus    | 海神马 / Hippocampus              | 6 m school              | equine head/forelegs, coiled finned hindbody                  |
| triton_guard   | 海螺卫士 / Triton Guard           | 8 m predator            | broad humanoid torso, shell armor, long muscular tail         |
| siren_eel      | 塞壬鳍妖 / Siren Finweaver        | 10 m predator           | elongated eel body, humanoid mask, large folded fin mantle    |
| naga_huntress  | 潮冠娜迦 / Tide-crowned Naga      | 13 m predator           | cobra hood, humanoid upper body/arms and long serpentine tail |
| ketos          | 刻托海兽 / Ketos                  | 17 m predator           | lionlike toothy head, scaly trunk, paired flippers            |
| bronze_turtle  | 青铜巨龟 / Bronze Bastion Turtle  | 18 m grazer             | broad layered shell, paddle limbs and blunt beaked head       |
| abyss_lamprey  | 冥河环口兽 / Styx Ringmaw         | 22 m predator           | slender cylindrical body, deep circular toothed mouth         |
| oracle_whale   | 神谕巨鲸 / Oracle Whale           | 24 m independent grazer | vaulted baleen jaw, heavy chest, flukes and crest             |
| ceto_serpent   | 暗潮海蛇 / Ceto Serpent           | 31 m apex predator      | long undulating ridged body, crested head, webbed forefins    |

| iris_cuttlefish | 虹纹乌贼 / Iris Cuttlefish | 1.1 m small meals | oval mantle, continuously rippling side fins and ten arms/tentacles |
| amphora_hermit | 陶壶寄居蟹 / Amphora Hermit | 2.2 m resident | ancient pot refuge, jointed legs and unequal pincers |
| aegean_jelly | 爱琴灯水母 / Aegean Lantern Jelly | 2.6 m small meals | pulsing bell, radial canals and oral/tentacle arms |
| silver_pipefish | 银叶海龙 / Silverleaf Pipefish | 4.5 m resident | tubular snout, slender ring armor and attached leaf lobes |
| aegis_sturgeon | 盾鳞鲟兽 / Aegis Sturgeon | 9 m hunter | shovel snout, four barbels, five scute rows and asymmetrical tail |
| thalassa_manta | 潮歌巨鳐 / Thalassa Manta | 16 m independent grazer | wide flexing wings, cephalic lobes and slender tail |
| cerulean_hound | 碧浪海犬 / Cerulean Sea Hound | 21 m hunter | muscular pinniped trunk, whiskered muzzle and four flippers |

Small and medium feeding profiles span the route; substantial independent meals around all three lord outskirts support late healing without dense giant schools. Shared nursery, nutrition, hunger, retaliation, respawn and character rules remain. Current inventory is 269 ordinary individuals across the 21 kinds, plus three lords and one rare. The reviewed regional density override leaves other maps at their accepted pipeline defaults. New unique rare `golden_argonaut` / 金帆船蛸 uses the existing one-per-round evasive rare behavior and 150 caps; it hides in randomized outer amphora/reef habitats.

Lords: **Scylla / 六首噬礁者 · 斯库拉**, 54 m, six continuously curving necks with menacing toothy heads and twelve foot/flipper appendages; six sequential locked water-breath shots with visible windup and finite recovery. **Charybdis / 吞潮主宰 · 卡律布狄斯**, 60 m, living annular armored maw with inward teeth, skirt fins and spiral gill folds; a frontal intake cone followed by a locked travelling tidewall. It has no borrowed Kraken arms/grip. **Karkinos / 潮怒巨蟹 · 卡尔基诺斯**, 52 m, eight jointed legs and unequal claws; twin frontal pinch sectors and three bottom-hugging pressure lanes. All three use 25 m eligibility, three separated valid hits and once-only defeat. Win at 30 m after defeating all three. Skill names, effects and counters must match runtime.

See [the current refinement](odyssey_refinement.md) for surface state, humanoid anatomy, stock and the distinct combat contract.

## Art / resource contracts and ownership

Codex owns integration, configuration/ecology, combat rules, Guide/localization, lifecycle, tests, preview and release boundaries. Bounded art contributors own only explicitly named new modules, never shared source. No staging/commit/push or replacing services by contributors.

- Creature contract: `ODYSSEY_CREATURE_KINDS`, `buildOdysseyCreature(kind,root,motions)` in `src/creature_odyssey.js` with only `creature_odyssey_*` helpers. Normalized near-unit length, -Z travel/head and Y-up. Real eyes/mouth anchors, continuous volume, explicit articulation and stable root. Six Scylla `mouthAnchors` in actual head order; ordinary mouth anchors where useful. Shared immutable buffers/materials, instance-owned bones. Reuse accepted anatomy helpers; separate root motion from deformation.
- Environment: `createOdysseyOcean`, `createOdysseyOceanAsync` and `createOdysseyOceanSteps(parent)` in `src/odyssey_ocean.js`, helpers `odyssey_environment_*`; return `{root,colliders,heightAt,waterHeightAt,update,dispose}`. Yield real batches through existing scene preparation, authoritative `odysseySeabedHeight` from owner's config. No self-owned RAF, no per-frame geometry creation. Surface is part of this factory; shared surface physics still applies and generic fleet/birds must be disabled by owner. Owned resources dispose idempotently; placements fit full footprints.
- Music: `OdysseyMusic` / `ODYSSEY_SCORE` in `src/music_odyssey.js` conforms to `AmazonMusic` bus/reset/update/schedule interface; owner alone edits audio routing. Modal lyre-like plucks, warm low strings and restrained airy tones; no harsh noise layer. Separate chase pulse and deeper lord arrangement, actual pursuit triggers, smooth exit. Evidence via actual graph capture; signal checks do not prove listening quality.

## Sources and adaptation

- [Homer, Odyssey book XII, Samuel Butler translation](https://www.gutenberg.org/files/1727/1727-h/1727-h.htm#chap12): Scylla's six long necks, twelve feet and toothed heads; Charybdis swallows and ejects the sea. Mortal, defeatable underwater encounters and their timings are gameplay adaptations.
- [Metropolitan Museum, Greek ketos vase](https://www.metmuseum.org/art/collection/search/258449): lionlike head, scales, flippers and prominent teeth.
- [Metropolitan Museum, Naga attendant](https://www.metmuseum.org/art/collection/search/38241): serpent deity with cobra hoods, associated with water in South Asian traditions. Naga is an intentional cross-mythology visitor, not attributed to Homer.
- Mermaids, creature names beyond those sources, temple fragments, materials and tunes are new interpretations, not movie asset copies. Do not use modern-film likenesses or player-facing authorship notices. Sources remain in development documents.

## Acceptance

Compare creature structure to accepted v0.10.2 shoals/hunters/lords; distinct silhouettes and attached eyes/limbs through full cycles, Guide and populated world, not a recolor. Surface, safe feeding, medium passage, wreck and all three boss habitats need actual desktop and 390/320 views. Verify all four characters, native pursuit/escape/three-hit defeat, actual meals/normal respawn, pause/home/restart, all-region isolation, bilingual Guide and objectives, loading failure rollback and warm resource plateau. Record headed populated High/Smooth frame costs serially; preserve close art/food/collision. Physical-phone heat and natural full-round pacing remain explicitly untested unless actually measured. Initial evidence remains in ignored `.local/odyssey_review/`; current follow-up evidence goes in `.local/odyssey_revision/`, with concise findings in English verification/HANDOFF.

## Current anatomy/roster follow-up

Read [the new review](odyssey_roster_revision.md). Its 21-kind roster and terrain-fitted close-sweeping Karkinos supersede the preceding 14-kind candidate. New evidence is isolated in `.local/odyssey_roster_review/`; historical measurements in older reports are not new baselines.
