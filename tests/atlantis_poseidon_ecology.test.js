import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { ECOSYSTEM_SPECIES } from "../src/ecosystem_config.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
  sharesHabitat,
} from "../src/ecosystem_population.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { POSEIDON_TEMPLE_SITE as SITE } from "../src/atlantis_poseidon_site.js";
import { isPositionBlocked } from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";
import {
  resolveCreatureMotion,
  steerWithinHabitat,
} from "../src/navigation.js";
import { isNursery } from "../src/nursery_rules.js";
import { canEat, createPlayer } from "../src/simulation.js";

const OCEAN = createAtlantisOcean(new THREE.Scene());
const SPECIES = getRegionSpecies("atlantis");
const SCHOOLS = [SITE.fishSanctuary, SITE.secondaryFishSanctuary].map(
  (sanctuary) => {
    const species = SPECIES.find((entry) => entry.kind === sanctuary.species);
    const group = schoolPopulationGroups(species).find(
      ({ index }) =>
        schoolHabitat(species, index).citySite === SITE.reservation,
    );
    return {
      sanctuary,
      species,
      group,
      habitat: schoolHabitat(species, group.index),
      anchor: initialSchoolAnchor(species, group.index),
    };
  },
);
const RENDERED_TERRAIN = terrainTriangles();

after(() => OCEAN.dispose());

test("Poseidon preserves its food stock with 392 legal spawns including two deep giants and 168 juvenile nursery meals", () => {
  assert.equal(
    SPECIES.reduce((sum, species) => sum + species.population, 0),
    392,
  );
  const profiles = SPECIES.flatMap((species) => species.schoolProfiles || []);
  assert.equal(
    profiles
      .filter((profile) => profile.cityResident)
      .reduce((sum, profile) => sum + profile.count, 0),
    114,
  );
  assert.equal(
    SPECIES.filter((species) => species.schoolSize > 1).reduce(
      (sum, species) => sum + schoolPopulationGroups(species).length,
      0,
    ),
    43,
  );
  const tuna = SPECIES.find((species) => species.kind === "tuna");
  assert.equal(tuna.population, 42);
  assert.deepEqual(
    tuna.schoolProfiles
      .filter((profile) => profile.cityResident)
      .map((profile) => profile.count),
    [9, 6, 3],
  );
  assert.ok(
    tuna.schoolProfiles.some(
      (profile) =>
        profile.count === 6 && profile.anchor.join() === "-24,-510,-830",
    ),
  );
  const sardine = SPECIES.find((species) => species.kind === "sardine");
  assert.equal(sardine.population, 128);
  assert.equal(
    sardine.schoolProfiles.filter((profile) => profile.cityResident).length,
    6,
  );
  assert.equal(
    sardine.schoolProfiles.some(
      (profile) => profile.anchor.join() === "32,-608,-968",
    ),
    false,
  );
  for (const { species, sanctuary, group, habitat, anchor } of SCHOOLS) {
    assert.equal(group.count, sanctuary.count);
    assert.deepEqual(anchor.toArray(), Object.values(sanctuary.anchor));
    assert.deepEqual([habitat.depthMin, habitat.depthMax], [684, 698]);
    assert.equal(habitat.cityResident, true);
    assert.equal(habitat.nurseryResident, false);
    const source = ECOSYSTEM_SPECIES.find(
      (entry) => entry.kind === species.kind,
    );
    for (const property of [
      "length",
      "speed",
      "nutrition",
      "growth",
      "predator",
    ])
      assert.equal(species[property], source[property]);
  }
  const player = createPlayer();
  let nurseryMeals = 0;
  let total = 0;
  for (const species of SPECIES) {
    const groups =
      species.schoolSize > 1 ? schoolPopulationGroups(species) : [];
    for (let index = 0; index < species.population; index++) {
      const group = groups.find(
        (entry) => index >= entry.start && index < entry.start + entry.count,
      );
      const habitat = group ? schoolHabitat(species, group.index) : species;
      const anchor = group
        ? habitatPosition(habitat, {
            heightAt: OCEAN.heightAt,
            colliders: OCEAN.colliders,
            anchor: initialSchoolAnchor(species, group.index),
            populationIndex: index,
          })?.add(schoolSlot(species, index - group.start))
        : initialSpeciesAnchor(species, index);
      assert.ok(anchor, `${species.kind}:${index} has no school center`);
      const point = habitatPosition(habitat, {
        heightAt: OCEAN.heightAt,
        colliders: OCEAN.colliders,
        anchor,
        populationIndex: index,
      });
      assert.ok(point, `${species.kind}:${index} has no legal position`);
      assert.ok(sharesHabitat(habitat, point, 0));
      assert.ok(
        point.y >=
          OCEAN.heightAt(point.x, point.z) + 3 + species.length * 0.35 - 1e-8,
      );
      assert.equal(blockedAt(point, species), false);
      if (isNursery(point) && canEat(player, species.length)) nurseryMeals++;
      total++;
    }
  }
  assert.equal(total, 392);
  assert.equal(nurseryMeals, 168);
});

for (const school of SCHOOLS) {
  const { species, sanctuary, group, habitat, anchor } = school;

  test(`${species.kind}: every distinct Poseidon school slot spawns at its requested underground position`, () => {
    const members = spawnMembers(school);
    assert.equal(members.length, sanctuary.count);
    assert.equal(
      new Set(members.map(({ position }) => position.toArray().join())).size,
      group.count,
    );
    for (const { position } of members) assertLegalWater(school, position);
  });

  test(`${species.kind}: the advertised Poseidon center cylinder clears full-region solids and complete fish bodies`, () => {
    // 圆柱描述鱼群中心的可游位置；每点另以整条鱼的多球形状检查，不把半径当成鱼身外包络。
    for (
      let y = sanctuary.clearance.minY;
      y <= sanctuary.clearance.maxY;
      y += 2
    ) {
      for (let radius = 0; radius <= sanctuary.clearance.radius; radius += 1) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 36) {
          const point = new THREE.Vector3(
            anchor.x + Math.cos(angle) * radius,
            y,
            anchor.z + Math.sin(angle) * radius,
          );
          for (const heading of [
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 1, z: 0 },
          ])
            assertLegalWater(school, point, { heading, inBand: false });
        }
      }
    }
  });

  test(`${species.kind}: ordinary three-dimensional school patrol remains mobile, in band and clear for three seed phases`, (t) => {
    let largestRadius = 0;
    let leastDistance = Infinity;
    for (const seed of [0, 2.3, 7.8]) {
      const members = spawnMembers(school);
      const dt = 0.04;
      // 与 main 的常规结群目标、前瞻、惯性、海床钳制和连续碰撞保持一致；无玩家逃逸/捕食控制。
      for (let frame = 0; frame < 90 / dt; frame++) {
        const time = frame * dt;
        for (const [index, member] of members.entries()) {
          const target = anchor
            .clone()
            .add(member.slot)
            .add(
              new THREE.Vector3(
                Math.sin(time * 0.2 + seed) * 8,
                Math.sin(time * 0.35 + index + seed) * 1.5,
                Math.cos(time * 0.2 + seed) * 8,
              ),
            );
          const steered = steerWithinHabitat(
            member.position,
            target.sub(member.position).normalize(),
            habitat,
            OCEAN.heightAt,
          );
          member.velocity.lerp(
            new THREE.Vector3().copy(steered),
            Math.min(1, dt * 2),
          );
          const desired = member.position
            .clone()
            .addScaledVector(member.velocity, species.speed * 0.75 * dt);
          const floor =
            OCEAN.heightAt(desired.x, desired.z) + species.length * 0.28 + 2;
          assert.ok(
            floor <= -habitat.depthMin,
            "The ordinary patrol must remain inside usable water",
          );
          desired.y = THREE.MathUtils.clamp(
            desired.y,
            Math.max(floor, -habitat.depthMax),
            -habitat.depthMin,
          );
          const contact = resolveCreatureMotion(
            member.position,
            desired,
            member.velocity,
            habitat,
            {
              colliders: OCEAN.city.colliders,
              heightAt: OCEAN.heightAt,
            },
          );
          assert.equal(contact?.stuck ?? false, false);
          const next = contact
            ? new THREE.Vector3().copy(contact.position)
            : desired;
          if (contact?.blocked) member.velocity.copy(contact.direction);
          member.distance += member.position.distanceTo(next);
          member.position.copy(next);
          assertLegalWater(school, next, {
            heading: member.velocity,
            rendered: frame % 25 === 0,
          });
          const radius = Math.hypot(next.x - anchor.x, next.z - anchor.z);
          largestRadius = Math.max(largestRadius, radius);
          assert.ok(
            radius <= sanctuary.clearance.radius,
            `${species.kind}: ordinary center radius ${radius} exceeds declared ${sanctuary.clearance.radius}`,
          );
        }
      }
      for (const member of members) {
        assert.ok(
          member.distance > 100,
          "The normal school must swim rather than freeze in place",
        );
        leastDistance = Math.min(leastDistance, member.distance);
      }
    }
    t.diagnostic(
      JSON.stringify({
        kind: species.kind,
        largestCenterRadius: largestRadius,
        leastPatrolDistance: leastDistance,
        simulatedSecondsPerSeed: 90,
        seeds: [0, 2.3, 7.8],
      }),
    );
  });

  test(`${species.kind}: ordinary respawn placement preserves every saved slot at distant and nearby player positions`, () => {
    const members = spawnMembers(school);
    for (const playerPosition of [
      new THREE.Vector3(0, -18, 75),
      new THREE.Vector3(224, -349, -464),
      new THREE.Vector3(0, -500, -840),
      anchor.clone(),
    ]) {
      for (const [index, member] of members.entries()) {
        const preferred = anchor.clone().add(member.slot);
        // main 在18秒隐藏计时后调用同一 helper；本测试只验证原始参数下的放置，不声称真实计时验收。
        const point = habitatPosition(habitat, {
          heightAt: OCEAN.heightAt,
          colliders: OCEAN.colliders,
          anchor: preferred,
          playerPosition,
          populationIndex: group.start + index,
          near: false,
        });
        assert.ok(point);
        assert.ok(point.distanceTo(preferred) < 1e-8);
        assertLegalWater(school, point);
      }
    }
  });

  test(`${species.kind}: shared habitat helpers consume traits and coordinates without requiring Atlantis or species identifiers`, () => {
    const renamed = {
      ...habitat,
      kind: "independent_review_school",
      regionId: "independent_review_region",
      citySite: "independent_review_site",
    };
    for (const { position } of spawnMembers(school)) {
      const options = {
        heightAt: OCEAN.heightAt,
        colliders: OCEAN.colliders,
        anchor: position,
      };
      assert.deepEqual(
        habitatPosition(renamed, options).toArray(),
        habitatPosition(habitat, options).toArray(),
      );
      const direction = { x: 1, y: 0.3, z: -0.7 };
      assert.deepEqual(
        steerWithinHabitat(position, direction, renamed, OCEAN.heightAt),
        steerWithinHabitat(position, direction, habitat, OCEAN.heightAt),
      );
    }
  });
}

function spawnMembers({ species, habitat, anchor, group }) {
  const center = habitatPosition(habitat, {
    heightAt: OCEAN.heightAt,
    colliders: OCEAN.colliders,
    anchor,
  });
  assert.ok(center && center.distanceTo(anchor) < 1e-8);
  return Array.from({ length: group.count }, (_, index) => {
    const preferred = center.clone().add(schoolSlot(species, index));
    const position = habitatPosition(habitat, {
      heightAt: OCEAN.heightAt,
      colliders: OCEAN.colliders,
      anchor: preferred,
      populationIndex: group.start + index,
    });
    assert.ok(position, `Missing ${species.kind} school slot ${index}`);
    assert.ok(
      position.distanceTo(preferred) < 1e-8,
      `Unexpected ${species.kind} school relocation`,
    );
    return {
      position,
      slot: position.clone().sub(center),
      velocity: new THREE.Vector3(),
      distance: 0,
    };
  });
}

function blockedAt(point, species, heading = null) {
  const radius = Math.max(0.45, species.length * 0.18);
  return isPositionBlocked(point, {
    radius,
    ...(heading ? { length: species.length, forward: heading } : {}),
    colliders: queryStaticColliders(OCEAN.colliders, point, point, {
      radius,
      padding: heading ? species.length * 0.42 : 0,
    }),
  });
}

function assertLegalWater(
  { species, habitat },
  point,
  { heading = { x: 0, y: 0, z: -1 }, inBand = true, rendered = true } = {},
) {
  const description = `${species.kind} at ${point.toArray().join(", ")}`;
  assert.ok(
    point.x > SITE.bounds.minX && point.x < SITE.bounds.maxX,
    description,
  );
  assert.ok(
    point.z > SITE.bounds.minZ && point.z < SITE.bounds.maxZ,
    description,
  );
  assert.ok(
    point.y >=
      OCEAN.heightAt(point.x, point.z) + species.length * 0.28 + 2 - 1e-8,
    description,
  );
  if (inBand) assert.ok(sharesHabitat(habitat, point, 1e-8), description);
  assert.equal(
    blockedAt(point, species, heading),
    false,
    `Solid overlap: ${description}`,
  );
  if (rendered) {
    const floor = renderedFloor(point.x, point.z);
    assert.ok(
      Number.isFinite(floor),
      `Missing rendered terrain: ${description}`,
    );
    assert.ok(
      point.y > floor + species.length * 0.28 + 2 - 1e-4,
      `Rendered terrain overlap: ${description}`,
    );
  }
}

function terrainTriangles() {
  const terrain = OCEAN.root.getObjectByName("atlantis_pearl_slate_seabed");
  assert.ok(terrain?.isMesh);
  const positions = terrain.geometry.attributes.position;
  const indices = terrain.geometry.index;
  const triangles = new Map();
  // 用实际区域海床网格三角形构造局部采样器，避免只验证解析高度或网格顶点。
  for (let index = 0; index < indices.count; index += 3) {
    const vertices = [0, 1, 2].map((offset) =>
      new THREE.Vector3().fromBufferAttribute(
        positions,
        indices.getX(index + offset),
      ),
    );
    if (
      Math.max(...vertices.map((v) => v.x)) < SITE.bounds.minX ||
      Math.min(...vertices.map((v) => v.x)) > SITE.bounds.maxX ||
      Math.max(...vertices.map((v) => v.z)) < SITE.bounds.minZ ||
      Math.min(...vertices.map((v) => v.z)) > SITE.bounds.maxZ
    )
      continue;
    const minX = Math.floor(Math.min(...vertices.map((v) => v.x)) / 4);
    const maxX = Math.floor(Math.max(...vertices.map((v) => v.x)) / 4);
    const minZ = Math.floor(Math.min(...vertices.map((v) => v.z)) / 4);
    const maxZ = Math.floor(Math.max(...vertices.map((v) => v.z)) / 4);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x}:${z}`;
        if (!triangles.has(key)) triangles.set(key, []);
        triangles.get(key).push(vertices);
      }
    }
  }
  return triangles;
}

function renderedFloor(x, z) {
  let highest = -Infinity;
  for (const [a, b, c] of RENDERED_TERRAIN.get(
    `${Math.floor(x / 4)}:${Math.floor(z / 4)}`,
  ) || []) {
    if (
      x < Math.min(a.x, b.x, c.x) - 1e-6 ||
      x > Math.max(a.x, b.x, c.x) + 1e-6 ||
      z < Math.min(a.z, b.z, c.z) - 1e-6 ||
      z > Math.max(a.z, b.z, c.z) + 1e-6
    )
      continue;
    const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    if (Math.abs(denominator) < 1e-10) continue;
    const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / denominator;
    const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / denominator;
    const w = 1 - u - v;
    if (Math.min(u, v, w) >= -1e-6)
      highest = Math.max(highest, u * a.y + v * b.y + w * c.y);
  }
  return highest;
}
