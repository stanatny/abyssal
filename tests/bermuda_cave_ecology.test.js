import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import {
  BERMUDA_CAVE_FOOD,
  bermudaCaveFoodHome,
  fitBermudaExpansionEcology,
} from "../src/bermuda_ecology.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
  speciesVisibilityDistance,
  steerResidentHabitat,
} from "../src/ecosystem_population.js";
import {
  isPositionBlocked,
  resolveMotion,
  bodyRadius,
} from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";
import {
  steerWithinHabitat,
  resolveCreatureMotion,
} from "../src/navigation.js";
import { swimmingFloorHeight } from "../src/swimming_clearance.js";
import { preyMealReward } from "../src/simulation.js";
import { preyRespawnDelay } from "../src/regional_rare.js";
import { restoreBermudaLordHomeBaseline } from "./helpers/bermuda_lord_ecology_baseline.js";

const species = getRegionSpecies("bermuda"),
  allowed = {
    tuna: { school: [16, 17] },
    ray: { school: [13] },
    mosasaur: { resident: [8] },
    megalodon: { resident: [4, 6] },
    octopus: { resident: [10] },
    sperm_whale: { resident: [11] },
  };

// 老788名册只排除明确批准的六处洞内补给、两处新顶避让两处新后腔顶避让及追加的两守卫、24金枪鱼和两成年补给；其余数据精确匹配。
test("Approved cave meals, four roof corrections, one cargo clearance and explicit additions retain the exact remaining pre-cave roster", () => {
  const normalized = restoreBermudaLordHomeBaseline(species).map((s) => {
    const entry = { ...s };
    delete entry.bermudaCaveFoodRevision;
    delete entry.bermudaTitanGuardRevision;
    delete entry.bermudaCaveClearanceRevision;
    delete entry.bermudaTitanEscapeFoodRevision;
    if (s.schoolProfiles)
      entry.schoolProfiles = s.schoolProfiles.map((p, i) =>
        allowed[s.kind]?.school?.includes(i)
          ? { count: p.count, caveRelocation: true }
          : p,
      );
    if (s.spawnAnchors)
      entry.spawnAnchors = s.spawnAnchors.map((p, i) =>
        allowed[s.kind]?.resident?.includes(i) ? ["cave relocation"] : p,
      );
    if (s.kind === "tuna") {
      assert.equal(s.population, 184);
      entry.population = 160;
      entry.schoolProfiles = entry.schoolProfiles.slice(0, 20);
    }
    if (s.kind === "megalodon") {
      assert.equal(s.population, 16);
      entry.population = 14;
      entry.spawnAnchors = entry.spawnAnchors.slice(0, 14);
      assert.deepEqual(s.spawnAnchors[10], [-366.2670977678475, -560, -1395]);
      entry.spawnAnchors[10] = [
        -366.2670977678475, -586.991240370215, -1429.038361995042,
      ];
    }
    if (s.kind === "pliosaur") {
      assert.deepEqual(
        s.spawnAnchors[5],
        [-347.0505246882947, -420, -1621.0476965938828],
      );
      entry.spawnAnchors = entry.spawnAnchors.map((p, i) =>
        i === 5 ? [-352.0505246882947, -452, -1621.0476965938828] : p,
      );
    }
    if (s.kind === "mosasaur") {
      assert.deepEqual(
        s.spawnAnchors[3],
        [-398.8476577403979, -435, -1663.4062808613949],
      );
      entry.spawnAnchors = entry.spawnAnchors.map((p, i) =>
        i === 3 ? [-388.8476577403979, -475.6, -1653.4062808613949] : p,
      );
    }
    // 新深巢悬檐仅避让这两名旧居民；还原已记录原坐标后继续核验原名册SHA。
    if (s.kind === "sperm_whale") {
      assert.deepEqual(
        s.spawnAnchors[9],
        [-341.33433730337885, -517, -1616.2433383773575],
      );
      entry.spawnAnchors[9] = [-356.33433730337885, -512, -1626.2433383773575];
    }
    if (s.kind === "livyatan") {
      assert.deepEqual(
        s.spawnAnchors[5],
        [-343.6993723243155, -494.6, -1614.827882908408],
      );
      entry.spawnAnchors[5] = [-358.6993723243155, -499.6, -1624.827882908408];
    }
    if (s.kind === "ichthyotitan") {
      assert.equal(s.population, 6);
      entry.population = 4;
      entry.spawnAnchors = entry.spawnAnchors.slice(0, 4);
    }
    return entry;
  });
  assert.equal(
    createHash("sha256").update(JSON.stringify(normalized)).digest("hex"),
    "462233cf7d7158595e3ac95c0e870cfbe4f42fd4f19425d86445df7602b1269c",
  );
  assert.equal(
    species.reduce((n, s) => n + s.population, 0),
    1082,
  );
  assert.deepEqual(fitBermudaExpansionEcology(species), species);
  assert.deepEqual(
    BERMUDA_CAVE_FOOD.map((r) => [
      r.caveId,
      r.kind,
      r.schoolGroup ?? r.populationIndex,
    ]),
    [
      ["luminous_grotto", "tuna", 16],
      ["fossil_passage", "tuna", 17],
      ["kaiju_lair", "ray", 13],
      ["kaiju_lair", "mosasaur", 8],
      ["kaiju_lair", "megalodon", 6],
      ["fossil_passage", "megalodon", 4],
    ],
  );
});

let fixture;
after(() => fixture?.ocean.dispose());
function world() {
  if (fixture) {
    assert.ok(
      fixture.ocean.root.parent && fixture.ocean.colliders.length > 0,
      "Shared test world must remain alive through every collision case",
    );
    return fixture;
  }
  const ocean = createBermudaOcean(new THREE.Group());
  const population = [];
  for (const s of species)
    if (s.schoolProfiles)
      for (const group of schoolPopulationGroups(s))
        for (let slot = 0; slot < group.count; slot++)
          population.push({
            s,
            habitat: schoolHabitat(s, group.index),
            index: group.start + slot,
            group: group.index,
            slot,
            home: initialSchoolAnchor(s, group.index).add(schoolSlot(s, slot)),
          });
    else
      for (let index = 0; index < s.population; index++)
        population.push({
          s,
          habitat: s,
          index,
          home: initialSpeciesAnchor(s, index),
        });
  fixture = { ocean, population };
  return fixture;
}

function selection(move) {
  const { ocean, population } = world(),
    s = species.find((s) => s.kind === move.kind),
    cave = ocean.caves.records.find((r) => r.id === move.caveId),
    members = population.filter(
      (p) =>
        p.s === s &&
        (move.schoolGroup === undefined
          ? p.index === move.populationIndex
          : p.group === move.schoolGroup),
    );
  return {
    s,
    cave,
    members,
    center: new THREE.Vector3(...bermudaCaveFoodHome(move)),
  };
}

function blocked(point, s, forward) {
  const { ocean } = world(),
    radius = Math.max(0.45, s.length * (s.swimClearance ?? 0.18));
  return isPositionBlocked(point, {
    radius,
    length: s.length,
    forward,
    colliders: [
      ...queryStaticColliders(ocean.colliders, point, point, {
        radius,
        padding: s.length * 0.42,
      }),
      ...(ocean.dynamicContacts?.(point, point, {
        radius,
        padding: s.length * 0.42,
      }) || []),
    ],
  });
}

test("Bermuda exposes its actual cave and world solids to the ordinary swimming callback", () => {
  const { ocean } = world();
  assert.ok(
    ocean.navigationColliders === ocean.colliders,
    "Ordinary swimming must use the same complete world collider array",
  );
  assert.ok(ocean.caves.colliders.length > 0);
  assert.ok(
    ocean.caves.colliders.every((c) => ocean.navigationColliders.includes(c)),
  );
});

test("Every one of the 1082 animals still spawns legally against the final cave walls, roofs and real floor", () => {
  const { ocean, population } = world();
  assert.equal(population.length, 1082);
  assert.equal(ocean.caves.records.length, 3);
  for (const { s, habitat, index, home } of population) {
    const point = habitatPosition(habitat, {
      heightAt: ocean.heightAt,
      colliders: ocean.colliders,
      populationIndex: index,
      anchor: home,
      random: () => 0.5,
    });
    assert.ok(point, `${s.kind}/${index}: valid final habitat`);
    if (!s.benthic)
      assert.ok(
        point.distanceTo(home) < 1e-6,
        `${s.kind}/${index}: no silent cave-induced relocation`,
      );
    assert.ok(-point.y >= habitat.depthMin && -point.y <= habitat.depthMax);
    // Six directions check head/tail and pitched attitudes, rather than only
    // accepting a centre point embedded beside an added roof or wall.
    for (const heading of [
      [0, 0, -1],
      [0, 0, 1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0.7, -0.7],
      [0, -0.7, -0.7],
    ])
      assert.equal(
        blocked(point, s, new THREE.Vector3(...heading)),
        false,
        `${s.kind}/${index}: complete body at ${heading}`,
      );
  }
});

test("Cave meals fit actual interior records and are visible, nutritious and reachable from the real upper passage", () => {
  const { ocean } = world();
  for (const move of BERMUDA_CAVE_FOOD) {
    const { s, cave, members, center } = selection(move),
      frame = cave.frameAt(move.t);
    assert.ok(members.length > 0);
    assert.ok(
      Math.hypot(
        frame.center.x +
          (move.offsetX ?? 0) * Math.cos(cave.yaw || 0) -
          center.x,
        frame.center.z -
          (move.offsetX ?? 0) * Math.sin(cave.yaw || 0) -
          center.z,
      ) < 1e-8,
      `${cave.id}: lightweight food layout agrees with actual loft axis`,
    );
    assert.ok(
      cave.contains(center, 10),
      `${cave.id}/${s.kind}: floor and roof margin`,
    );
    const playerLength =
        s.kind === "megalodon" ? 25 : s.kind === "mosasaur" ? 16 : 10,
      meal = preyMealReward(playerLength, s).nutrition * members.length;
    assert.ok(
      s.length < playerLength && meal > 20,
      `${cave.id}/${s.kind}: meaningful edible meal`,
    );
    const start = cave.routes
      .find((r) => r.id === "upper")
      .points.reduce((best, p) =>
        p.distanceTo(center) < best.distanceTo(center) ? p : best,
      );
    assert.ok(start.distanceTo(center) < speciesVisibilityDistance(s, false));
    let p = start.clone();
    const heading = center.clone().sub(start).normalize(),
      count = Math.ceil(p.distanceTo(center));
    for (let i = 1; i <= count; i++) {
      const desired = start.clone().lerp(center, i / count),
        result = resolveMotion(p, desired, {
          radius: bodyRadius(playerLength),
          length: playerLength,
          forward: heading,
          colliders: queryStaticColliders(ocean.colliders, p, desired, {
            radius: bodyRadius(playerLength),
            padding: playerLength * 0.42,
          }),
          floorHeight: (x, z) =>
            ocean.heightAt(x, z) + bodyRadius(playerLength),
        });
      assert.equal(
        result.blocked,
        false,
        `${cave.id}/${s.kind}: physical approach to food`,
      );
      assert.equal(result.stuck, false);
      p.copy(result.position);
      assert.ok(p.distanceTo(desired) < 1e-6);
    }
  }
});

test("Complete school target orbits retain full body clearance beneath actual cave roofs", () => {
  for (const move of BERMUDA_CAVE_FOOD.filter(
    (r) => r.schoolGroup !== undefined,
  )) {
    const { s, cave, members } = selection(move);
    // Independent horizontal and vertical phases cover the full target envelope,
    // including phase/seed combinations that one short native capture may miss.
    for (const { home, slot } of members)
      for (let azimuth = 0; azimuth < 48; azimuth++)
        for (const vertical of [-1.5, 0, 1.5]) {
          const angle = (azimuth * Math.PI * 2) / 48,
            point = home
              .clone()
              .add(
                new THREE.Vector3(
                  Math.sin(angle) * 8,
                  vertical,
                  Math.cos(angle) * 8,
                ),
              ),
            forward = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
          assert.ok(
            cave.contains(point, Math.max(1, s.length * 0.18)),
            `${cave.id}/${s.kind}/${slot}: full moving orbit stays in cave water`,
          );
          assert.equal(
            blocked(point, s, forward),
            false,
            `${cave.id}/${s.kind}/${slot}: target orbit at ${azimuth}/${vertical}`,
          );
        }
  }
});

test("Moving cave schools and adult residents keep continuous patrol, body clearance and their original depth limits", () => {
  const { ocean } = world(),
    dt = 1 / 30;
  for (const move of BERMUDA_CAVE_FOOD) {
    const { s, cave, members, center } = selection(move),
      schooling = move.schoolGroup !== undefined;
    for (const member of members)
      for (const startHeading of schooling
        ? [0]
        : [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const { home, habitat, index, slot = 0 } = member,
          position = home.clone(),
          velocity = new THREE.Vector3(
            Math.sin(startHeading),
            0,
            -Math.cos(startHeading),
          ),
          seed = slot * 1.124 + (move.populationIndex ?? 0) * 0.81;
        let heading = startHeading,
          travelled = 0;
        // This is a controlled shared-navigation patrol, not a native gameplay
        // receipt. Both complete horizontal target turns and all resident
        // starting directions are exercised against the integrated world.
        for (let step = 0; step < 2400; step++) {
          const elapsed = step * dt,
            previous = position.clone();
          let direction;
          if (schooling)
            direction = home
              .clone()
              .add(
                new THREE.Vector3(
                  Math.sin(elapsed * 0.2 + 1.2) * 8,
                  Math.sin(elapsed * 0.35 + seed) * 1.5,
                  Math.cos(elapsed * 0.2 + 1.2) * 8,
                ),
              )
              .sub(position)
              .normalize();
          else {
            heading += Math.sin(elapsed * 0.18 + seed) * dt * 0.17;
            direction = new THREE.Vector3(
              Math.sin(heading),
              Math.sin(elapsed * 0.32 + seed) * 0.08,
              -Math.cos(heading),
            );
            direction.copy(steerResidentHabitat(s, index, position, direction));
          }
          direction.copy(
            steerWithinHabitat(position, direction, habitat, ocean.heightAt),
          );
          heading = Math.atan2(direction.x, -direction.z);
          velocity.lerp(direction, dt * 2);
          position.addScaledVector(
            velocity,
            s.speed * (schooling ? 0.75 : 1) * dt,
          );
          const floor = swimmingFloorHeight(
            position.x,
            position.z,
            s,
            ocean.heightAt,
            s.length * 0.28 + 2,
          );
          position.y = Math.min(
            -habitat.depthMin,
            Math.max(floor, -habitat.depthMax, position.y),
          );
          const result = resolveCreatureMotion(
            previous,
            position,
            velocity,
            habitat,
            {
              colliders: ocean.navigationColliders,
              dynamicContacts: ocean.dynamicContacts,
              heightAt: ocean.heightAt,
            },
          );
          const label = `${cave.id}/${s.kind}/${index}/${startHeading}/${step}`;
          if (result) {
            assert.equal(result.stuck, false, `${label}: no trapped body`);
            position.copy(result.position);
            if (result.blocked) {
              velocity.copy(result.direction);
              heading = Math.atan2(result.direction.x, -result.direction.z);
            }
          }
          assert.ok(
            cave.contains(position),
            `${label}: stays in intended cave water`,
          );
          assert.ok(
            -position.y >= habitat.depthMin && -position.y <= habitat.depthMax,
            `${label}: original layer`,
          );
          assert.equal(
            blocked(position, s, velocity),
            false,
            `${label}: complete moving body`,
          );
          const distance = position.distanceTo(previous);
          assert.ok(
            distance <= s.speed * dt + 1e-5,
            `${label}: no collision relocation jump`,
          );
          travelled += distance;
        }
        assert.ok(
          travelled > (schooling ? 80 : 600),
          `${cave.id}/${s.kind}: actual patrol progress`,
        );
        assert.ok(
          position.distanceTo(center) < (schooling ? 24 : s.residentRadius + 1),
        );
      }
  }
});

test("Cave food replenishes at its original bounded home after normal retreat without changing active-clock delays", () => {
  const { ocean } = world();
  for (const move of BERMUDA_CAVE_FOOD) {
    const { s, cave, members } = selection(move);
    assert.equal(preyRespawnDelay(s), move.schoolGroup === undefined ? 28 : 18);
    for (const { habitat, home, index } of members) {
      const returned = habitatPosition(habitat, {
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
        populationIndex: index,
        anchor: home,
        near: move.schoolGroup === undefined,
        playerPosition: new THREE.Vector3(0, -18, 75),
        random: () => 0.5,
      });
      assert.ok(returned?.distanceTo(home) < 1e-6);
      assert.ok(cave.contains(returned, 3));
    }
  }
});

test("Every animal remains whole-body clear at both protective-arm extremes and the awake environmental pose", () => {
  const { ocean, population } = world(),
    state = ocean.titanQuest.state,
    before = structuredClone(state),
    camera = new THREE.Vector3(-110, -590, -1590);
  assert.equal(
    typeof ocean.dynamicContacts,
    "function",
    "real posed head/arms must be exposed beside immutable world contacts",
  );
  try {
    for (const [guardAmount, awareness] of [
      [1, 0],
      [0, 0],
      [1, 1],
      [0, 1],
    ]) {
      Object.assign(state, {
        guardAmount,
        guardOpen: guardAmount === 0,
        awareness,
      });
      ocean.titan.setPose(state);
      for (const { s, index, home } of population)
        for (const heading of [
          [0, 0, -1],
          [0, 0, 1],
          [1, 0, 0],
          [-1, 0, 0],
          [0, 0.7, -0.7],
          [0, -0.7, -0.7],
        ])
          assert.equal(
            blocked(home, s, new THREE.Vector3(...heading)),
            false,
            `${s.kind}/${index}: actual posed arm/head ${guardAmount}/${awareness}`,
          );
    }
  } finally {
    Object.assign(state, before);
    ocean.titan.setPose(state);
  }
});
