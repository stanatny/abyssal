import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { ATLANTIS_SPECIES } from "../src/atlantis_species.js";
import { ALL_SPECIES, getRegionSpecies } from "../src/region_ecology.js";
import { REGIONS } from "../src/expedition_config.js";
import { regionZone } from "../src/region_appearance.js";
import { setLanguage, t } from "../src/i18n.js";
import { ATLANTIS_EN } from "../src/locales/atlantis_en.js";
import { CATALOG_EN } from "../src/locales/catalog_en.js";
import { UI_EN } from "../src/locales/ui_en.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";

// Node只忽略样式导入；实际图鉴模块和数据构建逻辑照常执行。
const cssHook = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/src/ocean_guide.css"))
      return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { buildOceanCatalog, filterOceanCatalog, groupOceanCatalog } =
  await import("../src/ocean_guide.js");
cssHook.deregister();

const chinese = /[\u3400-\u9fff]/u;
const ordinary = (entries) =>
  entries.filter((entry) =>
    ["shoal", "hunter", "ancient", "invertebrate"].includes(entry.category),
  );
const kinds = (entries) => entries.map((entry) => entry.kind).sort();
const placeholders = (value) =>
  [...value.matchAll(/\{\d+\}/g)].map(([placeholder]) => placeholder).sort();

test("the guide's full and regional catalogs agree with actual species and lord rosters", () => {
  const catalog = buildOceanCatalog();
  assert.equal(catalog.length, 71);
  assert.equal(new Set(catalog.map((entry) => entry.id)).size, catalog.length);
  assert.deepEqual(kinds(ordinary(catalog)), kinds(ALL_SPECIES));
  for (const region of REGIONS.filter((entry) => entry.available)) {
    const visible = filterOceanCatalog(catalog, { regionId: region.id });
    assert.deepEqual(
      kinds(ordinary(visible)),
      kinds(getRegionSpecies(region.id)),
    );
    assert.deepEqual(
      kinds(visible.filter((entry) => entry.category === "lord")),
      [...region.bossKinds].sort(),
    );
    for (const kind of [
      "orca",
      "squid",
      "seagull",
      "swimmer",
      "diver",
      "submarine",
      "torpedo",
    ].filter(
      (kind) =>
        !(
          (region.id === "bermuda" &&
            ["swimmer", "diver", "submarine"].includes(kind)) ||
          (region.id === "mariana" &&
            ["swimmer", "diver", "submarine", "torpedo"].includes(kind))
        ),
    ))
      assert.ok(
        visible.some((entry) => entry.kind === kind),
        `${region.id}: ${kind}`,
      );
  }
  for (const entry of catalog.filter((entry) =>
    ATLANTIS_SPECIES.some((species) => species.kind === entry.kind),
  ))
    assert.deepEqual(entry.regionIds, ["atlantis"]);
  assert.deepEqual(catalog.find((entry) => entry.kind === "kraken").regionIds, [
    "hawaii",
    "atlantis",
    "bermuda",
    "mariana",
  ]);
  assert.deepEqual(
    catalog.find((entry) => entry.kind === "leviathan").regionIds,
    ["hawaii", "bermuda", "mariana"],
  );
});

test("Mariana guide distinguishes its adult start and mandatory first Hydra gate in both languages", () => {
  for (const locale of ["zh-CN", "en"]) {
    setLanguage(locale);
    const catalog = filterOceanCatalog(buildOceanCatalog("mariana"), {
      regionId: "mariana",
    });
    for (const id of ["orca", "squid"]) {
      const player = catalog.find((e) => e.kind === id);
      assert.equal(player.length, 15);
      assert.match(player.size, /15/);
    }
    const hydra = catalog.find((e) => e.kind === "hydra");
    assert.match(
      hydra.text,
      locale === "en"
        ? /mandatory first guardian.*open the first pressure seal/
        : /第一道压力帘的必经守卫.*开启2600米/,
    );
    assert.match(hydra.habitat, locale === "en" ? /surface/ : /表层/);
    const rules = catalog.find((e) => e.kind === "mariana_thresholds");
    assert.match(rules.text, locale === "en" ? /all four gates/ : /全部四关/);
    assert.match(rules.habitat, locale === "en" ? /4,000/ : /4000/);
    const lords = catalog.filter((e) => e.category === "lord");
    for (const lord of lords) {
      const species = BOSS_SPECIES.find((e) => e.kind === lord.kind);
      assert.equal(lord.length, species.length);
      assert.match(lord.text, locale === "en" ? /Patrols slowly/ : /缓慢巡游/);
    }
    for (const e of [...lords, rules])
      for (const key of ["text", "counter", "habitat"])
        if (locale === "en")
          assert.equal(chinese.test(e[key]), false, `${e.kind} ${key}`);
  }
  setLanguage("zh-CN");
});

test("new guide entries retain configured size, nutrition, movement, and ability facts", () => {
  setLanguage("zh-CN");
  const catalog = buildOceanCatalog("atlantis");
  for (const config of getRegionSpecies("atlantis")) {
    const entry = catalog.find((record) => record.kind === config.kind);
    for (const field of [
      "length",
      "nutrition",
      "growth",
      "speed",
      "schoolSize",
    ])
      assert.equal(entry[field], config[field], `${config.kind}: ${field}`);
  }
  for (const config of ATLANTIS_SPECIES) {
    const entry = catalog.find((record) => record.kind === config.kind);
    assert.equal(entry.ability, config.ability);
    assert.equal(entry.realSize, config.realSize);
    assert.ok(entry.habitatNote.startsWith(config.habitatNote));
  }
  assert.equal(
    catalog.find((entry) => entry.kind === "seahorse").schoolSize,
    1,
  );
  assert.equal(
    catalog.find((entry) => entry.kind === "cuttlefish").schoolSize,
    1,
  );
});

test("region, category, and bilingual searches compose without hiding the full archive", () => {
  try {
    for (const locale of ["zh-CN", "en"]) {
      setLanguage(locale);
      const catalog = buildOceanCatalog("atlantis");
      for (const search of [
        "普通乌贼",
        "Common Cuttlefish",
        "sepia officinalis",
      ]) {
        assert.deepEqual(kinds(filterOceanCatalog(catalog, { search })), [
          "cuttlefish",
        ]);
        assert.equal(
          filterOceanCatalog(catalog, { search, regionId: "hawaii" }).length,
          0,
        );
        assert.deepEqual(
          kinds(
            filterOceanCatalog(catalog, {
              search,
              category: "shoal",
              regionId: "atlantis",
            }),
          ),
          ["cuttlefish"],
        );
      }
      assert.deepEqual(
        kinds(
          filterOceanCatalog(catalog, {
            regionId: "atlantis",
            category: "lord",
          }),
        ),
        ["kraken"],
      );
      assert.equal(filterOceanCatalog(catalog, { category: "lord" }).length, 4);
    }
  } finally {
    setLanguage("zh-CN");
  }
});

test("every Atlantis species, available-region description, and zone has complete English", () => {
  const assertTranslated = (record, context) => {
    for (const [field, value] of Object.entries(record)) {
      if (typeof value !== "string" || !chinese.test(value)) continue;
      assert.equal(
        chinese.test(t(value, [], "en")),
        false,
        `Missing English ${context}.${field}: ${value}`,
      );
    }
  };
  for (const entry of ATLANTIS_SPECIES) assertTranslated(entry, entry.kind);
  for (const region of REGIONS) assertTranslated(region, region.id);
  for (const depth of [0, 100, 300, 600])
    assertTranslated(regionZone("atlantis", depth), `zone-${depth}`);
  try {
    setLanguage("en");
    for (const entry of buildOceanCatalog("atlantis")) {
      for (const [field, value] of Object.entries(entry)) {
        if (field === "searchText" || typeof value !== "string") continue;
        assert.equal(
          chinese.test(value),
          false,
          `${entry.id}.${field}: ${value}`,
        );
      }
    }
  } finally {
    setLanguage("zh-CN");
  }
});

test("Atlantis dictionary preserves placeholders and does not override accepted translations", () => {
  for (const [key, value] of Object.entries(ATLANTIS_EN)) {
    assert.ok(value.trim(), `Empty English: ${key}`);
    assert.equal(chinese.test(value), false, `Chinese in English: ${key}`);
    assert.deepEqual(placeholders(value), placeholders(key), key);
    for (const existing of [CATALOG_EN, UI_EN])
      if (Object.hasOwn(existing, key)) assert.equal(value, existing[key], key);
    assert.equal(t(key, [], "en"), value, `Dictionary not wired: ${key}`);
  }
  assert.equal(
    t("当前海域 · {0}", ["亚特兰蒂斯遗迹"], "en"),
    "Selected · Ruins of Atlantis",
  );
  assert.equal(t("出现海域", [], "en"), "Found in");
  assert.equal(t("基础营养", [], "en"), "Base Nutrition");
  assert.equal(t("全部海域", [], "en"), "All regions");
});

test("the complete and regional archives group new species with peers in ascending size", () => {
  for (const regionId of [undefined, "hawaii", "atlantis"]) {
    const catalog = filterOceanCatalog(buildOceanCatalog(regionId), {
      regionId,
    });
    const groups = groupOceanCatalog(catalog);
    assert.deepEqual(
      groups.map((group) => group.id),
      [
        "shoal",
        "invertebrate",
        "surface",
        "hunter",
        "ancient",
        "lord",
        "player",
        "human",
        ...(catalog.some((e) => e.category === "hazard") ? ["hazard"] : []),
      ],
    );
    assert.deepEqual(
      groups.flatMap((group) => group.entries),
      catalog,
    );
    for (const group of groups) {
      assert.ok(group.entries.every((entry) => entry.category === group.id));
      for (let index = 1; index < group.entries.length; index++) {
        assert.ok(
          group.entries[index].length >= group.entries[index - 1].length,
          `${regionId || "all"}: ${group.id} size order`,
        );
      }
    }
    if (regionId !== "hawaii") {
      assert.equal(groups[0].entries[0].length, 0.15);
      assert.ok(
        groups
          .find((group) => group.id === "hunter")
          .entries.some((entry) => entry.kind === "blue_shark"),
      );
      assert.ok(
        groups
          .find((group) => group.id === "ancient")
          .entries.some((entry) => entry.kind === "helicoprion"),
      );
    }
  }
});

test("Three guardian instances share one bilingual species entry describing the hidden treasure quest", () => {
  try {
    for (const locale of ["en", "zh-CN"]) {
      setLanguage(locale);
      const lords = filterOceanCatalog(buildOceanCatalog("atlantis"), {
        regionId: "atlantis",
        category: "lord",
      });
      assert.equal(lords.length, 1);
      assert.equal(lords[0].kind, "kraken");
      assert.match(
        lords[0].text,
        locale === "en" ? /three independent Krakens/i : /三只克拉肯/,
      );
      assert.match(
        lords[0].text,
        locale === "en" ? /secretly guards Poseidon/ : /身份不会预先公开/,
      );
      assert.match(lords[0].text, /30/);
    }
  } finally {
    setLanguage("zh-CN");
  }
});

test("city feeding profiles show their actual deep layers and bilingual fantasy habitat note", () => {
  for (const language of ["en", "zh-CN"]) {
    setLanguage(language);
    const catalog = buildOceanCatalog("atlantis");
    for (const config of getRegionSpecies("atlantis").filter((s) =>
      s.schoolProfiles?.some((p) => p.cityResident),
    )) {
      const entry = catalog.find((e) => e.kind === config.kind);
      assert.ok(
        entry.habitat.includes(String(Math.round(config.depthMax * 4))),
      );
      assert.match(
        entry.habitatNote,
        language === "en" ? /fantasy ecology.*adults/i : /幻想生态.*成年角色/u,
      );
    }
  }
  setLanguage("en");
});
