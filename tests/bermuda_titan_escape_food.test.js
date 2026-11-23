import test, { after } from "node:test";
import assert from "node:assert/strict";
import { restoreBermudaLordHomeBaseline } from "./helpers/bermuda_lord_ecology_baseline.js";
import { createHash } from "node:crypto";
import * as T from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { BERMUDA_TITAN_ESCAPE_FOOD } from "../src/bermuda_ecology.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import {
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolHabitat,
  schoolSlot,
  habitatPosition,
  schoolPopulationGroups,
  steerResidentHabitat,
} from "../src/ecosystem_population.js";
import {
  steerWithinHabitat,
  resolveCreatureMotion,
} from "../src/navigation.js";
import { swimmingFloorHeight } from "../src/swimming_clearance.js";
import { isPositionBlocked } from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";
import { preyMealReward, hungerDrainRate } from "../src/simulation.js";
import { preyRespawnDelay } from "../src/regional_rare.js";

const roster = getRegionSpecies("bermuda");
let ocean;
after(() => ocean?.dispose());
function world() {
  ocean ??= createBermudaOcean(new T.Group());
  assert.ok(ocean.root.parent && ocean.colliders.length > 0);
  return ocean;
}

// 保留完整790名册，只还原明确批准的旧主巢mega6、两后腔屋顶居民和新增guard5让路位置；不能用新库存掩盖旧餐消失。
test("Twenty-four tuna and two adult meals append to the exact original 790 animals", () => {
  assert.equal(
    roster.reduce((n, s) => n + s.population, 0),
    1082,
  );
  assert.equal(roster.find((s) => s.kind === "tuna").population, 344);
  assert.equal(roster.find((s) => s.kind === "megalodon").population, 16);
  const normalized = restoreBermudaLordHomeBaseline(roster).map((s) => {
    const copy = { ...s };
    delete copy.bermudaTitanEscapeFoodRevision;
    if (s.kind === "tuna") {
      assert.equal(s.schoolProfiles.length, 23);
      copy.population = 160;
      copy.schoolProfiles = s.schoolProfiles.slice(0, 20);
    }
    if (s.kind === "pliosaur" || s.kind === "mosasaur") {
      delete copy.bermudaCaveClearanceRevision;
      const slot = s.kind === "pliosaur" ? 5 : 3,
        original =
          s.kind === "pliosaur"
            ? [-352.0505246882947, -452, -1621.0476965938828]
            : [-388.8476577403979, -475.6, -1653.4062808613949];
      copy.spawnAnchors = s.spawnAnchors.map((p, i) =>
        i === slot ? original : p,
      );
    }
    // 明确还原新增遮光岩后最小避让的原居民，不修改旧名册摘要。
    if (s.kind === "sperm_whale") {
      copy.spawnAnchors = s.spawnAnchors.map((p, i) =>
        i === 9 ? [-356.33433730337885, -512, -1626.2433383773575] : p,
      );
    }
    if (s.kind === "livyatan") {
      delete copy.bermudaCaveClearanceRevision;
      copy.spawnAnchors = s.spawnAnchors.map((p, i) =>
        i === 5 ? [-358.6993723243155, -499.6, -1624.827882908408] : p,
      );
    }
    if (s.kind === "ichthyotitan")
      copy.spawnAnchors = s.spawnAnchors.map((p, i) =>
        i === 5 ? [-10, -614.0900547678714, -1480] : p,
      );
    if (s.kind === "megalodon") {
      delete copy.bermudaCaveClearanceRevision;
      assert.deepEqual(s.spawnAnchors[10], [-366.2670977678475, -560, -1395]);
      copy.population = 14;
      copy.spawnAnchors = s.spawnAnchors
        .slice(0, 14)
        .map((p, i) =>
          i === 6
            ? ["approved lair relocation"]
            : i === 10
              ? [-366.2670977678475, -586.991240370215, -1429.038361995042]
              : p,
        );
    }
    return copy;
  });
  assert.equal(
    createHash("sha256").update(JSON.stringify(normalized)).digest("hex"),
    "b11e376f1c97f43045457fec652237019115e5c3acd2a12c39e2869bf89f8c58",
  );
  assert.equal(
    BERMUDA_TITAN_ESCAPE_FOOD.filter((r) => r.kind === "tuna").length,
    3,
  );
  assert.equal(
    BERMUDA_TITAN_ESCAPE_FOOD.filter((r) => r.kind === "megalodon").length,
    2,
  );
});

function members(record) {
  const species = roster.find((s) => s.kind === record.kind);
  if (record.schoolGroup !== undefined) {
    const group = schoolPopulationGroups(species)[record.schoolGroup];
    return Array.from({ length: group.count }, (_, slot) => ({
      species,
      habitat: schoolHabitat(species, group.index),
      index: group.start + slot,
      home: initialSchoolAnchor(species, group.index).add(
        schoolSlot(species, slot),
      ),
    }));
  }
  return [
    {
      species,
      habitat: species,
      index: record.populationIndex,
      home: initialSpeciesAnchor(species, record.populationIndex),
    },
  ];
}
function blocked(p, s, forward) {
  const radius = Math.max(0.45, s.length * (s.swimClearance ?? 0.18));
  return isPositionBlocked(p, {
    radius,
    length: s.length,
    forward,
    colliders: [
      ...queryStaticColliders(world().colliders, p, p, {
        radius,
        padding: s.length * 0.42,
      }),
      ...(world().dynamicContacts?.(p, p, {
        radius,
        padding: s.length * 0.42,
      }) || []),
    ],
  });
}

test("Every appended school and adult has a legal exact spawn and ordinary respawn against real floor, roof, walls and posed hero", () => {
  const ocean = world(),
    cave = ocean.caves.records[0];
  for (const record of BERMUDA_TITAN_ESCAPE_FOOD)
    for (const { species: s, habitat, index, home } of members(record)) {
      assert.ok(cave.contains(home, 1), `${record.id}: actual hollow interior`);
      assert.ok(
        -home.y >= s.depthMin && -home.y <= s.depthMax,
        `${record.id}: original species depth`,
      );
      for (const heading of [
        [0, 0, -1],
        [0, 0, 1],
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0.7, -0.7],
        [0, -0.7, -0.7],
      ])
        assert.equal(
          blocked(home, s, new T.Vector3(...heading)),
          false,
          `${record.id}/${index}: complete initial body`,
        );
      for (const near of s.residentRadius > 0 ? [false, true] : [false]) {
        const returned = habitatPosition(habitat, {
          heightAt: ocean.heightAt,
          colliders: ocean.colliders,
          populationIndex: index,
          anchor: home,
          near,
          playerPosition: new T.Vector3(0, -18, 75),
          random: () => 0.5,
        });
        assert.ok(
          returned?.distanceTo(home) < 1e-6,
          `${record.id}/${index}: normal placement, no fallback or hidden refill`,
        );
      }
      assert.equal(preyRespawnDelay(s), s.kind === "tuna" ? 18 : 28);
    }
});

test("All twenty-four new school members fit complete target envelopes against closed, open and aware head/arm contacts", () => {
  const ocean = world(),
    before = { ...ocean.titanQuest.state };
  assert.equal(typeof ocean.dynamicContacts, "function");
  try {
    for (const [guardAmount, awareness] of [
      [1, 0],
      [0, 0],
      [1, 1],
      [0, 1],
    ]) {
      ocean.titan.setPose({ guardAmount, awareness });
      for (const record of BERMUDA_TITAN_ESCAPE_FOOD.filter(
        (r) => r.kind === "tuna",
      ))
        for (const { species: s, home, index } of members(record)) {
          assert.equal(s.depthMax, 600);
          for (let phase = 0; phase < 48; phase++)
            for (const dy of [-1.5, 0, 1.5]) {
              const angle = (phase * Math.PI) / 24,
                point = home
                  .clone()
                  .add(
                    new T.Vector3(Math.sin(angle) * 8, dy, Math.cos(angle) * 8),
                  );
              assert.ok(-point.y <= 600 && -point.y >= s.depthMin);
              assert.ok(ocean.caves.records[0].contains(point, 1));
              assert.equal(
                blocked(
                  point,
                  s,
                  new T.Vector3(Math.cos(angle), 0, -Math.sin(angle)),
                ),
                false,
                `${record.id}/${index}: full patrol envelope with pose${guardAmount}/${awareness}`,
              );
            }
        }
    }
  } finally {
    ocean.titan.setPose(before);
  }
});

test("Adult supplies retain original radius, depth and food rules, while small tuna are honestly supplemental", () => {
  const adult = roster.find((s) => s.kind === "megalodon"),
    tuna = roster.find((s) => s.kind === "tuna");
  assert.equal(adult.length, 20);
  assert.equal(adult.residentRadius, 30);
  assert.equal(adult.depthMax, 640);
  for (const length of [25, 30]) {
    const adultMeal = preyMealReward(length, adult).nutrition,
      smallMeals = 24 * preyMealReward(length, tuna).nutrition;
    assert.equal(adultMeal, 105);
    assert.ok(
      smallMeals / hungerDrainRate(length, 600) < 16,
      "24 tiny fish are not presented as a full adult escape budget",
    );
    assert.ok(
      adultMeal / hungerDrainRate(length, 600) > 30,
      "each actual adult meal supports a real short retreat",
    );
  }
});

test("The twenty-six added animals patrol for eighty seconds through the actual ordinary navigator before legal replenishment", () => {
  const ocean = world(),
    dt = 1 / 30;
  for (const record of BERMUDA_TITAN_ESCAPE_FOOD)
    for (const member of members(record)) {
      const { species: s, habitat, index, home } = member,
        schooling = record.schoolGroup !== undefined;
      for (const initialHeading of schooling
        ? [0]
        : [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const position = home.clone(),
          velocity = new T.Vector3(
            Math.sin(initialHeading),
            0,
            -Math.cos(initialHeading),
          );
        let heading = initialHeading,
          travel = 0;
        for (let i = 0; i < 2400; i++) {
          const elapsed = i * dt,
            previous = position.clone();
          let direction;
          if (schooling)
            direction = home
              .clone()
              .add(
                new T.Vector3(
                  Math.sin(elapsed * 0.2 + 1.2) * 8,
                  Math.sin(elapsed * 0.35 + index * 0.81) * 1.5,
                  Math.cos(elapsed * 0.2 + 1.2) * 8,
                ),
              )
              .sub(position)
              .normalize();
          else {
            heading += Math.sin(elapsed * 0.18 + index * 0.81) * dt * 0.17;
            direction = new T.Vector3(
              Math.sin(heading),
              Math.sin(elapsed * 0.32 + index * 0.81) * 0.08,
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
          if (result) {
            assert.equal(
              result.stuck,
              false,
              `${record.id}/${index}/${initialHeading}/${i}: no trapped body`,
            );
            position.copy(result.position);
            if (result.blocked) {
              velocity.copy(result.direction);
              heading = Math.atan2(result.direction.x, -result.direction.z);
            }
          }
          assert.equal(
            blocked(position, s, velocity),
            false,
            `${record.id}/${index}/${initialHeading}/${i}: full moving body`,
          );
          assert.ok(ocean.caves.records[0].contains(position, 0));
          assert.ok(
            -position.y >= habitat.depthMin && -position.y <= habitat.depthMax,
          );
          const distance = position.distanceTo(previous),
            projection = Math.max(0, floor - previous.y);
          assert.ok(
            Math.hypot(position.x - previous.x, position.z - previous.z) <=
              s.speed * dt + 1e-5,
          );
          assert.ok(distance <= s.speed * dt + projection + 1e-5);
          travel += distance;
        }
        assert.ok(
          travel > (schooling ? 80 : 600),
          `${record.id}: actual normal patrol progress`,
        );
        assert.ok(
          position.distanceTo(home) < (schooling ? 24 : s.residentRadius + 1),
        );
        const returned = habitatPosition(habitat, {
          heightAt: ocean.heightAt,
          colliders: ocean.colliders,
          populationIndex: index,
          anchor: home,
          near: false,
          random: () => 0.5,
        });
        assert.ok(returned?.distanceTo(home) < 1e-6);
      }
    }
});
