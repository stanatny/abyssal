import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import {
  MARIANA_WORLD as W,
  MARIANA_GATES as G,
  MARIANA_REFUGE,
  marianaProgress,
} from "../src/mariana_config.js";
import { WORLD } from "../src/world_config.js";
import { getRegionSpecies, ALL_SPECIES } from "../src/region_ecology.js";
import { getExpedition } from "../src/expedition_config.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  initialSchoolAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
} from "../src/ecosystem_population.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";
import {
  createPlayer,
  applyNutrition,
  consumePrey,
  getProgress,
} from "../src/simulation.js";
import { MARIANA_SPECIES } from "../src/mariana_species.js";
import { createCreature } from "../src/creatures.js";
import { isNursery } from "../src/nursery_rules.js";
import { t } from "../src/i18n.js";
const ocean = createMarianaOcean(new THREE.Scene());
const bounds = {
  minX: W.minX + 5,
  maxX: W.maxX - 5,
  minZ: W.minZ + 5,
  maxZ: W.maxZ - 5,
  minY: -W.maxDepth,
  maxY: 4,
};
test("Mariana has a smaller footprint, over twice the depth and isolated world bounds", () => {
  assert.ok(W.maxDepth >= WORLD.maxDepth * 2);
  assert.ok(
    (W.maxX - W.minX) * (W.maxZ - W.minZ) <
      (WORLD.maxX - WORLD.minX) * (WORLD.maxZ - WORLD.minZ),
  );
  for (const r of ["hawaii", "atlantis", "bermuda"])
    assert.equal(getExpedition(r).region.world, undefined);
  assert.equal(getExpedition("mariana").region.bossInstances.length, 4);
});
test("Regional starting size resets mass and growth without changing either character on other maps", () => {
  for (const character of ["orca", "squid"]) {
    for (const id of ["mariana", "hawaii", "atlantis", "bermuda", "mariana"]) {
      const e = getExpedition(id, character);
      const p = createPlayer(character, e.startLength);
      assert.equal(p.length, id === "mariana" ? 15 : 3);
      assert.equal(p.mass, (p.length / 6) ** 3);
      assert.equal(p.startLength, p.length);
      assert.equal(getProgress(p), 0);
      assert.equal(p.bossesDefeated, 0);
      assert.equal(p.won, false);
      assert.ok(
        consumePrey(p, { length: p.length - 1, growth: 1, nutrition: 30 }),
      );
      assert.ok(p.length > e.startLength && getProgress(p) > 0);
    }
  }
  for (const bad of [NaN, Infinity, 0, 2, 30])
    assert.throws(() => createPlayer("orca", bad), RangeError);
});
test("Upper trench contains an edible 15-to-25m chain without respawn or altered nutrition", () => {
  const roster = getRegionSpecies("mariana");
  const stock = roster
    .flatMap((s) =>
      (s.spawnAnchors || [])
        .filter((a) => -a[1] < G[0].depth - 40 && s.length >= 11)
        .map((anchor) => ({ ...s, anchor })),
    )
    .sort((a, b) => a.length - b.length);
  assert.ok(stock.some((s) => s.length < 15 && -s.anchor[1] < 140));
  for (const character of ["orca", "squid"]) {
    const p = createPlayer(
      character,
      getExpedition("mariana", character).startLength,
    );
    for (const s of stock) consumePrey(p, s);
    assert.ok(p.length >= 25 && p.length < 30, `${character}: ${p.length}`);
    assert.equal(p.won, false);
  }
  for (const s of roster.filter(
    (s) => s.category === "ancient" || s.kind === "sperm_whale",
  )) {
    const original = ALL_SPECIES.find((e) => e.kind === s.kind);
    for (const key of ["length", "growth", "nutrition"])
      assert.equal(s[key], original[key]);
  }
});
test("Deep-water Hydra stays outside the nursery and is required to open the first gate", () => {
  const hydra = getExpedition("mariana").region.bossInstances.find(
    (b) => b.kind === "hydra",
  );
  assert.ok(hydra);
  assert.deepEqual(
    G.map((g) => g.kind),
    ["hydra", "kraken", "mayan", "leviathan"],
  );
  assert.equal(G[0].id, hydra.id);
  assert.equal(G[0].depth, 650);
  assert.equal(
    new Set(getExpedition("mariana").region.bossInstances.map((b) => b.id))
      .size,
    4,
  );
  assert.equal(hydra.maxCenterY, undefined);
  assert.ok(hydra.home[1] < -450 && hydra.home[1] > -G[0].depth);
  // 包含巡游、追击余量和躯干的保守包络，不只检查中心点。
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      assert.equal(
        isNursery({
          x: hydra.home[0] + x * hydra.radius,
          y: -5,
          z: hydra.home[2] + z * (hydra.radius * 1.5 + 80),
        }),
        false,
      );
  const ids = new Set([hydra.id]);
  assert.equal(
    marianaProgress(new Set(G.slice(1).map((g) => g.id)), MARIANA_REFUGE)
      .opened,
    0,
  );
  assert.equal(marianaProgress(ids, MARIANA_REFUGE).opened, 1);
  assert.equal(marianaProgress(ids, MARIANA_REFUGE).arrived, false);
  for (const g of G) ids.add(g.id);
  assert.equal(marianaProgress(ids, MARIANA_REFUGE).arrived, true);
});
test("Four ordered guardians persist independently and victory requires the deepest refuge", () => {
  ocean.reset();
  const p = createPlayer();
  p.length = 30;
  p.mass = 125;
  p.expeditionComplete = false;
  p.bossesDefeated = 1;
  applyNutrition(p, { nutrition: 5, growth: 0.1 });
  assert.equal(p.won, false);
  const bosses = G.map((g) => ({
    id: g.id,
    enabled: true,
    state: { defeated: false },
  }));
  // 未击败海德拉时，其他守卫的击败记录不能绕过第一层。
  const later = bosses
    .slice(1)
    .map((b) => ({ ...b, state: { defeated: true } }));
  ocean.updateProgress(p, MARIANA_REFUGE, later, () => {});
  assert.equal(ocean.progress.opened, 0);
  assert.equal(ocean.barriers.length, 4);
  assert.equal(p.won, false);
  ocean.reset();
  let notifications = 0;
  for (let i = 0; i < G.length; i++) {
    bosses[i].state.defeated = true;
    ocean.updateProgress(
      p,
      { x: 0, y: -20, z: -380 },
      bosses,
      () => notifications++,
    );
    assert.equal(ocean.progress.opened, i + 1);
    assert.equal(ocean.barriers.length, G.length - i - 1);
    assert.equal(ocean.progress.next?.id, G[i + 1]?.id);
    assert.equal(p.won, false);
    for (let j = 0; j < G.length; j++)
      assert.equal(
        ocean.root.getObjectByName(`pressure_seal_${G[j].id}`).visible,
        j > i,
      );
    // 每个关卡仅结算一次；重复刷新、离开领地不会重新锁门。
    ocean.updateProgress(
      p,
      { x: 0, y: -20, z: -380 },
      [],
      () => notifications++,
    );
    assert.equal(ocean.progress.opened, i + 1);
    assert.equal(notifications, i + 1);
  }
  ocean.updateProgress(p, MARIANA_REFUGE, bosses, () => {});
  assert.equal(p.won, true);
  ocean.reset();
  assert.equal(ocean.barriers.length, 4);
  assert.equal(ocean.progress.opened, 0);
  const standard = createPlayer();
  standard.length = 30;
  standard.mass = 125;
  standard.bossesDefeated = 1;
  applyNutrition(standard, { nutrition: 1, growth: 0.1 });
  assert.equal(standard.won, true);
});
test("Closed gates stop an adult at high speed; opened passages allow two-way vertical traversal", () => {
  for (const gate of G)
    for (const length of [3, 16, 30])
      for (const direction of [-1, 1]) {
        const a = { x: gate.x, y: -gate.depth - direction * 65, z: gate.z },
          b = { ...a, y: -gate.depth + direction * 65 };
        const opts = {
          bounds,
          radius: bodyRadius(length),
          length,
          forward: { x: 0, y: direction, z: 0 },
          floorHeight: (x, z) => ocean.heightAt(x, z) + bodyRadius(length),
        };
        const closed = resolveMotion(a, b, {
          ...opts,
          colliders: [...ocean.colliders, ...ocean.barriers],
        });
        assert.ok(closed.blocked, `${gate.id} ${length} closed`);
        const open = resolveMotion(a, b, {
          ...opts,
          colliders: ocean.colliders,
        });
        assert.equal(open.stuck, false);
        assert.ok(
          Math.abs(open.position.y - b.y) < 0.01,
          `${gate.id} ${length} ${direction} open`,
        );
      }
});
test("All regional fish and school slots have legal positions in their configured layers", () => {
  for (const s of getRegionSpecies("mariana")) {
    if (s.schoolSize > 1)
      for (const group of schoolPopulationGroups(s)) {
        const habitat = schoolHabitat(s, group.index),
          anchor = initialSchoolAnchor(s, group.index);
        for (let j = 0; j < group.count; j++)
          assertPlacement(habitat, anchor.clone().add(schoolSlot(s, j)), j);
      }
    else
      for (let i = 0; i < s.population; i++)
        assertPlacement(s, initialSpeciesAnchor(s, i), i);
  }
  function assertPlacement(s, anchor, populationIndex) {
    const p = habitatPosition(s, {
      heightAt: ocean.heightAt,
      colliders: ocean.colliders,
      anchor,
      populationIndex,
    });
    assert.ok(p, `${s.kind} ${populationIndex}`);
    assert.ok(-p.y >= s.depthMin - 1e-8 && -p.y <= s.depthMax + 1e-8);
    assert.ok(
      !isPositionBlocked(p, {
        radius: Math.max(0.45, s.length * 0.18),
        colliders: ocean.colliders,
      }),
    );
  }
});
test("Seven exclusive creatures have distinct finite geometry, independent animation and bilingual guide copy", () => {
  for (const s of MARIANA_SPECIES) {
    const a = createCreature(s.kind, 1),
      b = createCreature(s.kind, 1);
    a.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a),
      size = box.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.z - 1) < 0.025, `${s.kind}: ${size.z}`);
    a.userData.animate(1, 1);
    a.userData.animate(1.1, 2);
    assert.notEqual(a, b);
    const skins = [];
    a.traverse((n) => {
      if (n.isSkinnedMesh) skins.push(n);
    });
    assert.ok(
      skins.length >= (s.kind === "shonisaurus" ? 1 : 3),
      `${s.kind}: continuous fins must be skinned`,
    );
    assert.ok(
      skins.every((n) => n.skeleton === skins[0].skeleton),
      `${s.kind}: body and attached fins share bones`,
    );

    assert.ok(a.userData.marianaAnatomy || a.userData.ancientAnatomy);
    for (const key of [
      "label",
      "ability",
      "description",
      "habitatNote",
      "counter",
      "realSize",
    ])
      assert.ok(
        !/[\u3400-\u9fff]/u.test(t(s[key], [], "en")),
        `${s.kind} ${key}`,
      );
  }
  assert.equal(
    new Set(ALL_SPECIES.map((s) => s.kind)).size,
    ALL_SPECIES.length,
  );
});
test("Ocean disposal is idempotent and releases all owned draw resources", () => {
  const counts = new Map();
  ocean.root.traverse((n) => {
    for (const r of [
      n.geometry,
      ...(Array.isArray(n.material) ? n.material : [n.material]),
    ].filter(Boolean))
      if (!counts.has(r)) {
        counts.set(r, 0);
        r.addEventListener("dispose", () => counts.set(r, counts.get(r) + 1));
      }
  });
  ocean.dispose();
  ocean.dispose();
  assert.ok([...counts.values()].every((n) => n === 1));
  assert.equal(ocean.root.children.length, 0);
  assert.equal(ocean.colliders.length, 0);
});

test("Organic seals and solid shelves cannot be bypassed at their scalloped edges", () => {
  const ocean = createMarianaOcean(new THREE.Scene());
  for (const gate of G)
    for (const length of [3, 30])
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI) / 16;
        for (const factor of [0.7, 1.02, 1.14, 1.35]) {
          const x = gate.x + Math.cos(a) * gate.width * 0.5 * factor,
            z = gate.z + Math.sin(a) * gate.depthSize * 0.5 * factor;
          if (
            x < W.minX + 5 ||
            x > W.maxX - 5 ||
            z < W.minZ + 5 ||
            z > W.maxZ - 5
          )
            continue;
          const start = { x, y: -gate.depth + 65, z },
            end = { x, y: -gate.depth - 65, z };
          const r = resolveMotion(start, end, {
            bounds,
            radius: bodyRadius(length),
            length,
            forward: { x: 0, y: -1, z: 0 },
            colliders: [...ocean.colliders, ...ocean.barriers],
            floorHeight: (x, z) => ocean.heightAt(x, z) + bodyRadius(length),
          });
          assert.ok(
            r.blocked && r.position.y > -gate.depth - 40,
            `${gate.id} ${length} ${i} ${factor}: ${r.position.y}`,
          );
        }
      }
  ocean.dispose();
});
