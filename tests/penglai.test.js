import { finishNextBossAttack } from "./helpers/boss_cycle.js";
import {
  groundCreatureProfile,
  groundSpawnPose,
} from "../src/ground_navigation.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { registerHooks } from "node:module";
import {
  REGIONS,
  CHARACTERS,
  getExpedition,
} from "../src/expedition_config.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  PENGLAI_WORLD,
  PENGLAI_BOSS_INSTANCES,
  penglaiHeightAt,
} from "../src/penglai_config.js";
import { PENGLAI_LORDS } from "../src/penglai_lords.js";
import {
  createPenglaiOcean,
  createPenglaiOceanAsync,
} from "../src/penglai_ocean.js";
import { habitatPosition, schoolSlot } from "../src/ecosystem_population.js";
import { resolveCreatureMotion } from "../src/navigation.js";
import { createAetherSurface } from "../src/aether_surface.js";
import { createCreature } from "../src/creatures.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import {
  createBossState,
  hitBoss,
  hitBossWithTorpedo,
} from "../src/boss_rules.js";
import { createPlayer, canEat } from "../src/simulation.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
} from "../src/expedition_objectives.js";
import {
  stepGroundCreature,
  groundCreatureClearance,
} from "../src/ground_creatures.js";
import { t, setLanguage } from "../src/i18n.js";
import { getMinimapState } from "../src/minimap_rules.js";
const hook = registerHooks({
  load(url, context, next) {
    if (url.endsWith(".css"))
      return { format: "module", source: "", shortCircuit: true };
    return next(url, context);
  },
});
const { buildOceanCatalog, filterOceanCatalog } = await import(
  "../src/ocean_guide.js"
);
hook.deregister();
const roster = getRegionSpecies("penglai");

test("Penglai is the seventh isolated mythic destination with real ordinary and guardian registries", () => {
  assert.equal(REGIONS[6].id, "penglai");
  assert.equal(REGIONS[5].id, "europa");
  assert.equal(roster.length, 18);
  assert.equal(
    roster.reduce((n, s) => n + s.population, 0),
    437,
  );
  assert.ok(
    roster.every(
      (s) => s.mythic && s.category === "mythic" && !s.alien && !s.freshwater,
    ),
  );
  for (const r of REGIONS.filter((r) => r.id !== "penglai")) {
    assert.ok(
      getRegionSpecies(r.id).every(
        (s) => Boolean(s.mythic) === (r.id === "odyssey"),
      ),
    );
    assert.ok(
      r.bossKinds.every((k) => !PENGLAI_LORDS.some((s) => s.kind === k)),
    );
  }
  for (const c of CHARACTERS) {
    const e = getExpedition("penglai", c.id);
    assert.equal(e.startLength, 15);
    assert.equal(e.region.surfaceMode, "aether");
    assert.ok(Object.values(e.region.humanActivity).every((v) => v === false));
  }
  for (const length of [3, 6, 10, 16, 20, 25, 30]) {
    const p = createPlayer();
    p.length = length;
    assert.ok(roster.filter((s) => canEat(p, s.length)).length >= 3);
    assert.ok(roster.some((s) => s.predator && s.length > length));
  }
});

test("Penglai assigned habitats are legal against final mountains, roofs and objects", () => {
  const parent = new THREE.Group(),
    o = createPenglaiOcean(parent);
  for (const c of o.colliders)
    if (c.rotation)
      assert.ok(
        [c.rotation.x, c.rotation.y, c.rotation.z, c.rotation.w].every(
          Number.isFinite,
        ),
      );
  for (const configured of roster) {
    const s = configured.groundbound
      ? {
          ...configured,
          ...groundCreatureProfile(
            createCreature(configured.kind, configured.length),
            configured.length,
          ),
        }
      : configured;
    for (let i = 0; i < s.population; i++)
      for (const v of [0.2, 0.5, 0.8]) {
        const p = habitatPosition(s, {
          heightAt: s.groundbound ? o.groundHeightAt : o.heightAt,
          colliders: o.colliders,
          populationIndex: i,
          random: () => v,
        });
        assert.ok(p, `${s.kind}/${i}`);
        assert.ok(
          p.y >= (s.groundbound ? o.groundHeightAt : o.heightAt)(p.x, p.z),
          `${s.kind} below ground`,
        );
        if (s.groundbound)
          assert.ok(
            Math.abs(
              p.y -
                groundSpawnPose(p, s, o.groundHeightAt, (point, heading) =>
                  isPositionBlocked(point, {
                    colliders: o.colliders,
                    radius: Math.max(0.45, s.length * 0.18),
                    length: s.length,
                    forward: heading,
                  }),
                ).y,
            ) < 1e-7,
            `${s.kind} must start on land, not in its old air band`,
          );
        assert.equal(
          isPositionBlocked(p, {
            radius: s.length * 0.1,
            colliders: o.colliders,
          }),
          false,
          `${s.kind} inside solid`,
        );
        assert.ok(p.x >= PENGLAI_WORLD.minX && p.x <= PENGLAI_WORLD.maxX);
        assert.ok(p.z >= PENGLAI_WORLD.minZ && p.z <= PENGLAI_WORLD.maxZ);
      }
  }
  for (const v of [0, 0.25, 0.5, 0.75, 0.999]) {
    const p = o.rewardAnchor(() => v);
    assert.equal(
      isPositionBlocked(p, { radius: 1, colliders: o.colliders }),
      false,
    );
    assert.ok(p.y > o.heightAt(p.x, p.z));
  }
  o.dispose();
  o.dispose();
  assert.equal(parent.children.length, 0);
});

test("Ground movement follows a low hill instead of an obsolete high air band", () => {
  const h = {
    length: 10,
    speed: 5,
    groundbound: true,
    depthMin: -180,
    depthMax: -100,
    worldBounds: PENGLAI_WORLD,
  };
  const previous = { x: 0, y: 24.8, z: 0 },
    desired = { x: 1, y: 24.8, z: 0 };
  const result = resolveCreatureMotion(
    previous,
    desired,
    { x: 1, y: 0, z: 0 },
    h,
    {
      heightAt: () => 20,
      colliders: [
        { type: "box", x: 6, y: 24, z: 0, halfSize: { x: 1, y: 2, z: 2 } },
      ],
    },
  );
  assert.ok(result);
  assert.ok(result.position.y < 30);
  const shore = resolveCreatureMotion(
    previous,
    desired,
    { x: 1, y: 0, z: 0 },
    h,
    { heightAt: (x) => (x > 0 ? -5 : 20), colliders: [] },
  );
  assert.equal(shore.blocked, true);
  assert.equal(shore.position.x, previous.x);
  assert.ok(shore.direction.x < 0);
});

test("Ground support uses each finished animal's feet with a safe legacy fallback", () => {
  for (const species of roster.filter((s) => s.groundbound)) {
    const mesh = createCreature(species.kind, species.length),
      bounds = new THREE.Box3().setFromObject(mesh, true),
      clearance = groundCreatureClearance(mesh, species.length);
    assert.ok(clearance + bounds.min.y > 0);
    assert.ok(clearance + bounds.min.y < species.length * 0.02 + 0.2);
  }
  assert.ok(
    Math.abs(groundCreatureClearance({ userData: {} }, 10) - 4.8) < 1e-12,
  );
});

test("Ground residents avoid roof projection and spawn with head and tail clearance", () => {
  const species = {
    length: 10,
    speed: 5,
    groundbound: true,
    residentRadius: 35,
    spawnAnchors: [[0, 24.8, 0]],
    minimumGroundHeight: 5,
    depthMin: -180,
    depthMax: -100,
    worldBounds: PENGLAI_WORLD,
  };
  const colliders = [
    { type: "box", x: 0, y: 24.8, z: -4, halfSize: { x: 2, y: 3, z: 0.5 } },
  ];
  const spawn = habitatPosition(species, {
    anchor: { x: 0, y: 24.8, z: 0 },
    heightAt: () => 20,
    colliders,
    random: () => 0.5,
  });
  assert.ok(spawn);
  assert.equal(
    isPositionBlocked(spawn, {
      colliders,
      radius: 1.8,
      length: 10,
      forward: groundSpawnPose(
        spawn,
        species,
        () => 20,
        (point, heading) =>
          isPositionBlocked(point, {
            colliders,
            radius: 1.8,
            length: 10,
            forward: heading,
          }),
      ).direction,
    }),
    false,
  );
  const previous = { x: 0, y: 24.8, z: 0 };
  const result = resolveCreatureMotion(
    previous,
    { x: 0, y: 24.8, z: -2 },
    { x: 0, y: 0, z: -1 },
    species,
    { colliders, heightAt: () => 20 },
  );
  assert.ok(result.blocked);
  assert.ok(
    result.position.y <= 25.55,
    "a wall must not lift a walker onto its roof",
  );
  assert.equal(result.direction.y, 0);
});

test("Penglai formations preserve physical separation and woodland LOD preserves all trees", () => {
  const crane = roster.find((s) => s.kind === "cloud_crane");
  const slots = Array.from({ length: crane.schoolSize }, (_, i) =>
    schoolSlot(crane, i),
  );
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      assert.ok(
        Math.hypot(slots[i].x - slots[j].x, slots[i].z - slots[j].z) >
          crane.length,
      );
  assert.ok(
    roster.filter((s) => s.groundbound).every((s) => s.independentMovement),
  );
  const parent = new THREE.Group(),
    ocean = createPenglaiOcean(parent);
  const levels = { near: 0, far: 0 },
    triangles = { near: 0, far: 0 };
  ocean.root.traverse((n) => {
    const level = n.userData.detailLevel;
    if (!level) return;
    levels[level] += n.count;
    triangles[level] +=
      (n.count *
        (n.geometry.index?.count ?? n.geometry.attributes.position.count)) /
      3;
  });
  assert.equal(
    levels.near,
    (ocean.root.userData.peachTrees + ocean.root.userData.skyPeachTrees) * 2,
  );
  assert.equal(ocean.root.userData.skyPeachTrees, 30);
  assert.equal(levels.far, levels.near);
  assert.ok(triangles.far < triangles.near / 4);
  const top = ocean.root.getObjectByName("opaque_lotus_water_top");
  assert.equal(top.material.side, THREE.FrontSide);
  assert.equal(top.material.transparent, false);
  assert.equal(top.material.depthWrite, true);
  ocean.dispose();
});

test("Aether preserves whole-body air ceiling and solid roof collision without a ballistic breach", () => {
  const surface = createAetherSurface({ worldBounds: PENGLAI_WORLD });
  for (const length of [3, 16, 30])
    for (const y of [-1, 0, 1]) {
      const c = surface.ceilingHeight(length, { y });
      assert.ok(
        c +
          bodyRadius(length) +
          Math.abs(y) * Math.max(0, length * 0.42 - bodyRadius(length)) <
          620,
      );
    }
  assert.equal(surface.airborne, false);
  assert.equal(surface.move().airborne, false);
  const parent = new THREE.Group(),
    o = createPenglaiOcean(parent),
    roof = o.colliders.find((c) => c.kind === "curved_tiled_roof");
  const r = resolveMotion(
    new THREE.Vector3(roof.x, roof.y + 15, roof.z),
    new THREE.Vector3(roof.x, roof.y - 15, roof.z),
    { radius: 1, colliders: o.colliders },
  );
  assert.ok(r.contacts.length > 0);
  o.dispose();
});

test("Interrupted bounded Penglai preparation releases partial resources", async () => {
  const parent = new THREE.Group();
  let yields = 0;
  await assert.rejects(
    createPenglaiOceanAsync(parent, {
      budgetMs: 0,
      yieldTask: async () => {
        if (++yields === 4) throw Error("Controlled preparation failure");
      },
    }),
    /Controlled preparation failure/,
  );
  assert.equal(parent.children.length, 0);
});

test("Ground hunter leap has a warning, bounded arc and a real recovery cooldown", () => {
  const s = { cooldown: 0 };
  const ctx = {
    hunting: true,
    distance: 10,
    targetHeight: 10,
    groundHeight: 0,
    length: 30,
  };
  assert.equal(stepGroundCreature(s, 0.01, ctx).warning, true);
  assert.equal(stepGroundCreature(s, 0.7, ctx).height, 0);
  assert.equal(s.phase, "leap");
  const top = stepGroundCreature(s, 0.65, ctx);
  assert.ok(top.height > 20 && top.height <= 32);
  stepGroundCreature(s, 0.66, ctx);
  assert.equal(s.phase, "walk");
  assert.equal(s.cooldown, 8);
  stepGroundCreature(s, 0.3, ctx);
  assert.equal(s.phase, "walk");
});

test("Four real guardian defeats unlock the sage; 25 m and five recovery counters are required for the sage", () => {
  const e = getExpedition("penglai"),
    o = createExpeditionObjective(e.region),
    p = createPlayer();
  p.length = 25;
  p.characterId = "mechanical_shark";
  const bosses = PENGLAI_BOSS_INSTANCES.map((b) => ({
    id: b.id,
    enabled: true,
    state: createBossState(PENGLAI_LORDS.find((s) => s.kind === b.kind)),
  }));
  const sage = bosses.at(-1).state;
  sage.locked = true;
  assert.equal(
    hitBoss(p, sage, { inRange: true, isFlank: true }).reason,
    "guardian_locked",
  );
  assert.equal(hitBossWithTorpedo(p, sage).hit, false);
  for (const b of bosses.slice(0, 4)) {
    p.length = 24.99;
    assert.equal(hitBossWithTorpedo(p, b.state).hit, false);
    p.length = 25;
    for (let i = 0; i < 3; i++) {
      if (i) finishNextBossAttack(b.state);
      p.biteCooldown = 0;
      b.state.biteCooldown = 0;
      b.state.contactArmed = true;
      assert.equal(
        hitBoss(p, b.state, { inRange: true, isFlank: true }).defeated,
        i === 2,
      );
    }
    advanceExpeditionObjective(o, p, bosses);
    assert.equal(p.won, false);
  }
  assert.equal(o.defeated.size, 4);
  sage.locked = false;
  for (let i = 0; i < 5; i++) {
    finishNextBossAttack(sage);
    p.biteCooldown = 0;
    sage.biteCooldown = 0;
    assert.equal(hitBossWithTorpedo(p, sage).defeated, i === 4);
  }
  advanceExpeditionObjective(o, p, bosses);
  assert.equal(p.won, true);
  const count = p.bossesDefeated;
  assert.equal(hitBossWithTorpedo(p, sage).hit, false);
  assert.equal(p.bossesDefeated, count);
});

test("All 23 mythic assets have finite independent articulated geometry through complete motion cycles", () => {
  for (const kind of [...roster, ...PENGLAI_LORDS].map((s) => s.kind)) {
    const a = createCreature(kind, 10),
      b = createCreature(kind, 10);
    a.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(a, true);
    assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).z - 10) < 0.1, kind);
    const fixed = b.matrixWorld.clone();
    for (let time = 0; time < 12; time += 0.75) {
      a.userData.animate(time, 1);
      a.updateMatrixWorld(true);
      a.traverse((n) => {
        assert.ok(n.matrixWorld.elements.every(Number.isFinite), kind);
        if (n.isMesh)
          assert.ok(
            n.geometry.attributes.position.array.every(Number.isFinite),
            kind,
          );
      });
    }
    assert.deepEqual(b.matrixWorld.elements, fixed.elements);
    assert.notEqual(a.children[0], b.children[0]);
  }
});

test("Mythic Guide membership, fields and flight/radar information remain bilingual", () => {
  for (const locale of ["zh-CN", "en"]) {
    setLanguage(locale);
    const all = buildOceanCatalog("penglai"),
      selected = filterOceanCatalog(all, { regionId: "penglai" });
    assert.equal(selected.filter((e) => e.category === "mythic").length, 20);
    assert.equal(selected.filter((e) => e.category === "lord").length, 5);
    assert.ok(
      selected.every(
        (e) =>
          !["human", "surface", "alien", "shoal", "hunter", "ancient"].includes(
            e.category,
          ),
      ),
    );
    for (const s of selected)
      for (const [field, value] of Object.entries(s))
        if (
          locale === "en" &&
          typeof value === "string" &&
          field !== "searchText"
        )
          assert.equal(
            /[\u3400-\u9fff]/u.test(value),
            false,
            `${s.kind}.${field}:${value}`,
          );
    const radar = getMinimapState({
      position: { x: 0, y: 100, z: -200 },
      forward: { x: 0, y: 1, z: 0 },
      spawn: [0, -18, 75],
      world: PENGLAI_WORLD,
    });
    assert.match(t(radar.homeLabel), locale === "en" ? /Lotus/ : /莲池/);
    assert.match(t(radar.depthLabel), locale === "en" ? /Descend/ : /下降/);
  }
  setLanguage("zh-CN");
});
