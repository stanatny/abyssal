import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ECOSYSTEM_SPECIES } from "../src/ecosystem_config.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import { WORLD } from "../src/world_config.js";
import { isPositionBlocked } from "../src/collision.js";
import { canEat, consumePrey, createPlayer } from "../src/simulation.js";
import {
  inPredatorTerritory,
  isNursery,
  predatorTerritory,
} from "../src/nursery_rules.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolSlot,
  sharesHabitat,
  speciesVisibilityDistance,
} from "../src/ecosystem_population.js";

function randomSource(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

test("24类235尾的实际生成点全部在合法水层、领地与海床上方且不埋进场景实体", () => {
  const ocean = createOcean(new THREE.Scene());
  let count = 0;
  const centers = new Set();
  try {
    for (const species of ECOSYSTEM_SPECIES) {
      for (let index = 0; index < species.population; index++) {
        let anchor = initialSpeciesAnchor(species, index);
        if (species.schoolSize > 1) {
          const groupIndex = Math.floor(index / species.schoolSize);
          const center = habitatPosition(species, {
            heightAt: seabedHeight,
            colliders: ocean.colliders,
            anchor: initialSchoolAnchor(species, groupIndex),
            populationIndex: index,
          });
          assert.ok(center, species.kind);
          if (species.kind === "fish") centers.add(center.toArray().join(","));
          anchor = center.add(schoolSlot(species, index % species.schoolSize));
        }
        const point = habitatPosition(species, {
          heightAt: seabedHeight,
          colliders: ocean.colliders,
          anchor,
          populationIndex: index,
        });
        assert.ok(point, species.kind);
        assert.ok(inPredatorTerritory(species, index, point), species.kind);
        assert.ok(
          -point.y >= species.depthMin - 0.001 &&
            -point.y <= species.depthMax + 0.001,
          `${species.kind}: depth`,
        );
        assert.ok(
          point.y >=
            seabedHeight(point.x, point.z) + species.length * 0.35 + 3 - 0.001,
          `${species.kind}: floor`,
        );
        assert.equal(
          isPositionBlocked(point, {
            colliders: ocean.colliders,
            radius: Math.max(0.45, species.length * 0.18),
          }),
          false,
          species.kind,
        );
        count++;
      }
    }
    assert.equal(ECOSYSTEM_SPECIES.length, 24);
    assert.equal(count, 235);
    assert.equal(centers.size, 4, "珊瑚鱼四群使用独立浅滩栖息点");
  } finally {
    ocean.dispose();
  }
});

test("十三种浅海鱼沿常规下潜路线有近距栖息点，而非藏在两侧百米外", () => {
  for (const species of ECOSYSTEM_SPECIES.filter(
    (entry) => entry.schoolSize > 1,
  )) {
    let nearest = Infinity;
    for (
      let group = 0;
      group < Math.ceil(species.population / species.schoolSize);
      group++
    ) {
      const point = initialSchoolAnchor(species, group);
      for (let z = 75; z >= -430; z--) {
        const depth = 18 + Math.max(0, -z - 70) * 0.22;
        nearest = Math.min(
          nearest,
          point.distanceTo(new THREE.Vector3(0, -depth, z)),
        );
      }
    }
    assert.ok(nearest < 35, `${species.kind}: ${nearest}`);
  }
  const fish = ECOSYSTEM_SPECIES.find((s) => s.kind === "fish");
  assert.ok(
    initialSchoolAnchor(fish, 0).distanceTo(new THREE.Vector3(0, -18, 75)) < 30,
  );
});

test("新增三种慢游猎物都能出生即捕食，八处常驻鱼群沿安全浅滩分布", () => {
  const expected = [
    ["boxfish", 0.45, 2, 8, 2, 5, 22],
    ["parrotfish", 1.3, 2.4, 8, 4, 7, 28],
    ["wrasse", 1.7, 2.6, 4, 2, 10, 32],
  ];
  const points = new Set();
  const ocean = createOcean(new THREE.Scene());
  try {
    for (const [
      kind,
      length,
      speed,
      population,
      schoolSize,
      depthMin,
      depthMax,
    ] of expected) {
      const species = ECOSYSTEM_SPECIES.find((entry) => entry.kind === kind);
      assert.deepEqual(
        [
          species.length,
          species.speed,
          species.population,
          species.schoolSize,
          species.depthMin,
          species.depthMax,
        ],
        [length, speed, population, schoolSize, depthMin, depthMax],
      );
      assert.equal(species.nurseryResident, true);
      assert.equal(species.predator, false);
      assert.equal(species.category, "shoal");
      assert.equal(species.tier, 0);
      assert.equal(canEat(createPlayer(), species.length), true);
      for (let group = 0; group < population / schoolSize; group++) {
        const center = habitatPosition(species, {
          heightAt: seabedHeight,
          colliders: ocean.colliders,
          anchor: initialSchoolAnchor(species, group),
        });
        assert.ok(center, `${kind}: group ${group}`);
        assert.ok(isNursery(center));
        assert.ok(center.z >= -70 && center.z <= 80, `${kind}: ${center.z}`);
        assert.ok(Math.abs(center.x) <= 35, `${kind}: ${center.x}`);
        points.add(center.toArray().join(","));
      }
    }
    assert.equal(points.size, 8);
    assert.equal(
      ECOSYSTEM_SPECIES.filter((species) => species.category === "shoal")
        .length,
      13,
    );
  } finally {
    ocean.dispose();
  }
});

test("新猎物成长收益循序渐进，连续十二口仍处于前期且小箱鲀不超过鹦嘴鱼", (t) => {
  const results = [];
  for (const kind of ["boxfish", "parrotfish", "wrasse"]) {
    const species = ECOSYSTEM_SPECIES.find((entry) => entry.kind === kind);
    const player = createPlayer();
    for (let count = 0; count < 12; count++) {
      assert.equal(consumePrey(player, species), true);
      assert.equal(player.health, 100);
    }
    assert.ok(
      player.length > 3.8 && player.length < 4.8,
      `${kind}: ${player.length}`,
    );
    assert.equal(player.won, false);
    results.push({ kind, length: player.length, growth: species.growth });
  }
  assert.ok(results[0].length < results[1].length);
  assert.ok(results[1].length < results[2].length);
  t.diagnostic(JSON.stringify(results));
});

test("远距补位遵守当前水层且在可见半径外，不把深海动物拉上浅滩", () => {
  const random = randomSource(8129);
  for (const species of ECOSYSTEM_SPECIES) {
    if (species.depthMin >= 100) {
      assert.equal(
        sharesHabitat(species, new THREE.Vector3(0, -18, 75)),
        false,
      );
      assert.equal(
        habitatPosition(species, {
          heightAt: seabedHeight,
          near: true,
          playerPosition: new THREE.Vector3(0, -18, 75),
          random,
        }),
        null,
      );
    }
    // 外礁两只挑战者在小领地中真实巡游，不要求它们能跨过可见半径迁移。
    const populationIndex = predatorTerritory(species, 0)?.edge ? 1 : 0;
    const playerPosition = initialSpeciesAnchor(species, populationIndex);
    const point = habitatPosition(species, {
      heightAt: seabedHeight,
      near: true,
      playerPosition,
      populationIndex,
      random,
    });
    assert.ok(point, species.kind);
    assert.ok(
      point.distanceTo(playerPosition) >=
        speciesVisibilityDistance(species) + 15,
      species.kind,
    );
    assert.ok(
      point.y <= -species.depthMin && point.y >= -species.depthMax,
      species.kind,
    );
    assert.ok(point.y > seabedHeight(point.x, point.z), species.kind);
    assert.ok(point.x >= WORLD.minX && point.z >= WORLD.minZ);
  }
});

test("安全浅滩内有六群可往返捕食的珊瑚鱼与沙丁鱼，出生正前方同深度即可遇到", () => {
  const spawn = new THREE.Vector3(0, -18, 75);
  let groups = 0;
  let count = 0;
  let behindSpawn = false;
  for (const kind of ["fish", "sardine"]) {
    const species = ECOSYSTEM_SPECIES.find((entry) => entry.kind === kind);
    count += species.population;
    for (
      let index = 0;
      index < species.population / species.schoolSize;
      index++
    ) {
      const center = initialSchoolAnchor(species, index);
      assert.ok(isNursery(center));
      assert.ok(Math.abs(center.y - spawn.y) <= 3);
      behindSpawn ||= center.z > spawn.z;
      const slots = Array.from({ length: species.schoolSize }, (_, index) =>
        schoolSlot(species, index),
      );
      const width =
        Math.max(...slots.map((p) => p.x)) - Math.min(...slots.map((p) => p.x));
      assert.ok(width >= 3 && width <= 4);
      for (let a = 0; a < slots.length; a++)
        for (let b = a + 1; b < slots.length; b++)
          assert.ok(slots[a].distanceTo(slots[b]) >= species.length);
      groups++;
    }
  }
  const fish = ECOSYSTEM_SPECIES.find((entry) => entry.kind === "fish");
  const nearest = initialSchoolAnchor(fish, 0);
  assert.equal(nearest.y, spawn.y);
  assert.ok(nearest.z < spawn.z && nearest.distanceTo(spawn) <= 20);
  assert.equal(groups, 6);
  assert.equal(count, 80);
  assert.ok(behindSpawn, "回头仍有食物，不强迫新手一直向外海走");
});

test("任何普通猎手都不能向核心浅滩补位，序号不会在重生时丢失", () => {
  for (const species of ECOSYSTEM_SPECIES.filter((entry) => entry.predator)) {
    for (
      let populationIndex = 0;
      populationIndex < species.population;
      populationIndex++
    ) {
      assert.equal(
        habitatPosition(species, {
          heightAt: seabedHeight,
          near: true,
          playerPosition: new THREE.Vector3(0, -18, 75),
          populationIndex,
        }),
        null,
        `${species.kind}:${populationIndex}`,
      );
      const point = habitatPosition(species, {
        heightAt: seabedHeight,
        populationIndex,
      });
      assert.ok(point);
      assert.ok(inPredatorTerritory(species, populationIndex, point));
      if (
        populationIndex > 0 ||
        !["shark", "hammerhead"].includes(species.kind)
      )
        assert.ok(point.z < -370);
    }
  }
});
