import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { fitBermudaExpansionEcology } from "../src/bermuda_ecology.js";
import {
  schoolPopulationGroups,
  schoolSlot,
  speciesVisibilityDistance,
} from "../src/ecosystem_population.js";
import { preyRespawnDelay } from "../src/regional_rare.js";
import { isNursery } from "../src/nursery_rules.js";
import { restoreBermudaShoalDensityBaseline } from "./helpers/bermuda_shoal_density_baseline.js";

const roster = getRegionSpecies("bermuda"),
  baseline = restoreBermudaShoalDensityBaseline(roster),
  digest = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  expected = {
    needlefish: { before: 84, after: 136, groups: 8, count: 10 },
    sunfish: { before: 52, after: 76, groups: 12, count: 6 },
    tuna: { before: 184, after: 344, groups: 16, count: 12 },
    ray: { before: 102, after: 132, groups: 15, count: 8 },
  },
  bridges = [
    ["western_midwater", [-310, -200, -560]],
    ["eastern_midwater", [310, -220, -590]],
    ["western_deep_route", [-325, -330, -1120]],
    ["eastern_deep_route", [325, -310, -1080]],
    ["southwestern_midwater", [-300, -240, -1360]],
    ["southeastern_midwater", [300, -240, -1360]],
    ["southern_west_approach", [-240, -380, -1580]],
    ["southern_east_approach", [240, -380, -1580]],
  ],
  surfaceEntries = [
    ["western_surface_entry", [-325, -8, -180]],
    ["eastern_surface_entry", [325, -8, -180]],
  ];

test("Bermuda adds exactly 266 animals in four route species and ten appended schools", () => {
  // 摘要来自增密前独立捕获的完整注册表；测试不依赖被忽略的工作文件。
  assert.equal(
    digest(baseline),
    "7573c1f40e12d7c3161ec9497f84517d8c85c982a75d7a0877d9d6a01a851ef9",
  );
  assert.equal(
    baseline.reduce((n, s) => n + s.population, 0),
    816,
  );
  assert.equal(
    roster.reduce((n, s) => n + s.population, 0),
    1082,
  );
  assert.equal(roster.length, baseline.length);
  let changedGroups = 0;
  for (const [index, species] of roster.entries()) {
    const prior = baseline[index],
      stock = expected[species.kind];
    if (!stock) {
      assert.deepEqual(species, prior, `${species.kind}: no density edit`);
      continue;
    }
    assert.equal(species.bermudaShoalDensityRevision, "20261123");
    assert.equal(prior.population, stock.before);
    assert.equal(species.population, stock.after);
    assert.equal(
      species.schoolProfiles.length - prior.schoolProfiles.length,
      species.kind === "tuna" ? 8 : species.kind === "needlefish" ? 2 : 0,
    );
    let changed = 0;
    for (const [group, profile] of prior.schoolProfiles.entries()) {
      const current = species.schoolProfiles[group];
      if (profile.bermudaRouteSchool && !profile.bermudaCaveId) {
        assert.deepEqual(current, { ...profile, count: stock.count });
        changed++;
      } else assert.deepEqual(current, profile);
      // 增密不改变既有成员在各自群中的队形位置；累计个体序号按新群规模重算。
      for (let slot = 0; slot < profile.count; slot++)
        assert.deepEqual(schoolSlot(species, slot), schoolSlot(prior, slot));
    }
    assert.equal(changed, stock.groups);
    changedGroups += changed;
    const { population, schoolProfiles, bermudaShoalDensityRevision, ...rest } =
      species;
    const {
      population: oldStock,
      schoolProfiles: oldGroups,
      ...oldRest
    } = prior;
    assert.deepEqual(rest, oldRest, `${species.kind}: original traits`);
  }
  assert.equal(changedGroups, 51);
  const tuna = roster.find((s) => s.kind === "tuna"),
    added = tuna.schoolProfiles.slice(23);
  assert.equal(added.length, bridges.length);
  for (const [index, [id, anchor]] of bridges.entries())
    assert.deepEqual(added[index], {
      anchor,
      count: 12,
      depthMin: -anchor[1] - 18,
      depthMax: -anchor[1] + 18,
      fixedHabitat: true,
      nurseryResident: false,
      bermudaRouteSchool: true,
      bermudaDensitySchool: id,
    });
  const needlefish = roster.find((s) => s.kind === "needlefish"),
    surfaceAdded = needlefish.schoolProfiles.slice(11);
  assert.equal(surfaceAdded.length, surfaceEntries.length);
  for (const [index, [id, anchor]] of surfaceEntries.entries())
    assert.deepEqual(surfaceAdded[index], {
      anchor,
      count: 10,
      depthMin: 1,
      depthMax: 18,
      fixedHabitat: true,
      nurseryResident: false,
      bermudaRouteSchool: true,
      bermudaDensitySchool: id,
    });
});

test("Exact nursery, liner, cave meals and all residents including lord reserves are unchanged", () => {
  const protectedRecords = roster.map((species) =>
    species.schoolProfiles
      ? {
          kind: species.kind,
          profiles: species.schoolProfiles.filter(
            (profile) => !profile.bermudaRouteSchool || profile.bermudaCaveId,
          ),
        }
      : species,
  );
  assert.equal(
    digest(protectedRecords),
    "0d1ea92dd2b461fc24fef3effce7284d3c54c0b9233401469b1bdb35ac90c949",
  );
  const profiles = roster.flatMap((species) => species.schoolProfiles || []);
  assert.equal(
    profiles.filter(
      (profile) => profile.fixedHabitat && !profile.bermudaRouteSchool,
    ).length,
    3,
  );
  assert.equal(
    profiles
      .filter((profile) => profile.bermudaTitanEscapeSupply)
      .reduce((n, profile) => n + profile.count, 0),
    24,
  );
});

test("All other regional registries retain their independent pre-density bytes", () => {
  for (const [region, sha] of Object.entries({
    hawaii: "ae66f1ed756da5f524258ab29ad8711d0317151bdb398adbb6bbf2561ea262f6",
    atlantis:
      "ca14a08c9df110c80b412e192032421bcb7e371706e563166731bee0ac7bbdb8",
    mariana: "03244e31cf0cef912c1fe1ad7466954cb0e0bed6acc8c79b696292b4379ebe23",
    amazon: "e81d954a9d4d761111e56b59b4d3619df0b9f221fb54a4cbf13c16dac88e842a",
    europa: "071e87cfa6247ec1c471c580ae12dbcbfd882bb26eeae9327c87e636203e1492",
    penglai: "52264a60aa8d7027566d6c2abfc1e95aca5278de486053e8c1e5545f2f9d784b",
    odyssey: "4832a6534be3e1a038f643a559238a3933c3726a9e7cf90d3dea36225fbfe7ac",
  }))
    assert.equal(digest(getRegionSpecies(region)), sha, region);
});

test("Final fitting is immutable and repeatable and actual group counts include every new member", () => {
  const before = JSON.stringify(baseline),
    fitted = fitBermudaExpansionEcology(baseline);
  assert.equal(JSON.stringify(baseline), before);
  assert.deepEqual(fitted, roster);
  assert.deepEqual(fitBermudaExpansionEcology(fitted), fitted);
  assert.deepEqual(restoreBermudaShoalDensityBaseline(baseline), baseline);
  let animals = 0,
    schools = 0;
  for (const species of fitted) {
    assert.ok(Object.isFrozen(species));
    if (!species.schoolProfiles) continue;
    const groups = schoolPopulationGroups(species);
    assert.equal(groups.length, species.schoolProfiles.length);
    assert.equal(
      groups.reduce((n, group) => n + group.count, 0),
      species.population,
    );
    let end = 0;
    for (const group of groups) {
      assert.equal(group.start, end);
      assert.equal(group.count, species.schoolProfiles[group.index].count);
      end += group.count;
    }
    assert.equal(end, species.population);
    assert.equal(preyRespawnDelay(species), 18);
    animals += end;
    schools += groups.length;
  }
  assert.equal(schools, 91);
  assert.equal(animals, 866);
});

function visibleSchoolStock(species, station) {
  return species
    .filter((entry) => entry.schoolProfiles && !entry.predator)
    .reduce(
      (stock, entry) =>
        stock +
        entry.schoolProfiles.reduce(
          (n, profile) =>
            n +
            Array.from({ length: profile.count }, (_, slot) =>
              schoolSlot(entry, slot).add(new THREE.Vector3(...profile.anchor)),
            ).filter(
              (point) =>
                point.distanceTo(station) <
                speciesVisibilityDistance(entry, false),
            ).length,
          0,
        ),
      0,
    );
}

test("Eight fixed-depth bridge stations gain a visible twelve-fish school within unchanged Smooth culling", () => {
  for (const [id, anchor] of bridges) {
    const station = new THREE.Vector3(...anchor),
      prior = visibleSchoolStock(baseline, station),
      current = visibleSchoolStock(roster, station);
    assert.equal(prior, 0, `${id}: pre-density local school stock`);
    assert.equal(
      current,
      12,
      `${id}: local stock under real 3D Smooth distance`,
    );
    const tuna = roster.find((species) => species.kind === "tuna");
    assert.equal(speciesVisibilityDistance(tuna, false), 120);
    const profile = tuna.schoolProfiles.find(
      (p) => p.bermudaDensitySchool === id,
    );
    assert.ok(-station.y >= profile.depthMin && -station.y <= profile.depthMax);
    for (let slot = 0; slot < profile.count; slot++) {
      const point = schoolSlot(tuna, slot).add(station);
      assert.ok(point.distanceTo(station) < 120);
      assert.ok(-point.y >= profile.depthMin && -point.y <= profile.depthMax);
    }
  }
});

test("Both northern surface entries add ten visible needlefish outside the protected nursery", () => {
  const needlefish = roster.find((species) => species.kind === "needlefish");
  assert.equal(speciesVisibilityDistance(needlefish, false), 95);
  for (const [id, anchor] of surfaceEntries) {
    const station = new THREE.Vector3(...anchor),
      profile = needlefish.schoolProfiles.find(
        (p) => p.bermudaDensitySchool === id,
      );
    const prior = visibleSchoolStock(baseline, station),
      current = visibleSchoolStock(roster, station);
    // 邻近旧群也可能加厚；新增入口群本身必须贡献完整十尾。
    assert.ok(current >= prior + 10, `${id}: at least ten more visible fish`);
    assert.equal(isNursery(station), false);
    assert.equal(profile.nurseryResident, false);
    assert.equal(profile.depthMin, needlefish.depthMin);
    assert.equal(profile.depthMax, needlefish.depthMax);
    for (let slot = 0; slot < profile.count; slot++) {
      const point = schoolSlot(needlefish, slot).add(station);
      assert.equal(isNursery(point), false);
      assert.ok(point.distanceTo(station) < 95);
      assert.ok(-point.y >= profile.depthMin && -point.y <= profile.depthMax);
    }
  }
});
