import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPlayer, canEat } from "../src/simulation.js";
import { REGIONS } from "../src/expedition_config.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { BERMUDA_SPECIES } from "../src/bermuda_species.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createBermudaWreck, WRECK_ROUTES } from "../src/bermuda_wreck.js";
import { createBermudaFleet } from "../src/bermuda_fleet.js";
import { createBermudaWeather } from "../src/bermuda_weather.js";
import { createHumanActivity } from "../src/human_activity.js";
import { createCreature } from "../src/creatures.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
  castSegment,
} from "../src/collision.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  initialSchoolAnchor,
  schoolPopulationGroups,
  schoolHabitat,
  schoolSlot,
} from "../src/ecosystem_population.js";
import { isNursery, canPredatorHunt } from "../src/nursery_rules.js";
import {
  BERMUDA_HAZARDS,
  createWaterspoutState,
  stepWaterspout,
} from "../src/bermuda_hazard_rules.js";
import { BermudaMusic } from "../src/music_bermuda.js";
import { t } from "../src/i18n.js";
import { wreckWorldPoint, WRECK_BED } from "../src/bermuda_sites.js";
import { WORLD } from "../src/world_config.js";

const region = REGIONS.find((r) => r.id === "bermuda");
const wreck = createBermudaWreck(new THREE.Scene(), {
  heightAt: bermudaSeabedHeight,
});
let seed = 11521;
const random = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;

test("Bermuda roster, protected nursery and regional inhabitants remain isolated", () => {
  assert.equal(region.available, true);
  assert.equal(
    getRegionSpecies("bermuda").reduce((n, s) => n + s.population, 0),
    313,
  );
  assert.equal(new Set(region.speciesKinds).size, 20);
  for (const line of [
    "风暴遮蔽航路，幽灵炮声穿透浓雾。",
    "探索失落沉船，挑战各水层的深渊领主。",
  ]) {
    assert.ok(!/[\u3400-\u9fff]/.test(t(line, [], "en")));
    assert.equal(t(line, [], "zh-CN"), line);
  }
  for (const s of BERMUDA_SPECIES) {
    assert.ok(region.speciesKinds.includes(s.kind));
    for (const other of ["hawaii", "atlantis"])
      assert.ok(!getRegionSpecies(other).some((p) => p.kind === s.kind));
    for (const key of [
      "label",
      "ability",
      "description",
      "counter",
      "realSize",
      "habitatNote",
    ]) {
      assert.ok(
        !/[\u3400-\u9fff]/.test(t(s[key], [], "en")),
        `${s.kind}.${key}`,
      );
    }
  }
  const population = [];
  for (const species of getRegionSpecies("bermuda")) {
    const groups = schoolPopulationGroups(species);
    for (let index = 0; index < species.population; index++) {
      const group = groups.find(
        (g) => index >= g.start && index < g.start + g.count,
      );
      const habitat =
        species.schoolSize > 1 ? schoolHabitat(species, group.index) : species;
      const anchor =
        species.schoolSize > 1
          ? initialSchoolAnchor(species, group.index).add(
              schoolSlot(species, index - group.start),
            )
          : initialSpeciesAnchor(species, index);
      const p = habitatPosition(habitat, {
        heightAt: bermudaSeabedHeight,
        colliders: wreck.colliders,
        anchor,
        populationIndex: index,
        random,
      });
      assert.ok(p, `${species.kind}/${index}: legal spawn required`);
      assert.ok(
        p.y >= bermudaSeabedHeight(p.x, p.z) + species.length * 0.24 - 1,
        `${species.kind}: seabed`,
      );
      assert.ok(
        -p.y >= habitat.depthMin - 1 && -p.y <= habitat.depthMax + 1,
        `${species.kind}: depth`,
      );
      assert.equal(
        isPositionBlocked(p, {
          radius: Math.max(0.65, species.length * 0.16),
          colliders: wreck.colliders,
        }),
        false,
      );
      if (species.predator) {
        assert.equal(isNursery(p), false);
        assert.equal(
          canPredatorHunt(species, index, p, new THREE.Vector3(0, -18, 75)),
          false,
        );
      }
      population.push({ species, p });
    }
  }
  const nursery = population.filter(
    (e) => isNursery(e.p) && canEat(createPlayer(), e.species.length),
  );
  assert.ok(nursery.length >= 140);
  assert.ok(
    nursery.filter((e) => e.p.distanceTo(new THREE.Vector3(0, -18, 75)) < 40)
      .length >= 24,
  );
  assert.ok(
    population.filter((e) => e.species.length >= 10 && -e.p.y > 250).length >=
      15,
  );
  const hydra = region.bossInstances.find((e) => e.kind === "hydra");
  assert.equal(hydra.home[1], -20);
  assert.equal(isNursery(new THREE.Vector3(...hydra.home)), false);
});

for (const length of [3, 16, 30])
  test(`All wreck entrances connect both ways at ${length} m with full-body sweeps`, () => {
    for (const route of WRECK_ROUTES)
      for (const reverse of [false, true]) {
        const points = reverse ? [...route.points].reverse() : route.points;
        let point = new THREE.Vector3(...points[0]);
        for (let i = 1; i < points.length; i++) {
          const a = new THREE.Vector3(...points[i - 1]),
            b = new THREE.Vector3(...points[i]),
            forward = b.clone().sub(a).normalize(),
            steps = Math.ceil(a.distanceTo(b) / 1.5);
          for (let step = 1; step <= steps; step++) {
            const target = a.clone().lerp(b, step / steps),
              r = resolveMotion(point, target, {
                colliders: wreck.colliders,
                radius: bodyRadius(length),
                length,
                forward,
                floorHeight: (x, z) =>
                  bermudaSeabedHeight(x, z) + bodyRadius(length),
              });
            assert.equal(r.stuck, false, route.id);
            assert.equal(r.blocked, false, route.id);
            point.copy(r.position);
            assert.ok(point.distanceTo(target) < 0.01, route.id);
          }
        }
      }
  });

test("Wreck walls and decks remain solid while central entrances remain open", () => {
  assert.ok(
    castSegment(
      new THREE.Vector3(...wreckWorldPoint([-93, -451, -650])),
      new THREE.Vector3(...wreckWorldPoint([-70, -451, -650])),
      wreck.colliders,
      0.65,
    ),
  );
  assert.ok(
    castSegment(
      new THREE.Vector3(...wreckWorldPoint([-85, -458, -640])),
      new THREE.Vector3(...wreckWorldPoint([-85, -465, -640])),
      wreck.colliders,
      0.65,
    ),
  );
  assert.equal(
    castSegment(
      new THREE.Vector3(...wreckWorldPoint([-15, -468, -600])),
      new THREE.Vector3(...wreckWorldPoint([-65, -468, -600])),
      wreck.colliders,
      0.65,
    ),
    null,
  );
  assert.ok(wreck.stats.triangles < 80000);
  assert.ok(wreck.stats.meshes <= 12);
  assert.ok(wreck.stats.supported);
});

test("Waterspout damage is swept, bounded, shallow-only and nursery/pause-safe", () => {
  const state = createWaterspoutState(),
    p = createPlayer(),
    spouts = [{ x: 100, z: -400, radius: 10 }];
  const a = { x: 80, y: -3, z: -400 },
    b = { x: 120, y: -3, z: -400 };
  let r = stepWaterspout(state, p, a, b, spouts, 1);
  assert.ok(r.hit);
  assert.equal(p.health, 84);
  r = stepWaterspout(state, p, a, b, spouts, 1.2);
  assert.equal(r.hit, false);
  assert.equal(p.health, 84);
  assert.ok(r.lifting);
  assert.equal(
    stepWaterspout(
      createWaterspoutState(),
      createPlayer(),
      a,
      b,
      spouts,
      1,
      false,
    ).hit,
    false,
  );
  assert.equal(
    stepWaterspout(
      createWaterspoutState(),
      createPlayer(),
      { ...a, y: -80 },
      { ...b, y: -80 },
      spouts,
      1,
    ).hit,
    false,
  );
  assert.equal(
    stepWaterspout(
      createWaterspoutState(),
      createPlayer(),
      { x: 0, y: -3, z: 50 },
      { x: 0, y: -3, z: 50 },
      [{ x: 0, z: 50, radius: 10 }],
      1,
    ).hit,
    false,
  );
  assert.equal(
    stepWaterspout(
      createWaterspoutState(),
      createPlayer(),
      { x: 80, y: 0, z: -400 },
      { x: 180, y: -300, z: -400 },
      spouts,
      1,
    ).hit,
    false,
  );
});

test("Weather actually launches, respects reduced motion and resets owned state", () => {
  const scene = new THREE.Scene(),
    w = createBermudaWeather(scene),
    p = createPlayer();
  w.update(
    1,
    { x: 100, y: -3, z: -400 },
    0.04,
    true,
    { x: 100, y: 7, z: -400 },
    true,
  );
  assert.equal(w.flash, 0);
  const s = w.spouts[0],
    pos = new THREE.Vector3(s.x, -3, s.z);
  let launch;
  for (let i = 0; i < 20 && !launch; i++) {
    w.update(1 + i * 0.04, pos, 0.04, true, pos, true);
    launch = w.onMovement(p, pos.clone(), pos, new THREE.Vector3(0, 0, -1), {
      now: 1 + i * 0.04,
      dt: 0.04,
    });
  }
  assert.ok(launch && launch.y === BERMUDA_HAZARDS.launchSpeed);
  assert.equal(p.health, 84);
  w.reset();
  assert.equal(w.lifted, false);
  w.dispose();
  w.dispose();
  assert.equal(scene.children.length, 0);
});

test("Ghost telegraphs a non-homing volley; diving cancels its charge and cannot damage nursery", () => {
  const events = [],
    scene = new THREE.Scene(),
    fleet = createBermudaFleet(scene, {
      heightAt: bermudaSeabedHeight,
      notify: (m) => events.push(m),
    }),
    player = createPlayer(),
    fwd = new THREE.Vector3(0, 0, -1);
  fleet.update(0, new THREE.Vector3());
  const pos = fleet.ghost.root.position
    .clone()
    .add(new THREE.Vector3(35, -9, 0));
  fleet.onMovement(player, pos, pos, fwd, { now: 0 });
  assert.equal(events.length, 1);
  assert.equal(player.health, 100);
  const deep = pos.clone();
  deep.y = -BERMUDA_HAZARDS.ghostEscapeDepth - 5;
  fleet.onMovement(player, deep, deep, fwd, { now: 1 });
  assert.equal(fleet.danger, false);
  fleet.onMovement(player, pos, pos, fwd, { now: 2.5 });
  assert.equal(events.length, 1);
  assert.equal(player.health, 100);
  fleet.reset();
  fleet.update(0, pos);
  fleet.onMovement(player, pos, pos, fwd, { now: 0 });
  for (let i = 1; i <= 45; i++)
    fleet.onMovement(player, pos, pos, fwd, { now: i * 0.1 });
  assert.equal(
    player.health,
    60,
    "One volley deals 40 damage without stacking simultaneous cannon hits",
  );
  fleet.reset();
  fleet.update(0, pos);
  fleet.onMovement(player, pos, pos, fwd, { now: 0 });
  const escaped = pos.clone().add(new THREE.Vector3(160, 0, 0));
  for (let i = 1; i <= 45; i++)
    fleet.onMovement(player, escaped, escaped, fwd, { now: i * 0.1 });
  assert.equal(fleet.danger, false);
  for (const c of fleet.colliders)
    assert.ok([c.x, c.y, c.z, c.rotation.w].every(Number.isFinite));
  for (const speed of [5, 32]) {
    fleet.reset();
    const movingPlayer = createPlayer();
    const start = fleet.ghost.root.position
      .clone()
      .add(new THREE.Vector3(70, -9, 0));
    let previous = start.clone();
    for (let i = 0; i <= 48; i++) {
      const now = i * 0.1,
        current = start.clone().addScaledVector(fwd, speed * now);
      fleet.update(now, current);
      fleet.onMovement(movingPlayer, previous, current, fwd, { now });
      previous = current;
    }
    assert.equal(
      movingPlayer.health,
      speed === 5 ? 60 : 100,
      `Ghost broadside versus ${speed} m/s escape`,
    );
  }
  fleet.dispose();
  fleet.dispose();
  assert.equal(scene.children.length, 0);
});

test("Solid cover shields a broadside and its blast; the nursery never acquires a target", () => {
  let walls = [];
  const fleet = createBermudaFleet(new THREE.Scene(), {
    heightAt: bermudaSeabedHeight,
    castWorld: (a, b, r) => castSegment(a, b, walls, r),
  });
  fleet.update(0, new THREE.Vector3());
  const ship = fleet.ghost.root.position.clone();
  walls = [
    {
      type: "box",
      x: ship.x + 40,
      y: ship.y,
      z: ship.z,
      halfSize: new THREE.Vector3(1, 90, 100),
      rotation: new THREE.Quaternion(),
    },
  ];
  const pos = ship.clone().add(new THREE.Vector3(70, -9, 0)),
    player = createPlayer(),
    forward = new THREE.Vector3(0, 0, -1);
  for (let i = 0; i <= 48; i++)
    fleet.onMovement(player, pos, pos, forward, { now: i * 0.1 });
  assert.equal(player.health, 100);
  fleet.reset();
  const safe = new THREE.Vector3(0, -18, 75);
  fleet.ghost.root.position.copy(safe).add(new THREE.Vector3(20, 15, 0));
  for (let i = 0; i <= 48; i++)
    fleet.onMovement(player, safe, safe, forward, { now: i * 0.1 });
  assert.equal(fleet.danger, false);
  assert.equal(player.health, 100);
  fleet.dispose();
});

test("Human activity can be disabled and restored without leaking models or resuming swimmers", () => {
  const scene = new THREE.Scene(),
    h = createHumanActivity(scene, { heightAt: bermudaSeabedHeight }),
    p = createPlayer(),
    pos = new THREE.Vector3(0, -18, 75),
    fwd = new THREE.Vector3(0, 0, -1),
    count = scene.children.length;
  h.reset(region.humanActivity);
  for (let i = 0; i < 20; i++) h.update(0.04, 100 + i, p, pos, fwd);
  assert.equal(h.entities.filter((e) => e.alive).length, 0);
  assert.equal(h.submarines.filter((s) => s.mesh.visible).length, 0);
  assert.ok(h.hazards.some((h) => h.active));
  assert.equal(h.colliders.length, 0);
  h.reset();
  assert.ok(h.entities.some((e) => e.alive));
  assert.ok(h.submarines.every((s) => s.mesh.visible));
  assert.equal(scene.children.length, count);
  h.dispose();
});

test("New models have finite geometry, anatomically distinct proportions and independent animation", () => {
  const shapes = [];
  for (const species of BERMUDA_SPECIES) {
    const a = createCreature(species.kind, 1),
      b = createCreature(species.kind, 1),
      bound = new THREE.Box3().setFromObject(a),
      size = bound.getSize(new THREE.Vector3());
    assert.ok(size.z > 0.8 && size.z < 1.5);
    shapes.push(
      size
        .toArray()
        .map((n) => n.toFixed(2))
        .join(","),
    );
    a.traverse((n) => {
      if (n.isMesh) {
        assert.ok(n.geometry.attributes.normal);
        for (const v of n.geometry.attributes.position.array)
          assert.ok(Number.isFinite(v));
      }
    });
    a.userData.animate(0, 0.5);
    b.userData.animate(0, 0.5);
    const transforms = (root) => {
      const rows = [];
      root.traverse((n) =>
        rows.push([
          ...n.position.toArray(),
          ...n.quaternion.toArray(),
          ...n.scale.toArray(),
        ]),
      );
      return rows;
    };
    const before = transforms(b),
      beforeA = transforms(a);
    for (let t = 0; t < 3; t += 0.1) a.userData.animate(t, 2);
    assert.deepEqual(transforms(b), before);
    assert.notDeepEqual(transforms(a), beforeA);
    assert.notEqual(a.uuid, b.uuid);
  }
  assert.equal(new Set(shapes).size, 7);
});

test("Bermuda pursuit enters independently of the slow exploration clock and mutes cleanly", () => {
  const events = [],
    param = () => ({
      value: 0,
      cancelScheduledValues() {},
      setValueAtTime(v) {
        this.value = v;
      },
      setTargetAtTime(v) {
        this.value = v;
      },
    }),
    a = {
      music: {},
      musicDestinations: new Set(),
      waves: {},
      depth: 100,
      pursuing: false,
      boss: false,
      canPlay: () => true,
      makeBus: () => ({ gain: param() }),
      harmonicWave: () => ({}),
      note: (...args) => events.push(args),
      noise() {},
      drum() {},
    };
  const m = new BermudaMusic(a);
  m.update(0);
  assert.equal(events.length, 0);
  a.pursuing = true;
  m.update(0.04);
  assert.ok(events.length > 0);
  assert.ok(events[0][1] < 0.1);
  assert.ok(m.pursuit.gain.value > 1);
  a.boss = true;
  m.update(0.5);
  assert.ok(m.guardian.gain.value > 0);
  a.canPlay = () => false;
  const n = events.length;
  m.update(2);
  assert.equal(events.length, n);
  m.reset(2);
  assert.equal(m.pursuit.gain.value, 0);
  assert.equal(m.guardian.gain.value, 0);
});

test("Rendered seabed follows the authoritative height at triangle interiors and supports the full wreck bed", () => {
  const geometry = createBermudaTerrainMesh(),
    p = geometry.attributes.position,
    index = geometry.index;
  let maximumError = 0;
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (const weights of [
      [1 / 3, 1 / 3, 1 / 3],
      [0.6, 0.2, 0.2],
      [0.2, 0.6, 0.2],
      [0.2, 0.2, 0.6],
    ]) {
      const x = ids.reduce((s, id, j) => s + p.getX(id) * weights[j], 0),
        y = ids.reduce((s, id, j) => s + p.getY(id) * weights[j], 0),
        z = ids.reduce((s, id, j) => s + p.getZ(id) * weights[j], 0);
      // 裙边位于不可游玩的世界边界外；实体内仍保持厘米级插值核查。
      if (x < WORLD.minX || x > WORLD.maxX || z < WORLD.minZ || z > WORLD.maxZ)
        continue;
      maximumError = Math.max(
        maximumError,
        Math.abs(y - bermudaSeabedHeight(x, z)),
      );
    }
  }
  assert.ok(maximumError < 0.3, `Terrain interpolation error ${maximumError}`);
  assert.ok(index.count / 3 < 240000);
  for (const x of [WRECK_BED.minX, -65, WRECK_BED.maxX])
    for (const z of [WRECK_BED.minZ, -650, WRECK_BED.maxZ])
      assert.equal(bermudaSeabedHeight(x, z), -486);
  geometry.dispose();
});
