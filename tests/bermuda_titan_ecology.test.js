import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  BERMUDA_TITAN_GUARD_HOMES,
  fitBermudaExpansionEcology,
} from "../src/bermuda_ecology.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  steerResidentHabitat,
} from "../src/ecosystem_population.js";
import { canPredatorHunt, isNursery } from "../src/nursery_rules.js";
import {
  createHunterState,
  tickHunter,
  getHunterAbility,
} from "../src/hunter_rules.js";
import { isPositionBlocked } from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";
import { preyRespawnDelay } from "../src/regional_rare.js";
import {
  steerWithinHabitat,
  resolveCreatureMotion,
} from "../src/navigation.js";
import { turnSwimmingBody } from "../src/swimming_spacing.js";
import { swimmingFloorHeight } from "../src/swimming_clearance.js";
import { BERMUDA_LORD_SITES } from "../src/bermuda_lord_sites.js";

const roster = getRegionSpecies("bermuda"),
  guard = roster.find((s) => s.kind === "ichthyotitan");
let ocean;
after(() => ocean?.dispose());
function world() {
  if (!ocean) {
    ocean = createBermudaOcean(new T.Group());
  }
  assert.ok(
    ocean.root.parent && ocean.colliders.length > 0,
    "Every ecology case must retain actual live colliders",
  );
  return ocean;
}

test("The titan quest retains four original guards and explicitly adds two Ichthyotitan lair guards", () => {
  assert.equal(
    roster.reduce((n, s) => n + s.population, 0),
    1082,
  );
  assert.equal(guard.population, 6);
  assert.deepEqual(
    guard.spawnAnchors.slice(0, 4),
    BERMUDA_LORD_SITES.map((site) => site.guardHome),
  );
  assert.deepEqual(guard.spawnAnchors.slice(4), BERMUDA_TITAN_GUARD_HOMES);
  assert.equal(guard.length, 28);
  assert.equal(guard.depthMax, 680);
  assert.equal(guard.residentRadius, 25);
  assert.equal(guard.swimClearance, 0.55);
  assert.deepEqual(fitBermudaExpansionEcology(roster), roster);
  assert.equal(
    getRegionSpecies("atlantis").find((s) => s.kind === "ichthyotitan")
      .population,
    3,
  );
});

test("Both added guards occupy legal whole-body lair water and replenish at their own homes", () => {
  const ocean = world(),
    cave = ocean.caves.records.find((r) => r.id === "kaiju_lair");
  for (const index of [4, 5]) {
    const home = initialSpeciesAnchor(guard, index),
      position = habitatPosition(guard, {
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
        populationIndex: index,
        random: () => 0.5,
      });
    assert.ok(
      position?.distanceTo(home) < 1e-6,
      `${index}: no fallback placement`,
    );
    assert.ok(cave.contains(position, guard.length * guard.swimClearance));
    assert.ok(position.y - ocean.contactSurface(position.x, position.z) > 30);
    assert.ok(-position.y >= guard.depthMin && -position.y <= guard.depthMax);
    for (const forward of [
      [0, 0, -1],
      [0, 0, 1],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0.7, -0.7],
    ]) {
      const radius = guard.length * guard.swimClearance;
      assert.equal(
        isPositionBlocked(position, {
          radius,
          length: guard.length,
          forward: new T.Vector3(...forward),
          colliders: [
            ...queryStaticColliders(ocean.colliders, position, position, {
              radius,
              padding: guard.length * 0.42,
            }),
            ...(ocean.dynamicContacts?.(position, position, {
              radius,
              padding: guard.length * 0.42,
            }) || []),
          ],
        }),
        false,
        `${index}: wide moving body starts clear`,
      );
    }
    const returned = habitatPosition(guard, {
      heightAt: ocean.heightAt,
      colliders: ocean.colliders,
      populationIndex: index,
      near: true,
      playerPosition: new T.Vector3(0, -18, 75),
      random: () => 0.5,
    });
    assert.ok(returned?.distanceTo(home) < 1e-6);
    assert.equal(preyRespawnDelay(guard), 28);
    assert.equal(isNursery(home), false);
  }
});

test("Added guards use actual ordinary retaliatory abilities and keep the protected nursery excluded", () => {
  for (const index of [4, 5]) {
    const home = initialSpeciesAnchor(guard, index),
      nearby = home.clone().add(new T.Vector3(8, 0, 0)),
      hunter = createHunterState(guard, `titan-${index}`);
    assert.equal(canPredatorHunt(guard, index, home, nearby), true);
    assert.equal(
      canPredatorHunt(guard, index, home, new T.Vector3(0, -18, 75)),
      false,
    );
    assert.equal(hunter.enabled, true);
    assert.equal(hunter.ability, getHunterAbility(guard));
    const phases = new Set();
    for (let i = 0; i < 1000; i++) {
      tickHunter(hunter, 0.05, {
        hunting: true,
        distance: 12,
        lineOfSight: true,
        playerAlive: true,
      });
      phases.add(hunter.phase);
    }
    assert.ok(
      phases.has("windup") && phases.has("active") && phases.has("recover"),
    );
    assert.ok(hunter.triggerCount > 0);
  }
});

test("Two new guards, four roof-cleared residents and one cargo-clearance resident complete normal shared patrol then replenish legally", (t) => {
  const ocean = world(),
    dt = 1 / 30,
    collisionSkin = 0.025,
    stats = {
      poseRecoveries: 0,
      maxPoseProjection: 0,
      maxRotationSweep: 0,
      maxPoseCase: null,
    },
    cases = [
      [guard, 4],
      [guard, 5],
      [roster.find((s) => s.kind === "octopus"), 10],
      [roster.find((s) => s.kind === "sperm_whale"), 11],
      [roster.find((s) => s.kind === "pliosaur"), 5],
      [roster.find((s) => s.kind === "mosasaur"), 3],
      [roster.find((s) => s.kind === "megalodon"), 10],
    ];
  for (const [s, index] of cases)
    for (const initialHeading of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const home = initialSpeciesAnchor(s, index),
        mesh = new T.Group(),
        entity = {
          species: s,
          populationIndex: index,
          mesh,
          velocity: new T.Vector3(),
        },
        position = home.clone();
      mesh.rotation.y = -initialHeading;
      let heading = initialHeading,
        travel = 0,
        avoidUntil = 0,
        avoid = new T.Vector3(),
        previousBodyHeading = new T.Vector3(
          Math.sin(initialHeading),
          0,
          -Math.cos(initialHeading),
        );
      for (let step = 0; step < 2400; step++) {
        const elapsed = step * dt,
          previous = position.clone();
        heading += Math.sin(elapsed * 0.18 + index * 0.81) * dt * 0.17;
        const direction = new T.Vector3(
          Math.sin(heading),
          Math.sin(elapsed * 0.32 + index * 0.81) * 0.08,
          -Math.cos(heading),
        );
        direction.copy(steerResidentHabitat(s, index, position, direction));
        direction.copy(
          steerWithinHabitat(position, direction, s, ocean.heightAt),
        );
        heading = Math.atan2(direction.x, -direction.z);
        if (s.swimClearance > 0) {
          if (avoidUntil > elapsed) direction.copy(avoid);
          turnSwimmingBody(entity, direction, dt);
        } else entity.velocity.lerp(direction, dt * 2);
        position.addScaledVector(entity.velocity, s.speed * dt);
        const floor = swimmingFloorHeight(
          position.x,
          position.z,
          s,
          ocean.heightAt,
          Math.max(
            s.length * 0.28 + 2,
            s.length * (s.swimClearance || 0) + 0.15,
          ),
        );
        position.y = Math.min(
          -s.depthMin,
          Math.max(floor, -s.depthMax, position.y),
        );
        // 求解器验证本帧实体朝向；返回direction只是下一帧沿墙游动的意图。
        const bodyHeading = entity.velocity.clone().normalize();
        const contact = resolveCreatureMotion(
          previous,
          position,
          entity.velocity,
          s,
          {
            colliders: ocean.navigationColliders,
            dynamicContacts: ocean.dynamicContacts,
            heightAt: ocean.heightAt,
          },
        );
        const label = `${s.kind}/${index}/${initialHeading}/${step}`;
        if (contact) {
          assert.equal(contact.stuck, false, `${label}: no trapped body`);
          position.copy(contact.position);
          if (contact.blocked) {
            entity.velocity.copy(contact.direction);
            heading = Math.atan2(contact.direction.x, -contact.direction.z);
          }
        }
        if (s.swimClearance > 0) {
          const actual = position.clone().sub(previous),
            facing = new T.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
          if (
            actual.lengthSq() > 1e-8 &&
            actual.normalize().dot(facing) < 0.94
          ) {
            if (!(avoidUntil > elapsed)) {
              avoid.copy(actual);
              avoidUntil = elapsed + 0.8;
            }
            position.copy(previous);
          }
        }
        const radius = Math.max(0.45, s.length * (s.swimClearance ?? 0.18));
        assert.equal(
          isPositionBlocked(position, {
            radius,
            length: s.length,
            forward: bodyHeading,
            colliders: [
              ...queryStaticColliders(ocean.colliders, position, position, {
                radius,
                padding: s.length * 0.42,
              }),
              ...(ocean.dynamicContacts?.(position, position, {
                radius,
                padding: s.length * 0.42,
              }) || []),
            ],
          }),
          false,
          `${label}: full moving body at the validated current heading`,
        );
        assert.ok(
          -position.y >= s.depthMin && -position.y <= s.depthMax,
          `${label}: original layer`,
        );
        const distance = position.distanceTo(previous),
          floorProjection = Math.max(0, floor - previous.y);
        let translationStart = previous;
        if (contact?.recovered) {
          // 航向变化会让长胶囊轻触墙；单独核验原地转身的真实投影，不给游速增加余量。
          const pose = resolveCreatureMotion(
              previous,
              previous,
              bodyHeading,
              s,
              {
                colliders: ocean.navigationColliders,
                dynamicContacts: ocean.dynamicContacts,
                heightAt: ocean.heightAt,
              },
            ),
            start = new T.Vector3().copy(pose?.position ?? previous),
            projection = start.distanceTo(previous),
            extent = Math.max(0, s.length * 0.42 - radius),
            rotationSweep =
              extent * previousBodyHeading.distanceTo(bodyHeading);
          assert.equal(pose?.stuck, false, `${label}: no trapped turn`);
          assert.ok(
            // collision.js恢复后沿法线保留既有2.5厘米skin；这不是平移游速余量。
            projection <=
              rotationSweep + floorProjection + collisionSkin + 1e-4,
            `${label}: bounded pose projection ${JSON.stringify({ projection, rotationSweep, floorProjection })}`,
          );
          stats.poseRecoveries++;
          if (projection > stats.maxPoseProjection) {
            stats.maxPoseProjection = projection;
            stats.maxPoseCase = label;
          }
          stats.maxRotationSweep = Math.max(
            stats.maxRotationSweep,
            rotationSweep,
          );
          translationStart = start;
        }
        // 共用海床支撑可沿斜坡抬升；普通平移仍受原有每步游速上限约束。
        const translation = position.distanceTo(translationStart),
          horizontal = Math.hypot(
            position.x - translationStart.x,
            position.z - translationStart.z,
          ),
          translationFloor = Math.max(0, floor - translationStart.y);
        assert.ok(
          horizontal <= s.speed * dt + 1e-5 &&
            translation <= s.speed * dt + translationFloor + 1e-5,
          `${label}: continuous bounded motion ${JSON.stringify({ distance, translation, previous: previous.toArray(), position: position.toArray(), contacts: contact?.contacts.map((c) => c.collider?.id) })}`,
        );
        previousBodyHeading.copy(bodyHeading);
        travel += distance;
      }
      assert.ok(
        travel > Math.min(200, s.speed * 25),
        `${s.kind}/${index}: real patrol progress`,
      );
      const returned = habitatPosition(s, {
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
        populationIndex: index,
        near: true,
        playerPosition: new T.Vector3(0, -18, 75),
        random: () => 0.5,
      });
      assert.ok(
        returned?.distanceTo(home) < 1e-6,
        `${s.kind}/${index}: bounded original-home replenishment`,
      );
    }
  t.diagnostic(JSON.stringify(stats));
});
