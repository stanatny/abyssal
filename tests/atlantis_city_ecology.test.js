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
  (site) => site.reservation === "harbor_sanctuary",
);
const LOWER = SITE.levels.find(
  (level) => level.id === SITE.turningCircle.level,
);
const SPECIES = getRegionSpecies("atlantis").find(
  (species) => species.kind === "spadefish",
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

test("Harbor retains its eight underground fish while other schools follow their own habitats", () => {
  assert.equal(GROUP.count, 8);
  assert.deepEqual(ANCHOR.toArray(), [
    SITE.turningCircle.x,
    SITE.turningCircle.y,
    SITE.turningCircle.z,
  ]);
  assert.ok(ANCHOR.y < seabedHeight(ANCHOR.x, ANCHOR.z) - 10);
  assert.ok(-HABITAT.depthMax > LOWER.floorY + 3);
  assert.ok(-HABITAT.depthMin < LOWER.ceilingY - 3);
  assert.equal(HABITAT.depthMax - HABITAT.depthMin, 12);
  assert.equal(HABITAT.cityResident, true);
  assert.equal(HABITAT.nurseryResident, false);
  const agora = ATLANTIS_EXCAVATION_SITES.find(
    (site) => site.reservation === "agora_bridges",
  ).fishSanctuary.anchor;
  for (const [site, expected] of [
    ["agora_bridges", [agora.x, agora.y, agora.z]],
    ["memorial_terrace", [-215, -628.57513325, -999.5]],
  ]) {
    assert.deepEqual(
      SPECIES.schoolProfiles.find((profile) => profile.citySite === site)
        .anchor,
      expected,
    );
  }
});

test("All eight lower-hall spawn slots clear the real terrain, masonry and furniture", () => {
  const points = spawnMembers();
  assert.equal(new Set(points.map((point) => point.toArray().join())).size, 8);
  for (const point of points) assertInsideHall(point);
});

test("A minute of school movement stays below the old seabed with legal depth and collision", () => {
  const members = spawnMembers().map((position, index) => ({
    position,
    slot: schoolSlot(SPECIES, index),
    velocity: new THREE.Vector3(),
    distance: 0,
  }));
  const dt = 0.04;
  // 复用实际导航/连续碰撞；输入为正常结群目标，不替代浏览器内捕食与计时验收。
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
      const direction = target.sub(member.position).normalize();
      const steering = steerWithinHabitat(
        member.position,
        direction,
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
      if (frame % 25 === 0) assertInsideHall(member.position);
    }
  }
  for (const member of members) {
    assertInsideHall(member.position);
    assert.ok(member.distance > 30, "The school must patrol rather than stick");
  }
});

test("School respawn placement reuses the lower hall rather than the old gallery or player position", () => {
  for (const playerPosition of [
    new THREE.Vector3(0, -18, 75),
    new THREE.Vector3(-220, -175, -240),
    new THREE.Vector3(0, -500, -840),
  ]) {
    for (let index = 0; index < GROUP.count; index++) {
      const preferred = ANCHOR.clone().add(schoolSlot(SPECIES, index));
      // main 的鱼群复活调用以保存的群心+队形为 anchor，并保持 near=false。
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
      assertInsideHall(point);
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
    const point = habitatPosition(HABITAT, {
      heightAt: atlantisSeabedHeight,
      colliders: CITY.colliders,
      anchor: center.clone().add(schoolSlot(SPECIES, index)),
      populationIndex: GROUP.start + index,
    });
    assert.ok(point, `Missing lower-hall school member ${index}`);
    return point;
  });
}

function assertInsideHall(point) {
  assert.ok(point.x > SITE.bounds.minX && point.x < SITE.bounds.maxX);
  assert.ok(point.z > SITE.bounds.minZ && point.z < SITE.bounds.maxZ);
  assert.ok(point.y > atlantisSeabedHeight(point.x, point.z) + 3);
  assert.ok(point.y < LOWER.ceilingY - RADIUS);
  assert.ok(point.y < seabedHeight(point.x, point.z));
  assert.ok(sharesHabitat(HABITAT, point, 1e-8));
  assert.equal(
    isPositionBlocked(point, {
      radius: RADIUS,
      colliders: queryStaticColliders(CITY.colliders, point, point, {
        radius: RADIUS,
      }),
    }),
    false,
  );
}
