import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  BLACK_SEA_NETTLE_SPECIES,
  blackSeaNettleEcology,
} from "../src/black_sea_nettle_ecology.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { habitatPosition } from "../src/ecosystem_population.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";
import { isPositionBlocked } from "../src/collision.js";
import { WORLD } from "../src/world_config.js";
import { MARIANA_WORLD } from "../src/mariana_config.js";
import { ODYSSEY_WORLD } from "../src/odyssey_config.js";
import { creaturePitchLimit } from "../src/creature_attitude.js";
import { canEat, createPlayer } from "../src/simulation.js";

const regions = [
  ["hawaii", createOcean, WORLD, 10],
  ["bermuda", createBermudaOcean, WORLD, 6],
  ["atlantis", createAtlantisOcean, WORLD, 6],
  ["mariana", createMarianaOcean, MARIANA_WORLD, 6],
  ["odyssey", createOdysseyOcean, ODYSSEY_WORLD, 6],
];

test("black sea nettle keeps a one-metre edible bell and independent open-marine habitats", () => {
  const base = BLACK_SEA_NETTLE_SPECIES;
  assert.equal(base.length, 1);
  assert.equal(base.upright, true);
  assert.equal(creaturePitchLimit(base, { aquaticUpright: true }), 0);
  assert.equal(base.swimClearance, undefined);
  assert.equal(base.groundClearance, 4.5);
  const juvenile = createPlayer("orca", 3);
  assert.equal(canEat(juvenile, base.length), true);
  assert.equal(canEat(juvenile, 6), false);
  assert.match(base.habitatNote, /本作生态适配/);
  assert.equal(Object.isFrozen(base), true);
  for (const region of [
    "amazon",
    "europa",
    "penglai",
    "unknown",
    "toString",
    "__proto__",
  ])
    assert.equal(blackSeaNettleEcology(region, WORLD), null);
  assert.throws(() => blackSeaNettleEcology("hawaii"), /world bounds/);
  const bounds = { ...WORLD },
    a = blackSeaNettleEcology("hawaii", bounds),
    b = blackSeaNettleEcology("bermuda", WORLD);
  assert.equal(Object.isFrozen(bounds), false);
  assert.notEqual(a.worldBounds, bounds);
  assert.notEqual(a.spawnAnchors, b.spawnAnchors);
  assert.equal(Object.isFrozen(a.spawnAnchors[0]), true);
  assert.equal(Object.isFrozen(a.worldBounds), true);
});

for (const [region, create, world, count] of regions)
  test(`${region}: every large-jelly home and sampled complete hanging drift volume clears real scenery`, () => {
    const o = create(new T.Group()),
      heightAt = o.heightAt || seabedHeight,
      ownsSurface = !o.contactSurface,
      rendered =
        o.contactSurface ||
        createTerrainSurface(o.root, { fallback: heightAt }),
      species = blackSeaNettleEcology(region, world),
      point = new T.Vector3(),
      probe = new T.Vector3();
    try {
      assert.equal(species.population, count);
      assert.equal(species.spawnAnchors.length, count);
      const occupied = [];
      for (const [i, home] of species.spawnAnchors.entries()) {
        const start = habitatPosition(species, {
          heightAt,
          colliders: o.colliders,
          populationIndex: i,
          occupied,
          random: () => 0.5,
        });
        assert.ok(start, `${i}: missing initial placement`);
        assert.ok(start.distanceTo(new T.Vector3(...home)) < 1e-8);
        occupied.push(start);
        const replacement = habitatPosition(species, {
          heightAt,
          colliders: o.colliders,
          populationIndex: i,
          near: true,
          playerPosition: new T.Vector3(150, -500, -600),
          random: () => 0.5,
        });
        assert.ok(replacement.distanceTo(start) < 1e-8);
        const radius = species.residentRadius;
        for (let dx = -radius; dx <= radius; dx += 4)
          for (let dz = -radius; dz <= radius; dz += 4) {
            const remain = radius ** 2 - dx ** 2 - dz ** 2;
            if (remain < 0) continue;
            const reach = Math.sqrt(remain);
            for (const dy of [-reach, -reach * 0.5, 0, reach * 0.5, reach]) {
              point.set(
                home[0] + dx,
                Math.max(
                  heightAt(home[0] + dx, home[2] + dz) +
                    species.groundClearance,
                  Math.min(-species.depthMin, home[1] + dy),
                ),
                home[2] + dz,
              );
              for (const offset of [0, -0.8, -1.6, -2.4, -3.2]) {
                probe.copy(point);
                probe.y += offset;
                assert.equal(
                  isPositionBlocked(probe, {
                    colliders: queryStaticColliders(o.colliders, probe, probe, {
                      radius: 0.7,
                    }),
                    radius: 0.7,
                  }),
                  false,
                  `${i}: scenery in hanging drift volume`,
                );
              }
              for (let j = 0; j < 8; j++) {
                const angle = (j * Math.PI) / 4,
                  floor = rendered(
                    point.x + Math.cos(angle) * 0.7,
                    point.z + Math.sin(angle) * 0.7,
                  );
                assert.ok(
                  point.y - 3.6 > floor + 0.1,
                  `${i}: conservative 3.6 m pendant enters final terrain`,
                );
              }
            }
          }
      }
      const start = new T.Vector3(0, -18, 75);
      assert.ok(
        Math.min(
          ...species.spawnAnchors.map((p) =>
            start.distanceTo(new T.Vector3(...p)),
          ),
        ) < 25,
        "at least one large specimen is near the departure layer",
      );
    } finally {
      if (ownsSurface) rendered.dispose();
      o.dispose();
    }
  });
