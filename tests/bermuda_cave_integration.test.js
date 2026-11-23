import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { BERMUDA_CAVE_SITES } from "../src/bermuda_cave_config.js";
import { bermudaCaveGuideEntries } from "../src/bermuda_cave_guide.js";
import { regionZone } from "../src/region_appearance.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { setLanguage, t } from "../src/i18n.js";
import { REGIONS } from "../src/expedition_config.js";

const hook = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css"))
      return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { buildOceanCatalog, filterOceanCatalog } = await import(
  "../src/ocean_guide.js"
);
hook.deregister();

test("Cave Guide cards are searchable in both languages and remain exclusive to Bermuda", () => {
  try {
    for (const language of ["en", "zh-CN"]) {
      setLanguage(language);
      const catalog = buildOceanCatalog();
      for (const entry of bermudaCaveGuideEntries()) {
        const visible = filterOceanCatalog(catalog, {
          regionId: "bermuda",
          search: t(entry.name),
        });
        assert.ok(visible.some((e) => e.id === entry.id));
        for (const region of REGIONS.filter((r) => r.id !== "bermuda"))
          assert.equal(
            filterOceanCatalog(catalog, { regionId: region.id }).some(
              (e) => e.id === entry.id,
            ),
            false,
          );
        for (const field of [
          "name",
          "role",
          "effect",
          "habitat",
          "text",
          "counter",
          "size",
        ])
          assert.equal(
            /[\u3400-\u9fff]/u.test(t(entry[field], [], "en")),
            false,
            `${entry.id}/${field}`,
          );
      }
    }
  } finally {
    setLanguage("zh-CN");
  }
});

test("Deep cave names appear at their real waters and do not replace unrelated regional or surface locations", () => {
  for (const site of BERMUDA_CAVE_SITES) {
    const y = bermudaSeabedHeight(site.x, site.z) + 35,
      position = { x: site.x, y, z: site.z },
      zone = regionZone("bermuda", -y, position);
    assert.equal(zone.name, site.name);
    assert.equal(zone.description, site.description);
    assert.equal(/[\u3400-\u9fff]/u.test(t(site.description, [], "en")), false);
    assert.notEqual(
      regionZone("bermuda", 12, { ...position, y: -12 }).name,
      site.name,
    );
    assert.notEqual(regionZone("hawaii", -y, position).name, site.name);
  }
});
