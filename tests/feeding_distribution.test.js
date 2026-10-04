import test from "node:test";
import assert from "node:assert/strict";
import { spreadFeedingSchools } from "../src/feeding_distribution.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  schoolHabitat,
  schoolPopulationGroups,
  initialSchoolAnchor,
} from "../src/ecosystem_population.js";

test("横向分群保持人数、水层和资源，明确的育幼与建筑栖息点不移动", () => {
  const source = {
    kind: "fixture",
    length: 4,
    nutrition: 36,
    growth: 0.2,
    schoolSize: 8,
    population: 18,
    depthMin: 20,
    depthMax: 260,
    schoolProfiles: [
      {
        anchor: [0, -30, 45],
        count: 8,
        depthMin: 20,
        depthMax: 40,
        nurseryResident: true,
      },
      { anchor: [20, -120, -420], count: 8, depthMin: 102, depthMax: 138 },
      {
        anchor: [-18, -220, -650],
        count: 2,
        depthMin: 214,
        depthMax: 226,
        cityResident: true,
        citySite: "gallery",
      },
    ],
  };
  const before = JSON.stringify(source);
  const result = spreadFeedingSchools([source])[0];
  assert.equal(JSON.stringify(source), before);
  assert.equal(result.population, 18);
  assert.equal(
    result.schoolProfiles.reduce((n, p) => n + p.count, 0),
    18,
  );
  assert.deepEqual(result.schoolProfiles[0], source.schoolProfiles[0]);
  assert.deepEqual(result.schoolProfiles.at(-1), source.schoolProfiles.at(-1));
  const middle = result.schoolProfiles.slice(1, -1);
  assert.equal(middle.length, 2);
  assert.equal(middle[0].anchor[0], -44);
  assert.equal(middle[1].anchor[0], 84);
  assert.ok(
    middle.every(
      (p) => p.depthMin === 102 && p.depthMax === 138 && p.anchor[1] === -120,
    ),
  );
  assert.equal(result.nutrition, source.nutrition);
  assert.equal(result.growth, source.growth);
  assert.ok(Object.isFrozen(result.schoolProfiles[1].anchor));
});

test("五海域实际分群库存完整，出生深度与每一群的固定水层一致", () => {
  const counts = {
    hawaii: 516,
    atlantis: 560,
    bermuda: 467,
    mariana: 453,
    europa: 352,
  };
  for (const [region, expected] of Object.entries(counts)) {
    const species = getRegionSpecies(region);
    assert.equal(
      species.reduce((n, e) => n + e.population, 0),
      expected,
    );
    let roaming = 0;
    for (const s of species.filter((s) => s.schoolSize > 1)) {
      const groups = schoolPopulationGroups(s);
      assert.equal(
        groups.reduce((n, g) => n + g.count, 0),
        s.population,
      );
      for (const g of groups) {
        const h = schoolHabitat(s, g.index),
          a = initialSchoolAnchor(s, g.index);
        assert.ok(h.depthMin <= h.depthMax, `${region}:${s.kind}: valid layer`);
        if (!h.nurseryResident)
          assert.ok(
            -a.y >= h.depthMin - 1e-8 && -a.y <= h.depthMax + 1e-8,
            `${region}:${s.kind}:${g.index}`,
          );
        if (s.length >= 1 && !h.cityResident && !h.nurseryResident) roaming++;
      }
    }
    assert.ok(roaming >= 6, `${region}: remains a distributed feeding ecology`);
  }
});

test("沉船内部补给保留实际锚点与库存，不能被外海分群搬出船舱", () => {
  const species = getRegionSpecies("bermuda");
  const fixed = species.flatMap((s) =>
    (s.schoolProfiles || [])
      .filter((p) => p.fixedHabitat)
      .map((p) => ({ ...p, kind: s.kind })),
  );
  assert.equal(fixed.length, 3);
  assert.equal(
    fixed.reduce((n, p) => n + p.count, 0),
    22,
  );
  const again = spreadFeedingSchools(species);
  assert.deepEqual(
    again.flatMap((s) =>
      (s.schoolProfiles || [])
        .filter((p) => p.fixedHabitat)
        .map((p) => ({ ...p, kind: s.kind })),
    ),
    fixed,
  );
});

test("木卫二原库存覆盖全部已声明栖地，不遗失被大群规模遮蔽的深层锚点", () => {
  for (const kind of [
    "veil_glider",
    "crown_filterer",
    "bell_carrier",
    "siphon_colossus",
    "spiral_grazer",
  ]) {
    const s = getRegionSpecies("europa").find((s) => s.kind === kind);
    const intended = s.schoolAnchors.map((a) => `${a[1]},${a[2]}`);
    const actual = (
      s.schoolProfiles?.map((p) => p.anchor) || s.spawnAnchors
    ).map((a) => `${a[1]},${a[2]}`);
    for (const point of intended)
      assert.ok(actual.includes(point), `${kind}: ${point}`);
    assert.equal(
      s.schoolProfiles?.reduce((n, p) => n + p.count, 0) ??
        s.spawnAnchors.length,
      s.population,
    );
  }
});
