import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  initialSchoolAnchor,
  schoolPopulationGroups,
  schoolHabitat,
  schoolSlot,
} from "../src/ecosystem_population.js";
import { inPredatorTerritory, isNursery } from "../src/nursery_rules.js";
import { createPlayer, consumePrey } from "../src/simulation.js";

test("夏威夷外礁双翼与过渡带均有合法且可维持十米角色的中型食物", () => {
  const ocean = createOcean(new THREE.Scene());
  try {
    const population = [];
    for (const species of getRegionSpecies("hawaii")) {
      const groups =
        species.schoolSize > 1 ? schoolPopulationGroups(species) : [];
      for (let index = 0; index < species.population; index++) {
        const group = groups.find(
          (g) => index >= g.start && index < g.start + g.count,
        );
        const habitat = group ? schoolHabitat(species, group.index) : species;
        const anchor = group
          ? initialSchoolAnchor(species, group.index).add(
              schoolSlot(species, index - group.start),
            )
          : initialSpeciesAnchor(species, index);
        const point = habitatPosition(habitat, {
          heightAt: seabedHeight,
          colliders: ocean.colliders,
          anchor,
          populationIndex: index,
        });
        assert.ok(point, `${species.kind}:${index}`);
        assert.ok(inPredatorTerritory(species, index, point));
        assert.ok(
          point.y >=
            seabedHeight(point.x, point.z) +
              (species.benthic ? species.floorOffset || 0 : 3) -
              1e-8,
        );
        assert.ok(-point.y >= habitat.depthMin && -point.y <= habitat.depthMax);
        if (isNursery(point)) assert.equal(species.predator, false);
        population.push({ species, point });
      }
    }
    for (const x of [-185, 185]) {
      for (const [y, z, minimum] of [
        [-65, -300, 10],
        [-128, -440, 6],
        [-195, -580, 1],
      ]) {
        const position = new THREE.Vector3(x, y, z);
        const prey = population.filter(
          ({ species, point }) =>
            species.length >= 3 &&
            species.length < 10 &&
            point.distanceTo(position) <= 100,
        );
        assert.ok(prey.length >= minimum, `${x},${y},${z}: ${prey.length}`);
        const player = createPlayer("orca", 10);
        player.health = 100;
        player.hunger = 0;
        consumePrey(player, prey[0].species);
        assert.ok(player.hunger >= 8, "是实际有效食物，不是用微小装饰鱼填数量");
      }
    }
    assert.equal(population.length, 516);
  } finally {
    ocean.dispose();
  }
});
