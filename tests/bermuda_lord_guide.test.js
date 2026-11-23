import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { getExpedition } from "../src/expedition_config.js";
import { BERMUDA_LORD_SITES } from "../src/bermuda_lord_sites.js";
import { setLanguage, t } from "../src/i18n.js";

// 仅忽略样式加载，实际图鉴构建和领地配置照常运行。
const cssHook = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/src/ocean_guide.css"))
      return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { buildOceanCatalog, filterOceanCatalog } = await import(
  "../src/ocean_guide.js"
);
cssHook.deregister();

const englishHabitats = new Map([
  [
    "风暴外海表层 · 双礁门上方",
    "Stormbound surface · above the twin reef gates",
  ],
  ["泰坦尼克号西侧外水域", "Open water west of the Titanic"],
  ["失踪航线残骸带西侧深水", "Deep water west of the lost-flight wrecks"],
  ["断缆打捞场南侧深盆地", "Deep basin south of the cable salvage field"],
]);

test("Bermuda Guide lord habitats follow the authoritative encounter sites in both languages", () => {
  try {
    const configured = getExpedition("bermuda").region.bossInstances;
    assert.deepEqual(
      configured.map(({ kind, habitat }) => ({ kind, habitat })),
      BERMUDA_LORD_SITES.map(({ kind, habitat }) => ({ kind, habitat })),
    );
    assert.equal(configured.length, 4);
    for (const locale of ["zh-CN", "en"]) {
      setLanguage(locale);
      const lords = filterOceanCatalog(buildOceanCatalog("bermuda"), {
        regionId: "bermuda",
        category: "lord",
      });
      assert.equal(lords.length, configured.length);
      for (const site of configured) {
        const record = lords.find(({ kind }) => kind === site.kind);
        assert.ok(record, site.kind);
        const expected =
          locale === "en" ? englishHabitats.get(site.habitat) : site.habitat;
        assert.ok(expected, site.kind);
        assert.equal(t(site.habitat, [], locale), expected);
        assert.equal(record.habitat, expected, site.kind);
        if (locale === "en")
          assert.doesNotMatch(record.habitat, /[\u3400-\u9fff]/u);
      }
    }
  } finally {
    setLanguage("zh-CN");
  }
});

test("Bermuda landmark habitats do not replace shared lord habitats in another region", () => {
  try {
    for (const locale of ["zh-CN", "en"]) {
      setLanguage(locale);
      const lords = filterOceanCatalog(buildOceanCatalog("hawaii"), {
        regionId: "hawaii",
        category: "lord",
      });
      assert.equal(lords.length, 4);
      for (const record of lords) {
        assert.match(record.habitat, /\d/);
        assert.ok(
          !BERMUDA_LORD_SITES.some(
            ({ habitat }) => record.habitat === t(habitat, [], locale),
          ),
          record.kind,
        );
      }
    }
  } finally {
    setLanguage("zh-CN");
  }
});
