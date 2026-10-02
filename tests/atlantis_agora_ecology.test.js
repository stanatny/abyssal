import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import {
  ATLANTIS_EXCAVATION_SITES,
  atlantisSeabedHeight,
} from "../src/atlantis_terrain.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
  sharesHabitat,
} from "../src/ecosystem_population.js";
import {
  resolveCreatureMotion,
  steerWithinHabitat,
} from "../src/navigation.js";
import { isPositionBlocked } from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";
import { seabedHeight } from "../src/ocean.js";

const SITE = ATLANTIS_EXCAVATION_SITES.find(
  (site) => site.reservation === "agora_bridges",
);
const SANCTUARY = SITE.fishSanctuary;
const SPECIES = getRegionSpecies("atlantis").find(
  (species) => species.kind === SANCTUARY.species,
);
const GROUP = schoolPopulationGroups(SPECIES).find(
  ({ index }) => schoolHabitat(SPECIES, index).citySite === SITE.reservation,
);
const HABITAT = schoolHabitat(SPECIES, GROUP.index);
const ANCHOR = initialSchoolAnchor(SPECIES, GROUP.index);
const CITY = createAtlantisCity(new THREE.Scene(), {
  heightAt: atlantisSeabedHeight,
});
const RADIUS = Math.max(0.45, SPECIES.length * 0.18);

after(() => CITY.dispose());

test("Agora hosts twelve spadefish in the same bounded lower-cistern sanctuary", () => {
  assert.equal(GROUP.count, 12);
  assert.equal(GROUP.count, Math.ceil(SANCTUARY.count * 1.5));
  assert.equal(SPECIES.length, 0.75);
  assert.equal(SPECIES.nutrition, 8);
  assert.equal(SPECIES.growth, 0.018);
  assert.deepEqual(ANCHOR.toArray(), [
    SANCTUARY.anchor.x,
    SANCTUARY.anchor.y,
    SANCTUARY.anchor.z,
  ]);
  assert.deepEqual(
    [HABITAT.depthMin, HABITAT.depthMax],
    [-ANCHOR.y - SANCTUARY.band, -ANCHOR.y + SANCTUARY.band],
  );
  assert.equal(SANCTUARY.band, 6);
  assert.equal(HABITAT.cityResident, true);
  assert.equal(HABITAT.nurseryResident, false);
  assert.ok(ANCHOR.y < seabedHeight(ANCHOR.x, ANCHOR.z) - 10);
  assertLegalWater(ANCHOR);
});

test("The advertised Agora fish clearance contains legal water throughout the full-city geometry", () => {
  // 检查整个圆柱而非仅群心；采样实际坑壁、回廊和陈设形成的净水域。
  for (
    let y = SANCTUARY.clearance.minY;
    y <= SANCTUARY.clearance.maxY;
    y += 2
  ) {
    for (let radius = 0; radius <= SANCTUARY.clearance.radius; radius += 2) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 18) {
        assertLegalWater(
          new THREE.Vector3(
            ANCHOR.x + Math.cos(angle) * radius,
            y,
            ANCHOR.z + Math.sin(angle) * radius,
          ),
          false,
        );
      }
    }
  }
});

test("All twelve Agora school slots stay distinct and clear terrain, masonry and furniture", () => {
  const points = spawnMembers();
  assert.equal(new Set(points.map((point) => point.toArray().join())).size, 12);
  for (const point of points) assertLegalWater(point);
});

test("A minute of ordinary Agora school patrol preserves underground water, feeding depth and collision", () => {
  const members = spawnMembers().map((position, index) => ({
    position,
    slot: schoolSlot(SPECIES, index),
    velocity: new THREE.Vector3(),
    distance: 0,
  }));
  const dt = 0.04;
  // 复用结群目标、转向与连续碰撞；真实逃逸、捕食和18秒计时由浏览器脚本覆盖。
  for (let frame = 0; frame < 60 / dt; frame++) {
    const time = frame * dt;
    for (const [index, member] of members.entries()) {
      const target = ANCHOR.clone()
        .add(member.slot)
        .add(
          new THREE.Vector3(
            Math.sin(time * 0.2) * 8,
            Math.sin(time * 0.35 + index) * 1.5,
            Math.cos(time * 0.2) * 8,
          ),
        );
      const steering = steerWithinHabitat(
        member.position,
        target.sub(member.position).normalize(),
        HABITAT,
        atlantisSeabedHeight,
      );
      member.velocity.lerp(new THREE.Vector3().copy(steering), dt * 2);
      const desired = member.position
        .clone()
        .addScaledVector(member.velocity, SPECIES.speed * 0.75 * dt);
      const contact = resolveCreatureMotion(
        member.position,
        desired,
        member.velocity,
        HABITAT,
        { colliders: CITY.colliders, heightAt: atlantisSeabedHeight },
      );
      const next = contact
        ? new THREE.Vector3().copy(contact.position)
        : desired;
      if (contact?.blocked) member.velocity.copy(contact.direction);
      member.distance += member.position.distanceTo(next);
      member.position.copy(next);
      if (frame % 25 === 0) assertLegalWater(member.position);
    }
  }
  for (const member of members) {
    assertLegalWater(member.position);
    assert.ok(member.distance > 30, "The school must patrol rather than stick");
  }
});

test("Agora respawn placement reuses every saved school slot across distant player viewpoints", () => {
  for (const playerPosition of [
    new THREE.Vector3(0, -18, 75),
    new THREE.Vector3(-220, -175, -240),
    new THREE.Vector3(0, -500, -840),
  ]) {
    for (let index = 0; index < GROUP.count; index++) {
      const preferred = ANCHOR.clone().add(schoolSlot(SPECIES, index));
      // 对齐main的正常群体复活参数，不缩短隐藏计时、不搬动群心。
      const point = habitatPosition(HABITAT, {
        heightAt: atlantisSeabedHeight,
        colliders: CITY.colliders,
        anchor: preferred,
        playerPosition,
        populationIndex: GROUP.start + index,
        near: false,
      });
      assert.ok(point);
      assert.ok(point.distanceTo(preferred) < 1e-8);
      assertLegalWater(point);
    }
  }
});

function spawnMembers() {
  const center = habitatPosition(HABITAT, {
    heightAt: atlantisSeabedHeight,
    colliders: CITY.colliders,
    anchor: ANCHOR,
  });
  assert.ok(center && center.distanceTo(ANCHOR) < 1e-8);
  return Array.from({ length: GROUP.count }, (_, index) => {
    const preferred = center.clone().add(schoolSlot(SPECIES, index));
    const point = habitatPosition(HABITAT, {
      heightAt: atlantisSeabedHeight,
      colliders: CITY.colliders,
      anchor: preferred,
      populationIndex: GROUP.start + index,
    });
    assert.ok(point, `Missing Agora school member ${index}`);
    assert.ok(point.distanceTo(preferred) < 1e-8);
    return point;
  });
}

function assertLegalWater(point, inHabitat = true) {
  const description = point.toArray().join(", ");
  assert.ok(point.x > SITE.bounds.minX && point.x < SITE.bounds.maxX);
  assert.ok(point.z > SITE.bounds.minZ && point.z < SITE.bounds.maxZ);
  assert.ok(
    point.y >= atlantisSeabedHeight(point.x, point.z) + 3,
    `Terrain overlaps the Agora sanctuary at ${description}`,
  );
  assert.ok(point.y < seabedHeight(point.x, point.z));
  if (inHabitat) assert.ok(sharesHabitat(HABITAT, point, 1e-8));
  assert.equal(
    isPositionBlocked(point, {
      radius: RADIUS,
      colliders: queryStaticColliders(CITY.colliders, point, point, {
        radius: RADIUS,
      }),
    }),
    false,
    `A city solid overlaps the Agora sanctuary at ${description}`,
  );
}
