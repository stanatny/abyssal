import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  AMAZON_WORLD,
  amazonChannels,
  amazonSeabedHeight,
  amazonIslandCeiling,
  amazonSurfaceHeight,
} from "../src/amazon_config.js";
import {
  createAmazonOcean,
  createAmazonOceanAsync,
} from "../src/amazon_ocean.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  getExpedition,
  REGIONS,
  CHARACTERS,
} from "../src/expedition_config.js";
import {
  habitatPosition,
  schoolPopulationGroups,
  schoolHabitat,
  initialSchoolAnchor,
} from "../src/ecosystem_population.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
} from "../src/expedition_objectives.js";
import { createPlayer } from "../src/simulation.js";
import { createCreature } from "../src/creatures.js";
import { AMAZON_CREATURE_KINDS } from "../src/creature_amazon.js";
import { createElectricDischarge } from "../src/electric_discharge.js";
import { AMAZON_EN } from "../src/locales/amazon_en.js";
import { getLanguage, setLanguage, translateDOM } from "../src/i18n.js";

test("Amazon split-node home introduction translates and restores both languages", () => {
  const originalLanguage = getLanguage();
  const markup = Object.keys(AMAZON_EN).find((key) => key.includes("<br"));
  const lines = markup.split(/<br\s*\/?\s*>/);
  assert.equal(lines.length, 2);
  // DOM 翻译按文本节点处理；整段 HTML 字典项不能替代换行两侧的原文。
  const nodes = lines.map((nodeValue) => ({ nodeType: 3, nodeValue }));
  const root = { nodeType: 11, childNodes: nodes };
  try {
    setLanguage("en");
    translateDOM(root);
    assert.ok(nodes.every((node) => !/[\u3400-\u9fff]/u.test(node.nodeValue)));
    assert.equal(nodes[0].nodeValue, AMAZON_EN[lines[0]]);
    assert.equal(nodes[1].nodeValue, AMAZON_EN[lines[1]]);
    setLanguage("zh-CN");
    translateDOM(root);
    assert.deepEqual(
      nodes.map((node) => node.nodeValue),
      lines,
    );
  } finally {
    setLanguage(originalLanguage);
  }
});

const species = getRegionSpecies("amazon");
test("Amazon is a separate sixth ecosystem before Europa for every existing character", () => {
  assert.equal(
    REGIONS.findIndex((r) => r.id === "amazon") + 1,
    REGIONS.findIndex((r) => r.id === "europa"),
  );
  for (const c of CHARACTERS) {
    const { region, character } = getExpedition("amazon", c.id);
    assert.equal(character.startLength, 3);
    assert.equal(region.surfaceMode, "river");
    for (const flag of ["swimmers", "divers", "submarines", "mines"])
      assert.equal(region.humanActivity[flag], false);
  }
  assert.equal(species.length, 20);
  assert.ok(species.every((s) => s.freshwater && !s.alien));
  for (const region of REGIONS.filter((r) => r.id !== "amazon")) {
    assert.ok(getRegionSpecies(region.id).every((s) => !s.freshwater));
    assert.ok(
      !region.bossKinds.some((k) => ["yacumama", "rootjaw"].includes(k)),
    );
  }
  assert.ok(species.some((s) => s.length >= 25 && s.predator));
  assert.ok(species.filter((s) => s.category === "ancient").length >= 3);
  assert.ok(
    species.some(
      (s) => s.kind === "saltwater_crocodile" && s.description.includes("外来"),
    ),
  );
});

test("All actual initial and replacement residents and school centers fit the final river", () => {
  const scene = new THREE.Group(),
    ocean = createAmazonOcean(scene);
  for (const s of species) {
    for (let index = 0; index < s.population; index++)
      for (const random of [() => 0.2, () => 0.5, () => 0.8]) {
        const p = habitatPosition(s, {
          heightAt: ocean.heightAt,
          colliders: ocean.colliders,
          populationIndex: index,
          random,
        });
        assert.ok(p, `${s.kind} resident ${index}`);
        assert.ok(p.y > ocean.heightAt(p.x, p.z));
      }
    if (s.schoolSize > 1)
      for (const group of schoolPopulationGroups(s)) {
        const p = habitatPosition(schoolHabitat(s, group.index), {
          heightAt: ocean.heightAt,
          colliders: ocean.colliders,
          anchor: initialSchoolAnchor(s, group.index),
          random: () => 0.5,
        });
        assert.ok(p, `${s.kind} school ${group.index}`);
      }
  }
  for (let i = 0; i < 50; i++) {
    const p = ocean.rewardAnchor(() => i / 50);
    assert.ok(
      !isPositionBlocked(p, {
        radius: 1,
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
      }),
    );
  }
  const root = ocean.root;
  ocean.dispose();
  ocean.dispose();
  assert.equal(root.parent, null);
});

test("Canceled river preparation removes partial forests and releases their owned resources", async () => {
  const parent = new THREE.Group(),
    owned = new Set(),
    disposed = new Set();
  await assert.rejects(
    createAmazonOceanAsync(parent, {
      budgetMs: 0,
      yieldTask: async () => {},
      onStep(label) {
        if (label !== "flooded-roots") return;
        parent.traverse((node) => {
          for (const resource of [
            node.geometry,
            ...(Array.isArray(node.material) ? node.material : [node.material]),
          ]) {
            if (!resource || owned.has(resource)) continue;
            owned.add(resource);
            resource.addEventListener("dispose", () => disposed.add(resource));
          }
        });
        throw new Error("Controlled river preparation cancellation");
      },
    }),
    /Controlled river preparation cancellation/,
  );
  assert.equal(parent.children.length, 0);
  assert.ok(owned.size > 20);
  assert.equal(disposed.size, owned.size);
});

test("Both winding channels admit juvenile and grown bodies while the rainforest cap protects the new underwater crossings", () => {
  const ocean = createAmazonOcean(new THREE.Group());
  for (const length of [3, 16, 30])
    for (const side of [-1, 1]) {
      let previous;
      for (let z = -170; z >= -1190; z -= 3) {
        const channel = amazonChannels(z).find((c) => c.side === side),
          p = new THREE.Vector3(channel.center, -28, z);
        assert.equal(
          isPositionBlocked(p, {
            radius: bodyRadius(length),
            length,
            forward: new THREE.Vector3(0, 0, -1),
            heightAt: amazonSeabedHeight,
            colliders: ocean.colliders,
          }),
          false,
          `channel ${side}, z ${z}`,
        );
        if (previous) {
          const result = resolveMotion(previous, p, {
            radius: bodyRadius(length),
            length,
            forward: new THREE.Vector3(0, 0, -1),
            heightAt: amazonSeabedHeight,
            colliders: ocean.colliders,
            bounds: AMAZON_WORLD,
            floorHeight: (x, z) =>
              amazonSeabedHeight(x, z) + bodyRadius(length),
          });
          assert.ok(
            Math.hypot(
              result.position.x - p.x,
              result.position.y - p.y,
              result.position.z - p.z,
            ) < 0.1,
          );
        }
        previous = p;
      }
    }
  for (const z of [-330, -650, -940]) {
    assert.ok(amazonSeabedHeight(0, z) < -95);
    assert.equal(
      isPositionBlocked(new THREE.Vector3(0, -10, z), {
        radius: bodyRadius(30),
        colliders: ocean.colliders,
      }),
      true,
    );
    for (const length of [3, 16, 30])
      for (const direction of [-1, 1]) {
        const channels = amazonChannels(z),
          start = channels[direction < 0 ? 1 : 0].center,
          end = channels[direction < 0 ? 0 : 1].center;
        let previous;
        for (
          let x = start;
          direction > 0 ? x <= end : x >= end;
          x += direction * 2
        ) {
          const p = new THREE.Vector3(x, -62, z);
          const options = {
            radius: bodyRadius(length),
            length,
            forward: new THREE.Vector3(direction, 0, 0),
            colliders: ocean.colliders,
            bounds: AMAZON_WORLD,
            floorHeight: (x, z) =>
              amazonSeabedHeight(x, z) + bodyRadius(length),
          };
          assert.equal(
            isPositionBlocked(p, options),
            false,
            `under-island route ${z} x=${x}, length=${length}`,
          );
          if (previous)
            assert.ok(
              new THREE.Vector3()
                .copy(resolveMotion(previous, p, options).position)
                .distanceTo(p) < 0.1,
              `route z=${z} x=${x} length=${length} floor=${amazonSeabedHeight(x, z)}`,
            );
          previous = p;
        }
      }
  }
  ocean.dispose();
});

test("Both end lagoons connect the arms and admit an adult body", () => {
  const ocean = createAmazonOcean(new THREE.Group());
  const center = (side, z) =>
    amazonChannels(z).find((c) => c.side === side).center;
  const paths = [
    [
      [center(-1, -170), -170],
      [center(-1, -80), -80],
      [-180, -10],
      [0, 30],
      [180, -10],
      [center(1, -80), -80],
      [center(1, -170), -170],
    ],
    [
      [center(-1, -1190), -1190],
      [center(-1, -1265), -1265],
      [0, -1270],
      [center(1, -1265), -1265],
      [center(1, -1190), -1190],
    ],
  ];
  for (const length of [3, 16, 30])
    for (const path of paths)
      for (const direction of [1, -1]) {
        const points = direction === 1 ? path : [...path].reverse();
        for (let segment = 1; segment < points.length; segment++) {
          const a = new THREE.Vector3(
              points[segment - 1][0],
              -28,
              points[segment - 1][1],
            ),
            b = new THREE.Vector3(points[segment][0], -28, points[segment][1]),
            forward = b.clone().sub(a).normalize(),
            steps = Math.ceil(a.distanceTo(b) / 3);
          let previous = a;
          for (let i = 0; i <= steps; i++) {
            const target = a.clone().lerp(b, i / steps),
              result = resolveMotion(previous, target, {
                radius: bodyRadius(length),
                length,
                forward,
                colliders: ocean.colliders,
                bounds: AMAZON_WORLD,
                floorHeight: (x, z) =>
                  amazonSeabedHeight(x, z) + bodyRadius(length),
              });
            assert.ok(
              target.distanceTo(
                new THREE.Vector3(
                  result.position.x,
                  result.position.y,
                  result.position.z,
                ),
              ) < 0.1,
              `end lagoon ${length} m, ${target.toArray()}`,
            );
            previous = target;
          }
        }
      }
  const y = amazonSeabedHeight(0, -1265) + 20;
  assert.equal(
    isPositionBlocked(new THREE.Vector3(0, y, -1265), {
      radius: bodyRadius(30),
      length: 30,
      forward: new THREE.Vector3(0, 0, -1),
      colliders: ocean.colliders,
    }),
    false,
  );
  assert.ok(ocean.colliders.some((c) => c.kind === "flooded_root"));
  ocean.dispose();
});

test("Amazon ending needs both persistent local defeats and actual maximum growth", () => {
  const region = getExpedition("amazon").region,
    state = createExpeditionObjective(region),
    player = createPlayer();
  player.expeditionComplete = false;
  player.length = 30;
  const bosses = region.bossInstances.map((b) => ({
    id: b.id,
    enabled: true,
    state: { defeated: false },
  }));
  assert.equal(advanceExpeditionObjective(state, player, bosses).won, false);
  bosses[0].state.defeated = true;
  assert.equal(advanceExpeditionObjective(state, player, bosses).won, false);
  bosses[1].state.defeated = true;
  player.length = 29.9;
  assert.equal(advanceExpeditionObjective(state, player, bosses).won, false);
  player.length = 30;
  assert.equal(advanceExpeditionObjective(state, player, bosses).won, true);
  advanceExpeditionObjective(state, player, bosses);
  assert.equal(state.defeated.size, 2);
});

test("River models use finite normalized geometry and independent live animation", () => {
  const pose = (model) => {
    const values = [];
    model.traverse((n) => values.push(...n.rotation.toArray().slice(0, 3)));
    return values;
  };
  for (const kind of AMAZON_CREATURE_KINDS) {
    const a = createCreature(kind, 6, 3),
      b = createCreature(kind, 6, 3);
    assert.notEqual(a, b);
    a.userData.animate(0, 1);
    b.userData.animate(0, 1);
    a.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a),
      size = box.getSize(new THREE.Vector3());
    assert.ok(
      Number.isFinite(size.x + size.y + size.z) && size.z > 2 && size.z < 10,
      `${kind}: ${size.toArray()}`,
    );
    a.traverse((n) => {
      if (n.isMesh)
        assert.ok(
          Array.from(n.geometry.attributes.position.array).every(
            Number.isFinite,
          ),
          `${kind}: ${n.name}`,
        );
    });
    const before = pose(b),
      rest = pose(a);
    for (const t of [0.2, 0.5, 1, 1.8]) a.userData.animate(t, 2);
    assert.deepEqual(pose(b), before, `${kind} shares animated transforms`);
    assert.notDeepEqual(pose(a), rest, `${kind} has no live animation`);
  }
});

test("Electric arcs are pooled, finite, expire on active time and dispose without extra loops", () => {
  const parent = new THREE.Group(),
    fx = createElectricDischarge(parent);
  for (let i = 0; i < 20; i++) {
    fx.emit(new THREE.Vector3(1, -20, 2), 12);
    fx.update(0.01);
  }
  assert.equal(parent.children.length, 4);
  for (const m of parent.children)
    assert.ok(
      Array.from(m.geometry.attributes.position.array).every(Number.isFinite),
    );
  fx.update(1);
  assert.ok(parent.children.every((m) => !m.visible));
  fx.emit(new THREE.Vector3());
  fx.reset();
  assert.ok(parent.children.every((m) => !m.visible));
  fx.dispose();
  assert.equal(parent.children.length, 0);
});

test("The rendered island roof and lowest floor agree with gameplay samplers", () => {
  const ocean = createAmazonOcean(new THREE.Group());
  ocean.root.updateMatrixWorld(true);
  const floors = [],
    ceilings = [];
  ocean.root.traverse((n) => {
    if (n.name === "river_lowest_floor") floors.push(n);
    if (n.name === "eroded_island_cap") ceilings.push(n);
  });
  for (const z of [-330, -650, -940]) {
    assert.ok(amazonSurfaceHeight(0, z) > 4);
    const origin = new THREE.Vector3(0, -55, z);
    const down = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, -1, 0),
    ).intersectObjects(floors);
    const up = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, 1, 0),
    ).intersectObjects(ceilings);
    assert.ok(down.length && up.length);
    assert.ok(Math.abs(down[0].point.y - amazonSeabedHeight(0, z)) < 0.8);
    assert.ok(Math.abs(up[0].point.y - amazonIslandCeiling(0, z)) < 0.3);
    assert.ok(up[0].point.y - down[0].point.y > 60);
  }
  assert.equal(
    species.reduce((n, s) => n + s.population, 0),
    411,
  );
  for (const kind of ["silver_arowana", "arapaima", "redtail_catfish"]) {
    const s = species.find((s) => s.kind === kind);
    assert.equal(s.schoolProfiles.length, 6);
    assert.equal(
      s.schoolProfiles.filter(
        (p) => Math.abs(p.anchor[0]) < 60 && p.anchor[2] < -300,
      ).length,
      2,
    );
  }
  ocean.dispose();
});
