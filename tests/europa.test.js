import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  EUROPA_WORLD,
  EUROPA_HABITATS,
  europaSeabedHeight,
} from "../src/europa_config.js";
import { EUROPA_SPECIES } from "../src/europa_species.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { getExpedition } from "../src/expedition_config.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import {
  createEuropaOcean,
  createEuropaOceanAsync,
} from "../src/europa_ocean.js";
import { createIceCoveredSurface } from "../src/ice_surface.js";
import { createCreature } from "../src/creatures.js";
import { needsIceRecovery, stepIceSteering } from "../src/ice_steering.js";
import { characterMovement } from "../src/character_rules.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";
import { MAX_SWIM_PITCH, stepSteering } from "../src/steering_rules.js";
import {
  TIDAL_LOOM,
  loomAngle,
  loomHeight,
  inTidalLoom,
} from "../src/europa_loom.js";
import { createHunterState, tickHunter } from "../src/hunter_rules.js";
import { t } from "../src/i18n.js";
import { createPlayer, consumePrey } from "../src/simulation.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
} from "../src/expedition_objectives.js";

test("either local Europa lord counts once, unrelated defeats and sub-30 bodies do not complete the bonus expedition", () => {
  const region = getExpedition("europa").region;
  for (const chosen of region.bossInstances) {
    const objective = createExpeditionObjective(region),
      player = createPlayer();
    player.length = 30;
    advanceExpeditionObjective(objective, player, [
      { enabled: true, id: "other_map_lord", state: { defeated: true } },
    ]);
    assert.equal(player.won, false);
    const local = { enabled: true, id: chosen.id, state: { defeated: true } };
    player.length = 29;
    advanceExpeditionObjective(objective, player, [local]);
    assert.equal(player.won, false);
    player.length = 30;
    advanceExpeditionObjective(objective, player, [local]);
    assert.equal(player.won, true);
    advanceExpeditionObjective(objective, player, [local]);
    assert.equal(objective.defeated.size, 1);
  }
});

test("Europa registers 16 exclusive ordinary kinds and two isolated persistent alien lords", () => {
  const region = getExpedition("europa").region;
  const kinds = EUROPA_SPECIES.map((s) => s.kind);
  assert.deepEqual(
    getRegionSpecies("europa").map((s) => [
      s.kind,
      s.length,
      s.nutrition,
      s.growth,
    ]),
    EUROPA_SPECIES.map((s) => [s.kind, s.length, s.nutrition, s.growth]),
  );
  assert.equal(kinds.length, 16);
  assert.equal(new Set(kinds).size, 16);
  assert.equal(
    EUROPA_SPECIES.reduce((n, s) => n + s.population, 0),
    247,
  );
  assert.ok(EUROPA_SPECIES.every((s) => s.category === "alien"));
  assert.deepEqual(region.bossKinds, ["abyss_weaver", "lumen_stalker"]);
  assert.equal(region.bossInstances.length, 2);
  assert.ok(region.bossInstances.every((b) => b.persistentDefeat));
  assert.equal(region.surfaceMode, "ice");
  assert.ok(Object.values(region.humanActivity).every((v) => v === false));
  for (const r of ["hawaii", "atlantis", "bermuda", "mariana"]) {
    assert.ok(getRegionSpecies(r).every((s) => !kinds.includes(s.kind)));
    assert.ok(
      region.bossKinds.every(
        (kind) => !getExpedition(r).region.bossKinds.includes(kind),
      ),
    );
  }
  assert.equal(BOSS_SPECIES.find((s) => s.alien).kind, "abyss_weaver");
  for (const s of EUROPA_SPECIES) {
    // 普通猎手不能误用领主保留等级；超过其体长后必须能真正结算营养。
    const eater = createPlayer();
    eater.length = s.length + 1;
    eater.mass = (eater.length / 6) ** 3;
    eater.hunger = 0;
    assert.equal(consumePrey(eater, s), true, s.kind);
    assert.ok(eater.lastMeal.nutrition > 0, s.kind);
    for (const [key, value] of Object.entries(s))
      if (typeof value === "string" && /[\u3400-\u9fff]/u.test(value))
        assert.ok(
          !/[\u3400-\u9fff]/u.test(t(value, [], "en")),
          `${s.kind}.${key}`,
        );
    if (s.predator) {
      const state = createHunterState(s, 1);
      assert.equal(state.enabled, true);
      tickHunter(state, 25, { hunting: true, distance: 20 });
      assert.ok(state.triggerCount > 0);
    }
  }
});

test("enclosed surface has no actors/flight and constrains the whole tilted body", () => {
  const surface = createIceCoveredSurface();
  assert.deepEqual(surface.birds, []);
  assert.deepEqual(surface.ships, []);
  assert.equal(surface.move().airborne, false);
  for (const length of [3, 15, 30])
    for (const pitch of [0, 0.7, MAX_SWIM_PITCH]) {
      const forward = { x: 0, y: Math.sin(pitch), z: -Math.cos(pitch) };
      const top =
        surface.ceilingHeight(length, forward) +
        bodyRadius(length) +
        Math.abs(forward.y) * Math.max(0, length * 0.42 - bodyRadius(length));
      assert.ok(top <= EUROPA_WORLD.surfaceY - 0.39);
    }
  surface.dispose();
  surface.dispose();
});

test("actual full-body roof contact recovers both characters without leveling free water", () => {
  const surface = createIceCoveredSurface(),
    colliders = [
      { type: "box", x: 0, y: 19, z: 0, halfSize: { x: 330, y: 15, z: 600 } },
    ];
  for (const character of ["orca", "squid"])
    for (const length of [3, 15, 30])
      for (const fps of [20, 60, 120]) {
        let p = { x: 0, y: -length * 0.42 - 1, z: 0 },
          o = { yaw: 0, pitch: MAX_SWIM_PITCH },
          recovering = false,
          triggered = false;
        for (let i = 0; i < fps * 2; i++) {
          const movement = characterMovement(character, false),
            input = { x: 0, y: 0 };
          if (recovering) {
            o = stepIceSteering(o, input, movement, 1 / fps);
            recovering = o.recovering;
          } else o = stepSteering(o, input, movement, 1 / fps);
          const f = { x: 0, y: Math.sin(o.pitch), z: -Math.cos(o.pitch) },
            desired = {
              x: 0,
              y: p.y + (f.y * 12) / fps,
              z: p.z + (f.z * 12) / fps,
            };
          const result = resolveMotion(p, desired, {
            colliders,
            radius: bodyRadius(length),
            length,
            forward: f,
            maxY: surface.ceilingHeight(length, f),
            floorHeight: () => -900,
          });
          assert.equal(result.stuck, false);
          assert.equal(
            isPositionBlocked(result.position, {
              colliders,
              radius: bodyRadius(length),
              length,
              forward: f,
            }),
            false,
          );
          if (
            needsIceRecovery(o.pitch, {
              desiredY: desired.y,
              position: result.position,
              ceilingY: surface.ceilingHeight(length, f),
              contacts: result.contacts,
            })
          )
            recovering = triggered = true;
          p = result.position;
        }
        assert.ok(triggered, `${character} ${length} ${fps}`);
        assert.equal(o.pitch, 0);
        assert.ok(p.z < -12);
      }
  assert.equal(
    needsIceRecovery(1.4, { desiredY: -40, position: { y: -40 }, ceilingY: 0 }),
    false,
  );
  assert.equal(
    needsIceRecovery(1.4, {
      desiredY: 1,
      position: { y: 0 },
      ceilingY: 0,
      jet: true,
    }),
    false,
  );
});

test("staged preparation matches the synchronous floor/solids and cleans a canceled build", async () => {
  const a = new THREE.Group(),
    b = new THREE.Group();
  const sync = createEuropaOcean(a);
  let yields = 0,
    steps = 0;
  const async = await createEuropaOceanAsync(b, {
    budgetMs: 0,
    yieldTask: async () => yields++,
    onStep: () => steps++,
  });
  assert.ok(yields > 20 && yields === steps);
  assert.deepEqual(sync.colliders, async.colliders);
  for (const root of [sync.root, async.root])
    root.traverse((m) => {
      if (m.name !== "europa_lowest_ground") return;
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 137)
        assert.ok(
          Math.abs(p.getY(i) - europaSeabedHeight(p.getX(i), p.getZ(i))) <
            0.001,
        );
    });
  assert.equal(EUROPA_HABITATS.length, 5);
  const cancel = new THREE.Group();
  await assert.rejects(
    createEuropaOceanAsync(cancel, {
      budgetMs: 0,
      yieldTask: async () => {
        throw new Error("cancel-test");
      },
    }),
    /cancel-test/,
  );
  assert.equal(cancel.children.length, 0);
  sync.dispose();
  sync.dispose();
  async.dispose();
  assert.equal(a.children.length, 0);
  assert.equal(b.children.length, 0);
});

test("all alien models keep configured axial lengths, bounded animation and shared immutable geometry", () => {
  for (const s of [...EUROPA_SPECIES, ...BOSS_SPECIES.filter((s) => s.alien)]) {
    const a = createCreature(s.kind, s.length, 2),
      b = createCreature(s.kind, s.length, 2),
      geometries = new Set();
    a.traverse((m) => {
      if (m.isMesh) geometries.add(m.geometry);
    });
    b.traverse((m) => {
      if (m.isMesh) assert.ok(geometries.has(m.geometry));
    });
    const original = new THREE.Box3()
      .setFromObject(a)
      .getSize(new THREE.Vector3());
    assert.ok(Math.abs(original.z - s.length) < s.length * 0.003, s.kind);
    for (let i = 0; i < 60; i++) a.userData.animate(i / 10, 2);
    const moving = new THREE.Box3()
      .setFromObject(a)
      .getSize(new THREE.Vector3());
    assert.ok(
      moving.y > original.y * 0.4 &&
        moving.y < Math.max(original.y * 3, s.length * 0.8),
      `${s.kind}: normalized breath scale`,
    );
    const anatomy = a.getObjectByName(
      s.kind === "abyss_weaver"
        ? "weaver_continuous_mantle"
        : `${s.kind}_anatomy`,
    );
    assert.ok(
      Math.abs(anatomy.scale.y / anatomy.scale.z - 1) < 0.04,
      `${s.kind}: preserved normalized breathing scale`,
    );
    assert.ok(moving.z > s.length * 0.8 && moving.z < s.length * 1.2, s.kind);
    if (s.kind === "abyss_weaver")
      assert.ok(original.x >= 80 && original.x <= 95);
    a.traverse((m) => {
      if (m.isMesh) assert.ok(geometries.has(m.geometry));
    });
  }
});

test("Tidal Loom sectors match rotating warning geometry and leave radial/vertical escape gaps", () => {
  const origin = { x: 0, y: -700, z: 0 },
    heading = { x: 0, z: -1 };
  for (const timer of [0, 0.6, 1.8])
    for (let i = 0; i < 3; i++) {
      const angle = loomAngle(heading, timer, 1.8, true, i),
        point = (a) => ({
          x: Math.cos(a) * 55,
          y: -700 + loomHeight(i),
          z: Math.sin(a) * 55,
        });
      assert.equal(
        inTidalLoom(point(angle), origin, heading, timer, 1.8),
        true,
      );
      assert.equal(
        inTidalLoom(point(angle + Math.PI / 3), origin, heading, timer, 1.8),
        false,
      );
      assert.equal(
        inTidalLoom(
          { ...point(angle), y: -700 + loomHeight(i) - 20 },
          origin,
          heading,
          timer,
          1.8,
        ),
        false,
      );
      assert.equal(
        inTidalLoom({ x: 0, y: -700, z: 0 }, origin, heading, timer, 1.8),
        false,
      );
    }
  assert.ok(TIDAL_LOOM.halfAngle < Math.PI / 3);
});

test("authored main descent and both arch loops admit adult full bodies in both directions", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  const routes = [
    EUROPA_HABITATS.map((h) => h.anchor),
    [
      [-115, -105, -120],
      [-115, -105, -215],
    ],
    [
      [115, -292, -350],
      [115, -310, -430],
    ],
    [
      [-110, -530, -540],
      [-110, -540, -650],
    ],
  ];
  for (const route of routes)
    for (const reverse of [false, true])
      for (const length of [3, 15, 30]) {
        const points = reverse ? [...route].reverse() : route;
        for (let j = 1; j < points.length; j++) {
          const a = new THREE.Vector3(...points[j - 1]),
            b = new THREE.Vector3(...points[j]),
            f = b.clone().sub(a).normalize();
          let position = a;
          const steps = Math.ceil(a.distanceTo(b));
          for (let i = 1; i <= steps; i++) {
            const desired = a.clone().lerp(b, i / steps);
            const result = resolveMotion(position, desired, {
              colliders: ocean.colliders,
              radius: bodyRadius(length),
              length,
              forward: f,
              floorHeight: (x, z) =>
                europaSeabedHeight(x, z) +
                bodyRadius(length) +
                Math.abs(f.y) *
                  Math.max(0, length * 0.42 - bodyRadius(length)) +
                0.4,
            });
            assert.equal(result.stuck, false);
            assert.ok(
              new THREE.Vector3(
                result.position.x,
                result.position.y,
                result.position.z,
              ).distanceTo(desired) < 0.01,
              `route ${j} ${length}m ${reverse}: ${desired.toArray()}`,
            );
            position = result.position;
          }
        }
      }
  ocean.dispose();
});

test("crashed research gallery admits full bodies through both open ends and its hull remains solid", () => {
  const ocean = createEuropaOcean(new THREE.Group()),
    route = ocean.researchWreck.route;
  for (const length of [3, 16, 30])
    for (const reverse of [false, true]) {
      const points = reverse ? [...route].reverse() : route;
      for (let s = 1; s < points.length; s++) {
        const from = points[s - 1],
          to = points[s],
          forward = to.clone().sub(from).normalize();
        let position = from;
        for (let i = 1; i <= 54; i++) {
          const desired = from.clone().lerp(to, i / 54),
            result = resolveMotion(position, desired, {
              colliders: ocean.colliders,
              radius: bodyRadius(length),
              length,
              forward,
              floorHeight: (x, z) =>
                ocean.heightAt(x, z) + bodyRadius(length) + 0.4,
            });
          assert.equal(result.stuck, false);
          assert.equal(result.contacts.length, 0);
          assert.ok(
            new THREE.Vector3(
              result.position.x,
              result.position.y,
              result.position.z,
            ).distanceTo(desired) < 0.01,
          );
          position = result.position;
        }
      }
    }
  for (const [x, y, z] of ocean.researchWreck.feet)
    assert.ok(Math.abs(y - ocean.heightAt(x, z) - 0.35) < 0.0001);
  const panel = ocean.colliders.find((c) =>
    c.id?.startsWith("europa_wreck_panel"),
  );
  assert.ok(
    isPositionBlocked(
      { x: panel.x, y: panel.y, z: panel.z },
      { colliders: ocean.colliders, radius: 0.65 },
    ),
  );
  assert.equal(ocean.root.children.filter((c) => c.isPointLight).length, 3);
  assert.equal(ocean.mineralHabitats.length, 8);
  const crystal = ocean.colliders.find((c) =>
    c.id?.startsWith("europa_crystal"),
  );
  assert.ok(
    isPositionBlocked(crystal.a.clone().lerp(crystal.b, 0.4), {
      colliders: ocean.colliders,
      radius: 0.65,
    }),
  );
  ocean.dispose();
  ocean.dispose();
});

test("canceling after wreck construction removes its world supports and disposes owned resources", async () => {
  const parent = new THREE.Group();
  let label;
  const disposed = new Set();
  await assert.rejects(
    createEuropaOceanAsync(parent, {
      budgetMs: 0,
      onStep(s) {
        label = s;
        parent.traverse((n) => {
          if (n.isMesh) {
            for (const resource of [
              n.geometry,
              ...(Array.isArray(n.material) ? n.material : [n.material]),
            ])
              if (!resource.userData?.disposalWatched) {
                resource.userData ??= {};
                resource.userData.disposalWatched = true;
                resource.addEventListener("dispose", () =>
                  disposed.add(resource),
                );
              }
          }
        });
      },
      yieldTask: async () => {
        if (label === "research-gallery") throw Error("wreck-cancel");
      },
    }),
    /wreck-cancel/,
  );
  assert.equal(parent.children.length, 0);
  assert.ok(disposed.size > 15);
});
