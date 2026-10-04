import test from "node:test";
import assert from "node:assert/strict";
import { ALL_SPECIES } from "../src/region_ecology.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { SURFACE_BIRDS } from "../src/surface_birds.js";
import { REGIONAL_RARES } from "../src/regional_rare.js";
import {
  getCreatureBackground,
  BACKGROUND_KINDS,
} from "../src/creature_backgrounds.js";
import { t } from "../src/i18n.js";
import { CREATURE_LORE } from "../src/creature_lore.js";
import {
  PENGLAI_LORDS,
  PENGLAI_LORD_DESCRIPTIONS,
} from "../src/penglai_lords.js";
test("every living creature has an individual bilingual introduction with qualified provenance", () => {
  const entries = [
    ...ALL_SPECIES,
    ...BOSS_SPECIES,
    ...SURFACE_BIRDS,
    ...REGIONAL_RARES,
    ...[
      "orca",
      "squid",
      "zombie_shark",
      "mechanical_shark",
      "swimmer",
      "diver",
    ].map((kind) => ({ kind })),
  ];
  const texts = new Set();
  for (const { kind } of entries) {
    const b = getCreatureBackground(kind);
    assert.ok(b, kind);
    assert.ok(b.background.length > 30, kind);
    assert.ok(!texts.has(b.background), kind);
    texts.add(b.background);
    assert.ok(!/[\u3400-\u9fff]/u.test(t(b.background, [], "en")), kind);
    assert.notEqual(t(b.backgroundType, [], "en"), b.backgroundType, kind);
  }
  for (const kind of [
    "abyss_weaver",
    "mayan",
    "mechanical_shark",
    "sword_sage",
    "glass_seed",
  ])
    assert.equal(getCreatureBackground(kind).backgroundType, "原创背景");
  for (const kind of ["megalodon", "ichthyotitan", "titanoboa"])
    assert.equal(getCreatureBackground(kind).backgroundType, "化石复原");
  assert.match(
    getCreatureBackground("saltwater_crocodile").background,
    /并非亚马逊原生/,
  );
  assert.match(getCreatureBackground("kun").background, /庄子/);
});

test("expanded stories retain provenance and every battle skill name appears in its bilingual Guide", () => {
  const expanded = new Set(CREATURE_LORE.map(([kind]) => kind));
  for (const kind of BACKGROUND_KINDS) {
    const type = getCreatureBackground(kind).backgroundType;
    if (["原创背景", "传说与本作改编"].includes(type))
      assert.ok(expanded.has(kind), kind);
  }
  for (const [kind] of CREATURE_LORE) {
    const background = getCreatureBackground(kind);
    assert.ok(background.background.split("\n\n").length >= 2, kind);
    assert.ok(
      t(background.background, [], "en").split("\n\n").length >= 2,
      kind,
    );
    assert.ok(!/木卫二报告|Europa Report/i.test(background.background));
    assert.ok(
      !/木卫二报告|Europa Report/i.test(t(background.background, [], "en")),
    );
  }
  const sage = getCreatureBackground("sword_sage");
  assert.equal(sage.backgroundType, "原创背景");
  assert.match(sage.background, /承霄/);
  assert.match(sage.background, /魔族.*师门/);
  assert.match(sage.background, /承霄剑宗/);
  assert.match(t(sage.background, [], "en"), /Skybearer/);
  for (const species of PENGLAI_LORDS) {
    const guide = PENGLAI_LORD_DESCRIPTIONS[species.kind];
    for (const ability of species.abilityCycle || [species.ability]) {
      const name = species.skillLabels[ability];
      assert.ok(name, `${species.kind}/${ability}`);
      assert.ok(guide.ability.includes(name));
      assert.ok(guide.text.includes(name));
      assert.ok(t(guide.ability, [], "en").includes(t(name, [], "en")));
      assert.ok(t(guide.text, [], "en").includes(t(name, [], "en")));
    }
  }
});
