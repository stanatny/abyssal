import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { BERMUDA_LORD_SITES } from "../src/bermuda_lord_sites.js";
import { fitBermudaExpansionEcology } from "../src/bermuda_ecology.js";
import { fitRegionalLordHabitats } from "../src/regional_lord_habitats.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
} from "../src/ecosystem_population.js";
import {
  bodyRadius,
  castBodySegment,
  isPositionBlocked,
} from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import { isNursery, canPredatorHunt } from "../src/nursery_rules.js";
import { preyMealReward } from "../src/simulation.js";
import {
  oceanCurrentRoutes,
  nearestCurrentPoint,
  OCEAN_CURRENT_RULES,
} from "../src/ocean_current_rules.js";
import {
  BERMUDA_LORD_HOME_BASELINE,
  restoreBermudaLordHomeBaseline,
} from "./helpers/bermuda_lord_ecology_baseline.js";

const roster = getRegionSpecies("bermuda"),
  expected = {
    sperm_whale: [
      [-380, -83, -480],
      [-190, -93, -520],
      [-365, -400, -680],
      [190, -480, -1150],
    ],
    pliosaur: [
      [-305, -415, -850],
      [200, -435, -1160],
    ],
    megalodon: [[180, -525, -1080]],
    livyatan: [
      [-190, -98, -420],
      [-385, -390, -800],
      [180, -470, -1200],
    ],
    ichthyotitan: [
      [-235, -33, -495],
      [-300, -380, -775],
      [215, -470, -1125],
    ],
  };

test("After excluding approved shoal density, the lord followup moves exactly thirteen slots and retains every other catalogue byte", () => {
  const prior = restoreBermudaLordHomeBaseline(roster);
  assert.equal(
    createHash("sha256").update(JSON.stringify(prior)).digest("hex"),
    "b395530da0b1860dc9571ba3694cb9dd9ac1aea9db15c1ef28512afb2d352b14",
  );
  assert.equal(
    roster.reduce((n, s) => n + s.population, 0),
    1082,
  );
  let changed = 0;
  for (const [kind, homes] of Object.entries(expected)) {
    const species = roster.find((s) => s.kind === kind);
    assert.equal(species.bermudaLordSiteRevision, "east_mayan_20261122");
    assert.deepEqual(species.spawnAnchors.slice(0, homes.length), homes);
    changed += homes.length;
    for (const home of homes) {
      assert.equal(isNursery({ y: home[1], z: home[2] }), false);
      assert.ok(-home[1] >= species.depthMin && -home[1] <= species.depthMax);
    }
  }
  assert.equal(changed, 13);
  for (const [kind, index, home] of [
    ["sperm_whale", 4, [120, -500, -1600]],
    ["megalodon", 1, [340, -615, -1540]],
    ["livyatan", 3, [220, -520, -1680]],
    ["ichthyotitan", 3, [175, -595, -1615]],
  ])
    assert.deepEqual(
      roster.find((s) => s.kind === kind).spawnAnchors[index],
      home,
    );
});

test("Authoritative guard binding and both fitting stages are immutable and idempotent", () => {
  const guard = roster.find((s) => s.kind === "ichthyotitan");
  assert.deepEqual(
    guard.spawnAnchors.slice(0, 4),
    BERMUDA_LORD_SITES.map((site) => site.guardHome),
  );
  const prior = restoreBermudaLordHomeBaseline(roster),
    serialized = JSON.stringify(prior),
    fitted = fitBermudaExpansionEcology(prior);
  assert.equal(JSON.stringify(prior), serialized);
  assert.equal(JSON.stringify(fitted), JSON.stringify(roster));
  assert.deepEqual(fitBermudaExpansionEcology(fitted), fitted);
  assert.deepEqual(fitRegionalLordHabitats("bermuda", fitted), fitted);
  assert.deepEqual(
    fitBermudaExpansionEcology(fitRegionalLordHabitats("bermuda", fitted)),
    fitted,
  );
  for (const species of fitted)
    if (
      !BERMUDA_LORD_HOME_BASELINE[species.kind] &&
      !species.bermudaShoalDensityRevision
    )
      assert.equal(
        species,
        prior.find((s) => s.kind === species.kind),
      );
});

test("The immediate west-to-east revision changes only Mayan's guard and four reserve slots", () => {
  const westHomes = {
      sperm_whale: { 3: [-455, -520, -1375] },
      pliosaur: { 1: [-235, -460, -1265] },
      megalodon: { 0: [-235, -570, -1225] },
      livyatan: { 2: [-415, -530, -1175] },
      ichthyotitan: { 2: [-290, -540, -1350] },
    },
    west = roster.map((source) => {
      const copy = { ...source },
        homes = westHomes[source.kind];
      if (!homes) return copy;
      copy.spawnAnchors = source.spawnAnchors.slice();
      for (const [index, home] of Object.entries(homes))
        copy.spawnAnchors[index] = home.slice();
      copy.bermudaLordSiteRevision = "20261122";
      return copy;
    }),
    before = JSON.stringify(west),
    east = fitBermudaExpansionEcology(west),
    changed = [];
  assert.equal(JSON.stringify(west), before);
  assert.equal(JSON.stringify(east), JSON.stringify(roster));
  const restoredWest = east.map((source, i) => {
    const copy = { ...source };
    if (!westHomes[source.kind]) return copy;
    copy.spawnAnchors = source.spawnAnchors.slice();
    for (let slot = 0; slot < source.spawnAnchors.length; slot++)
      if (
        JSON.stringify(source.spawnAnchors[slot]) !==
        JSON.stringify(west[i].spawnAnchors[slot])
      )
        changed.push(`${source.kind}/${slot}`);
    for (const [slot, home] of Object.entries(westHomes[source.kind]))
      copy.spawnAnchors[slot] = home.slice();
    copy.bermudaLordSiteRevision = "20261122";
    return copy;
  });
  assert.deepEqual(changed.sort(), [
    "ichthyotitan/2",
    "livyatan/2",
    "megalodon/0",
    "pliosaur/1",
    "sperm_whale/3",
  ]);
  assert.equal(JSON.stringify(restoredWest), before);
  assert.deepEqual(fitBermudaExpansionEcology(east), east);
  for (const [kind, index] of [
    ["ichthyotitan", 2],
    ["sperm_whale", 3],
    ["pliosaur", 1],
    ["megalodon", 0],
    ["livyatan", 2],
  ]) {
    const s = roster.find((s) => s.kind === kind),
      home = initialSpeciesAnchor(s, index),
      radius = s.length * (s.swimClearance ?? 0.18),
      sample = { point: new T.Vector3(), direction: new T.Vector3() };
    for (const current of oceanCurrentRoutes("bermuda")) {
      nearestCurrentPoint(current, home, sample);
      assert.ok(
        sample.distance >
          OCEAN_CURRENT_RULES.radius + radius + s.residentRadius,
        `${kind}/${index}: entire resident envelope stays outside ${current.id}`,
      );
    }
  }
});

test("One live Bermuda world supports the eastern Mayan guard and reachable reserves without fallback", (t) => {
  const ocean = createBermudaOcean(new T.Group());
  t.after(() => ocean.dispose());
  const query = (a, b, dimensions) => [
      ...queryStaticColliders(ocean.colliders, a, b, dimensions),
      ...(ocean.dynamicContacts?.(a, b, dimensions) || []),
    ],
    guard = roster.find((s) => s.kind === "ichthyotitan"),
    nursery = new T.Vector3(0, -18, 75),
    supplies = [],
    sites = BERMUDA_LORD_SITES.filter((site) => site.kind === "mayan");
  for (const site of sites) {
    const i = BERMUDA_LORD_SITES.indexOf(site),
      home = initialSpeciesAnchor(guard, i),
      spawned = habitatPosition(guard, {
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
        populationIndex: i,
        random: () => 0.5,
      }),
      radius = guard.length * guard.swimClearance;
    assert.ok(spawned?.distanceTo(home) < 1e-6, `${site.id}: exact guard home`);
    assert.equal(canPredatorHunt(guard, i, home, nursery), false);
    assert.ok(
      canPredatorHunt(guard, i, home, new T.Vector3(...site.home)),
      `${site.id}: guard retains ordinary attack territory`,
    );
    for (const direction of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]) {
      const forward = new T.Vector3(...direction),
        body = { radius, length: guard.length, forward, colliders: query },
        target = home.clone().addScaledVector(forward, 8),
        hit = castBodySegment(home, target, body);
      assert.equal(isPositionBlocked(home, body), false, site.id);
      assert.equal(
        hit,
        null,
        `${site.id}: guard lookahead blocked by ${hit?.collider.id}`,
      );
    }
  }
  for (const [kind, i] of [
    ["sperm_whale", 3],
    ["pliosaur", 1],
    ["megalodon", 0],
    ["livyatan", 2],
  ]) {
    const s = roster.find((s) => s.kind === kind),
      home = initialSpeciesAnchor(s, i),
      spawned = habitatPosition(s, {
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
        populationIndex: i,
        random: () => 0.5,
      });
    assert.ok(spawned?.distanceTo(home) < 1e-6, `${kind}/${i}: no fallback`);
    supplies.push({ s, i, home });
  }
  for (const site of sites) {
    const center = new T.Vector3(...site.home),
      reachable = supplies.filter(({ s, home }) => {
        const distance = home.distanceTo(center);
        if (
          distance < 60 ||
          distance >= 180 ||
          s.length >= 25 ||
          preyMealReward(30, s).nutrition < 30
        )
          return false;
        const forward = home.clone().sub(center).normalize(),
          radius = bodyRadius(30);
        if (
          castBodySegment(center, home, {
            radius,
            length: 30,
            forward,
            colliders: query,
          })
        )
          return false;
        for (let i = 0; i <= Math.ceil(distance / 2); i++) {
          const p = center.clone().lerp(home, i / Math.ceil(distance / 2));
          if (
            p.y <
            bodyTerrainFloor(p.x, p.z, {
              heightAt: ocean.contactSurface,
              radius,
              length: (30 * 0.52) / 0.42,
              forward,
              margin: 0.4,
            })
          )
            return false;
        }
        return true;
      });
    console.log(
      JSON.stringify({
        lord: site.id,
        reachable: reachable.map(({ s, i }) => `${s.kind}/${i}`),
      }),
    );
    assert.ok(reachable.length >= 2, `${site.id}: two actual reachable meals`);
    assert.ok(
      reachable.some(({ s }) => s.predator),
      site.id,
    );
  }
});
